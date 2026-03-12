import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Folder, Settings, User,
    ChevronsRight, ChevronsLeft
} from 'lucide-react';

import FullLogoImage from '../../assets/logo-acik.png';
import SymbolImage from '../../assets/logo-kapali.png';
import SettingsMenu from '../settings/SettingsMenu';
import TreeNode from './TreeNode';

const Sidebar = ({ onOpenFile, tabs = [], isCollapsed, setIsCollapsed }) => {
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
                        onOpenFile={onOpenFile}
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
