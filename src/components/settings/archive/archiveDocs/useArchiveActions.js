import { useState, useCallback, useRef } from 'react';
import { mutate } from '../../../../api/client';
import { useErrorStore } from '../../../../store/errorStore';
import { dispatchArchiveChanged } from '../../../../utils/archiveEvents';

/**
 * Arşiv action'larını yöneten custom hook.
 * Silme, taşıma, yeniden adlandırma, klasör oluşturma, yükleme işlemlerini kapsar.
 *
 * @param {object} opts
 * @param {Function} opts.fetchArchive        - Listeyi yenileyen fonksiyon
 * @param {string|null} opts.currentFolderId  - Aktif klasör kimliği
 * @param {object|null} opts.currentUser      - Oturum açmış kullanıcı
 * @param {Set} opts.selectedIds              - Seçili öğe kimlik seti
 * @param {Function} opts.setSelectedIds      - selectedIds setter'ı
 * @param {object|null} opts.selectedDoc      - Detay panelinde açık doküman
 * @param {Function} opts.setSelectedDoc      - selectedDoc setter'ı
 * @param {Function} opts.setLoading          - Loading setter'ı
 */
export function useArchiveActions({
    fetchArchive,
    currentFolderId,
    currentUser,
    selectedIds,
    setSelectedIds,
    selectedDoc,
    setSelectedDoc,
    setLoading,
}) {
    const fileInputRef = useRef(null);

    // ── Yeni Klasör ─────────────────────────────────────────────────────────
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    const handleCreateFolder = useCallback(async () => {
        if (!newFolderName.trim()) return;
        try {
            await mutate.create(
                '/api/archive/create-folder',
                { name: newFolderName, parent_id: currentFolderId },
                { subject: 'Klasör', detail: newFolderName }
            );
            fetchArchive();
            setIsCreatingFolder(false);
            setNewFolderName('');
        } catch { /* toast atıldı */ }
    }, [newFolderName, currentFolderId, fetchArchive]);

    // ── Yükleme ─────────────────────────────────────────────────────────────
    const handleUploadClick = useCallback(() => {
        if (fileInputRef.current) fileInputRef.current.click();
    }, []);

    const handleFileChange = useCallback(async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const kategori = ext === 'bpmn' ? 'surecler' : 'belgeler';
        const formData = new FormData();
        formData.append('file', file);
        formData.append('kategori', kategori);
        if (currentFolderId) formData.append('folder_id', currentFolderId);
        if (currentUser?.id) formData.append('user_id', currentUser.id);
        setLoading(true);
        try {
            await mutate.upload('/api/archive/direct-upload', formData, {
                subject: 'Belge', detail: file.name, rawBody: true, showLoading: true,
            });
        } catch { /* toast atıldı */ }
        fetchArchive();
    }, [currentFolderId, currentUser?.id, fetchArchive, setLoading]);

    // ── Toplu Silme ─────────────────────────────────────────────────────────
    const handleBatchDelete = useCallback(async (ids) => {
        if (!window.confirm(`${ids.length} öğe silinecek. Emin misiniz?`)) return;
        let data;
        try {
            data = await mutate.remove(
                '/api/archive/delete',
                { ids },
                {
                    subject: ids.length > 1 ? `${ids.length} öğe` : 'Öğe',
                    silentSuccess: true,
                }
            );
        } catch {
            return;
        }

        if (data?.status === 'partial') {
            useErrorStore.getState().addToast({
                type: 'info',
                message: `Kısmi silme: ${data.uyarilar?.join(' · ') || 'Bazı öğeler silinemedi.'}`,
                copyable: true,
            });
        } else {
            useErrorStore.getState().addToast({
                type: 'success',
                message: ids.length > 1 ? `${ids.length} öğe silindi.` : 'Öğe silindi.',
            });
        }

        setSelectedIds(new Set());
        if (selectedDoc && ids.includes(selectedDoc.id)) setSelectedDoc(null);
        fetchArchive();
        dispatchArchiveChanged();
    }, [selectedDoc, setSelectedDoc, setSelectedIds, fetchArchive]);

    // ── Yeniden Adlandırma ──────────────────────────────────────────────────
    const [renameItem, setRenameItem] = useState(null);
    const [renameValue, setRenameValue] = useState('');

    const handleRename = useCallback(async () => {
        if (!renameValue.trim()) return;
        try {
            await mutate.rename(
                '/api/archive/rename',
                { kimlik: renameItem.id, yeni_ad: renameValue },
                { subject: 'Öğe', detail: renameValue }
            );
            setRenameItem(null);
            fetchArchive();
        } catch { /* toast atıldı */ }
    }, [renameItem, renameValue, fetchArchive]);

    // ── Taşıma (Tekli) ──────────────────────────────────────────────────────
    const handleMove = useCallback(async (docId, targetFolderId) => {
        try {
            await mutate.move(
                '/api/archive/move',
                { belge_kimlik: docId, hedef_klasor_kimlik: targetFolderId },
                { subject: 'Öğe' }
            );
            fetchArchive();
        } catch { /* toast atıldı */ }
    }, [fetchArchive]);

    // ── Toplu Taşıma ────────────────────────────────────────────────────────
    const handleBatchMove = useCallback(async (docIds, targetFolderId) => {
        setLoading(true);
        let okCount = 0;
        for (const id of docIds) {
            try {
                await mutate.move(
                    '/api/archive/move',
                    { belge_kimlik: id, hedef_klasor_kimlik: targetFolderId },
                    { silent: true }
                );
                okCount++;
            } catch { /* devam */ }
        }
        if (okCount > 0) {
            useErrorStore.getState().addToast({ type: 'success', message: `${okCount} öğe taşındı.` });
        }
        if (okCount < docIds.length) {
            useErrorStore.getState().addToast({ type: 'error', message: `${docIds.length - okCount} öğe taşınamadı.` });
        }
        fetchArchive();
        setSelectedIds(new Set());
    }, [fetchArchive, setLoading, setSelectedIds]);

    // ── Erişim Yönetimi ─────────────────────────────────────────────────────
    const [accessItem, setAccessItem] = useState(null);

    // ── Taşı Modalı ─────────────────────────────────────────────────────────
    const [moveItem, setMoveItem] = useState(null);

    return {
        // Klasör oluşturma
        isCreatingFolder, setIsCreatingFolder,
        newFolderName, setNewFolderName,
        handleCreateFolder,
        // Yükleme
        fileInputRef,
        handleUploadClick,
        handleFileChange,
        // Silme
        handleBatchDelete,
        // Yeniden adlandırma
        renameItem, setRenameItem,
        renameValue, setRenameValue,
        handleRename,
        // Taşıma
        handleMove,
        handleBatchMove,
        moveItem, setMoveItem,
        // Erişim
        accessItem, setAccessItem,
    };
}
