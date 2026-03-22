import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Folder, Settings, User,
    ChevronsRight, ChevronsLeft, Files, LayoutGrid
} from 'lucide-react';

import FullLogoImage from '../../assets/logo-acik.png';
import SymbolImage from '../../assets/logo-kapali.png';
import SettingsMenu from '../settings/SettingsMenu';
import TreeNode from './TreeNode';
import WorkspacePanel from './WorkspacePanel';

const Sidebar = ({ onOpenFile, tabs = [], isCollapsed, setIsCollapsed, workspaces = [], activeWorkspaceId, onSwitchWorkspace, onAddWorkspace, onCloseWorkspace, recentlyClosed = [], onReopenTab }) => {
    const [treeData, setTreeData] = useState([]);
    const [openFolders, setOpenFolders] = useState({});
    const [activeFile, setActiveFile] = useState(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [currentBasePath, setCurrentBasePath] = useState(localStorage.getItem('savedBasePath') || '');
    const [additionalFiles, setAdditionalFiles] = useState([]);
    const [sidebarTab, setSidebarTab] = useState('files');

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
        <aside className={`relative ${isCollapsed ? 'w-[68px]' : 'w-72'} transition-all duration-300 ease-in-out flex h-screen shrink-0 z-20 cursor-default`}
            style={{ background: 'linear-gradient(180deg, #1a1a1c 0%, #161618 100%)', borderRight: '1px solid #2a2a2d' }}
        >
            <div
                className="flex-1 flex flex-col h-full overflow-hidden w-full relative"
                onClick={handleSidebarClick}
            >
                {/* ── LOGO HEADER ── */}
                <div className={`flex items-center h-14 shrink-0 transition-all duration-300 ${isCollapsed ? 'px-3 justify-center' : 'px-4'}`}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                    <div
                        className="flex items-center overflow-hidden cursor-pointer w-full"
                        onClick={(e) => { e.stopPropagation(); setIsCollapsed(prev => !prev); }}
                    >
                        <AnimatePresence mode="wait">
                            {!isCollapsed ? (
                                <motion.div
                                    key="full-logo"
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -8 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex items-center"
                                >
                                    <img src={FullLogoImage} alt="Yılgenci Logo" className="h-6 w-auto object-contain" style={{ minWidth: '110px' }} />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="symbol-logo"
                                    initial={{ opacity: 0, scale: 0.7 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.7 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex items-center justify-center w-full"
                                >
                                    <img src={SymbolImage} alt="Yılgenci Sembol" className="h-7 w-7 object-contain" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* ── SEKME NAVİGASYONU ── */}
                {!isCollapsed && (
                    <div className="flex px-3 pt-3 pb-0 gap-1"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                    >
                        {[
                            { id: 'files', label: 'Dosyalar', icon: Files, badge: null },
                            { id: 'workspace', label: 'Alan', icon: LayoutGrid, badge: wsTabCount > 0 ? wsTabCount : null },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={(e) => { e.stopPropagation(); setSidebarTab(tab.id); }}
                                className={`relative flex-1 flex items-center justify-center gap-1.5 pb-2.5 pt-1 text-[10px] font-semibold tracking-widest uppercase transition-all duration-200 border-b-2
                                    ${sidebarTab === tab.id
                                        ? 'text-white border-[#A01B1B]'
                                        : 'text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-700'
                                    }`}
                            >
                                <tab.icon size={11} />
                                {tab.label}
                                {tab.badge !== null && (
                                    <span className="bg-[#A01B1B]/90 text-white text-[8px] font-bold px-1 py-px leading-none">
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        ))}
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
                            {(treeData.length === 0 && additionalFiles.length === 0) && !isCollapsed && (
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

                {/* ── ALT FOOTER ── */}
                <div className={`shrink-0 flex items-center relative transition-all duration-300 px-3 py-3 gap-3
                    ${isCollapsed ? 'flex-col justify-center' : 'justify-between'}
                `}
                    style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                >
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
                            size={isCollapsed ? 20 : 16}
                            className={`${settingsOpen ? 'rotate-45' : 'group-hover:rotate-12'} transition-transform duration-300`}
                        />
                    </button>

                    {/* Kullanıcı */}
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className={`flex items-center justify-center bg-slate-800/60 border border-slate-700/50 cursor-pointer hover:border-[#A01B1B]/60 hover:bg-slate-800 transition-all duration-200
                            ${isCollapsed ? 'w-9 h-9' : 'w-7 h-7'}
                        `}
                        title="Kullanıcı"
                    >
                        <User size={isCollapsed ? 16 : 13} className="text-slate-400" />
                    </div>
                </div>
            </div>

        </aside>
    );
};

export default Sidebar;
