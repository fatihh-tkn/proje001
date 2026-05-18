import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
    Ruler, Search, X, Loader2, Grid, List, Upload, RefreshCw,
    Download, CheckCircle2, Clock,
    Scissors, Link2, FolderOpen, Cpu, Table2, Layers, Plus, Home,
    ChevronRight
} from 'lucide-react';

import { useErrorStore } from '../../../store/errorStore';
import { subscribeToDocProgress, fmtSize, getNestingIds } from './teknikresim/ArchiveHelpers';
import { EmptyAnalysisState, TeknikTable, _VA_SKIP, _humanizeKey } from './teknikresim/TeknikTableViewer';
import { TeknikKart, ListHeader, ListRow, FolderCard, FolderListRow } from './teknikresim/FileCardComponents';

/* ── Filtreler ───────────────────────────────────────────────────── */
const FILTERS = [
    { key: 'all',      label: 'Tümü' },
    { key: 'cad',      label: 'CAD',           icon: Cpu },
    { key: 'nesting',  label: 'Nesting',        icon: Scissors },
    { key: 'analyzed', label: 'Analiz Edildi', icon: CheckCircle2 },
    { key: 'pending',  label: 'Bekleyenler',   icon: Clock },
];

const DRAG_KEY = 'teknik/item';
let _localDragId = null;
const _getDragId = (e) => { try { return JSON.parse(e.dataTransfer.getData(DRAG_KEY))?.id; } catch { return null; } };

/* ── Yükleme slotu ───────────────────────────────────────────────── */
function FileSlot({ label, color, icon: Icon, file, onFile, inputRef, accept }) {
    const filled = {
        violet: 'bg-violet-50 border-violet-300',
        orange: 'bg-orange-50 border-orange-300',
        blue:   'bg-[#378ADD]/8 border-[#378ADD]/40',
    };
    const iconColor = { violet: 'text-violet-600', orange: 'text-orange-500', blue: 'text-[#378ADD]' };

    return (
        <div>
            <input ref={inputRef} type="file" accept={accept} className="hidden"
                onChange={e => onFile(e.target.files?.[0] || null)} />
            <div
                onClick={() => inputRef.current?.click()}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all
                    ${file ? filled[color] : 'border-stone-200 hover:border-stone-300 bg-stone-50'}`}
            >
                <div className={`p-2.5 rounded-xl shrink-0 ${file ? filled[color].split(' ')[0] : 'bg-white border border-stone-200'}`}>
                    <Icon size={16} className={file ? iconColor[color] : 'text-stone-400'} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-[12px] font-bold ${file ? iconColor[color] : 'text-stone-500'}`}>{label}</p>
                    {file
                        ? <p className="text-[11px] text-stone-500 truncate">{file.name} · {fmtSize(file.size)}</p>
                        : <p className="text-[11px] text-stone-400">Dosya seçmek için tıklayın</p>
                    }
                </div>
                {file ? (
                    <button
                        onClick={e => { e.stopPropagation(); onFile(null); if (inputRef.current) inputRef.current.value = ''; }}
                        className="shrink-0 p-1 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                        <X size={13} />
                    </button>
                ) : (
                    <Upload size={14} className="text-stone-300 shrink-0" />
                )}
            </div>
        </div>
    );
}

