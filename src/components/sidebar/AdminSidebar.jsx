import React, { useState } from 'react';
import {
    FileCog, Database, Bot, Cpu, Users, Inbox, AlertTriangle, ShieldAlert,
    Settings, Zap, User, ArrowLeft, Table, BarChart3, PackageOpen, ChevronDown, ChevronRight,
    Network, Key, Terminal, FileCode, Play, Link, Upload, Monitor,
    GitBranch, FileText, Mic, Users2, SlidersHorizontal
} from 'lucide-react';
import FullLogoImage from '../../assets/logo-acik.png';
import { useWorkspaceStore } from '../../store/workspaceStore';
import UserMenu from './UserMenu';
import UserPanel from './UserPanel';
import { resetBackendMonitoring } from '../../hooks/useBackendStatus';

const NAV_GROUPS = [
    {
        label: 'VERİ YÖNETİMİ',
        items: [
            {
                id: 'database-settings',
                label: 'Dosya İşleme',
                icon: FileCog,
                permKey: 'ui_file_processing',
                openArgs: { id: 'database-settings', title: 'Dosya İşleme', type: 'database' },
            },
            {
                id: 'databases-viewer',
                label: 'Veritabanı',
                icon: Database,
                permKey: 'ui_database',
                openArgs: null,
                children: [
                    { id: 'db-sql',     label: 'İlişkisel SQL', icon: Table,       openArgs: { id: 'db-sql',     title: 'SQL Veritabanı',    type: 'databases-viewer', meta: { defaultTab: 'sql'     } } },
                    { id: 'db-vector',  label: 'Vektör',        icon: Database,    openArgs: { id: 'db-vector',  title: 'Vektör Veritabanı', type: 'databases-viewer', meta: { defaultTab: 'vector'  } } },
                    { id: 'db-graph',   label: 'Graf',          icon: BarChart3,   openArgs: { id: 'db-graph',   title: 'Graf Veritabanı',   type: 'databases-viewer', meta: { defaultTab: 'graph'   } } },
                    {
                        id: 'db-archive',
                        label: 'Arşiv',
                        icon: PackageOpen,
                        children: [
                            { id: 'archive-documents', label: 'Döküman',            icon: FileText,  openArgs: { id: 'archive-documents', title: 'Belgeler',            type: 'belgeler-viewer' } },
                            { id: 'archive-workflows', label: 'İş Akışları',        icon: GitBranch, openArgs: { id: 'archive-workflows', title: 'İş Akışları',        type: 'surecler-viewer' } },
                            { id: 'archive-meetings',  label: 'Toplantılar',         icon: Mic,       openArgs: { id: 'archive-meetings',  title: 'Toplantılar',         type: 'toplantilar-viewer' } },
                            { id: 'archive-user-docs', label: 'Kullanıcı Belgeleri', icon: Users2,    openArgs: { id: 'archive-user-docs', title: 'Kişisel',            type: 'kisisel-viewer'  } },
                        ],
                    },
                ],
            },
        ],
    },
    {
        label: 'ZEKA & OTOMASYON',
        items: [
            {
                id: 'ai-architecture-center',
                label: 'Yapay Zeka Merkezi',
                icon: Bot,
                permKey: 'ui_ai_orchestrator',
                openArgs: null,
                children: [
                    { id: 'ai-topology',         label: 'Topoloji',          icon: Network,           openArgs: { id: 'ai-topology',         title: 'Topoloji',          type: 'topology-viewer',  meta: { defaultView: 'diagram' } } },
                    { id: 'ai-conversation',      label: 'Sohbet İzleri',     icon: Terminal,          openArgs: { id: 'ai-conversation',      title: 'Sohbet İzleri',     type: 'topology-viewer',  meta: { defaultView: 'logs'    } } },
                    { id: 'ai-agents',            label: 'Ajan Ayarları',     icon: SlidersHorizontal, openArgs: { id: 'ai-agents',            title: 'Ajan Ayarları',     type: 'ai-orchestrator',  meta: { defaultMainTab: 'architecture' } } },
                    { id: 'ai-prompts',           label: 'Prompt Şablonları', icon: FileCode,          openArgs: { id: 'ai-prompts',           title: 'Prompt Şablonları', type: 'ai-orchestrator',  meta: { defaultMainTab: 'prompts'      } } },
                ],
            },
            {
                id: 'otomasyon-group',
                label: 'Otomasyon',
                icon: Zap,
                children: [
                    { id: 'n8n-viewer', label: 'n8n',  icon: Play, isN8n: true, badge: 'CANLI' },
                    { id: 'makro',      label: 'Makro', icon: FileCode, openArgs: { id: 'makro', title: 'Makro', type: 'coming-soon' }, badge: 'YAKINDA' },
                ],
            },
            {
                id: 'ai-api-group',
                label: 'API',
                icon: Link,
                children: [
                    { id: 'ai-api-keys', label: 'API Anahtarları', icon: Key,      openArgs: { id: 'ai-api-keys', title: 'API Anahtarları', type: 'api-keys'       } },
                    { id: 'ai-logs',     label: 'API Logları',     icon: Terminal, openArgs: { id: 'ai-logs',     title: 'API Logları',     type: 'api-logs'       } },
                    { id: 'ai-costs',    label: 'API Maliyetleri', icon: Cpu,      openArgs: { id: 'ai-costs',    title: 'API Maliyetleri', type: 'api-monitoring' } },
                ],
            },
        ],
    },
    {
        label: 'KULLANICILAR',
        items: [
            {
                id: 'api-users',
                label: 'Kullanıcılar',
                icon: Users,
                permKey: 'ui_metrics',
                openArgs: { id: 'api-users', title: 'Kullanıcılar', type: 'api-users' },
            },
            {
                id: 'pc-sessions',
                label: 'Oturumlar',
                icon: Monitor,
                permKey: 'ui_metrics',
                openArgs: { id: 'pc-sessions', title: 'Oturumlar', type: 'pc-sessions' },
            },
            {
                id: 'restrictions-panel',
                label: 'Kısıtlamalar',
                icon: ShieldAlert,
                permKey: 'ui_restrictions',
                openArgs: { id: 'restrictions-panel', title: 'Kısıtlamalar', type: 'restrictions' },
            },
        ],
    },
    {
        label: 'EĞİTİMLER',
        items: [
            {
                id: 'auth-users',
                label: 'Kullanıcı Eğitimleri',
                icon: Users,
                permKey: 'ui_auth',
                openArgs: { id: 'auth-users', title: 'Kullanıcı Eğitimleri', type: 'auth-users' },
            },
            {
                id: 'auth-egitim',
                label: 'Eğitim Yönetimi',
                icon: Inbox,
                permKey: 'ui_auth',
                openArgs: { id: 'auth-egitim', title: 'Eğitim Yönetimi', type: 'auth-egitim' },
            },
            {
                id: 'meetings',
                label: 'Eğitim Ekle',
                icon: Upload,
                permKey: 'ui_auth',
                openArgs: { id: 'meetings', title: 'Eğitim Ekle', type: 'meetings' },
            },
        ],
    },
    {
        label: 'YÖNETİM',
        items: [
            {
                id: 'talep-yonetim',
                label: 'Kullanıcı Talepleri',
                icon: Inbox,
                superOnly: true,
                permKey: 'ui_request_management',
                openArgs: { id: 'talep-yonetim', title: 'Kullanıcı Talepleri', type: 'talep-yonetim' },
            },
            {
                id: 'error-management',
                label: 'Hata Yönetimi',
                icon: AlertTriangle,
                permKey: 'ui_error_management',
                openArgs: { id: 'error-management', title: 'Hata Yönetimi', type: 'error-management' },
            },
        ],
    },
];

