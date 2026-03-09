import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Activity, Minus, Maximize2, X } from 'lucide-react';
import FullLogoImage from '../assets/logo-acik.png';
import BpmnViewer from 'bpmn-js/lib/NavigatedViewer';

const BpmnRender = ({ url }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!url || !containerRef.current) return;

    const viewer = new BpmnViewer({
      container: containerRef.current
    });

    fetch(url)
      .then(res => res.text())
      .then(xml => viewer.importXML(xml))
      .then(() => {
        // XML yüklendikten hemen sonra diyagramı otomatik ortala ve sığdır
        const canvas = viewer.get('canvas');
        canvas.zoom('fit-viewport', 'auto');
      })
      .catch(err => console.error("BPMN Loading Error: ", err));

    return () => {
      viewer.destroy();
    };
  }, [url]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-slate-200 rounded-lg overflow-hidden flex-1 cursor-grab active:cursor-grabbing"
      onPointerDown={(e) => e.stopPropagation()} // Dragging ile çakışmaması için
    />
  );
};

// ==========================================
// OTOMATİK ŞABLONLAYICI (AKILLI IZGARA)
// ==========================================
// Ekranda kaç dosya varsa, ekranı ona göre otomatik matematiksel böler.
const getGridLayout = (count) => {
  if (count === 0) return "grid-cols-1 grid-rows-1";
  if (count === 1) return "grid-cols-1 grid-rows-1";
  if (count === 2) return "grid-cols-2 grid-rows-1";
  if (count === 3 || count === 4) return "grid-cols-2 grid-rows-2";
  if (count === 5 || count === 6) return "grid-cols-3 grid-rows-2";
  if (count >= 7 && count <= 9) return "grid-cols-3 grid-rows-3";
  return "grid-cols-4 grid-rows-3"; // 9'dan fazlaysa 4 sütun
};

