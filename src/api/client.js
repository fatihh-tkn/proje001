/**
 * Merkezi API istemcisi.
 * Tüm fetch() çağrıları için tutarlı hata yönetimi + bildirim sağlar.
 *
 * İki katman:
 *   - apiGet/apiPost/apiPatch/apiDelete  → ham veri çağrıları (sadece error toast'ı)
 *   - mutation() / mutate.*               → CREATE/UPDATE/DELETE için
 *                                           otomatik success+error toast,
 *                                           opsiyonel loading toast
 *
 * Kullanım:
 *   import { apiGet, mutate } from '../api/client';
 *   const list = await apiGet('/api/talepler');
 *   await mutate.create('/api/talepler', payload, { subject: 'Talep', detail: payload.baslik });
 *   await mutate.remove(`/api/talepler/${id}`, null, { subject: 'Talep', detail: name });
 */

import { useErrorStore } from '../store/errorStore';
import {
    formatMutationMessage,
    formatLoadingMessage,
    TOAST_DURATIONS,
    COMMON,
} from '../locales';

// ── Yardımcı: error toast helper ────────────────────────────────────────────
const _notifyError = (message) => {
    try {
        useErrorStore.getState().addToast({ type: 'error', message });
    } catch (_) {
        console.error('[API]', message);
    }
};

/** HTTP yanıtını kontrol eder; ok değilse anlamlı hata fırlatır. */
async function _checkResponse(res) {
    if (res.ok) return res;

    if (res.status === 401) {
        window.dispatchEvent(new CustomEvent('auth:logout'));
        throw new ApiError(COMMON.sessionExpired, 401);
    }

    if (res.status === 429) {
        throw new ApiError(COMMON.rateLimited, 429);
    }

    let detail = res.statusText || `HTTP ${res.status}`;
    try {
        const body = await res.clone().json();
        detail = body?.detail || body?.message || body?.error || detail;
    } catch (_) { /* JSON değilse statusText kullan */ }

    throw new ApiError(detail, res.status);
}

export class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

// ── Temel fetch wrapper ─────────────────────────────────────────────────────

/**
 * Düşük seviye fetch wrapper. Ok yanıtta JSON/metin döndürür, ok değilse
 * ApiError fırlatır. Hata toast'ı `silent: true` değilse otomatik atılır.
 */
async function request(url, options = {}, { silent = false } = {}) {
    try {
        const res = await fetch(url, options);
        await _checkResponse(res);

        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) return await res.json();
        if (res.status === 204) return null;
        return await res.text();
    } catch (err) {
        if (!silent) _notifyError(err.message || COMMON.networkError);
        throw err;
    }
}

export const apiGet = (url, opts) =>
    request(url, { ...opts }, opts);

export const apiPost = (url, body, opts) =>
    request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
        body: body != null ? JSON.stringify(body) : undefined,
        ...opts,
    }, opts);

export const apiPatch = (url, body, opts) =>
    request(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
        body: body != null ? JSON.stringify(body) : undefined,
        ...opts,
    }, opts);

export const apiDelete = (url, body, opts) =>
    request(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
        body: body != null ? JSON.stringify(body) : undefined,
        ...opts,
    }, opts);

// ── Yüksek seviyeli mutation helper ─────────────────────────────────────────

/**
 * Mutation çağrısı: POST/PATCH/PUT/DELETE atar, başarılı/başarısız sonucu
 * sağ alt toast olarak otomatik gösterir, opsiyonel loading toast'ı tutar.
 *
 * @param {'POST'|'PATCH'|'PUT'|'DELETE'} method
 * @param {string} url
 * @param {*}      body  (null/undefined → body yok)
 * @param {Object} opts
 *   - kind:     'create'|'update'|'delete'|'upload'|'save'|'restore'|'trigger'|
 *               'toggle'|'move'|'rename'|'download'|'process'  (varsayılan 'save')
 *   - subject:  'Belge'/'Talep'/... (varsayılan 'İşlem')
 *   - detail:   küçük detay metni — toast sonuna ": <detail>" olarak iliştirilir
 *   - silent:        true → hiç toast atma (heartbeat/audit/idempotent çağrılar için)
 *   - silentSuccess: true → sadece başarı toast'ını atla, hatayı yine göster
 *   - silentError:   true → sadece hata toast'ını atla
 *   - showLoading:   true → istek sırasında "loading" toast'ı göster, sonuçta replace et
 *   - customSuccess: success mesajını override et
 *   - customError:   hata mesajını override et (yine de error.message ekleyebilir)
 *   - copyableError: true → hata toast'ında "kopyala" butonu göster (varsayılan true)
 *   - body için JSON.stringify zaten yapılır; FormData göndereceksen
 *     `rawBody: true` ekle (Content-Type başlığı setlenmez).
 *   - headers: ek header'lar
 *
 * @returns yanıt body (JSON parse edilmiş)
 */
