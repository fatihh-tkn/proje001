// src/components/settings/parts-time/MatrixView.jsx
// Parça × Operasyon matris tablosu. Her hücre süre; sağda Net Süre + Maliyet.
import React from 'react';
import { AlertTriangle, Circle } from 'lucide-react';
import { OPERATIONS, partTotalSec, fmtSecCompact, fmtCurrency } from './constants';
import DrawingThumb from './DrawingThumb';

export default function MatrixView({ parts, hourlyRate, currency, density, selectedId, onSelect }) {
    const ops = OPERATIONS;
    const rowPad = density === 'compact' ? 'py-1.5' : 'py-2.5';
    const cellPad = density === 'compact' ? 'px-2' : 'px-2.5';

    return (
        <div className="flex-1 overflow-auto bg-white border border-stone-200 rounded-lg">
            <table className="w-full text-[11px] border-collapse">
                <thead className="sticky top-0 bg-stone-50 z-10 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                    <tr className="text-stone-500">
                        <th className={`text-left ${cellPad} ${rowPad} font-semibold w-[44px]`}></th>
                        <th className={`text-left ${cellPad} ${rowPad} font-semibold w-[88px]`}>Parça No</th>
                        <th className={`text-left ${cellPad} ${rowPad} font-semibold min-w-[180px]`}>Açıklama</th>
                        <th className={`text-center ${cellPad} ${rowPad} font-semibold w-[44px]`}>Adet</th>
                        <th className={`text-left ${cellPad} ${rowPad} font-semibold w-[110px]`}>Malzeme</th>
                        <th className={`text-left ${cellPad} ${rowPad} font-semibold w-[100px]`}>Boyut</th>
                        {ops.map(op => {
                            const Icon = op.Icon || Circle;
                            return (
                                <th key={op.id} className={`${cellPad} ${rowPad} font-semibold w-[64px]`}>
                                    <div className="flex flex-col items-center gap-0.5">
                                        <div className="flex items-center justify-center w-5 h-5 rounded" style={{ background: op.bg }}>
                                            <Icon size={11} style={{ color: op.color }} strokeWidth={2.4} />
                                        </div>
                                        <span className="text-[9px] text-stone-500 uppercase tracking-wider">{op.short}</span>
                                    </div>
                                </th>
                            );
                        })}
                        <th className={`text-right ${cellPad} ${rowPad} font-semibold w-[80px] bg-stone-100`}>Net Süre</th>
                        <th className={`text-right ${cellPad} ${rowPad} font-semibold w-[88px] bg-stone-100`}>Maliyet</th>
                    </tr>
                </thead>
                <tbody>
                    {parts.map(part => {
                        const data = part.calculatedOps || (part.status === 'done' || part.status === 'edited' ? part.ops : {});
                        const total = partTotalSec(data);
                        const cost = (total / 3600) * hourlyRate * part.qty;
                        const isSelected = part.id === selectedId;
                        return (
                            <tr
                                key={part.id}
                                onClick={() => onSelect?.(part.id)}
                                className={`group border-t border-stone-100 cursor-pointer transition-colors
                  ${isSelected ? 'bg-[#378ADD]/[0.05]' : 'hover:bg-stone-50/70'}
                  ${part.status === 'calculating' ? 'animate-pulse' : ''}`}
                            >
                                <td className={`${cellPad} ${rowPad} relative`}>
                                    <DrawingThumb shape={part.drawingMatched ? part.shape : null} size={36} />
                                </td>
                                <td className={`${cellPad} ${rowPad}`}>
                                    <div className="font-mono text-[10px] font-bold text-stone-700">{part.id}</div>
                                    <div className="font-mono text-[9px] text-stone-400">{part.code}</div>
                                </td>
                                <td className={`${cellPad} ${rowPad}`}>
                                    <div className="font-semibold text-stone-800 text-[11px] leading-tight">{part.name}</div>
                                    {!part.drawingMatched && (
                                        <div className="inline-flex items-center gap-1 mt-0.5 text-[9px] text-amber-700">
                                            <AlertTriangle size={9} /> Çizim eşleşmedi
                                        </div>
                                    )}
                                </td>
                                <td className={`${cellPad} ${rowPad} text-center`}>
                                    <span className="inline-block px-1.5 py-0.5 rounded bg-stone-100 font-bold text-stone-700 text-[10px] tabular-nums">×{part.qty}</span>
                                </td>
                                <td className={`${cellPad} ${rowPad}`}>
                                    <div className="font-mono text-[10px] text-stone-700">{part.mat}</div>
                                    <div className="font-mono text-[9px] text-stone-400">{part.thick} mm</div>
                                </td>
                                <td className={`${cellPad} ${rowPad} font-mono text-[10px] text-stone-500`}>{part.dim}</td>
                                {ops.map(op => {
                                    const sec = data[op.id];
                                    return (
                                        <td key={op.id} className={`${cellPad} ${rowPad} text-center tabular-nums`}>
                                            {sec == null
                                                ? <span className="text-stone-200">·</span>
                                                : (
                                                    <span
                                                        className="inline-block font-mono text-[10px] font-semibold text-stone-700 px-1 rounded"
                                                        style={{ background: op.bg + '80' }}
                                                    >
                                                        {fmtSecCompact(sec)}
                                                    </span>
                                                )}
                                        </td>
                                    );
                                })}
                                <td className={`${cellPad} ${rowPad} text-right font-bold tabular-nums bg-stone-50/60`}>
                                    <span className="text-stone-800 text-[11px]">{total > 0 ? fmtSecCompact(total) : '—'}</span>
                                    {part.qty > 1 && total > 0 && (
                                        <div className="text-[9px] text-stone-400 font-normal">tx{part.qty}: {fmtSecCompact(total * part.qty)}</div>
                                    )}
                                </td>
                                <td className={`${cellPad} ${rowPad} text-right font-bold tabular-nums bg-stone-50/60`}>
                                    <span className="text-[#A01B1B] text-[11px]">{total > 0 ? fmtCurrency(cost, currency) : '—'}</span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
