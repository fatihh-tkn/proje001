import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus, Eye, EyeOff, CheckCircle2,
    Activity, RefreshCw, X, Box, Network, Cpu
} from 'lucide-react';
import { API_BASE, fetchWithTimeout } from '../utils';
import { mutate, notify } from '../../../../api/client';
import ModelCard from '../ModelCard';
import SearchableModelSelect from '../SearchableModelSelect';

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

    // Provider seçici: '' = otomatik tespit, diğerleri = registry'den gelen id'ler
    const [providerChoices, setProviderChoices] = useState([]);
    const [selectedProviderId, setSelectedProviderId] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    const [advancedOpen, setAdvancedOpen] = useState(false);

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

    const fetchProviders = useCallback(async () => {
        try {
            const res = await fetchWithTimeout(`${API_BASE}/custom-models/providers`);
            const data = await res.json();
            setProviderChoices(data.providers || []);
        } catch (e) {
            console.error(e);
        }
    }, []);

    useEffect(() => { fetchModels(); fetchProviders(); }, [fetchModels, fetchProviders]);

    // 'openai_compat' (özel) seçilmediyse base_url alanı kapalı kalmalı.
    const isCustomCompat = selectedProviderId === 'openai_compat';

    const handleVerify = async () => {
        if (!keyVal.trim()) return;
        if (isCustomCompat && !baseUrl.trim()) {
            notify.error('Özel sağlayıcı için Base URL gereklidir.');
            return;
        }
        setVerifying(true);
        try {
            const data = await mutate.process(`${API_BASE}/custom-models/verify`,
                {
                    api_key: keyVal.trim(),
                    provider: selectedProviderId || undefined,
                    base_url: baseUrl.trim() || undefined,
                },
                {
                    subject: 'API anahtarı',
                    silentSuccess: true,           // doğrulama listesi inline gösterilecek
                    customError: 'API anahtarı doğrulanamadı',
                }
            );
            if (data?.ok && data.models) {
                setAvailableModels(data.models);
                setProvider(data.provider);
                setSelectedModel(data.models[0] || '');
                notify.success(`${data.models.length} model bulundu (${data.provider}).`);
            } else {
                notify.error('API doğrulandı ancak model bulunamadı.');
            }
        } catch { /* mutate toast attı */ }
        setVerifying(false);
    };

    const handleSave = async () => {
        if (!keyVal.trim() || !selectedModel) return;
        setSaving(true);
        try {
            await mutate.create(`${API_BASE}/custom-models`,
                {
                    api_key: keyVal.trim(),
                    name: selectedModel,
                    provider: selectedProviderId || undefined,
                    base_url: baseUrl.trim() || undefined,
                },
                { subject: 'Model', detail: selectedModel }
            );
            setKeyVal('');
            setAvailableModels([]);
            setSelectedModel('');
            setProvider('');
            setSelectedProviderId('');
            setBaseUrl('');
            setAdvancedOpen(false);
            setShowForm(false);
            await fetchModels();
        } catch { /* mutate toast attı */ }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        const m = models.find(x => x.id === id);
        try {
            await mutate.remove(`${API_BASE}/custom-models/${id}`, null,
                { subject: 'Model', detail: m?.name || aliases[id] || id }
            );
            await fetchModels();
        } catch { /* mutate toast attı */ }
    };

    if (loading) {
        return (
            <div className="w-full h-full p-6 md:p-8 bg-stone-50">
                <div className="flex flex-col gap-4">
                    {[1, 2, 3].map((_, i) => (
                        <div key={i} className="h-32 w-full rounded-xl bg-white border border-stone-200 animate-pulse shadow-sm" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full p-6 md:p-8 bg-stone-50 space-y-6 animate-in fade-in duration-300 overflow-y-auto mac-horizontal-scrollbar max-w-5xl mx-auto">

            {/* ── Simple Add API Key Button ── */}
            {!showForm && (
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 text-[12px] font-bold text-stone-500 hover:text-[#378ADD] transition-colors py-2"
                >
                    <Plus size={18} strokeWidth={2} />
                    <span>API Anahtarı Ekle</span>
                </button>
            )}

            {/* ── Add Model Form (Flat Design) ── */}
            {showForm && (
                <div className="p-8 rounded-xl bg-white border border-stone-200 shadow-sm animate-in fade-in slide-in-from-top-2 relative">
                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-100">
                        <div className="flex items-center gap-3 text-stone-700">
                            <Cpu size={20} className="text-[#378ADD]" strokeWidth={2} />
                            <h4 className="text-[16px] font-black tracking-tight">Yeni Model Bağlantısı</h4>
                        </div>
                        <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition-colors">
                            <X size={18} strokeWidth={2} />
                        </button>
                    </div>

                    <div className="flex flex-col gap-6 max-w-xl">
                        {/* Key Input */}
                        <div className="space-y-2.5">
                            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest pl-1">API Anahtarı (Secret Key)</label>
                            <div className="relative group">
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    value={keyVal}
                                    onChange={e => setKeyVal(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                                    placeholder="sk-..."
                                    className="w-full bg-white border border-stone-200 rounded-md px-4 py-3 text-[12px] font-bold font-mono text-stone-700 shadow-sm placeholder:text-stone-400 focus:bg-white focus:border-[#378ADD] focus:outline-none focus:ring-1 focus:ring-[#378ADD]/30 transition-all"
                                    autoFocus
                                    // Tarayıcı/şifre yöneticisi autofill'ini söndür:
                                    // - new-password: Chrome'un kayıtlı şifre önerilerini engeller
                                    // - data-* ignore: 1Password / LastPass / Bitwarden tetikleyicilerini kapatır
                                    // - name boş: önceki form girişlerini hatırlamaz
                                    autoComplete="new-password"
                                    name="api-key-secret"
                                    data-1p-ignore="true"
                                    data-lpignore="true"
                                    data-form-type="other"
                                    spellCheck={false}
                                />
                                <button
                                    onClick={() => setShowKey(v => !v)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#378ADD] transition-colors"
                                >
                                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAdvancedOpen(v => !v)}
                                className="text-[10px] font-bold text-stone-400 hover:text-[#378ADD] uppercase tracking-widest pl-1 transition-colors"
                            >
                                {advancedOpen ? '− Gelişmiş ayarları gizle' : '+ Sağlayıcı / Base URL belirt (opsiyonel)'}
                            </button>
                        </div>

                        {/* Advanced: Provider + Base URL (opsiyonel) */}
                        {advancedOpen && (
                            <div className="space-y-4 p-4 rounded-lg bg-stone-50 border border-stone-200 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest pl-1">
                                        Sağlayıcı (boş bırakılırsa API anahtarından otomatik tespit)
                                    </label>
                                    <select
                                        value={selectedProviderId}
                                        onChange={(e) => setSelectedProviderId(e.target.value)}
                                        className="w-full bg-white border border-stone-200 rounded-md px-4 py-2.5 text-[12px] font-bold font-mono text-stone-700 shadow-sm focus:border-[#378ADD] focus:outline-none focus:ring-1 focus:ring-[#378ADD]/30 cursor-pointer"
                                        style={{ backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3E%3C/svg%3E")', backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em', appearance: 'none' }}
                                    >
                                        <option value="">Otomatik tespit</option>
                                        {providerChoices.map(p => (
                                            <option key={p.id} value={p.id}>{p.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest pl-1">
                                        Base URL {isCustomCompat ? '(zorunlu)' : '(opsiyonel — bilinen sağlayıcının varsayılanını override eder)'}
                                    </label>
                                    <input
                                        type="text"
                                        value={baseUrl}
                                        onChange={e => setBaseUrl(e.target.value)}
                                        placeholder={isCustomCompat ? 'https://your-host/v1' : 'Boş bırak: registry varsayılanı'}
                                        className="w-full bg-white border border-stone-200 rounded-md px-4 py-2.5 text-[12px] font-bold font-mono text-stone-700 shadow-sm placeholder:text-stone-400 focus:border-[#378ADD] focus:outline-none focus:ring-1 focus:ring-[#378ADD]/30"
                                        autoComplete="off"
                                        spellCheck={false}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Verification Result */}
                        {availableModels.length > 0 && (
                            <div className="space-y-2.5 animate-in fade-in slide-in-from-top-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Tespit Edilen Modeller</label>
                                    <span className="text-[#3B6D11] text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[#3B6D11] animate-pulse"></span> {provider} BAĞLANDI
                                    </span>
                                </div>
                                <SearchableModelSelect
                                    models={availableModels}
                                    value={selectedModel}
                                    onChange={setSelectedModel}
                                    placeholder={`${availableModels.length} model · ara veya seç...`}
                                />
                            </div>
                        )}

                        {/* Actions */}
                        <div className="mt-4 pt-6 border-t border-stone-100 flex justify-end">
                            {availableModels.length === 0 ? (
                                <button
                                    onClick={handleVerify}
                                    disabled={verifying || !keyVal.trim()}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-md text-[11px] font-bold tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-stone-800 hover:bg-stone-900 text-white shadow-sm"
                                >
                                    {verifying ? <RefreshCw size={14} className="animate-spin" /> : <Activity size={14} />}
                                    {verifying ? 'TEST EDİLİYOR...' : 'DOĞRULA'}
                                </button>
                            ) : (
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !selectedModel}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-md text-[11px] font-bold tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-[#378ADD] hover:bg-[#2868A8] text-white shadow-sm"
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-12">
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
