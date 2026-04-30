import React, { useState, useEffect, useCallback } from 'react';
import {
    AlertTriangle, Plus, Trash2, RefreshCw, Search, X, Save, Hash, Tag, Layers
} from 'lucide-react';
import { mutate } from '../../../api/client';

const SEVERITY = [
    { id: 'low',      label: 'Düşük',  color: '#10b981' },
    { id: 'medium',   label: 'Orta',   color: '#f59e0b' },
    { id: 'high',     label: 'Yüksek', color: '#f97316' },
    { id: 'critical', label: 'Kritik', color: '#dc2626' },
];

const SeverityPill = ({ level }) => {
    const s = SEVERITY.find(s => s.id === level) || SEVERITY[1];
    return (
        <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-sm border" style={{ color: s.color, borderColor: s.color + '40', backgroundColor: s.color + '12' }}>
            {s.label}
        </span>
    );
};

const ErrorForm = ({ onSubmit, onCancel }) => {
    const [form, setForm] = useState({
        hata_kodu: '',
        baslik: '',
        modul: '',
        severity: 'medium',
        sebep: '',
    });
    const [steps, setSteps] = useState([{ title: '', tcode: '', detail: '' }]);
    const [saving, setSaving] = useState(false);

    const updateField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
    const updateStep = (i, k, v) => setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, [k]: v } : s));
    const addStep = () => setSteps(prev => [...prev, { title: '', tcode: '', detail: '' }]);
    const removeStep = (i) => setSteps(prev => prev.filter((_, idx) => idx !== i));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.hata_kodu.trim() || !form.baslik.trim()) {
            alert('Hata kodu ve başlık zorunludur.');
            return;
        }
        setSaving(true);
        const payload = {
            ...form,
            adimlar: steps.filter(s => s.title.trim()),
            dokumanlar: [],
        };
        try {
            await onSubmit(payload);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white border border-stone-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-2 text-stone-700">
                <AlertTriangle size={16} className="text-[#A01B1B]" />
                <h3 className="text-[13px] font-bold">Yeni Hata Kaydı</h3>
            </div>

            <div className="grid grid-cols-12 gap-3">
                <div className="col-span-3">
                    <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Kod</label>
                    <input
                        value={form.hata_kodu}
                        onChange={e => updateField('hata_kodu', e.target.value)}
                        placeholder="ME083"
                        className="w-full text-[12px] font-mono border border-stone-200 px-2.5 py-1.5 rounded-md focus:outline-none focus:border-[#A01B1B]"
                    />
                </div>
                <div className="col-span-6">
                    <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Başlık</label>
                    <input
                        value={form.baslik}
                        onChange={e => updateField('baslik', e.target.value)}
                        placeholder="Kısa açıklama"
                        className="w-full text-[12px] border border-stone-200 px-2.5 py-1.5 rounded-md focus:outline-none focus:border-[#A01B1B]"
                    />
                </div>
                <div className="col-span-3">
                    <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Modül</label>
                    <input
                        value={form.modul}
                        onChange={e => updateField('modul', e.target.value)}
                        placeholder="MM / PP / SD"
                        className="w-full text-[12px] border border-stone-200 px-2.5 py-1.5 rounded-md focus:outline-none focus:border-[#A01B1B]"
                    />
                </div>
            </div>

            <div>
                <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Önem Derecesi</label>
                <div className="flex gap-2">
                    {SEVERITY.map(s => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => updateField('severity', s.id)}
                            className="text-[11px] font-semibold px-3 py-1 rounded-md border transition"
                            style={{
                                color: form.severity === s.id ? '#fff' : s.color,
                                backgroundColor: form.severity === s.id ? s.color : 'transparent',
                                borderColor: s.color + '40',
                            }}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Sebep</label>
                <textarea
                    value={form.sebep}
                    onChange={e => updateField('sebep', e.target.value)}
                    rows={3}
                    placeholder="Hatanın tespit edilen nedeni"
                    className="w-full text-[12px] border border-stone-200 px-2.5 py-1.5 rounded-md focus:outline-none focus:border-[#A01B1B] resize-none"
                />
            </div>

            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold uppercase text-stone-500">Çözüm Adımları</label>
                    <button type="button" onClick={addStep} className="text-[10px] font-semibold text-[#A01B1B] hover:underline flex items-center gap-1">
                        <Plus size={11} /> Adım Ekle
                    </button>
                </div>
                <div className="space-y-2">
                    {steps.map((s, i) => (
                        <div key={i} className="flex gap-2 items-start">
                            <span className="shrink-0 w-6 h-6 inline-flex items-center justify-center bg-slate-900 text-white text-[10px] font-semibold rounded mt-0.5">
                                {i + 1}
                            </span>
                            <div className="flex-1 grid grid-cols-12 gap-2">
                                <input
                                    value={s.title}
                                    onChange={e => updateStep(i, 'title', e.target.value)}
                                    placeholder="Adım başlığı"
                                    className="col-span-5 text-[12px] border border-stone-200 px-2 py-1 rounded focus:outline-none focus:border-[#A01B1B]"
                                />
                                <input
                                    value={s.tcode}
                                    onChange={e => updateStep(i, 'tcode', e.target.value)}
                                    placeholder="T-kod"
                                    className="col-span-2 text-[11px] font-mono border border-stone-200 px-2 py-1 rounded focus:outline-none focus:border-[#A01B1B]"
                                />
                                <input
                                    value={s.detail}
                                    onChange={e => updateStep(i, 'detail', e.target.value)}
                                    placeholder="Detay"
                                    className="col-span-5 text-[12px] border border-stone-200 px-2 py-1 rounded focus:outline-none focus:border-[#A01B1B]"
                                />
                            </div>
                            {steps.length > 1 && (
                                <button type="button" onClick={() => removeStep(i)} className="text-stone-400 hover:text-[#A01B1B] mt-1">
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button type="button" onClick={onCancel} className="text-[11px] font-semibold text-stone-600 px-3 py-1.5 hover:bg-stone-50 rounded">
                    Vazgeç
                </button>
                <button type="submit" disabled={saving} className="text-[11px] font-semibold bg-[#A01B1B] text-white px-3 py-1.5 hover:bg-[#871717] disabled:bg-stone-300 rounded inline-flex items-center gap-1.5">
                    <Save size={12} />
                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
            </div>
        </form>
    );
};

const ErrorManagementViewer = ({ currentUser }) => {
    const [errors, setErrors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/errors/');
            const data = await res.json();
            setErrors(data.errors || []);
        } catch (e) {
            console.error('Hata listesi alınamadı:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async (payload) => {
        const userId = currentUser?.id || '';
        const url = userId ? `/api/errors/?user_id=${userId}` : '/api/errors/';
        try {
            await mutate.create(url, payload, {
                subject: 'Hata kaydı',
                detail: payload.hata_kodu || payload.baslik,
            });
            setShowForm(false);
            load();
        } catch { /* mutate toast attı */ }
    };

    const handleDelete = async (kimlik) => {
        if (!window.confirm('Bu hata kaydı silinsin mi?')) return;
        const e = errors.find(x => x.kimlik === kimlik);
        try {
            await mutate.remove(`/api/errors/${kimlik}`, null, {
                subject: 'Hata kaydı',
                detail: e?.hata_kodu || e?.baslik,
            });
            load();
        } catch { /* mutate toast attı */ }
    };

    const filtered = errors.filter(e => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            (e.hata_kodu || '').toLowerCase().includes(q) ||
            (e.baslik || '').toLowerCase().includes(q) ||
            (e.modul || '').toLowerCase().includes(q)
        );
    });

    return (
        <div className="w-full h-full flex flex-col bg-stone-50 font-sans">
            {/* Header */}
            <div className="px-6 py-3 border-b border-stone-200 bg-white flex items-center gap-3">
                <AlertTriangle size={16} className="text-[#A01B1B]" />
                <h1 className="text-[13px] font-bold text-stone-800">Hata Yönetimi</h1>
                <span className="text-[10px] text-stone-400 font-mono">{errors.length} kayıt</span>

                <div className="flex-1 max-w-md ml-4 relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Kod, başlık veya modül ara..."
                        className="w-full pl-8 pr-2.5 py-1.5 text-[12px] bg-stone-100 border border-transparent focus:bg-white focus:border-stone-300 rounded-md outline-none"
                    />
                </div>

                <button
                    onClick={() => setShowForm(s => !s)}
                    className={`text-[11px] font-semibold px-3 py-1.5 rounded inline-flex items-center gap-1.5 transition ${showForm ? 'bg-stone-200 text-stone-700' : 'bg-[#A01B1B] text-white hover:bg-[#871717]'}`}
                >
                    {showForm ? <><X size={12} /> Kapat</> : <><Plus size={12} /> Yeni Hata</>}
                </button>
                <button onClick={load} title="Yenile" className="text-stone-400 hover:text-[#A01B1B] p-1.5">
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {showForm && <ErrorForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}

                {filtered.length === 0 && !loading && (
                    <div className="text-center py-12 text-stone-400 text-[12px]">
                        {search ? 'Eşleşen kayıt yok.' : 'Henüz hata kaydı yok. "Yeni Hata" ile ekleyin.'}
                    </div>
                )}

                <div className="space-y-2">
                    {filtered.map(err => (
                        <div key={err.kimlik} className="bg-white border border-stone-200 rounded-lg overflow-hidden hover:shadow-sm transition">
                            <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
                                <span className="font-mono text-[11px] text-stone-700 bg-stone-100 px-2 py-0.5 rounded">{err.hata_kodu}</span>
                                <h3 className="text-[12.5px] font-semibold text-stone-800 flex-1 min-w-0 truncate">{err.baslik}</h3>
                                {err.modul && (
                                    <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                                        <Layers size={9} />
                                        {err.modul}
                                    </span>
                                )}
                                <SeverityPill level={err.severity} />
                                {err.adimlar?.length > 0 && (
                                    <span className="text-[10px] text-stone-500">{err.adimlar.length} adım</span>
                                )}
                                <button onClick={() => handleDelete(err.kimlik)} className="text-stone-300 hover:text-[#A01B1B] p-1" title="Sil">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                            {err.sebep && (
                                <div className="px-4 py-2 border-t border-stone-100 bg-stone-50/40">
                                    <p className="text-[11.5px] text-stone-600 leading-relaxed">{err.sebep}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ErrorManagementViewer;
