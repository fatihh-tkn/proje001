import React, { useState, useEffect } from 'react';
import { Users, Shield, Clock, Search, ChevronRight, Plus, UserPlus, FileText, Database, LayoutDashboard, BookOpen, MessageSquare, Cpu, FileCog, Bot, Zap } from 'lucide-react';
import InlineUserDashboard from './InlineUserDashboard';
import ArchiveTreeItem from './ArchiveTreeItem';
import SapEgitimAdminPaneli from './SapEgitimAdminPaneli';
import EgitimAcmaSlideOver from './EgitimAcmaSlideOver';


/* Settings menüsündeki sekmelerle birebir eşleşen sabit liste */
const SETTINGS_TABS = [
    { key: 'ui_file_processing', label: 'Dosya İşleme', desc: 'Dosya yükleme, işleme ve arşiv yönetimi.', icon: FileCog },
    { key: 'ui_database', label: 'Veritabanı', desc: 'Sistemdeki dosyalara göz atma ve silme.', icon: Database },
    { key: 'ui_ai_orchestrator', label: 'Yapay Zeka Merkezi', desc: 'YZ modelleri, agentlar ve chatbot etkileşimi.', icon: Bot },
    { key: 'ui_metrics', label: 'Sistem Metrikleri', desc: 'Analitik grafikleri ve izleme logları.', icon: Cpu },
    { key: 'ui_auth', label: 'Kullanıcı ve Rol Yönetimi', desc: 'Kullanıcı, rol ve yetki yönetimi.', icon: Users },
];

