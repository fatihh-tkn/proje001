import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus, Eye, EyeOff, CheckCircle2, Activity, RefreshCw,
    X, Cpu, Key, Copy, Pencil, Trash2, Check
} from 'lucide-react';
import { API_BASE, fetchWithTimeout } from '../utils';
import { mutate, notify } from '../../../../api/client';
import SearchableModelSelect from '../SearchableModelSelect';

const PROVIDER_CONFIG = {
    openrouter: { abbr: 'OR', color: '#E5620E', bg: '#FFF0E6', label: 'OPENROUTER' },
    openai:     { abbr: 'AI', color: '#10A37F', bg: '#E6FAF5', label: 'OPENAI'     },
    anthropic:  { abbr: 'AN', color: '#D97706', bg: '#FEF9E7', label: 'ANTHROPIC'  },
    google:     { abbr: 'G',  color: '#4285F4', bg: '#EBF3FE', label: 'GOOGLE'     },
    groq:       { abbr: 'GQ', color: '#F55036', bg: '#FFF0EE', label: 'GROQ'       },
    mistral:    { abbr: 'M',  color: '#7C3AED', bg: '#F3F0FF', label: 'MISTRAL'    },
};

function getPC(provider) {
    const key = (provider || '').toLowerCase();
    return PROVIDER_CONFIG[key] || {
        abbr: (provider || '??').substring(0, 2).toUpperCase(),
        color: '#6B7280',
        bg: '#F3F4F6',
        label: (provider || 'BILINMIYOR').toUpperCase(),
    };
}

function StatusBadge({ status }) {
    if (status === 'checking') return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full text-stone-500 bg-stone-100 whitespace-nowrap">
            <RefreshCw size={10} className="animate-spin" /> BAĞLANIYOR
        </span>
    );
    if (status === 'active') return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full text-emerald-700 bg-emerald-50 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" /> AKTİF
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full text-red-700 bg-red-50 whitespace-nowrap">
            <X size={10} strokeWidth={2.5} /> PASİF
        </span>
    );
}

function ModelRow({ model, index, alias, onAliasChange, onDelete }) {
    const [status, setStatus] = useState('checking');
    const [refreshing, setRefreshing] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [copied, setCopied] = useState(false);

    const displayName = alias || `Kaynak_${index + 1}`;
    const pc = getPC(model.provider);

    const checkStatus = useCallback(async () => {
        setRefreshing(true);
        try {
            const res = await fetchWithTimeout(`${API_BASE}/custom-models/${model.id}/verify`, { method: 'POST' }, 10000);
            const data = await res.json();
            setStatus(data.ok && data.models ? 'active' : 'inactive');
        } catch {
            setStatus('inactive');
        }
        setRefreshing(false);
    }, [model.id]);

    useEffect(() => { checkStatus(); }, [checkStatus]);

    const handleCopy = () => {
        navigator.clipboard.writeText(model.masked_key || '').catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const commitEdit = () => {
        const trimmed = editName.trim();
        if (trimmed && trimmed !== displayName) onAliasChange(model.id, trimmed);
        setEditing(false);
    };

    const date = model.created_at
        ? new Date(model.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '.')
        : '—';

    return (
        <div className="flex items-center gap-3 px-4 py-3 bg-white border border-stone-200 rounded-xl hover:border-stone-300 hover:shadow-sm transition-all group">

            {/* Avatar */}
            <div
                className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-white text-[11px] font-black shadow-sm select-none"
                style={{ background: pc.color }}
            >
                {pc.abbr}
            </div>

            {/* İsim + sağlayıcı + model */}
            <div className="min-w-0 w-48 shrink-0">
                {editing ? (
                    <input
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false); }}
                        className="w-full text-[13px] font-bold bg-white border border-[#378ADD] rounded px-2 py-0.5 text-stone-700 focus:outline-none"
                    />
                ) : (
                    <div className="flex items-center gap-1.5 mb-0.5 min-w-0">
                        <span className="text-[13px] font-bold text-stone-800 truncate">{displayName}</span>
                        <span className="text-[9px] font-black tracking-widest px-1.5 py-px rounded shrink-0" style={{ color: pc.color, background: pc.bg }}>
                            {pc.label}
                        </span>
                    </div>
                )}
                <p className="text-[10px] text-stone-400 font-mono truncate">{model.name}</p>
            </div>

            {/* Maskelenmiş anahtar */}
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <Key size={12} className="text-stone-400 shrink-0" />
                <span className="text-[12px] font-mono text-stone-500 truncate">{model.masked_key}</span>
                <button onClick={handleCopy} className="shrink-0 text-stone-400 hover:text-stone-600 transition-colors" title="Kopyala">
                    {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                </button>
            </div>

            {/* Kullanım çubuğu */}
            <div className="shrink-0 w-32 hidden lg:flex items-center gap-2">
                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest whitespace-nowrap">KULLANIM</span>
                <div className="flex-1 h-1 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: '0%', background: pc.color }} />
                </div>
            </div>

            {/* Durum */}
            <div className="shrink-0">
                <StatusBadge status={refreshing ? 'checking' : status} />
            </div>

            {/* Tarih */}
            <span className="text-[11px] text-stone-400 font-mono shrink-0 hidden xl:block w-14 text-right">{date}</span>

            {/* İşlemler */}
            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={checkStatus}
                    disabled={refreshing}
                    className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-all"
                    title="Yeniden doğrula"
                >
                    <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                </button>
                <button
                    onClick={() => { setEditing(true); setEditName(displayName); }}
                    className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-all"
                    title="Yeniden adlandır"
                >
                    <Pencil size={13} />
                </button>
                <button
                    onClick={() => onDelete(model.id)}
                    className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Sil"
                >
                    <Trash2 size={13} />
                </button>
            </div>
        </div>
    );
}

