import React from 'react';

export const CustomTooltip = React.memo(({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    const isAllZero = payload.every(entry => !entry.value || entry.value === 0);
    if (isAllZero) return null;
    return (
        <div className="bg-white border border-gray-200 rounded-[4px] px-3 py-2.5 shadow-lg z-50 min-w-[140px] pointer-events-none">
            {label && (
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 border-b border-gray-100 pb-1.5 flex items-center justify-between">
                    <span>{label}</span>
                </div>
            )}
            <div className="flex flex-col gap-1.5">
                {payload.map((entry, i) => {
                    const isCurrency = entry.name?.includes('USD') || entry.name?.includes('Maliyet');
                    const valueDisplay = isCurrency
                        ? (typeof entry.value === 'number' ? `$${entry.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 5 })}` : entry.value)
                        : (typeof entry.value === 'number' ? entry.value.toLocaleString('tr-TR') : entry.value);

                    return (
                        <div key={i} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: entry.color || entry.fill || entry.stroke }} />
                                <span className="text-[11px] font-medium text-gray-700 whitespace-nowrap">
                                    {entry.name}
                                </span>
                            </div>
                            <span className="font-mono text-[11px] font-bold text-gray-900">
                                {valueDisplay}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
