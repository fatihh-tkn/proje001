// src/components/settings/parts-time/BomHeader.jsx
// Ekranın en üstünde duran Ürün BOM özet kartı.
import React from 'react';
import {
    Boxes, User, ClipboardList, Building2, PackageCheck, Layers3, Grid3X3, Weight,
    FileImage, CheckCircle2, Loader2, Sparkles, RotateCcw, Download, Save, Circle,
} from 'lucide-react';

// Tek istatistik hücresi (label + value)
function Stat({ Icon = Circle, label, value, mono, accent }) {
    const color =
        accent === 'emerald' ? 'text-emerald-600' :
            accent === 'amber' ? 'text-amber-600' :
                'text-stone-700';
    return (
        <div className="flex items-center gap-1.5">
            <Icon size={14} className="text-stone-400" strokeWidth={2} />
            <div className="leading-tight">
                <div className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider">{label}</div>
                <div className={`${mono ? 'font-mono' : ''} text-[12px] font-bold tabular-nums ${color}`}>{value}</div>
            </div>
        </div>
    );
}

export default function BomHeader({ bom, parts, subAssemblies, calcStatus, onCalculate, onReset }) {
    const matched = parts.filter(p => p.drawingMatched).length;
    const done = parts.filter(p => p.status === 'done' || p.status === 'edited').length;
    const calculating = calcStatus === 'running';
    const allDone = done === parts.length && !calculating;
    const totalPieces = parts.reduce((s, p) => s + p.qty, 0);

    return (
        <div className="flex-none flex items-stretch gap-3 px-4 py-2.5 bg-white border border-stone-200 rounded-lg">

            {/* Ürün kimliği */}
            <div className="flex items-center gap-3 pr-4 border-r border-stone-200">
                <div className="w-11 h-11 flex items-center justify-center rounded bg-[#A01B1B]/[0.08] border border-[#A01B1B]/15 text-[#A01B1B]">
                    <Boxes size={22} strokeWidth={1.8} />
                </div>
                <div className="leading-tight">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-mono text-[13px] font-black text-stone-900 tracking-tight">{bom.code}</span>
                        <span className="text-[9px] font-bold text-[#A01B1B] bg-[#A01B1B]/[0.08] border border-[#A01B1B]/20 px-1 py-px rounded uppercase tracking-wider">BOM</span>
                        <span className="text-[9px] font-bold text-stone-600 bg-stone-100 border border-stone-200 px-1 py-px rounded font-mono uppercase">{bom.revision}</span>
                    </div>
                    <div className="text-[12px] font-semibold text-stone-800">{bom.name}</div>
                    <div className="text-[10px] text-stone-400 mt-0.5 flex items-center gap-1.5">
                        <span>{bom.family}</span>
                        <span className="text-stone-300">·</span>
                        <User size={9} /><span>{bom.designer}</span>
                        <span className="text-stone-300">·</span>
                        <span>{bom.lastModified}</span>
                    </div>
                </div>
            </div>

            {/* İş emri / müşteri */}
            <div className="flex items-center gap-4 pr-4 border-r border-stone-200">
                <Stat Icon={ClipboardList} label="İş Emri"   value={bom.workOrder} mono />
                <Stat Icon={Building2}    label="Müşteri"   value={bom.customer} />
                <Stat Icon={PackageCheck} label="Sip. Adedi" value={`${bom.orderQty} adet`} accent="emerald" />
            </div>

            {/* BOM ölçümleri */}
            <div className="flex items-center gap-4 pr-4 border-r border-stone-200">
                <Stat Icon={Layers3} label="Alt Grup" value={subAssemblies.length} />
                <Stat Icon={Grid3X3} label="Parça"    value={`${parts.length} (${totalPieces} adet)`} />
                <Stat Icon={Weight}  label="Ağırlık"  value={`${bom.totalWeight} kg`} mono />
            </div>

            {/* Çizim eşleşmesi */}
            <div className="flex items-center gap-3 pr-3 border-r border-stone-200">
                <FileImage size={14} className="text-stone-400" />
                <div className="leading-tight">
                    <div className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider">Çizim Eşleşmesi</div>
                    <div className="font-mono text-[12px] font-bold tabular-nums">
                        <span className={matched === parts.length ? 'text-emerald-600' : 'text-amber-600'}>{matched}</span>
                        <span className="text-stone-400">/{parts.length}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1" />

            {/* Hesaplama durumu + aksiyonlar */}
            <div className="flex items-center gap-2">
                {calculating && (
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#A01B1B]/5 border border-[#A01B1B]/15">
                        <div className="w-3 h-3 rounded-full border-2 border-[#A01B1B]/20 border-t-[#A01B1B] animate-spin" />
                        <span className="text-[11px] font-semibold text-[#A01B1B] tabular-nums">{done}/{parts.length} hesaplandı</span>
                    </div>
                )}
                {allDone && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200">
                        <CheckCircle2 size={12} className="text-emerald-600" />
                        <span className="text-[11px] font-semibold text-emerald-700">Hesaplama tamam</span>
                    </div>
                )}

                {!calculating && !allDone && (
                    <button onClick={onCalculate}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#A01B1B] hover:bg-[#8a1717] text-white text-[12px] font-semibold rounded transition-colors shadow-sm">
                        <Sparkles size={14} strokeWidth={2.4} /> AI ile Hesapla
                    </button>
                )}
                {calculating && (
                    <button disabled
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-200 text-stone-500 text-[12px] font-semibold rounded">
                        <Loader2 size={14} className="animate-spin" /> Hesaplanıyor…
                    </button>
                )}
                {allDone && (
                    <div className="flex items-center gap-1.5">
                        <button onClick={onReset}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-[11px] font-medium rounded transition-colors">
                            <RotateCcw size={12} /> Yeniden
                        </button>
                        <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-[11px] font-medium rounded transition-colors">
                            <Download size={12} /> Excel
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-white text-[11px] font-semibold rounded transition-colors">
                            <Save size={12} /> Kaydet
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
