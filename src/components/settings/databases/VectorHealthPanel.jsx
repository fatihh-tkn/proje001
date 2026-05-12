import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    RefreshCw, CheckCircle2, AlertTriangle, XCircle,
    Database, Cpu, FileX2, Layers, Wrench, ChevronRight,
    RotateCcw, Loader2,
} from 'lucide-react';

// ── Yardımcı ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    ok:       { label: 'Sağlıklı',  Icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    warning:  { label: 'Uyarı',     Icon: AlertTriangle,  color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
    critical: { label: 'Kritik',    Icon: XCircle,        color: 'text-red-600',      bg: 'bg-red-50',     border: 'border-red-200',     dot: 'bg-red-500'     },
};

function StatCard({ icon: Icon, label, value, sub, accent }) {
    return (
        <div className={`flex flex-col gap-1 bg-white rounded-xl border px-4 py-3.5 ${accent ? 'border-red-200 bg-red-50/40' : 'border-stone-200'}`}>
            <div className="flex items-center gap-1.5 text-stone-400">
                <Icon size={13} />
                <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
            </div>
            <span className={`text-[22px] font-bold leading-none ${accent ? 'text-red-600' : 'text-stone-800'}`}>
                {value ?? '—'}
            </span>
            {sub && <span className="text-[11px] text-stone-400">{sub}</span>}
        </div>
    );
}

function ModelBar({ model, count, total }) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    const label = model ?? 'Vektörsüz (model yok)';
    const isNull = model === null;
    return (
        <div className="flex items-center gap-3">
            <div className="w-40 text-[11px] text-stone-500 truncate shrink-0" title={label}>{label}</div>
            <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${isNull ? 'bg-red-400' : 'bg-[#378ADD]'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="text-[11px] text-stone-500 w-16 text-right shrink-0">
                {count.toLocaleString('tr-TR')} <span className="text-stone-300">({pct}%)</span>
            </span>
        </div>
    );
}

function ProgressLog({ events }) {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
    }, [events]);

    if (events.length === 0) return null;
    return (
        <div ref={ref} className="mt-3 bg-stone-950 rounded-xl p-3 max-h-40 overflow-y-auto font-mono text-[11px] space-y-0.5">
            {events.map((ev, i) => {
                if (ev.type === 'error')    return <p key={i} className="text-red-400">✗ {ev.message}</p>;
                if (ev.type === 'done')     return <p key={i} className="text-emerald-400 font-semibold">✓ Tamamlandı — {ev.fixed_vectors} embed düzeltildi, {ev.reindexed_docs} belge yeniden işlendi{ev.errors > 0 ? `, ${ev.errors} hata` : ''}.</p>;
                if (ev.type === 'progress') return <p key={i} className="text-stone-300">{ev.step === 'null_vectors' ? '⚡' : ev.step === 'orphans' ? '📄' : '↻'} {ev.message}</p>;
                return null;
            })}
        </div>
    );
}

// ── Ana Bileşen ───────────────────────────────────────────────────────────────

