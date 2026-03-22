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

// ─── Mock Log Generator (Sadece Test İçin) ───
const DEMO_MODELS = ['gpt-4', 'gpt-3.5-turbo', 'gemini-1.5-pro', 'claude-3-opus', 'gemma3:4b'];
const DEMO_STATUSES = ['success', 'success', 'success', 'success', 'error'];
const DEMO_SESSIONS = ['sess_123', 'sess_456', 'sess_789'];
const DEMO_PROMPTS = [
    "React'ta useCallback ne işe yarar?",
    "FastAPI'de background tasks nasıl kullanılır?",
    "Bana kısa bir şiir yaz.",
    "SQL injection nedir?"
];
const DEMO_RESPONSES = [
    "useCallback, gereksiz render'ları önlemek için...",
    "FastAPI'de BackgroundTasks sınıfı ile tanımlanır...",
    "Gökler mavi, denizler dingin...",
    "Kötü niyetli SQL komutlarının gönderilmesi açığıdır."
];

export function makeDemoLog() {
    const model = DEMO_MODELS[Math.floor(Math.random() * DEMO_MODELS.length)];
    const status = DEMO_STATUSES[Math.floor(Math.random() * DEMO_STATUSES.length)];
    const prompt = Math.floor(Math.random() * 500) + 50;
    const comp = Math.floor(Math.random() * 300) + 20;
    let rndIndex = Math.floor(Math.random() * DEMO_PROMPTS.length);
    let error_code = status === 'error' ? [400, 429, 500][Math.floor(Math.random() * 3)] : null;

    const rndMac = `00:0C:29:${Math.floor(Math.random() * 255).toString(16).toUpperCase().padStart(2, '0')}:${Math.floor(Math.random() * 255).toString(16).toUpperCase().padStart(2, '0')}:${Math.floor(Math.random() * 255).toString(16).toUpperCase().padStart(2, '0')}`;
    const rndIp = `192.168.1.${Math.floor(Math.random() * 254) + 1}`;

    return {
        provider: model.startsWith('gpt') ? 'openai' : model.startsWith('claude') ? 'anthropic' : 'google',
        model,
        prompt_tokens: prompt,
        completion_tokens: comp,
        duration_ms: Math.floor(Math.random() * 3000) + 200,
        status,
        project_id: 'proje001',
        session_id: DEMO_SESSIONS[Math.floor(Math.random() * DEMO_SESSIONS.length)],
        role: 'assistant',
        error_code,
        request: DEMO_PROMPTS[rndIndex],
        response: status === 'success' ? DEMO_RESPONSES[rndIndex] : "Failed to generate response due to error",
        ip: rndIp,
        mac: rndMac
    };
}

