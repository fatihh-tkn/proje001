import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    PackageOpen, Folder, File, ChevronRight, Upload, Plus, Search,
    FileText, FileImage, FileSpreadsheet, FileCode, Film, Music,
    Database, Trash2, FolderInput, Cpu, X, CheckSquare, Square,
    ArrowUpDown, SlidersHorizontal, Edit2, Check, Tag, MessageSquare,
    ExternalLink, Download, Mic, Loader2, AlertCircle, Clock, CornerLeftUp
} from 'lucide-react';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { dispatchArchiveChanged, useArchiveChangedListener } from '../../../utils/archiveEvents';
import { FileCard } from '../../ui/file-card-collections';

// ── YARDIMCI: Dosya türüne göre ikon ve renk
const getFileVisual = (fileType) => {
    const t = (fileType || '').toLowerCase();
    if (t === 'pdf') return { Icon: FileText, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' };
    if (['xls', 'xlsx', 'csv'].includes(t)) return { Icon: FileSpreadsheet, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' };
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(t)) return { Icon: FileImage, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' };
    if (['doc', 'docx', 'txt', 'md'].includes(t)) return { Icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' };
    if (['mp4', 'avi', 'mov'].includes(t)) return { Icon: Film, color: 'text-pink-500', bg: 'bg-pink-50', border: 'border-pink-100' };
    if (['mp3', 'wav', 'ogg'].includes(t)) return { Icon: Music, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' };
    if (['py', 'js', 'ts', 'json', 'html'].includes(t)) return { Icon: FileCode, color: 'text-cyan-500', bg: 'bg-cyan-50', border: 'border-cyan-100' };
    return { Icon: File, color: 'text-stone-400', bg: 'bg-stone-50', border: 'border-stone-100' };
};

// Sadece arşiv modunda olan formatlar
const ARCHIVE_ONLY_TYPES = ['xls', 'xlsx', 'csv'];
const isArchiveOnly = (fileType) => ARCHIVE_ONLY_TYPES.includes((fileType || '').toLowerCase());

const isAudio = (t) => ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes((t || '').toLowerCase());
const isVideo = (t) => ['mp4', 'avi', 'mov', 'webm'].includes((t || '').toLowerCase());
const isImage = (t) => ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes((t || '').toLowerCase());
const isPdf = (t) => (t || '').toLowerCase() === 'pdf';

const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024, dm = 1, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// ── SAĞ TIK CONTEXT MENU
const ContextMenu = ({ x, y, item, onClose, onDelete, onRename, onMove }) => {
    const ref = useRef(null);
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="fixed z-[9999] bg-white border border-stone-200 rounded-lg shadow-xl py-1 w-44"
            style={{ top: y, left: x }}
        >
            <button onClick={() => { onRename(item); onClose(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-stone-700 hover:bg-stone-50 transition-colors">
                <Edit2 size={13} className="text-stone-400" /> Yeniden Adlandır
            </button>
            <button onClick={() => { onMove(item); onClose(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-stone-700 hover:bg-stone-50 transition-colors">
                <FolderInput size={13} className="text-stone-400" /> Klasöre Taşı
            </button>
            {item.file_type !== 'folder' && (
                <button onClick={onClose}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-stone-700 hover:bg-stone-50 transition-colors">
                    <Cpu size={13} className="text-teal-500" /> Vektörleştir
                </button>
            )}
            <div className="border-t border-stone-100 my-1" />
            <button onClick={() => { onDelete([item.id]); onClose(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 size={13} /> Sil
            </button>
        </div>
    );
};

// ── TAŞI MODAL
const MoveModal = ({ item, folders, onClose, onMove }) => {
    const [targetId, setTargetId] = useState(null);
    return (
        <div className="fixed inset-0 z-[9000] bg-black/30 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-2xl w-80 overflow-hidden">
                <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
                    <h3 className="text-[14px] font-bold text-stone-800">Klasöre Taşı</h3>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={16} /></button>
                </div>
                <div className="p-4 max-h-64 overflow-y-auto flex flex-col gap-1">
                    <button
                        onClick={() => setTargetId(null)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition-colors ${targetId === null ? 'bg-[#378ADD]/10 text-[#378ADD]' : 'hover:bg-stone-50 text-stone-700'}`}
                    >
                        <Folder size={14} /> Kök Dizin
                    </button>
                    {folders.filter(f => f.id !== item.id).map(f => (
                        <button key={f.id}
                            onClick={() => setTargetId(f.id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition-colors ${targetId === f.id ? 'bg-[#378ADD]/10 text-[#378ADD]' : 'hover:bg-stone-50 text-stone-700'}`}
                        >
                            <Folder size={14} className="text-amber-500" /> {f.filename}
                        </button>
                    ))}
                </div>
                <div className="px-4 py-3 border-t border-stone-100 flex justify-end gap-2">
                    <button onClick={onClose} className="px-3 py-1.5 text-[12px] bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-md">İptal</button>
                    <button onClick={() => { onMove(item.id, targetId); onClose(); }} className="px-3 py-1.5 text-[12px] bg-[#378ADD] hover:bg-[#2A68AB] text-white rounded-md">Taşı</button>
                </div>
            </div>
        </div>
    );
};

// ── DETAY / ÖNİZLEME PANELİ
const DetailPanel = ({ doc, onClose, onTagUpdate, onDescUpdate, onTranscribe, onTranscribeComplete }) => {
    const [tags, setTags] = useState(doc?.etiketler || []);
    const [tagInput, setTagInput] = useState('');
    const [desc, setDesc] = useState(doc?.aciklama || '');
    const [descEditing, setDescEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [transcribing, setTranscribing] = useState(false);
    const [txFullText, setTxFullText] = useState('');
    const [txLoading, setTxLoading] = useState(false);
    const [txPercent, setTxPercent] = useState(0);
    const [showCancelPanel, setShowCancelPanel] = useState(false);

    useEffect(() => {
        setTags(doc?.etiketler || []);
        setDesc(doc?.aciklama || '');
        setDescEditing(false);

        const status = doc?.meta?.transcription_status;
        const metaFullText = doc?.meta?.transcription_full_text || '';

        if (metaFullText) {
            setTxFullText(metaFullText);
        } else {
            setTxFullText('');
            // Transkripsiyon tamamlandıysa tam metni arka planda çek
            if ((isAudio(doc?.file_type) || isVideo(doc?.file_type)) && status === 'done') {
                setTxLoading(true);
                fetch(`/api/archive/transcript/${doc.id}`)
                    .then(r => r.ok ? r.json() : null)
                    .then(data => {
                        if (data?.full_text) setTxFullText(data.full_text);
                    })
                    .catch(() => { })
                    .finally(() => setTxLoading(false));
            }
        }
    }, [doc?.id, doc?.meta?.transcription_status, doc?.meta?.transcription_full_text, doc?.file_type]);

    // İşleme sırasında progress bilgisini her 1 saniyede bir çek
    const status_for_poll = doc?.meta?.transcription_status;
    const doc_id_for_poll = doc?.id;
    const file_type_for_poll = doc?.file_type;
    useEffect(() => {
        const isProc = status_for_poll === 'processing' || status_for_poll === 'pending';
        if (!isProc || !doc_id_for_poll || !(isAudio(file_type_for_poll) || isVideo(file_type_for_poll))) return;
        setTxPercent(0);
        let notified = false;
        let timer;
        timer = setInterval(async () => {
            try {
                const r = await fetch(`/api/archive/progress/${doc_id_for_poll}`);
                if (r.ok) {
                    const d = await r.json();
                    setTxPercent(d.percent ?? 0);
                    // Yüzde 100'e ulaşınca parent'ı bilgilendir (bir kez yeter)
                    if (!notified && (d.percent ?? 0) >= 100) {
                        notified = true;
                        clearInterval(timer);
                        onTranscribeComplete?.(doc_id_for_poll);
                    }
                }
            } catch { }
        }, 1000);
        return () => clearInterval(timer);
    }, [status_for_poll, doc_id_for_poll, file_type_for_poll, onTranscribeComplete]);

    if (!doc) return null;

    const addTag = async (tag) => {
        if (!tag.trim() || tags.includes(tag.trim())) return;
        const newTags = [...tags, tag.trim()];
        setTags(newTags);
        setTagInput('');
        await fetch('/api/archive/meta', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kimlik: doc.id, etiketler: newTags })
        });
        onTagUpdate?.(doc.id, newTags);
    };

    const removeTag = async (tag) => {
        const newTags = tags.filter(t => t !== tag);
        setTags(newTags);
        await fetch('/api/archive/meta', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kimlik: doc.id, etiketler: newTags })
        });
        onTagUpdate?.(doc.id, newTags);
    };

    const saveDesc = async () => {
        setSaving(true);
        await fetch('/api/archive/meta', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kimlik: doc.id, aciklama: desc })
        });
        setSaving(false);
        setDescEditing(false);
        onDescUpdate?.(doc.id, desc);
    };

    const { Icon, color, bg } = getFileVisual(doc.file_type);
    const previewUrl = `/api/archive/file/${doc.id}`;

    return (
        <div
            className="absolute top-0 right-0 w-[340px] h-full bg-white border-l border-stone-200 shadow-xl flex flex-col z-50 overflow-hidden"
            style={{ transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
            {/* Header */}
            <div className="flex-none px-5 py-3.5 flex items-center justify-between border-b border-stone-100 bg-stone-50/50">
                <h3 className="text-[13px] font-bold text-stone-800 truncate">{doc.filename}</h3>
                <button onClick={onClose} className="p-1 hover:bg-stone-200 rounded-full text-stone-500 shrink-0 ml-2">
                    <X size={15} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Önizleme Alanı */}
                <div className="border-b border-stone-100">
                    {isAudio(doc.file_type) ? (
                        <div className="p-4 bg-stone-50 flex items-center justify-center">
                            <audio controls src={previewUrl} className="w-full max-w-[280px]" />
                        </div>
                    ) : isVideo(doc.file_type) ? (
                        <video controls src={previewUrl} className="w-full max-h-48 bg-black" />
                    ) : isImage(doc.file_type) ? (
                        <img src={previewUrl} alt={doc.filename} className="w-full max-h-48 object-contain bg-stone-50 p-4" />
                    ) : isPdf(doc.file_type) ? (
                        <iframe src={previewUrl} title="PDF Önizleme" className="w-full h-48 border-0 bg-stone-50" />
                    ) : (
                        <div className={`flex flex-col items-center justify-center h-32 ${bg}`}>
                            <div className="scale-[1.15] mb-2 opacity-90"><FileCard formatFile={doc.file_type || ''} /></div>
                            <a
                                href={previewUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 flex items-center gap-1 text-[11px] text-[#378ADD] hover:underline"
                            >
                                <ExternalLink size={11} /> Dosyayı Aç
                            </a>
                        </div>
                    )}
                </div>

                <div className="p-4 flex flex-col gap-4">
                    {/* Metadata */}
                    <div className="flex flex-col gap-2 text-[12px]">
                        {[
                            ['Tür', doc.file_type?.toUpperCase()],
                            ['Boyut', formatBytes(doc.file_size)],
                            ['Yükleyen', doc.uploader],
                            ['Tarih', new Date(doc.created_at).toLocaleString('tr')],
                            ['Durum', isArchiveOnly(doc.file_type)
                                ? '📁 Yalnızca Arşiv'
                                : doc.is_vectorized ? '✅ Vektörleşmiş' : '📁 Arşivde'],
                            ['Chunk', doc.total_chunks > 0 ? `${doc.total_chunks} parça` : '-'],
                        ].map(([k, v]) => (
                            <div key={k} className="flex justify-between border-b border-stone-50 pb-1.5">
                                <span className="text-stone-400 font-medium">{k}</span>
                                <span className="text-stone-700 font-medium text-right">{v}</span>
                            </div>
                        ))}

                        {/* Excel/CSV uyarı notu */}
                        {isArchiveOnly(doc.file_type) && (
                            <div className="mt-1 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                                <span className="text-amber-500 text-[16px] shrink-0">⚠️</span>
                                <p className="text-[11px] text-amber-800 leading-relaxed">
                                    Bu <strong>{doc.file_type?.toUpperCase()}</strong> dosyası yapay zeka ile işlenmemiştir.
                                    İçeriği hakkında soru soramazsınız, ancak dosyayı açarak tabloları inceleyebilirsiniz.
                                </p>
                            </div>
                        )}

                        {/* Etiketler */}
                        <div>
                            <div className="flex items-center gap-1 mb-2">
                                <Tag size={12} className="text-stone-400" />
                                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Etiketler</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {tags.map(tag => (
                                    <span key={tag} className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 text-[11px] font-medium px-2 py-0.5 rounded-full">
                                        {tag}
                                        <button onClick={() => removeTag(tag)} className="text-stone-400 hover:text-red-500 transition-colors">
                                            <X size={10} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-1.5">
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') addTag(tagInput); }}
                                    placeholder="Etiket ekle..."
                                    className="flex-1 text-[11px] border border-stone-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-[#378ADD]"
                                />
                                <button
                                    onClick={() => addTag(tagInput)}
                                    className="px-2 py-1.5 bg-stone-800 text-white rounded-md text-[11px] hover:bg-stone-700"
                                >
                                    <Plus size={13} />
                                </button>
                            </div>
                        </div>

                        {/* Açıklama */}
                        <div>
                            <div className="flex items-center gap-1 mb-2">
                                <MessageSquare size={12} className="text-stone-400" />
                                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Açıklama</span>
                            </div>
                            {descEditing ? (
                                <div className="flex flex-col gap-1.5">
                                    <textarea
                                        autoFocus
                                        value={desc}
                                        onChange={e => setDesc(e.target.value)}
                                        rows={3}
                                        className="w-full text-[12px] border border-stone-200 rounded-md px-2.5 py-2 resize-none focus:outline-none focus:border-[#378ADD]"
                                        placeholder="Bu dosya hakkında not ekleyin..."
                                    />
                                    <div className="flex gap-1.5">
                                        <button onClick={saveDesc} disabled={saving}
                                            className="flex items-center gap-1 px-2.5 py-1 bg-[#378ADD] text-white rounded-md text-[11px] hover:bg-[#2A68AB]">
                                            <Check size={12} /> {saving ? 'Kaydediliyor...' : 'Kaydet'}
                                        </button>
                                        <button onClick={() => setDescEditing(false)}
                                            className="px-2.5 py-1 bg-stone-100 text-stone-600 rounded-md text-[11px] hover:bg-stone-200">
                                            İptal
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onClick={() => setDescEditing(true)}
                                    className="min-h-[48px] text-[12px] text-stone-600 bg-stone-50 rounded-md px-2.5 py-2 cursor-text border border-transparent hover:border-stone-200 transition-colors"
                                >
                                    {desc || <span className="text-stone-300 italic">Açıklama eklemek için tıklayın...</span>}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Ses / Video transkripsiyon satırı (Bilgi kutucuğunun altında) */}
                    {(isAudio(doc.file_type) || isVideo(doc.file_type)) && (() => {
                        const meta = doc.meta || {};
                        const txStatus = meta.transcription_status;
                        const txLang = meta.transcription_language;
                        const txError = meta.transcription_error;
                        const isProcessing = txStatus === 'processing' || txStatus === 'pending' || transcribing;
                        const txFileName = `${doc.filename.replace(/\.[^/.]+$/, '')}_transkript.txt`;

                        const handleDownloadTranscript = () => {
                            const blob = new Blob([txFullText], { type: 'text/plain;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = txFileName;
                            a.click();
                            URL.revokeObjectURL(url);
                        };

                        return (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-1 mb-1">
                                    <Mic size={12} className="text-stone-400" />
                                    <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Metin Dökümü</span>
                                </div>

                                {/* Transkript Metin Kutusu — sadece done & metin varsa */}
                                {txStatus === 'done' && txFullText && !txLoading && (
                                    <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg max-h-60 overflow-y-auto">
                                        <p className="text-[11px] text-stone-700 whitespace-pre-wrap leading-relaxed font-mono">
                                            {txFullText}
                                        </p>
                                    </div>
                                )}

                                {/* ── İŞLEM SÜRESINDE PROGRESS BAR KART ── */}
                                {isProcessing ? (
                                    <div
                                        className="mt-1 rounded-xl border border-amber-200 bg-amber-50 shadow-sm overflow-hidden cursor-pointer select-none"
                                        onClick={() => setShowCancelPanel(p => !p)}
                                        title="Detaylar için tıklayın"
                                    >
                                        {/* Bar alanı */}
                                        <div className="relative h-10 bg-amber-100">
                                            {/* Dolan çubuk */}
                                            <div
                                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-700 ease-out"
                                                style={{ width: `${Math.max(txPercent, 4)}%` }}
                                            />
                                            {/* Yüzde metni — ortada */}
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-[12px] font-bold text-amber-900 drop-shadow-sm select-none">
                                                    {txPercent > 0 ? `%${Math.round(txPercent)}` : '…'}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Alt durum satırı */}
                                        <div className="px-3 py-1.5 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <Loader2 size={11} className="animate-spin text-amber-500 shrink-0" />
                                                <span className="text-[10px] text-amber-700 font-medium animate-pulse">
                                                    Ses transkripte çevriliyor…
                                                </span>
                                            </div>
                                            <span className="text-[9px] text-amber-600 opacity-70">
                                                {showCancelPanel ? '▲' : '▼'}
                                            </span>
                                        </div>

                                        {/* ── Kayar İptal Paneli ── */}
                                        <div
                                            style={{
                                                maxHeight: showCancelPanel ? '80px' : '0px',
                                                overflow: 'hidden',
                                                transition: 'max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                            }}
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <div className="px-3 py-2.5 border-t border-amber-200 bg-amber-100/60 flex items-center gap-3">
                                                <AlertCircle size={14} className="text-amber-600 shrink-0" />
                                                <p className="text-[11px] text-amber-800 flex-1 leading-tight">
                                                    Transkripsiyon devam ediyor. İptal etmek istiyor musunuz?
                                                </p>
                                                <button
                                                    onClick={async () => {
                                                        setShowCancelPanel(false);
                                                        await fetch(`/api/archive/transcribe/${doc.id}`, { method: 'DELETE' });
                                                    }}
                                                    className="px-2.5 py-1 text-[10px] font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shrink-0"
                                                >
                                                    İptal Et
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* ── NORMAL KART (done / failed / idle) ── */
                                    <div className={`mt-1 flex items-center gap-3 px-3 py-2.5 rounded-xl border shadow-sm ${txStatus === 'done' ? 'bg-teal-50 border-teal-200' :
                                        txStatus === 'failed' ? 'bg-red-50 border-red-200' :
                                            'bg-stone-50 border-stone-200'
                                        }`}>
                                        {/* Sol ikon */}
                                        <div className={`shrink-0 p-1.5 rounded-lg ${txStatus === 'done' ? 'bg-teal-100' :
                                            txStatus === 'failed' ? 'bg-red-100' : 'bg-stone-100'
                                            }`}>
                                            {txLoading
                                                ? <Loader2 size={15} className="animate-spin text-amber-500" />
                                                : txStatus === 'done'
                                                    ? <Mic size={15} className="text-teal-600" />
                                                    : txStatus === 'failed'
                                                        ? <AlertCircle size={15} className="text-red-500" />
                                                        : <Mic size={15} className="text-stone-400" />
                                            }
                                        </div>

                                        {/* Başlık + durum */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-semibold text-stone-800 truncate">
                                                {txStatus === 'done' ? txFileName :
                                                    txStatus === 'failed' ? 'Transkripsiyon başarısız' :
                                                        'Transkript dosyası'}
                                            </p>
                                            <p className="text-[10px] mt-0.5 truncate">
                                                {txLoading
                                                    ? <span className="text-teal-500">Transkript yükleniyor…</span>
                                                    : txStatus === 'done' && txFullText
                                                        ? <span className="text-teal-600 font-medium">{txLang?.toUpperCase()} · {txFullText.length.toLocaleString('tr')} karakter · TXT</span>
                                                        : txStatus === 'done' && !txFullText
                                                            ? <span className="text-stone-400">Transkript metni bulunamadı</span>
                                                            : txStatus === 'failed'
                                                                ? <span className="text-red-500">İşlem sırasında hata oluştu. Tekrar deneyin.</span>
                                                                : <span className="text-stone-400">Henüz transkript oluşturulmadı</span>
                                                }
                                            </p>
                                        </div>

                                        {/* Sağ butonlar */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            {txStatus === 'done' && txFullText && !txLoading && (
                                                <button
                                                    onClick={handleDownloadTranscript}
                                                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-700 font-semibold transition-colors text-[10px]"
                                                    title="TXT olarak indir"
                                                >
                                                    <Download size={11} /> İndir
                                                </button>
                                            )}
                                            {!txLoading && txStatus !== 'done' && (
                                                <button
                                                    onClick={async () => {
                                                        setTranscribing(true);
                                                        setTxFullText('');
                                                        setTxPercent(0);
                                                        try { await onTranscribe?.(doc.id); }
                                                        finally { setTimeout(() => setTranscribing(false), 2000); }
                                                    }}
                                                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors text-[10px] font-semibold bg-[#378ADD] hover:bg-[#2A68AB] text-white"
                                                    title={txStatus === 'failed' ? 'Yeniden Dene' : 'Transkripti Çıkart'}
                                                >
                                                    <Mic size={11} />
                                                    {txStatus === 'failed' ? 'Yeniden Dene' : 'Transkripti Çıkart'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>

                {/* Footer / İndir Butonu */}
                <div className="flex-none p-4 border-t border-stone-100 bg-white">
                    <a
                        href={previewUrl}
                        download={doc.filename}
                        className="flex flex-1 items-center justify-center gap-2 w-full py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-[12px] font-medium transition-colors"
                    >
                        <Download size={14} /> Dosyayı İndir
                    </a>
                </div>
            </div>
        </div>
    );
};

// ── ANA BİLEŞEN
export default function AudioArchiveViewer() {
    const currentUser = useWorkspaceStore(state => state.currentUser);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());

    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    const [filterType, setFilterType] = useState('all');
    const [sortBy, setSortBy] = useState('newest');

    const [ctxMenu, setCtxMenu] = useState(null);
    const [renameItem, setRenameItem] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [moveItem, setMoveItem] = useState(null);

    // Drag state
    const [dragOverFolder, setDragOverFolder] = useState(null);

    const [transcriptionPolling, setTranscriptionPolling] = useState(null);

    const fileInputRef = useRef(null);

    // selectedDoc'un her zaman güncel değerini tutan ref (stale closure sorununu önler)
    const selectedDocRef = useRef(selectedDoc);
    useEffect(() => { selectedDocRef.current = selectedDoc; }, [selectedDoc]);

    const fetchArchive = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/archive/list');
            if (res.ok) {
                const data = await res.json();
                setItems(data.items || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchArchive(); }, [fetchArchive]);
    useArchiveChangedListener(fetchArchive);

    const getFolderPath = (folderId) => {
        const path = [];
        let cur = items.find(i => i.id === folderId);
        while (cur) {
            path.unshift(cur);
            cur = items.find(i => i.id === cur.folder_id && i.file_type === 'folder');
        }
        return path;
    };

    const breadcrumbs = currentFolderId ? getFolderPath(currentFolderId) : [];

    const currentItems = items
        .filter(item => {
            if (searchQuery) return item.filename.toLowerCase().includes(searchQuery.toLowerCase());
            return item.folder_id === currentFolderId;
        })
        .filter(item => {
            if (item.file_type === 'folder') return true;
            const t = (item.file_type || '').toLowerCase();
            const isAudioType = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(t);
            const isVideoType = ['mp4', 'avi', 'mov', 'webm'].includes(t);
            // Hide everything that is NOT audio or video
            if (!isAudioType && !isVideoType) return false;

            if (filterType === 'all') return true;
            if (filterType === 'audio') return isAudioType;
            if (filterType === 'video') return isVideoType;
            if (filterType === 'vectorized') return item.is_vectorized;
            return true;
        })
        .sort((a, b) => {
            if (a.file_type === 'folder' && b.file_type !== 'folder') return -1;
            if (a.file_type !== 'folder' && b.file_type === 'folder') return 1;
            if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
            if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
            if (sortBy === 'largest') return (b.file_size || 0) - (a.file_size || 0);
            if (sortBy === 'name') return a.filename.localeCompare(b.filename);
            return 0;
        });

    const folders = currentItems.filter(i => i.file_type === 'folder');
    const documents = currentItems.filter(i => i.file_type !== 'folder');

    // İstatistikleri SADECE ses ve video dosyalarına sınırla
    const allDocs = items.filter(i => {
        if (i.file_type === 'folder') return false;
        const t = (i.file_type || '').toLowerCase();
        return ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'mp4', 'avi', 'mov', 'webm'].includes(t);
    });

    const allFolders = items.filter(i => i.file_type === 'folder');
    const totalSize = allDocs.reduce((s, d) => s + (d.file_size || 0), 0);
    const vectorCount = allDocs.filter(d => d.is_vectorized).length;

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        await fetch('/api/archive/create-folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newFolderName, parent_id: currentFolderId })
        });
        fetchArchive(); setIsCreatingFolder(false); setNewFolderName('');
    };

    const handleUploadClick = () => {
        const { handleOpenFile } = useWorkspaceStore.getState();
        if (handleOpenFile) {
            handleOpenFile({
                id: 'database-settings',
                title: 'Dosya İşleme',
                type: 'database',
            });
        }
    };
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        if (currentFolderId) formData.append('folder_id', currentFolderId);
        if (currentUser?.id) formData.append('user_id', currentUser.id);
        setLoading(true);
        await fetch('/api/archive/direct-upload', { method: 'POST', body: formData });
        fetchArchive();
    };

    const toggleSelect = (id, e) => {
        e.stopPropagation();
        setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };

    const handleBatchDelete = async (ids) => {
        if (!window.confirm(`${ids.length} öğe silinecek. Emin misiniz?`)) return;
        const res = await fetch('/api/archive/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        setSelectedIds(new Set());
        if (selectedDoc && ids.includes(selectedDoc.id)) setSelectedDoc(null);
        fetchArchive();
        if (res.ok) dispatchArchiveChanged();
    };

    const handleRename = async () => {
        if (!renameValue.trim()) return;
        await fetch('/api/archive/rename', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kimlik: renameItem.id, yeni_ad: renameValue })
        });
        setRenameItem(null);
        fetchArchive();
    };

    const handleMove = async (docId, targetFolderId) => {
        await fetch('/api/archive/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ belge_kimlik: docId, hedef_klasor_kimlik: targetFolderId })
        });
        fetchArchive();
    };

    const handleBatchMove = async (docIds, targetFolderId) => {
        setLoading(true);
        for (const id of docIds) {
            await fetch('/api/archive/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ belge_kimlik: id, hedef_klasor_kimlik: targetFolderId })
            });
        }
        fetchArchive();
        setSelectedIds(new Set());
    };

    // Drag-and-drop handlers
    const handleDragStart = (e, item) => {
        let dragIds = [item.id];
        // Seçim modundaysak ve sürüklenen öğe seçili gruptaysa, tüm grubu sürükle
        if (selectedIds.has(item.id) && selectedIds.size > 1) {
            dragIds = Array.from(selectedIds);
        }

        e.dataTransfer.setData('application/x-archive-item', JSON.stringify({
            type: 'archive_items',
            ids: dragIds
        }));
        e.dataTransfer.setData('itemId', item.id); // Geriye dönük uyumluluk (Fallback)

        // Dışarıya Sürükleme (Native OS Drag-out) Desteği
        if (item.file_type && item.file_type !== 'folder') {
            const origin = window.location.origin;
            const downloadUrl = `${origin}/api/archive/file/${item.id}`;
            e.dataTransfer.setData('DownloadURL', `application/octet-stream:${item.filename}:${downloadUrl}`);
        }

        if (dragIds.length > 1) {
            // Sürüklenen diğer öğelerin "toplanma (stack)" hissi veren Animasyonlu Ghost (Hayalet) resmi
            const ghost = document.createElement('div');
            ghost.style.position = 'absolute';
            ghost.style.top = '-1000px';
            ghost.style.left = '-1000px';
            ghost.style.display = 'flex';
            ghost.style.alignItems = 'center';
            ghost.style.justifyContent = 'center';
            ghost.style.pointerEvents = 'none';

            let stackHtml = `<div style="position:relative; width:120px; height:120px;">`;
            const displayCount = Math.min(dragIds.length, 4);
            for (let i = 0; i < displayCount; i++) {
                const rotation = i * 6 - 5;
                const offset = i * 4;
                const zIndex = 10 - i;
                stackHtml += `
                <div style="position:absolute; top:${offset}px; left:${offset}px; width:90px; height:100px; background:white; border:1px solid #cbd5e1; border-radius:8px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); z-index:${zIndex}; transform:rotate(${rotation}deg); display:flex; flex-direction:column; align-items:center; justify-content:center; transition:all 0.2s cubic-bezier(0.16, 1, 0.3, 1);">
                    ${i === 0 ? `<div style="font-size:10px; font-weight:bold; color:#334155; text-align:center; padding:0 8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">${item.filename}</div>` : `<div style="width:30px; height:3px; background:#e2e8f0; border-radius:2px; margin-bottom:4px;"></div><div style="width:20px; height:3px; background:#e2e8f0; border-radius:2px;"></div>`}
                </div>
                `;
            }
            stackHtml += `
                <div style="position:absolute; bottom:0px; right:0px; background:#378ADD; color:white; font-size:11px; font-weight:bold; border-radius:999px; padding:3px 10px; z-index:20; box-shadow:0 2px 5px rgba(55,138,221,0.4); border:2px solid white;">
                    ${dragIds.length} Dosya
                </div>
            </div>`;
            ghost.innerHTML = stackHtml;

            document.body.appendChild(ghost);
            e.dataTransfer.setDragImage(ghost, 60, 60);

            setTimeout(() => {
                if (document.body.contains(ghost)) document.body.removeChild(ghost);
            }, 0);
        }
    };

    const handleDragOver = (e, folderId) => {
        e.preventDefault();
        setDragOverFolder(folderId);
    };

    const handleDrop = async (e, targetFolderId) => {
        e.preventDefault();
        setDragOverFolder(null);

        const payloadStr = e.dataTransfer.getData('application/x-archive-item');
        if (payloadStr) {
            try {
                const payload = JSON.parse(payloadStr);
                if (payload.type === 'archive_items' && payload.ids) {
                    const idsToMove = payload.ids.filter(id => id !== targetFolderId);
                    if (idsToMove.length > 0) {
                        await handleBatchMove(idsToMove, targetFolderId);
                    }
                    return;
                }
            } catch (err) {
                console.error("Payload hatası", err);
            }
        }

        // Tekli dosya yedeği (Fallback)
        const draggedId = e.dataTransfer.getData('itemId');
        if (draggedId && draggedId !== targetFolderId) {
            await handleMove(draggedId, targetFolderId);
        }
    };

    const updateDocInList = (id, patch) => {
        setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
        if (selectedDoc?.id === id) setSelectedDoc(prev => ({ ...prev, ...patch }));
    };

    const handleTranscribe = async (docId) => {
        try {
            const res = await fetch(`/api/archive/transcribe/${docId}`, { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                // Durumu hemen "pending" olarak güncelle
                updateDocInList(docId, { meta: { ...((items.find(i => i.id === docId)?.meta) || {}), transcription_status: 'pending' } });
                // 3 saniyede bir polling yap (max 10 dakika)
                let attempts = 0;
                const poll = setInterval(async () => {
                    attempts++;
                    if (attempts > 200) { clearInterval(poll); return; }
                    try {
                        const r = await fetch(`/api/archive/detail/${docId}`);
                        if (r.ok) {
                            const detail = await r.json();
                            setItems(prev => prev.map(it => it.id === docId ? { ...it, ...detail } : it));
                            if (selectedDocRef.current?.id === docId) {
                                setSelectedDoc(prev => prev?.id === docId ? { ...prev, ...detail } : prev);
                            }
                            const status = detail.meta?.transcription_status;
                            if (status === 'done' || status === 'failed') {
                                clearInterval(poll);
                            }
                        }
                    } catch (e) { console.error('Polling hatası:', e); }
                }, 3000);
            }
        } catch (err) {
            console.error('Transkripsiyon başlatma hatası:', err);
        }
    };

    // Progress polling'den percent>=100 sinyali gelince çağrılır.
    // DB commit biraz geç tamamlanabilir, bu yüzden 'done' görene kadar tekrar dener.
    const handleTranscribeComplete = useCallback(async (docId) => {
        for (let attempt = 0; attempt < 8; attempt++) {
            await new Promise(res => setTimeout(res, 1000));
            try {
                const r = await fetch(`/api/archive/detail/${docId}`);
                if (!r.ok) continue;
                const detail = await r.json();
                if (detail.meta?.transcription_status === 'done') {
                    setItems(prev => prev.map(it => it.id === docId ? { ...it, ...detail } : it));
                    if (selectedDocRef.current?.id === docId) {
                        setSelectedDoc(prev => prev?.id === docId ? { ...prev, ...detail } : prev);
                    }
                    return;
                }
            } catch { /* ağ hatası — tekrar dene */ }
        }
    }, []);

    return (
        <div className="flex bg-[#f4f5f7] h-full w-full font-sans overflow-hidden">
            {/* Context Menu */}
            {ctxMenu && (
                <ContextMenu
                    x={ctxMenu.x} y={ctxMenu.y} item={ctxMenu.item}
                    onClose={() => setCtxMenu(null)}
                    onDelete={handleBatchDelete}
                    onRename={(item) => { setRenameItem(item); setRenameValue(item.filename); }}
                    onMove={(item) => setMoveItem(item)}
                />
            )}

            {/* Move Modal */}
            {moveItem && (
                <MoveModal
                    item={moveItem}
                    folders={allFolders}
                    onClose={() => setMoveItem(null)}
                    onMove={handleMove}
                />
            )}

            {/* ── SOL ANA PANEL ── */}
            <div className={`flex flex-col flex-1 h-full bg-white transition-all duration-300 ${selectedDoc ? 'mr-[340px]' : ''}`}>

                {/* ── HEADER ── */}
                <div className="flex-none px-5 py-2.5 flex items-center justify-between border-b border-stone-200 bg-white gap-3">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-1.5 text-[12px] overflow-hidden">
                        {currentFolderId && (
                            <button onClick={() => {
                                const parent = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2].id : null;
                                setCurrentFolderId(parent);
                            }} title="Üst Klasör" className="p-1 hover:bg-stone-100 text-stone-500 rounded transition-colors mr-1">
                                <CornerLeftUp size={14} />
                            </button>
                        )}
                        <button onClick={() => { setCurrentFolderId(null); setSearchQuery(''); }}
                            className={`flex items-center gap-1 hover:text-[#378ADD] transition-colors shrink-0 ${!currentFolderId && !searchQuery ? 'font-semibold text-stone-800' : 'text-stone-400'}`}>
                            <Folder size={13} className={!currentFolderId && !searchQuery ? 'text-[#2A68AB]' : ''} />
                            Kök Dizin
                        </button>
                        {breadcrumbs.map(bc => (
                            <React.Fragment key={bc.id}>
                                <ChevronRight size={12} className="text-stone-300 shrink-0" />
                                <button onClick={() => setCurrentFolderId(bc.id)}
                                    className={`hover:text-[#378ADD] transition-colors truncate ${currentFolderId === bc.id ? 'font-semibold text-stone-800' : 'text-stone-400'}`}>
                                    {bc.filename}
                                </button>
                            </React.Fragment>
                        ))}
                        {searchQuery && <>
                            <ChevronRight size={12} className="text-stone-300 shrink-0" />
                            <span className="font-semibold text-stone-700 text-[11px]">Arama Sonuçları</span>
                        </>}
                    </div>

                    {/* Araçlar */}
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="relative">
                            <Search size={13} className="absolute left-2.5 top-1/2 -transtone-y-1/2 text-stone-400" />
                            <input type="text" placeholder="Ara..." value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-7 pr-7 py-1.5 text-[11px] border border-stone-200 rounded-md w-36 focus:outline-none focus:border-[#378ADD] bg-stone-50" />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -transtone-y-1/2 text-stone-300 hover:text-stone-500"><X size={12} /></button>
                            )}
                        </div>
                        <div className="relative">
                            <select value={filterType} onChange={e => setFilterType(e.target.value)}
                                className="pl-7 pr-2 py-1.5 text-[11px] border border-stone-200 rounded-md bg-stone-50 text-stone-700 focus:outline-none focus:border-[#378ADD] appearance-none cursor-pointer">
                                <option value="all">Tümü (Sadece Ses/Video)</option>
                                <option value="audio">Ses Dosyaları</option>
                                <option value="video">Videolar</option>
                                <option value="vectorized">Vektörleşmiş</option>
                            </select>
                            <SlidersHorizontal size={12} className="absolute left-2 top-1/2 -transtone-y-1/2 text-stone-400 pointer-events-none" />
                        </div>
                        <div className="relative">
                            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                                className="pl-7 pr-2 py-1.5 text-[11px] border border-stone-200 rounded-md bg-stone-50 text-stone-700 focus:outline-none focus:border-[#378ADD] appearance-none cursor-pointer">
                                <option value="newest">En Yeni</option>
                                <option value="oldest">En Eski</option>
                                <option value="largest">En Büyük</option>
                                <option value="name">İsim (A-Z)</option>
                            </select>
                            <ArrowUpDown size={12} className="absolute left-2 top-1/2 -transtone-y-1/2 text-stone-400 pointer-events-none" />
                        </div>
                        <div className="w-px h-5 bg-stone-200" />
                        <button onClick={() => setIsCreatingFolder(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-medium rounded-md transition-colors">
                            <Plus size={13} /> Klasör
                        </button>
                        <button onClick={handleUploadClick}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#378ADD] hover:bg-[#2A68AB] text-white text-[11px] font-medium rounded-md transition-colors">
                            <Upload size={13} /> Yükle
                        </button>
                        <input type="file" ref={fileInputRef} accept="audio/*,video/*,.mp3,.wav,.ogg,.mp4,.avi,.mov" onChange={handleFileChange} className="hidden" />
                    </div>
                </div>

                {/* ── İSTATİSTİK ŞERİDİ ── */}
                <div className="flex-none px-5 py-1.5 flex items-center gap-5 bg-stone-50 border-b border-stone-100 text-[11px] text-stone-500">
                    <span className="flex items-center gap-1.5"><Film size={12} className="text-stone-400" /> <b className="text-stone-700">{allDocs.length}</b> Dosya</span>
                    <span className="flex items-center gap-1.5"><Folder size={12} className="text-stone-400" /> <b className="text-stone-700">{allFolders.length}</b> Klasör</span>
                    <span className="flex items-center gap-1.5"><Database size={12} className="text-teal-500" /> <b className="text-stone-700">{vectorCount}</b> Vektörleşmiş</span>
                    <span className="ml-auto flex items-center gap-1"><b className="text-stone-700">{formatBytes(totalSize)}</b> Toplam</span>
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2 pl-4 border-l border-stone-200">
                            <span className="font-semibold text-stone-700">{selectedIds.size} seçildi</span>
                            <button onClick={() => {
                                const allIds = currentItems.map(item => item.id);
                                if (selectedIds.size === allIds.length && allIds.length > 0) {
                                    setSelectedIds(new Set());
                                } else {
                                    setSelectedIds(new Set(allIds));
                                }
                            }}
                                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#378ADD]/10 text-[#378ADD] hover:bg-[#378ADD]/20 font-medium transition-colors">
                                <CheckSquare size={11} /> Tümünü Seç
                            </button>
                            <button onClick={() => handleBatchDelete([...selectedIds])}
                                className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors">
                                <Trash2 size={11} /> Sil
                            </button>
                            <button onClick={() => setSelectedIds(new Set())}
                                className="flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 text-stone-600 hover:bg-stone-200 font-medium transition-colors">
                                <X size={11} /> Temizle
                            </button>
                        </div>
                    )}
                </div>

                {/* ── CONTENT ── */}
                <div className="flex-1 overflow-y-auto px-5 py-4 bg-stone-50/50" onClick={() => { if (isCreatingFolder && newFolderName.trim()) handleCreateFolder(); else setIsCreatingFolder(false); }}>

                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#378ADD]" />
                        </div>
                    ) : folders.length === 0 && documents.length === 0 && !isCreatingFolder ? (
                        <div className="flex flex-col items-center justify-center h-64 text-stone-400">
                            <PackageOpen size={48} strokeWidth={1.5} className="mb-4 opacity-30" />
                            <h3 className="text-[14px] font-semibold text-stone-700 mb-1">Bu Klasör Boş</h3>
                            <p className="text-[12px] text-stone-400 max-w-sm text-center">Ses veya video yükleyin, yeni klasör oluşturun.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {/* Klasörler */}
                            {folders.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-[12px] font-bold text-stone-500 uppercase tracking-wider mb-3 px-1">Klasörler</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                        {isCreatingFolder && (
                                            <div className="group relative flex flex-col items-center text-center p-2 rounded-xl cursor-default" onClick={e => e.stopPropagation()}>
                                                <Folder size={64} strokeWidth={1} className="text-amber-500 fill-amber-200 mb-2 drop-shadow-md shrink-0" />
                                                <input
                                                    autoFocus
                                                    value={newFolderName}
                                                    onChange={e => setNewFolderName(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setIsCreatingFolder(false); }}
                                                    onBlur={() => { if (newFolderName.trim()) handleCreateFolder(); else setIsCreatingFolder(false); }}
                                                    className="w-full text-[11px] font-semibold text-stone-800 bg-stone-50 border border-[#378ADD]/30 rounded px-1.5 py-0.5 outline-none focus:border-[#378ADD]"
                                                    placeholder="Yeni Klasör"
                                                />
                                            </div>
                                        )}
                                        {folders.map(folder => {
                                            const isSelected = selectedIds.has(folder.id);
                                            const isDragOver = dragOverFolder === folder.id;
                                            return (
                                                <div key={folder.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, folder)}
                                                    onDragOver={(e) => handleDragOver(e, folder.id)}
                                                    onDragLeave={() => setDragOverFolder(null)}
                                                    onDrop={(e) => handleDrop(e, folder.id)}
                                                    onDoubleClick={() => {
                                                        if (selectedIds.size === 0 && renameItem?.id !== folder.id) {
                                                            setCurrentFolderId(folder.id); setSearchQuery('');
                                                        }
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (selectedIds.size > 0) toggleSelect(folder.id, e);
                                                    }}
                                                    onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, item: folder }); }}
                                                    className={`group relative flex flex-col items-center text-center p-2 rounded-xl cursor-pointer transition-all select-none
                                                        ${isSelected ? 'bg-[#378ADD]/10 ring-1 ring-[#378ADD]/20' : isDragOver ? 'bg-amber-50 ring-1 ring-amber-400/30' : 'hover:bg-stone-200/50 border border-transparent'}`}
                                                >
                                                    <div onClick={(e) => toggleSelect(folder.id, e)}
                                                        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {isSelected ? <CheckSquare size={14} className="text-[#378ADD]" /> : <Square size={14} className="text-stone-300" />}
                                                    </div>
                                                    <Folder size={64} strokeWidth={1} className="text-amber-500 fill-amber-200 mb-2 drop-shadow-md shrink-0" />
                                                    {renameItem?.id === folder.id ? (
                                                        <input
                                                            autoFocus
                                                            value={renameValue}
                                                            onChange={e => setRenameValue(e.target.value)}
                                                            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenameItem(null); }}
                                                            onBlur={handleRename}
                                                            onClick={e => e.stopPropagation()}
                                                            onDoubleClick={e => e.stopPropagation()}
                                                            className="w-full text-[11px] font-semibold text-stone-800 bg-stone-50 border border-[#378ADD]/30 rounded px-1.5 py-0.5 outline-none focus:border-[#378ADD] mt-0.5"
                                                        />
                                                    ) : (
                                                        <h4
                                                            onDoubleClick={(e) => { e.stopPropagation(); setRenameItem(folder); setRenameValue(folder.filename); }}
                                                            className="text-[11px] font-semibold text-stone-800 line-clamp-2 select-text mt-0.5 leading-tight" title={folder.filename}>
                                                            {folder.filename}
                                                        </h4>
                                                    )}
                                                    <p className="text-[10px] text-stone-400 mt-1 truncate">{new Date(folder.created_at).toLocaleDateString('tr')}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Dosyalar */}
                            {documents.length > 0 && (
                                <div>
                                    <h3 className="text-[12px] font-bold text-stone-500 uppercase tracking-wider mb-3 px-1">Medya Dosyaları</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                        {documents.map(doc => {
                                            const { Icon, color, bg, border } = getFileVisual(doc.file_type);
                                            const isSelected = selectedIds.has(doc.id);
                                            return (
                                                <div key={doc.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, doc)}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onClick={async (e) => {
                                                        if (selectedIds.size > 0) toggleSelect(doc.id, e);
                                                        else {
                                                            // Önce hızlı göster (listeden), sonra tam detayı yükle
                                                            setSelectedDoc(doc);
                                                            try {
                                                                const res = await fetch(`/api/archive/detail/${doc.id}`);
                                                                if (res.ok) {
                                                                    const detail = await res.json();
                                                                    setSelectedDoc(prev => prev?.id === detail.id ? { ...prev, ...detail } : prev);
                                                                }
                                                            } catch (err) {
                                                                console.warn('Detay yüklenemedi', err);
                                                            }
                                                        }
                                                    }}
                                                    onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, item: doc }); }}
                                                    className={`group relative flex flex-col items-center text-center p-2 rounded-xl cursor-pointer transition-all select-none
                                                        ${selectedDoc?.id === doc.id ? 'bg-[#378ADD]/10 ring-1 ring-[#378ADD]/30'
                                                            : isSelected ? 'bg-[#378ADD]/5 ring-1 ring-[#378ADD]/20'
                                                                : 'hover:bg-stone-200/50 border border-transparent'}`}
                                                >
                                                    <div onClick={(e) => toggleSelect(doc.id, e)}
                                                        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {isSelected ? <CheckSquare size={14} className="text-[#378ADD]" /> : <Square size={14} className="text-stone-300" />}
                                                    </div>
                                                    {/* Vectorized badge — Excel dosyalarında gösterme */}
                                                    {doc.is_vectorized && !isArchiveOnly(doc.file_type) && (
                                                        <span className="absolute top-2 right-2 bg-teal-50 text-teal-700 border border-teal-100 text-[8px] font-bold px-1.5 py-0.5 rounded leading-none">VEK</span>
                                                    )}
                                                    {isArchiveOnly(doc.file_type) && (
                                                        <span className="absolute top-2 right-2 bg-amber-50 text-amber-700 border border-amber-200 text-[8px] font-bold px-1.5 py-0.5 rounded leading-none" title="Yapay zeka ile işlenmedi">
                                                            ARŞİV
                                                        </span>
                                                    )}

                                                    {(doc.etiketler?.length > 0) && (
                                                        <span className="absolute top-8 right-2 flex items-center gap-0.5 text-stone-400">
                                                            <Tag size={9} /><span className="text-[9px]">{doc.etiketler.length}</span>
                                                        </span>
                                                    )}

                                                    <div className="shrink-0 mb-3 drop-shadow-md">
                                                        <FileCard formatFile={doc.file_type || ''} />
                                                    </div>

                                                    {renameItem?.id === doc.id ? (
                                                        <input
                                                            autoFocus
                                                            value={renameValue}
                                                            onChange={e => setRenameValue(e.target.value)}
                                                            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenameItem(null); }}
                                                            onBlur={handleRename}
                                                            onClick={e => e.stopPropagation()}
                                                            onDoubleClick={e => e.stopPropagation()}
                                                            className="w-full text-[11px] font-semibold text-stone-800 bg-stone-50 border border-[#378ADD]/30 rounded px-1.5 py-0.5 outline-none focus:border-[#378ADD] mt-2 mb-1"
                                                        />
                                                    ) : (
                                                        <h4
                                                            onDoubleClick={(e) => { e.stopPropagation(); setRenameItem(doc); setRenameValue(doc.filename); }}
                                                            className="text-[11px] font-semibold text-stone-800 line-clamp-2 select-text mt-auto leading-tight" title={doc.filename}>
                                                            {doc.filename}
                                                        </h4>
                                                    )}
                                                    <div className="flex flex-col items-center mt-1">
                                                        <span className="text-[10px] text-stone-400">{new Date(doc.created_at).toLocaleDateString('tr')}</span>
                                                        <span className="text-[10px] text-stone-400 font-medium">{formatBytes(doc.file_size)}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── DETAY PANELİ ── */}
            <div style={{
                position: 'absolute', right: selectedDoc ? 0 : '-340px', top: 0, bottom: 0, width: '340px',
                transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)', zIndex: 50
            }}>
                {selectedDoc && (
                    <DetailPanel
                        doc={selectedDoc}
                        onClose={() => setSelectedDoc(null)}
                        onTagUpdate={(id, tags) => updateDocInList(id, { etiketler: tags })}
                        onDescUpdate={(id, aciklama) => updateDocInList(id, { aciklama })}
                        onTranscribe={handleTranscribe}
                        onTranscribeComplete={handleTranscribeComplete}
                    />
                )}
            </div>
        </div>
    );
}
