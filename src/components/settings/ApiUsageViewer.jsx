import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    BarChart, Bar, PieChart, Pie, Cell,
    AreaChart, Area, XAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import {
    Activity, AlertCircle, TrendingUp, DollarSign,
    Zap, Clock, RefreshCw, Trash2, CheckCircle2,
    LayoutDashboard, List, MessageSquare, Key, Search, ShieldCheck
} from 'lucide-react';

const MODEL_COLORS = {
    'gpt-4': '#10b981',
    'gpt-3.5-turbo': '#f59e0b',
    'claude-3-opus': '#ec4899',
    'gemini-1.5-pro': '#3b82f6',
    'gemini-2.0-flash': '#3b82f6',
    'gemma3:4b': '#8b5cf6',
    default: '#64748b',
};

const API_BASE = '/api/monitor';

// ─── Ortak Yardımcı Fonksiyonlar ───
const fmt = (n) => (n ?? 0).toLocaleString('tr-TR');
const fmtMs = (ms) => ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
const fmtCost = (v) => v < 0.01 ? `$${(v * 100).toFixed(4)}¢` : `$${v.toFixed(4)}`;
const getModelColor = (name) => MODEL_COLORS[name] || MODEL_COLORS.default;
const formatDate = (isoString) => {
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

function makeDemoLog() {
    const model = DEMO_MODELS[Math.floor(Math.random() * DEMO_MODELS.length)];
    const status = DEMO_STATUSES[Math.floor(Math.random() * DEMO_STATUSES.length)];
    const prompt = Math.floor(Math.random() * 500) + 50;
    const comp = Math.floor(Math.random() * 300) + 20;
    let rndIndex = Math.floor(Math.random() * DEMO_PROMPTS.length);
    let error_code = status === 'error' ? [400, 429, 500][Math.floor(Math.random() * 3)] : null;

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
        response: status === 'success' ? DEMO_RESPONSES[rndIndex] : "Failed to generate response due to error"
    };
}