// ==========================================
// AKILLI PENCERE (TILE) BİLEŞENİ
// ==========================================
const TileWindow = ({ tab, isActive, onMinimize, onClose, onFocus, onDragStart, onDragOver, onDrop, onDragEnd }) => {
  const [isMaximized, setIsMaximized] = useState(false);

  return (
    <motion.div
      layout // MUAZZAM GÜÇ: Pencere sayısı değiştikçe diğerlerinin kayarak yerleşmesini sağlar!
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      onPointerDownCapture={onFocus}

      draggable={!isMaximized}
      onDragStart={(e) => onDragStart && onDragStart(e, tab)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop && onDrop(e, tab)}
      onDragEnd={onDragEnd}

      className={`
        flex flex-col rounded-xl shadow-2xl backdrop-blur-md overflow-hidden
        border cyber-window transition-colors duration-300 pointer-events-auto
        
        /* Aktif pencere parlar, pasifler soluk kalır */
        ${isActive ? 'z-40 border-teal-500/50 bg-slate-900/95 shadow-[0_0_30px_rgba(20,184,166,0.15)]' : 'z-30 border-slate-700/50 bg-slate-900/70 opacity-80'}
        
        /* TAM EKRAN MODU: Şablonu ezip tüm ekranın üzerine çıkar */
        ${isMaximized ? 'absolute inset-0 z-50 w-full h-full !rounded-xl !border-teal-400' : 'relative w-full h-full'}
      `}
    >
      {/* 1. HEADER */}
      <div
        onDoubleClick={() => setIsMaximized(!isMaximized)}
        className={`h-12 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between px-4 shrink-0 select-none ${!isMaximized ? 'cursor-grab active:cursor-grabbing' : ''}`}
        title="Tam ekran yapmak için çift tıklayın, taşımak için sürükleyin"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
          {tab.type === 'pdf' ? <FileText size={16} className="shrink-0 text-red-400" /> : <Activity size={16} className="shrink-0 text-teal-400" />}
          <span className="text-sm font-medium text-slate-300 tracking-wide truncate">{tab.title}</span>
        </div>

        {/* KONTROL BUTONLARI */}
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onMinimize(); }} className="text-slate-500 hover:text-white transition-colors"><Minus size={14} /></button>
          <button onClick={(e) => { e.stopPropagation(); setIsMaximized(!isMaximized); }} className="text-slate-500 hover:text-teal-400 transition-colors"><Maximize2 size={12} /></button>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-slate-500 hover:text-red-400 transition-colors"><X size={16} /></button>
        </div>
      </div>

      {/* 2. İÇERİK (DOSYA GÖRÜNTÜLEYİCİ) */}
      <div className={`flex-1 bg-[#060a13]/80 relative flex items-center justify-center overflow-hidden w-full h-full ${tab.type === 'bpmn' ? 'p-0' : 'p-6 overflow-auto'}`}>
        {tab.type === 'bpmn' ? (
          <BpmnRender url={tab.url} />
        ) : (
          <div className="text-center">
            <div className="inline-block p-4 rounded-full bg-slate-800/50 mb-4 border border-slate-700">
              {tab.type === 'pdf' ? <FileText size={32} className="text-slate-500" /> : <Activity size={32} className="text-slate-500" />}
            </div>
            <h3 className="text-lg font-medium text-slate-300">{tab.title}</h3>
            <p className="text-xs text-slate-500 mt-2">Otomatik Dashboard yerleşimi aktif...</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ==========================================
// ANA WORKSPACE (ORTA ALAN)
// ==========================================
const Workspace = ({ tabs = [], activeTabId, onMinimize, onCloseTab, onFocusTab }) => {
  const [minimizedTabs, setMinimizedTabs] = useState([]);
  const [localTabs, setLocalTabs] = useState([]);

  useEffect(() => {
    if (activeTabId) {
      setMinimizedTabs(prev => prev.filter(id => id !== activeTabId));
    }
  }, [activeTabId]);

  // Sekmeler eklendikçe/silindikçe sıralamayı koru
  useEffect(() => {
    setLocalTabs(prev => {
      const activeTabIds = new Set(tabs.map(t => t.id));
      const filteredPrev = prev.filter(t => activeTabIds.has(t.id));
      const prevIds = new Set(filteredPrev.map(t => t.id));
      const newlyAdded = tabs.filter(t => !prevIds.has(t.id));
      return [...filteredPrev, ...newlyAdded];
    });
  }, [tabs]);

  const visibleTabs = localTabs.filter(tab => !minimizedTabs.includes(tab.id));

  // Ekranda kaç dosya varsa, ona uygun grid sınıfını alıyoruz
  const gridLayoutClass = getGridLayout(visibleTabs.length);

  // --- DRAG DND ---
  const handleDragStart = (e, tab) => {
    e.dataTransfer.setData('tabId', tab.id);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      if (e.target) e.target.style.opacity = '0.4';
    }, 0);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetTab) => {
    e.preventDefault();
    const sourceTabId = e.dataTransfer.getData('tabId');
    if (!sourceTabId || sourceTabId === targetTab.id) return;

    setLocalTabs(prev => {
      const sourceIndex = prev.findIndex(t => t.id === sourceTabId);
      const targetIndex = prev.findIndex(t => t.id === targetTab.id);

      if (sourceIndex === -1 || targetIndex === -1) return prev;

      const newTabs = [...prev];
      // SADECE YER DEĞİŞTİR (SWAP)
      const temp = newTabs[sourceIndex];
      newTabs[sourceIndex] = newTabs[targetIndex];
      newTabs[targetIndex] = temp;

      return newTabs;
    });
  };

  const handleDragEnd = (e) => {
    if (e.target) e.target.style.transition = 'opacity 0.2s';
    if (e.target) e.target.style.opacity = '1';
  };

  return (
    <>
      <div className="flex-1 flex items-center justify-center relative overflow-hidden select-none workspace-dev-logo-container transition-all duration-500">

        {/* KATMAN 1: ARKA PLAN LOGO (YOK OLMAZ, HEP ORADA!) */}
        <div className="relative w-[85%] h-[85%] max-w-[1200px] flex items-center justify-center transition-all duration-500 z-0 pointer-events-none">
          <img src={FullLogoImage} alt="Yılgenci Base Logo" className="w-full h-full object-contain opacity-20 grayscale workspace-base-logo transition-all duration-500" />
          <div className="absolute inset-0 masked-letter-wave-overlay transition-opacity duration-300 opacity-0" style={{ '-webkit-mask-image': `url(${FullLogoImage})`, '-webkit-mask-size': 'contain', '-webkit-mask-repeat': 'no-repeat', '-webkit-mask-position': 'center', 'background-image': 'linear-gradient(90deg, #A00 0%, #FF0000 25%, #FF7F50 50%, #FF0000 75%, #A00 100%)', 'background-size': '200% 100%' }}></div>
        </div>

        {/* KATMAN 2: OTOMATİK DASHBOARD IZGARASI */}
        <div className="absolute inset-0 z-10 p-6 pointer-events-none">
          <motion.div
            layout
            className={`relative w-full h-full grid gap-4 pointer-events-none ${gridLayoutClass}`}
          >
            <AnimatePresence>
              {visibleTabs.map((tab) => (
                <TileWindow
                  key={tab.id}
                  tab={tab}
                  isActive={activeTabId === tab.id}
                  onMinimize={() => {
                    setMinimizedTabs(prev => [...prev, tab.id]);
                    if (onMinimize) onMinimize();
                  }}
                  onClose={() => {
                    if (onCloseTab) onCloseTab(tab.id);
                  }}
                  onFocus={() => {
                    if (onFocusTab) onFocusTab(tab.id);
                  }}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </div>

      </div>
    </>
  );
};

export default Workspace
