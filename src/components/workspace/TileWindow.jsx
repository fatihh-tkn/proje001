import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Activity, Minus, X, LayoutTemplate, RefreshCw, Power, ZoomIn, ZoomOut, Database, Bot, Settings as SettingsIcon } from 'lucide-react';

const getHeaderBgClass = (type, isActive) => {
    if (!isActive) return 'bg-[#f8f8f8]/85 border-b border-slate-200/80 backdrop-blur-xl text-slate-600';

    switch (type) {
        case 'n8n':
            return 'bg-gradient-to-r from-[#ea580c]/85 to-[#c2410c]/85 border-b border-[#9a3412]/50 backdrop-blur-xl text-white shadow-[0_4px_20px_rgba(234,88,12,0.15)]';
        case 'database':
        case 'databases-viewer':
            return 'bg-gradient-to-r from-[#0284c7]/85 to-[#0369a1]/85 border-b border-[#075985]/50 backdrop-blur-xl text-white shadow-[0_4px_20px_rgba(2,132,199,0.15)]';
        case 'api-usage':
        case 'ai-orchestrator':
            return 'bg-gradient-to-r from-[#7c3aed]/85 to-[#6d28d9]/85 border-b border-[#5b21b6]/50 backdrop-blur-xl text-white shadow-[0_4px_20px_rgba(124,58,237,0.15)]';
        case 'pdf':
        case 'docx':
        case 'xls':
            return 'bg-gradient-to-r from-[#334155]/85 to-[#1e293b]/85 border-b border-[#0f172a]/50 backdrop-blur-xl text-white shadow-[0_4px_20px_rgba(51,65,85,0.15)]';
        default:
            return 'th-win-bar-default backdrop-blur-xl text-white';
    }
};

const getPillHoverClass = (type) => {
    switch (type) {
        case 'n8n':
            return 'hover:bg-[#ea580c] hover:border-[#ffedd5]/30 hover:shadow-[0_2px_12px_rgba(234,88,12,0.4)]';
        case 'database':
        case 'databases-viewer':
            return 'hover:bg-[#0284c7] hover:border-[#e0f2fe]/30 hover:shadow-[0_2px_12px_rgba(2,132,199,0.4)]';
        case 'api-usage':
        case 'ai-orchestrator':
            return 'hover:bg-[#7c3aed] hover:border-[#ede9fe]/30 hover:shadow-[0_2px_12px_rgba(124,58,237,0.4)]';
        case 'pdf':
        case 'docx':
        case 'xls':
            return 'hover:bg-[#334155] hover:border-[#f1f5f9]/30 hover:shadow-[0_2px_12px_rgba(51,65,85,0.4)]';
        default:
            return 'th-pill-hover';
    }
};

const getTabIcon = (type, isActive) => {
    const colorClass = isActive ? 'text-white/80' : 'text-slate-400';
    switch (type) {
        case 'api-usage': return <Bot size={14} strokeWidth={2} className={`shrink-0 ${colorClass}`} />;
        case 'database':
        case 'databases-viewer': return <Database size={14} strokeWidth={2} className={`shrink-0 ${colorClass}`} />;
        case 'settings': return <SettingsIcon size={14} strokeWidth={2} className={`shrink-0 ${colorClass}`} />;
        case 'pdf': return <FileText size={14} strokeWidth={2} className={`shrink-0 ${colorClass}`} />;
        case 'n8n': return <Activity size={14} strokeWidth={2} className={`shrink-0 ${colorClass}`} />;
        default: return <FileText size={14} strokeWidth={2} className={`shrink-0 ${colorClass}`} />;
    }
};
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DynamicViewer } from './DynamicViewer';
import { SNAP_LAYOUTS } from './layoutUtils';

