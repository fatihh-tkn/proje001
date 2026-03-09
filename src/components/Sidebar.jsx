import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder, FileText, Activity, Settings, User,
  CornerDownRight, FileQuestion, Plus,
  ChevronRight, ChevronDown,
  ChevronsRight, ChevronsLeft
} from 'lucide-react';

import FullLogoImage from '../assets/logo-acik.png';
import SymbolImage from '../assets/logo-kapali.png';

const getFileIcon = (ext) => {
  switch (ext) {
    case 'pdf': return <FileText size={14} className="shrink-0 text-red-400" />;
    case 'bpmn': return <Activity size={14} className="shrink-0 text-teal-400" />;
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
            isOpen ? <ChevronDown size={14} className="text-teal-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-500 shrink-0" />
          )}
          <Folder size={isCollapsed ? 24 : 16} className={isCollapsed ? "text-teal-500 shrink-0" : "text-slate-400 shrink-0"} />
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
    if (isAktif) bgColor = 'bg-red-900/20 border border-red-800/40 ml-1';
  } else if (isAktif) {
    textColor = 'text-teal-400';
    bgColor = 'bg-teal-900/20 border border-teal-800/40 ml-1';
  }

  return (
    <div
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
      <CornerDownRight size={14} className={isAktif ? "text-teal-600 shrink-0" : "text-slate-600 shrink-0"} />
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
  const dosyaInputRef = useRef(null);

  const handleKlasorSecimi = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const root = [...treeData];
    const yeniAcikKlasorler = { ...openFolders };

    files.forEach(file => {
      const parts = file.webkitRelativePath.split('/');
      let currentLevel = root;

      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;

        let existingNode = currentLevel.find(item => item.name === part && item.type === (isFile ? 'file' : 'folder'));

        if (!existingNode) {
          existingNode = {
            id: `node-${part}-${Math.random().toString(36).substr(2, 9)}`,
            name: part,
            type: isFile ? 'file' : 'folder',
            extension: isFile ? part.split('.').pop().toLowerCase() : null,
            children: [],
            // İleride dosyayı Workspace'te açmak için:
            // Dosyanın URL'sini (veya blob verisini) burada saklıyoruz
            url: isFile ? URL.createObjectURL(file) : null
          };
          currentLevel.push(existingNode);
        }
        currentLevel = existingNode.children;
      });
    });

    setTreeData(root);
    setOpenFolders(yeniAcikKlasorler);
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
    <aside className={`relative ${isCollapsed ? 'w-20' : 'w-72'} transition-all duration-300 ease-in-out bg-[#0b1120] text-slate-300 flex h-screen border-r border-slate-800 font-sans shrink-0 z-20 cursor-default`}>

      <input type="file" webkitdirectory="true" directory="true" multiple className="hidden" ref={dosyaInputRef} onChange={handleKlasorSecimi} />

      <div
        className="flex-1 flex flex-col h-full overflow-hidden"
        onClick={handleSidebarClick}
      >
        <div className={`flex flex-col items-start h-16 border-b border-slate-800 transition-all duration-300 ${isCollapsed ? 'px-3 pt-3' : 'px-4 pt-3'}`}>
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
              <button
                onClick={(e) => { e.stopPropagation(); dosyaInputRef.current.click(); }}
                className="text-slate-400 hover:text-teal-400 bg-slate-800/50 hover:bg-slate-800 p-1 rounded transition-colors cursor-pointer"
                title="Klasör Ekle"
              >
                <Plus size={14} />
              </button>
            </div>
          )}

          {treeData.length === 0 && !isCollapsed && (
            <div
              onClick={(e) => { e.stopPropagation(); dosyaInputRef.current.click(); }}
              className="text-center text-xs text-slate-500 mt-10 border border-dashed border-slate-700 p-4 rounded-xl cursor-pointer hover:border-teal-500 hover:text-teal-400 transition-colors"
            >
              <Folder size={24} className="mx-auto mb-2" />
              <p>Bilgisayarınızdan klasör seçmek için <strong>buraya</strong> tıklayın.</p>
            </div>
          )}

          <div className="flex flex-col space-y-1 w-full items-start">
            {treeData.map((node) => (
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

        <div className={`p-4 border-t border-slate-800 flex items-center ${isCollapsed ? 'flex-col gap-6' : 'justify-between'}`}>
          <Settings size={isCollapsed ? 22 : 18} onClick={(e) => e.stopPropagation()} className="cursor-pointer hover:text-white transition-colors" />
          <div onClick={(e) => e.stopPropagation()} className={`rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center cursor-pointer hover:border-teal-500 transition-all ${isCollapsed ? 'w-10 h-10' : 'w-8 h-8'}`}>
            <User size={isCollapsed ? 20 : 16} />
          </div>
        </div>
      </div>

      <div
        onClick={(e) => { e.stopPropagation(); setIsCollapsed(prev => !prev); }}
        className="w-4 shrink-0 bg-transparent hover:bg-slate-800/50 flex flex-col items-center justify-center transition-colors duration-300 cursor-pointer group z-50 border-l border-transparent hover:border-slate-700/50"
        title={isCollapsed ? "Menüyü Genişlet" : "Menüyü Daralt"}
      >
        {isCollapsed ? (
          <ChevronsRight size={14} className="opacity-0 group-hover:opacity-100 text-slate-400 group-hover:text-teal-400 transition-all duration-300" />
        ) : (
          <ChevronsLeft size={14} className="opacity-0 group-hover:opacity-100 text-slate-400 group-hover:text-teal-400 transition-all duration-300" />
        )}
      </div>

    </aside>
  );
};

export default Sidebar;