export default function VectorHealthPanel() {
    const [health, setHealth]           = useState(null);
    const [loading, setLoading]         = useState(true);
    const [fixing, setFixing]           = useState(false);
    const [fixingDocId, setFixingDocId] = useState(null);
    const [progressEvents, setProgressEvents] = useState([]);
    const abortRef = useRef(null);

    const fetchHealth = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/embedding/health');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setHealth(await res.json());
        } catch (e) {
            console.error('health fetch:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchHealth(); }, [fetchHealth]);

    const runFix = useCallback(async (docId = null) => {
        if (fixing) return;
        setFixing(true);
        setProgressEvents([]);
        if (docId) setFixingDocId(docId);

        const ctrl = new AbortController();
        abortRef.current = ctrl;

        try {
            const res = await fetch('/api/embedding/fix-orphans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(docId ? { doc_id: docId } : {}),
                signal: ctrl.signal,
            });

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buf = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split('\n');
                buf = lines.pop();
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const ev = JSON.parse(line.slice(6));
                        setProgressEvents(p => [...p, ev]);
                        if (ev.type === 'done') {
                            setFixing(false);
                            setFixingDocId(null);
                            setTimeout(fetchHealth, 800);
                        }
                    } catch { /* ignore parse errors */ }
                }
            }
        } catch (e) {
            if (e.name !== 'AbortError') {
                setProgressEvents(p => [...p, { type: 'error', message: String(e) }]);
            }
        } finally {
            setFixing(false);
            setFixingDocId(null);
        }
    }, [fixing, fetchHealth]);

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading && !health) {
        return (
            <div className="flex items-center justify-center h-full text-stone-400">
                <Loader2 size={20} className="animate-spin mr-2" /> Vektör sağlığı yükleniyor...
            </div>
        );
    }

    const cfg = STATUS_CONFIG[health?.status ?? 'ok'];
    const StatusIcon = cfg.Icon;
    const totalChunks = health?.total_chunks ?? 0;

    const hasProblems = (health?.null_vector_chunks ?? 0) > 0 || (health?.orphan_documents?.length ?? 0) > 0;

    return (
        <div className="flex flex-col h-full overflow-y-auto bg-stone-50">
            {/* Header */}
            <div className="flex-none flex items-center justify-between px-6 py-4 bg-white border-b border-stone-200">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#378ADD]/10 flex items-center justify-center">
                        <Database size={15} className="text-[#378ADD]" />
                    </div>
                    <div>
                        <h2 className="text-[14px] font-semibold text-stone-800">Vektör Sağlığı</h2>
                        <p className="text-[11px] text-stone-400">VektorParcasi istatistikleri ve onarım araçları</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Durum badge */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                    </div>
                    <button
                        onClick={fetchHealth}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-stone-500 hover:text-stone-800 border border-stone-200 hover:border-stone-300 bg-white transition-all disabled:opacity-40"
                    >
                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                        Yenile
                    </button>
                </div>
            </div>

            <div className="flex-1 px-6 py-5 space-y-6">

                {/* ── İstatistik Kartları ───────────────────────────────── */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatCard icon={Layers}   label="Toplam Parça"    value={totalChunks.toLocaleString('tr-TR')} sub={`ort. ${health?.avg_chunks_per_doc ?? 0} parça/belge`} />
                    <StatCard icon={Database} label="Vektörsüz Parça" value={health?.null_vector_chunks ?? 0} accent={(health?.null_vector_chunks ?? 0) > 0} sub="vektor_verisi IS NULL" />
                    <StatCard icon={FileX2}   label="Yetim Belge"     value={health?.orphan_documents?.length ?? 0} accent={(health?.orphan_documents?.length ?? 0) > 0} sub="chunk kaydı olmayan" />
                    <StatCard icon={Cpu}      label="Model Uyumsuz"   value={health?.model_mismatch_chunks ?? 0} sub="eski modelden parça" />
                </div>

                {/* ── Model Dağılımı ────────────────────────────────────── */}
                {(health?.by_model?.length ?? 0) > 0 && (
                    <div className="bg-white rounded-xl border border-stone-200 p-5">
                        <h3 className="text-[12px] font-semibold text-stone-600 uppercase tracking-wide mb-4">Embedding Modeli Dağılımı</h3>
                        <div className="space-y-2.5">
                            {health.by_model.map((item, i) => (
                                <ModelBar key={i} model={item.model} count={item.count} total={totalChunks} />
                            ))}
                        </div>
                        <p className="mt-3 text-[11px] text-stone-400">
                            Aktif model: <span className="font-medium text-stone-600">{health?.active_model ?? '—'}</span>
                        </p>
                    </div>
                )}

                {/* ── Yetim Belgeler ────────────────────────────────────── */}
                {(health?.orphan_documents?.length ?? 0) > 0 && (
                    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-3 border-b border-stone-100 bg-red-50/60">
                            <FileX2 size={13} className="text-red-500" />
                            <h3 className="text-[12px] font-semibold text-red-700">Yetim Belgeler ({health.orphan_documents.length})</h3>
                            <span className="text-[11px] text-red-400 ml-1">— vektorlestirildi=True ancak 0 gerçek parça</span>
                        </div>
                        <table className="w-full text-[12px]">
                            <thead className="bg-stone-50 border-b border-stone-100">
                                <tr>
                                    <th className="text-left px-5 py-2.5 font-medium text-stone-500 w-full">Dosya Adı</th>
                                    <th className="text-right px-4 py-2.5 font-medium text-stone-500 whitespace-nowrap">Kayıt Parça</th>
                                    <th className="text-right px-4 py-2.5 font-medium text-stone-500 whitespace-nowrap">Gerçek</th>
                                    <th className="px-4 py-2.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {health.orphan_documents.map(doc => {
                                    const isThisFixing = fixing && fixingDocId === doc.kimlik;
                                    return (
                                        <tr key={doc.kimlik} className="hover:bg-stone-50/60 transition-colors">
                                            <td className="px-5 py-2.5 text-stone-700 font-medium truncate max-w-xs">
                                                {doc.dosya_adi}
                                            </td>
                                            <td className="px-4 py-2.5 text-right text-amber-600 font-semibold">{doc.parca_sayisi_kayit}</td>
                                            <td className="px-4 py-2.5 text-right text-red-600 font-bold">{doc.gercek_parca_sayisi}</td>
                                            <td className="px-4 py-2.5">
                                                <button
                                                    onClick={() => runFix(doc.kimlik)}
                                                    disabled={fixing}
                                                    title="Bu belgeyi yeniden vektörleştir"
                                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-[#378ADD] border border-[#378ADD]/30 hover:bg-[#378ADD]/10 disabled:opacity-40 transition-all"
                                                >
                                                    {isThisFixing
                                                        ? <Loader2 size={10} className="animate-spin" />
                                                        : <RotateCcw size={10} />
                                                    }
                                                    {isThisFixing ? 'İşleniyor...' : 'Yeniden İşle'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── Sorun yok ─────────────────────────────────────────── */}
                {!hasProblems && !loading && (
                    <div className="flex flex-col items-center justify-center py-10 gap-3 text-stone-400">
                        <CheckCircle2 size={32} className="text-emerald-400" />
                        <p className="text-[13px] font-medium text-stone-500">Tüm vektörler sağlıklı görünüyor.</p>
                        <p className="text-[11px]">{totalChunks.toLocaleString('tr-TR')} parça, {health?.null_vector_chunks ?? 0} eksik vektör.</p>
                    </div>
                )}

                {/* ── Ana Aksiyon Butonu ────────────────────────────────── */}
                {hasProblems && (
                    <div className="bg-white rounded-xl border border-stone-200 p-5">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[13px] font-semibold text-stone-700">Sorunluları Onar</p>
                                <p className="text-[11px] text-stone-400 mt-0.5">
                                    {health?.null_vector_chunks ?? 0} vektörsüz parça yeniden embed edilir
                                    {(health?.orphan_documents?.length ?? 0) > 0
                                        ? ` + ${health.orphan_documents.length} yetim belge yeniden vektörleştirilir`
                                        : ''}.
                                </p>
                            </div>
                            <button
                                onClick={() => runFix(null)}
                                disabled={fixing}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-50 transition-all shadow-sm shadow-red-200 whitespace-nowrap"
                            >
                                {fixing && !fixingDocId
                                    ? <Loader2 size={13} className="animate-spin" />
                                    : <Wrench size={13} />
                                }
                                {fixing && !fixingDocId ? 'Onarılıyor...' : 'Sorunluları Onar'}
                            </button>
                        </div>

                        {/* İlerleme çubuğu */}
                        {fixing && !fixingDocId && progressEvents.length > 0 && (() => {
                            const last = [...progressEvents].reverse().find(e => e.type === 'progress');
                            if (!last || !last.total) return null;
                            const pct = Math.round((last.current / last.total) * 100);
                            return (
                                <div className="mt-4">
                                    <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1">
                                        <span>{last.message}</span>
                                        <span>{pct}%</span>
                                    </div>
                                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[#DC2626] rounded-full transition-all duration-300"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })()}

                        <ProgressLog events={progressEvents} />
                    </div>
                )}

                {/* Per-doc fix log (küçük) */}
                {fixingDocId && progressEvents.length > 0 && (
                    <ProgressLog events={progressEvents} />
                )}

            </div>
        </div>
    );
}
