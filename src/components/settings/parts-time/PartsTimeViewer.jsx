// src/components/settings/parts-time/PartsTimeViewer.jsx
// ──────────────────────────────────────────────────────────────
// Parça Süresi Hesaplama ana ekranı.
// Workspace içinde DynamicViewer aracılığıyla yeni bir tab olarak açılır
// (App.jsx → handleOpenFile({ id: 'parts-time', title: 'Parça Süresi Hesaplama', type: 'parts-time' })).
// ──────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react';
import { X, Filter, ArrowUpDown } from 'lucide-react';

import {
    SAMPLE_BOM, SAMPLE_SUBASSEMBLIES, SAMPLE_NESTING_REFS,
    SAMPLE_PARTS, initializeParts,
} from './constants';
import BomHeader from './BomHeader';
import SubAssemblyChips from './SubAssemblyChips';
import ViewTabs from './ViewTabs';
import MatrixView from './MatrixView';
import CardsView from './CardsView';
import GanttView from './GanttView';
import AIPanel from './AIPanel';
import SummaryBar from './SummaryBar';
import useCalculation from './useCalculation';

// Varsayılan tweaks (yerel state; isterseniz zustand store'a taşınabilir).
const DEFAULT_TWEAKS = {
    view: 'matrix',           // matrix | cards | gantt
    density: 'cozy',          // compact | cozy
    hourlyRate: 320,          // ₺/saat
    currency: '₺',
    laserSpeed: 1.0,
    bendSpeed: 1.0,
    weldSpeed: 1.0,
    overallMul: 1.0,
    aiMode: 'streaming',      // streaming | bulk
};

export default function PartsTimeViewer({
    bom = SAMPLE_BOM,
    subAssemblies = SAMPLE_SUBASSEMBLIES,
    nestingRefs = SAMPLE_NESTING_REFS,
    initialParts = SAMPLE_PARTS,
}) {
    const [parts, setParts] = useState(() => initializeParts(initialParts));
    const [selectedId, setSelectedId] = useState(null);
    const [subFilter, setSubFilter] = useState('all');
    const [tweaks, setTweaks] = useState(DEFAULT_TWEAKS);
    const setTweak = (key, value) => setTweaks(prev => ({ ...prev, [key]: value }));

    const { calcStatus, aiLog, run, reset } = useCalculation({ parts, setParts, tweaks });

    const selectedPart = parts.find(p => p.id === selectedId) || null;
    const visibleParts = useMemo(
        () => subFilter === 'all' ? parts : parts.filter(p => p.subId === subFilter),
        [parts, subFilter]
    );

    const ViewCmp = tweaks.view === 'matrix' ? MatrixView
        : tweaks.view === 'cards' ? CardsView
            : GanttView;

    const viewProps = {
        parts: visibleParts,
        hourlyRate: tweaks.hourlyRate,
        currency: tweaks.currency,
        density: tweaks.density,
        selectedId, onSelect: setSelectedId,
    };

    return (
        <div className="flex flex-col h-full w-full bg-stone-50 overflow-hidden font-sans text-stone-800">

            {/* Ana alan: 3-satır + sağ AI paneli */}
            <div className="flex-1 flex flex-col gap-3 p-3 overflow-hidden">

                {/* Üst: BOM kartı + global aksiyonlar */}
                <BomHeader
                    bom={bom}
                    parts={parts}
                    subAssemblies={subAssemblies}
                    calcStatus={calcStatus}
                    onCalculate={run}
                    onReset={reset}
                />

                {/* Alt-grup chip filtresi */}
                <SubAssemblyChips
                    parts={parts}
                    subAssemblies={subAssemblies}
                    nestingRefs={nestingRefs}
                    filter={subFilter}
                    onChange={setSubFilter}
                />

                {/* Orta: solda görünüm + sağda AI paneli */}
                <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">

                    {/* SOL: sonuç görünümleri */}
                    <div className="flex-1 flex flex-col gap-2 min-w-0 overflow-hidden">

                        {/* Görünüm sekmesi + sayaç */}
                        <div className="flex-none flex items-center gap-2 px-1">
                            <ViewTabs view={tweaks.view} onChange={(v) => setTweak('view', v)} />
                            <div className="flex-1" />
                            <div className="flex items-center gap-1.5 text-[10px] text-stone-500">
                                <span>{visibleParts.filter(p => p.status === 'done' || p.status === 'edited').length}/{visibleParts.length} hesaplandı</span>
                                {subFilter !== 'all' && (
                                    <button onClick={() => setSubFilter('all')} className="flex items-center gap-1 px-1.5 py-0.5 bg-stone-200 hover:bg-stone-300 rounded text-stone-700 font-medium">
                                        <X size={10} /> Filtreyi temizle
                                    </button>
                                )}
                                <span className="w-px h-3 bg-stone-300" />
                                <button className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-stone-200 rounded">
                                    <Filter size={10} /> Filtre
                                </button>
                                <button className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-stone-200 rounded">
                                    <ArrowUpDown size={10} /> Sırala
                                </button>
                            </div>
                        </div>

                        {/* Aktif görünüm */}
                        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                            <ViewCmp {...viewProps} />
                        </div>

                        {/* Alt: toplam özet şeridi */}
                        <SummaryBar
                            parts={visibleParts}
                            hourlyRate={tweaks.hourlyRate}
                            currency={tweaks.currency}
                        />
                    </div>

                    {/* SAĞ: AI paneli */}
                    <AIPanel
                        parts={parts}
                        calcStatus={calcStatus}
                        aiLog={aiLog}
                        selectedPart={selectedPart}
                        hourlyRate={tweaks.hourlyRate}
                        currency={tweaks.currency}
                        onTriggerCalc={calcStatus === 'idle' ? run : null}
                    />
                </div>
            </div>
        </div>
    );
}
