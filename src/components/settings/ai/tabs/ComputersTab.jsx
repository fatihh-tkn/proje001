import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Search, RefreshCw, Activity, Monitor, Wifi, Clock,
    ChevronDown, ChevronRight, Trash2, User, Mail, Shield,
    Building2, Briefcase, CheckCircle2, WifiOff, AlertCircle,
    Calendar, LogIn
} from 'lucide-react';
import { API_BASE, fetchWithTimeout, formatDate } from '../utils';

const MAX_SESSIONS = 5;
const POLL_MS = 10_000;

/* ─── Avatar ────────────────────────────────────────────────────────── */
function Avatar({ name, size = 36 }) {
    const initials = name
        ? name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : '?';
    const colors = [
        ['#1e40af', '#dbeafe'], ['#065f46', '#d1fae5'], ['#7c2d12', '#fee2e2'],
        ['#4c1d95', '#ede9fe'], ['#0c4a6e', '#e0f2fe'], ['#713f12', '#fef3c7'],
        ['#881337', '#ffe4e6'], ['#134e4a', '#ccfbf1'],
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

/* ─── Durum rozeti ──────────────────────────────────────────────────── */
function ActiveBadge({ active }) {
    return active ? (
        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#EAF3DE] text-[#3B6D11]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3B6D11] animate-pulse inline-block" />
            Aktif
        </span>
    ) : (
        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-stone-100 text-stone-400">
            <WifiOff size={9} /> Pasif
        </span>
    );
}

/* ─── Oturum Satırı (sol panel) ─────────────────────────────────────── */
function SessionRow({ session, isSelected, onSelect, pcId, onKick, isSuper }) {
    const [kicking, setKicking] = useState(false);
    const user = session.user;
    const displayName = user?.name || 'Bilinmeyen Kullanıcı';
    const displayEmail = user?.email || session.tab_id || '—';

    const handleKick = async (e) => {
        e.stopPropagation();
        if (!window.confirm(`"${displayName}" oturumunu sonlandır?`)) return;
        setKicking(true);
        try {
            await fetch(
                `${API_BASE}/pcs/${encodeURIComponent(pcId)}/sessions/${encodeURIComponent(session.id)}`,
                { method: 'DELETE' }
            );
            onKick();
        } finally {
            setKicking(false);
        }
    };

    return (
        <div
            onClick={() => onSelect(session)}
            className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-stone-50 last:border-0
                ${isSelected ? 'bg-[#378ADD]/5 border-l-2 border-l-[#378ADD]' : 'hover:bg-stone-50'}`}
        >
            <div className="relative shrink-0">
                <Avatar name={displayName} size={34} />
                <span
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                    style={{ backgroundColor: session.active ? '#1D9E75' : '#94a3b8' }}
                />
            </div>

            <div className="flex-1 min-w-0">
                <p className={`text-[12px] font-bold truncate ${isSelected ? 'text-[#378ADD]' : 'text-stone-700'}`}>
                    {displayName}
                </p>
                <p className="text-[10px] text-stone-400 truncate mt-0.5">{displayEmail}</p>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
                <ActiveBadge active={session.active} />
                {isSuper && session.active && (
                    <button
                        onClick={handleKick}
                        disabled={kicking}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-stone-300 hover:text-red-400 transition-all"
                        title="Oturumu sonlandır"
                    >
                        {kicking ? <Activity size={11} className="animate-spin" /> : <Trash2 size={11} />}
                    </button>
                )}
            </div>
        </div>
    );
}

/* ─── PC Kartı (sol panel) ──────────────────────────────────────────── */
function PcCard({ pc, selectedSessionId, onSelectSession, onKick, isSuper, defaultOpen }) {
    const [expanded, setExpanded] = useState(defaultOpen);
    const hasActive = pc.active_count > 0;
    const pct = pc.active_count / MAX_SESSIONS;
    const barColor = pct >= 1 ? '#ef4444' : pct >= 0.6 ? '#f59e0b' : '#1D9E75';

    return (
        <div className="mx-3 my-2 rounded-xl overflow-hidden bg-white border border-stone-200 shadow-sm">
            {/* PC başlık */}
            <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors text-left"
            >
                {expanded ? <ChevronDown size={13} className="text-stone-400 shrink-0" /> : <ChevronRight size={13} className="text-stone-400 shrink-0" />}

                <div className="relative shrink-0">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center ${hasActive ? 'bg-[#378ADD]/10 text-[#378ADD]' : 'bg-stone-100 text-stone-400'}`}>
                        <Monitor size={15} />
                    </div>
                    <span
                        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                        style={{ backgroundColor: hasActive ? '#1D9E75' : '#94a3b8' }}
                    />
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-stone-700 truncate">{pc.ip || pc.pc_id}</p>
                    <p className="text-[10px] font-mono text-stone-400 truncate">{pc.pc_id}</p>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[10px] font-black ${pc.active_count >= MAX_SESSIONS ? 'text-red-500' : 'text-stone-600'}`}>
                        {pc.active_count}/{MAX_SESSIONS}
                    </span>
                    <div className="w-12 h-1 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, backgroundColor: barColor }} />
                    </div>
                </div>
            </button>

            {/* Oturum listesi */}
            {expanded && (
                <div className="border-t border-stone-100">
                    {pc.sessions.length === 0 ? (
                        <p className="text-[10px] text-stone-400 text-center py-4">Kayıtlı oturum yok</p>
                    ) : (
                        // Aktif oturumlar önce
                        [...pc.sessions]
                            .sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0))
                            .map(sess => (
                                <SessionRow
                                    key={sess.id}
                                    session={sess}
                                    isSelected={selectedSessionId === sess.id}
                                    onSelect={onSelectSession}
                                    pcId={pc.pc_id}
                                    onKick={onKick}
                                    isSuper={isSuper}
                                />
                            ))
                    )}
                </div>
            )}
        </div>
    );
}

/* ─── Sağ panel: Oturum Detayı ──────────────────────────────────────── */
function SessionDetail({ session, pcIp, onKick, isSuper }) {
    const user = session.user;
    const [kicking, setKicking] = useState(false);

    const handleKick = async () => {
        if (!window.confirm('Bu oturumu sonlandır?')) return;
        setKicking(true);
        try {
            await fetch(
                `${API_BASE}/pcs/${encodeURIComponent(pcIp)}/sessions/${encodeURIComponent(session.id)}`,
                { method: 'DELETE' }
            );
            onKick();
        } finally {
            setKicking(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-8 py-6 border-b border-stone-100 bg-stone-50">
                <div className="flex items-start gap-4">
                    <div className="relative">
                        <Avatar name={user?.name || '?'} size={52} />
                        <span
                            className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-stone-50"
                            style={{ backgroundColor: session.active ? '#1D9E75' : '#94a3b8' }}
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-[18px] font-black text-stone-800 truncate">
                            {user?.name || 'Bilinmeyen Kullanıcı'}
                        </h2>
                        <p className="text-[12px] text-stone-400 font-mono truncate mt-0.5">
                            {user?.email || '—'}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <ActiveBadge active={session.active} />
                            {user?.role && (
                                <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded
                                    ${user.role === 'Sistem Yöneticisi' ? 'bg-purple-50 text-purple-600' : 'bg-stone-100 text-stone-500'}`}>
                                    {user.role}
                                </span>
                            )}
                            {user?.status === 'Askıya Alındı' && (
                                <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">
                                    Askıya Alındı
                                </span>
                            )}
                        </div>
                    </div>
                    {isSuper && session.active && (
                        <button
                            onClick={handleKick}
                            disabled={kicking}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                            {kicking ? <Activity size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            Sonlandır
                        </button>
                    )}
                </div>
            </div>

            {/* İçerik */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-white">

                {/* Kullanıcı Profili */}
                {user ? (
                    <Section title="Kullanıcı Bilgileri" icon={User}>
                        <InfoRow icon={User} label="Ad Soyad" value={user.name} />
                        <InfoRow icon={Mail} label="E-posta" value={user.email} mono />
                        <InfoRow icon={Shield} label="Rol" value={user.role} />
                        <InfoRow icon={CheckCircle2} label="Hesap Durumu" value={user.status}
                            valueClass={user.status === 'Aktif' ? 'text-[#3B6D11]' : 'text-amber-600'} />
                        {user.department && <InfoRow icon={Building2} label="Departman" value={user.department} />}
                        {user.position && <InfoRow icon={Briefcase} label="Pozisyon" value={user.position} />}
                        {user.last_login && <InfoRow icon={LogIn} label="Son Giriş" value={formatDate(user.last_login)} />}
                        {user.created_at && <InfoRow icon={Calendar} label="Kayıt Tarihi" value={formatDate(user.created_at)} />}
                    </Section>
                ) : (
                    <div className="flex items-center gap-3 p-4 bg-stone-50 border border-stone-200 rounded-xl text-stone-400 text-[12px]">
                        <AlertCircle size={16} />
                        Bu oturuma bağlı kullanıcı bilgisi bulunamadı.
                    </div>
                )}

                {/* Oturum Bilgileri */}
                <Section title="Oturum Bilgileri" icon={Monitor}>
                    <InfoRow icon={Wifi} label="IP Adresi" value={pcIp || '—'} mono />
                    <InfoRow icon={Clock} label="Başlangıç" value={formatDate(session.started)} />
                    <InfoRow icon={Activity} label="Son Aktivite" value={formatDate(session.last_active)} />
                    <InfoRow icon={Monitor} label="Sekme ID" value={session.tab_id || session.id?.slice(0, 20)} mono />
                </Section>

            </div>
        </div>
    );
}

