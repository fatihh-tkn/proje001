import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder, FileText, Activity, Settings, User,
  CornerDownRight, FileQuestion, Plus,
  ChevronRight, ChevronDown,
  ChevronsRight, ChevronsLeft
} from 'lucide-react';

import FullLogoImage from '../assets/logo-acik.png';
import SymbolImage from '../assets/logo-kapali.png';
import SettingsMenu from './SettingsMenu';

const getFileIcon = (ext) => {
  switch (ext) {
    case 'pdf': return <FileText size={14} className="shrink-0 text-red-400" />;
    case 'bpmn': return <Activity size={14} className="shrink-0 text-teal-400" />;
    case 'xls': case 'xlsx': return <Activity size={14} className="shrink-0 text-green-400" />;
    case 'txt': case 'doc': case 'docx': return <FileText size={14} className="shrink-0 text-blue-400" />;
    case 'png': case 'jpg': case 'jpeg': return <FileText size={14} className="shrink-0 text-purple-400" />;
    default: return <FileQuestion size={14} className="shrink-0 text-slate-400" />;
  }
};

const listVariants = {
  hidden: { height: 0, opacity: 0 },
  show: {
    height: "auto", opacity: 1,
    transition: { height: { duration: 0.3, ease: "easeInOut" }, staggerChildren: 0.08 }
  },
  exit: {
    height: 0, opacity: 0,
    transition: { height: { duration: 0.3, ease: "easeInOut" }, staggerChildren: 0.05, staggerDirection: -1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: -10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
};

// ==========================================
// YENİ: onOpenFile TreeNode'a eklendi! (Dosya Açma Sinyali)
// ==========================================
const TreeNode = ({ node, level, openFolders, toggleFolder, activeFile, setActiveFile, isCollapsed, setIsCollapsed, setOpenFolders, onOpenFile, tabs }) => {
  const isOpen = !!openFolders[node.id];
  const isAktif = activeFile === node.id;
  const isOpenedInTab = tabs?.some(t => t.id === node.id);
  const paddingLeft = level * 16;

  // 1. EĞER BU BİR KLASÖR İSE:
  if (node.type === 'folder') {
    if (isCollapsed && level > 0) return null;

    return (
      <div className="flex flex-col w-full">
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (isCollapsed) {
              setIsCollapsed(false);
              setOpenFolders(prev => ({ ...prev, [node.id]: true }));
            } else {
              toggleFolder(node.id);
            }
          }}
          className={`flex items-center gap-1.5 text-sm cursor-pointer hover:text-white transition-colors py-1.5 ${isCollapsed ? 'justify-center mb-4' : 'w-full'}`}
          style={{ paddingLeft: !isCollapsed ? `${paddingLeft}px` : '0px' }}
        >
          {!isCollapsed && (
            isOpen ? <ChevronDown size={14} className="text-red-500 shrink-0" /> : <ChevronRight size={14} className="text-slate-500 shrink-0" />
          )}
          <Folder size={isCollapsed ? 24 : 16} className={isCollapsed ? "text-red-500 shrink-0" : "text-slate-400 shrink-0"} />
          {!isCollapsed && <span className="whitespace-nowrap font-medium truncate select-none" title={node.name}>{node.name}</span>}
        </div>

        <AnimatePresence initial={false}>
          {!isCollapsed && isOpen && node.children && (
            <motion.div key={`content-${node.id}`} variants={listVariants} initial="hidden" animate="show" exit="exit" className="flex flex-col w-full space-y-0.5 mt-0.5 relative overflow-hidden">
              <div className="absolute top-0 bottom-0 w-px bg-slate-800" style={{ left: `${paddingLeft + 15}px` }}></div>
              {node.children.map(child => (
                <motion.div key={child.id} variants={itemVariants}>
                  <TreeNode
                    node={child}
                    level={level + 1}
                    openFolders={openFolders}
                    toggleFolder={toggleFolder}
                    activeFile={activeFile}
                    setActiveFile={setActiveFile}
                    isCollapsed={isCollapsed}
                    setIsCollapsed={setIsCollapsed}
                    setOpenFolders={setOpenFolders}
                    onOpenFile={onOpenFile} // onOpenFile'ı alt dosyalara aktar
                    tabs={tabs}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // 2. EĞER BU BİR DOSYA İSE:
  if (isCollapsed) return null;

  let bgColor = 'border border-transparent ml-1';
  let textColor = 'text-slate-400 hover:text-slate-200';

  if (isOpenedInTab) {
    textColor = 'text-red-400 font-medium';
    if (isAktif) bgColor = 'bg-white/10 border border-transparent border-l-2 border-l-red-500 ml-1 rounded-none';
  } else if (isAktif) {
    textColor = 'text-white';
    bgColor = 'bg-white/5 border border-transparent border-l-2 border-l-red-500 ml-1 rounded-none';
  }

  return (
    <div
      draggable={true}
      onDragStart={(e) => {
        // 1) Sürüklenen veriyi (Payload) yükle
        e.dataTransfer.setData('application/json', JSON.stringify({
          id: node.id,
          title: node.name,
          type: node.extension || 'file',
          url: node.url
        }));

        // 2) Kendi özel Sürükleme Hayaletimizi ('Drag Ghost') Oluşturuyoruz
        // DOM'da geçici bir kopya öğe (klon) yarat
        const dragGhost = document.createElement('div');
        dragGhost.className = 'flex items-center gap-2 text-xs rounded p-2 bg-slate-800 text-white font-medium shadow-lg border border-slate-700/50';
        dragGhost.style.position = 'absolute';
        dragGhost.style.top = '-1000px'; // Ekranda görünmemesi için dışarı at

        // İçeriği (Yazı ve ikon HTML olarak eklenebilir, ancak daha güvenilir olması için metin ekliyoruz)
        // Ya da doğrudan tıklanan elemanın bir kopyasını klonlayabiliriz:
        const clone = e.currentTarget.cloneNode(true);
        clone.style.backgroundColor = '#1e293b'; // slate-800
        clone.style.color = '#ffffff';
        clone.style.border = '1px solid #334155';
        clone.style.borderRadius = '6px';
        clone.style.padding = '8px 12px';
        clone.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.5)';
        clone.style.opacity = '1';
        clone.style.width = 'max-content';

        // Eğer klon kullanırsak, paddingLeft vs gibi inline stilleri temizlemeliyiz
        clone.style.paddingLeft = '8px';

        document.body.appendChild(clone);

        // Klonu imlecin altına yerleştir (DataTransfer.setDragImage)
        // 10, 10 -> imlecin kutu içindeki X, Y offset noktasıdır
        e.dataTransfer.setDragImage(clone, 20, 20);

        // setDragImage çağrıldıktan hemen sonra klonu DOM'dan temizleyebiliriz
        // (Tarayıcı hafızasına almıştır)
        setTimeout(() => {
          if (document.body.contains(clone)) {
            document.body.removeChild(clone);
          }
        }, 0);
      }}
      // TEK TIKLAMA: Sadece sol panelde aktif (mavi/yeşil) yapar
      onClick={(e) => {
        e.stopPropagation();
        setActiveFile(node.id);
      }}
      // ÇİFT TIKLAMA: App.jsx'e "Bu dosyayı orta alanda (Sekme olarak) aç!" der
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (onOpenFile) {
          onOpenFile({
            id: node.id,
            title: node.name,
            type: node.extension || 'file',
            url: node.url // İleride dosyayı göstermek için buraya URL ekleyebilirsin
          });
        }
      }}
      className={`flex items-center gap-2 text-xs rounded p-1.5 cursor-pointer whitespace-nowrap transition-all relative z-10 ${bgColor} ${textColor}`}
      style={{ paddingLeft: `${paddingLeft + 14}px` }}
      title="Açmak için çift tıklayın"
    >
      <CornerDownRight size={14} className={isAktif ? "text-red-500 shrink-0" : "text-slate-600 shrink-0"} />
      {getFileIcon(node.extension)}
      <span className="truncate max-w-[150px] select-none">{node.name}</span>
    </div>
  );
};


// ==========================================
// ANA SİDEBAR BİLEŞENİ
// onOpenFile parametresini App.jsx'ten alıyor
// ==========================================
const Sidebar = ({ onOpenFile, tabs = [] }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [treeData, setTreeData] = useState([]);
  const [openFolders, setOpenFolders] = useState({});
  const [activeFile, setActiveFile] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentBasePath, setCurrentBasePath] = useState(localStorage.getItem('savedBasePath') || '');
  const [additionalFiles, setAdditionalFiles] = useState([]);

  // Sidebar boyutu değiştiğinde ayarlar açıksa kapat (genişten kısaya veya kısadan genişe geçerken)
  useEffect(() => {
    if (settingsOpen) {
      setSettingsOpen(false);
    }
  }, [isCollapsed]);

  // Backend'den (Vite eklentisinden) klasör yapısını çeken fonksiyon
  const fetchTree = async (path) => {
    if (!path) return;
    try {
      const res = await fetch(`/api/files/tree?path=${encodeURIComponent(path)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.nodes) {
          setTreeData(data.nodes);
        }
      }
    } catch (err) {
      console.error("Local dosya yolu okunurken hata:", err);
    }
  };

  // Base path değiştiğinde veya belli aralıklarla kontrol etmek için (senkron)
  useEffect(() => {
    if (currentBasePath) {
      fetchTree(currentBasePath);
      // Her 5 saniyede bir dosyalarla sekron/güncel tut
      const interval = setInterval(() => {
        fetchTree(currentBasePath);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [currentBasePath]);

  const handleSetBasePath = (path) => {
    setCurrentBasePath(path);
    localStorage.setItem('savedBasePath', path);
    setAdditionalFiles([]); // Yeni kök klasör geldiğinde, manuel dosyaları sıfırla
    // Yeni yol ayarlandığında hemen getir
    fetchTree(path);
  };

  const handleAddFiles = (filePaths) => {
    const newFiles = filePaths.map(path => {
      // Create valid tree nodes
      const nameMatch = path.match(/[^\/\\]+$/);
      const name = nameMatch ? nameMatch[0] : 'Bilinmeyen Dosya';
      const extMatch = name.match(/\.([^.]+)$/);
      const ext = extMatch ? extMatch[1].toLowerCase() : '';

      return {
        id: path, // ensure unique ID
        name,
        type: 'file',
        extension: ext,
        url: `/api/files/download?path=${encodeURIComponent(path)}`,
      };
    });

    setAdditionalFiles(prev => {
      const prevIds = new Set(prev.map(f => f.id));
      const filtered = newFiles.filter(f => !prevIds.has(f.id));
      return [...prev, ...filtered];
    });
  };

  const toggleFolder = (folderId) => {
    if (isCollapsed) return;
    setOpenFolders(prev => {
      const newState = { ...prev };
      newState[folderId] = !newState[folderId];
      return newState;
    });
  };

  const handleSidebarClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX < rect.right - 14) {
      setIsCollapsed(prev => !prev);
    }
  };

  return (
    <aside className={`relative ${isCollapsed ? 'w-20' : 'w-72'} transition-all duration-300 ease-in-out bg-[#1c1c1e] text-slate-300 flex h-screen border-r border-[#2d2d2d] font-sans shrink-0 z-20 cursor-default`}>

      <div
        className="flex-1 flex flex-col h-full overflow-hidden w-full relative"
        onClick={handleSidebarClick}
      >
        <div className={`flex flex-col items-start h-16 border-b border-slate-800 transition-all duration-300 ${isCollapsed ? 'px-3 pt-3' : 'pl-4 pr-6 pt-3'}`}>
          <div className="flex justify-between w-full items-start">
            <div
              className={`flex flex-col items-start overflow-hidden h-full cursor-pointer transition-all duration-300 ${isCollapsed ? 'w-full justify-center' : 'w-full'}`}
              onClick={(e) => { e.stopPropagation(); setIsCollapsed(prev => !prev); }}
            >
              <AnimatePresence>
                {!isCollapsed ? (
                  <motion.div key="full-logo" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10, position: 'absolute' }} transition={{ duration: 0.25 }} className="flex items-center">
                    <img src={FullLogoImage} alt="Yılgenci Logo" className="h-7 w-auto object-contain" style={{ minWidth: "120px" }} />
                  </motion.div>
                ) : (
                  <motion.div key="symbol-logo" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5, position: 'absolute' }} transition={{ duration: 0.25 }} className="flex items-center justify-center w-full">
                    <img src={SymbolImage} alt="Yılgenci Sembol" className="h-8 w-8 object-contain" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pl-4 py-4 pr-5 overflow-x-hidden [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-600">

          {!isCollapsed && (
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 tracking-widest mb-6 whitespace-nowrap">
              <span>DOSYALAR</span>
            </div>
          )}

          {(treeData.length === 0 && additionalFiles.length === 0) && !isCollapsed && (
            <div
              onClick={(e) => { e.stopPropagation(); setSettingsOpen(true); }}
              className="text-center text-xs text-slate-500 mt-10 border border-dashed border-slate-700 p-4 rounded-xl cursor-pointer hover:border-red-500 hover:text-red-400 transition-colors"
            >
              <Folder size={24} className="mx-auto mb-2" />
              <p>Bilgisayarınızdan klasör seçmek için <strong>ayarlardan (çark) dosya yolunu</strong> belirleyin.</p>
            </div>
          )}

          <div className="flex flex-col space-y-1 w-full items-start">
            {[...additionalFiles, ...treeData].map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                level={0}
                openFolders={openFolders}
                toggleFolder={toggleFolder}
                activeFile={activeFile}
                setActiveFile={setActiveFile}
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                setOpenFolders={setOpenFolders}
                onOpenFile={onOpenFile} // App.jsx'ten gelen gücü buraya veriyoruz
                tabs={tabs}
              />
            ))}
          </div>
        </div>

        <div className={`p-4 border-t border-slate-800 flex items-center relative ${isCollapsed ? 'flex-col gap-6' : 'justify-between pr-6'}`}>
          <SettingsMenu
            isOpen={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            onThemeChange={(themeId) => console.log('Tema değişti:', themeId)}
            onSetBasePath={handleSetBasePath}
            onAddFiles={handleAddFiles}
            currentBasePath={currentBasePath}
            isCollapsed={isCollapsed}
          />
          <Settings data-settings-trigger size={isCollapsed ? 22 : 18} onClick={(e) => { e.stopPropagation(); setSettingsOpen(true); }} className={`cursor-pointer hover:text-white transition-colors ${settingsOpen ? 'text-white' : ''}`} />
          <div onClick={(e) => e.stopPropagation()} className={`rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center cursor-pointer hover:border-red-500 transition-all ${isCollapsed ? 'w-10 h-10' : 'w-8 h-8'}`}>
            <User size={isCollapsed ? 20 : 16} />
          </div>
        </div>
      </div>

      <div
        onClick={(e) => { e.stopPropagation(); setIsCollapsed(prev => !prev); }}
        className="absolute right-0 top-0 bottom-0 w-4 bg-transparent hover:bg-slate-800/50 flex flex-col items-center justify-center transition-colors duration-300 cursor-pointer group z-50 border-l border-transparent hover:border-slate-700/50"
        title={isCollapsed ? "Menüyü Genişlet" : "Menüyü Daralt"}
      >
        {isCollapsed ? (
          <ChevronsRight size={14} className="opacity-0 group-hover:opacity-100 text-slate-400 group-hover:text-red-400 transition-all duration-300" />
        ) : (
          <ChevronsLeft size={14} className="opacity-0 group-hover:opacity-100 text-slate-400 group-hover:text-red-400 transition-all duration-300" />
        )}
      </div>

    </aside>
  );
};

export default Sidebar;