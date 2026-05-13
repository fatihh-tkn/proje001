import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
    Ruler, Search, X, Loader2, Grid, List, Upload, RefreshCw,
    Download, Eye, AlertTriangle, CheckCircle2, Clock, ScanLine,
    Layers, FileText, Table2, Cpu, Scissors, Link2, Link2Off,
    FolderOpen, ExternalLink, Trash2
} from 'lucide-react';

import { useErrorStore } from '../../../store/errorStore';

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tiff']);
const isImage = t => IMAGE_EXTS.has((t || '').toLowerCase());

/* ── Belge işleme ilerlemesini SSE üzerinden toast'a yansıt ─────────── */
function subscribeToDocProgress(docId, filename) {
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
            } else if (data.error) {
                es.close();
                replaceToast(toastId, { type: 'error', message: `${short} — ${data.step}`, duration: 7000 });
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

    return (
        <div
            ref={ref}
            className="fixed z-[100] bg-white border border-stone-200 rounded-xl shadow-2xl overflow-hidden py-1 min-w-[160px]"
            style={{ top: y, left: x }}
        >
            <button
                onClick={() => { onDelete(item); onClose(); }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12px] font-semibold text-red-500 hover:bg-red-50 transition-colors"
            >
                <Trash2 size={13} /> Sil
            </button>
        </div>
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
function UploadModal({ onClose, onUploaded }) {
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
                if (cizimId) subscribeToDocProgress(cizimId, cizimFile.name);
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
                if (nestingId) subscribeToDocProgress(nestingId, nestingFile.name);
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
                        file={cizimFile} onFile={setCizimFile} inputRef={cizimRef} accept="image/*,.pdf,.dwg,.dxf" />
                    <FileSlot label="Nesting Planı" color="orange" icon={Scissors}
                        file={nestingFile} onFile={setNestingFile} inputRef={nestingRef} accept="image/*,.pdf,.dwg,.dxf" />
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
                <input ref={inputRef} type="file" accept="image/*,.pdf,.dwg,.dxf" className="hidden"
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
                            <p className="text-[11px] text-stone-400 mt-0.5">PNG, JPG, JPEG, PDF desteklenir</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Bağlı dosya durum göstergesi ───────────────────────────────── */
function LinkStatus({ item, onUnlink, onStartLink }) {
    const bagli     = item.meta?.bagli_dosyalar || {};
    const cadId     = bagli.cad;
    const nestingId = bagli.nesting;

    return (
        <div className="flex items-center gap-1">
            {/* CAD badge */}
            <div className="group/badge relative flex items-center">
                {cadId ? (
                    <>
                        <span className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-violet-100 text-violet-700 border border-violet-300">
                            <Cpu size={7} /> CAD <CheckCircle2 size={7} className="text-violet-500" />
                        </span>
                        <button
                            onClick={e => { e.stopPropagation(); onUnlink(item.id, 'cad'); }}
                            title="Bağlantıyı kaldır"
                            className="absolute -top-1.5 -right-1.5 hidden group-hover/badge:flex w-3.5 h-3.5 items-center justify-center bg-red-500 text-white rounded-full shadow"
                        >
                            <X size={6} />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={e => { e.stopPropagation(); onStartLink(item, 'cad'); }}
                        title="CAD dosyası bağla"
                        className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-stone-50 text-stone-300 border border-dashed border-stone-200 hover:border-violet-300 hover:text-violet-400 hover:bg-violet-50 transition-colors"
                    >
                        <Cpu size={7} /> CAD
                    </button>
                )}
            </div>

            {/* NES badge */}
            <div className="group/badge relative flex items-center">
                {nestingId ? (
                    <>
                        <span className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-orange-100 text-orange-600 border border-orange-300">
                            <Scissors size={7} /> NES <CheckCircle2 size={7} className="text-orange-500" />
                        </span>
                        <button
                            onClick={e => { e.stopPropagation(); onUnlink(item.id, 'nesting'); }}
                            title="Bağlantıyı kaldır"
                            className="absolute -top-1.5 -right-1.5 hidden group-hover/badge:flex w-3.5 h-3.5 items-center justify-center bg-red-500 text-white rounded-full shadow"
                        >
                            <X size={6} />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={e => { e.stopPropagation(); onStartLink(item, 'nesting'); }}
                        title="Nesting dosyası bağla"
                        className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-stone-50 text-stone-300 border border-dashed border-stone-200 hover:border-orange-300 hover:text-orange-400 hover:bg-orange-50 transition-colors"
                    >
                        <Scissors size={7} /> NES
                    </button>
                )}
            </div>
        </div>
    );
}

/* ── Excel indirme yardımcıları ─────────────────────────────────── */
function _buildTeknikSheet(va) {
    const bb = va?.baslik_bloku || {};
    const rows = [];
    rows.push(['BAŞLIK BLOĞU', '']);
    [['Çizim No', bb.cizim_numarasi], ['Başlık', bb.baslik], ['Firma', bb.firma],
     ['Proje', bb.proje], ['Revizyon', bb.revizyon], ['Ölçek', bb.olcek],
     ['Tarih', bb.tarih], ['Çizen', bb.cizen], ['Onaylayan', bb.onaylayan],
    ].forEach(([k, v]) => { if (v) rows.push([k, v]); });

    rows.push([]);
    rows.push(['PARÇA LİSTESİ', '', '', '']);
    rows.push(['Poz', 'Adet', 'Malzeme', 'Açıklama']);
    (va?.parca_listesi || []).forEach(p =>
        rows.push([p.poz || '', p.adet || '', p.malzeme || '', p.aciklama || ''])
    );

    if (va?.olcular?.length) {
        rows.push([]); rows.push(['ÖLÇÜLER']);
        rows.push(va.olcular.map(String));
    }
    if (va?.toleranslar?.length) {
        rows.push([]); rows.push(['TOLERANSLAR']);
        rows.push(va.toleranslar.map(String));
    }
    if (va?.notlar?.length) {
        rows.push([]); rows.push(['NOTLAR']);
        va.notlar.forEach(n => rows.push(['', n]));
    }
    if (va?.genel_metin) { rows.push([]); rows.push(['GENEL METİN', va.genel_metin]); }
    return rows;
}

function _buildNestingSheet(va) {
    const rows = [];
    rows.push(['GENEL BİLGİLER', '']);
    [['Program', va?.program_adi], ['Malzeme No', va?.malzeme_numarasi],
     ['Malzeme', va?.malzeme], ['Kalınlık', va?.kalinlik],
     ['Levha Boyutu', va?.levha_boyutu], ['Toplam Parça', va?.toplam_parca_adedi],
     ['Kullanım Oranı', va?.kullanim_orani], ['Fire Oranı', va?.fire_orani],
    ].forEach(([k, v]) => { if (v) rows.push([k, v]); });

    if (va?.islemler?.length) {
        rows.push([]); rows.push(['YAPILACAK İŞLEMLER']);
        rows.push(va.islemler.map(String));
    }

    rows.push([]);
    rows.push(['PARÇA LİSTESİ', '', '']);
    rows.push(['Parça Adı', 'Adet', 'Malzeme']);
    (va?.parca_listesi || []).forEach(p =>
        rows.push([p.parca_adi || '', p.adet || '', p.malzeme || ''])
    );

    if (va?.notlar?.length) {
        rows.push([]); rows.push(['NOTLAR']);
        va.notlar.forEach(n => rows.push(['', n]));
    }
    if (va?.genel_metin) { rows.push([]); rows.push(['GENEL METİN', va.genel_metin]); }
    return rows;
}

function downloadExcel(item, linkedItem) {
    const wb = XLSX.utils.book_new();
    const va = item.meta?.vision_analysis;
    const lva = linkedItem?.meta?.vision_analysis;

    if (va?.image_type === 'teknik_resim') {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(_buildTeknikSheet(va)), 'Teknik Resim');
        if (lva?.image_type === 'nesting')
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(_buildNestingSheet(lva)), 'Nesting');
    } else if (va?.image_type === 'nesting') {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(_buildNestingSheet(va)), 'Nesting');
        if (lva?.image_type === 'teknik_resim')
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(_buildTeknikSheet(lva)), 'Teknik Resim');
    } else {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Analiz verisi yok']]), 'Veri');
    }
    const name = item.filename.replace(/\.[^.]+$/, '') + '_analiz.xlsx';
    XLSX.writeFile(wb, name);
}

