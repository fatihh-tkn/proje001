import React, { useState, useEffect, useCallback } from 'react';
import { History, RefreshCw, CheckCircle2, XCircle, ShieldCheck, ShieldAlert, Clock, Zap, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';

const API_BASE = '/api/orchestrator/agents';

function _roleFromId(agentId) {
    if (!agentId) return null;
    // sys_node_rag_search → rag_search
    return agentId.replace(/^sys_node_/, '');
}

function _fmtMs(ms) {
    if (ms == null) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

function _fmtDate(iso) {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
        return iso;
    }
}

function ComplexityBadge({ value }) {
    if (!value) return null;
    const map = {
        low: { label: 'Basit', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        medium: { label: 'Orta', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
        high: { label: 'Karmaşık', cls: 'bg-red-50 text-red-700 border-red-200' },
    };
    const { label, cls } = map[value] || { label: value, cls: 'bg-stone-100 text-stone-600 border-stone-200' };
    return (
        <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border ${cls}`}>
            {label}
        </span>
    );
}

function LogRow({ log }) {
    const [expanded, setExpanded] = useState(false);
    const hasDetail = log.brief || log.cikti_ozet || log.hata_mesaji || log.kullanici_mesaji;

    return (
        <div className={`border rounded-lg overflow-hidden transition-all ${log.basarili_mi ? 'border-stone-100' : 'border-red-100 bg-red-50/30'}`}>
            {/* Header row */}
            <div
                className={`flex items-center gap-2 px-3 py-2 ${hasDetail ? 'cursor-pointer hover:bg-stone-50' : ''}`}
                onClick={() => hasDetail && setExpanded(e => !e)}
            >
                {/* Status icon */}
                <div className="shrink-0">
                    {log.basarili_mi
                        ? <CheckCircle2 size={13} className="text-emerald-500" />
                        : <XCircle size={13} className="text-red-500" />
                    }
                </div>

                {/* Date */}
                <span className="text-[10px] text-stone-400 font-mono shrink-0 w-32">{_fmtDate(log.olusturulma_tarihi)}</span>

                {/* Intent + complexity */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {log.intent && (
                        <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200 font-mono">
                            {log.intent}
                        </span>
                    )}
                    <ComplexityBadge value={log.complexity} />
                    {log.kullanici_mesaji && (
                        <span className="text-[10px] text-stone-500 truncate">{log.kullanici_mesaji}</span>
                    )}
                </div>

                {/* Critic result (only for critic/aggregator nodes) */}
                {log.critic_onayladi_mi != null && (
                    <div className="shrink-0">
                        {log.critic_onayladi_mi
                            ? <ShieldCheck size={12} className="text-emerald-500" />
                            : <ShieldAlert size={12} className="text-amber-500" />
                        }
                    </div>
                )}

                {/* Duration */}
                <div className="flex items-center gap-1 shrink-0 text-[10px] text-stone-400">
                    <Clock size={10} />
                    <span className="font-mono">{_fmtMs(log.sure_ms)}</span>
                </div>

                {/* Tokens */}
                {(log.prompt_token || log.completion_token) && (
                    <div className="flex items-center gap-1 shrink-0 text-[10px] text-stone-400">
                        <Zap size={10} />
                        <span className="font-mono">{(log.prompt_token || 0) + (log.completion_token || 0)}</span>
                    </div>
                )}

                {/* Confidence */}
                {log.intent_confidence != null && (
                    <span className="text-[10px] font-mono text-stone-400 shrink-0">
                        {(log.intent_confidence * 100).toFixed(0)}%
                    </span>
                )}

                {/* Expand toggle */}
                {hasDetail && (
                    <div className="shrink-0 text-stone-300">
                        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </div>
                )}
            </div>

            {/* Expanded detail */}
            {expanded && hasDetail && (
                <div className="px-3 pb-3 pt-1 border-t border-stone-100 space-y-2">
                    {log.brief && (
                        <div>
                            <div className="text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">Brief</div>
                            <p className="text-[11px] text-stone-600 leading-snug">{log.brief}</p>
                        </div>
                    )}
                    {log.cikti_ozet && (
                        <div>
                            <div className="text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">Çıktı Özeti</div>
                            <p className="text-[11px] text-stone-600 leading-snug font-mono bg-stone-50 rounded p-2 border border-stone-100 whitespace-pre-wrap">{log.cikti_ozet}</p>
                        </div>
                    )}
                    {log.hata_mesaji && (
                        <div>
                            <div className="text-[9px] font-bold text-red-400 uppercase tracking-wider mb-0.5">Hata</div>
                            <p className="text-[11px] text-red-600 leading-snug font-mono">{log.hata_mesaji}</p>
                        </div>
                    )}
                    {log.revision_sayisi > 0 && (
                        <div className="flex items-center gap-1.5">
                            <ShieldAlert size={11} className="text-amber-500" />
                            <span className="text-[10px] text-amber-600 font-semibold">{log.revision_sayisi}× revizyon turu</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function AgentLogsPanel({ selectedItem }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const role = _roleFromId(selectedItem?.id);

    const load = useCallback(async () => {
        if (!role) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/${role}/logs?limit=50`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setLogs(data.logs || []);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [role]);

    useEffect(() => { load(); }, [load]);

    if (!role) return null;

    const successCount = logs.filter(l => l.basarili_mi).length;
    const avgMs = logs.length
        ? Math.round(logs.reduce((s, l) => s + (l.sure_ms || 0), 0) / logs.length)
        : 0;

    return (
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100 bg-stone-50">
                <div className="flex items-center gap-2">
                    <History size={13} className="text-stone-500" />
                    <span className="text-[10px] font-black text-stone-600 uppercase tracking-widest">Çalışma Geçmişi</span>
                </div>
                <div className="flex items-center gap-3">
                    {logs.length > 0 && (
                        <div className="flex items-center gap-2.5 text-[10px] text-stone-500">
                            <span className="flex items-center gap-1">
                                <CheckCircle2 size={10} className="text-emerald-500" />
                                <span className="font-bold">{successCount}/{logs.length}</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock size={10} />
                                <span className="font-bold font-mono">{_fmtMs(avgMs)}</span>
                                <span className="text-stone-400">ort.</span>
                            </span>
                        </div>
                    )}
                    <button
                        onClick={load}
                        disabled={loading}
                        className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-all"
                        title="Yenile"
                    >
                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="p-4">
                {loading && (
                    <div className="flex items-center justify-center py-8 text-stone-400 text-[11px] gap-2">
                        <RefreshCw size={14} className="animate-spin" />
                        Geçmiş yükleniyor...
                    </div>
                )}

                {!loading && error && (
                    <div className="flex items-center gap-2 py-4 text-red-500 text-[11px] bg-red-50 rounded-lg px-3">
                        <XCircle size={13} />
                        {error}
                    </div>
                )}

                {!loading && !error && logs.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-stone-400 gap-2">
                        <MessageSquare size={28} strokeWidth={1.5} />
                        <p className="text-[11px]">Bu ajan henüz çalışmamış</p>
                        <p className="text-[10px] text-stone-300">İlk sohbet sonrası burada görünür</p>
                    </div>
                )}

                {!loading && !error && logs.length > 0 && (
                    <div className="space-y-1.5">
                        {logs.map(log => (
                            <LogRow key={log.kimlik} log={log} />
                        ))}
                    </div>
                )}
            </div>

            <div className="px-4 py-2 border-t border-stone-100 bg-stone-50">
                <p className="text-[10px] text-stone-400">
                    Son 50 çalışma · Detay için satıra tıkla
                </p>
            </div>
        </div>
    );
}
