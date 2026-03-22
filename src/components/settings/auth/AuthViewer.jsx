import React, { useState } from 'react';
import { Users, Shield, Clock, Search, MoreVertical, Plus, UserPlus, FileText, Database, Activity, Check } from 'lucide-react';

export default function AuthViewer() {
    const [activeTab, setActiveTab] = useState('users');

    const tabs = [
        { id: 'users', label: 'Kullanıcılar', icon: Users },
        { id: 'roles', label: 'Roller ve Yetkiler', icon: Shield },
        { id: 'audit', label: 'Sistem Kayıtları', icon: Clock },
    ];

    return (
        <div className="flex flex-col h-full w-full bg-[#f8f9fa] font-sans">
            {/* ── HEADER ── */}
            <div className="flex-none px-6 py-4 flex items-center justify-between border-b border-slate-200/60 bg-white">
                <div>
                    <h2 className="text-[14px] font-semibold text-slate-800 flex items-center gap-2">
                        <Users className="text-[#b91d2c]" size={18} />
                        Kullanıcı ve Rol Yönetimi
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-1">Sisteme girenleri, model kullanım haklarını ve logları yönetin.</p>
                </div>
            </div>

            {/* ── TABS ── */}
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

            {/* ── CONTENT AREA ── */}
            <div className="flex-1 overflow-auto p-6">
                {activeTab === 'users' && <UsersTab />}
                {activeTab === 'roles' && <RolesTab />}
                {activeTab === 'audit' && <AuditTab />}
            </div>
        </div>
    );
}

function UsersTab() {
    const mockUsers = [
        { id: 1, name: 'Ahmet Yılmaz', email: 'ahmet@sirket.com', role: 'Sistem Yöneticisi', status: 'Aktif', lastLogin: '10 dk önce' },
        { id: 2, name: 'Ayşe Demir', email: 'ayse@sirket.com', role: 'Veri Analisti', status: 'Aktif', lastLogin: '2 saat önce' },
        { id: 3, name: 'Mehmet Kaya', email: 'mehmet@sirket.com', role: 'Standart Kullanıcı', status: 'Pasif', lastLogin: '3 gün önce' },
        { id: 4, name: 'Zeynep Çelik', email: 'zeynep@sirket.com', role: 'Pazarlama', status: 'Aktif', lastLogin: '1 gün önce' },
    ];

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                        type="text" 
                        placeholder="Kullanıcı ara..." 
                        className="pl-9 pr-4 py-2 border border-slate-200 rounded-md text-[12px] w-64 focus:outline-none focus:border-[#b91d2c] focus:ring-1 focus:ring-[#b91d2c]"
                    />
                </div>
                <button className="flex items-center gap-2 bg-[#b91d2c] hover:bg-[#961e27] text-white px-4 py-2 rounded-md text-[12px] font-medium transition-colors shadow-sm">
                    <UserPlus size={14} /> Yeni Kullanıcı
                </button>
            </div>

            <div className="bg-white border border-slate-200/60 rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200/60 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                            <th className="p-4">Kullanıcı Adı</th>
                            <th className="p-4">E-Posta</th>
                            <th className="p-4">Rol</th>
                            <th className="p-4">Durum</th>
                            <th className="p-4">Son Giriş</th>
                            <th className="p-4 text-center">İşlem</th>
                        </tr>
                    </thead>
                    <tbody className="text-[12px] text-slate-700 divide-y divide-slate-100">
                        {mockUsers.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="p-4 font-medium">{user.name}</td>
                                <td className="p-4 text-slate-500">{user.email}</td>
                                <td className="p-4">
                                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-[10px] font-medium border border-slate-200 cursor-default">
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-medium flex items-center gap-1.5 w-max ${user.status === 'Aktif' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'Aktif' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="p-4 text-slate-400 text-[11px]">{user.lastLogin}</td>
                                <td className="p-4 text-center">
                                    <button className="text-slate-400 hover:text-slate-700 transition-colors p-1" title="Düzenle">
                                        <MoreVertical size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function RolesTab() {
    const roles = [
        { name: 'Sistem Yöneticisi', desc: 'Tüm ayarlara, modellere ve kullanıcılara tam erişim.', count: 2, icon: Shield },
        { name: 'Veri Analisti', desc: 'Vektör veri tabanlarına, belgelere ve gelişmiş yapay zeka modellerine (GPT-4) erişim.', count: 8, icon: Database },
        { name: 'Standart Kullanıcı', desc: 'Sadece klasördeki standart dosyalara ve temel yapay zeka modellerine (Hızlı/Temel) erişim.', count: 45, icon: FileText }
    ];

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-4">
               <div>
                   <h3 className="text-sm font-semibold text-slate-800">Rol Yönetimi</h3>
                   <p className="text-[11px] text-slate-500">Kullanıcılara atanabilecek yetki şablonları oluşturun.</p>
               </div>
               <button className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-md text-[12px] font-medium transition-all shadow-sm">
                    <Plus size={14} /> Yeni Rol
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {roles.map((r, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#b91d2c] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-[#b91d2c] mb-4">
                            <r.icon size={18} />
                        </div>
                        <h4 className="font-semibold text-[13px] text-slate-800 mb-1">{r.name}</h4>
                        <p className="text-[11px] text-slate-500 mb-4 h-12 leading-relaxed">{r.desc}</p>
                        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                            <span className="text-[11px] font-medium text-slate-600 flex items-center gap-1.5"><Users size={12}/> {r.count} Kullanıcı</span>
                            <button className="text-[11px] text-[#b91d2c] font-medium hover:underline">Düzenle</button>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="bg-amber-50 border border-amber-200/50 rounded-lg p-4 mt-6 flex gap-3">
                <Activity size={18} className="text-amber-500 shrink-0"/>
                <div>
                   <h4 className="text-[12px] font-semibold text-amber-800">Model Erişim Kısıtlamaları (Yakında)</h4>
                   <p className="text-[11px] text-amber-600/80 mt-0.5">GPT-4 veya pahalı modellerin sadece yetkili Roller tarafından kullanılabilmesi için yeni kurallar tanımlayabileceksiniz.</p>
                </div>
            </div>
        </div>
    );
}

function AuditTab() {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white border border-slate-200 shadow-sm rounded-lg border-dashed">
            <Clock size={32} className="mb-3 opacity-50" />
            <h3 className="text-[13px] font-semibold text-slate-700 mb-1">Sistem Kayıtları boş</h3>
            <p className="text-[11px] text-slate-500 max-w-sm text-center">Tüm kullanıcıların sisteme giriş denemeleri, yetki değişiklikleri ve önemli işlemleri bu sayfada dökülecektir.</p>
        </div>
    );
}
