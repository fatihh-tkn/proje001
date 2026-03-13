import React from 'react';

export const StatCard = React.memo(({ icon: Icon, label, value, subLabel, trend }) => (
    <div className="bg-[var(--window-bg)] rounded-sm border border-[var(--window-border)] p-4 flex flex-col gap-1 transition-all hover:border-[var(--accent)] hover:shadow-sm group">
        <div className="flex items-center gap-1.5 text-[var(--sidebar-text-muted)] group-hover:text-[var(--accent)] transition-colors">
            <Icon size={12} />
            <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
        </div>
        <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-[var(--workspace-text)] font-mono">{value}</span>
            {trend && <span className="text-[9px] font-bold text-emerald-500">{trend}</span>}
        </div>
        {subLabel && <span className="text-[9px] text-[var(--sidebar-text-muted)] font-medium leading-tight">{subLabel}</span>}
    </div>
));

