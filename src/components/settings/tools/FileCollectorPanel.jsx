import React, { useState, useEffect, useRef } from 'react';
import { FolderOpen, Play, Loader2, CheckCircle2, XCircle, SkipForward, Eye } from 'lucide-react';
import { useErrorStore } from '../../../store/errorStore';

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

const Toggle = ({ value, onChange }) => (
    <div className="flex justify-end">
        <button
            type="button"
            onClick={() => onChange(!value)}
            className={`relative w-[38px] h-[20px] rounded-full transition-colors focus:outline-none ${value ? 'bg-[#D44B4B]' : 'bg-stone-200'}`}
        >
            <span className={`absolute top-[2px] w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-150 ${value ? 'left-[20px]' : 'left-[2px]'}`} />
        </button>
    </div>
);

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

const EXT_PRESETS = ['.dwg', '.pdf', '.step', '.stp', '.xlsx', '.docx', '.png', '.jpg'];

const statusIcon = (status) => {
    if (status === 'copied')  return <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />;
    if (status === 'error')   return <XCircle size={13} className="text-red-400 shrink-0" />;
    if (status === 'skipped') return <SkipForward size={13} className="text-amber-400 shrink-0" />;
    return <Eye size={13} className="text-[#378ADD] shrink-0" />;
};

