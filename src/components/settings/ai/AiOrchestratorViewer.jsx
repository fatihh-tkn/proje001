import React, { useState, useEffect } from 'react';
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
const AiOrchestratorViewer = ({ defaultAgentId } = {}) => {
    // Top Navigation
    const [activeMainTab, setActiveMainTab] = useState('architecture');

    const [rags] = useState([
        { id: 'rag_1', type: 'rag', name: 'Resmi Belgeler Öz Havuzu' },
        { id: 'rag_2', type: 'rag', name: 'Canlı Toplantılar' }
    ]);

    const [agents, setAgents] = useState(DEFAULT_AGENTS);
    const [isLoadingAgents, setIsLoadingAgents] = useState(true);

    // Initial Load (Backend Fetch)
    useEffect(() => {
        const fetchAgents = async () => {
            try {
                setIsLoadingAgents(true);
                const res = await fetch('/api/v1/orchestrator/agents');
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
        fetchAgents();
    }, []);

    const [selectedItemId, setSelectedItemId] = useState(defaultAgentId || 'sys_agent_chatbot_001');
    const selectedItem = agents.find(agent => agent.id === selectedItemId);

    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isFlowExpanded, setIsFlowExpanded] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/v1/orchestrator/save', {
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

    const toggleAgent = async (id) => {
        // UI'da anında değiştir (Optimistic Update)
        setAgents(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
        try {
            const res = await fetch(`/api/v1/orchestrator/agents/${id}/toggle`, { method: 'PATCH' });
            if (!res.ok) throw new Error('Backend durumu güncelleyemedi');
        } catch (error) {
            console.error("Durum güncellenemedi:", error);
            // Hata çıkarsa geri al
            setAgents(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
        }
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
        <div className="flex flex-col w-full h-full bg-[#f4f4f5] select-none text-[var(--workspace-text)] animate-in fade-in duration-300">
            {/* Top Level Nav Bar */}
            <div className="h-[52px] border-b border-black/[0.06] bg-white px-2 sm:px-6 flex items-center gap-2 shrink-0">
                <button onClick={() => setActiveMainTab('architecture')} className={`h-full px-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest transition-all border-b-[3px] ${activeMainTab === 'architecture' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-slate-500 hover:text-[var(--workspace-text)]'}`}><Layers size={14} /> Mimari Merkezi</button>
                <button onClick={() => setActiveMainTab('models')} className={`h-full px-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest transition-all border-b-[3px] ${activeMainTab === 'models' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-[var(--workspace-text)]'}`}><Cpu size={14} /> Zekâ Kaynakları</button>
                <button onClick={() => setActiveMainTab('automation')} className={`h-full px-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest transition-all border-b-[3px] ${activeMainTab === 'automation' ? 'border-[#f06e57] text-[#f06e57]' : 'border-transparent text-slate-500 hover:text-[var(--workspace-text)]'}`}><Webhook size={14} /> Otomasyon</button>
                <button onClick={() => setActiveMainTab('playground')} className={`h-full px-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest transition-all border-b-[3px] ml-auto ${activeMainTab === 'playground' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-[var(--workspace-text)]'}`}><MessageSquareText size={14} /> Playground (Test Terminali)</button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                {activeMainTab === 'architecture' && (
                    <div className="flex flex-col w-full h-full overflow-hidden transition-all duration-500 bg-[#f4f4f5]">
                        {isLoadingAgents ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-white/50 border border-slate-200/50">
                                <Loader2 size={32} className="text-indigo-500 animate-spin mb-4" />
                                <p className="text-slate-500 text-sm font-medium animate-pulse">Ajan konfigürasyonları yükleniyor...</p>
                            </div>
                        ) : selectedItem ? (
                            <>
                                {/* --- ÜST KATMAN: MONITORING (Yüzen Akış Haritası) --- */}
                                <div
                                    className={`flex w-full shrink-0 relative z-0 transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] overflow-hidden bg-white ${isFlowExpanded ? 'h-[65vh] min-h-[350px]' : 'h-[180px] xl:h-[210px]'}`}
                                    onWheel={(e) => {
                                        if (Math.abs(e.deltaY) < 15) return;
                                        if (e.deltaY < 0 && !isFlowExpanded) setIsFlowExpanded(true); // Yukarı kaydır (Şemayı büyüt)
                                        else if (e.deltaY > 0 && isFlowExpanded) setIsFlowExpanded(false); // Aşağı kaydır (Şemayı küçült)
                                    }}
                                >
                                    {/* Tam Genişlik: Sistem Akış Haritası */}
                                    <div className="flex-1 flex items-center justify-center overflow-hidden transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] bg-white">
                                        <InlineTopologyOverview
                                            agent={selectedItem}
                                            rags={rags}
                                            onOpenPayload={() => {
                                                setIsFlowExpanded(true); // Popup açıldığında büyük haline otomatik geçsin
                                            }}
                                        />
                                    </div>
                                </div>


                                {/* --- ALT KATMAN: CONFIGURATION (Tablar + Form) --- */}
                                <div className="flex-1 flex flex-col overflow-hidden min-h-0 w-full relative bg-white">

                                    {/* ── INTEGRATED RIBBON: Sekmeler + Ajan Başlığı + Aksiyonlar tek şeritte ── */}
                                    <div
                                        className="shrink-0 w-full flex items-stretch border-b border-slate-200/80 bg-white relative z-10 select-none"
                                        onWheel={(e) => {
                                            if (Math.abs(e.deltaY) < 15) return;
                                            if (e.deltaY < 0 && !isFlowExpanded) setIsFlowExpanded(true);
                                            else if (e.deltaY > 0 && isFlowExpanded) setIsFlowExpanded(false);
                                        }}
                                    >
                                        {/* SOL: Ajan Sekmeleri */}
                                        <div className="flex items-end overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
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
                                            className="flex items-center gap-1.5 px-3 shrink-0"
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
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${isSaving ? 'bg-indigo-50 text-indigo-400 cursor-not-allowed' :
                                                    hasUnsavedChanges ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm ring-1 ring-indigo-500/30' :
                                                        'text-slate-400 cursor-not-allowed'
                                                    }`}
                                            >
                                                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                                <span className="hidden sm:inline">{isSaving ? 'Kaydediliyor' : hasUnsavedChanges ? 'Kaydet' : 'Kaydedildi'}</span>
                                            </button>

                                            {/* Aktif/Pasif Butonu */}
                                            <button
                                                onClick={() => toggleAgent(selectedItem.id)}
                                                title={selectedItem.active ? 'Pasife Al' : 'Aktifleştir'}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all border ${selectedItem.active
                                                    ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                                                    : 'bg-[var(--accent)] text-white border-[var(--accent-hover)] hover:bg-[var(--accent-hover)]'
                                                    }`}
                                            >
                                                <Power size={13} />
                                                <span className="hidden sm:inline">{selectedItem.active ? 'Pasife Al' : 'Aktifleştir'}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* ── İÇERİK: Form veya Pasif Durumu ── */}
                                    {selectedItem.active ? (
                                        <div className="flex-1 flex flex-col bg-white overflow-hidden h-full">
                                            <div
                                                className="flex-1 overflow-y-auto p-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
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
                                                <AgentConfigPanel
                                                    selectedItem={selectedItem}
                                                    rags={rags}
                                                    updateAgent={updateAgent}
                                                    toggleRagAccess={toggleRagAccess}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        /* Pasif Durum: Minimal "Uyku" Ekranı */
                                        <div className="flex-1 flex flex-col items-center justify-center gap-5 animate-in fade-in duration-300">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center">
                                                <Power size={22} className="text-slate-300" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-slate-500 mb-1">{selectedItem.name} Pasif</p>
                                                <p className="text-[11px] text-slate-400">Bu ajan şu an sistem dışında. Yönlendirme yapılmıyor.</p>
                                            </div>
                                            <button
                                                onClick={() => toggleAgent(selectedItem.id)}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-white rounded-xl text-xs font-bold hover:bg-[var(--accent-hover)] transition-all shadow-sm"
                                            >
                                                <Power size={13} /> Aktifleştir
                                            </button>
                                        </div>
                                    )}

                                </div>

                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-[var(--sidebar-text-muted)] p-8 bg-white border border-slate-200/80 rounded-xl shadow-sm">
                                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center border border-black/[0.05]">
                                    <Bot size={28} className="text-slate-300" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-slate-600 mb-1">Ajan bulunamadı</p>
                                    <p className="text-[11px] text-slate-400 max-w-[240px] leading-relaxed">
                                        Sistemde yapılandırılmış bir ajan bulunamadı. Lütfen veritabanınızı kontrol edin.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {activeMainTab === 'models' && <ModelsTab />}
                {activeMainTab === 'automation' && <AutomationTab />}
                {activeMainTab === 'playground' && <RagChatPlayground defaultAgent={selectedItem} />}
            </div>
        </div>
    );
};

export default AiOrchestratorViewer;