/* ─── Küçük yardımcı bileşenler ─────────────────────────────────────── */
function Section({ title, icon: Icon, children }) {
    return (
        <div>
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Icon size={13} className="text-stone-400" /> {title}
            </p>
            <div className="border border-stone-200 rounded-xl divide-y divide-stone-100 overflow-hidden shadow-sm">
                {children}
            </div>
        </div>
    );
}

function InfoRow({ icon: Icon, label, value, mono, valueClass }) {
    return (
        <div className="flex items-center justify-between px-5 py-3 hover:bg-stone-50 transition-colors">
            <div className="flex items-center gap-2.5 text-stone-400 shrink-0">
                <Icon size={13} />
                <span className="text-[11px] font-bold">{label}</span>
            </div>
            <span className={`text-[11px] font-bold ml-4 text-right max-w-[220px] truncate ${mono ? 'font-mono text-stone-600' : 'text-stone-700'} ${valueClass || ''}`}>
                {value || '—'}
            </span>
        </div>
    );
}

/* ─── Ana Bileşen ───────────────────────────────────────────────────── */
export const ComputersTab = React.memo(() => {
    const [pcs, setPcs] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [selectedPcIp, setSelectedPcIp] = useState(null);
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
            console.error('PC fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPcs();
        const timer = setInterval(fetchPcs, POLL_MS);
        return () => clearInterval(timer);
    }, []); // eslint-disable-line

    // Seçili oturumu güncel veriden senkronize et
    useEffect(() => {
        if (!selectedSession) return;
        for (const pc of pcs) {
            const found = pc.sessions.find(s => s.id === selectedSession.id);
            if (found) { setSelectedSession(found); setSelectedPcIp(pc.ip); return; }
        }
    }, [pcs]); // eslint-disable-line

    const filtered = useMemo(() => {
        if (!search.trim()) return pcs;
        const q = search.toLowerCase();
        return pcs
            .map(pc => {
                const matchPc =
                    (pc.ip || '').toLowerCase().includes(q) ||
                    (pc.pc_id || '').toLowerCase().includes(q);
                const matchedSessions = pc.sessions.filter(s =>
                    (s.user?.name || '').toLowerCase().includes(q) ||
                    (s.user?.email || '').toLowerCase().includes(q) ||
                    (s.user?.department || '').toLowerCase().includes(q)
                );
                if (matchPc || matchedSessions.length > 0) {
                    return { ...pc, sessions: matchPc ? pc.sessions : matchedSessions };
                }
                return null;
            })
            .filter(Boolean);
    }, [pcs, search]);

    // Toplam sayaçlar
    const totalActive = pcs.reduce((s, p) => s + p.active_count, 0);
    const totalSessions = pcs.reduce((s, p) => s + p.total_sessions, 0);

    return (
        <div className="flex bg-stone-50 select-none w-full h-full overflow-hidden animate-in fade-in duration-300 p-6 md:p-8 max-w-6xl mx-auto gap-6">

            {/* ── SOL: PC + Oturum Listesi ── */}
            <div className="w-[340px] shrink-0 flex flex-col bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">

                {/* Başlık */}
                <div className="px-5 py-4 flex items-center justify-between border-b border-stone-100">
                    <div className="flex items-center gap-2.5">
                        <Monitor size={14} className="text-[#378ADD]" />
                        <span className="text-[12px] font-bold text-stone-600 uppercase tracking-wide">Bilgisayarlar</span>
                        <span className="px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded text-[10px] font-bold">{pcs.length}</span>
                    </div>
                    <button onClick={fetchPcs} className="p-1.5 rounded text-stone-400 hover:text-[#378ADD] transition-colors">
                        <RefreshCw size={13} />
                    </button>
                </div>

                {/* Özet */}
                <div className="flex border-b border-stone-100 divide-x divide-stone-100 bg-stone-50/50">
                    <div className="flex-1 px-4 py-2.5 text-center">
                        <p className="text-[15px] font-black text-[#1D9E75]">{totalActive}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Aktif</p>
                    </div>
                    <div className="flex-1 px-4 py-2.5 text-center">
                        <p className="text-[15px] font-black text-stone-600">{totalSessions}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Toplam Oturum</p>
                    </div>
                    <div className="flex-1 px-4 py-2.5 text-center">
                        <p className="text-[15px] font-black text-stone-600">{pcs.length}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">PC</p>
                    </div>
                </div>

                {/* Arama */}
                <div className="px-4 py-3 border-b border-stone-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={12} />
                        <input
                            className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-md text-[11px] font-medium text-stone-700 placeholder:text-stone-400 focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD] transition-all"
                            placeholder="İsim, e-posta veya IP..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* PC + Oturum listesi */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-3 opacity-60">
                            <Activity className="animate-spin text-stone-400" size={22} />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Yükleniyor</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-3 opacity-60">
                            <Monitor size={28} strokeWidth={1} className="text-stone-400" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                                {search ? 'Eşleşme yok' : 'Henüz kayıtlı PC yok'}
                            </span>
                        </div>
                    ) : (
                        filtered.map((pc, idx) => (
                            <PcCard
                                key={pc.pc_id}
                                pc={pc}
                                selectedSessionId={selectedSession?.id}
                                onSelectSession={sess => { setSelectedSession(sess); setSelectedPcIp(pc.ip); }}
                                onKick={fetchPcs}
                                isSuper={isSuper}
                                defaultOpen={idx === 0}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* ── SAĞ: Detay Paneli ── */}
            <div className="flex-1 bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden relative">
                {selectedSession ? (
                    <SessionDetail
                        session={selectedSession}
                        pcIp={selectedPcIp}
                        onKick={fetchPcs}
                        isSuper={isSuper}
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-stone-400 bg-stone-50/50">
                        <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-stone-200 flex items-center justify-center">
                            <User size={34} strokeWidth={1.5} className="text-stone-300" />
                        </div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">
                            Detay için bir oturum seçin
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
});
