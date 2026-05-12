import { useState, useEffect, useRef, useCallback } from 'react';
import {
    FolderOpen, Activity, AlertTriangle, Zap,
    Clock, RefreshCw, Filter, FileText,
    Plus, X, FolderSearch, Loader2
} from 'lucide-react';

/* ── Helpers ──────────────────────────────────────────────────────── */

function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const u = ['B', 'KB', 'MB', 'GB'];
    let i = 0; let v = bytes;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(i === 0 ? 0 : 2)} ${u[i]}`;
}

function formatRelTime(ts) {
    if (!ts) return '—';
    const diff = Math.floor(Date.now() / 1000 - ts);
    if (diff < 60)    return `${diff} sn önce`;
    if (diff < 3600)  return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
    return `${Math.floor(diff / 86400)} gün önce`;
}

function formatClock(ts) {
    if (!ts) return '';
    return new Date(ts * 1000).toLocaleTimeString('tr-TR', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}

function extColor(ext) {
    if (['pdf', 'pptx', 'ppt'].includes(ext))               return 'bg-red-50 text-red-500';
    if (['xlsx', 'xls', 'csv'].includes(ext))                return 'bg-emerald-50 text-emerald-600';
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return 'bg-purple-50 text-purple-500';
    if (['mp3', 'mp4', 'wav', 'm4a'].includes(ext))          return 'bg-blue-50 text-[#378ADD]';
    if (['docx', 'doc', 'txt', 'md'].includes(ext))          return 'bg-amber-50 text-amber-600';
    return 'bg-stone-100 text-stone-500';
}

const LS_KEY      = 'fileWatcher_paths';
const LS_THRESH   = 'fileWatcher_thresh';
const LS_INTERVAL = 'fileWatcher_interval';

/* ── Sparkline + Threshold Çizgisi ───────────────────────────────── */

function Sparkline({ data, thresholdBytes }) {
    const W = 400; const H = 72; const padX = 4; const padY = 6;

    if (!data || data.length < 2) {
        return (
            <div style={{ height: H }} className="flex items-center justify-center">
                <span className="text-[9px] text-stone-300 font-mono">tarama bekleniyor…</span>
            </div>
        );
    }

    const values    = data.map(d => d.size);
    const hasThresh = thresholdBytes != null && thresholdBytes > 0;

    // Y ekseni: veriyi ve threshold'u kapsayacak şekilde genişlet
    let minV = Math.min(...values);
    let maxV = Math.max(...values);
    if (hasThresh) {
        minV = Math.min(minV, thresholdBytes * 0.92);
        maxV = Math.max(maxV, thresholdBytes * 1.08);
    }
    const range = maxV - minV || 1;

    function toY(v) {
        return H - padY - ((v - minV) / range) * (H - 2 * padY);
    }

    const pts  = values.map((v, i) => [padX + (i / (values.length - 1)) * (W - 2 * padX), toY(v)]);
    const poly = pts.map(([x, y]) => `${x},${y}`).join(' ');
    const [lx, ly] = pts[pts.length - 1];
    const fill = `M ${pts[0][0]},${pts[0][1]} ${pts.slice(1).map(([x, y]) => `L ${x},${y}`).join(' ')} L ${lx},${H} L ${pts[0][0]},${H} Z`;

    const threshY     = hasThresh ? toY(thresholdBytes) : null;
    const overThresh  = hasThresh && (data[data.length - 1]?.size ?? 0) > thresholdBytes;

    return (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
             className="w-full" style={{ height: H }}>
            <defs>
                <linearGradient id="wfGradG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#378ADD" stopOpacity="0.20" />
                    <stop offset="100%" stopColor="#378ADD" stopOpacity="0.01" />
                </linearGradient>
                <linearGradient id="wfGradR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#ef4444" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.01" />
                </linearGradient>
            </defs>

            {/* Alan dolgusu */}
            <path d={fill} fill={overThresh ? 'url(#wfGradR)' : 'url(#wfGradG)'} />

            {/* Threshold çizgisi */}
            {threshY != null && (
                <>
                    <line
                        x1={padX} y1={threshY} x2={W - padX} y2={threshY}
                        stroke="#ef4444" strokeWidth="1.2" strokeDasharray="5,4" opacity="0.65"
                    />
                    {/* Threshold değeri etiketi */}
                    <rect x={W - 70} y={threshY - 9} width={66} height={12} rx="2"
                        fill="white" opacity="0.90" />
                    <text x={W - 37} y={threshY + 0.5} textAnchor="middle"
                        fontSize="8" fontFamily="monospace" fill="#ef4444" opacity="0.9">
                        {formatBytes(thresholdBytes)}
                    </text>
                </>
            )}

            {/* Çizgi */}
            <polyline points={poly} fill="none"
                stroke={overThresh ? '#ef4444' : '#378ADD'}
                strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />

            {/* Son nokta */}
            <circle cx={lx} cy={ly} r="2.5"
                fill={overThresh ? '#ef4444' : '#378ADD'} />
        </svg>
    );
}

/* ── Boş Durum ───────────────────────────────────────────────────── */

function EmptyState({ onFocus }) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 border border-stone-200
                            flex items-center justify-center">
                <FolderSearch size={24} className="text-stone-400" />
            </div>
            <div>
                <p className="text-[13px] font-semibold text-stone-700 mb-1">
                    İzlenecek yol eklenmedi
                </p>
                <p className="text-[11px] text-stone-400 max-w-xs leading-relaxed">
                    Üstteki alana bir dizin veya dosya yolu girerek izlemeye başlayın.
                </p>
            </div>
            <button onClick={onFocus}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#378ADD] text-white
                           text-[11px] font-semibold rounded-lg hover:bg-[#2d6fb5] transition-colors">
                <Plus size={11} /> Yol Ekle
            </button>
        </div>
    );
}

/* ── Ana Bileşen ──────────────────────────────────────────────────── */

export default function FileWatcherPanel() {
    const [watchedPaths, setWatchedPaths] = useState(() => {
        try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
    });
    const [pathInput,    setPathInput]    = useState('');
    const [data,         setData]         = useState(null);
    const [history,      setHistory]      = useState({});
    const [events,       setEvents]       = useState([]);
    const [selected,     setSelected]     = useState(null);
    const [filter,       setFilter]       = useState('');
    const [pollInterval, setPollInterval] = useState(() => {
        return +(localStorage.getItem(LS_INTERVAL) || '5');
    });
    const [threshMb, setThreshMb] = useState(() => {
        return +(localStorage.getItem(LS_THRESH) || '0');
    });

    const [browsing, setBrowsing] = useState(false);

    // prevSnap ref — render tetiklemiyor, nested setState yok
    const prevSnapRef = useRef({});
    const inputRef    = useRef(null);
    const timerRef    = useRef(null);

    // localStorage senkronizasyonu
    useEffect(() => {
        localStorage.setItem(LS_KEY, JSON.stringify(watchedPaths));
    }, [watchedPaths]);

    useEffect(() => {
        localStorage.setItem(LS_INTERVAL, String(pollInterval));
    }, [pollInterval]);

    useEffect(() => {
        localStorage.setItem(LS_THRESH, String(threshMb));
    }, [threshMb]);

    const fetchStats = useCallback(async (paths) => {
        if (!paths || paths.length === 0) return;
        try {
            const res = await fetch('/api/archive/watcher-stats', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ paths }),
            });
            if (!res.ok) return;
            const json = await res.json();

            setData(json);

            // Tarihçe
            setHistory(prev => {
                const next = { ...prev };
                for (const d of json.dirs || []) {
                    const pts = next[d.key] || [];
                    pts.push({ ts: json.poll_ts, size: d.total_size, file_count: d.file_count });
                    next[d.key] = pts.slice(-30);
                }
                return next;
            });

            // Olay diff (ref üzerinden — no nested setState)
            const newEvents = [];
            for (const d of json.dirs || []) {
                const currMap = new Map((d.files || []).map(f => [f.name, f]));
                const prevMap = prevSnapRef.current[d.key] || new Map();

                for (const [name, f] of currMap) {
                    if (!prevMap.has(name))
                        newEvents.push({ ts: json.poll_ts, action: '+', name, size: f.size, dir: d.label });
                    else if (prevMap.get(name).size !== f.size)
                        newEvents.push({ ts: json.poll_ts, action: '~', name, size: f.size, dir: d.label });
                }
                for (const [name] of prevMap) {
                    if (!currMap.has(name))
                        newEvents.push({ ts: json.poll_ts, action: '-', name, size: 0, dir: d.label });
                }
                prevSnapRef.current[d.key] = currMap;
            }
            if (newEvents.length > 0) {
                setEvents(prev => [...newEvents, ...prev].slice(0, 60));
            }
        } catch { /* ignore network errors */ }
    }, []);

    const browse = useCallback(async (mode = 'dir') => {
        setBrowsing(true);
        try {
            const res = await fetch(`/api/archive/watcher-browse?mode=${mode}`);
            const { path } = await res.json();
            if (!path) return;
            setWatchedPaths(prev => {
                if (prev.includes(path)) return prev;
                return [...prev, path];
            });
            setSelected(path);
            fetchStats([...watchedPaths.filter(x => x !== path), path]);
        } catch { /* ignore */ } finally {
            setBrowsing(false);
        }
    }, [watchedPaths, fetchStats]);

    // İlk yükleme
    useEffect(() => {
        if (watchedPaths.length > 0) {
            setSelected(s => s || watchedPaths[0]);
            fetchStats(watchedPaths);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Periyodik tarama
    useEffect(() => {
        clearInterval(timerRef.current);
        if (watchedPaths.length === 0) return;
        timerRef.current = setInterval(() => fetchStats(watchedPaths), pollInterval * 1000);
        return () => clearInterval(timerRef.current);
    }, [watchedPaths, pollInterval, fetchStats]);

    const addPath = useCallback(() => {
        const p = pathInput.trim();
        if (!p) return;
        setWatchedPaths(prev => {
            if (prev.includes(p)) return prev;
            return [...prev, p];
        });
        setSelected(p);
        setPathInput('');
        // fetchStats çağrısı watchedPaths state güncellenmeden önce olabilir,
        // bu yüzden yeni listeyi doğrudan oluşturup geçiyoruz
        fetchStats([...watchedPaths, p].filter((x, i, a) => a.indexOf(x) === i && x !== p).concat(p));
    }, [pathInput, watchedPaths, fetchStats]);

    function removePath(p) {
        const next = watchedPaths.filter(x => x !== p);
        setWatchedPaths(next);
        if (selected === p) setSelected(next[0] || null);
        delete prevSnapRef.current[p];
    }

    const dirs         = data?.dirs || [];
    const selDir       = dirs.find(d => d.key === selected);
    const selHistory   = history[selected] || [];
    const threshBytes  = threshMb > 0 ? threshMb * 1024 * 1024 : null;
    const filteredFiles = (selDir?.files || []).filter(f =>
        !filter || f.name.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        // select-none sadece non-input elementlere uygulanacak şekilde kaldırıldı
        <div className="w-full h-full flex flex-col bg-stone-50 overflow-hidden">

            {/* ── Üst Çubuk: Yol Girişi ─────────────────────────── */}
            <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-stone-200 shrink-0">
                <Activity size={10} className="text-[#378ADD] shrink-0" />
                <span className="text-[11px] font-black tracking-[0.18em] text-stone-500 uppercase select-none mr-1">
                    DOSYA İZLEYİCİ
                </span>

                {/* Browse butonları */}
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onMouseDown={e => { e.preventDefault(); browse('dir'); }}
                        disabled={browsing}
                        title="Klasör seç"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold
                                   bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-md
                                   text-stone-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none">
                        {browsing
                            ? <Loader2 size={10} className="animate-spin" />
                            : <FolderOpen size={10} />}
                        <span>Klasör</span>
                    </button>
                    <button
                        onMouseDown={e => { e.preventDefault(); browse('file'); }}
                        disabled={browsing}
                        title="Dosya seç"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold
                                   bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-md
                                   text-stone-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none">
                        <FileText size={10} />
                        <span>Dosya</span>
                    </button>
                </div>

                {/* Path input */}
                <div className="flex-1 flex items-center gap-1.5 bg-stone-100 border border-stone-200
                                rounded-lg px-2.5 py-1 focus-within:border-[#378ADD]/40 focus-within:bg-white
                                transition-colors min-w-0">
                    <input
                        ref={inputRef}
                        value={pathInput}
                        onChange={e => setPathInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPath(); } }}
                        placeholder="Yolu elle girin… (Enter ile ekle)"
                        className="flex-1 text-[12px] font-mono bg-transparent outline-none
                                   text-stone-700 placeholder:text-stone-400 min-w-0"
                        spellCheck={false}
                        autoComplete="off"
                    />
                    {pathInput.trim() && (
                        <button
                            onMouseDown={e => { e.preventDefault(); addPath(); }}
                            className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-white
                                       bg-[#378ADD] rounded px-2 py-0.5 hover:bg-[#2d6fb5] transition-colors select-none">
                            <Plus size={8} /> Ekle
                        </button>
                    )}
                </div>

                <span className="text-[11px] font-mono text-stone-400 flex items-center gap-1 shrink-0 select-none">
                    <Clock size={10} /> {pollInterval}s
                </span>
                <button
                    onClick={() => fetchStats(watchedPaths)}
                    className="text-stone-400 hover:text-stone-600 p-1 rounded hover:bg-stone-100
                               transition-colors shrink-0">
                    <RefreshCw size={11} />
                </button>
            </div>

            {/* ── Gövde ─────────────────────────────────────────── */}
            {watchedPaths.length === 0 ? (
                <EmptyState onFocus={() => inputRef.current?.focus()} />
            ) : (
                <div className="flex flex-1 overflow-hidden">

                    {/* ── Sol: İzlenen Yollar ─────────────────── */}
                    <div className="w-56 shrink-0 border-r border-stone-100 bg-white overflow-y-auto flex flex-col">
                        {watchedPaths.map(p => {
                            const dir   = dirs.find(d => d.key === p);
                            const isSel = selected === p;
                            const label = p.replace(/\\/g, '/').split('/').filter(Boolean).pop() || p;
                            const missing = dir && !dir.exists;

                            return (
                                <button key={p} onClick={() => setSelected(p)}
                                    className={`relative w-full text-left px-3 py-3 border-b border-stone-100
                                               transition-colors group
                                               ${isSel ? 'bg-[#378ADD]/8' : 'hover:bg-stone-50'}`}>
                                    {isSel && (
                                        <div className="absolute left-0 top-2 bottom-2 w-[2px] bg-[#378ADD] rounded-r" />
                                    )}
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <FolderOpen size={9} className={
                                            missing ? 'text-red-400' :
                                            isSel   ? 'text-[#378ADD]' : 'text-stone-400'
                                        } />
                                        <span className={`text-[12px] font-bold truncate flex-1 select-none
                                            ${missing ? 'text-red-400' :
                                              isSel   ? 'text-[#378ADD]' : 'text-stone-600'}`}>
                                            {label}
                                        </span>
                                        <button
                                            onClick={e => { e.stopPropagation(); removePath(p); }}
                                            className="opacity-0 group-hover:opacity-100 text-stone-300
                                                       hover:text-red-400 transition-all shrink-0">
                                            <X size={9} />
                                        </button>
                                    </div>
                                    {missing ? (
                                        <span className="text-[10px] font-mono text-red-400 select-none">yol bulunamadı</span>
                                    ) : dir ? (
                                        <span className="text-[10px] font-mono text-stone-400 select-none">
                                            {dir.file_count} dos · {formatBytes(dir.total_size)}
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-mono text-stone-300 select-none">taranıyor…</span>
                                    )}
                                    <div className="text-[9px] font-mono text-stone-300 truncate mt-1 leading-tight select-none">
                                        {p}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* ── Orta: Seçili Dizin Detayı ───────────── */}
                    {!selDir ? (
                        <div className="flex-1 flex items-center justify-center">
                            <span className="text-[10px] text-stone-400 font-mono select-none">taranıyor…</span>
                        </div>
                    ) : !selDir.exists ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-3">
                            <AlertTriangle size={24} className="text-red-300" />
                            <div className="text-center">
                                <p className="text-[12px] font-semibold text-stone-600 select-none">Yol bulunamadı</p>
                                <p className="text-[10px] font-mono text-stone-400 mt-0.5">{selDir.path}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

                            {/* Başlık */}
                            <div className="flex items-center gap-2 px-4 py-2 border-b border-stone-100 shrink-0 bg-white">
                                <FolderOpen size={11} className="text-[#378ADD] shrink-0" />
                                <span className="text-[12px] font-bold text-stone-700 font-mono truncate flex-1">
                                    {selDir.path}
                                </span>
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 shrink-0 select-none
                                                 bg-emerald-50 text-emerald-600 rounded border border-emerald-100">
                                    {selDir.is_file ? 'DOSYA' : 'DİZİN'}
                                </span>
                            </div>

                            {/* İstatistik kartları */}
                            <div className="grid grid-cols-4 border-b border-stone-100 shrink-0 bg-white">
                                {[
                                    { label: 'DOSYALAR', value: String(selDir.file_count) },
                                    { label: 'BOYUT',    value: formatBytes(selDir.total_size) },
                                    { label: 'SON DEĞ.', value: formatRelTime(selDir.last_change) },
                                    { label: 'TARAMA',   value: `${pollInterval}s` },
                                ].map(s => (
                                    <div key={s.label} className="px-4 py-3 border-r border-stone-100 last:border-r-0">
                                        <div className="text-[10px] font-black tracking-[0.12em] text-stone-400 uppercase mb-1 select-none">
                                            {s.label}
                                        </div>
                                        <div className="text-[16px] font-bold font-mono text-stone-700">
                                            {s.value}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Sparkline */}
                            <div className="px-4 pt-2 pb-1 border-b border-stone-100 shrink-0 bg-white">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-black tracking-[0.12em] text-stone-400 uppercase select-none">
                                        BOYUT – SON {selHistory.length} TARAMA
                                    </span>
                                    {selHistory.length > 1 && (
                                        <span className="text-[10px] font-mono text-stone-400">
                                            {formatBytes(selHistory[0].size)} → {formatBytes(selHistory[selHistory.length - 1].size)}
                                        </span>
                                    )}
                                </div>
                                <Sparkline data={selHistory} thresholdBytes={threshBytes} />
                            </div>

                            {/* Kontroller */}
                            <div className="flex items-center gap-5 px-4 py-3 border-b border-stone-100 shrink-0 bg-stone-50/60">
                                {/* TARAMA slider — esnek genişlik */}
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <span className="text-[10px] font-black tracking-[0.1em] text-stone-400 uppercase whitespace-nowrap select-none">
                                        TARAMA
                                    </span>
                                    <input type="range" min={3} max={60} step={1}
                                        value={pollInterval}
                                        onChange={e => setPollInterval(+e.target.value)}
                                        className="flex-1 h-1.5 accent-[#378ADD] cursor-pointer min-w-0" />
                                    <span className="text-[12px] font-mono font-bold text-stone-600 w-9 text-right shrink-0 select-none">
                                        {pollInterval}s
                                    </span>
                                </div>

                                <div className="w-px h-4 bg-stone-200 shrink-0" />

                                {/* EŞİK — sabit genişlik */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] font-black tracking-[0.1em] text-stone-400 uppercase whitespace-nowrap select-none">
                                        EŞİK
                                    </span>
                                    <input
                                        type="number" min={0} step={50}
                                        value={threshMb || ''}
                                        onChange={e => setThreshMb(+e.target.value || 0)}
                                        placeholder="0"
                                        className="w-24 text-[12px] font-mono bg-white border border-stone-200
                                                   rounded px-2 py-1 outline-none focus:border-[#378ADD]/50
                                                   text-stone-700 placeholder:text-stone-300"
                                    />
                                    <span className="text-[11px] font-mono text-stone-400 select-none">MB</span>
                                    {threshMb > 0 && (
                                        <button onClick={() => setThreshMb(0)}
                                            className="text-stone-300 hover:text-stone-500 transition-colors">
                                            <X size={10} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Dosya listesi başlığı */}
                            <div className="flex items-center gap-2 px-4 py-1.5 border-b border-stone-100 shrink-0 bg-white">
                                <FileText size={9} className="text-stone-400" />
                                <span className="text-[12px] font-semibold text-stone-600 select-none">
                                    Dosyalar ({filteredFiles.length}
                                    {filter ? ` / ${selDir.files.length}` : ''})
                                </span>
                                <div className="flex-1" />
                                <div className="flex items-center gap-1.5 bg-stone-100 rounded px-2 py-0.5">
                                    <Filter size={8} className="text-stone-400 shrink-0" />
                                    <input
                                        value={filter}
                                        onChange={e => setFilter(e.target.value)}
                                        placeholder="filtrele…"
                                        className="text-[12px] font-mono bg-transparent outline-none
                                                   text-stone-600 placeholder:text-stone-400 w-28"
                                    />
                                </div>
                            </div>

                            {/* Dosya listesi */}
                            <div className="overflow-y-auto flex-1">
                                {filteredFiles.length === 0 ? (
                                    <div className="flex items-center justify-center h-16">
                                        <span className="text-[9px] text-stone-400 font-mono select-none">
                                            {filter ? 'eşleşen dosya yok' : 'dizin boş'}
                                        </span>
                                    </div>
                                ) : filteredFiles.map((f, i) => (
                                    <div key={i}
                                        className="flex items-center gap-2 px-4 py-2 hover:bg-stone-50
                                                   border-b border-stone-50 last:border-0 group">
                                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded font-mono shrink-0 select-none
                                            ${extColor(f.ext)}`}>
                                            {f.ext || '—'}
                                        </span>
                                        <span className="text-[13px] text-stone-700 font-mono truncate flex-1 group-hover:text-stone-900">
                                            {f.name}
                                        </span>
                                        <span className="text-[11px] font-mono text-stone-400 shrink-0 select-none">
                                            {formatBytes(f.size)}
                                        </span>
                                        <span className="text-[10px] font-mono text-stone-300 shrink-0 w-24 text-right select-none">
                                            {formatRelTime(f.modified)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Sağ: Olay Akışı ─────────────────────── */}
                    <div className="w-60 shrink-0 border-l border-stone-100 flex flex-col overflow-hidden bg-white">
                        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-stone-100 shrink-0">
                            <Zap size={9} className="text-[#378ADD]" />
                            <span className="text-[10px] font-black tracking-[0.18em] text-stone-500 uppercase flex-1 select-none">
                                OLAY AKIŞI
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-500 select-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                                CANLI
                            </span>
                        </div>

                        <div className="overflow-y-auto flex-1">
                            {events.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
                                    <span className="text-[9px] text-stone-400 font-mono text-center select-none">
                                        Değişiklikler burada görünür.
                                        <br />İlk tarama bekleniyor…
                                    </span>
                                </div>
                            ) : events.map((e, i) => (
                                <div key={i}
                                    className="flex items-start gap-1.5 px-3 py-1.5 hover:bg-stone-50
                                               border-b border-stone-50 last:border-0">
                                    <span className={`text-[12px] font-bold font-mono shrink-0 mt-px select-none
                                        ${e.action === '+' ? 'text-emerald-500' :
                                          e.action === '-' ? 'text-red-400'     :
                                                             'text-amber-500'}`}>
                                        {e.action}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[10px] font-mono text-stone-400 select-none">
                                            {formatClock(e.ts)} · <span className="text-stone-300">{e.dir}</span>
                                        </div>
                                        <div className="text-[11px] text-stone-700 font-mono truncate">
                                            {e.name}
                                        </div>
                                        {e.size > 0 && (
                                            <div className="text-[10px] text-stone-400 font-mono select-none">
                                                {formatBytes(e.size)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Erişilemeyen yollar */}
                        {dirs.some(d => !d.exists) && (
                            <div className="border-t border-stone-100 px-3 py-2 shrink-0">
                                {dirs.filter(d => !d.exists).map(d => (
                                    <div key={d.key} className="flex items-start gap-1.5 py-0.5">
                                        <AlertTriangle size={8} className="text-red-400 mt-px shrink-0" />
                                        <span className="text-[8px] font-mono text-red-500 leading-tight truncate select-none">
                                            {d.label}: bulunamadı
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>
    );
}
