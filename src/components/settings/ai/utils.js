export const MODEL_COLORS = {
    'gpt-4': '#10b981',
    'gpt-3.5-turbo': '#f59e0b',
    'claude-3-opus': '#ec4899',
    'gemini-1.5-pro': '#3b82f6',
    'gemini-2.0-flash': '#3b82f6',
    'gemma3:4b': '#8b5cf6',
    default: '#64748b',
};

export const API_BASE = '/api/monitor';
export const SETTINGS_BASE = '/api/settings';

// ── 5 saniyelik timeout ile fetch ──
export const fetchWithTimeout = (url, options = {}, timeoutMs = 5000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timer));
};

// ─── Ortak Yardımcı Fonksiyonlar ───
export const fmt = (n) => (n ?? 0).toLocaleString('tr-TR');
export const fmtMs = (ms) => ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
export const fmtCost = (v) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: v < 0.01 ? 4 : 2,
        maximumFractionDigits: 6
    }).format(v || 0);
};
export const getModelColor = (name) => MODEL_COLORS[name] || MODEL_COLORS.default;
export const formatDate = (isoString) => {
    return new Date(isoString).toLocaleString('tr-TR', {
        month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit'
    });
};

// ── MB / GB / KB formatlayıcı (sayı: MB cinsinden gelir) ──
export const formatMB = (mb) => {
    if (mb == null || mb === 0) return '0 MB';
    if (mb < 1) return `${(mb * 1024).toFixed(1)} KB`;
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
};

// ── Bytes → KB/MB/GB ──
export const formatBytes = (b) => {
    if (!b) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0; let v = b;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
};

// ── Doluluk yüzdesine göre renk ──
export const getQuotaColor = (pct) => {
    if (pct >= 90) return '#ef4444'; // kırmızı
    if (pct >= 70) return '#f59e0b'; // sarı
    if (pct >= 40) return '#3b82f6'; // mavi
    return '#1D9E75';                // yeşil
};

export const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return `${diffSec} sn önce`;
    if (diffMin < 60) return `${diffMin} dk önce`;
    if (diffHour < 24) return `${diffHour} sa önce`;
    if (diffDay < 7) return `${diffDay} gün önce`;
    return formatDate(dateStr);
};

export const truncatedText = (text, maxLength = 60) => {
    if (!text) return '-';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};
