import React from 'react';

export const TabButton = React.memo(({ active, onClick, icon: Icon, label }) => (
    <button
        onClick={onClick}
        className={`w-full px-3 py-2.5 rounded-sm text-sm font-bold flex items-center gap-3 transition-all text-left ${active
            ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent-light)]'
            : 'text-[var(--sidebar-text-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)]'
            }`}
    >
        <Icon size={16} className="shrink-0" />
        <span>{label}</span>
    </button>
));

