import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { API_BASE, fetchWithTimeout, formatDate, fmtMs, fmtCost, fmt } from '../utils';

export const LogsTab = React.memo(() => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [modelFilter, setModelFilter] = useState("all");
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

    // Veriler içindeki benzersiz modelleri çıkar
    const models = useMemo(() => {
        const set = new Set(logs.map(l => l.model).filter(Boolean));
        return Array.from(set).sort();
    }, [logs]);

    // OPTİMİZASYON: Gereksiz filtrelemeyi engellemek için useMemo kullanıldı
    const filtered = useMemo(() => {
        const lowerSearch = search.toLowerCase();
        return logs.filter(l => {
            const matchesSearch = !search || (
                (l.model || '').toLowerCase().includes(lowerSearch) ||
                (l.request || '').toLowerCase().includes(lowerSearch) ||
                (l.response || '').toLowerCase().includes(lowerSearch)
            );
            const matchesModel = modelFilter === "all" || l.model === modelFilter;
            return matchesSearch && matchesModel;
        });
    }, [logs, search, modelFilter]);

    return (
        <div className="bg-[var(--window-bg)] border border-[var(--window-border)] rounded-sm overflow-hidden shadow-sm flex flex-col">
            <div className="p-4 border-b border-[var(--window-border)] flex flex-wrap gap-4 justify-between items-center bg-[var(--sidebar-hover)]">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sidebar-text-muted)]" />
                        <input
                            className="pl-9 pr-3 py-1.5 bg-[var(--window-bg)] border border-[var(--window-border)] rounded-sm text-sm w-56 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] text-[var(--workspace-text)]"
                            placeholder="İçerikte ara..."
                            value={search} onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <select
                        value={modelFilter}
                        onChange={e => setModelFilter(e.target.value)}
                        className="bg-[var(--window-bg)] border border-[var(--window-border)] rounded-sm text-[11px] font-bold px-3 py-1.5 text-[var(--workspace-text)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                    >
                        <option value="all">TÜM MODELLER</option>
                        {models.map(m => (
                            <option key={m} value={m}>{m.toUpperCase()}</option>
                        ))}
                    </select>
                </div>
                <button onClick={fetchLogs} className="p-2 rounded-sm hover:bg-[var(--window-bg)] text-[var(--sidebar-text-muted)] hover:text-[var(--workspace-text)] transition-colors">
                    <RefreshCw size={16} />
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap text-sm">
                    <thead className="bg-[var(--sidebar-hover)] text-[var(--sidebar-text-muted)] font-semibold text-xs uppercase">
                        <tr>
                            <th className="px-4 py-3 border-b border-[var(--window-border)]">Tarih</th>
                            <th className="px-4 py-3 border-b border-[var(--window-border)]">Durum</th>
                            <th className="px-4 py-3 border-b border-[var(--window-border)]">Model</th>
                            <th className="px-4 py-3 border-b border-[var(--window-border)] max-w-[200px]">Prompt Önizleme</th>
                            <th className="px-4 py-3 border-b border-[var(--window-border)] max-w-[200px]">Yanıt Önizleme</th>
                            <th className="px-4 py-3 border-b border-[var(--window-border)] text-right">Tokens</th>
                            <th className="px-4 py-3 border-b border-[var(--window-border)] text-right">Süre</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--window-border)]">
                        {loading ? <tr><td colSpan={7} className="text-center py-8 text-[var(--sidebar-text-muted)]">Yükleniyor...</td></tr> :
                            filtered.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-[var(--sidebar-text-muted)]">Log bulunamadı</td></tr> :
                                filtered.map(log => (
                                    <React.Fragment key={log.id}>
                                        <tr
                                            onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                            className={`transition-colors cursor-pointer ${expandedLogId === log.id ? 'bg-[var(--sidebar-hover)]' : 'hover:bg-[var(--sidebar-hover)]'}`}
                                            title="Tıklayarak detayları gör"
                                        >
                                            <td className="px-4 py-3 font-mono text-xs text-[var(--sidebar-text-muted)]">{formatDate(log.timestamp)}</td>
                                            <td className="px-4 py-3">
                                                {log.status === 'success'
                                                    ? <span className="bg-emerald-500/10 text-emerald-500 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-500/20">BAŞARILI</span>
                                                    : <span className="bg-red-500/10 text-red-500 font-bold px-2 py-0.5 rounded text-[10px] border border-red-500/20">{log.error || 'HATA'}</span>}
                                            </td>
                                            <td className="px-4 py-3 text-[var(--accent)] font-medium text-xs">{log.model}</td>
                                            <td className="px-4 py-3 max-w-[200px] truncate text-[var(--sidebar-text-muted)]" title={log.request}>{log.request || '-'}</td>
                                            <td className="px-4 py-3 max-w-[200px] truncate text-[var(--sidebar-text-muted)]" title={log.response}>{log.response || '-'}</td>
                                            <td className="px-4 py-3 text-right font-mono text-xs text-[var(--workspace-text)]">{log.totalTokens} <span className="text-[10px] text-[var(--sidebar-text-muted)]">tk</span></td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`font-mono text-xs px-2 py-0.5 rounded ${log.duration > 2000 ? 'bg-amber-500/10 text-amber-500' : 'bg-[var(--sidebar-hover)] text-[var(--sidebar-text-muted)]'}`}>
                                                    {fmtMs(log.duration)}
                                                </span>
                                            </td>
                                        </tr>
                                        {expandedLogId === log.id && (
                                            <tr className="bg-[var(--window-bg)] shadow-inner">
                                                <td colSpan={7} className="p-0 border-b-2 border-[var(--accent)]">
                                                    <div className="p-4 bg-[var(--sidebar-hover)]/30 border-x-2 border-[var(--window-border)] flex flex-col gap-4">

                                                        {/* Log Üst Verileri (Metadata) */}
                                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-[var(--window-bg)] p-3 rounded-sm border border-[var(--window-border)] shadow-sm">
                                                            <div>
                                                                <span className="block text-[9px] uppercase font-black text-[var(--sidebar-text-muted)] tracking-widest mb-1">Bağlantı Bilgisi</span>
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[10px] font-mono text-[var(--workspace-text)]"><span className="text-[var(--sidebar-text-muted)]">IP:</span> {log.ip || '-'}</span>
                                                                    <span className="text-[10px] font-mono text-[var(--workspace-text)]"><span className="text-[var(--sidebar-text-muted)]">MAC:</span> {log.mac || '-'}</span>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span className="block text-[9px] uppercase font-black text-[var(--sidebar-text-muted)] tracking-widest mb-1">Zaman \u0026 Süre</span>
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[10px] font-mono text-[var(--workspace-text)]"><span className="text-[var(--sidebar-text-muted)]">Tarih:</span> {new Date(log.timestamp).toLocaleString('tr-TR')}</span>
                                                                    <span className="text-[10px] font-mono text-[var(--workspace-text)]"><span className="text-[var(--sidebar-text-muted)]">Süre:</span> {fmtMs(log.duration)}</span>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span className="block text-[9px] uppercase font-black text-[var(--sidebar-text-muted)] tracking-widest mb-1">Token Detayı</span>
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[10px] font-mono text-[var(--workspace-text)]"><span className="text-[var(--sidebar-text-muted)]">Giriş (Prompt):</span> {log.promptTokens || 0} tk</span>
                                                                    <span className="text-[10px] font-mono text-[var(--workspace-text)]"><span className="text-[var(--sidebar-text-muted)]">Çıkış (Comp):</span> {log.completionTokens || 0} tk</span>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span className="block text-[9px] uppercase font-black text-[var(--sidebar-text-muted)] tracking-widest mb-1">Maliyet \u0026 Model</span>
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[10px] font-mono text-[var(--accent)] font-bold"><span className="text-[var(--sidebar-text-muted)] font-normal">Tutar:</span> {fmtCost(log.cost)}</span>
                                                                    <span className="text-[10px] font-mono text-[var(--workspace-text)] truncate" title={log.model}><span className="text-[var(--sidebar-text-muted)]">Model:</span> {log.model}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Prompt ve Response Alanı */}
                                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                            <div>
                                                                <h4 className="text-[10px] font-black uppercase text-[var(--sidebar-text-muted)] mb-2 tracking-widest pl-1">İstek (Prompt) Yükü</h4>
                                                                <div className="bg-[var(--window-bg)] border border-[var(--window-border)] rounded-sm p-3 text-xs md:text-[11px] font-medium overflow-x-auto whitespace-pre-wrap max-h-[300px] overflow-y-auto custom-scrollbar text-[var(--workspace-text)] leading-relaxed shadow-sm block">
                                                                    {log.request || '-'}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <h4 className="text-[10px] font-black uppercase text-[var(--sidebar-text-muted)] mb-2 tracking-widest pl-1">API Yanıtı (Response)</h4>
                                                                <div className="bg-[var(--window-bg)] border border-[var(--window-border)] rounded-sm p-3 text-xs md:text-[11px] font-medium overflow-x-auto whitespace-pre-wrap max-h-[300px] overflow-y-auto custom-scrollbar text-[var(--workspace-text)] leading-relaxed shadow-sm block">
                                                                    {log.response || '-'}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {log.status !== 'success' && log.error && (
                                                            <div>
                                                                <h4 className="text-[10px] font-black uppercase text-red-500 mb-2 tracking-widest pl-1">Hata Detayı</h4>
                                                                <div className="bg-red-50 border border-red-200 text-red-700 rounded-sm p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                                                                    {log.error}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

// ── Computers Tab ──