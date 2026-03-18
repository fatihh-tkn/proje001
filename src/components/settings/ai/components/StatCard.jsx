import React from 'react';

export const StatCard = React.memo(({ icon: Icon, label, value, subLabel, trend }) => (
    <div className="bg-white rounded-sm ring-1 ring-black/[0.06] shadow-sm p-4 flex flex-col gap-2 transition-all hover:shadow-md group overflow-hidden relative">
        {/* Zarif dekoratif çizgi */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-transparent group-hover:bg-[var(--accent)] transition-colors duration-300 rounded-l-xl" />

        <div className="flex justify-between items-start z-10">
            <span className="text-[9px] font-medium uppercase tracking-widest text-gray-400 group-hover:text-[var(--accent)] transition-colors">{label}</span>
            <div className="p-1.5 rounded-[3px] bg-gray-50 ring-1 ring-black/[0.05] text-gray-400 group-hover:text-[var(--accent)] group-hover:bg-[var(--accent)]/5 transition-colors">
                <Icon size={12} />
            </div>
        </div>
        <div className="flex items-baseline gap-2 z-10 mt-1">
            <span className="text-xl font-medium text-gray-800 font-mono tracking-tight">{value}</span>
            {trend && <span className="text-[9px] font-medium text-emerald-500">{trend}</span>}
        </div>
        {subLabel && <span className="text-[9px] text-gray-400 font-medium uppercase z-10 mt-auto">{subLabel}</span>}
    </div>
));
