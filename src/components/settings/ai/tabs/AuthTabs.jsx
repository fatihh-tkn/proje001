import React from 'react';
import { Users, Shield, Clock, Search, MoreVertical, Plus, UserPlus, FileText, Database, Activity } from 'lucide-react';

export function UsersTab() {
    const mockUsers = [
        { id: 1, name: 'Ahmet Yılmaz', email: 'ahmet@sirket.com', role: 'Sistem Yöneticisi', status: 'Aktif', lastLogin: '10 dk önce' },
        { id: 2, name: 'Ayşe Demir', email: 'ayse@sirket.com', role: 'Veri Analisti', status: 'Aktif', lastLogin: '2 saat önce' },
        { id: 3, name: 'Mehmet Kaya', email: 'mehmet@sirket.com', role: 'Standart Kullanıcı', status: 'Pasif', lastLogin: '3 gün önce' },
        { id: 4, name: 'Zeynep Çelik', email: 'zeynep@sirket.com', role: 'Pazarlama', status: 'Aktif', lastLogin: '1 gün önce' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-4">
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={16} strokeWidth={2.5} />
                    <input
                        type="text"
                        placeholder="Kullanıcı ara..."
                        className="pl-10 pr-4 py-2.5 bg-white border border-stone-200 shadow-sm rounded-md text-[12px] font-bold text-stone-700 placeholder:text-stone-400 w-64 focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/30 transition-all font-mono tracking-tight" autoComplete="off" />
                </div>
                <button className="flex items-center gap-2 bg-[#378ADD] hover:bg-[#2868A8] text-white px-5 py-2.5 rounded-md text-[11px] font-bold tracking-widest transition-colors shadow-sm">
                    <UserPlus size={16} strokeWidth={2.5} /> YENİ KULLANICI
                </button>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-stone-50 border-b border-stone-100 text-[10px] uppercase tracking-widest text-stone-500 font-bold">
                            <th className="p-4 px-5">Kullanıcı Adı</th>
                            <th className="p-4 px-5">E-Posta</th>
                            <th className="p-4 px-5">Rol</th>
                            <th className="p-4 px-5">Durum</th>
                            <th className="p-4 px-5">Son Giriş</th>
                            <th className="p-4 px-5 text-center">İşlem</th>
                        </tr>
                    </thead>
                    <tbody className="text-[12px] font-bold text-stone-700 divide-y divide-stone-100">
                        {mockUsers.map(user => (
                            <tr key={user.id} className="hover:bg-stone-50/80 transition-colors group">
                                <td className="p-4 px-5">{user.name}</td>
                                <td className="p-4 px-5 text-stone-500 font-mono tracking-tight">{user.email}</td>
                                <td className="p-4 px-5">
                                    <span className="bg-stone-100 text-stone-600 px-3 py-1.5 rounded-md text-[10px] uppercase tracking-widest border border-stone-200 cursor-default">
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-4 px-5">
                                    <span className={`px-2.5 py-1.5 rounded-md text-[9px] uppercase tracking-widest flex items-center gap-1.5 w-max ${user.status === 'Aktif' ? 'bg-[#EAF3DE] text-[#3B6D11] border border-[#EAF3DE]/60' : 'bg-[#FEF2F2] text-[#991B1B] border border-[#FEF2F2]/60'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'Aktif' ? 'bg-[#3B6D11]' : 'bg-[#991B1B]'}`}></div>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="p-4 px-5 text-stone-400 font-mono tracking-widest text-[10px] uppercase">{user.lastLogin}</td>
                                <td className="p-4 px-5 text-center">
                                    <button className="text-stone-400 hover:text-[#378ADD] hover:bg-[#378ADD]/10 rounded-md transition-colors p-1.5" title="Düzenle">
                                        <MoreVertical size={16} />
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

export function RolesTab() {
    const roles = [
        { name: 'Sistem Yöneticisi', desc: 'Tüm ayarlara, modellere ve kullanıcılara tam erişim.', count: 2, icon: Shield },
        { name: 'Veri Analisti', desc: 'Vektör veri tabanlarına, belgelere ve gelişmiş yapay zeka modellerine (GPT-4) erişim.', count: 8, icon: Database },
        { name: 'Standart Kullanıcı', desc: 'Sadece klasördeki standart dosyalara ve temel yapay zeka modellerine (Hızlı/Temel) erişim.', count: 45, icon: FileText }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-end mb-6 pb-4 border-b border-stone-200 border-dashed">
                <div>
                    <h3 className="text-[18px] font-black tracking-tight text-stone-700">Rol Yönetimi</h3>
                    <p className="text-[12px] font-bold text-stone-500 tracking-tight mt-1">Kullanıcılara atanabilecek yetki şablonları oluşturun.</p>
                </div>
                <button className="flex items-center gap-2 bg-white border border-stone-200 shadow-sm hover:border-stone-300 hover:bg-stone-50 text-stone-700 px-5 py-2.5 rounded-md text-[11px] uppercase tracking-widest font-bold transition-all">
                    <Plus size={16} strokeWidth={2.5} /> YENİ ROL
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {roles.map((r, i) => (
                    <div key={i} className="bg-white border border-stone-200 rounded-xl p-6 py-7 shadow-sm hover:border-[#378ADD]/30 hover:shadow-md transition-all relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#378ADD] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="w-12 h-12 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-center text-[#378ADD] mb-5 group-hover:bg-[#378ADD]/5 transition-colors">
                            <r.icon size={22} strokeWidth={2} />
                        </div>
                        <h4 className="font-black text-[15px] text-stone-700 tracking-tight mb-2">{r.name}</h4>
                        <p className="text-[11px] font-bold text-stone-500 mb-6 h-12 leading-relaxed tracking-tight">{r.desc}</p>
                        <div className="flex items-center justify-between border-t border-stone-100 pt-4 mt-auto">
                            <span className="text-[10px] uppercase font-bold tracking-widest text-stone-500 flex items-center gap-1.5"><Users size={14} /> {r.count} KULLANICI</span>
                            <button className="text-[11px] text-[#378ADD] font-bold uppercase tracking-widest hover:underline">DÜZENLE</button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-[#EBFAFA] border border-[#EBFAFA]/80 rounded-xl p-5 mt-8 flex gap-4 shadow-sm items-start">
                <div className="w-8 h-8 rounded-md bg-white border border-[#1D9E75]/20 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Activity size={16} className="text-[#1D9E75]" strokeWidth={2.5} />
                </div>
                <div>
                    <h4 className="text-[13px] font-black text-[#156D51] tracking-tight">Model Erişim Kısıtlamaları</h4>
                    <p className="text-[12px] font-bold text-[#1D9E75] tracking-tight mt-1 leading-relaxed">GPT-4 veya pahalı modellerin sadece yetkili Roller tarafından kullanılabilmesi için yeni kurallar tanımlayın.</p>
                </div>
            </div>
        </div>
    );
}

export function AuditTab() {
    return (
        <div className="flex flex-col items-center justify-center h-80 bg-stone-50/50 border border-stone-200 shadow-sm rounded-xl border-dashed">
            <div className="w-12 h-12 rounded-full bg-white border border-stone-200 flex items-center justify-center mb-4 shadow-sm">
                <Clock size={24} className="text-stone-400" strokeWidth={2} />
            </div>
            <h3 className="text-[16px] font-black tracking-tight text-stone-700 mb-2">Sistem Kayıtları Boş</h3>
            <p className="text-[12px] font-bold text-stone-500 max-w-sm text-center tracking-tight leading-relaxed">Tüm kullanıcıların sisteme giriş denemeleri, yetki değişiklikleri ve önemli işlemleri burada listelenecektir.</p>
        </div>
    );
}
