import React, { useState, useEffect, useCallback } from 'react';
import { FolderOpen, Play, Loader2, CheckCircle2, XCircle, AlertTriangle, ChevronDown, Sparkles, ScanLine, ChevronRight, MousePointerClick, Circle, Square, Trash2, GripVertical, Pencil, Check, MousePointer2 } from 'lucide-react';
import { useErrorStore } from '../../../store/errorStore';

const TAG_STYLES = {
    ai:      'bg-violet-50 text-violet-600 border-violet-200',
    archive: 'bg-amber-50 text-amber-600 border-amber-200',
    web:     'bg-sky-50 text-sky-600 border-sky-200',
};
const TAG_LABELS = { ai: 'AI için önerilir', archive: 'Arşiv', web: 'Web / Görsel' };

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

const SelectField = ({ value, onChange, options, label }) => {
    const selected = options.find(o => (o.value ?? o) === value);
    const desc = selected?.description;
    const tag  = selected?.tag;
    return (
        <div className="flex flex-col gap-1.5">
            <div className="relative">
                <select
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-full appearance-none bg-white border border-stone-200 rounded-lg px-3 py-2 text-[12px] text-stone-700 font-medium pr-8 focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20 transition-all cursor-pointer"
                >
                    {options.map(o => (
                        <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
                    ))}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            </div>
            {(desc || tag) && (
                <div className="flex flex-col gap-1">
                    {tag && (
                        <span className={`self-start text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${TAG_STYLES[tag] ?? ''}`}>
                            {tag === 'ai' && <Sparkles size={8} className="inline mr-0.5 mb-0.5" />}
                            {TAG_LABELS[tag]}
                        </span>
                    )}
                    {desc && <p className="text-[10px] text-stone-400 leading-relaxed">{desc}</p>}
                </div>
            )}
        </div>
    );
};

const BrowseInput = ({ value, onChange, placeholder }) => {
    const browse = async () => {
        try {
            const res = await fetch('/api/tools/file-collector/browse');
            const data = await res.json();
            if (data.path) onChange(data.path);
        } catch { }
    };
    return (
        <div className="flex gap-2">
            <input
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="flex-1 bg-white border border-stone-200 rounded-lg px-3 py-2 text-[12px] text-stone-700 font-medium focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20 transition-all"
            />
            <button
                onClick={browse}
                className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg text-[11px] font-semibold transition-colors shrink-0"
            >
                <FolderOpen size={13} />
                Seç
            </button>
        </div>
    );
};

