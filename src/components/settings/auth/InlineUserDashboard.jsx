import React, { useState, useEffect } from 'react';
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { BookOpen, FileText, Award, Clock, Layers, MapPin, User, Calendar, Tag, Lock, X, Check, Search, ShieldAlert, AlertTriangle } from 'lucide-react';
import ReactDOM from 'react-dom';
import { mutation, mutate } from '../../../api/client';

/* ─── Renk Sabitleri ─────────────────────────────── */
const C = {
    blue: '#378ADD',
    purple: '#7F77DD',
    amber: '#EF9F27',
    green: '#1D9E75',
    darkGreen: '#3B6D11',
    red: '#991B1B',
};

/* ─── Yardımcı: token'ı okunabilir kısa forma çevir ─ */
function fmtToken(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return String(n);
}

/* ─── Stat mini-kart ─────────────────────────────── */
function StatKart({ label, value, sub, color = C.blue }) {
    return (
        <div className="bg-white border border-stone-200 rounded-lg p-3 shadow-sm flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">{label}</div>
            <div className="text-[18px] font-black leading-none" style={{ color }}>{value}</div>
            {sub && <div className="text-[10px] text-stone-400 mt-1">{sub}</div>}
        </div>
    );
}

/* ─── Recharts Tooltip ───────────────────────────── */
const StoneTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
        <div className="bg-white border border-stone-200 rounded-md shadow-lg px-3 py-2 text-[10px] font-medium text-stone-700">
            {label && <p className="font-bold mb-1 text-stone-500">{label}</p>}
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
            ))}
        </div>
    );
};

