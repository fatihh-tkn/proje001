/**
 * src/locales/tr.js — Türkçe lokalizasyon kaynakları (toast standartları).
 */

export const KIND_PHRASES = {
    create:   { ok: 'eklendi',           fail: 'eklenemedi',           progress: 'ekleniyor' },
    update:   { ok: 'güncellendi',       fail: 'güncellenemedi',       progress: 'güncelleniyor' },
    delete:   { ok: 'silindi',           fail: 'silinemedi',           progress: 'siliniyor' },
    upload:   { ok: 'yüklendi',          fail: 'yüklenemedi',          progress: 'yükleniyor' },
    save:     { ok: 'kaydedildi',        fail: 'kaydedilemedi',        progress: 'kaydediliyor' },
    restore:  { ok: 'geri alındı',       fail: 'geri alınamadı',       progress: 'geri alınıyor' },
    trigger:  { ok: 'çalıştırıldı',      fail: 'çalıştırılamadı',      progress: 'çalıştırılıyor' },
    toggle:   { ok: 'durumu değiştirildi', fail: 'durum değişmedi',    progress: 'durum değişiyor' },
    move:     { ok: 'taşındı',           fail: 'taşınamadı',           progress: 'taşınıyor' },
    rename:   { ok: 'yeniden adlandırıldı', fail: 'yeniden adlandırılamadı', progress: 'yeniden adlandırılıyor' },
    download: { ok: 'indirildi',         fail: 'indirilemedi',         progress: 'indiriliyor' },
    process:  { ok: 'tamamlandı',        fail: 'tamamlanamadı',        progress: 'işleniyor' },
};

export const TOAST_DURATIONS = {
    success: 3000,
    info:    4000,
    error:   6000,
    loading: 0,
};

export const formatMutationMessage = ({ kind, subject, detail, ok }) => {
    const phrase = KIND_PHRASES[kind] || KIND_PHRASES.save;
    const verb = ok ? phrase.ok : phrase.fail;
    const sub = subject || 'İşlem';
    const tail = detail ? `: ${detail}` : '';
    return `${sub} ${verb}${tail}.`;
};

export const formatLoadingMessage = ({ kind, subject, detail }) => {
    const phrase = KIND_PHRASES[kind] || KIND_PHRASES.save;
    const sub = subject || 'İşlem';
    const tail = detail ? `: ${detail}` : '';
    return `${sub} ${phrase.progress}${tail}…`;
};

export const COMMON = {
    confirmDelete: 'Bu kaydı silmek istediğinizden emin misiniz?',
    sessionExpired: 'Oturum süresi doldu, lütfen tekrar giriş yapın.',
    networkError: 'Sunucuya ulaşılamadı.',
    rateLimited: 'Çok fazla istek gönderildi. Lütfen biraz bekleyin.',
};

const tr = { KIND_PHRASES, TOAST_DURATIONS, formatMutationMessage, formatLoadingMessage, COMMON };
export default tr;
