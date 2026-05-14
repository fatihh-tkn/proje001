// src/components/settings/parts-time/GanttView.jsx
// Parça operasyonları zaman çizelgesi (kümülatif başlangıç-bitiş bantları).
import React, { useMemo } from 'react';
import { Circle } from 'lucide-react';
import { OPERATIONS, fmtSecCompact } from './constants';
import DrawingThumb from './DrawingThumb';

export default function GanttView({ parts, selectedId, onSelect }) {
    const computedParts = useMemo(() => parts.map(part => {
        const data = part.calculatedOps || (part.status === 'done' || part.status === 'edited' ? part.ops : {});
        let cursor = 0;
        const segs = OPERATIONS
            .filter(op => data[op.id] != null)
            .map(op => {
                const start = cursor;
                const end = cursor + data[op.id];
                cursor = end;
                return { op, start, end };
            });
        return { part, segs, total: cursor };
    }), [parts]);

    const maxTotal = Math.max(...computedParts.map(p => p.total), 1);
    const minuteMarks = [];
    const step = maxTotal > 600 ? 120 : 60;
    for (let s = 0; s <= maxTotal; s += step) minuteMarks.push(s);

    return (
        <div className="flex-1 overflow-auto bg-white border border-stone-200 rounded-lg">
            <div className="flex border-b border-stone-200 bg-stone-50 sticky top-0 z-10">
                <div className="flex-none w-[240px] px-3 py-2 border-r border-stone-200">
                    <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Parça</div>
                </div>
                <div className="flex-1 relative h-[36px]">
                    {minuteMarks.map(s => (
                        <div key={s} className="absolute top-0 bottom-0 border-l border-stone-200 px-1.5 flex items-center"
                            style={{ left: `${(s / maxTotal) * 100}%` }}>
                            <span className="text-[9px] font-mono text-stone-400 tabular-nums">{Math.floor(s / 60)}dk</span>
                        </div>
                    ))}
                </div>
                <div className="flex-none w-[80px] px-2 py-2 border-l border-stone-200 text-right">
                    <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Toplam</div>
                </div>
            </div>

            <div>
                {computedParts.map(({ part, segs, total }) => {
                    const isSelected = part.id === selectedId;
                    return (
                        <div key={part.id}
                            onClick={() => onSelect?.(part.id)}
                            className={`flex border-b border-stone-100 cursor-pointer transition-colors
                ${isSelected ? 'bg-[#378ADD]/[0.05]' : 'hover:bg-stone-50/70'}
                ${part.status === 'calculating' ? 'animate-pulse' : ''}`}
                        >
                            <div className="flex-none w-[240px] px-3 py-2 border-r border-stone-100 flex items-center gap-2">
                                <DrawingThumb shape={part.drawingMatched ? part.shape : null} size={32} />
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-mono text-[10px] font-bold text-stone-700">{part.id}</span>
                                        <span className="text-[9px] text-stone-400">×{part.qty}</span>
                                    </div>
                                    <div className="text-[10px] font-semibold text-stone-800 truncate leading-tight">{part.name}</div>
                                </div>
                            </div>
                            <div className="flex-1 relative h-[44px]">
                                {minuteMarks.map(s => (
                                    <div key={s} className="absolute top-0 bottom-0 border-l border-stone-100/80"
                                        style={{ left: `${(s / maxTotal) * 100}%` }} />
                                ))}
                                {segs.map((seg, idx) => {
                                    const left = (seg.start / maxTotal) * 100;
                                    const width = ((seg.end - seg.start) / maxTotal) * 100;
                                    const Icon = seg.op.Icon || Circle;
                                    return (
                                        <div
                                            key={idx}
                                            className="absolute top-[8px] bottom-[8px] flex items-center gap-1 px-1.5 rounded-sm overflow-hidden shadow-sm"
                                            style={{ left: `${left}%`, width: `${width}%`, background: seg.op.color }}
                                            title={`${seg.op.name} · ${fmtSecCompact(seg.end - seg.start)}`}
                                        >
                                            <Icon size={10} className="text-white flex-none" strokeWidth={2.5} />
                                            {width > 6 && (
                                                <span className="text-[9px] font-bold text-white truncate font-mono">{fmtSecCompact(seg.end - seg.start)}</span>
                                            )}
                                        </div>
                                    );
                                })}
                                {total === 0 && (
                                    <div className="absolute inset-0 flex items-center px-2 text-[10px] text-stone-300 italic">Hesaplama bekleniyor…</div>
                                )}
                            </div>
                            <div className="flex-none w-[80px] px-2 py-2 border-l border-stone-100 flex flex-col items-end justify-center">
                                <span className="font-mono text-[11px] font-bold text-stone-800 tabular-nums">{total > 0 ? fmtSecCompact(total) : '—'}</span>
                                {part.qty > 1 && total > 0 && <span className="font-mono text-[9px] text-stone-400">×{part.qty}</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
