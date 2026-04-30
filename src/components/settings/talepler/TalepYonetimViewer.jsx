import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Inbox, Search, RefreshCw, Trash2, Check, X, Clock, AlertTriangle, MessageSquare } from 'lucide-react';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { useErrorStore } from '../../../store/errorStore';
import { mutate } from '../../../api/client';

const DURUMLAR = [
    { value: '', label: 'Tüm Durumlar' },
    { value: 'incelemede', label: 'İncelemede' },
    { value: 'onaylandi', label: 'Onaylandı' },
    { value: 'reddedildi', label: 'Reddedildi' },
    { value: 'tamamlandi', label: 'Tamamlandı' },
];

const KATEGORILER = [
    { value: '', label: 'Tüm Kategoriler' },
    { value: 'erisim', label: 'Erişim' },
    { value: 'kota', label: 'Kota' },
    { value: 'egitim', label: 'Eğitim' },
    { value: 'hata', label: 'Hata' },
    { value: 'diger', label: 'Diğer' },
];

const DURUM_RENK = {
    incelemede: { c: '#b45309', bg: '#fef3c7', border: '#fde68a' },
    onaylandi:  { c: '#047857', bg: '#d1fae5', border: '#a7f3d0' },
    reddedildi: { c: '#b91c1c', bg: '#fee2e2', border: '#fecaca' },
    tamamlandi: { c: '#0369a1', bg: '#e0f2fe', border: '#bae6fd' },
};

const ONCELIK_RENK = {
    dusuk: '#64748b',
    orta:  '#f59e0b',
    yuksek: '#ef4444',
};