/* ─── Ana Bileşen ──────────────────────────────────────────────────── */
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

    const isCustomCompat = selectedProviderId === 'openai_compat';

    const handleVerify = async () => {
        if (!keyVal.trim()) return;
        if (isCustomCompat && !baseUrl.trim()) { notify.error('Özel sağlayıcı için Base URL gereklidir.'); return; }
        setVerifying(true);
        try {
            const data = await mutate.process(`${API_BASE}/custom-models/verify`,
                { api_key: keyVal.trim(), provider: selectedProviderId || undefined, base_url: baseUrl.trim() || undefined },
                { subject: 'API anahtarı', silentSuccess: true, customError: 'API anahtarı doğrulanamadı' }
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
                { api_key: keyVal.trim(), name: selectedModel, provider: selectedProviderId || undefined, base_url: baseUrl.trim() || undefined },
                { subject: 'Model', detail: selectedModel }
            );
            setKeyVal(''); setAvailableModels([]); setSelectedModel('');
            setProvider(''); setSelectedProviderId(''); setBaseUrl('');
            setAdvancedOpen(false); setShowForm(false);
            await fetchModels();
        } catch { /* mutate toast attı */ }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        const m = models.find(x => x.id === id);
        try {
            await mutate.remove(`${API_BASE}/custom-models/${id}`, null, { subject: 'Model', detail: m?.name || aliases[id] || id });
            await fetchModels();
        } catch { /* mutate toast attı */ }
    };

    const closeForm = () => {
        setShowForm(false); setKeyVal(''); setAvailableModels([]);
        setSelectedModel(''); setProvider(''); setSelectedProviderId('');
        setBaseUrl(''); setAdvancedOpen(false); setShowKey(false);
    };

    if (loading) return (
        <div className="w-full h-full flex flex-col bg-stone-50">
            <div className="shrink-0 flex items-center justify-between px-6 py-4 bg-white border-b border-stone-200">
                <div className="h-8 w-48 bg-stone-100 rounded-lg animate-pulse" />
                <div className="h-9 w-32 bg-stone-100 rounded-lg animate-pulse" />
            </div>
            <div className="flex-1 p-6 space-y-2">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-16 w-full bg-white border border-stone-200 rounded-xl animate-pulse" />
                ))}
            </div>
        </div>
    );

    return (
        <div className="w-full h-full flex flex-col bg-stone-50">

            {/* Başlık */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 bg-white border-b border-stone-200">
                <div>
                    <div className="flex items-center gap-2">
                        <Key size={15} className="text-stone-500" />
                        <h2 className="text-[14px] font-black text-stone-800">API Anahtarları</h2>
                    </div>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                        {models.length} anahtar bağlı · Sağlayıcı otomatik algılanır
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white text-[12px] font-bold rounded-lg transition-colors shadow-sm"
                >
                    <Plus size={14} />
                    Yeni Anahtar
                </button>
            </div>

            {/* Liste */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
                {models.map((m, idx) => (
                    <ModelRow
                        key={m.id}
                        model={m}
                        index={idx}
                        alias={aliases[m.id]}
                        onAliasChange={saveAlias}
                        onDelete={handleDelete}
                    />
                ))}

                {/* Alt ekleme satırı */}
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 w-full px-4 py-3 border border-dashed border-stone-300 rounded-xl text-[11px] text-stone-400 hover:text-stone-600 hover:border-stone-400 hover:bg-white transition-all"
                >
                    <Plus size={13} />
                    <span>API anahtarı ekle — sk-..., AIza..., gsk_...</span>
                </button>
            </div>

            {/* Form — Modal */}
            {showForm && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={closeForm}>
                    <div
                        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 p-8 animate-in fade-in slide-in-from-bottom-4"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-100">
                            <div className="flex items-center gap-3 text-stone-700">
                                <Cpu size={18} className="text-[#378ADD]" />
                                <h4 className="text-[15px] font-black">Yeni Model Bağlantısı</h4>
                            </div>
                            <button onClick={closeForm} className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-5">
                            {/* API Key */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest pl-1">API Anahtarı</label>
                                <div className="relative">
                                    <input
                                        type={showKey ? 'text' : 'password'}
                                        value={keyVal}
                                        onChange={e => setKeyVal(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && availableModels.length === 0 && handleVerify()}
                                        placeholder="sk-..."
                                        className="w-full bg-white border border-stone-200 rounded-lg px-4 py-3 text-[12px] font-bold font-mono text-stone-700 placeholder:text-stone-400 focus:border-[#378ADD] focus:outline-none focus:ring-1 focus:ring-[#378ADD]/30"
                                        autoFocus
                                        autoComplete="new-password"
                                        name="api-key-secret"
                                        data-1p-ignore="true"
                                        data-lpignore="true"
                                        data-form-type="other"
                                        spellCheck={false}
                                    />
                                    <button
                                        onClick={() => setShowKey(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#378ADD] transition-colors"
                                    >
                                        {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
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

                            {/* Gelişmiş */}
                            {advancedOpen && (
                                <div className="space-y-4 p-4 rounded-lg bg-stone-50 border border-stone-200">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest pl-1">Sağlayıcı</label>
                                        <select
                                            value={selectedProviderId}
                                            onChange={e => setSelectedProviderId(e.target.value)}
                                            className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2.5 text-[12px] font-mono text-stone-700 focus:border-[#378ADD] focus:outline-none cursor-pointer"
                                        >
                                            <option value="">Otomatik tespit</option>
                                            {providerChoices.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                                        </select>
                                    </div>
                                    {isCustomCompat && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest pl-1">Base URL</label>
                                            <input
                                                type="text"
                                                value={baseUrl}
                                                onChange={e => setBaseUrl(e.target.value)}
                                                placeholder="https://your-host/v1"
                                                className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2.5 text-[12px] font-mono text-stone-700 placeholder:text-stone-400 focus:border-[#378ADD] focus:outline-none"
                                                autoComplete="off"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Doğrulama sonucu */}
                            {availableModels.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Tespit Edilen Modeller</label>
                                        <span className="text-emerald-700 text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> {provider} BAĞLANDI
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

                            {/* Buton */}
                            <div className="pt-4 border-t border-stone-100 flex justify-end">
                                {availableModels.length === 0 ? (
                                    <button
                                        onClick={handleVerify}
                                        disabled={verifying || !keyVal.trim()}
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-[11px] font-bold tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-stone-800 hover:bg-stone-900 text-white"
                                    >
                                        {verifying ? <RefreshCw size={14} className="animate-spin" /> : <Activity size={14} />}
                                        {verifying ? 'TEST EDİLİYOR...' : 'DOĞRULA'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSave}
                                        disabled={saving || !selectedModel}
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-[11px] font-bold tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-[#378ADD] hover:bg-[#2868A8] text-white"
                                    >
                                        {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                        {saving ? 'KAYDEDİLİYOR...' : 'ENTEGRE ET'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});
