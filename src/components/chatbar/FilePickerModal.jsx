import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Search, FileText, Activity, FileQuestion, Check, Loader2, FolderOpen
} from 'lucide-react';

const MAX_FILES = 5;
const MAX_SIZE_MB = 20;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const getFileIcon = (ext) => {
    switch (ext) {
        case 'pdf':  return <FileText size={15} className="text-red-400 shrink-0" />;
        case 'bpmn': return <Activity size={15} className="text-teal-400 shrink-0" />;
        case 'xls': case 'xlsx': return <FileText size={15} className="text-green-400 shrink-0" />;
        case 'txt': case 'doc': case 'docx': return <FileText size={15} className="text-blue-400 shrink-0" />;
        case 'png': case 'jpg': case 'jpeg': return <FileText size={15} className="text-purple-400 shrink-0" />;
        default: return <FileQuestion size={15} className="text-stone-400 shrink-0" />;
    }
};

const formatSize = (bytes) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FilePickerModal = ({ onClose, onConfirm, alreadyAttached = [] }) => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(new Set(alreadyAttached.map(f => f.id)));
    const [oversizeIds, setOversizeIds] = useState(new Set());

    useEffect(() => {
        fetch('/api/archive/list')
            .then(r => r.json())
            .then(data => {
                const items = (data.items || []).filter(i => i.file_type !== 'folder');
                setFiles(items);
                // Boyut limiti aşanları hesapla
                const oversize = new Set(
                    items.filter(i => i.file_size && i.file_size > MAX_SIZE_BYTES).map(i => i.id)
                );
                setOversizeIds(oversize);
            })
            .catch(() => setFiles([]))
            .finally(() => setLoading(false));
    }, []);

    const filtered = files.filter(f =>
        f.filename?.toLowerCase().includes(search.toLowerCase())
    );

    const toggle = useCallback((item) => {
        const id = `archive_${item.id}`;
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                if (next.size >= MAX_FILES) return prev;
                if (oversizeIds.has(item.id)) return prev;
                next.add(id);
            }
            return next;
        });
    }, [oversizeIds]);

    const handleConfirm = () => {
        const selectedFiles = files
            .filter(item => selected.has(`archive_${item.id}`))
            .map(item => ({
                id: `archive_${item.id}`,
                name: item.filename,
                type: item.file_type,
                url: `/api/archive/file/${item.id}`,
                size: item.file_size || null,
                source: 'archive',
            }));
        onConfirm(selectedFiles);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={onClose}>
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.18 }}
                onClick={e => e.stopPropagation()}
                className="relative z-10 w-[520px] max-w-[95vw] max-h-[75vh] flex flex-col bg-white rounded-xl shadow-[0_24px_80px_rgba(0,0,0,0.18)] overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <FolderOpen size={16} className="text-[#DC2626]" />
                        <h2 className="text-[13px] font-semibold text-stone-800">Dosyalarımdan Seç</h2>
                        {selected.size > 0 && (
                            <span className="text-[10px] font-bold bg-[#DC2626] text-white rounded-full px-1.5 py-0.5">
                                {selected.size}/{MAX_FILES}
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors">
                        <X size={15} />
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 py-3 border-b border-stone-100 shrink-0">
                    <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                        <Search size={13} className="text-stone-400 shrink-0" />
                        <input
                            autoFocus
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Dosya ara..."
                            className="flex-1 bg-transparent text-[13px] text-stone-700 outline-none placeholder:text-stone-400"
                            autoComplete="off"
                            spellCheck={false}
                        />
                    </div>
                </div>

                {/* Limit bilgisi */}
                <div className="px-4 py-2 bg-stone-50 border-b border-stone-100 shrink-0">
                    <p className="text-[10px] text-stone-400">
                        En fazla <span className="font-semibold text-stone-600">{MAX_FILES} dosya</span> seçebilirsiniz.
                        {' '}<span className="text-[#DC2626]">{MAX_SIZE_MB} MB</span> üzeri dosyalar seçilemez.
                    </p>
                </div>

                {/* Dosya Listesi */}
                <div className="flex-1 overflow-y-auto px-3 py-2
                    [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent
                    [&::-webkit-scrollbar-thumb]:bg-stone-200 hover:[&::-webkit-scrollbar-thumb]:bg-stone-300 [&::-webkit-scrollbar-thumb]:rounded-full">

                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 size={20} className="animate-spin text-stone-400" />
                        </div>
                    )}

                    {!loading && filtered.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-stone-400">
                            <FileQuestion size={28} className="mb-2 opacity-40" />
                            <p className="text-[12px]">Dosya bulunamadı.</p>
                        </div>
                    )}

                    {!loading && filtered.map(item => {
                        const id = `archive_${item.id}`;
                        const isSelected = selected.has(id);
                        const isOversize = oversizeIds.has(item.id);
                        const isDisabled = isOversize || (!isSelected && selected.size >= MAX_FILES);

                        return (
                            <div
                                key={item.id}
                                onClick={() => !isDisabled && toggle(item)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-colors select-none
                                    ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                                    ${isSelected ? 'bg-[#FEF2F2] border border-[#DC2626]/20' : 'hover:bg-stone-50 border border-transparent'}
                                `}
                            >
                                {/* Checkbox */}
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors
                                    ${isSelected ? 'bg-[#DC2626] border-[#DC2626]' : 'border-stone-300 bg-white'}`}>
                                    {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                                </div>

                                {getFileIcon(item.file_type)}

                                <span className={`flex-1 text-[13px] truncate ${isSelected ? 'text-stone-800 font-medium' : 'text-stone-700'}`}>
                                    {item.filename}
                                </span>

                                <div className="flex items-center gap-2 shrink-0">
                                    {item.file_size && (
                                        <span className={`text-[10px] ${isOversize ? 'text-[#DC2626] font-semibold' : 'text-stone-400'}`}>
                                            {formatSize(item.file_size)}
                                            {isOversize && ' — limit aşıldı'}
                                        </span>
                                    )}
                                    <span className="text-[10px] uppercase text-stone-300 font-medium">{item.file_type}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-stone-100 shrink-0 bg-white">
                    <span className="text-[11px] text-stone-400">
                        {selected.size === 0 ? 'Henüz dosya seçilmedi' : `${selected.size} dosya seçildi`}
                    </span>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="px-3 py-1.5 text-[11px] font-semibold text-stone-500 hover:text-stone-700 transition-colors rounded-lg hover:bg-stone-100">
                            İptal
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={selected.size === 0}
                            className="px-4 py-1.5 text-[11px] font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#DC2626] hover:bg-[#B91C1C] text-white"
                        >
                            Sohbete Ekle ({selected.size})
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default FilePickerModal;
