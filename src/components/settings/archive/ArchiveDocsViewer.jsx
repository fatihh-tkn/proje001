import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
    PackageOpen, Folder, File, ChevronRight, Upload, Search,
    FileText, FileImage, FileSpreadsheet, FileCode, Film, Music,
    Plus, Database, Trash2, FolderInput, X,
    CheckSquare, Square, ArrowUpDown, SlidersHorizontal, Edit2,
    Check, Tag, MessageSquare, ExternalLink, Download,
    CornerLeftUp, Mic, Loader2, AlertCircle, Users2
} from 'lucide-react';
import { useErrorStore } from '../../../store/errorStore';
import { mutate, mutation } from '../../../api/client';
import { useWorkspaceStore } from '../../../store/workspaceStore';
import { useArchiveChangedListener } from '../../../utils/archiveEvents';
import { FileCard } from '../../ui/file-card-collections';

// Parçalanmış alt modüller
import ContextMenu from './archiveDocs/ContextMenu';
import { useArchiveActions } from './archiveDocs/useArchiveActions';
import { FolderNode, FileNode } from './archiveDocs/TreeNode';

/* ── YARDIMCI: Dosya türüne göre ikon ve renk ─────────────────────────────── */
const getFileVisual = (fileType) => {
    const t = (fileType || '').toLowerCase();
    if (t === 'pdf') return { Icon: FileText, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' };
    if (['xls', 'xlsx', 'csv'].includes(t)) return { Icon: FileSpreadsheet, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' };
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(t)) return { Icon: FileImage, color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-100' };
    if (['doc', 'docx', 'txt', 'md'].includes(t)) return { Icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' };
    if (['ppt', 'pptx'].includes(t)) return { Icon: FileText, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' };
    if (['mp4', 'avi', 'mov'].includes(t)) return { Icon: Film, color: 'text-pink-500', bg: 'bg-pink-50', border: 'border-pink-100' };
    if (['mp3', 'wav', 'ogg'].includes(t)) return { Icon: Music, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' };
    if (['py', 'js', 'ts', 'json', 'html'].includes(t)) return { Icon: FileCode, color: 'text-cyan-500', bg: 'bg-cyan-50', border: 'border-cyan-100' };
    if (t === 'bpmn') return { Icon: FileCode, color: 'text-teal-500', bg: 'bg-teal-50', border: 'border-teal-100' };
    return { Icon: File, color: 'text-stone-400', bg: 'bg-stone-50', border: 'border-stone-100' };
};

const ARCHIVE_ONLY_TYPES = ['xls', 'xlsx', 'csv'];
const isArchiveOnly = (fileType) => ARCHIVE_ONLY_TYPES.includes((fileType || '').toLowerCase());
const isImage = (t) => ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes((t || '').toLowerCase());
const isPdf = (t) => (t || '').toLowerCase() === 'pdf';
const isAudio = (t) => ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'opus', 'wma'].includes((t || '').toLowerCase());
const isVideo = (t) => ['mp4', 'avi', 'mov', 'mkv', 'webm', 'm4v', 'wmv'].includes((t || '').toLowerCase());

const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024, dm = 1, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Kullanıcı avatarı için sabit renk paleti (isim hash'ine göre)
const USER_COLORS = [
    { bg: '#378ADD20', text: '#378ADD', ring: '#378ADD40' },
    { bg: '#1D9E7520', text: '#1D9E75', ring: '#1D9E7540' },
    { bg: '#EF9F2720', text: '#C17D10', ring: '#EF9F2740' },
    { bg: '#D85A3020', text: '#D85A30', ring: '#D85A3040' },
    { bg: '#7C5CBF20', text: '#7C5CBF', ring: '#7C5CBF40' },
    { bg: '#2E8FAF20', text: '#2E8FAF', ring: '#2E8FAF40' },
];
const getUserColor = (id) => USER_COLORS[(id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % USER_COLORS.length];

/* ── ERİŞİM YÖNETİMİ MODAL ─────────────────────────────────────────────────── */
const AccessModal = ({ item, onClose, onSaved }) => {
    const [data, setData] = useState(null);
    const [saving, setSaving] = useState(false);
    const [selected, setSelected] = useState(new Set());
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetch(`/api/archive/access/${item.id}`)
            .then(r => r.json())
            .then(d => {
                setData(d);
                const izinliler = d.izin_verilen_kullanicilar || [];
                const baslangicSecili = (d.havuz_turu === 'sistem' && izinliler.length === 0)
                    ? new Set((d.tum_kullanicilar || []).map(u => u.id))
                    : new Set(izinliler);
                setSelected(baslangicSecili);
            });
    }, [item.id]);

    const toggle = (id) => setSelected(prev => {
        const n = new Set(prev);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
    });

    const save = async () => {
        setSaving(true);
        try {
            await mutation('PUT', `/api/archive/access/${item.id}`,
                { izin_verilen_kullanicilar: [...selected] },
                { kind: 'save', subject: 'Erişim izinleri' }
            );
            onSaved();
            onClose();
        } catch { /* toast atıldı */ }
        setSaving(false);
    };

    const filtered = data?.tum_kullanicilar.filter(u =>
        !search || (u.tam_ad || '').toLowerCase().includes(search.toLowerCase()) || (u.eposta || '').toLowerCase().includes(search.toLowerCase())
    ) || [];

    const activeCount = selected.size;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9500] flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-stone-900/30 backdrop-blur-[2px]" />
            <div
                className="relative bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-[420px] overflow-hidden border border-stone-200/80"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 pt-5 pb-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
                                <Users2 size={16} className="text-stone-500" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-[13px] font-semibold text-stone-900 tracking-tight">Erişim Yönetimi</h3>
                                <p className="text-[11px] text-stone-400 mt-0.5 truncate max-w-[240px]">{item.filename}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors">
                            <X size={14} />
                        </button>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] font-medium text-stone-500 uppercase tracking-wide">Erişim Açık</span>
                        <div className="flex items-center gap-1">
                            {activeCount === 0 ? (
                                <span className="text-[11px] text-stone-400 italic">Kimse seçilmedi</span>
                            ) : (
                                <>
                                    <div className="flex -space-x-1.5">
                                        {[...selected].slice(0, 4).map(uid => {
                                            const u = data?.tum_kullanicilar.find(x => x.id === uid);
                                            const clr = getUserColor(uid);
                                            const initials = (u?.tam_ad || '?').split(' ').filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2);
                                            return (
                                                <div key={uid} className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ring-2 ring-white"
                                                    style={{ background: clr.bg, color: clr.text }}>
                                                    {initials}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <span className="text-[11px] font-medium text-stone-700 ml-1">{activeCount} kullanıcı</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="h-px bg-stone-100 mx-5" />
                {/* Arama */}
                <div className="px-5 py-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-stone-50 rounded-lg border border-stone-200 focus-within:border-stone-300 focus-within:bg-white transition-colors">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-stone-400 shrink-0">
                            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                        </svg>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Kullanıcı ara..."
                            className="flex-1 bg-transparent text-[12px] text-stone-700 placeholder:text-stone-400 outline-none"
                        />
                    </div>
                </div>
                {/* Kullanıcı listesi */}
                <div className="px-3 pb-3 max-h-56 overflow-y-auto flex flex-col gap-0.5">
                    {!data ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                            <div className="w-5 h-5 rounded-full border-2 border-stone-300 border-t-stone-600 animate-spin" />
                            <span className="text-[11px] text-stone-400">Yükleniyor...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-8 text-[11px] text-stone-400">
                            {search ? 'Eşleşen kullanıcı bulunamadı.' : 'Sistemde başka kullanıcı yok.'}
                        </div>
                    ) : filtered.map(u => {
                        const isOwner = u.id === data.yukleyen_kimlik;
                        const checked = selected.has(u.id);
                        const clr = getUserColor(u.id);
                        const initials = (u.tam_ad || '?').split(' ').filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2);
                        return (
                            <button key={u.id} onClick={() => !isOwner && toggle(u.id)} disabled={isOwner}
                                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-left w-full transition-all duration-150
                                    ${isOwner ? 'cursor-default opacity-70' : checked ? 'bg-stone-50 ring-1 ring-stone-200' : 'hover:bg-stone-50'}`}
                            >
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ring-2 ring-white"
                                    style={isOwner ? { background: '#EF9F2720', color: '#C17D10' } : { background: clr.bg, color: clr.text }}>
                                    {initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[12px] font-medium text-stone-800 truncate">{u.tam_ad}</span>
                                        {isOwner && (
                                            <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wide"
                                                style={{ background: '#EF9F2720', color: '#C17D10' }}>
                                                Yükleyen
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-stone-400 truncate">{u.eposta}</div>
                                </div>
                                {!isOwner && (
                                    <div className={`shrink-0 w-8 h-4 rounded-full relative transition-colors duration-200 ${checked ? 'bg-[#378ADD]' : 'bg-stone-200 group-hover:bg-stone-300'}`}>
                                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-200 ${checked ? 'left-[18px]' : 'left-0.5'}`} />
                                    </div>
                                )}
                                {isOwner && (
                                    <div className="shrink-0 w-8 h-4 rounded-full bg-amber-100 flex items-center justify-center">
                                        <Check size={8} className="text-amber-500" strokeWidth={3} />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
                {/* Footer */}
                <div className="px-5 py-3.5 border-t border-stone-100 bg-stone-50/60 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-stone-500 uppercase tracking-wide">
                        {activeCount} / {data?.tum_kullanicilar.length || 0} kullanıcı aktif
                    </span>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="px-3 py-1.5 text-[11px] font-medium text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors">İptal</button>
                        <button onClick={save} disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-semibold text-white rounded-lg transition-all disabled:opacity-50"
                            style={{ background: '#378ADD' }}>
                            {saving ? (
                                <><div className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />Kaydediliyor</>
                            ) : (
                                <><Check size={11} strokeWidth={3} />Kaydet</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

/* ── TAŞI MODAL ─────────────────────────────────────────────────────────────── */
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
                    <button onClick={() => setTargetId(null)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition-colors ${targetId === null ? 'bg-[#378ADD]/10 text-[#378ADD]' : 'hover:bg-stone-50 text-stone-700'}`}>
                        <Folder size={14} /> Kök Dizin
                    </button>
                    {folders.filter(f => f.id !== item.id).map(f => (
                        <button key={f.id} onClick={() => setTargetId(f.id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition-colors ${targetId === f.id ? 'bg-[#378ADD]/10 text-[#378ADD]' : 'hover:bg-stone-50 text-stone-700'}`}>
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

/* ── DETAY / ÖNİZLEME PANELİ ───────────────────────────────────────────────── */
const DetailPanel = ({ doc, onClose, onTagUpdate, onDescUpdate }) => {
    const [tags, setTags] = useState(doc?.etiketler || []);
    const [tagInput, setTagInput] = useState('');
    const [desc, setDesc] = useState(doc?.aciklama || '');
    const [descEditing, setDescEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [txFullText, setTxFullText] = useState('');
    const [txLoading, setTxLoading] = useState(false);

    useEffect(() => {
        setTags(doc?.etiketler || []);
        setDesc(doc?.aciklama || '');
        setDescEditing(false);
    }, [doc?.id]);

    useEffect(() => {
        const metaFullText = doc?.meta?.transcription_full_text || '';
        if (metaFullText) {
            setTxFullText(metaFullText);
        } else {
            setTxFullText('');
            const status = doc?.meta?.transcription_status;
            if ((isAudio(doc?.file_type) || isVideo(doc?.file_type)) && status === 'done') {
                setTxLoading(true);
                fetch(`/api/archive/transcript/${doc.id}`)
                    .then(r => r.ok ? r.json() : null)
                    .then(data => { if (data?.full_text) setTxFullText(data.full_text); })
                    .catch((e) => console.warn('[ArchiveDetail] Transkript alınamadı:', e.message))
                    .finally(() => setTxLoading(false));
            }
        }
    }, [doc?.id, doc?.meta?.transcription_status, doc?.meta?.transcription_full_text, doc?.file_type]);

    if (!doc) return null;

    const addTag = async (tag) => {
        if (!tag.trim() || tags.includes(tag.trim())) return;
        const newTags = [...tags, tag.trim()];
        setTags(newTags);
        setTagInput('');
        try {
            await mutate.update('/api/archive/meta',
                { kimlik: doc.id, etiketler: newTags },
                { kind: 'create', subject: 'Etiket', detail: tag.trim() }
            );
            onTagUpdate?.(doc.id, newTags);
        } catch { setTags(tags); }
    };

    const removeTag = async (tag) => {
        const newTags = tags.filter(t => t !== tag);
        setTags(newTags);
        try {
            await mutate.update('/api/archive/meta',
                { kimlik: doc.id, etiketler: newTags },
                { kind: 'delete', subject: 'Etiket', detail: tag }
            );
            onTagUpdate?.(doc.id, newTags);
        } catch { setTags(tags); }
    };

    const saveDesc = async () => {
        setSaving(true);
        try {
            await mutate.save('/api/archive/meta',
                { kimlik: doc.id, aciklama: desc },
                { subject: 'Açıklama' }
            );
            onDescUpdate?.(doc.id, desc);
        } catch { /* mutate zaten toast attı */ }
        setSaving(false);
        setDescEditing(false);
    };

    const { bg } = getFileVisual(doc.file_type);
    const previewUrl = `/api/archive/file/${doc.id}`;

    return (
        <div
            className="absolute top-0 right-0 w-[340px] h-full bg-white border-l border-stone-200 shadow-xl flex flex-col z-50 overflow-hidden"
            style={{ transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
            <div className="flex-none px-4 py-3 flex items-center justify-between border-b border-stone-200 bg-white">
                <h3 className="text-[13px] font-black text-stone-800 truncate">{doc.filename}</h3>
                <button onClick={onClose} className="p-1 hover:bg-stone-200 rounded-full text-stone-500 shrink-0 ml-2">
                    <X size={15} />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto">
                <div className="border-b border-stone-100">
                    {isImage(doc.file_type) ? (
                        <img src={previewUrl} alt={doc.filename} className="w-full max-h-48 object-contain bg-stone-50 p-4" />
                    ) : isPdf(doc.file_type) ? (
                        <iframe src={previewUrl} title="PDF Önizleme" className="w-full h-48 border-0 bg-stone-50" />
                    ) : (
                        <div className={`flex flex-col items-center justify-center h-32 ${bg}`}>
                            <div className="scale-[1.15] mb-2 opacity-90"><FileCard formatFile={doc.file_type || ''} /></div>
                            <a href={previewUrl} target="_blank" rel="noreferrer"
                                className="mt-1 flex items-center gap-1 text-[11px] text-[#378ADD] hover:underline">
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
                            ['Durum', isArchiveOnly(doc.file_type) ? '📁 Yalnızca Arşiv' : doc.is_vectorized ? '✅ Vektörleşmiş' : '📁 Arşivde'],
                            ['Chunk', doc.total_chunks > 0 ? `${doc.total_chunks} parça` : '-'],
                        ].map(([k, v]) => (
                            <div key={k} className="flex justify-between border-b border-stone-50 pb-1.5">
                                <span className="text-stone-400 font-medium">{k}</span>
                                <span className="text-stone-700 font-medium text-right">{v}</span>
                            </div>
                        ))}
                        {isArchiveOnly(doc.file_type) && (
                            <div className="mt-1 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                                <span className="text-amber-500 text-[16px] shrink-0">⚠️</span>
                                <p className="text-[11px] text-amber-800 leading-relaxed">
                                    Bu <strong>{doc.file_type?.toUpperCase()}</strong> dosyası yapay zeka ile işlenmemiştir.
                                    İçeriği hakkında soru soramazsınız, ancak dosyayı açarak tabloları inceleyebilirsiniz.
                                </p>
                            </div>
                        )}
                    </div>
                    {/* Etiketler */}
                    <div>
                        <div className="flex items-center gap-1 mb-2">
                            <Tag size={12} className="text-stone-400" />
                            <span className="text-[9px] font-black text-stone-400 uppercase tracking-[0.18em]">Etiketler</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {tags.map(tag => (
                                <span key={tag} className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 text-[11px] font-medium px-2 py-0.5 rounded-full">
                                    {tag}
                                    <button onClick={() => removeTag(tag)} className="text-stone-400 hover:text-red-500 transition-colors"><X size={10} /></button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-1.5">
                            <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') addTag(tagInput); }}
                                placeholder="Etiket ekle..."
                                className="flex-1 text-[11px] border border-stone-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20 bg-white" />
                            <button onClick={() => addTag(tagInput)} className="px-2 py-1.5 bg-[#378ADD] text-white rounded-lg text-[11px] hover:bg-[#2A68AB]">
                                <Plus size={13} />
                            </button>
                        </div>
                    </div>
                    {/* Açıklama */}
                    <div>
                        <div className="flex items-center gap-1 mb-2">
                            <MessageSquare size={12} className="text-stone-400" />
                            <span className="text-[9px] font-black text-stone-400 uppercase tracking-[0.18em]">Açıklama</span>
                        </div>
                        {descEditing ? (
                            <div className="flex flex-col gap-1.5">
                                <textarea autoFocus value={desc} onChange={e => setDesc(e.target.value)} rows={3}
                                    className="w-full text-[12px] border border-stone-200 rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20"
                                    placeholder="Bu dosya hakkında not ekleyin..." />
                                <div className="flex gap-1.5">
                                    <button onClick={saveDesc} disabled={saving}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-[#378ADD] text-white rounded-lg text-[11px] font-black hover:bg-[#2A68AB]">
                                        <Check size={12} /> {saving ? 'Kaydediliyor...' : 'Kaydet'}
                                    </button>
                                    <button onClick={() => setDescEditing(false)}
                                        className="px-2.5 py-1 bg-white border border-stone-200 text-stone-600 rounded-lg text-[11px] hover:bg-stone-50">
                                        İptal
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div onClick={() => setDescEditing(true)}
                                className="min-h-[48px] text-[12px] text-stone-600 bg-stone-50 rounded-md px-2.5 py-2 cursor-text border border-transparent hover:border-stone-200 transition-colors">
                                {desc || <span className="text-stone-300 italic">Açıklama eklemek için tıklayın...</span>}
                            </div>
                        )}
                    </div>
                    {/* Transkripsiyon Bölümü */}
                    {(isAudio(doc.file_type) || isVideo(doc.file_type)) && (() => {
                        const meta = doc.meta || {};
                        const txStatus = meta.transcription_status;
                        const txLang = meta.transcription_language;
                        const txChunkCount = meta.transcription_chunk_count;

                        const handleDownload = () => {
                            const content = txFullText || meta.transcription_raw_text || '';
                            if (!content) return;
                            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${doc.filename.replace(/\.[^.]+$/, '')}_transkript.txt`;
                            a.click();
                            URL.revokeObjectURL(url);
                        };

                        return (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1">
                                        <Mic size={12} className="text-stone-400" />
                                        <span className="text-[9px] font-black text-stone-400 uppercase tracking-[0.18em]">Metin Dökümü</span>
                                    </div>
                                    {txStatus === 'done' && (txFullText || meta.transcription_raw_text) && (
                                        <button onClick={handleDownload} title="Transkripti TXT olarak indir"
                                            className="flex items-center gap-1 px-2 py-1 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 rounded-md text-[10px] font-medium transition-colors">
                                            <Download size={11} /> TXT İndir
                                        </button>
                                    )}
                                </div>
                                {txStatus === 'done' && txFullText && !txLoading && (
                                    <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg max-h-48 overflow-y-auto">
                                        <p className="text-[11px] text-stone-700 whitespace-pre-wrap leading-relaxed font-mono">{txFullText}</p>
                                    </div>
                                )}
                                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border shadow-sm ${
                                    txStatus === 'done' ? 'bg-teal-50 border-teal-200' :
                                    txStatus === 'processing' || txStatus === 'pending' ? 'bg-amber-50 border-amber-200' :
                                    txStatus === 'failed' ? 'bg-red-50 border-red-200' : 'bg-stone-50 border-stone-200'
                                }`}>
                                    <div className={`shrink-0 p-1.5 rounded-lg ${
                                        txStatus === 'done' ? 'bg-teal-100' :
                                        txStatus === 'processing' || txStatus === 'pending' ? 'bg-amber-100' :
                                        txStatus === 'failed' ? 'bg-red-100' : 'bg-stone-100'
                                    }`}>
                                        {txLoading ? <Loader2 size={15} className="animate-spin text-amber-500" />
                                            : txStatus === 'done' ? <Mic size={15} className="text-teal-600" />
                                            : txStatus === 'processing' || txStatus === 'pending' ? <Loader2 size={15} className="animate-spin text-amber-500" />
                                            : txStatus === 'failed' ? <AlertCircle size={15} className="text-red-500" />
                                            : <Mic size={15} className="text-stone-400" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-semibold text-stone-800 truncate">
                                            {txStatus === 'done' ? 'Transkript hazır' :
                                             txStatus === 'processing' || txStatus === 'pending' ? 'Transkripsiyon devam ediyor' :
                                             txStatus === 'failed' ? 'Transkripsiyon başarısız' : 'Transkript yok'}
                                        </p>
                                        <p className="text-[10px] mt-0.5 truncate">
                                            {txLoading ? <span className="text-teal-500">Transkript yükleniyor…</span>
                                                : txStatus === 'done' && txFullText ? <span className="text-teal-600 font-medium">{txLang?.toUpperCase()}{txChunkCount ? ` · ${txChunkCount} parça` : ''} · {txFullText.length.toLocaleString('tr')} karakter</span>
                                                : txStatus === 'done' && !txFullText ? <span className="text-stone-400">Transkript metni bulunamadı</span>
                                                : txStatus === 'failed' ? <span className="text-red-500">İşlem sırasında hata oluştu</span>
                                                : txStatus === 'processing' || txStatus === 'pending' ? <span className="text-amber-600">İşleniyor…</span>
                                                : <span className="text-stone-400">Henüz transkript oluşturulmadı</span>}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>
            <div className="flex-none p-4 border-t border-stone-100 bg-white">
                <a href={previewUrl} download={doc.filename}
                    className="flex flex-1 items-center justify-center gap-2 w-full py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-[12px] font-medium transition-colors">
                    <Download size={14} /> Dosyayı İndir
                </a>
            </div>
        </div>
    );
};

/* ── ANA BİLEŞEN ────────────────────────────────────────────────────────────── */
export default function ArchiveDocsViewer({ defaultFilter = 'all' }) {
    const currentUser = useWorkspaceStore(state => state.currentUser);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [filterType, setFilterType] = useState(defaultFilter);
    const [sortBy, setSortBy] = useState('newest');
    const [ctxMenu, setCtxMenu] = useState(null);
    const [dragOverFolder, setDragOverFolder] = useState(null);
    const isAdmin = currentUser?.super || false;

    const fetchArchive = useCallback(async () => {
        setLoading(true);
        try {
            const uid = currentUser?.id ? `?user_id=${currentUser.id}` : '';
            const res = await fetch(`/api/archive/list${uid}`);
            if (res.ok) {
                const data = await res.json();
                setItems(data.items || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [currentUser?.id]);

    useEffect(() => { fetchArchive(); }, [fetchArchive]);
    useArchiveChangedListener(fetchArchive);

    const {
        isCreatingFolder, setIsCreatingFolder,
        newFolderName, setNewFolderName,
        handleCreateFolder,
        fileInputRef,
        handleUploadClick,
        handleFileChange,
        handleBatchDelete,
        renameItem, setRenameItem,
        renameValue, setRenameValue,
        handleRename,
        handleMove,
        handleBatchMove,
        moveItem, setMoveItem,
        accessItem, setAccessItem,
    } = useArchiveActions({
        fetchArchive,
        currentFolderId,
        currentUser,
        selectedIds,
        setSelectedIds,
        selectedDoc,
        setSelectedDoc,
        setLoading,
    });

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
            if (filterType === 'all') return true;
            if (filterType === 'pdf') return item.file_type === 'pdf';
            if (filterType === 'excel') return ['xls', 'xlsx', 'csv'].includes(item.file_type);
            if (filterType === 'ppt') return ['ppt', 'pptx'].includes(item.file_type);
            if (filterType === 'image') return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(item.file_type);
            if (filterType === 'audio') return ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'opus', 'wma'].includes((item.file_type || '').toLowerCase());
            if (filterType === 'video') return ['mp4', 'avi', 'mov', 'mkv', 'webm', 'm4v', 'wmv'].includes((item.file_type || '').toLowerCase());
            if (filterType === 'vectorized') return item.is_vectorized;
            if (filterType === 'workflow') return ['bpmn', 'json', 'py', 'js', 'ts', 'html', 'xml'].includes((item.file_type || '').toLowerCase());
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

    const allDocs = items.filter(i => {
        if (i.file_type === 'folder') return false;
        const isMedia = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'mp4', 'avi', 'mov', 'webm'].includes((i.file_type || '').toLowerCase());
        return !isMedia;
    });
    const allFolders = items.filter(i => i.file_type === 'folder');
    const totalSize = allDocs.reduce((s, d) => s + (d.file_size || 0), 0);
    const vectorCount = allDocs.filter(d => d.is_vectorized).length;

    const toggleSelect = (id, e) => {
        e.stopPropagation();
        setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };

    // Drag-and-drop handlers
    const handleDragStart = (e, item) => {
        let dragIds = [item.id];
        if (selectedIds.has(item.id) && selectedIds.size > 1) dragIds = Array.from(selectedIds);

        e.dataTransfer.setData('application/x-archive-item', JSON.stringify({ type: 'archive_items', ids: dragIds }));
        e.dataTransfer.setData('itemId', item.id);

        if (item.file_type && item.file_type !== 'folder') {
            const origin = window.location.origin;
            const downloadUrl = `${origin}/api/archive/download/${item.id}`;
            e.dataTransfer.setData('DownloadURL', `application/octet-stream:${item.filename}:${downloadUrl}`);
        }
        e.dataTransfer.effectAllowed = 'copyLink';

        const ghost = document.createElement('div');
        ghost.style.cssText = 'position:absolute;top:-1000px;left:-1000px;pointer-events:none;';

        if (dragIds.length > 1) {
            let stackHtml = `<div style="position:relative;width:130px;height:130px;">`;
            const displayCount = Math.min(dragIds.length, 4);
            for (let i = 0; i < displayCount; i++) {
                const rotation = i * 6 - 5;
                const offset = i * 4;
                const zIndex = 10 - i;
                stackHtml += `<div style="position:absolute;top:${offset}px;left:${offset}px;width:90px;height:100px;background:white;border:1px solid #cbd5e1;border-radius:8px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);z-index:${zIndex};transform:rotate(${rotation}deg);display:flex;flex-direction:column;align-items:center;justify-content:center;">
                    ${i === 0 ? `<div style="font-size:10px;font-weight:bold;color:#334155;text-align:center;padding:0 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%;">${item.filename}</div>` : `<div style="width:30px;height:3px;background:#e2e8f0;border-radius:2px;margin-bottom:4px;"></div><div style="width:20px;height:3px;background:#e2e8f0;border-radius:2px;"></div>`}
                </div>`;
            }
            stackHtml += `<div style="position:absolute;bottom:0;right:0;background:#378ADD;color:white;font-size:11px;font-weight:bold;border-radius:999px;padding:3px 10px;z-index:20;box-shadow:0 2px 5px rgba(55,138,221,0.4);border:2px solid white;">${dragIds.length} Dosya</div></div>`;
            ghost.innerHTML = stackHtml;
            document.body.appendChild(ghost);
            e.dataTransfer.setDragImage(ghost, 65, 65);
        } else if (item.file_type && item.file_type !== 'folder') {
            ghost.innerHTML = `<div style="display:flex;align-items:center;gap:8px;background:white;border:1px solid #cbd5e1;border-radius:10px;padding:8px 12px;box-shadow:0 8px 20px rgba(0,0,0,0.15);min-width:160px;max-width:220px;">
                <div style="font-size:22px;flex-shrink:0;">📄</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:11px;font-weight:600;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.filename}</div>
                    <div style="font-size:10px;color:#10b981;font-weight:500;margin-top:2px;">↗ Dışarıya bırak</div>
                </div></div>`;
            document.body.appendChild(ghost);
            e.dataTransfer.setDragImage(ghost, 20, 20);
        }
        setTimeout(() => { if (document.body.contains(ghost)) document.body.removeChild(ghost); }, 0);
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
                    if (idsToMove.length > 0) await handleBatchMove(idsToMove, targetFolderId);
                    return;
                }
            } catch (err) { console.error('Payload hatası', err); }
        }
        const draggedId = e.dataTransfer.getData('itemId');
        if (draggedId && draggedId !== targetFolderId) await handleMove(draggedId, targetFolderId);
    };

    const updateDocInList = (id, patch) => {
        setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
        if (selectedDoc?.id === id) setSelectedDoc(prev => ({ ...prev, ...patch }));
    };

    const sharedNodeProps = {
        renameItem, renameValue, setRenameValue, handleRename, setRenameItem,
        selectedIds, toggleSelect, setCtxMenu, handleDragStart,
    };

    return (
        <div className="flex bg-stone-50 h-full w-full font-sans overflow-hidden">
            {/* Context Menu */}
            {ctxMenu && (
                <ContextMenu
                    x={ctxMenu.x} y={ctxMenu.y} item={ctxMenu.item}
                    onClose={() => setCtxMenu(null)}
                    onDelete={handleBatchDelete}
                    onRename={(item) => { setRenameItem(item); setRenameValue(item.filename); }}
                    onMove={(item) => setMoveItem(item)}
                    onAccess={(item) => setAccessItem(item)}
                    isAdmin={isAdmin}
                />
            )}

            {/* Access Modal */}
            {accessItem && (
                <AccessModal item={accessItem} onClose={() => setAccessItem(null)} onSaved={fetchArchive} />
            )}

            {/* Move Modal */}
            {moveItem && (
                <MoveModal item={moveItem} folders={allFolders} onClose={() => setMoveItem(null)} onMove={handleMove} />
            )}

            {/* ── SOL ANA PANEL ── */}
            <div className={`flex flex-col flex-1 h-full bg-stone-50 transition-all duration-300 ${selectedDoc ? 'mr-[340px]' : ''}`}>

                {/* ── HEADER ── */}
                <div className="flex-none px-5 py-2.5 flex items-center justify-between border-b border-stone-200 bg-stone-50 gap-3">
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
                            <svg width={13} height={13} viewBox="0 0 64 64" fill="none" style={{ flexShrink: 0 }}>
                                <rect x="4" y="24" width="56" height="34" rx="5" fill={!currentFolderId && !searchQuery ? 'var(--th-tab-active-bg)' : '#94a3b8'} opacity="0.25" />
                                <rect x="4" y="24" width="56" height="34" rx="5" stroke={!currentFolderId && !searchQuery ? 'var(--th-tab-active-bg)' : '#94a3b8'} strokeWidth="4" />
                                <path d="M4 24 L4 20 Q4 16 8 16 L22 16 Q26 16 28 20 L30 24 Z" fill={!currentFolderId && !searchQuery ? 'var(--th-tab-active-bg)' : '#94a3b8'} />
                            </svg>
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
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="relative">
                            <Search size={13} className="absolute left-2.5 top-1/2 -transtone-y-1/2 text-stone-400" />
                            <input type="text" placeholder="Ara..." value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)} autoComplete="off"
                                className="pl-7 pr-7 py-1.5 text-[11px] border border-stone-200 rounded-lg w-36 focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20 bg-white" />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -transtone-y-1/2 text-stone-300 hover:text-stone-500"><X size={12} /></button>
                            )}
                        </div>
                        <div className="relative">
                            <select value={filterType} onChange={e => setFilterType(e.target.value)}
                                className="pl-7 pr-2 py-1.5 text-[11px] border border-stone-200 rounded-lg bg-white text-stone-700 focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20 appearance-none cursor-pointer">
                                <option value="all">Tüm Dosyalar</option>
                                <option value="pdf">PDF</option>
                                <option value="excel">Excel / CSV</option>
                                <option value="ppt">Sunum (PPTX)</option>
                                <option value="image">Görseller</option>
                                <option value="audio">Ses</option>
                                <option value="video">Video</option>
                                <option value="vectorized">Vektörleşmiş</option>
                            </select>
                            <SlidersHorizontal size={12} className="absolute left-2 top-1/2 -transtone-y-1/2 text-stone-400 pointer-events-none" />
                        </div>
                        <div className="relative">
                            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                                className="pl-7 pr-2 py-1.5 text-[11px] border border-stone-200 rounded-lg bg-white text-stone-700 focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20 appearance-none cursor-pointer">
                                <option value="newest">En Yeni</option>
                                <option value="oldest">En Eski</option>
                                <option value="largest">En Büyük</option>
                                <option value="name">İsim (A-Z)</option>
                            </select>
                            <ArrowUpDown size={12} className="absolute left-2 top-1/2 -transtone-y-1/2 text-stone-400 pointer-events-none" />
                        </div>
                        <div className="w-px h-5 bg-stone-200" />
                        <button onClick={() => setIsCreatingFolder(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 text-[11px] font-black rounded-lg transition-colors">
                            <Plus size={13} /> Klasör
                        </button>
                        <button onClick={handleUploadClick}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D44B4B] hover:bg-[#b93c3c] text-white text-[11px] font-black rounded-lg transition-colors">
                            <Upload size={13} /> Yükle
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden"
                            accept=".pdf,.docx,.doc,.txt,.md,.pptx,.ppt,.xlsx,.xls,.csv,.mp3,.wav,.ogg,.m4a,.flac,.aac,.opus,.wma,.mp4,.avi,.mov,.mkv,.webm,.m4v,.wmv,.bpmn" />
                    </div>
                </div>

                {/* ── İSTATİSTİK ŞERİDİ ── */}
                <div className="flex-none px-5 py-2 flex items-center gap-5 bg-stone-50 border-b border-stone-200 text-[11px] text-stone-500">
                    <span className="flex items-center gap-1.5"><FileText size={12} className="text-stone-400" /> <b className="text-[#378ADD] font-black font-mono tabular-nums">{allDocs.length}</b> Dosya</span>
                    <span className="flex items-center gap-1.5">
                        <svg width={12} height={12} viewBox="0 0 64 64" fill="none">
                            <rect x="4" y="24" width="56" height="34" rx="5" fill="#94a3b8" opacity="0.3" />
                            <rect x="4" y="24" width="56" height="34" rx="5" stroke="#94a3b8" strokeWidth="4" />
                            <path d="M4 24 L4 20 Q4 16 8 16 L22 16 Q26 16 28 20 L30 24 Z" fill="#94a3b8" />
                        </svg>
                        <b className="text-[#378ADD] font-black font-mono tabular-nums">{allFolders.length}</b> Klasör
                    </span>
                    <span className="flex items-center gap-1.5"><Database size={12} className="text-teal-500" /> <b className="text-[#378ADD] font-black font-mono tabular-nums">{vectorCount}</b> Vektörleşmiş</span>
                    <span className="ml-auto flex items-center gap-1"><b className="text-[#378ADD] font-black font-mono tabular-nums">{formatBytes(totalSize)}</b> Toplam</span>
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2 pl-4 border-l border-stone-200">
                            <span className="font-semibold text-stone-700">{selectedIds.size} seçildi</span>
                            <button onClick={() => {
                                const allIds = currentItems.map(item => item.id);
                                if (selectedIds.size === allIds.length && allIds.length > 0) setSelectedIds(new Set());
                                else setSelectedIds(new Set(allIds));
                            }} className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#378ADD]/10 text-[#378ADD] hover:bg-[#378ADD]/20 font-medium transition-colors">
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
                <div className="flex-1 overflow-y-auto px-5 py-4 bg-stone-50"
                    onClick={() => { if (isCreatingFolder && newFolderName.trim()) handleCreateFolder(); else setIsCreatingFolder(false); }}>
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#378ADD]" />
                        </div>
                    ) : folders.length === 0 && documents.length === 0 && !isCreatingFolder ? (
                        <div className="flex flex-col items-center justify-center h-64 text-stone-400">
                            <PackageOpen size={48} strokeWidth={1.5} className="mb-4 opacity-30" />
                            <h3 className="text-[14px] font-semibold text-stone-700 mb-1">Bu Dizin Boş</h3>
                            <p className="text-[12px] text-stone-400 max-w-sm text-center">Dosya yükleyin veya yeni klasör oluşturun.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {/* Klasörler */}
                            {(folders.length > 0 || isCreatingFolder) && (
                                <div className="mb-6">
                                    <div className="flex items-center gap-3 mb-3 px-1">
                                        <span className="text-[9px] font-black tracking-[0.18em] text-stone-400 uppercase whitespace-nowrap">Klasörler</span>
                                        <div className="flex-1 h-px bg-stone-200" />
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                        {isCreatingFolder && (
                                            <div className="group relative flex flex-col items-center text-center p-2 rounded-xl cursor-default" onClick={e => e.stopPropagation()}>
                                                <div className="mb-2">
                                                    <svg width={64} height={64} viewBox="0 0 64 64" fill="none" style={{ flexShrink: 0 }}>
                                                        <rect x="4" y="24" width="56" height="34" rx="5" fill="#cbd5e1" opacity="0.6" />
                                                        <rect x="4" y="24" width="56" height="34" rx="5" stroke="#94a3b8" strokeWidth="1.5" strokeOpacity="0.5" />
                                                        <path d="M4 24 L4 20 Q4 16 8 16 L22 16 Q26 16 28 20 L30 24 Z" fill="#94a3b8" opacity="0.5" />
                                                    </svg>
                                                </div>
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
                                        {folders.map(folder => (
                                            <FolderNode
                                                key={folder.id}
                                                folder={folder}
                                                isSelected={selectedIds.has(folder.id)}
                                                isDragOver={dragOverFolder === folder.id}
                                                setCurrentFolderId={setCurrentFolderId}
                                                setSearchQuery={setSearchQuery}
                                                handleDragOver={handleDragOver}
                                                handleDrop={handleDrop}
                                                setDragOverFolder={setDragOverFolder}
                                                {...sharedNodeProps}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Dosyalar */}
                            {documents.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-3 mb-3 px-1">
                                        <span className="text-[9px] font-black tracking-[0.18em] text-stone-400 uppercase whitespace-nowrap">Dosyalar</span>
                                        <div className="flex-1 h-px bg-stone-200" />
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                        {documents.map(doc => (
                                            <FileNode
                                                key={doc.id}
                                                doc={doc}
                                                isSelected={selectedIds.has(doc.id)}
                                                selectedDoc={selectedDoc}
                                                setSelectedDoc={setSelectedDoc}
                                                {...sharedNodeProps}
                                            />
                                        ))}
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
                    />
                )}
            </div>
        </div>
    );
}