/* ── Veri tablo modali ───────────────────────────────────────────── */
function DataTableModal({ item, allItems, onClose }) {
    const va       = item.meta?.vision_analysis;
    const bagli    = item.meta?.bagli_dosyalar || {};

    // Bağlı dosyayı bul (nesting veya cizim)
    const linkedId = bagli.nesting || bagli.cad || bagli.cizim;
    const linkedItem = linkedId ? (allItems || []).find(i => i.id === linkedId) : null;
    const lva = linkedItem?.meta?.vision_analysis;

    // Hangi sekme başta açılsın
    const initTab = va?.image_type === 'nesting' ? 'nesting' : 'teknik';
    const [tab, setTab] = useState(initTab);

    const hasTeknik  = va?.image_type === 'teknik_resim' || lva?.image_type === 'teknik_resim';
    const hasNesting = va?.image_type === 'nesting'      || lva?.image_type === 'nesting';

    const activeVa = tab === 'teknik'
        ? (va?.image_type === 'teknik_resim' ? va : lva)
        : (va?.image_type === 'nesting'      ? va : lva);

    const hasAny = hasTeknik || hasNesting;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
            <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden"
                 style={{ width: '820px', maxHeight: '88vh' }}>

                {/* ── Başlık ── */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-stone-100 shrink-0">
                    <div className="p-2 rounded-xl bg-[#378ADD]/10">
                        <Table2 size={15} className="text-[#378ADD]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-stone-800 truncate">{item.filename}</p>
                        <p className="text-[10px] text-stone-400">Yapısal analiz verisi</p>
                    </div>

                    {/* Sekme geçiş */}
                    {(hasTeknik && hasNesting) && (
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
                <div className="flex-1 overflow-y-auto minimal-scroll">
                    {!hasAny ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-3 text-stone-400">
                            <Table2 size={32} strokeWidth={1} />
                            <p className="text-[12px] font-medium">Henüz analiz edilmemiş — önce "Analiz Et" butonuna basın</p>
                        </div>
                    ) : tab === 'teknik' ? (
                        <TeknikTable va={activeVa} />
                    ) : (
                        <NestingTable va={activeVa} />
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

/* ── Teknik Resim tablo görünümü ─────────────────────────────────── */
function TeknikTable({ va }) {
    if (!va) return (
        <div className="flex items-center justify-center h-32 text-stone-400 text-[12px]">
            Teknik çizim analizi bulunamadı
        </div>
    );
    const bb = va.baslik_bloku || {};
    const bbRows = [
        ['Çizim No',  bb.cizim_numarasi], ['Başlık',    bb.baslik],
        ['Firma',     bb.firma],           ['Proje',     bb.proje],
        ['Revizyon',  bb.revizyon],        ['Ölçek',     bb.olcek],
        ['Tarih',     bb.tarih],           ['Çizen',     bb.cizen],
        ['Onaylayan', bb.onaylayan],
    ].filter(([, v]) => v);

    return (
        <div className="p-6 flex flex-col gap-6">
            {/* Başlık bloğu */}
            {bbRows.length > 0 && (
                <SheetBlock title="Başlık Bloğu" color="blue" icon={FileText}>
                    <SheetKVTable rows={bbRows} />
                </SheetBlock>
            )}

            {/* Parça listesi */}
            {va.parca_listesi?.length > 0 && (
                <SheetBlock title="Parça Listesi" color="violet" icon={Layers}>
                    <SheetDataTable
                        cols={[
                            { key: 'poz',      label: 'Poz',       w: '10%' },
                            { key: 'adet',     label: 'Adet',      w: '10%' },
                            { key: 'malzeme',  label: 'Malzeme',   w: '25%' },
                            { key: 'aciklama', label: 'Açıklama',  w: '55%' },
                        ]}
                        rows={va.parca_listesi}
                    />
                </SheetBlock>
            )}

            {/* Ölçüler */}
            {va.olcular?.length > 0 && (
                <SheetBlock title="Ölçüler" color="blue">
                    <SheetTagTable items={va.olcular} />
                </SheetBlock>
            )}

            {/* Toleranslar */}
            {va.toleranslar?.length > 0 && (
                <SheetBlock title="Toleranslar" color="stone">
                    <SheetTagTable items={va.toleranslar} />
                </SheetBlock>
            )}

            {/* Yüzey işlemleri */}
            {va.yuzey_islemleri?.length > 0 && (
                <SheetBlock title="Yüzey İşlemleri" color="stone">
                    <SheetTagTable items={va.yuzey_islemleri} />
                </SheetBlock>
            )}

            {/* Notlar */}
            {va.notlar?.length > 0 && (
                <SheetBlock title="Notlar" color="stone">
                    <SheetNoteTable items={va.notlar} />
                </SheetBlock>
            )}

            {/* Genel metin */}
            {va.genel_metin && (
                <SheetBlock title="Genel Metin" color="stone">
                    <p className="text-[12px] text-stone-600 leading-relaxed px-1">{va.genel_metin}</p>
                </SheetBlock>
            )}
        </div>
    );
}

/* ── Nesting tablo görünümü ──────────────────────────────────────── */
function NestingTable({ va }) {
    if (!va) return (
        <div className="flex items-center justify-center h-32 text-stone-400 text-[12px]">
            Nesting analizi bulunamadı
        </div>
    );

    const genelRows = [
        ['Program',         va.program_adi],
        ['Malzeme No',      va.malzeme_numarasi],
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
                    <SheetKVTable rows={genelRows} highlightKeys={['Kullanım Oranı', 'Fire Oranı']} />
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
                            { key: 'parca_adi', label: 'Parça Adı',  w: '50%' },
                            { key: 'adet',      label: 'Adet',        w: '15%' },
                            { key: 'malzeme',   label: 'Malzeme',     w: '35%' },
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
    return (
        <table className="w-full text-[12px]">
            <tbody>
                {items.map((it, i) => (
                    <tr key={i} className={`border-b border-stone-50 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-stone-50/40'}`}>
                        <td className="px-4 py-2 w-10 text-stone-300 font-mono font-bold text-[10px]">{i + 1}</td>
                        <td className="px-4 py-2 text-stone-700 font-medium">{String(it)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function SheetNoteTable({ items }) {
    return (
        <table className="w-full text-[12px]">
            <tbody>
                {items.map((it, i) => (
                    <tr key={i} className={`border-b border-stone-50 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-stone-50/40'}`}>
                        <td className="px-4 py-2 w-8 text-stone-300 font-bold">•</td>
                        <td className="px-4 py-2 text-stone-600 leading-relaxed">{String(it)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

/* ── Grid kartı ──────────────────────────────────────────────────── */
function TeknikKart({ item, allItems, onOpen, onVectorize, vectorizing, onOpenLinked, onStartLink, onUnlink, onDetail, onDelete }) {
    const [imgErr,   setImgErr]   = useState(false);
    const [ctxMenu,  setCtxMenu]  = useState(null);
    const clickTimer = useRef(null);

    const va        = item.meta?.vision_analysis;
    const isTR      = va?.image_type === 'teknik_resim';
    const bb        = isTR ? (va.baslik_bloku || {}) : {};
    const status    = item.meta?.transcription_status;
    const canAnalyze = status !== 'processing' && !va;
    const bagli     = item.meta?.bagli_dosyalar || {};
    const nestingId = bagli.nesting;
    const cadId     = bagli.cad;

    const nestingItem    = nestingId ? (allItems || []).find(i => i.id === nestingId) : null;
    const nestingVision  = nestingItem?.meta?.vision_analysis;
    const nestingMatNum  = nestingVision?.malzeme_numarasi || '';

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
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            className="group bg-white border border-stone-200 rounded-xl overflow-hidden hover:border-[#378ADD]/40 hover:shadow-lg transition-all cursor-pointer flex flex-col"
        >
            {/* Önizleme */}
            <div className="relative h-[140px] bg-stone-50 overflow-hidden">
                {!imgErr ? (
                    <img
                        src={`/api/archive/file/${item.id}`}
                        alt={item.filename}
                        className="w-full h-full object-contain p-2"
                        onError={() => setImgErr(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-200">
                        <Ruler size={40} strokeWidth={1} />
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
                    {nestingId && (
                        <button
                            onClick={e => { e.stopPropagation(); onOpenLinked(nestingId); }}
                            className="flex items-center gap-1 px-2 py-1 bg-orange-500 text-white text-[10px] font-bold rounded-lg shadow hover:bg-orange-600 transition-colors"
                        >
                            <Scissors size={9} /> Nesting Aç
                        </button>
                    )}
                </div>

                <div className="absolute top-2 left-2">
                    <StatusBadge item={item} />
                </div>
                <div className="absolute top-2 right-2 flex items-center gap-1">
                    <CadBadge item={item} />
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
                {isTR && bb.cizim_numarasi && (
                    <span className="text-[9px] font-black text-[#378ADD] tracking-widest uppercase">
                        #{bb.cizim_numarasi}
                    </span>
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

                {/* Otomatik eşleşme bandı */}
                {nestingId && nestingMatNum && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-orange-50 border border-orange-100 rounded-lg mt-1">
                        <Link2 size={9} className="text-orange-400 shrink-0" />
                        <span className="text-[9px] text-orange-500 font-bold truncate">{nestingMatNum}</span>
                    </div>
                )}

                {/* Bağlantı durumu + alt bilgi */}
                <div className="mt-auto pt-2 border-t border-stone-50 flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                    <LinkStatus item={item} onUnlink={onUnlink} onStartLink={onStartLink} />
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
const LCOLS = { gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,0.8fr) minmax(0,0.9fr) 80px 80px 80px 100px 110px 110px 60px' };

function ListHeader() {
    return (
        <div className="grid gap-3 px-4 py-2 text-[10px] font-black tracking-widest uppercase text-stone-400 border-b border-stone-100 bg-white" style={LCOLS}>
            <span>DOSYA ADI</span>
            <span>ÇİZİM NO</span>
            <span>BAŞLIK</span>
            <span>REVİZYON</span>
            <span>ÖLÇEK</span>
            <span>TİP</span>
            <span>DURUM</span>
            <span>BOYUT</span>
            <span>TARİH</span>
            <span />
        </div>
    );
}

function ListRow({ item, onOpen, onVectorize, vectorizing, onOpenLinked, onStartLink, onUnlink, onDetail, onDelete }) {
    const [ctxMenu, setCtxMenu] = useState(null);
    const va = item.meta?.vision_analysis;
    const isTR = va?.image_type === 'teknik_resim';
    const bb = isTR ? (va.baslik_bloku || {}) : {};
    const canAnalyze = !va && item.meta?.transcription_status !== 'processing';

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
            onClick={() => onOpen(item)}
            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY }); }}
            className="group grid gap-3 px-4 py-2.5 items-center bg-white hover:bg-stone-50 border-b border-stone-100 cursor-pointer transition-colors"
            style={LCOLS}
        >
            <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded text-white uppercase" style={{ background: '#8b5cf6' }}>
                    {(item.file_type || 'IMG').slice(0, 4).toUpperCase()}
                </span>
                <span className="text-[11px] font-semibold text-stone-800 truncate">{item.filename.replace(/\.[^.]+$/, '')}</span>
            </div>
            <span className="text-[11px] text-[#378ADD] font-bold truncate">{bb.cizim_numarasi || '—'}</span>
            <span className="text-[11px] text-stone-600 truncate">{bb.baslik || '—'}</span>
            <span className="text-[11px] text-stone-500">{bb.revizyon || '—'}</span>
            <span className="text-[11px] text-stone-500">{bb.olcek || '—'}</span>
            <div onClick={e => e.stopPropagation()}>
                <LinkStatus item={item} onUnlink={onUnlink} onStartLink={onStartLink} />
            </div>
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

/* ── Ana bileşen ─────────────────────────────────────────────────── */
export default function TeknikResimViewer({ onOpenFile }) {
    const [items,      setItems]      = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [search,     setSearch]     = useState('');
    const [filter,     setFilter]     = useState('all');
    const [view,       setView]       = useState('grid');
    const [vectorizing,  setVectorizing]  = useState(null);
    const [uploadModal,  setUploadModal]  = useState(false);
    const [linkModal,    setLinkModal]    = useState(null);
    const [detailItem,   setDetailItem]   = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/archive/list');
            if (res.ok) {
                const data = await res.json();
                const TEKNIK_EXTS = new Set(['png','jpg','jpeg','webp','bmp','gif','tiff','pdf']);
                const imgs = (data.items || [])
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
            if (res.ok) subscribeToDocProgress(item.id, item.filename);
            setTimeout(load, 1500);
        } catch {}
        finally { setVectorizing(null); }
    };

    const handleDelete = useCallback(async (item) => {
        try {
            await fetch(`/api/archive/documents/${item.id}`, { method: 'DELETE' });
            load();
        } catch {}
    }, [load]);

    const processingCount = items.filter(i => i.meta?.transcription_status === 'processing').length;

    return (
        <>
        {detailItem && (
            <DataTableModal item={detailItem} allItems={items} onClose={() => setDetailItem(null)} />
        )}
        {uploadModal && (
            <UploadModal onClose={() => setUploadModal(false)} onUploaded={load} />
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
                            onClick={() => setUploadModal(true)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#378ADD] text-white text-[12px] font-bold rounded-xl hover:bg-[#2a6ab8] transition-colors"
                        >
                            <Upload size={14} /> Yükle
                        </button>
                    </div>
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
            <div className="flex-1 overflow-y-auto p-6 minimal-scroll">
                {loading ? (
                    <div className="flex items-center justify-center h-48 gap-2 text-stone-400">
                        <Loader2 size={20} className="animate-spin text-[#378ADD]" />
                        <span className="text-[12px] font-medium">Yükleniyor...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState search={search} filter={filter} onUpload={() => setUploadModal(true)} />
                ) : view === 'grid' ? (
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
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                        <ListHeader />
                        {filtered.map(item => (
                            <ListRow
                                key={item.id}
                                item={item}
                                onOpen={handleOpen}
                                onVectorize={handleVectorize}
                                vectorizing={vectorizing}
                                onOpenLinked={handleOpenLinked}
                                onStartLink={(it, lt) => setLinkModal({ item: it, linkType: lt })}
                                onUnlink={handleUnlink}
                                onDetail={setDetailItem}
                                onDelete={handleDelete}
                            />
                        ))}
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
