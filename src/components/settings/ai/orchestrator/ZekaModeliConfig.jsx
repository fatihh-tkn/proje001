import React, { useState, useCallback, useEffect } from 'react';
import { Brain, Loader2, RefreshCw, Check, AlertTriangle } from 'lucide-react';

const API = '/api/settings/intelligence-model';

const PROVIDER_BADGE = {
    gemini:     { label: 'G', color: '#4285F4' },
    google:     { label: 'G', color: '#4285F4' },
    openai:     { label: 'O', color: '#10A37F' },
    anthropic:  { label: 'A', color: '#D97706' },
    groq:       { label: 'Q', color: '#F472B6' },
    openrouter: { label: 'R', color: '#7C3AED' },
};

const LANGUAGES = [
    { value: 'auto',  label: 'Otomatik',  desc: 'Kullanıcı diline göre yanıt verir' },
    { value: 'tr',    label: 'Türkçe',    desc: 'Her zaman Türkçe yanıt' },
    { value: 'en',    label: 'İngilizce', desc: 'Her zaman İngilizce yanıt' },
];

const SectionHeader = ({ title }) => (
    <div className="flex items-center gap-3 pt-6 pb-2">
        <span className="text-[9px] font-black tracking-[0.18em] text-stone-400 uppercase whitespace-nowrap">{title}</span>
        <div className="flex-1 h-px bg-stone-100" />
    </div>
);

