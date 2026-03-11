import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Activity, Minus, X, LayoutTemplate } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DynamicViewer } from './DynamicViewer';
import { SNAP_LAYOUTS } from './layoutUtils';

export const TileWindow = ({ tab, isActive, isDraggingGhost, activeId, isMaximized, onMinimize, onClose, onFocus, onMaximize, onSelectLayout, customZoneClass }) => {

    const [showSnap, setShowSnap] = useState(false);
    const [isMinimizingAction, setIsMinimizingAction] = useState(false);
    const snapTimeoutRef = useRef(null);

    const handleMouseEnterSnap = () => {
        if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
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
        // State'in güncellenip exit animasyon frame'inin devreye girmesi için ufak bir bekleme (microtask)
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

    // Exit animasyonunu kapatma vs küçültme durumuna göre ayırıyoruz
    const getExitAnimation = () => {
        if (isDraggingGhost) return false;
        if (isMinimizingAction) {
            // MacOS tarzı aşağı doğru süzülerek küçülme
            return { opacity: 0, scale: 0.4, y: 150, filter: 'blur(10px)' };
        }
        // Normal (Kapatma/X) animasyonu
        return { opacity: 0, scale: 0.92, filter: 'blur(6px)' };
    };

    return (
        <motion.div
            layout={!isDraggingGhost && !isMaximized}
            initial={!isDraggingGhost ? { opacity: 0, scale: 0.92, filter: 'blur(8px)' } : false}
            animate={!isDraggingGhost ? { opacity: isDragging ? 0 : 1, scale: 1, filter: 'blur(0px)', y: 0 } : false}
            exit={getExitAnimation()}
            transition={{ type: "tween", ease: "circOut", duration: 0.35 }}
            onPointerDownCapture={onFocus}

            ref={!isMaximized ? setNodeRef : undefined}
            style={isDraggingGhost ? {} : (isMaximized ? {} : style)}
            {...(!isMaximized && !isDraggingGhost ? attributes : {})}

            className={`
        flex flex-col shadow-2xl backdrop-blur-md min-w-0 min-h-0
        border cyber-window pointer-events-auto
        ${isMaximized ? '' : 'rounded-xl'}
        ${!isMaximized && customZoneClass ? customZoneClass : ''}
        
        ${isActive ? 'border-slate-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.15)]' : 'border-slate-200 bg-slate-50 opacity-90'}
        
        ${isMaximized ? 'w-full h-full' : 'w-full h-full relative'}
      `}
        >
            <div
                {...(!isMaximized && !isDraggingGhost ? listeners : {})}
                className={`h-12 border-b flex items-center justify-between px-4 shrink-0 select-none transition-colors duration-300 ${isMaximized ? '' : 'rounded-t-xl'}
          ${isActive ? 'bg-[#A01B1B] border-[#8a1717]' : 'bg-slate-50 border-slate-200'}
          ${!isMaximized ? 'cursor-grab active:cursor-grabbing' : ''}
        `}
            >
                <div className="flex items-center gap-2 flex-1 min-w-0 pr-2 pointer-events-none">
                    {tab.type === 'pdf'
                        ? <FileText size={16} className={`shrink-0 ${isActive ? 'text-white/80' : 'text-red-500'}`} />
                        : <Activity size={16} className={`shrink-0 ${isActive ? 'text-white/80' : 'text-slate-500'}`} />}
                    <span className={`text-sm font-medium tracking-wide truncate ${isActive ? 'text-white' : 'text-slate-700'}`}>{tab.title}</span>
                </div>

                {/* CONTROLS */}
                <div className="flex items-center gap-3 shrink-0 relative z-[9999]" onPointerDown={(e) => e.stopPropagation()}>
                    <button onClick={handleMinimizeClick} className={`transition-colors cursor-pointer focus:outline-none hover:scale-110 transform duration-200 ${isActive ? 'text-white/60 hover:text-white' : 'text-slate-400 hover:text-slate-800'}`} title="Küçült">
                        <Minus size={14} />
                    </button>

                    <div
                        className="relative flex items-center justify-center -my-2 py-2 -mx-1 px-1"
                        onMouseEnter={handleMouseEnterSnap}
                        onMouseLeave={handleMouseLeaveSnap}
                    >
                        <button onClick={(e) => { e.stopPropagation(); setShowSnap(!showSnap); }} className={`transition-colors cursor-pointer ${isMaximized ? 'text-white hover:text-white/80' : isActive ? 'text-white/60 hover:text-white' : 'text-slate-400 hover:text-red-500'}`} title="Ekran Düzeni (Üzerine Gelin)">
                            <LayoutTemplate size={12} />
                        </button>

                        {/* SNAP LAYOUT POPUP */}
                        <AnimatePresence>
                            {showSnap && !isMaximized && !isDraggingGhost && (
                                <motion.div
                                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                    className="absolute top-full -right-[110px] mt-6 bg-[#232323]/95 backdrop-blur-xl border border-[#444]/60 rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.6)] px-4 py-4 w-[280px] grid grid-cols-2 gap-3"
                                    onClick={(e) => e.stopPropagation()}
                                    onPointerDown={(e) => e.stopPropagation()}
                                >
                                    {/* Ok / Pointer İşareti */}
                                    <div className="absolute -top-1.5 right-[114px] w-3 h-3 bg-[#232323] border-t border-l border-[#444]/60 rotate-45 transform pointer-events-none"></div>

                                    {SNAP_LAYOUTS.map((layout) => (
                                        <div
                                            key={layout.id}
                                            className={`w-full h-16 bg-[#333]/50 border border-[#444]/50 rounded-lg p-[5px] gap-[5px] grid 
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
                                                    className={`bg-[#555] hover:bg-white rounded-[3px] transition-all duration-150 cursor-pointer shadow-sm ${zone.class}`}
                                                    title={`${layout.name} - Alan ${zone.id + 1}`}
                                                />
                                            ))}
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <button onClick={(e) => { e.stopPropagation(); onClose(); }} className={`transition-colors cursor-pointer ${isActive ? 'text-white/60 hover:text-white' : 'text-slate-400 hover:text-red-500'}`}>
                        <X size={16} />
                    </button>
                </div>
            </div>

            <div className={`flex-1 bg-white relative flex items-center justify-center overflow-hidden w-full h-full ${isMaximized ? '' : 'rounded-b-xl'}`} onPointerDown={(e) => e.stopPropagation()}>
                <DynamicViewer tab={tab} />
            </div>
        </motion.div>
    );
};
