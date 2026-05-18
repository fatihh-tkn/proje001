import { useRef, useEffect } from 'react';
import { Edit2, FolderInput, Cpu, Trash2 } from 'lucide-react';

const AudioContextMenu = ({ x, y, item, onClose, onDelete, onRename, onMove }) => {
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="fixed z-[9999] bg-white border border-stone-200 rounded-lg shadow-xl py-1 w-44"
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
            <div className="border-t border-stone-100 my-1" />
            <button
                onClick={() => { onDelete([item.id]); onClose(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-red-600 hover:bg-red-50 transition-colors"
            >
                <Trash2 size={13} /> Sil
            </button>
        </div>
    );
};

export default AudioContextMenu;
