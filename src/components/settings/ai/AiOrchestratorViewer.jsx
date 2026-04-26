import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Loader2, Webhook, Key, Workflow, LineChart, Terminal, FileCode } from 'lucide-react';

// Components
import { ModelsTab } from './tabs/ModelsTab';
import { DashboardTab } from './tabs/DashboardTab';
import { LogsTab } from './tabs/LogsTab';
import InlineTopologyOverview from './orchestrator/InlineTopologyOverview';
import AgentChromeTabBar from './orchestrator/AgentChromeTabBar';
import AgentConfigPanel from './orchestrator/AgentConfigPanel';
import { AutomationTab } from './tabs/AutomationTab';
import { PromptTemplatesTab } from './tabs/PromptTemplatesTab';

import { DEFAULT_AGENTS } from './orchestrator/constants';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="p-10 text-red-500 overflow-auto w-full h-full bg-white">
                    <h1 className="font-bold text-xl mb-4">React Error!</h1>
                    <pre className="text-xs whitespace-pre-wrap font-mono">{this.state.error?.stack || this.state.error?.message || String(this.state.error)}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

/* ─── MAIN ORCHESTRATOR HUB ──────────────────────────────────────── */
const AiOrchestratorViewer = ({ defaultAgentId, defaultMainTab = 'architecture' } = {}) => {
    // Top Navigation (Now hidden from UI, managed by SettingsMenu props)
    const [activeMainTab, setActiveMainTab] = useState(defaultMainTab);
    const [upperViewMode, setUpperViewMode] = useState(
        defaultMainTab === 'dashboard' ? 'dashboard' :
            defaultMainTab === 'logs' ? 'logs' : 'diagram'
    );
    const [activeSidePanel, setActiveSidePanel] = useState(
        defaultMainTab === 'models' ? 'models' : null
    );

    // Sync state when prop changes from outside (e.g. from SettingsMenu clicks)
    useEffect(() => {
        setActiveMainTab(defaultMainTab);
        setUpperViewMode(
            defaultMainTab === 'dashboard' ? 'dashboard' :
                defaultMainTab === 'logs' ? 'logs' : 'diagram'
        );
        setActiveSidePanel(
            defaultMainTab === 'models' ? 'models' : null
        );
    }, [defaultMainTab]);

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

    const [dirtyAgentIds, setDirtyAgentIds] = useState(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [isFlowExpanded, setIsFlowExpanded] = useState(false);
    const [lowerViewMode, setLowerViewMode] = useState('config'); // 'config' | 'prompts'

    const markDirty = (agentId) => {
        setDirtyAgentIds(prev => new Set([...prev, agentId]));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/orchestrator/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(agents)
            });
            if (res.ok) {
                setDirtyAgentIds(new Set());
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
        markDirty(id);
    };

    const updateAgent = (key, val) => {
        setAgents(prev => prev.map(a => a.id === selectedItem?.id ? { ...a, [key]: val } : a));
        if (selectedItem?.id) markDirty(selectedItem.id);
    };

    const toggleRagAccess = (agentId, ragId) => {
        setAgents(prev => prev.map(a => {
            if (a.id !== agentId) return a;
            const hasAccess = a.allowedRags.includes(ragId);
            return { ...a, allowedRags: hasAccess ? a.allowedRags.filter(id => id !== ragId) : [...a.allowedRags, ragId] };
        }));
        markDirty(agentId);
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

                                        {activeSidePanel && (
                                            <div
                                                className="absolute inset-0 z-10"
                                                onClick={() => setActiveSidePanel(null)}
                                            />
                                        )}

                                        {/* SOL ÜST MENÜ: Görünüm Seçimi */}
                                        <div className="absolute top-4 left-4 z-20 flex gap-1 p-1 bg-white border border-stone-200 rounded-lg shadow-sm">
                                            <button
                                                onClick={() => setUpperViewMode('diagram')}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-bold tracking-widest uppercase transition-all ${upperViewMode === 'diagram' ? 'bg-stone-100 text-stone-700 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                                            >
                                                <Workflow size={14} strokeWidth={2.5} /> <span className="hidden sm:inline">Diyagram</span>
                                            </button>
                                            <div className="w-[1px] h-4 bg-stone-200 my-auto mx-1" />
                                            <button
                                                onClick={() => {
                                                    setUpperViewMode('dashboard');
                                                    if (!isFlowExpanded) setIsFlowExpanded(true);
                                                }}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-bold tracking-widest uppercase transition-all ${upperViewMode === 'dashboard' ? 'bg-[#b91d2c]/10 text-[#b91d2c] shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                                            >
                                                <LineChart size={14} strokeWidth={2.5} /> <span className="hidden xl:inline">API</span> Maliyetleri
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setUpperViewMode('logs');
                                                    if (!isFlowExpanded) setIsFlowExpanded(true);
                                                }}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-bold tracking-widest uppercase transition-all ${upperViewMode === 'logs' ? 'bg-[#378ADD]/10 text-[#378ADD] shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                                            >
                                                <Terminal size={14} strokeWidth={2.5} /> <span className="hidden xl:inline">API</span> Logları
                                            </button>
                                        </div>

                                        <div className="absolute top-4 right-4 z-20 flex gap-1">
                                            <button
                                                onClick={() => {
                                                    setUpperViewMode(upperViewMode === 'automation' ? 'diagram' : 'automation');
                                                    if (!isFlowExpanded) setIsFlowExpanded(true);
                                                }}
                                                title="Otomasyon"
                                                className={`flex items-center justify-center p-2 rounded-full transition-all ${upperViewMode === 'automation' ? 'text-rose-500 bg-rose-50' : 'text-stone-400 hover:text-rose-500 hover:bg-stone-100'}`}
                                            >
                                                <Webhook size={16} strokeWidth={2.5} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const willOpen = activeSidePanel !== 'models';
                                                    setActiveSidePanel(willOpen ? 'models' : null);
                                                    if (willOpen && !isFlowExpanded) setIsFlowExpanded(true);
                                                }}
                                                title="API Anahtarları"
                                                className={`flex items-center justify-center p-2 rounded-full transition-all ${activeSidePanel === 'models' ? 'text-amber-500 bg-amber-50' : 'text-stone-400 hover:text-amber-500 hover:bg-stone-100'}`}
                                            >
                                                <Key size={16} strokeWidth={2.5} />
                                            </button>
                                        </div>

                                        {upperViewMode === 'diagram' && (
                                            <InlineTopologyOverview
                                                agent={selectedItem}
                                                allAgents={agents}
                                                rags={rags}
                                                onOpenPayload={() => setIsFlowExpanded(true)}
                                            />
                                        )}
                                        {upperViewMode === 'dashboard' && (
                                            <div className="w-full h-full pt-14 relative z-10 overflow-hidden bg-stone-50 animate-in fade-in duration-300">
                                                <ErrorBoundary>
                                                    <DashboardTab agent={selectedItem} />
                                                </ErrorBoundary>
                                            </div>
                                        )}
                                        {upperViewMode === 'logs' && (
                                            <div className="w-full h-full pt-14 relative z-10 overflow-hidden bg-white animate-in fade-in duration-300">
                                                <ErrorBoundary>
                                                    <LogsTab agent={selectedItem} />
                                                </ErrorBoundary>
                                            </div>
                                        )}
                                        {upperViewMode === 'automation' && (
                                            <div className="w-full h-full pt-14 relative z-10 overflow-hidden bg-white animate-in fade-in duration-300">
                                                <ErrorBoundary>
                                                    <AutomationTab />
                                                </ErrorBoundary>
                                            </div>
                                        )}

                                    </div>

                                    {/* Sağ Taraf: API Anahtarı Paneli */}
                                    <AnimatePresence initial={false}>
                                        {activeSidePanel === 'models' && (
                                            <motion.div
                                                initial={{ width: 0, opacity: 0 }}
                                                animate={{ width: 450, opacity: 1 }}
                                                exit={{ width: 0, opacity: 0 }}
                                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                className="h-full shrink-0 flex flex-col border-l border-stone-200 bg-white shadow-[-4px_0_15px_-5px_rgba(0,0,0,0.05)] relative z-20"
                                            >
                                                <div className="flex-col flex h-full overflow-hidden w-[450px]">
                                                    <div className="flex-1 overflow-y-auto relative bg-white pt-2">
                                                        <ErrorBoundary>
                                                            <ModelsTab />
                                                        </ErrorBoundary>
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
                                                dirtyAgentIds={dirtyAgentIds}
                                                onSave={handleSave}
                                                onToggleAgent={toggleAgent}
                                                isSaving={isSaving}
                                                onRename={(id, newName) => {
                                                    setAgents(prev => prev.map(a => a.id === id ? { ...a, name: newName } : a));
                                                    markDirty(id);
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
                                            {/* Prompt Şablonları Butonu */}
                                            <button
                                                onClick={() => setLowerViewMode(lowerViewMode === 'prompts' ? 'config' : 'prompts')}
                                                title="Prompt Şablonları"
                                                className={`flex items-center justify-center p-2 rounded-md transition-all ${lowerViewMode === 'prompts' ? 'text-violet-600 bg-violet-50' : 'text-stone-400 hover:text-violet-600 hover:bg-stone-100'}`}
                                            >
                                                <FileCode size={16} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* ── İÇERİK: Prompt Şablonları, Ajan Formu veya Pasif Durumu ── */}
                                    {lowerViewMode === 'prompts' ? (
                                        <div className="flex-1 overflow-hidden bg-white animate-in fade-in duration-200">
                                            <ErrorBoundary>
                                                <PromptTemplatesTab />
                                            </ErrorBoundary>
                                        </div>
                                    ) : selectedItem.active ? (
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
                {activeMainTab === 'prompts' && <PromptTemplatesTab />}
            </div>



        </div>
    );
};

export default AiOrchestratorViewer;