const AdminSidebar = ({ onOpenFile, onExitAdmin }) => {
    const currentUser = useWorkspaceStore(state => state.currentUser);
    const [activeId, setActiveId] = useState(null);
    const [expandedIds, setExpandedIds] = useState({});
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [userPanelOpen, setUserPanelOpen] = useState(false);
    const [userPanelInitialTab, setUserPanelInitialTab] = useState('profil');

    const canSee = (item) => {
        if (!currentUser) return true;
        if (currentUser.super) return true;
        if (item.superOnly) return false;
        if (!item.permKey) return true;
        if (!currentUser.meta) return true;
        return currentUser.meta[item.permKey] !== false;
    };

    const handleClick = (item) => {
        if (item.children) {
            setExpandedIds(prev => ({ ...prev, [item.id]: !prev[item.id] }));
            return;
        }
        setActiveId(item.id);
        if (item.isN8n) {
            const base = localStorage.getItem('n8n_base_url') || 'http://localhost:5678';
            localStorage.setItem('n8n_target_url', item.n8nPath ? base + item.n8nPath : base);
            window.dispatchEvent(new Event('open-n8n-workspace'));
            return;
        }
        if (item.openArgs && onOpenFile) {
            onOpenFile(item.openArgs);
        }
    };

    return (
        <aside
            className="relative w-72 font-sans flex h-screen shrink-0 z-20"
            style={{ background: '#18181b', borderRight: '1px solid #27272a' }}
        >
            <UserMenu
                isOpen={userMenuOpen}
                onClose={() => setUserMenuOpen(false)}
                onSelect={(tabId) => {
                    setUserPanelInitialTab(tabId);
                    setUserPanelOpen(true);
                }}
                isCollapsed={false}
                currentUser={currentUser}
            />
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
                            body: JSON.stringify({ kullanici_kimlik: currentUser?.id, islem_turu: 'LOGOUT' }),
                        }).finally(() => {
                            useWorkspaceStore.getState().setIsLoggedIn(false);
                            useWorkspaceStore.getState().setCurrentUser(null);
                            resetBackendMonitoring();
                        });
                    }
                }}
                isCollapsed={false}
            />

            <div className="flex flex-col h-full w-full overflow-hidden">
                {/* Logo + geri butonu */}
                <div className="flex items-center h-14 shrink-0 px-3 gap-2 border-b border-[#292524]/60">
                    <button
                        onClick={onExitAdmin}
                        className="text-slate-600 hover:text-slate-300 transition-colors p-1 shrink-0"
                        title="Chat'e dön"
                    >
                        <ArrowLeft size={15} />
                    </button>
                    <img src={FullLogoImage} alt="Yılgenci Logo" className="h-8 w-auto object-contain" />
                </div>

                {/* Navigasyon */}
                <div className="flex-1 overflow-y-auto py-3 px-3
                    [&::-webkit-scrollbar]:w-1
                    [&::-webkit-scrollbar-track]:bg-transparent
                    [&::-webkit-scrollbar-thumb]:bg-slate-700/60
                    hover:[&::-webkit-scrollbar-thumb]:bg-slate-600"
                >
                    {NAV_GROUPS.map((group) => {
                        const visibleItems = group.items.filter(canSee);
                        if (visibleItems.length === 0) return null;
                        return (
                            <div key={group.label} className="mb-5">
                                <div className="px-2 mb-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
                                    {group.label}
                                </div>
                                <div className="flex flex-col gap-px">
                                    {visibleItems.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = activeId === item.id;
                                        const isExpanded = !!expandedIds[item.id];
                                        const hasChildren = !!item.children;
                                        return (
                                            <div key={item.id}>
                                                <button
                                                    onClick={() => handleClick(item)}
                                                    className={`relative flex items-center gap-2.5 w-full text-left px-2 py-[7px] text-[13px] transition-all duration-100
                                                        ${isActive
                                                            ? 'text-white bg-[#AA1416]/20'
                                                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'}
                                                    `}
                                                >
                                                    {isActive && (
                                                        <span className="absolute left-0 top-1 bottom-1 w-[2px] bg-[#AA1416] rounded-r" />
                                                    )}
                                                    <Icon
                                                        size={15}
                                                        className={`shrink-0 ${isActive ? 'text-[#DC2626]' : 'text-slate-500'}`}
                                                    />
                                                    <span className="flex-1 truncate">{item.label}</span>
                                                    {item.badge && (
                                                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                    {hasChildren && (
                                                        isExpanded
                                                            ? <ChevronDown size={13} className="shrink-0 text-slate-600" />
                                                            : <ChevronRight size={13} className="shrink-0 text-slate-600" />
                                                    )}
                                                </button>

                                                {hasChildren && isExpanded && (
                                                    <div className="ml-3 pl-3 border-l border-zinc-700/60 flex flex-col gap-px mt-px mb-1">
                                                        {item.children.map((child) => {
                                                            const ChildIcon = child.icon;
                                                            const isChildActive = activeId === child.id;
                                                            const hasGrandchildren = !!child.children;
                                                            const isChildExpanded = !!expandedIds[child.id];
                                                            return (
                                                                <div key={child.id}>
                                                                    <button
                                                                        onClick={() => handleClick(child)}
                                                                        className={`relative flex items-center gap-2 w-full text-left px-2 py-[6px] text-[12px] transition-all duration-100
                                                                            ${isChildActive
                                                                                ? 'text-white bg-[#AA1416]/20'
                                                                                : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'}
                                                                        `}
                                                                    >
                                                                        {isChildActive && (
                                                                            <span className="absolute left-0 top-1 bottom-1 w-[2px] bg-[#AA1416] rounded-r" />
                                                                        )}
                                                                        <ChildIcon
                                                                            size={13}
                                                                            className={`shrink-0 ${isChildActive ? 'text-[#DC2626]' : 'text-slate-600'}`}
                                                                        />
                                                                        <span className="truncate flex-1">{child.label}</span>
                                                                        {child.badge && (
                                                                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                                                                                {child.badge}
                                                                            </span>
                                                                        )}
                                                                        {hasGrandchildren && (
                                                                            isChildExpanded
                                                                                ? <ChevronDown size={12} className="shrink-0 text-slate-600" />
                                                                                : <ChevronRight size={12} className="shrink-0 text-slate-600" />
                                                                        )}
                                                                    </button>

                                                                    {hasGrandchildren && isChildExpanded && (
                                                                        <div className="ml-3 pl-3 border-l border-zinc-700/40 flex flex-col gap-px mt-px mb-1">
                                                                            {child.children.map((grandchild) => {
                                                                                const GrandIcon = grandchild.icon;
                                                                                const isGrandActive = activeId === grandchild.id;
                                                                                return (
                                                                                    <button
                                                                                        key={grandchild.id}
                                                                                        onClick={() => handleClick(grandchild)}
                                                                                        className={`relative flex items-center gap-2 w-full text-left px-2 py-[5px] text-[11px] transition-all duration-100
                                                                                            ${isGrandActive
                                                                                                ? 'text-white bg-[#AA1416]/20'
                                                                                                : 'text-slate-600 hover:text-slate-200 hover:bg-white/[0.04]'}
                                                                                        `}
                                                                                    >
                                                                                        {isGrandActive && (
                                                                                            <span className="absolute left-0 top-1 bottom-1 w-[2px] bg-[#AA1416] rounded-r" />
                                                                                        )}
                                                                                        <GrandIcon
                                                                                            size={12}
                                                                                            className={`shrink-0 ${isGrandActive ? 'text-[#DC2626]' : 'text-slate-700'}`}
                                                                                        />
                                                                                        <span className="truncate flex-1">{grandchild.label}</span>
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="shrink-0 flex items-center justify-between px-3 py-4 border-t border-[#292524]">
                    <button
                        className="text-slate-600 hover:text-slate-300 transition-colors"
                        title="Sistem Ayarları"
                    >
                        <Settings size={18} />
                    </button>

                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-[11px] text-slate-500">Sistem aktif</span>
                    </div>

                    <div
                        onClick={() => setUserMenuOpen(v => !v)}
                        className={`flex items-center justify-center w-8 h-8 bg-slate-800/60 border cursor-pointer transition-all duration-200 rounded-sm
                            ${(userMenuOpen || userPanelOpen)
                                ? 'border-[#DC2626]/60 bg-slate-800 text-white'
                                : 'border-slate-700/50 hover:border-[#DC2626]/60 hover:bg-slate-800'}
                        `}
                        title={currentUser?.tam_ad || 'Kullanıcı'}
                    >
                        <User size={14} className={(userMenuOpen || userPanelOpen) ? 'text-white' : 'text-slate-400'} />
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default AdminSidebar;
