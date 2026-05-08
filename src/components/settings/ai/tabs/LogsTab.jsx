import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Search, Activity, Filter, Box, CheckCircle2, AlertCircle,
    Clock, Trash2, X, User, Zap, TrendingUp, BarChart2,
    ChevronDown, ChevronUp, Globe, Monitor, Tag, Cpu,
} from 'lucide-react';
import { API_BASE, fetchWithTimeout, formatRelativeTime, formatDate, truncatedText, getModelColor, fmtCost } from '../utils';
import AgentLogsPanel from '../orchestrator/AgentLogsPanel';

/* ── Helpers ── */
function fmtDuration(ms) {
    if (ms == null) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

function fmtCostLocal(c) {
    if (c == null || c === 0) return '—';
    if (c < 0.001) return `$${(c * 1000).toFixed(3)}m`;
    return `$${Number(c).toFixed(4)}`;
}

/* ── Section Header ── */
function ASection({ label, right }) {
    return (
        <div className="flex items-center gap-3 mb-3">
            <span className="text-[9px] font-black tracking-[0.18em] text-stone-400 uppercase whitespace-nowrap">
                {label}
            </span>
            <div className="flex-1 border-t border-stone-100" />
            {right && <div className="shrink-0">{right}</div>}
        </div>
    );
}

/* ── Stat Chip ── */
function StatChip({ icon: Icon, label, value, color = 'text-stone-700' }) {
    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-stone-200 rounded-lg shadow-sm">
            <Icon size={12} className="text-stone-400 shrink-0" />
            <div>
                <div className={`text-[13px] font-black leading-none ${color}`}>{value}</div>
                <div className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider mt-0.5">{label}</div>
            </div>
        </div>
    );
}

/* ── Model Badge ── */
function ModelBadge({ model }) {
    const color = getModelColor(model);
    return (
        <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border"
            style={{ color, borderColor: `${color}40`, backgroundColor: `${color}10` }}
        >
            <Box size={9} /> {model || '—'}
        </span>
    );
}

/* ── Token Bar ── */
function TokenBar({ prompt = 0, completion = 0 }) {
    const total = prompt + completion;
    if (total === 0) return null;
    const pct = Math.round((prompt / total) * 100);
    return (
        <div className="mt-1.5">
            <div className="w-full h-1 rounded-full bg-stone-100 overflow-hidden">
                <div className="h-full rounded-full bg-[#378ADD]" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between mt-0.5">
                <span className="text-[9px] font-bold text-[#378ADD]">{pct}% giriş</span>
                <span className="text-[9px] font-bold text-stone-400">{100 - pct}% çıktı</span>
            </div>
        </div>
    );
}

/* ── Detail Row ── */
function ARow({ icon: Icon, label, children }) {
    return (
        <div className="flex items-start gap-3 py-2 border-b border-stone-100 last:border-0">
            <div className="flex items-center gap-1.5 shrink-0 w-[38%]">
                <Icon size={10} className="text-stone-400 shrink-0" />
                <span className="text-[9px] font-semibold text-stone-500">{label}</span>
            </div>
            <div className="flex-1 min-w-0 text-[11px] font-semibold text-stone-700">{children}</div>
        </div>
    );
}