/* ── Yükleme Modalı ──────────────────────────────────────────────── */
function UploadModal({ onClose, onUploaded, onAnalysisDone }) {
    const [file,      setFile]      = useState(null);
    const [uploading, setUploading] = useState(false);
    const [progress,  setProgress]  = useState('');
    const [dragOver,  setDragOver]  = useState(false);
    const fileRef = useRef(null);

    const canUpload = !!file && !uploading;

    // Ctrl+V ile dosya yapıştırma
    useEffect(() => {
        const handlePaste = (e) => {
            if (uploading) return;
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
                if (item.kind === 'file') {
                    const f = item.getAsFile();
                    if (f) { setFile(f); break; }
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [uploading]);

    const handleUpload = async () => {
        if (!canUpload) return;
        setUploading(true);
        try {
            setProgress('Dosya yükleniyor…');
            const fd = new FormData();
            fd.append('file', file);
            fd.append('kategori', 'teknik_resim');
            const res  = await fetch('/api/archive/direct-upload', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.id) subscribeToDocProgress(data.id, file.name, onAnalysisDone);
            onUploaded();
            onClose();
        } catch {}
        finally { setUploading(false); setProgress(''); }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        if (uploading) return;
        const f = e.dataTransfer.files?.[0];
        if (f) setFile(f);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
             onDragOver={e => { e.preventDefault(); setDragOver(true); }}
             onDragLeave={() => setDragOver(false)}
             onDrop={handleDrop}>
            <div className={`bg-white rounded-2xl shadow-2xl border flex flex-col overflow-hidden w-[480px] transition-all
                ${dragOver ? 'border-[#378ADD] shadow-[0_0_0_4px_rgba(55,138,221,0.15)]' : 'border-stone-200'}`}>
                <div className="flex items-center gap-3 px-6 py-4 border-b border-stone-100">
                    <div className="p-2 rounded-xl bg-[#378ADD]/10">
                        <Upload size={16} className="text-[#378ADD]" />
                    </div>
                    <div className="flex-1">
                        <p className="text-[14px] font-bold text-stone-800">Teknik Dosya Yükle</p>
                        <p className="text-[11px] text-stone-400">PNG, JPEG veya PDF — yapay zeka ile otomatik analiz edilir</p>
                    </div>
                    <button onClick={onClose} disabled={uploading} className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 disabled:opacity-40">
                        <X size={14} />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-3">
                    {dragOver ? (
                        <div className="flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed border-[#378ADD] bg-[#378ADD]/5 text-[#378ADD]">
                            <Upload size={24} strokeWidth={1.5} />
                            <p className="text-[12px] font-bold">Dosyayı bırakın</p>
                        </div>
                    ) : (
                        <FileSlot label="Teknik Çizim veya Nesting Planı" color="blue" icon={Upload}
                            file={file} onFile={setFile} inputRef={fileRef} accept="*" />
                    )}
                    <p className="text-[10px] text-stone-400 text-center">
                        Dosya seçin · sürükleyip bırakın · veya <kbd className="px-1 py-0.5 bg-stone-100 rounded text-[9px] font-mono">Ctrl+V</kbd> ile yapıştırın
                    </p>
                    {uploading && progress && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-[#378ADD]/5 border border-[#378ADD]/20 rounded-lg text-[11px] text-[#378ADD] font-medium">
                            <Loader2 size={12} className="animate-spin" /> {progress}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-stone-100">
                    <button onClick={onClose} disabled={uploading} className="px-4 py-2 text-[12px] font-semibold text-stone-500 hover:text-stone-700 disabled:opacity-40">
                        İptal
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={!canUpload}
                        className="flex items-center gap-1.5 px-5 py-2 bg-[#378ADD] text-white text-[12px] font-bold rounded-xl hover:bg-[#2a6ab8] transition-colors disabled:opacity-50"
                    >
                        {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                        Yükle
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Klasör Yükleme Modalı ───────────────────────────────────────── */
function FolderUploadModal({ onClose, onUploaded, onAnalysisDone }) {
    const [files,         setFiles]         = useState([]);
    const [uploading,     setUploading]     = useState(false);
    const [progress,      setProgress]      = useState('');
    const [uploadedCount, setUploadedCount] = useState(0);
    const inputRef = useRef(null);

    const handleFilesChange = (e) => setFiles(Array.from(e.target.files));

    const getKategori = (name) => {
        const ext = name.split('.').pop()?.toLowerCase() || '';
        return ['png','jpg','jpeg','webp','bmp','gif','tiff','dwg','dxf','stp','step'].includes(ext)
            ? 'teknik_resim' : 'belgeler';
    };

    const handleUpload = async () => {
        if (!files.length || uploading) return;
        setUploading(true);
        setUploadedCount(0);
        try {
            const folderMap = {};

            // Tüm benzersiz dizin yollarını bul, derinliğe göre sırala
            const folderPaths = new Set();
            files.forEach(f => {
                const parts = f.webkitRelativePath.split('/');
                for (let i = 1; i < parts.length; i++) folderPaths.add(parts.slice(0, i).join('/'));
            });
            const sortedPaths = Array.from(folderPaths).sort((a, b) => a.split('/').length - b.split('/').length);

            // Klasörleri oluştur
            for (const path of sortedPaths) {
                const parts     = path.split('/');
                const name      = parts[parts.length - 1];
                const parentPth = parts.slice(0, -1).join('/');
                const parent_id = parentPth ? folderMap[parentPth] : null;
                setProgress(`Klasör: ${name}`);
                const res  = await fetch('/api/archive/create-folder', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, parent_id })
                });
                const data = await res.json();
                folderMap[path] = data.id;
            }

            // Dosyaları yükle
            let count = 0;
            for (const file of files) {
                const parts     = file.webkitRelativePath.split('/');
                const folderPth = parts.slice(0, -1).join('/');
                const folder_id = folderMap[folderPth] || null;
                setProgress(`${file.name} (${count + 1}/${files.length})`);
                const fd = new FormData();
                fd.append('file', file);
                fd.append('kategori', getKategori(file.name));
                if (folder_id) fd.append('folder_id', folder_id);
                const res  = await fetch('/api/archive/direct-upload', { method: 'POST', body: fd });
                const data = await res.json();
                if (data.id) subscribeToDocProgress(data.id, file.name, onAnalysisDone);
                count++;
                setUploadedCount(count);
            }

            onUploaded();
            onClose();
        } catch {}
        finally { setUploading(false); setProgress(''); }
    };

    const folderGroups = {};
    files.forEach(f => {
        const parts = f.webkitRelativePath.split('/');
        const key   = parts.slice(0, -1).join('/') || parts[0];
        if (!folderGroups[key]) folderGroups[key] = [];
        folderGroups[key].push(f);
    });
    const groupKeys    = Object.keys(folderGroups);
    const rootName     = files[0]?.webkitRelativePath.split('/')[0] || '';
    const progressPct  = files.length ? (uploadedCount / files.length) * 100 : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-[540px] max-h-[75vh] flex flex-col overflow-hidden">
                {/* Başlık */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-stone-100">
                    <div className="p-2 rounded-xl bg-[#378ADD]/10">
                        <FolderOpen size={16} className="text-[#378ADD]" />
                    </div>
                    <div className="flex-1">
                        <p className="text-[14px] font-bold text-stone-800">Klasör Yükle</p>
                        <p className="text-[11px] text-stone-400">Alt klasörler dahil tüm dosyalar yüklenir</p>
                    </div>
                    <button onClick={onClose} disabled={uploading} className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 disabled:opacity-40">
                        <X size={14} />
                    </button>
                </div>

                {/* İçerik */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                    {/* Seçici */}
                    <div
                        onClick={() => !uploading && inputRef.current?.click()}
                        className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 transition-all
                            ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#378ADD]/40 hover:bg-stone-50'}
                            ${files.length ? 'border-[#378ADD]/40 bg-[#378ADD]/5' : 'border-stone-200'}`}
                    >
                        <input ref={inputRef} type="file" webkitdirectory="" multiple className="hidden" onChange={handleFilesChange} />
                        <FolderOpen size={28} className={files.length ? 'text-[#378ADD]' : 'text-stone-300'} />
                        {files.length > 0 ? (
                            <div className="text-center">
                                <p className="text-[13px] font-bold text-stone-800">{rootName}</p>
                                <p className="text-[11px] text-stone-500 mt-0.5">{files.length} dosya · {groupKeys.length} klasör</p>
                            </div>
                        ) : (
                            <div className="text-center">
                                <p className="text-[13px] font-semibold text-stone-600">Klasör seçmek için tıklayın</p>
                                <p className="text-[11px] text-stone-400 mt-0.5">Tüm alt klasörler ve dosyalar yüklenecek</p>
                            </div>
                        )}
                    </div>

                    {/* Dosya önizlemesi */}
                    {files.length > 0 && !uploading && (
                        <div className="flex flex-col gap-1">
                            {groupKeys.slice(0, 8).map(key => (
                                <div key={key} className="flex items-center gap-2 px-3 py-2 bg-stone-50 rounded-lg border border-stone-100">
                                    <FolderOpen size={11} className="text-[#378ADD] shrink-0" />
                                    <span className="text-[11px] font-medium text-stone-600 flex-1 truncate">{key}</span>
                                    <span className="text-[10px] text-stone-400 shrink-0 tabular-nums">{folderGroups[key].length} dosya</span>
                                </div>
                            ))}
                            {groupKeys.length > 8 && (
                                <p className="text-[10px] text-stone-400 text-center py-1">+{groupKeys.length - 8} klasör daha…</p>
                            )}
                        </div>
                    )}

                    {/* İlerleme */}
                    {uploading && (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 px-3 py-2.5 bg-[#378ADD]/5 border border-[#378ADD]/20 rounded-lg text-[11px] text-[#378ADD] font-medium">
                                <Loader2 size={12} className="animate-spin shrink-0" />
                                <span className="flex-1 truncate">{progress}</span>
                                <span className="shrink-0 font-bold tabular-nums">{uploadedCount}/{files.length}</span>
                            </div>
                            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#378ADD] rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Alt */}
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-stone-100">
                    <button onClick={onClose} disabled={uploading} className="px-4 py-2 text-[12px] font-semibold text-stone-500 hover:text-stone-700 disabled:opacity-40">
                        İptal
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={!files.length || uploading}
                        className="flex items-center gap-1.5 px-5 py-2 bg-[#378ADD] text-white text-[12px] font-bold rounded-xl hover:bg-[#2a6ab8] transition-colors disabled:opacity-50"
                    >
                        {uploading ? <Loader2 size={13} className="animate-spin" /> : <FolderOpen size={13} />}
                        {uploading ? 'Yükleniyor…' : 'Yükle'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Dosya Bağlantı Modalı ───────────────────────────────────────── */
function LinkModal({ sourceItem, linkType, onClose, onLinked }) {
    const [uploading, setUploading] = useState(false);
    const [progress,  setProgress]  = useState('');
    const inputRef = useRef(null);

    const isViolet = linkType === 'cad';
    const label    = isViolet ? 'CAD Dosyası' : 'Nesting Dosyası';
    const cadTuru  = isViolet ? 'cad' : 'nesting';
    const Icon     = isViolet ? Cpu : Scissors;
    const ring     = isViolet ? 'border-violet-200 bg-violet-50' : 'border-orange-200 bg-orange-50';
    const iconCls  = isViolet ? 'text-violet-400' : 'text-orange-400';

    const handleFile = async (file) => {
        if (!file) { onClose(); return; }
        setUploading(true);
        setProgress('Yükleniyor…');
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('kategori', 'teknik_resim');
            fd.append('cad_turu', cadTuru);
            const res  = await fetch('/api/archive/direct-upload', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.id) subscribeToDocProgress(data.id, file.name);

            setProgress('Bağlanıyor…');
            await fetch('/api/archive/link', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ source_id: sourceItem.id, target_id: data.id, link_type: linkType }),
            });
            onLinked();
            onClose();
        } catch {}
        finally { setUploading(false); setProgress(''); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-[380px] flex flex-col overflow-hidden">
                <input ref={inputRef} type="file" accept="*" className="hidden"
                    onChange={e => handleFile(e.target.files?.[0] || null)} />

                {/* Başlık */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-100">
                    <div className={`p-2 rounded-xl ${isViolet ? 'bg-violet-50' : 'bg-orange-50'}`}>
                        <Icon size={16} className={iconCls} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-stone-800">{label} Bağla</p>
                        <p className="text-[11px] text-stone-400 truncate">← {sourceItem.filename}</p>
                    </div>
                    <button onClick={onClose} disabled={uploading} className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 disabled:opacity-40">
                        <X size={14} />
                    </button>
                </div>

                {/* İçerik */}
                {uploading ? (
                    <div className="flex items-center justify-center gap-3 py-10 text-[12px] text-stone-500">
                        <Loader2 size={18} className="animate-spin text-[#378ADD]" />
                        {progress}
                    </div>
                ) : (
                    <div
                        onClick={() => inputRef.current?.click()}
                        className="flex flex-col items-center justify-center gap-3 py-8 px-6 cursor-pointer hover:bg-stone-50 transition-colors"
                    >
                        <div className={`p-4 rounded-2xl border-2 border-dashed ${ring}`}>
                            <Upload size={26} className={iconCls} />
                        </div>
                        <div className="text-center">
                            <p className="text-[12px] font-bold text-stone-700">Dosya seçmek için tıklayın</p>
                            <p className="text-[11px] text-stone-400 mt-0.5">PNG, JPG, PDF, DWG, DXF, STP/STEP desteklenir</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


/* ── Excel indirme yardımcıları ─────────────────────────────────── */

function _setColWidths(ws, widths) {
    ws['!cols'] = widths.map(w => ({ wch: w }));
}

function _buildTeknikSheet(va) {
    if (!va) return XLSX.utils.aoa_to_sheet([['Analiz verisi yok']]);
    const rows = [];
    const _hv = v => v != null && String(v).trim() !== '' && String(v).trim() !== '-' && String(v).trim() !== '—' && String(v).trim() !== 'null';

    Object.entries(va).forEach(([key, val]) => {
        if (_VA_SKIP.has(key)) return;

        if (Array.isArray(val)) {
            const filtered = val.filter(i => i && (typeof i !== 'object' || Object.values(i).some(Boolean)));
            if (!filtered.length) return;
            rows.push([_humanizeKey(key).toUpperCase(), '']);
            filtered.forEach((item, idx) => {
                if (typeof item === 'object') {
                    const islem = item.islem || item.ad || item.name || '';
                    const sira  = item.sira || String(idx + 1);
                    const acik  = item.aciklama || item.description || '';
                    if (islem) rows.push([`${sira}. ${islem}`, acik]);
                    else {
                        Object.entries(item).forEach(([k, v]) => { if (_hv(v)) rows.push([_humanizeKey(k), String(v)]); });
                    }
                } else if (_hv(item)) {
                    rows.push([`${idx + 1}.`, String(item)]);
                }
            });
            rows.push([]);
            return;
        }

        if (val && typeof val === 'object') {
            const pairs = Object.entries(val).filter(([, v]) => _hv(v));
            if (!pairs.length) return;
            rows.push([_humanizeKey(key).toUpperCase(), '']);
            pairs.forEach(([k, v]) => rows.push([_humanizeKey(k), String(v)]));
            rows.push([]);
            return;
        }

        if (_hv(val)) rows.push([_humanizeKey(key), String(val)]);
    });

    if (!rows.length) rows.push(['Analiz verisi yok']);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    _setColWidths(ws, [26, 50]);
    return ws;
}

function downloadExcel(item, linkedItem) {
    const wb  = XLSX.utils.book_new();
    const va  = item.meta?.vision_analysis;
    const lva = linkedItem?.meta?.vision_analysis;

    if (va)  XLSX.utils.book_append_sheet(wb, _buildTeknikSheet(va),  'Analiz');
    if (lva) XLSX.utils.book_append_sheet(wb, _buildTeknikSheet(lva), 'Bağlı Dosya');
    if (!va && !lva) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Analiz verisi yok']]), 'Veri');

    const name = item.filename.replace(/\.[^.]+$/, '') + '_analiz.xlsx';
    XLSX.writeFile(wb, name);
}

/* ── Veri tablo modali ───────────────────────────────────────────── */
function DataTableModal({ item, allItems, onClose }) {
    const va    = item.meta?.vision_analysis;
    const bagli = item.meta?.bagli_dosyalar || {};

    const linkedId   = getNestingIds(bagli)[0] || bagli.cad || bagli.cizim;
    const linkedItem = linkedId ? (allItems || []).find(i => i.id === linkedId) : null;
    const lva        = linkedItem?.meta?.vision_analysis;

    const hasAny = !!va || !!lva;

    const [tab, setTab] = useState('self');

    const activeVa = tab === 'self' ? va : lva;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
            <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden"
                 style={{ width: '860px', height: '88vh' }}>

                {/* ── Başlık ── */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-stone-100 shrink-0">
                    <div className="p-2 rounded-xl bg-[#378ADD]/10">
                        <Table2 size={15} className="text-[#378ADD]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-stone-800 truncate">{item.filename}</p>
                        <p className="text-[10px] text-stone-400">Yapısal analiz verisi</p>
                    </div>

                    {/* Bağlı dosya varsa sekme */}
                    {linkedItem && (
                        <div className="flex items-center bg-stone-100 rounded-xl p-0.5 gap-0.5">
                            <button
                                onClick={() => setTab('self')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all
                                    ${tab === 'self' ? 'bg-white shadow text-[#378ADD]' : 'text-stone-400 hover:text-stone-600'}`}
                            >
                                <Ruler size={11} /> Bu Dosya
                            </button>
                            <button
                                onClick={() => setTab('linked')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all
                                    ${tab === 'linked' ? 'bg-white shadow text-[#378ADD]' : 'text-stone-400 hover:text-stone-600'}`}
                            >
                                <Link2 size={11} /> Bağlı Dosya
                            </button>
                        </div>
                    )}

                    <button onClick={onClose} className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors ml-1">
                        <X size={15} />
                    </button>
                </div>

                {/* ── İçerik ── */}
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    {!hasAny ? (
                        <div className="flex-1 overflow-y-auto minimal-scroll">
                            <EmptyAnalysisState status={item.meta?.transcription_status} va={va} visionError={item.meta?.vision_error} />
                        </div>
                    ) : (
                        <TeknikTable va={activeVa} />
                    )}
                </div>

                {/* ── Alt ── */}
                <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-t border-stone-100 shrink-0">
                    <button
                        onClick={() => downloadExcel(item, linkedItem)}
                        disabled={!hasAny}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white text-[12px] font-bold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-40"
                    >
                        <Download size={13} /> Excel İndir
                    </button>
                    <button onClick={onClose} className="px-4 py-2 text-[12px] font-semibold text-stone-500 hover:text-stone-700">
                        Kapat
                    </button>
                </div>
            </div>

        </div>
    );
}

/* ── Teknik Döküman Ajanı Modalı ─────────────────────────────────── */
function AjanModal({ item, onClose, onRefresh }) {
    const [progress,    setProgress]    = useState('');
    const [result,      setResult]      = useState('');
    const [loading,     setLoading]     = useState(false);
    const [activeAction,setActiveAction]= useState(null);
    const [queryInput,  setQueryInput]  = useState('');
    const abortRef = useRef(null);

    const run = async (action, q) => {
        if (loading) return;
        if (abortRef.current) abortRef.current.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        setActiveAction(action);
        setResult('');
        setProgress('Başlatılıyor…');
        setLoading(true);

        try {
            const res = await fetch('/api/archive/teknik-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ doc_id: item.id, action, query: q || undefined }),
                signal: ctrl.signal,
            });

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let streamed = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() ?? '';
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.type === 'progress') {
                            setProgress(data.text);
                        } else if (data.type === 'token') {
                            streamed += data.text;
                            setResult(streamed);
                        } else if (data.type === 'done') {
                            setLoading(false);
                            setProgress('');
                            if (!streamed) {
                                setResult(JSON.stringify(data.result, null, 2));
                            }
                            if (data.action === 'enrich' || data.action === 'analyze') {
                                if (onRefresh) onRefresh();
                            }
                        } else if (data.type === 'error') {
                            setLoading(false);
                            setProgress('');
                            setResult(`HATA: ${data.text}`);
                        }
                    } catch {}
                }
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                setResult(`Bağlantı hatası: ${err.message}`);
            }
            setLoading(false);
            setProgress('');
        }
    };

    const handleQuery = () => {
        const q = queryInput.trim();
        if (q) run('query', q);
    };

    const ACTIONS = [
        { key: 'summarize', label: 'Özet Üret',        title: 'Vision analiz verisinden Türkçe özet raporu oluştur' },
        { key: 'enrich',    label: 'Meta Zenginleştir', title: 'Açıklama, etiketler ve tip bilgisini otomatik doldur' },
        { key: 'analyze',   label: 'Yeniden Analiz',   title: 'Görseli vision AI ile yeniden analiz et ve DB\'ye kaydet' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
            <div
                className="bg-white rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden"
                style={{ width: '700px', height: '82vh' }}
            >
                {/* Başlık */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-stone-100 shrink-0">
                    <div className="p-2 rounded-xl bg-violet-100">
                        <Cpu size={15} className="text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-stone-800 truncate">{item.filename}</p>
                        <p className="text-[10px] text-stone-400">Teknik Döküman Ajanı</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors">
                        <X size={15} />
                    </button>
                </div>

                {/* Aksiyon butonları */}
                <div className="flex items-center gap-2 px-6 py-3 border-b border-stone-100 shrink-0">
                    {ACTIONS.map(({ key, label, title }) => (
                        <button
                            key={key}
                            onClick={() => run(key)}
                            disabled={loading}
                            title={title}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all disabled:opacity-50
                                ${activeAction === key && loading
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-stone-100 text-stone-700 hover:bg-violet-100 hover:text-violet-700'}`}
                        >
                            {activeAction === key && loading && <Loader2 size={11} className="animate-spin" />}
                            {label}
                        </button>
                    ))}
                </div>

                {/* Soru girişi */}
                <div className="flex items-center gap-2 px-6 py-2.5 border-b border-stone-100 shrink-0">
                    <input
                        value={queryInput}
                        onChange={e => setQueryInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleQuery(); } }}
                        placeholder="Belge hakkında soru sor… (ör: malzeme kalınlığı nedir?)"
                        disabled={loading}
                        className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-[11px] text-stone-700 placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-violet-300 focus:ring-1 focus:ring-violet-200 transition-all disabled:opacity-60"
                    />
                    <button
                        onClick={handleQuery}
                        disabled={!queryInput.trim() || loading}
                        className="flex items-center gap-1 px-3 py-2 bg-violet-600 text-white text-[11px] font-bold rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-40"
                    >
                        {activeAction === 'query' && loading
                            ? <Loader2 size={11} className="animate-spin" />
                            : <Search size={11} />}
                        Sor
                    </button>
                </div>

                {/* Sonuç alanı */}
                <div className="flex-1 overflow-y-auto px-6 py-4 minimal-scroll">
                    {progress && !result && (
                        <div className="flex items-center gap-2 text-[12px] text-violet-500">
                            <Loader2 size={13} className="animate-spin" />
                            <span>{progress}</span>
                        </div>
                    )}
                    {result ? (
                        <pre className="text-[12px] text-stone-700 leading-relaxed whitespace-pre-wrap bg-stone-50 rounded-xl p-4 border border-stone-200 font-[inherit]">
                            {result}
                        </pre>
                    ) : !progress && (
                        <div className="flex flex-col items-center justify-center h-48 gap-3 text-stone-400">
                            <Cpu size={32} strokeWidth={1} />
                            <p className="text-[12px] font-medium text-center">Bir aksiyon seçin veya soru yazın</p>
                            <p className="text-[11px] text-stone-300 text-center max-w-[280px] leading-relaxed">
                                Özet üretmek, meta veri doldurmak veya belgeyi sorgulamak için yukarıdaki seçenekleri kullanın
                            </p>
                        </div>
                    )}
                </div>

                {/* Alt bar */}
                <div className="flex items-center justify-end px-6 py-3 border-t border-stone-100 shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-[12px] font-semibold text-stone-500 hover:text-stone-700">
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Ana bileşen ─────────────────────────────────────────────────── */
export default function TeknikResimViewer({ onOpenFile }) {
    const [items,      setItems]      = useState([]);
    const [allFolders, setAllFolders] = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [search,     setSearch]     = useState('');
    const [filter,     setFilter]     = useState('all');
    const [view,       setView]       = useState('grid');
    const [currentFolderId,   setCurrentFolderId]   = useState(null);
    const [newFolderName,     setNewFolderName]     = useState('');
    const [isCreatingFolder,  setIsCreatingFolder]  = useState(false);
    const [draggingId,   setDraggingId]   = useState(null);
    const [vectorizing,  setVectorizing]  = useState(null);
    const [uploadModal,       setUploadModal]       = useState(false);
    const [folderUploadModal, setFolderUploadModal] = useState(false);
    const [relinking,    setRelinking]    = useState(false);
    const [linkModal,    setLinkModal]    = useState(null);
    const [detailItem,   setDetailItem]   = useState(null);
    const [ajanModal,    setAjanModal]    = useState(null);

    const TEKNIK_EXTS = new Set(['png','jpg','jpeg','webp','bmp','gif','tiff','pdf','dwg','dxf','stp','step']);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/archive/list');
            if (res.ok) {
                const data = await res.json();
                const all = data.items || [];
                setAllFolders(all.filter(i => i.file_type === 'folder'));
                const imgs = all
                    .filter(i => TEKNIK_EXTS.has((i.file_type || '').toLowerCase()))
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                setItems(imgs);
            }
        } catch {}
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    /* Polling: işlemdeki dosyaları kontrol et */
    useEffect(() => {
        const processing = items.filter(i => i.meta?.transcription_status === 'processing');
        if (!processing.length) return;
        const t = setTimeout(load, 4000);
        return () => clearTimeout(t);
    }, [items, load]);

    const filtered = items.filter(i => {
        // Arama yoksa mevcut klasör filtresi uygula
        if (!search.trim()) {
            const inFolder = currentFolderId === null ? !i.folder_id : i.folder_id === currentFolderId;
            if (!inFolder) return false;
        }
        // Bağlı nesting çocukları ana karttan erişilebilir, ayrıca gösterme
        if (i.meta?.bagli_dosyalar?.cizim) return false;
        if (search.trim() && !i.filename.toLowerCase().includes(search.toLowerCase())) return false;
        const va = i.meta?.vision_analysis;
        const status = i.meta?.transcription_status;
        if (filter === 'cad')      return i.meta?.cad_turu === 'cad';
        if (filter === 'nesting')  return i.meta?.cad_turu === 'nesting';
        if (filter === 'analyzed') return !!va;
        if (filter === 'pending')  return !va && status !== 'processing';
        return true;
    });

    const counts = {
        all:      items.length,
        cad:      items.filter(i => i.meta?.cad_turu === 'cad').length,
        nesting:  items.filter(i => i.meta?.cad_turu === 'nesting').length,
        analyzed: items.filter(i => !!i.meta?.vision_analysis).length,
        pending:  items.filter(i => !i.meta?.vision_analysis && i.meta?.transcription_status !== 'processing').length,
    };

    const handleOpen = (item) => {
        if (!onOpenFile) return;
        onOpenFile({
            id:    `img-${item.id}`,
            title: item.filename,
            type:  'image-viewer',
            url:   `/api/archive/file/${item.id}`,
            meta:  { docId: item.id },
        });
    };

    const handleOpenLinked = useCallback((linkedId) => {
        if (!onOpenFile) return;
        // Bağlı dosyanın meta'sını items'tan bul; yoksa genel bir tab aç
        const linked = items.find(i => i.id === linkedId);
        const ext = linked?.file_type || '';
        const IMAGE_EXT = new Set(['png','jpg','jpeg','webp','bmp','gif','tiff']);
        const type = IMAGE_EXT.has(ext) ? 'image-viewer'
            : ['pdf'].includes(ext) ? 'pdf'
            : ['docx','doc'].includes(ext) ? 'docx'
            : ['xlsx','xls'].includes(ext) ? 'xls'
            : 'archive-docs';
        onOpenFile({
            id:    `linked-${linkedId}`,
            title: linked?.filename || 'Bağlı Dosya',
            type,
            url:   `/api/archive/file/${linkedId}`,
            meta:  { docId: linkedId },
        });
    }, [items, onOpenFile]);

    const handleUnlink = useCallback(async (sourceId, linkType) => {
        await fetch(`/api/archive/link?source_id=${sourceId}&link_type=${linkType}`, { method: 'DELETE' });
        load();
    }, [load]);

    const handleVectorize = async (item) => {
        setVectorizing(item.id);
        try {
            const res = await fetch(`/api/archive/vectorize/${item.id}`, { method: 'POST' });
            if (res.ok) subscribeToDocProgress(item.id, item.filename, load);
        } catch {}
        finally { setVectorizing(null); }
    };

    const handleDelete = useCallback(async (item) => {
        try {
            await fetch(`/api/archive/documents/${item.id}`, { method: 'DELETE' });
            load();
        } catch {}
    }, [load]);

    // Öğeyi klasöre taşı (null = root)
    const handleMove = useCallback(async (itemId, targetFolderId) => {
        if (!itemId || itemId === targetFolderId) return;
        setDraggingId(null);
        try {
            await fetch('/api/archive/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ belge_kimlik: itemId, hedef_klasor_kimlik: targetFolderId }),
            });
            load();
        } catch {}
    }, [load]);

    // Klasör oluştur (currentFolderId'e göre parent belirlenir)
    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            await fetch('/api/archive/create-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newFolderName.trim(), parent_id: currentFolderId })
            });
            load();
        } catch {}
        setIsCreatingFolder(false);
        setNewFolderName('');
    };

    // Mevcut klasördeki klasörler
    const currentFolders = allFolders.filter(f =>
        currentFolderId === null ? !f.folder_id : f.folder_id === currentFolderId
    );

    // Breadcrumb: root'tan currentFolderId'e kadar zincir
    const breadcrumb = (() => {
        if (!currentFolderId) return [];
        const crumbs = [];
        let cur = currentFolderId;
        while (cur) {
            const f = allFolders.find(x => x.id === cur);
            if (!f) break;
            crumbs.unshift({ id: f.id, name: f.filename });
            cur = f.folder_id || null;
        }
        return crumbs;
    })();

    // Mevcut klasörün derinliği (yeni klasör için etiket)
    const currentDepth = breadcrumb.length;

    const processingCount = items.filter(i => i.meta?.transcription_status === 'processing').length;

    return (
        <>
        {detailItem && (
            <DataTableModal
                item={items.find(i => i.id === detailItem.id) || detailItem}
                allItems={items}
                onClose={() => setDetailItem(null)}
            />
        )}
        {ajanModal && (
            <AjanModal
                item={items.find(i => i.id === ajanModal.id) || ajanModal}
                onClose={() => setAjanModal(null)}
                onRefresh={load}
            />
        )}
        {uploadModal && (
            <UploadModal onClose={() => setUploadModal(false)} onUploaded={load} onAnalysisDone={load} />
        )}
        {folderUploadModal && (
            <FolderUploadModal onClose={() => setFolderUploadModal(false)} onUploaded={load} onAnalysisDone={load} />
        )}
        {linkModal && (
            <LinkModal
                sourceItem={linkModal.item}
                linkType={linkModal.linkType}
                onClose={() => setLinkModal(null)}
                onLinked={load}
            />
        )}
        <div className="flex flex-col h-full w-full bg-stone-50 font-sans overflow-hidden">

            {/* ── BAŞLIK ──────────────────────────────────────── */}
            <div className="flex-none bg-white border-b border-stone-200">
                <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-3.5">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-[#378ADD]/10 rounded-xl shrink-0 relative">
                            <Ruler size={20} className="text-[#378ADD]" strokeWidth={2} />
                            {processingCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                                    {processingCount}
                                </span>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-[20px] font-black text-stone-900 tracking-tight">Teknik Resimler</h1>
                                <span className="text-[11px] font-bold bg-stone-100 text-stone-500 px-2 py-0.5 rounded tabular-nums font-mono">
                                    {items.length}
                                </span>
                                {counts.teknik > 0 && (
                                    <span className="text-[11px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full tabular-nums border border-emerald-200">
                                        {counts.teknik} analiz
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-stone-400 font-medium mt-0.5">
                                Mühendislik çizimleri, imalat resimleri, teknik şemalar
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={load}
                            className="p-2 rounded-xl bg-stone-100 text-stone-500 hover:bg-stone-200 transition-colors"
                            title="Yenile"
                        >
                            <RefreshCw size={14} />
                        </button>

                        <button
                            onClick={async () => {
                                setRelinking(true);
                                try {
                                    const res = await fetch('/api/archive/relink-all', { method: 'POST' });
                                    const d = await res.json();
                                    if (d.linked > 0) {
                                        load();
                                        useErrorStore.getState().addToast({ type: 'success', message: `${d.linked} dosya eşleştirildi`, duration: 4000 });
                                    } else {
                                        useErrorStore.getState().addToast({ type: 'info', message: 'Yeni eşleşme bulunamadı', duration: 3000 });
                                    }
                                } catch {
                                    useErrorStore.getState().addToast({ type: 'error', message: 'Eşleştirme hatası', duration: 4000 });
                                } finally {
                                    setRelinking(false);
                                }
                            }}
                            disabled={relinking}
                            className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 text-stone-600 text-[12px] font-semibold rounded-xl hover:bg-violet-50 hover:text-violet-600 transition-colors disabled:opacity-50"
                            title="Bağlanmamış dosyaları otomatik eşleştir"
                        >
                            {relinking ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
                            Eşleştir
                        </button>

                        <button
                            onClick={() => setFolderUploadModal(true)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-stone-100 text-stone-700 text-[12px] font-bold rounded-xl hover:bg-[#378ADD]/10 hover:text-[#378ADD] transition-colors"
                            title="Klasör olarak yükle"
                        >
                            <FolderOpen size={14} /> Klasör
                        </button>

                        <button
                            onClick={() => setUploadModal(true)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#378ADD] text-white text-[12px] font-bold rounded-xl hover:bg-[#2a6ab8] transition-colors"
                        >
                            <Upload size={14} /> Yükle
                        </button>
                    </div>
                </div>

                {/* Breadcrumb + Yeni Klasör */}
                <div className="flex items-center gap-2 px-6 pb-2.5">
                    <button
                        onClick={() => setCurrentFolderId(null)}
                        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('!text-[#378ADD]', 'underline'); }}
                        onDragLeave={e => { e.currentTarget.classList.remove('!text-[#378ADD]', 'underline'); }}
                        onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('!text-[#378ADD]', 'underline'); const id = _getDragId(e); if (id) handleMove(id, null); }}
                        className={`flex items-center gap-1 text-[11px] font-semibold transition-colors rounded px-1 ${currentFolderId ? 'text-[#378ADD] hover:text-[#2a6ab8]' : 'text-stone-400 cursor-default'}`}
                    >
                        <Home size={11} /> Teknik Resimler
                    </button>
                    {breadcrumb.map((crumb, i) => (
                        <React.Fragment key={crumb.id}>
                            <ChevronRight size={11} className="text-stone-300 shrink-0" />
                            <button
                                onClick={() => setCurrentFolderId(crumb.id)}
                                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('!text-[#378ADD]', 'underline'); }}
                                onDragLeave={e => { e.currentTarget.classList.remove('!text-[#378ADD]', 'underline'); }}
                                onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('!text-[#378ADD]', 'underline'); const id = _getDragId(e); if (id) handleMove(id, crumb.id); }}
                                className={`text-[11px] font-semibold transition-colors rounded px-1 ${i === breadcrumb.length - 1 ? 'text-stone-700 cursor-default' : 'text-[#378ADD] hover:text-[#2a6ab8]'}`}
                            >
                                {crumb.name}
                            </button>
                        </React.Fragment>
                    ))}
                    <div className="flex-1" />
                    {isCreatingFolder ? (
                        <div className="flex items-center gap-1.5">
                            <input
                                autoFocus
                                value={newFolderName}
                                onChange={e => setNewFolderName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { setIsCreatingFolder(false); setNewFolderName(''); }}}
                                placeholder={currentDepth === 0 ? 'Mamul adı…' : 'Alt bileşen adı…'}
                                className="w-44 px-2.5 py-1 text-[11px] border border-[#378ADD]/40 rounded-lg outline-none focus:ring-1 focus:ring-[#378ADD]/30 bg-white"
                            />
                            <button onClick={handleCreateFolder} className="px-2.5 py-1 bg-[#378ADD] text-white text-[11px] font-bold rounded-lg hover:bg-[#2a6ab8] transition-colors">
                                Ekle
                            </button>
                            <button onClick={() => { setIsCreatingFolder(false); setNewFolderName(''); }} className="px-2 py-1 text-[11px] text-stone-400 hover:text-stone-600">
                                İptal
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsCreatingFolder(true)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-stone-500 hover:text-[#378ADD] hover:bg-[#378ADD]/5 rounded-lg transition-colors border border-dashed border-stone-300 hover:border-[#378ADD]/40"
                        >
                            <Plus size={11} />
                            {currentDepth === 0 ? 'Yeni Mamul' : 'Alt Bileşen Ekle'}
                        </button>
                    )}
                </div>

                {/* Filtreler + Arama */}
                <div className="flex items-center gap-3 px-6 pb-3.5">
                    <div className="relative w-[300px] shrink-0">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="çizim adı, numarası, başlık..."
                            className="w-full pl-8 pr-10 py-2 bg-stone-50 border border-stone-200 rounded-lg text-[11px] text-stone-700 placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20 transition-all"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                                <X size={11} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-1 ml-auto">
                        {FILTERS.map(f => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all duration-150 shrink-0 border
                                    ${filter === f.key
                                        ? 'bg-white border-[#378ADD]/30 text-[#378ADD] font-bold shadow-sm'
                                        : 'border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-100'}`}
                            >
                                {f.icon && <f.icon size={11} strokeWidth={2} />}
                                {f.label}
                                <span className={`text-[10px] font-bold tabular-nums font-mono px-1.5 py-0.5 rounded
                                    ${filter === f.key
                                        ? 'bg-[#378ADD]/10 text-[#378ADD]'
                                        : 'bg-stone-100 text-stone-400'}`}>
                                    {counts[f.key]}
                                </span>
                            </button>
                        ))}
                        <div className="w-px h-5 bg-stone-200 mx-1.5 shrink-0" />
                        <button onClick={() => setView('list')} className={`p-1.5 rounded-lg transition-all ${view === 'list' ? 'bg-stone-200 text-stone-700' : 'text-stone-400 hover:bg-stone-100'}`} title="Liste görünümü"><List size={14} /></button>
                        <button onClick={() => setView('grid')} className={`p-1.5 rounded-lg transition-all ${view === 'grid' ? 'bg-stone-200 text-stone-700' : 'text-stone-400 hover:bg-stone-100'}`} title="Kart görünümü"><Grid size={14} /></button>
                    </div>
                </div>
            </div>

            {/* ── İÇERİK ───────────────────────────────────────── */}
            <div
                className="flex-1 overflow-y-auto px-6 py-5 minimal-scroll"
                onDragStart={() => { if (_localDragId) setDraggingId(_localDragId); }}
                onDragEnd={() => { setDraggingId(null); _localDragId = null; }}
            >
                {loading ? (
                    <div className="flex items-center justify-center h-48 gap-2 text-stone-400">
                        <Loader2 size={20} className="animate-spin text-[#378ADD]" />
                        <span className="text-[12px] font-medium">Yükleniyor...</span>
                    </div>
                ) : (currentFolders.length === 0 && filtered.length === 0) ? (
                    <EmptyState search={search} filter={filter} onUpload={() => setUploadModal(true)} />
                ) : view === 'grid' ? (
                    <div className="flex flex-col gap-6">
                        {/* Klasörler */}
                        {!search && currentFolders.length > 0 && (
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">
                                    {currentDepth === 0 ? 'Mamuller' : 'Alt Bileşenler'}
                                </p>
                                <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-4">
                                    {currentFolders.map(f => (
                                        <FolderCard
                                            key={f.id}
                                            folder={f}
                                            depth={currentDepth}
                                            onClick={() => setCurrentFolderId(f.id)}
                                            onDelete={handleDelete}
                                            draggingId={draggingId}
                                            onDrop={handleMove}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* Dosyalar */}
                        {filtered.length > 0 && (
                            <div>
                                {!search && currentFolders.length > 0 && (
                                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Dosyalar</p>
                                )}
                                <div className="grid grid-cols-2 gap-4 xl:grid-cols-3 2xl:grid-cols-4">
                                    {filtered.map(item => (
                                        <TeknikKart
                                            key={item.id}
                                            item={item}
                                            allItems={items}
                                            onOpen={handleOpen}
                                            onVectorize={handleVectorize}
                                            vectorizing={vectorizing}
                                            onOpenLinked={handleOpenLinked}
                                            onStartLink={(it, lt) => setLinkModal({ item: it, linkType: lt })}
                                            onUnlink={handleUnlink}
                                            onDetail={setDetailItem}
                                            onAjan={setAjanModal}
                                            onDelete={handleDelete}
                                            draggingId={draggingId}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                        {/* Klasör satırları */}
                        {!search && currentFolders.map(f => (
                            <FolderListRow
                                key={f.id}
                                folder={f}
                                depth={currentDepth}
                                onClick={() => setCurrentFolderId(f.id)}
                                onDelete={handleDelete}
                                draggingId={draggingId}
                                onDrop={handleMove}
                            />
                        ))}
                        {/* Dosya satırları */}
                        {filtered.length > 0 && (
                            <>
                                <ListHeader />
                                {filtered.map(item => (
                                    <ListRow
                                        key={item.id}
                                        item={item}
                                        allItems={items}
                                        onOpen={handleOpen}
                                        onVectorize={handleVectorize}
                                        vectorizing={vectorizing}
                                        onOpenLinked={handleOpenLinked}
                                        onStartLink={(it, lt) => setLinkModal({ item: it, linkType: lt })}
                                        onUnlink={handleUnlink}
                                        onDetail={setDetailItem}
                                        onAjan={setAjanModal}
                                        onDelete={handleDelete}
                                        draggingId={draggingId}
                                    />
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
        </>
    );
}

/* ── Boş durum ───────────────────────────────────────────────────── */
function EmptyState({ search, filter, onUpload }) {
    if (search) {
        return (
            <div className="flex flex-col items-center justify-center h-56 gap-3">
                <div className="p-4 rounded-2xl bg-stone-100">
                    <Search size={28} strokeWidth={1.5} className="text-stone-400" />
                </div>
                <div className="text-center">
                    <p className="text-[13px] font-bold text-stone-600">Sonuç bulunamadı</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">"{search}" ile eşleşen çizim yok</p>
                </div>
            </div>
        );
    }
    if (filter !== 'all') {
        return (
            <div className="flex flex-col items-center justify-center h-56 gap-3">
                <div className="p-4 rounded-2xl bg-stone-100">
                    <Layers size={28} strokeWidth={1.5} className="text-stone-400" />
                </div>
                <div className="text-center">
                    <p className="text-[13px] font-bold text-stone-600">Bu filtrede kayıt yok</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">Farklı bir filtre seçin veya yeni dosya yükleyin</p>
                </div>
            </div>
        );
    }
    return (
        <div className="flex flex-col items-center justify-center h-72 gap-5">
            <div className="relative">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#378ADD]/15 to-[#378ADD]/5 flex items-center justify-center border-2 border-dashed border-[#378ADD]/25">
                    <Ruler size={44} strokeWidth={1.2} className="text-[#378ADD]/60" />
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-xl bg-[#378ADD] flex items-center justify-center shadow-lg">
                    <Upload size={14} className="text-white" />
                </div>
            </div>
            <div className="text-center">
                <p className="text-[15px] font-bold text-stone-700">Teknik çizim yok</p>
                <p className="text-[12px] text-stone-400 mt-1 max-w-[260px] leading-relaxed">
                    PNG, JPG, PDF, DWG veya DXF formatındaki mühendislik çizimlerini yükleyin
                </p>
            </div>
            <button
                onClick={onUpload}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#378ADD] text-white text-[13px] font-bold rounded-xl hover:bg-[#2a6ab8] transition-colors shadow-sm hover:shadow-md"
            >
                <Upload size={14} /> İlk çizimi yükle
            </button>
        </div>
    );
}
