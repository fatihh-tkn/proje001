import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDroppable } from '@dnd-kit/core';
import { Trash2 } from 'lucide-react';

export const TrashDropZone = ({ isDragging }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: 'trash-zone',
    });

    return (
        <div className="absolute bottom-10 left-0 right-0 flex justify-center pointer-events-none z-[100]">
            <AnimatePresence>
                {isDragging && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.85 }}
                        transition={{ type: "spring", stiffness: 450, damping: 25 }}
                        ref={setNodeRef}
                        className={`
              flex items-center justify-center transition-all duration-400 ease-out backdrop-blur-2xl pointer-events-auto h-16 px-10 rounded-[2rem] gap-4 border ring-1 ring-inset
              ${isOver
                                ? 'bg-red-500 text-white border-red-400 ring-red-400 shadow-[0_0_60px_-10px_rgba(239,68,68,0.6)] scale-[1.05] -translate-y-2'
                                : 'bg-white/60 text-slate-600 border-white/50 ring-white/30 shadow-[0_10px_40px_rgba(0,0,0,0.06)]'}
            `}
                    >
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${isOver ? 'bg-white/20' : 'bg-white shadow-sm border border-slate-100'}`}>
                            <Trash2 size={20} strokeWidth={isOver ? 2.5 : 2} className={isOver ? 'text-white' : 'text-red-400'} />
                        </div>
                        <span className={`text-[15px] font-semibold tracking-wide whitespace-nowrap transition-colors duration-300 ${isOver ? 'text-white' : 'text-slate-600'}`}>
                            {isOver ? "Kapatmak İçin Bırak" : "Kapatmak İçin Çöpe Sürükle"}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
