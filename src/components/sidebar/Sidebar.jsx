import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Folder, Settings, User,
    ChevronsRight, ChevronsLeft, Files, LayoutGrid, Webhook
} from 'lucide-react';

import FullLogoImage from '../../assets/logo-acik.png';
import SymbolImage from '../../assets/logo-kapali.png';
import SettingsMenu from '../settings/SettingsMenu';
import TreeNode from './TreeNode';
import WorkspacePanel from './WorkspacePanel';

const Sidebar = ({ onOpenFile, tabs = [], isCollapsed, setIsCollapsed, workspaces = [], activeWorkspaceId, onSwitchWorkspace, onAddWorkspace, onCloseWorkspace, recentlyClosed = [], onReopenTab }) => {
    const [treeData, setTreeData] = useState([]);
    const [archiveData, setArchiveData] = useState([]);
    const [openFolders, setOpenFolders] = useState({});
    const [activeFile, setActiveFile] = useState(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [currentBasePath, setCurrentBasePath] = useState(localStorage.getItem('savedBasePath') || '');
    const [additionalFiles, setAdditionalFiles] = useState([]);
    const [sidebarTab, setSidebarTab] = useState('files');

    const fetchArchive = async () => {
        try {
            const res = await fetch('/api/archive/list');
            if (res.ok) {
                const data = await res.json();
                setArchiveData(data.items || []);
            }
        } catch (err) {
            console.error("Archive fetch error:", err);
        }
    };

    useEffect(() => {
        fetchArchive();
    }, []);

    const getArchiveTree = () => {
        if (!archiveData || archiveData.length === 0) return null;

        const map = {};
        const rootNodes = [];

        archiveData.forEach(item => {
            map[item.id] = {
                id: `archive_${item.id}`,
                name: item.filename,
                type: item.file_type === 'folder' ? 'folder' : 'file',
                extension: item.file_type !== 'folder' ? item.file_type : undefined,
                url: `/api/archive/file/${item.id}`,
                children: []
            };
        });

        archiveData.forEach(item => {
            const node = map[item.id];
            if (item.folder_id && map[item.folder_id]) {
                map[item.folder_id].children.push(node);
            } else {
                rootNodes.push(node);
            }
        });

        return {
            id: 'archive_root_folder',
            name: 'Arşiv',
            type: 'folder',
            children: rootNodes
        };
    };

    useEffect(() => {
        if (settingsOpen) setSettingsOpen(false);
    }, [isCollapsed]);

    const fetchTree = async (path) => {
        if (!path) return;
        try {
            const res = await fetch(`/api/files/tree?path=${encodeURIComponent(path)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.nodes) setTreeData(data.nodes);
            }
        } catch (err) {
            console.error("Local dosya yolu okunurken hata:", err);
        }
    };

    useEffect(() => {
        if (currentBasePath) fetchTree(currentBasePath);
    }, [currentBasePath]);

    const handleSetBasePath = (path) => {
        setCurrentBasePath(path);
        localStorage.setItem('savedBasePath', path);
        setAdditionalFiles([]);
        fetchTree(path);
    };

    const handleAddFiles = (filePaths) => {
        const newFiles = filePaths.map(path => {
            const nameMatch = path.match(/[^\\/\\\\]+$/);
            const name = nameMatch ? nameMatch[0] : 'Bilinmeyen Dosya';
            const extMatch = name.match(/\\.([^.]+)$/);
            const ext = extMatch ? extMatch[1].toLowerCase() : '';
            return {
                id: path,
                name,
                type: 'file',
                extension: ext,
                url: `/api/files/download?path=${encodeURIComponent(path)}`,
            };
        });
        setAdditionalFiles(prev => {
            const prevIds = new Set(prev.map(f => f.id));
            return [...prev, ...newFiles.filter(f => !prevIds.has(f.id))];
        });
    };

    const toggleFolder = (folderId) => {
        if (isCollapsed) return;
        setOpenFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
    };

    const handleSidebarClick = (e) => {
        if (isCollapsed) {
            setIsCollapsed(false);
        } else {
            // Açıkken, içerikteki buton, link veya listeye tıklanmıyorsa kapansın.
            const isInteractive = e.target.closest('button, a, input, .cursor-pointer, li, .interactive, summary');
            if (!isInteractive) {
                setIsCollapsed(true);
            }
        }
    };

    const activeWs = workspaces.find(w => w.id === activeWorkspaceId);
    const wsTabCount = activeWs?.tabs?.length || 0;

    return (
        <aside className={`relative ${isCollapsed ? 'w-[68px]' : 'w-72'} font-sans transition-all duration-300 ease-in-out flex h-screen shrink-0 z-20 cursor-default`}
            style={{ background: 'linear-gradient(180deg, #1a1a1c 0%, #161618 100%)', borderRight: '1px solid #2a2a2d' }}
        >
            {/* SettingsMenu — overflow-hidden dışında, doğrudan aside içinde */}
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
            <div
                className="flex-1 flex flex-col h-full overflow-hidden w-full relative"
                onClick={handleSidebarClick}
            >
                {/* ── LOGO HEADER ── */}
                <div className={`flex items-center h-14 shrink-0 transition-all duration-300 ${isCollapsed ? 'px-0 justify-center' : 'px-4'}`}>
                    <div
                        className="flex items-center overflow-hidden cursor-pointer w-full h-full"
                        onClick={(e) => { e.stopPropagation(); setIsCollapsed(prev => !prev); }}
                    >
                        <div className={`relative flex items-center h-10 w-full ${isCollapsed ? '' : 'ml-1'}`}>
                            {/* SEMBOL LOGO (Alt Katman - Her Zaman Sabit) */}
                            <motion.div
                                initial={false}
                                animate={{
                                    opacity: isCollapsed ? 1 : 0,
                                    scale: isCollapsed ? 1 : 0.85,
                                    x: isCollapsed ? 0 : -10
                                }}
                                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                className={`absolute inset-0 flex items-center justify-center`}
                            >
                                <img src={SymbolImage} alt="Yılgenci Sembol" className="h-9 w-9 object-contain" />
                            </motion.div>

                            {/* TAM LOGO (Üst Katman - Maskelenerek Kapanan) */}
                            <motion.div
                                initial={false}
                                animate={{
                                    width: isCollapsed ? "0%" : "100%",
                                    opacity: isCollapsed ? 0 : 1,
                                    x: isCollapsed ? -20 : 1
                                }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="relative flex items-center overflow-hidden whitespace-nowrap"
                            >
                                <img src={FullLogoImage} alt="Yılgenci Logo" className="h-9 w-auto object-contain" style={{ minWidth: '150px' }} />
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* ── SEKME NAVİGASYONU (SEGMENTED CONTROL) ── */}
                {!isCollapsed && (
                    <div className="px-3 pt-3 pb-2 w-full">
                        <div className="flex relative bg-slate-800/60 p-[3px] rounded-sm border border-slate-700/50 w-full">
                            {[
                                { id: 'files', label: 'Dosyalar', icon: Files, badge: null },
                                { id: 'workspace', label: 'Alan', icon: LayoutGrid, badge: null },
                            ].map(tab => {
                                const isActive = sidebarTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={(e) => { e.stopPropagation(); setSidebarTab(tab.id); }}
                                        className={`relative flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-semibold tracking-widest uppercase transition-colors duration-200 z-10 rounded-[2px]
                                            ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}
                                        `}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="sidebar-tab-indicator"
                                                className="absolute inset-0 bg-slate-700/80 rounded-[2px] shadow-sm border border-slate-600/50"
                                                initial={false}
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                                            />
                                        )}
                                        <span className="relative z-20 flex items-center gap-1.5">
                                            <tab.icon size={12} className={isActive ? 'text-[#A01B1B]' : ''} />
                                            {tab.label}
                                            {tab.badge !== null && (
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 min-w-[16px] flex items-center justify-center leading-none rounded-[3px] transition-colors ${isActive ? 'bg-[#A01B1B] text-white shadow-sm' : 'bg-slate-700 border border-slate-600 text-slate-300'}`}>
                                                    {tab.badge}
                                                </span>
                                            )}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── İÇERİK ALANI ── */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3
                    [&::-webkit-scrollbar]:w-1
                    [&::-webkit-scrollbar-track]:bg-transparent
                    [&::-webkit-scrollbar-thumb]:bg-slate-700/60
                    [&::-webkit-scrollbar-thumb]:rounded-none
                    hover:[&::-webkit-scrollbar-thumb]:bg-slate-600"
                >
                    {/* DOSYALAR */}
                    {(isCollapsed || sidebarTab === 'files') && (
                        <>
                            {(treeData.length === 0 && additionalFiles.length === 0 && archiveData.length === 0) && !isCollapsed && (
                                <div
                                    onClick={(e) => { e.stopPropagation(); setSettingsOpen(true); }}
                                    className="flex flex-col items-center text-center mt-10 px-4 py-6 border border-dashed border-slate-700/60 cursor-pointer group transition-colors"
                                    style={{ borderRadius: 0 }}
                                >
                                    <Folder size={20} className="mb-2 text-slate-600 group-hover:text-[#A01B1B] transition-colors" />
                                    <p className="text-[10px] text-slate-500 group-hover:text-slate-300 leading-relaxed transition-colors">
                                        Klasör seçmek için<br />
                                        <span className="text-slate-400 group-hover:text-white font-medium">ayarlardan dosya yolunu</span> belirleyin.
                                    </p>
                                </div>
                            )}
                            <div className="flex flex-col space-y-0.5 w-full">
                                {[...additionalFiles, ...treeData, getArchiveTree()].filter(Boolean).map((node) => (
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
                                        onOpenFile={onOpenFile}
                                        tabs={tabs}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    {/* ÇALIŞMA ALANI */}
                    {!isCollapsed && sidebarTab === 'workspace' && (
                        <WorkspacePanel
                            workspaces={workspaces}
                            activeWorkspaceId={activeWorkspaceId}
                            onSwitchWorkspace={onSwitchWorkspace}
                            onAddWorkspace={onAddWorkspace}
                            onCloseWorkspace={onCloseWorkspace}
                            recentlyClosed={recentlyClosed}
                            onReopenTab={onReopenTab}
                        />
                    )}
                </div>

                <div className={`shrink-0 flex items-center relative transition-all duration-300 px-3 py-4 gap-4
                    ${isCollapsed ? 'flex-col justify-center' : 'justify-between'}
                `}>


                    {/* Ayarlar Butonu */}
                    <button
                        data-settings-trigger
                        onClick={(e) => { e.stopPropagation(); setSettingsOpen(s => !s); }}
                        className={`flex items-center justify-center transition-all duration-200 group
                            ${settingsOpen ? 'text-white' : 'text-slate-500 hover:text-slate-200'}
                        `}
                        title="Ayarlar"
                    >
                        <Settings
                            size={isCollapsed ? 24 : 20}
                            className={`${settingsOpen ? 'rotate-45' : 'group-hover:rotate-12'} transition-transform duration-300`}
                        />
                    </button>

                    {/* Otomasyon (n8n) Butonu */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenFile) {
                                onOpenFile({ id: 'n8n-viewer', title: 'Otomasyon', type: 'n8n' });
                            }
                        }}
                        className={`flex items-center justify-center transition-all duration-200 group text-[#f06e57]/80 hover:text-[#f06e57]`}
                        title="Otomasyon (n8n)"
                    >
                        <Webhook
                            size={isCollapsed ? 24 : 20}
                            className="group-hover:scale-110 transition-transform duration-300"
                        />
                    </button>

                    {/* Kullanıcı */}
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className={`flex items-center justify-center bg-slate-800/60 border border-slate-700/50 rounded-sm cursor-pointer hover:border-[#A01B1B]/60 hover:bg-slate-800 transition-all duration-200
                            ${isCollapsed ? 'w-11 h-11' : 'w-9 h-9'}
                        `}
                        title="Kullanıcı"
                    >
                        <User size={isCollapsed ? 20 : 16} className="text-slate-400" />
                    </div>
                </div>
            </div>

        </aside>
    );
};

export default Sidebar;
