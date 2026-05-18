import React from 'react';
import { CheckSquare, Square, GripVertical, Tag, Download } from 'lucide-react';
import { FileCard } from '../../../ui/file-card-collections';

// ── YARDIMCI: Dosya türüne göre ikon/renk ───────────────────────────────────
// (ArchiveDocsViewer.jsx'deki getFileVisual ile birebir aynı — izole tutmak için)
const ARCHIVE_ONLY_TYPES = ['xls', 'xlsx', 'csv'];
const isArchiveOnly = (fileType) => ARCHIVE_ONLY_TYPES.includes((fileType || '').toLowerCase());

const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024, dm = 1, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// ── Klasör İkonu ─────────────────────────────────────────────────────────────
function FolderIcon({ isUserFolder, uploaderName, size = 64 }) {
    const initials = (uploaderName || '?')
        .split(' ').filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2);

    if (isUserFolder) {
        return (
            <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
                <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
                    <rect x="6" y="22" width="52" height="36" rx="5" fill="var(--th-tab-active-bg)" opacity="0.12" />
                    <rect x="4" y="24" width="56" height="34" rx="5" fill="var(--th-tab-active-bg)" opacity="0.18" />
                    <rect x="4" y="24" width="56" height="34" rx="5" stroke="var(--th-tab-active-bg)" strokeWidth="1.5" strokeOpacity="0.5" />
                    <path d="M4 24 L4 20 Q4 16 8 16 L22 16 Q26 16 28 20 L30 24 Z" fill="var(--th-tab-active-bg)" opacity="0.35" />
                    <line x1="16" y1="36" x2="34" y2="36" stroke="var(--th-tab-active-bg)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
                    <line x1="16" y1="42" x2="28" y2="42" stroke="var(--th-tab-active-bg)" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
                </svg>
                <div style={{
                    position: 'absolute', bottom: 2, right: 0,
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'var(--th-tab-active-bg)',
                    border: '2px solid white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 7, fontWeight: 700, color: 'white',
                    letterSpacing: '0.03em',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}>
                    {initials}
                </div>
            </div>
        );
    }

    return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ flexShrink: 0 }}>
            <rect x="6" y="22" width="52" height="36" rx="5" fill="#94a3b8" opacity="0.10" />
            <rect x="4" y="24" width="56" height="34" rx="5" fill="#cbd5e1" opacity="0.6" />
            <rect x="4" y="24" width="56" height="34" rx="5" stroke="#94a3b8" strokeWidth="1.5" strokeOpacity="0.5" />
            <path d="M4 24 L4 20 Q4 16 8 16 L22 16 Q26 16 28 20 L30 24 Z" fill="#94a3b8" opacity="0.5" />
            <line x1="16" y1="36" x2="34" y2="36" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
            <line x1="16" y1="42" x2="28" y2="42" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
        </svg>
    );
}

// ── KLASÖR KARTII ─────────────────────────────────────────────────────────────
export function FolderNode({
    folder,
    isSelected,
    isDragOver,
    renameItem,
    renameValue,
    setRenameValue,
    handleRename,
    setRenameItem,
    selectedIds,
    toggleSelect,
    setCurrentFolderId,
    setSearchQuery,
    setCtxMenu,
    handleDragStart,
    handleDragOver,
    handleDrop,
    setDragOverFolder,
}) {
    return (
        <div
            key={folder.id}
            draggable
            onDragStart={(e) => handleDragStart(e, folder)}
            onDragOver={(e) => handleDragOver(e, folder.id)}
            onDragLeave={() => setDragOverFolder(null)}
            onDrop={(e) => handleDrop(e, folder.id)}
            onDoubleClick={() => {
                if (selectedIds.size === 0 && renameItem?.id !== folder.id) {
                    setCurrentFolderId(folder.id);
                    setSearchQuery('');
                }
            }}
            onClick={(e) => {
                e.stopPropagation();
                if (selectedIds.size > 0) toggleSelect(folder.id, e);
            }}
            onContextMenu={(e) => {
                e.preventDefault();
                setCtxMenu({ x: e.clientX, y: e.clientY, item: folder });
            }}
            className={`group relative flex flex-col items-center text-center p-2 rounded-xl cursor-pointer transition-all select-none
                ${isSelected
                    ? 'bg-[#378ADD]/10 ring-1 ring-[#378ADD]/20'
                    : isDragOver
                        ? 'ring-1 ring-[var(--th-tab-active-bg)]/40 bg-[var(--th-tab-active-bg)]/5'
                        : folder.havuz_turu === 'kullanici'
                            ? 'hover:bg-[var(--th-tab-active-bg)]/5 border border-transparent'
                            : 'hover:bg-white border border-transparent hover:border-stone-200 hover:shadow-sm'
                }`}
            title={folder.havuz_turu === 'kullanici' ? `${folder.uploader || folder.filename}'in klasörü` : folder.filename}
        >
            <div
                onClick={(e) => toggleSelect(folder.id, e)}
                className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                {isSelected ? <CheckSquare size={14} className="text-[#378ADD]" /> : <Square size={14} className="text-stone-300" />}
            </div>
            <div className="mb-2">
                <FolderIcon
                    isUserFolder={folder.havuz_turu === 'kullanici'}
                    uploaderName={folder.uploader || folder.filename}
                />
            </div>
            {renameItem?.id === folder.id ? (
                <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename();
                        if (e.key === 'Escape') setRenameItem(null);
                    }}
                    onBlur={handleRename}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    className="w-full text-[11px] font-semibold text-stone-800 bg-stone-50 border border-[#378ADD]/30 rounded px-1.5 py-0.5 outline-none focus:border-[#378ADD] mt-0.5"
                />
            ) : (
                <h4
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        setRenameItem(folder);
                        setRenameValue(folder.filename);
                    }}
                    className="text-[11px] font-semibold text-stone-800 line-clamp-2 select-text mt-0.5 max-w-full leading-tight"
                    title={folder.filename}
                >
                    {folder.filename}
                </h4>
            )}
            <p className="text-[10px] text-stone-400 mt-1 truncate">
                {new Date(folder.created_at).toLocaleDateString('tr')}
            </p>
        </div>
    );
}

