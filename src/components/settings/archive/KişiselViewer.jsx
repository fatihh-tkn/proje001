import React, { useState, useEffect, useCallback } from 'react';
import {
    User, Search, X, Star, Calendar, Tag, Plus, FolderPlus,
    Loader2, Grid, List, Download, FolderOpen
} from 'lucide-react';
import { useWorkspaceStore } from '../../../store/workspaceStore';

/* ── Uzantı renk haritası ────────────────────────────────────────── */
const EXT_COLORS = {
    pdf:  { bg: '#fef2f2', line: '#fca5a5', badge: '#ef4444' },
    doc:  { bg: '#eff6ff', line: '#93c5fd', badge: '#3b82f6' },
    docx: { bg: '#eff6ff', line: '#93c5fd', badge: '#3b82f6' },
    xls:  { bg: '#f0fdf4', line: '#86efac', badge: '#22c55e' },
    xlsx: { bg: '#f0fdf4', line: '#86efac', badge: '#22c55e' },
    csv:  { bg: '#ecfdf5', line: '#6ee7b7', badge: '#10b981' },
    ppt:  { bg: '#fff7ed', line: '#fdba74', badge: '#f97316' },
    pptx: { bg: '#fff7ed', line: '#fdba74', badge: '#f97316' },
    txt:  { bg: '#f8fafc', line: '#cbd5e1', badge: '#94a3b8' },
    md:   { bg: '#f8fafc', line: '#cbd5e1', badge: '#94a3b8' },
    png:  { bg: '#faf5ff', line: '#c4b5fd', badge: '#8b5cf6' },
    jpg:  { bg: '#faf5ff', line: '#c4b5fd', badge: '#8b5cf6' },
    jpeg: { bg: '#faf5ff', line: '#c4b5fd', badge: '#8b5cf6' },
    mp3:  { bg: '#fffbeb', line: '#fde68a', badge: '#f59e0b' },
    wav:  { bg: '#fffbeb', line: '#fde68a', badge: '#f59e0b' },
    mp4:  { bg: '#fdf2f8', line: '#f0abfc', badge: '#d946ef' },
    mov:  { bg: '#fdf2f8', line: '#f0abfc', badge: '#d946ef' },
    bpmn: { bg: '#f0fdfa', line: '#6ee7b7', badge: '#14b8a6' },
};
const _defC = { bg: '#fffbeb', line: '#fcd34d', badge: '#f59e0b' };
const extColors = ext => EXT_COLORS[(ext || '').toLowerCase()] || _defC;

