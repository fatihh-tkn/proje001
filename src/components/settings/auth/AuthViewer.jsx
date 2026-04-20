import React, { useState, useEffect } from 'react';
import { Users, Shield, Clock, Search, MoreHorizontal, Plus, UserPlus, FileText, Database, LayoutDashboard, BookOpen, MessageSquare, Cpu, FileCog, Bot, Zap } from 'lucide-react';
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
    const [dashboardUser, setDashboardUser] = useState(null);
    const [editingRoleId, setEditingRoleId] = useState(null);

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
            if (res.ok) {
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            }
            setEditingRoleId(null);
        }).catch(err => console.error('Rol güncellenemedi', err));
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                        type="text"
                        placeholder="Kullanıcı ara..."
                        className="pl-9 pr-4 py-2 border border-slate-200 rounded-sm text-[12px] w-64 focus:outline-none focus:border-[#b91d2c] focus:ring-1 focus:ring-[#b91d2c]"
                    />
                </div>
                <button className="flex items-center gap-2 bg-[#b91d2c] hover:bg-[#961e27] text-white px-4 py-2 rounded-sm text-[12px] font-medium transition-colors shadow-sm">
                    <UserPlus size={14} /> Yeni Kullanıcı
                </button>
            </div>

            <div className="bg-white border border-slate-200/60 rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[#f1f3f5] border-b border-slate-200/60 text-[11px] uppercase tracking-wider text-slate-600 font-semibold">
                            <th className="p-4">Kullanıcı Adı</th>
                            <th className="p-4">E-Posta</th>
                            <th className="p-4">Rol</th>
                            <th className="p-4">Durum</th>
                            <th className="p-4">Son Giriş</th>
                            <th className="p-4 text-center">İşlem</th>
                        </tr>
                    </thead>
                    <tbody className="text-[12px] text-slate-700 divide-y divide-slate-100">
                        {users.map(user => (
                            <React.Fragment key={user.id}>
                                <tr
                                    onClick={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)}
                                    className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${expandedUserId === user.id ? 'bg-slate-50/80' : ''}`}
                                >
                                    <td className="p-4 font-medium">{user.name}</td>
                                    <td className="p-4 text-slate-500">{user.email}</td>
                                    <td className="p-4">
                                        {editingRoleId === user.id ? (
                                            <select
                                                autoFocus
                                                onBlur={() => setEditingRoleId(null)}
                                                onChange={(e) => updateRole(user.id, e.target.value)}
                                                value={user.role}
                                                onClick={(e) => e.stopPropagation()}
                                                className="bg-white text-slate-700 px-2 py-1 rounded-md text-[10px] font-medium border border-[#b91d2c] shadow-sm focus:outline-none focus:ring-1 focus:ring-[#b91d2c] cursor-pointer appearance-none pr-6 relative bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23b91d2c%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:8px_8px] bg-[position:right_8px_center]"
                                            >
                                                <option value="Standart Kullanıcı">Standart Kullanıcı</option>
                                                <option value="Sistem Yöneticisi">Sistem Yöneticisi</option>
                                            </select>
                                        ) : (
                                            <span
                                                onClick={(e) => { e.stopPropagation(); setEditingRoleId(user.id); }}
                                                className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-[10px] font-medium border border-slate-200 hover:border-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
                                            >
                                                {user.role}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-medium flex items-center gap-1.5 w-max ${user.status === 'Aktif' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'Aktif' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-400 text-[11px]">{user.lastLogin}</td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setDashboardUser(user); }}
                                            className="p-1 transition-all rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                            title="Özet Dashboard"
                                        >
                                            <MoreHorizontal size={14} />
                                        </button>
                                    </td>
                                </tr>
                                {expandedUserId === user.id && (
                                    <tr>
                                        <td colSpan="6" className="p-0 border-b border-slate-200 bg-slate-50/40">
                                            <div className="px-6 py-6 border-t border-slate-100">
                                                <UserDetailView
                                                    user={user}
                                                    onBack={() => setExpandedUserId(null)}
                                                    onUpdateStatus={(newStatus) => {
                                                        fetch(`/api/auth/users/${user.id}/status`, {
                                                            method: 'PUT',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ status: newStatus })
                                                        }).then(res => {
                                                            if (res.ok) setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
                                                        }).catch(err => console.error('Durum güncellenemedi', err));
                                                    }}
                                                    onDelete={() => {
                                                        fetch(`/api/auth/users/${user.id}`, { method: 'DELETE' })
                                                            .then(res => {
                                                                if (res.ok) {
                                                                    setUsers(prev => prev.filter(u => u.id !== user.id));
                                                                    setExpandedUserId(null);
                                                                }
                                                            }).catch(err => console.error('Kullanıcı silinemedi', err));
                                                    }}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {dashboardUser && <UserDashboardModal user={dashboardUser} onClose={() => setDashboardUser(null)} />}
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
                <span className="text-[12px] text-slate-400 font-medium flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-slate-200 border-t-[#b91d2c] rounded-full animate-spin" />
                    Sistem Yetkileri Toplanıyor...
                </span>
            </div>
        );
    }

    return (
        <div className="flex flex-col animate-in fade-in slide-in-from-top-2 duration-300">

            {/* 3 Kolonlu Yetki Izgarası */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">

                {/* KOLON 1: Model Yetkileri — Gerçek YZ modelleri */}
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                        <div className="p-1.5 rounded bg-[#b91d2c]/10">
                            <Cpu size={12} className="text-[#b91d2c]" />
                        </div>
                        <h3 className="text-[12px] font-bold text-slate-800">1. Model Yetkileri</h3>
                        <span className="ml-auto text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                            {context.models.filter(m => meta[m.key] !== false).length}/{context.models.length} aktif
                        </span>
                    </div>
                    <div className="flex-1">
                        {context.models.length === 0 ? (
                            <div className="py-1.5 px-2 text-[10px] text-slate-400 italic">Tanımlı model bulunamadı.</div>
                        ) : (
                            context.models.map(m => {
                                const checked = meta[m.key] !== undefined ? meta[m.key] : true;
                                return (
                                    <div key={m.key} className="flex items-center gap-1 py-1 pr-1 group cursor-pointer" onClick={() => updateMeta(m.key, !checked)}>
                                        <div className="w-1 h-1 rounded-full bg-slate-300 shrink-0 ml-0.5 mr-0.5" />
                                        <span className="flex-1 text-[11px] text-slate-600 group-hover:text-slate-800 truncate transition-colors">
                                            {m.label}
                                        </span>
                                        {m.model_id && (
                                            <span className="text-[9px] font-mono text-slate-300 mr-1.5">{m.model_id}</span>
                                        )}
                                        <div className={`shrink-0 w-7 h-3.5 rounded-full transition-all relative flex items-center ${checked ? 'bg-emerald-400' : 'bg-slate-200'}`}>
                                            <div className={`w-2.5 h-2.5 rounded-full bg-white absolute transition-all shadow-sm ${checked ? 'left-[15px]' : 'left-[2px]'}`} />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* KOLON 2: Arşiv/Belge Yetkileri — Ağaç yapısı */}
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                        <div className="p-1.5 rounded bg-blue-50">
                            <Database size={12} className="text-blue-600" />
                        </div>
                        <h3 className="text-[12px] font-bold text-slate-800">2. Belge / Arşiv Yetkileri</h3>
                    </div>
                    <div className="space-y-1 flex-1 max-h-80 overflow-y-auto pr-1">
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
                    </div>
                </div>

                {/* KOLON 3: Görünür Sekmeler */}
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                        <div className="p-1.5 rounded bg-emerald-50">
                            <LayoutDashboard size={12} className="text-emerald-600" />
                        </div>
                        <h3 className="text-[12px] font-bold text-slate-800">3. Görünür Sekmeler</h3>
                    </div>
                    <div className="flex-1">
                        {SETTINGS_TABS.map(t => {
                            const checked = meta[t.key] !== undefined ? meta[t.key] : true;
                            return (
                                <div key={t.key} className="flex items-center gap-1 py-1 pr-1 group cursor-pointer" onClick={() => updateMeta(t.key, !checked)}>
                                    <div className="w-1 h-1 rounded-full bg-slate-300 shrink-0 ml-0.5 mr-0.5" />
                                    <span className="flex-1 text-[11px] text-slate-600 group-hover:text-slate-800 truncate transition-colors">
                                        {t.label}
                                    </span>
                                    <div className={`shrink-0 w-7 h-3.5 rounded-full transition-all relative flex items-center ${checked ? 'bg-emerald-400' : 'bg-slate-200'}`}>
                                        <div className={`w-2.5 h-2.5 rounded-full bg-white absolute transition-all shadow-sm ${checked ? 'left-[15px]' : 'left-[2px]'}`} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Alt Butonlar */}
            <div className="flex items-center pt-4 border-t border-slate-200/60">
                {/* Sol: Tehlikeli işlemler */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            const newStatus = status === 'Aktif' ? 'Askıya Alındı' : 'Aktif';
                            setStatus(newStatus);
                            onUpdateStatus(newStatus);
                        }}
                        className={`text-[11px] font-medium px-3 py-1.5 rounded-sm transition-colors border ${status === 'Aktif'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                    >
                        {status === 'Aktif' ? 'Hesabı Askıya Al' : 'Hesabı Aktifleştir'}
                    </button>
                    <button
                        onClick={() => { if (window.confirm('Bu kullanıcıyı tamamen silmek istediğinize emin misiniz?')) onDelete(); }}
                        className="text-[11px] font-medium px-3 py-1.5 rounded-sm border bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 transition-colors"
                    >
                        Kullanıcıyı Sil
                    </button>
                </div>

                {/* Sağ: Panel kontrolleri */}
                <div className="flex items-center gap-2 ml-auto">
                    <button
                        onClick={onBack}
                        className="text-[11px] font-medium text-slate-400 hover:text-slate-700 transition-colors px-3 py-1.5"
                    >
                        Paneli Kapat
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`text-[11px] font-medium px-3 py-1.5 rounded-sm border transition-all ${isDirty
                            ? 'bg-[#b91d2c] text-white border-[#b91d2c] hover:bg-[#961e27]'
                            : 'bg-slate-50 text-slate-400 border-slate-200 cursor-default'
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
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 w-full">
                <div className="w-8 h-8 rounded-full border-4 border-slate-100 border-t-[#b91d2c] animate-spin mb-4" />
                <h3 className="text-[13px] font-semibold text-slate-700 animate-pulse">Sistem Verileri Derleniyor...</h3>
            </div>
        );
    }

    if (!data) return null;

    const { overview, users, timeline } = data;

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* OVERVIEW CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border text-left border-slate-200 rounded-lg p-4 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex justify-center items-center">
                        <Users size={18} />
                    </div>
                    <div>
                        <p className="text-[11px] text-slate-500 font-medium">Şu An Aktif Kullanıcı</p>
                        <h4 className="text-[18px] font-bold text-slate-800">{overview.online_users}</h4>
                    </div>
                </div>
                <div className="bg-white border text-left border-slate-200 rounded-lg p-4 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex justify-center items-center">
                        <Shield size={18} />
                    </div>
                    <div>
                        <p className="text-[11px] text-slate-500 font-medium">Başarısız Giriş Denemesi</p>
                        <h4 className="text-[18px] font-bold text-slate-800">{overview.failed_logins} <span className="text-[10px] text-red-500 font-normal ml-1">/ bugün</span></h4>
                    </div>
                </div>
                <div className="bg-white border text-left border-slate-200 rounded-lg p-4 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex justify-center items-center">
                        <Zap size={18} />
                    </div>
                    <div>
                        <p className="text-[11px] text-slate-500 font-medium">Sistem API Sinyali</p>
                        <h4 className="text-[18px] font-bold text-slate-800">{overview.total_signals} <span className="text-[10px] text-slate-400 font-normal ml-1">istek</span></h4>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
                {/* USERS TABLE */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="text-[13px] font-bold text-slate-800 flex items-center gap-2"><LayoutDashboard size={14} className="text-[#b91d2c]" /> Kullanıcı Analizleri</h3>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Canlı Takip</span>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 text-[10px] uppercase text-slate-400 font-bold sticky top-0 z-10 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-2">Kullanıcı</th>
                                    <th className="px-4 py-2">Eğilim / Tab</th>
                                    <th className="px-4 py-2">API İs.</th>
                                    <th className="px-4 py-2">Token</th>
                                    <th className="px-4 py-2">Süre</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-[11px] text-slate-600">
                                {users.map((u, i) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="px-4 py-2.5 font-medium text-slate-800 flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'Aktif' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                            {u.name}
                                        </td>
                                        <td className="px-4 py-2.5 max-w-[120px] truncate text-slate-500" title={u.favorite_tab}>{u.favorite_tab}</td>
                                        <td className="px-4 py-2.5 text-blue-600 font-semibold">{u.api_requests}</td>
                                        <td className="px-4 py-2.5 text-purple-600 font-semibold">{u.total_tokens.toLocaleString()}</td>
                                        <td className="px-4 py-2.5 text-slate-500">{u.session_duration}</td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-6 text-slate-400 italic">Kayıt bulunamadı.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* TIMELINE */}
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="text-[13px] font-bold text-slate-800 flex items-center gap-2"><Clock size={14} className="text-[#b91d2c]" /> Canlı Akış</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {timeline.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-[11px] text-slate-400 italic">Hareket yok...</div>
                        ) : (
                            timeline.map((evt, idx) => {
                                const timeStr = evt.time.split('T')[1]?.substring(0, 5) || evt.time;
                                return (
                                    <div key={idx} className="flex gap-3 text-[11px]">
                                        <div className="w-[35px] shrink-0 text-slate-400 font-mono text-[10px] mt-0.5 text-right">{timeStr}</div>
                                        <div className="flex flex-col relative w-full pb-3 border-l-2 border-slate-100 pl-3">
                                            <div
                                                className="absolute -left-[5px] top-[2px] w-2 h-2 rounded-full border-2 border-white shadow-sm"
                                                style={{
                                                    backgroundColor: evt.color === 'red' ? '#f87171' : evt.color === 'emerald' ? '#34d399' : '#60a5fa',
                                                    outline: `2px solid ${evt.color === 'red' ? '#fca5a5' : evt.color === 'emerald' ? '#6ee7b7' : '#93c5fd'}`
                                                }}
                                            />
                                            <span className="font-semibold text-slate-800">{evt.user}</span>
                                            <span className="text-slate-500 leading-tight">
                                                {evt.action.replace("LOGIN_SUCCESS", "Sisteme girdi")
                                                    .replace("LOGIN_FAILED_", "Hatalı Giriş: ")
                                                    .replace("TAB_VIEW", "Sekme geçişi: ")
                                                    .replace("LOGOUT", "Sistemden çıkış yaptı")}
                                                {evt.detail && <span className="font-bold whitespace-nowrap ml-1 text-slate-600">[{evt.detail.substring(0, 20)}]</span>}
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

/* ─────────────────────────────────────────────────────────────
   KULLANICI DASHBOARD MODALI
───────────────────────────────────────────────────────────── */
function UserDashboardModal({ user, onClose }) {
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white py-12 px-20 border border-slate-200 rounded-xl shadow-2xl flex flex-col items-center justify-center gap-4">
                    <div className="w-8 h-8 rounded-full border-4 border-slate-100 border-t-[#b91d2c] animate-spin" />
                    <span className="text-slate-500 font-semibold text-[13px] animate-pulse">Sistem Verileri Derleniyor...</span>
                </div>
            </div>
        );
    }

    if (!dashboardData) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-[700px] max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white">
                    <div>
                        <h2 className="text-[16px] font-bold text-slate-800">{user.name} Detay Özeti</h2>
                        <p className="text-[12px] text-slate-500 font-mono mt-0.5">{user.email}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                    {/* Eğitimler */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                            <BookOpen size={18} className="text-[#b91d2c]" />
                            <h3 className="text-[14px] font-bold text-slate-800">Sistem İçi Eğitimler</h3>
                        </div>
                        <ul className="space-y-3 text-[12px] text-slate-600">
                            {dashboardData.egitimler.map((egitim, i) => (
                                <li key={i} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                    <span className="font-medium text-slate-700">• {egitim.isim}</span>
                                    <span className={`text-[10px] font-bold tracking-wide px-2.5 py-1 rounded border ${egitim.renk === 'emerald' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                        egitim.renk === 'amber' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                            'bg-slate-50 text-slate-500 border-slate-100'
                                        }`}>
                                        {egitim.durum}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Son İncelenen Belgeler */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                            <FileText size={18} className="text-blue-600" />
                            <h3 className="text-[14px] font-bold text-slate-800">Son İncelenen Belgeler</h3>
                        </div>
                        <ul className="space-y-3 text-[12px] text-slate-600">
                            {dashboardData.belgeler.map((belge, i) => (
                                <li key={i} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                    {belge.type === 'PDF' && <div className="w-8 h-8 rounded bg-red-50 text-red-500 flex items-center justify-center font-bold text-[10px]">PDF</div>}
                                    {belge.type === 'DOCX' && <div className="w-8 h-8 rounded bg-blue-50 text-blue-500 flex items-center justify-center font-bold text-[10px]">DOCX</div>}
                                    {belge.type === 'XLSX' && <div className="w-8 h-8 rounded bg-emerald-50 text-emerald-500 flex items-center justify-center font-bold text-[10px]">XLSX</div>}
                                    {belge.type === 'FILE' && <div className="w-8 h-8 rounded bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-[10px]">DOSYA</div>}
                                    <span className="font-medium text-slate-700">{belge.name}</span>
                                    <span className="text-[10px] text-slate-400 ml-auto whitespace-nowrap">{belge.date}</span>
                                </li>
                            ))}
                            {dashboardData.belgeler.length === 0 && (
                                <p className="text-[11px] text-slate-400 italic">Henüz incelenen belge yok.</p>
                            )}
                        </ul>
                    </div>

                    {/* Özel Talepler */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                            <MessageSquare size={18} className="text-purple-600" />
                            <h3 className="text-[14px] font-bold text-slate-800">Yönetimden Özel Talepler</h3>
                        </div>
                        <div className="space-y-3 text-[12px] text-slate-600">
                            {dashboardData.talepler.map((talep, i) => (
                                <div key={i} className="bg-slate-50/80 p-3 rounded-lg border border-slate-100 relative">
                                    <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${talep.renk === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    <p className="font-semibold text-slate-800 italic">"{talep.mesaj}"</p>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-2">
                                        <span className={`font-bold ${talep.renk === 'emerald' ? 'text-emerald-600' : 'text-amber-600'}`}>{talep.durum}</span>
                                        <span className="text-slate-300">•</span>
                                        <span>Tarih: {talep.tarih}</span>
                                    </div>
                                </div>
                            ))}
                            {dashboardData.talepler.length === 0 && (
                                <p className="text-[11px] text-slate-400 italic">Herhangi bir özel izin talebi bulunmuyor.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
