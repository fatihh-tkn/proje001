import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, RefreshCw, ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Clock, Cpu, DollarSign, Wifi, Hash } from 'lucide-react';
import { API_BASE, fetchWithTimeout, formatDate, fmtMs, fmtCost, fmt, getModelColor } from '../utils';

/* ─── Mini badge ──────────────────────────────────────────────────── */
function Badge({ children, color = 'default' }) {
    const colors = {
        success: 'bg-[#EAF3DE] text-[#3B6D11] border-[#EAF3DE]/50',
        error: 'bg-[#FCEBEB] text-[#791F1F] border-[#FCEBEB]/50',
        warn: 'bg-[#FAEEDA] text-[#854F0B] border-[#FAEEDA]/50',
        default: 'bg-stone-100 text-stone-600 border-stone-200',
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest border ${colors[color]}`}>
            {children}
        </span>
    );
}

/* ─── Expanded detail row ─────────────────────────────────────────── */
function LogDetail({ log }) {
    const [expandReq, setExpandReq] = useState(false);
    const [expandRes, setExpandRes] = useState(false);

    const isReqLong = (log.request && log.request.length > 300) || (log.request && log.request.split('\n').length > 5);
    const isResLong = (log.response && log.response.length > 300) || (log.response && log.response.split('\n').length > 5);

    return (
        <div className="bg-stone-50 px-6 py-5 border-t border-stone-200 animate-in slide-in-from-top-2 duration-300 shadow-inner">
            {/* Metadata Tek Satır Haritası */}
            <div className="flex flex-wrap items-center gap-6 mb-6">
                {[
                    { icon: Wifi, label: 'IP', value: log.ip || '—' },
                    { icon: Hash, label: 'MAC', value: log.mac || '—' },
                    { icon: Clock, label: 'Süre', value: fmtMs(log.duration) },
                    { icon: DollarSign, label: 'Maliyet', value: fmtCost(log.cost) },
                ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-2">
                        <Icon size={14} className="text-stone-400 opacity-80" />
                        <span className="text-[10px] text-stone-500 font-bold tracking-widest uppercase">{label}</span>
                        <span className="text-[12px] font-mono text-stone-700 font-bold ml-1">{value}</span>
                    </div>
                ))}

                {/* Token Özeti */}
                <div className="flex items-center gap-2 ml-auto">
                    <span className="text-[10px] text-stone-500 font-bold tracking-widest uppercase">Token</span>
                    <span className="text-[12px] font-mono text-stone-700 font-bold ml-1 flex items-center gap-1.5">
                        <span className="text-[#378ADD]">{fmt(log.promptTokens || 0)}</span>
                        <span className="text-stone-400/60">+</span>
                        <span className="text-[#1D9E75]">{fmt(log.completionTokens || 0)}</span>
                        <span className="text-stone-400/60">=</span>
                        <span className="text-stone-900 font-black">{fmt(log.totalTokens)}</span>
                    </span>
                </div>
            </div>

            {/* Prompt + Response (Split Content Structure) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
                {/* Ayrım çizgisi (sadece LG'de) */}
                <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-stone-200 -translate-x-1/2" />

                {/* İstek kısmı */}
                <div className="lg:pr-4">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-[#378ADD]" />
                        <span className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">İstek (Prompt)</span>
                        {isReqLong && (
                            <button onClick={() => setExpandReq(!expandReq)} className="ml-auto text-stone-400 hover:text-[#378ADD] focus:outline-none transition-colors group cursor-pointer" title="Genişlet/Daralt">
                                <ChevronDown size={16} className={`transition-transform duration-300 ${expandReq ? 'rotate-180 text-[#378ADD]' : 'group-hover:scale-110'}`} />
                            </button>
                        )}
                    </div>
                    <div className="relative">
                        <div className={`text-[12px] font-mono text-stone-700 leading-relaxed whitespace-pre-wrap break-words transition-all duration-300 ${expandReq ? 'max-h-none overflow-visible' : 'max-h-[160px] overflow-hidden'} selection:bg-[#378ADD]/10`}>
                            {log.request || '—'}
                        </div>
                        {isReqLong && !expandReq && (
                            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-stone-50 via-stone-50/80 to-transparent pointer-events-none" />
                        )}
                    </div>
                </div>

                {/* Yanıt kısmı */}
                <div className="lg:pl-4">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-[#1D9E75]" />
                        <span className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">Yanıt (Response)</span>
                        {isResLong && (
                            <button onClick={() => setExpandRes(!expandRes)} className="ml-auto text-stone-400 hover:text-[#1D9E75] focus:outline-none transition-colors group cursor-pointer" title="Genişlet/Daralt">
                                <ChevronDown size={16} className={`transition-transform duration-300 ${expandRes ? 'rotate-180 text-[#1D9E75]' : 'group-hover:scale-110'}`} />
                            </button>
                        )}
                    </div>
                    <div className="relative">
                        <div className={`text-[12px] font-mono text-stone-700 leading-relaxed whitespace-pre-wrap break-words transition-all duration-300 ${expandRes ? 'max-h-none overflow-visible' : 'max-h-[160px] overflow-hidden'} selection:bg-[#1D9E75]/10`}>
                            {log.response || '—'}
                        </div>
                        {isResLong && !expandRes && (
                            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-stone-50 via-stone-50/80 to-transparent pointer-events-none" />
                        )}
                    </div>
                </div>
            </div>

            {/* Hata detayı */}
            {log.status !== 'success' && log.error && (
                <div className="mt-8 pt-6 border-t border-[#FCEBEB]">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertCircle size={14} className="text-[#791F1F]" />
                        <span className="text-[10px] font-bold tracking-widest text-[#791F1F] uppercase">Hata Çıktısı</span>
                    </div>
                    <div className="text-[12px] font-mono text-[#D85A30] break-words leading-relaxed max-h-[150px] overflow-y-auto">
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
            <div className="flex items-center gap-3 px-5 py-3 border-b border-stone-200 bg-stone-50 flex-wrap">
                {/* Arama Kutusu */}
                <div className="flex items-center bg-white border border-stone-200 rounded-md overflow-hidden focus-within:border-[#378ADD] focus-within:ring-1 focus-within:ring-[#378ADD] transition-all h-[36px] shadow-sm">
                    <div className="pl-3 py-2 pr-2 text-stone-400 flex items-center justify-center shrink-0">
                        <Search size={14} />
                    </div>
                    <input
                        className="w-56 bg-transparent border-none outline-none text-[11px] font-bold text-stone-700 placeholder:text-stone-400/70 py-1.5"
                        placeholder="Model, prompt veya yanıt ara..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* Özel Model Filtreleme Dropdown */}
                <div
                    className="relative h-[36px] z-20 group menu-container"
                    tabIndex={0}
                    onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                            setDropdownOpen(false);
                        }
                    }}
                >
                    <div
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className={`flex items-center justify-between h-full bg-white border ${dropdownOpen ? 'border-[#378ADD] ring-1 ring-[#378ADD]' : 'border-stone-200 hover:border-stone-300'} rounded-md cursor-pointer pl-3 pr-2 w-48 transition-all shadow-sm`}
                    >
                        <span className={`text-[10px] font-bold uppercase tracking-widest truncate transition-colors ${dropdownOpen ? 'text-[#378ADD]' : 'text-stone-500'}`}>
                            {modelFilter === 'all' ? 'TÜM MODELLER' : modelFilter}
                        </span>
                        <ChevronDown size={14} className={`text-stone-400 transition-transform ${dropdownOpen ? 'rotate-180 text-[#378ADD]' : ''}`} />
                    </div>

                    {/* Açılır Menü */}
                    <div className={`absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-stone-200 rounded-lg shadow-lg overflow-hidden transition-all duration-200 origin-top z-[9999] ${dropdownOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                        <div className="max-h-[250px] overflow-y-auto mac-horizontal-scrollbar group/menu">
                            <div
                                onMouseDown={(e) => { e.preventDefault(); setModelFilter('all'); setDropdownOpen(false); }}
                                className={`px-4 py-3 text-[10px] uppercase font-bold tracking-widest cursor-pointer transition-colors hover:bg-stone-50 hover:text-[#378ADD] ${modelFilter === 'all' ? 'bg-stone-50 text-[#378ADD]' : 'text-stone-600'}`}
                            >
                                TÜM MODELLER
                            </div>
                            <div className="border-t border-stone-100" />
                            {models.map(m => (
                                <div
                                    key={m}
                                    onMouseDown={(e) => { e.preventDefault(); setModelFilter(m); setDropdownOpen(false); }}
                                    className={`px-4 py-3 text-[11px] font-bold font-mono cursor-pointer transition-colors truncate hover:bg-stone-50 hover:text-[#378ADD] ${modelFilter === m ? 'bg-stone-50 text-[#378ADD]' : 'text-stone-600'}`}
                                >
                                    {m}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="ml-auto flex items-center gap-4">
                    {/* İstatistikler */}
                    {!loading && (
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-1.5 text-[#3B6D11]">
                                <CheckCircle2 size={12} /> {successCount}
                            </span>
                            <span className="text-stone-300">/</span>
                            <span className="flex items-center gap-1.5 text-[#791F1F]">
                                <AlertCircle size={12} /> {errorCount}
                            </span>
                            <span className="text-stone-200 font-normal">|</span>
                            <span className="text-stone-400">{filtered.length} kayıt</span>
                        </div>
                    )}
                    <button
                        onClick={fetchLogs}
                        className="p-1.5 rounded-md text-stone-400 hover:text-[#378ADD] hover:bg-stone-100 transition-colors cursor-pointer"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* ── Tablo başlığı ── */}
            <div className="grid grid-cols-[130px_90px_160px_1fr_1fr_90px_90px_30px] gap-0 px-6 py-3 border-b border-stone-200 bg-stone-50">
                {['Tarih', 'Durum', 'Model', 'Prompt', 'Yanıt', 'Token', 'Süre', ''].map((h, i) => (
                    <span key={i} className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{h}</span>
                ))}
            </div>

            {/* ── Satırlar ── */}
            <div className="overflow-y-auto mac-horizontal-scrollbar divide-y divide-stone-100/50">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-70">
                        <RefreshCw size={28} className="animate-spin text-stone-400" />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-stone-500">Yükleniyor...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3 opacity-70">
                        <Search size={28} strokeWidth={1} className="text-stone-400" />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-stone-500">Log bulunamadı</span>
                    </div>
                ) : (
                    filtered.map(log => {
                        const isOpen = expandedLogId === log.id;
                        return (
                            <React.Fragment key={log.id}>
                                <div
                                    onClick={() => setExpandedLogId(isOpen ? null : log.id)}
                                    className={`grid grid-cols-[130px_90px_160px_1fr_1fr_90px_90px_30px] gap-0 px-6 py-4 cursor-pointer transition-colors duration-150 items-center
                                        ${isOpen ? 'bg-stone-50' : 'hover:bg-stone-50/50'}`}
                                >
                                    {/* Tarih */}
                                    <span className="text-[11px] font-bold text-stone-500 truncate pr-2">{formatDate(log.timestamp)}</span>

                                    {/* Durum */}
                                    <div>
                                        {log.status === 'success'
                                            ? <Badge color="success"><CheckCircle2 size={10} strokeWidth={2.5} /> OK</Badge>
                                            : <Badge color="error"><AlertCircle size={10} strokeWidth={2.5} /> HATA</Badge>
                                        }
                                    </div>

                                    {/* Model */}
                                    <div className="flex items-center gap-2 min-w-0 pr-2">
                                        <span className="w-2 h-2 rounded-sm shadow-sm shrink-0" style={{ backgroundColor: getModelColor(log.model) }} />
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-700 truncate">{log.model}</span>
                                    </div>

                                    {/* Prompt önizleme */}
                                    <span className="text-[11px] text-stone-500 truncate pr-6 font-medium">{log.request || '—'}</span>

                                    {/* Response önizleme */}
                                    <span className="text-[11px] text-stone-500 truncate pr-6 font-medium">{log.response || '—'}</span>

                                    {/* Token */}
                                    <span className="text-[11px] font-mono font-bold text-stone-700 text-right pr-4">
                                        {fmt(log.totalTokens)}<span className="text-stone-400 font-bold ml-1 text-[9px] tracking-widest uppercase">tk</span>
                                    </span>

                                    {/* Süre */}
                                    <div className="pr-4 text-right">
                                        <Badge color={log.duration > 2000 ? 'warn' : 'default'}>
                                            {fmtMs(log.duration)}
                                        </Badge>
                                    </div>

                                    {/* Chevron */}
                                    <div className={`text-stone-400 transition-transform duration-200 flex justify-end ${isOpen ? 'rotate-90 text-[#378ADD]' : ''}`}>
                                        <ChevronRight size={16} />
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