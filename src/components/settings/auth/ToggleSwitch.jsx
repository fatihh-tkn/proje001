import React from 'react';

// Genel Amaçlı Toggle Bileşeni - Modül dışında stable bir component olarak tanımlı
export default function ToggleSwitch({ label, desc, metaKey, defaultChecked = true, meta, updateMeta }) {
    const checked = meta[metaKey] !== undefined ? meta[metaKey] : defaultChecked;

    return (
        <div className="flex items-center justify-between py-2 px-1 border-b border-slate-100 hover:bg-slate-50/60 rounded-sm transition-colors">
            <div className="min-w-0 mr-3">
                <h4 className="text-[11px] font-semibold text-slate-800 truncate">{label}</h4>
                {desc && <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">{desc}</p>}
            </div>
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    updateMeta(metaKey, !checked);
                }}
                className={`shrink-0 w-9 h-5 rounded-full transition-all relative flex items-center shadow-inner ${checked ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-300 hover:bg-slate-400'
                    }`}
                title={checked ? 'Kapat' : 'Aç'}
            >
                <div className={`w-3.5 h-3.5 rounded-full bg-white absolute transition-all shadow-sm ${checked ? 'left-[19px]' : 'left-[3px]'
                    }`} />
            </button>
        </div>
    );
}
