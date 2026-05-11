import React, { useState, useEffect, useCallback } from 'react';
import {
    GitBranch, Search, X, Star, Calendar, Tag, Plus, FolderPlus,
    Loader2, Grid, List
} from 'lucide-react';

/* ── BPMN önizleme SVG ───────────────────────────────────────────── */
const BpmnPreview = () => (
    <svg viewBox="0 0 300 72" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {/* Start */}
        <circle cx="20" cy="36" r="12" fill="none" stroke="#10b981" strokeWidth="1.8" />
        {/* → */}
        <line x1="33" y1="36" x2="52" y2="36" stroke="#4b5563" strokeWidth="1.4" />
        <polygon points="52,32 60,36 52,40" fill="#4b5563" />
        {/* Task: Talep */}
        <rect x="60" y="20" width="58" height="32" rx="4" fill="none" stroke="#10b981" strokeWidth="1.5" />
        <text x="89" y="40" textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="700">Talep</text>
        {/* → */}
        <line x1="118" y1="36" x2="134" y2="36" stroke="#4b5563" strokeWidth="1.4" />
        <polygon points="134,32 142,36 134,40" fill="#4b5563" />
        {/* Gateway diamond */}
        <polygon points="154,18 174,36 154,54 134,36" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
        {/* → */}
        <line x1="174" y1="36" x2="190" y2="36" stroke="#4b5563" strokeWidth="1.4" />
        <polygon points="190,32 198,36 190,40" fill="#4b5563" />
        {/* Task: Onay */}
        <rect x="198" y="20" width="58" height="32" rx="4" fill="none" stroke="#10b981" strokeWidth="1.5" />
        <text x="227" y="40" textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="700">Onay</text>
        {/* → */}
        <line x1="256" y1="36" x2="272" y2="36" stroke="#4b5563" strokeWidth="1.4" />
        <polygon points="272,32 280,36 272,40" fill="#4b5563" />
        {/* End */}
        <circle cx="288" cy="36" r="10" fill="none" stroke="#10b981" strokeWidth="1.8" />
        <circle cx="288" cy="36" r="5.5" fill="#10b981" />
    </svg>
);

/* ── Durum badge ─────────────────────────────────────────────────── */
const STATUS = {
    aktif:       { label: 'AKTİF',       cls: 'bg-emerald-500/15 text-emerald-600 border border-emerald-400/30' },
    incelemede:  { label: 'İNCELEMEDE',  cls: 'bg-amber-500/15 text-amber-600 border border-amber-400/30'       },
    taslak:      { label: 'TASLAK',      cls: 'bg-stone-400/15 text-stone-500 border border-stone-300'          },
};

/* ── Grid kartı ──────────────────────────────────────────────────── */
function ProcessCard({ item }) {
    const title    = item.filename.replace(/\.[^.]+$/, '');
    const meta     = item.meta || {};
    const stKey    = (meta.status || 'taslak').toLowerCase().replace(/\s+/g, '');
    const st       = STATUS[stKey] || STATUS.taslak;
    const category = meta.category || meta.kategori || '';
    const version  = meta.version  || meta.versiyon  || '';
    const steps    = meta.steps    || meta.adim_sayisi || '';

    return (
        <div className="group bg-white border border-stone-200 rounded-xl overflow-hidden hover:border-stone-300 hover:shadow-md transition-all cursor-pointer">
            <div className="h-[120px] bg-[#0f172a] flex items-center justify-center px-6 relative overflow-hidden">
                <div className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #334155 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                <BpmnPreview />
            </div>
            <div className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <GitBranch size={13} className="text-teal-500 shrink-0" />
                        <span className="text-[13px] font-bold text-stone-800 truncate">{title}</span>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md tracking-wide shrink-0 ${st.cls}`}>
                        {st.label}
                    </span>
                </div>
                {(category || version || steps) && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-stone-400 font-medium">
                        {[category, version, steps && `${steps} adım`].filter(Boolean).map((part, i, arr) => (
                            <React.Fragment key={i}>
                                <span>{part}</span>
                                {i < arr.length - 1 && <span className="text-stone-300">·</span>}
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Liste satırı ────────────────────────────────────────────────── */
function ProcessRow({ item }) {
    const title    = item.filename.replace(/\.[^.]+$/, '');
    const meta     = item.meta || {};
    const stKey    = (meta.status || 'taslak').toLowerCase().replace(/\s+/g, '');
    const st       = STATUS[stKey] || STATUS.taslak;
    const category = meta.category || meta.kategori || '';
    const version  = meta.version  || meta.versiyon  || '';
    const steps    = meta.steps    || meta.adim_sayisi || '';

    return (
        <div className="flex items-center gap-4 px-4 py-3 bg-white border border-stone-200 rounded-xl hover:border-stone-300 hover:shadow-sm transition-all cursor-pointer">
            <div className="w-10 h-10 bg-teal-500/10 rounded-xl flex items-center justify-center shrink-0">
                <GitBranch size={18} className="text-teal-600" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-stone-800 truncate">{title}</p>
                {(category || version || steps) && (
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-stone-400 font-medium">
                        {[category, version, steps && `${steps} adım`].filter(Boolean).map((part, i, arr) => (
                            <React.Fragment key={i}>
                                <span>{part}</span>
                                {i < arr.length - 1 && <span className="text-stone-300">·</span>}
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </div>
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md tracking-wide shrink-0 ${st.cls}`}>
                {st.label}
            </span>
        </div>
    );
}

