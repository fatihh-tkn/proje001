import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain, Check, Loader2, RefreshCw, Globe, Zap, AlertTriangle,
    ChevronDown, ChevronUp, Cpu, Cloud, Sparkles
} from 'lucide-react';

const BASE = '/api/embedding';

// Provider ikonları ve renkleri
const PROVIDER_CONFIG = {
    'sentence-transformers': {
        icon: Cpu,
        color: '#22c55e',
        label: 'Lokal Model',
        badge: 'CPU/GPU',
    },
    'openai': {
        icon: Cloud,
        color: '#a78bfa',
        label: 'OpenAI API',
        badge: 'API',
    },
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
        try {
            const res = await fetch(`${BASE}/active`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model_key: key }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Model değiştirilemedi');
            }
            setActiveKey(key);
            setModels(prev => prev.map(m => ({ ...m, is_active: m.key === key })));
        } catch (e) {
            setError(e.message);
        } finally {
            setSwitching(false);
        }
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
            const res = await fetch(`${BASE}/re-vectorize`, { method: 'POST' });
            if (!res.ok) throw new Error('Yeniden vektörleştirme başarısız');
            const data = await res.json();
            setReVecResult(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setReVectorizing(false);
        }
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingBox}>
                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ color: '#78716c', fontSize: 12 }}>Embedding modelleri yükleniyor...</span>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <Brain size={18} style={{ color: '#a78bfa' }} />
                    <span style={styles.headerTitle}>Embedding Model Yönetimi</span>
                </div>
                <div style={styles.headerRight}>
                    <span style={styles.headerBadge}>
                        {models.length} model
                    </span>
                </div>
            </div>

            {/* Active Model Info */}
            {activeKey && (
                <div style={styles.activeInfo}>
                    <Sparkles size={14} style={{ color: '#fbbf24' }} />
                    <span style={styles.activeLabel}>Aktif:</span>
                    <span style={styles.activeName}>
                        {models.find(m => m.key === activeKey)?.display_name || activeKey}
                    </span>
                </div>
            )}

            {/* Error */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={styles.errorBox}
                    >
                        <AlertTriangle size={14} />
                        <span>{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Model Cards */}
            <div style={styles.modelList}>
                {models.map((m) => {
                    const isActive = m.key === activeKey;
                    const provConf = PROVIDER_CONFIG[m.provider] || PROVIDER_CONFIG['sentence-transformers'];
                    const ProvIcon = provConf.icon;

                    return (
                        <motion.div
                            key={m.key}
                            layout
                            whileHover={{ scale: 1.005 }}
                            onClick={() => handleSelect(m.key)}
                            style={{
                                ...styles.modelCard,
                                borderColor: isActive ? provConf.color : '#e7e5e4',
                                background: isActive
                                    ? `linear-gradient(135deg, ${provConf.color}15, ${provConf.color}05)`
                                    : '#fafaf9',
                                cursor: switching ? 'wait' : 'pointer',
                            }}
                        >
                            {/* Top Row */}
                            <div style={styles.cardTop}>
                                <div style={styles.cardLeft}>
                                    <div style={{
                                        ...styles.providerIcon,
                                        background: `${provConf.color}18`,
                                        color: provConf.color,
                                    }}>
                                        <ProvIcon size={14} />
                                    </div>
                                    <div>
                                        <div style={styles.modelName}>{m.display_name}</div>
                                        <div style={styles.modelKey}>{m.key}</div>
                                    </div>
                                </div>
                                <div style={styles.cardRight}>
                                    {isActive ? (
                                        <div style={{ ...styles.statusBadge, background: `${provConf.color}22`, color: provConf.color }}>
                                            <Check size={10} />
                                            AKTİF
                                        </div>
                                    ) : (
                                        switching ? (
                                            <Loader2 size={14} style={{ color: '#a8a29e', animation: 'spin 1s linear infinite' }} />
                                        ) : null
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            <div style={styles.modelDesc}>{m.description}</div>

                            {/* Stats */}
                            <div style={styles.statRow}>
                                <div style={styles.statItem}>
                                    <span style={styles.statLabel}>Boyut</span>
                                    <span style={styles.statValue}>{m.dimension}</span>
                                </div>
                                <div style={styles.statItem}>
                                    <span style={styles.statLabel}>Max Token</span>
                                    <span style={styles.statValue}>{m.max_seq_length?.toLocaleString()}</span>
                                </div>
                                <div style={styles.statItem}>
                                    <span style={styles.statLabel}>Tür</span>
                                    <span style={{
                                        ...styles.provBadge,
                                        background: `${provConf.color}15`,
                                        color: provConf.color,
                                    }}>
                                        {provConf.badge}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Advanced Section */}
            <div style={styles.advancedToggle} onClick={() => setShowAdvanced(!showAdvanced)}>
                {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                <span>Gelişmiş İşlemler</span>
            </div>

            <AnimatePresence>
                {showAdvanced && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={styles.advancedBox}
                    >
                        <div style={styles.advancedInfo}>
                            <AlertTriangle size={14} style={{ color: '#fbbf24', flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: '#78716c', lineHeight: 1.5 }}>
                                Model değiştirdikten sonra mevcut belgelerin vektörleri eski modelin çıktılarıdır.
                                Doğru sonuçlar için <strong style={{ color: '#44403c' }}>yeniden vektörleştirme</strong> yapmanız önerilir.
                            </span>
                        </div>

                        <button
                            onClick={handleReVectorize}
                            disabled={reVectorizing}
                            style={{
                                ...styles.reVecBtn,
                                opacity: reVectorizing ? 0.6 : 1,
                                cursor: reVectorizing ? 'wait' : 'pointer',
                            }}
                        >
                            {reVectorizing ? (
                                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            ) : (
                                <RefreshCw size={14} />
                            )}
                            <span>{reVectorizing ? 'Vektörleştiriliyor...' : 'Tümünü Yeniden Vektörleştir'}</span>
                        </button>

                        {/* Re-vectorize result */}
                        <AnimatePresence>
                            {reVecResult && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    style={styles.reVecResult}
                                >
                                    <Check size={14} style={{ color: '#22c55e' }} />
                                    <span>
                                        <strong>{reVecResult.updated}</strong> parça güncellendi
                                        {reVecResult.errors > 0 && (
                                            <span style={{ color: '#f87171' }}> ({reVecResult.errors} hata)</span>
                                        )}
                                        <span style={{ color: '#a8a29e' }}> — Model: {reVecResult.model}</span>
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Spin animation */}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};


// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '16px 0',
    },
    loadingBox: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        justifyContent: 'center',
        padding: 40,
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 8,
        borderBottom: '1px solid #f5f5f4', // border-stone-100
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: 600,
        color: '#44403c', // text-stone-700
        letterSpacing: '0.02em',
    },
    headerRight: {
        display: 'flex',
        alignItems: 'center',
    },
    headerBadge: {
        fontSize: 10,
        color: '#78716c', // text-stone-500
        background: '#fafaf9', // bg-stone-50
        border: '1px solid #e7e5e4', // border-stone-200
        padding: '2px 8px',
        borderRadius: 6,
    },
    activeInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 12px',
        background: '#fefce8', // bg-yellow-50
        border: '1px solid #fef08a', // border-yellow-200
        borderRadius: 8,
        fontSize: 12,
    },
    activeLabel: {
        color: '#854d0e', // text-yellow-800
    },
    activeName: {
        color: '#a16207', // text-yellow-700
        fontWeight: 600,
    },
    errorBox: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        background: '#fef2f2', // bg-red-50
        border: '1px solid #fecaca', // border-red-200
        borderRadius: 8,
        color: '#dc2626', // text-red-600
        fontSize: 11,
    },
    modelList: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
    },
    modelCard: {
        padding: '12px 14px',
        borderRadius: 10,
        border: '1px solid #e7e5e4', // border-stone-200
        transition: 'all 0.15s ease',
        background: '#ffffff',
    },
    cardTop: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
    },
    providerIcon: {
        width: 30,
        height: 30,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modelName: {
        fontSize: 13,
        fontWeight: 600,
        color: '#44403c', // text-stone-700
    },
    modelKey: {
        fontSize: 10,
        color: '#a8a29e', // text-stone-400
        fontFamily: 'monospace',
        marginTop: 1,
    },
    cardRight: {
        display: 'flex',
        alignItems: 'center',
    },
    statusBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.06em',
        padding: '3px 8px',
        borderRadius: 6,
    },
    modelDesc: {
        fontSize: 11,
        color: '#78716c', // text-stone-500
        marginTop: 8,
        lineHeight: 1.5,
    },
    statRow: {
        display: 'flex',
        gap: 16,
        marginTop: 10,
    },
    statItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
    },
    statLabel: {
        fontSize: 9,
        color: '#a8a29e', // text-stone-400
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
    },
    statValue: {
        fontSize: 12,
        fontWeight: 600,
        color: '#57534e', // text-stone-600
        fontFamily: 'monospace',
    },
    provBadge: {
        fontSize: 9,
        fontWeight: 700,
        padding: '2px 6px',
        borderRadius: 4,
        letterSpacing: '0.04em',
    },
    advancedToggle: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        color: '#78716c', // text-stone-500
        cursor: 'pointer',
        padding: '6px 0',
        userSelect: 'none',
    },
    advancedBox: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '12px 14px',
        background: '#fafaf9', // bg-stone-50
        border: '1px solid #e7e5e4', // border-stone-200
        borderRadius: 10,
        overflow: 'hidden',
    },
    advancedInfo: {
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
    },
    reVecBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        padding: '10px 0',
        background: 'linear-gradient(135deg, #fefce8, #fef08a)', // bg-yellow-50 to yellow-200
        border: '1px solid #fde047', // border-yellow-300
        borderRadius: 8,
        color: '#854d0e', // text-yellow-800
        fontSize: 12,
        fontWeight: 600,
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    },
    reVecResult: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        background: '#f0fdf4', // bg-green-50
        border: '1px solid #bbf7d0', // border-green-200
        borderRadius: 8,
        fontSize: 11,
        color: '#166534', // text-green-800
    },
};

export default EmbeddingModelPanel;
