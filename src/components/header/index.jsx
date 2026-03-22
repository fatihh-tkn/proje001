import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GhostStatusBox } from './GhostStatusBox';
import { HeaderTabItem } from './HeaderTabItem';
import { CloseAllTabsButton } from './CloseAllTabsButton';
import { ShareButton } from './ShareButton';

// App.jsx'ten gelen verileri (props) yakalıyoruz
const Header = ({ tabs = [], activeTabId, onTabClick, onCloseTab, onCloseAllTabs, onMaximizeTab }) => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-10 flex items-center px-4 bg-white/40 backdrop-blur-md border-b border-white/50 z-20 w-full shrink-0 relative shadow-[0_4px_30px_rgba(0,0,0,0.02)]"
    >

      {/* SOL ALAN: Sekmeler veya Varsayılan Başlık */}
      <div className="flex-1 flex items-center h-full overflow-hidden px-1 py-1">

        {tabs.length === 0 ? (
          // HİÇ SEKME YOKSA: Boş bırakıyoruz (Yükleme ekranı artık sol üstte kutucuk olarak görünmeyecek)
          <div className="h-full flex items-center">
            
          </div>
        ) : (
          // SEKME VARSA: Modern Mac-Style Pill (Hap) Tasarımı (Tüm alanı kaplayabilir)
          <div className="flex items-stretch bg-slate-100/60 ring-1 ring-slate-200/60 rounded-[4px] max-w-full overflow-hidden mr-2">

            {/* Scroll edilebilir yatay sekme listesi */}
            <div className="flex items-center gap-1 p-1 overflow-x-auto overflow-y-hidden mac-horizontal-scrollbar flex-1">
              <AnimatePresence>
                {tabs.map((tab) => (
                  <HeaderTabItem
                    key={tab.id}
                    tab={tab}
                    isActive={activeTabId === tab.id}
                    onTabClick={onTabClick}
                    onCloseTab={onCloseTab}
                    onMaximizeTab={onMaximizeTab}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* SABİT ÇÖP KOVASI (Sekme barının uzantısı olarak kalıcı) */}
            <CloseAllTabsButton onCloseAllTabs={onCloseAllTabs} />

          </div>
        )}
      </div>

      {/* SAĞ ALAN: Paylaş Butonu */}
      <ShareButton />

    </motion.header>
  );
};

export default Header;