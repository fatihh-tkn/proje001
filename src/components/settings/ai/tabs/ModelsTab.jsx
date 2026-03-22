import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus, Eye, EyeOff, CheckCircle2,
    Activity, RefreshCw, X, Box
} from 'lucide-react';
import { API_BASE, fetchWithTimeout } from '../utils';
import ModelCard from '../ModelCard';

/* ─── Main Component ─────────────────────────────────────────────── */
export const ModelsTab = React.memo(() => {
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [aliases, setAliases] = useState(() => JSON.parse(localStorage.getItem('model_aliases') || '{}'));

    const saveAlias = useCallback((id, newName) => {
        setAliases(prev => {
            const updated = { ...prev, [id]: newName };
            localStorage.setItem('model_aliases', JSON.stringify(updated));
            return updated;
        });
    }, []);

    const [showForm, setShowForm] = useState(false);
    const [keyVal, setKeyVal] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [saving, setSaving] = useState(false);

    // YENİ STATE'LER
    const [verifying, setVerifying] = useState(false);
    const [availableModels, setAvailableModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState('');
    const [provider, setProvider] = useState('');

    const fetchModels = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchWithTimeout(`${API_BASE}/catalog`);
            const data = await res.json();
            setModels(data.models || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchModels(); }, [fetchModels]);

    const handleVerify = async () => {
        if (!keyVal.trim()) return;
        setVerifying(true);
        try {
            const res = await fetchWithTimeout(`${API_BASE}/custom-models/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key: keyVal.trim() }),
            });
            const data = await res.json();
            if (data.ok && data.models) {
                setAvailableModels(data.models);
                setProvider(data.provider);
                setSelectedModel(data.models[0] || "");
            } else {
                alert("API doğrulanamadı veya model bulunamadı.");
            }
        } catch (e) {
            console.error(e);
            alert("Anahtar hatalı veya sunucuya ulaşılamıyor.");
        } finally {
            setVerifying(false);
        }
    };

    const handleSave = async () => {
        if (!keyVal.trim() || !selectedModel) return;
        setSaving(true);
        try {
            await fetchWithTimeout(`${API_BASE}/custom-models`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key: keyVal.trim(), name: selectedModel }),
            });

            // Sıfırla
            setKeyVal('');
            setAvailableModels([]);
            setSelectedModel('');
            setProvider('');
            setShowForm(false);
            await fetchModels();
        } catch (e) {
            console.error(e);
            alert("Model eklenirken bir hata oluştu.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await fetchWithTimeout(`${API_BASE}/custom-models/${id}`, { method: 'DELETE' });
            await fetchModels();
        } catch (e) {
            console.error(e);
        }
    };


    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-32 rounded-sm bg-white/5 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full overflow-y-auto p-6 bg-[#f5f5f7] space-y-6 animate-in fade-in duration-300 mac-horizontal-scrollbar">

            {/* ── Top Bar ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-medium text-[var(--workspace-text)] flex items-center gap-2">
                        <Activity size={16} className="text-[var(--accent)]" />
                        Yapay Zeka Modelleri
                    </h3>
                    <p className="text-xs text-[var(--sidebar-text-muted)] mt-1">
                        Sisteme istediğiniz kadar model ekleyebilir ve yönetebilirsiniz.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchModels}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] text-[11px] font-medium text-[var(--sidebar-text-muted)] bg-white ring-1 ring-black/[0.06] hover:bg-gray-50 transition-all cursor-pointer shadow-sm"
                    >
                        <RefreshCw size={12} /> Yenile
                    </button>
                    {!showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] text-[11px] font-medium transition-all cursor-pointer bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-md shadow-[var(--accent-light)]"
                        >
                            <Plus size={12} /> Model Ekle
                        </button>
                    )}
                </div>
            </div>

            {/* ── Add Model Form ── */}
            {showForm && (
                <div className="p-6 rounded-sm bg-white ring-1 ring-black/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.04)] animate-in fade-in slide-in-from-top-2 relative overflow-hidden">
                    {/* Üstte ince renkli vurgu şeridi */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--accent)] to-rose-400"></div>

                    <div className="flex items-center justify-between mb-6">
                        <h4 className="text-sm font-medium text-gray-800 flex items-center gap-2">
                            Yeni Model Bağlantısı
                        </h4>
                        <button onClick={() => setShowForm(false)} className="w-6 h-6 flex items-center justify-center rounded-sm bg-gray-50 text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer">
                            <X size={14} />
                        </button>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="space-y-2 w-full">
                            <label className="text-[10px] uppercase font-medium tracking-widest text-gray-400">API Anahtarı</label>
                            <div className="relative group/input">
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    value={keyVal}
                                    onChange={e => setKeyVal(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                                    placeholder="sk-..., AIza..., gsk_..."
                                    className="w-full bg-gray-50/50 hover:bg-gray-50 border border-black/[0.08] rounded-sm px-4 py-3 text-xs text-gray-800 pr-10 placeholder-gray-300 outline-none focus:bg-white focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 transition-all font-mono block shadow-inner"
                                    autoFocus
                                />
                                <button
                                    onClick={() => setShowKey(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--sidebar-text-muted)] hover:text-[var(--workspace-text)] transition-colors cursor-pointer"
                                >
                                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>

                        {/* Model Çekim Sonuçları */}
                        {availableModels.length > 0 && (
                            <div className="space-y-2 w-full mt-2 animate-in fade-in slide-in-from-top-2">
                                <label className="text-[10px] uppercase font-medium tracking-widest text-gray-400 flex justify-between items-center">
                                    <span>Kullanılabilir Modeller</span>
                                    <span className="text-emerald-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> {provider} bağlandı</span>
                                </label>
                                <select
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    className="w-full bg-gray-50/50 hover:bg-gray-50 border border-black/[0.08] shadow-inner rounded-sm px-4 py-3 text-xs text-gray-800 outline-none focus:bg-white focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 transition-all cursor-pointer font-medium"
                                >
                                    {availableModels.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end gap-3 border-t border-black/[0.04] pt-5">
                        {availableModels.length === 0 ? (
                            <button
                                onClick={handleVerify}
                                disabled={verifying || !keyVal.trim()}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-sm text-xs font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-gray-800 hover:bg-black text-white shadow-sm hover:shadow-md"
                            >
                                {verifying ? <RefreshCw size={14} className="animate-spin" /> : <Activity size={14} />}
                                {verifying ? 'KONTROL EDİLİYOR...' : 'ANAHTARI DOĞRULA'}
                            </button>
                        ) : (
                            <button
                                onClick={handleSave}
                                disabled={saving || !selectedModel}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-sm text-xs font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-sm hover:shadow-md"
                            >
                                {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                {saving ? 'KAYDEDİLİYOR...' : 'SEÇİLİ MODELİ EŞLEŞTİR'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── Models List ── */}
            {models.length === 0 ? (
                <div className="py-20 text-center rounded-sm ring-1 ring-black/[0.06] shadow-sm">
                    <div className="w-9 h-9 rounded-[3px] bg-gray-50 flex items-center justify-center ring-1 ring-black/[0.04] mx-auto mb-3 text-[var(--sidebar-text-muted)]">
                        <Box size={24} />
                    </div>
                    <p className="text-sm font-medium text-[var(--sidebar-text-muted)]">Henüz hiç model eklenmemiş.</p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="mt-4 px-4 py-2 bg-[var(--sidebar-hover)] hover:bg-[var(--window-bg)] text-xs font-medium rounded-sm border border-[var(--window-border)] transition-all cursor-pointer"
                    >
                        İlk Modeli Ekle
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {models.map((m, idx) => (
                        <ModelCard
                            key={m.id}
                            model={m}
                            index={idx}
                            alias={aliases[m.id]}
                            onAliasChange={saveAlias}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

        </div>
    );
});
