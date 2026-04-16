import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus, Eye, EyeOff, CheckCircle2,
    Activity, RefreshCw, X, Box, Network, Cpu
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
            <div className="w-full h-full p-5 bg-[#f4f4f5]">
                <div className="flex flex-col gap-3">
                    {[1, 2, 3].map((_, i) => (
                        <div key={i} className="h-28 w-full rounded-md bg-white/70 border border-black/[0.04] animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full p-4 md:p-5 bg-[#f4f4f5] space-y-5 animate-in fade-in duration-300">

            {/* ── Simple Add API Key Button ── */}
            {!showForm && (
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 text-[13px] font-semibold text-[var(--sidebar-text-muted)] hover:text-[var(--accent)] transition-colors py-1"
                >
                    <Plus size={16} />
                    <span>API Anahtarı Ekle</span>
                </button>
            )}

            {/* ── Add Model Form (Flat Design) ── */}
            {showForm && (
                <div className="p-6 rounded-sm bg-white ring-1 ring-black/[0.06] shadow-sm animate-in fade-in slide-in-from-top-2 relative">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2 text-[var(--workspace-text)]">
                            <Cpu size={16} className="text-[var(--accent)]" />
                            <h4 className="text-sm font-semibold">Yeni Model Bağlantısı</h4>
                        </div>
                        <button onClick={() => setShowForm(false)} className="w-6 h-6 flex items-center justify-center rounded-sm text-[var(--sidebar-text-muted)] hover:text-[var(--workspace-text)] hover:bg-black/[0.04] transition-colors">
                            <X size={14} />
                        </button>
                    </div>

                    <div className="flex flex-col gap-4 max-w-xl">
                        {/* Key Input */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold text-[var(--sidebar-text-muted)] uppercase tracking-wider">API Anahtarı (Secret Key)</label>
                            <div className="relative group">
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    value={keyVal}
                                    onChange={e => setKeyVal(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                                    placeholder="sk-..."
                                    className="w-full bg-gray-50 border border-black/[0.08] rounded-sm px-3 py-2.5 text-xs font-mono text-[var(--workspace-text)] focus:bg-white focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
                                    autoFocus
                                />
                                <button
                                    onClick={() => setShowKey(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--sidebar-text-muted)] hover:text-[var(--workspace-text)] transition-colors"
                                >
                                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>

                        {/* Verification Result */}
                        {availableModels.length > 0 && (
                            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-semibold text-[var(--sidebar-text-muted)] uppercase tracking-wider">Tespit Edilen Modeller</label>
                                    <span className="text-emerald-600 text-[10px] font-semibold flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> {provider} BAĞLANDI
                                    </span>
                                </div>
                                <select
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    className="w-full bg-white border border-black/[0.08] rounded-sm px-3 py-2.5 text-xs text-[var(--workspace-text)] font-medium focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all cursor-pointer"
                                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3E%3C/svg%3E")', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em', appearance: 'none' }}
                                >
                                    {availableModels.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="mt-2 pt-4 border-t border-black/[0.04] flex justify-end">
                            {availableModels.length === 0 ? (
                                <button
                                    onClick={handleVerify}
                                    disabled={verifying || !keyVal.trim()}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-sm text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-slate-800 hover:bg-slate-900 text-white shadow-sm"
                                >
                                    {verifying ? <RefreshCw size={14} className="animate-spin" /> : <Activity size={14} />}
                                    {verifying ? 'TEST EDİLİYOR...' : 'DOĞRULA'}
                                </button>
                            ) : (
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !selectedModel}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-sm text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-sm"
                                >
                                    {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                    {saving ? 'KAYDEDİLİYOR...' : 'ENTEGRE ET'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Models Grid ── */}
            {models.length > 0 && (
                <div className="flex flex-col gap-3 pb-8">
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
