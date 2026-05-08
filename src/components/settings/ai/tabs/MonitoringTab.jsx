import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Activity, TrendingUp, Users, Zap, DollarSign, Clock,
    RefreshCw, Trophy, PieChart, X, Box,
} from 'lucide-react';
import { API_BASE, fetchWithTimeout, fmt, fmtMs, getModelColor, formatDate } from '../utils';
import { LogDetailPanel } from '../components/LogDetailPanel';

/* ── Sparkline ─────────────────────────────────────────────────────── */
function Sparkline({ data = [], color = '#b91d2c', width = 120, height = 32, fill = true, strokeWidth = 1.5 }) {
    if (!data.length) return null;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => [
        (i / (data.length - 1 || 1)) * width,
        height - ((v - min) / range) * (height - 4) - 2,
    ]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const area = d + ` L ${width},${height} L 0,${height} Z`;
    return (
        <svg width={width} height={height} className="block">
            {fill && <path d={area} fill={color} fillOpacity="0.10" />}
            <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
}

/* ── Donut ─────────────────────────────────────────────────────────── */
function Donut({ segments = [], size = 110, thickness = 14, label }) {
    const total = segments.reduce((s, x) => s + (x.value || 0), 0) || 1;
    const r = (size - thickness) / 2;
    const cx = size / 2, cy = size / 2;
    let acc = 0;
    return (
        <svg width={size} height={size} className="block shrink-0">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth={thickness} />
            {segments.map((s, i) => {
                const frac = (s.value || 0) / total;
                if (frac < 0.001) { acc += s.value || 0; return null; }
                const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
                const end = ((acc + s.value) / total) * Math.PI * 2 - Math.PI / 2;
                acc += s.value;
                const x1 = cx + Math.cos(start) * r, y1 = cy + Math.sin(start) * r;
                const x2 = cx + Math.cos(end) * r, y2 = cy + Math.sin(end) * r;
                const big = end - start > Math.PI ? 1 : 0;
                return (
                    <path key={i}
                        d={`M ${x1} ${y1} A ${r} ${r} 0 ${big} 1 ${x2} ${y2}`}
                        stroke={s.color} strokeWidth={thickness} fill="none" strokeLinecap="butt" />
                );
            })}
            {label && (
                <g>
                    <text x={cx} y={cy - 4} textAnchor="middle" fontSize="18" fill="#0f172a" fontWeight="600" fontFamily="ui-monospace,monospace">{label.value}</text>
                    <text x={cx} y={cy + 12} textAnchor="middle" fontSize="8" fill="#64748b" letterSpacing="2">{label.title}</text>
                </g>
            )}
        </svg>
    );
}

/* ── Dual-Axis SVG Chart ───────────────────────────────────────────── */
function TrendChart({ costs = [], reqs = [] }) {
    if (!costs.length && !reqs.length) return (
        <div className="w-full h-[160px] flex items-center justify-center text-[10px] text-slate-400">Trend verisi yok</div>
    );
    const W = 760, H = 160, P = 20;
    const maxC = Math.max(...costs.map(c => c.amount || 0), 0.001);
    const maxR = Math.max(...reqs.map(r => (r.success || 0) + (r.error || 0)), 1);
    const px = (i, n) => P + (i / ((n - 1) || 1)) * (W - P * 2);
    const yC = v => H - P - (v / maxC) * (H - P * 2);
    const yR = v => H - P - (v / maxR) * (H - P * 2);
    const lineC = costs.map((c, i) => (i ? 'L' : 'M') + px(i, costs.length).toFixed(1) + ',' + yC(c.amount || 0).toFixed(1)).join(' ');
    const lineR = reqs.map((r, i) => (i ? 'L' : 'M') + px(i, reqs.length).toFixed(1) + ',' + yR((r.success || 0) + (r.error || 0)).toFixed(1)).join(' ');
    const areaC = lineC + ` L ${px(costs.length - 1, costs.length)},${H - P} L ${P},${H - P} Z`;
    const areaR = lineR + ` L ${px(reqs.length - 1, reqs.length)},${H - P} L ${P},${H - P} Z`;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[160px]">
            {[0, 1, 2, 3].map(i => (
                <line key={i} x1={P} x2={W - P}
                    y1={P + i * ((H - P * 2) / 3)} y2={P + i * ((H - P * 2) / 3)}
                    stroke="rgba(0,0,0,0.05)" strokeDasharray="2 3" />
            ))}
            <path d={areaR} fill="#94a3b8" fillOpacity="0.08" />
            <path d={lineR} fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
            <path d={areaC} fill="#b91d2c" fillOpacity="0.10" />
            <path d={lineC} fill="none" stroke="#b91d2c" strokeWidth="2" />
            {costs.map((c, i) => i % Math.ceil(costs.length / 8) === 0 && (
                <text key={i} x={px(i, costs.length)} y={H - 4} textAnchor="middle" fontSize="8" fill="#94a3b8">{c.date}</text>
            ))}
        </svg>
    );
}

