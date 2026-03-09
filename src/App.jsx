import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Workspace from './components/Workspace';
import ChatInput from './components/ChatInput';

function App() {
  // ==========================================
  // SEKME (TAB) YÖNETİM MOTORU (YENİ)
  // ==========================================
  const [tabs, setTabs] = useState([]); // Açık olan tüm dosyaları tutar
  const [activeTabId, setActiveTabId] = useState(null); // Şu an ekranda hangi dosya var? (null ise devasa logo görünür)

  // Yeni Dosya Açma Fonksiyonu (Bunu ChatInput'a göndereceğiz)
  const handleOpenFile = (file) => {
    // file objesi örneği: { id: 'pdf-1', title: 'Rapor.pdf', type: 'pdf', url: '...' }

    // Eğer dosya zaten açıksa sadece o sekmeye geç
    const existingTab = tabs.find(t => t.id === file.id);
    if (!existingTab) {
      setTabs([...tabs, file]); // Açık değilse yeni sekme olarak ekle
    }
    setActiveTabId(file.id); // Ekrana bu dosyayı yansıt
  };

  // Sekme Kapatma Fonksiyonu (Bunu Header'a göndereceğiz)
  const handleCloseTab = (id, e) => {
    e.stopPropagation(); // Çarpıya basınca sekmenin içine tıklanmış sayılmasını engeller

    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);

    // Eğer kapattığımız sekme şu an ekranda açık olansa, bir öncekine geç veya logoya (null) dön
    if (activeTabId === id) {
      setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
    }
  };

  return (
    // TÜM EKRAN: 3 Sütunlu Mimari
    <div className="flex h-screen w-full bg-[#060a13] overflow-hidden font-sans text-slate-300">

      {/* 1. SÜTUN: SOL MENÜ */}
      <Sidebar onOpenFile={handleOpenFile} tabs={tabs} />

      {/* 2. SÜTUN: ORTA ANA ÇALIŞMA ALANI */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden z-10">

        {/* DİKKAT: Arka plan ızgarası (grid) tamamen SİLİNDİ! Artık derin bir uzay boşluğu var. */}

        {/* Orta Tuval İçeriği */}
        <div className="flex flex-col h-full z-10 relative">

          {/* Header artık sekmeleri çizebilmek için tab verilerine sahip */}
          <Header
            tabs={tabs}
            activeTabId={activeTabId}
            onTabClick={setActiveTabId}
            onCloseTab={handleCloseTab}
          />

          {/* Workspace artık kontrol butonlarının yetkilerine sahip! */}
          <Workspace
            activeTabId={activeTabId}
            tabs={tabs}
            onMinimize={() => setActiveTabId(null)}
            onCloseTab={(id) => handleCloseTab(id, { stopPropagation: () => { } })}
            onFocusTab={(id) => setActiveTabId(id)}
          />
          />

        </div>

      </main>

      {/* 3. SÜTUN: SAĞ YAPAY ZEKA ASİSTANI */}
      {/* ChatInput artık sisteme "Şu dosyayı aç!" diyebilecek */}
      <ChatInput onOpenFile={handleOpenFile} />

    </div>
  );
}

export default App;