function fmtSize(bytes) {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function fmtDate(str) {
    return new Date(str).toLocaleDateString('tr', { day: '2-digit', month: 'short', year: 'numeric' });
}
function relTime(str) {
    if (!str) return '—';
    const diff  = Date.now() - new Date(str).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days  = Math.floor(hours / 24);
    if (mins  <  1) return 'Az önce';
    if (mins  < 60) return `${mins} dk önce`;
    if (hours < 24) return `${hours} saat önce`;
    if (days  <  7) return `${days} gün önce`;
    return fmtDate(str);
}

/* ── Önizleme ────────────────────────────────────────────────────── */
function DocPreview({ ext }) {
    const c = extColors(ext);
    return (
        <div className="w-full h-full flex items-center justify-center relative px-6" style={{ background: c.bg }}>
            <div className="flex flex-col gap-2 w-full max-w-[120px]">
                {[100, 85, 95, 70, 88].map((w, i) => (
                    <div key={i} className="h-[5px] rounded-full" style={{ background: c.line, width: `${w}%`, opacity: 0.65 + i * 0.07 }} />
                ))}
            </div>
            <span className="absolute bottom-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded text-white tracking-wide" style={{ background: c.badge }}>
                {(ext || 'DOC').toUpperCase()}
            </span>
        </div>
    );
}

/* ── Grid kartı ──────────────────────────────────────────────────── */
function PersonalCard({ item }) {
    const ext   = (item.file_type || '').toLowerCase();
    const title = item.filename.replace(/\.[^.]+$/, '');
    const size  = fmtSize(item.file_size || item.meta?.size);
    const date  = fmtDate(item.created_at);

    return (
        <div className="group bg-white border border-stone-200 rounded-xl overflow-hidden hover:border-violet-200 hover:shadow-md transition-all cursor-pointer">
            <div className="h-[110px]">
                <DocPreview ext={ext} />
            </div>
            <div className="px-4 py-3">
                <div className="flex items-start gap-2 min-w-0">
                    <User size={13} className="text-violet-500 shrink-0 mt-0.5" />
                    <span className="text-[13px] font-bold text-stone-800 truncate leading-tight">{title}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-stone-400 font-medium">
                    <span className="uppercase font-black text-stone-300">{ext}</span>
                    {size && <><span className="text-stone-200">·</span><span>{size}</span></>}
                    <span className="text-stone-200">·</span>
                    <span>{date}</span>
                </div>
            </div>
        </div>
    );
}

/* ── Liste başlık + satır ────────────────────────────────────────── */
const P_LIST_COLS = 'grid gap-3 items-center text-[10px]';
const P_GRID_COLS = { gridTemplateColumns: 'minmax(0,1fr) 100px 120px minmax(0,160px) 76px 110px 90px 32px' };

function PersonalListHeader() {
    return (
        <div className={`${P_LIST_COLS} px-4 py-2 text-stone-400 font-black tracking-widest uppercase border-b border-stone-100`} style={P_GRID_COLS}>
            <span>AD</span>
            <span>KLASÖR</span>
            <span>YAZAR</span>
            <span>ETİKETLER</span>
            <span>BOYUT</span>
            <span>TARİH</span>
            <span>ERİŞİM</span>
            <span />
        </div>
    );
}

function PersonalRow({ item }) {
    const ext    = (item.file_type || '').toLowerCase();
    const c      = extColors(ext);
    const title  = item.filename.replace(/\.[^.]+$/, '');
    const klasor = item.folder_name || item.parent_name || item.meta?.category || item.meta?.folder || '—';
    const yazar  = item.uploader_name || item.uploaded_by_name || item.meta?.uploader || item.meta?.author || item.meta?.yazar || '—';
    const tags   = Array.isArray(item.etiketler) ? item.etiketler : [];
    const size   = fmtSize(item.file_size || item.meta?.size) || '—';
    const tarih  = fmtDate(item.created_at);
    const erisim = relTime(item.updated_at || item.accessed_at || item.created_at);

    return (
        <div className={`${P_LIST_COLS} px-4 py-2.5 bg-white hover:bg-stone-50 border-b border-stone-100 transition-colors cursor-pointer group`} style={P_GRID_COLS}>
            <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded text-white" style={{ background: c.badge }}>
                    {ext.toUpperCase().slice(0, 4)}
                </span>
                <span className="text-[12px] font-semibold text-stone-800 truncate">{title}</span>
            </div>
            <span className="text-[11px] text-stone-500 truncate">{klasor}</span>
            <span className="text-[11px] text-stone-500 truncate">{yazar}</span>
            <div className="flex items-center gap-1 flex-wrap">
                {tags.length > 0 ? tags.slice(0, 3).map((t, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-violet-50 text-violet-500 text-[9px] font-bold rounded-md">{t}</span>
                )) : <span className="text-stone-300">—</span>}
            </div>
            <span className="text-[11px] text-stone-500">{size}</span>
            <span className="text-[11px] text-violet-500 font-semibold">{tarih}</span>
            <span className="text-[11px] text-stone-400">{erisim}</span>
            <a
                href={`/api/archive/download/${item.id}`}
                onClick={e => e.stopPropagation()}
                className="flex items-center justify-center p-1 rounded text-stone-300 hover:text-violet-500 hover:bg-violet-50 transition-all opacity-0 group-hover:opacity-100"
            >
                <Download size={12} />
            </a>
        </div>
    );
}

/* ── Filtreler ───────────────────────────────────────────────────── */
const FILTERS = [
    { key: 'all',     label: 'Tümü'         },
    { key: 'recent',  label: 'Son Erişilen'  },
    { key: 'starred', label: 'Yıldızlı',   icon: Star     },
    { key: 'last30',  label: 'Son 30 gün', icon: Calendar },
    { key: 'tagged',  label: 'Etiketler',  icon: Tag      },
];

/* ── Ana bileşen ─────────────────────────────────────────────────── */
export default function KişiselViewer() {
    const currentUser = useWorkspaceStore(s => s.currentUser);
    const [items,   setItems]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [search,  setSearch]  = useState('');
    const [filter,  setFilter]  = useState('all');
    const [view,    setView]    = useState('grid');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/archive/list');
            if (res.ok) {
                const data = await res.json();
                const uid = currentUser?.id;
                const personal = (data.items || [])
                    .filter(i => i.file_type !== 'folder' && (
                        !uid || i.uploaded_by === uid || i.user_id === uid || i.created_by === uid
                    ))
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                setItems(personal);
            }
        } catch {}
        finally { setLoading(false); }
    }, [currentUser]);

    useEffect(() => { load(); }, [load]);

    const filtered = items.filter(i => {
        const title = i.filename.replace(/\.[^.]+$/, '').toLowerCase();
        if (search.trim() && !title.includes(search.toLowerCase())) return false;
        if (filter === 'last30')  return Date.now() - new Date(i.created_at).getTime() < 30 * 864e5;
        if (filter === 'starred') return i.is_starred || i.meta?.starred;
        if (filter === 'tagged')  return (i.etiketler || []).length > 0;
        return true;
    });

    return (
        <div className="flex flex-col h-full w-full bg-stone-50 font-sans overflow-hidden">

            {/* ── BAŞLIK ──────────────────────────────────────── */}
            <div className="flex-none bg-white border-b border-stone-200">
                <div className="flex items-center justify-between gap-4 px-7 pt-6 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-violet-500/10 rounded-2xl shrink-0">
                            <User size={22} className="text-violet-600" strokeWidth={2} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-[20px] font-black text-stone-900 tracking-tight">Kişisel</h1>
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-stone-800 text-stone-300 text-[10px] font-semibold rounded-full">
                                        <svg width="9" height="10" viewBox="0 0 9 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 opacity-70">
                                            <rect x="1" y="4" width="7" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.2"/>
                                            <path d="M2.5 4V3a2 2 0 1 1 4 0v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                                        </svg>
                                        Yalnızca sen görebilirsin
                                    </span>
                                <span className="text-[11px] font-bold bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full tabular-nums">
                                    {items.length}
                                </span>
                            </div>
                            <p className="text-[11px] text-stone-400 font-medium mt-0.5">
                                Size ait belgeler ve dosyalar
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 text-stone-600 text-[12px] font-bold rounded-xl hover:bg-stone-200 transition-colors">
                            <FolderPlus size={14} /> Klasör
                        </button>
                        <button className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-[12px] font-bold rounded-xl hover:bg-violet-700 transition-colors">
                            <Plus size={14} /> Yükle
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3 px-7 pb-4">
                    <div className="relative w-[340px] shrink-0">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="kişisel dosyalarında ara — dosya adı, etiket..."
                            className="w-full pl-8 pr-10 py-2 bg-stone-50 border border-stone-200 rounded-lg text-[11px] text-stone-700 placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-violet-400 focus:ring-1 focus:ring-violet-400/20 transition-all"
                        />
                        {search ? (
                            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                                <X size={11} />
                            </button>
                        ) : (
                            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-stone-400 bg-stone-100 border border-stone-200 rounded px-1 py-px pointer-events-none select-none">⌘K</kbd>
                        )}
                    </div>

                    <div className="flex items-center gap-0.5 ml-auto">
                        {FILTERS.map(f => (
                            <React.Fragment key={f.key}>
                                {f.key === 'last30' && <div className="w-px h-4 bg-stone-200 mx-1 shrink-0" />}
                                <button
                                    onClick={() => setFilter(f.key)}
                                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all shrink-0
                                        ${filter === f.key ? 'bg-violet-500/10 text-violet-600' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100'}`}
                                >
                                    {f.icon && <f.icon size={11} strokeWidth={2} />}
                                    {f.label}
                                    {f.key === 'all' && (
                                        <span className={`text-[10px] font-bold tabular-nums ${filter === 'all' ? 'text-violet-600' : 'text-stone-400'}`}>
                                            {items.length}
                                        </span>
                                    )}
                                </button>
                            </React.Fragment>
                        ))}
                        <div className="w-px h-4 bg-stone-200 mx-1 shrink-0" />
                        <button onClick={() => setView('list')} className={`p-1.5 rounded-lg transition-all ${view === 'list' ? 'bg-stone-100 text-stone-700' : 'text-stone-400 hover:bg-stone-100'}`}><List size={14} /></button>
                        <button onClick={() => setView('grid')} className={`p-1.5 rounded-lg transition-all ${view === 'grid' ? 'bg-stone-100 text-stone-700' : 'text-stone-400 hover:bg-stone-100'}`}><Grid size={14} /></button>
                    </div>
                </div>
            </div>

            {/* ── İÇERİK ───────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-6 minimal-scroll">
                {loading ? (
                    <div className="flex items-center justify-center h-48 gap-2 text-stone-400">
                        <Loader2 size={20} className="animate-spin text-violet-500" />
                        <span className="text-[12px] font-medium">Yükleniyor...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3">
                        <FolderOpen size={36} strokeWidth={1} className="text-stone-300" />
                        <p className="text-[12px] font-semibold text-stone-400">
                            {search ? 'Eşleşen dosya bulunamadı' : 'Henüz kişisel dosyanız yok'}
                        </p>
                    </div>
                ) : view === 'grid' ? (
                    <div className="grid grid-cols-2 gap-4 xl:grid-cols-3 2xl:grid-cols-4">
                        {filtered.map(item => <PersonalCard key={item.id} item={item} />)}
                    </div>
                ) : (
                    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                        <PersonalListHeader />
                        {filtered.map(item => <PersonalRow key={item.id} item={item} />)}
                    </div>
                )}
            </div>
        </div>
    );
}
