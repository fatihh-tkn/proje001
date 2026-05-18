import React, { useRef, useEffect, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import { Edit2, FolderInput, Cpu, Trash2, Users2 } from 'lucide-react';

/**
 * Sağ tık context menu — dosya/klasör üzerinde
 * Portal ile document.body'e render edilir; viewport sınırlarını otomatik düzeltir.
 */
const ContextMenu = ({ x, y, item, onClose, onDelete, onRename, onMove, onAccess, isAdmin }) => {
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    useLayoutEffect(() => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        if (x + rect.width > vw) ref.current.style.left = Math.max(8, vw - rect.width - 8) + 'px';
        if (y + rect.height > vh) ref.current.style.top = Math.max(8, vh - rect.height - 8) + 'px';
    }, [x, y]);

    return ReactDOM.createPortal(
        <div
            ref={ref}
            className="fixed z-[9999] bg-white border border-stone-200 rounded-lg shadow-xl py-1 w-48"
            style={{ top: y, left: x }}
        >
            <button
                onClick={() => { onRename(item); onClose(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-stone-700 hover:bg-stone-50 transition-colors"
            >
                <Edit2 size={13} className="text-stone-400" /> Yeniden Adlandır
            </button>
            <button
                onClick={() => { onMove(item); onClose(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-stone-700 hover:bg-stone-50 transition-colors"
            >
                <FolderInput size={13} className="text-stone-400" /> Klasöre Taşı
            </button>
            {item.file_type !== 'folder' && (
                <button
                    onClick={onClose}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-stone-700 hover:bg-stone-50 transition-colors"
                >
                    <Cpu size={13} className="text-teal-500" /> Vektörleştir
                </button>
            )}
            {isAdmin && (
                <>
                    <div className="border-t border-stone-100 my-1" />
                    <button
                        onClick={() => { onAccess(item); onClose(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                        <Users2 size={13} /> Erişim Yönetimi
                    </button>
                </>
            )}
            <div className="border-t border-stone-100 my-1" />
            <button
                onClick={() => { onDelete([item.id]); onClose(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-red-600 hover:bg-red-50 transition-colors"
            >
                <Trash2 size={13} /> Sil
            </button>
        </div>,
        document.body
    );
};

export default ContextMenu;