export const TileWindow = ({ tab, isActive, isDraggingGhost, activeId, isMaximized, onMinimize, onClose, onFocus, onMaximize, onSelectLayout, customZoneClass, minimizedTabsData = [], onSwapTab, onCloseAllMinimized }) => {

    const [showSnap, setShowSnap] = useState(false);
    const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
    const snapTimeoutRef = useRef(null);
    const snapContainerRef = useRef(null);

    const handleMouseEnterSnap = () => {
        if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
        if (snapContainerRef.current) {
            const rect = snapContainerRef.current.getBoundingClientRect();
            setPopupPos({
                top: rect.bottom + 8,
                left: rect.left + (rect.width / 2)
            });
        }
        setShowSnap(true);
    };

    const handleMouseLeaveSnap = () => {
        snapTimeoutRef.current = setTimeout(() => {
            setShowSnap(false);
        }, 150);
    };

    const handleMinimizeClick = (e) => {
        e.stopPropagation();
        onMinimize();
    };

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: tab.id,
        disabled: isMaximized || isDraggingGhost
    });

    const dndStyle = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
    };

    const windowBoxShadow = !isMaximized
        ? (isActive
            ? '0 0 0 1px var(--th-win-ring), 0 20px 60px rgba(0,0,0,0.2)'
            : '0 0 0 1px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)')
        : undefined;

    const computedStyle = isDraggingGhost ? {} : (isMaximized ? {} : { ...dndStyle, boxShadow: windowBoxShadow });

    const getExitAnimation = () => {
        if (isDraggingGhost) return false;
        return { opacity: 0, scale: 0.85, filter: 'blur(8px)' };
    };

    return (
        <motion.div
            layout={!isDraggingGhost && !isMaximized}
            initial={!isDraggingGhost ? { opacity: 0, scale: 0.85, y: -40, filter: 'blur(6px)' } : false}
            animate={!isDraggingGhost ? { opacity: isDragging ? 0 : 1, scale: 1, filter: 'blur(0px)', y: 0 } : false}
            exit={getExitAnimation()}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onPointerDownCapture={onFocus}

            ref={!isMaximized ? setNodeRef : undefined}
            style={computedStyle}
            {...(!isMaximized && !isDraggingGhost ? attributes : {})}

            className={`
        flex flex-col min-w-0 min-h-0 pointer-events-auto overflow-hidden
        ${showSnap ? 'z-[99999]' : isActive ? 'z-50' : 'z-10'}
        ${!isMaximized && customZoneClass ? customZoneClass : ''}
        ${isMaximized ? 'w-full h-full rounded-none shadow-none border-none opacity-100 bg-white' : 'w-full h-full relative rounded-md'}
        ${!isMaximized && !isActive ? 'opacity-90' : ''}
      `}
        >
            <div className="relative w-full z-[80] shrink-0 h-[34px]">
                <div
                    {...(!isMaximized && !isDraggingGhost ? listeners : {})}
                    onDoubleClick={(e) => { e.stopPropagation(); if (onMaximize) onMaximize(); }}
                    className={`
                        absolute top-0 left-0 w-full z-10 h-[34px] flex items-center justify-between px-3 shrink-0 select-none
                        transition-colors duration-300 shadow-[0_2px_10px_rgba(0,0,0,0.15)] ${getHeaderBgClass(tab.type, isActive)}
                        translate-y-0 opacity-100
                        ${!isMaximized ? 'cursor-grab active:cursor-grabbing' : ''}
                    `}
                >
                    <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                        {getTabIcon(tab.type, isActive)}
                        <span className={`text-[12px] md:text-[13px] font-semibold tracking-wide truncate mt-0.5 ${isActive ? 'text-white/95' : 'text-slate-600'}`}>{tab.title}</span>

                        {/* Küçültülmüş Sekmeler (Hot-Swap Tab Bar) */}
                        {minimizedTabsData.length > 0 && (
                            <div className="flex items-center ml-2 gap-1.5 overflow-x-auto overflow-y-hidden pointer-events-auto scrollbar-hide" onPointerDown={(e) => e.stopPropagation()}>
                                {minimizedTabsData.map(minTab => (
                                    <div
                                        key={minTab.id}
                                        draggable={true}
                                        onDragStart={(e) => {
                                            e.stopPropagation();
                                            e.dataTransfer.setData('application/json', JSON.stringify(minTab));
                                            e.dataTransfer.effectAllowed = 'move';
                                        }}
                                        onPointerDown={(e) => { e.stopPropagation(); }}
                                        onClick={(e) => { e.stopPropagation(); if (onSwapTab) onSwapTab(minTab.id); }}
                                        title={`Geçiş Yap: ${minTab.title}`}
                                        className={`flex items-center gap-1 px-2.5 py-0.5 bg-black/15 border border-white/10 rounded-full cursor-pointer transition-all duration-300 shrink-0 group/pill overflow-hidden relative backdrop-blur-sm ${getPillHoverClass(minTab.type)}`}
                                    >
                                        <div className="opacity-70 group-hover/pill:opacity-100 transition-opacity flex items-center justify-center scale-90 relative z-10">
                                            {getTabIcon(minTab.type, true)}
                                        </div>
                                        <span className="text-[10px] text-white/70 group-hover/pill:text-white/100 truncate max-w-[90px] font-semibold tracking-wide transition-colors relative z-10">
                                            {minTab.title}
                                        </span>
                                        {/* Ekstra ince kaplama (Glass gloss) */}
                                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover/pill:opacity-100 transition-opacity duration-300 z-0 pointer-events-none"></div>
                                    </div>
                                ))}

                                {/* Tüm minimize sekmeleri kapat */}
                                {onCloseAllMinimized && (
                                    <button
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => { e.stopPropagation(); onCloseAllMinimized(); }}
                                        title="Tüm arka plan sekmelerini kapat"
                                        className="flex items-center gap-1 px-2 py-0.5 ml-0.5 bg-black/10 border border-white/10 rounded-full cursor-pointer transition-all duration-200 shrink-0 hover:bg-red-500/60 hover:border-red-300/30 group/closeall"
                                    >
                                        <X size={10} strokeWidth={2.5} className="text-white/50 group-hover/closeall:text-white transition-colors" />
                                        <span className="text-[9px] text-white/50 group-hover/closeall:text-white font-semibold tracking-wide transition-colors">Hepsini kapat</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* CONTROLS */}
                    <div className="flex items-center gap-2 shrink-0 relative z-[9999]" onPointerDown={(e) => e.stopPropagation()}>
                        <button
                            onPointerDown={handleMinimizeClick}
                            onClick={(e) => e.stopPropagation()}
                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110
                            ${isActive
                                    ? 'text-white/50 hover:text-white hover:bg-white/15'
                                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/70'
                                }`}
                            title="Küçült"
                        >
                            <Minus size={13} strokeWidth={2.5} />
                        </button>

                        <div
                            ref={snapContainerRef}
                            className="relative flex items-center justify-center"
                            onMouseEnter={handleMouseEnterSnap}
                            onMouseLeave={handleMouseLeaveSnap}
                        >
                            <button
                                onPointerDown={(e) => { e.stopPropagation(); setShowSnap(!showSnap); }}
                                onClick={(e) => e.stopPropagation()}
                                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110
                                ${isMaximized
                                        ? 'text-white/50 hover:text-white hover:bg-white/15'
                                        : isActive
                                            ? 'text-white/50 hover:text-white hover:bg-white/15'
                                            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/70'
                                    }`}
                                title="Ekran Düzeni"
                            >
                                <LayoutTemplate size={13} strokeWidth={2} />
                            </button>

                            {showSnap && !isMaximized && !isDraggingGhost && createPortal(
                                <div className="fixed inset-0 z-[999999] pointer-events-none">
                                    <AnimatePresence>
                                        <motion.div
                                            key="snap-popup"
                                            initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                            transition={{ duration: 0.15, ease: "easeOut" }}
                                            style={{ top: popupPos.top, left: popupPos.left, x: '-50%' }}
                                            className="absolute bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-[6px] shadow-[0_10px_30px_rgba(0,0,0,0.1)] p-2 w-[160px] grid grid-cols-2 gap-1.5 pointer-events-auto"
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onClick={(e) => e.stopPropagation()}
                                            onMouseEnter={handleMouseEnterSnap}
                                            onMouseLeave={handleMouseLeaveSnap}
                                        >
                                            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-t border-l border-slate-200/80 rotate-45 transform pointer-events-none"></div>

                                            {SNAP_LAYOUTS.map((layout) => (
                                                <div
                                                    key={layout.id}
                                                    className={`w-full h-9 bg-slate-50 border border-slate-200/80 rounded-[3px] p-0.5 gap-0.5 grid hover:border-slate-300 transition-colors
                                                   ${layout.previewClass || layout.parentClass.split(' ')[0]} 
                                                   ${layout.previewClass || layout.parentClass.split(' ')[1]}`}
                                                >
                                                    {layout.zones.map((zone) => (
                                                        <div
                                                            key={zone.id}
                                                            onPointerDown={(e) => {
                                                                e.stopPropagation();
                                                                setShowSnap(false);
                                                                onSelectLayout(layout.id, zone.id);
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className={`bg-slate-200 hover:bg-[#A01B1B] rounded-[2px] transition-colors duration-150 cursor-pointer shadow-sm ${zone.class}`}
                                                            title={`${layout.name} - Alan ${zone.id + 1}`}
                                                        />
                                                    ))}
                                                </div>
                                            ))}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>,
                                document.body
                            )}
                        </div>

                        <button
                            onPointerDown={(e) => { e.stopPropagation(); onClose(); }}
                            onClick={(e) => e.stopPropagation()}
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110
                            ${isActive
                                    ? 'text-white/50 hover:text-white hover:bg-white/15'
                                    : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                                }`}
                        >
                            <X size={13} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </div>

            <div
                className="flex-1 bg-white relative flex items-center justify-center overflow-hidden w-full h-full"
                onPointerDown={(e) => e.stopPropagation()}
            >
                <DynamicViewer tab={tab} />
            </div>
        </motion.div>
    );
};
