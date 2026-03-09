import React from 'react';
import { BookOpen, Share2, X, FileText, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// App.jsx'ten gelen verileri (props) yakalıyoruz
const Header = ({ tabs = [], activeTabId, onTabClick, onCloseTab }) => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-16 flex items-center px-8 bg-transparent z-20 w-full shrink-0 relative"
    >

      {/* SOL ALAN: Sekmeler veya Varsayılan Başlık */}
      <div className="flex-1 flex items-end h-full overflow-x-auto gap-1 pt-3 [&::-webkit-scrollbar]:hidden">

        {tabs.length === 0 ? (
          // HİÇ SEKME YOKSA: Klasik Başlığı Göster
          <div className="h-full flex items-center pb-3">
            <h1 className="text-xl font-semibold text-slate-300 flex items-center tracking-wide group cursor-pointer transition-colors hover:text-white">
              <BookOpen className="w-5 h-5 mr-3 text-teal-500 group-hover:text-teal-400 transition-colors duration-300" />
              Yeni Not Defteri
            </h1>
          </div>
        ) : (
          // SEKME VARSA: Tarayıcı (Chrome) gibi sekmeleri diz
          <AnimatePresence>
            {tabs.map((tab) => {
              const isActive = activeTabId === tab.id;

              return (
                <motion.div
                  key={tab.id}
                  initial={{ opacity: 0, y: 10, width: 0 }}
                  animate={{ opacity: 1, y: 0, width: 'auto' }}
                  exit={{ opacity: 0, width: 0, padding: 0, margin: 0 }}
                  onClick={() => onTabClick(tab.id)}
                  className={`
                    group relative flex items-center h-11 px-4 min-w-[140px] max-w-[220px] cursor-pointer
                    border-t border-x border-b-0 rounded-t-2xl transition-all duration-300 select-none overflow-hidden
                    ${isActive
                      ? 'bg-slate-900/90 border-slate-700/50 text-teal-400 z-10 shadow-[0_-5px_15px_rgba(20,184,166,0.05)]'
                      : 'bg-slate-900/30 border-transparent text-slate-500 hover:bg-slate-800/50 hover:text-slate-300 z-0'}
                  `}
                >
                  {/* Aktif sekmenin üstündeki ince turkuaz lazer çizgisi */}
                  {isActive && (
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-teal-400 to-transparent opacity-70" />
                  )}

                  {/* Dosya Türüne Göre İkon (PDF veya BPMN) */}
                  {tab.type === 'pdf'
                    ? <FileText size={14} className="mr-2 shrink-0" />
                    : <Activity size={14} className="mr-2 shrink-0" />
                  }

                  {/* Sekme İsmi */}
                  <span className="text-xs font-medium truncate flex-1">{tab.title}</span>

                  {/* Kapatma (Çarpı) Butonu */}
                  <button
                    onClick={(e) => onCloseTab(tab.id, e)}
                    className={`
                      ml-2 p-1 rounded-md transition-colors shrink-0
                      ${isActive
                        ? 'hover:bg-slate-800 text-slate-400 hover:text-red-400'
                        : 'opacity-0 group-hover:opacity-100 hover:bg-slate-700/50 text-slate-500 hover:text-red-400'}
                    `}
                  >
                    <X size={12} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* SAĞ ALAN: Paylaş Butonu */}
      <div className="ml-4 flex items-center h-full pb-3">
        <button className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-teal-400 hover:bg-teal-500/10 rounded-xl flex items-center transition-all duration-300 border border-transparent hover:border-teal-500/30 focus:outline-none shrink-0">
          <Share2 className="w-4 h-4 mr-2" /> Paylaş
        </button>
      </div>

    </motion.header>
  );
};

export default Header;