import React, { useState, useEffect, useCallback } from 'react';
import { FileCode, RefreshCw, Save, RotateCcw, ChevronDown, ChevronUp, Cpu, GitBranch, Sparkles } from 'lucide-react';
import { SETTINGS_BASE, fetchWithTimeout } from '../utils';

const CATEGORY_META = {
    aggregator: {
        label: 'Aggregator — Yanıt Üretici',
        desc: 'LLM\'e nihai cevabı oluştururken inject edilen promptlar. Her chat isteğinde aktif.',
        icon: Cpu,
        color: '#378ADD',
        bg: '#EBF4FF',
        border: '#BFD9F5',
        badgeBg: '#DBEAFE',
        badgeText: '#1D4ED8',
    },
    supervisor: {
        label: 'Supervisor — Intent Sınıflandırıcı',
        desc: 'Kullanıcı mesajını hangi kategoriye (general, hata_cozumu, dosya_qa…) ait olduğuna karar veren promptlar.',
        icon: GitBranch,
        color: '#16A34A',
        bg: '#F0FDF4',
        border: '#BBF7D0',
        badgeBg: '#DCFCE7',
        badgeText: '#15803D',
    },
    polish: {
        label: 'Msg Polish — Revizyon',
        desc: 'Asistan yanıtını imla, akıcılık ve ton açısından iyileştirirken kullanılan talimat.',
        icon: Sparkles,
        color: '#9333EA',
        bg: '#FAF5FF',
        border: '#E9D5FF',
        badgeBg: '#F3E8FF',
        badgeText: '#7E22CE',
    },
};

const NODE_LABELS = {
    'Aggregator': 'Aggregator',
    'Supervisor': 'Supervisor',
    'Msg Polish': 'Msg Polish',
};

