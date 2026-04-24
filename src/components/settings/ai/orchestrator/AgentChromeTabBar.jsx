import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bot, Brain, Save, Loader2, Power } from 'lucide-react';

const AgentChromeTabBar = ({ agents, selectedItemId, onSelect, onRename, dirtyAgentIds = new Set(), onSave, onToggleAgent, isSaving }) => {
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef(null);
    const [contextMenu, setContextMenu] = useState(null); // { x, y, agentId }

    useEffect(() => {
        if (editingId && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingId]);

    // Context menu dışına tıklayınca kapat
    useEffect(() => {
        if (!contextMenu) return;
        const close = () => setContextMenu(null);
        window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, [contextMenu]);

    const startEdit = (e, agent) => {
        e.stopPropagation();
        setEditingId(agent.id);
        setEditValue(agent.name);
    };

    const commitEdit = () => {
        if (editingId && editValue.trim()) {
            onRename?.(editingId, editValue.trim());
        }
        setEditingId(null);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') commitEdit();
        if (e.key === 'Escape') setEditingId(null);
    };

    const handleContextMenu = (e, agent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, agentId: agent.id });
    };

    return (
        <>
            <div
                className="flex items-stretch px-0 shrink-0 overflow-x-auto z-10 relative w-full h-full"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {agents.map((agent) => {
                    const isActive = selectedItemId === agent.id;
                    const isEditing = editingId === agent.id;
                    const isDirty = dirtyAgentIds.has(agent.id);

                    return (
                        <div
                            key={agent.id}
                            onClick={() => onSelect(agent.id)}
                            onDoubleClick={(e) => startEdit(e, agent)}
                            onContextMenu={(e) => handleContextMenu(e, agent)}
                            className={`group relative flex items-center gap-2 min-w-[140px] max-w-[220px] h-full px-4 cursor-pointer transition-all select-none shrink-0 border-r border-stone-100 last:border-0
                                ${isActive ? 'text-stone-700 bg-stone-50/50' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'}`}
                            title={isEditing ? undefined : `${agent.name} — Yeniden adlandırmak için çift tıklayın`}
                        >
                            <div className={`shrink-0 ${isActive ? 'text-[#378ADD]' : 'text-stone-400 group-hover:text-stone-500'}`}>
                                {agent.agentKind === 'chatbot' ? <Bot size={14} strokeWidth={isActive ? 2.5 : 2} /> : <Brain size={14} strokeWidth={isActive ? 2.5 : 2} />}
                            </div>

                            {isEditing && isActive ? (
                                <input
                                    ref={inputRef}
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={commitEdit}
                                    onKeyDown={handleKeyDown}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[12px] font-black tracking-tight bg-transparent outline-none border-b border-[#378ADD] text-stone-700 w-full min-w-0 leading-none py-0 focus:ring-0"
                                />
                            ) : (
                                <span className={`text-[12px] tracking-tight truncate flex-1 ${isActive ? 'font-black' : 'font-bold'}`}>{agent.name}</span>
                            )}

                            {/* Kaydet butonu — sadece bu ajan değiştirilmişse görünür */}
                            {isDirty && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSave?.(agent.id);
                                    }}
                                    title="Kaydet"
                                    className="shrink-0 flex items-center justify-center w-5 h-5 rounded text-[#378ADD] hover:bg-[#378ADD]/15 transition-colors"
                                >
                                    {isSaving ? (
                                        <Loader2 size={11} className="animate-spin" strokeWidth={2.5} />
                                    ) : (
                                        <Save size={11} strokeWidth={2.5} />
                                    )}
                                </button>
                            )}

                            {/* Aktif göstergesi — alt çizgi */}
                            {isActive && (
                                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#378ADD] rounded-t-full" />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Sağ tıklama Context Menüsü — portal ile body'e render et (transform offset'inden kaçınmak için) */}
            {contextMenu && (() => {
                const agent = agents.find(a => a.id === contextMenu.agentId);
                if (!agent) return null;
                return createPortal(
                    <div
                        className="fixed z-[9999] min-w-[150px] bg-white border border-stone-200 rounded-lg shadow-xl py-1 overflow-hidden"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="w-full text-left px-4 py-2.5 text-[11px] font-bold hover:bg-stone-50 transition-colors flex items-center gap-2.5"
                            onClick={() => {
                                onToggleAgent?.(agent.id);
                                setContextMenu(null);
                            }}
                        >
                            <Power size={13} strokeWidth={2.5} className={agent.active ? 'text-[#791F1F]' : 'text-[#3B6D11]'} />
                            <span className={agent.active ? 'text-[#791F1F]' : 'text-[#3B6D11]'}>
                                {agent.active ? 'Pasife Al' : 'Aktifleştir'}
                            </span>
                        </button>
                    </div>,
                    document.body
                );
            })()}
        </>
    );
};

export default AgentChromeTabBar;
