import React, { useState, useEffect } from 'react';
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { BookOpen, FileText, Award, Clock, Layers, MapPin, User, Calendar, Tag } from 'lucide-react';

/* ─── Renk Sabitleri ─────────────────────────────── */
const C = {
    blue: '#378ADD',
    purple: '#7F77DD',
    amber: '#EF9F27',
    green: '#1D9E75',
    darkGreen: '#3B6D11',
    red: '#791F1F',
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

/* ─── Ana Bileşen ────────────────────────────────── */
export default function InlineUserDashboard({ userId, userName, userStatus, onStatusChange, onDelete }) {
    const [data, setData] = useState(null);
    const [egitimData, setEgitimData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState(userStatus || 'Aktif');
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        if (!userId) return;
        setLoading(true);

        const dashPromise = fetch(`/api/auth/users/${userId}/dashboard`).then(r => r.json()).catch(() => null);
        const egitimPromise = fetch(`http://127.0.0.1:8000/api/egitim/dashboard/${userId}`).then(r => r.json()).catch(() => null);

        Promise.all([dashPromise, egitimPromise]).then(([dash, egitim]) => {
            setData(dash);
            setEgitimData(egitim);
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
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${b.type === 'PDF' ? 'bg-[#FCEBEB] text-[#791F1F]' :
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
                                    onClick={() => {
                                        const newStatus = status === 'Aktif' ? 'Askıya Alındı' : 'Aktif';
                                        fetch(`/api/auth/users/${userId}/status`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ status: newStatus })
                                        }).then(res => {
                                            if (res.ok) { setStatus(newStatus); onStatusChange?.(newStatus); }
                                        });
                                    }}
                                    className={`text-[11px] font-medium px-3 py-1.5 rounded-md border transition-colors ${status === 'Aktif'
                                        ? 'bg-[#FAEEDA] text-[#854F0B] border-[#F2DFBA] hover:bg-[#F2DFBA]'
                                        : 'bg-[#EAF3DE] text-[#3B6D11] border-[#CFE2B6] hover:bg-[#CFE2B6]'}`}
                                >
                                    {status === 'Aktif' ? 'Hesabı Askıya Al' : 'Hesabı Aktifleştir'}
                                </button>
                                {!confirming ? (
                                    <button
                                        onClick={() => setConfirming(true)}
                                        className="text-[11px] font-medium px-3 py-1.5 rounded-md border bg-[#FCEBEB] text-[#791F1F] border-[#F2D7D7] hover:bg-[#F2D7D7] transition-colors"
                                    >
                                        Kullanıcıyı Sil
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-1.5 bg-[#FCEBEB] border border-[#F2D7D7] rounded-md px-3 py-1.5">
                                        <span className="text-[11px] text-[#791F1F] font-medium">Emin misiniz?</span>
                                        <button
                                            onClick={() => {
                                                fetch(`/api/auth/users/${userId}`, { method: 'DELETE' })
                                                    .then(res => { if (res.ok) onDelete?.(); });
                                            }}
                                            className="text-[11px] font-bold text-white bg-[#791F1F] px-2 py-0.5 rounded hover:bg-[#5a1717] transition-colors"
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
        </div>
    );
}
