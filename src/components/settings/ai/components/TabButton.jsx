import React from 'react';

export const TabButton = React.memo(({ active, onClick, icon: Icon, label }) => (
    <button
        onClick={onClick}
        className={`w-full px-3 py-2 rounded-[3px] text-[11px] font-medium flex items-center gap-3 transition-all text-left ${active
            ? 'bg-red-50 text-[#A01B1B] ring-1 ring-red-100 shadow-sm'
            : 'text-gray-500 hover:bg-black/[0.04] hover:text-gray-800'
            }`}
    >
        <Icon size={15} className="shrink-0" />
        <span>{label}</span>
    </button>
));

