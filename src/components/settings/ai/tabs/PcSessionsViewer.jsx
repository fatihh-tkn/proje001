import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Monitor, RefreshCw, Wifi, WifiOff, ChevronDown, ChevronRight,
    Trash2, Activity, Search, X, User
} from 'lucide-react';
import { API_BASE, fetchWithTimeout, formatDate, fmt, formatRelativeTime } from '../utils';

const POLL_MS = 10_000;

function Avatar({ name, size = 28 }) {
    const initials = name
        ? name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : '?';
    const colors = [
        ['#1e40af', '#dbeafe'], ['#065f46', '#d1fae5'], ['#7c2d12', '#fee2e2'],
        ['#4c1d95', '#ede9fe'], ['#0c4a6e', '#e0f2fe'], ['#713f12', '#fef3c7'],
    ];
    const [fg, bg] = colors[(name?.charCodeAt(0) || 0) % colors.length];
    return (
        <div
            style={{ width: size, height: size, backgroundColor: bg, color: fg, borderRadius: size * 0.3, fontSize: size * 0.38 }}
            className="flex items-center justify-center font-black shrink-0 select-none"
        >
            {initials}
        </div>
    );
}

function SessionRow({ sess, isSuper, onKick, kicking }) {
    return (
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-stone-50 last:border-0 hover:bg-stone-50 transition-colors">
            {/* Durum */}
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sess.active ? 'bg-[#1D9E75] animate-pulse' : 'bg-stone-300'}`} />

            {/* Avatar + Kullanıcı */}
            <div className="flex items-center gap-2 w-[200px] shrink-0">
                {sess.user?.name ? (
                    <Avatar name={sess.user.name} size={24} />
                ) : (
                    <div className="w-6 h-6 rounded-md bg-stone-100 flex items-center justify-center shrink-0">
                        <User size={11} className="text-stone-400" />
                    </div>
                )}
                <div className="min-w-0">
                    <p className="text-[11px] font-bold text-stone-700 truncate">{sess.user?.name || 'Bilinmeyen'}</p>
                    <p className="text-[9px] text-stone-400 font-mono truncate">{sess.user?.email || '—'}</p>
                </div>
            </div>

            {/* Giriş zamanı */}
            <div className="w-[140px] shrink-0">
                <p className="text-[9px] text-stone-400 uppercase tracking-widest font-bold">Giriş</p>
                <p className="text-[10px] text-stone-600 font-medium">{sess.started ? formatDate(sess.started) : '—'}</p>
            </div>

            {/* Son aktivite */}
            <div className="flex-1 min-w-0">
                <p className="text-[9px] text-stone-400 uppercase tracking-widest font-bold">Son Aktivite</p>
                <p className={`text-[10px] font-semibold truncate ${sess.active ? 'text-[#1D9E75]' : 'text-stone-500'}`}>
                    {sess.active ? 'Şu an aktif' : (sess.last_active ? formatRelativeTime(sess.last_active) : '—')}
                </p>
            </div>

            {/* Durum badge */}
            <div className="shrink-0">
                {sess.active ? (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#EAF3DE] text-[#3B6D11] text-[9px] font-bold rounded uppercase tracking-widest">
                        <Wifi size={8} /> Aktif
                    </span>
                ) : (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-stone-100 text-stone-400 text-[9px] font-bold rounded uppercase tracking-widest">
                        <WifiOff size={8} /> Pasif
                    </span>
                )}
            </div>

            {/* Kick */}
            <div className="w-7 shrink-0 flex justify-center">
                {isSuper && sess.active && (
                    <button
                        onClick={() => onKick(sess)}
                        disabled={kicking === sess.id}
                        className="p-1 rounded text-stone-300 hover:text-[#D44B4B] hover:bg-red-50 transition-colors"
                        title="Oturumu Sonlandır"
                    >
                        {kicking === sess.id
                            ? <Activity size={11} className="animate-spin" />
                            : <Trash2 size={11} />}
                    </button>
                )}
            </div>
        </div>
    );
}

function PcCard({ pc, isSuper, onRefresh, search }) {
    const [expanded, setExpanded] = useState(pc.active_count > 0);
    const [kicking, setKicking] = useState(null);

    const filteredSessions = useMemo(() => {
        let list = pc.sessions || [];
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(s =>
                (s.user?.name || '').toLowerCase().includes(q) ||
                (s.user?.email || '').toLowerCase().includes(q)
            );
        }
        return [...list].sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0));
    }, [pc.sessions, search]);

    const handleKick = async (sess) => {
        if (!window.confirm(`"${sess.user?.name || 'Bu kullanıcı'}" oturumunu sonlandır?`)) return;
        setKicking(sess.id);
        try {
            await fetch(`${API_BASE}/pcs/${encodeURIComponent(pc.pc_id)}/sessions/${encodeURIComponent(sess.id)}`, {
                method: 'DELETE',
            });
            onRefresh();
        } finally {
            setKicking(null);
        }
    };

    const activeCount = (pc.sessions || []).filter(s => s.active).length;
    const totalCount = pc.sessions?.length || 0;

    return (
        <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
            {/* PC başlığı */}
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-stone-50 transition-colors text-left"
            >
                {/* İkon */}
                <div className={`p-2 rounded-lg shrink-0 ${activeCount > 0 ? 'bg-[#378ADD]/10' : 'bg-stone-100'}`}>
                    <Monitor size={15} className={activeCount > 0 ? 'text-[#378ADD]' : 'text-stone-400'} strokeWidth={2} />
                </div>

                {/* PC bilgisi */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-black text-stone-800">{pc.ip || pc.pc_id}</span>
                        {pc.ip && pc.ip !== pc.pc_id && (
                            <span className="text-[9px] font-mono text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">{pc.pc_id}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                        {activeCount > 0 ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-[#1D9E75]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75] animate-pulse inline-block" />
                                {activeCount} aktif oturum
                            </span>
                        ) : (
                            <span className="text-[10px] text-stone-400 font-medium">Aktif oturum yok</span>
                        )}
                        <span className="text-[10px] text-stone-300">·</span>
                        <span className="text-[10px] text-stone-400">{totalCount} toplam</span>
                    </div>
                </div>

                {/* Sağ: kullanıcı avatarları */}
                <div className="flex items-center gap-1 shrink-0">
                    {(pc.sessions || []).filter(s => s.active && s.user?.name).slice(0, 4).map((s, i) => (
                        <div key={s.id} style={{ zIndex: 4 - i, marginLeft: i > 0 ? -8 : 0 }}>
                            <Avatar name={s.user.name} size={22} />
                        </div>
                    ))}
                    {activeCount > 4 && (
                        <span className="text-[9px] font-bold text-stone-400 ml-1">+{activeCount - 4}</span>
                    )}
                </div>

                {/* Chevron */}
                {expanded
                    ? <ChevronDown size={14} className="text-stone-400 shrink-0" />
                    : <ChevronRight size={14} className="text-stone-400 shrink-0" />}
            </button>

            {/* Oturum listesi */}
            {expanded && (
                <div className="border-t border-stone-100">
                    {/* Tablo başlığı */}
                    <div className="flex items-center gap-3 px-4 py-2 bg-stone-50 text-[9px] font-black uppercase tracking-widest text-stone-400">
                        <span className="w-1.5 shrink-0" />
                        <span className="w-[200px] shrink-0">Kullanıcı</span>
                        <span className="w-[140px] shrink-0">Giriş</span>
                        <span className="flex-1">Son Aktivite</span>
                        <span className="shrink-0">Durum</span>
                        <span className="w-7 shrink-0" />
                    </div>

                    {filteredSessions.length === 0 ? (
                        <div className="text-center py-5">
                            <p className="text-[10px] text-stone-400 font-semibold">
                                {search ? 'Eşleşen oturum yok' : 'Oturum kaydı bulunamadı'}
                            </p>
                        </div>
                    ) : (
                        filteredSessions.map(sess => (
                            <SessionRow
                                key={sess.id}
                                sess={sess}
                                isSuper={isSuper}
                                onKick={handleKick}
                                kicking={kicking}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

export const PcSessionsViewer = React.memo(() => {
    const [pcs, setPcs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const isSuper = useMemo(() => {
        try {
            const u = JSON.parse(localStorage.getItem('current_user') || '{}');
            return !!(u.super || u.isSuper);
        } catch { return false; }
    }, []);

    const fetchPcs = useCallback(async () => {
        try {
            const res = await fetchWithTimeout(`${API_BASE}/pcs`);
            const data = await res.json();
            setPcs(data.pcs || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPcs();
        const t = setInterval(fetchPcs, POLL_MS);
        return () => clearInterval(t);
    }, []); // eslint-disable-line

    const totalSessions  = pcs.reduce((s, p) => s + (p.sessions?.length || 0), 0);
    const totalActive    = pcs.reduce((s, p) => s + (p.sessions?.filter(x => x.active).length || 0), 0);

    const filteredPcs = useMemo(() => {
        if (!search.trim()) return pcs;
        const q = search.toLowerCase();
        return pcs.filter(pc =>
            (pc.ip || '').toLowerCase().includes(q) ||
            (pc.pc_id || '').toLowerCase().includes(q) ||
            (pc.sessions || []).some(s =>
                (s.user?.name || '').toLowerCase().includes(q) ||
                (s.user?.email || '').toLowerCase().includes(q)
            )
        );
    }, [pcs, search]);

    if (loading) return (
        <div className="w-full h-full flex items-center justify-center gap-3 text-stone-400">
            <RefreshCw size={18} className="animate-spin" />
            <span className="text-[11px] font-bold uppercase tracking-widest">Yükleniyor...</span>
        </div>
    );

    return (
        <div className="w-full h-full overflow-y-auto bg-stone-50 minimal-scroll">
            <div className="max-w-4xl mx-auto p-6 space-y-4">

                {/* Başlık + istatistikler */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[#378ADD]/10 rounded-xl">
                            <Monitor size={18} className="text-[#378ADD]" strokeWidth={2} />
                        </div>
                        <div>
                            <h2 className="text-[15px] font-black text-stone-800 tracking-tight">Oturumlar</h2>
                            <p className="text-[11px] text-stone-400 font-medium mt-0.5">PC'lere göre gruplandırılmış</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchPcs}
                        className="p-2.5 rounded-xl border border-stone-200 bg-white text-stone-400 hover:text-[#378ADD] hover:border-[#378ADD]/40 transition-colors"
                        title="Yenile"
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>

                {/* Stat kartları */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Kayıtlı PC', value: pcs.length, color: '#378ADD', icon: Monitor },
                        { label: 'Aktif Oturum', value: totalActive, color: '#1D9E75', icon: Wifi },
                        { label: 'Toplam Oturum', value: totalSessions, color: '#7c3aed', icon: Activity },
                    ].map(({ label, value, color, icon: Icon }) => (
                        <div key={label} className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 rounded-md" style={{ backgroundColor: color + '15' }}>
                                    <Icon size={12} style={{ color }} strokeWidth={2.5} />
                                </div>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400">{label}</span>
                            </div>
                            <p className="text-[22px] font-black leading-none" style={{ color }}>{value}</p>
                        </div>
                    ))}
                </div>

                {/* Arama */}
                <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="PC IP, kullanıcı adı veya e-posta ara..."
                        className="w-full pl-9 pr-8 py-2.5 bg-white border border-stone-200 rounded-xl text-[12px] font-medium text-stone-700 placeholder:text-stone-400 focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20 transition-all"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                            <X size={12} />
                        </button>
                    )}
                </div>

                {/* PC kartları */}
                {filteredPcs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-stone-400">
                        <Monitor size={36} strokeWidth={1} className="mb-3 text-stone-300" />
                        <p className="text-[12px] font-bold uppercase tracking-widest text-stone-400">
                            {search ? 'Eşleşen PC bulunamadı' : 'Henüz kayıtlı PC yok'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredPcs.map(pc => (
                            <PcCard
                                key={pc.pc_id}
                                pc={pc}
                                isSuper={isSuper}
                                onRefresh={fetchPcs}
                                search={search}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});
