import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Folder, Settings, User,
    ChevronsRight, ChevronsLeft, Files, LayoutGrid, MessageSquare, Hash, Search, X,
    ChevronDown, Plus, AlertTriangle
} from 'lucide-react';

import FullLogoImage from '../../assets/logo-acik.png';
import SymbolImage from '../../assets/logo-kapali.png';
import TreeNode from './TreeNode';
import UserPanel from './UserPanel';
import UserMenu from './UserMenu';
import ToplantilarSidebar from './ToplantilarSidebar';
import IsAkislariSidebar from './IsAkislariSidebar';
import GlobalChatRoom from '../workspace/GlobalChatRoom';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { resetBackendMonitoring } from '../../hooks/useBackendStatus';
import { useArchiveChangedListener } from '../../utils/archiveEvents';
import { fetchChannels, createChannel } from '../../api/globalChatService';

/* ── Arşiv sekme tanımları (component dışı — sabit) ──────────────── */
const SIDEBAR_TABS = [
    { key: 'belgeler',      label: 'Belgeler'        },
    { key: 'toplantilar',   label: 'Toplantılar'     },
    { key: 'kisisel',       label: 'Kişisel'         },
    { key: 'surecler',      label: 'Süreçler'        },
    { key: 'teknik_resim',  label: 'Teknik Resimler' },
    { key: 'sohbetler',     label: 'Sohbetler'       },
];
const _sbAudio  = t => ['mp3','wav','ogg','m4a','flac','aac','opus','wma'].includes(t);
const _sbVideo  = t => ['mp4','avi','mov','mkv','webm','m4v','wmv'].includes(t);
const _sbWf     = t => ['bpmn','json','py','js','ts','html','xml'].includes(t);
const _sbImage  = t => ['png','jpg','jpeg','webp','bmp','gif','tiff'].includes(t);
const SIDEBAR_TAB_FILTERS = {
    belgeler:     i => { const t=(i.file_type||'').toLowerCase(); return !_sbAudio(t)&&!_sbVideo(t)&&!_sbWf(t)&&!_sbImage(t); },
    toplantilar:  i => { const t=(i.file_type||'').toLowerCase(); return _sbAudio(t)||_sbVideo(t); },
    kisisel:      (i, uid) => i.uploaded_by===uid || i.user_id===uid,
    surecler:     i => _sbWf((i.file_type||'').toLowerCase()),
    teknik_resim: i => _sbImage((i.file_type||'').toLowerCase()),
    sohbetler:    i => i.is_vectorized===true,
};

