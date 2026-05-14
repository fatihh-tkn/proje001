// src/components/settings/parts-time/CardsView.jsx
// Parça başına detay kartı — operasyon süreleri bar chart olarak.
import React from 'react';
import { AlertTriangle, Circle } from 'lucide-react';
import { OPERATIONS, partTotalSec, fmtSecCompact, fmtCurrency } from './constants';
import DrawingThumb from './DrawingThumb';

export default function CardsView({ parts, hourlyRate, currency, selectedId, onSelect }) {
    return (
        <div className="flex-1 overflow-auto px-1 py-1">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {parts.map(part => {
                    const data = part.calculatedOps || (part.status === 'done' || part.status === 'edited' ? part.ops : {});
                    const opsList = OPERATIONS.filter(op => data[op.id] != null);
                    const total = partTotalSec(data);
                    const values = Object.values(data).filter(v => v != null);
                    const maxOp = values.length ? Math.max(...values) : 1;
                    const cost = (total / 3600) * hourlyRate * part.qty;
                    const isSelected = part.id === selectedId;
                    return (
                        <div key={part.id}
                            onClick={() => onSelect?.(part.id)}
                            className={`group flex flex-col bg-white border rounded-lg overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all
                ${isSelected ? 'border-[#378ADD] ring-1 ring-[#378ADD]/20' : 'border-stone-200 hover:border-stone-300'}
                ${part.status === 'calculating' ? 'animate-pulse' : ''}`}
                        >
                            {/* Header */}
                            <div className="flex items-stretch border-b border-stone-100">
                                <div className="flex-none p-2.5 bg-stone-50 border-r border-stone-100 flex items-center justify-center">
                                    <DrawingThumb shape={part.drawingMatched ? part.shape : null} size={64} />
                                </div>
                                <div className="flex-1 px-3 py-2.5 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="font-mono text-[10px] font-bold text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded">{part.id}</span>
                                        <span className="text-[10px] text-stone-400">×{part.qty}</span>
                                        {!part.drawingMatched && (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold bg-amber-100 text-amber-700 rounded">
                                                <AlertTriangle size={9} /> Çizim yok
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="text-[12px] font-bold text-stone-800 leading-tight mb-1 line-clamp-2">{part.name}</h4>
                                    <div className="flex items-center gap-2 text-[10px] text-stone-500 font-mono">
                                        <span>{part.mat}</span><span className="text-stone-300">·</span>
                                        <span>{part.thick} mm</span><span className="text-stone-300">·</span>
                                        <span>{part.dim}</span>
                                    </div>
                                </div>
                            </div>
                            {/* Op bars */}
                            {opsList.length > 0 ? (
                                <div className="flex-1 px-3 py-2.5 flex flex-col gap-1.5">
                                    {opsList.map(op => {
                                        const sec = data[op.id];
                                        const pct = (sec / maxOp) * 100;
                                        const Icon = op.Icon || Circle;
                                        return (
                                            <div key={op.id} className="flex items-center gap-2">
                                                <div className="flex items-center gap-1 w-[72px] flex-none">
                                                    <div className="flex items-center justify-center w-4 h-4 rounded" style={{ background: op.bg }}>
                                                        <Icon size={10} style={{ color: op.color }} strokeWidth={2.4} />
                                                    </div>
                                                    <span className="text-[10px] font-medium text-stone-600">{op.short}</span>
                                                </div>
                                                <div className="flex-1 h-2 bg-stone-100 rounded-sm overflow-hidden">
                                                    <div className="h-full rounded-sm transition-all"
                                                        style={{ width: `${pct}%`, background: op.color, opacity: 0.85 }} />
                                                </div>
                                                <span className="font-mono text-[10px] tabular-nums text-stone-700 w-[42px] text-right">{fmtSecCompact(sec)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex-1 px-3 py-4 flex items-center justify-center text-[10px] text-stone-400 italic">
                                    Hesaplama bekleniyor…
                                </div>
                            )}
                            {/* Footer */}
                            <div className="flex items-stretch border-t border-stone-100 bg-stone-50/50">
                                <div className="flex-1 px-3 py-1.5 flex items-center justify-between border-r border-stone-100">
                                    <span className="text-[9px] text-stone-400 uppercase tracking-wider font-semibold">Net Süre</span>
                                    <span className="font-mono text-[11px] font-bold text-stone-800 tabular-nums">{total > 0 ? fmtSecCompact(total) : '—'}</span>
                                </div>
                                <div className="flex-1 px-3 py-1.5 flex items-center justify-between">
                                    <span className="text-[9px] text-stone-400 uppercase tracking-wider font-semibold">Maliyet</span>
                                    <span className="font-mono text-[11px] font-bold text-[#A01B1B] tabular-nums">{total > 0 ? fmtCurrency(cost, currency) : '—'}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
