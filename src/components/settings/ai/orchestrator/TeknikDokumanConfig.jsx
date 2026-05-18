import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FileText, Loader2, RefreshCw, Check, AlertTriangle, RotateCcw, Save, ChevronDown, ChevronRight, Cpu, ArrowRight, FileCode2, Zap, Upload, FolderOpen, Layers, ScanLine, Eye, Table2, Download } from 'lucide-react';

const API = '/api/settings/doc-processing';

const SectionHeader = ({ title }) => (
    <div className="flex items-center gap-3 pt-6 pb-2">
        <span className="text-[9px] font-black tracking-[0.18em] text-stone-400 uppercase whitespace-nowrap">{title}</span>
        <div className="flex-1 h-px bg-stone-100" />
    </div>
);

function FieldGroup({ group, saving, onToggle, defaultOpen = false, savingPrefix = 'field_' }) {
    const [open, setOpen] = useState(defaultOpen);
    const enabledCount = group.fields.filter(f => f.enabled).length;

    return (
        <div className="bg-white border border-stone-100 rounded-xl overflow-hidden mb-2">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-stone-50 transition-colors text-left"
            >
                {open
                    ? <ChevronDown  size={12} className="text-stone-300 shrink-0" />
                    : <ChevronRight size={12} className="text-stone-300 shrink-0" />
                }
                <span className="text-[12px] font-bold text-stone-700 flex-1">{group.label}</span>
                <span className="text-[10px] text-stone-400 font-mono shrink-0">
                    {enabledCount}/{group.fields.length}
                </span>
            </button>

            {open && (
                <div className="divide-y divide-stone-50 border-t border-stone-100">
                    {group.fields.map(field => (
                        <div key={field.key} className="flex items-center gap-4 px-4 py-2.5">
                            <span className="flex-1 text-[11px] text-stone-600 font-medium">{field.label}</span>
                            <div className="shrink-0">
                                {saving === savingPrefix + field.key ? (
                                    <Loader2 size={12} className="text-[#378ADD] animate-spin" />
                                ) : (
                                    <button
                                        onClick={() => onToggle(field.key, field.enabled)}
                                        className={`relative w-[34px] h-[18px] rounded-full transition-colors focus:outline-none
                                            ${field.enabled ? 'bg-[#378ADD]' : 'bg-stone-200'}`}
                                    >
                                        <span className={`absolute top-[2px] w-[14px] h-[14px] bg-white rounded-full shadow-sm transition-all duration-150
                                            ${field.enabled ? 'left-[18px]' : 'left-[2px]'}`}
                                        />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── Excel Önizleme ──────────────────────────────────────────────────────── */

/**
 * Prompt textarea içindeki JSON şemasını parse eder.
 * "{ ... }" bloğunu bulur, nested group → field yapısını düz sütun listesine çevirir.
 * Her sütun: { group_key, group_label, key, label }
 * label = groups tablosundan eşleşen varsa oradan, yoksa key'in kendisi.
 */
function parsePromptColumns(promptVal, groups) {
    // Prompttaki ilk { ... } bloğunu bul
    const start = promptVal.indexOf('{');
    if (start === -1) return [];
    try {
        const schema = JSON.parse(promptVal.slice(start));
        const labelMap = {};
        groups.forEach(g => g.fields.forEach(f => { labelMap[f.key] = { label: f.label, group_label: g.label }; }));

        const cols = [];
        Object.entries(schema).forEach(([groupKey, groupVal]) => {
            if (groupKey === 'image_type') return;
            if (typeof groupVal === 'object' && groupVal !== null && !Array.isArray(groupVal)) {
                const gLabel = labelMap[Object.keys(groupVal)[0]]?.group_label
                    || groupKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                Object.keys(groupVal).forEach(fieldKey => {
                    cols.push({
                        group_key:   groupKey,
                        group_label: gLabel,
                        key:         fieldKey,
                        label:       labelMap[fieldKey]?.label || fieldKey,
                    });
                });
            }
        });
        return cols;
    } catch {
        return [];
    }
}

function ExcelInline({ groups, promptVal }) {
    const cols = parsePromptColumns(promptVal, groups);

    const downloadCsv = () => {
        const headers = cols.map(c => `"${c.label}"`).join(';');
        const blob    = new Blob(['﻿' + headers + '\n'], { type: 'text/csv;charset=utf-8;' });
        const url     = URL.createObjectURL(blob);
        const a       = document.createElement('a');
        a.href = url; a.download = 'teknik_cizim_sablon.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    if (cols.length === 0) return (
        <div className="flex items-center justify-center py-10 text-stone-400 text-[11px] text-center bg-stone-50 rounded-xl border border-stone-100">
            Prompt içinde geçerli JSON şeması bulunamadı.<br />
            <span className="text-stone-300 text-[10px]">Alan toggle'ları ile otomatik prompt oluşturun.</span>
        </div>
    );

    return (
        <div className="rounded-xl border border-stone-200 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3.5 py-2 bg-stone-50 border-b border-stone-100">
                <span className="text-[10px] text-stone-400 font-mono">{cols.length} sütun</span>
                <button
                    onClick={downloadCsv}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-colors"
                >
                    <Download size={10} /> CSV İndir
                </button>
            </div>

            {/* Tablo — yatay kaydırmalı */}
            <div className="overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-stone-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                <table className="border-collapse text-[10px] min-w-max w-full">
                    <thead>
                        {/* Grup satırı */}
                        <tr>
                            {cols.map((col, i) => {
                                if (i > 0 && col.group_key === cols[i - 1].group_key) return null;
                                const span = cols.filter(c => c.group_key === col.group_key).length;
                                return (
                                    <th key={'g_' + col.group_key} colSpan={span}
                                        className="px-2 py-1.5 text-center text-[8px] font-black uppercase tracking-wider text-white border-r border-[#162d52] whitespace-nowrap"
                                        style={{ background: '#1e3a5f' }}>
                                        {col.group_label}
                                    </th>
                                );
                            })}
                        </tr>
                        {/* Alan adı satırı */}
                        <tr>
                            {cols.map((col, i) => (
                                <th key={'h_' + col.key}
                                    className="px-2 py-2 text-left font-bold text-white whitespace-nowrap border-r border-[#2d4e7a]"
                                    style={{ background: i % 2 === 0 ? '#2563a8' : '#2d6bbf', minWidth: 110 }}>
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 6 }, (_, n) => (
                            <tr key={'r_' + n}>
                                {cols.map((col, i) => (
                                    <td key={'c_' + col.key}
                                        className="border-b border-r border-stone-100"
                                        style={{
                                            background: n % 2 === 0
                                                ? (i % 2 === 0 ? '#f0f7ff' : '#e8f2ff')
                                                : (i % 2 === 0 ? '#fafafa' : '#f5f5f5'),
                                            height: 24, minWidth: 110,
                                        }}
                                    />
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function TeknikDokumanConfig({ embedded = false }) {
    const [data, setData]           = useState(null);
    const [loading, setLoading]     = useState(true);
    const [saving, setSaving]       = useState(null);
    const [promptVal, setPromptVal] = useState('');
    const [promptDirty, setPromptDirty] = useState(false);
    const [dwgPromptVal, setDwgPromptVal]     = useState('');
    const [dwgPromptDirty, setDwgPromptDirty] = useState(false);
    const [pipeline, setPipeline]   = useState({ output_folder: '', watch_folder: '', parallel_workers: 2, pdf_dpi: 200 });
    const [pipelineDirty, setPipelineDirty] = useState(false);
    const [showExcel, setShowExcel] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res  = await fetch(API);
            const json = await res.json();
            setData(json);
            setPromptVal(json.prompt || '');
            setPromptDirty(false);
            setDwgPromptVal(json.dwg_prompt || '');
            setDwgPromptDirty(false);
            setPipeline(json.pipeline || { output_folder: '', watch_folder: '', parallel_workers: 2, pdf_dpi: 200 });
            setPipelineDirty(false);
        } catch { }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const post = async (body) => {
        await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    };

    /* ── Model seçimi ─────────────────────────────── */
    const selectModel = async (id) => {
        if (saving) return;
        setData(prev => ({ ...prev, selected_model_id: id || null }));
        setSaving('model');
        try { await post({ model_id: id || null }); }
        catch { }
        finally { setSaving(null); }
    };

    /* ── Field toggle → DB kaydet + promptu güncelle ── */
    const toggleField = async (key, current) => {
        if (saving) return;
        const next = !current;

        // UI'ı anlık güncelle
        const updatedGroups = data.output_groups.map(g => ({
            ...g,
            fields: g.fields.map(f => f.key === key ? { ...f, enabled: next } : f),
        }));
        setData(prev => ({ ...prev, output_groups: updatedGroups }));
        setSaving('field_' + key);

        try {
            // Tüm field key → enabled map'i hesapla
            const fieldMap = {};
            updatedGroups.forEach(g => g.fields.forEach(f => { fieldMap[f.key] = f.enabled; }));
            await post({ output_fields: fieldMap });

            // Custom prompt yoksa yeni efektif promptu çek
            if (!data.is_custom_prompt) {
                const res  = await fetch(API);
                const json = await res.json();
                setPromptVal(json.prompt || '');
            }
        } catch { }
        finally { setSaving(null); }
    };

    /* ── Prompt düzenleme ─────────────────────────── */
    const handlePromptChange = (e) => {
        setPromptVal(e.target.value);
        setPromptDirty(true);
    };

    const savePrompt = async () => {
        setSaving('prompt');
        try {
            await post({ prompt: promptVal });
            setData(prev => ({ ...prev, is_custom_prompt: true }));
            setPromptDirty(false);
        } catch { }
        finally { setSaving(null); }
    };

    const resetPrompt = async () => {
        setSaving('prompt_reset');
        try {
            await post({ prompt: '' });
            const res  = await fetch(API);
            const json = await res.json();
            setData(json);
            setPromptVal(json.prompt || '');
            setPromptDirty(false);
        } catch { }
        finally { setSaving(null); }
    };

    /* ── DWG Prompt ───────────────────────────────── */
    const saveDwgPrompt = async () => {
        setSaving('dwg_prompt');
        try {
            await post({ dwg_prompt: dwgPromptVal });
            setData(prev => ({ ...prev, dwg_prompt: dwgPromptVal, dwg_is_custom_prompt: true }));
            setDwgPromptDirty(false);
        } catch { }
        finally { setSaving(null); }
    };

    const resetDwgPrompt = async () => {
        setSaving('dwg_prompt_reset');
        try {
            await post({ dwg_prompt: '' });
            setDwgPromptVal('');
            setData(prev => ({ ...prev, dwg_prompt: '', dwg_is_custom_prompt: false }));
            setDwgPromptDirty(false);
        } catch { }
        finally { setSaving(null); }
    };

    /* ── Pipeline / dosya yolu ───────────────────── */
    const setPipelineField = (key, value) => {
        setPipeline(prev => ({ ...prev, [key]: value }));
        setPipelineDirty(true);
    };

    const savePipeline = async () => {
        setSaving('pipeline');
        try {
            await post({ pipeline });
            setPipelineDirty(false);
        } catch { }
        finally { setSaving(null); }
    };

    /* ── Flag toggle ──────────────────────────────── */
    const toggleFlag = async (key, current) => {
        if (saving) return;
        const updated = data.flags.map(f => f.key === key ? { ...f, value: !current } : f);
        setData(prev => ({ ...prev, flags: updated }));
        setSaving('flag_' + key);
        try { await post({ flags: { [key]: !current } }); }
        catch { setData(prev => ({ ...prev, flags: data.flags })); }
        finally { setSaving(null); }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="text-[#378ADD] animate-spin" />
        </div>
    );

    return (
        <>
        <div>
            {/* Başlık */}
            {!embedded && (
            <div className="flex items-start justify-between gap-4 mb-1">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0">
                        <FileText size={18} className="text-stone-500" />
                    </div>
                    <div>
                        <h2 className="text-[18px] font-black text-stone-800 tracking-tight leading-tight">Teknik Döküman İşleme</h2>
                        <p className="text-[11px] text-stone-400 mt-0.5">Vision AI model, çıktı alanları ve prompt yapılandırması</p>
                    </div>
                </div>
                <button onClick={load} disabled={loading} className="p-2 rounded-lg hover:bg-stone-100 transition-colors text-stone-400 hover:text-stone-600 shrink-0">
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>
            )}

            {/* ── 1. Vision Modeli ───────────────────────────────── */}
            {!embedded && (<>
            <SectionHeader title="Vision Modeli" />
            <p className="text-[11px] text-stone-400 mb-2 leading-relaxed">
                Görsel ve döküman analizinde kullanılacak modeli seçin.
            </p>
            <div className="relative flex items-center gap-2">
                <select
                    value={data?.selected_model_id || ''}
                    onChange={e => selectModel(e.target.value || null)}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-stone-700 focus:outline-none focus:border-[#378ADD]/50 focus:ring-1 focus:ring-[#378ADD]/20 appearance-none cursor-pointer"
                >
                    <option value="">— Model seçin —</option>
                    {(data?.models || []).map(m => (
                        <option key={m.id} value={m.id}>{m.name}{m.model_id ? ` (${m.model_id})` : ''}</option>
                    ))}
                </select>
                {saving === 'model'
                    ? <Loader2 size={14} className="text-[#378ADD] animate-spin shrink-0" />
                    : data?.selected_model_id
                        ? <Check size={14} className="text-emerald-500 shrink-0" />
                        : null
                }
            </div>
            {!data?.models?.length && (
                <p className="text-[10px] text-amber-500 mt-1.5 flex items-center gap-1">
                    <AlertTriangle size={10} /> API Anahtarları sekmesinden model ekleyin.
                </p>
            )}
            </>)}

            {/* ── 2. Çıktı Alanları ──────────────────────────────── */}
            <SectionHeader title="Çıktı Alanları" />
            <p className="text-[11px] text-stone-400 mb-3 leading-relaxed">
                AI'ın çizmeden çıkaracağı alanları seçin. Değişiklikler promptu otomatik günceller.
            </p>
            {(data?.output_groups || []).map(group => (
                <FieldGroup
                    key={group.group_key}
                    group={group}
                    saving={saving}
                    onToggle={toggleField}
                />
            ))}

            {/* ── 3. Analiz Promptu ──────────────────────────────── */}
            <div className="flex items-center gap-3 pt-6 pb-2">
                <span className="text-[9px] font-black tracking-[0.18em] text-stone-400 uppercase whitespace-nowrap">Analiz Promptu</span>
                <div className="flex-1 h-px bg-stone-100" />
                {/* Prompt / Excel toggle */}
                <div className="flex items-center bg-stone-100 rounded-lg p-0.5 gap-0.5 shrink-0">
                    <button
                        onClick={() => setShowExcel(false)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${!showExcel ? 'bg-white text-stone-700 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        <FileText size={10} /> Prompt
                    </button>
                    <button
                        onClick={() => setShowExcel(true)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${showExcel ? 'bg-white text-emerald-700 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
                    >
                        <Table2 size={10} /> Excel Şablonu
                    </button>
                </div>
            </div>

            {!showExcel ? (<>
                <p className="text-[11px] text-stone-400 mb-3 leading-relaxed">
                    {data?.is_custom_prompt
                        ? <span>Özel prompt aktif — alan toggle'ları promptu etkilemez.</span>
                        : <span>Alan seçimleri bu promptu otomatik oluşturur. Manuel düzenlemek için kaydedin.</span>
                    }
                </p>
                <textarea
                    value={promptVal}
                    onChange={handlePromptChange}
                    rows={14}
                    className="w-full text-[11px] font-mono text-stone-700 bg-white border border-stone-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-[#378ADD]/50 focus:ring-1 focus:ring-[#378ADD]/20 leading-relaxed [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-stone-200"
                    spellCheck={false}
                />
                <div className="flex items-center justify-between mt-2">
                    <button
                        onClick={resetPrompt}
                        disabled={!!saving || !data?.is_custom_prompt}
                        className="flex items-center gap-1.5 text-[11px] text-stone-400 hover:text-stone-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        {saving === 'prompt_reset' ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                        Otomatik moduna dön
                    </button>
                    <button
                        onClick={savePrompt}
                        disabled={!promptDirty || saving === 'prompt'}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-[#378ADD] text-white text-[11px] font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2a6fc4] transition-colors"
                    >
                        {saving === 'prompt' ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                        Özel Prompt Kaydet
                    </button>
                </div>
            </>) : (
                <ExcelInline
                    groups={data?.output_groups || []}
                    promptVal={promptVal}
                />
            )}

            {/* ── 4. İşleme Davranışları ─────────────────────────── */}
            {!embedded && (
            <><SectionHeader title="İşleme Davranışları" />
            <div className="bg-white border border-stone-100 rounded-xl divide-y divide-stone-100">
                {(data?.flags || []).map(flag => (
                    <div key={flag.key} className="flex items-center gap-4 px-4 py-3">
                        <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold text-stone-700 leading-snug">{flag.label}</p>
                            <p className="text-[10px] text-stone-400 mt-0.5 leading-relaxed">{flag.desc}</p>
                        </div>
                        <div className="shrink-0">
                            {saving === 'flag_' + flag.key ? (
                                <Loader2 size={13} className="text-[#378ADD] animate-spin" />
                            ) : (
                                <button
                                    onClick={() => toggleFlag(flag.key, flag.value)}
                                    className={`relative w-[38px] h-[20px] rounded-full transition-colors focus:outline-none
                                        ${flag.value ? 'bg-[#378ADD]' : 'bg-stone-200'}`}
                                >
                                    <span className={`absolute top-[2px] w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-150
                                        ${flag.value ? 'left-[20px]' : 'left-[2px]'}`}
                                    />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            </>)}

            {/* ── 5. Dosya Yolu Tanımla / Döküman İşleme ─────────── */}
            <div className="flex items-center gap-3 pt-5 pb-1.5">
                <span className="text-[9px] font-black tracking-[0.18em] text-stone-400 uppercase whitespace-nowrap">Dosya Yolu Tanımla / Döküman İşleme</span>
                <div className="flex-1 h-px bg-stone-100" />
            </div>

            {/* Çıktı klasörü */}
            <div className="flex items-center gap-4 py-3 border-b border-stone-100">
                <div className="flex-shrink-0" style={{ width: '42%' }}>
                    <div className="text-[12px] font-semibold text-stone-700 leading-snug">PDF / Analiz Çıktı Klasörü</div>
                    <div className="text-[10px] text-stone-400 mt-0.5 leading-snug">
                        Analiz sonucu <span className="font-mono">&lt;ad&gt;_analiz.json</span> olarak kaydedilir
                        {pipeline.output_folder && <span className="ml-1.5 text-emerald-500 font-bold">● bağlı</span>}
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <input
                        type="text"
                        value={pipeline.output_folder}
                        onChange={e => setPipelineField('output_folder', e.target.value)}
                        placeholder="C:\Belgeler\Analizler veya /data/output"
                        className="w-full bg-white border border-stone-200 text-stone-700 text-[12px] font-mono rounded-lg px-3 py-2 outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20 transition-all placeholder:text-stone-300"
                        spellCheck={false}
                    />
                </div>
            </div>

            {/* İzleme klasörü */}
            <div className="flex items-center gap-4 py-3 border-b border-stone-100">
                <div className="flex-shrink-0" style={{ width: '42%' }}>
                    <div className="text-[12px] font-semibold text-stone-700 leading-snug">İzlenen Giriş Klasörü</div>
                    <div className="text-[10px] text-stone-400 mt-0.5 leading-snug">Pipeline'ın okuyacağı kaynak klasör</div>
                </div>
                <div className="flex-1 min-w-0">
                    <input
                        type="text"
                        value={pipeline.watch_folder}
                        onChange={e => setPipelineField('watch_folder', e.target.value)}
                        placeholder="C:\Belgeler\Gelen veya /data/input"
                        className="w-full bg-white border border-stone-200 text-stone-700 text-[12px] font-mono rounded-lg px-3 py-2 outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20 transition-all placeholder:text-stone-300"
                        spellCheck={false}
                    />
                </div>
            </div>

            {/* Paralel işleme */}
            <div className="flex items-center gap-4 py-3 border-b border-stone-100">
                <div className="flex-shrink-0" style={{ width: '42%' }}>
                    <div className="text-[12px] font-semibold text-stone-700 leading-snug">Paralel Dosya Sayısı</div>
                    <div className="text-[10px] text-stone-400 mt-0.5 leading-snug">Aynı anda işlenecek dosya adedi</div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                        <span className="text-[13px] font-black text-[#378ADD] font-mono tabular-nums" style={{ minWidth: 24, textAlign: 'right' }}>
                            {pipeline.parallel_workers}
                        </span>
                        <div className="flex-1">
                            <input
                                type="range" min={1} max={8} step={1}
                                value={pipeline.parallel_workers}
                                onChange={e => setPipelineField('parallel_workers', parseInt(e.target.value))}
                                className="w-full h-[3px] bg-stone-200 rounded-full appearance-none cursor-pointer accent-[#D44B4B]"
                            />
                            <div className="flex justify-between mt-0.5">
                                <span className="text-[9px] text-stone-300 font-mono">1</span>
                                <span className="text-[9px] text-stone-300 font-mono">8</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PDF DPI */}
            <div className="flex items-center gap-4 py-3 border-b border-stone-100">
                <div className="flex-shrink-0" style={{ width: '42%' }}>
                    <div className="text-[12px] font-semibold text-stone-700 leading-snug">PDF Render Kalitesi</div>
                    <div className="text-[10px] text-stone-400 mt-0.5 leading-snug">Sayfa görüntüye çevrilirken DPI</div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex gap-1.5">
                        {[72, 96, 150, 200, 300].map(dpi => (
                            <button
                                key={dpi}
                                type="button"
                                onClick={() => setPipelineField('pdf_dpi', dpi)}
                                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all
                                    ${pipeline.pdf_dpi === dpi
                                        ? 'bg-[#378ADD] text-white border-[#378ADD]'
                                        : 'bg-white text-stone-400 border-stone-200 hover:border-[#378ADD]/40 hover:text-[#378ADD]'
                                    }`}
                            >
                                {dpi}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-3 pb-1">
                <button
                    onClick={savePipeline}
                    disabled={!pipelineDirty || saving === 'pipeline'}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-[#378ADD] text-white text-[11px] font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2a6fc4] transition-colors"
                >
                    {saving === 'pipeline'
                        ? <Loader2 size={11} className="animate-spin" />
                        : <Save size={11} />
                    }
                    Kaydet
                </button>
            </div>

            {/* ── 6. DWG / DXF Dosya İşleme ─────────────────────── */}
            {!embedded && (<>
            <div className="mt-8 mb-2 border-t-2 border-dashed border-stone-200 pt-6">
                <div className="flex items-center gap-2 mb-1">
                    <FileCode2 size={14} className="text-stone-400 shrink-0" />
                    <span className="text-[9px] font-black tracking-[0.18em] text-stone-400 uppercase">DWG / DXF Dosya İşleme</span>
                </div>
                <p className="text-[11px] text-stone-400 mb-4 leading-relaxed">
                    DWG ve DXF dosyaları yukarıda seçilen Vision modeline doğrudan gönderilir — dönüştürme adımı yoktur. Aynı analiz promptu ve çıktı alanları kullanılır.
                </p>

                {/* Pipeline: DWG */}
                <div className="mb-3">
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">DWG (binary)</span>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5">
                            <Upload size={10} className="text-stone-400" />
                            <span className="text-[10px] text-stone-600 font-medium">Files API yükle</span>
                        </div>
                        <ArrowRight size={10} className="text-stone-300 shrink-0" />
                        <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5">
                            <Cpu size={10} className="text-stone-400" />
                            <span className="text-[10px] text-stone-600 font-medium">Vision modeli</span>
                        </div>
                        <ArrowRight size={10} className="text-stone-300 shrink-0" />
                        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                            <Zap size={10} className="text-emerald-500" />
                            <span className="text-[10px] text-emerald-700 font-medium">JSON çıktı</span>
                        </div>
                    </div>
                </div>

                {/* Pipeline: DXF */}
                <div className="mb-4">
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">DXF (metin tabanlı)</span>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5">
                            <FileCode2 size={10} className="text-stone-400" />
                            <span className="text-[10px] text-stone-600 font-medium">İçerik okunur</span>
                        </div>
                        <ArrowRight size={10} className="text-stone-300 shrink-0" />
                        <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5">
                            <Cpu size={10} className="text-stone-400" />
                            <span className="text-[10px] text-stone-600 font-medium">LLM'e metin olarak gönder</span>
                        </div>
                        <ArrowRight size={10} className="text-stone-300 shrink-0" />
                        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                            <Zap size={10} className="text-emerald-500" />
                            <span className="text-[10px] text-emerald-700 font-medium">JSON çıktı</span>
                        </div>
                    </div>
                </div>

                {/* Fallback note */}
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 mb-4">
                    <AlertTriangle size={11} className="text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-amber-700 leading-relaxed">
                        API analizi başarısız olursa ezdxf ile metin entity'leri çıkarılır ve regex ile yapısal veri aranır (fallback).
                    </p>
                </div>

                {/* DWG Prompt */}
                <p className="text-[11px] text-stone-500 font-semibold mb-1">DWG / DXF Analiz Promptu</p>
                <p className="text-[11px] text-stone-400 mb-2 leading-relaxed">
                    {data?.dwg_is_custom_prompt
                        ? <span>Özel DWG promptu aktif — genel Vision promptundan bağımsız çalışır.</span>
                        : <span>Boş bırakılırsa yukarıdaki genel Analiz Promptu kullanılır.</span>
                    }
                </p>
                <textarea
                    value={dwgPromptVal}
                    onChange={e => { setDwgPromptVal(e.target.value); setDwgPromptDirty(true); }}
                    rows={10}
                    placeholder="DWG/DXF dosyaları için özel prompt… (boş = genel prompt kullanılır)"
                    className="w-full text-[11px] font-mono text-stone-700 bg-white border border-stone-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-[#378ADD]/50 focus:ring-1 focus:ring-[#378ADD]/20 leading-relaxed placeholder:text-stone-300 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-stone-200"
                    spellCheck={false}
                />
                <div className="flex items-center justify-between mt-2">
                    <button
                        onClick={resetDwgPrompt}
                        disabled={!!saving || !data?.dwg_is_custom_prompt}
                        className="flex items-center gap-1.5 text-[11px] text-stone-400 hover:text-stone-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        {saving === 'dwg_prompt_reset'
                            ? <Loader2 size={11} className="animate-spin" />
                            : <RotateCcw size={11} />
                        }
                        Genel prompta dön
                    </button>
                    <button
                        onClick={saveDwgPrompt}
                        disabled={!dwgPromptDirty || saving === 'dwg_prompt'}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-[#378ADD] text-white text-[11px] font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2a6fc4] transition-colors"
                    >
                        {saving === 'dwg_prompt'
                            ? <Loader2 size={11} className="animate-spin" />
                            : <Save size={11} />
                        }
                        DWG Promptunu Kaydet
                    </button>
                </div>
            </div>
            </>)}

            <div className="h-8" />
        </div>

        </>
    );
}
