import React, { useState, useEffect } from 'react';
import { Users, Clock, Search, ChevronRight, Plus, UserPlus, LayoutDashboard, BookOpen, Zap, Shield } from 'lucide-react';
import { mutation } from '../../../api/client';
import InlineUserDashboard, { RestrictionsModal } from './InlineUserDashboard';
import SapEgitimAdminPaneli from './SapEgitimAdminPaneli';
import EgitimAcmaSlideOver from './EgitimAcmaSlideOver';

/* ─────────────────────────────────────────────────────────────
   ANA SARMALAYICI
───────────────────────────────────────────────────────────── */
export default function AuthViewer() {
    const [activeTab, setActiveTab] = useState('users');
    const [egitimFormOpen, setEgitimFormOpen] = useState(false);

    const tabs = [
        { id: 'users', label: 'Kullanıcılar', icon: Users },
        { id: 'egitim_yonetimi', label: 'Eğitim Yönetim Paneli', icon: BookOpen },
    ];

    return (
        <div className="flex flex-col h-full w-full bg-[#f8f9fa] font-sans">
            {/* HEADER */}
            <div className="flex-none px-6 py-4 flex items-center justify-between border-b border-slate-200/60 bg-white">
                <div>
                    <h2 className="text-[14px] font-semibold text-slate-800 flex items-center gap-2">
                        <Users className="text-[#b91d2c]" size={18} />
                        Eğitim Yöneticisi
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
    const [editingRoleId, setEditingRoleId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [restrictionsUser, setRestrictionsUser] = useState(null);

    useEffect(() => {
        fetch('/api/auth/users')
            .then(res => res.json())
            .then(data => setUsers(data))
            .catch(err => console.error('Kullanıcılar yüklenemedi', err));
    }, []);

    const updateRole = async (userId, newRole) => {
        const u = users.find(x => x.id === userId);
        try {
            await mutation('PUT', `/api/auth/users/${userId}/role`, { role: newRole }, {
                kind: 'update', subject: 'Kullanıcı rolü', detail: u?.name || u?.tam_ad,
            });
            setUsers(prev => prev.map(x => x.id === userId ? { ...x, role: newRole } : x));
        } catch { /* mutate toast attı */ }
        setEditingRoleId(null);
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
                                            ? 'bg-[#FEF2F2]/50 hover:bg-[#FEF2F2]/80'
                                            : isAdmin
                                                ? 'bg-[#FAEEDA]/40 hover:bg-[#FAEEDA]/70'
                                                : 'hover:bg-stone-50';

                                    const avatarBg = isPassive ? '#991B1B' : isAdmin ? '#A07A0B' : '#378ADD';

                                    return (
                                        <tr
                                            onClick={() => toggleExpand(user.id)}
                                            onContextMenu={(e) => {
                                                e.preventDefault();
                                                setRestrictionsUser({ id: user.id, name: user.name });
                                            }}
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
                                                        {isPassive && <span className="text-[9px] font-bold text-[#991B1B] uppercase tracking-widest">Pasif</span>}
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
                                                    : 'bg-[#FEF2F2] text-[#991B1B] border-[#991B1B]/20'
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
                                                userStatus={user.status}
                                                onStatusChange={(newStatus) =>
                                                    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u))
                                                }
                                                onDelete={() => {
                                                    setUsers(prev => prev.filter(u => u.id !== user.id));
                                                    setExpandedUserId(null);
                                                }}
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

            {restrictionsUser && (
                <RestrictionsModal
                    userId={restrictionsUser.id}
                    userName={restrictionsUser.name}
                    onClose={() => setRestrictionsUser(null)}
                />
            )}
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
                                    {belge.type === 'PDF' && <div className="w-8 h-8 rounded bg-[#FEF2F2] text-[#991B1B] flex items-center justify-center font-bold text-[10px]">PDF</div>}
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
