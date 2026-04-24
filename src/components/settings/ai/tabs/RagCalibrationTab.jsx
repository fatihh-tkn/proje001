import React, { useState, useEffect, useCallback } from 'react';
import { SlidersHorizontal, RefreshCw, Save, RotateCcw, Info } from 'lucide-react';
import { SETTINGS_BASE, fetchWithTimeout } from '../utils';

const TYPE_META = {
    int: { step: 1, format: v => Math.round(v) },
    float: { step: 0.05, format: v => parseFloat(v).toFixed(2) },
};

export const RagCalibrationTab = React.memo(() => {
    const [settings, setSettings] = useState([]);
    const [original, setOriginal] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchWithTimeout(`${SETTINGS_BASE}/rag`);
            const data = await res.json();
            setSettings(data.settings || []);
            const orig = {};
            (data.settings || []).forEach(s => { orig[s.key] = s.value; });
            setOriginal(orig);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const update = (key, val) => {
        setSettings(prev => prev.map(s => s.key === key ? { ...s, value: val } : s));
        setSaved(false);
    };

    const reset = (s) => update(s.key, original[s.key] ?? s.default);

    const save = async () => {
        setSaving(true);
        try {
            const payload = {};
            settings.forEach(s => { payload[s.key] = s.type === 'int' ? Math.round(s.value) : parseFloat(s.value); });
            await fetchWithTimeout(`${SETTINGS_BASE}/rag`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings: payload }),
            });
            const orig = {};
            settings.forEach(s => { orig[s.key] = s.value; });
            setOriginal(orig);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = settings.some(s => s.value !== original[s.key]);

    if (loading) return (
        <div className="w-full h-full flex items-center justify-center gap-3 text-stone-400">
            <RefreshCw size={18} className="animate-spin" />
            <span className="text-[11px] font-bold uppercase tracking-widest">Yükleniyor...</span>
        </div>
    );

    return (
        <div className="w-full h-full overflow-y-auto bg-stone-50 minimal-scroll">
            <div className="max-w-3xl mx-auto p-6 space-y-4">

                {/* Başlık */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-[#378ADD]/10 rounded-lg">
                            <SlidersHorizontal size={16} className="text-[#378ADD]" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-[13px] font-black text-stone-700 tracking-tight">RAG Kalibrasyon</h3>
                            <p className="text-[10px] text-stone-400 font-medium mt-0.5">Arama ve bağlam parametrelerini ayarlayın</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={load} className="p-2 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors">
                            <RefreshCw size={14} />
                        </button>
                        <button
                            onClick={save}
                            disabled={!hasChanges || saving}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${saved ? 'bg-[#EAF3DE] text-[#3B6D11]' :
                                hasChanges ? 'bg-[#378ADD] text-white hover:bg-[#2A68AB] shadow-sm' :
                                    'bg-stone-100 text-stone-400 cursor-not-allowed'
                                }`}
                        >
                            <Save size={13} strokeWidth={2.5} />
                            {saved ? 'Kaydedildi' : saving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </div>

                {/* Parametre Kartları */}
                {settings.map(s => {
                    const meta = TYPE_META[s.type] || TYPE_META.int;
                    const isDirty = s.value !== original[s.key];
                    return (
                        <div key={s.key} className={`bg-white rounded-xl border shadow-sm p-5 transition-all ${isDirty ? 'border-[#378ADD]/40 ring-1 ring-[#378ADD]/20' : 'border-stone-200'}`}>
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[12px] font-black text-stone-700">{s.label}</span>
                                        {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-[#378ADD] shrink-0" />}
                                    </div>
                                    <p className="text-[10px] text-stone-400 font-medium mt-0.5 leading-relaxed">{s.desc}</p>
                                    <span className="text-[9px] font-mono text-stone-300 mt-1 block">{s.key}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="min-w-[56px] text-center px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg">
                                        <span className="text-[14px] font-black text-[#378ADD] font-mono">{meta.format(s.value)}</span>
                                    </div>
                                    {isDirty && (
                                        <button onClick={() => reset(s)} title="Sıfırla" className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors">
                                            <RotateCcw size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <input
                                type="range"
                                min={s.min}
                                max={s.max}
                                step={meta.step}
                                value={s.value}
                                onChange={e => update(s.key, s.type === 'int' ? parseInt(e.target.value) : parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-stone-200 rounded-full appearance-none cursor-pointer accent-[#378ADD]"
                            />
                            <div className="flex justify-between text-[9px] font-bold text-stone-300 mt-1.5">
                                <span>{s.min}</span>
                                <span>Varsayılan: {s.default}</span>
                                <span>{s.max}</span>
                            </div>
                        </div>
                    );
                })}

                {/* Bilgi kutusu */}
                <div className="flex items-start gap-3 p-4 bg-[#378ADD]/5 border border-[#378ADD]/20 rounded-xl">
                    <Info size={14} className="text-[#378ADD] shrink-0 mt-0.5" strokeWidth={2.5} />
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                        Değişiklikler anında aktif olur — backend servisi yeniden başlatmaya gerek yoktur. Distance eşiğini düşürmek daha az ama daha kesin sonuçlar getirir; Top-K'yı artırmak daha fazla bağlam sağlar ancak LLM maliyetini yükseltir.
                    </p>
                </div>
            </div>
        </div>
    );
});
