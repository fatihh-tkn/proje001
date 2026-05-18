import {
    File, FileText, FileImage, FileSpreadsheet, FileCode, Film, Music,
} from 'lucide-react';

// Dosya türüne göre ikon ve renk bilgisi döner
export const getFileVisual = (fileType) => {
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

// Byte değerini okunabilir biçime çevirir
export const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024, dm = 1, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Dosya tipi sınıflandırıcılar
export const ARCHIVE_ONLY_TYPES = ['xls', 'xlsx', 'csv'];
export const isArchiveOnly = (fileType) => ARCHIVE_ONLY_TYPES.includes((fileType || '').toLowerCase());
export const isAudio = (t) => ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes((t || '').toLowerCase());
export const isVideo = (t) => ['mp4', 'avi', 'mov', 'webm'].includes((t || '').toLowerCase());
export const isImage = (t) => ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes((t || '').toLowerCase());
export const isPdf = (t) => (t || '').toLowerCase() === 'pdf';
