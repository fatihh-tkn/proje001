import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Activity, X } from 'lucide-react';

export const HeaderTabItem = ({ tab, isActive, onTabClick, onCloseTab, onMaximizeTab }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.8, filter: "blur(4px)", width: 0, padding: 0, margin: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={() => onTabClick(tab.id)}
            onDoubleClick={() => onMaximizeTab && onMaximizeTab(tab.id)}
            className={`
        group relative flex items-center h-7 px-3 min-w-[120px] max-w-[200px] cursor-pointer
        rounded-[3px] transition-all duration-300 select-none overflow-hidden font-medium
        ${isActive
                    ? 'bg-slate-200/70 text-slate-800'
                    : 'bg-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}
      `}
        >
            {/* Dosya Türüne Göre İkon */}
            {tab.type === 'pdf'
                ? <FileText size={14} className={`mr-2 shrink-0 transition-colors duration-300 ${isActive ? 'text-slate-600' : 'text-slate-400 group-hover:text-slate-500'}`} />
                : <Activity size={14} className={`mr-2 shrink-0 transition-colors duration-300 ${isActive ? 'text-slate-600' : 'text-slate-400 group-hover:text-slate-500'}`} />
            }

            {/* Sekme İsmi */}
            <span className={`text-xs truncate flex-1 ${isActive ? 'text-slate-800' : ''}`}>{tab.title}</span>

            {/* Aktif Sekmenin Altındaki İnce Gösterge */}
            {isActive && (
                <motion.div layoutId="active-tab-indicator" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-slate-400/50 rounded-t-full" />
            )}

            {/* Kapatma (Çarpı) Butonu */}
            <button
                onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id); }}
                className={`
          ml-2 p-1 rounded-md transition-all shrink-0
          ${isActive
                        ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-300/50'
                        : 'opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-400 hover:text-red-500'}
        `}
            >
                <X size={12} strokeWidth={2.5} />
            </button>
        </motion.div>
    );
};