/* ── KPI Card ──────────────────────────────────────────────────────── */
function KpiCard({ label, value, sub, icon: Icon, color, series }) {
    return (
        <div className="bg-white border border-slate-200 p-4 flex flex-col">
            <div className="flex items-start justify-between mb-3">
                <div className="w-7 h-7 flex items-center justify-center shrink-0"
                    style={{ background: color + '18', color }}>
                    <Icon size={13} />
                </div>
            </div>
            <div className="text-[8px] uppercase text-slate-500 mb-1" style={{ letterSpacing: '0.18em' }}>{label}</div>
            <div className="text-[22px] font-semibold text-slate-800 font-mono leading-none">{value}</div>
            {sub && <div className="text-[10px] text-slate-400 font-mono mt-0.5">{sub}</div>}
            {series.length > 1 && (
                <div className="mt-2 -mx-1">
                    <Sparkline data={series} color={color} width={180} height={28} />
                </div>
            )}
        </div>
    );
}

/* ── StatBox ───────────────────────────────────────────────────────── */
function StatBox({ label, value, color }) {
    return (
        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
            <div className="text-[9px] font-bold uppercase text-slate-400 mb-1.5" style={{ letterSpacing: '0.15em' }}>{label}</div>
            <div className="text-[18px] font-bold font-mono" style={{ color }}>{value}</div>
        </div>
    );
}