export const RestrictionsModal = ({ userId, userName, onClose }) => {
    const [files, setFiles] = useState(null);
    const [search, setSearch] = useState('');
    const [updating, setUpdating] = useState(null); // id of file being updated

    useEffect(() => {
        fetch(`/api/auth/users/${userId}/file-access`)
            .then(r => r.json())
            .then(data => setFiles(data))
            .catch(() => setFiles([]));
    }, [userId]);

    const toggleAccess = async (fileId, currentAccess) => {
        setUpdating(fileId);
        const newAccess = !currentAccess;
        const f = files.find(x => x.id === fileId);
        try {
            await mutation('PUT', `/api/auth/users/${userId}/file-access`,
                { file_id: fileId, has_access: newAccess },
                {
                    kind: 'toggle',
                    subject: 'Dosya erişimi',
                    detail: f?.filename,
                    customSuccess: `Dosya erişimi ${newAccess ? 'açıldı' : 'kapatıldı'}: ${f?.filename || ''}`,
                }
            );
            setFiles(prev => prev.map(x => x.id === fileId ? { ...x, has_access: newAccess } : x));
        } catch { /* mutate toast attı */ }
        setUpdating(null);
    };

    const filtered = (files || []).filter(f => f.filename.toLowerCase().includes(search.toLowerCase()));

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9500] flex items-center justify-center bg-stone-900/40 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-[480px] flex flex-col overflow-hidden max-h-[85vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-5 py-4 border-b border-stone-100 flex items-start justify-between bg-stone-50/50">
                    <div>
                        <h3 className="text-[14px] font-bold text-stone-900 flex items-center gap-2">
                            <Lock size={16} className="text-red-500" /> {userName} - Dosya Kısıtlamaları
                        </h3>
                        <p className="text-[11px] text-stone-500 mt-1">Kullanıcının sistemdeki dosyalara erişimini yönetin.</p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-stone-200 rounded-md text-stone-400 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Search */}
                <div className="px-5 py-3 border-b border-stone-100">
                    <div className="flex items-center gap-2 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus-within:bg-white focus-within:border-stone-300 transition-colors">
                        <Search size={14} className="text-stone-400" />
                        <input
                            type="text"
                            placeholder="Dosya ara..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoComplete="off"
                            className="flex-1 bg-transparent text-[12px] outline-none text-stone-700"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    {!files ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-2">
                            <div className="w-5 h-5 rounded-full border-2 border-stone-300 border-t-red-500 animate-spin" />
                            <span className="text-[11px] text-stone-400">Dosyalar yükleniyor...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-10 text-[11px] text-stone-400 italic">Eşleşen dosya bulunamadı.</div>
                    ) : filtered.map(f => {
                        const isLocked = !f.is_vectorized;
                        return (
                            <div key={f.id} className={`flex items-center justify-between p-3 rounded-xl border ${isLocked ? 'bg-stone-50 border-stone-100 opacity-70' : f.has_access ? 'bg-white border-stone-200' : 'bg-red-50/30 border-red-100'}`}>
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isLocked ? 'bg-stone-200 text-stone-500' : f.has_access ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                                        {isLocked ? <Lock size={14} /> : <FileText size={14} />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[12px] font-semibold text-stone-800 truncate" title={f.filename}>{f.filename}</p>
                                        <p className="text-[10px] text-stone-400 mt-0.5">
                                            {isLocked ? (
                                                <span className="text-stone-500 font-medium flex items-center gap-1"><ShieldAlert size={10} /> Yapay Zekada Aktif Değil (Kilitli)</span>
                                            ) : f.has_access ? (
                                                <span className="text-emerald-600 font-medium flex items-center gap-1"><Check size={10} /> Erişimi Açık</span>
                                            ) : (
                                                <span className="text-red-500 font-medium flex items-center gap-1"><X size={10} /> Erişimi Kapalı</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="shrink-0 pl-3">
                                    {isLocked ? (
                                        <button disabled className="px-3 py-1.5 text-[10px] font-bold text-stone-400 bg-stone-100 rounded-md cursor-not-allowed">
                                            Kilitli
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => toggleAccess(f.id, f.has_access)}
                                            disabled={updating === f.id}
                                            className={`w-20 py-1.5 text-[10px] font-bold rounded-md transition-colors ${updating === f.id ? 'opacity-50 cursor-not-allowed' : ''} ${f.has_access ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'}`}
                                        >
                                            {updating === f.id ? '...' : f.has_access ? 'Erişimi Kapat' : 'Erişimi Aç'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>,
        document.body
    );
};

/* ─── Ana Bileşen ────────────────────────────────── */
export default function InlineUserDashboard({ userId, userName, userStatus, onStatusChange, onDelete }) {
    const [data, setData] = useState(null);
    const [egitimData, setEgitimData] = useState(null);
    const [errorRecords, setErrorRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState(userStatus || 'Aktif');
    const [confirming, setConfirming] = useState(false);
    const [restrictionsOpen, setRestrictionsOpen] = useState(false);

    useEffect(() => {
        if (!userId) return;
        setLoading(true);

        const dashPromise = fetch(`/api/auth/users/${userId}/dashboard`).then(r => r.json()).catch(() => null);
        const egitimPromise = fetch(`http://127.0.0.1:8000/api/egitim/dashboard/${userId}`).then(r => r.json()).catch(() => null);
        const errorsPromise = fetch(`/api/errors/user/${userId}`).then(r => r.json()).catch(() => ({ records: [] }));

        Promise.all([dashPromise, egitimPromise, errorsPromise]).then(([dash, egitim, errs]) => {
            setData(dash);
            setEgitimData(egitim);
            setErrorRecords(errs?.records || []);
            setLoading(false);
        });
    }, [userId]);

    /* Eğitim istatistikleri */
    const stats = egitimData ? {
        atanan: egitimData.ic_atamalar?.length ?? 0,
        disModul: egitimData.dis_profil?.moduller?.length ?? 0,
        egitimSaat: (egitimData.ic_atamalar?.length ?? 0) * 12 + (egitimData.dis_profil?.dis_egitimler_sayisi ?? 0) * 8,
        sertifika: (egitimData.dis_profil?.dis_sertifika_sayisi ?? 0) + 3,
    } : { atanan: 0, disModul: 0, egitimSaat: 0, sertifika: 0 };

    /* Stat olmayan ama görsel olan radar & bar verisi — gerçek veri yoksa boş kalır */
    const radarData = egitimData?.yetkinlik_radar ?? [];
    const usageData = egitimData?.modul_kullanim ?? [];

    /* Aktif eğitimler */
    const aktifEgitimler = data?.egitimler ?? [];
    const sonBelgeler = data?.belgeler ?? [];

    return (
        <div className="animate-in slide-in-from-top-1 duration-300 bg-stone-50 border-t-2 border-[#378ADD]">
            <div className="max-w-6xl mx-auto p-4 pt-5">

                {loading ? (
                    <div className="flex items-center justify-center h-32 gap-3">
                        <div className="w-5 h-5 rounded-full border-2 border-stone-200 border-t-[#378ADD] animate-spin" />
                        <span className="text-[12px] font-bold text-stone-400">Veriler yükleniyor...</span>
                    </div>
                ) : (
                    <>
                        {/* ── Stat Kartları ── */}
                        <div className="flex gap-3 mb-5">
                            <StatKart label="Atanan Eğitim" value={stats.atanan} sub="İç eğitimler" color={C.blue} />
                            <StatKart label="Dış Modül" value={stats.disModul} sub="Kayıtlı uzmanlık" color={C.purple} />
                            <StatKart label="Toplam Saat" value={stats.egitimSaat} sub={`İç + Dış`} color={C.amber} />
                            <StatKart label="Sertifika" value={stats.sertifika} sub="İç + Dış" color={C.darkGreen} />
                        </div>

                        {/* ── Grafik + Liste Alanı ── */}
                        <div className="grid grid-cols-12 gap-4 mb-4">

                            {/* Radar Chart */}
                            <div className="col-span-4 bg-white border border-stone-200 rounded-lg shadow-sm p-4">
                                <div className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-3 flex items-center gap-2">
                                    <Layers size={12} className="text-[#378ADD]" /> Yetkinlik Profili
                                </div>
                                {radarData.length > 0 ? (
                                    <div style={{ height: 160 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                                <PolarGrid stroke="#e7e5e4" />
                                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#78716c', fontSize: 9 }} />
                                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                                <Tooltip content={<StoneTooltip />} />
                                                <Radar name="Mevcut" dataKey="A" stroke={C.blue} fill={C.blue} fillOpacity={0.25} />
                                                <Radar name="Hedef" dataKey="B" stroke={C.purple} fill={C.purple} fillOpacity={0.1} strokeDasharray="3 3" />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="h-40 flex items-center justify-center text-[11px] text-stone-400 italic">
                                        Yetkinlik verisi yok
                                    </div>
                                )}
                            </div>

                            {/* Bar Chart */}
                            <div className="col-span-4 bg-white border border-stone-200 rounded-lg shadow-sm p-4">
                                <div className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-3 flex items-center gap-2">
                                    <Award size={12} className="text-[#EF9F27]" /> Modül Kullanım (Ay)
                                </div>
                                {usageData.length > 0 ? (
                                    <div style={{ height: 160 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart layout="vertical" data={usageData} margin={{ top: 0, right: 10, left: -25, bottom: 0 }}>
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="mod" type="category" axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 9 }} />
                                                <Tooltip content={<StoneTooltip />} />
                                                <Bar dataKey="month" name="Ay" radius={[0, 4, 4, 0]} barSize={11} fill={C.blue} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="h-40 flex items-center justify-center text-[11px] text-stone-400 italic">
                                        Kullanım verisi yok
                                    </div>
                                )}
                            </div>

                            {/* Aktif Eğitimler + Son Belgeler */}
                            <div className="col-span-4 flex flex-col gap-3">
                                {/* Aktif Eğitimler */}
                                <div className="bg-white border border-stone-200 rounded-lg shadow-sm p-4 flex-1">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-2 flex items-center gap-2">
                                        <BookOpen size={12} className="text-[#378ADD]" /> Eğitimler
                                    </div>
                                    <div className="space-y-2">
                                        {aktifEgitimler.length === 0 && (
                                            <p className="text-[11px] text-stone-400 italic">Atanmış eğitim yok</p>
                                        )}
                                        {aktifEgitimler.slice(0, 3).map((e, i) => (
                                            <div key={i} className="flex items-center justify-between gap-2">
                                                <span className="text-[11px] font-medium text-stone-700 truncate flex-1" title={e.isim}>{e.isim}</span>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 border ${e.renk === 'emerald'
                                                    ? 'bg-[#EAF3DE] text-[#3B6D11] border-[#3B6D11]/20'
                                                    : 'bg-[#FAEEDA] text-[#854F0B] border-[#854F0B]/20'
                                                    }`}>
                                                    {e.durum}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Son Belgeler */}
                                <div className="bg-white border border-stone-200 rounded-lg shadow-sm p-4 flex-1">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-2 flex items-center gap-2">
                                        <FileText size={12} className="text-[#7F77DD]" /> Son Belgeler
                                    </div>
                                    <div className="space-y-2">
                                        {sonBelgeler.length === 0 && (
                                            <p className="text-[11px] text-stone-400 italic">Belge bulunamadı</p>
                                        )}
                                        {sonBelgeler.slice(0, 3).map((b, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${b.type === 'PDF' ? 'bg-[#FEF2F2] text-[#991B1B]' :
                                                    b.type === 'XLSX' ? 'bg-[#EAF3DE] text-[#3B6D11]' :
                                                        b.type === 'DOCX' ? 'bg-[#E6F1FB] text-[#0C447C]' :
                                                            'bg-stone-100 text-stone-600'
                                                    }`}>{b.type}</span>
                                                <span className="text-[11px] font-medium text-stone-700 truncate flex-1" title={b.name}>{b.name}</span>
                                                <span className="text-[10px] text-stone-400 shrink-0">{b.date}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Çözdüğüm Hatalar ── */}
                        <div className="bg-white border border-stone-200 rounded-lg shadow-sm p-4 mb-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-3 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <AlertTriangle size={12} className="text-[#A01B1B]" /> Çözdüğüm Hatalar
                                </span>
                                <span className="text-[10px] text-stone-400 normal-case font-mono tracking-normal">{errorRecords.length} kayıt</span>
                            </div>
                            {errorRecords.length === 0 ? (
                                <p className="text-[11px] text-stone-400 italic">Henüz kaydedilen hata çözümü yok.</p>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    {errorRecords.slice(0, 6).map((r) => (
                                        <div key={r.kimlik} className="flex items-start gap-2 bg-stone-50 border border-stone-200 rounded-md px-2.5 py-2">
                                            <AlertTriangle size={11} className="text-[#A01B1B] mt-0.5 shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    {r.hata_kodu && (
                                                        <span className="font-mono text-[9px] text-slate-700 bg-stone-200 px-1 py-0.5 rounded">{r.hata_kodu}</span>
                                                    )}
                                                    {r.modul && (
                                                        <span className="font-mono text-[9px] text-blue-700 bg-blue-50 border border-blue-100 px-1 py-0.5 rounded">{r.modul}</span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] font-medium text-stone-700 truncate" title={r.baslik}>{r.baslik}</p>
                                                {r.ozet && (
                                                    <p className="text-[10px] text-stone-500 line-clamp-2 mt-0.5">{r.ozet}</p>
                                                )}
                                                <span className="text-[9px] text-stone-400">{(r.kayit_tarihi || '').slice(0, 10)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ── Yönetici Talepler ve Kişisel Profil ── */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Talepler */}
                            <div className="bg-white border border-stone-200 rounded-lg shadow-sm p-4 h-full">
                                <div className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-3 flex items-center gap-2">
                                    <Clock size={12} className="text-[#D85A30]" /> Yönetim Talepleri
                                </div>
                                <div className="space-y-3">
                                    {(data?.talepler || []).length === 0 ? (
                                        <p className="text-[11px] text-stone-400 italic">Aktif talep yok</p>
                                    ) : data.talepler.map((t, i) => (
                                        <div key={i} className="flex items-start gap-2 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                                            <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${t.renk === 'emerald' ? 'bg-[#3B6D11]' : 'bg-[#EF9F27]'}`} />
                                            <div>
                                                <p className="text-[11px] font-medium text-stone-700 italic">"{t.mesaj}"</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-[9px] font-bold ${t.renk === 'emerald' ? 'text-[#3B6D11]' : 'text-[#854F0B]'}`}>{t.durum}</span>
                                                    <span className="text-stone-300 text-[9px]">•</span>
                                                    <span className="text-[9px] text-stone-400">{t.tarih}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Kişisel Profil */}
                            <div className="bg-white border border-stone-200 rounded-lg shadow-sm p-4 h-full">
                                <div className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-3 flex items-center gap-2">
                                    <User size={12} className="text-[#378ADD]" /> Kişisel Profil
                                </div>
                                <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-bold text-stone-400 uppercase flex items-center gap-1"><Calendar size={10} /> Doğum Tarihi</p>
                                        <p className="text-[11px] font-bold text-stone-700">{data?.birthDate || 'Belirtilmemiş'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-bold text-stone-400 uppercase flex items-center gap-1"><User size={10} /> Cinsiyet</p>
                                        <p className="text-[11px] font-bold text-stone-700">{data?.gender || 'Belirtilmemiş'}</p>
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <p className="text-[9px] font-bold text-stone-400 uppercase flex items-center gap-1"><MapPin size={10} /> Lokasyon</p>
                                        <p className="text-[11px] font-bold text-stone-700">{data?.location || 'Belirtilmemiş'}</p>
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <p className="text-[9px] font-bold text-stone-400 uppercase flex items-center gap-1"><Tag size={10} /> İlgi Alanları</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {(data?.interests || []).length === 0 ? (
                                                <span className="text-[11px] text-stone-400 italic">Seçim yapılmadı</span>
                                            ) : data.interests.map((tag, idx) => (
                                                <span key={idx} className="bg-stone-50 border border-stone-200 text-stone-600 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── İşlem Butonları ── */}
                        <div className="flex items-center justify-between pt-4 border-t border-stone-200 mt-2">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={async () => {
                                        const newStatus = status === 'Aktif' ? 'Askıya Alındı' : 'Aktif';
                                        try {
                                            await mutation('PUT', `/api/auth/users/${userId}/status`,
                                                { status: newStatus },
                                                {
                                                    kind: 'update',
                                                    subject: 'Hesap durumu',
                                                    customSuccess: `Hesap ${newStatus === 'Aktif' ? 'aktifleştirildi' : 'askıya alındı'}.`,
                                                }
                                            );
                                            setStatus(newStatus);
                                            onStatusChange?.(newStatus);
                                        } catch { /* toast atıldı */ }
                                    }}
                                    className={`text-[11px] font-medium px-3 py-1.5 rounded-md border transition-colors ${status === 'Aktif'
                                        ? 'bg-[#FAEEDA] text-[#854F0B] border-[#F2DFBA] hover:bg-[#F2DFBA]'
                                        : 'bg-[#EAF3DE] text-[#3B6D11] border-[#CFE2B6] hover:bg-[#CFE2B6]'}`}
                                >
                                    {status === 'Aktif' ? 'Hesabı Askıya Al' : 'Hesabı Aktifleştir'}
                                </button>
                                <button
                                    onClick={() => setRestrictionsOpen(true)}
                                    className="text-[11px] font-medium px-3 py-1.5 rounded-md border bg-white border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-1.5"
                                >
                                    <Lock size={12} className="text-red-500" /> Kısıtlamalar
                                </button>
                                {!confirming ? (
                                    <button
                                        onClick={() => setConfirming(true)}
                                        className="text-[11px] font-medium px-3 py-1.5 rounded-md border bg-[#FEF2F2] text-[#991B1B] border-[#F2D7D7] hover:bg-[#F2D7D7] transition-colors"
                                    >
                                        Kullanıcıyı Sil
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-1.5 bg-[#FEF2F2] border border-[#F2D7D7] rounded-md px-3 py-1.5">
                                        <span className="text-[11px] text-[#991B1B] font-medium">Emin misiniz?</span>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await mutate.remove(`/api/auth/users/${userId}`, null, {
                                                        subject: 'Kullanıcı',
                                                    });
                                                    onDelete?.();
                                                } catch { /* toast atıldı */ }
                                            }}
                                            className="text-[11px] font-bold text-white bg-[#991B1B] px-2 py-0.5 rounded hover:bg-[#5a1717] transition-colors"
                                        >Evet, Sil</button>
                                        <button
                                            onClick={() => setConfirming(false)}
                                            className="text-[11px] text-stone-500 hover:text-stone-800 transition-colors ml-1"
                                        >İptal</button>
                                    </div>
                                )}
                            </div>
                            <span className="text-[10px] text-stone-400 font-mono">{userId}</span>
                        </div>
                    </>
                )}
            </div>
            
            {restrictionsOpen && (
                <RestrictionsModal
                    userId={userId}
                    userName={userName}
                    onClose={() => setRestrictionsOpen(false)}
                />
            )}
        </div>
    );
}
