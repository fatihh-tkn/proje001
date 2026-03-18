import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, RefreshCw, ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Clock, Cpu, DollarSign, Wifi, Hash } from 'lucide-react';
import { API_BASE, fetchWithTimeout, formatDate, fmtMs, fmtCost, fmt, getModelColor } from '../utils';

/* ─── Mini badge ──────────────────────────────────────────────────── */
function Badge({ children, color = 'default' }) {
    const colors = {
        success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        error: 'bg-red-500/10 text-red-500 border-red-500/20',
        warn: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        default: 'bg-[var(--sidebar-hover)] text-[var(--sidebar-text-muted)] border-[var(--window-border)]',
    };
    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider border ${colors[color]}`}>
            {children}
        </span>
    );
}

/* ─── Expanded detail row ─────────────────────────────────────────── */
function LogDetail({ log }) {
    return (
        <div className="bg-gray-50/60 px-6 py-5 border-t border-black/[0.04] animate-in slide-in-from-top-2 duration-300 shadow-inner">
            {/* Metadata Tek Satır Haritası */}
            <div className="flex flex-wrap items-center gap-6 mb-6">
                {[
                    { icon: Wifi, label: 'IP', value: log.ip || '—' },
                    { icon: Hash, label: 'MAC', value: log.mac || '—' },
                    { icon: Clock, label: 'Süre', value: fmtMs(log.duration) },
                    { icon: DollarSign, label: 'Maliyet', value: fmtCost(log.cost) },
                ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-2">
                        <Icon size={12} className="text-[var(--sidebar-text-muted)] opacity-60" />
                        <span className="text-[10px] text-[var(--sidebar-text-muted)] tracking-widest uppercase">{label}</span>
                        <span className="text-[11px] font-mono text-[var(--workspace-text)] font-medium ml-1">{value}</span>
                    </div>
                ))}

                {/* Token Özeti */}
                <div className="flex items-center gap-2 ml-auto">
                    <span className="text-[10px] text-[var(--sidebar-text-muted)] tracking-widest uppercase">Token</span>
                    <span className="text-[11px] font-mono text-[var(--workspace-text)] font-medium ml-1 flex items-center gap-1.5">
                        <span className="text-[var(--accent)]">{fmt(log.promptTokens || 0)}</span>
                        <span className="text-[var(--sidebar-text-muted)]/40">+</span>
                        <span className="text-emerald-500">{fmt(log.completionTokens || 0)}</span>
                        <span className="text-[var(--sidebar-text-muted)]/40">=</span>
                        <span className="font-bold">{fmt(log.totalTokens)}</span>
                    </span>
                </div>
            </div>

            {/* Prompt + Response (Split Content Structure) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
                {/* Ayrım çizgisi (sadece LG'de) */}
                <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-black/[0.04] -translate-x-1/2" />

                {/* İstek kısmı */}
                <div className="lg:pr-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                        <span className="text-[10px] font-medium tracking-widest text-[var(--sidebar-text-muted)] uppercase">İstek (Prompt)</span>
                    </div>
                    <div className="text-[11px] font-mono text-gray-700 leading-relaxed whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto mac-horizontal-scrollbar selection:bg-[var(--accent)]/10">
                        {log.request || '—'}
                    </div>
                </div>

                {/* Yanıt kısmı */}
                <div className="lg:pl-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-medium tracking-widest text-[var(--sidebar-text-muted)] uppercase">Yanıt (Response)</span>
                    </div>
                    <div className="text-[11px] font-mono text-[var(--workspace-text)] leading-relaxed whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto mac-horizontal-scrollbar selection:bg-emerald-500/10">
                        {log.response || '—'}
                    </div>
                </div>
            </div>

            {/* Hata detayı */}
            {log.status !== 'success' && log.error && (
                <div className="mt-6 pt-4 border-t border-red-500/10">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle size={10} className="text-red-500" />
                        <span className="text-[10px] font-medium tracking-widest text-red-500 uppercase">Hata Çıktısı</span>
                    </div>
                    <div className="text-[11px] font-mono text-red-500/90 break-words leading-relaxed max-h-[150px] overflow-y-auto">
                        {log.error}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Main component ─────────────────────────────────────────────── */
export const LogsTab = React.memo(() => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modelFilter, setModelFilter] = useState('all');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [expandedLogId, setExpandedLogId] = useState(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchWithTimeout(`${API_BASE}/logs?limit=50`);
            const data = await res.json();
            setLogs(data.logs || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const models = useMemo(() => {
        const set = new Set(logs.map(l => l.model).filter(Boolean));
        return Array.from(set).sort();
    }, [logs]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return logs.filter(l => {
            const matchSearch = !search || (
                (l.model || '').toLowerCase().includes(q) ||
                (l.request || '').toLowerCase().includes(q) ||
                (l.response || '').toLowerCase().includes(q)
            );
            const matchModel = modelFilter === 'all' || l.model === modelFilter;
            return matchSearch && matchModel;
        });
    }, [logs, search, modelFilter]);

    const successCount = useMemo(() => filtered.filter(l => l.status === 'success').length, [filtered]);
    const errorCount = filtered.length - successCount;

    return (
        <div className="flex flex-col bg-white h-full w-full overflow-hidden animate-in fade-in duration-300">

            {/* ── Toolbar ── */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-black/[0.05] bg-gray-50/50 flex-wrap">
                {/* Arama Kutusu */}
                <div className="flex items-center bg-white border border-black/[0.08] rounded-[3px] overflow-hidden focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)] transition-all h-[34px] shadow-sm">
                    <div className="pl-3 py-2 pr-2 text-[var(--sidebar-text-muted)] flex items-center justify-center shrink-0">
                        <Search size={13} />
                    </div>
                    <input
                        className="w-56 bg-transparent border-none outline-none text-[11px] text-[var(--workspace-text)] placeholder:text-[var(--sidebar-text-muted)]/50 py-1.5"
                        placeholder="Model, prompt veya yanıt ara..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* Özel Model Filtreleme Dropdown */}
                <div
                    className="relative h-[34px] z-20 group menu-container"
                    tabIndex={0}
                    onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                            setDropdownOpen(false);
                        }
                    }}
                >
                    <div
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className={`flex items-center justify-between h-full bg-white border ${dropdownOpen ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'border-black/[0.08] hover:border-black/[0.15]'} rounded-[3px] cursor-pointer pl-3 pr-2 w-48 transition-all shadow-sm`}
                    >
                        <span className={`text-[9px] font-medium uppercase tracking-widest truncate transition-colors ${dropdownOpen ? 'text-[var(--accent)]' : 'text-[var(--sidebar-text-muted)]'}`}>
                            {modelFilter === 'all' ? 'TÜM MODELLER' : modelFilter}
                        </span>
                        <ChevronDown size={12} className={`text-[var(--sidebar-text-muted)] transition-transform ${dropdownOpen ? 'rotate-180 text-[var(--accent)]' : ''}`} />
                    </div>

                    {/* Açılır Menü */}
                    <div className={`absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-black/[0.08] rounded-[3px] shadow-lg overflow-hidden transition-all duration-200 origin-top z-[9999] ${dropdownOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                        {/* Parent group for menu hover logic. When hover is inside, text-gray-600 overrides the default selected highlight */}
                        <div className="max-h-[250px] overflow-y-auto mac-horizontal-scrollbar group/menu">
                            <div
                                onMouseDown={(e) => { e.preventDefault(); setModelFilter('all'); setDropdownOpen(false); }}
                                className={`px-3 py-2.5 text-[10px] uppercase font-medium tracking-widest cursor-pointer transition-colors hover:!bg-red-100 hover:!text-[var(--accent)] ${modelFilter === 'all' ? 'bg-red-100 text-[var(--accent)] group-hover/menu:bg-transparent group-hover/menu:text-gray-600' : 'text-gray-600'}`}
                            >
                                TÜM MODELLER
                            </div>
                            <div className="border-t border-black/[0.04]" />
                            {models.map(m => (
                                <div
                                    key={m}
                                    onMouseDown={(e) => { e.preventDefault(); setModelFilter(m); setDropdownOpen(false); }}
                                    className={`px-3 py-2.5 text-[11px] font-medium font-mono cursor-pointer transition-colors truncate hover:!bg-red-100 hover:!text-[var(--accent)] ${modelFilter === m ? 'bg-red-100 text-[var(--accent)] group-hover/menu:bg-transparent group-hover/menu:text-gray-600' : 'text-gray-600'}`}
                                >
                                    {m}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="ml-auto flex items-center gap-3">
                    {/* İstatistikler */}
                    {!loading && (
                        <div className="flex items-center gap-2 text-[9px] font-medium uppercase tracking-widest">
                            <span className="flex items-center gap-1 text-emerald-500">
                                <CheckCircle2 size={11} /> {successCount}
                            </span>
                            <span className="text-[var(--window-border)]">/</span>
                            <span className="flex items-center gap-1 text-red-400">
                                <AlertCircle size={11} /> {errorCount}
                            </span>
                            <span className="text-[var(--sidebar-text-muted)]/50 font-normal">|</span>
                            <span className="text-[var(--sidebar-text-muted)]">{filtered.length} kayıt</span>
                        </div>
                    )}
                    <button
                        onClick={fetchLogs}
                        className="p-1.5 rounded-sm text-[var(--sidebar-text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                    >
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* ── Tablo başlığı ── */}
            <div className="grid grid-cols-[120px_80px_160px_1fr_1fr_80px_80px_24px] gap-0 px-5 py-2 border-b border-black/[0.04] bg-gray-50/50">
                {['Tarih', 'Durum', 'Model', 'Prompt', 'Yanıt', 'Token', 'Süre', ''].map((h, i) => (
                    <span key={i} className="text-[8px] font-medium uppercase tracking-widest text-[var(--sidebar-text-muted)] opacity-60">{h}</span>
                ))}
            </div>

            {/* ── Satırlar ── */}
            <div className="overflow-y-auto mac-horizontal-scrollbar divide-y divide-black/[0.04]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-40">
                        <RefreshCw size={22} className="animate-spin text-[var(--accent)]" />
                        <span className="text-[10px] font-medium uppercase tracking-widest">Yükleniyor...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-2 opacity-40">
                        <Search size={24} strokeWidth={1} />
                        <span className="text-[10px] font-medium uppercase tracking-widest">Log bulunamadı</span>
                    </div>
                ) : (
                    filtered.map(log => {
                        const isOpen = expandedLogId === log.id;
                        return (
                            <React.Fragment key={log.id}>
                                <div
                                    onClick={() => setExpandedLogId(isOpen ? null : log.id)}
                                    className={`grid grid-cols-[120px_80px_160px_1fr_1fr_80px_80px_24px] gap-0 px-5 py-3 cursor-pointer transition-colors duration-150 items-center
                                        ${isOpen ? 'bg-gray-50/80' : 'hover:bg-gray-50/40'}`}
                                >
                                    {/* Tarih */}
                                    <span className="text-[9px] font-mono text-[var(--sidebar-text-muted)] truncate">{formatDate(log.timestamp)}</span>

                                    {/* Durum */}
                                    <div>
                                        {log.status === 'success'
                                            ? <Badge color="success"><CheckCircle2 size={8} /> OK</Badge>
                                            : <Badge color="error"><AlertCircle size={8} /> HATA</Badge>
                                        }
                                    </div>

                                    {/* Model */}
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getModelColor(log.model) }} />
                                        <span className="text-[10px] font-medium text-[var(--workspace-text)] truncate">{log.model}</span>
                                    </div>

                                    {/* Prompt önizleme */}
                                    <span className="text-[10px] text-[var(--sidebar-text-muted)] truncate pr-4">{log.request || '—'}</span>

                                    {/* Response önizleme */}
                                    <span className="text-[10px] text-[var(--sidebar-text-muted)] truncate pr-4">{log.response || '—'}</span>

                                    {/* Token */}
                                    <span className="text-[10px] font-mono font-medium text-[var(--workspace-text)] text-right pr-3">
                                        {fmt(log.totalTokens)}<span className="text-[var(--sidebar-text-muted)] font-normal text-[8px]">tk</span>
                                    </span>

                                    {/* Süre */}
                                    <div className="pr-2">
                                        <Badge color={log.duration > 2000 ? 'warn' : 'default'}>
                                            {fmtMs(log.duration)}
                                        </Badge>
                                    </div>

                                    {/* Chevron */}
                                    <div className={`text-[var(--sidebar-text-muted)] transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
                                        <ChevronRight size={13} />
                                    </div>
                                </div>

                                {/* Detay alanı */}
                                {isOpen && <LogDetail log={log} />}
                            </React.Fragment>
                        );
                    })
                )}
            </div>
        </div>
    );
});