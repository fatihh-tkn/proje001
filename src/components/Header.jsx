import React from 'react';
import { Edit, Share2, X, FileText, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// App.jsx'ten gelen verileri (props) yakalıyoruz
const Header = ({ tabs = [], activeTabId, onTabClick, onCloseTab, onMaximizeTab }) => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-16 flex items-center px-8 bg-white/40 backdrop-blur-md border-b border-white/50 z-20 w-full shrink-0 relative shadow-[0_4px_30px_rgba(0,0,0,0.02)]"
    >

      {/* SOL ALAN: Sekmeler veya Varsayılan Başlık */}
      <div className="flex-1 flex items-center h-full overflow-x-auto gap-2 px-1 pb-1 pt-2 mac-horizontal-scrollbar">

        {tabs.length === 0 ? (
          // HİÇ SEKME YOKSA: Klasik Başlığı Göster
          <div className="h-full flex items-center">
            <h1 className="text-xl font-bold text-slate-700 flex items-center tracking-tight group cursor-pointer transition-colors hover:text-red-500">
              <Edit className="w-5 h-5 mr-3 text-slate-400 group-hover:text-red-400 transition-colors duration-300" />
              Çalışma Alanı Merkezi
            </h1>
          </div>
        ) : (
          // SEKME VARSA: Modern Mac-Style Pill (Hap) Tasarımı
          <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/60 ring-1 ring-slate-200/60 rounded-xl">
            <AnimatePresence>
              {tabs.map((tab) => {
                const isActive = activeTabId === tab.id;

                return (
                  <motion.div
                    key={tab.id}
                    initial={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.8, filter: "blur(4px)", width: 0, padding: 0, margin: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    onClick={() => onTabClick(tab.id)}
                    onDoubleClick={() => onMaximizeTab && onMaximizeTab(tab.id)}
                    className={`
                      group relative flex items-center h-9 px-4 min-w-[120px] max-w-[200px] cursor-pointer
                      rounded-lg transition-all duration-300 select-none overflow-hidden font-medium
                      ${isActive
                        ? 'bg-[#A01B1B] shadow-[0_2px_12px_rgba(160,27,27,0.25)] text-white ring-1 ring-[#8a1717]'
                        : 'bg-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}
                    `}
                  >
                    {/* Dosya Türüne Göre İkon */}
                    {tab.type === 'pdf'
                      ? <FileText size={14} className={`mr-2 shrink-0 transition-colors duration-300 ${isActive ? 'text-white/80' : 'text-slate-400 group-hover:text-slate-500'}`} />
                      : <Activity size={14} className={`mr-2 shrink-0 transition-colors duration-300 ${isActive ? 'text-white/80' : 'text-slate-400 group-hover:text-slate-500'}`} />
                    }

                    {/* Sekme İsmi */}
                    <span className={`text-xs truncate flex-1 ${isActive ? 'text-white' : ''}`}>{tab.title}</span>

                    {/* Aktif Sekmenin Altındaki İnce Gösterge */}
                    {isActive && (
                      <motion.div layoutId="active-tab-indicator" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-white/50 rounded-t-full" />
                    )}

                    {/* Kapatma (Çarpı) Butonu */}
                    <button
                      onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id); }}
                      className={`
                        ml-2 p-1 rounded-md transition-all shrink-0
                        ${isActive
                          ? 'text-white/50 hover:text-white hover:bg-white/20'
                          : 'opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-400 hover:text-red-500'}
                      `}
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* SAĞ ALAN: Paylaş Butonu */}
      <div className="ml-4 flex items-center h-full">
        <button className="px-5 py-2.5 text-xs font-bold tracking-wide text-slate-600 hover:text-red-600 bg-white hover:bg-red-50 rounded-xl flex items-center transition-all duration-300 border border-slate-200 hover:border-red-200 shadow-sm hover:shadow-md focus:outline-none shrink-0 cursor-pointer">
          <Share2 className="w-4 h-4 mr-2" />
          PAYLAŞ
        </button>
      </div>

    </motion.header>
  );
};

export default Header;