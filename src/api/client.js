/**
 * Merkezi API istemcisi.
 * Tüm fetch() çağrıları için tutarlı hata yönetimi sağlar.
 *
 * Kullanım:
 *   import { apiGet, apiPost, apiDelete, apiPatch } from '../api/client';
 *   const data = await apiGet('/api/archive/list');
 */

import { useErrorStore } from '../store/errorStore';

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
    throw new ApiError('Oturum süresi doldu, lütfen tekrar giriş yapın.', 401);
  }

  if (res.status === 429) {
    throw new ApiError('Çok fazla istek gönderildi. Lütfen biraz bekleyin.', 429);
  }

  let detail = res.statusText;
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

/** Temel fetch wrapper — JSON yanıtı döner, hataları fırlatır. */
async function request(url, options = {}, { silent = false } = {}) {
  try {
    const res = await fetch(url, options);
    await _checkResponse(res);

    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return await res.json();
    return await res.text();
  } catch (err) {
    if (!silent) _notifyError(err.message || 'Sunucu hatası oluştu.');
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
