import React, { useState, useEffect, useCallback } from 'react';
import { FileCode, RefreshCw, Save, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { SETTINGS_BASE, fetchWithTimeout } from '../utils';

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
            // İlkini açık başlat
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

    if (loading) return (
        <div className="w-full h-full flex items-center justify-center gap-3 text-stone-400">
            <RefreshCw size={18} className="animate-spin" />
            <span className="text-[11px] font-bold uppercase tracking-widest">Yükleniyor...</span>
        </div>
    );

    return (
        <div className="w-full h-full overflow-y-auto bg-stone-50 minimal-scroll">
            <div className="max-w-3xl mx-auto p-6 space-y-4">

                {/* Başlık */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-[#854F0B]/10 rounded-lg">
                            <FileCode size={16} className="text-[#854F0B]" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-[13px] font-black text-stone-700 tracking-tight">Prompt Şablonları</h3>
                            <p className="text-[10px] text-stone-400 font-medium mt-0.5">Sistem promptlarını özelleştirin</p>
                        </div>
                    </div>
                    <button
                        onClick={save}
                        disabled={!hasChanges || saving}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${saved ? 'bg-[#EAF3DE] text-[#3B6D11]' :
                                hasChanges ? 'bg-[#854F0B] text-white hover:bg-[#6B3F09] shadow-sm' :
                                    'bg-stone-100 text-stone-400 cursor-not-allowed'
                            }`}
                    >
                        <Save size={13} strokeWidth={2.5} />
                        {saved ? 'Kaydedildi' : saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>

                {/* Prompt Kartları */}
                {prompts.map(p => {
                    const isDirty = p.value !== original[p.key];
                    const isOpen = expanded[p.key];
                    const lines = (p.value || '').split('\n').length;

                    return (
                        <div key={p.key} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${isDirty ? 'border-[#854F0B]/40 ring-1 ring-[#854F0B]/20' : 'border-stone-200'}`}>
                            {/* Kart başlığı */}
                            <div
                                className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-stone-50 transition-colors"
                                onClick={() => setExpanded(prev => ({ ...prev, [p.key]: !prev[p.key] }))}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${isDirty ? 'bg-[#854F0B]' : 'bg-stone-300'}`} />
                                    <div className="min-w-0">
                                        <span className="text-[12px] font-black text-stone-700">{p.label}</span>
                                        <p className="text-[10px] text-stone-400 font-medium truncate">{p.desc}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-4">
                                    <span className="text-[10px] text-stone-400 font-mono">{lines} satır</span>
                                    {isDirty && (
                                        <button
                                            onClick={e => { e.stopPropagation(); resetOne(p.key); }}
                                            disabled={resetting[p.key]}
                                            title="Varsayılana sıfırla"
                                            className="p-1.5 rounded-lg text-stone-400 hover:text-[#854F0B] hover:bg-stone-100 transition-colors"
                                        >
                                            <RotateCcw size={13} className={resetting[p.key] ? 'animate-spin' : ''} />
                                        </button>
                                    )}
                                    {isOpen ? <ChevronUp size={14} className="text-stone-400" /> : <ChevronDown size={14} className="text-stone-400" />}
                                </div>
                            </div>

                            {/* Editör */}
                            {isOpen && (
                                <div className="px-5 pb-5 border-t border-stone-100">
                                    <textarea
                                        value={p.value}
                                        onChange={e => update(p.key, e.target.value)}
                                        spellCheck={false}
                                        className="w-full mt-4 bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-[11px] font-mono text-stone-700 leading-relaxed focus:outline-none focus:border-[#854F0B] focus:ring-1 focus:ring-[#854F0B]/30 focus:bg-white transition-all resize-none"
                                        style={{ minHeight: `${Math.max(120, Math.min(lines * 22, 400))}px` }}
                                    />
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-[9px] font-mono text-stone-300">{p.key}</span>
                                        <span className="text-[10px] text-stone-400">{p.value.length} karakter</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                <div className="flex items-start gap-3 p-4 bg-[#FAEEDA] border border-[#EAD5AB] rounded-xl">
                    <span className="text-[11px] text-[#854F0B] leading-relaxed">
                        <strong>İpucu:</strong> Değişiklikler kaydedildikten sonra tüm yeni konuşmalarda aktif olur. <code className="font-mono bg-[#EAD5AB]/50 px-1 rounded">{'{chat_memory}'}</code> ve <code className="font-mono bg-[#EAD5AB]/50 px-1 rounded">{'{file_name}'}</code> yer tutucuları otomatik doldurulur.
                    </span>
                </div>
            </div>
        </div>
    );
});