/* ─────────────────────────────────────────────────────────────
   ANA SARMALAYICI
───────────────────────────────────────────────────────────── */
export default function AuthViewer() {
    const [activeTab, setActiveTab] = useState('users');
    const [egitimFormOpen, setEgitimFormOpen] = useState(false);

    const tabs = [
        { id: 'users', label: 'Kullanıcılar', icon: Users },
        { id: 'audit', label: 'Sistem Kayıtları', icon: Clock },
        { id: 'egitim_yonetimi', label: 'Eğitim Yönetim Paneli', icon: BookOpen },
        { id: 'restrictions', label: 'Kısıtlamalar', icon: Shield },
    ];

    return (
        <div className="flex flex-col h-full w-full bg-[#f8f9fa] font-sans">
            {/* HEADER */}
            <div className="flex-none px-6 py-4 flex items-center justify-between border-b border-slate-200/60 bg-white">
                <div>
                    <h2 className="text-[14px] font-semibold text-slate-800 flex items-center gap-2">
                        <Users className="text-[#b91d2c]" size={18} />
                        Kullanıcı ve Rol Yönetimi
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-1">Sisteme girenleri, model kullanım haklarını ve logları yönetin.</p>
                </div>
                <button
                    onClick={() => setEgitimFormOpen(true)}
                    className="flex items-center gap-2 bg-[#378ADD] hover:bg-[#185FA5] text-white px-3 py-2 rounded-md text-[12px] font-medium transition-colors shadow-sm"
                >
                    <Plus size={14} /> Yeni Eğitim Aç
                </button>
            </div>

            {/* TABS */}
            <div className="flex-none px-6 flex items-center gap-4 border-b border-slate-200/60 bg-white pt-2">
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-1 pb-3 text-[12px] font-medium transition-all relative
                                ${isActive ? 'text-[#b91d2c]' : 'text-slate-500 hover:text-slate-800'}
                            `}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                            {isActive && (
                                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#b91d2c] rounded-t-md" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-auto p-6">
                {activeTab === 'users' && <UsersTab />}
                {activeTab === 'audit' && <AuditTab />}
                {activeTab === 'egitim_yonetimi' && <SapEgitimAdminPaneli />}
                {activeTab === 'restrictions' && <RestrictionsTab />}
            </div>

            {/* Slide-Over Panel */}
            <EgitimAcmaSlideOver open={egitimFormOpen} onClose={() => setEgitimFormOpen(false)} />
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   KULLANICI LİSTESİ SEKMESİ
───────────────────────────────────────────────────────────── */
function UsersTab() {
    const [users, setUsers] = useState([]);
    const [expandedUserId, setExpandedUserId] = useState(null);
    const [editingRoleId, setEditingRoleId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetch('/api/auth/users')
            .then(res => res.json())
            .then(data => setUsers(data))
            .catch(err => console.error('Kullanıcılar yüklenemedi', err));
    }, []);

    const updateRole = (userId, newRole) => {
        fetch(`/api/auth/users/${userId}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole })
        }).then(res => {
            if (res.ok) setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            setEditingRoleId(null);
        }).catch(err => console.error('Rol güncellenemedi', err));
    };

    const toggleExpand = (userId) => {
        setExpandedUserId(prev => prev === userId ? null : userId);
    };

    /* Token'ı kısa formata çevir */
    const fmtToken = (n) => {
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
        if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
        return String(n || 0);
    };

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-4 animate-in fade-in duration-300 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                    <input
                        type="text"
                        placeholder="Kullanıcı ara..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-1.5 border border-stone-200 rounded-md text-[12px] font-sans w-64 bg-white text-stone-700 focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD] transition-shadow placeholder:text-stone-400"
                    />
                </div>
                <button className="flex items-center gap-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors shadow-sm">
                    <UserPlus size={14} className="text-stone-500" /> Yeni Ekle
                </button>
            </div>

            {/* Table */}
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr>
                            <th className="py-2.5 px-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-200 bg-stone-50/80">Kullanıcı</th>
                            <th className="py-2.5 px-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-200 bg-stone-50/80">E-Posta</th>
                            <th className="py-2.5 px-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-200 bg-stone-50/80">Departman</th>
                            <th className="py-2.5 px-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-200 bg-stone-50/80 text-right">Oturum</th>
                            <th className="py-2.5 px-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-200 bg-stone-50/80 text-right">Token</th>
                            <th className="py-2.5 px-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-200 bg-stone-50/80">Durum</th>
                            <th className="py-2.5 px-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-200 bg-stone-50/80">Son Giriş</th>
                            <th className="py-2.5 px-2 text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-200 bg-stone-50/80 w-8"></th>
                        </tr>
                    </thead>
                    <tbody className="text-[12px] text-stone-800">
                        {filteredUsers.map(user => (
                            <React.Fragment key={user.id}>
                                {/* Kullanıcı Satırı */}
                                {(() => {
                                    const isPassive = user.status !== 'Aktif';
                                    const isAdmin = user.role === 'Sistem Yöneticisi';
                                    const isExpanded = expandedUserId === user.id;

                                    // Satır renk kararı: pasif > admin > normal
                                    const rowBg = isExpanded
                                        ? 'bg-[#378ADD]/5 border-b-0'
                                        : isPassive
                                            ? 'bg-[#FCEBEB]/50 hover:bg-[#FCEBEB]/80'
                                            : isAdmin
                                                ? 'bg-[#FAEEDA]/40 hover:bg-[#FAEEDA]/70'
                                                : 'hover:bg-stone-50';

                                    const avatarBg = isPassive ? '#791F1F' : isAdmin ? '#A07A0B' : '#378ADD';

                                    return (
                                        <tr
                                            onClick={() => toggleExpand(user.id)}
                                            className={`border-b border-stone-100 transition-colors cursor-pointer group ${rowBg}`}
                                        >
                                            {/* Ad */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-black text-white shrink-0"
                                                        style={{ background: avatarBg }}
                                                    >
                                                        {(user.name || 'U').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)}
                                                    </div>
                                                    <div>
                                                        <span className="font-black text-stone-700 text-[12px] group-hover:text-[#378ADD] transition-colors block">{user.name}</span>
                                                        {isAdmin && <span className="text-[9px] font-bold text-[#A07A0B] uppercase tracking-widest">Yönetici</span>}
                                                        {isPassive && <span className="text-[9px] font-bold text-[#791F1F] uppercase tracking-widest">Pasif</span>}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* E-posta */}
                                            <td className="py-3 px-4 text-stone-500 text-[11px] font-mono">{user.email}</td>

                                            {/* Departman */}
                                            <td className="py-3 px-4">
                                                <span className="text-[10px] font-bold text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-md">
                                                    {user.department || 'Belirtilmemiş'}
                                                </span>
                                            </td>

                                            {/* Oturum */}
                                            <td className="py-3 px-4 text-right">
                                                <span className="text-[13px] font-black text-[#378ADD]">{user.sessionCount ?? 0}</span>
                                            </td>

                                            {/* Token */}
                                            <td className="py-3 px-4 text-right">
                                                <span className="text-[12px] font-black text-[#7F77DD] font-mono">{fmtToken(user.totalTokens)}</span>
                                            </td>

                                            {/* Durum */}
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block w-max border ${user.status === 'Aktif'
                                                    ? 'bg-[#EAF3DE] text-[#3B6D11] border-[#3B6D11]/20'
                                                    : 'bg-[#FCEBEB] text-[#791F1F] border-[#791F1F]/20'
                                                    }`}>
                                                    {user.status}
                                                </span>
                                            </td>

                                            {/* Son Giriş */}
                                            <td className="py-3 px-4 text-stone-400 text-[11px] font-mono">{user.lastLogin}</td>

                                            {/* Accordion ok */}
                                            <td className="py-3 px-2 text-center">
                                                <ChevronRight
                                                    size={14}
                                                    className={`text-stone-400 transition-all duration-200 mx-auto ${expandedUserId === user.id
                                                        ? 'rotate-90 text-[#378ADD]'
                                                        : 'group-hover:text-stone-600'
                                                        }`}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })()}

                                {/* Inline Dashboard Accordion */}
                                {expandedUserId === user.id && (
                                    <tr>
                                        <td colSpan={8} className="p-0">
                                            <InlineUserDashboard
                                                userId={user.id}
                                                userName={user.name}
                                            />
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                        {filteredUsers.length === 0 && (
                            <tr>
                                <td colSpan={9} className="py-12 text-center text-[12px] text-stone-400 italic">Kullanıcı bulunamadı.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   KISITLAMALAR SEKMESİ (YENİ)
───────────────────────────────────────────────────────────── */
function RestrictionsTab() {
    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(null);

    useEffect(() => {
        fetch('/api/auth/users')
            .then(res => res.json())
            .then(data => {
                setUsers(data);
                if (data.length > 0) {
                    setSelectedUserId(data[0].id);
                }
            })
            .catch(err => console.error('Kullanıcılar yüklenemedi', err));
    }, []);

    const selectedUser = users.find(u => u.id === selectedUserId);

    return (
        <div className="flex gap-6 h-full animate-in fade-in duration-300 max-w-5xl mx-auto">
            {/* User List Sidebar */}
            <div className="w-64 flex flex-col bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden shrink-0 h-[650px] max-h-full">
                <div className="p-4 border-b border-stone-200 bg-stone-50/50 font-semibold text-[11px] uppercase tracking-wide text-stone-500 flex items-center gap-2">
                    <Users size={14} className="text-[#378ADD]" /> Kullanıcı Seçimi
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {users.map(u => (
                        <button
                            key={u.id}
                            onClick={() => setSelectedUserId(u.id)}
                            className={`w-full flex items-center justify-between text-left px-3 py-2.5 text-[12px] rounded-md transition-colors ${selectedUserId === u.id ? 'bg-[#378ADD]/10 text-[#378ADD] font-semibold' : 'text-stone-600 hover:bg-stone-50'}`}
                        >
                            <span>{u.name}</span>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'Aktif' ? 'bg-[#3B6D11]' : 'bg-stone-300'}`}></span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Restrictions Panel */}
            <div className="flex-1 overflow-y-auto bg-white border border-stone-200 rounded-xl shadow-sm p-6 h-[650px] max-h-full">
                {selectedUser ? (
                    <UserDetailView
                        key={selectedUser.id}
                        user={selectedUser}
                        onBack={() => setSelectedUserId(null)}
                        onUpdateStatus={(newStatus) => {
                            fetch(`/api/auth/users/${selectedUser.id}/status`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: newStatus })
                            }).then(res => {
                                if (res.ok) {
                                    setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, status: newStatus } : u));
                                }
                            });
                        }}
                        onDelete={() => {
                            fetch(`/api/auth/users/${selectedUser.id}`, { method: 'DELETE' })
                                .then(res => {
                                    if (res.ok) {
                                        setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
                                        setSelectedUserId(null);
                                    }
                                });
                        }}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-stone-400">
                        <Shield size={32} className="opacity-20 mb-3 text-stone-300" />
                        <span className="text-[13px] font-medium text-stone-500">Lütfen soldan bir kullanıcı seçin.</span>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   KULLANICI DETAY PANELİ — Yetkiler buraya gösterilecek
   Bu TAMAMEN UserDetailView dışında, ayrı modül düzeyinde fonksiyonlar