export default function TalepYonetimViewer() {
    const currentUser = useWorkspaceStore(s => s.currentUser);
    const addToast = useErrorStore(s => s.addToast);

    const [talepler, setTalepler] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [filtreDurum, setFiltreDurum] = useState('');
    const [filtreKategori, setFiltreKategori] = useState('');
    const [arama, setArama] = useState('');

    const fetchTalepler = useCallback(async () => {
        if (!currentUser?.id) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ yonetici_kimlik: currentUser.id });
            if (filtreDurum) params.set('durum', filtreDurum);
            if (filtreKategori) params.set('kategori', filtreKategori);
            if (arama.trim()) params.set('arama', arama.trim());

            const res = await fetch(`/api/talepler?${params.toString()}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `HTTP ${res.status}`);
            }
            const data = await res.json();
            setTalepler(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('[TalepYonetim] yükleme hatası:', e);
            addToast({ type: 'error', message: e.message || 'Talepler alınamadı' });
        } finally {
            setLoading(false);
        }
    }, [currentUser?.id, filtreDurum, filtreKategori, arama, addToast]);

    useEffect(() => { fetchTalepler(); }, [fetchTalepler]);

    const selected = useMemo(
        () => talepler.find(t => t.id === selectedId) || null,
        [talepler, selectedId]
    );

    const istatistik = useMemo(() => {
        const sayac = { toplam: talepler.length, incelemede: 0, onaylandi: 0, reddedildi: 0, tamamlandi: 0 };
        talepler.forEach(t => { if (sayac[t.durum] !== undefined) sayac[t.durum] += 1; });
        return sayac;
    }, [talepler]);

    const handleDurumGuncelle = async (talep_id, payload) => {
        if (!currentUser?.id) return;
        const t = talepler.find(x => x.id === talep_id);
        try {
            const updated = await mutate.update(
                `/api/talepler/${talep_id}?yonetici_kimlik=${currentUser.id}`,
                payload,
                { subject: 'Talep', detail: t?.baslik }
            );
            setTalepler(prev => prev.map(x => x.id === talep_id ? updated : x));
        } catch { /* mutate toast attı */ }
    };

    const handleSil = async (talep_id) => {
        if (!currentUser?.id) return;
        if (!window.confirm('Bu talebi silmek istediğinize emin misiniz?')) return;
        const t = talepler.find(x => x.id === talep_id);
        try {
            await mutate.remove(
                `/api/talepler/${talep_id}?yonetici_kimlik=${currentUser.id}`,
                null,
                { subject: 'Talep', detail: t?.baslik }
            );
            setTalepler(prev => prev.filter(x => x.id !== talep_id));
            if (selectedId === talep_id) setSelectedId(null);
        } catch { /* mutate toast attı */ }
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#f8f9fa] font-sans">
            {/* HEADER */}
            <div className="flex-none px-6 py-4 flex items-center justify-between border-b border-slate-200/60 bg-white">
                <div>
                    <h2 className="text-[14px] font-semibold text-slate-800 flex items-center gap-2">
                        <Inbox className="text-emerald-600" size={18} />
                        Kullanıcı Talepleri
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-1">Kullanıcılardan gelen talepleri inceleyin, durumlarını güncelleyin.</p>
                </div>
                <button
                    onClick={fetchTalepler}
                    disabled={loading}
                    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-md text-[12px] font-medium transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                    Yenile
                </button>
            </div>

            {/* İstatistik kartları */}
            <div className="flex-none px-6 py-3 grid grid-cols-5 gap-3 bg-white border-b border-slate-200/60">
                <StatCard label="Toplam"       value={istatistik.toplam}       color="#0f172a" />
                <StatCard label="İncelemede"   value={istatistik.incelemede}   color="#b45309" />
                <StatCard label="Onaylandı"    value={istatistik.onaylandi}    color="#047857" />
                <StatCard label="Reddedildi"   value={istatistik.reddedildi}   color="#b91c1c" />
                <StatCard label="Tamamlandı"   value={istatistik.tamamlandi}   color="#0369a1" />
            </div>

            {/* Filtre çubuğu */}
            <div className="flex-none px-6 py-3 flex items-center gap-3 bg-white border-b border-slate-200/60">
                <div className="relative flex-1 max-w-md">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={arama}
                        onChange={(e) => setArama(e.target.value)}
                        placeholder="Başlık veya mesajda ara..."
                        className="w-full pl-9 pr-3 py-2 text-[12px] border border-slate-200 rounded-md focus:outline-none focus:border-emerald-400"
                    />
                </div>
                <select
                    value={filtreDurum}
                    onChange={(e) => setFiltreDurum(e.target.value)}
                    className="px-3 py-2 text-[12px] border border-slate-200 rounded-md focus:outline-none focus:border-emerald-400 bg-white"
                >
                    {DURUMLAR.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
                <select
                    value={filtreKategori}
                    onChange={(e) => setFiltreKategori(e.target.value)}
                    className="px-3 py-2 text-[12px] border border-slate-200 rounded-md focus:outline-none focus:border-emerald-400 bg-white"
                >
                    {KATEGORILER.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
            </div>

            {/* İçerik: liste + drawer */}
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 overflow-auto">
                    {loading && talepler.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-slate-500 text-[12px]">
                            Yükleniyor...
                        </div>
                    ) : talepler.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <Inbox size={36} className="mb-3" />
                            <div className="text-[13px]">Eşleşen talep bulunamadı.</div>
                        </div>
                    ) : (
                        <table className="w-full text-[12px]">
                            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                                <tr className="text-left text-slate-500">
                                    <th className="px-6 py-2.5 font-medium">Başlık</th>
                                    <th className="px-3 py-2.5 font-medium">Kullanıcı</th>
                                    <th className="px-3 py-2.5 font-medium">Kategori</th>
                                    <th className="px-3 py-2.5 font-medium">Öncelik</th>
                                    <th className="px-3 py-2.5 font-medium">Durum</th>
                                    <th className="px-3 py-2.5 font-medium">Tarih</th>
                                    <th className="px-3 py-2.5"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {talepler.map(t => {
                                    const palet = DURUM_RENK[t.durum] || { c: '#475569', bg: '#f1f5f9', border: '#e2e8f0' };
                                    const isActive = t.id === selectedId;
                                    return (
                                        <tr
                                            key={t.id}
                                            onClick={() => setSelectedId(t.id)}
                                            className={`border-b border-slate-100 cursor-pointer transition-colors ${
                                                isActive ? 'bg-emerald-50/60' : 'hover:bg-slate-50'
                                            }`}
                                        >
                                            <td className="px-6 py-2.5 font-medium text-slate-800 max-w-xs truncate">
                                                {t.baslik}
                                            </td>
                                            <td className="px-3 py-2.5 text-slate-600">{t.kullanici_adi || '—'}</td>
                                            <td className="px-3 py-2.5 text-slate-500 capitalize">{t.kategori}</td>
                                            <td className="px-3 py-2.5">
                                                <span style={{ color: ONCELIK_RENK[t.oncelik] || '#64748b' }} className="font-medium capitalize">
                                                    {t.oncelik}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <span
                                                    style={{ color: palet.c, background: palet.bg, borderColor: palet.border }}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded border"
                                                >
                                                    {t.durum_etiket}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-slate-500">{t.tarih}</td>
                                            <td className="px-3 py-2.5 text-right">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleSil(t.id); }}
                                                    className="text-slate-400 hover:text-rose-500 p-1 rounded transition-colors"
                                                    title="Sil"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {selected && (
                    <TalepDetayDrawer
                        talep={selected}
                        onClose={() => setSelectedId(null)}
                        onGuncelle={(payload) => handleDurumGuncelle(selected.id, payload)}
                        onSil={() => handleSil(selected.id)}
                    />
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, color }) {
    return (
        <div className="border border-slate-200 rounded-lg px-4 py-2.5 bg-white">
            <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{label}</div>
            <div className="text-[20px] font-bold mt-0.5" style={{ color }}>{value}</div>
        </div>
    );
}

function TalepDetayDrawer({ talep, onClose, onGuncelle, onSil }) {
    const [not, setNot] = useState(talep.yonetici_notu || '');
    const [kaydediliyor, setKaydediliyor] = useState(false);

    useEffect(() => {
        setNot(talep.yonetici_notu || '');
    }, [talep.id, talep.yonetici_notu]);

    const palet = DURUM_RENK[talep.durum] || { c: '#475569', bg: '#f1f5f9', border: '#e2e8f0' };

    const setDurum = async (yeniDurum) => {
        setKaydediliyor(true);
        await onGuncelle({ durum: yeniDurum, yonetici_notu: not });
        setKaydediliyor(false);
    };

    const notKaydet = async () => {
        setKaydediliyor(true);
        await onGuncelle({ yonetici_notu: not });
        setKaydediliyor(false);
    };

    return (
        <div className="w-[420px] flex-none border-l border-slate-200 bg-white overflow-auto flex flex-col">
            <div className="flex-none px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="text-[13px] font-semibold text-slate-800 flex items-center gap-2">
                    <MessageSquare size={14} className="text-emerald-600" />
                    Talep Detayı
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
                    <X size={14} />
                </button>
            </div>

            <div className="flex-1 px-5 py-4 flex flex-col gap-4">
                <div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">Başlık</div>
                    <div className="text-[13px] font-semibold text-slate-800">{talep.baslik}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <InfoBox label="Kullanıcı" value={talep.kullanici_adi || '—'} />
                    <InfoBox label="Tarih" value={talep.tarih} />
                    <InfoBox label="Kategori" value={talep.kategori} />
                    <InfoBox label="Öncelik" value={talep.oncelik} valueColor={ONCELIK_RENK[talep.oncelik]} />
                </div>

                <div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">Mesaj</div>
                    <div className="text-[12px] text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-md p-3 whitespace-pre-wrap">
                        {talep.mesaj}
                    </div>
                </div>

                <div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">Mevcut Durum</div>
                    <span
                        style={{ color: palet.c, background: palet.bg, borderColor: palet.border }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded border"
                    >
                        {talep.durum_etiket}
                    </span>
                </div>

                <div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">Yönetici Notu</div>
                    <textarea
                        value={not}
                        onChange={(e) => setNot(e.target.value)}
                        rows={4}
                        placeholder="Karar gerekçesi veya kullanıcıya iletilecek bilgi..."
                        className="w-full text-[12px] border border-slate-200 rounded-md p-2 focus:outline-none focus:border-emerald-400"
                    />
                    <button
                        onClick={notKaydet}
                        disabled={kaydediliyor}
                        className="mt-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-medium disabled:opacity-50"
                    >
                        Notu kaydet
                    </button>
                </div>
            </div>

            <div className="flex-none px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap gap-2">
                <ActionButton
                    icon={Clock}
                    label="İncelemeye Al"
                    onClick={() => setDurum('incelemede')}
                    disabled={kaydediliyor || talep.durum === 'incelemede'}
                    color="#b45309"
                />
                <ActionButton
                    icon={Check}
                    label="Onayla"
                    onClick={() => setDurum('onaylandi')}
                    disabled={kaydediliyor || talep.durum === 'onaylandi'}
                    color="#047857"
                />
                <ActionButton
                    icon={X}
                    label="Reddet"
                    onClick={() => setDurum('reddedildi')}
                    disabled={kaydediliyor || talep.durum === 'reddedildi'}
                    color="#b91c1c"
                />
                <ActionButton
                    icon={AlertTriangle}
                    label="Tamamlandı"
                    onClick={() => setDurum('tamamlandi')}
                    disabled={kaydediliyor || talep.durum === 'tamamlandi'}
                    color="#0369a1"
                />
                <button
                    onClick={onSil}
                    className="ml-auto text-[11px] text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
                >
                    <Trash2 size={12} /> Sil
                </button>
            </div>
        </div>
    );
}

function InfoBox({ label, value, valueColor }) {
    return (
        <div className="border border-slate-200 rounded-md px-3 py-2 bg-slate-50">
            <div className="text-[9px] uppercase tracking-wide text-slate-400 font-semibold">{label}</div>
            <div className="text-[12px] font-medium capitalize mt-0.5" style={{ color: valueColor || '#1e293b' }}>
                {value}
            </div>
        </div>
    );
}

function ActionButton({ icon: Icon, label, onClick, disabled, color }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{ color, borderColor: color }}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded border bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
            <Icon size={11} />
            {label}
        </button>
    );
}
