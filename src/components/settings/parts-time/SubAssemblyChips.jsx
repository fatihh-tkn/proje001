// src/components/settings/parts-time/SubAssemblyChips.jsx
// BOM ağacının görsel temsili — alt-grup chip serisi. Tıklayınca filtreler.
import React from 'react';
import { GitBranch, Layers3, FileBox } from 'lucide-react';

function ChipBtn({ active, onClick, accent, count, doneCount, children }) {
    const pct = count > 0 ? (doneCount / count) * 100 : 0;
    return (
        <button onClick={onClick}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold border-r border-stone-100 transition-colors
        ${active ? 'bg-[#378ADD] text-white' : 'hover:bg-stone-50 text-stone-700'}`}
        >
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r"
                style={{ background: accent }} />
            {children}
            <span className={`ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded text-[10px] tabular-nums font-bold
        ${active ? 'bg-white/15' : 'bg-stone-100 text-stone-700'}`}>
                {count}
            </span>
            {pct > 0 && (
                <span className="absolute bottom-0 left-0 h-[2px] transition-all"
                    style={{ width: `${pct}%`, background: accent }} />
            )}
        </button>
    );
}

export default function SubAssemblyChips({ parts, subAssemblies, nestingRefs, filter, onChange }) {
    const totalDone = parts.filter(p => p.status === 'done' || p.status === 'edited').length;

    return (
        <div className="flex-none flex items-stretch bg-white border border-stone-200 rounded-lg overflow-hidden">
            <div className="flex-none flex items-center gap-2 px-3 py-1.5 bg-stone-50 border-r border-stone-200">
                <GitBranch size={11} className="text-stone-400" style={{ transform: 'rotate(90deg)' }} />
                <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">BOM Ağacı</span>
            </div>

            <ChipBtn
                active={filter === 'all'}
                onClick={() => onChange('all')}
                accent="#475569"
                count={parts.length}
                doneCount={totalDone}
            >
                <Layers3 size={11} /> Tümü
            </ChipBtn>

            {subAssemblies.map(sa => {
                const saParts = parts.filter(p => p.subId === sa.id);
                const doneCount = saParts.filter(p => p.status === 'done' || p.status === 'edited').length;
                return (
                    <ChipBtn
                        key={sa.id}
                        active={filter === sa.id}
                        onClick={() => onChange(sa.id)}
                        accent={sa.color}
                        count={saParts.length}
                        doneCount={doneCount}
                    >
                        <span className="font-mono text-[9px] font-bold opacity-60">{sa.code}</span>
                        <span>{sa.name}</span>
                    </ChipBtn>
                );
            })}

            <div className="flex-1" />

            {nestingRefs?.length > 0 && (
                <div className="flex-none flex items-center gap-2 px-3 py-1.5 bg-stone-50 border-l border-stone-200">
                    <FileBox size={11} className="text-emerald-600" />
                    <span className="text-[10px] font-medium text-stone-600">{nestingRefs.length} nesting</span>
                </div>
            )}
        </div>
    );
}
