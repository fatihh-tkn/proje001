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

