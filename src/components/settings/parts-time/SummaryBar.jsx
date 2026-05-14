// src/components/settings/parts-time/SummaryBar.jsx
// Hesaplama bittikten sonra alt şeridinde operasyon başına toplam süreler + net toplam + maliyet.
import React from 'react';
import { Circle } from 'lucide-react';
import { OPERATIONS, fmtSec, fmtCurrency } from './constants';

export default function SummaryBar({ parts, hourlyRate, currency }) {
    const opTotals = {};
    let netTotalSec = 0;
    parts.forEach(p => {
        const data = p.calculatedOps || (p.status === 'done' || p.status === 'edited' ? p.ops : {});
        Object.entries(data).forEach(([opId, sec]) => {
            if (sec == null) return;
            opTotals[opId] = (opTotals[opId] || 0) + sec * p.qty;
            netTotalSec += sec * p.qty;
        });
    });
    const totalCost = (netTotalSec / 3600) * hourlyRate;
    const completedCount = parts.filter(p => p.status === 'done' || p.status === 'edited').length;
    if (completedCount === 0) return null;

    return (
        <div className="flex-none flex items-stretch bg-white border border-stone-200 rounded-lg overflow-hidden">
            <div className="flex-1 flex items-stretch divide-x divide-stone-100">
                {OPERATIONS.filter(op => opTotals[op.id]).map(op => {
                    const Icon = op.Icon || Circle;
                    return (
                        <div key={op.id} className="flex-1 px-3 py-2 flex items-center gap-2">
                            <div className="flex items-center justify-center w-7 h-7 rounded" style={{ background: op.bg }}>
                                <Icon size={14} style={{ color: op.color }} strokeWidth={2.2} />
                            </div>
                            <div className="leading-tight min-w-0">
                                <div className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider truncate">{op.short}</div>
                                <div className="font-mono text-[12px] font-bold text-stone-800 tabular-nums">{fmtSec(opTotals[op.id])}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex-none flex items-stretch border-l-2 border-stone-200">
                <div className="px-4 py-2 bg-stone-50 border-r border-stone-100 flex flex-col items-end justify-center">
                    <div className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider">Net Toplam Süre</div>
                    <div className="font-mono text-[14px] font-bold text-stone-800 tabular-nums">{fmtSec(netTotalSec)}</div>
                </div>
                <div className="px-4 py-2 bg-[#A01B1B] text-white flex flex-col items-end justify-center min-w-[140px]">
                    <div className="text-[9px] font-semibold opacity-70 uppercase tracking-wider">Toplam Maliyet</div>
                    <div className="font-mono text-[14px] font-bold tabular-nums">{fmtCurrency(totalCost, currency)}</div>
                </div>
            </div>
        </div>
    );
}
