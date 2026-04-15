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
import UserPanel from './UserPanel';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { resetBackendMonitoring } from '../../hooks/useBackendStatus';
import { useArchiveChangedListener } from '../../utils/archiveEvents';

const Sidebar = ({ onOpenFile, tabs = [], isCollapsed, setIsCollapsed, workspaces = [], activeWorkspaceId, onSwitchWorkspace, onAddWorkspace, onCloseWorkspace, recentlyClosed = [], onReopenTab }) => {
    const isN8nBooting = useWorkspaceStore(state => state.isN8nBooting);
    const currentUser = useWorkspaceStore(state => state.currentUser);
    const [archiveData, setArchiveData] = useState([]);
    const [openFolders, setOpenFolders] = useState({});
    const [activeFile, setActiveFile] = useState(null);
    const [settingsOpen,  setSettingsOpen]  = useState(false);
    const [userPanelOpen, setUserPanelOpen] = useState(false);

    const hasPermission = (key, defaultVal = true) => {
        if (!currentUser) return defaultVal;
        return currentUser.meta?.[key] !== undefined ? currentUser.meta[key] : defaultVal;
    };

    const fetchArchive = async () => {
        try {
            const res = await fetch('/api/archive/list', {
                headers: {
                    'User-Id': currentUser?.id || ''
                }
            });
            if (res.ok) {
                const data = await res.json();

                // Frontend-side archive policy filtering based on explicit file/folder toggles
                let items = data.items || [];
                if (currentUser && currentUser.meta) {
                    items = items.filter(item => {
                        const typePrefix = item.file_type === 'folder' ? 'folder' : 'file';
                        const key = `archive_${typePrefix}_${item.id}`;
                        // If specifically set to false, hide it
                        return currentUser.meta[key] !== false;
                    });
                }
                setArchiveData(items);
            }
        } catch (err) {
            console.error("Archive fetch error:", err);
        }
    };

    useEffect(() => {
        if (currentUser) {
            fetchArchive();
        }
    }, [currentUser]);

    useArchiveChangedListener(fetchArchive);

    const getArchiveTree = () => {
        if (!archiveData || archiveData.length === 0) return [];

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

        return rootNodes;
    };

    useEffect(() => {
        if (settingsOpen) setSettingsOpen(false);
    }, [isCollapsed]);

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
                isCollapsed={isCollapsed}
                onOpenFile={onOpenFile}
                currentUser={currentUser}
            />

            {/* UserPanel — kullanıcı simgesine tıklayınca sağdan açılan panel */}
            <UserPanel
                open={userPanelOpen}
                onClose={() => setUserPanelOpen(false)}
                onLogout={() => {
                    setUserPanelOpen(false);
                    if (window.confirm('Oturumu kapatmak istediğinize emin misiniz?')) {
                        fetch('/api/auth/audit/event', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ kullanici_kimlik: currentUser?.id, islem_turu: 'LOGOUT' })
                        }).finally(() => {
                            useWorkspaceStore.getState().setIsLoggedIn(false);
                            useWorkspaceStore.getState().setCurrentUser(null);
                            resetBackendMonitoring();
                        });
                    }
                }}
                isCollapsed={isCollapsed}
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

                {/* ── İÇERİK ALANI ── */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3
                    [&::-webkit-scrollbar]:w-1
                    [&::-webkit-scrollbar-track]:bg-transparent
                    [&::-webkit-scrollbar-thumb]:bg-slate-700/60
                    [&::-webkit-scrollbar-thumb]:rounded-none
                    hover:[&::-webkit-scrollbar-thumb]:bg-slate-600"
                >
                    {/* DOSYALAR */}
                    {(archiveData.length === 0) && !isCollapsed && (
                        <div
                            onClick={(e) => { e.stopPropagation(); setSettingsOpen(true); }}
                            className="flex flex-col items-center text-center mt-10 px-4 py-6 border border-dashed border-slate-700/60 cursor-pointer group transition-colors"
                            style={{ borderRadius: 0 }}
                        >
                            <Folder size={20} className="mb-2 text-slate-600 group-hover:text-[#A01B1B] transition-colors" />
                            <p className="text-[10px] text-slate-500 group-hover:text-slate-300 leading-relaxed transition-colors">
                                Sistemde hiç dosya bulunumadı.<br />
                                <span className="text-slate-400 group-hover:text-white font-medium">Ayarlardan Dosya İşleme</span> bölümünü açın.
                            </p>
                        </div>
                    )}
                    <div className="flex flex-col space-y-0.5 w-full">
                        {getArchiveTree().map((node) => (
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
                </div>

                <div className={`shrink-0 flex items-center relative transition-all duration-300 px-3 py-4 gap-4
                    ${isCollapsed ? 'flex-col justify-center' : 'justify-between'}
                `}>


                    {/* Ayarlar Butonu */}
                    {hasPermission('ui_settings') && (
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
                    )}

                    {/* Otomasyon (n8n) Butonu */}
                    {hasPermission('ui_agent', false) && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isN8nBooting) return;
                                window.dispatchEvent(new CustomEvent('open-n8n-workspace'));
                            }}
                            className={`flex items-center justify-center transition-all duration-200 group text-[#f06e57]/80 hover:text-[#f06e57] ${isN8nBooting ? 'cursor-wait opacity-80' : ''}`}
                            title={isN8nBooting ? "Otomasyon (Motor Hazırlanıyor...)" : "Otomasyon (n8n)"}
                        >
                            <Webhook
                                size={isCollapsed ? 24 : 20}
                                className={`${isN8nBooting ? 'animate-spin text-[#f06e57]' : 'group-hover:scale-110 shadow-sm'} transition-transform duration-300`}
                            />
                        </button>
                    )}

                    <div
                        data-user-panel-trigger
                        onClick={(e) => {
                            e.stopPropagation();
                            setUserPanelOpen(v => !v);
                        }}
                        className={`flex items-center justify-center bg-slate-800/60 border cursor-pointer transition-all duration-200 rounded-sm
                            ${userPanelOpen
                                ? 'border-[#A01B1B]/60 bg-slate-800 text-white'
                                : 'border-slate-700/50 hover:border-[#A01B1B]/60 hover:bg-slate-800'}
                            ${isCollapsed ? 'w-11 h-11' : 'w-9 h-9'}
                        `}
                        title={currentUser?.tam_ad || 'Kullanıcı'}
                    >
                        <User size={isCollapsed ? 20 : 16} className={userPanelOpen ? 'text-white' : 'text-slate-400'} />
                    </div>
                </div>
            </div>

        </aside>
    );
};

export default Sidebar;