/* ════════════════════════════════════════════════════════════════════
   Dışarı Taşınan (Optimize Edilmiş) UI Bileşenleri
═══════════════════════════════════════════════════════════════════ */

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[var(--window-bg)] border border-[var(--window-border)] rounded-xl px-3 py-2 shadow-xl z-50 text-xs backdrop-blur-md">
            <p className="text-[var(--sidebar-text-muted)] font-semibold mb-1">{label}</p>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill || entry.stroke }} />
                    <span className="font-mono text-[var(--workspace-text)] font-medium">
                        {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString('tr-TR', { maximumFractionDigits: 5 }) : entry.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

const StatCard = ({ icon: Icon, label, value, valueColor = 'text-[var(--workspace-text)]', subLabel }) => (
    <div className="bg-[var(--window-bg)] rounded-2xl border border-[var(--window-border)] shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden group hover:shadow-md transition-all">
        <div className="flex items-center gap-2 text-[var(--sidebar-text-muted)] text-sm font-medium">
            <Icon size={15} /><span>{label}</span>
        </div>
        <span className={`text-3xl font-extrabold tracking-tight font-mono ${valueColor}`}>{value}</span>
        {subLabel && <span className="text-xs text-[var(--sidebar-text-muted)]">{subLabel}</span>}
        <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform"><Icon size={80} /></div>
    </div>
);

const TabButton = ({ active, onClick, icon: Icon, label }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${active
            ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent-light)] scale-105'
            : 'text-[var(--sidebar-text-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)]'
            }`}
    >
        <Icon size={16} /> {label}
    </button>
);

/* ════════════════════════════════════════════════════════════════════
   Tab Bileşenleri
═══════════════════════════════════════════════════════════════════ */

// ── Dashboard Tab ──
const DashboardTab = ({ data }) => {
    const d = data || {};
    const axisColor = '#94a3b8';

    if ((d.totalRequests ?? 0) === 0) {
        return (
            <div className="bg-[var(--window-bg)] rounded-2xl border border-dashed border-[var(--window-border)] p-12 flex flex-col items-center justify-center gap-4 text-[var(--sidebar-text-muted)]">
                <Activity size={40} className="text-[var(--window-border)]" />
                <div className="text-center">
                    <p className="font-semibold text-[var(--workspace-text)]">Henüz log kaydı yok</p>
                    <p className="text-xs mt-1">Önce yukarıdan "Demo Log Gönder" butonuna basın.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={TrendingUp} label="Toplam İstek" value={fmt(d.totalRequests)} subLabel="tüm zamanlar" />
                <StatCard icon={DollarSign} label="Tahmini Maliyet" value={fmtCost(d.totalCost ?? 0)} valueColor="text-[var(--accent)]" subLabel="USD" />
                <StatCard icon={Zap} label="Toplam Token" value={fmt(d.totalTokens)} subLabel="prompt + completion" />
                <StatCard icon={Clock} label="Ort. Gecikme" value={d.avgLatency ? `${(d.avgLatency / 1000).toFixed(2)}s` : '—'} subLabel="ortalama yanıt süresi" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* İstek Grafiği */}
                <div className="bg-[var(--window-bg)] rounded-2xl border border-[var(--window-border)] shadow-sm p-5">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-[var(--sidebar-text-muted)]">Toplam İstekler</h3>
                            <p className="text-2xl font-extrabold text-[var(--workspace-text)] mt-0.5 font-mono">{fmt(d.totalRequests)}</p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={d.requests || []} barGap={0}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--window-border)" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 9, fill: axisColor }} axisLine={false} tickLine={false} />
                            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'var(--sidebar-hover)' }} />
                            <Bar dataKey="success" stackId="a" fill="#10b981" radius={[0, 0, 3, 3]} barSize={18} name="Başarılı" />
                            <Bar dataKey="error" stackId="a" fill="#ef4444" radius={[3, 3, 0, 0]} barSize={18} name="Hata" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Hata Dağılımı */}
                <div className="bg-[var(--window-bg)] rounded-2xl border border-[var(--window-border)] shadow-sm p-5">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-[var(--sidebar-text-muted)]">Hata Dağılımı</h3><AlertCircle size={15} className="text-red-500" />
                    </div>
                    {(d.errors?.length ?? 0) === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[180px] text-[var(--sidebar-text-muted)] gap-3">
                            <CheckCircle2 size={32} className="text-emerald-400" /><p className="text-xs font-semibold">Hata yok 🎉</p>
                        </div>
                    ) : (
                        <div className="flex items-center h-[180px]">
                            <div className="flex-1 h-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={d.errors} innerRadius={48} outerRadius={68} paddingAngle={4} dataKey="value" stroke="none">
                                            {(d.errors || []).map((e, i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                        <RechartsTooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-2xl font-extrabold text-[var(--workspace-text)]">{(d.errors || []).reduce((s, e) => s + e.value, 0)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* En Çok Kullanılan Modeller */}
                <div className="bg-[var(--window-bg)] rounded-2xl border border-[var(--window-border)] shadow-sm p-5">
                    <h3 className="text-sm font-bold text-[var(--sidebar-text-muted)] mb-5">En Çok Kullanılan Modeller</h3>
                    {(d.topModels?.length ?? 0) === 0 ? (
                        <div className="flex items-center justify-center h-[150px] text-[var(--sidebar-text-muted)] text-xs">Henüz veri yok</div>
                    ) : (
                        <div className="space-y-4">
                            {(d.topModels || []).map((model, idx) => (
                                <div key={idx}>
                                    <div className="flex justify-between text-xs mb-1.5">
                                        <span className="text-[var(--workspace-text)] font-bold truncate">{model.name}</span>
                                        <span className="text-[var(--sidebar-text-muted)] font-mono">{fmt(model.requests)} req</span>
                                    </div>
                                    <div className="h-2 w-full bg-[var(--sidebar-hover)] rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-1000 shadow-sm" style={{ width: `${model.percent}%`, backgroundColor: getModelColor(model.name) }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Maliyet Grafiği */}
                <div className="bg-[var(--window-bg)] rounded-2xl border border-[var(--window-border)] shadow-sm p-5">
                    <div className="mb-4">
                        <h3 className="text-sm font-bold text-[var(--sidebar-text-muted)]">Tahmini Maliyet</h3>
                        <p className="text-2xl font-extrabold text-[var(--accent)] mt-0.5 font-mono">{fmtCost(d.totalCost ?? 0)}</p>
                    </div>
                    <ResponsiveContainer width="100%" height={150}>
                        <AreaChart data={d.costs || []}>
                            <defs>
                                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--window-border)" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 9, fill: axisColor }} axisLine={false} tickLine={false} />
                            <RechartsTooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="amount" stroke="var(--accent)" fill="url(#costGrad)" strokeWidth={2} name="Maliyet ($)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Model Bazında Maliyet */}
                {d.modelCosts?.length > 0 && (
                    <div className="bg-[var(--window-bg)] rounded-2xl border border-[var(--window-border)] shadow-sm p-5">
                        <h3 className="text-sm font-bold text-[var(--sidebar-text-muted)] mb-5">Model Bazında Maliyet</h3>
                        <div className="grid grid-cols-1 gap-4">
                            {(d.modelCosts || []).map((model, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold p-1.5 rounded-md min-w-[24px] text-center bg-[var(--sidebar-hover)] text-[var(--sidebar-text-muted)]">{idx + 1}</span>
                                    <div className="flex-1">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-[var(--sidebar-text)] font-medium">{model.name}</span>
                                            <span className="text-[var(--workspace-text)] font-mono font-bold">{fmtCost(model.cost)}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-[var(--sidebar-hover)] rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-1000 shadow-sm" style={{ width: `${model.percent}%`, backgroundColor: getModelColor(model.name) }} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Logs Tab ──
const LogsTab = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/logs?limit=50`);
            const data = await res.json();
            setLogs(data.logs || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    // OPTİMİZASYON: Gereksiz filtrelemeyi engellemek için useMemo kullanıldı
    const filtered = useMemo(() => {
        const lowerSearch = search.toLowerCase();
        return logs.filter(l =>
            (l.model || '').toLowerCase().includes(lowerSearch) ||
            (l.request || '').toLowerCase().includes(lowerSearch) ||
            (l.response || '').toLowerCase().includes(lowerSearch)
        );
    }, [logs, search]);

    return (
        <div className="bg-[var(--window-bg)] border border-[var(--window-border)] rounded-xl overflow-hidden shadow-sm flex flex-col">
            <div className="p-4 border-b border-[var(--window-border)] flex justify-between items-center bg-[var(--sidebar-hover)]">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sidebar-text-muted)]" />
                    <input
                        className="pl-9 pr-3 py-1.5 bg-[var(--window-bg)] border border-[var(--window-border)] rounded-lg text-sm w-64 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] text-[var(--workspace-text)]"
                        placeholder="Loglarda ara..."
                        value={search} onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <button onClick={fetchLogs} className="text-[var(--sidebar-text-muted)] hover:text-[var(--workspace-text)]"><RefreshCw size={16} /></button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap text-sm">
                    <thead className="bg-[var(--sidebar-hover)] text-[var(--sidebar-text-muted)] font-semibold text-xs uppercase">
                        <tr>
                            <th className="px-4 py-3 border-b border-[var(--window-border)]">Tarih</th>
                            <th className="px-4 py-3 border-b border-[var(--window-border)]">Durum</th>
                            <th className="px-4 py-3 border-b border-[var(--window-border)]">Model</th>
                            <th className="px-4 py-3 border-b border-[var(--window-border)] max-w-[200px]">Prompt Önizleme</th>
                            <th className="px-4 py-3 border-b border-[var(--window-border)] max-w-[200px]">Yanıt Önizleme</th>
                            <th className="px-4 py-3 border-b border-[var(--window-border)] text-right">Tokens</th>
                            <th className="px-4 py-3 border-b border-[var(--window-border)] text-right">Süre</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--window-border)]">
                        {loading ? <tr><td colSpan={7} className="text-center py-8 text-[var(--sidebar-text-muted)]">Yükleniyor...</td></tr> :
                            filtered.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-[var(--sidebar-text-muted)]">Log bulunamadı</td></tr> :
                                filtered.map(log => (
                                    <tr key={log.id} className="hover:bg-[var(--sidebar-hover)] transition-colors">
                                        <td className="px-4 py-3 font-mono text-xs text-[var(--sidebar-text-muted)]">{formatDate(log.timestamp)}</td>
                                        <td className="px-4 py-3">
                                            {log.status === 'success'
                                                ? <span className="bg-emerald-500/10 text-emerald-500 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-500/20">BAŞARILI</span>
                                                : <span className="bg-red-500/10 text-red-500 font-bold px-2 py-0.5 rounded text-[10px] border border-red-500/20">{log.error || 'HATA'}</span>}
                                        </td>
                                        <td className="px-4 py-3 text-[var(--accent)] font-medium text-xs">{log.model}</td>
                                        <td className="px-4 py-3 max-w-[200px] truncate text-[var(--sidebar-text-muted)]" title={log.request}>{log.request || '-'}</td>
                                        <td className="px-4 py-3 max-w-[200px] truncate text-[var(--sidebar-text-muted)]" title={log.response}>{log.response || '-'}</td>
                                        <td className="px-4 py-3 text-right font-mono text-xs text-[var(--workspace-text)]">{log.totalTokens} <span className="text-[10px] text-[var(--sidebar-text-muted)]">tk</span></td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`font-mono text-xs px-2 py-0.5 rounded ${log.duration > 2000 ? 'bg-amber-500/10 text-amber-500' : 'bg-[var(--sidebar-hover)] text-[var(--sidebar-text-muted)]'}`}>
                                                {fmtMs(log.duration)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ── Sessions Tab ──
const SessionsTab = () => {
    const [sessions, setSessions] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchSessions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/sessions?limit=20`);
            const data = await res.json();
            setSessions(data.sessions || []);
            if (data.sessions && data.sessions.length > 0 && !selectedId) {
                setSelectedId(data.sessions[0].sessionId);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [selectedId]);

    useEffect(() => { fetchSessions(); }, [fetchSessions]);

    const delSession = async (e, id) => {
        e.stopPropagation();
        await fetch(`${API_BASE}/sessions/${id}`, { method: 'DELETE' });
        if (selectedId === id) setSelectedId(null);
        fetchSessions();
    };

    // OPTİMİZASYON: Gereksiz döngüyü önlemek için useMemo kullanıldı
    const selected = useMemo(() => sessions.find(s => s.sessionId === selectedId), [sessions, selectedId]);

    return (
        <div className="flex h-[600px] bg-[var(--window-bg)] border border-[var(--window-border)] rounded-xl overflow-hidden shadow-sm">
            {/* Sol Liste */}
            <div className="w-1/3 border-r border-[var(--window-border)] flex flex-col bg-[var(--sidebar-hover)]">
                <div className="p-4 border-b border-[var(--window-border)] font-bold text-[var(--workspace-text)] flex justify-between">
                    Oturumlar
                    <button onClick={fetchSessions} className="text-[var(--sidebar-text-muted)] hover:text-[var(--workspace-text)]"><RefreshCw size={14} /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-2 mac-horizontal-scrollbar">
                    {loading ? <div className="text-center py-8 text-[var(--sidebar-text-muted)] text-sm">Yükleniyor...</div> :
                        sessions.length === 0 ? <div className="text-center py-8 text-[var(--sidebar-text-muted)] text-sm">Oturum yok</div> :
                            sessions.map(s => (
                                <div key={s.sessionId} onClick={() => setSelectedId(s.sessionId)}
                                    className={`p-3 rounded-lg border cursor-pointer relative group transition-all ${selectedId === s.sessionId
                                        ? 'bg-[var(--accent-light)] border-[var(--accent)]'
                                        : 'bg-[var(--window-bg)] border-[var(--window-border)] hover:border-[var(--accent)] hover:shadow-md'}`}>
                                    <button onClick={e => delSession(e, s.sessionId)} className="absolute top-2 right-2 p-1 text-[var(--sidebar-text-muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`w-2 h-2 rounded-full ${selectedId === s.sessionId ? 'bg-[var(--accent)]' : 'bg-emerald-500'}`}></span>
                                        <span className={`font-mono text-xs font-bold truncate ${selectedId === s.sessionId ? 'text-[var(--accent)]' : 'text-[var(--workspace-text)]'}`}>{s.sessionId}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-[var(--sidebar-text-muted)]">
                                        <span>{s.messageCount} msg • {s.model}</span>
                                        <span className="font-bold">{fmtCost(s.totalCost)}</span>
                                    </div>
                                </div>
                            ))}
                </div>
            </div>

            {/* Sağ Detay */}
            <div className="flex-1 flex flex-col bg-[var(--window-bg)]">
                {selected ? (
                    <>
                        <div className="p-4 border-b border-[var(--window-border)] bg-[var(--sidebar-hover)] flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-[var(--workspace-text)] font-mono">{selected.sessionId}</h3>
                                <p className="text-xs text-[var(--sidebar-text-muted)]">{formatDate(selected.startTime)}</p>
                            </div>
                            <div className="flex gap-4 text-xs font-mono text-[var(--sidebar-text-muted)] text-right">
                                <div><span className="block text-[9px] uppercase font-bold text-[var(--sidebar-text-muted)] opacity-70">Tokens</span><span className="text-[var(--workspace-text)]">{selected.totalTokens}</span></div>
                                <div><span className="block text-[9px] uppercase font-bold text-[var(--sidebar-text-muted)] opacity-70">Cost</span><span className="text-[var(--accent)] font-bold">{fmtCost(selected.totalCost)}</span></div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 mac-horizontal-scrollbar">
                            {selected.messages.map(msg => (
                                <div key={msg.id} className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                                    <span className="text-[10px] uppercase font-bold text-[var(--sidebar-text-muted)] mb-1 opacity-70">{msg.role}</span>
                                    <div className={`p-3 rounded-xl text-sm border transition-all ${msg.role === 'user'
                                        ? 'bg-[var(--accent)] text-white border-[var(--accent)] rounded-tr-none shadow-md'
                                        : 'bg-[var(--sidebar-hover)] text-[var(--workspace-text)] border-[var(--window-border)] rounded-tl-none'}`}>
                                        {msg.content}
                                    </div>
                                    {msg.role !== 'user' && (
                                        <div className="flex gap-2 mt-1 text-[9px] text-[var(--sidebar-text-muted)] font-mono">
                                            <span>{fmtMs(msg.duration)}</span> • <span>{msg.totalTokens ?? (msg.completionTokens + msg.promptTokens)} tk</span> • <span>${msg.cost.toFixed(5)}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-[var(--sidebar-text-muted)] text-sm italic">Sol taraftan bir oturum seçin</div>
                )}
            </div>
        </div>
    );
};

// ── API Keys Tab ──
const ApiKeysTab = () => {
    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchKeys = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/keys`);
            const data = await res.json();
            setKeys(data.keys || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchKeys(); }, [fetchKeys]);

    const addKey = async () => {
        await fetch(`${API_BASE}/keys`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Yeni Key ' + Math.floor(Math.random() * 100), limit: 100 })
        });
        fetchKeys();
    };

    const delKey = async (id) => {
        await fetch(`${API_BASE}/keys/${id}`, { method: 'DELETE' });
        fetchKeys();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-[var(--accent-light)] border border-[var(--accent)] rounded-2xl p-6 shadow-sm overflow-hidden relative">
                <div className="flex gap-4 items-start relative z-10">
                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl border border-white/30 text-[var(--workspace-text)]">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <span className="font-extrabold text-lg block text-[var(--workspace-text)] mb-1">Hafıza & Güvenlik</span>
                        <p className="text-sm text-[var(--sidebar-text-muted)] max-w-xl leading-relaxed">
                            Gerçek API anahtarlarınızı çevre değişkenlerinde güvenle saklayın. Bu panel, sistem tarafından tahsis edilen kullanım kotalarını ve güvenlik durumlarını izlemenizi sağlar.
                        </p>
                    </div>
                </div>
                <button onClick={addKey} className="relative z-10 px-6 py-3 bg-[var(--accent)] text-white text-sm font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all active:scale-95 shadow-md">
                    <Key size={16} className="inline-block mr-2" /> Yeni Key Oluştur
                </button>
                <ShieldCheck size={120} className="absolute -right-10 -bottom-10 opacity-5 text-white pointer-events-none" />
            </div>

            <div className="grid gap-4">
                {loading ? <div className="text-[var(--sidebar-text-muted)] text-center py-12">Yükleniyor...</div> : keys.map(k => (
                    <div key={k.id} className="bg-[var(--window-bg)] border border-[var(--window-border)] rounded-2xl p-6 shadow-sm flex items-center justify-between hover:shadow-md hover:border-[var(--accent)] transition-all group">
                        <div className="flex gap-5 items-center">
                            <div className="w-12 h-12 rounded-xl bg-[var(--sidebar-hover)] flex items-center justify-center text-[var(--accent)] group-hover:scale-110 transition-transform shadow-inner"><Key size={22} /></div>
                            <div>
                                <h3 className="font-bold text-[var(--workspace-text)] text-lg flex items-center gap-2">
                                    {k.name}
                                    <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-full uppercase font-black border border-emerald-500/20">{k.status}</span>
                                </h3>
                                <p className="font-mono text-xs text-[var(--sidebar-text-muted)] mt-1.5 bg-[var(--sidebar-hover)] inline-block px-2 py-1 rounded border border-[var(--window-border)]">{k.preview}</p>
                            </div>
                        </div>
                        <div className="w-72">
                            <div className="flex justify-between text-xs mb-2 font-bold uppercase tracking-wider">
                                <span className="text-[var(--sidebar-text-muted)]">Aylık Kota Kullanımı</span>
                                <span className="text-[var(--workspace-text)]">${k.usage.current.toFixed(2)} / ${k.usage.limit.toFixed(2)}</span>
                            </div>
                            <div className="h-2.5 w-full bg-[var(--sidebar-hover)] rounded-full overflow-hidden shadow-inner p-0.5">
                                <div className={`h-full rounded-full transition-all duration-1000 shadow-sm ${(k.usage.current / k.usage.limit) > 0.8 ? 'bg-red-500' : 'bg-[var(--accent)]'}`} style={{ width: `${(k.usage.current / k.usage.limit) * 100}%` }}></div>
                            </div>
                        </div>
                        <button onClick={() => delKey(k.id)} className="p-3 text-[var(--sidebar-text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={20} /></button>
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ════════════════════════════════════════════════════════════════════
   Ana Bileşen (Tabs wrapper)
═══════════════════════════════════════════════════════════════════ */
export default function ApiUsageViewer() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [data, setData] = useState(null);
    const [isSending, setIsSending] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/dashboard`);
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.warn('Dashboard fetch fail', err);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'dashboard') fetchData();
    }, [activeTab, fetchData]);

    const sendDemoLog = async () => {
        setIsSending(true);
        try {
            await fetch(`${API_BASE}/logs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(makeDemoLog()),
            });
            if (activeTab === 'dashboard') fetchData();
        } finally {
            setIsSending(false);
        }
    };

    const clearLogs = async () => {
        await fetch(`${API_BASE}/logs`, { method: 'DELETE' });
        if (activeTab === 'dashboard') fetchData();
    };

    return (
        <div className="w-full h-full overflow-y-auto bg-[var(--window-bg)] font-sans text-[var(--workspace-text)] mac-horizontal-scrollbar">
            <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* ═══ HEADER & TABS ═══════════════════════════════════════════ */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[var(--window-border)] pb-6">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-[var(--workspace-text)] flex items-center gap-3">
                            <Activity className="text-[var(--accent)]" size={32} /> API Kullanım Paneli
                        </h1>
                        <p className="text-[var(--sidebar-text-muted)] text-sm mt-1 font-medium italic opacity-80">Gerçek zamanlı model tüketim ve maliyet istatistikleri</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={sendDemoLog} disabled={isSending} className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-[var(--accent-light)] disabled:opacity-50 active:scale-95">
                            <Zap size={15} /> DEMO LOG ÜRET
                        </button>
                        <button onClick={clearLogs} className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white text-xs font-black rounded-xl transition-all shadow-sm active:scale-95">
                            <Trash2 size={15} /> TEMİZLE
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 sticky top-0 z-20 bg-[var(--window-bg)] py-2 border-b border-[var(--window-border)]/50 backdrop-blur-md">
                    <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={LayoutDashboard} label="Genel Özet" />
                    <TabButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={List} label="Detaylı Loglar" />
                    <TabButton active={activeTab === 'sessions'} onClick={() => setActiveTab('sessions')} icon={MessageSquare} label="Aktif Oturumlar" />
                    <TabButton active={activeTab === 'keys'} onClick={() => setActiveTab('keys')} icon={Key} label="API Kimlikleri" />
                </div>

                {/* ═══ TAB CONTENT ═══════════════════════════════════════════ */}
                <div className="transform transition-all duration-300">
                    {activeTab === 'dashboard' && <DashboardTab data={data} />}
                    {activeTab === 'logs' && <LogsTab />}
                    {activeTab === 'sessions' && <SessionsTab />}
                    {activeTab === 'keys' && <ApiKeysTab />}
                </div>

                <div className="h-12" />
            </div>
        </div>
    );
}