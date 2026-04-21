import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Cpu, MessageSquareText, Save, Power, Bot, Loader2, X, ChevronsDown, ChevronsUp, Webhook } from 'lucide-react';

// Components
import { ModelsTab } from './tabs/ModelsTab';
import InlineTopologyOverview from './orchestrator/InlineTopologyOverview';
import ApiPayloadPreview from './orchestrator/ApiPayloadPreview';
import RagChatPlayground from './orchestrator/RagChatPlayground';
import AgentChromeTabBar from './orchestrator/AgentChromeTabBar';
import AgentConfigPanel from './orchestrator/AgentConfigPanel';
import { AutomationTab } from './tabs/AutomationTab';

// Constants
import { DEFAULT_AGENTS } from './orchestrator/constants';

/* ─── MAIN ORCHESTRATOR HUB ──────────────────────────────────────── */
const AiOrchestratorViewer = ({ defaultAgentId, defaultMainTab = 'architecture' } = {}) => {
    // Top Navigation (Now hidden from UI, managed by SettingsMenu props)
    const [activeMainTab, setActiveMainTab] = useState(defaultMainTab);
    const [isModelsOpen, setIsModelsOpen] = useState(defaultMainTab === 'models');

    // RAG/Pool States
    const [fetchedFiles, setFetchedFiles] = useState([]);
    const AUDIO_EXTS = ["mp3", "wav", "ogg", "m4a", "flac", "aac", "opus", "wma", "mp4", "avi", "mov", "mkv", "webm", "m4v", "wmv"];

    const rags = React.useMemo(() => {
        const rag1 = { id: 'rag_1', type: 'rag', name: 'Resmi Belgeler Öz Havuzu', files: [] };
        const rag2 = { id: 'rag_2', type: 'rag', name: 'Canlı Toplantılar', files: [] };

        fetchedFiles.forEach(f => {
            if (f.file_type === 'folder') return;
            const ext = (f.file_type || '').toLowerCase().replace('.', '');
            if (AUDIO_EXTS.includes(ext)) {
                rag2.files.push(f);
            } else {
                rag1.files.push(f);
            }
        });
        return [rag1, rag2];
    }, [fetchedFiles]);

    const [agents, setAgents] = useState(DEFAULT_AGENTS);
    const [isLoadingAgents, setIsLoadingAgents] = useState(true);

    // Initial Load (Backend Fetch)
    useEffect(() => {
        const fetchAgents = async () => {
            try {
                setIsLoadingAgents(true);
                const res = await fetch('/api/orchestrator/agents');
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0) {
                        setAgents(data);
                    }
                }
            } catch (error) {
                console.error('Agent verileri alınamadı:', error);
            } finally {
                setIsLoadingAgents(false);
            }
        };
        const fetchSystemFiles = async () => {
            try {
                const res = await fetch('/api/archive/list');
                if (res.ok) {
                    const data = await res.json();
                    if (data.items) {
                        setFetchedFiles(data.items);
                    }
                }
            } catch (error) {
                console.error('Dosya verileri alınamadı:', error);
            }
        };
        fetchAgents();
        fetchSystemFiles();
    }, []);

    const [selectedItemId, setSelectedItemId] = useState(defaultAgentId || 'sys_agent_chatbot_001');
    const selectedItem = agents.find(agent => agent.id === selectedItemId);

    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isFlowExpanded, setIsFlowExpanded] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/orchestrator/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(agents)
            });
            if (res.ok) {
                setHasUnsavedChanges(false);
            } else {
                console.error("Kaydetme hatası:", await res.text());
            }
        } catch (error) {
            console.error("API Kaydetme Hatası:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const toggleAgent = (id) => {
        setAgents(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
        setHasUnsavedChanges(true);
    };

    const updateAgent = (key, val) => {
        setAgents(prev => prev.map(a => a.id === selectedItem?.id ? { ...a, [key]: val } : a));
        setHasUnsavedChanges(true);
    };

    const toggleRagAccess = (agentId, ragId) => {
        setAgents(prev => prev.map(a => {
            if (a.id !== agentId) return a;
            const hasAccess = a.allowedRags.includes(ragId);
            return { ...a, allowedRags: hasAccess ? a.allowedRags.filter(id => id !== ragId) : [...a.allowedRags, ragId] };
        }));
        setHasUnsavedChanges(true);
    };

    /* ─── Render Root Logic ───────────────────────── */
    return (
        <div className="flex flex-col w-full h-full bg-stone-50 select-none text-stone-700 animate-in fade-in duration-300">
            <div className="flex-1 overflow-hidden flex flex-col">
                {activeMainTab === 'architecture' && (
                    <div className="flex flex-col w-full h-full overflow-hidden transition-all duration-500 bg-stone-50">
                        {isLoadingAgents ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-white/50 border border-stone-200/50">
                                <Loader2 size={32} className="text-[#378ADD] animate-spin mb-4" />
                                <p className="text-stone-500 text-sm font-bold tracking-tight animate-pulse">Ajan konfigürasyonları yükleniyor...</p>
                            </div>
                        ) : selectedItem ? (
                            <>
                                {/* --- ÜST KATMAN: MONITORING (Yüzen Akış Haritası) --- */}
                                <div
                                    className={`flex w-full shrink-0 relative z-0 transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] overflow-hidden bg-white border-b border-stone-200 shadow-[0_4px_20px_-15px_rgba(0,0,0,0.1)] ${isFlowExpanded ? 'h-[65vh] min-h-[350px]' : 'h-[180px] xl:h-[210px]'}`}
                                    onWheel={(e) => {
                                        if (Math.abs(e.deltaY) < 15) return;
                                        if (e.deltaY < 0 && !isFlowExpanded) setIsFlowExpanded(true); // Yukarı kaydır (Şemayı büyüt)
                                        else if (e.deltaY > 0 && isFlowExpanded) setIsFlowExpanded(false); // Aşağı kaydır (Şemayı küçült)
                                    }}
                                >
                                    {/* Sol Taraf: Sistem Akış Haritası */}
                                    <div className="flex-1 flex items-center justify-center overflow-hidden transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] bg-white relative">

                                        {isModelsOpen && (
                                            <div
                                                className="absolute inset-0 z-10"
                                                onClick={() => setIsModelsOpen(false)}
                                            />
                                        )}

                                        <div className="absolute top-4 right-4 z-20">
                                            <button
                                                onClick={() => {
                                                    setIsModelsOpen(!isModelsOpen);
                                                    if (!isModelsOpen && !isFlowExpanded) setIsFlowExpanded(true); // Panel açılırken diagram küçükse genislet
                                                }}
                                                title="API Anahtarları"
                                                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${isModelsOpen ? 'bg-amber-100 text-amber-700 border border-amber-200 shadow-sm' : 'bg-white text-stone-600 border border-stone-200 hover:text-[#378ADD] hover:border-[#378ADD]/30 shadow-sm'}`}
                                            >
                                                <Cpu size={14} strokeWidth={2} />
                                                <span>API Anahtarları</span>
                                            </button>
                                        </div>

                                        <InlineTopologyOverview
                                            agent={selectedItem}
                                            allAgents={agents}
                                            rags={rags}
                                            onOpenPayload={() => setIsFlowExpanded(true)}
                                        />
                                    </div>

                                    {/* Sağ Taraf: API Anahtarları Paneli (Sadece Üst Katmanda) */}
                                    <AnimatePresence initial={false}>
                                        {isModelsOpen && (
                                            <motion.div
                                                initial={{ width: 0, opacity: 0 }}
                                                animate={{ width: 450, opacity: 1 }}
                                                exit={{ width: 0, opacity: 0 }}
                                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                className="h-full shrink-0 flex flex-col border-l border-stone-200 bg-white shadow-[-4px_0_15px_-5px_rgba(0,0,0,0.05)] relative z-20"
                                            >
                                                <div className="w-[450px] flex-col flex h-full">
                                                    <div className="flex-1 overflow-y-auto relative bg-white pt-2">
                                                        <ModelsTab />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>


                                {/* --- ALT KATMAN: CONFIGURATION (Tablar + Form) --- */}
                                <div className="flex-1 flex flex-col overflow-hidden min-h-0 w-full relative bg-stone-50">

                                    {/* ── INTEGRATED RIBBON: Sekmeler + Ajan Başlığı + Aksiyonlar tek şeritte ── */}
                                    <div
                                        className="shrink-0 w-full flex items-stretch border-b border-stone-200 bg-white relative z-10 select-none shadow-sm"
                                        onWheel={(e) => {
                                            if (Math.abs(e.deltaY) < 15) return;
                                            if (e.deltaY < 0 && !isFlowExpanded) setIsFlowExpanded(true);
                                            else if (e.deltaY > 0 && isFlowExpanded) setIsFlowExpanded(false);
                                        }}
                                    >
                                        {/* SOL: Ajan Sekmeleri */}
                                        <div className="flex items-end overflow-x-auto flex-1 px-4" style={{ scrollbarWidth: 'none' }}>
                                            <AgentChromeTabBar
                                                agents={agents}
                                                selectedItemId={selectedItemId}
                                                onSelect={setSelectedItemId}
                                                onRename={(id, newName) => {
                                                    setAgents(prev => prev.map(a => a.id === id ? { ...a, name: newName } : a));
                                                    setHasUnsavedChanges(true);
                                                }}
                                            />
                                        </div>

                                        {/* SAĞ: İkon Butonlar */}
                                        <div
                                            className="flex items-center gap-2 px-5 py-2 shrink-0 border-l border-stone-100"
                                            onWheel={(e) => {
                                                if (Math.abs(e.deltaY) < 15) return;
                                                if (e.deltaY < 0 && !isFlowExpanded) setIsFlowExpanded(true);
                                                else if (e.deltaY > 0 && isFlowExpanded) setIsFlowExpanded(false);
                                            }}
                                        >


                                            {/* Kaydet Butonu */}
                                            <button
                                                onClick={handleSave}
                                                disabled={!hasUnsavedChanges || isSaving}
                                                title={isSaving ? 'Kaydediliyor...' : hasUnsavedChanges ? 'Sisteme Kaydet' : 'Kaydedildi'}
                                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-widest transition-all ${isSaving ? 'bg-[#378ADD]/10 text-[#378ADD] cursor-not-allowed' :
                                                    hasUnsavedChanges ? 'bg-[#378ADD] text-white hover:bg-[#2868A8] shadow-sm' :
                                                        'text-stone-400 cursor-not-allowed bg-stone-50 border border-stone-100'
                                                    }`}
                                            >
                                                {isSaving ? <Loader2 size={14} className="animate-spin" strokeWidth={2.5} /> : <Save size={14} strokeWidth={2.5} />}
                                                <span className="hidden sm:inline">{isSaving ? 'Kaydediliyor' : hasUnsavedChanges ? 'Kaydet' : 'Kaydedildi'}</span>
                                            </button>

                                            {/* Aktif/Pasif Butonu */}
                                            <button
                                                onClick={() => toggleAgent(selectedItem.id)}
                                                title={selectedItem.active ? 'Pasife Al' : 'Aktifleştir'}
                                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-widest transition-all border ${selectedItem.active
                                                    ? 'bg-[#FCEBEB] text-[#791F1F] border-[#FCEBEB]/60 hover:bg-[#FCEBEB]/80'
                                                    : 'bg-[#EAF3DE] text-[#3B6D11] border-[#EAF3DE]/60 hover:bg-[#EAF3DE]/80'
                                                    }`}
                                            >
                                                <Power size={14} strokeWidth={2.5} />
                                                <span className="hidden sm:inline">{selectedItem.active ? 'Pasife Al' : 'Aktifleştir'}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* ── İÇERİK: Form veya Pasif Durumu ── */}
                                    {selectedItem.active ? (
                                        <div className="flex-1 flex flex-col bg-stone-50 overflow-hidden h-full">
                                            <div
                                                className="flex-1 overflow-y-auto p-6 md:p-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] mac-horizontal-scrollbar"
                                                onWheel={(e) => {
                                                    const target = e.currentTarget;
                                                    if (Math.abs(e.deltaY) < 15) return;
                                                    if (target.scrollTop <= 0 && e.deltaY < 0 && !isFlowExpanded) {
                                                        setIsFlowExpanded(true);
                                                    } else if (isFlowExpanded && e.deltaY > 0) {
                                                        setIsFlowExpanded(false);
                                                    }
                                                }}
                                            >
                                                <div className="max-w-5xl mx-auto">
                                                    <AgentConfigPanel
                                                        selectedItem={selectedItem}
                                                        rags={rags}
                                                        updateAgent={updateAgent}
                                                        toggleRagAccess={toggleRagAccess}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Pasif Durum: Minimal "Uyku" Ekranı */
                                        <div className="flex-1 flex flex-col items-center justify-center gap-5 animate-in fade-in duration-300 bg-stone-50">
                                            <div className="w-16 h-16 rounded-2xl bg-white border border-stone-200 flex items-center justify-center shadow-sm">
                                                <Power size={28} className="text-stone-300" strokeWidth={2} />
                                            </div>
                                            <div className="text-center space-y-1">
                                                <p className="text-[16px] font-black text-stone-700 tracking-tight">{selectedItem.name} Pasif</p>
                                                <p className="text-[12px] font-bold text-stone-500 tracking-tight leading-relaxed max-w-[240px]">Bu ajan şu an sistem dışında. Yönlendirme yapılmıyor.</p>
                                            </div>
                                            <button
                                                onClick={() => toggleAgent(selectedItem.id)}
                                                className="flex items-center gap-2 px-6 py-3 bg-[#3B6D11] text-white rounded-md text-[11px] font-bold uppercase tracking-widest hover:bg-[#2B520C] transition-all shadow-sm"
                                            >
                                                <Power size={16} strokeWidth={2.5} /> AKTİFLEŞTİR
                                            </button>
                                        </div>
                                    )}

                                </div>

                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-stone-500 p-10 bg-white border border-stone-200 rounded-xl shadow-sm max-w-md mx-auto my-auto">
                                <div className="w-20 h-20 rounded-full bg-stone-50 flex items-center justify-center border border-stone-200">
                                    <Bot size={36} className="text-stone-300" strokeWidth={1.5} />
                                </div>
                                <div className="text-center space-y-1.5">
                                    <p className="text-[16px] font-black text-stone-700 tracking-tight">Ajan Bulunamadı</p>
                                    <p className="text-[12px] font-bold text-stone-500 max-w-[240px] leading-relaxed mx-auto tracking-tight">
                                        Sistemde yapılandırılmış bir ajan bulunamadı. Lütfen veritabanınızı kontrol edin.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {activeMainTab === 'automation' && <AutomationTab />}
                {activeMainTab === 'playground' && <RagChatPlayground defaultAgent={selectedItem} />}
            </div>



        </div>
    );
};

export default AiOrchestratorViewer;