export default function FileCollectorPanel() {
    const addToast = useErrorStore(s => s.addToast);

    const [sourceDir, setSourceDir] = useState('');
    const [targetDir, setTargetDir] = useState(
        () => localStorage.getItem('tools_shared_dir') || ''
    );
    const handleTargetDirChange = (val) => {
        setTargetDir(val);
        localStorage.setItem('tools_shared_dir', val);
    };

    const [extensions, setExtensions] = useState([]);
    const [extInput, setExtInput] = useState('');
    const [extInputOpen, setExtInputOpen] = useState(false);
    const extInputRef = useRef(null);
    const [namePattern, setNamePattern] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [recursive, setRecursive] = useState(true);
    const [overwrite, setOverwrite] = useState(false);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
        fetch('/api/tools/file-collector/default-target')
            .then(r => r.json())
            .then(d => { if (d.path) setTargetDir(prev => prev || d.path); })
            .catch(() => {});
    }, []);

    const toggleExt = (ext) =>
        setExtensions(prev => prev.includes(ext) ? prev.filter(e => e !== ext) : [...prev, ext]);

    const addCustomExt = () => {
        const v = extInput.trim().replace(/^\.?/, '.');
        if (v && v !== '.' && !extensions.includes(v)) setExtensions(prev => [...prev, v]);
        setExtInput('');
        setExtInputOpen(false);
    };

    const openExtInput = () => {
        setExtInputOpen(true);
        setTimeout(() => extInputRef.current?.focus(), 50);
    };

    const run = async (preview = false) => {
        if (!sourceDir || !targetDir) {
            addToast({ type: 'error', message: 'Kaynak ve hedef klasör zorunlu.' });
            return;
        }
        setRunning(true);
        setResult(null);
        try {
            const res = await fetch('/api/tools/file-collector/collect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source_dir: sourceDir,
                    target_dir: targetDir,
                    extensions,
                    name_pattern: namePattern || null,
                    date_from: dateFrom || null,
                    date_to: dateTo || null,
                    recursive,
                    overwrite,
                    dry_run: preview,
                }),
            });
            const data = await res.json();
            setResult(data);
            (data.files?.filter(f => f.status === 'error') || []).forEach(f =>
                addToast({ type: 'warning', message: `Hata — ${f.name}: kopyalanamadı` })
            );
            if (!data.dry_run && data.total_copied > 0)
                addToast({ type: 'success', message: `${data.total_copied} dosya kopyalandı.` });
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
                    <h2 className="text-[18px] font-black text-stone-800 tracking-tight">Dosya Toplayıcı</h2>
                    <p className="text-[11px] text-stone-400 mt-0.5">Klasör gezme, filtreleme ve kopyalama aracı</p>
                </div>

                {/* Klasörler */}
                <Section title="Klasörler" />
                <Row label="Kaynak Klasör" desc="Taranacak kök dizin">
                    <BrowseInput value={sourceDir} onChange={setSourceDir} placeholder="C:\Projeler" />
                </Row>
                <Row label="Hedef Klasör" desc="Dosyaların kopyalanacağı dizin">
                    <BrowseInput value={targetDir} onChange={handleTargetDirChange} placeholder="C:\Toplananlar" />
                </Row>

                {/* Filtreler */}
                <Section title="Filtreler" />
                <Row label="Uzantılar" desc="Boş bırakılırsa tüm dosyalar seçilir">
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-1.5 items-center">
                            {EXT_PRESETS.map(ext => (
                                <button
                                    key={ext}
                                    onClick={() => toggleExt(ext)}
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                                        extensions.includes(ext)
                                            ? 'bg-[#378ADD] text-white border-[#378ADD]'
                                            : 'bg-white text-stone-500 border-stone-200 hover:border-[#378ADD]/50 hover:text-[#378ADD]'
                                    }`}
                                >
                                    {ext}
                                </button>
                            ))}
                            {extInputOpen ? (
                                <div className="flex items-center gap-1">
                                    <input
                                        ref={extInputRef}
                                        value={extInput}
                                        onChange={e => setExtInput(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') addCustomExt();
                                            if (e.key === 'Escape') { setExtInputOpen(false); setExtInput(''); }
                                        }}
                                        onBlur={() => { if (!extInput.trim()) setExtInputOpen(false); }}
                                        placeholder=".igs"
                                        className="w-20 bg-white border border-[#378ADD] rounded-full px-2.5 py-1 text-[11px] font-bold text-stone-700 focus:outline-none"
                                    />
                                    <button
                                        onClick={addCustomExt}
                                        className="w-6 h-6 rounded-full bg-[#378ADD] text-white text-[13px] font-bold flex items-center justify-center hover:bg-[#2e6fb5] transition-colors"
                                    >
                                        ✓
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={openExtInput}
                                    className="w-6 h-6 rounded-full border border-dashed border-stone-300 text-stone-400 text-[14px] font-bold flex items-center justify-center hover:border-[#378ADD] hover:text-[#378ADD] transition-colors"
                                >
                                    +
                                </button>
                            )}
                        </div>
                        {extensions.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {extensions.map(e => (
                                    <span
                                        key={e}
                                        onClick={() => toggleExt(e)}
                                        className="px-2 py-0.5 bg-[#378ADD]/10 text-[#378ADD] text-[10px] font-bold rounded-full cursor-pointer hover:bg-red-50 hover:text-red-400 transition-colors"
                                    >
                                        {e} ✕
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </Row>
                <Row label="İsim Deseni" desc="Glob formatında (ör. proje_*, *_v2.*)">
                    <input
                        value={namePattern}
                        onChange={e => setNamePattern(e.target.value)}
                        placeholder="proje_*, *_v2.*, *.dwg"
                        className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-[12px] font-medium text-stone-700 focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20 transition-all"
                    />
                </Row>
                <Row label="Tarih Aralığı" desc="Değiştirilme tarihine göre filtrele">
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                            className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-[12px] text-stone-700 focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20 transition-all"
                        />
                        <input
                            type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                            className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-[12px] text-stone-700 focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20 transition-all"
                        />
                    </div>
                </Row>

                {/* Seçenekler */}
                <Section title="Seçenekler" />
                <Row label="Alt klasörlere in" desc="Alt dizinler de taranır">
                    <Toggle value={recursive} onChange={setRecursive} />
                </Row>
                <Row label="Üzerine yaz" desc="Hedefte aynı isimli dosya varsa üstüne yaz">
                    <Toggle value={overwrite} onChange={setOverwrite} />
                </Row>

                {/* Eylemler */}
                <Section title="Eylem" />
                <div className="flex gap-3 pb-2">
                    <button
                        onClick={() => run(true)}
                        disabled={running}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-700 rounded-lg text-[12px] font-bold transition-colors"
                    >
                        {running ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}
                        Önizle
                    </button>
                    <button
                        onClick={() => run(false)}
                        disabled={running}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#D44B4B] hover:bg-[#b93c3c] disabled:opacity-40 text-white rounded-lg text-[12px] font-bold tracking-wide transition-colors"
                    >
                        {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                        Kopyala
                    </button>
                </div>

                {/* Sonuçlar */}
                {result && (
                    <>
                        <Section title="Sonuçlar" />
                        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mb-6">
                            <div className="flex items-center gap-4 px-4 py-3 border-b border-stone-100 bg-stone-50/80 flex-wrap">
                                <span className="text-[11px] font-bold text-stone-500">Bulunan: <span className="text-stone-700">{result.total_found}</span></span>
                                <span className="text-[11px] font-bold text-emerald-600">Kopyalanan: {result.total_copied}</span>
                                <span className="text-[11px] font-bold text-amber-500">Atlanan: {result.total_skipped}</span>
                                {result.total_error > 0 && <span className="text-[11px] font-bold text-red-500">Hata: {result.total_error}</span>}
                                {result.dry_run && (
                                    <span className="ml-auto text-[10px] font-bold text-[#378ADD] bg-[#378ADD]/10 px-2 py-0.5 rounded-full">Önizleme</span>
                                )}
                            </div>
                            <div className="divide-y divide-stone-50 max-h-72 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                                {result.files.map((f, i) => (
                                    <div key={i} className="flex items-center gap-3 px-4 py-2">
                                        {statusIcon(f.status)}
                                        <span className="text-[11px] text-stone-700 font-medium flex-1 truncate">{f.name}</span>
                                        <span className="text-[10px] text-stone-400 shrink-0 font-mono">{(f.size_bytes / 1024).toFixed(1)} KB</span>
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