export default function ZekaModeliConfig() {
    const [data, setData]     = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving]   = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res  = await fetch(API);
            setData(await res.json());
        } catch { }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const post = useCallback(async (body, key) => {
        setSaving(key);
        try {
            await fetch(API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
        } catch { }
        finally { setSaving(null); }
    }, []);

    /* ── Model seç ───────────────────────────────────── */
    const selectModel = async (modelId) => {
        if (saving) return;
        setData(prev => ({ ...prev, current_model: modelId }));
        // dispatch → ChatBar da anlık güncellenir
        window.dispatchEvent(new CustomEvent('agent-model-changed', { detail: { model: modelId } }));
        await post({ model: modelId }, 'model');
    };

    /* ── Sıcaklık ────────────────────────────────────── */
    const [tempLocal, setTempLocal] = useState(null);
    useEffect(() => { if (data) setTempLocal(data.temperature); }, [data?.temperature]);
    const commitTemp = async () => {
        if (tempLocal === data?.temperature) return;
        setData(prev => ({ ...prev, temperature: tempLocal }));
        await post({ temperature: tempLocal }, 'temperature');
    };

    /* ── Max tokens ──────────────────────────────────── */
    const [tokLocal, setTokLocal] = useState(null);
    useEffect(() => { if (data) setTokLocal(data.max_tokens); }, [data?.max_tokens]);
    const commitTokens = async () => {
        if (tokLocal === data?.max_tokens) return;
        setData(prev => ({ ...prev, max_tokens: tokLocal }));
        await post({ max_tokens: tokLocal }, 'max_tokens');
    };

    /* ── Dil ─────────────────────────────────────────── */
    const selectLang = async (val) => {
        if (saving || val === data?.language) return;
        setData(prev => ({ ...prev, language: val }));
        await post({ language: val }, 'language');
    };

    if (loading) return (
        <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="text-[#378ADD] animate-spin" />
        </div>
    );

    const badge = (provider = '') =>
        PROVIDER_BADGE[(provider || '').toLowerCase()] || { label: '?', color: '#9CA3AF' };

    return (
        <div>
            {/* Başlık */}
            <div className="flex items-start justify-between gap-4 mb-1">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                        <Brain size={18} className="text-[#378ADD]" />
                    </div>
                    <div>
                        <h2 className="text-[18px] font-black text-stone-800 tracking-tight leading-tight">Zeka Modeli</h2>
                        <p className="text-[11px] text-stone-400 mt-0.5">Tüm ajanlar için varsayılan AI modeli ve davranış parametreleri</p>
                    </div>
                </div>
                <button onClick={load} disabled={loading} className="p-2 rounded-lg hover:bg-stone-100 transition-colors text-stone-400 hover:text-stone-600 shrink-0">
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* ── 1. Model Seçimi ──────────────────────────────── */}
            <SectionHeader title="Model Seçimi" />
            <p className="text-[11px] text-stone-400 mb-3 leading-relaxed">
                Seçilen model, kilitli olmayan tüm ajanlar için aktif hale gelir. Kilitli ajanlar kendi modellerini korur.
            </p>

            {!data?.models?.length ? (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                    <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                        <strong>API Anahtarları</strong> sekmesinden en az bir model ekleyin.
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {data.models.map(m => {
                        const isActive = m.model_id === data.current_model || m.name === data.current_model;
                        const b = badge(m.provider);
                        return (
                            <div
                                key={m.id}
                                onClick={() => selectModel(m.model_id || m.name)}
                                className={`relative flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-100
                                    ${isActive
                                        ? 'bg-[#378ADD]/5 border-[#378ADD]/30 shadow-sm'
                                        : 'bg-white border-stone-100 hover:border-stone-200 hover:bg-stone-50'
                                    }`}
                            >
                                {isActive && <span className="absolute left-0 top-2 bottom-2 w-[2px] bg-[#378ADD] rounded-r" />}
                                <div className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-[10px] font-black text-white" style={{ background: b.color }}>
                                    {b.label}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-[13px] truncate ${isActive ? 'font-bold text-stone-800' : 'font-semibold text-stone-600'}`}>{m.name}</p>
                                    <p className="text-[10px] text-stone-400 font-mono truncate mt-0.5">
                                        {m.model_id || <span className="text-amber-400">model_id girilmemiş</span>}
                                    </p>
                                </div>
                                <span className="text-[10px] text-stone-300 font-mono shrink-0">{m.masked_key}</span>
                                {saving === 'model' && isActive
                                    ? <Loader2 size={13} className="text-[#378ADD] animate-spin shrink-0" />
                                    : isActive
                                        ? <Check size={13} className="text-[#378ADD] shrink-0" />
                                        : null
                                }
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── 2. Davranış Parametreleri ─────────────────────── */}
            <SectionHeader title="Davranış Parametreleri" />

            {/* Sıcaklık */}
            <div className="bg-white border border-stone-100 rounded-xl px-4 py-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <p className="text-[12px] font-semibold text-stone-700">Sıcaklık (Temperature)</p>
                        <p className="text-[10px] text-stone-400 mt-0.5">Düşük = tutarlı/deterministik · Yüksek = yaratıcı/çeşitli</p>
                    </div>
                    <span className="text-[16px] font-black text-[#378ADD] font-mono tabular-nums w-12 text-right">
                        {(tempLocal ?? data?.temperature ?? 0.7).toFixed(1)}
                    </span>
                </div>
                <input
                    type="range" min={0} max={1} step={0.1}
                    value={tempLocal ?? data?.temperature ?? 0.7}
                    onChange={e => setTempLocal(parseFloat(e.target.value))}
                    onMouseUp={commitTemp}
                    onTouchEnd={commitTemp}
                    className="w-full h-[3px] bg-stone-200 rounded-full appearance-none cursor-pointer accent-[#378ADD]"
                />
                <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-stone-300 font-mono">0.0</span>
                    <span className="text-[9px] text-stone-300 font-mono">1.0</span>
                </div>
            </div>

            {/* Max Tokens */}
            <div className="bg-white border border-stone-100 rounded-xl px-4 py-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <p className="text-[12px] font-semibold text-stone-700">Maksimum Token</p>
                        <p className="text-[10px] text-stone-400 mt-0.5">Yanıt başına üretilecek maksimum token sayısı</p>
                    </div>
                    <span className="text-[16px] font-black text-[#378ADD] font-mono tabular-nums w-16 text-right">
                        {(tokLocal ?? data?.max_tokens ?? 4096).toLocaleString()}
                    </span>
                </div>
                <input
                    type="range" min={256} max={32768} step={256}
                    value={tokLocal ?? data?.max_tokens ?? 4096}
                    onChange={e => setTokLocal(parseInt(e.target.value))}
                    onMouseUp={commitTokens}
                    onTouchEnd={commitTokens}
                    className="w-full h-[3px] bg-stone-200 rounded-full appearance-none cursor-pointer accent-[#378ADD]"
                />
                <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-stone-300 font-mono">256</span>
                    <span className="text-[9px] text-stone-300 font-mono">32 768</span>
                </div>
            </div>

            {/* ── 3. Yanıt Dili ─────────────────────────────────── */}
            <SectionHeader title="Yanıt Dili" />
            <div className="grid grid-cols-3 gap-2">
                {LANGUAGES.map(lang => {
                    const isActive = (data?.language || 'auto') === lang.value;
                    return (
                        <button
                            key={lang.value}
                            onClick={() => selectLang(lang.value)}
                            className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all duration-100
                                ${isActive
                                    ? 'bg-[#378ADD]/5 border-[#378ADD]/30 shadow-sm'
                                    : 'bg-white border-stone-100 hover:border-stone-200 hover:bg-stone-50'
                                }`}
                        >
                            <span className={`text-[12px] font-bold ${isActive ? 'text-[#378ADD]' : 'text-stone-600'}`}>{lang.label}</span>
                            <span className="text-[9px] text-stone-400 leading-tight">{lang.desc}</span>
                            {saving === 'language' && isActive && (
                                <Loader2 size={10} className="text-[#378ADD] animate-spin" />
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="h-8" />
        </div>
    );
}
