import React, { useState, useCallback, useEffect } from 'react';
import { Eye, Loader2, Check, AlertTriangle, RefreshCw } from 'lucide-react';

const API = '/api/settings/vision-model';

const PROVIDER_BADGE = {
    gemini:     { label: 'G', color: '#4285F4' },
    google:     { label: 'G', color: '#4285F4' },
    openai:     { label: 'O', color: '#10A37F' },
    anthropic:  { label: 'A', color: '#D97706' },
    groq:       { label: 'Q', color: '#F472B6' },
    openrouter: { label: 'R', color: '#7C3AED' },
};

const SectionHeader = ({ title }) => (
    <div className="flex items-center gap-3 pt-5 pb-1.5">
        <span className="text-[9px] font-black tracking-[0.18em] text-stone-400 uppercase whitespace-nowrap">{title}</span>
        <div className="flex-1 h-px bg-stone-100" />
    </div>
);

export default function VisionProcessingConfig() {
    const [models, setModels]         = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [loading, setLoading]       = useState(true);
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

    useEffect(() => { load(); }, [load]);

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
        <div>
            {/* Başlık */}
            <div className="flex items-start justify-between gap-4 mb-1">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                        <Eye size={18} className="text-[#378ADD]" />
                    </div>
                    <div>
                        <h2 className="text-[18px] font-black text-stone-800 tracking-tight leading-tight">AI Görsel İşleme</h2>
                        <p className="text-[11px] text-stone-400 mt-0.5">Teknik çizim ve görsel analizi için kullanılacak Vision model</p>
                    </div>
                </div>
                <button
                    onClick={load}
                    disabled={loading}
                    className="p-2 rounded-lg hover:bg-stone-100 transition-colors text-stone-400 hover:text-stone-600 shrink-0"
                    title="Yenile"
                >
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            <SectionHeader title="Model Seçimi" />

            {loading ? (
                <div className="flex items-center justify-center py-10">
                    <Loader2 size={20} className="text-[#378ADD] animate-spin" />
                </div>
            ) : models.length === 0 ? (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl mt-2">
                    <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[12px] font-semibold text-amber-800">Henüz model tanımlanmamış</p>
                        <p className="text-[11px] text-amber-600 mt-0.5 leading-relaxed">
                            <strong>API Anahtarları</strong> sekmesinden en az bir model ekleyin. Görsel analiz (teknik resim, PPTX slayt) için vision destekli model gereklidir.
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    <p className="text-[11px] text-stone-400 mb-3 leading-relaxed">
                        Seçili model, arşive yüklenen teknik resimler ve görsel içerikler için kullanılır. Seçimi kaldırmak için tekrar tıklayın.
                    </p>
                    <div className="space-y-2">
                        {models.map(m => {
                            const isSelected = m.id === selectedId;
                            const b = badge(m.provider);
                            return (
                                <div
                                    key={m.id}
                                    onClick={() => select(m.id)}
                                    className={`relative flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-100
                                        ${isSelected
                                            ? 'bg-[#378ADD]/5 border-[#378ADD]/30 shadow-sm'
                                            : 'bg-white border-stone-100 hover:border-stone-200 hover:bg-stone-50'
                                        }`}
                                >
                                    {isSelected && (
                                        <span className="absolute left-0 top-2 bottom-2 w-[2px] bg-[#378ADD] rounded-r" />
                                    )}
                                    <div
                                        className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-[10px] font-black text-white"
                                        style={{ background: b.color }}
                                    >
                                        {b.label}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-[13px] truncate ${isSelected ? 'font-bold text-stone-800' : 'font-semibold text-stone-600'}`}>
                                            {m.name}
                                        </p>
                                        <p className="text-[10px] text-stone-400 font-mono truncate mt-0.5">
                                            {m.model_id || <span className="text-amber-400 not-italic">model_id girilmemiş</span>}
                                        </p>
                                    </div>
                                    <div className="shrink-0">
                                        {saving && isSelected
                                            ? <Loader2 size={14} className="text-[#378ADD] animate-spin" />
                                            : isSelected
                                                ? m.model_id
                                                    ? <Check size={14} className="text-[#378ADD]" />
                                                    : <AlertTriangle size={14} className="text-amber-400" />
                                                : null
                                        }
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {selectedModel && !isReady && (
                        <div className="flex items-start gap-2 mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                            <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-amber-700 leading-relaxed">
                                Seçili modelin <strong>Model ID</strong> alanı boş. Vision çalışmaz — API Anahtarları sekmesinden model_id girin.
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
