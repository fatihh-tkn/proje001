import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    HardDrive, Search, RefreshCw, Activity, FileText, Database,
    CheckCircle2, AlertCircle, User, Mail, Edit3, Save, X,
    Folder, Hash, Sparkles, Lock, Globe, Tag, Calendar, Clock
} from 'lucide-react';
import { API_BASE, fetchWithTimeout, formatMB, getQuotaColor, formatDate, fmt } from '../utils';

const POLL_MS = 30_000;

/* ─── Avatar ───────────────────────────────────────────────────── */
function Avatar({ name, size = 36 }) {
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

/* ─── KPI Karosu ───────────────────────────────────────────────── */
function StatTile({ label, value, sub, icon: Icon, accent }) {
    return (
        <div className="flex items-center gap-3 p-4 bg-white border border-stone-200 rounded-xl shadow-sm">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: (accent || '#378ADD') + '15', color: accent || '#378ADD' }}>
                <Icon size={18} />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{label}</p>
                <p className="text-[16px] font-black text-stone-700 mt-0.5 truncate">{value}</p>
                {sub && <p className="text-[10px] text-stone-400 mt-0.5 truncate">{sub}</p>}
            </div>
        </div>
    );
}

/* ─── Donut Grafik (kullanılan / kota) ─────────────────────────── */
function StorageDonut({ usedMb, quotaMb }) {
    const r = 50, cx = 70, cy = 70;
    const circ = 2 * Math.PI * r;
    const isUnlimited = quotaMb == null;
    const pct = isUnlimited ? 0 : Math.min(usedMb / quotaMb, 1);
    const dash = pct * circ;
    const color = isUnlimited ? '#94a3b8' : getQuotaColor(pct * 100);

    return (
        <svg width={140} height={140} className="shrink-0">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={10} />
            {!isUnlimited && (
                <circle
                    cx={cx} cy={cy} r={r} fill="none"
                    stroke={color} strokeWidth={10}
                    strokeDasharray={`${dash} ${circ - dash}`}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${cx} ${cy})`}
                    style={{ transition: 'stroke-dasharray 0.6s ease' }}
                />
            )}
            <text x={cx} y={cy - 4} textAnchor="middle" fill="#1e293b" fontSize={14} fontWeight={900}>
                {formatMB(usedMb)}
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize={10} fontWeight={700}>
                {isUnlimited ? '∞ sınırsız' : `/ ${formatMB(quotaMb)}`}
            </text>
        </svg>
    );
}

/* ─── Kullanıcı Satırı (sol panel) ─────────────────────────────── */
function UserRow({ user, isSelected, onSelect }) {
    const isUnlimited = user.quota_mb == null;
    const pct = isUnlimited ? 0 : Math.min(user.usage_pct, 100);
    const color = isUnlimited ? '#94a3b8' : getQuotaColor(pct);

    return (
        <div
            onClick={() => onSelect(user)}
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-stone-50 last:border-0
                ${isSelected ? 'bg-[#378ADD]/5 border-l-2 border-l-[#378ADD]' : 'hover:bg-stone-50'}`}
        >
            <Avatar name={user.name} size={34} />
            <div className="flex-1 min-w-0">
                <p className={`text-[12px] font-bold truncate ${isSelected ? 'text-[#378ADD]' : 'text-stone-700'}`}>
                    {user.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-stone-500 shrink-0">
                        {isUnlimited ? '∞' : `%${user.usage_pct}`}
                    </span>
                </div>
                <p className="text-[10px] text-stone-400 mt-1 truncate">
                    {formatMB(user.used_mb)} {isUnlimited ? '' : `/ ${formatMB(user.quota_mb)}`} · {user.used_files} dosya
                </p>
            </div>
        </div>
    );
}

/* ─── Kota Düzenleme Formu ─────────────────────────────────────── */
function QuotaEditor({ user, onSaved, onCancel }) {
    const [quotaMb, setQuotaMb] = useState(user.quota_mb ?? '');
    const [quotaFiles, setQuotaFiles] = useState(user.quota_files ?? '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const body = {
                quota_mb: quotaMb === '' ? -1 : Number(quotaMb),
                quota_files: quotaFiles === '' ? -1 : Number(quotaFiles),
            };
            await fetch(`${API_BASE}/storage/${encodeURIComponent(user.id)}/quota`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            onSaved();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700 flex items-center gap-2">
                <Edit3 size={12} /> Kota Düzenle
            </p>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1">
                        Depolama (MB)
                    </label>
                    <input
                        type="number"
                        value={quotaMb}
                        onChange={e => setQuotaMb(e.target.value)}
                        placeholder="Boş = sınırsız"
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-md text-[12px] font-bold text-stone-700 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1">
                        Dosya Sayısı
                    </label>
                    <input
                        type="number"
                        value={quotaFiles}
                        onChange={e => setQuotaFiles(e.target.value)}
                        placeholder="Boş = sınırsız"
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-md text-[12px] font-bold text-stone-700 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                </div>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded-md transition-colors disabled:opacity-50"
                >
                    {saving ? <Activity size={12} className="animate-spin" /> : <Save size={12} />}
                    Kaydet
                </button>
                <button
                    onClick={onCancel}
                    className="flex items-center gap-1 px-3 py-2 bg-white border border-stone-200 text-stone-600 text-[11px] font-bold rounded-md hover:bg-stone-50 transition-colors"
                >
                    <X size={12} /> İptal
                </button>
            </div>
        </div>
    );
}

/* ─── Belge Satırı ─────────────────────────────────────────────── */
const STATUS_STYLE = {
    'karantina': { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Karantina' },
    'onaylandi': { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Onaylandı' },
    'reddedildi': { bg: 'bg-red-50', text: 'text-red-700', label: 'Reddedildi' },
    'arsivde': { bg: 'bg-slate-50', text: 'text-slate-600', label: 'Arşivde' },
};

function DocRow({ doc }) {
    const status = STATUS_STYLE[doc.status] || { bg: 'bg-stone-50', text: 'text-stone-500', label: doc.status };
    return (
        <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 transition-colors border-b border-stone-50 last:border-0">
            <div className="w-8 h-8 rounded-md bg-stone-100 text-stone-500 flex items-center justify-center shrink-0">
                <FileText size={14} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-stone-700 truncate">{doc.name}</p>
                <div className="flex items-center gap-2 mt-1 text-[9px] text-stone-400">
                    <span className="uppercase font-bold">{doc.type}</span>
                    <span>·</span>
                    <span>{formatMB(doc.size_mb)}</span>
                    {doc.chunk_count > 0 && (
                        <>
                            <span>·</span>
                            <span>{doc.chunk_count} parça</span>
                        </>
                    )}
                </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${status.bg} ${status.text}`}>
                    {status.label}
                </span>
                <span className="text-[9px] text-stone-400">{formatDate(doc.uploaded_at)}</span>
            </div>
            {doc.vectorized && (
                <Sparkles size={12} className="text-purple-400 shrink-0" title="Vektörleştirildi" />
            )}
        </div>
    );
}

/* ─── Sağ Panel: Kullanıcı Detayı ──────────────────────────────── */
function UserDetail({ user, onUpdate, isSuper }) {
    const [docs, setDocs] = useState([]);
    const [docsLoading, setDocsLoading] = useState(true);
    const [editingQuota, setEditingQuota] = useState(false);
    const [filter, setFilter] = useState('all'); // all | karantina | onaylandi | arsivde
    const [search, setSearch] = useState('');

    const fetchDocs = useCallback(async () => {
        setDocsLoading(true);
        try {
            const res = await fetchWithTimeout(`${API_BASE}/storage/${encodeURIComponent(user.id)}/documents`);
            const data = await res.json();
            setDocs(data.documents || []);
        } finally {
            setDocsLoading(false);
        }
    }, [user.id]);

    useEffect(() => { fetchDocs(); }, [fetchDocs]);

    const filteredDocs = useMemo(() => {
        let out = docs;
        if (filter !== 'all') out = out.filter(d => d.status === filter);
        if (search.trim()) {
            const q = search.toLowerCase();
            out = out.filter(d => (d.name || '').toLowerCase().includes(q) || (d.type || '').toLowerCase().includes(q));
        }
        return out;
    }, [docs, filter, search]);

    const isUnlimited = user.quota_mb == null;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-8 py-6 border-b border-stone-100 bg-stone-50">
                <div className="flex items-center gap-4">
                    <Avatar name={user.name} size={52} />
                    <div className="flex-1 min-w-0">
                        <h2 className="text-[18px] font-black text-stone-800 truncate">{user.name}</h2>
                        <p className="text-[11px] text-stone-400 font-mono truncate mt-0.5">{user.email}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded
                                ${user.role === 'Sistem Yöneticisi' ? 'bg-purple-50 text-purple-600' : 'bg-stone-100 text-stone-500'}`}>
                                {user.role}
                            </span>
                            {user.department && (
                                <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                                    {user.department}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* İçerik */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-white">

                {/* Donut + Sayaçlar */}
                <div className="flex items-center gap-6 p-5 border border-stone-200 rounded-xl shadow-sm bg-stone-50/30">
                    <StorageDonut usedMb={user.used_mb} quotaMb={user.quota_mb} />
                    <div className="flex-1 grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Yüklenen Dosya</p>
                            <p className="text-[18px] font-black text-stone-700 mt-0.5">{user.used_files}</p>
                            {user.quota_files != null && (
                                <p className="text-[10px] text-stone-400 mt-0.5">/ {user.quota_files} limit</p>
                            )}
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Vektörleştirilen</p>
                            <p className="text-[18px] font-black text-purple-600 mt-0.5">{user.vectorized_files}</p>
                            <p className="text-[10px] text-stone-400 mt-0.5">RAG için aktif</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Kalan Alan</p>
                            <p className="text-[14px] font-black text-stone-700 mt-0.5">
                                {isUnlimited ? '∞ Sınırsız' : formatMB(user.remaining_mb)}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Doluluk</p>
                            <p className="text-[14px] font-black mt-0.5"
                                style={{ color: isUnlimited ? '#94a3b8' : getQuotaColor(user.usage_pct) }}>
                                {isUnlimited ? '—' : `%${user.usage_pct}`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Kota Düzenleme (super) */}
                {isSuper && (
                    editingQuota ? (
                        <QuotaEditor
                            user={user}
                            onSaved={() => { setEditingQuota(false); onUpdate(); }}
                            onCancel={() => setEditingQuota(false)}
                        />
                    ) : (
                        <button
                            onClick={() => setEditingQuota(true)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-stone-200 hover:border-amber-300 hover:bg-amber-50 text-stone-600 hover:text-amber-700 text-[11px] font-bold rounded-lg transition-colors"
                        >
                            <Edit3 size={12} /> Kotayı Düzenle
                        </button>
                    )
                )}

                {/* Belgeler */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[11px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2">
                            <Folder size={13} className="text-stone-400" /> Belgeler
                            <span className="px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded text-[10px]">
                                {filteredDocs.length}
                            </span>
                        </p>
                        <button
                            onClick={fetchDocs}
                            className="p-1 text-stone-400 hover:text-[#378ADD] transition-colors"
                        >
                            <RefreshCw size={12} />
                        </button>
                    </div>

                    {/* Filtre + Arama */}
                    <div className="flex gap-2 mb-3">
                        <div className="relative flex-1">
                            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Dosya ara..."
                                className="w-full pl-7 pr-3 py-1.5 bg-white border border-stone-200 rounded-md text-[11px] font-medium text-stone-700 focus:outline-none focus:border-[#378ADD]"
                            />
                        </div>
                        <select
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            className="px-3 py-1.5 bg-white border border-stone-200 rounded-md text-[11px] font-bold text-stone-700 focus:outline-none focus:border-[#378ADD] cursor-pointer"
                        >
                            <option value="all">Tümü</option>
                            <option value="karantina">Karantina</option>
                            <option value="onaylandi">Onaylanan</option>
                            <option value="arsivde">Arşivde</option>
                            <option value="reddedildi">Reddedilen</option>
                        </select>
                    </div>

                    {/* Liste */}
                    <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
                        {docsLoading ? (
                            <div className="flex items-center justify-center py-8 gap-2 text-stone-400">
                                <Activity size={14} className="animate-spin" />
                                <span className="text-[11px] font-bold uppercase tracking-widest">Yükleniyor</span>
                            </div>
                        ) : filteredDocs.length === 0 ? (
                            <div className="text-center py-8">
                                <FileText size={28} strokeWidth={1} className="text-stone-300 mx-auto mb-2" />
                                <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">
                                    {search || filter !== 'all' ? 'Eşleşme yok' : 'Henüz belge yok'}
                                </p>
                            </div>
                        ) : (
                            filteredDocs.map(doc => <DocRow key={doc.id} doc={doc} />)
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

/* ─── Ana Bileşen ──────────────────────────────────────────────── */
export const StorageTab = React.memo(() => {
    const [data, setData] = useState({ totals: null, users: [] });
    const [selectedUser, setSelectedUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const isSuper = useMemo(() => {
        try {
            const u = JSON.parse(localStorage.getItem('current_user') || '{}');
            return !!(u.super || u.isSuper);
        } catch { return false; }
    }, []);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetchWithTimeout(`${API_BASE}/storage`);
            const json = await res.json();
            setData(json);
        } catch (e) {
            console.error('Storage fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const timer = setInterval(fetchData, POLL_MS);
        return () => clearInterval(timer);
    }, [fetchData]);

    // Seçili kullanıcıyı güncel veriden senkronize et
    useEffect(() => {
        if (!selectedUser) return;
        const fresh = data.users.find(u => u.id === selectedUser.id);
        if (fresh) setSelectedUser(fresh);
    }, [data.users]); // eslint-disable-line

    const filtered = useMemo(() => {
        if (!search.trim()) return data.users;
        const q = search.toLowerCase();
        return data.users.filter(u =>
            (u.name || '').toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q) ||
            (u.department || '').toLowerCase().includes(q)
        );
    }, [data.users, search]);

    const totals = data.totals || {};

    return (
        <div className="flex flex-col w-full h-full overflow-hidden bg-stone-50 animate-in fade-in duration-300 p-6 md:p-8 max-w-6xl mx-auto gap-5">

            {/* Üst KPI Kartları */}
            <div className="grid grid-cols-4 gap-3">
                <StatTile
                    icon={User} label="Kullanıcı"
                    value={fmt(totals.total_users || 0)}
                    accent="#378ADD"
                />
                <StatTile
                    icon={FileText} label="Toplam Belge"
                    value={fmt(totals.total_files || 0)}
                    sub={`${formatMB(totals.total_size_mb || 0)} disk`}
                    accent="#0c4a6e"
                />
                <StatTile
                    icon={Sparkles} label="Vektörleşen"
                    value={`${fmt(totals.vectorized_files || 0)}`}
                    sub={`%${totals.vectorized_pct || 0} oran`}
                    accent="#7c3aed"
                />
                <StatTile
                    icon={Database} label="Vektör Parçası"
                    value={fmt(totals.total_chunks || 0)}
                    accent="#b91c1c"
                />
            </div>

            {/* Alt: 2 sütun */}
            <div className="flex flex-1 overflow-hidden gap-5">

                {/* SOL: Kullanıcı listesi */}
                <div className="w-[340px] shrink-0 flex flex-col bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 flex items-center justify-between border-b border-stone-100">
                        <div className="flex items-center gap-2.5">
                            <HardDrive size={14} className="text-[#378ADD]" />
                            <span className="text-[12px] font-bold text-stone-600 uppercase tracking-wide">Kullanıcılar</span>
                        </div>
                        <button onClick={fetchData} className="p-1.5 rounded text-stone-400 hover:text-[#378ADD] transition-colors">
                            <RefreshCw size={13} />
                        </button>
                    </div>
                    <div className="px-4 py-3 border-b border-stone-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={12} />
                            <input
                                className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-md text-[11px] font-medium text-stone-700 placeholder:text-stone-400 focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]"
                                placeholder="İsim, e-posta veya departman..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-40 gap-2 opacity-60">
                                <Activity size={20} className="animate-spin text-stone-400" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Yükleniyor</span>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 gap-3 opacity-60">
                                <User size={26} strokeWidth={1} className="text-stone-400" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                                    {search ? 'Eşleşme yok' : 'Kullanıcı yok'}
                                </span>
                            </div>
                        ) : (
                            filtered.map(u => (
                                <UserRow
                                    key={u.id}
                                    user={u}
                                    isSelected={selectedUser?.id === u.id}
                                    onSelect={setSelectedUser}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* SAĞ: Detay */}
                <div className="flex-1 bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden relative">
                    {selectedUser ? (
                        <UserDetail
                            user={selectedUser}
                            onUpdate={fetchData}
                            isSuper={isSuper}
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-stone-400 bg-stone-50/50">
                            <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-stone-200 flex items-center justify-center">
                                <HardDrive size={34} strokeWidth={1.5} className="text-stone-300" />
                            </div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">
                                Detay için kullanıcı seçin
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
