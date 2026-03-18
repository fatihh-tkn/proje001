import React, { useState } from 'react';
import Sidebar from './components/sidebar/Sidebar';
import Header from './components/header/index';
import Workspace from './components/workspace/Workspace';
import ChatInput from './components/chatbar/ChatBar';

function App() {
  // ==========================================
  // SEKME (TAB) YÖNETİM MOTORU (YENİ)
  // ==========================================
  const [tabs, setTabs] = useState([]); // Açık olan tüm dosyaları tutar
  const [activeTabId, setActiveTabId] = useState(null); // Şu an ekranda hangi dosya var?
  const [maximizedTabId, setMaximizedTabId] = useState(null); // Tam ekran açık olan sekme

  // Kenar Çubukları State'leri
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightOpen, setIsRightOpen] = useState(true);

  // Arka plana çift tıklama ile iki sidebar'ı da kapat/aç
  const handleBackgroundDoubleClick = () => {
    const isAnyOpen = !isLeftCollapsed || isRightOpen;
    setIsLeftCollapsed(isAnyOpen);
    setIsRightOpen(!isAnyOpen);
  };

  // Yeni Dosya Açma Fonksiyonu (Bunu ChatInput'a göndereceğiz)
  const handleOpenFile = (file) => {
    const existingTab = tabs.find(t => t.id === file.id);

    if (!existingTab) {
      setTabs([...tabs, file]); // Açık değilse yeni sekme olarak ekle
    }
    setActiveTabId(file.id); // Ekrana bu dosyayı yansıt

    // Eğer bir pencere kullanıcı tarafından ZATEN tam ekran yapılmışsa,
    // yeni açılan dosyayı da o tam ekranın (overlay) içine al.
    // VEYA yeni açılan dosya forceMaximize: true ile geldiyse tam ekran aç.
    if (maximizedTabId || file.forceMaximize) {
      setMaximizedTabId(file.id);
    }
  };

  // Sekme Kapatma Fonksiyonu
  const handleCloseTab = (id, e) => {
    if (e && e.stopPropagation) e.stopPropagation(); // Event varsa durdur, yoksa hata verme

    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);

    // Eğer kapattığımız sekme şu an ekranda açık olansa, bir öncekine geç veya logoya (null) dön
    if (activeTabId === id) {
      setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
    }
    // Kapatılan sekme tam ekrandaysa, tam ekranı da kapat
    if (maximizedTabId === id) {
      setMaximizedTabId(null);
    }
  };

  // Tüm Sekmeleri Kapatma Fonksiyonu
  const handleCloseAllTabs = () => {
    setTabs([]);
    setActiveTabId(null);
    setMaximizedTabId(null);
  };

  // Tam Ekran Toggle Fonksiyonu
  const handleMaximizeTab = (id) => {
    setMaximizedTabId(prev => prev === id ? null : id);
    setActiveTabId(id);
  };

  return (
    // TÜM EKRAN: 3 Sütunlu Mimari
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans text-slate-800">

      {/* 1. SÜTUN: SOL MENÜ */}
      <Sidebar
        onOpenFile={handleOpenFile}
        tabs={tabs}
        isCollapsed={isLeftCollapsed}
        setIsCollapsed={setIsLeftCollapsed}
      />

      {/* 2. SÜTUN: ORTA ANA ÇALIŞMA ALANI */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden z-10">

        {/* DİKKAT: Arka plan ızgarası (grid) tamamen SİLİNDİ! Artık derin bir uzay boşluğu var. */}

        {/* Orta Tuval İçeriği */}
        <div className="flex flex-col h-full z-10 relative">

          {/* Header artık sekmeleri çizebilmek için tab verilerine sahip */}
          <Header
            tabs={tabs}
            activeTabId={activeTabId}
            onTabClick={(id) => {
              setActiveTabId(id);
              // Tam ekran açıksa, tıklanan sekmeyi tam ekrana al
              if (maximizedTabId) setMaximizedTabId(id);
            }}
            onCloseTab={handleCloseTab}
            onCloseAllTabs={handleCloseAllTabs}
            onMaximizeTab={handleMaximizeTab}
          />

          {/* Workspace artık kontrol butonlarının yetkilerine sahip! */}
          <Workspace
            activeTabId={activeTabId}
            tabs={tabs}
            maximizedTabId={maximizedTabId}
            onMinimize={() => setActiveTabId(null)}
            onCloseTab={(id) => handleCloseTab(id)}
            onFocusTab={(id) => setActiveTabId(id)}
            onMaximizeTab={handleMaximizeTab}
            onOpenFile={handleOpenFile}
            onBackgroundDoubleClick={handleBackgroundDoubleClick}
          />

        </div>

      </main>

      {/* 3. SÜTUN: SAĞ YAPAY ZEKA ASİSTANI */}
      {/* ChatInput artık sisteme "Şu dosyayı aç!" diyebilecek */}
      <ChatInput
        onOpenFile={handleOpenFile}
        isSideOpen={isRightOpen}
        setIsSideOpen={setIsRightOpen}
      />

    </div>
  );
}

export default App;