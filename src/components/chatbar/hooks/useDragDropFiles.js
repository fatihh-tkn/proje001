import { useState } from 'react';

/**
 * ChatBar için dosya sürükle-bırak mantığını kapsüller.
 *
 * @param {object}   options
 * @param {Function} options.addAttachedFiles - Yeni dosyaları ekleyen callback
 * @param {number}   options.maxAttach        - İzin verilen maksimum dosya sayısı
 * @param {boolean}  options.isSideOpen       - Panel açık mı
 * @param {Function} options.setIsSideOpen    - Panel açma/kapama setter'ı
 * @param {React.RefObject} options.textareaRef - Bırakma sonrası focus verilecek textarea
 *
 * @returns {{ isDragOver, handleDragOver, handleDragLeave, handleDrop }}
 */
export const useDragDropFiles = ({
    addAttachedFiles,
    maxAttach,
    isSideOpen,
    setIsSideOpen,
    textareaRef,
}) => {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e) => {
        if (e.dataTransfer.types.includes('application/json')) {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(true);
            if (!isSideOpen) setIsSideOpen(true);
        }
    };

    const handleDragLeave = (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const raw = e.dataTransfer.getData('application/json');
        if (!raw) return;
        try {
            const fileData = JSON.parse(raw);
            if (fileData.type && fileData.type !== 'folder') {
                addAttachedFiles([{
                    id: fileData.id || `drop_${Date.now()}`,
                    name: fileData.title || fileData.name,
                    type: fileData.type,
                    url: fileData.url || '',
                    size: null,
                    source: 'archive',
                }]);
                setTimeout(() => { if (textareaRef?.current) textareaRef.current.focus(); }, 150);
            }
        } catch (_) { }
    };

    return { isDragOver, handleDragOver, handleDragLeave, handleDrop };
};
