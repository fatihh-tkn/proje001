// src/components/settings/parts-time/AIPanel.jsx
// Sağdaki AI canlı düşünce paneli + seçili parça detay kartı.
import React, { useEffect, useRef } from 'react';
import {
    Sparkles, Terminal, Bot, AlertTriangle, Circle,
} from 'lucide-react';
import { OPERATIONS, partTotalSec, fmtSecCompact, fmtCurrency } from './constants';
import DrawingThumb from './DrawingThumb';

function AILogLine({ entry }) {
    const t = entry.type;
    const tone =
        t === 'header' ? { color: 'text-stone-400', mark: '#' } :
            t === 'success' ? { color: 'text-emerald-400', mark: '✓' } :
                t === 'warn' ? { color: 'text-amber-400', mark: '!' } :
                    t === 'info' ? { color: 'text-sky-400', mark: '›' } :
                        t === 'calc' ? { color: 'text-slate-200', mark: '·' } :
                            t === 'result' ? { color: 'text-rose-300', mark: '»' } :
                                { color: 'text-stone-400', mark: ' ' };

    if (t === 'header') {
        return <div className="mt-2 mb-1 text-slate-500 text-[10px] font-semibold uppercase tracking-wider">// {entry.text}</div>;
    }
    if (t === 'divider') {
        return <div className="my-1.5 border-t border-slate-800" />;
    }
    return (
        <div className={`flex gap-2 items-start ${tone.color}`}>
            <span className="flex-none w-3 text-center opacity-60">{tone.mark}</span>
            <span className="flex-1 break-words">{entry.text}</span>
            {entry.tag && <span className="flex-none text-[9px] px-1 py-px bg-slate-800 rounded text-stone-400">{entry.tag}</span>}
        </div>
    );
}

function SelectedPartCard({ part, hourlyRate, currency }) {
    const data = part.calculatedOps || (part.status === 'done' || part.status === 'edited' ? part.ops : {});
    const opsList = OPERATIONS.filter(op => data[op.id] != null);
    const total = partTotalSec(data);
    const cost = (total / 3600) * hourlyRate * part.qty;

    return (
        <div className="flex-none bg-white border border-stone-200 rounded-lg overflow-hidden">
            <div className="flex items-stretch border-b border-stone-100">
                <div className="flex-none p-2.5 bg-stone-50 border-r border-stone-100">
                    <DrawingThumb shape={part.drawingMatched ? part.shape : null} size={64} />
                </div>
                <div className="flex-1 px-3 py-2 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-mono text-[10px] font-bold text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded">{part.id}</span>
                        <span className="text-[9px] text-stone-400 font-mono">×{part.qty}</span>
                    </div>
                    <h4 className="text-[11px] font-bold text-stone-800 leading-tight">{part.name}</h4>
                    <div className="text-[9px] text-stone-400 font-mono mt-0.5">{part.mat} · {part.thick}mm · {part.dim}</div>
                </div>
            </div>
            {opsList.length > 0 ? (
                <div className="px-3 py-2 flex flex-col gap-1">
                    {opsList.map(op => {
                        const sec = data[op.id];
                        const opCost = (sec / 3600) * hourlyRate;
                        const Icon = op.Icon || Circle;
                        return (
                            <div key={op.id} className="flex items-center justify-between text-[10px]">
                                <div className="flex items-center gap-1.5">
                                    <div className="flex items-center justify-center w-4 h-4 rounded" style={{ background: op.bg }}>
                                        <Icon size={10} style={{ color: op.color }} strokeWidth={2.4} />
                                    </div>
                                    <span className="text-stone-600 font-medium">{op.name}</span>
                                </div>
                                <div className="flex items-center gap-2 font-mono tabular-nums">
                                    <span className="text-stone-700">{fmtSecCompact(sec)}</span>
                                    <span className="text-stone-400 text-[9px] w-[42px] text-right">{fmtCurrency(opCost, currency)}</span>
                                </div>
                            </div>
                        );
                    })}
                    <div className="border-t border-stone-100 mt-1 pt-1 flex items-center justify-between text-[11px] font-bold">
                        <span className="text-stone-700">Net Süre / Maliyet</span>
                        <div className="flex items-center gap-2 font-mono tabular-nums">
                            <span className="text-stone-800">{fmtSecCompact(total)}</span>
                            <span className="text-[#A01B1B] w-[42px] text-right">{fmtCurrency(cost, currency)}</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="px-3 py-3 text-center text-[10px] text-stone-400 italic">Henüz hesaplanmadı</div>
            )}
        </div>
    );
}