const Sidebar = ({ onOpenFile, tabs = [], isCollapsed, setIsCollapsed, workspaces = [], activeWorkspaceId, onSwitchWorkspace, onAddWorkspace, onCloseWorkspace, recentlyClosed = [], onReopenTab, onEnterAdmin }) => {
    const currentUser = useWorkspaceStore(state => state.currentUser);
    const [channels, setChannels] = useState([]);
    const [chatPanelOpen, setChatPanelOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('belgeler');
    const [activeChannelId, setActiveChannelId] = useState(null);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [archiveData, setArchiveData] = useState([]);
    const [openFolders, setOpenFolders] = useState({});
    const [activeFile, setActiveFile] = useState(null);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [userPanelOpen, setUserPanelOpen] = useState(false);
    const [userPanelInitialTab, setUserPanelInitialTab] = useState('profil');
    const [searchQuery, setSearchQuery] = useState('');
    const [missingFilter, setMissingFilter] = useState(false);
    const [matchedFileIds, setMatchedFileIds] = useState(new Set());
    const [matchedFolderIds, setMatchedFolderIds] = useState(new Set());
    const searchInputRef = useRef(null);
    const searchOpenedFolders = useRef(new Set()); // aramadan dolayı açılan klasörler
    const popupWasOpenRef = useRef(false);

    const hasPermission = (key, defaultVal = true) => {
        if (!currentUser) return defaultVal;
        if (currentUser.super) return true;
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
                if (currentUser && currentUser.meta && !currentUser.super) {
                    items = items.filter(item => {
                        const typePrefix = item.file_type === 'folder' ? 'folder' : 'file';
                        const key = `archive_${typePrefix}_${item.id}`;
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

    // ── Kanalları API'den yükle ──────────────────────────────────────────────
    useEffect(() => {
        fetchChannels()
            .then(list => {
                setChannels(list);
                setActiveChannelId(prev => prev || list[0]?.id || null);
            })
            .catch(console.error);
    }, []);

    const toggleChatPanel = () => setChatPanelOpen(prev => !prev);

    const handleSelectChannel = (channelId) => {
        setChatPanelOpen(true);
        setActiveChannelId(channelId);
        setUnreadCounts(prev => ({ ...prev, [channelId]: 0 }));
    };

    const handleCreateChannel = async () => {
        const name = window.prompt('Yeni kanal adı:');
        if (!name?.trim()) return;
        try {
            const ch = await createChannel(name.trim());
            setChannels(prev => [...prev, ch]);
            handleSelectChannel(ch.id);
        } catch (err) {
            alert(err.message);
        }
    };

    const handleNewMessage = (channelId, _msg) => {
        const isVisible = chatPanelOpen && activeChannelId === channelId;
        if (!isVisible) {
            setUnreadCounts(prev => ({ ...prev, [channelId]: (prev[channelId] || 0) + 1 }));
        }
    };

    useEffect(() => {
        if (!searchQuery.trim()) {
            // Ref'i snapshot'la ÖNCE güncelle, sonra state'i functional updater ile kapat
            const toClose = new Set(searchOpenedFolders.current);
            searchOpenedFolders.current = new Set();
            if (toClose.size > 0) {
                setOpenFolders(prev => {
                    const next = { ...prev };
                    toClose.forEach(id => { next[id] = false; });
                    return next;
                });
            }
            setMatchedFileIds(new Set());
            setMatchedFolderIds(new Set());
            return;
        }

        const q = searchQuery.toLocaleLowerCase('tr-TR');
        const map = {};
        archiveData.forEach(item => { map[item.id] = item; });

        const fileMatches = new Set();
        const folderMatches = new Set();

        archiveData.forEach(item => {
            if (item.file_type !== 'folder' && item.filename?.toLocaleLowerCase('tr-TR').includes(q)) {
                fileMatches.add(`archive_${item.id}`);
                let cur = item;
                while (cur.folder_id && map[cur.folder_id]) {
                    folderMatches.add(`archive_${cur.folder_id}`);
                    cur = map[cur.folder_id];
                }
            }
        });

        // Önce snapshot al, sonra ref'i güncelle — updater fonksiyon geç çağrılsa bile snapshot'ı okur
        const prevOpened = new Set(searchOpenedFolders.current);
        searchOpenedFolders.current = folderMatches;

        setOpenFolders(prev => {
            const next = { ...prev };
            prevOpened.forEach(id => {
                if (!folderMatches.has(id)) next[id] = false;
            });
            folderMatches.forEach(id => { next[id] = true; });
            return next;
        });

        setMatchedFileIds(fileMatches);
        setMatchedFolderIds(folderMatches);
    }, [searchQuery, archiveData]);

    const getArchiveTree = () => {
        if (!archiveData || archiveData.length === 0) return [];

        // Aktif sekmeye göre dosyaları filtrele
        const tabFn = activeTab === 'kisisel'
            ? (i) => SIDEBAR_TAB_FILTERS.kisisel(i, currentUser?.id)
            : (SIDEBAR_TAB_FILTERS[activeTab] || SIDEBAR_TAB_FILTERS.belgeler);

        const idMap = {};
        archiveData.forEach(i => { idMap[i.id] = i; });

        const matchingFileIds = new Set(
            archiveData.filter(i => i.file_type !== 'folder' && tabFn(i)).map(i => i.id)
        );

        // Eşleşen dosyaların üst klasörlerini dahil et
        const includedFolderIds = new Set();
        archiveData.forEach(item => {
            if (matchingFileIds.has(item.id)) {
                let cur = item;
                while (cur.folder_id && idMap[cur.folder_id]) {
                    includedFolderIds.add(cur.folder_id);
                    cur = idMap[cur.folder_id];
                }
            }
        });

        const treeMap = {};
        archiveData.forEach(item => {
            if (item.file_type === 'folder') {
                if (!includedFolderIds.has(item.id)) return;
            } else {
                if (!matchingFileIds.has(item.id)) return;
            }
            treeMap[item.id] = {
                id: `archive_${item.id}`,
                name: item.filename,
                type: item.file_type === 'folder' ? 'folder' : 'file',
                extension: item.file_type !== 'folder' ? item.file_type : undefined,
                url: `/api/archive/file/${item.id}`,
                children: []
            };
        });

        const rootNodes = [];
        archiveData.forEach(item => {
            if (!treeMap[item.id]) return;
            const node = treeMap[item.id];
            if (item.folder_id && treeMap[item.folder_id]) {
                treeMap[item.folder_id].children.push(node);
            } else if (!item.folder_id) {
                rootNodes.push(node);
            }
        });

        return rootNodes;
    };


    const countMissing = (nodes) => {
        let n = 0;
        const walk = (arr) => { for (const nd of arr) { if (nd.type === 'folder') { if (!nd.children || nd.children.length === 0) n++; else walk(nd.children); } } };
        walk(nodes);
        return n;
    };

    const toggleFolder = (folderId) => {
        if (isCollapsed) return;
        setOpenFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
    };

    const handleSidebarMouseDown = () => {
        // mousedown anında popup'ın açık olup olmadığını kaydet
        // (click geldiğinde React re-render ile state değişmiş olabilir)
        popupWasOpenRef.current = userMenuOpen || userPanelOpen;
    };

    const handleSidebarClick = (e) => {
        if (isCollapsed) {
            setIsCollapsed(false);
            return;
        }

        // mousedown anında popup açıksa sidebar'ı kapatma
        if (popupWasOpenRef.current) return;

        const isInteractive = e.target.closest('button, a, input, .cursor-pointer, li, .interactive, summary');
        if (!isInteractive) {
            setIsCollapsed(true);
        }
    };

    const activeWs = workspaces.find(w => w.id === activeWorkspaceId);
    const wsTabCount = activeWs?.tabs?.length || 0;

    return (
        <aside className={`relative ${isCollapsed ? 'w-[68px]' : 'w-72'} font-sans transition-all duration-300 ease-in-out flex h-screen shrink-0 z-20 cursor-default`}
            style={{ background: '#18181b', borderRight: '1px solid #27272a' }}
        >
            {/* UserMenu — kullanıcı ikonuna tıklayınca beliren küçük seçim popup'ı */}
            <UserMenu
                isOpen={userMenuOpen}
                onClose={() => setUserMenuOpen(false)}
                onSelect={(tabId) => {
                    // Tüm seçimler yan panele (yarım pencere) düşer.
                    // İçerikler UserPanel.jsx'te tab başına render ediliyor.
                    setUserPanelInitialTab(tabId);
                    setUserPanelOpen(true);
                }}
                isCollapsed={isCollapsed}
                currentUser={currentUser}
            />

            {/* UserPanel — UserMenu'den seçim yapılınca yan tarafta açılan geniş panel */}
            <UserPanel
                open={userPanelOpen}
                initialTab={userPanelInitialTab}
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

            {/* GlobalChatRoom — MessageSquare butonuyla açılan inline yan panel */}
            <GlobalChatRoom
                open={chatPanelOpen}
                onClose={() => setChatPanelOpen(false)}
                isCollapsed={isCollapsed}
                activeChannelId={activeChannelId}
                setActiveChannelId={setActiveChannelId}
                channels={channels}
                onNewMessage={handleNewMessage}
            />
            <div
                className="flex-1 flex flex-col h-full overflow-hidden w-full relative"
                onMouseDown={handleSidebarMouseDown}
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

                {/* ── ARŞİV SEKMELERİ + ARAMA ── */}
                {!isCollapsed && (() => {
                    const _docs = archiveData.filter(i => i.file_type !== 'folder');
                    const tabCounts = Object.fromEntries(
                        SIDEBAR_TABS.map(t => [
                            t.key,
                            _docs.filter(i => t.key === 'kisisel'
                                ? SIDEBAR_TAB_FILTERS.kisisel(i, currentUser?.id)
                                : (SIDEBAR_TAB_FILTERS[t.key] || SIDEBAR_TAB_FILTERS.belgeler)(i)
                            ).length
                        ])
                    );
                    const activeLabel = SIDEBAR_TABS.find(t => t.key === activeTab)?.label || 'Dosya';
                    return (
                        <div className="shrink-0 px-3 pb-2 space-y-2">
                            {/* Kategori sekmeleri — sadece arşiv modunda */}
                            {!chatPanelOpen && (
                                <>
                                    <div className="flex items-center px-0.5 mb-0.5">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">ARŞİVLER</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {SIDEBAR_TABS.map(tab => (
                                            <button
                                                key={tab.key}
                                                onClick={e => { e.stopPropagation(); setActiveTab(tab.key); setSearchQuery(''); setMissingFilter(false); }}
                                                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all interactive
                                                    ${activeTab === tab.key
                                                        ? 'bg-[#1D9E75] text-white'
                                                        : 'bg-zinc-800 text-slate-400 hover:bg-zinc-700 hover:text-slate-200'}`}
                                            >
                                                {tab.label}
                                                <span className={`text-[9px] tabular-nums leading-none
                                                    ${activeTab === tab.key ? 'text-white/75' : 'text-slate-600'}`}>
                                                    {tabCounts[tab.key] ?? 0}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                            {/* Arama */}
                            <div className="flex items-center gap-1.5 bg-slate-800/50 border border-slate-700/50 rounded-[3px] px-2 py-1.5 focus-within:border-[#DC2626]/60 transition-colors">
                                <Search size={13} className="text-slate-500 shrink-0" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    placeholder={chatPanelOpen ? "Kanal ara..." : `${activeLabel} içinde ara...`}
                                    className="flex-1 bg-transparent text-[12px] text-slate-300 placeholder-slate-600 outline-none min-w-0"
                                    autoComplete="off"
                                    spellCheck={false}
                                />
                                {searchQuery && (
                                    <button
                                        onClick={e => { e.stopPropagation(); setSearchQuery(''); }}
                                        className="text-slate-600 hover:text-slate-300 transition-colors shrink-0"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                            {activeTab === 'teknik_resim' && (() => {
                                const tree = getArchiveTree();
                                const mc = countMissing(tree);
                                return (
                                    <button
                                        onClick={e => { e.stopPropagation(); setMissingFilter(v => !v); }}
                                        className={`interactive flex items-center gap-1.5 px-2 py-1 text-[10.5px] rounded-[2px] transition-all w-full
                                            ${missingFilter
                                                ? 'bg-amber-500/10 border border-amber-500/40 text-amber-300'
                                                : 'bg-zinc-800/50 border border-slate-700/50 text-slate-500 hover:text-slate-300'}`}
                                    >
                                        <AlertTriangle size={11} className={missingFilter ? 'text-amber-400' : 'text-slate-600'} />
                                        <span>Eksik teknik resimleri göster</span>
                                        <span className={`ml-auto font-mono text-[9.5px] px-1.5 py-px rounded-full
                                            ${missingFilter ? 'bg-amber-500 text-zinc-900' : 'bg-amber-500/20 text-amber-400'}`}>
                                            {mc}
                                        </span>
                                    </button>
                                );
                            })()}
                        </div>
                    );
                })()}

                {/* ── İÇERİK ALANI ── */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3
                    [&::-webkit-scrollbar]:w-1
                    [&::-webkit-scrollbar-track]:bg-transparent
                    [&::-webkit-scrollbar-thumb]:bg-slate-700/60
                    [&::-webkit-scrollbar-thumb]:rounded-none
                    hover:[&::-webkit-scrollbar-thumb]:bg-slate-600"
                >
                    {chatPanelOpen ? (
                        <>
                            {/* Kategori başlığı */}
                            {!isCollapsed && (
                                <div className="flex items-center justify-between px-1 mb-1 mt-1 group/cat cursor-default select-none">
                                    <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
                                        <ChevronDown size={10} className="shrink-0" />
                                        <span>Metin Kanallar</span>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleCreateChannel(); }}
                                        className="opacity-0 group-hover/cat:opacity-100 text-slate-500 hover:text-[#DC2626] transition-all interactive"
                                        title="Yeni Kanal"
                                    >
                                        <Plus size={13} />
                                    </button>
                                </div>
                            )}

                            {channels.length === 0 && !isCollapsed && (
                                <div className="text-[10px] text-slate-600 text-center py-6 px-2">
                                    Henüz kanal yok.
                                </div>
                            )}

                            <div className="flex flex-col gap-px">
                                {channels.map(ch => {
                                    const isActive = activeChannelId === ch.id;
                                    return (
                                        <button
                                            key={ch.id}
                                            onClick={(e) => { e.stopPropagation(); handleSelectChannel(ch.id); }}
                                            className={`interactive relative flex items-center gap-1.5 w-full text-left transition-all duration-100
                                                ${isCollapsed ? 'justify-center py-2' : 'px-2 py-[5px]'}
                                                ${isActive
                                                    ? 'text-slate-100 bg-white/[0.06]'
                                                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'}
                                            `}
                                            title={`#${ch.name}`}
                                        >
                                            {/* Aktif göstergesi — sol çizgi */}
                                            {isActive && !isCollapsed && (
                                                <span className="absolute left-0 top-1 bottom-1 w-[2px] bg-[#DC2626] rounded-r" />
                                            )}
                                            <Hash size={isCollapsed ? 18 : 14} className={`shrink-0 ${isActive ? 'text-[#DC2626]' : 'text-slate-600'}`} />
                                            {!isCollapsed && (
                                                <span className="truncate text-[12px] flex-1">{ch.name}</span>
                                            )}
                                            {(unreadCounts[ch.id] || 0) > 0 && (
                                                <span className={`shrink-0 flex items-center justify-center rounded-full text-[9px] font-bold text-white leading-none
                                                    ${isCollapsed ? 'absolute top-0.5 right-0.5 w-3.5 h-3.5' : 'w-4 h-4 ml-auto'}`}
                                                    style={{ background: '#DC2626', minWidth: isCollapsed ? 14 : 16 }}>
                                                    {unreadCounts[ch.id] > 9 ? '9+' : unreadCounts[ch.id]}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* DOSYALAR */}
                            {(archiveData.length === 0) && !isCollapsed && (
                                <div
                                    onClick={(e) => { e.stopPropagation(); setSettingsOpen(true); }}
                                    className="flex flex-col items-center text-center mt-10 px-4 py-6 border border-dashed border-slate-700/60 cursor-pointer group transition-colors"
                                    style={{ borderRadius: 0 }}
                                >
                                    <Folder size={20} className="mb-2 text-slate-600 group-hover:text-[#DC2626] transition-colors" />
                                    <p className="text-[10px] text-slate-500 group-hover:text-slate-300 leading-relaxed transition-colors">
                                        Sistemde hiç dosya bulunumadı.<br />
                                        <span className="text-slate-400 group-hover:text-white font-medium">Ayarlardan Dosya İşleme</span> bölümünü açın.
                                    </p>
                                </div>
                            )}
                            {(archiveData.length > 0 && activeTab !== 'toplantilar' && activeTab !== 'surecler' && getArchiveTree().length === 0) && !isCollapsed && (
                                <p className="text-[10px] text-slate-600 text-center py-8 px-3">
                                    {SIDEBAR_TABS.find(t => t.key === activeTab)?.label || 'Bu kategoride'} dosya bulunamadı.
                                </p>
                            )}

                            {/* Toplantılar — özel ağaç görünümü */}
                            {activeTab === 'toplantilar' && !isCollapsed && (
                                <ToplantilarSidebar
                                    archiveData={archiveData}
                                    onOpenFile={onOpenFile}
                                />
                            )}

                            {/* Süreçler / İş Akışları — özel ağaç görünümü */}
                            {activeTab === 'surecler' && !isCollapsed && (
                                <IsAkislariSidebar
                                    archiveData={archiveData}
                                    onOpenFile={onOpenFile}
                                />
                            )}

                            {/* Diğer sekmeler — standart TreeNode */}
                            {activeTab !== 'toplantilar' && activeTab !== 'surecler' && (
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
                                        activeTab={activeTab}
                                        searchQuery={searchQuery}
                                        matchedFileIds={matchedFileIds}
                                        matchedFolderIds={matchedFolderIds}
                                        bomMode={activeTab === 'teknik_resim'}
                                        missingFilter={missingFilter}
                                    />
                                ))}
                            </div>
                            )}
                        </>
                    )}
                </div>

                <div className={`shrink-0 flex items-center relative transition-all duration-300 px-3 py-4 gap-4
                    ${isCollapsed ? 'flex-col justify-center' : 'justify-between'}
                `}>


                    {/* Ayarlar Butonu → Admin Paneli */}
                    {hasPermission('ui_settings') && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEnterAdmin?.(); }}
                            className="flex items-center justify-center transition-all duration-200 group text-slate-500 hover:text-slate-200"
                            title="Yönetim Paneli"
                        >
                            <Settings
                                size={isCollapsed ? 24 : 20}
                                className="group-hover:rotate-12 transition-transform duration-300"
                            />
                        </button>
                    )}

                    {/* Global Chat Butonu — sidebar içi paneli aç/kapat */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleChatPanel();
                        }}
                        className={`flex items-center justify-center transition-all duration-200 group ${chatPanelOpen ? 'text-[#DC2626]' : 'text-slate-500 hover:text-slate-200'}`}
                        title={chatPanelOpen ? 'Global Sohbeti Kapat' : 'Global Sohbeti Aç'}
                    >
                        <MessageSquare
                            size={isCollapsed ? 24 : 20}
                            className="group-hover:scale-110 transition-transform duration-300"
                        />
                    </button>

                    <div
                        data-user-menu-trigger
                        onClick={(e) => {
                            e.stopPropagation();
                            setUserMenuOpen(v => !v);
                        }}
                        className={`flex items-center justify-center bg-slate-800/60 border cursor-pointer transition-all duration-200 rounded-sm
                            ${(userMenuOpen || userPanelOpen)
                                ? 'border-[#DC2626]/60 bg-slate-800 text-white'
                                : 'border-slate-700/50 hover:border-[#DC2626]/60 hover:bg-slate-800'}
                            ${isCollapsed ? 'w-11 h-11' : 'w-9 h-9'}
                        `}
                        title={currentUser?.tam_ad || 'Kullanıcı'}
                    >
                        <User size={isCollapsed ? 20 : 16} className={(userMenuOpen || userPanelOpen) ? 'text-white' : 'text-slate-400'} />
                    </div>
                </div>
            </div>

        </aside>
    );
};

export default Sidebar;
