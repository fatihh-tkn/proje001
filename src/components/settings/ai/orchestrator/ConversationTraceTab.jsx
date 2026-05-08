import React, { useState, useEffect, useCallback } from 'react';
import {
    RefreshCw, MessageSquare, ChevronDown, ChevronRight,
    CheckCircle2, XCircle, Clock, Zap, Bot, ShieldCheck, ShieldAlert,
} from 'lucide-react';

const ROLE_LABELS = {
    supervisor:   { label: 'Süpervizör',   color: '#6366f1', bg: '#eef2ff' },
    rag_search:   { label: 'RAG Arama',    color: '#0ea5e9', bg: '#f0f9ff' },
    error_solver: { label: 'Hata Çözücü', color: '#f59e0b', bg: '#fffbeb' },
    zli_finder:   { label: 'ZLI Bulucu',   color: '#10b981', bg: '#ecfdf5' },
    n8n_trigger:  { label: 'N8N Tetik',    color: '#f43f5e', bg: '#fff1f2' },
    aggregator:   { label: 'Birleştirici', color: '#a855f7', bg: '#faf5ff' },
    msg_polish:   { label: 'Üslup',        color: '#ec4899', bg: '#fdf2f8' },
};

function fmtMs(ms) {
    if (!ms) return '—';
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function fmtDate(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('tr-TR', {
            day: '2-digit', month: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
    } catch { return iso; }
}

function AgentStep({ step, isLast }) {
    const [open, setOpen] = useState(false);
    const meta = ROLE_LABELS[step.ajan_rolu] || { label: step.ajan_rolu, color: '#64748b', bg: '#f8fafc' };
    const hasDetail = step.cikti_ozet || step.hata_mesaji;

    return (
        <div className="flex gap-3">
            {/* Timeline line */}
            <div className="flex flex-col items-center shrink-0 w-5">
                <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: meta.color }} />
                {!isLast && <div className="w-px flex-1 mt-1" style={{ background: meta.color + '30' }} />}
            </div>

            {/* Content */}
            <div className="flex-1 pb-3 min-w-0">
                <div
                    className={`flex items-center gap-2 ${hasDetail ? 'cursor-pointer' : ''}`}
                    onClick={() => hasDetail && setOpen(o => !o)}
                >
                    {/* Role badge */}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: meta.bg, color: meta.color }}>
                        {meta.label}
                    </span>

                    {/* Status */}
                    {step.basarili_mi
                        ? <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                        : <XCircle size={11} className="text-red-500 shrink-0" />}

                    {/* Critic badge */}
                    {step.critic_onayladi_mi != null && (
                        step.critic_onayladi_mi
                            ? <ShieldCheck size={11} className="text-emerald-500 shrink-0" />
                            : <ShieldAlert size={11} className="text-amber-500 shrink-0" />
                    )}

                    {/* Duration */}
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock size={9} /> {fmtMs(step.sure_ms)}
                    </span>

                    {/* Tokens */}
                    {(step.prompt_token || step.completion_token) ? (
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                            <Zap size={9} /> {(step.prompt_token || 0) + (step.completion_token || 0)}tk
                        </span>
                    ) : null}

                    {/* Revision count */}
                    {step.revision_sayisi > 0 && (
                        <span className="text-[9px] text-amber-600 font-bold">{step.revision_sayisi}× revizyon</span>
                    )}

                    {hasDetail && (
                        <span className="ml-auto text-slate-300 shrink-0">
                            {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                        </span>
                    )}
                </div>

                {open && hasDetail && (
                    <div className="mt-1.5 space-y-1.5">
                        {step.cikti_ozet && (
                            <div className="bg-slate-50 border border-slate-100 rounded p-2">
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Çıktı Özeti</div>
                                <p className="text-[10px] text-slate-600 font-mono leading-snug whitespace-pre-wrap">{step.cikti_ozet}</p>
                            </div>
                        )}
                        {step.hata_mesaji && (
                            <div className="bg-red-50 border border-red-100 rounded p-2">
                                <div className="text-[9px] font-bold text-red-400 uppercase tracking-wider mb-0.5">Hata</div>
                                <p className="text-[10px] text-red-600 font-mono leading-snug">{step.hata_mesaji}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function ConversationCard({ trace }) {
    const [open, setOpen] = useState(false);
    const totalMs = trace.adimlar.reduce((s, a) => s + (a.sure_ms || 0), 0);
    const totalTok = trace.adimlar.reduce((s, a) => s + (a.prompt_token || 0) + (a.completion_token || 0), 0);
    const hasError = trace.adimlar.some(a => !a.basarili_mi);
    const agentRoles = [...new Set(trace.adimlar.map(a => a.ajan_rolu))];

    return (
        <div className={`border rounded-lg overflow-hidden ${hasError ? 'border-red-200 bg-red-50/20' : 'border-stone-200 bg-white'}`}>
            {/* Header — always visible */}
            <div
                className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-stone-50/60 transition-colors"
                onClick={() => setOpen(o => !o)}
            >
                <MessageSquare size={13} className="text-stone-400 mt-0.5 shrink-0" />

                <div className="flex-1 min-w-0">
                    {/* User message */}
                    <p className="text-[12px] text-stone-700 font-medium leading-snug truncate">
                        {trace.kullanici_mesaji || <span className="text-stone-400 italic">Mesaj yok</span>}
                    </p>
                    {/* Meta row */}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-[10px] text-stone-400 font-mono">{fmtDate(trace.baslangi_tarihi)}</span>

                        {trace.intent && (
                            <span className="text-[9px] font-bold bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded border border-stone-200 font-mono">
                                {trace.intent}
                            </span>
                        )}

                        {/* Active agents */}
                        <div className="flex items-center gap-1 flex-wrap">
                            {agentRoles.map(role => {
                                const m = ROLE_LABELS[role] || { label: role, color: '#64748b', bg: '#f8fafc' };
                                return (
                                    <span key={role} className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                                        style={{ background: m.bg, color: m.color }}>
                                        {m.label}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right meta */}
                <div className="flex items-center gap-3 shrink-0">
                    {hasError && <XCircle size={12} className="text-red-400" />}
                    <span className="text-[10px] text-stone-400 font-mono flex items-center gap-1">
                        <Clock size={10} /> {fmtMs(totalMs)}
                    </span>
                    {totalTok > 0 && (
                        <span className="text-[10px] text-stone-400 font-mono flex items-center gap-1">
                            <Zap size={10} /> {totalTok >= 1000 ? `${Math.round(totalTok / 1000)}K` : totalTok}tk
                        </span>
                    )}
                    <span className="text-[10px] text-stone-400">
                        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </span>
                </div>
            </div>

            {/* Agent steps — expanded */}
            {open && (
                <div className="px-4 pb-3 pt-1 border-t border-stone-100">
                    {trace.adimlar.map((step, i) => (
                        <AgentStep key={step.kimlik || i} step={step} isLast={i === trace.adimlar.length - 1} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function ConversationTraceTab() {
    const [traces, setTraces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/orchestrator/conversation-traces?limit=50');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setTraces(data.traces || []);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="w-full h-full flex flex-col bg-stone-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-200 bg-white shrink-0">
                <div className="flex items-center gap-2">
                    <Bot size={13} className="text-[#378ADD]" strokeWidth={2.5} />
                    <span className="text-[11px] font-black uppercase tracking-widest text-stone-600">Sohbet Ajan İzleri</span>
                    {traces.length > 0 && (
                        <span className="text-[10px] text-stone-400 font-mono">· {traces.length} sohbet</span>
                    )}
                </div>
                <button
                    onClick={load}
                    disabled={loading}
                    className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-all"
                >
                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ scrollbarWidth: 'thin' }}>
                {loading && (
                    <div className="flex items-center justify-center gap-2 py-16 text-stone-400 text-[11px]">
                        <RefreshCw size={14} className="animate-spin" /> Yükleniyor...
                    </div>
                )}

                {!loading && error && (
                    <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-[11px]">
                        <XCircle size={13} /> {error}
                    </div>
                )}

                {!loading && !error && traces.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-stone-400 gap-3">
                        <MessageSquare size={36} strokeWidth={1.5} />
                        <p className="text-[12px] font-medium">Henüz sohbet izleri yok</p>
                        <p className="text-[10px] text-stone-300">İlk ajan sohbetinden sonra burada görünür</p>
                    </div>
                )}

                {!loading && !error && traces.map((trace, i) => (
                    <ConversationCard key={trace.oturum_kimlik || i} trace={trace} />
                ))}
            </div>

            {traces.length > 0 && (
                <div className="px-4 py-2 border-t border-stone-100 bg-stone-50 shrink-0">
                    <p className="text-[10px] text-stone-400">Konuşmaya tıkla · ajan adımlarını gör</p>
                </div>
            )}
        </div>
    );
}