───────────────────────────────────────────────────────────── */
function UserDetailView({ user, onBack, onUpdateStatus, onDelete }) {
    const [meta, setMeta] = useState(user.meta || {});
    const [context, setContext] = useState(null);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState(user.status);
    const [activeSubTab, setActiveSubTab] = useState('models');

    useEffect(() => {
        fetch(`/api/auth/users/${user.id}/permissions-context`)
            .then(res => res.json())
            .then(data => {
                setContext(data);
                if (data.user_meta && Object.keys(data.user_meta).length > 0) {
                    setMeta(data.user_meta);
                }
            })
            .catch(err => console.error('Permissions context yüklenemedi', err));
    }, [user.id]);

    const updateMeta = (key, value) => {
        setMeta(prev => ({ ...prev, [key]: value }));
        setIsDirty(true);
    };

    const handleSave = () => {
        setIsSaving(true);
        fetch(`/api/auth/users/${user.id}/meta`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(meta)
        })
            .then(() => { setIsDirty(false); })
            .catch(err => console.error('Meta kaydedilemedi', err))
            .finally(() => setIsSaving(false));
    };

    if (!context) {
        return (
            <div className="flex items-center justify-center h-48 w-full animate-in fade-in">
                <span className="text-[12px] text-stone-400 font-medium flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-stone-200 border-t-[#378ADD] rounded-full animate-spin" />
                    Sistem Yetkileri Toplanıyor...
                </span>
            </div>
        );
    }

    return (
        <div className="flex flex-col animate-in fade-in slide-in-from-top-2 duration-300">

            {/* Alt Sekme Menüsü */}
            <div className="flex border-b border-stone-200 mb-5 gap-4 px-1">
                <button
                    className={`pb-2.5 text-[12px] font-medium transition-colors border-b-[2px] flex items-center gap-1.5 ${activeSubTab === 'models' ? 'border-[#378ADD] text-[#378ADD]' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
                    onClick={() => setActiveSubTab('models')}
                >
                    <div className={`p-1 rounded ${activeSubTab === 'models' ? 'bg-[#378ADD]/10' : 'bg-stone-100'}`}>
                        <Cpu size={14} className={activeSubTab === 'models' ? 'text-[#378ADD]' : 'text-stone-500'} />
                    </div>
                    Model Yetkileri
                    <span className="ml-1 text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-medium">
                        {context.models.filter(m => meta[m.key] !== false).length}/{context.models.length}
                    </span>
                </button>
                <button
                    className={`pb-2.5 text-[12px] font-medium transition-colors border-b-[2px] flex items-center gap-1.5 ${activeSubTab === 'archives' ? 'border-[#D85A30] text-[#D85A30]' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
                    onClick={() => setActiveSubTab('archives')}
                >
                    <div className={`p-1 rounded ${activeSubTab === 'archives' ? 'bg-[#D85A30]/10' : 'bg-stone-100'}`}>
                        <Database size={14} className={activeSubTab === 'archives' ? 'text-[#D85A30]' : 'text-stone-500'} />
                    </div>
                    Belge / Arşiv Yetkileri
                </button>
                <button
                    className={`pb-2.5 text-[12px] font-medium transition-colors border-b-[2px] flex items-center gap-1.5 ${activeSubTab === 'tabs' ? 'border-[#1D9E75] text-[#1D9E75]' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
                    onClick={() => setActiveSubTab('tabs')}
                >
                    <div className={`p-1 rounded ${activeSubTab === 'tabs' ? 'bg-[#1D9E75]/10' : 'bg-stone-100'}`}>
                        <LayoutDashboard size={14} className={activeSubTab === 'tabs' ? 'text-[#1D9E75]' : 'text-stone-500'} />
                    </div>
                    Görünür Sekmeler
                </button>
            </div>

            {/* İçerik Alanı */}
            <div className="min-h-[220px] mb-6">
                {activeSubTab === 'models' && (
                    <div className="animate-in fade-in flex flex-col gap-2">
                        {context.models.length === 0 ? (
                            <div className="py-2 text-[11px] text-stone-400 italic">Tanımlı model bulunamadı.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {context.models.map(m => {
                                    const checked = meta[m.key] !== undefined ? meta[m.key] : true;
                                    return (
                                        <div key={m.key} className="flex items-center gap-2 py-2 px-3 border border-stone-200 rounded-md hover:border-stone-300 hover:shadow-sm bg-white group cursor-pointer transition-all" onClick={() => updateMeta(m.key, !checked)}>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-col">
                                                    <span className="text-[12px] font-medium text-stone-700 group-hover:text-stone-900 truncate">
                                                        {m.label}
                                                    </span>
                                                    {m.model_id && (
                                                        <span className="text-[10px] font-mono text-stone-400 truncate">{m.model_id}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`shrink-0 w-8 h-4 rounded-full transition-all relative flex items-center ${checked ? 'bg-[#1D9E75]' : 'bg-stone-200'}`}>
                                                <div className={`w-3 h-3 rounded-full bg-white absolute transition-all shadow-sm ${checked ? 'left-[18px]' : 'left-[2px]'}`} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeSubTab === 'archives' && (
                    <div className="animate-in fade-in max-h-[300px] overflow-y-auto pr-2 bg-white border border-stone-200 rounded-md p-4 shadow-sm">
                        <div className="space-y-1">
                            {context.archives
                                .filter(a => !a.parent_id || a.parent_id === null || a.parent_id === 'null')
                                .map(a => (
                                    <ArchiveTreeItem
                                        key={a.key}
                                        item={a}
                                        archives={context.archives}
                                        meta={meta}
                                        updateMeta={updateMeta}
                                    />
                                ))
                            }
                            {context.archives.length === 0 && (
                                <div className="py-2 text-[11px] text-stone-400 italic">Yetkilendirilecek arşiv klasörü bulunamadı.</div>
                            )}
                        </div>
                    </div>
                )}

                {activeSubTab === 'tabs' && (
                    <div className="animate-in fade-in flex flex-col gap-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {SETTINGS_TABS.map(t => {
                                const checked = meta[t.key] !== undefined ? meta[t.key] : true;
                                return (
                                    <div key={t.key} className="flex items-center gap-2 py-2.5 px-3 border border-stone-200 rounded-md hover:border-stone-300 hover:shadow-sm bg-white group cursor-pointer transition-all" onClick={() => updateMeta(t.key, !checked)}>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[12px] font-medium text-stone-700 group-hover:text-stone-900 truncate">
                                                {t.label}
                                            </span>
                                        </div>
                                        <div className={`shrink-0 w-8 h-4 rounded-full transition-all relative flex items-center ${checked ? 'bg-[#1D9E75]' : 'bg-stone-200'}`}>
                                            <div className={`w-3 h-3 rounded-full bg-white absolute transition-all shadow-sm ${checked ? 'left-[18px]' : 'left-[2px]'}`} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Alt Butonlar */}
            <div className="flex items-center pt-4 mt-auto border-t border-stone-200">
                {/* Sol: Tehlikeli işlemler */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            const newStatus = status === 'Aktif' ? 'Askıya Alındı' : 'Aktif';
                            setStatus(newStatus);
                            onUpdateStatus(newStatus);
                        }}
                        className={`text-[11px] font-medium px-3 py-1.5 rounded-sm transition-colors border ${status === 'Aktif'
                            ? 'bg-[#FAEEDA] text-[#854F0B] border-stone-200 hover:bg-[#F2DFBA]'
                            : 'bg-[#EAF3DE] text-[#3B6D11] border-stone-200 hover:bg-[#CFE2B6]'
                            }`}
                    >
                        {status === 'Aktif' ? 'Hesabı Askıya Al' : 'Hesabı Aktifleştir'}
                    </button>
                    <button
                        onClick={() => { if (window.confirm('Bu kullanıcıyı tamamen silmek istediğinize emin misiniz?')) onDelete(); }}
                        className="text-[11px] font-medium px-3 py-1.5 rounded-sm border bg-[#FCEBEB] text-[#791F1F] border-stone-200 hover:bg-[#F2D7D7] transition-colors"
                    >
                        Kullanıcıyı Sil
                    </button>
                </div>

                {/* Sağ: Panel kontrolleri */}
                <div className="flex items-center gap-2 ml-auto">
                    <button
                        onClick={onBack}
                        className="text-[11px] font-medium text-stone-500 hover:text-stone-800 transition-colors px-3 py-1.5"
                    >
                        Paneli Kapat
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`text-[11px] font-medium px-4 py-1.5 rounded-md border transition-all ${isDirty
                            ? 'bg-[#378ADD] text-white border-[#378ADD] hover:bg-[#0C447C] shadow-sm'
                            : 'bg-stone-50 text-stone-400 border-stone-200 cursor-default'
                            }`}
                    >
                        {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   DENETİM KAYITLARI SEKMESİ
───────────────────────────────────────────────────────────── */
function AuditTab() {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchLive = () => {
        fetch('/api/auth/audit/live-dashboard')
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(resData => {
                if (resData.overview && Array.isArray(resData.users) && Array.isArray(resData.timeline)) {
                    setData(resData);
                } else {
                    console.error("Unexpected dashboard shape:", resData);
                }
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Dashboard fetch err:", err);
                setIsLoading(false);
            });
    };

    useEffect(() => {
        fetchLive();
        const interval = setInterval(fetchLive, 5000); // 5 sec live refresh
        return () => clearInterval(interval);
    }, []);

    if (isLoading && !data) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-stone-400 w-full">
                <div className="w-8 h-8 rounded-full border-4 border-stone-100 border-t-[#378ADD] animate-spin mb-4" />
                <h3 className="text-[13px] font-semibold text-stone-700 animate-pulse">Sistem Verileri Derleniyor...</h3>
            </div>
        );
    }

    if (!data) return null;

    const { overview, users, timeline } = data;

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-5xl mx-auto">
            {/* OVERVIEW CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border text-left border-stone-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex justify-center items-center">
                        <Users size={18} />
                    </div>
                    <div>
                        <p className="text-[11px] text-stone-500 font-medium tracking-wide uppercase">Şu An Aktif Kullanıcı</p>
                        <h4 className="text-[18px] font-bold text-stone-800">{overview.online_users}</h4>
                    </div>
                </div>
                <div className="bg-white border text-left border-stone-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex justify-center items-center">
                        <Shield size={18} />
                    </div>
                    <div>
                        <p className="text-[11px] text-stone-500 font-medium tracking-wide uppercase">Başarısız Giriş Denemesi</p>
                        <h4 className="text-[18px] font-bold text-stone-800">{overview.failed_logins} <span className="text-[10px] text-red-500 font-normal ml-1">/ bugün</span></h4>
                    </div>
                </div>
                <div className="bg-white border text-left border-stone-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex justify-center items-center">
                        <Zap size={18} />
                    </div>
                    <div>
                        <p className="text-[11px] text-stone-500 font-medium tracking-wide uppercase">Sistem API Sinyali</p>
                        <h4 className="text-[18px] font-bold text-stone-800">{overview.total_signals} <span className="text-[10px] text-stone-400 font-normal ml-1">istek</span></h4>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
                {/* USERS TABLE */}
                <div className="lg:col-span-2 bg-white border border-stone-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-stone-200 flex justify-between items-center bg-stone-50/50">
                        <h3 className="text-[11px] font-medium text-stone-600 uppercase tracking-wide flex items-center gap-2"><LayoutDashboard size={14} className="text-[#378ADD]" /> Kullanıcı Analizleri</h3>
                        <span className="text-[10px] text-stone-400 flex items-center gap-1"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Canlı Takip</span>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left">
                            <thead className="bg-stone-50 text-[10px] uppercase text-stone-500 font-medium tracking-wide sticky top-0 z-10 border-b border-stone-200">
                                <tr>
                                    <th className="px-4 py-2.5">Kullanıcı</th>
                                    <th className="px-4 py-2.5">Eğilim / Tab</th>
                                    <th className="px-4 py-2.5">API İs.</th>
                                    <th className="px-4 py-2.5">Token</th>
                                    <th className="px-4 py-2.5">Süre</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 text-[11px] text-stone-600">
                                {users.map((u, i) => (
                                    <tr key={i} className="hover:bg-stone-50 transition-colors">
                                        <td className="px-4 py-2.5 font-medium text-stone-900 flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'Aktif' ? 'bg-[#3B6D11]' : 'bg-stone-300'}`} />
                                            {u.name}
                                        </td>
                                        <td className="px-4 py-2.5 max-w-[120px] truncate text-stone-500" title={u.favorite_tab}>{u.favorite_tab}</td>
                                        <td className="px-4 py-2.5 text-[#378ADD] font-semibold">{u.api_requests}</td>
                                        <td className="px-4 py-2.5 text-[#7F77DD] font-semibold">{u.total_tokens.toLocaleString()}</td>
                                        <td className="px-4 py-2.5 text-stone-500">{u.session_duration}</td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-6 text-stone-400 italic">Kayıt bulunamadı.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* TIMELINE */}
                <div className="bg-white border border-stone-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-stone-200 flex justify-between items-center bg-stone-50/50">
                        <h3 className="text-[11px] font-medium text-stone-600 uppercase tracking-wide flex items-center gap-2"><Clock size={14} className="text-[#378ADD]" /> Canlı Akış</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {timeline.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-[11px] text-stone-400 italic">Hareket yok...</div>
                        ) : (
                            timeline.map((evt, idx) => {
                                const timeStr = evt.time.split('T')[1]?.substring(0, 5) || evt.time;
                                return (
                                    <div key={idx} className="flex gap-3 text-[11px]">
                                        <div className="w-[35px] shrink-0 text-stone-400 font-mono text-[10px] mt-0.5 text-right">{timeStr}</div>
                                        <div className="flex flex-col relative w-full pb-3 border-l-2 border-stone-100 pl-3">
                                            <div
                                                className="absolute -left-[5px] top-[2px] w-2 h-2 rounded-full border-2 border-white shadow-sm"
                                                style={{
                                                    backgroundColor: evt.color === 'red' ? '#FCEBEB' : evt.color === 'emerald' ? '#EAF3DE' : '#E6F1FB',
                                                    outline: `2px solid ${evt.color === 'red' ? '#791F1F' : evt.color === 'emerald' ? '#3B6D11' : '#0C447C'}`
                                                }}
                                            />
                                            <span className="font-semibold text-stone-800">{evt.user}</span>
                                            <span className="text-stone-500 leading-tight">
                                                {evt.action.replace("LOGIN_SUCCESS", "Sisteme girdi")
                                                    .replace("LOGIN_FAILED_", "Hatalı Giriş: ")
                                                    .replace("TAB_VIEW", "Sekme geçişi: ")
                                                    .replace("LOGOUT", "Sistemden çıkış yaptı")}
                                                {evt.detail && <span className="font-bold whitespace-nowrap ml-1 text-stone-600">[{evt.detail.substring(0, 20)}]</span>}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* UserDashboardModal kaldırıldı — yerini InlineUserDashboard aldı */
function _UNUSED_UserDashboardModal({ user, onClose }) {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/auth/users/${user.id}/dashboard`)
            .then(res => res.json())
            .then(data => {
                setDashboardData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Dashboard fetch error', err);
                setLoading(false);
            });
    }, [user.id]);

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white py-12 px-20 border border-stone-200 rounded-xl shadow-2xl flex flex-col items-center justify-center gap-4">
                    <div className="w-8 h-8 rounded-full border-4 border-stone-100 border-t-[#378ADD] animate-spin" />
                    <span className="text-stone-500 font-semibold text-[13px] animate-pulse">Sistem Verileri Derleniyor...</span>
                </div>
            </div>
        );
    }

    if (!dashboardData) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-[700px] max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 bg-white">
                    <div>
                        <h2 className="text-[16px] font-bold text-stone-900">{user.name} Detay Özeti</h2>
                        <p className="text-[12px] text-stone-500 font-mono mt-0.5">{user.email}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors">
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-stone-50">
                    {/* Eğitimler */}
                    <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 border-b border-stone-100 pb-3">
                            <BookOpen size={18} className="text-[#378ADD]" />
                            <h3 className="text-[14px] font-bold text-stone-800">Sistem İçi Eğitimler</h3>
                        </div>
                        <ul className="space-y-3 text-[12px] text-stone-600">
                            {dashboardData.egitimler.map((egitim, i) => (
                                <li key={i} className="flex items-center justify-between p-2 hover:bg-stone-50 rounded-lg transition-colors">
                                    <span className="font-medium text-stone-800">• {egitim.isim}</span>
                                    <span className={`text-[10px] font-bold tracking-wide px-2.5 py-1 rounded border ${egitim.renk === 'emerald' ? 'bg-[#EAF3DE] text-[#3B6D11] border-[#CFE2B6]' :
                                        egitim.renk === 'amber' ? 'bg-[#FAEEDA] text-[#854F0B] border-[#F2DFBA]' :
                                            'bg-stone-100 text-stone-600 border-stone-200'
                                        }`}>
                                        {egitim.durum}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Son İncelenen Belgeler */}
                    <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 border-b border-stone-100 pb-3">
                            <FileText size={18} className="text-[#7F77DD]" />
                            <h3 className="text-[14px] font-bold text-stone-800">Son İncelenen Belgeler</h3>
                        </div>
                        <ul className="space-y-3 text-[12px] text-stone-600">
                            {dashboardData.belgeler.map((belge, i) => (
                                <li key={i} className="flex items-center gap-3 p-2 hover:bg-stone-50 rounded-lg transition-colors">
                                    {belge.type === 'PDF' && <div className="w-8 h-8 rounded bg-[#FCEBEB] text-[#791F1F] flex items-center justify-center font-bold text-[10px]">PDF</div>}
                                    {belge.type === 'DOCX' && <div className="w-8 h-8 rounded bg-[#E6F1FB] text-[#0C447C] flex items-center justify-center font-bold text-[10px]">DOCX</div>}
                                    {belge.type === 'XLSX' && <div className="w-8 h-8 rounded bg-[#EAF3DE] text-[#3B6D11] flex items-center justify-center font-bold text-[10px]">XLSX</div>}
                                    {belge.type === 'FILE' && <div className="w-8 h-8 rounded bg-stone-100 text-stone-600 flex items-center justify-center font-bold text-[10px]">DOSYA</div>}
                                    <span className="font-medium text-stone-800">{belge.name}</span>
                                    <span className="text-[10px] text-stone-400 ml-auto whitespace-nowrap">{belge.date}</span>
                                </li>
                            ))}
                            {dashboardData.belgeler.length === 0 && (
                                <p className="text-[11px] text-stone-400 italic">Henüz incelenen belge yok.</p>
                            )}
                        </ul>
                    </div>

                    {/* Özel Talepler */}
                    <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 border-b border-stone-100 pb-3">
                            <MessageSquare size={18} className="text-[#D85A30]" />
                            <h3 className="text-[14px] font-bold text-stone-800">Yönetimden Özel Talepler</h3>
                        </div>
                        <div className="space-y-3 text-[12px] text-stone-600">
                            {dashboardData.talepler.map((talep, i) => (
                                <div key={i} className="bg-stone-50 p-3 rounded-lg border border-stone-100 relative">
                                    <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${talep.renk === 'emerald' ? 'bg-[#3B6D11]' : 'bg-[#EF9F27]'}`} />
                                    <p className="font-semibold text-stone-800 italic">"{talep.mesaj}"</p>
                                    <div className="flex items-center gap-2 text-[10px] text-stone-500 mt-2">
                                        <span className={`font-bold tracking-wide ${talep.renk === 'emerald' ? 'text-[#3B6D11]' : 'text-[#854F0B]'}`}>{talep.durum}</span>
                                        <span className="text-stone-300">•</span>
                                        <span>Tarih: {talep.tarih}</span>
                                    </div>
                                </div>
                            ))}
                            {dashboardData.talepler.length === 0 && (
                                <p className="text-[11px] text-stone-400 italic">Herhangi bir özel izin talebi bulunmuyor.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