function UnmatchedWarning({ parts }) {
    return (
        <div className="flex-none bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
                <AlertTriangle size={13} className="text-amber-600" />
                <span className="text-[11px] font-bold text-amber-800">{parts.length} parça için çizim eşleşmedi</span>
            </div>
            <p className="text-[10px] text-amber-700 leading-relaxed mb-2">
                Bu parçalar için AI yalnızca nesting verisinden tahminde bulunacak. Daha doğru sonuç için arşivden teknik çizim yükleyin.
            </p>
            <div className="flex flex-col gap-1">
                {parts.map(p => (
                    <div key={p.id} className="flex items-center gap-2 bg-white/70 border border-amber-100 rounded px-2 py-1">
                        <span className="font-mono text-[10px] font-bold text-amber-800">{p.id}</span>
                        <span className="text-[10px] text-stone-700 flex-1 truncate">{p.name}</span>
                        <button className="text-[9px] font-semibold text-amber-700 hover:text-amber-900 underline">Eşle</button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function AIPanel({ parts, calcStatus, aiLog, selectedPart, hourlyRate, currency, onTriggerCalc }) {
    const logRef = useRef(null);
    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [aiLog.length]);

    const unmatched = parts.filter(p => !p.drawingMatched);

    return (
        <div className="flex-none w-[360px] flex flex-col gap-3 h-full overflow-hidden">

            {/* AI BAŞLIK */}
            <div className="flex-none px-3 py-2.5 bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg flex items-center gap-2.5 text-white relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#A01B1B]/30 rounded-full blur-2xl" />
                <div className="w-8 h-8 rounded bg-[#A01B1B] flex items-center justify-center relative">
                    <Sparkles size={16} strokeWidth={2.4} />
                    {calcStatus === 'running' && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-800 animate-pulse" />
                    )}
                </div>
                <div className="flex-1 leading-tight">
                    <div className="text-[12px] font-bold flex items-center gap-2">
                        Süre Hesaplama Asistanı
                        <span className="text-[9px] font-mono text-stone-400 bg-slate-700/60 px-1 py-px rounded">v2.4</span>
                    </div>
                    <div className="text-[10px] text-slate-300">
                        {calcStatus === 'idle' && 'Hazır · Lazer + Abkant + Kaynak modelleri yüklü'}
                        {calcStatus === 'running' && 'Hesaplıyor · Lite-LLM + Heuristik motor'}
                        {calcStatus === 'done' && 'Tamamlandı · Sonuçlar onayınızı bekliyor'}
                    </div>
                </div>
            </div>

            {/* AI LOG (canlı düşünce) */}
            <div className="flex-1 flex flex-col bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
                <div className="flex-none flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800">
                    <div className="flex items-center gap-1.5">
                        <Terminal size={11} className="text-slate-500" />
                        <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">AI Düşüncesi</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>canlı</span>
                    </div>
                </div>
                <div ref={logRef} className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[10.5px] leading-relaxed">
                    {aiLog.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2 py-6 text-center">
                            <Bot size={36} strokeWidth={1.2} className="text-stone-700" />
                            <div className="text-[11px] text-stone-400 font-sans">Hesaplama başlatın</div>
                            <div className="text-[10px] text-slate-500 font-sans max-w-[220px]">
                                BOM, nesting referansları ve eşleşen teknik çizimler AI motoruna gönderilecek.
                            </div>
                            {onTriggerCalc && (
                                <button onClick={onTriggerCalc}
                                    className="mt-1 flex items-center gap-1.5 px-3 py-1.5 bg-[#A01B1B] hover:bg-[#8a1717] text-white text-[11px] font-semibold rounded transition-colors font-sans">
                                    <Sparkles size={12} /> AI ile Hesapla
                                </button>
                            )}
                        </div>
                    ) : (
                        aiLog.map((entry, i) => <AILogLine key={i} entry={entry} />)
                    )}
                    {calcStatus === 'running' && (
                        <div className="flex items-center gap-1.5 mt-1 text-slate-500">
                            <span className="w-1 h-3 bg-emerald-400 animate-pulse" />
                            <span className="text-[10px]">düşünüyor…</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Seçili parça veya eşleşmemiş uyarı */}
            {selectedPart ? (
                <SelectedPartCard part={selectedPart} hourlyRate={hourlyRate} currency={currency} />
            ) : unmatched.length > 0 ? (
                <UnmatchedWarning parts={unmatched} />
            ) : null}
        </div>
    );
}