export const mutation = async (method, url, body, opts = {}) => {
    const {
        kind = 'save',
        subject,
        detail,
        silent = false,
        silentSuccess = false,
        silentError = false,
        showLoading = false,
        customSuccess,
        customError,
        copyableError = true,
        rawBody = false,
        headers,
    } = opts;

    const store = useErrorStore.getState();
    let loadingId = null;

    if (showLoading && !silent) {
        loadingId = store.addToast({
            type: 'loading',
            message: formatLoadingMessage({ kind, subject, detail }),
            duration: 0, // kalıcı; aşağıda replaceToast ile değiştirilecek
            skipDedupe: true,
        });
    }

    const fetchOptions = {
        method,
        headers: rawBody ? (headers || {}) : { 'Content-Type': 'application/json', ...(headers || {}) },
        body: rawBody ? body : (body != null ? JSON.stringify(body) : undefined),
    };

    try {
        const res = await fetch(url, fetchOptions);
        await _checkResponse(res);

        const ct = res.headers.get('content-type') || '';
        const data = ct.includes('application/json')
            ? await res.json()
            : (res.status === 204 ? null : await res.text());

        // Success toast
        if (!silent && !silentSuccess) {
            const msg = customSuccess ?? formatMutationMessage({ kind, subject, detail, ok: true });
            if (loadingId != null) {
                store.replaceToast(loadingId, { type: 'success', message: msg });
            } else {
                store.addToast({ type: 'success', message: msg });
            }
        } else if (loadingId != null) {
            // Sadece loading'i kapat
            store.removeToast(loadingId);
        }

        return data;
    } catch (err) {
        if (!silent && !silentError) {
            const baseMsg = customError ?? formatMutationMessage({ kind, subject, detail, ok: false });
            // Sebebi mesajın içine ekle
            const msg = `${baseMsg.replace(/\.$/, '')}: ${err.message || COMMON.networkError}`;
            if (loadingId != null) {
                store.replaceToast(loadingId, { type: 'error', message: msg, copyable: copyableError });
            } else {
                store.addToast({ type: 'error', message: msg, copyable: copyableError });
            }
        } else if (loadingId != null) {
            store.removeToast(loadingId);
        }
        throw err;
    }
};

/**
 * Mutation kısayolları — `subject` ve `detail`'i tek tek geçer.
 *   await mutate.create('/api/talepler', payload, { subject: 'Talep', detail: payload.baslik });
 *   await mutate.remove(`/api/talepler/${id}`, null, { subject: 'Talep', detail: name });
 *   await mutate.toggle('/api/n8n/workflows/123/toggle', null, { subject: 'Workflow', detail: name });
 *   await mutate.upload('/api/archive/direct-upload', formData,
 *                       { subject: 'Belge', detail: file.name, rawBody: true, showLoading: true });
 */
export const mutate = {
    create: (url, body, opts) => mutation('POST',   url, body, { kind: 'create',  ...opts }),
    update: (url, body, opts) => mutation('PATCH',  url, body, { kind: 'update',  ...opts }),
    save:   (url, body, opts) => mutation('POST',   url, body, { kind: 'save',    ...opts }),
    remove: (url, body, opts) => mutation('DELETE', url, body, { kind: 'delete',  ...opts }),
    upload: (url, body, opts) => mutation('POST',   url, body, { kind: 'upload',  ...opts }),
    toggle: (url, body, opts) => mutation('POST',   url, body, { kind: 'toggle',  ...opts }),
    trigger:(url, body, opts) => mutation('POST',   url, body, { kind: 'trigger', ...opts }),
    move:   (url, body, opts) => mutation('PATCH',  url, body, { kind: 'move',    ...opts }),
    rename: (url, body, opts) => mutation('PATCH',  url, body, { kind: 'rename',  ...opts }),
    process:(url, body, opts) => mutation('POST',   url, body, { kind: 'process', ...opts }),
};

/**
 * Manual notify — kod içi ham success/info/error toast atmak için.
 * Standart toast üretmek istemediğin (örn. async iş başlatıldı) durumlar için.
 */
export const notify = {
    success: (message, opts = {}) => useErrorStore.getState().addToast({ type: 'success', message, ...opts }),
    error:   (message, opts = {}) => useErrorStore.getState().addToast({ type: 'error',   message, ...opts }),
    info:    (message, opts = {}) => useErrorStore.getState().addToast({ type: 'info',    message, ...opts }),
    loading: (message, opts = {}) => useErrorStore.getState().addToast({ type: 'loading', message, duration: 0, skipDedupe: true, ...opts }),
};
