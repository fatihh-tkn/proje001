import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MessageSquare, Search, Trash2, Download, RefreshCw, AlertTriangle, CheckCircle2, Clock, Zap } from 'lucide-react';
import { SETTINGS_BASE, fetchWithTimeout, fmt, formatDate } from '../utils';

export const SessionManagerTab = React.memo(() => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deleting, setDeleting] = useState({});
    const [clearAll, setClearAll] = useState(false);
    const [confirmAll, setConfirmAll] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchWithTimeout(`${SETTINGS_BASE}/sessions?limit=200`);
            const data = await res.json();
            setSessions(data.sessions || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => {
        if (!search) return sessions;
        const q = search.toLowerCase();
        return sessions.filter(s =>
            (s.title || '').toLowerCase().includes(q) ||
            (s.lastMessage || '').toLowerCase().includes(q)
        );
    }, [sessions, search]);

    const deleteOne = async (id) => {
        setDeleting(prev => ({ ...prev, [id]: true }));
        try {
            await fetchWithTimeout(`${SETTINGS_BASE}/sessions/${id}`, { method: 'DELETE' });
            setSessions(prev => prev.filter(s => s.id !== id));
        } catch (e) {
            console.error(e);
        } finally {
            setDeleting(prev => ({ ...prev, [id]: false }));
        }
    };

    const deleteAll = async () => {
        setClearAll(true);
        try {
            await fetchWithTimeout(`${SETTINGS_BASE}/sessions`, { method: 'DELETE' });
            setSessions([]);
            setConfirmAll(false);
        } catch (e) {
            console.error(e);
        } finally {
            setClearAll(false);
        }
    };

    const exportOne = async (id, title) => {
        try {
            const res = await fetchWithTimeout(`${SETTINGS_BASE}/sessions/${id}/export`);
            const data = await res.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `session_${title?.replace(/\s+/g, '_') || id}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
        }
    };

    const totalTokens = sessions.reduce((s, x) => s + (x.totalTokens || 0), 0);

    return (
        <div className="flex flex-col w-full h-full bg-white overflow-hidden animate-in fade-in duration-300">

            {/* Toolbar */}
            <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-stone-200 bg-stone-50 flex-wrap">
                {/* Arama */}
                <div className="flex items-center bg-white border border-stone-200 rounded-md overflow-hidden focus-within:border-[#378ADD] focus-within:ring-1 focus-within:ring-[#378ADD] transition-all h-[36px] shadow-sm">
                    <Search size={14} className="ml-3 text-stone-400 shrink-0" />
                    <input
                        className="w-52 bg-transparent border-none outline-none text-[11px] font-bold text-stone-700 placeholder:text-stone-400/70 py-1.5 px-2"
                        placeholder="Başlık veya mesaj ara..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="ml-auto flex items-center gap-3">
                    {/* Özet */}
                    {!loading && (
                        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                            <span className="flex items-center gap-1"><MessageSquare size={11} /> {sessions.length} oturum</span>
                            <span className="text-stone-200">|</span>
                            <span className="flex items-center gap-1"><Zap size={11} /> {fmt(totalTokens)} token</span>
                        </div>
                    )}
                    <button onClick={load} className="p-1.5 rounded-md text-stone-400 hover:text-[#378ADD] hover:bg-stone-100 transition-colors">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {/* Tümünü Sil */}
                    {sessions.length > 0 && (
                        confirmAll ? (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-[#791F1F] uppercase tracking-widest">Emin misiniz?</span>
                                <button onClick={deleteAll} disabled={clearAll} className="px-3 py-1.5 bg-[#791F1F] text-white rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-[#5C1717] transition-colors">
                                    {clearAll ? 'Siliniyor...' : 'Evet, Tümünü Sil'}
                                </button>
                                <button onClick={() => setConfirmAll(false)} className="px-3 py-1.5 bg-stone-100 text-stone-600 rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-stone-200 transition-colors">İptal</button>
                            </div>
                        ) : (
                            <button onClick={() => setConfirmAll(true)} className="flex items-center gap-1.5 px-3 py-1.5 border border-[#FCEBEB] bg-[#FCEBEB] text-[#791F1F] rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-[#f5d0d0] transition-colors">
                                <Trash2 size={12} /> Tümünü Temizle
                            </button>
                        )
                    )}
                </div>
            </div>

            {/* Tablo başlığı */}
            <div className="grid grid-cols-[1fr_90px_90px_80px_64px] gap-0 px-6 py-2.5 border-b border-stone-200 bg-stone-50 shrink-0">
                {['Oturum', 'Tarih', 'Mesaj', 'Token', ''].map((h, i) => (
                    <span key={i} className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{h}</span>
                ))}
            </div>

            {/* Satırlar */}
            <div className="flex-1 overflow-y-auto minimal-scroll divide-y divide-stone-100/50">
                {loading ? (
                    <div className="flex items-center justify-center py-20 gap-3 text-stone-400">
                        <RefreshCw size={20} className="animate-spin" />
                        <span className="text-[11px] font-bold uppercase tracking-widest">Yükleniyor...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-stone-400">
                        <MessageSquare size={28} strokeWidth={1} />
                        <span className="text-[11px] font-bold uppercase tracking-widest">Oturum bulunamadı</span>
                    </div>
                ) : filtered.map(s => (
                    <div key={s.id} className="grid grid-cols-[1fr_90px_90px_80px_64px] gap-0 px-6 py-3.5 items-center hover:bg-stone-50/50 transition-colors group">
                        {/* Başlık + son mesaj */}
                        <div className="min-w-0 pr-4">
                            <p className="text-[11px] font-bold text-stone-700 truncate">{s.title || s.id}</p>
                            {s.lastMessage && (
                                <p className="text-[10px] text-stone-400 truncate mt-0.5">{s.lastMessage}</p>
                            )}
                        </div>
                        {/* Tarih */}
                        <span className="text-[10px] text-stone-500 font-medium truncate pr-2">
                            {s.createdAt ? formatDate(s.createdAt) : '—'}
                        </span>
                        {/* Mesaj sayısı */}
                        <span className="text-[11px] font-bold text-stone-600 flex items-center gap-1">
                            <MessageSquare size={11} className="text-stone-300" />
                            {s.messageCount || 0}
                        </span>
                        {/* Token */}
                        <span className="text-[11px] font-mono font-bold text-stone-500">
                            {fmt(s.totalTokens || 0)}
                        </span>
                        {/* Aksiyon butonları */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                            <button
                                onClick={() => exportOne(s.id, s.title)}
                                title="JSON olarak indir"
                                className="w-7 h-7 rounded-md bg-white border border-stone-200 flex items-center justify-center text-stone-400 hover:text-[#378ADD] hover:border-[#378ADD] transition-all shadow-sm"
                            >
                                <Download size={11} />
                            </button>
                            <button
                                onClick={() => deleteOne(s.id)}
                                disabled={deleting[s.id]}
                                title="Sil"
                                className="w-7 h-7 rounded-md bg-white border border-stone-200 flex items-center justify-center text-stone-400 hover:text-[#791F1F] hover:border-[#791F1F] transition-all shadow-sm"
                            >
                                <Trash2 size={11} className={deleting[s.id] ? 'animate-pulse' : ''} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});
