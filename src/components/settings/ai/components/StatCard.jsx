import React from 'react';

export const StatCard = React.memo(({ icon: Icon, label, value, subLabel, trend }) => (
    <div className="bg-white p-3 rounded-lg border border-stone-200 shadow-sm flex flex-col gap-2 transition-all hover:bg-stone-50 group overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-transparent group-hover:bg-[#378ADD] transition-colors duration-300 rounded-l-lg" />

        <div className="flex justify-between items-start z-10 pl-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 group-hover:text-[#378ADD] transition-colors">{label}</span>
            <div className="p-1.5 rounded-md bg-stone-50 border border-stone-100 text-stone-400 group-hover:text-[#378ADD] group-hover:bg-[#378ADD]/10 group-hover:border-[#378ADD]/20 transition-colors">
                <Icon size={12} strokeWidth={2.5} />
            </div>
        </div>
        <div className="flex items-baseline gap-2 z-10 mt-1 pl-1">
            <span className="text-[14px] lg:text-[16px] font-black leading-none text-stone-700">{value}</span>
            {trend && <span className="text-[10px] font-bold text-[#1D9E75]">{trend}</span>}
        </div>
        {subLabel && <span className="text-[9px] text-stone-400 font-bold uppercase tracking-widest z-10 mt-auto pl-1">{subLabel}</span>}
    </div>
));