/* ── Filtreler ───────────────────────────────────────────────────── */
const FILTERS = [
    { key: 'all',     label: 'Tümü'         },
    { key: 'recent',  label: 'Son Erişilen'  },
    { key: 'mine',    label: 'Yazarım'       },
    { key: 'starred', label: 'Yıldızlı',   icon: Star     },
    { key: 'last30',  label: 'Son 30 gün', icon: Calendar },
    { key: 'tagged',  label: 'Etiketler',  icon: Tag      },
];

/* ── Ana bileşen ─────────────────────────────────────────────────── */
export default function SüreçlerViewer() {
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
                const wf = (data.items || [])
                    .filter(i => i.file_type !== 'folder' && (i.file_type || '').toLowerCase() === 'bpmn')
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                setItems(wf);
            }
        } catch {}
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = items.filter(i => {
        const title = i.filename.replace(/\.[^.]+$/, '').toLowerCase();
        if (search.trim() && !title.includes(search.toLowerCase())) return false;
        if (filter === 'last30')   return Date.now() - new Date(i.created_at).getTime() < 30 * 864e5;
        if (filter === 'starred')  return i.is_starred || i.meta?.starred;
        if (filter === 'tagged')   return (i.etiketler || []).length > 0;
        return true;
    });

    return (
        <div className="flex flex-col h-full w-full bg-stone-50 font-sans overflow-hidden">

            {/* ── TAM GENİŞLİK BAŞLIK ─────────────────────────── */}
            <div className="flex-none bg-white border-b border-stone-200">

                {/* Üst satır */}
                <div className="flex items-center justify-between gap-4 px-7 pt-6 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-teal-500/10 rounded-2xl shrink-0">
                            <GitBranch size={22} className="text-teal-600" strokeWidth={2} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-[20px] font-black text-stone-900 tracking-tight">Süreçler</h1>
                                <span className="text-[11px] font-bold bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full tabular-nums">
                                    {items.length}
                                </span>
                            </div>
                            <p className="text-[11px] text-stone-400 font-medium mt-0.5">
                                İş akışları ve BPMN diyagramları
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 text-stone-600 text-[12px] font-bold rounded-xl hover:bg-stone-200 transition-colors">
                            <FolderPlus size={14} /> Klasör
                        </button>
                        <button className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-[12px] font-bold rounded-xl hover:bg-teal-700 transition-colors">
                            <Plus size={14} /> Yeni BPMN
                        </button>
                    </div>
                </div>

                {/* Alt satır: arama + filtreler */}
                <div className="flex items-center gap-3 px-7 pb-4">
                    <div className="relative w-[340px] shrink-0">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="süreçler içinde ara — anahtar kelime, etiket, yazar..."
                            className="w-full pl-8 pr-10 py-2 bg-stone-50 border border-stone-200 rounded-lg text-[11px] text-stone-700 placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all"
                        />
                        {search ? (
                            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                                <X size={11} />
                            </button>
                        ) : (
                            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-stone-400 bg-stone-100 border border-stone-200 rounded px-1 py-px pointer-events-none select-none">
                                ⌘K
                            </kbd>
                        )}
                    </div>

                    <div className="flex items-center gap-0.5 ml-auto">
                        {FILTERS.map(f => (
                            <React.Fragment key={f.key}>
                                {f.key === 'last30' && <div className="w-px h-4 bg-stone-200 mx-1 shrink-0" />}
                                <button
                                    onClick={() => setFilter(f.key)}
                                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all shrink-0
                                        ${filter === f.key
                                            ? 'bg-teal-500/10 text-teal-600'
                                            : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100'}`}
                                >
                                    {f.icon && <f.icon size={11} strokeWidth={2} />}
                                    {f.label}
                                    {f.key === 'all' && (
                                        <span className={`text-[10px] font-bold tabular-nums ${filter === 'all' ? 'text-teal-600' : 'text-stone-400'}`}>
                                            {items.length}
                                        </span>
                                    )}
                                </button>
                            </React.Fragment>
                        ))}

                        <div className="w-px h-4 bg-stone-200 mx-1 shrink-0" />

                        <button
                            onClick={() => setView('list')}
                            className={`p-1.5 rounded-lg transition-all ${view === 'list' ? 'bg-stone-100 text-stone-700' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'}`}
                        >
                            <List size={14} />
                        </button>
                        <button
                            onClick={() => setView('grid')}
                            className={`p-1.5 rounded-lg transition-all ${view === 'grid' ? 'bg-stone-100 text-stone-700' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'}`}
                        >
                            <Grid size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── İÇERİK ───────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-6 minimal-scroll">
                {loading ? (
                    <div className="flex items-center justify-center h-48 gap-2 text-stone-400">
                        <Loader2 size={20} className="animate-spin text-teal-500" />
                        <span className="text-[12px] font-medium">Yükleniyor...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3">
                        <GitBranch size={36} strokeWidth={1} className="text-stone-300" />
                        <p className="text-[12px] font-semibold text-stone-400">
                            {search ? 'Eşleşen süreç bulunamadı' : 'Henüz BPMN süreci yok'}
                        </p>
                    </div>
                ) : view === 'grid' ? (
                    <div className="grid grid-cols-2 gap-4 xl:grid-cols-3 2xl:grid-cols-4">
                        {filtered.map(item => <ProcessCard key={item.id} item={item} />)}
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {filtered.map(item => <ProcessRow key={item.id} item={item} />)}
                    </div>
                )}
            </div>
        </div>
    );
}
