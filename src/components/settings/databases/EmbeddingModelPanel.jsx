import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain, Check, Loader2, RefreshCw, AlertTriangle,
    ChevronDown, ChevronUp, Cpu, Cloud, Sparkles
} from 'lucide-react';
import { mutation, mutate } from '../../../api/client';

const BASE = '/api/embedding';

const PROVIDER_CONFIG = {
    'sentence-transformers': { icon: Cpu,   color: '#22c55e', badge: 'CPU/GPU' },
    'openai':                { icon: Cloud, color: '#a78bfa', badge: 'API'     },
};

const EmbeddingModelPanel = () => {
    const [models, setModels] = useState([]);
    const [activeKey, setActiveKey] = useState('');
    const [loading, setLoading] = useState(true);
    const [switching, setSwitching] = useState(false);
    const [reVectorizing, setReVectorizing] = useState(false);
    const [reVecResult, setReVecResult] = useState(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [error, setError] = useState(null);

    const fetchModels = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${BASE}/models`);
            if (!res.ok) throw new Error('Model listesi alınamadı');
            const data = await res.json();
            setModels(data.models || []);
            setActiveKey(data.active || '');
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchModels(); }, []);

    const handleSelect = async (key) => {
        if (key === activeKey || switching) return;
        setSwitching(true);
        setError(null);
        const m = models.find(x => x.key === key);
        try {
            await mutation('PUT', `${BASE}/active`, { model_key: key }, {
                kind: 'save', subject: 'Aktif embedding modeli', detail: m?.name || key,
            });
            setActiveKey(key);
            setModels(prev => prev.map(m => ({ ...m, is_active: m.key === key })));
        } catch (e) {
            setError(e.message);
        }
        setSwitching(false);
    };

    const handleReVectorize = async () => {
        if (reVectorizing) return;
        if (!window.confirm(
            'Tüm mevcut belgeler aktif embedding modeli ile yeniden vektörleştirilecek.\n\n' +
            'Bu işlem büyük veritabanlarında uzun sürebilir. Devam etmek istiyor musunuz?'
        )) return;
        setReVectorizing(true);
        setReVecResult(null);
        setError(null);
        try {
            const data = await mutate.process(`${BASE}/re-vectorize`, null, {
                subject: 'Yeniden vektörleştirme', showLoading: true,
            });
            setReVecResult(data);
        } catch (e) {
            setError(e.message);
        }
        setReVectorizing(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-3 py-10">
                <Loader2 size={18} className="text-[#378ADD] animate-spin" />
                <span className="text-[12px] text-stone-500">Modeller yükleniyor...</span>
            </div>
        );
    }

    const activeModel = models.find(m => m.key === activeKey);

    return (
        <div className="flex flex-col">

            {/* Başlık */}
            <div className="flex items-center justify-between py-2.5 border-b border-stone-100 mb-1">
                <div className="flex items-center gap-2">
                    <Brain size={13} className="text-violet-400" />
                    <span className="text-[9px] font-black tracking-[0.18em] text-stone-400 uppercase">Embedding Model Yönetimi</span>
                </div>
                <span className="text-[9px] text-stone-400 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded">
                    {models.length} model
                </span>
            </div>

            {/* Aktif model şeridi */}
            {activeModel && (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#378ADD]/8 border-l-2 border-[#378ADD] rounded-r mb-1">
                    <Sparkles size={11} className="text-amber-400 shrink-0" />
                    <span className="text-[10px] text-stone-400 shrink-0">Aktif:</span>
                    <span className="text-[11px] font-bold text-[#378ADD] truncate">{activeModel.display_name}</span>
                </div>
            )}

            {/* Hata */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-[11px] mb-1 overflow-hidden"
                    >
                        <AlertTriangle size={13} className="shrink-0" />
                        <span>{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Model listesi */}
            <div className="flex flex-col">
                {models.map((m) => {
                    const isActive = m.key === activeKey;
                    const provConf = PROVIDER_CONFIG[m.provider] || PROVIDER_CONFIG['sentence-transformers'];
                    const ProvIcon = provConf.icon;
                    return (
                        <div
                            key={m.key}
                            onClick={() => handleSelect(m.key)}
                            style={{ cursor: switching ? 'wait' : 'pointer' }}
                            className={`relative flex flex-col gap-1 px-4 py-2.5 transition-all duration-100 border-b border-stone-50
                                ${isActive ? 'bg-[#378ADD]/8' : 'hover:bg-stone-50'}`}
                        >
                            {isActive && <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#378ADD]" />}

                            {/* Üst satır */}
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-6 h-6 shrink-0 rounded flex items-center justify-center"
                                    style={{ background: `${provConf.color}18`, color: provConf.color }}
                                >
                                    <ProvIcon size={13} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className={`text-[12px] ${isActive ? 'font-bold text-stone-800' : 'font-medium text-stone-600'}`}>
                                        {m.display_name}
                                    </span>
                                    <span className="text-[10px] text-stone-400 font-mono ml-1.5">{m.key}</span>
                                </div>
                                {isActive && (
                                    <div className="flex items-center gap-1 shrink-0" style={{ color: provConf.color }}>
                                        <Check size={10} />
                                        <span className="text-[9px] font-black tracking-wide">AKTİF</span>
                                    </div>
                                )}
                                {switching && !isActive && (
                                    <Loader2 size={12} className="text-stone-300 animate-spin shrink-0" />
                                )}
                            </div>

                            {/* Açıklama */}
                            {m.description && (
                                <p className="text-[10px] text-stone-400 leading-relaxed pl-8">{m.description}</p>
                            )}

                            {/* İstatistikler */}
                            <div className="flex items-center gap-5 pl-8 pt-0.5">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black tracking-[0.12em] text-stone-400 uppercase">Boyut</span>
                                    <span className="text-[11px] font-bold text-stone-600 font-mono">{m.dimension}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black tracking-[0.12em] text-stone-400 uppercase">Max Token</span>
                                    <span className="text-[11px] font-bold text-stone-600 font-mono">{m.max_seq_length?.toLocaleString()}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black tracking-[0.12em] text-stone-400 uppercase">Tür</span>
                                    <span
                                        className="text-[9px] font-black px-1.5 py-0.5 rounded tracking-wide mt-0.5"
                                        style={{ color: provConf.color, background: `${provConf.color}15` }}
                                    >
                                        {provConf.badge}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Gelişmiş bölüm toggle */}
            <div
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 px-4 py-2.5 cursor-pointer text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-colors border-t border-stone-100 select-none"
            >
                {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                <span className="text-[10px] font-bold">Gelişmiş İşlemler</span>
            </div>

            <AnimatePresence>
                {showAdvanced && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-col gap-3 px-4 py-3 bg-stone-50 border-t border-stone-100 overflow-hidden"
                    >
                        <div className="flex gap-2 items-start">
                            <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                            <span className="text-[10px] text-stone-500 leading-relaxed">
                                Model değiştirdikten sonra mevcut belgelerin vektörleri eski modelin çıktılarıdır.
                                Doğru sonuçlar için <strong className="text-stone-700">yeniden vektörleştirme</strong> yapmanız önerilir.
                            </span>
                        </div>

                        <button
                            onClick={handleReVectorize}
                            disabled={reVectorizing}
                            className="flex items-center justify-center gap-2 w-full py-2 bg-white hover:bg-[#378ADD] hover:text-white text-[#378ADD] border border-[#378ADD]/30 rounded-md text-[11px] font-bold transition-all disabled:opacity-50"
                        >
                            {reVectorizing
                                ? <Loader2 size={13} className="animate-spin" />
                                : <RefreshCw size={13} />
                            }
                            <span>{reVectorizing ? 'Vektörleştiriliyor...' : 'Tümünü Yeniden Vektörleştir'}</span>
                        </button>

                        <AnimatePresence>
                            {reVecResult && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px]"
                                >
                                    <Check size={13} className="text-emerald-500 shrink-0" />
                                    <span>
                                        <strong>{reVecResult.updated}</strong> parça güncellendi
                                        {reVecResult.errors > 0 && (
                                            <span className="text-red-400"> ({reVecResult.errors} hata)</span>
                                        )}
                                        <span className="text-stone-400"> — Model: {reVecResult.model}</span>
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default EmbeddingModelPanel;
