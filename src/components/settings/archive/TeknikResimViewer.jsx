import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import {
    Ruler, Search, X, Loader2, Grid, List, Upload, RefreshCw,
    Download, Eye, AlertTriangle, CheckCircle2, Clock, ScanLine,
    Layers, FileText, Table2, Cpu, Scissors, Link2, Link2Off,
    FolderOpen, ExternalLink, Trash2, ChevronRight, Plus, Home
} from 'lucide-react';

import { useErrorStore } from '../../../store/errorStore';

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tiff']);
const isImage = t => IMAGE_EXTS.has((t || '').toLowerCase());

/* ── Belge işleme ilerlemesini SSE üzerinden toast'a yansıt ─────────── */
function subscribeToDocProgress(docId, filename, onDone) {
    const { addToast, updateToast, replaceToast } = useErrorStore.getState();

    const short = filename.length > 28 ? filename.slice(0, 25) + '…' : filename;

    const toastId = addToast({
        type: 'loading',
        message: `${short} — işleme alındı`,
        duration: 0,
        skipDedupe: true,
    });

    const es = new EventSource(`/api/archive/progress/${docId}`);

    es.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            if (data.done) {
                es.close();
                replaceToast(toastId, { type: 'success', message: `${short} — ${data.step}`, duration: 5000 });
                if (onDone) onDone();
            } else if (data.error) {
                es.close();
                replaceToast(toastId, { type: 'error', message: `${short} — ${data.step}`, duration: 7000 });
                if (onDone) onDone();
            } else {
                updateToast(toastId, { message: `${short} — ${data.step}` });
            }
        } catch {}
    };

    es.onerror = () => es.close();
}

function fmtSize(b) {
    if (!b) return null;
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
function fmtDate(s) {
    return new Date(s).toLocaleDateString('tr', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── Sağ tık menüsü ─────────────────────────────────────────────── */
function ContextMenu({ x, y, item, onDelete, onClose }) {
    const ref = useRef(null);
    const [pos, setPos] = useState({ top: y, left: x, opacity: 0 });

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) onClose();
        };
        document.addEventListener('mousedown', handler);
        document.addEventListener('contextmenu', handler);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('contextmenu', handler);
        };
    }, [onClose]);

    // İmleç köşede kalacak şekilde flip
    useEffect(() => {
        if (!ref.current) return;
        const { offsetWidth: w, offsetHeight: h } = ref.current;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        setPos({
            top:     y + h > vh ? y - h : y,
            left:    x + w > vw ? x - w : x,
            opacity: 1,
        });
    }, [x, y]);

    return createPortal(
        <div
            ref={ref}
            className="fixed z-[9999] bg-white border border-stone-200 rounded-xl shadow-2xl overflow-hidden py-1 min-w-[160px]"
            style={{ top: pos.top, left: pos.left, opacity: pos.opacity }}
        >
            <button
                onClick={() => { onDelete(item); onClose(); }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12px] font-semibold text-red-500 hover:bg-red-50 transition-colors"
            >
                <Trash2 size={13} /> Sil
            </button>
        </div>,
        document.body
    );
}

/* ── Durum rozeti ────────────────────────────────────────────────── */
function StatusBadge({ item }) {
    const status  = item.meta?.transcription_status;
    const va      = item.meta?.vision_analysis;
    const imgType = va?.image_type;

    if (status === 'processing') return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-bold rounded border border-amber-200">
            <Loader2 size={8} className="animate-spin" /> İŞLEMDE
        </span>
    );
    if (imgType === 'teknik_resim') return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-bold rounded border border-emerald-200">
            <CheckCircle2 size={8} /> TEKNİK RESİM
        </span>
    );
    if (imgType === 'nesting') return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-50 text-orange-600 text-[9px] font-bold rounded border border-orange-200">
            <Scissors size={8} /> NESTİNG
        </span>
    );
    if (va) return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#378ADD]/10 text-[#378ADD] text-[9px] font-bold rounded border border-[#378ADD]/20">
            <ScanLine size={8} /> ANALİZ EDİLDİ
        </span>
    );
    if (status === 'done') return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-stone-100 text-stone-500 text-[9px] font-bold rounded border border-stone-200">
            <FileText size={8} /> VEKTÖRİZE
        </span>
    );
    if (status === 'pending') return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-stone-50 text-stone-400 text-[9px] font-bold rounded border border-stone-200">
            <Clock size={8} /> BEKLİYOR
        </span>
    );
    if (status === 'failed') return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-50 text-red-500 text-[9px] font-bold rounded border border-red-200">
            <AlertTriangle size={8} /> HATA
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-stone-50 text-stone-300 text-[9px] font-bold rounded border border-stone-100">
            <AlertTriangle size={8} /> ANALİZ YOK
        </span>
    );
}

/* ── CAD / Nesting rozeti ────────────────────────────────────────── */
function CadBadge({ item }) {
    const t = item.meta?.cad_turu;
    if (t === 'cad') return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-violet-50 text-violet-600 text-[9px] font-bold rounded border border-violet-200">
            <Cpu size={8} /> CAD
        </span>
    );
    if (t === 'nesting') return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-50 text-orange-500 text-[9px] font-bold rounded border border-orange-200">
            <Scissors size={8} /> NES
        </span>
    );
    return null;
}

