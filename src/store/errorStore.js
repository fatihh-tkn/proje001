import { create } from 'zustand';
import { TOAST_DURATIONS } from '../locales';

let _nextId = 1;

// Dedupe penceresi: aynı (type+message) çifti bu süre içinde tekrar gelirse
// yeni toast eklenmez, mevcut toast'ın count'u artar.
const DEDUPE_WINDOW_MS = 1500;

/** Aynı içerikteki son toast'ı bul (dedupe için). */
const findRecentDuplicate = (toasts, type, message) => {
    const now = Date.now();
    for (let i = toasts.length - 1; i >= 0; i--) {
        const t = toasts[i];
        if (t.type === type && t.message === message && (now - t.createdAt) < DEDUPE_WINDOW_MS) {
            return t;
        }
    }
    return null;
};

export const useErrorStore = create((set, get) => ({
    toasts: [],

    /**
     * Toast ekler ve oluşan toast'ın ID'sini döndürür.
     * @param {Object} opts
     *   - type:    'success' | 'error' | 'info' | 'loading' (varsayılan: 'error')
     *   - message: gösterilecek metin (zorunlu)
     *   - duration: ms cinsinden ömür; 0 → kalıcı (loading için tipik)
     *               atlanırsa type'a göre TOAST_DURATIONS'tan alınır
     *   - copyable: true → mesajın yanında kopyala butonu gösterir
     *   - skipDedupe: true → dedupe atlanır (aynı mesaj olsa bile yeni toast)
     * @returns {number} eklenen toast id
     */
    addToast: ({ type = 'error', message, duration, copyable = false, skipDedupe = false } = {}) => {
        if (!message) return null;

        const dur = duration != null ? duration : (TOAST_DURATIONS[type] ?? 4000);

        // Dedupe: aynı mesaj 1.5s içinde tekrar geliyorsa count'u artır
        if (!skipDedupe) {
            const dup = findRecentDuplicate(get().toasts, type, message);
            if (dup) {
                set((state) => ({
                    toasts: state.toasts.map(t =>
                        t.id === dup.id
                            ? { ...t, count: (t.count || 1) + 1, createdAt: Date.now() }
                            : t
                    ),
                }));
                return dup.id;
            }
        }

        const id = _nextId++;
        set((state) => ({
            toasts: [
                ...state.toasts,
                { id, type, message, copyable, count: 1, createdAt: Date.now() },
            ],
        }));

        if (dur > 0) {
            setTimeout(() => {
                set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
            }, dur);
        }
        return id;
    },

    /**
     * Belirli bir toast'ı yeni içerikle günceller (loading → success / error
     * geçişinde kullanılır).
     */
    updateToast: (id, patch) => set((state) => ({
        toasts: state.toasts.map(t => t.id === id ? { ...t, ...patch, createdAt: Date.now() } : t),
    })),

    /**
     * Bir toast'ı, içeriğini değiştirip yeni süresine göre yeniden zamanlar.
     * Loading → final state geçişinde tipik kullanım.
     */
    replaceToast: (id, { type, message, duration, copyable }) => {
        const dur = duration != null ? duration : (TOAST_DURATIONS[type] ?? 4000);
        set((state) => ({
            toasts: state.toasts.map(t =>
                t.id === id
                    ? { ...t, type, message, copyable: copyable ?? t.copyable, count: 1, createdAt: Date.now() }
                    : t
            ),
        }));
        if (dur > 0) {
            setTimeout(() => {
                set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }));
            }, dur);
        }
    },

    removeToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

    clearToasts: () => set({ toasts: [] }),
}));
