import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Bot, Loader2, Power, Eye, FileText } from 'lucide-react';
import { mutate } from '../../../api/client';

// Components
import AgentConfigPanel from './orchestrator/AgentConfigPanel';
import CannedResponsesPanel from './orchestrator/CannedResponsesPanel';
import TeknikDokumanConfig from './orchestrator/TeknikDokumanConfig';
import { AutomationTab } from './tabs/AutomationTab';
import { PromptTemplatesTab } from './tabs/PromptTemplatesTab';

import { DEFAULT_AGENTS, isAgentVisibleInGrid, getAgentIcon } from './orchestrator/constants';

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
    const [activeMainTab, setActiveMainTab] = useState(defaultMainTab);
    const [activeSidePanel, setActiveSidePanel] = useState(
        defaultMainTab === 'models' ? 'models' : null
    );

    // Sync state when prop changes from outside (e.g. from SettingsMenu clicks)
    useEffect(() => {
        setActiveMainTab(defaultMainTab);
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

    const [selectedItemId, setSelectedItemId] = useState(defaultAgentId || 'sys_node_aggregator');
    const selectedItem = agents.find(agent => agent.id === selectedItemId);

    const SPECIAL_ITEM_IDS = new Set(['vision-processing', 'doc-processing']);

    // Eğer ilk yükleme sonrası seçili ajan listede yoksa (ör. legacy gizlendi),
    // ilk görünür ajana düş. Özel ayar item'ları seçiliyse müdahale etme.
    useEffect(() => {
        if (!isLoadingAgents && agents.length && !selectedItem && !SPECIAL_ITEM_IDS.has(selectedItemId)) {
            const firstVisible = agents.find(a =>
                a.id !== 'sys_agent_chatbot_001'
                && a.id !== 'sys_agent_msg_001'
                && a.id !== 'sys_agent_action_001'
            );
            if (firstVisible) setSelectedItemId(firstVisible.id);
        }
    }, [isLoadingAgents, agents, selectedItem, selectedItemId]);

    const [dirtyAgentIds, setDirtyAgentIds] = useState(new Set());
    const [isSaving, setIsSaving] = useState(false);

    const visibleAgents = useMemo(() => (agents || []).filter(isAgentVisibleInGrid), [agents]);

    const SPECIAL_ITEMS = useMemo(() => [
        { id: 'vision-processing',  label: 'AI Görsel İşleme',     icon: Eye      },
        { id: 'doc-processing',     label: 'Teknik Döküman İşleme', icon: FileText },
    ], []);

    // Sol panel — inline rename
    const [editingId, setEditingId]   = useState(null);
    const [editValue, setEditValue]   = useState('');
    const editInputRef                = useRef(null);
    useEffect(() => { if (editingId && editInputRef.current) { editInputRef.current.focus(); editInputRef.current.select(); } }, [editingId]);
    const commitRename = () => {
        if (editingId && editValue.trim()) {
            setAgents(prev => prev.map(a => a.id === editingId ? { ...a, name: editValue.trim() } : a));
            markDirty(editingId);
        }
        setEditingId(null);
    };

    // Sol panel — context menu (sağ tık)
    const [ctxMenu, setCtxMenu] = useState(null);
    useEffect(() => {
        if (!ctxMenu) return;
        const close = () => setCtxMenu(null);
        window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, [ctxMenu]);

    // Debounced auto-save — her değişiklikten 1.5 sn sonra otomatik kaydeder
    const autoSaveTimerRef = useRef(null);
    const agentsRef = useRef(agents);
    agentsRef.current = agents;
    const dirtyRef = useRef(dirtyAgentIds);
    dirtyRef.current = dirtyAgentIds;

    const scheduleAutoSave = useCallback(() => {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(async () => {
            const dirty = dirtyRef.current;
            if (dirty.size === 0) return;
            setIsSaving(true);
            try {
                await mutate.save('/api/orchestrator/save', agentsRef.current, {
                    subject: dirty.size > 1 ? `${dirty.size} ajan` : 'Ajan ayarları',
                    silentSuccess: false,
                });
                setDirtyAgentIds(new Set());
            } catch { /* mutate toast attı */ }
            setIsSaving(false);
        }, 1500);
    }, []);

    // Bileşen unmount olurken bekleyen timer'ı temizle
    useEffect(() => () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); }, []);

    const markDirty = useCallback((agentId) => {
        setDirtyAgentIds(prev => new Set([...prev, agentId]));
        scheduleAutoSave();
    }, [scheduleAutoSave]);

    // ChatBar'dan model değiştiğinde kilitli olmayan ajanları anında güncelle
    useEffect(() => {
        const handler = (e) => {
            const { model } = e.detail || {};
            if (!model) return;
            setAgents(prev => prev.map(a => a.modelLocked ? a : { ...a, model }));
        };
        window.addEventListener('agent-model-changed', handler);
        return () => window.removeEventListener('agent-model-changed', handler);
    }, []);

    // Manuel kaydet (sekmedeki kaydet butonu hâlâ çalışır)
    const handleSave = async () => {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        setIsSaving(true);
        const dirtyCount = dirtyAgentIds.size;
        try {
            await mutate.save('/api/orchestrator/save', agents, {
                subject: dirtyCount > 1 ? `${dirtyCount} ajan` : 'Ajan ayarları',
            });
            setDirtyAgentIds(new Set());
        } catch { /* mutate toast attı */ }
        setIsSaving(false);
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
                    <div className="flex w-full h-full overflow-hidden bg-stone-50">
                        {isLoadingAgents ? (
                            <div className="flex-1 flex flex-col items-center justify-center bg-white/50">
                                <Loader2 size={32} className="text-[#378ADD] animate-spin mb-4" />
                                <p className="text-stone-500 text-sm font-bold tracking-tight animate-pulse">Ajan konfigürasyonları yükleniyor...</p>
                            </div>
                        ) : (
                            <>
                                {/* ── SOL: Ajan Listesi ─────────────────────────── */}
                                <div className="w-52 shrink-0 flex flex-col bg-white border-r border-stone-200 overflow-hidden">
                                    <div className="flex-1 overflow-y-auto py-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-stone-200">
                                        {visibleAgents.map((agent) => {
                                            const isSelected = selectedItemId === agent.id;
                                            const isInactive = agent.active === false;
                                            const isDirty    = dirtyAgentIds.has(agent.id);
                                            const isEditing  = editingId === agent.id;
                                            const AgentIcon  = getAgentIcon(agent);
                                            return (
                                                <div
                                                    key={agent.id}
                                                    onClick={() => { if (!isEditing) setSelectedItemId(agent.id); }}
                                                    onDoubleClick={() => { setEditingId(agent.id); setEditValue(agent.name); }}
                                                    onContextMenu={(e) => { e.preventDefault(); setSelectedItemId(agent.id); setCtxMenu({ x: e.clientX, y: e.clientY, agentId: agent.id }); }}
                                                    className={`relative w-full flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-all duration-100
                                                        ${isSelected
                                                            ? isInactive ? 'bg-red-50 text-red-700' : 'bg-[#378ADD]/8 text-stone-800'
                                                            : isInactive ? 'text-red-400 hover:bg-red-50/60' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
                                                        }`}
                                                >
                                                    {isSelected && <span className="absolute left-0 top-2 bottom-2 w-[2px] bg-[#378ADD] rounded-r" />}
                                                    <div className="relative shrink-0">
                                                        <AgentIcon size={14} strokeWidth={isSelected ? 2.5 : 2}
                                                            className={isSelected ? (isInactive ? 'text-red-500' : 'text-[#378ADD]') : (isInactive ? 'text-red-300' : 'text-stone-400')}
                                                        />
                                                        <span className={`absolute -bottom-[3px] -right-[3px] w-[5px] h-[5px] rounded-full ring-[1.5px] ${isInactive ? 'bg-red-400 ring-white' : 'bg-emerald-400 ring-white'}`} />
                                                    </div>
                                                    {isEditing && isSelected ? (
                                                        <input
                                                            ref={editInputRef}
                                                            value={editValue}
                                                            onChange={e => setEditValue(e.target.value)}
                                                            onBlur={commitRename}
                                                            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null); }}
                                                            onClick={e => e.stopPropagation()}
                                                            className="text-[12px] font-bold bg-transparent outline-none border-b border-[#378ADD] text-stone-700 w-full min-w-0 leading-none py-0"
                                                        />
                                                    ) : (
                                                        <span className={`text-[12px] truncate flex-1 ${isSelected ? 'font-bold' : 'font-medium'}`}>{agent.name}</span>
                                                    )}
                                                    {isDirty && <span className="w-[5px] h-[5px] rounded-full bg-amber-400 animate-pulse shrink-0" />}
                                                </div>
                                            );
                                        })}

                                        {/* ── Ayırıcı + Özel Ayar Bölümleri ────────── */}
                                        <div className="h-px bg-stone-200 mx-3 my-1 shrink-0" />
                                        {SPECIAL_ITEMS.map(item => {
                                            const isSelected = selectedItemId === item.id;
                                            const Icon = item.icon;
                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => setSelectedItemId(item.id)}
                                                    className={`relative w-full flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-all duration-100
                                                        ${isSelected ? 'bg-[#378ADD]/8 text-stone-800' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'}`}
                                                >
                                                    {isSelected && <span className="absolute left-0 top-2 bottom-2 w-[2px] bg-[#378ADD] rounded-r" />}
                                                    <Icon size={14} strokeWidth={isSelected ? 2.5 : 2}
                                                        className={isSelected ? 'text-[#378ADD]' : 'text-stone-400'}
                                                    />
                                                    <span className={`text-[12px] truncate flex-1 ${isSelected ? 'font-bold' : 'font-medium'}`}>
                                                        {item.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="h-px bg-stone-200 mx-0 shrink-0" />
                                    <CannedResponsesPanel />
                                </div>

                                {/* ── SAĞ: Konfigürasyon Paneli ────────────────── */}
                                {selectedItemId === 'vision-processing' ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center bg-stone-50 select-none">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-stone-200 mb-5 shadow-sm">
                                            <Eye size={26} className="text-stone-300" />
                                        </div>
                                        <span className="text-[10px] font-black tracking-[0.22em] text-[#378ADD] uppercase mb-2">YAKINDA</span>
                                        <h3 className="text-xl font-semibold text-stone-800 mb-1">AI Görsel İşleme</h3>
                                        <p className="text-sm text-stone-400 max-w-xs leading-relaxed">Teknik çizim ve görsel analizi ayarları yakında bu ekrandan yapılandırılabilecek.</p>
                                    </div>
                                ) : selectedItemId === 'doc-processing' ? (
                                    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-stone-50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                        <div className="max-w-4xl mx-auto">
                                            <TeknikDokumanConfig />
                                        </div>
                                    </div>
                                ) : selectedItem ? (
                                    selectedItem.active ? (
                                        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-stone-50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                            <div className="max-w-4xl mx-auto">
                                                <ErrorBoundary>
                                                    <AgentConfigPanel
                                                        selectedItem={selectedItem}
                                                        rags={rags}
                                                        updateAgent={updateAgent}
                                                        toggleRagAccess={toggleRagAccess}
                                                    />
                                                </ErrorBoundary>
                                            </div>
                                        </div>
                                    ) : (
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
                                    )
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-stone-500">
                                        <Bot size={36} className="text-stone-300" strokeWidth={1.5} />
                                        <p className="text-[13px] font-bold text-stone-400">Bir ajan seçin</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
                {activeMainTab === 'automation' && <AutomationTab />}
                {activeMainTab === 'prompts'    && <PromptTemplatesTab />}
            </div>

            {/* ── Context menu — sağ tık ajan toggle/rename ── */}
            {ctxMenu && (() => {
                const agent = visibleAgents.find(a => a.id === ctxMenu.agentId);
                if (!agent) return null;
                return createPortal(
                    <div
                        className="fixed z-[9999] min-w-[160px] bg-white border border-stone-200 rounded-xl shadow-xl py-1.5 overflow-hidden"
                        style={{ top: ctxMenu.y, left: ctxMenu.x }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="px-3 pb-1 pt-0.5">
                            <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 truncate">{agent.name}</p>
                        </div>
                        <div className="h-px bg-stone-100 mx-2 mb-1" />
                        <button
                            className="w-full text-left px-3 py-2 text-[11px] font-semibold hover:bg-stone-50 transition-colors flex items-center gap-2.5"
                            onClick={() => { setEditingId(agent.id); setEditValue(agent.name); setCtxMenu(null); }}
                        >
                            <span className="text-stone-500">Yeniden Adlandır</span>
                        </button>
                        <button
                            className="w-full text-left px-3 py-2 text-[11px] font-semibold hover:bg-stone-50 transition-colors flex items-center gap-2.5"
                            onClick={() => { toggleAgent(agent.id); setCtxMenu(null); }}
                        >
                            <Power size={12} strokeWidth={2.5} className={agent.active ? 'text-rose-500' : 'text-emerald-600'} />
                            <span className={agent.active ? 'text-rose-600' : 'text-emerald-700'}>
                                {agent.active ? 'Pasife Al' : 'Aktifleştir'}
                            </span>
                        </button>
                    </div>,
                    document.body
                );
            })()}



        </div>
    );
};

export default AiOrchestratorViewer;