export const PromptTemplatesTab = React.memo(() => {
    const [prompts, setPrompts] = useState([]);
    const [original, setOriginal] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [expanded, setExpanded] = useState({});
    const [resetting, setResetting] = useState({});

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchWithTimeout(`${SETTINGS_BASE}/prompts`);
            const data = await res.json();
            setPrompts(data.prompts || []);
            const orig = {};
            (data.prompts || []).forEach(p => { orig[p.key] = p.value; });
            setOriginal(orig);
            if (data.prompts?.length > 0) {
                setExpanded({ [data.prompts[0].key]: true });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const update = (key, val) => {
        setPrompts(prev => prev.map(p => p.key === key ? { ...p, value: val } : p));
        setSaved(false);
    };

    const save = async () => {
        setSaving(true);
        try {
            const payload = {};
            prompts.forEach(p => { payload[p.key] = p.value; });
            await fetchWithTimeout(`${SETTINGS_BASE}/prompts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompts: payload }),
            });
            const orig = {};
            prompts.forEach(p => { orig[p.key] = p.value; });
            setOriginal(orig);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const resetOne = async (key) => {
        setResetting(prev => ({ ...prev, [key]: true }));
        try {
            const res = await fetchWithTimeout(`${SETTINGS_BASE}/prompts/reset/${key}`, { method: 'POST' });
            const data = await res.json();
            if (data.ok) {
                update(key, data.value);
                setOriginal(prev => ({ ...prev, [key]: data.value }));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setResetting(prev => ({ ...prev, [key]: false }));
        }
    };

    const hasChanges = prompts.some(p => p.value !== original[p.key]);
    const dirtyCount = prompts.filter(p => p.value !== original[p.key]).length;

    if (loading) return (
        <div className="w-full h-full flex items-center justify-center gap-3 text-stone-400">
            <RefreshCw size={18} className="animate-spin" />
            <span className="text-[11px] font-bold uppercase tracking-widest">Yükleniyor...</span>
        </div>
    );

    // Kategoriye göre grupla
    const grouped = {};
    prompts.forEach(p => {
        const cat = p.category || 'aggregator';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(p);
    });
    const categoryOrder = ['aggregator', 'supervisor', 'polish'];

    return (
        <div className="w-full h-full overflow-y-auto bg-stone-50 minimal-scroll">
            <div className="max-w-3xl mx-auto p-6 space-y-6">

                {/* Başlık */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-stone-200/60 rounded-xl">
                            <FileCode size={18} className="text-stone-600" strokeWidth={2} />
                        </div>
                        <div>
                            <h2 className="text-[15px] font-black text-stone-800 tracking-tight">Prompt Şablonları</h2>
                            <p className="text-[11px] text-stone-400 font-medium mt-0.5">
                                {prompts.length} prompt · {Object.keys(grouped).length} node · her değişiklik anında aktif
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {dirtyCount > 0 && (
                            <span className="text-[10px] font-black px-2 py-1 bg-amber-100 text-amber-700 border border-amber-200 rounded-lg">
                                {dirtyCount} değişiklik
                            </span>
                        )}
                        <button
                            onClick={save}
                            disabled={!hasChanges || saving}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${
                                saved       ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                hasChanges  ? 'bg-stone-800 text-white hover:bg-stone-900 shadow-sm' :
                                              'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200'
                            }`}
                        >
                            <Save size={13} strokeWidth={2.5} />
                            {saved ? 'Kaydedildi' : saving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </div>

                {/* Akış şeması */}
                <div className="flex items-center gap-1 p-3 bg-white border border-stone-200 rounded-xl overflow-x-auto">
                    {['Kullanıcı mesajı', 'Supervisor', 'RAG / Specialist', 'Aggregator', 'Msg Polish', 'Yanıt'].map((step, i, arr) => (
                        <React.Fragment key={step}>
                            <div className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-bold whitespace-nowrap ${
                                step === 'Supervisor'   ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                step === 'Aggregator'  ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                step === 'Msg Polish'  ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                'bg-stone-100 text-stone-500 border border-stone-200'
                            }`}>{step}</div>
                            {i < arr.length - 1 && (
                                <span className="text-stone-300 text-[10px] shrink-0">→</span>
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* Kategori grupları */}
                {categoryOrder.map(catKey => {
                    const items = grouped[catKey];
                    if (!items?.length) return null;
                    const meta = CATEGORY_META[catKey] || CATEGORY_META.aggregator;
                    const CatIcon = meta.icon;
                    const catDirty = items.some(p => p.value !== original[p.key]);

                    return (
                        <div key={catKey} className="space-y-2">
                            {/* Kategori başlığı */}
                            <div
                                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border"
                                style={{ background: meta.bg, borderColor: meta.border }}
                            >
                                <div className="p-1.5 rounded-lg" style={{ background: meta.color + '20' }}>
                                    <CatIcon size={14} style={{ color: meta.color }} strokeWidth={2.5} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[11px] font-black text-stone-700">{meta.label}</div>
                                    <div className="text-[10px] text-stone-400 font-medium mt-0.5 leading-snug">{meta.desc}</div>
                                </div>
                                {catDirty && (
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: meta.color + '20', color: meta.color }}>
                                        DEĞİŞTİ
                                    </span>
                                )}
                            </div>

                            {/* Prompt kartları */}
                            {items.map(p => {
                                const isDirty = p.value !== original[p.key];
                                const isOpen = expanded[p.key];
                                const lines = (p.value || '').split('\n').length;
                                const chars = (p.value || '').length;

                                return (
                                    <div
                                        key={p.key}
                                        className="bg-white rounded-xl border shadow-sm overflow-hidden transition-all"
                                        style={{
                                            borderColor: isDirty ? meta.color + '50' : '#E7E5E4',
                                            boxShadow: isDirty ? `0 0 0 1px ${meta.color}30` : undefined,
                                        }}
                                    >
                                        {/* Kart başlığı */}
                                        <div
                                            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-stone-50 transition-colors"
                                            onClick={() => setExpanded(prev => ({ ...prev, [p.key]: !prev[p.key] }))}
                                        >
                                            <div
                                                className="w-2 h-2 rounded-full shrink-0 transition-colors"
                                                style={{ background: isDirty ? meta.color : '#D6D3D1' }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-[12px] font-black text-stone-700">{p.label}</span>
                                                    {p.node && (
                                                        <span
                                                            className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide"
                                                            style={{ background: meta.badgeBg, color: meta.badgeText }}
                                                        >
                                                            {p.node}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-stone-400 font-medium mt-0.5 leading-snug truncate">{p.desc}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 ml-2">
                                                <div className="flex items-center gap-2 text-[10px] text-stone-300 font-mono">
                                                    <span>{lines} satır</span>
                                                    <span>·</span>
                                                    <span>{chars >= 1000 ? `${(chars / 1000).toFixed(1)}K` : chars} kr</span>
                                                </div>
                                                {isDirty && (
                                                    <button
                                                        onClick={e => { e.stopPropagation(); resetOne(p.key); }}
                                                        disabled={resetting[p.key]}
                                                        title="Varsayılana sıfırla"
                                                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
                                                    >
                                                        <RotateCcw size={12} className={resetting[p.key] ? 'animate-spin' : ''} />
                                                    </button>
                                                )}
                                                {isOpen
                                                    ? <ChevronUp size={13} className="text-stone-400" />
                                                    : <ChevronDown size={13} className="text-stone-400" />}
                                            </div>
                                        </div>

                                        {/* Editör */}
                                        {isOpen && (
                                            <div className="px-4 pb-4 border-t border-stone-100">
                                                <div className="flex items-center justify-between mt-3 mb-2">
                                                    <span className="text-[9px] font-mono text-stone-300">{p.key}</span>
                                                    {isDirty && (
                                                        <span className="text-[9px] font-bold" style={{ color: meta.color }}>● düzenlendi</span>
                                                    )}
                                                </div>
                                                <textarea
                                                    value={p.value}
                                                    onChange={e => update(p.key, e.target.value)}
                                                    spellCheck={false}
                                                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-[11px] font-mono text-stone-700 leading-relaxed focus:outline-none transition-all resize-none"
                                                    style={{
                                                        minHeight: `${Math.max(100, Math.min(lines * 21, 380))}px`,
                                                        '--tw-ring-color': meta.color + '40',
                                                    }}
                                                    onFocus={e => {
                                                        e.target.style.borderColor = meta.color + '80';
                                                        e.target.style.boxShadow = `0 0 0 3px ${meta.color}20`;
                                                    }}
                                                    onBlur={e => {
                                                        e.target.style.borderColor = '';
                                                        e.target.style.boxShadow = '';
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}

                {/* Alt bilgi */}
                <div className="flex items-start gap-3 p-4 bg-stone-100/80 border border-stone-200 rounded-xl">
                    <span className="text-[11px] text-stone-500 leading-relaxed">
                        <strong className="text-stone-700">Yer tutucular:</strong> {' '}
                        <code className="font-mono bg-stone-200 px-1.5 py-0.5 rounded text-[10px]">{'{chat_memory}'}</code>{' '}ve{' '}
                        <code className="font-mono bg-stone-200 px-1.5 py-0.5 rounded text-[10px]">{'{file_name}'}</code>{' '}
                        otomatik doldurulur. Değişiklikler kaydedildikten sonra bir sonraki chat isteğinden itibaren aktif olur, yeniden başlatma gerekmez.
                    </span>
                </div>

            </div>
        </div>
    );
});