/* ── Yükleme slotu ───────────────────────────────────────────────── */
function FileSlot({ label, color, icon: Icon, file, onFile, inputRef, accept }) {
    const filled = {
        violet: 'bg-violet-50 border-violet-300',
        orange: 'bg-orange-50 border-orange-300',
    };
    const iconColor = { violet: 'text-violet-600', orange: 'text-orange-500' };

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
    const [cizimFile,   setCizimFile]   = useState(null);
    const [nestingFile, setNestingFile] = useState(null);
    const [uploading,   setUploading]   = useState(false);
    const [progress,    setProgress]    = useState('');
    const cizimRef  = useRef(null);
    const nestingRef = useRef(null);

    const canUpload = (!!cizimFile || !!nestingFile) && !uploading;

    const handleUpload = async () => {
        if (!canUpload) return;
        setUploading(true);
        try {
            let cizimId   = null;
            let nestingId = null;

            if (cizimFile) {
                setProgress('Teknik çizim yükleniyor…');
                const fd = new FormData();
                fd.append('file', cizimFile);
                fd.append('kategori', 'teknik_resim');
                fd.append('cad_turu', 'cad');
                const res  = await fetch('/api/archive/direct-upload', { method: 'POST', body: fd });
                const data = await res.json();
                cizimId = data.id;
                if (cizimId) subscribeToDocProgress(cizimId, cizimFile.name, onAnalysisDone);
            }

            if (nestingFile) {
                setProgress('Nesting yükleniyor…');
                const fd = new FormData();
                fd.append('file', nestingFile);
                fd.append('kategori', 'teknik_resim');
                fd.append('cad_turu', 'nesting');
                const res  = await fetch('/api/archive/direct-upload', { method: 'POST', body: fd });
                const data = await res.json();
                nestingId = data.id;
                if (nestingId) subscribeToDocProgress(nestingId, nestingFile.name, onAnalysisDone);
            }

            if (cizimId && nestingId) {
                setProgress('Dosyalar bağlanıyor…');
                await fetch('/api/archive/link', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ source_id: cizimId, target_id: nestingId, link_type: 'nesting' }),
                });
            }

            onUploaded();
            onClose();
        } catch {}
        finally { setUploading(false); setProgress(''); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-[520px] flex flex-col overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-stone-100">
                    <div className="p-2 rounded-xl bg-[#378ADD]/10">
                        <Upload size={16} className="text-[#378ADD]" />
                    </div>
                    <div className="flex-1">
                        <p className="text-[14px] font-bold text-stone-800">Teknik Dosya Yükle</p>
                        <p className="text-[11px] text-stone-400">Teknik çizim ve/veya nesting planını birlikte yükleyin</p>
                    </div>
                    <button onClick={onClose} disabled={uploading} className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 disabled:opacity-40">
                        <X size={14} />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-3">
                    <FileSlot label="Teknik Çizim" color="violet" icon={Cpu}
                        file={cizimFile} onFile={setCizimFile} inputRef={cizimRef} accept="*" />
                    <FileSlot label="Nesting Planı" color="orange" icon={Scissors}
                        file={nestingFile} onFile={setNestingFile} inputRef={nestingRef} accept="*" />
                    {cizimFile && nestingFile && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-600 font-medium">
                            <Link2 size={12} /> İki dosya otomatik olarak birbirine bağlanacak
                        </div>
                    )}
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
    const bb   = va?.baslik_bloku || {};
    const rows = [];

    /* ── BAŞLIK BLOĞU ── */
    rows.push(['BAŞLIK BLOĞU', '']);
    [
        ['Çizim No',      bb.cizim_numarasi],
        ['Kimlik No',     bb.kimlik_numarasi],
        ['Başlık',        bb.baslik],
        ['Firma',         bb.firma],
        ['Proje',         bb.proje],
        ['Revizyon',      bb.revizyon],
        ['Ölçek',         bb.olcek],
        ['Tarih',         bb.tarih],
        ['Çizen',         bb.cizen],
        ['Onaylayan',     bb.onaylayan],
        ['Kontrol Eden',  bb.kontrol_eden],
        ['Malzeme',       bb.malzeme],
        ['Yüzey İşlemi',  bb.yuzey_islem],
        ['Sertlik',       bb.sertlik],
        ['Ağırlık',       bb.agirlik],
        ['Birim',         bb.birim],
        ['Format',        bb.blatt_format],
        ['Sayfa',         bb.sayfa],
    ].forEach(([k, v]) => { if (v) rows.push([k, String(v)]); });

    /* ── PARÇA LİSTESİ ── */
    rows.push([]);
    rows.push(['PARÇA LİSTESİ', '', '', '', '', '']);
    rows.push(['Poz', 'Adet', 'Çizim No', 'Malzeme', 'Yarı Mamul', 'Açıklama']);
    (va?.parca_listesi || []).forEach(p => rows.push([
        p.poz || '', p.adet || '', p.cizim_no || '',
        p.malzeme || '', p.yarim_mamul || '', p.aciklama || '',
    ]));

    /* ── ÖLÇÜLER ── */
    if (va?.olcular?.length) {
        rows.push([]); rows.push(['ÖLÇÜLER', '', '', '', '']);
        if (typeof va.olcular[0] === 'object') {
            rows.push(['Etiket', 'Değer', 'Birim', 'Tolerans', 'Açıklama']);
            va.olcular.forEach(o => rows.push([
                o.etiket || '', o.deger || '', o.birim || 'mm', o.tolerans || '', o.aciklama || '',
            ]));
        } else {
            rows.push(['Ölçü']); va.olcular.forEach(o => rows.push([String(o)]));
        }
    }

    /* ── TOLERANSLAR ── */
    if (va?.toleranslar?.length) {
        rows.push([]); rows.push(['TOLERANSLAR', '', '']);
        if (typeof va.toleranslar[0] === 'object') {
            rows.push(['Tip', 'Değer', 'Açıklama']);
            va.toleranslar.forEach(t => rows.push([t.tip || '', t.deger || '', t.aciklama || '']));
        } else {
            rows.push(['Tolerans']); va.toleranslar.forEach(t => rows.push([String(t)]));
        }
    }

    /* ── İŞLEM SIRASI ── */
    if (va?.islem_sirasi?.length) {
        rows.push([]); rows.push(['İŞLEM SIRASI', '', '']);
        if (typeof va.islem_sirasi[0] === 'object') {
            rows.push(['Sıra', 'İşlem', 'Açıklama']);
            va.islem_sirasi.forEach(s => rows.push([s.sira || '', s.islem || '', s.aciklama || '']));
        } else {
            rows.push(['Sıra', 'İşlem']);
            va.islem_sirasi.forEach((s, i) => rows.push([i + 1, String(s)]));
        }
    }

    /* ── NOTLAR ── */
    if (va?.notlar?.length) {
        rows.push([]); rows.push(['NOTLAR']);
        va.notlar.forEach(n => rows.push([String(n)]));
    }

    /* ── GENEL METİN ── */
    if (va?.genel_metin) { rows.push([]); rows.push(['GENEL METİN', String(va.genel_metin)]); }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    _setColWidths(ws, [22, 40, 18, 18, 22, 40]);
    return ws;
}

function _buildNestingSheet(va) {
    const rows = [];

    /* ── GENEL BİLGİLER ── */
    rows.push(['GENEL BİLGİLER', '']);
    [
        ['Program Adı',    va?.program_adi],
        ['Malzeme No',     va?.malzeme_numarasi],
        ['Malzeme',        va?.malzeme],
        ['Kalınlık',       va?.kalinlik],
        ['Levha Boyutu',   va?.levha_boyutu],
        ['Toplam Parça',   va?.toplam_parca_adedi],
        ['Kullanım Oranı', va?.kullanim_orani],
        ['Fire Oranı',     va?.fire_orani],
    ].forEach(([k, v]) => { if (v) rows.push([k, String(v)]); });

    /* ── YAPILACAK İŞLEMLER ── */
    if (va?.islemler?.length) {
        rows.push([]); rows.push(['YAPILACAK İŞLEMLER']);
        va.islemler.forEach(i => rows.push([String(i)]));
    }

    /* ── PARÇA LİSTESİ ── */
    rows.push([]);
    rows.push(['PARÇA LİSTESİ', '', '', '']);
    rows.push(['Parça Adı', 'Adet', 'Malzeme', 'Kalınlık']);
    (va?.parca_listesi || []).forEach(p => rows.push([
        p.parca_adi || '', p.adet || '', p.malzeme || '', p.kalinlik || '',
    ]));

    /* ── NOTLAR ── */
    if (va?.notlar?.length) {
        rows.push([]); rows.push(['NOTLAR']);
        va.notlar.forEach(n => rows.push([String(n)]));
    }

    /* ── GENEL METİN ── */
    if (va?.genel_metin) { rows.push([]); rows.push(['GENEL METİN', String(va.genel_metin)]); }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    _setColWidths(ws, [28, 12, 20, 12]);
    return ws;
}

