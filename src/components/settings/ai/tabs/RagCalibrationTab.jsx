import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Save, RotateCcw, Info, Loader2, GitBranch, Bot } from 'lucide-react';
import { SETTINGS_BASE, fetchWithTimeout } from '../utils';

const TYPE_META = {
    int: { step: 1, format: v => Math.round(v) },
    float: { step: 0.05, format: v => parseFloat(v).toFixed(2) },
};

export const RagCalibrationTab = React.memo(() => {
    const [settings, setSettings] = useState([]);
    const [original, setOriginal] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Boolean özellik bayrakları (LangGraph pipeline vb.)
    const [flags, setFlags] = useState([]);
    const [flagSaving, setFlagSaving] = useState(null);

    // Graph node rolleri ↔ atanmış AIAgent eşleştirmesi
    const [roles, setRoles] = useState([]);
    const [agents, setAgents] = useState([]);
    const [roleSaving, setRoleSaving] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [ragRes, flagRes, rolesRes, agentsRes] = await Promise.all([
                fetchWithTimeout(`${SETTINGS_BASE}/rag`),
                fetchWithTimeout(`${SETTINGS_BASE}/feature-flags`).catch(() => null),
                fetchWithTimeout(`${SETTINGS_BASE}/agent-assignments`).catch(() => null),
                fetchWithTimeout('/api/orchestrator/agents').catch(() => null),
            ]);
            const data = await ragRes.json();
            setSettings(data.settings || []);
            const orig = {};
            (data.settings || []).forEach(s => { orig[s.key] = s.value; });
            setOriginal(orig);

            if (flagRes && flagRes.ok) {
                const flagData = await flagRes.json();
                setFlags(flagData.flags || []);
            }
            if (rolesRes && rolesRes.ok) {
                const roleData = await rolesRes.json();
                setRoles(roleData.roles || []);
            }
            if (agentsRes && agentsRes.ok) {
                const ag = await agentsRes.json();
                setAgents(Array.isArray(ag) ? ag : (ag.agents || []));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    const updateRole = async (roleKey, agentId) => {
        setRoleSaving(roleKey);
        // İyimser güncelle
        setRoles(prev => prev.map(r => r.key === roleKey ? { ...r, assigned_id: agentId || null, effective_id: agentId || r.effective_id } : r));
        try {
            // Mevcut tüm atamaları topla, sonra bunu güncelle
            const merged = {};
            roles.forEach(r => { if (r.assigned_id) merged[r.key] = r.assigned_id; });
            if (agentId) merged[roleKey] = agentId;
            else delete merged[roleKey];
            await fetchWithTimeout(`${SETTINGS_BASE}/agent-assignments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignments: merged }),
            });
            // Tekrar yükle ki effective_id güncellensin
            const r = await fetchWithTimeout(`${SETTINGS_BASE}/agent-assignments`);
            if (r.ok) {
                const d = await r.json();
                setRoles(d.roles || []);
            }
        } catch (e) {
            console.error('Atama hatası:', e);
        } finally {
            setRoleSaving(null);
        }
    };

    const toggleFlag = async (key, nextValue) => {
        setFlagSaving(key);
        // İyimser güncelle
        setFlags(prev => prev.map(f => f.key === key ? { ...f, value: nextValue } : f));
        try {
            await fetchWithTimeout(`${SETTINGS_BASE}/feature-flags`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ flags: { [key]: nextValue } }),
            });
        } catch (e) {
            console.error('feature-flag kaydı başarısız', e);
            // Geri al
            setFlags(prev => prev.map(f => f.key === key ? { ...f, value: !nextValue } : f));
        } finally {
            setFlagSaving(null);
        }
    };

    useEffect(() => { load(); }, [load]);

    const update = (key, val) => {
        setSettings(prev => prev.map(s => s.key === key ? { ...s, value: val } : s));
        setSaved(false);
    };

    const reset = (s) => update(s.key, original[s.key] ?? s.default);

    const save = async () => {
        setSaving(true);
        try {
            const payload = {};
            settings.forEach(s => { payload[s.key] = s.type === 'int' ? Math.round(s.value) : parseFloat(s.value); });
            await fetchWithTimeout(`${SETTINGS_BASE}/rag`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings: payload }),
            });
            const orig = {};
            settings.forEach(s => { orig[s.key] = s.value; });
            setOriginal(orig);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = settings.some(s => s.value !== original[s.key]);

    return (
        <div className="flex flex-col bg-white rounded-b-xl overflow-hidden">
            {/* Aksiyon şeridi */}
            <div className="px-4 py-2.5 border-b border-stone-100 flex items-center justify-between gap-2 bg-stone-50">
                <p className="text-[10px] font-semibold text-stone-400 leading-relaxed">
                    Arama ve bağlam parametreleri
                </p>
                <div className="flex items-center gap-1">
                    <button
                        onClick={load}
                        title="Yeniden yükle"
                        className="p-1.5 rounded-md text-stone-400 hover:text-stone-600 hover:bg-white transition-colors"
                    >
                        <RefreshCw size={12} />
                    </button>
                    <button
                        onClick={save}
                        disabled={!hasChanges || saving}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${saved ? 'bg-[#EAF3DE] text-[#3B6D11]' :
                            hasChanges ? 'bg-[#378ADD] text-white hover:bg-[#2A68AB] shadow-sm' :
                                'bg-stone-100 text-stone-400 cursor-not-allowed'
                            }`}
                    >
                        <Save size={10} strokeWidth={2.5} />
                        {saved ? 'Kaydedildi' : saving ? 'Kaydediliyor' : 'Kaydet'}
                    </button>
                </div>
            </div>

            {/* Gövde */}
            <div className="overflow-y-auto p-3 space-y-2 max-h-[60vh] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-stone-400">
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Yükleniyor...</span>
                    </div>
                ) : (
                    <>
                        {/* Graph Node Atamaları (LangGraph rolü → AIAgent) */}
                        {roles.length > 0 && (
                            <div className="space-y-1.5 pb-1">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 px-1">
                                    Graph Node Ajan Atamaları
                                </p>
                                <div className="bg-stone-50 rounded-lg border border-stone-200 p-3 space-y-2">
                                    {roles.map(role => {
                                        const busy = roleSaving === role.key;
                                        const overridden = !!role.assigned_id;
                                        return (
                                            <div key={role.key} className="flex items-center gap-2">
                                                <Bot size={11} strokeWidth={2.5} className={`shrink-0 ${overridden ? 'text-violet-600' : 'text-stone-300'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[10px] font-bold text-stone-700 truncate">{role.label}</div>
                                                    {!overridden && (
                                                        <div className="text-[8px] text-stone-400">
                                                            varsayılan: {role.default_kind} kind'ı
                                                        </div>
                                                    )}
                                                </div>
                                                <select
                                                    disabled={busy}
                                                    value={role.assigned_id || ''}
                                                    onChange={e => updateRole(role.key, e.target.value || null)}
                                                    className="text-[10px] font-medium bg-white border border-stone-200 rounded px-2 py-1 max-w-[200px] hover:border-violet-300 focus:border-violet-500 focus:outline-none disabled:opacity-60"
                                                >
                                                    <option value="">— varsayılan —</option>
                                                    {agents.filter(a => a.active !== false).map(a => (
                                                        <option key={a.id} value={a.id}>
                                                            {a.name || a.id}
                                                        </option>
                                                    ))}
                                                </select>
                                                {busy && <Loader2 size={10} className="animate-spin text-violet-400 shrink-0" />}
                                            </div>
                                        );
                                    })}
                                    <p className="text-[9px] text-stone-400 leading-snug pt-1.5 border-t border-stone-200">
                                        Boş bırakılan rol, default kind'ına (chatbot/worker/router) düşer. Atamayı değiştirmek o rolün LLM çağrısının başka bir ajanın prompt+model+temp ayarıyla yapılmasını sağlar.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Özellik Bayrakları (boolean SistemAyari) */}
                        {flags.length > 0 && (
                            <div className="space-y-1.5 pb-1">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 px-1">
                                    Özellik Bayrakları
                                </p>
                                {flags.map(flag => {
                                    const busy = flagSaving === flag.key;
                                    const isOn = !!flag.value;
                                    return (
                                        <div key={flag.key} className="bg-stone-50 rounded-lg border border-stone-200 p-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-2 flex-1 min-w-0">
                                                    <GitBranch size={13} className={`mt-0.5 shrink-0 ${isOn ? 'text-[#7c3aed]' : 'text-stone-300'}`} strokeWidth={2.5} />
                                                    <div className="min-w-0">
                                                        <div className="text-[11px] font-black text-stone-700">{flag.label}</div>
                                                        <p className="text-[9px] text-stone-400 font-medium mt-0.5 leading-snug">{flag.desc}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    role="switch"
                                                    aria-checked={isOn}
                                                    disabled={busy}
                                                    onClick={() => toggleFlag(flag.key, !isOn)}
                                                    className={`relative w-9 h-5 rounded-full shrink-0 transition-colors ${isOn ? 'bg-[#7c3aed]' : 'bg-stone-300'} ${busy ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
                                                    title={isOn ? 'Kapat' : 'Aç'}
                                                >
                                                    <span className={`absolute top-0.5 ${isOn ? 'left-[18px]' : 'left-0.5'} w-4 h-4 rounded-full bg-white shadow-sm transition-all`} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {settings.map(s => {
                            const meta = TYPE_META[s.type] || TYPE_META.int;
                            const isDirty = s.value !== original[s.key];
                            return (
                                <div key={s.key} className={`bg-stone-50 rounded-lg border p-3 transition-all ${isDirty ? 'border-[#378ADD]/40 ring-1 ring-[#378ADD]/20' : 'border-stone-200'}`}>
                                    <div className="flex items-start justify-between mb-2.5 gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[11px] font-black text-stone-700">{s.label}</span>
                                                {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-[#378ADD] shrink-0" />}
                                            </div>
                                            <p className="text-[9px] text-stone-400 font-medium mt-0.5 leading-snug">{s.desc}</p>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <div className="min-w-[44px] text-center px-2 py-1 bg-white border border-stone-200 rounded-md">
                                                <span className="text-[12px] font-black text-[#378ADD] font-mono">{meta.format(s.value)}</span>
                                            </div>
                                            {isDirty && (
                                                <button onClick={() => reset(s)} title="Sıfırla" className="p-1 rounded-md text-stone-400 hover:text-stone-600 hover:bg-white transition-colors">
                                                    <RotateCcw size={11} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <input
                                        type="range"
                                        min={s.min}
                                        max={s.max}
                                        step={meta.step}
                                        value={s.value}
                                        onChange={e => update(s.key, s.type === 'int' ? parseInt(e.target.value) : parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-stone-200 rounded-full appearance-none cursor-pointer accent-[#378ADD]"
                                    />
                                    <div className="flex justify-between text-[8px] font-bold text-stone-300 mt-1">
                                        <span>{s.min}</span>
                                        <span>Varsayılan: {s.default}</span>
                                        <span>{s.max}</span>
                                    </div>
                                </div>
                            );
                        })}

                        <div className="flex items-start gap-2 p-3 bg-[#378ADD]/5 border border-[#378ADD]/20 rounded-lg">
                            <Info size={11} className="text-[#378ADD] shrink-0 mt-0.5" strokeWidth={2.5} />
                            <p className="text-[10px] text-stone-500 leading-relaxed">
                                Değişiklikler anında aktif olur. Distance eşiğini düşürmek daha kesin sonuçlar getirir; Top-K'yı artırmak daha fazla bağlam sağlar ancak LLM maliyetini yükseltir.
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
});