export default function DwgConverterPanel() {
    const addToast = useErrorStore(s => s.addToast);

    const [options, setOptions] = useState({
        printers: [],
        plot_styles: [],
        paper_sizes: [],
        orientations: ['Landscape', 'Portrait'],
    });
    const [consolePath, setConsolePath] = useState('');
    const [consoleFound, setConsoleFound] = useState(null);

    const [dwgDir, setDwgDir]     = useState(() => localStorage.getItem('tools_shared_dir') || '');
    const [outputDir, setOutputDir] = useState('');
    const [printer, setPrinter]   = useState('DWG To PDF.pc3');
    const [plotStyle, setPlotStyle] = useState('.');
    const [paperSize, setPaperSize] = useState('ISO_A4_(210.00_x_297.00_MM)');
    const [orientation, setOrientation] = useState('Landscape');
    const [layout, setLayout]     = useState('Model');
    const [maxWorkers, setMaxWorkers] = useState(2);
    const [method, setMethod]   = useState('gui');

    // Sabit → yapılandırılabilir plot ayarları
    const [plotArea, setPlotArea]     = useState('Extents');
    const [plotScale, setPlotScale]   = useState('Fit');
    const [centerPlot, setCenterPlot] = useState(true);
    const [pageSize, setPageSize]     = useState('Sınırsız (A0)');

    // Makro — dinamik kaynak klasör ve çalıştırma
    const [macroSourceDir, setMacroSourceDir] = useState('');
    const [macroRunning, setMacroRunning]     = useState(false);
    const [macroRunResult, setMacroRunResult] = useState(null);

    const [running, setRunning] = useState(false);
    const [result, setResult]   = useState(null);

    // GUI Tarama
    const [scanning, setScanning]       = useState(false);
    const [scanResult, setScanResult]   = useState(null);
    const [scanOpen, setScanOpen]       = useState(false);
    const [scanFilter, setScanFilter]   = useState('');

    // Makro kaydedici
    const [macroRecording, setMacroRecording] = useState(false);
    const [macroSteps, setMacroSteps]         = useState([]);
    const [editingStepId, setEditingStepId]   = useState(null);
    const [editingStepName, setEditingStepName] = useState('');
    const pollRef = React.useRef(null);

    useEffect(() => {
        fetch('/api/tools/dwg-to-pdf/options').then(r => r.json()).then(setOptions).catch(() => {});
        fetch('/api/tools/dwg-to-pdf/find-console')
            .then(r => r.json())
            .then(d => { setConsoleFound(d.found); setConsolePath(d.path || ''); })
            .catch(() => {});
        fetch('/api/tools/dwg-to-pdf/default-output')
            .then(r => r.json())
            .then(d => { if (d.path) setOutputDir(prev => prev || d.path); })
            .catch(() => {});
        fetch('/api/tools/file-collector/default-target')
            .then(r => r.json())
            .then(d => { if (d.path) setDwgDir(prev => prev || d.path); })
            .catch(() => {});
    }, []);

    const checkConsole = useCallback(async () => {
        const res = await fetch(
            `/api/tools/dwg-to-pdf/find-console${consolePath ? `?custom_path=${encodeURIComponent(consolePath)}` : ''}`
        );
        const d = await res.json();
        setConsoleFound(d.found);
        if (!d.found) addToast({ type: 'error', message: 'accoreconsole.exe bulunamadı.' });
        else addToast({ type: 'success', message: `Bulundu: ${d.path}` });
    }, [consolePath, addToast]);

    const runMacro = useCallback(async () => {
        if (!macroSourceDir) {
            addToast({ type: 'error', message: 'Önce makro kaynak klasörü seçin.' });
            return;
        }
        if (!macroSteps.length) {
            addToast({ type: 'error', message: 'Çalıştırılacak kayıtlı makro adımı yok.' });
            return;
        }
        setMacroRunning(true);
        setMacroRunResult(null);
        try {
            const res = await fetch('/api/tools/dwg-to-pdf/macro/run-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source_dir: macroSourceDir }),
            });
            const d = await res.json();
            setMacroRunResult(d);
            if (d.error) addToast({ type: 'error', message: d.error });
            else addToast({ type: 'success', message: `${d.processed ?? 0} dosya işlendi.` });
        } catch (err) {
            addToast({ type: 'error', message: `Makro çalıştırılamadı: ${err.message}` });
        } finally {
            setMacroRunning(false);
        }
    }, [macroSourceDir, macroSteps, addToast]);

    const startMacro = useCallback(async () => {
        setMacroSteps([]);
        setMacroRecording(true);
        try {
            const res = await fetch('/api/tools/dwg-to-pdf/macro/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dwg_path: macroSourceDir || dwgDir }),
            });
            const d = await res.json();
            if (d.error) {
                addToast({ type: 'error', message: d.error });
                setMacroRecording(false);
                return;
            }
            if (d.message) addToast({ type: 'success', message: d.message });
            // Adımları 1sn'de bir çek
            pollRef.current = setInterval(async () => {
                const r = await fetch('/api/tools/dwg-to-pdf/macro/steps');
                const sd = await r.json();
                setMacroSteps(sd.steps || []);
            }, 1000);
        } catch (err) {
            addToast({ type: 'error', message: `Kayıt başlatılamadı: ${err.message}` });
            setMacroRecording(false);
        }
    }, [dwgDir, addToast]);

    const stopMacro = useCallback(async () => {
        clearInterval(pollRef.current);
        setMacroRecording(false);
        try {
            const r = await fetch('/api/tools/dwg-to-pdf/macro/stop', { method: 'POST' });
            const d = await r.json();
            setMacroSteps(d.steps || []);
            addToast({ type: 'success', message: `${d.count} adım kaydedildi.` });
        } catch (err) {
            addToast({ type: 'error', message: `Kayıt durdurulamadı: ${err.message}` });
        }
    }, [addToast]);

    const deleteStep = useCallback(async (id) => {
        await fetch(`/api/tools/dwg-to-pdf/macro/step/${id}`, { method: 'DELETE' });
        setMacroSteps(prev => prev.filter(s => s.id !== id));
    }, []);

    const commitRename = useCallback(async () => {
        if (!editingStepId) return;
        setMacroSteps(prev => prev.map(s =>
            s.id === editingStepId ? { ...s, name: editingStepName, note: editingStepName } : s
        ));
        // Güncel listeyi backend'e yaz
        setMacroSteps(prev => {
            fetch('/api/tools/dwg-to-pdf/macro/steps', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ steps: prev }),
            }).catch(() => {});
            return prev;
        });
        setEditingStepId(null);
        setEditingStepName('');
    }, [editingStepId, editingStepName]);

    const loadMacro = useCallback(async () => {
        const r = await fetch('/api/tools/dwg-to-pdf/macro/load');
        const d = await r.json();
        setMacroSteps(d.steps || []);
        addToast({ type: 'success', message: `${d.count} adım yüklendi.` });
    }, [addToast]);

    // Cleanup on unmount
    React.useEffect(() => () => clearInterval(pollRef.current), []);

    const scanGui = useCallback(async () => {
        setScanning(true);
        setScanResult(null);
        setScanOpen(true);
        try {
            const res = await fetch('/api/tools/dwg-to-pdf/scan-gui');
            const d = await res.json();
            setScanResult(d);
            if (d.error) addToast({ type: 'error', message: `Tarama hatası: ${d.error}` });
            else addToast({ type: 'success', message: `${d.controls?.length ?? 0} kontrol bulundu.` });
        } catch (err) {
            setScanResult({ error: err.message, controls: [] });
            addToast({ type: 'error', message: `Tarama isteği başarısız: ${err.message}` });
        } finally {
            setScanning(false);
        }
    }, [addToast]);

    const run = async () => {
        if (!dwgDir || !outputDir) {
            addToast({ type: 'error', message: 'Kaynak ve çıktı klasörü zorunlu.' });
            return;
        }
        setRunning(true);
        setResult(null);
        try {
            const collectRes = await fetch('/api/tools/file-collector/collect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source_dir: dwgDir, target_dir: outputDir, extensions: ['.dwg'], recursive: true, dry_run: true }),
            });
            const collected = await collectRes.json();
            const dwgFiles = collected.files.map(f => f.source);

            if (!dwgFiles.length) {
                addToast({ type: 'warning', message: 'Seçilen klasörde DWG dosyası bulunamadı.' });
                setRunning(false);
                return;
            }

            const convertRes = await fetch('/api/tools/dwg-to-pdf/convert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dwg_files: dwgFiles,
                    output_dir: outputDir,
                    printer, plot_style: plotStyle, paper_size: paperSize,
                    orientation, layout,
                    max_workers: maxWorkers,
                    accoreconsole_path: consolePath || null,
                    method,
                    plot_area: plotArea,
                    scale_setting: plotScale,
                    center_plot: centerPlot,
                    page_size_override: pageSize,
                }),
            });
            const data = await convertRes.json();
            setResult(data);
            (data.notifications || []).forEach(n => addToast({ type: n.type, message: n.message }));
        } catch (err) {
            addToast({ type: 'error', message: `İstek hatası: ${err.message}` });
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="w-full h-full overflow-y-auto bg-stone-50 px-8 py-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="max-w-2xl mx-auto">

                {/* Başlık */}
                <div className="mb-1">
                    <h2 className="text-[18px] font-black text-stone-800 tracking-tight">DWG → PDF Dönüştürücü</h2>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                        {method === 'gui' ? 'TrueView GUI otomasyonu — pywinauto ile pencere tabanlı dönüştürme'
                        : method === 'oda' ? 'ODA File Converter + ezdxf pipeline — hızlı ve kararlı'
                        : 'accoreconsole.exe ile arka planda toplu dönüştürme'}
                    </p>
                </div>

                {/* Yöntem seçici */}
                <div className="flex gap-2 mb-1">
                    {[
                        { value: 'gui', label: 'GUI', desc: 'TrueView pencere otomasyonu — en kaliteli PDF' },
                        { value: 'oda', label: 'ODA + ezdxf', desc: 'ODA → DXF → ezdxf → PDF pipeline' },
                    ].map(o => (
                        <button
                            key={o.value}
                            onClick={() => setMethod(o.value)}
                            title={o.desc}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                                method === o.value
                                    ? 'bg-[#378ADD] text-white border-[#378ADD]'
                                    : 'bg-white text-stone-500 border-stone-200 hover:border-[#378ADD]/50'
                            }`}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>

                {method === 'gui' && (
                    <div className="flex flex-col gap-2 mt-1 mb-1">
                        <div className="flex items-start gap-2.5 bg-[#378ADD]/5 border border-[#378ADD]/20 rounded-lg px-3.5 py-3">
                            <span className="text-[#378ADD] text-[14px] shrink-0 mt-0.5">ⓘ</span>
                            <div className="text-[11px] text-stone-600 leading-relaxed flex-1">
                                <span className="font-bold text-stone-700">GUI modu:</span> TrueView arka planda açılır, Plot diyaloğu
                                otomatik doldurulur ve PDF kaydedilir. Tek seferlik — paralel çalışmaz.
                                <span className="text-stone-400 ml-1">pywinauto + win32gui gerektirir.</span>
                            </div>
                            <button
                                onClick={scanGui}
                                disabled={scanning}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#378ADD] hover:bg-[#2e6fb5] disabled:opacity-50 text-white rounded-lg text-[11px] font-bold transition-colors shrink-0"
                                title="TrueView'ı açıp Plot diyaloğundaki tüm kontrolleri tara"
                            >
                                {scanning ? <Loader2 size={12} className="animate-spin" /> : <ScanLine size={12} />}
                                {scanning ? 'Taranıyor...' : 'Kontrolleri Tara'}
                            </button>
                        </div>

                        {/* ── Makro Kaydedici ── */}
                        <div className="border border-stone-200 rounded-lg overflow-hidden bg-white">
                            <div className="flex items-center gap-3 px-3.5 py-2.5 border-b border-stone-100 bg-stone-50">
                                <span className="text-[11px] font-bold text-stone-700 flex-1">Makro Kaydedici</span>
                                {!macroRecording ? (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={loadMacro}
                                            className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg text-[10px] font-semibold transition-colors"
                                        >
                                            Yüklü Makro
                                        </button>
                                        <button
                                            onClick={startMacro}
                                            className="flex items-center gap-1.5 px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[11px] font-bold transition-colors"
                                        >
                                            <Circle size={9} className="fill-white" /> Kaydet
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center gap-1.5 text-[11px] text-red-500 font-bold animate-pulse">
                                            <Circle size={8} className="fill-red-500" /> Kaydediliyor...
                                        </span>
                                        <button
                                            onClick={stopMacro}
                                            className="flex items-center gap-1.5 px-3 py-1 bg-stone-700 hover:bg-stone-800 text-white rounded-lg text-[11px] font-bold transition-colors"
                                        >
                                            <Square size={9} className="fill-white" /> Bitir
                                        </button>
                                    </div>
                                )}
                            </div>

                            {macroSteps.length > 0 ? (
                                <div className="max-h-56 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                                    {macroSteps.map((step, i) => {
                                        const hasName = !!(step.name || step.auto_id);
                                        const isCoordOnly = !hasName;
                                        const isEditing = editingStepId === step.id;
                                        const displayName = step.name || step.auto_id || `(${step.x}, ${step.y})`;
                                        const tooltip = [
                                            step.name       && `Ad: ${step.name}`,
                                            step.auto_id    && `AutomationID: ${step.auto_id}`,
                                            step.control_type && `Tür: ${step.control_type}`,
                                            step.class_name && `Class: ${step.class_name}`,
                                            step.parent_name && `Diyalog: ${step.parent_name}`,
                                            `Koordinat: (${step.x}, ${step.y})`,
                                        ].filter(Boolean).join('\n');

                                        return (
                                            <div
                                                key={step.id}
                                                title={tooltip}
                                                className={`flex items-center gap-2 px-3.5 py-2 border-b border-stone-50 group transition-colors ${isCoordOnly ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-stone-50/60'}`}
                                            >
                                                <span className="text-[10px] text-stone-300 w-4 shrink-0 font-mono text-right">{i + 1}</span>

                                                {/* Aksiyon ikonu */}
                                                <div className={`shrink-0 ${isCoordOnly ? 'text-amber-400' : 'text-stone-300'}`}>
                                                    <MousePointer2 size={11} />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    {isEditing ? (
                                                        <input
                                                            autoFocus
                                                            value={editingStepName}
                                                            onChange={e => setEditingStepName(e.target.value)}
                                                            onBlur={commitRename}
                                                            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setEditingStepId(null); setEditingStepName(''); } }}
                                                            className="w-full text-[11px] font-semibold text-stone-700 bg-white border border-[#378ADD] rounded px-1.5 py-0.5 focus:outline-none"
                                                        />
                                                    ) : (
                                                        <>
                                                            <div className={`text-[11px] font-semibold truncate ${isCoordOnly ? 'text-amber-600' : 'text-stone-700'}`}>
                                                                {isCoordOnly && <span className="text-[9px] font-black uppercase tracking-wider text-amber-500 mr-1.5">⚠ koordinat</span>}
                                                                {displayName}
                                                            </div>
                                                            <div className="flex gap-2 text-[9px] text-stone-400 font-mono mt-0.5">
                                                                {step.control_type && (
                                                                    <span className="bg-stone-100 text-stone-500 px-1 rounded">{step.control_type}</span>
                                                                )}
                                                                {step.parent_name && (
                                                                    <span className="text-stone-300 truncate">← {step.parent_name}</span>
                                                                )}
                                                                {!step.control_type && !step.parent_name && step.class_name && (
                                                                    <span className="text-stone-300">{step.class_name}</span>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Eylem butonları */}
                                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                    {!isEditing && (
                                                        <button
                                                            onClick={() => { setEditingStepId(step.id); setEditingStepName(step.name || ''); }}
                                                            className="p-1 hover:text-[#378ADD] text-stone-300 transition-colors"
                                                            title="Adı düzenle"
                                                        >
                                                            <Pencil size={10} />
                                                        </button>
                                                    )}
                                                    {isEditing && (
                                                        <button onClick={commitRename} className="p-1 text-emerald-500 hover:text-emerald-600 transition-colors">
                                                            <Check size={10} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => deleteStep(step.id)}
                                                        className="p-1 hover:text-red-400 text-stone-300 transition-colors"
                                                        title="Adımı sil"
                                                    >
                                                        <Trash2 size={10} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="px-3.5 py-4 text-center text-[10px] text-stone-300">
                                    {macroRecording ? 'TrueView\'de tıklayın — adımlar buraya kaydedilecek' : 'Henüz adım yok'}
                                </div>
                            )}
                        </div>

                        {/* Makro Kaynak Klasörü + Çalıştır */}
                        <div className="border border-stone-200 rounded-lg overflow-hidden bg-white">
                            <div className="flex items-center gap-3 px-3.5 py-2.5 border-b border-stone-100 bg-stone-50">
                                <span className="text-[11px] font-bold text-stone-700 flex-1">Makro Çalıştır</span>
                                <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">Klasör bazlı</span>
                            </div>
                            <div className="px-3.5 py-3 flex flex-col gap-3">
                                <div>
                                    <div className="text-[11px] font-semibold text-stone-600 mb-1.5">Kaynak Klasör</div>
                                    <BrowseInput
                                        value={macroSourceDir}
                                        onChange={setMacroSourceDir}
                                        placeholder="C:\Projeler\DWG"
                                    />
                                    <p className="text-[10px] text-stone-400 leading-relaxed mt-1.5">
                                        Makro bu klasördeki her dosya için sırayla tekrarlanır. Dosya yolu her adımda dinamik olarak güncellenir.
                                    </p>
                                </div>
                                <button
                                    onClick={runMacro}
                                    disabled={macroRunning || !macroSteps.length}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-stone-800 hover:bg-stone-900 disabled:opacity-40 text-white rounded-lg text-[11px] font-bold tracking-wide transition-colors"
                                >
                                    {macroRunning
                                        ? <><Loader2 size={12} className="animate-spin" /> İşleniyor...</>
                                        : <><Play size={12} /> Klasörü İşle</>
                                    }
                                </button>
                                {macroRunResult && (
                                    <div className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2.5">
                                        {macroRunResult.error ? (
                                            <div className="flex items-center gap-2 text-[11px] text-red-500 font-semibold">
                                                <XCircle size={12} /> {macroRunResult.error}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-4 text-[11px] font-semibold text-stone-600">
                                                <span className="text-emerald-600">✓ {macroRunResult.processed ?? 0} işlendi</span>
                                                {(macroRunResult.failed ?? 0) > 0 && (
                                                    <span className="text-red-500">✗ {macroRunResult.failed} hata</span>
                                                )}
                                                {macroRunResult.skipped > 0 && (
                                                    <span className="text-stone-400">↷ {macroRunResult.skipped} atlandı</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tarama sonuçları */}
                        {scanResult && (
                            <div className="border border-stone-200 rounded-lg overflow-hidden bg-white">
                                <button
                                    onClick={() => setScanOpen(v => !v)}
                                    className="w-full flex items-center gap-2 px-3.5 py-2.5 hover:bg-stone-50 transition-colors"
                                >
                                    <ChevronRight size={13} className={`text-stone-400 transition-transform ${scanOpen ? 'rotate-90' : ''}`} />
                                    {scanResult.error ? (
                                        <span className="text-[11px] font-bold text-red-500 flex-1 text-left">{scanResult.error}</span>
                                    ) : (
                                        <>
                                            <MousePointerClick size={13} className="text-[#378ADD]" />
                                            <span className="text-[11px] font-bold text-stone-700 flex-1 text-left">
                                                {scanResult.controls?.length ?? 0} kontrol bulundu
                                            </span>
                                            <span className="text-[10px] text-stone-400 font-mono truncate max-w-[200px]">{scanResult.exe}</span>
                                        </>
                                    )}
                                </button>
                                {scanOpen && !scanResult.error && (
                                    <div className="border-t border-stone-100">
                                        <div className="px-3.5 py-2 border-b border-stone-100 bg-stone-50">
                                            <input
                                                value={scanFilter}
                                                onChange={e => setScanFilter(e.target.value)}
                                                placeholder="Ad, auto_id veya class ile filtrele..."
                                                className="w-full bg-white border border-stone-200 rounded-md px-2.5 py-1.5 text-[11px] focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20"
                                            />
                                        </div>
                                        <div className="max-h-64 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                                            <table className="w-full text-[10px]">
                                                <thead className="sticky top-0 bg-stone-50 border-b border-stone-100">
                                                    <tr>
                                                        <th className="text-left px-3 py-1.5 font-black text-stone-400 tracking-wider uppercase w-[30%]">Ad</th>
                                                        <th className="text-left px-2 py-1.5 font-black text-stone-400 tracking-wider uppercase w-[25%]">Auto ID</th>
                                                        <th className="text-left px-2 py-1.5 font-black text-stone-400 tracking-wider uppercase w-[20%]">Tür</th>
                                                        <th className="text-left px-2 py-1.5 font-black text-stone-400 tracking-wider uppercase">Class</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(scanResult.controls || [])
                                                        .filter(c => {
                                                            if (!scanFilter) return true;
                                                            const q = scanFilter.toLowerCase();
                                                            return (c.name || '').toLowerCase().includes(q)
                                                                || (c.auto_id || '').toLowerCase().includes(q)
                                                                || (c.class_name || '').toLowerCase().includes(q);
                                                        })
                                                        .map((c, i) => (
                                                            <tr key={i} className="border-b border-stone-50 hover:bg-stone-50/80">
                                                                <td className="px-3 py-1.5 font-medium text-stone-700 truncate max-w-0">
                                                                    <span title={c.name}>{c.name || <span className="text-stone-300">—</span>}</span>
                                                                </td>
                                                                <td className="px-2 py-1.5 font-mono text-[#378ADD] truncate max-w-0">
                                                                    <span title={c.auto_id}>{c.auto_id || <span className="text-stone-300">—</span>}</span>
                                                                </td>
                                                                <td className="px-2 py-1.5 text-stone-500">{c.control_type}</td>
                                                                <td className="px-2 py-1.5 font-mono text-stone-400 truncate max-w-0">
                                                                    <span title={c.class_name}>{c.class_name || <span className="text-stone-300">—</span>}</span>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    }
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Program — sadece accoreconsole gerektiren modlarda göster */}
                {method !== 'gui' && (
                    <>
                        <Section title="Program" />
                        <Row
                            label="accoreconsole.exe"
                            desc="AutoCAD ve DWG TrueView kurulum yolları otomatik taranır"
                        >
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                    {consoleFound === true ? (
                                        <>
                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">
                                                ✓ Bulundu
                                            </span>
                                            <span className="text-[10px] text-stone-400 font-mono truncate flex-1" title={consolePath}>
                                                {consolePath}
                                            </span>
                                        </>
                                    ) : consoleFound === false ? (
                                        <>
                                            <span className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full shrink-0">
                                                ✗ Bulunamadı
                                            </span>
                                            <span className="text-[10px] text-stone-400 flex-1">
                                                DWG TrueView veya AutoCAD kurulu mu?
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-[10px] text-stone-400 flex-1">Kontrol edilmedi</span>
                                    )}
                                    <button
                                        onClick={checkConsole}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg text-[11px] font-semibold transition-colors shrink-0"
                                    >
                                        {consoleFound === null ? 'Otomatik Bul' : 'Tekrar Tara'}
                                    </button>
                                </div>
                                {consoleFound === false && (
                                    <input
                                        value={consolePath}
                                        onChange={e => setConsolePath(e.target.value)}
                                        placeholder="Manuel yol: C:\...\accoreconsole.exe"
                                        className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-[11px] text-stone-600 font-mono focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20 transition-all"
                                    />
                                )}
                            </div>
                        </Row>
                    </>
                )}

                {/* Klasörler */}
                <Section title="Klasörler" />
                <Row label="DWG Kaynak Klasör" desc="Dönüştürülecek .dwg dosyalarının bulunduğu dizin">
                    <BrowseInput value={dwgDir} onChange={setDwgDir} placeholder="C:\Projeler\DWG" />
                </Row>
                <Row label="PDF Çıktı Klasör" desc="Oluşturulan PDF'lerin kaydedileceği dizin">
                    <BrowseInput value={outputDir} onChange={setOutputDir} placeholder="C:\Projeler\PDF" />
                </Row>

                {/* Plot Ayarları */}
                <Section title="Plot Ayarları" />
                <Row label="Çıktı Formatı" desc="Kullanılacak yazıcı / plot konfigürasyonu">
                    <SelectField value={printer} onChange={setPrinter} options={options.printers} />
                </Row>
                <Row label="Plot Stili" desc="CTB / STB dosyası">
                    <SelectField value={plotStyle} onChange={setPlotStyle} options={options.plot_styles} />
                </Row>
                <Row label="Yönlendirme" desc="Kağıt yönü">
                    <SelectField
                        value={orientation}
                        onChange={setOrientation}
                        options={[
                            { value: 'Landscape', label: 'Yatay' },
                            { value: 'Portrait',  label: 'Dikey' },
                        ]}
                    />
                </Row>
                <Row
                    label={method === 'gui' ? 'Paralel İşlem' : `Paralel İşlem (${maxWorkers})`}
                    desc={method === 'gui' ? 'GUI modunda sıralı çalışır — paralel desteklenmez' : 'Aynı anda kaç dosya dönüştürülür'}
                >
                    {method === 'gui' ? (
                        <div className="flex justify-end">
                            <span className="text-[11px] text-stone-400 font-medium bg-stone-100 px-2.5 py-1 rounded-lg">Tek işlem</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <span className="text-[13px] font-black text-[#378ADD] font-mono tabular-nums" style={{ minWidth: 24 }}>{maxWorkers}</span>
                            <div className="flex-1">
                                <input
                                    type="range" min={1} max={8} value={maxWorkers}
                                    onChange={e => setMaxWorkers(+e.target.value)}
                                    className="w-full h-[3px] bg-stone-200 rounded-full appearance-none cursor-pointer accent-[#D44B4B]"
                                />
                                <div className="flex justify-between mt-0.5">
                                    <span className="text-[9px] text-stone-300 font-mono">1</span>
                                    <span className="text-[9px] text-stone-300 font-mono">8</span>
                                </div>
                            </div>
                        </div>
                    )}
                </Row>
                <Row label="Plot Alanı" desc="Hangi alanın kağıda sığdırılacağı">
                    <SelectField
                        value={plotArea}
                        onChange={setPlotArea}
                        options={[
                            { value: 'Extents',  label: 'Extents — tüm çizim' },
                            { value: 'Window',   label: 'Window — seçili alan' },
                            { value: 'Limits',   label: 'Limits — çizim sınırları' },
                            { value: 'Display',  label: 'Display — ekran görünümü' },
                        ]}
                    />
                </Row>
                <Row label="Ölçek" desc="Kağıda yerleşim ölçeği">
                    <SelectField
                        value={plotScale}
                        onChange={setPlotScale}
                        options={[
                            { value: 'Fit',  label: 'Sığdır (Fit to Paper)' },
                            { value: '1:1',  label: '1:1' },
                            { value: '1:2',  label: '1:2' },
                            { value: '1:5',  label: '1:5' },
                            { value: '1:10', label: '1:10' },
                        ]}
                    />
                </Row>
                <Row label="Sayfa Boyutu" desc="Kağıt formatı">
                    <SelectField
                        value={pageSize}
                        onChange={setPageSize}
                        options={[
                            { value: 'Sınırsız (A0)', label: 'Sınırsız (A0)' },
                            { value: 'A0', label: 'A0 — 841 × 1189 mm' },
                            { value: 'A1', label: 'A1 — 594 × 841 mm' },
                            { value: 'A2', label: 'A2 — 420 × 594 mm' },
                            { value: 'A3', label: 'A3 — 297 × 420 mm' },
                            { value: 'A4', label: 'A4 — 210 × 297 mm' },
                        ]}
                    />
                </Row>
                <Row label="Merkeze Hizala" desc="Çizimi kağıt ortasına yerleştir">
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setCenterPlot(v => !v)}
                            className={`relative w-[38px] h-[20px] rounded-full transition-colors focus:outline-none ${centerPlot ? 'bg-[#378ADD]' : 'bg-stone-200'}`}
                        >
                            <span className={`absolute top-[2px] w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-150 ${centerPlot ? 'left-[20px]' : 'left-[2px]'}`} />
                        </button>
                    </div>
                </Row>

                {/* Eylem */}
                <Section title="Eylem" />
                <div className="pb-2">
                    <button
                        onClick={run}
                        disabled={running}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-[#D44B4B] hover:bg-[#b93c3c] disabled:opacity-40 text-white rounded-lg text-[12px] font-bold tracking-wide transition-colors"
                    >
                        {running
                            ? <><Loader2 size={14} className="animate-spin" /> Dönüştürülüyor...</>
                            : <><Play size={14} /> Dönüştür</>
                        }
                    </button>
                </div>

                {/* Sonuçlar */}
                {result && (
                    <>
                        <Section title="Sonuçlar" />
                        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mb-6">
                            <div className="flex items-center gap-4 px-4 py-3 border-b border-stone-100 bg-stone-50/80">
                                <span className="text-[11px] font-bold text-stone-500">Toplam: <span className="text-stone-700">{result.total}</span></span>
                                <span className="text-[11px] font-bold text-emerald-600">✓ {result.converted}</span>
                                {result.errors > 0 && <span className="text-[11px] font-bold text-red-500">✗ {result.errors}</span>}
                            </div>
                            <div className="divide-y divide-stone-50 max-h-72 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                                {result.files.map((f, i) => (
                                    <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                                        {f.status === 'converted'
                                            ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                            : <XCircle size={13} className="text-red-400 shrink-0" />
                                        }
                                        <span className="text-[11px] text-stone-700 font-medium flex-1 truncate">
                                            {f.source.split(/[\\/]/).pop()}
                                        </span>
                                        {f.status === 'error' && (
                                            <span className="text-[10px] text-red-400 truncate max-w-[200px]" title={f.message}>
                                                {f.message}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
