import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Save, Loader2, Power } from 'lucide-react';
import { isAgentVisibleInGrid, getAgentIcon } from './constants';

const AgentChromeTabBar = ({ agents, selectedItemId, onSelect, onRename, dirtyAgentIds = new Set(), onSave, onToggleAgent, isSaving }) => {
    const visibleAgents = useMemo(
        () => (agents || []).filter(isAgentVisibleInGrid),
        [agents]
    );
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef(null);
    const [contextMenu, setContextMenu] = useState(null); // { x, y, agentId }

    // Sığma takibi: container, ajan sayısı * min sekme genişliğinden darsa
    // ikon-only moda geç (label gizlenir, tooltip'te ad).
    const containerRef = useRef(null);
    const [compact, setCompact] = useState(false);

    useEffect(() => {
        const el = containerRef.current;
        if (!el || visibleAgents.length === 0) return;
        const FULL_MIN = 140;   // label modunda sekme başına minimum genişlik
        const recompute = () => {
            const need = visibleAgents.length * FULL_MIN;
            setCompact(el.clientWidth < need);
        };
        recompute();
        const ro = new ResizeObserver(recompute);
        ro.observe(el);
        return () => ro.disconnect();
    }, [visibleAgents.length]);

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
                ref={containerRef}
                className="flex items-stretch px-0 shrink-0 overflow-x-auto z-10 relative w-full h-full"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {visibleAgents.map((agent) => {
                    const isActive = selectedItemId === agent.id;
                    const isInactive = agent.active === false;
                    const isEditing = editingId === agent.id;
                    const isDirty = dirtyAgentIds.has(agent.id);
                    const AgentIcon = getAgentIcon(agent);
                    // Düzenlenen veya aktif sekme her zaman tam mod (input/label görünür kalsın)
                    const showLabel = !compact || isEditing || isActive;

                    const sizeClass = showLabel
                        ? 'min-w-[140px] max-w-[220px] gap-2 px-4'
                        : 'min-w-[40px] max-w-[40px] justify-center px-0';

                    // Pasife alınmış ajanlar hafif kırmızı tona bürünür (seçili olsa bile).
                    const tabColorClass = isActive
                        ? (isInactive ? 'text-red-700 bg-red-50/60' : 'text-stone-700 bg-stone-50/50')
                        : (isInactive ? 'text-red-400/80 bg-red-50/30 hover:text-red-500 hover:bg-red-50/60' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50');

                    const iconColorClass = isActive
                        ? (isInactive ? 'text-red-500' : 'text-[#378ADD]')
                        : (isInactive ? 'text-red-400/70 group-hover:text-red-500' : 'text-stone-400 group-hover:text-stone-500');

                    return (
                        <div
                            key={agent.id}
                            onClick={() => onSelect(agent.id)}
                            onDoubleClick={(e) => startEdit(e, agent)}
                            onContextMenu={(e) => handleContextMenu(e, agent)}
                            className={`group relative flex items-center h-full cursor-pointer transition-all select-none shrink-0 border-r border-stone-100 last:border-0 ${sizeClass} ${tabColorClass}`}
                            title={isEditing ? undefined : (showLabel ? `${agent.name}${isInactive ? ' (pasif)' : ''} — Yeniden adlandırmak için çift tıklayın` : `${agent.name}${isInactive ? ' (pasif)' : ''}`)}
                        >
                            <div className={`shrink-0 ${iconColorClass}`}>
                                <AgentIcon size={14} strokeWidth={isActive ? 2.5 : 2} />
                            </div>

                            {showLabel && (isEditing && isActive ? (
                                <input
                                    ref={inputRef}
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={commitEdit}
                                    onKeyDown={handleKeyDown}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[12px] font-black tracking-tight bg-transparent outline-none border-b border-[#378ADD] text-stone-700 w-full min-w-0 leading-none py-0 focus:ring-0 ml-2"
                                />
                            ) : (
                                <span className={`text-[12px] tracking-tight truncate flex-1 ml-2 ${isActive ? 'font-black' : 'font-bold'}`}>{agent.name}</span>
                            ))}

                            {/* Kaydet butonu — kirli ve label modunda görünür */}
                            {isDirty && showLabel && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSave?.(agent.id);
                                    }}
                                    title="Kaydet"
                                    className="shrink-0 flex items-center justify-center w-5 h-5 rounded text-[#378ADD] hover:bg-[#378ADD]/15 transition-colors ml-1"
                                >
                                    {isSaving ? (
                                        <Loader2 size={11} className="animate-spin" strokeWidth={2.5} />
                                    ) : (
                                        <Save size={11} strokeWidth={2.5} />
                                    )}
                                </button>
                            )}

                            {/* Compact modda kirli işaretçisi — küçük nokta */}
                            {isDirty && !showLabel && (
                                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#378ADD]" />
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
                const agent = visibleAgents.find(a => a.id === contextMenu.agentId);
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
                            <Power size={13} strokeWidth={2.5} className={agent.active ? 'text-[#991B1B]' : 'text-[#3B6D11]'} />
                            <span className={agent.active ? 'text-[#991B1B]' : 'text-[#3B6D11]'}>
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