/* ── Expandable Log Row ── */
function LogRow({ log }) {
    const [open, setOpen] = useState(false);
    const isError  = log.status !== 'success';
    const prompt   = log.promptTokens     || 0;
    const complete = log.completionTokens || 0;
    const total    = log.totalTokens      || prompt + complete;

    return (
        <>
            {/* ── Summary Row ── */}
            <tr
                onClick={() => setOpen(o => !o)}
                className={`cursor-pointer transition-colors group ${
                    open
                        ? 'bg-stone-50'
                        : isError
                            ? 'bg-red-50/30 hover:bg-red-50/60'
                            : 'hover:bg-stone-50'
                }`}
            >
                {/* Status */}
                <td className="px-4 py-3 text-center">
                    {isError
                        ? <AlertCircle size={14} className="text-red-500 mx-auto" />
                        : <CheckCircle2 size={14} className="text-emerald-500 mx-auto" />
                    }
                </td>

                {/* Model */}
                <td className="px-4 py-3">
                    <ModelBadge model={log.model} />
                </td>

                {/* Request */}
                <td className="px-4 py-3">
                    {isError ? (
                        <span className="text-[11px] text-red-500 font-semibold">{log.error || 'Hata Oluştu'}</span>
                    ) : (
                        <span className="text-[11px] text-stone-600 font-mono leading-snug">
                            {truncatedText(log.request, 80) || <span className="text-stone-300 italic">Boş istek</span>}
                        </span>
                    )}
                </td>

                {/* Duration */}
                <td className="px-4 py-3 text-right">
                    <span className={`text-[11px] font-mono ${
                        log.duration > 5000 ? 'text-red-500 font-bold' :
                        log.duration > 2000 ? 'text-amber-600 font-bold' :
                        'text-stone-500'
                    }`}>
                        {fmtDuration(log.duration)}
                    </span>
                </td>

                {/* Tokens */}
                <td className="px-4 py-3 text-right">
                    <span className="text-[12px] font-black text-[#378ADD]">
                        {total.toLocaleString('tr-TR')}
                    </span>
                </td>

                {/* Cost */}
                <td className="px-4 py-3 text-right">
                    <span className={`text-[11px] font-bold ${log.cost ? 'text-stone-600' : 'text-stone-300'}`}>
                        {fmtCostLocal(log.cost)}
                    </span>
                </td>

                {/* Time + chevron */}
                <td className="px-4 py-3 text-right">
                    <span className="flex items-center justify-end gap-2 text-[10px] text-stone-400 whitespace-nowrap">
                        <Clock size={10} className="opacity-50" />
                        {formatRelativeTime(log.timestamp)}
                        <span className="text-stone-300 group-hover:text-stone-400 transition-colors">
                            {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </span>
                    </span>
                </td>
            </tr>

            {/* ── Expanded Detail ── */}
            {open && (
                <tr className="bg-stone-50 border-t border-stone-100">
                    <td colSpan={7} className="px-5 py-4">
                        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-1 duration-150">

                            {/* ── Metadata grid ── */}
                            <div className="grid grid-cols-2 gap-3">

                                {/* Sol: genel bilgiler */}
                                <div className="bg-white border border-stone-200 rounded-xl shadow-sm px-4 divide-y divide-stone-50">
                                    <ARow icon={Clock} label="Tarih / Saat">
                                        <span className="font-mono text-stone-600">{formatDate(log.timestamp)}</span>
                                    </ARow>
                                    <ARow icon={Cpu} label="Model">
                                        <ModelBadge model={log.model} />
                                    </ARow>
                                    <ARow icon={Globe} label="IP Adresi">
                                        <span className="font-mono text-stone-500">{log.ip || '—'}</span>
                                    </ARow>
                                    <ARow icon={Monitor} label="MAC Adresi">
                                        <span className="font-mono text-stone-500">{log.mac || '—'}</span>
                                    </ARow>
                                    <ARow icon={Tag} label="Maliyet">
                                        <span className="font-mono font-black text-stone-700">{fmtCost ? fmtCost(log.cost) : fmtCostLocal(log.cost)}</span>
                                    </ARow>
                                </div>

                                {/* Sağ: token analizi */}
                                <div className="bg-white border border-stone-200 rounded-xl shadow-sm px-4 py-3">
                                    <div className="text-[9px] font-black tracking-[0.15em] text-stone-400 uppercase mb-2">Token Kullanımı</div>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <div className="text-[20px] font-black text-[#378ADD] leading-none">
                                                {total.toLocaleString('tr-TR')}
                                            </div>
                                            <div className="text-[9px] text-stone-400 font-semibold uppercase tracking-wider mt-0.5">Toplam</div>
                                        </div>
                                        <div className="flex items-center gap-3 text-right">
                                            <div>
                                                <div className="text-[12px] font-black text-stone-700">{prompt.toLocaleString('tr-TR')}</div>
                                                <div className="text-[9px] text-stone-400 font-semibold uppercase tracking-wider">Giriş</div>
                                            </div>
                                            <div className="w-px h-6 bg-stone-100" />
                                            <div>
                                                <div className="text-[12px] font-black text-stone-700">{complete.toLocaleString('tr-TR')}</div>
                                                <div className="text-[9px] text-stone-400 font-semibold uppercase tracking-wider">Çıktı</div>
                                            </div>
                                        </div>
                                    </div>
                                    <TokenBar prompt={prompt} completion={complete} />
                                </div>
                            </div>

                            {/* ── Hata ── */}
                            {isError && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <AlertCircle size={11} className="text-red-500" />
                                        <span className="text-[9px] font-black tracking-[0.15em] text-red-500 uppercase">Hata Detayı</span>
                                    </div>
                                    <p className="text-[11px] text-red-600 font-mono bg-white/60 p-2.5 rounded-lg border border-red-100">
                                        {log.error || 'Bilinmeyen Hata'}
                                    </p>
                                </div>
                            )}

                            {/* ── Prompt ── */}
                            <div>
                                <div className="text-[9px] font-black tracking-[0.15em] text-stone-400 uppercase mb-1.5">Kullanıcı İsteği (Prompt)</div>
                                <div className="bg-white border border-stone-200 rounded-xl p-3 text-[11px] text-stone-700 whitespace-pre-wrap font-mono overflow-x-auto leading-relaxed max-h-[220px] overflow-y-auto">
                                    {log.request || <span className="text-stone-300 italic">—</span>}
                                </div>
                                <div className="mt-1 flex justify-end">
                                    <span className="text-[9px] font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded">
                                        {prompt.toLocaleString('tr-TR')} token
                                    </span>
                                </div>
                            </div>

                            {/* ── Response ── */}
                            {!isError && log.response && (
                                <div>
                                    <div className="text-[9px] font-black tracking-[0.15em] text-stone-400 uppercase mb-1.5">Yapay Zeka Yanıtı</div>
                                    <div className="bg-[#378ADD]/5 border border-[#378ADD]/20 rounded-xl p-3 text-[11px] text-stone-700 whitespace-pre-wrap font-mono overflow-x-auto leading-relaxed max-h-[280px] overflow-y-auto">
                                        {log.response}
                                    </div>
                                    <div className="mt-1 flex justify-end">
                                        <span className="text-[9px] font-bold text-[#378ADD] bg-[#378ADD]/10 px-2 py-0.5 rounded">
                                            {complete.toLocaleString('tr-TR')} token çıktı
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

/* ═══════════════════════════════════════════════════════ */
export const LogsTab = ({ compact = false, filterUser = null, onClearUserFilter, agent = null }) => {
    const isGraphNode = !compact && agent && (agent.agentKind === 'graph_node' || agent.id?.startsWith('sys_node_'));

    const [logs, setLogs] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [filters, setFilters] = useState({ search: '', model: '', status: '' });

    const streamRef = useRef(null);
    const bufferRef = useRef('');

    const connectStream = useCallback(() => {
        const query = new URLSearchParams();
        if (filters.search) query.append('search', filters.search);
        if (filters.model)  query.append('model',  filters.model);
        if (filters.status) query.append('status', filters.status);
        if (filterUser?.id) query.append('user_id', filterUser.id);

        if (streamRef.current) streamRef.current.abort();
        const controller = new AbortController();
        streamRef.current = controller;
        setIsConnected(false);

        fetch(`${API_BASE}/logs/stream?${query}`, { signal: controller.signal })
            .then(async (res) => {
                setIsConnected(true);
                const reader  = res.body.getReader();
                const decoder = new TextDecoder('utf-8');
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        bufferRef.current += decoder.decode(value, { stream: true });
                        const lines = bufferRef.current.split('\n');
                        bufferRef.current = lines.pop() || '';
                        for (const line of lines) {
                            if (!line.trim().startsWith('data:')) continue;
                            const raw = line.replace(/^data:\s*/, '');
                            if (!raw) continue;
                            try {
                                const evt = JSON.parse(raw);
                                if (evt.type === 'snapshot') {
                                    setLogs(evt.logs || []);
                                } else if (evt.type === 'new' && evt.logs) {
                                    setLogs(prev => [...evt.logs, ...prev].slice(0, 1000));
                                }
                            } catch { /* ignore */ }
                        }
                    }
                } catch (e) {
                    if (e.name !== 'AbortError') setIsConnected(false);
                }
            })
            .catch(e => { if (e.name !== 'AbortError') setIsConnected(false); });
    }, [filters, filterUser]);

    useEffect(() => {
        const t = setTimeout(connectStream, 500);
        return () => { clearTimeout(t); streamRef.current?.abort(); };
    }, [connectStream]);

    const handleClearLogs = async () => {
        if (!window.confirm('Tüm log kayıtlarını temizlemek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
        setClearing(true);
        try {
            await fetchWithTimeout(`${API_BASE}/logs`, { method: 'DELETE' });
            setLogs([]);
        } catch { /* ignore */ }
        setClearing(false);
    };

    /* ── Derived stats ── */
    const successCount = logs.filter(l => l.status === 'success').length;
    const errorCount   = logs.length - successCount;
    const successRate  = logs.length ? Math.round((successCount / logs.length) * 100) : 0;
    const totalTokens  = logs.reduce((s, l) => s + (l.totalTokens || 0), 0);
    const avgDuration  = logs.length
        ? Math.round(logs.reduce((s, l) => s + (l.duration || 0), 0) / logs.length)
        : 0;
    const totalCost = logs.reduce((s, l) => s + (l.cost || 0), 0);

    return (
        <div className="flex flex-col h-full overflow-y-auto bg-stone-50 p-5 gap-5 font-sans animate-in fade-in duration-300 w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

            {isGraphNode && <AgentLogsPanel selectedItem={agent} />}

            <div className="flex flex-col gap-4">

                {/* ── Section Header ── */}
                <ASection
                    label={compact ? 'Canlı İstek Logları' : 'API İstekleri'}
                    right={
                        <div className="flex items-center gap-2">
                            {isConnected ? (
                                <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Canlı
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-[10px] text-amber-600 font-bold px-2 py-0.5 bg-amber-50 rounded-full border border-amber-100">
                                    <Activity size={10} className="animate-spin" /> Bağlanıyor...
                                </span>
                            )}
                            <button
                                onClick={handleClearLogs}
                                disabled={clearing}
                                className="flex items-center gap-1 px-2 py-1 bg-white border border-stone-200 text-stone-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 rounded-lg transition-colors text-[10px] font-bold"
                            >
                                {clearing ? <Activity size={11} className="animate-spin" /> : <Trash2 size={11} />}
                                Temizle
                            </button>
                        </div>
                    }
                />

                {/* ── İstatistik Şeridi ── */}
                {logs.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <StatChip icon={BarChart2} label="Toplam İstek" value={logs.length.toLocaleString('tr-TR')} color="text-[#378ADD]" />
                        <StatChip
                            icon={TrendingUp}
                            label="Başarı Oranı"
                            value={`%${successRate}`}
                            color={successRate >= 90 ? 'text-emerald-600' : successRate >= 70 ? 'text-amber-600' : 'text-red-600'}
                        />
                        <StatChip icon={Clock} label="Ort. Süre" value={fmtDuration(avgDuration)} />
                        <StatChip icon={Zap} label="Toplam Token" value={totalTokens > 1000 ? `${(totalTokens / 1000).toFixed(1)}K` : totalTokens} />
                    </div>
                )}

                {/* Kullanıcı filtresi */}
                {filterUser && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-[#378ADD]/10 border border-[#378ADD]/30 rounded-lg">
                        <User size={12} className="text-[#378ADD] shrink-0" strokeWidth={2.5} />
                        <span className="text-[11px] font-bold text-[#378ADD] flex-1 truncate">
                            {filterUser.name || filterUser.email} — logları
                        </span>
                        {onClearUserFilter && (
                            <button onClick={onClearUserFilter} className="p-0.5 rounded text-[#378ADD] hover:text-[#1a4f8a] transition-colors shrink-0">
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>
                )}

                {/* ── Filtreler ── */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[180px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={12} />
                        <input
                            type="text"
                            placeholder="İstek, yanıt, IP, MAC ara..."
                            className="w-full pl-8 pr-4 py-2 bg-white border border-stone-200 rounded-lg text-[12px] text-stone-700 placeholder:text-stone-400 focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20 transition-all"
                            value={filters.search}
                            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                            autoComplete="off"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={12} />
                        <select
                            className="appearance-none pl-8 pr-6 py-2 bg-white border border-stone-200 rounded-lg text-[12px] text-stone-700 focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20 transition-all font-semibold"
                            value={filters.model}
                            onChange={(e) => setFilters(f => ({ ...f, model: e.target.value }))}
                        >
                            <option value="">Tüm Modeller</option>
                            <option value="gpt-4">gpt-4</option>
                            <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                            <option value="claude-3-opus">claude-3-opus</option>
                            <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                            <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                            <option value="gemma3:4b">gemma3:4b</option>
                        </select>
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={12} />
                        <select
                            className="appearance-none pl-8 pr-6 py-2 bg-white border border-stone-200 rounded-lg text-[12px] text-stone-700 focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20 transition-all font-semibold"
                            value={filters.status}
                            onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                        >
                            <option value="">Tüm Durumlar</option>
                            <option value="success">Başarılı</option>
                            <option value="error">Hatalı</option>
                        </select>
                    </div>
                </div>

                {/* ── Tablo ── */}
                <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="border-b border-stone-100">
                                <tr className="bg-stone-50">
                                    <th className="px-4 py-2.5 text-[9px] font-black text-stone-400 uppercase tracking-[0.15em] w-10 text-center">—</th>
                                    <th className="px-4 py-2.5 text-[9px] font-black text-stone-400 uppercase tracking-[0.15em] w-32">Model</th>
                                    <th className="px-4 py-2.5 text-[9px] font-black text-stone-400 uppercase tracking-[0.15em]">İstek</th>
                                    <th className="px-4 py-2.5 text-[9px] font-black text-stone-400 uppercase tracking-[0.15em] text-right w-20">Süre</th>
                                    <th className="px-4 py-2.5 text-[9px] font-black text-stone-400 uppercase tracking-[0.15em] text-right w-20">Token</th>
                                    <th className="px-4 py-2.5 text-[9px] font-black text-stone-400 uppercase tracking-[0.15em] text-right w-20">Maliyet</th>
                                    <th className="px-4 py-2.5 text-[9px] font-black text-stone-400 uppercase tracking-[0.15em] text-right w-32">Zaman</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-stone-400">
                                            <Activity className="mx-auto mb-3 opacity-30" size={28} strokeWidth={1.5} />
                                            <p className="text-[12px] font-semibold text-stone-500">Log kaydı bulunamadı</p>
                                            <p className="text-[10px] mt-1 text-stone-400">AI isteği yapıldıkça burada listelenecektir.</p>
                                        </td>
                                    </tr>
                                ) : logs.map(log => (
                                    <LogRow key={log.id} log={log} />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {logs.length > 0 && (
                        <div className="px-4 py-2 border-t border-stone-100 bg-stone-50 flex items-center justify-between">
                            <span className="text-[10px] text-stone-400">
                                {logs.length} kayıt
                                {errorCount > 0 && <span className="text-red-400 font-semibold"> · {errorCount} hata</span>}
                                {' · '}Detay için satıra tıkla
                            </span>
                            {totalCost > 0 && (
                                <span className="text-[10px] font-bold text-stone-500">
                                    Toplam: {fmtCostLocal(totalCost)}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