// ── DOSYA KARTI ───────────────────────────────────────────────────────────────
export function FileNode({
    doc,
    isSelected,
    selectedDoc,
    renameItem,
    renameValue,
    setRenameValue,
    handleRename,
    setRenameItem,
    toggleSelect,
    setSelectedDoc,
    setCtxMenu,
    handleDragStart,
}) {
    return (
        <div
            key={doc.id}
            draggable
            onDragStart={(e) => handleDragStart(e, doc)}
            onDragOver={(e) => e.preventDefault()}
            onClick={(e) => {
                if (selectedDoc?.size > 0) toggleSelect(doc.id, e);
                else setSelectedDoc(doc);
            }}
            onContextMenu={(e) => {
                e.preventDefault();
                setCtxMenu({ x: e.clientX, y: e.clientY, item: doc });
            }}
            className={`group relative flex flex-col items-center text-center p-2 rounded-xl cursor-pointer transition-all select-none
                ${selectedDoc?.id === doc.id
                    ? 'bg-[#378ADD]/10 ring-1 ring-[#378ADD]/30'
                    : isSelected
                        ? 'bg-[#378ADD]/5 ring-1 ring-[#378ADD]/20'
                        : 'hover:bg-white border border-transparent hover:border-stone-200 hover:shadow-sm'
                }`}
        >
            <div
                onClick={(e) => toggleSelect(doc.id, e)}
                className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                {isSelected ? <CheckSquare size={14} className="text-[#378ADD]" /> : <Square size={14} className="text-stone-300" />}
            </div>

            {/* Dışarı sürükleme tutamacı */}
            <div
                title="Sürükleyerek masaüstüne, maile veya WhatsApp'a kopyala"
                className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 text-stone-400 cursor-grab active:cursor-grabbing"
            >
                <GripVertical size={11} />
                <span className="text-[9px] leading-none">sürükle</span>
            </div>

            {/* Vektörleşmiş badge */}
            {doc.is_vectorized && !isArchiveOnly(doc.file_type) && (
                <span className="absolute top-2 right-2 bg-teal-50 text-teal-700 border border-teal-100 text-[8px] font-bold px-1.5 py-0.5 rounded leading-none">VEK</span>
            )}
            {isArchiveOnly(doc.file_type) && (
                <span
                    className="absolute top-2 right-2 bg-amber-50 text-amber-700 border border-amber-200 text-[8px] font-bold px-1.5 py-0.5 rounded leading-none"
                    title="Yapay zeka ile işlenmedi"
                >
                    ARŞİV
                </span>
            )}

            {doc.etiketler?.length > 0 && (
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
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename();
                        if (e.key === 'Escape') setRenameItem(null);
                    }}
                    onBlur={handleRename}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    className="w-full text-[11px] font-semibold text-stone-800 bg-stone-50 border border-[#378ADD]/30 rounded px-1.5 py-0.5 outline-none focus:border-[#378ADD] mt-2 mb-1"
                />
            ) : (
                <h4
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        setRenameItem(doc);
                        setRenameValue(doc.filename);
                    }}
                    className="text-[11px] font-semibold text-stone-800 line-clamp-2 select-text mt-auto leading-tight"
                    title={doc.filename}
                >
                    {doc.filename}
                </h4>
            )}

            <div className="flex flex-col items-center mt-1">
                <span className="text-[10px] text-stone-400">{new Date(doc.created_at).toLocaleDateString('tr')}</span>
                <span className="text-[10px] text-stone-400 font-medium">{formatBytes(doc.file_size)}</span>
            </div>

            {doc.meta?.transcription_preview && (
                <div className="mt-1.5 w-full flex items-start justify-between gap-1 border-t border-stone-100 pt-1.5">
                    <p className="flex-1 text-[10px] text-stone-500 leading-snug line-clamp-2 text-left">
                        {doc.meta.transcription_preview}
                    </p>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            const content = doc.meta.transcription_full_text || doc.meta.transcription_raw_text || doc.meta.transcription_preview || '';
                            if (!content) return;
                            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${doc.filename.replace(/\.[^.]+$/, '')}_transkript.txt`;
                            a.click();
                            URL.revokeObjectURL(url);
                        }}
                        title="Transkripti TXT olarak indir"
                        className="shrink-0 p-1 rounded hover:bg-teal-100 text-teal-600 transition-colors"
                    >
                        <Download size={11} />
                    </button>
                </div>
            )}
        </div>
    );
}
