import React from 'react';

export const CustomTooltip = React.memo(({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[var(--window-bg)] border border-[var(--window-border)] rounded-sm px-3 py-2 shadow-xl z-50 text-xs backdrop-blur-md">
            <p className="text-[var(--sidebar-text-muted)] font-semibold mb-1">{label}</p>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill || entry.stroke }} />
                    <span className="font-mono text-[var(--workspace-text)] font-medium">
                        {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString('tr-TR', { maximumFractionDigits: 5 }) : entry.value}
                    </span>
                </div>
            ))}
        </div>
    );
});

