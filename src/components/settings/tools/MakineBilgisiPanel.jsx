import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Wrench, Loader2, RefreshCw, Save, RotateCcw, Check, ChevronDown, ChevronRight, TrendingUp, Clock, Settings2, AlertTriangle, Upload, FileText, X, Cpu, CheckCircle2 } from 'lucide-react';

const API = '/api/settings/doc-processing';

const Section = ({ title }) => (
    <div className="flex items-center gap-3 pt-6 pb-2">
        <span className="text-[9px] font-black tracking-[0.18em] text-stone-400 uppercase whitespace-nowrap">{title}</span>
        <div className="flex-1 h-px bg-stone-200" />
    </div>
);

const Row = ({ label, desc, children }) => (
    <div className="flex items-center gap-4 py-3 border-b border-stone-100 last:border-b-0">
        <div className="shrink-0" style={{ width: '44%' }}>
            <div className="text-[12px] font-semibold text-stone-700 leading-snug">{label}</div>
            {desc && <div className="text-[10px] text-stone-400 mt-0.5 leading-snug">{desc}</div>}
        </div>
        <div className="flex-1 min-w-0">{children}</div>
    </div>
);

function FieldGroup({ group, saving, onToggle }) {
    const [open, setOpen] = useState(false);
    const enabledCount = group.fields.filter(f => f.enabled).length;
    return (
        <div className="bg-white border border-stone-100 rounded-xl overflow-hidden mb-2">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-stone-50 transition-colors text-left"
            >
                {open ? <ChevronDown size={12} className="text-stone-300 shrink-0" /> : <ChevronRight size={12} className="text-stone-300 shrink-0" />}
                <span className="text-[12px] font-bold text-stone-700 flex-1">{group.label}</span>
                <span className="text-[10px] text-stone-400 font-mono shrink-0">{enabledCount}/{group.fields.length}</span>
            </button>
            {open && (
                <div className="divide-y divide-stone-50 border-t border-stone-100">
                    {group.fields.map(field => (
                        <div key={field.key} className="flex items-center gap-4 px-4 py-2.5">
                            <span className="flex-1 text-[11px] text-stone-600 font-medium">{field.label}</span>
                            <div className="shrink-0">
                                {saving === 'mfield_' + field.key ? (
                                    <Loader2 size={12} className="text-[#378ADD] animate-spin" />
                                ) : (
                                    <button
                                        onClick={() => onToggle(field.key, field.enabled)}
                                        className={`relative w-[34px] h-[18px] rounded-full transition-colors focus:outline-none ${field.enabled ? 'bg-[#378ADD]' : 'bg-stone-200'}`}
                                    >
                                        <span className={`absolute top-[2px] w-[14px] h-[14px] bg-white rounded-full shadow-sm transition-all duration-150 ${field.enabled ? 'left-[18px]' : 'left-[2px]'}`} />
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

function DocUploadZone({ groups, onAnalyzed }) {
    const [files, setFiles]         = useState([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult]       = useState(null);
    const [error, setError]         = useState(null);
    const inputRef                  = useRef(null);
    const dropRef                   = useRef(null);

    const addFiles = (incoming) => {
        const arr = Array.from(incoming);
        setFiles(prev => {
            const names = new Set(prev.map(f => f.name));
            return [...prev, ...arr.filter(f => !names.has(f.name))];
        });
        setResult(null);
        setError(null);
    };

    const removeFile = (name) => setFiles(prev => prev.filter(f => f.name !== name));

    const onDrop = (e) => {
        e.preventDefault();
        dropRef.current?.classList.remove('border-[#378ADD]', 'bg-blue-50');
        addFiles(e.dataTransfer.files);
    };

    const onDragOver = (e) => {
        e.preventDefault();
        dropRef.current?.classList.add('border-[#378ADD]', 'bg-blue-50');
    };

    const onDragLeave = () => {
        dropRef.current?.classList.remove('border-[#378ADD]', 'bg-blue-50');
    };

    const analyze = async () => {
        if (!files.length || analyzing) return;
        setAnalyzing(true);
        setError(null);
        setResult(null);
        try {
            const fd = new FormData();
            files.forEach(f => fd.append('files', f));
            const res  = await fetch('/api/tools/makine-bilgisi/analiz', { method: 'POST', body: fd });
            const json = await res.json();
            if (!res.ok) throw new Error(json.detail || 'Sunucu hatası');
            setResult(json);
            if (onAnalyzed) onAnalyzed(json.merged || {});
        } catch (e) {
            setError(e.message);
        } finally {
            setAnalyzing(false);
        }
    };

    const allFields = (groups || []).flatMap(g => g.fields.map(f => ({ ...f, groupLabel: g.label })));

    const ext = (name) => name.split('.').pop().toLowerCase();
    const isPdf = (name) => ext(name) === 'pdf';

    return (
        <div className="space-y-3">
            <input
                ref={inputRef}
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.webp,.bmp,.tiff,.pdf"
                className="hidden"
                onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
            />

            {files.length === 0 ? (
                /* Drop zone — sadece dosya yokken göster */
                <div
                    ref={dropRef}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onClick={() => inputRef.current?.click()}
                    className="border-2 border-dashed border-stone-200 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#378ADD] hover:bg-blue-50/30 transition-all"
                >
                    <Upload size={20} className="text-stone-300" />
                    <p className="text-[11px] text-stone-400 text-center leading-relaxed">
                        PNG, JPG, WEBP veya PDF belgelerini buraya bırakın<br />
                        <span className="text-stone-300">veya tıklayarak seçin</span>
                    </p>
                </div>
            ) : (
                /* Dosya listesi + + butonu */
                <div
                    ref={dropRef}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    className="bg-white border border-stone-100 rounded-xl overflow-hidden"
                >
                    <div className="divide-y divide-stone-50">
                        {files.map(f => (
                            <div key={f.name} className="flex items-center gap-2.5 px-3 py-2.5">
                                <FileText size={12} className={isPdf(f.name) ? 'text-red-400' : 'text-blue-400'} />
                                <span className="flex-1 text-[11px] text-stone-600 font-medium truncate">{f.name}</span>
                                <span className="text-[9px] text-stone-300 font-mono shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                                <button
                                    onClick={() => removeFile(f.name)}
                                    className="p-0.5 rounded text-stone-300 hover:text-stone-500 transition-colors"
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        ))}
                    </div>
                    {/* + ekle satırı */}
                    <button
                        onClick={() => inputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-1.5 py-2 border-t border-stone-100 text-[11px] text-stone-400 hover:text-[#378ADD] hover:bg-stone-50 transition-colors"
                    >
                        <span className="text-base leading-none font-light">+</span>
                        <span>Dosya ekle</span>
                    </button>
                </div>
            )}

            {/* Analiz Et butonu */}
            <button
                onClick={analyze}
                disabled={!files.length || analyzing}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#378ADD] text-white text-[12px] font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2a6fc4] transition-colors"
            >
                {analyzing ? <Loader2 size={13} className="animate-spin" /> : <Cpu size={13} />}
                {analyzing ? 'Analiz ediliyor…' : 'Analiz Et'}
            </button>

            {/* Error */}
            {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    <AlertTriangle size={12} className="text-red-400 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-red-600">{error}</p>
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="bg-white border border-stone-100 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-stone-100 bg-stone-50">
                        <CheckCircle2 size={12} className="text-emerald-500" />
                        <span className="text-[11px] font-bold text-stone-700">Analiz Sonuçları</span>
                        <span className="ml-auto text-[9px] text-stone-300 font-mono">{result.files?.length || 0} dosya</span>
                    </div>
                    <div className="divide-y divide-stone-50">
                        {allFields.filter(f => result.merged?.[f.key] != null && result.merged[f.key] !== '').map(f => (
                            <div key={f.key} className="flex items-start gap-3 px-4 py-2">
                                <span className="text-[10px] text-stone-400 shrink-0 pt-0.5" style={{ width: '42%' }}>{f.label}</span>
                                <span className="text-[11px] text-stone-700 font-medium break-words flex-1">
                                    {String(result.merged[f.key])}
                                </span>
                            </div>
                        ))}
                        {allFields.filter(f => result.merged?.[f.key] != null && result.merged[f.key] !== '').length === 0 && (
                            <p className="px-4 py-3 text-[11px] text-stone-400 text-center">Çıkarılabilecek alan bulunamadı.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function MakineBilgisiPanel() {
    const [data, setData]         = useState(null);
    const [loading, setLoading]   = useState(true);
    const [saving, setSaving]     = useState(null);

    const [params, setParamsState]     = useState({ saat_ucreti: 0, setup_suresi: 0, verimlilik: 85 });
    const [paramsDirty, setParamsDirty] = useState(false);
    const [promptVal, setPromptVal]     = useState('');
    const [promptDirty, setPromptDirty] = useState(false);

    const post = async (body) => {
        await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res  = await fetch(API);
            const json = await res.json();
            setData(json);
            setParamsState(json.machine_params || { saat_ucreti: 0, setup_suresi: 0, verimlilik: 85 });
            setParamsDirty(false);
            setPromptVal(json.machine_prompt || '');
            setPromptDirty(false);
        } catch { }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const toggleField = async (key, current) => {
        if (saving) return;
        const next = !current;
        const updatedGroups = data.machine_groups.map(g => ({
            ...g,
            fields: g.fields.map(f => f.key === key ? { ...f, enabled: next } : f),
        }));
        setData(prev => ({ ...prev, machine_groups: updatedGroups }));
        setSaving('mfield_' + key);
        try {
            const fieldMap = {};
            updatedGroups.forEach(g => g.fields.forEach(f => { fieldMap[f.key] = f.enabled; }));
            await post({ machine_fields: fieldMap });
            if (!data.machine_is_custom_prompt) {
                const res = await fetch(API);
                const json = await res.json();
                setPromptVal(json.machine_prompt || '');
            }
        } catch { }
        finally { setSaving(null); }
    };

    const setParam = (key, value) => {
        setParamsState(prev => ({ ...prev, [key]: value }));
        setParamsDirty(true);
    };

    const saveParams = async () => {
        setSaving('params');
        try {
            await post({ machine_params: params });
            setParamsDirty(false);
            if (!data?.machine_is_custom_prompt) {
                const res = await fetch(API);
                const json = await res.json();
                setPromptVal(json.machine_prompt || '');
            }
        } catch { }
        finally { setSaving(null); }
    };

    const savePrompt = async () => {
        setSaving('prompt');
        try {
            await post({ machine_prompt: promptVal });
            setData(prev => ({ ...prev, machine_is_custom_prompt: true }));
            setPromptDirty(false);
        } catch { }
        finally { setSaving(null); }
    };

    const resetPrompt = async () => {
        setSaving('prompt_reset');
        try {
            await post({ machine_prompt: '' });
            const res = await fetch(API);
            const json = await res.json();
            setData(json);
            setPromptVal(json.machine_prompt || '');
            setPromptDirty(false);
        } catch { }
        finally { setSaving(null); }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-16 w-full h-full">
            <Loader2 size={22} className="text-[#378ADD] animate-spin" />
        </div>
    );

    return (
        <div className="w-full h-full overflow-y-auto bg-stone-50 px-8 py-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="max-w-2xl mx-auto">

                {/* Başlık */}
                <div className="flex items-start justify-between gap-4 mb-1">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0">
                            <Wrench size={18} className="text-stone-500" />
                        </div>
                        <div>
                            <h2 className="text-[18px] font-black text-stone-800 tracking-tight leading-tight">Makine Bilgisi</h2>
                            <p className="text-[11px] text-stone-400 mt-0.5">Çalışma mantığı analizi, maliyet ve süre hesaplama</p>
                        </div>
                    </div>
                    <button onClick={load} disabled={loading} className="p-2 rounded-lg hover:bg-stone-100 transition-colors text-stone-400 hover:text-stone-600 shrink-0">
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                <p className="text-[11px] text-stone-400 leading-relaxed mb-1">
                    Teknik çizim veya makine belgesi verildiğinde; makine tipi, çalışma prensibi, kapasite ve
                    teknik özellikleri çıkarır. Tanımlanan saat ücreti ve setup süresiyle maliyet ve süre hesaplar.
                </p>

                {/* ── Çıktı Alanları ── */}
                <Section title="Çıktı Alanları" />
                <p className="text-[11px] text-stone-400 mb-3 leading-relaxed">
                    AI'ın makineden çıkaracağı bilgi alanlarını seçin. Değişiklikler analiz promptunu otomatik günceller.
                </p>
                {(data?.machine_groups || []).map(group => (
                    <FieldGroup key={group.group_key} group={group} saving={saving} onToggle={toggleField} />
                ))}

                {/* ── Hesaplama Parametreleri ── */}
                <Section title="Hesaplama Parametreleri" />

                <Row label="Makine Saat Ücreti" desc="TL / saat — maliyet hesabında kullanılır">
                    <div className="flex items-center gap-2">
                        <input
                            type="number" min={0} step={10}
                            value={params.saat_ucreti}
                            onChange={e => setParam('saat_ucreti', parseFloat(e.target.value) || 0)}
                            className="w-full bg-white border border-stone-200 text-stone-700 text-[12px] font-mono rounded-lg px-3 py-2 outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20"
                        />
                        <span className="text-[11px] text-stone-400 shrink-0 font-semibold">TL/s</span>
                    </div>
                </Row>

                <Row label="Setup Süresi" desc="Her iş emrinde hazırlık süresi (dakika)">
                    <div className="flex items-center gap-2">
                        <input
                            type="number" min={0} step={5}
                            value={params.setup_suresi}
                            onChange={e => setParam('setup_suresi', parseInt(e.target.value) || 0)}
                            className="w-full bg-white border border-stone-200 text-stone-700 text-[12px] font-mono rounded-lg px-3 py-2 outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20"
                        />
                        <span className="text-[11px] text-stone-400 shrink-0 font-semibold">dak</span>
                    </div>
                </Row>

                <Row label="Verimlilik Oranı" desc="Makinenin gerçek çalışma verimi (%)">
                    <div className="flex items-center gap-3">
                        <span className="text-[13px] font-black text-[#378ADD] font-mono tabular-nums" style={{ minWidth: 36, textAlign: 'right' }}>
                            {params.verimlilik}%
                        </span>
                        <div className="flex-1">
                            <input
                                type="range" min={10} max={100} step={5}
                                value={params.verimlilik}
                                onChange={e => setParam('verimlilik', parseInt(e.target.value))}
                                className="w-full h-[3px] bg-stone-200 rounded-full appearance-none cursor-pointer accent-[#378ADD]"
                            />
                            <div className="flex justify-between mt-0.5">
                                <span className="text-[9px] text-stone-300 font-mono">10%</span>
                                <span className="text-[9px] text-stone-300 font-mono">100%</span>
                            </div>
                        </div>
                    </div>
                </Row>

                <div className="flex justify-end pt-3 pb-1">
                    <button
                        onClick={saveParams}
                        disabled={!paramsDirty || saving === 'params'}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-[#378ADD] text-white text-[11px] font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2a6fc4] transition-colors"
                    >
                        {saving === 'params' ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                        Parametreleri Kaydet
                    </button>
                </div>

                {/* ── Döküman ile Analiz ── */}
                <Section title="Döküman ile Analiz" />
                <p className="text-[11px] text-stone-400 mb-3 leading-relaxed">
                    Makine belgelerini (teknik çizim, katalog, manuel vb.) yükleyin. Yapay zeka çıkardığı bilgileri aşağıda listeler.
                </p>
                <DocUploadZone groups={data?.machine_groups || []} onAnalyzed={() => {}} />

                {/* ── Analiz Promptu ── */}
                <Section title="Analiz Promptu" />
                <p className="text-[11px] text-stone-400 mb-3 leading-relaxed">
                    {data?.machine_is_custom_prompt
                        ? 'Özel prompt aktif — alan ve parametre değişiklikleri promptu etkilemez.'
                        : 'Alan seçimleri ve parametreler bu promptu otomatik oluşturur. Manuel düzenlemek için kaydedin.'
                    }
                </p>
                <textarea
                    value={promptVal}
                    onChange={e => { setPromptVal(e.target.value); setPromptDirty(true); }}
                    rows={14}
                    className="w-full text-[11px] font-mono text-stone-700 bg-white border border-stone-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-[#378ADD]/50 focus:ring-1 focus:ring-[#378ADD]/20 leading-relaxed [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-stone-200"
                    spellCheck={false}
                />
                <div className="flex items-center justify-between mt-2 pb-8">
                    <button
                        onClick={resetPrompt}
                        disabled={!!saving || !data?.machine_is_custom_prompt}
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

            </div>
        </div>
    );
}
