import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
    Search, RefreshCw, Users, Monitor, Wifi,
    ChevronDown, Trash2, Mail, Shield, Building2, Briefcase,
    CheckCircle2, WifiOff, Calendar, LogIn,
    Activity, Zap, User, X, Filter,
    HardDrive, FileText, Sparkles, Edit3, Save, Folder, Database,
    BarChart2, Terminal, DollarSign, AlertCircle, Clock, ChevronRight, BookOpen, Lock
} from 'lucide-react';
import { API_BASE, fetchWithTimeout, formatDate, fmt, fmtCost, fmtMs, formatMB, getQuotaColor, getModelColor, formatRelativeTime, truncatedText } from '../utils';
import EgitimAcmaSlideOver from '../../auth/EgitimAcmaSlideOver';
import { RestrictionsModal } from '../../auth/InlineUserDashboard';

const POLL_MS = 10_000;
const AUTH_BASE = '/api/auth';

/* ─── Avatar ─────────────────────────────────────────────────── */
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

/* ─── Durum rozeti ────────────────────────────────────────────── */
function StatusBadge({ status }) {
    const isActive = status === 'Aktif';
    return isActive ? (
        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#EAF3DE] text-[#3B6D11]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3B6D11] animate-pulse inline-block" />Aktif
        </span>
    ) : (
        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-stone-100 text-stone-400">
            <WifiOff size={9} />Pasif
        </span>
    );
}

/* ─── Depolama Donut ──────────────────────────────────────────── */
function StorageDonut({ usedMb, quotaMb }) {
    const r = 34, cx = 46, cy = 46;
    const circ = 2 * Math.PI * r;
    const isUnlimited = quotaMb == null;
    const pct = isUnlimited ? 0 : Math.min(usedMb / quotaMb, 1);
    const dash = pct * circ;
    const color = isUnlimited ? '#94a3b8' : getQuotaColor(pct * 100);
    return (
        <svg width={92} height={92} className="shrink-0">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={7} />
            {!isUnlimited && (
                <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={7}
                    strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
                    transform={`rotate(-90 ${cx} ${cy})`}
                    style={{ transition: 'stroke-dasharray 0.6s ease' }} />
            )}
            <text x={cx} y={cy - 3} textAnchor="middle" fill="#1e293b" fontSize={9} fontWeight={900}>
                {formatMB(usedMb)}
            </text>
            <text x={cx} y={cy + 9} textAnchor="middle" fill="#94a3b8" fontSize={7} fontWeight={700}>
                {isUnlimited ? '∞' : `/${formatMB(quotaMb)}`}
            </text>
        </svg>
    );
}

/* ─── Kota Düzenleme ─────────────────────────────────────────── */
function QuotaEditor({ user, onSaved, onCancel }) {
    const [quotaMb, setQuotaMb] = useState(user.quota_mb ?? '');
    const [quotaFiles, setQuotaFiles] = useState(user.quota_files ?? '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await fetch(`${API_BASE}/storage/${encodeURIComponent(user.id)}/quota`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quota_mb: quotaMb === '' ? -1 : Number(quotaMb),
                    quota_files: quotaFiles === '' ? -1 : Number(quotaFiles),
                }),
            });
            onSaved();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 flex items-center gap-1.5">
                <Edit3 size={10} /> Kota Düzenle
            </p>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block mb-1">Depolama (MB)</label>
                    <input type="number" value={quotaMb} onChange={e => setQuotaMb(e.target.value)}
                        placeholder="Sınırsız"
                        className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-md text-[11px] font-bold text-stone-700 focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                    <label className="text-[9px] font-bold text-stone-500 uppercase tracking-widest block mb-1">Dosya Sayısı</label>
                    <input type="number" value={quotaFiles} onChange={e => setQuotaFiles(e.target.value)}
                        placeholder="Sınırsız"
                        className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-md text-[11px] font-bold text-stone-700 focus:outline-none focus:border-amber-400" />
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-md transition-colors disabled:opacity-50">
                    {saving ? <Activity size={10} className="animate-spin" /> : <Save size={10} />} Kaydet
                </button>
                <button onClick={onCancel}
                    className="px-3 py-1.5 bg-white border border-stone-200 text-stone-600 text-[10px] font-bold rounded-md hover:bg-stone-50 transition-colors">
                    <X size={10} />
                </button>
            </div>
        </div>
    );
}

/* ─── Belge satırı ────────────────────────────────────────────── */
const STATUS_STYLE = {
    karantina: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Karantina' },
    onaylandi: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Onaylandı' },
    reddedildi: { bg: 'bg-red-50', text: 'text-red-700', label: 'Reddedildi' },
    arsivde: { bg: 'bg-slate-50', text: 'text-slate-600', label: 'Arşivde' },
};

function DocRow({ doc }) {
    const status = STATUS_STYLE[doc.status] || { bg: 'bg-stone-50', text: 'text-stone-500', label: doc.status };
    return (
        <div className="flex items-center gap-2.5 px-3 py-2 hover:bg-stone-50 transition-colors border-b border-stone-50 last:border-0">
            <div className="w-7 h-7 rounded-md bg-stone-100 text-stone-500 flex items-center justify-center shrink-0">
                <FileText size={12} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-stone-700 truncate">{doc.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-stone-400">
                    <span className="uppercase font-bold">{doc.type}</span>
                    <span>·</span>
                    <span>{formatMB(doc.size_mb)}</span>
                    {doc.chunk_count > 0 && <><span>·</span><span>{doc.chunk_count} parça</span></>}
                </div>
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
                <span className={`text-[8px] font-bold uppercase tracking-widest px-1 py-0.5 rounded ${status.bg} ${status.text}`}>
                    {status.label}
                </span>
                {doc.vectorized && <Sparkles size={10} className="text-purple-400" title="Vektörleştirildi" />}
            </div>
        </div>
    );
}

