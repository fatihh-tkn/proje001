import React, { useState, useEffect, useCallback } from 'react';
import {
    Zap, Key, Plus, Trash2, Eye, EyeOff, CheckCircle2,
    Activity, RefreshCw, X, Box
} from 'lucide-react';
import { API_BASE, fetchWithTimeout } from '../utils';

/* ─── Model Card ─────────────────────────────────────────────────── */
function ModelCard({ model, onDelete }) {
    const [showConfirm, setShowConfirm] = useState(false);

    return (
        <div className="group relative rounded-xl border flex transition-all duration-200 bg-[var(--window-bg)] hover:shadow-lg hover:-translate-y-0.5 border-[var(--window-border)] hover:border-[var(--accent)] overflow-hidden min-h-[100px]">

            {/* Main Content (left side) */}
            <div className={`flex-1 p-4 flex flex-col gap-3 min-w-0 pr-10 transition-opacity duration-300 ${showConfirm ? 'opacity-30' : 'opacity-100'}`}>
                {/* Action Bar (Top Right before delete bar) */}
                <div className="absolute top-3 right-12 flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full text-emerald-500 bg-emerald-500/10 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                        AKTİF
                    </span>
                </div>

                {/* Icon + Name */}
                <div className="flex items-start gap-3 mt-1">
                    <div className="p-2.5 rounded-lg shrink-0 transition-transform group-hover:scale-110 bg-[var(--window-bg)] border border-[var(--window-border)] text-[var(--accent)]">
                        <Box size={20} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-black text-[var(--workspace-text)] text-sm truncate">{model.name}</h3>
                        <p className="text-[10px] font-mono tracking-wider truncate text-[var(--sidebar-text-muted)] mt-0.5 flex items-center gap-1">
                            <Key size={10} /> {model.masked_key}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center pt-3 mt-auto border-t border-white/[0.06]">
                    <span className="text-[10px] text-[var(--sidebar-text-muted)]">
                        Oluşturulma: {new Date(model.created_at).toLocaleDateString('tr-TR')}
                    </span>
                </div>
            </div>

            {/* Inboard Delete Slide-in Bar */}
            <div
                className={`absolute right-0 top-0 bottom-0 bg-red-400/10 border-l border-red-500/20 backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden flex items-center justify-end ${showConfirm ? 'w-[220px] shadow-[-10px_0_30px_rgba(239,68,68,0.1)]' : 'w-10 hover:bg-red-400/20 cursor-pointer'}`}
                onClick={() => !showConfirm && setShowConfirm(true)}
                title={!showConfirm ? "Modeli Sil" : ""}
            >
                <div className="w-[220px] flex flex-col justify-center h-full relative shrink-0">

                    {/* Soru İçeriği (Tam Ortalanmış Büyütülmüş) */}
                    <div className={`absolute left-0 right-0 top-0 bottom-0 flex flex-col justify-center items-center px-4 transition-opacity duration-300 ${showConfirm ? 'opacity-100 delay-100' : 'opacity-0 pointer-events-none'}`}>
                        <p className="text-xs font-black text-red-500 mb-3 tracking-wide">Gerçekten Silinsin mi?</p>
                        <div className="flex items-center justify-center gap-2 w-full">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowConfirm(false); }}
                                className="flex-1 py-1.5 bg-[var(--window-bg)] border border-[var(--window-border)] text-[var(--sidebar-text-muted)] hover:text-white hover:bg-white/5 text-[10px] uppercase tracking-widest font-black rounded-lg transition-colors cursor-pointer shadow-sm min-w-[70px]"
                            >
                                İPTAL
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(model.id); }}
                                className="flex-1 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[10px] uppercase tracking-widest font-black rounded-lg transition-colors cursor-pointer shadow-md shadow-red-500/20 min-w-[70px]"
                            >
                                SİL
                            </button>
                        </div>
                    </div>

                    {/* İkon (Sadece kapalıyken görünür) */}
                    <div className={`absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center border-l-0 transition-opacity duration-300 ${showConfirm ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                        <Trash2 size={16} className="text-red-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>
            </div>

        </div>
    );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export const ModelsTab = React.memo(() => {
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);

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
                        <div key={i} className="h-32 rounded-xl bg-white/5 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* ── Top Bar ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-black text-[var(--workspace-text)] flex items-center gap-2">
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
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-[var(--sidebar-text-muted)] bg-white/5 border border-white/[0.08] hover:bg-white/10 transition-all cursor-pointer"
                    >
                        <RefreshCw size={12} /> Yenile
                    </button>
                    {!showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-md shadow-[var(--accent-light)]"
                        >
                            <Plus size={12} /> Model Ekle
                        </button>
                    )}
                </div>
            </div>

            {/* ── Add Model Form ── */}
            {showForm && (
                <div className="p-5 rounded-xl border border-[var(--window-border)] bg-[var(--sidebar-hover)] shadow-md animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-black text-[var(--accent)] flex items-center gap-2">
                            <Plus size={14} /> Yeni Model Oluştur
                        </h4>
                        <button onClick={() => setShowForm(false)} className="text-[var(--sidebar-text-muted)] hover:text-[var(--workspace-text)] transition-colors cursor-pointer">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="space-y-1.5 w-full">
                            <label className="text-[10px] uppercase font-black tracking-widest text-[var(--sidebar-text-muted)]">API Anahtarı (Google, OpenAI, Groq vb.)</label>
                            <div className="relative">
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    value={keyVal}
                                    onChange={e => setKeyVal(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                                    placeholder="sk-..., AIza..., gsk_..."
                                    className="w-full bg-[var(--window-bg)] border border-[var(--window-border)] rounded-lg px-3 py-2.5 text-xs text-[var(--workspace-text)] pr-10 placeholder-opacity-50 outline-none focus:border-[var(--accent)] transition-all font-mono block"
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
                            <div className="space-y-1.5 w-full mt-2 animate-in fade-in slide-in-from-top-2">
                                <label className="text-[10px] uppercase font-black tracking-widest text-[var(--sidebar-text-muted)] flex justify-between">
                                    <span>Kullanılabilir Modeller</span>
                                    <span className="text-[var(--accent)]">{provider} Bağlantısı Başarılı</span>
                                </label>
                                <select
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    className="w-full bg-[var(--window-bg)] border border-[var(--window-border)] rounded-lg px-3 py-2.5 text-xs text-[var(--workspace-text)] outline-none focus:border-[var(--accent)] transition-all"
                                >
                                    {availableModels.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="mt-5 flex justify-end gap-2">
                        {availableModels.length === 0 ? (
                            <button
                                onClick={handleVerify}
                                disabled={verifying || !keyVal.trim()}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black transition-all cursor-pointer disabled:opacity-40 bg-[var(--sidebar-bg)] hover:bg-[var(--sidebar-hover)] border border-[var(--window-border)] text-white"
                            >
                                {verifying ? <RefreshCw size={14} className="animate-spin" /> : <Activity size={14} />}
                                {verifying ? 'KONTROL EDİLİYOR...' : 'ANAHTARI DOĞRULA'}
                            </button>
                        ) : (
                            <button
                                onClick={handleSave}
                                disabled={saving || !selectedModel}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black transition-all cursor-pointer disabled:opacity-40 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-lg shadow-[var(--accent-light)]"
                            >
                                {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                {saving ? 'KAYDEDİLİYOR...' : 'SEÇİLİ MODELİ KAYDET'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── Models List ── */}
            {models.length === 0 ? (
                <div className="py-20 text-center border border-dashed border-white/10 rounded-xl">
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 text-white/20">
                        <Box size={24} />
                    </div>
                    <p className="text-sm font-bold text-[var(--sidebar-text-muted)]">Henüz hiç model eklenmemiş.</p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="mt-4 px-4 py-2 bg-[var(--sidebar-hover)] hover:bg-white/10 text-xs font-bold rounded-lg border border-white/5 transition-all cursor-pointer"
                    >
                        İlk Modeli Ekle
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {models.map(m => (
                        <ModelCard
                            key={m.id}
                            model={m}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

        </div>
    );
});
