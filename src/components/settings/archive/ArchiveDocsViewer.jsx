import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    PackageOpen, Folder, File, ChevronRight, Upload, Plus, Search,
    FileText, FileImage, FileSpreadsheet, FileCode, Film, Music,
    Database, Trash2, FolderInput, Cpu, X, CheckSquare, Square,
    ArrowUpDown, SlidersHorizontal, Edit2, Check, Tag, MessageSquare,
    ExternalLink, Download
} from 'lucide-react';
import { useWorkspaceStore } from '../../../store/workspaceStore';

// ── YARDIMCI: Dosya türüne göre ikon ve renk
const getFileVisual = (fileType) => {
    const t = (fileType || '').toLowerCase();
    if (t === 'pdf') return { Icon: FileText, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' };
    if (['xls', 'xlsx', 'csv'].includes(t)) return { Icon: FileSpreadsheet, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' };
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(t)) return { Icon: FileImage, color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-100' };
    if (['doc', 'docx', 'txt', 'md'].includes(t)) return { Icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' };
    if (['mp4', 'avi', 'mov'].includes(t)) return { Icon: Film, color: 'text-pink-500', bg: 'bg-pink-50', border: 'border-pink-100' };
    if (['mp3', 'wav', 'ogg'].includes(t)) return { Icon: Music, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' };
    if (['py', 'js', 'ts', 'json', 'html'].includes(t)) return { Icon: FileCode, color: 'text-cyan-500', bg: 'bg-cyan-50', border: 'border-cyan-100' };
    return { Icon: File, color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-100' };
};

// Sadece arşiv modunda olan formatlar
const ARCHIVE_ONLY_TYPES = ['xls', 'xlsx', 'csv'];
const isArchiveOnly = (fileType) => ARCHIVE_ONLY_TYPES.includes((fileType || '').toLowerCase());


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
            className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-xl py-1 w-44"
            style={{ top: y, left: x }}
        >
            <button onClick={() => { onRename(item); onClose(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-slate-700 hover:bg-slate-50 transition-colors">
                <Edit2 size={13} className="text-slate-400" /> Yeniden Adlandır
            </button>
            <button onClick={() => { onMove(item); onClose(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-slate-700 hover:bg-slate-50 transition-colors">
                <FolderInput size={13} className="text-slate-400" /> Klasöre Taşı
            </button>
            {item.file_type !== 'folder' && (
                <button onClick={onClose}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-slate-700 hover:bg-slate-50 transition-colors">
                    <Cpu size={13} className="text-teal-500" /> Vektörleştir
                </button>
            )}
            <div className="border-t border-slate-100 my-1" />
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
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-[14px] font-bold text-slate-800">Klasöre Taşı</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                </div>
                <div className="p-4 max-h-64 overflow-y-auto flex flex-col gap-1">
                    <button
                        onClick={() => setTargetId(null)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition-colors ${targetId === null ? 'bg-[#A01B1B]/10 text-[#A01B1B]' : 'hover:bg-slate-50 text-slate-700'}`}
                    >
                        <Folder size={14} /> Kök Dizin
                    </button>
                    {folders.filter(f => f.id !== item.id).map(f => (
                        <button key={f.id}
                            onClick={() => setTargetId(f.id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition-colors ${targetId === f.id ? 'bg-[#A01B1B]/10 text-[#A01B1B]' : 'hover:bg-slate-50 text-slate-700'}`}
                        >
                            <Folder size={14} className="text-amber-500" /> {f.filename}
                        </button>
                    ))}
                </div>
                <div className="px-4 py-3 border-t border-slate-100 flex justify-end gap-2">
                    <button onClick={onClose} className="px-3 py-1.5 text-[12px] bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md">İptal</button>
                    <button onClick={() => { onMove(item.id, targetId); onClose(); }} className="px-3 py-1.5 text-[12px] bg-[#A01B1B] hover:bg-[#8a1717] text-white rounded-md">Taşı</button>
                </div>
            </div>
        </div>
    );
};

// ── DETAY / ÖNİZLEME PANELİ
const DetailPanel = ({ doc, onClose, onTagUpdate, onDescUpdate }) => {
    const [tags, setTags] = useState(doc?.etiketler || []);
    const [tagInput, setTagInput] = useState('');
    const [desc, setDesc] = useState(doc?.aciklama || '');
    const [descEditing, setDescEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setTags(doc?.etiketler || []);
        setDesc(doc?.aciklama || '');
        setDescEditing(false);
    }, [doc?.id]);

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
            className="absolute top-0 right-0 w-[340px] h-full bg-white border-l border-slate-200 shadow-xl flex flex-col z-50 overflow-hidden"
            style={{ transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
            {/* Header */}
            <div className="flex-none px-5 py-3.5 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-[13px] font-bold text-slate-800 truncate">{doc.filename}</h3>
                <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 shrink-0 ml-2">
                    <X size={15} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Önizleme Alanı */}
                <div className="border-b border-slate-100">
                    {isImage(doc.file_type) ? (
                        <img src={previewUrl} alt={doc.filename} className="w-full max-h-48 object-contain bg-slate-50 p-4" />
                    ) : isPdf(doc.file_type) ? (
                        <iframe src={previewUrl} title="PDF Önizleme" className="w-full h-48 border-0 bg-slate-50" />
                    ) : (
                        <div className={`flex flex-col items-center justify-center h-32 ${bg}`}>
                            <Icon size={40} className={`${color} opacity-60`} strokeWidth={1} />
                            <a
                                href={previewUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 flex items-center gap-1 text-[11px] text-[#A01B1B] hover:underline"
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
                            <div key={k} className="flex justify-between border-b border-slate-50 pb-1.5">
                                <span className="text-slate-400 font-medium">{k}</span>
                                <span className="text-slate-700 font-medium text-right">{v}</span>
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

                    </div>

                    {/* Etiketler */}
                    <div>
                        <div className="flex items-center gap-1 mb-2">
                            <Tag size={12} className="text-slate-400" />
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Etiketler</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {tags.map(tag => (
                                <span key={tag} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[11px] font-medium px-2 py-0.5 rounded-full">
                                    {tag}
                                    <button onClick={() => removeTag(tag)} className="text-slate-400 hover:text-red-500 transition-colors">
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
                                className="flex-1 text-[11px] border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-[#A01B1B]"
                            />
                            <button
                                onClick={() => addTag(tagInput)}
                                className="px-2 py-1.5 bg-slate-800 text-white rounded-md text-[11px] hover:bg-slate-700"
                            >
                                <Plus size={13} />
                            </button>
                        </div>
                    </div>

                    {/* Açıklama */}
                    <div>
                        <div className="flex items-center gap-1 mb-2">
                            <MessageSquare size={12} className="text-slate-400" />
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Açıklama</span>
                        </div>
                        {descEditing ? (
                            <div className="flex flex-col gap-1.5">
                                <textarea
                                    autoFocus
                                    value={desc}
                                    onChange={e => setDesc(e.target.value)}
                                    rows={3}
                                    className="w-full text-[12px] border border-slate-200 rounded-md px-2.5 py-2 resize-none focus:outline-none focus:border-[#A01B1B]"
                                    placeholder="Bu dosya hakkında not ekleyin..."
                                />
                                <div className="flex gap-1.5">
                                    <button onClick={saveDesc} disabled={saving}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-[#A01B1B] text-white rounded-md text-[11px] hover:bg-[#8a1717]">
                                        <Check size={12} /> {saving ? 'Kaydediliyor...' : 'Kaydet'}
                                    </button>
                                    <button onClick={() => setDescEditing(false)}
                                        className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-[11px] hover:bg-slate-200">
                                        İptal
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                onClick={() => setDescEditing(true)}
                                className="min-h-[48px] text-[12px] text-slate-600 bg-slate-50 rounded-md px-2.5 py-2 cursor-text border border-transparent hover:border-slate-200 transition-colors"
                            >
                                {desc || <span className="text-slate-300 italic">Açıklama eklemek için tıklayın...</span>}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer / İndir Butonu */}
            <div className="flex-none p-4 border-t border-slate-100 bg-white">
                <a
                    href={previewUrl}
                    download={doc.filename}
                    className="flex flex-1 items-center justify-center gap-2 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[12px] font-medium transition-colors"
                >
                    <Download size={14} /> Dosyayı İndir
                </a>
            </div>
        </div>
    );
};

// ── ANA BİLEŞEN
export default function ArchiveDocsViewer() {
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

    const fileInputRef = useRef(null);

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
            // Ses ve Video dosyalarını standart arşivden dışla (Ses Arşivi sekmesinde varlar)
            const isMedia = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'mp4', 'avi', 'mov', 'webm'].includes((item.file_type || '').toLowerCase());
            if (isMedia) return false;

            if (filterType === 'all') return true;
            if (filterType === 'pdf') return item.file_type === 'pdf';
            if (filterType === 'excel') return ['xls', 'xlsx', 'csv'].includes(item.file_type);
            if (filterType === 'image') return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(item.file_type);
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

    // İstatistikler için medya harici dokümanları hesapla
    const allDocs = items.filter(i => {
        if (i.file_type === 'folder') return false;
        const isMedia = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'mp4', 'avi', 'mov', 'webm'].includes((i.file_type || '').toLowerCase());
        return !isMedia;
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
        await fetch('/api/archive/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        setSelectedIds(new Set());
        if (selectedDoc && ids.includes(selectedDoc.id)) setSelectedDoc(null);
        fetchArchive();
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

        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'archive_items',
            ids: dragIds
        }));
        e.dataTransfer.setData('itemId', item.id); // Geriye dönük uyumluluk (Fallback)

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
                <div style="position:absolute; bottom:0px; right:0px; background:#A01B1B; color:white; font-size:11px; font-weight:bold; border-radius:999px; padding:3px 10px; z-index:20; box-shadow:0 2px 5px rgba(160,27,27,0.4); border:2px solid white;">
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

        const payloadStr = e.dataTransfer.getData('application/json');
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
                <div className="flex-none px-5 py-2.5 flex items-center justify-between border-b border-slate-200 bg-white gap-3">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-1.5 text-[12px] overflow-hidden">
                        <button onClick={() => { setCurrentFolderId(null); setSearchQuery(''); }}
                            className={`flex items-center gap-1 hover:text-[#A01B1B] transition-colors shrink-0 ${!currentFolderId && !searchQuery ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>
                            <Folder size={13} className={!currentFolderId && !searchQuery ? 'text-[#b91d2c]' : ''} />
                            Kök Dizin
                        </button>
                        {breadcrumbs.map(bc => (
                            <React.Fragment key={bc.id}>
                                <ChevronRight size={12} className="text-slate-300 shrink-0" />
                                <button onClick={() => setCurrentFolderId(bc.id)}
                                    className={`hover:text-[#A01B1B] transition-colors truncate ${currentFolderId === bc.id ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>
                                    {bc.filename}
                                </button>
                            </React.Fragment>
                        ))}
                        {searchQuery && <>
                            <ChevronRight size={12} className="text-slate-300 shrink-0" />
                            <span className="font-semibold text-slate-700 text-[11px]">Arama Sonuçları</span>
                        </>}
                    </div>

                    {/* Araçlar */}
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="relative">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Ara..." value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-7 pr-7 py-1.5 text-[11px] border border-slate-200 rounded-md w-36 focus:outline-none focus:border-[#A01B1B] bg-slate-50" />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X size={12} /></button>
                            )}
                        </div>
                        <div className="relative">
                            <select value={filterType} onChange={e => setFilterType(e.target.value)}
                                className="pl-7 pr-2 py-1.5 text-[11px] border border-slate-200 rounded-md bg-slate-50 text-slate-700 focus:outline-none focus:border-[#A01B1B] appearance-none cursor-pointer">
                                <option value="all">Tüm Dosyalar</option>
                                <option value="pdf">PDF</option>
                                <option value="excel">Excel / CSV</option>
                                <option value="image">Görseller</option>
                                <option value="vectorized">Vektörleşmiş</option>
                            </select>
                            <SlidersHorizontal size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="relative">
                            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                                className="pl-7 pr-2 py-1.5 text-[11px] border border-slate-200 rounded-md bg-slate-50 text-slate-700 focus:outline-none focus:border-[#A01B1B] appearance-none cursor-pointer">
                                <option value="newest">En Yeni</option>
                                <option value="oldest">En Eski</option>
                                <option value="largest">En Büyük</option>
                                <option value="name">İsim (A-Z)</option>
                            </select>
                            <ArrowUpDown size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="w-px h-5 bg-slate-200" />
                        <button onClick={() => setIsCreatingFolder(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium rounded-md transition-colors">
                            <Plus size={13} /> Klasör
                        </button>
                        <button onClick={handleUploadClick}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#A01B1B] hover:bg-[#8a1717] text-white text-[11px] font-medium rounded-md transition-colors">
                            <Upload size={13} /> Yükle
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    </div>
                </div>

                {/* ── İSTATİSTİK ŞERİDİ ── */}
                <div className="flex-none px-5 py-1.5 flex items-center gap-5 bg-slate-50 border-b border-slate-100 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5"><FileText size={12} className="text-slate-400" /> <b className="text-slate-700">{allDocs.length}</b> Dosya</span>
                    <span className="flex items-center gap-1.5"><Folder size={12} className="text-slate-400" /> <b className="text-slate-700">{allFolders.length}</b> Klasör</span>
                    <span className="flex items-center gap-1.5"><Database size={12} className="text-teal-500" /> <b className="text-slate-700">{vectorCount}</b> Vektörleşmiş</span>
                    <span className="ml-auto flex items-center gap-1"><b className="text-slate-700">{formatBytes(totalSize)}</b> Toplam</span>
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
                            <span className="font-semibold text-slate-700">{selectedIds.size} seçildi</span>
                            <button onClick={() => {
                                const allIds = currentItems.map(item => item.id);
                                if (selectedIds.size === allIds.length && allIds.length > 0) {
                                    setSelectedIds(new Set());
                                } else {
                                    setSelectedIds(new Set(allIds));
                                }
                            }}
                                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#A01B1B]/10 text-[#A01B1B] hover:bg-[#A01B1B]/20 font-medium transition-colors">
                                <CheckSquare size={11} /> Tümünü Seç
                            </button>
                            <button onClick={() => handleBatchDelete([...selectedIds])}
                                className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors">
                                <Trash2 size={11} /> Sil
                            </button>
                            <button onClick={() => setSelectedIds(new Set())}
                                className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium transition-colors">
                                <X size={11} /> Temizle
                            </button>
                        </div>
                    )}
                </div>

                {/* ── CONTENT ── */}
                <div className="flex-1 overflow-y-auto px-5 py-4 bg-slate-50/50">

                    {/* Yeniden Adlandır */}
                    {renameItem && (
                        <div className="flex gap-2 items-center mb-5 p-3.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                            <Edit2 size={16} className="text-slate-400 shrink-0" />
                            <input autoFocus type="text" value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenameItem(null); }}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-[12px] outline-none focus:border-[#A01B1B]"
                            />
                            <button onClick={handleRename} className="px-3 py-1.5 bg-slate-800 text-white rounded-md text-[11px] font-medium">Kaydet</button>
                            <button onClick={() => setRenameItem(null)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-md text-[11px] font-medium">İptal</button>
                        </div>
                    )}

                    {/* Yeni Klasör */}
                    {isCreatingFolder && (
                        <div className="flex gap-2 items-center mb-5 p-3.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                            <Folder size={18} className="text-amber-500 shrink-0" />
                            <input autoFocus type="text" placeholder="Klasör Adı..."
                                value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setIsCreatingFolder(false); }}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-[12px] outline-none focus:border-[#A01B1B]"
                            />
                            <button onClick={handleCreateFolder} className="px-3 py-1.5 bg-slate-800 text-white rounded-md text-[11px] font-medium">Oluştur</button>
                            <button onClick={() => setIsCreatingFolder(false)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-md text-[11px] font-medium">İptal</button>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#A01B1B]" />
                        </div>
                    ) : folders.length === 0 && documents.length === 0 && !isCreatingFolder ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <PackageOpen size={48} strokeWidth={1.5} className="mb-4 opacity-30" />
                            <h3 className="text-[14px] font-semibold text-slate-700 mb-1">Bu Dizin Boş</h3>
                            <p className="text-[12px] text-slate-400 max-w-sm text-center">Dosya yükleyin veya yeni klasör oluşturun.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {/* Klasörler */}
                            {folders.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">Klasörler</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
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
                                                        if (selectedIds.size === 0) {
                                                            setCurrentFolderId(folder.id); setSearchQuery('');
                                                        }
                                                    }}
                                                    onClick={(e) => {
                                                        if (selectedIds.size > 0) toggleSelect(folder.id, e);
                                                    }}
                                                    onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, item: folder }); }}
                                                    className={`group relative flex flex-col p-3.5 bg-white border rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all select-none
                                                        ${isSelected ? 'border-[#A01B1B] ring-1 ring-[#A01B1B]/20' : isDragOver ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-400/30' : 'border-slate-200 hover:border-slate-300'}`}
                                                >
                                                    <div onClick={(e) => toggleSelect(folder.id, e)}
                                                        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {isSelected ? <CheckSquare size={14} className="text-[#A01B1B]" /> : <Square size={14} className="text-slate-300" />}
                                                    </div>
                                                    <div className="p-2 bg-amber-50 border border-amber-100 rounded-lg w-fit mb-2">
                                                        <Folder size={22} className="text-amber-500 fill-amber-200" />
                                                    </div>
                                                    <h4 className="text-[11px] font-semibold text-slate-800 truncate" title={folder.filename}>{folder.filename}</h4>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{new Date(folder.created_at).toLocaleDateString('tr')}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Dosyalar */}
                            {documents.length > 0 && (
                                <div>
                                    <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">Dosyalar</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                        {documents.map(doc => {
                                            const { Icon, color, bg, border } = getFileVisual(doc.file_type);
                                            const isSelected = selectedIds.has(doc.id);
                                            return (
                                                <div key={doc.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, doc)}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onClick={(e) => {
                                                        if (selectedIds.size > 0) toggleSelect(doc.id, e);
                                                        else setSelectedDoc(doc);
                                                    }}
                                                    onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, item: doc }); }}
                                                    className={`group relative flex flex-col p-3.5 bg-white border rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all select-none
                                                        ${selectedDoc?.id === doc.id ? 'border-[#A01B1B] ring-1 ring-[#A01B1B]/20'
                                                            : isSelected ? 'border-[#A01B1B]/50 ring-1 ring-[#A01B1B]/10'
                                                                : 'border-slate-200 hover:border-slate-300'}`}
                                                >
                                                    <div onClick={(e) => toggleSelect(doc.id, e)}
                                                        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {isSelected ? <CheckSquare size={14} className="text-[#A01B1B]" /> : <Square size={14} className="text-slate-300" />}
                                                    </div>
                                                    {/* Vectorized badge — Excel dosyalarında gösterme */}
                                                    {doc.is_vectorized && !isArchiveOnly(doc.file_type) && (
                                                        <span className="absolute top-2 right-2 bg-teal-50 text-teal-700 border border-teal-100 text-[8px] font-bold px-1.5 py-0.5 rounded leading-none">VEK</span>
                                                    )}
                                                    {/* Archive-only badge */}
                                                    {isArchiveOnly(doc.file_type) && (
                                                        <span className="absolute top-2 right-2 bg-amber-50 text-amber-700 border border-amber-200 text-[8px] font-bold px-1.5 py-0.5 rounded leading-none" title="Yapay zeka ile işlenmedi">
                                                            ARŞİV
                                                        </span>
                                                    )}

                                                    {(doc.etiketler?.length > 0) && (
                                                        <span className="absolute bottom-8 right-2 flex items-center gap-0.5 text-slate-400">
                                                            <Tag size={9} /><span className="text-[9px]">{doc.etiketler.length}</span>
                                                        </span>
                                                    )}
                                                    <div className={`p-2 ${bg} border ${border} rounded-lg w-fit mb-2`}>
                                                        <Icon size={22} className={color} />
                                                    </div>
                                                    <h4 className="text-[11px] font-semibold text-slate-800 truncate" title={doc.filename}>{doc.filename}</h4>
                                                    <div className="flex items-center justify-between mt-0.5">
                                                        <span className="text-[9px] text-slate-400 uppercase font-medium">{doc.file_type}</span>
                                                        <span className="text-[9px] text-slate-400">{formatBytes(doc.file_size)}</span>
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
                    />
                )}
            </div>
        </div>
    );
}
