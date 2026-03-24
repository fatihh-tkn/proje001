import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Activity, Minus, X, LayoutTemplate } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DynamicViewer } from './DynamicViewer';
import { SNAP_LAYOUTS } from './layoutUtils';

export const TileWindow = ({ tab, isActive, isDraggingGhost, activeId, isMaximized, onMinimize, onClose, onFocus, onMaximize, onSelectLayout, customZoneClass }) => {

    const [showSnap, setShowSnap] = useState(false);
    const [isMinimizingAction, setIsMinimizingAction] = useState(false);
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
        }, 250);
    };

    const handleMinimizeClick = (e) => {
        e.stopPropagation();
        setIsMinimizingAction(true);
        setTimeout(() => {
            onMinimize();
        }, 5);
    };

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: tab.id,
        disabled: isMaximized || isDraggingGhost
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
    };

    const getExitAnimation = () => {
        if (isDraggingGhost) return false;
        if (isMinimizingAction) {
            return { opacity: 0, scale: 0.1, y: -window.innerHeight * 0.4, filter: 'blur(4px)' };
        }
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
            style={isDraggingGhost ? {} : (isMaximized ? {} : style)}
            {...(!isMaximized && !isDraggingGhost ? attributes : {})}

            className={`
        flex flex-col min-w-0 min-h-0 pointer-events-auto overflow-hidden
        ${showSnap ? 'z-[99999]' : isActive ? 'z-50' : 'z-10'}
        ${!isMaximized && customZoneClass ? customZoneClass : ''}
        ${isActive
                    ? 'shadow-[0_0_0_1px_rgba(160,27,27,0.5),0_20px_60px_rgba(0,0,0,0.2)]'
                    : 'shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.06)] opacity-90'}
        ${isMaximized ? 'w-full h-full' : 'w-full h-full relative'}
      `}
        >
            <div
                {...(!isMaximized && !isDraggingGhost ? listeners : {})}
                onDoubleClick={(e) => { e.stopPropagation(); if (onMaximize) onMaximize(); }}
                className={`
                    h-7 flex items-center justify-between px-2.5 shrink-0 select-none
                    transition-all duration-200
                    ${!isMaximized ? 'cursor-grab active:cursor-grabbing' : ''}
                    ${isActive
                        ? 'bg-gradient-to-r from-[#8a1717] to-[#B52020] border-b border-[#6e1010]/60'
                        : 'bg-[#f8f8f8] border-b border-slate-200/80 backdrop-blur-sm'
                    }
                `}
            >
                <div className="flex items-center gap-2 flex-1 min-w-0 pr-2 pointer-events-none">
                    {tab.type === 'pdf'
                        ? <FileText size={12} strokeWidth={2} className={`shrink-0 ${isActive ? 'text-white/70' : 'text-[#A01B1B]/60'}`} />
                        : <Activity size={12} strokeWidth={2} className={`shrink-0 ${isActive ? 'text-white/70' : 'text-slate-400'}`} />}
                    <span className={`text-[11px] font-semibold tracking-wide truncate ${isActive ? 'text-white/95' : 'text-slate-600'}`}>{tab.title}</span>
                </div>

                {/* CONTROLS */}
                <div className="flex items-center gap-2 shrink-0 relative z-[9999]" onPointerDown={(e) => e.stopPropagation()}>
                    <button
                        onClick={handleMinimizeClick}
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110
                            ${isActive
                                ? 'text-white/50 hover:text-white hover:bg-white/15'
                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/70'
                            }`}
                        title="Küçült"
                    >
                        <Minus size={10} strokeWidth={2.5} />
                    </button>

                    <div
                        ref={snapContainerRef}
                        className="relative flex items-center justify-center"
                        onMouseEnter={handleMouseEnterSnap}
                        onMouseLeave={handleMouseLeaveSnap}
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowSnap(!showSnap); }}
                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110
                                ${isMaximized
                                    ? 'text-white/50 hover:text-white hover:bg-white/15'
                                    : isActive
                                        ? 'text-white/50 hover:text-white hover:bg-white/15'
                                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/70'
                                }`}
                            title="Ekran Düzeni"
                        >
                            <LayoutTemplate size={10} strokeWidth={2} />
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
                                        onClick={(e) => e.stopPropagation()}
                                        onPointerDown={(e) => e.stopPropagation()}
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
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowSnap(false);
                                                            onSelectLayout(layout.id, zone.id);
                                                        }}
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
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110
                            ${isActive
                                ? 'text-white/50 hover:text-white hover:bg-white/15'
                                : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                            }`}
                    >
                        <X size={10} strokeWidth={2.5} />
                    </button>
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
