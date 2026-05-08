import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Power } from 'lucide-react';
import { isAgentVisibleInGrid, getAgentIcon } from './constants';

const AgentChromeTabBar = ({ agents, selectedItemId, onSelect, onRename, dirtyAgentIds = new Set(), onSave, onToggleAgent, isSaving }) => {
    const visibleAgents = useMemo(
        () => (agents || []).filter(isAgentVisibleInGrid),
        [agents]
    );
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef(null);
    const [contextMenu, setContextMenu] = useState(null);

    const containerRef = useRef(null);
    const [compact, setCompact] = useState(false);

    useEffect(() => {
        const el = containerRef.current;
        if (!el || visibleAgents.length === 0) return;
        const FULL_MIN = 130;
        const recompute = () => setCompact(el.clientWidth < visibleAgents.length * FULL_MIN);
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
        if (editingId && editValue.trim()) onRename?.(editingId, editValue.trim());
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
                className="flex items-center gap-0.5 px-2 py-1.5 shrink-0 overflow-x-auto z-10 relative w-full h-full"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {visibleAgents.map((agent) => {
                    const isActive = selectedItemId === agent.id;
                    const isInactive = agent.active === false;
                    const isEditing = editingId === agent.id;
                    const isDirty = dirtyAgentIds.has(agent.id);
                    const AgentIcon = getAgentIcon(agent);
                    const showLabel = !compact || isEditing || isActive;

                    // ── Visual tokens ──────────────────────────────────────────
                    let cardClass, textClass, iconClass, statusDotClass;

                    if (isActive) {
                        if (isInactive) {
                            cardClass   = 'bg-red-50 border border-red-200 shadow-sm';
                            textClass   = 'text-red-700';
                            iconClass   = 'text-red-500';
                            statusDotClass = 'bg-red-400 ring-red-50';
                        } else {
                            cardClass   = 'bg-white border border-stone-200/90 shadow-sm';
                            textClass   = 'text-stone-800';
                            iconClass   = 'text-[#378ADD]';
                            statusDotClass = 'bg-emerald-400 ring-white';
                        }
                    } else {
                        if (isInactive) {
                            cardClass   = 'border border-transparent hover:bg-red-50/60 hover:border-red-100';
                            textClass   = 'text-red-400/80 group-hover:text-red-500';
                            iconClass   = 'text-red-300 group-hover:text-red-400';
                            statusDotClass = 'bg-red-300 ring-stone-50';
                        } else {
                            cardClass   = 'border border-transparent hover:bg-stone-100 hover:border-stone-150';
                            textClass   = 'text-stone-400 group-hover:text-stone-600';
                            iconClass   = 'text-stone-400 group-hover:text-stone-500';
                            statusDotClass = 'bg-emerald-400 ring-stone-50';
                        }
                    }

                    const sizeClass = showLabel
                        ? 'min-w-[115px] max-w-[210px] px-3 gap-2'
                        : 'w-9 justify-center px-0';

                    return (
                        <div
                            key={agent.id}
                            onClick={() => onSelect(agent.id)}
                            onDoubleClick={(e) => startEdit(e, agent)}
                            onContextMenu={(e) => handleContextMenu(e, agent)}
                            title={isEditing ? undefined : `${agent.name}${isInactive ? ' (pasif)' : ''}${showLabel ? ' — çift tıklayarak yeniden adlandır' : ''}`}
                            className={`group relative flex items-center h-8 rounded-lg cursor-pointer transition-all duration-150 select-none shrink-0 ${cardClass} ${sizeClass}`}
                        >
                            {/* Icon + status dot */}
                            <div className="relative shrink-0">
                                <span className={`transition-colors ${iconClass}`}>
                                    <AgentIcon size={13} strokeWidth={isActive ? 2.5 : 2} />
                                </span>
                                <span
                                    className={`absolute -bottom-[3px] -right-[3px] w-[5px] h-[5px] rounded-full ring-[1.5px] ${statusDotClass}`}
                                />
                            </div>

                            {/* Label / edit input */}
                            {showLabel && (isEditing && isActive ? (
                                <input
                                    ref={inputRef}
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={commitEdit}
                                    onKeyDown={handleKeyDown}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[11px] font-black tracking-tight bg-transparent outline-none border-b border-[#378ADD] text-stone-700 w-full min-w-0 leading-none py-0 focus:ring-0"
                                />
                            ) : (
                                <span className={`text-[11px] tracking-tight truncate flex-1 transition-colors ${isActive ? 'font-black' : 'font-semibold'} ${textClass}`}>
                                    {agent.name}
                                </span>
                            ))}

                            {/* Dirty — pulsing amber dot, clickable for manual save */}
                            {isDirty && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onSave?.(agent.id); }}
                                    title={isSaving ? 'Kaydediliyor…' : 'Kaydedilmemiş değişiklik — tıkla veya 1.5 sn bekle'}
                                    className="shrink-0 flex items-center justify-center w-4 h-4 rounded hover:bg-amber-100 transition-colors"
                                >
                                    <span className="w-[6px] h-[6px] rounded-full bg-amber-400 animate-pulse" />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Context menu */}
            {contextMenu && (() => {
                const agent = visibleAgents.find(a => a.id === contextMenu.agentId);
                if (!agent) return null;
                return createPortal(
                    <div
                        className="fixed z-[9999] min-w-[160px] bg-white border border-stone-200 rounded-xl shadow-xl py-1.5 overflow-hidden"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-3 pb-1 pt-0.5">
                            <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 truncate">{agent.name}</p>
                        </div>
                        <div className="h-px bg-stone-100 mx-2 mb-1" />
                        <button
                            className="w-full text-left px-3 py-2 text-[11px] font-semibold hover:bg-stone-50 transition-colors flex items-center gap-2.5"
                            onClick={() => { onToggleAgent?.(agent.id); setContextMenu(null); }}
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
        </>
    );
};

export default AgentChromeTabBar;
