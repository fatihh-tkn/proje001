import React, { useState, useEffect, useCallback } from 'react';
import { Eye, Loader2, ChevronDown, ChevronRight, Check, AlertTriangle } from 'lucide-react';

const API = '/api/settings/vision-model';

const PROVIDER_BADGE = {
    gemini:     { label: 'G', color: '#4285F4' },
    google:     { label: 'G', color: '#4285F4' },
    openai:     { label: 'O', color: '#10A37F' },
    anthropic:  { label: 'A', color: '#D97706' },
    groq:       { label: 'Q', color: '#F472B6' },
    openrouter: { label: 'R', color: '#7C3AED' },
};

export default function VisionProcessingPanel() {
    const [open, setOpen]             = useState(false);
    const [models, setModels]         = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [loading, setLoading]       = useState(false);
    const [saving, setSaving]         = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res  = await fetch(API);
            const data = await res.json();
            setModels(data.models || []);
            setSelectedId(data.selected_id || null);
        } catch { }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { if (open) load(); }, [open, load]);

    const select = async (id) => {
        if (saving) return;
        const next = id === selectedId ? null : id;
        setSelectedId(next);
        setSaving(true);
        try {
            await fetch(API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model_id: next }),
            });
        } catch { }
        finally { setSaving(false); }
    };

    const badge = (provider = '') =>
        PROVIDER_BADGE[(provider || '').toLowerCase()] || { label: '?', color: '#9CA3AF' };

    const selectedModel = models.find(m => m.id === selectedId);
    const isReady = selectedModel?.ready === true;

    return (
        <div className="shrink-0">
            <div
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-stone-50 transition-colors select-none"
            >
                <Eye size={12} className={open ? 'text-[#378ADD]' : 'text-stone-400'} />
                <span className="text-[9px] font-black tracking-[0.18em] text-stone-400 uppercase flex-1">
                    AI Görsel İşleme
                </span>
                {saving && <Loader2 size={10} className="text-[#378ADD] animate-spin shrink-0" />}
                {!saving && selectedId && (
                    <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${isReady ? 'bg-emerald-400' : 'bg-amber-400'}`} />
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
                    ) : models.length === 0 ? (
                        <div className="flex items-start gap-2 px-4 py-3">
                            <AlertTriangle size={11} className="shrink-0 text-amber-400 mt-0.5" />
                            <span className="text-[10px] text-stone-400 leading-relaxed">
                                Henüz model yok. <strong className="text-stone-600">API Anahtarları</strong> sekmesinden bir model ekleyin.
                            </span>
                        </div>
                    ) : (
                        <>
                            {models.map(m => {
                                const isSelected = m.id === selectedId;
                                const b = badge(m.provider);
                                const hasModelId = !!m.model_id;
                                return (
                                    <div
                                        key={m.id}
                                        onClick={() => select(m.id)}
                                        className={`relative flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-all duration-100
                                            ${isSelected
                                                ? 'bg-[#378ADD]/8 text-stone-800'
                                                : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
                                            }`}
                                    >
                                        {isSelected && (
                                            <span className="absolute left-0 top-1 bottom-1 w-[2px] bg-[#378ADD] rounded-r" />
                                        )}
                                        <div
                                            className="w-5 h-5 shrink-0 rounded flex items-center justify-center text-[8px] font-black text-white"
                                            style={{ background: b.color }}
                                        >
                                            {b.label}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-[11px] truncate ${isSelected ? 'font-bold' : 'font-medium'}`}>
                                                {m.name}
                                            </p>
                                            <p className="text-[9px] text-stone-400 font-mono truncate">
                                                {m.model_id || <span className="text-amber-400">model_id girilmemiş</span>}
                                            </p>
                                        </div>
                                        {isSelected && (
                                            hasModelId
                                                ? <Check size={10} className="text-[#378ADD] shrink-0" />
                                                : <AlertTriangle size={10} className="text-amber-400 shrink-0" />
                                        )}
                                    </div>
                                );
                            })}
                            <div className="px-3 py-2 border-t border-stone-100">
                                <p className="text-[9px] text-stone-400 leading-relaxed">
                                    Görsel çıktı destekleyen herhangi bir model seçilebilir. Model ID boşsa vision çalışmaz.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