function downloadExcel(item, linkedItem) {
    const wb = XLSX.utils.book_new();
    const va  = item.meta?.vision_analysis;
    const lva = linkedItem?.meta?.vision_analysis;

    if (va?.image_type === 'teknik_resim') {
        XLSX.utils.book_append_sheet(wb, _buildTeknikSheet(va), 'Teknik Resim');
        if (lva?.image_type === 'nesting')
            XLSX.utils.book_append_sheet(wb, _buildNestingSheet(lva), 'Nesting');
    } else if (va?.image_type === 'nesting') {
        XLSX.utils.book_append_sheet(wb, _buildNestingSheet(va), 'Nesting');
        if (lva?.image_type === 'teknik_resim')
            XLSX.utils.book_append_sheet(wb, _buildTeknikSheet(lva), 'Teknik Resim');
    } else {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Analiz verisi yok']]), 'Veri');
    }
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

    const isTeknikType = t => t === 'teknik_resim' || t === 'step_model';

    const teknikVa       = isTeknikType(va?.image_type) ? va  : (isTeknikType(lva?.image_type) ? lva  : null);
    const nestingVa      = va?.image_type === 'nesting'  ? va  : (lva?.image_type === 'nesting'  ? lva  : null);
    const nestingFilename = va?.image_type === 'nesting' ? item.filename : (linkedItem?.filename || '');

    const hasTeknik  = !!teknikVa;
    const hasNesting = !!nestingVa;
    const hasAny     = hasTeknik || hasNesting;

    const initTab = va?.image_type === 'nesting' ? 'nesting' : 'teknik';
    const [tab, setTab] = useState(initTab);

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

                    {/* Tab geçiş — sadece ikisi birden varsa göster */}
                    {hasTeknik && hasNesting && (
                        <div className="flex items-center bg-stone-100 rounded-xl p-0.5 gap-0.5">
                            <button
                                onClick={() => setTab('teknik')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all
                                    ${tab === 'teknik' ? 'bg-white shadow text-violet-600' : 'text-stone-400 hover:text-stone-600'}`}
                            >
                                <Cpu size={11} /> Teknik Çizim
                            </button>
                            <button
                                onClick={() => setTab('nesting')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all
                                    ${tab === 'nesting' ? 'bg-white shadow text-orange-500' : 'text-stone-400 hover:text-stone-600'}`}
                            >
                                <Scissors size={11} /> Nesting
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
                    ) : (tab === 'nesting' || (!hasTeknik && hasNesting)) ? (
                        <div className="flex-1 overflow-y-auto minimal-scroll">
                            <NestingTable va={nestingVa} filename={nestingFilename} />
                        </div>
                    ) : (
                        <TeknikTable va={teknikVa} />
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

/* ── Analiz boş durum ────────────────────────────────────────────── */
function EmptyAnalysisState({ status, va, visionError }) {
    const [cfg, setCfg] = useState(null);

    useEffect(() => {
        if (status === 'done' && !va) {
            fetch('/api/archive/check-vision-config')
                .then(r => r.json())
                .then(setCfg)
                .catch(() => {});
        }
    }, [status, va]);

    if (status === 'processing') return (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-[#378ADD]">
            <Loader2 size={30} strokeWidth={1.5} className="animate-spin" />
            <p className="text-[12px] font-semibold">Vision AI analiz ediyor…</p>
        </div>
    );

    if (status === 'failed') return (
        <div className="flex flex-col items-center gap-4 px-8 py-8">
            <AlertTriangle size={28} strokeWidth={1.5} className="text-red-400 shrink-0" />
            <div className="text-center">
                <p className="text-[12px] font-bold text-stone-700">Analiz başarısız</p>
                <p className="text-[11px] text-stone-400 mt-1">Dosya yapay zeka tarafından işlenemedi.</p>
            </div>
            {visionError && (
                <div className="w-full bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[11px]">
                    <p className="font-bold text-red-600 mb-1">Hata Detayı</p>
                    <p className="text-red-500 break-words">{visionError}</p>
                </div>
            )}
            <p className="text-[10px] text-stone-400 text-center">
                DWG/DXF dosyalarını PNG veya PDF olarak dışa aktarıp tekrar yükleyin, ardından "Analiz Et" butonuna basın.
            </p>
        </div>
    );

    if (status === 'done' && !va) {
        const dp = cfg?.doc_processing;
        const vf = cfg?.vision_fallback;
        return (
            <div className="flex flex-col items-center gap-4 px-8 py-8">
                <AlertTriangle size={28} strokeWidth={1.5} className="text-amber-400 shrink-0" />
                <div className="text-center">
                    <p className="text-[12px] font-bold text-stone-700">Vision analizi tamamlanamadı</p>
                    <p className="text-[11px] text-stone-400 mt-1">Görsel yapay zekaya gönderildi ancak yanıt alınamadı.</p>
                </div>

                {/* Gerçek hata mesajı varsa önce onu göster */}
                {visionError && (
                    <div className="w-full bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[11px]">
                        <p className="font-bold text-red-600 mb-1">API Hatası</p>
                        <p className="text-red-500 break-all font-mono">{visionError}</p>
                    </div>
                )}

                {cfg && (
                    <div className="w-full bg-stone-50 rounded-xl border border-stone-200 overflow-hidden text-[11px]">
                        <div className="px-4 py-2 border-b border-stone-200 text-[10px] font-black tracking-widest text-stone-400 uppercase">
                            Model Tanılaması
                        </div>
                        {[
                            { label: 'Teknik Döküman İşleme', info: dp },
                            { label: 'Vision Fallback', info: vf },
                        ].map(({ label, info }) => (
                            <div key={label} className="flex items-start gap-3 px-4 py-2.5 border-b border-stone-100 last:border-0">
                                <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${info?.found && info?.has_key && info?.model_id ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                <div className="min-w-0">
                                    <p className="font-semibold text-stone-600">{label}</p>
                                    {!info?.stored && <p className="text-stone-400">Ayarlanmamış</p>}
                                    {info?.stored && !info?.found && <p className="text-red-500">Model bulunamadı (ID geçersiz)</p>}
                                    {info?.found && !info?.has_key && <p className="text-red-500">API anahtarı eksik veya çözülemiyor</p>}
                                    {info?.found && info?.has_key && !info?.model_id && <p className="text-amber-500">Model adı boş (model_id alanı dolu değil)</p>}
                                    {info?.found && info?.has_key && info?.model_id && (
                                        <p className="text-emerald-600">{info.model_id} · {info.provider || 'gemini'}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <p className="text-[10px] text-stone-400 text-center">
                    Sorunu giderdikten sonra "Analiz Et" ile tekrar deneyin.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-stone-400">
            <Table2 size={32} strokeWidth={1} />
            <p className="text-[12px] font-medium">Henüz analiz edilmemiş — önce "Analiz Et" butonuna basın</p>
        </div>
    );
}

/* ── Generic KV bölümü (bilinmeyen şemalar için) ─────────────────── */
function GenericSection({ label, value }) {
    if (Array.isArray(value) && value.length > 0) {
        const first = value[0];
        if (typeof first === 'object' && first !== null) {
            const cols = Object.keys(first).map(k => ({ key: k, label: k, w: `${Math.floor(100 / Object.keys(first).length)}%` }));
            return (
                <SheetBlock title={label} color="blue">
                    <SheetDataTable cols={cols} rows={value} />
                </SheetBlock>
            );
        }
        return (
            <SheetBlock title={label} color="stone">
                <SheetTagTable items={value} />
            </SheetBlock>
        );
    }
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const rows = Object.entries(value).filter(([, v]) => v).map(([k, v]) => [k, String(v)]);
        if (rows.length === 0) return null;
        return (
            <SheetBlock title={label} color="blue">
                <SheetKVTable rows={rows} />
            </SheetBlock>
        );
    }
    if (value && typeof value === 'string') {
        return (
            <SheetBlock title={label} color="stone">
                <p className="text-[12px] text-stone-600 leading-relaxed px-4 py-3">{value}</p>
            </SheetBlock>
        );
    }
    return null;
}

/* ── Teknik Resim tablo görünümü ─────────────────────────────────── */
/* ── Excel benzeri spreadsheet ───────────────────────────────────── */
function ExcelSheet({ rows, cols }) {
    /* rows: dizi-of-dizi [[label,val],...] veya dizi-of-obje [{key:val},...] */
    if (!rows || rows.length === 0) return (
        <div className="flex items-center justify-center h-24 text-stone-400 text-[12px]">Veri yok</div>
    );

    const isKV = Array.isArray(rows[0]);

    if (isKV) {
        return (
            <table className="w-full border-collapse text-[12px]">
                <thead>
                    <tr className="bg-[#217346]/10">
                        <th className="w-8 border border-stone-200 bg-stone-100 text-stone-400 text-[10px] font-normal px-2 py-1.5 text-center" />
                        <th className="border border-stone-200 bg-[#217346]/10 text-[#217346] font-bold px-3 py-1.5 text-left text-[11px]">Alan</th>
                        <th className="border border-stone-200 bg-[#217346]/10 text-[#217346] font-bold px-3 py-1.5 text-left text-[11px]">Değer</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(([label, val], i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-stone-50/60'}>
                            <td className="border border-stone-200 bg-stone-100 text-stone-400 text-[10px] px-2 py-1.5 text-center w-8">{i + 1}</td>
                            <td className="border border-stone-200 px-3 py-1.5 text-stone-500 font-medium">{label}</td>
                            <td className="border border-stone-200 px-3 py-1.5 text-stone-800">{val}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }

    /* Obje dizisi → columns */
    const headers = cols || Object.keys(rows[0]);
    return (
        <table className="w-full border-collapse text-[12px]">
            <thead>
                <tr>
                    <th className="w-8 border border-stone-200 bg-stone-100 text-stone-400 text-[10px] font-normal px-2 py-1.5 text-center" />
                    {headers.map(h => (
                        <th key={h} className="border border-stone-200 bg-[#217346]/10 text-[#217346] font-bold px-3 py-1.5 text-left text-[11px]">{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-stone-50/60'}>
                        <td className="border border-stone-200 bg-stone-100 text-stone-400 text-[10px] px-2 py-1.5 text-center">{i + 1}</td>
                        {headers.map(h => (
                            <td key={h} className="border border-stone-200 px-3 py-1.5 text-stone-800">{row[h] ?? ''}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function TeknikTable({ va }) {
    const llmSkipped = va?.llm_skipped === true;

    const SECTION_LABELS = {
        baslik_bloku:   'Başlık Bloğu',
        parca_listesi:  'Parça Listesi',
        olcular:        'Ölçüler',
        toleranslar:    'Toleranslar',
        notlar:         'Notlar',
        yuzey_islemleri:'Yüzey İşlemleri',
        kesitler:       'Kesitler',
        islem_sirasi:   'İşlem Sırası',
        parca_tanim:    'Parça Tanımı',
        geometrik:      'Geometrik Bilgiler',
        malzeme_uretim: 'Malzeme & Üretim',
        izlenebilirlik: 'İzlenebilirlik',
        genel_metin:    'Genel Metin',
    };

    const FIELD_LABELS = {
        cizim_numarasi:'Çizim No', baslik:'Başlık', firma:'Firma', proje:'Proje',
        revizyon:'Revizyon', olcek:'Ölçek', tarih:'Tarih', cizen:'Çizen',
        onaylayan:'Onaylayan', kontrol_eden:'Kontrol Eden', malzeme:'Malzeme',
        yuzey_islem:'Yüzey İşlemi', sertlik:'Sertlik', agirlik:'Ağırlık',
        birim:'Birim', sayfa:'Sayfa', blatt_format:'Format',
        parca_adi:'Parça Adı', parca_kodu:'Parça Kodu', kimlik_numarasi:'Kimlik No',
        sayfa_bilgisi:'Sayfa Bilgisi', cizim_no:'Çizim No', yarim_mamul:'Yarı Mamul',
        acilim_uzunlugu:'Açılım Uzunluğu', boyutlar:'Boyutlar', bukme_yaricapi:'Bükme Yarıçapı',
        kenar_mesafeleri:'Kenar Mesafeleri', kesit:'Kesit',
        yuzey_standardi:'Yüzey Standardı', kesim_standardi:'Kesim Standardı',
        sayfa_formati:'Sayfa Formatı',
        talasli_tolerans:'Talaşlı Tolerans', talassiz_tolerans:'Talaşsız Tolerans',
        kaynakli_tolerans:'Kaynaklı Tolerans', dokum_tolerans:'Döküm Tolerans',
        cizim_tarihi:'Çizim Tarihi', kalite_kontrol:'Kalite Kontrol', cad_bilgisi:'CAD Bilgisi',
        poz:'Poz', adet:'Adet', aciklama:'Açıklama',
        // Ölçüler (yeni şema)
        etiket:'Etiket', deger:'Değer', tolerans:'Tolerans',
        // Toleranslar (yeni şema)
        tip:'Tip',
        // İşlem sırası (yeni şema)
        sira:'Sıra', islem:'İşlem',
    };

    const SKIP = new Set(['image_type', 'kaynak', 'projeksiyon_acisi', 'llm_skipped']);

    /* Bölümleri dinamik olarak çıkar */
    const sections = [];
    for (const [key, val] of Object.entries(va || {})) {
        if (SKIP.has(key) || !val) continue;
        const title = SECTION_LABELS[key] || key;

        if (key === 'baslik_bloku' && typeof val === 'object' && !Array.isArray(val)) {
            const rows = Object.entries(val).filter(([,v]) => v)
                .map(([k,v]) => [FIELD_LABELS[k] || k, String(v)]);
            if (rows.length) sections.push({ key, title, type: 'kv', rows });

        } else if (Array.isArray(val) && val.length > 0) {
            if (typeof val[0] === 'object') {
                /* obje dizisi → kolon başlıklarını Türkçe yap */
                const rawCols = Object.keys(val[0]);
                const cols = rawCols.map(c => FIELD_LABELS[c] || c);
                const rows = val.map(r => {
                    const out = {};
                    rawCols.forEach((c, i) => { out[cols[i]] = r[c] ?? ''; });
                    return out;
                });
                sections.push({ key, title, type: 'table', rows, cols });
            } else {
                const rows = val.map((v, i) => [String(i + 1), String(v)]);
                sections.push({ key, title, type: 'kv', rows });
            }

        } else if (typeof val === 'object' && !Array.isArray(val)) {
            const rows = Object.entries(val).filter(([,v]) => v)
                .map(([k,v]) => [FIELD_LABELS[k] || k, String(v)]);
            if (rows.length) sections.push({ key, title, type: 'kv', rows });

        } else if (typeof val === 'string' && val.trim()) {
            sections.push({ key, title, type: 'text', text: val });
        }
    }

    const [activeKey, setActiveKey] = useState(() => sections[0]?.key || '');
    const active = sections.find(s => s.key === activeKey) || sections[0];

    if (!sections.length) return (
        <div className="flex items-center justify-center h-32 text-stone-400 text-[12px]">
            Teknik çizim analizi bulunamadı
        </div>
    );

    return (
        <div className="flex flex-col h-full min-h-0">
            {/* ── LLM atlandı uyarısı ── */}
            {llmSkipped && (
                <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-700">
                    <span className="font-bold">LLM'den devam edilmedi</span>
                    <span className="text-amber-500">— Yalnızca DXF metin entity'leri gösteriliyor. Detaylı analiz için LLM'i etkinleştirebilirsiniz.</span>
                </div>
            )}
            {/* ── Excel sekme çubuğu ── */}
            <div className="flex items-end gap-0 bg-[#f0f0f0] border-b border-stone-300 px-3 pt-2 overflow-x-auto shrink-0">
                {sections.map(s => (
                    <button
                        key={s.key}
                        onClick={() => setActiveKey(s.key)}
                        className={`flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-semibold whitespace-nowrap border border-b-0 rounded-t-md mr-0.5 transition-all ${
                            active?.key === s.key
                                ? 'bg-white border-stone-300 text-[#217346] shadow-sm -mb-px z-10 relative'
                                : 'bg-[#dce6d0] border-[#dce6d0] text-stone-500 hover:bg-[#c9d9ba] hover:text-stone-700'
                        }`}
                    >
                        {s.title}
                    </button>
                ))}
            </div>

            {/* ── Spreadsheet içeriği ── */}
            <div className="flex-1 overflow-auto min-h-0 bg-white">
                {active?.type === 'text' ? (
                    <div className="p-5 text-[12px] text-stone-700 leading-relaxed whitespace-pre-wrap">{active.text}</div>
                ) : (
                    <ExcelSheet rows={active?.rows} cols={active?.cols} />
                )}
            </div>
        </div>
    );
}

/* ── Nesting tablo görünümü ──────────────────────────────────────── */
function NestingTable({ va, filename }) {
    if (!va) return (
        <div className="flex items-center justify-center h-32 text-stone-400 text-[12px]">
            Nesting analizi bulunamadı
        </div>
    );

    const kimlikNo = getKimlikNo(va, filename || '');

    const genelRows = [
        ['Kimlik No',       kimlikNo],
        ['Program',         va.program_adi],
        ['Malzeme',         va.malzeme],
        ['Kalınlık',        va.kalinlik],
        ['Levha Boyutu',    va.levha_boyutu],
        ['Toplam Parça',    va.toplam_parca_adedi],
        ['Kullanım Oranı',  va.kullanim_orani],
        ['Fire Oranı',      va.fire_orani],
    ].filter(([, v]) => v);

    return (
        <div className="p-6 flex flex-col gap-6">
            {genelRows.length > 0 && (
                <SheetBlock title="Genel Bilgiler" color="orange" icon={Cpu}>
                    <SheetKVTable rows={genelRows} highlightKeys={['Kimlik No', 'Kullanım Oranı', 'Fire Oranı']} />
                </SheetBlock>
            )}

            {va.islemler?.length > 0 && (
                <SheetBlock title="Yapılacak İşlemler" color="violet">
                    <SheetTagTable items={va.islemler} />
                </SheetBlock>
            )}

            {va.parca_listesi?.length > 0 && (
                <SheetBlock title="Parça Listesi" color="orange" icon={Layers}>
                    <SheetDataTable
                        cols={[
                            { key: 'parca_kodu', label: 'Parça Kodu', w: '20%' },
                            { key: 'parca_adi',  label: 'Parça Adı',  w: '35%' },
                            { key: 'adet',       label: 'Adet',       w: '10%' },
                            { key: 'malzeme',    label: 'Malzeme',    w: '35%' },
                        ]}
                        rows={va.parca_listesi}
                    />
                </SheetBlock>
            )}

            {va.notlar?.length > 0 && (
                <SheetBlock title="Notlar" color="stone">
                    <SheetNoteTable items={va.notlar} />
                </SheetBlock>
            )}

            {va.genel_metin && (
                <SheetBlock title="Genel Metin" color="stone">
                    <p className="text-[12px] text-stone-600 leading-relaxed px-1">{va.genel_metin}</p>
                </SheetBlock>
            )}
        </div>
    );
}

/* ── Spreadsheet bileşenleri ─────────────────────────────────────── */
function SheetBlock({ title, icon: Icon, color = 'stone', children }) {
    const hdr = {
        blue:   'bg-[#378ADD]/8 text-[#378ADD] border-[#378ADD]/20',
        violet: 'bg-violet-50 text-violet-600 border-violet-200',
        orange: 'bg-orange-50 text-orange-500 border-orange-200',
        emerald:'bg-emerald-50 text-emerald-600 border-emerald-200',
        stone:  'bg-stone-50 text-stone-500 border-stone-200',
    };
    return (
        <div className="rounded-xl border border-stone-200 overflow-hidden">
            <div className={`flex items-center gap-2 px-4 py-2 border-b ${hdr[color]}`}>
                {Icon && <Icon size={12} />}
                <span className="text-[10px] font-black tracking-widest uppercase">{title}</span>
            </div>
            <div className="bg-white">{children}</div>
        </div>
    );
}

function SheetKVTable({ rows, highlightKeys = [] }) {
    return (
        <table className="w-full text-[12px]">
            <tbody>
                {rows.map(([k, v], i) => {
                    const hi = highlightKeys.includes(k);
                    return (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-stone-50/60'}>
                            <td className="px-4 py-2 w-36 font-semibold text-stone-400 border-r border-stone-100 whitespace-nowrap">{k}</td>
                            <td className={`px-4 py-2 font-medium ${hi ? 'text-emerald-600 font-bold' : 'text-stone-700'}`}>{v}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

function SheetDataTable({ cols, rows }) {
    return (
        <table className="w-full text-[12px]">
            <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                    {cols.map(c => (
                        <th key={c.key} className="px-4 py-2 text-left text-[10px] font-black text-stone-400 uppercase tracking-wider" style={{ width: c.w }}>
                            {c.label}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((r, i) => (
                    <tr key={i} className={`border-b border-stone-50 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-stone-50/40'}`}>
                        {cols.map(c => (
                            <td key={c.key} className="px-4 py-2 text-stone-700 font-medium">{r[c.key] || '—'}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function SheetTagTable({ items }) {
    const toStr = it => {
        if (!it) return '';
        if (typeof it === 'string') return it;
        if (typeof it === 'object') {
            return it.islem || it.aciklama || it.text || it.ad || it.tanim || it.name ||
                Object.values(it).filter(v => typeof v === 'string' && v).join(' — ') || '';
        }
        return String(it);
    };
    return (
        <table className="w-full text-[12px]">
            <tbody>
                {items.map((it, i) => (
                    <tr key={i} className={`border-b border-stone-50 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-stone-50/40'}`}>
                        <td className="px-4 py-2 w-10 text-stone-300 font-mono font-bold text-[10px]">{i + 1}</td>
                        <td className="px-4 py-2 text-stone-700 font-medium">{toStr(it)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function SheetNoteTable({ items }) {
    const arr = Array.isArray(items) ? items : (items ? [items] : []);
    const toStr = it => {
        if (!it) return '';
        if (typeof it === 'string') return it;
        if (typeof it === 'object') return it.not || it.text || it.aciklama || it.note || Object.values(it).filter(v => typeof v === 'string').join(' ') || '';
        return String(it);
    };
    return (
        <table className="w-full text-[12px]">
            <tbody>
                {arr.map((it, i) => (
                    <tr key={i} className={`border-b border-stone-50 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-stone-50/40'}`}>
                        <td className="px-4 py-2 w-8 text-stone-300 font-bold">•</td>
                        <td className="px-4 py-2 text-stone-600 leading-relaxed">{toStr(it)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

/* ── Nesting ID listesi (string veya array uyumlu) ──────────────── */
function getNestingIds(bagli) {
    const n = (bagli || {}).nesting;
    if (!n) return [];
    return Array.isArray(n) ? n : [n];
}

/* ── Kimlik no çıkarıcı ──────────────────────────────────────────── */
const _SAP_RE = /\b(\d{7,10})\b/;

function extractNumFromFilename(filename) {
    if (!filename) return '';
    const stem = filename.replace(/\.[^.]+$/, '');
    // Ayırıcılar arasındaki parçalara böl: - . , space _ /
    const parts = stem.split(/[-.,\s_/]+/);
    for (const p of parts) {
        const clean = p.replace(/\./g, ''); // Avrupa noktalı: 92.530.740
        if (/^\d{7,10}$/.test(clean)) return clean;
    }
    return '';
}

function getKimlikNo(va, filename) {
    if (va) {
        const bb = va.baslik_bloku || {};
        // 1. Klasik alan adları
        if (bb.kimlik_numarasi) return bb.kimlik_numarasi;
        if (bb.cizim_numarasi)  return bb.cizim_numarasi;
        // 2. Nesting üst seviye
        if (va.malzeme_numarasi) return va.malzeme_numarasi;
        // 3. baslik_bloku'daki tüm değerlerde SAP şekilli sayı ara
        for (const v of Object.values(bb)) {
            if (!v) continue;
            const m = _SAP_RE.exec(String(v));
            if (m) return m[1];
        }
        // 4. parca_listesi parca_kodu
        for (const p of va.parca_listesi || []) {
            if (!p || typeof p !== 'object') continue;
            for (const fld of ['parca_kodu', 'kimlik_numarasi', 'malzeme_no']) {
                if (p[fld]) {
                    const m = _SAP_RE.exec(String(p[fld]));
                    if (m) return m[1];
                }
            }
        }
    }
    // 5. Dosya adından çıkar
    return extractNumFromFilename(filename);
}

/* ── Grid kartı ──────────────────────────────────────────────────── */
function TeknikKart({ item, allItems, onOpen, onVectorize, vectorizing, onOpenLinked, onStartLink, onUnlink, onDetail, onDelete, draggingId }) {
    const [imgErr,   setImgErr]   = useState(false);
    const [ctxMenu,  setCtxMenu]  = useState(null);
    const clickTimer = useRef(null);
    const isDwg = ['dwg','dxf','stp','step'].includes((item.file_type||'').toLowerCase());

    const va        = item.meta?.vision_analysis;
    const isTR      = ['teknik_resim', 'step_model', 'nesting'].includes(va?.image_type);
    const bb        = isTR ? (va.baslik_bloku || {}) : {};
    const status    = item.meta?.transcription_status;
    const canAnalyze = status !== 'processing' && !va;
    const bagli      = item.meta?.bagli_dosyalar || {};
    const cadId      = bagli.cad;

    const nestingIds  = getNestingIds(bagli);
    const nestingId   = nestingIds[0] ?? null;
    const nestingItems   = nestingIds.map(id => (allItems || []).find(i => i.id === id)).filter(Boolean);
    const nestingItem    = nestingItems[0] ?? null;
    const nestingVision  = nestingItem?.meta?.vision_analysis;
    const nestingMatNum  = getKimlikNo(nestingVision, nestingItem?.filename || '');
    const kimlikNo       = getKimlikNo(va, item.filename);

    // Tek tık → çizimi aç   |   Çift tık → nesting aç
    const handleClick = () => {
        if (clickTimer.current) {
            clearTimeout(clickTimer.current);
            clickTimer.current = null;
            if (nestingId) onOpenLinked(nestingId);
        } else {
            clickTimer.current = setTimeout(() => {
                clickTimer.current = null;
                onOpen(item);
            }, 220);
        }
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setCtxMenu({ x: e.clientX, y: e.clientY });
    };

    return (
        <>
        {ctxMenu && (
            <ContextMenu
                x={ctxMenu.x} y={ctxMenu.y}
                item={item}
                onDelete={onDelete}
                onClose={() => setCtxMenu(null)}
            />
        )}
        <div
            draggable
            onDragStart={e => setDragData(e, item.id)}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            className={`group bg-white border border-stone-200 rounded-xl overflow-hidden hover:border-[#378ADD]/40 hover:shadow-lg transition-all cursor-grab active:cursor-grabbing flex flex-col
                ${draggingId === item.id ? 'opacity-40' : ''}`}
        >
            {/* Önizleme */}
            <div className="relative h-[140px] bg-stone-50 overflow-hidden">
                {!imgErr && !isDwg ? (
                    <img
                        src={`/api/archive/file/${item.id}`}
                        alt={item.filename}
                        className="w-full h-full object-contain p-2"
                        onError={() => setImgErr(true)}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-stone-200">
                        <Ruler size={36} strokeWidth={1} />
                        {isDwg && <span className="text-[10px] font-black tracking-widest text-stone-300">{(item.file_type||'').toUpperCase()}</span>}
                    </div>
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={e => { e.stopPropagation(); onOpen(item); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-stone-800 text-[11px] font-bold rounded-lg shadow hover:bg-stone-50"
                        >
                            <Eye size={12} /> Görüntüle
                        </button>
                        {canAnalyze && (
                            <button
                                onClick={e => { e.stopPropagation(); onVectorize(item); }}
                                disabled={vectorizing === item.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#378ADD] text-white text-[11px] font-bold rounded-lg shadow hover:bg-[#2a6ab8] disabled:opacity-60"
                            >
                                {vectorizing === item.id ? <Loader2 size={11} className="animate-spin" /> : <ScanLine size={11} />}
                                Analiz Et
                            </button>
                        )}
                    </div>
                </div>

                <div className="absolute top-2 left-2">
                    <StatusBadge item={item} />
                </div>
                <div className="absolute top-2 right-2 flex items-center gap-1">
                    <button
                        onClick={e => { e.stopPropagation(); onDetail(item); }}
                        title="Detayları göster"
                        className="flex items-center justify-center w-5 h-5 rounded bg-white/80 text-stone-500 hover:bg-white hover:text-[#378ADD] shadow-sm transition-colors"
                    >
                        <Table2 size={11} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Bilgi */}
            <div className="px-3.5 py-3 flex-1 flex flex-col gap-1 min-w-0">
                {isTR && (bb.cizim_numarasi || kimlikNo) && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {bb.cizim_numarasi && (
                            <span className="text-[9px] font-black text-[#378ADD] tracking-widest uppercase">
                                #{bb.cizim_numarasi}
                            </span>
                        )}
                        {kimlikNo && (
                            <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded tracking-wide uppercase">
                                SAP {kimlikNo}
                            </span>
                        )}
                    </div>
                )}
                <h3 className="text-[12px] font-bold text-stone-800 truncate leading-snug">
                    {(isTR && bb.baslik) ? bb.baslik : item.filename.replace(/\.[^.]+$/, '')}
                </h3>
                {isTR && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                        {bb.revizyon && <span className="text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-medium">Rev {bb.revizyon}</span>}
                        {bb.olcek    && <span className="text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-medium">{bb.olcek}</span>}
                        {bb.malzeme  && <span className="text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-medium">{bb.malzeme}</span>}
                    </div>
                )}

                {/* Bağlı nesting şeritleri (birden fazla olabilir) */}
                {nestingItems.map((nItem, ni) => {
                    const nVa  = nItem.meta?.vision_analysis;
                    const nNum = getKimlikNo(nVa, nItem.filename || '');
                    return nVa ? (
                        <div key={nItem.id} className="flex flex-col gap-0.5 px-2.5 py-1.5 bg-orange-50 border border-orange-100 rounded-lg mt-1">
                            <div className="flex items-center gap-1">
                                <Scissors size={8} className="text-orange-400 shrink-0" />
                                <span className="text-[9px] text-orange-600 font-black uppercase tracking-wide">
                                    Nesting{nestingIds.length > 1 ? ` ${ni + 1}` : ''}
                                </span>
                                {nNum && <span className="ml-auto text-[9px] text-amber-600 font-bold">{nNum}</span>}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0">
                                {nVa.malzeme && <span className="text-[9px] text-stone-500 font-medium">{nVa.malzeme}</span>}
                                {nVa.kalinlik && <span className="text-[9px] text-stone-500">{nVa.kalinlik}mm</span>}
                                {nVa.kullanim_orani && (
                                    <span className="text-[9px] text-emerald-600 font-bold">
                                        {String(nVa.kullanim_orani).replace('%', '')}%
                                    </span>
                                )}
                                {nVa.levha_boyutu && <span className="text-[9px] text-stone-400">{nVa.levha_boyutu}</span>}
                            </div>
                            {Array.isArray(nVa.islemler) && nVa.islemler.length > 0 && (
                                <div className="flex flex-wrap gap-0.5 mt-0.5">
                                    {nVa.islemler.slice(0, 3).map((op, i) => {
                                        const label = typeof op === 'string' ? op : (op?.islem || '');
                                        return label ? (
                                            <span key={i} className="text-[8px] bg-orange-100 text-orange-500 px-1 py-0.5 rounded font-semibold">{label}</span>
                                        ) : null;
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div key={nItem.id} className="flex items-center gap-1 px-2 py-1 bg-orange-50 border border-orange-100 rounded-lg mt-1">
                            <Scissors size={8} className="text-orange-400 shrink-0" />
                            <span className="text-[9px] text-orange-500 font-semibold">Nesting bağlı</span>
                            <Link2 size={8} className="text-orange-300 ml-auto" />
                        </div>
                    );
                })}

                {/* Nesting kartı: bağlı teknik çizimi göster */}
                {va?.image_type === 'nesting' && bagli.cizim && (() => {
                    const cizimItem = (allItems || []).find(i => i.id === bagli.cizim);
                    const cizimVa   = cizimItem?.meta?.vision_analysis;
                    const cizimBb   = cizimVa?.baslik_bloku || {};
                    return (
                        <div
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-violet-50 border border-violet-100 rounded-lg mt-1 cursor-pointer hover:bg-violet-100 transition-colors"
                            onClick={e => { e.stopPropagation(); onOpenLinked?.(bagli.cizim); }}
                        >
                            <Cpu size={8} className="text-violet-400 shrink-0" />
                            <span className="text-[9px] text-violet-600 font-black uppercase tracking-wide">Teknik Çizim</span>
                            {cizimBb.baslik && (
                                <span className="text-[9px] text-violet-500 font-medium truncate ml-1 max-w-[120px]">{cizimBb.baslik}</span>
                            )}
                            <Link2 size={8} className="text-violet-300 ml-auto shrink-0" />
                        </div>
                    );
                })()}

                {/* Alt bilgi */}
                <div className="mt-auto pt-2 border-t border-stone-50 flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1 text-[10px] text-stone-300">
                        <span className="uppercase font-black">{item.file_type}</span>
                        {fmtSize(item.file_size) && <span>· {fmtSize(item.file_size)}</span>}
                        <a
                            href={`/api/archive/download/${item.id}`}
                            onClick={e => e.stopPropagation()}
                            className="ml-1 text-stone-300 hover:text-[#378ADD] transition-colors"
                        >
                            <Download size={11} />
                        </a>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
}

/* ── Liste satırı ────────────────────────────────────────────────── */
const LCOLS = { gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,0.7fr) minmax(0,0.7fr) minmax(0,0.9fr) 80px 80px 100px 110px 110px 60px' };

function ListHeader() {
    return (
        <div className="grid gap-3 px-4 py-2 text-[10px] font-black tracking-widest uppercase text-stone-400 border-b border-stone-100 bg-white" style={LCOLS}>
            <span>DOSYA ADI</span>
            <span>ÇİZİM NO</span>
            <span>SAP NO</span>
            <span>BAŞLIK</span>
            <span>REVİZYON</span>
            <span>ÖLÇEK</span>
            <span>DURUM</span>
            <span>BOYUT</span>
            <span>TARİH</span>
            <span />
        </div>
    );
}

function ListRow({ item, allItems, onOpen, onVectorize, vectorizing, onOpenLinked, onStartLink, onUnlink, onDetail, onDelete, draggingId }) {
    const [ctxMenu, setCtxMenu] = useState(null);
    const va = item.meta?.vision_analysis;
    const isTR = ['teknik_resim', 'step_model', 'nesting'].includes(va?.image_type);
    const bb = isTR ? (va.baslik_bloku || {}) : {};
    const canAnalyze = !va && item.meta?.transcription_status !== 'processing';

    const bagli        = item.meta?.bagli_dosyalar || {};
    const nestingIds   = getNestingIds(bagli);
    const nestingItems = nestingIds.map(id => (allItems || []).find(i => i.id === id)).filter(Boolean);
    const kimlikNo     = getKimlikNo(va, item.filename);

    return (
        <>
        {ctxMenu && (
            <ContextMenu
                x={ctxMenu.x} y={ctxMenu.y}
                item={item}
                onDelete={onDelete}
                onClose={() => setCtxMenu(null)}
            />
        )}
        <div
            draggable
            onDragStart={e => setDragData(e, item.id)}
            onClick={() => onOpen(item)}
            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY }); }}
            className={`group grid gap-3 px-4 py-2.5 items-center bg-white hover:bg-stone-50 border-b border-stone-100 cursor-grab active:cursor-grabbing transition-colors
                ${draggingId === item.id ? 'opacity-40' : ''}`}
            style={LCOLS}
        >
            <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded text-white uppercase" style={{ background: '#8b5cf6' }}>
                    {(item.file_type || 'IMG').slice(0, 4).toUpperCase()}
                </span>
                <span className="text-[11px] font-semibold text-stone-800 truncate">{item.filename.replace(/\.[^.]+$/, '')}</span>
            </div>
            <span className="text-[11px] text-[#378ADD] font-bold truncate">{bb.cizim_numarasi || '—'}</span>
            <span className="text-[11px] text-amber-600 font-bold truncate">{kimlikNo || '—'}</span>
            <span className="text-[11px] text-stone-600 truncate">{bb.baslik || '—'}</span>
            <span className="text-[11px] text-stone-500">{bb.revizyon || '—'}</span>
            <span className="text-[11px] text-stone-500">{bb.olcek || '—'}</span>
            <StatusBadge item={item} />
            <span className="text-[11px] text-stone-500">{fmtSize(item.file_size) || '—'}</span>
            <span className="text-[11px] text-[#378ADD] font-semibold">{fmtDate(item.created_at)}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {canAnalyze && (
                    <button
                        onClick={e => { e.stopPropagation(); onVectorize(item); }}
                        disabled={vectorizing === item.id}
                        title="Analiz Et"
                        className="p-1 rounded text-stone-400 hover:text-[#378ADD] hover:bg-[#378ADD]/10 transition-all"
                    >
                        {vectorizing === item.id
                            ? <Loader2 size={12} className="animate-spin" />
                            : <ScanLine size={12} />
                        }
                    </button>
                )}
                <button
                    onClick={e => { e.stopPropagation(); onDetail(item); }}
                    title="Detayları göster"
                    className="p-1 rounded text-stone-400 hover:text-[#378ADD] hover:bg-[#378ADD]/10 transition-all"
                >
                    <Table2 size={12} />
                </button>
                <a
                    href={`/api/archive/download/${item.id}`}
                    onClick={e => e.stopPropagation()}
                    className="p-1 rounded text-stone-400 hover:text-[#378ADD] hover:bg-[#378ADD]/10 transition-all"
                >
                    <Download size={12} />
                </a>
            </div>
        </div>

        {/* Bağlı nesting alt satırı */}
        {va?.image_type === 'nesting' && bagli.cizim && (() => {
            const cizimItem = (allItems || []).find(i => i.id === bagli.cizim);
            const cizimVa   = cizimItem?.meta?.vision_analysis;
            const cizimBb   = cizimVa?.baslik_bloku || {};
            return (
                <div
                    className="grid gap-3 px-4 py-1.5 items-center border-b border-violet-100 bg-violet-50/40 hover:bg-violet-50 cursor-pointer transition-colors"
                    style={LCOLS}
                    onClick={e => { e.stopPropagation(); onOpenLinked?.(bagli.cizim); }}
                >
                    <div className="flex items-center gap-1.5 pl-4 min-w-0">
                        <div className="w-px h-3 bg-violet-200 shrink-0" />
                        <Cpu size={9} className="text-violet-400 shrink-0" />
                        <span className="text-[10px] text-violet-600 font-semibold truncate">
                            {cizimItem ? cizimItem.filename.replace(/\.[^.]+$/, '') : '—'}
                        </span>
                    </div>
                    <span className="text-[10px] text-stone-400 truncate">{cizimBb.cizim_numarasi || '—'}</span>
                    <span className="text-[10px] text-amber-500 font-bold truncate">{getKimlikNo(cizimVa, cizimItem?.filename || '') || '—'}</span>
                    <span className="text-[10px] text-stone-600 truncate">{cizimBb.baslik || '—'}</span>
                    <span /><span /><span /><span /><span /><span />
                </div>
            );
        })()}
        {nestingItems.map((nItem, ni) => {
            const nVision = nItem.meta?.vision_analysis;
            const nKimlik = getKimlikNo(nVision, nItem.filename || '');
            return (
                <div
                    key={nItem.id}
                    className="grid gap-3 px-4 py-1.5 items-center border-b border-orange-100 bg-orange-50/50 hover:bg-orange-50 cursor-pointer transition-colors"
                    style={LCOLS}
                    onClick={e => { e.stopPropagation(); onOpenLinked?.(nItem.id); }}
                >
                    <div className="flex items-center gap-1.5 pl-4 min-w-0">
                        <div className="w-px h-3 bg-orange-200 shrink-0" />
                        <Scissors size={9} className="text-orange-400 shrink-0" />
                        <span className="text-[10px] text-orange-500 font-semibold truncate">
                            {nItem.filename.replace(/\.[^.]+$/, '')}
                            {nestingIds.length > 1 && <span className="ml-1 text-orange-300">#{ni + 1}</span>}
                        </span>
                    </div>
                    <span className="text-[10px] text-stone-400 truncate">
                        {nVision?.program_adi || '—'}
                    </span>
                    <span className="text-[10px] text-amber-500 font-bold truncate">
                        {nKimlik || '—'}
                    </span>
                    <span className="text-[10px] text-stone-500 truncate">
                        {[nVision?.malzeme, nVision?.kalinlik ? `${nVision.kalinlik}mm` : '']
                            .filter(Boolean).join(' · ') || '—'}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold">
                        {nVision?.kullanim_orani
                            ? `${String(nVision.kullanim_orani).replace('%', '')}%`
                            : '—'}
                    </span>
                    <span className="text-[10px] text-stone-400 truncate">
                        {nVision?.levha_boyutu || '—'}
                    </span>
                    <span /><span /><span /><span />
                </div>
            );
        })}
        </>
    );
}

/* ── Filtreler ───────────────────────────────────────────────────── */
const FILTERS = [
    { key: 'all',      label: 'Tümü' },
    { key: 'cad',      label: 'CAD',           icon: Cpu },
    { key: 'nesting',  label: 'Nesting',        icon: Scissors },
    { key: 'analyzed', label: 'Analiz Edildi', icon: CheckCircle2 },
    { key: 'pending',  label: 'Bekleyenler',   icon: Clock },
];

const DRAG_KEY = 'teknik/item';
let _dragId = null; // dragstart sırasında getData çalışmadığı için module-level ref
const getDragId = (e) => { try { return JSON.parse(e.dataTransfer.getData(DRAG_KEY))?.id; } catch { return null; } };
const setDragData = (e, id) => { _dragId = id; e.dataTransfer.setData(DRAG_KEY, JSON.stringify({ id })); e.dataTransfer.effectAllowed = 'move'; };

/* ── Klasör kartı ────────────────────────────────────────────────── */
function FolderCard({ folder, depth, onClick, onDelete, draggingId, onDrop }) {
    const [ctxMenu, setCtxMenu] = useState(null);
    const [isOver,  setIsOver]  = useState(false);
    const label  = depth === 0 ? 'Mamul' : depth === 1 ? 'Alt Bileşen' : 'Klasör';
    const accent = depth === 0 ? '#f59e0b' : depth === 1 ? '#3b82f6' : '#8b5cf6';
    const isDraggingSelf = draggingId === folder.id;

    return (
        <>
        {ctxMenu && (
            <ContextMenu x={ctxMenu.x} y={ctxMenu.y} item={folder}
                onDelete={onDelete} onClose={() => setCtxMenu(null)} />
        )}
        <div
            draggable
            onClick={!isDraggingSelf ? onClick : undefined}
            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY }); }}
            onDragStart={e => { e.stopPropagation(); setDragData(e, folder.id); }}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); if (!isDraggingSelf) setIsOver(true); }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setIsOver(false); }}
            onDrop={e => { e.preventDefault(); e.stopPropagation(); setIsOver(false); const id = getDragId(e); if (id && id !== folder.id) onDrop?.(id, folder.id); }}
            className={`bg-white border rounded-xl p-4 cursor-pointer transition-all flex items-center gap-3 group
                ${isOver ? 'border-[#378ADD] shadow-[0_0_0_3px_rgba(55,138,221,0.15)] scale-[1.01]' : 'border-stone-200 hover:shadow-md'}
                ${isDraggingSelf ? 'opacity-40' : ''}`}
            style={{ borderLeftWidth: 3, borderLeftColor: isOver ? '#378ADD' : accent }}
        >
            <div className="p-2.5 rounded-xl shrink-0" style={{ background: isOver ? '#378ADD18' : `${accent}18` }}>
                <FolderOpen size={18} style={{ color: isOver ? '#378ADD' : accent }} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-stone-800 truncate">{folder.filename}</p>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${accent}18`, color: accent }}>{label}</span>
            </div>
            <ChevronRight size={14} className="text-stone-300 group-hover:text-stone-500 transition-colors shrink-0" />
        </div>
        </>
    );
}

function FolderListRow({ folder, depth, onClick, onDelete, draggingId, onDrop }) {
    const [ctxMenu, setCtxMenu] = useState(null);
    const [isOver,  setIsOver]  = useState(false);
    const label  = depth === 0 ? 'Mamul' : depth === 1 ? 'Alt Bileşen' : 'Klasör';
    const accent = depth === 0 ? '#f59e0b' : depth === 1 ? '#3b82f6' : '#8b5cf6';
    const isDraggingSelf = draggingId === folder.id;

    return (
        <>
        {ctxMenu && (
            <ContextMenu x={ctxMenu.x} y={ctxMenu.y} item={folder}
                onDelete={onDelete} onClose={() => setCtxMenu(null)} />
        )}
        <div
            draggable
            onClick={!isDraggingSelf ? onClick : undefined}
            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY }); }}
            onDragStart={e => { e.stopPropagation(); setDragData(e, folder.id); }}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); if (!isDraggingSelf) setIsOver(true); }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setIsOver(false); }}
            onDrop={e => { e.preventDefault(); e.stopPropagation(); setIsOver(false); const id = getDragId(e); if (id && id !== folder.id) onDrop?.(id, folder.id); }}
            className={`flex items-center gap-3 px-4 py-3 border-b border-stone-100 cursor-pointer transition-all group
                ${isOver ? 'bg-[#378ADD]/5 border-l-[#378ADD]' : 'bg-white hover:bg-stone-50'}
                ${isDraggingSelf ? 'opacity-40' : ''}`}
            style={{ borderLeftWidth: 3, borderLeftColor: isOver ? '#378ADD' : accent }}
        >
            <FolderOpen size={14} style={{ color: isOver ? '#378ADD' : accent }} />
            <span className="text-[12px] font-bold text-stone-800 flex-1 truncate">{folder.filename}</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0" style={{ background: `${accent}18`, color: accent }}>{label}</span>
            <ChevronRight size={13} className="text-stone-300 group-hover:text-stone-500 transition-colors shrink-0" />
        </div>
        </>
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
                <div className="flex items-center justify-between gap-4 px-7 pt-6 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#378ADD]/10 rounded-2xl shrink-0 relative">
                            <Ruler size={22} className="text-[#378ADD]" strokeWidth={2} />
                            {processingCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                                    {processingCount}
                                </span>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-[20px] font-black text-stone-900 tracking-tight">Teknik Resimler</h1>
                                <span className="text-[11px] font-bold bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full tabular-nums">
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
                <div className="flex items-center gap-2 px-7 pb-3">
                    <button
                        onClick={() => setCurrentFolderId(null)}
                        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('!text-[#378ADD]', 'underline'); }}
                        onDragLeave={e => { e.currentTarget.classList.remove('!text-[#378ADD]', 'underline'); }}
                        onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('!text-[#378ADD]', 'underline'); const id = getDragId(e); if (id) handleMove(id, null); }}
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
                                onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('!text-[#378ADD]', 'underline'); const id = getDragId(e); if (id) handleMove(id, crumb.id); }}
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
                <div className="flex items-center gap-3 px-7 pb-4">
                    <div className="relative w-[320px] shrink-0">
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

                    <div className="flex items-center gap-0.5 ml-auto">
                        {FILTERS.map(f => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all shrink-0
                                    ${filter === f.key ? 'bg-[#378ADD]/10 text-[#378ADD]' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100'}`}
                            >
                                {f.icon && <f.icon size={11} strokeWidth={2} />}
                                {f.label}
                                <span className={`text-[10px] font-bold tabular-nums ${filter === f.key ? 'text-[#378ADD]' : 'text-stone-400'}`}>
                                    {counts[f.key]}
                                </span>
                            </button>
                        ))}
                        <div className="w-px h-4 bg-stone-200 mx-1 shrink-0" />
                        <button onClick={() => setView('list')} className={`p-1.5 rounded-lg transition-all ${view === 'list' ? 'bg-stone-100 text-stone-700' : 'text-stone-400 hover:bg-stone-100'}`}><List size={14} /></button>
                        <button onClick={() => setView('grid')} className={`p-1.5 rounded-lg transition-all ${view === 'grid' ? 'bg-stone-100 text-stone-700' : 'text-stone-400 hover:bg-stone-100'}`}><Grid size={14} /></button>
                    </div>
                </div>
            </div>

            {/* ── İÇERİK ───────────────────────────────────────── */}
            <div
                className="flex-1 overflow-y-auto p-6 minimal-scroll"
                onDragStart={() => { if (_dragId) setDraggingId(_dragId); }}
                onDragEnd={() => { setDraggingId(null); _dragId = null; }}
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
            <div className="flex flex-col items-center justify-center h-48 gap-3">
                <Search size={36} strokeWidth={1} className="text-stone-300" />
                <p className="text-[12px] font-semibold text-stone-400">"{search}" ile eşleşen resim bulunamadı</p>
            </div>
        );
    }
    if (filter !== 'all') {
        return (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
                <Layers size={36} strokeWidth={1} className="text-stone-300" />
                <p className="text-[12px] font-semibold text-stone-400">Bu filtrede kayıt yok</p>
            </div>
        );
    }
    return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="p-5 bg-[#378ADD]/8 rounded-3xl border-2 border-dashed border-[#378ADD]/20">
                <Ruler size={44} strokeWidth={1.2} className="text-[#378ADD]/50" />
            </div>
            <div className="text-center">
                <p className="text-[14px] font-bold text-stone-600">Henüz teknik resim yok</p>
                <p className="text-[11px] text-stone-400 mt-1">PNG, JPG veya JPEG formatında çizimlerinizi yükleyin</p>
            </div>
            <button
                onClick={onUpload}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#378ADD] text-white text-[12px] font-bold rounded-xl hover:bg-[#2a6ab8] transition-colors"
            >
                <Upload size={14} /> İlk resmi yükle
            </button>
        </div>
    );
}
