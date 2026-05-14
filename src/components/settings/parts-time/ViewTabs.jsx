// src/components/settings/parts-time/ViewTabs.jsx
// Matris / Kart / Gantt görünüm seçimi (segment kontrol).
import React from 'react';
import { Grid3X3, LayoutGrid, BarChart3 } from 'lucide-react';

const TABS = [
    { id: 'matrix', label: 'Matris', Icon: Grid3X3,    hint: 'Parça × Operasyon tablosu' },
    { id: 'cards',  label: 'Kart',   Icon: LayoutGrid, hint: 'Parça başına detay kartı' },
    { id: 'gantt',  label: 'Gantt',  Icon: BarChart3,  hint: 'Operasyon zaman çizelgesi' },
];

export default function ViewTabs({ view, onChange }) {
    return (
        <div className="flex items-center gap-0.5 bg-stone-100 rounded p-0.5 border border-stone-200">
            {TABS.map(t => {
                const active = view === t.id;
                const Icon = t.Icon;
                return (
                    <button key={t.id} onClick={() => onChange(t.id)} title={t.hint}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition-all
                ${active ? 'bg-white text-[#378ADD] shadow-sm font-bold' : 'text-stone-500 hover:text-stone-700'}`}
                    >
                        <Icon size={12} strokeWidth={2.2} />
                        {t.label}
                    </button>
                );
            })}
        </div>
    );
}
