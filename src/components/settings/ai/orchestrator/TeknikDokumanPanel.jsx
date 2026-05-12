import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Loader2, ChevronDown, ChevronRight } from 'lucide-react';

const API = '/api/settings/doc-processing';

export default function TeknikDokumanPanel() {
    const [open, setOpen]     = useState(false);
    const [flags, setFlags]   = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving]   = useState(null); // key being saved

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res  = await fetch(API);
            const data = await res.json();
            setFlags(data.flags || []);
        } catch { }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { if (open) load(); }, [open, load]);

    const toggle = async (key, currentVal) => {
        if (saving) return;
        const next = !currentVal;
        setFlags(prev => prev.map(f => f.key === key ? { ...f, value: next } : f));
        setSaving(key);
        try {
            await fetch(API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ flags: { [key]: next } }),
            });
        } catch {
            setFlags(prev => prev.map(f => f.key === key ? { ...f, value: currentVal } : f));
        } finally {
            setSaving(null);
        }
    };

    const activeCount = flags.filter(f => f.value).length;

    return (
        <div className="shrink-0">
            <div
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-stone-50 transition-colors select-none"
            >
                <FileText size={12} className={open ? 'text-[#378ADD]' : 'text-stone-400'} />
                <span className="text-[9px] font-black tracking-[0.18em] text-stone-400 uppercase flex-1">
                    Teknik Döküman İşleme
                </span>
                {saving && <Loader2 size={10} className="text-[#378ADD] animate-spin shrink-0" />}
                {!saving && activeCount > 0 && (
                    <span className="w-[5px] h-[5px] rounded-full bg-emerald-400 shrink-0" />
                )}
                {open
                    ? <ChevronDown  size={10} className="text-stone-300 shrink-0" />
                    : <ChevronRight size={10} className="text-stone-300 shrink-0" />
                }
            </div>

            {open && (
                <div className="border-t border-stone-100">
                    {loading ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 size={14} className="text-[#378ADD] animate-spin" />
                        </div>
                    ) : (
                        <div className="py-1">
                            {flags.map(f => (
                                <div
                                    key={f.key}
                                    className="flex items-start gap-2.5 px-3 py-2 hover:bg-stone-50 transition-colors"
                                >
                                    <button
                                        onClick={() => toggle(f.key, f.value)}
                                        disabled={saving === f.key}
                                        className={`relative mt-0.5 w-7 h-4 rounded-full shrink-0 transition-colors duration-150 focus:outline-none
                                            ${f.value ? 'bg-[#378ADD]' : 'bg-stone-200'}
                                            ${saving === f.key ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-150
                                            ${f.value ? 'translate-x-3.5' : 'translate-x-0.5'}`}
                                        />
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-[11px] leading-tight ${f.value ? 'text-stone-700 font-semibold' : 'text-stone-500 font-medium'}`}>
                                            {f.label}
                                        </p>
                                        <p className="text-[9px] text-stone-400 leading-relaxed mt-0.5">
                                            {f.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