/* ─── Depolama Sütunu ─────────────────────────────────────────── */
function StorageColumn({ user, isSuper }) {
    const [storageUser, setStorageUser] = useState(null);
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingQuota, setEditingQuota] = useState(false);
    const [docFilter, setDocFilter] = useState('all');
    const [docSearch, setDocSearch] = useState('');

    const fetchStorage = useCallback(async () => {
        setLoading(true);
        try {
            const [ovRes, docsRes] = await Promise.all([
                fetchWithTimeout(`${API_BASE}/storage`),
                fetchWithTimeout(`${API_BASE}/storage/${encodeURIComponent(user.id)}/documents`),
            ]);
            const [ovData, docsData] = await Promise.all([ovRes.json(), docsRes.json()]);
            const found = (ovData.users || []).find(u => u.id === user.id);
            setStorageUser(found || null);
            setDocs(docsData.documents || []);
        } catch (e) {
            console.error('Storage fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => { fetchStorage(); }, [fetchStorage]);

    const filteredDocs = useMemo(() => {
        let out = docs;
        if (docFilter !== 'all') out = out.filter(d => d.status === docFilter);
        if (docSearch.trim()) {
            const q = docSearch.toLowerCase();
            out = out.filter(d => (d.name || '').toLowerCase().includes(q));
        }
        return out;
    }, [docs, docFilter, docSearch]);

    if (loading) return (
        <div className="space-y-1">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <HardDrive size={11} /> Depolama
            </p>
            <div className="bg-white rounded-xl border border-stone-200 p-6 flex items-center justify-center gap-2 text-stone-400">
                <Activity size={14} className="animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Yükleniyor</span>
            </div>
        </div>
    );

    if (!storageUser) return (
        <div className="space-y-1">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <HardDrive size={11} /> Depolama
            </p>
            <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
                <Database size={18} strokeWidth={1.5} className="text-stone-300 mx-auto mb-2" />
                <p className="text-[10px] text-stone-400 font-semibold">Depolama bilgisi yok</p>
            </div>
        </div>
    );

    const isUnlimited = storageUser.quota_mb == null;

    return (
        <div className="space-y-3">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5">
                <HardDrive size={11} /> Depolama
            </p>

            {/* Donut + KPI */}
            <div className="bg-white rounded-xl border border-stone-200 p-3 flex items-center gap-3 shadow-sm">
                <StorageDonut usedMb={storageUser.used_mb} quotaMb={storageUser.quota_mb} />
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 flex-1">
                    {[
                        ['Dosya', storageUser.used_files, storageUser.quota_files ? `/ ${storageUser.quota_files}` : null],
                        ['Vektör', storageUser.vectorized_files, 'RAG aktif', '#7c3aed'],
                        ['Kalan', isUnlimited ? '∞' : formatMB(storageUser.remaining_mb), null],
                        ['Doluluk', isUnlimited ? '—' : `%${storageUser.usage_pct}`, null,
                            isUnlimited ? '#94a3b8' : getQuotaColor(storageUser.usage_pct)],
                    ].map(([label, val, sub, color]) => (
                        <div key={label}>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">{label}</p>
                            <p className="text-[12px] font-black mt-0.5" style={{ color: color || '#1e293b' }}>{val}</p>
                            {sub && <p className="text-[9px] text-stone-400">{sub}</p>}
                        </div>
                    ))}
                </div>
            </div>

            {/* Kota düzenleme */}
            {isSuper && (
                editingQuota ? (
                    <QuotaEditor
                        user={storageUser}
                        onSaved={() => { setEditingQuota(false); fetchStorage(); }}
                        onCancel={() => setEditingQuota(false)}
                    />
                ) : (
                    <button
                        onClick={() => setEditingQuota(true)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-stone-200 hover:border-amber-300 hover:bg-amber-50 text-stone-500 hover:text-amber-700 text-[10px] font-bold rounded-lg transition-colors"
                    >
                        <Edit3 size={10} /> Kotayı Düzenle
                    </button>
                )
            )}

            {/* Belgeler */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Folder size={11} /> Belgeler
                        <span className="px-1 py-0.5 bg-stone-100 text-stone-500 rounded text-[9px]">{filteredDocs.length}</span>
                    </p>
                    <button onClick={fetchStorage} className="p-1 text-stone-400 hover:text-[#378ADD] transition-colors">
                        <RefreshCw size={11} />
                    </button>
                </div>

                <div className="flex gap-1.5 mb-2">
                    <div className="relative flex-1">
                        <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input value={docSearch} onChange={e => setDocSearch(e.target.value)}
                            placeholder="Dosya ara..."
                            className="w-full pl-6 pr-2 py-1.5 bg-white border border-stone-200 rounded-md text-[10px] font-medium text-stone-700 focus:outline-none focus:border-[#378ADD]" />
                    </div>
                    <select value={docFilter} onChange={e => setDocFilter(e.target.value)}
                        className="px-2 py-1.5 bg-white border border-stone-200 rounded-md text-[10px] font-bold text-stone-700 focus:outline-none focus:border-[#378ADD] cursor-pointer">
                        <option value="all">Tümü</option>
                        <option value="karantina">Karantina</option>
                        <option value="onaylandi">Onaylanan</option>
                        <option value="arsivde">Arşivde</option>
                        <option value="reddedildi">Reddedilen</option>
                    </select>
                </div>

                <div className="border border-stone-200 rounded-xl overflow-hidden bg-white max-h-[220px] overflow-y-auto [&::-webkit-scrollbar]:hidden">
                    {filteredDocs.length === 0 ? (
                        <div className="text-center py-6">
                            <FileText size={22} strokeWidth={1} className="text-stone-300 mx-auto mb-1.5" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                                {docSearch || docFilter !== 'all' ? 'Eşleşme yok' : 'Henüz belge yok'}
                            </p>
                        </div>
                    ) : (
                        filteredDocs.map(doc => <DocRow key={doc.id} doc={doc} />)
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─── Sağ tık bağlam menüsü ──────────────────────────────────── */
function ContextMenu({ x, y, user, onAkiyaAl, onSil, onKisiltmalar, onClose }) {
    const ref = useRef(null);

    useEffect(() => {
        const close = (e) => {
            if (ref.current && !ref.current.contains(e.target)) onClose();
        };
        const closeKey = (e) => { if (e.key === 'Escape') onClose(); };
        setTimeout(() => {
            document.addEventListener('mousedown', close);
            document.addEventListener('keydown', closeKey);
        }, 0);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', closeKey);
        };
    }, [onClose]);

    // Ekran taşmasını önle
    const MENU_W = 200, MENU_H = 110, GAP = 4;
    const left = x + MENU_W + GAP > window.innerWidth ? x - MENU_W : x + GAP;
    const top  = y + MENU_H + GAP > window.innerHeight ? y - MENU_H : y + GAP;

    return ReactDOM.createPortal(
        <div
            ref={ref}
            className="fixed z-[10000] w-[200px] rounded-xl border border-stone-200 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.15)] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            style={{ left, top }}
        >
            {/* Başlık */}
            <div className="px-3 py-2 border-b border-stone-100 bg-stone-50">
                <p className="text-[11px] font-black text-stone-700 truncate">{user.name || 'Kullanıcı'}</p>
                <p className="text-[9px] text-stone-400 font-mono truncate mt-0.5">{user.email}</p>
            </div>

            {/* Seçenekler */}
            <div className="py-1">
                <button
                    onClick={() => { onAkiyaAl(user); onClose(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-bold text-stone-700 hover:bg-[#378ADD]/10 hover:text-[#378ADD] transition-colors text-left"
                >
                    <BookOpen size={13} strokeWidth={2.5} className="shrink-0" />
                    Akıya Al
                </button>

                <button
                    onClick={() => { onKisiltmalar(user); onClose(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-bold text-stone-700 hover:bg-red-50 hover:text-red-600 transition-colors text-left"
                >
                    <Lock size={13} strokeWidth={2.5} className="shrink-0" />
                    Kısıtlamalar
                </button>

                <div className="mx-2 border-t border-stone-100 my-0.5" />

                <button
                    onClick={() => { onSil(user); onClose(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                    <Trash2 size={13} strokeWidth={2.5} className="shrink-0" />
                    Sil
                </button>
            </div>
        </div>,
        document.body
    );
}

/* ─── Metrik filtre popup (portal) ───────────────────────────── */
function MetricFilterPopup({ metric, anchorRect, pcs, onApply, onClose }) {
    const ref = useRef(null);
    const POPUP_W = 280;
    const margin = 8;
    const left = Math.min(
        anchorRect.left + anchorRect.width / 2 - POPUP_W / 2,
        window.innerWidth - POPUP_W - margin
    );
    const top = anchorRect.bottom + margin;

    const [selectedPcId, setSelectedPcId] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [minTokens, setMinTokens] = useState(0);

    useEffect(() => {
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
        setTimeout(() => document.addEventListener('mousedown', close), 0);
        return () => document.removeEventListener('mousedown', close);
    }, [onClose]);

    const handlePcClick = (pcId) => {
        const next = selectedPcId === pcId ? null : pcId;
        setSelectedPcId(next);
        onApply(next ? { type: 'pc', pcId: next } : null);
    };

    const handleStatusClick = (val) => {
        setStatusFilter(val);
        onApply(val === 'all' ? null : { type: 'status', value: val });
    };

    const handleClear = () => { onApply(null); onClose(); };

    return ReactDOM.createPortal(
        <div ref={ref}
            className="fixed z-[9999] rounded-xl border border-stone-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col"
            style={{ left, top, width: POPUP_W }}>
            <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between bg-stone-50 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <Filter size={12} strokeWidth={2.5} className="text-[#378ADD]" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-stone-600">
                        {metric === 'pcs' ? 'PC Filtresi' : metric === 'tokens' ? 'Token Filtresi' : 'Hesap Durumu'}
                    </span>
                </div>
                <button onClick={onClose} className="text-stone-300 hover:text-stone-500 transition-colors text-lg leading-none">×</button>
            </div>

            <div className="p-4 space-y-3">
                {metric === 'pcs' && (
                    <>
                        <p className="text-[10px] text-stone-400 font-semibold">O PC'de oturum açan kullanıcıları göster</p>
                        <div className="space-y-1 max-h-[180px] overflow-y-auto [&::-webkit-scrollbar]:hidden">
                            {pcs.map(pc => (
                                <button key={pc.pc_id} onClick={() => handlePcClick(pc.pc_id)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold transition-all text-left ${selectedPcId === pc.pc_id ? 'bg-[#378ADD]/10 text-[#378ADD] border border-[#378ADD]/30' : 'bg-stone-50 text-stone-600 border border-stone-100 hover:border-stone-200'}`}>
                                    <Monitor size={11} className="shrink-0" />
                                    <span className="truncate flex-1">{pc.ip || pc.pc_id}</span>
                                    <span className="text-[9px] font-bold text-stone-400">{pc.total_sessions} oturum</span>
                                </button>
                            ))}
                        </div>
                    </>
                )}
                {(metric === 'active' || metric === 'inactive') && (
                    <>
                        <p className="text-[10px] text-stone-400 font-semibold">Hesap durumuna göre filtrele</p>
                        <div className="space-y-1">
                            {[['all', 'Tümü'], ['active', 'Aktif Hesaplar'], ['inactive', 'Pasif Hesaplar']].map(([val, label]) => (
                                <button key={val} onClick={() => handleStatusClick(val)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold transition-all ${statusFilter === val ? 'bg-[#378ADD]/10 text-[#378ADD] border border-[#378ADD]/30' : 'bg-stone-50 text-stone-600 border border-stone-100 hover:border-stone-200'}`}>
                                    {val === 'all' ? <Users size={11} /> : val === 'active' ? <CheckCircle2 size={11} className="text-[#3B6D11]" /> : <WifiOff size={11} className="text-stone-400" />}
                                    {label}
                                </button>
                            ))}
                        </div>
                    </>
                )}
                {metric === 'tokens' && (
                    <>
                        <p className="text-[10px] text-stone-400 font-semibold">Min. token eşiği: <span className="text-[#378ADD] font-black">{fmt(minTokens)}</span></p>
                        <input type="range" min={0} max={50000} step={500} value={minTokens}
                            onChange={e => setMinTokens(Number(e.target.value))}
                            onMouseUp={e => onApply(Number(e.target.value) > 0 ? { type: 'tokens', min: Number(e.target.value) } : null)}
                            onTouchEnd={e => onApply(Number(e.target.value) > 0 ? { type: 'tokens', min: Number(e.target.value) } : null)}
                            className="w-full h-1.5 bg-stone-200 rounded-full appearance-none cursor-pointer accent-[#378ADD]" />
                        <div className="flex justify-between text-[9px] font-bold text-stone-300">
                            <span>0</span><span>50.000</span>
                        </div>
                    </>
                )}
            </div>

            <div className="px-4 pb-4 flex justify-end">
                <button onClick={handleClear}
                    className="px-3 py-2 rounded-lg bg-stone-100 text-stone-500 text-[10px] font-black uppercase tracking-widest hover:bg-stone-200 transition-colors">
                    Temizle
                </button>
            </div>
        </div>,
        document.body
    );
}

/* ─── Metrik Kartı ────────────────────────────────────────────── */
function MetricCard({ icon: Icon, iconColor, label, value, onClick, isActive }) {
    const ref = useRef(null);
    return (
        <button ref={ref} onClick={() => onClick(ref.current?.getBoundingClientRect())}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all cursor-pointer select-none shrink-0 ${isActive
                ? 'bg-[#378ADD]/10 border-[#378ADD]/40 shadow-sm'
                : 'bg-white border-stone-200 hover:border-stone-300 hover:shadow-sm'}`}>
            <div className={`p-1.5 rounded-md ${isActive ? 'bg-[#378ADD]/20' : 'bg-stone-50'}`}>
                <Icon size={13} style={{ color: isActive ? '#378ADD' : iconColor }} strokeWidth={2.5} />
            </div>
            <div className="text-left">
                <p className={`text-[15px] font-black leading-none ${isActive ? 'text-[#378ADD]' : 'text-stone-700'}`}>{value}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mt-0.5">{label}</p>
            </div>
            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#378ADD] ml-1" />}
        </button>
    );
}

/* ─── Kullanıcı Kullanım Görünümü ─────────────────────────────── */
function UserUsageView({ user }) {
    const [usage, setUsage] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUsage = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchWithTimeout(`${API_BASE}/user-usage`);
            const data = await res.json();
            const found = (data.users || []).find(u =>
                u.user_id === user.id || u.email === user.email
            );
            setUsage(found || null);
        } catch (e) {
            console.error('Usage fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, [user.id, user.email]);

    useEffect(() => { fetchUsage(); }, [fetchUsage]);

    if (loading) return (
        <div className="bg-white rounded-xl border border-stone-200 p-8 flex items-center justify-center gap-2 text-stone-400">
            <Activity size={14} className="animate-spin" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Yükleniyor</span>
        </div>
    );

    if (!usage) return (
        <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
            <BarChart2 size={28} strokeWidth={1.5} className="text-stone-300 mx-auto mb-2" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">Bu kullanıcı için kullanım kaydı yok</p>
        </div>
    );

    const stats = [
        { label: 'Toplam İstek', value: fmt(usage.total_requests || 0), icon: Activity, color: '#378ADD' },
        { label: 'Toplam Token', value: fmt(usage.total_tokens || 0), icon: Zap, color: '#7c3aed' },
        { label: 'Toplam Maliyet', value: fmtCost(usage.total_cost || 0), icon: DollarSign, color: '#b91c1c' },
        { label: 'Hatalı İstek', value: fmt(usage.error_count || 0), icon: AlertCircle, color: '#f59e0b' },
    ];

    return (
        <div className="space-y-3">
            {/* Header + Refresh */}
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5">
                    <BarChart2 size={11} /> AI Tüketimi
                </p>
                <button onClick={fetchUsage} className="p-1 text-stone-400 hover:text-[#378ADD] transition-colors" title="Yenile">
                    <RefreshCw size={11} />
                </button>
            </div>

            {/* KPI grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {stats.map(s => (
                    <div key={s.label} className="bg-white rounded-xl border border-stone-200 p-3 shadow-sm">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md" style={{ backgroundColor: s.color + '15' }}>
                                <s.icon size={12} style={{ color: s.color }} strokeWidth={2.5} />
                            </div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">{s.label}</p>
                        </div>
                        <p className="text-[14px] font-black text-stone-700 mt-2">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Modeller */}
            <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2.5 flex items-center gap-1.5">
                    <Sparkles size={11} /> Kullanılan Modeller
                </p>
                {(usage.models_used || []).length === 0 ? (
                    <p className="text-[10px] text-stone-400 font-semibold">Model kaydı yok</p>
                ) : (
                    <div className="flex flex-wrap gap-1.5">
                        {usage.models_used.map(m => (
                            <span key={m}
                                className="px-2 py-1 text-[10px] rounded-md font-bold border"
                                style={{
                                    color: getModelColor(m),
                                    borderColor: `${getModelColor(m)}40`,
                                    backgroundColor: `${getModelColor(m)}10`
                                }}>
                                {m}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Son Aktivite */}
            <div className="bg-white rounded-xl border border-stone-200 p-3 shadow-sm flex items-center gap-3">
                <div className="p-2 bg-stone-50 rounded-lg">
                    <Clock size={13} className="text-stone-500" strokeWidth={2.5} />
                </div>
                <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Son Aktivite</p>
                    <p className="text-[12px] font-bold text-stone-700 mt-0.5">{formatRelativeTime(usage.last_at)}</p>
                </div>
            </div>
        </div>
    );
}

/* ─── Kullanıcı Logları Görünümü ──────────────────────────────── */
function UserLogsView({ user }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [expandedLogId, setExpandedLogId] = useState(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ user_id: user.id, limit: '100' });
            if (statusFilter) params.append('status', statusFilter);
            if (search) params.append('search', search);
            const res = await fetchWithTimeout(`${API_BASE}/logs?${params.toString()}`);
            const data = await res.json();
            setLogs(data.logs || []);
        } catch (e) {
            console.error('Logs fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, [user.id, statusFilter, search]);

    useEffect(() => {
        const t = setTimeout(fetchLogs, 300);
        return () => clearTimeout(t);
    }, [fetchLogs]);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Terminal size={11} /> Sistem Logları
                    <span className="px-1 py-0.5 bg-stone-100 text-stone-500 rounded text-[9px]">{logs.length}</span>
                </p>
                <button onClick={fetchLogs} className="p-1 text-stone-400 hover:text-[#378ADD] transition-colors" title="Yenile">
                    <RefreshCw size={11} />
                </button>
            </div>

            {/* Filtreler */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="İstek/yanıt içinde ara..."
                        className="w-full pl-7 pr-2 py-1.5 bg-white border border-stone-200 rounded-md text-[10px] font-medium text-stone-700 focus:outline-none focus:border-[#378ADD]" />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="px-2 py-1.5 bg-white border border-stone-200 rounded-md text-[10px] font-bold text-stone-700 focus:outline-none focus:border-[#378ADD] cursor-pointer">
                    <option value="">Tüm Durumlar</option>
                    <option value="success">Başarılı</option>
                    <option value="error">Hatalı</option>
                </select>
            </div>

            {/* Log listesi */}
            <div className="border border-stone-200 rounded-xl overflow-hidden bg-white max-h-[420px] overflow-y-auto [&::-webkit-scrollbar]:hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-stone-400">
                        <Activity size={14} className="animate-spin" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Yükleniyor</span>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-8">
                        <Terminal size={24} strokeWidth={1.5} className="text-stone-300 mx-auto mb-2" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                            {search || statusFilter ? 'Eşleşen log yok' : 'Henüz log kaydı yok'}
                        </p>
                    </div>
                ) : (
                    logs.map(log => {
                        const isExpanded = expandedLogId === log.id;
                        const isError = log.status !== 'success';
                        return (
                            <div key={log.id} className="border-b border-stone-50 last:border-0">
                                <button
                                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-stone-50 transition-colors text-left"
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isError ? 'bg-red-400' : 'bg-emerald-400'}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span
                                                className="px-1.5 py-0.5 text-[9px] rounded font-bold border"
                                                style={{
                                                    color: getModelColor(log.model),
                                                    borderColor: `${getModelColor(log.model)}40`,
                                                    backgroundColor: `${getModelColor(log.model)}10`
                                                }}>
                                                {log.model}
                                            </span>
                                            <span className="text-[9px] text-stone-400 font-mono">{formatRelativeTime(log.timestamp)}</span>
                                            {isError && (
                                                <span className="text-[8px] font-bold text-red-600 bg-red-50 px-1 rounded uppercase tracking-wide">
                                                    Hata
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-stone-600 truncate">{truncatedText(log.request, 80) || '—'}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                                        <span className="text-[9px] font-mono font-bold text-stone-700">{fmt(log.totalTokens)}</span>
                                        <span className="text-[9px] font-mono font-bold text-[#b91c1c]">{fmtCost(log.cost)}</span>
                                    </div>
                                    <ChevronRight size={12}
                                        className={`text-stone-300 transition-transform ${isExpanded ? 'rotate-90 text-[#378ADD]' : ''}`} />
                                </button>

                                {/* Expand: detay */}
                                {isExpanded && (
                                    <div className="px-3 pb-3 pt-1 bg-stone-50/60 space-y-2 animate-in slide-in-from-top-1 duration-150">
                                        <div className="grid grid-cols-2 gap-2 text-[9px]">
                                            <div className="bg-white border border-stone-200 rounded-md p-2">
                                                <p className="font-bold text-stone-400 uppercase tracking-widest mb-0.5">Süre</p>
                                                <p className="font-mono font-bold text-stone-700">{fmtMs(log.duration || 0)}</p>
                                            </div>
                                            <div className="bg-white border border-stone-200 rounded-md p-2">
                                                <p className="font-bold text-stone-400 uppercase tracking-widest mb-0.5">Token (P/C)</p>
                                                <p className="font-mono font-bold text-stone-700">{log.promptTokens}/{log.completionTokens}</p>
                                            </div>
                                            <div className="bg-white border border-stone-200 rounded-md p-2">
                                                <p className="font-bold text-stone-400 uppercase tracking-widest mb-0.5">IP</p>
                                                <p className="font-mono font-bold text-stone-700">{log.ip || '—'}</p>
                                            </div>
                                            <div className="bg-white border border-stone-200 rounded-md p-2">
                                                <p className="font-bold text-stone-400 uppercase tracking-widest mb-0.5">Sağlayıcı</p>
                                                <p className="font-mono font-bold text-stone-700">{log.provider || '—'}</p>
                                            </div>
                                        </div>
                                        {log.request && (
                                            <div>
                                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">İstek</p>
                                                <pre className="text-[10px] font-mono text-stone-700 bg-white border border-stone-200 rounded-md p-2 max-h-[120px] overflow-y-auto whitespace-pre-wrap [&::-webkit-scrollbar]:hidden">{log.request}</pre>
                                            </div>
                                        )}
                                        {log.response && (
                                            <div>
                                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">Yanıt</p>
                                                <pre className="text-[10px] font-mono text-stone-700 bg-white border border-stone-200 rounded-md p-2 max-h-[120px] overflow-y-auto whitespace-pre-wrap [&::-webkit-scrollbar]:hidden">{log.response}</pre>
                                            </div>
                                        )}
                                        {log.error && (
                                            <div>
                                                <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest mb-1">Hata</p>
                                                <pre className="text-[10px] font-mono text-red-700 bg-red-50 border border-red-200 rounded-md p-2 whitespace-pre-wrap">{log.error}</pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

/* ─── Profil Görünümü ─────────────────────────────────────────── */
function UserProfileView({ user }) {
    return (
        <div className="space-y-2 max-w-lg">
            <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100 overflow-hidden shadow-sm">
                {[
                    [Mail, 'E-posta', user.email, true],
                    [Shield, 'Rol', user.role],
                    [Building2, 'Departman', user.department || '—'],
                    [Briefcase, 'Pozisyon', user.meta?.position || '—'],
                    [LogIn, 'Son Giriş', user.lastLogin && user.lastLogin !== 'Bilinmiyor' ? formatDate(user.lastLogin) : '—'],
                    [Calendar, 'Kayıt', user.meta?.created_at ? formatDate(user.meta.created_at) : '—'],
                ].map(([Icon, label, val, mono]) => (
                    <div key={label} className="flex items-center justify-between px-4 py-2.5 hover:bg-stone-50">
                        <div className="flex items-center gap-2 text-stone-400 shrink-0">
                            <Icon size={11} />
                            <span className="text-[10px] font-bold">{label}</span>
                        </div>
                        <span className={`text-[10px] font-bold text-stone-700 max-w-[200px] truncate text-right ${mono ? 'font-mono text-stone-600' : ''}`}>{val || '—'}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ─── Oturumlar Görünümü ──────────────────────────────────────── */
function UserSessionsView({ user, pcs, onKick, isSuper, highlightPcId = null }) {
    const userSessions = useMemo(() => {
        const result = [];
        pcs.forEach(pc => {
            pc.sessions.forEach(s => {
                if (s.user?.id === user.id || s.user?.email === user.email)
                    result.push({ ...s, pcIp: pc.ip, pcId: pc.pc_id });
            });
        });
        // Aktif oturumlar önce, sonra başlangıç tarihine göre azalan
        result.sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0) || (b.started || '').localeCompare(a.started || ''));
        return result;
    }, [pcs, user]);

    // Her oturum için log token toplamları
    const [sessionTokens, setSessionTokens] = useState({});
    const [kicking, setKicking] = useState(null);

    useEffect(() => {
        if (!user.id || userSessions.length === 0) return;
        fetchWithTimeout(`${API_BASE}/logs?user_id=${encodeURIComponent(user.id)}&limit=1000`)
            .then(r => r.json())
            .then(data => {
                const totals = {};
                (data.logs || []).forEach(log => {
                    const sid = log.sessionId;
                    if (sid) totals[sid] = (totals[sid] || 0) + (log.totalTokens || 0);
                });
                setSessionTokens(totals);
            })
            .catch(() => {});
    }, [user.id, userSessions.length]); // eslint-disable-line

    const handleKick = async (sess) => {
        if (!window.confirm(`"${user.name}" oturumunu sonlandır?`)) return;
        setKicking(sess.id);
        try {
            await fetch(`${API_BASE}/pcs/${encodeURIComponent(sess.pcId)}/sessions/${encodeURIComponent(sess.id)}`, { method: 'DELETE' });
            onKick();
        } finally {
            setKicking(null);
        }
    };

    return (
        <div className="space-y-2">
            {/* Başlık: toplam oturum sayısı */}
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Monitor size={11} /> Toplam {userSessions.length} Oturum
                </p>
                <div className="flex items-center gap-1.5 text-[9px] text-stone-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75] inline-block" /> Aktif
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-300 inline-block ml-1" /> Pasif
                </div>
            </div>

            {userSessions.length === 0 ? (
                <div className="bg-white rounded-xl border border-stone-200 p-6 text-center">
                    <WifiOff size={22} strokeWidth={1.5} className="text-stone-300 mx-auto mb-2" />
                    <p className="text-[10px] text-stone-400 font-semibold">Oturum kaydı bulunamadı</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
                    {/* Tablo başlığı */}
                    <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto_auto] gap-x-3 px-4 py-2 bg-stone-50 border-b border-stone-100 text-[9px] font-bold uppercase tracking-widest text-stone-400">
                        <span></span>
                        <span>Bilgisayar</span>
                        <span>Giriş</span>
                        <span>Son Aktivite</span>
                        <span className="text-right">Token</span>
                        <span></span>
                    </div>

                    {userSessions.map((sess, idx) => {
                        const tokens = sessionTokens[sess.id] || sessionTokens[sess.tab_id] || 0;
                        const isHighlighted = highlightPcId && (sess.pcId === highlightPcId || sess.pcIp === highlightPcId);
                        return (
                            <div
                                key={sess.id}
                                className={`grid grid-cols-[auto_1fr_1fr_1fr_auto_auto] gap-x-3 items-center px-4 py-2.5 text-[10px] border-b border-stone-50 last:border-0 transition-colors ${
                                    isHighlighted ? 'bg-[#378ADD]/10 border-l-2 border-l-[#378ADD]' :
                                    sess.active ? 'bg-[#1D9E75]/[0.03]' : ''
                                }`}
                            >
                                {/* Durum noktası */}
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sess.active ? 'bg-[#1D9E75] animate-pulse' : 'bg-stone-300'}`} />

                                {/* PC */}
                                <span className="font-bold truncate flex items-center gap-1">
                                    <Monitor size={10} className={`shrink-0 ${isHighlighted ? 'text-[#378ADD]' : 'text-stone-400'}`} />
                                    <span className={isHighlighted ? 'text-[#378ADD]' : 'text-stone-700'}>{sess.pcIp || sess.pcId || '—'}</span>
                                    {isHighlighted && (
                                        <span className="ml-1 px-1 py-0.5 bg-[#378ADD] text-white text-[8px] font-black uppercase tracking-widest rounded shrink-0">seçili</span>
                                    )}
                                </span>

                                {/* Giriş */}
                                <span className="text-stone-500 truncate">
                                    {sess.started ? formatDate(sess.started) : '—'}
                                </span>

                                {/* Son aktivite / çıkış */}
                                <span className={`truncate ${sess.active ? 'text-[#1D9E75] font-bold' : 'text-stone-400'}`}>
                                    {sess.active ? 'Şu an aktif' : (sess.last_active ? formatDate(sess.last_active) : '—')}
                                </span>

                                {/* Token */}
                                <span className={`font-mono font-bold text-right shrink-0 ${tokens > 0 ? 'text-violet-600' : 'text-stone-300'}`}>
                                    {tokens > 0 ? fmt(tokens) : '—'}
                                </span>

                                {/* Kick butonu */}
                                <span className="shrink-0 w-5">
                                    {isSuper && sess.active && (
                                        <button onClick={() => handleKick(sess)} disabled={kicking === sess.id}
                                            className="p-1 rounded text-stone-300 hover:text-red-400 hover:bg-red-50 transition-colors" title="Sonlandır">
                                            {kicking === sess.id ? <Activity size={10} className="animate-spin" /> : <Trash2 size={10} />}
                                        </button>
                                    )}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/* ─── Kullanıcı detayı (sekmeli) ─────────────────────────────── */
function UserDetail({ user, pcs, onKick, isSuper, activeView, onChangeView, highlightPcId = null }) {
    const TABS = [
        { id: 'profile',  label: 'Profil',    icon: User },
        { id: 'sessions', label: 'Oturumlar', icon: Monitor },
        { id: 'storage',  label: 'Depolama',  icon: HardDrive },
        { id: 'usage',    label: 'Kullanım',  icon: BarChart2 },
    ];

    return (
        <div className="border-t border-stone-100 bg-stone-50/60 px-5 py-4 animate-in slide-in-from-top-1 duration-200 space-y-3">

            {/* Sekme bar */}
            <div className="flex items-center gap-1 p-1 bg-white border border-stone-200 rounded-xl shadow-sm w-fit flex-wrap">
                {TABS.map(tab => {
                    const isActive = activeView === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onChangeView(tab.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isActive
                                ? 'bg-[#378ADD] text-white shadow-sm'
                                : 'text-stone-500 hover:bg-stone-50'}`}
                        >
                            <tab.icon size={11} strokeWidth={2.5} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Sekme içeriği */}
            {activeView === 'profile'  && <UserProfileView user={user} />}
            {activeView === 'sessions' && <UserSessionsView user={user} pcs={pcs} onKick={onKick} isSuper={isSuper} highlightPcId={highlightPcId} />}
            {activeView === 'storage'  && <StorageColumn user={user} isSuper={isSuper} />}
            {activeView === 'usage'    && <UserUsageView user={user} />}
        </div>
    );
}

/* ─── Kullanıcı Satırı ────────────────────────────────────────── */
function UserRow({ user, pcs, isExpanded, onToggle, onKick, isSuper, activeView, onChangeView, onQuickOpen, logsOpen, logFilterUser, onSelectLogUser, compact = false, forceExpanded = false, forceView = null, highlightPcId = null, onContextMenu }) {
    const sessionCount = useMemo(() => {
        let c = 0;
        pcs.forEach(pc => pc.sessions.forEach(s => {
            if ((s.user?.id === user.id || s.user?.email === user.email) && s.active) c++;
        }));
        return c;
    }, [pcs, user]);

    const pcCount = useMemo(() => {
        const set = new Set();
        pcs.forEach(pc => pc.sessions.forEach(s => {
            if (s.user?.id === user.id || s.user?.email === user.email) set.add(pc.pc_id);
        }));
        return set.size;
    }, [pcs, user]);

    const handleQuickClick = (e, view) => {
        e.stopPropagation();
        onQuickOpen(user.id, view);
    };

    const isLogFiltered = logFilterUser?.id === user.id;

    const handleRowClick = () => {
        if (logsOpen && onSelectLogUser) {
            onSelectLogUser(isLogFiltered ? null : { id: user.id, name: user.name, email: user.email });
        }
        onToggle();
    };

    return (
        <div className={`bg-white rounded-xl border overflow-hidden shadow-sm transition-all ${
            isLogFiltered ? 'border-[#378ADD] ring-2 ring-[#378ADD]/20' :
            isExpanded && !compact ? 'border-[#378ADD]/40 ring-1 ring-[#378ADD]/10' : 'border-stone-200'
        }`}>
            {/* ── Kompakt satır (loglar açıkken) ── */}
            {compact ? (
                <div
                    onClick={handleRowClick}
                    onContextMenu={(e) => onContextMenu?.(e, user)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors ${isLogFiltered ? 'bg-[#378ADD]/5' : 'hover:bg-stone-50'}`}
                >
                    <div className="relative shrink-0">
                        <Avatar name={user.name} size={28} />
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white"
                            style={{ backgroundColor: user.status === 'Aktif' ? '#1D9E75' : '#94a3b8' }} />
                    </div>
                    <p className={`text-[11px] font-bold truncate flex-1 ${isLogFiltered ? 'text-[#378ADD]' : 'text-stone-700'}`}>
                        {user.name || 'Bilinmeyen'}
                    </p>
                    {isLogFiltered && (
                        <Terminal size={10} className="text-[#378ADD] shrink-0" strokeWidth={2.5} />
                    )}
                </div>
            ) : (
            /* ── Normal satır ── */
            <>
            <div onClick={handleRowClick}
                onContextMenu={(e) => onContextMenu?.(e, user)}
                className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-stone-50/80 transition-colors text-left cursor-pointer">
                <div className="relative shrink-0">
                    <Avatar name={user.name} size={38} />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                        style={{ backgroundColor: user.status === 'Aktif' ? '#1D9E75' : '#94a3b8' }} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-[12px] font-bold truncate ${isExpanded ? 'text-[#378ADD]' : 'text-stone-700'}`}>
                        {user.name || 'Bilinmeyen'}
                    </p>
                    <p className="text-[10px] text-stone-400 truncate font-mono mt-0.5">{user.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={user.status} />
                    {sessionCount > 0 && (
                        <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#378ADD]/10 text-[#378ADD]">
                            <Wifi size={9} />{sessionCount}
                        </span>
                    )}
                    {pcCount > 0 && (
                        <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">
                            <Monitor size={9} />{pcCount}
                        </span>
                    )}
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${user.role === 'Sistem Yöneticisi' ? 'bg-purple-50 text-purple-600' : 'bg-stone-100 text-stone-400'}`}>
                        {user.role === 'Sistem Yöneticisi' ? 'Admin' : 'Kullanıcı'}
                    </span>
                    <div className="flex items-center gap-1 ml-1">
                        {[
                            { view: 'profile',  icon: User,       label: 'Profil' },
                            { view: 'sessions', icon: Monitor,    label: 'Oturumlar' },
                            { view: 'storage',  icon: HardDrive,  label: 'Depolama' },
                            { view: 'usage',    icon: BarChart2,  label: 'Kullanım' },
                        ].map(({ view, icon: Icon, label }) => (
                            <button
                                key={view}
                                onClick={(e) => handleQuickClick(e, view)}
                                title={label}
                                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all border ${isExpanded && activeView === view
                                    ? 'bg-[#378ADD] text-white border-[#378ADD]'
                                    : 'bg-white text-stone-500 border-stone-200 hover:border-[#378ADD] hover:text-[#378ADD]'}`}
                            >
                                <Icon size={11} strokeWidth={2.5} />
                                <span className="hidden lg:inline">{label}</span>
                            </button>
                        ))}
                    </div>
                    {isLogFiltered && (
                        <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#378ADD] text-white shrink-0">
                            <Terminal size={8} strokeWidth={2.5} /> Log
                        </span>
                    )}
                    <ChevronDown size={14}
                        className={`text-stone-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-[#378ADD]' : ''}`} />
                </div>
            </div>
            {(isExpanded || forceExpanded) && (
                <UserDetail
                    user={user} pcs={pcs} onKick={onKick} isSuper={isSuper}
                    activeView={forceExpanded && forceView ? forceView : activeView}
                    onChangeView={onChangeView}
                    highlightPcId={highlightPcId}
                />
            )}
            </>
            )}
        </div>
    );
}

/* ─── Ana Bileşen ─────────────────────────────────────────────── */
export const UsersOverviewTab = React.memo(({ logsOpen = false, onToggleLogs, logFilterUser = null, onSelectLogUser } = {}) => {
    const [users, setUsers] = useState([]);
    const [pcs, setPcs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expandedUserId, setExpandedUserId] = useState(null);
    const [activeView, setActiveView] = useState('profile');
    const [activeFilter, setActiveFilter] = useState(null);
    const [openMetric, setOpenMetric] = useState(null);
    const [contextMenu, setContextMenu] = useState(null); // { x, y, user }
    const [restrictionsUser, setRestrictionsUser] = useState(null);
    const [egitimOpen, setEgitimOpen] = useState(false);
    const [egitimUser, setEgitimUser] = useState(null);

    const isSuper = useMemo(() => {
        try {
            const u = JSON.parse(localStorage.getItem('current_user') || '{}');
            return !!(u.super || u.isSuper);
        } catch { return false; }
    }, []);

    const fetchAll = useCallback(async () => {
        try {
            const [uRes, pRes] = await Promise.all([
                fetchWithTimeout(`${AUTH_BASE}/users`),
                fetchWithTimeout(`${API_BASE}/pcs`),
            ]);
            const [uData, pData] = await Promise.all([uRes.json(), pRes.json()]);
            setUsers(uData || []);
            setPcs(pData.pcs || []);
        } catch (e) {
            console.error('Fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
        const t = setInterval(fetchAll, POLL_MS);
        return () => clearInterval(t);
    }, []); // eslint-disable-line

    const totalPcs = pcs.length;
    const totalActiveSessions = pcs.reduce((s, p) => s + (p.active_count || 0), 0);
    const totalActiveUsers = users.filter(u => u.status === 'Aktif').length;
    const totalInactiveUsers = users.filter(u => u.status !== 'Aktif').length;

    const applyMetricFilter = useCallback((list) => {
        if (!activeFilter) return list;
        if (activeFilter.type === 'pc' && activeFilter.pcId) {
            const pc = pcs.find(p => p.pc_id === activeFilter.pcId);
            if (!pc) return list;
            const emails = new Set(pc.sessions.map(s => s.user?.email).filter(Boolean));
            return list.filter(u => emails.has(u.email));
        }
        if (activeFilter.type === 'status') {
            if (activeFilter.value === 'active') return list.filter(u => u.status === 'Aktif');
            if (activeFilter.value === 'inactive') return list.filter(u => u.status !== 'Aktif');
        }
        if (activeFilter.type === 'tokens') {
            return list.filter(u => (u.totalTokens || 0) >= activeFilter.min);
        }
        return list;
    }, [activeFilter, pcs]);

    const filteredUsers = useMemo(() => {
        let list = users;
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(u =>
                (u.name || '').toLowerCase().includes(q) ||
                (u.email || '').toLowerCase().includes(q) ||
                (u.department || '').toLowerCase().includes(q) ||
                (u.role || '').toLowerCase().includes(q)
            );
        }
        return applyMetricFilter(list);
    }, [users, search, applyMetricFilter]);

    const handleContextMenu = (e, user) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, user });
    };

    const handleAkiyaAl = (user) => {
        setEgitimUser(user);
        setEgitimOpen(true);
    };

    const handleSilUser = async (user) => {
        if (!window.confirm(`"${user.name}" kullanıcısını silmek istediğinize emin misiniz?`)) return;
        try {
            const res = await fetch(`/api/auth/users/${encodeURIComponent(user.id)}`, { method: 'DELETE' });
            if (res.ok) {
                setUsers(prev => prev.filter(u => u.id !== user.id));
                if (expandedUserId === user.id) setExpandedUserId(null);
            }
        } catch (e) {
            console.error('Silme hatası:', e);
        }
    };

    const handleMetricClick = (metric, rect) => {
        setOpenMetric(openMetric?.metric === metric ? null : { metric, rect });
    };
    const isMetricActive = (metric) => activeFilter?.sourceMetric === metric;

    return (
        <div className="flex flex-col w-full h-full bg-stone-50 overflow-hidden select-none animate-in fade-in duration-300">

            {/* ── Metrik şeridi ── */}
            <div className="shrink-0 px-6 py-4 bg-white border-b border-stone-200 shadow-sm">
                <div className="flex items-center gap-3 flex-wrap">
                    <MetricCard icon={Monitor} iconColor="#378ADD" label="Kayıtlı PC" value={totalPcs}
                        isActive={isMetricActive('pcs')} onClick={(rect) => handleMetricClick('pcs', rect)} />
                    <MetricCard icon={Wifi} iconColor="#1D9E75" label="Aktif Oturum" value={totalActiveSessions}
                        isActive={isMetricActive('active_sessions')} onClick={(rect) => handleMetricClick('active_sessions', rect)} />

                    <div className="flex-1 min-w-[180px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={13} />
                            <input
                                className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-[12px] font-medium text-stone-700 placeholder:text-stone-400 focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD] transition-all"
                                placeholder="İsim, e-posta, departman..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </div>

                    <MetricCard icon={CheckCircle2} iconColor="#3B6D11" label="Aktif Kullanıcı" value={totalActiveUsers}
                        isActive={isMetricActive('active')} onClick={(rect) => handleMetricClick('active', rect)} />
                    <MetricCard icon={WifiOff} iconColor="#94a3b8" label="Pasif Kullanıcı" value={totalInactiveUsers}
                        isActive={isMetricActive('inactive')} onClick={(rect) => handleMetricClick('inactive', rect)} />

                    <button onClick={fetchAll}
                        className="p-2.5 rounded-xl border border-stone-200 bg-white text-stone-400 hover:text-[#378ADD] hover:border-[#378ADD]/40 transition-colors" title="Yenile">
                        <RefreshCw size={14} />
                    </button>

                    {activeFilter && (
                        <button onClick={() => setActiveFilter(null)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-[#378ADD]/10 text-[#378ADD] rounded-xl text-[10px] font-black uppercase tracking-widest border border-[#378ADD]/20 hover:bg-[#378ADD]/20 transition-colors">
                            <Filter size={10} strokeWidth={2.5} /> Filtre Aktif <X size={10} />
                        </button>
                    )}

                    {/* Sistem Logları butonu — en sağ */}
                    {onToggleLogs && (
                        <button
                            onClick={onToggleLogs}
                            title="Sistem Logları"
                            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ml-auto shrink-0 ${logsOpen
                                ? 'bg-[#378ADD] text-white border-[#378ADD] shadow-sm'
                                : 'bg-white text-stone-500 border-stone-200 hover:border-[#378ADD] hover:text-[#378ADD]'}`}
                        >
                            <Terminal size={13} strokeWidth={2.5} />
                            Sistem Logları
                        </button>
                    )}
                </div>
            </div>

            {/* ── Kullanıcı Listesi ── */}
            <div className="flex-1 overflow-y-auto p-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-3 opacity-60">
                        <Activity className="animate-spin text-stone-400" size={22} />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Yükleniyor</span>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-3 opacity-60">
                        <Users size={28} strokeWidth={1} className="text-stone-400" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                            {search || activeFilter ? 'Eşleşen kullanıcı yok' : 'Kullanıcı bulunamadı'}
                        </span>
                    </div>
                ) : (
                    <div className="space-y-2 max-w-6xl mx-auto">
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">
                            {filteredUsers.length} kullanıcı
                            {(search || activeFilter) && ` (${users.length} içinden)`}
                        </p>
                        {filteredUsers.map(user => (
                            <UserRow
                                key={user.id}
                                user={user}
                                pcs={pcs}
                                isExpanded={expandedUserId === user.id}
                                onToggle={() => {
                                    if (expandedUserId === user.id) {
                                        setExpandedUserId(null);
                                    } else {
                                        setExpandedUserId(user.id);
                                        setActiveView('profile');
                                    }
                                }}
                                onKick={fetchAll}
                                isSuper={isSuper}
                                activeView={expandedUserId === user.id ? activeView : 'overview'}
                                onChangeView={setActiveView}
                                onQuickOpen={(id, view) => {
                                    setExpandedUserId(id);
                                    setActiveView(view);
                                }}
                                logsOpen={logsOpen}
                                logFilterUser={logFilterUser}
                                onSelectLogUser={onSelectLogUser}
                                compact={logsOpen}
                                forceExpanded={activeFilter?.type === 'pc'}
                                forceView={activeFilter?.type === 'pc' ? 'sessions' : null}
                                highlightPcId={activeFilter?.type === 'pc' ? activeFilter.pcId : null}
                                onContextMenu={handleContextMenu}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Metrik filtre popupı ── */}
            {openMetric && (
                <MetricFilterPopup
                    metric={openMetric.metric}
                    anchorRect={openMetric.rect}
                    pcs={pcs}
                    onApply={(filter) => setActiveFilter(filter ? { ...filter, sourceMetric: openMetric.metric } : null)}
                    onClose={() => setOpenMetric(null)}
                />
            )}

            {/* ── Sağ tık bağlam menüsü ── */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    user={contextMenu.user}
                    onAkiyaAl={handleAkiyaAl}
                    onSil={handleSilUser}
                    onKisiltmalar={(u) => setRestrictionsUser(u)}
                    onClose={() => setContextMenu(null)}
                />
            )}

            {/* ── Kısıtlamalar Modalı ── */}
            {restrictionsUser && (
                <RestrictionsModal
                    userId={restrictionsUser.id}
                    userName={restrictionsUser.name}
                    onClose={() => setRestrictionsUser(null)}
                />
            )}

            {/* ── Eğitim Akıya Al slide-over ── */}
            <EgitimAcmaSlideOver
                open={egitimOpen}
                onClose={() => { setEgitimOpen(false); setEgitimUser(null); }}
                defaultUser={egitimUser}
            />
        </div>
    );
});