/* ── UserDetailPanel ───────────────────────────────────────────────── */
function UserDetailPanel({ user, onClose }) {
    if (!user) return null;
    const initials = (user.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    const successRate = user.total_requests > 0
        ? Math.round(((user.total_requests - (user.error_count || 0)) / user.total_requests) * 100)
        : 100;
    const tokDisplay = (user.total_tokens || 0) >= 1_000_000
        ? `${((user.total_tokens) / 1_000_000).toFixed(1)}M`
        : (user.total_tokens || 0) >= 1000 ? `${Math.round(user.total_tokens / 1000)}K`
        : fmt(user.total_tokens || 0);

    return (
        <>
            <div className="fixed inset-0 bg-slate-900/20 z-40 animate-in fade-in duration-200" onClick={onClose} />
            <div className="fixed inset-y-0 right-0 w-[460px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50 animate-in slide-in-from-right duration-300 font-sans">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#b91d2c]/10 border border-[#b91d2c]/20 flex items-center justify-center text-[13px] font-bold text-[#b91d2c] shrink-0">
                            {initials}
                        </div>
                        <div>
                            <h3 className="text-[14px] font-bold text-slate-800">{user.name || 'Bilinmeyen'}</h3>
                            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">{user.email || '—'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    <div className="flex flex-wrap gap-2">
                        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded border ${user.status === 'Aktif' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            {user.status || '—'}
                        </span>
                        <span className="px-2 py-1 text-[10px] font-bold uppercase rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {user.role || '—'}
                        </span>
                        {user.department && (
                            <span className="px-2 py-1 text-[10px] font-bold uppercase rounded bg-blue-50 text-blue-700 border border-blue-200">
                                {user.department}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <StatBox label="Toplam İstek" value={fmt(user.total_requests || 0)} color="#b91d2c" />
                        <StatBox label="Toplam Token" value={tokDisplay} color="#a855f7" />
                        <StatBox label="Toplam Maliyet" value={`$${(user.total_cost || 0).toFixed(4)}`} color="#f59e0b" />
                        <StatBox label="Hata Sayısı" value={user.error_count || 0} color={(user.error_count || 0) > 0 ? '#ef4444' : '#10b981'} />
                        <StatBox label="Başarı Oranı" value={`%${successRate}`} color="#10b981" />
                        <StatBox label="Ort. Yanıt" value={fmtMs(user.avg_duration_ms || 0)} color="#0ea5e9" />
                    </div>

                    {(user.models_used || []).length > 0 && (
                        <div>
                            <div className="text-[10px] font-bold uppercase text-slate-500 mb-2" style={{ letterSpacing: '0.15em' }}>Kullanılan Modeller</div>
                            <div className="flex flex-wrap gap-1.5">
                                {(user.models_used).map((m, i) => (
                                    <span key={i}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold border rounded"
                                        style={{ color: getModelColor(m), borderColor: `${getModelColor(m)}40`, backgroundColor: `${getModelColor(m)}10` }}
                                    >
                                        <Box size={9} />{m}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        {user.first_at && (
                            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                                <div className="text-[9px] font-bold uppercase text-slate-400 mb-1" style={{ letterSpacing: '0.15em' }}>İlk Aktivite</div>
                                <div className="text-[11px] font-mono text-slate-700">{formatDate(user.first_at)}</div>
                            </div>
                        )}
                        {user.last_at && (
                            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                                <div className="text-[9px] font-bold uppercase text-slate-400 mb-1" style={{ letterSpacing: '0.15em' }}>Son Aktivite</div>
                                <div className="text-[11px] font-mono text-slate-700">{formatDate(user.last_at)}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

/* ── MonitoringTab ─────────────────────────────────────────────────── */
export const MonitoringTab = React.memo(() => {
    const [dash, setDash] = useState(null);
    const [users, setUsers] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const timerRef = useRef(null);

    const fetchAll = useCallback(async () => {
        try {
            const [dashRes, usersRes, logsRes] = await Promise.allSettled([
                fetchWithTimeout(`${API_BASE}/dashboard`, {}, 10000),
                fetchWithTimeout(`${API_BASE}/user-usage`, {}, 10000),
                fetchWithTimeout(`${API_BASE}/logs?limit=15`, {}, 10000),
            ]);
            if (dashRes.status === 'fulfilled') {
                const data = await dashRes.value.json();
                setDash(data);
            }
            if (usersRes.status === 'fulfilled') {
                const data = await usersRes.value.json();
                setUsers((data.users || []).sort((a, b) => (b.total_requests || 0) - (a.total_requests || 0)).slice(0, 7));
            }
            if (logsRes.status === 'fulfilled') {
                const data = await logsRes.value.json();
                setLogs((data.logs || []).slice(0, 12));
            }
        } catch (e) {
            console.error('[MonitoringTab] fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
        timerRef.current = setInterval(fetchAll, 30_000);
        return () => clearInterval(timerRef.current);
    }, [fetchAll]);

    if (loading) return (
        <div className="w-full h-full flex items-center justify-center gap-3 bg-[#f4f5f7]">
            <RefreshCw size={18} className="animate-spin text-slate-400" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Yükleniyor...</span>
        </div>
    );

    const d = dash || {};
    const costs = Array.isArray(d.costs) ? d.costs : [];
    const reqs = Array.isArray(d.requests) ? d.requests : [];
    const modelCosts = Array.isArray(d.modelCosts) ? d.modelCosts : [];
    const costSeries = costs.map(c => c.amount || 0);
    const reqSeries = reqs.map(r => (r.success || 0) + (r.error || 0));
    const latSeries = Array.isArray(d.latencyTrend) ? d.latencyTrend.map(l => l.value || 0) : [];

    const totalTok = d.totalTokens || 0;
    const tokDisplay = totalTok >= 1_000_000
        ? `${(totalTok / 1_000_000).toFixed(1)}M`
        : totalTok >= 1000 ? `${Math.round(totalTok / 1000)}K` : fmt(totalTok);

    const kpis = [
        { label: 'Toplam İstek', value: fmt(d.totalRequests || 0), icon: TrendingUp, color: '#b91d2c', series: reqSeries },
        { label: 'Aktif Kullanıcı', value: fmt(users.length), icon: Users, color: '#0ea5e9', series: reqSeries.map(v => v * 0.04) },
        { label: 'Token Tüketimi', value: tokDisplay, icon: Zap, color: '#a855f7', series: reqSeries.map(v => v * 42) },
        { label: 'Toplam Maliyet', value: `$${(d.totalCost || 0).toFixed(2)}`, icon: DollarSign, color: '#f59e0b', series: costSeries },
        { label: 'Ort. Yanıt Süresi', value: fmtMs(d.avgLatency || 0), icon: Clock, color: '#10b981', series: latSeries },
    ];

    return (
        <>
        <div className="w-full h-full bg-[#f4f5f7] flex flex-col overflow-hidden" style={{ fontSize: 12 }}>
            {/* ── Header ──────────────────────────────────────────── */}
            <header className="h-10 bg-white border-b border-slate-200 flex items-center px-5 gap-4 shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 bg-[#b91d2c] flex items-center justify-center shrink-0">
                        <Activity size={13} className="text-white" />
                    </div>
                    <div className="leading-tight">
                        <div className="text-[12px] font-semibold text-slate-800">Komuta Merkezi</div>
                        <div className="text-[9px] text-slate-500 uppercase" style={{ letterSpacing: '0.18em' }}>Yapay Zeka · Kullanım &amp; Maliyet</div>
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        CANLI · her 30sn
                    </div>
                    <button
                        onClick={() => { setLoading(false); fetchAll(); }}
                        className="h-7 px-3 border border-slate-200 text-[10px] tracking-wider uppercase font-medium text-slate-600 flex items-center gap-1.5 hover:bg-slate-50 transition-colors"
                    >
                        <RefreshCw size={11} /> Yenile
                    </button>
                </div>
            </header>

            {/* ── Content ─────────────────────────────────────────── */}
            <div className="flex-1 p-4 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>

                {/* Row 1 — KPI Cards */}
                <div className="grid grid-cols-5 gap-3 mb-3">
                    {kpis.map((k, i) => <KpiCard key={i} {...k} />)}
                </div>

                {/* Row 2 — Trend + Donut */}
                <div className="grid grid-cols-12 gap-3 mb-3">
                    <div className="col-span-8 bg-white border border-slate-200">
                        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200">
                            <span className="text-[10px] uppercase font-medium text-slate-700" style={{ letterSpacing: '0.18em' }}>Maliyet ve Trafik Trendi</span>
                            <span className="text-[9px] text-slate-400 font-mono">son {costs.length} gün</span>
                        </div>
                        <div className="p-4">
                            <TrendChart costs={costs} reqs={reqs} />
                            <div className="flex items-center gap-5 mt-2 text-[9px] uppercase text-slate-500" style={{ letterSpacing: '0.18em' }}>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#b91d2c] inline-block" /> Maliyet (USD)</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-slate-400 inline-block border-t border-dashed border-slate-400" /> İstek Sayısı</span>
                            </div>
                        </div>
                    </div>

                    <div className="col-span-4 bg-white border border-slate-200">
                        <div className="flex items-center px-4 py-2 border-b border-slate-200 gap-2">
                            <PieChart size={11} className="text-amber-500" />
                            <span className="text-[10px] uppercase font-medium text-slate-700" style={{ letterSpacing: '0.18em' }}>Model Maliyet Payı</span>
                        </div>
                        <div className="p-4 flex items-center gap-4">
                            {modelCosts.length > 0 ? (
                                <>
                                    <Donut size={110} thickness={14}
                                        segments={modelCosts.map(m => ({ color: m.color || getModelColor(m.name), value: m.cost || 0 }))}
                                        label={{ value: `$${(d.totalCost || 0).toFixed(0)}`, title: 'TOPLAM' }}
                                    />
                                    <div className="flex-1 space-y-1.5 min-w-0">
                                        {modelCosts.map((m, i) => (
                                            <div key={i} className="flex items-center gap-2 text-[10px]">
                                                <span className="w-1.5 h-1.5 shrink-0 rounded-sm" style={{ background: m.color || getModelColor(m.name) }} />
                                                <span className="font-mono text-slate-700 flex-1 truncate text-[9px]">{m.name}</span>
                                                <span className="font-mono text-slate-500 shrink-0">${(m.cost || 0).toFixed(2)}</span>
                                                <span className="font-mono text-slate-400 w-7 text-right shrink-0">%{m.percent}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="w-full text-center text-[10px] text-slate-400 py-6">Maliyet verisi henüz yok</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Row 3 — Top Users + Live Feed */}
                <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-7 bg-white border border-slate-200">
                        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                                <Trophy size={11} className="text-[#b91d2c]" />
                                <span className="text-[10px] uppercase font-medium text-slate-700" style={{ letterSpacing: '0.18em' }}>En Yoğun Kullanıcılar</span>
                            </div>
                        </div>
                        {users.length === 0 ? (
                            <div className="text-center text-[10px] text-slate-400 py-10">Kullanıcı verisi henüz yok</div>
                        ) : (
                            <table className="w-full text-[10px]">
                                <thead>
                                    <tr className="text-slate-500 uppercase text-[8px] border-b border-slate-100" style={{ letterSpacing: '0.15em' }}>
                                        <th className="font-medium text-left px-4 py-2 w-6">#</th>
                                        <th className="font-medium text-left py-2">Kullanıcı</th>
                                        <th className="font-medium text-right py-2 pr-2">İstek</th>
                                        <th className="font-medium text-left pl-3 py-2">Trend</th>
                                        <th className="font-medium text-right py-2">Maliyet</th>
                                        <th className="font-medium text-right pr-4 py-2">Hata</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u, i) => (
                                        <tr key={u.user_id || i} onClick={() => setSelectedUser(u)} className="border-b border-slate-100 hover:bg-slate-50/60 cursor-pointer">
                                            <td className="px-4 py-2 font-mono text-slate-400">{String(i + 1).padStart(2, '0')}</td>
                                            <td className="py-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] font-semibold text-slate-600 shrink-0">
                                                        {(u.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="leading-tight min-w-0">
                                                        <div className="text-slate-800 font-medium truncate">{u.name || 'Bilinmeyen'}</div>
                                                        <div className="text-[8px] uppercase text-slate-400 truncate" style={{ letterSpacing: '0.08em' }}>{u.department || u.role || '—'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="text-right font-mono text-slate-800 font-medium py-2 pr-2">{fmt(u.total_requests || 0)}</td>
                                            <td className="pl-3 py-2">
                                                <Sparkline
                                                    data={reqSeries.length > 1 ? reqSeries.map(v => v * ((u.total_requests || 1) / (users[0]?.total_requests || 1))) : [0, u.total_requests || 0]}
                                                    color={i === 0 ? '#b91d2c' : '#94a3b8'}
                                                    width={100} height={18} fill={false} strokeWidth={1.2}
                                                />
                                            </td>
                                            <td className="text-right font-mono text-slate-700 py-2">${(u.total_cost || 0).toFixed(2)}</td>
                                            <td className="text-right pr-4 font-mono py-2">
                                                {(u.error_count || 0) === 0
                                                    ? <span className="text-emerald-500">0</span>
                                                    : <span className="text-red-500">{u.error_count}</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="col-span-5 bg-white border border-slate-200 flex flex-col" style={{ minHeight: 200 }}>
                        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                <span className="text-[10px] uppercase font-medium text-slate-700" style={{ letterSpacing: '0.18em' }}>Canlı API Akışı</span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono">son {logs.length} istek</span>
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100" style={{ scrollbarWidth: 'thin' }}>
                            {logs.length === 0 ? (
                                <div className="text-center text-[10px] text-slate-400 py-10">Henüz log yok</div>
                            ) : logs.map((log, i) => {
                                const modelColor = getModelColor(log.model || '');
                                const isOk = log.status === 'success';
                                const shortModel = (log.model || '').replace('claude-', 'c-').replace('gemini-', 'gem-').replace('gpt-', '').toUpperCase().slice(0, 8);
                                const ts = log.timestamp ? new Date(log.timestamp).toTimeString().slice(0, 8) : '-';
                                const preview = (log.request || '').slice(0, 40) + ((log.request || '').length > 40 ? '…' : '');
                                return (
                                    <div key={log.id || i} onClick={() => setSelectedLog(log)} className="px-4 py-2 hover:bg-slate-50/60 grid items-center gap-3 cursor-pointer" style={{ gridTemplateColumns: '52px 1fr auto' }}>
                                        <div className="font-mono text-[9px] text-slate-400">{ts}</div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                {isOk
                                                    ? <span className="text-[8px] uppercase px-1 py-px bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">OK</span>
                                                    : <span className="text-[8px] uppercase px-1 py-px bg-red-50 text-red-600 border border-red-100 shrink-0">{log.error || 'ERR'}</span>}
                                                <span className="font-mono text-[9px] text-slate-700 truncate">{preview || '—'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[9px] text-slate-500">
                                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: modelColor }} />
                                                <span className="font-mono shrink-0">{shortModel}</span>
                                                <span className="font-mono text-slate-400">{fmt(log.totalTokens || 0)}tk</span>
                                                <span className="font-mono text-slate-400">{fmtMs(log.duration || 0)}</span>
                                            </div>
                                        </div>
                                        <div className="text-right font-mono text-[10px] text-slate-700 shrink-0">${(log.cost || 0).toFixed(3)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {selectedLog && (
            <>
                <div className="fixed inset-0 bg-slate-900/20 z-40 animate-in fade-in duration-200" onClick={() => setSelectedLog(null)} />
                <LogDetailPanel log={selectedLog} onClose={() => setSelectedLog(null)} />
            </>
        )}
        {selectedUser && <UserDetailPanel user={selectedUser} onClose={() => setSelectedUser(null)} />}
        </>
    );
});
