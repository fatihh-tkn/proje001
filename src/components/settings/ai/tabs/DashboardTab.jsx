import React from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Activity, AlertCircle, TrendingUp, DollarSign, Zap, Clock, CheckCircle2, MoreHorizontal } from 'lucide-react';
import { CustomTooltip } from '../components/CustomTooltip';
import { StatCard } from '../components/StatCard';
import { fmt, fmtMs, fmtCost, getModelColor, MODEL_COLORS } from '../utils';

/* ─── Mini badge component for Dashboard ─────────────────────────── */
function Badge({ children, color = 'default' }) {
    const colors = {
        success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        error: 'bg-red-500/10 text-red-500 border-red-500/20',
        warn: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        default: 'bg-[var(--sidebar-hover)] text-[var(--workspace-text)] border-[var(--window-border)]',
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-medium uppercase tracking-widest border ${colors[color]}`}>
            {children}
        </span>
    );
}

export const DashboardTab = React.memo(({ data }) => {
    const d = data || {};
    const axisColor = '#94a3b8';

    if ((d.totalRequests ?? 0) === 0) {
        return (
            <div className="bg-[var(--sidebar-hover)] rounded-sm ring-1 ring-black/[0.04] p-20 flex flex-col items-center justify-center gap-5 text-[var(--sidebar-text-muted)] animate-in fade-in duration-300">
                <div className="p-5 bg-[var(--window-bg)] rounded-full text-[var(--accent)] border border-[var(--window-border)] shadow-sm">
                    <Activity size={40} strokeWidth={2} />
                </div>
                <div className="text-center space-y-2">
                    <p className="text-lg font-medium text-[var(--workspace-text)] tracking-tight">Henüz Veri Toplanmadı</p>
                    <p className="text-[11px] max-w-sm opacity-80 leading-relaxed mx-auto">Sistem kullanılmaya başlandığında (istek yapıldığında veya token harcandığında) gerçek zamanlı analizler burada belirecektir.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 w-full h-full overflow-y-auto bg-white px-0 py-6 animate-in fade-in duration-300 mac-horizontal-scrollbar">
            {/* ── ÜST SATIR: İstatistik Kartları ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={TrendingUp} label="Toplam İstek" value={fmt(d.totalRequests)} subLabel="Toplam API Çağrısı" />
                <StatCard icon={Zap} label="Token Tüketimi" value={fmt(d.totalTokens)} subLabel="Giriş ve Çıkış Toplamı" />
                <StatCard icon={Clock} label="Yanıt Süresi" value={d.avgLatency ? fmtMs(d.avgLatency) : '—'} subLabel="Sistem Ort. Gecikmesi" />
                <StatCard icon={DollarSign} label="Tahmini Gider" value={((d.totalCost ?? 0) * 36.5).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} subLabel="~36.5₺ Kur üzerinden" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* ── SOL PANEL: Grafikler ve Maliyetler ── */}
                <div className="lg:col-span-8 space-y-6 flex flex-col">

                    <div className="bg-white rounded-sm ring-1 ring-black/[0.04] shadow-sm flex-1 flex flex-col overflow-hidden">
                        <div className="px-5 py-4 border-b border-black/[0.04] bg-gray-50 flex justify-between items-center">
                            <div>
                                <h3 className="text-[10px] font-medium text-[var(--workspace-text)] uppercase tracking-widest flex items-center gap-2">
                                    <TrendingUp size={12} className="text-[var(--accent)]" /> Harcama Trendi
                                </h3>
                                <p className="text-[9px] text-[var(--sidebar-text-muted)] font-medium mt-0.5">Son 14 günlük API maliyet değişimi (USD)</p>
                            </div>
                            <Badge>USD</Badge>
                        </div>
                        <div className="p-5 flex-1 min-h-[250px] relative mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={d.costs || []} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} opacity={0.5} />
                                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: axisColor, fontWeight: 700 }} axisLine={false} tickLine={false} dy={10} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="amount" stroke="var(--accent)" fill="url(#costGrad)" strokeWidth={3} dot={{ r: 4, fill: "var(--window-bg)", strokeWidth: 2, stroke: "var(--accent)" }} activeDot={{ r: 6, fill: "var(--accent)", stroke: "var(--window-bg)", strokeWidth: 2 }} animationDuration={600} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Model Bazlı Harcamalar (Yatay Barlar) */}
                    <div className="bg-white rounded-sm ring-1 ring-black/[0.06] shadow-sm p-5">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[10px] font-medium text-[var(--workspace-text)] uppercase tracking-widest flex items-center gap-2">
                                <DollarSign size={12} className="text-[var(--accent)]" /> Model Maliyet Dağılımı
                            </h3>
                            <button className="text-[var(--sidebar-text-muted)] hover:text-[var(--workspace-text)] transition-colors"><MoreHorizontal size={14} /></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
                            {(d.modelCosts || []).slice(0, 6).map((model, idx) => (
                                <div key={idx} className="group cursor-default">
                                    <div className="flex justify-between items-end mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getModelColor(model.name) }} />
                                            <span className="text-[10px] font-medium text-[var(--workspace-text)]">{model.name}</span>
                                        </div>
                                        <div className="text-right flex items-baseline gap-2">
                                            <span className="text-[10px] font-medium font-mono text-[var(--accent)] group-hover:scale-105 transition-transform">{fmtCost(model.cost)}</span>
                                            <span className="text-[8px] text-[var(--sidebar-text-muted)] font-medium">%{model.percent}</span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-full bg-[var(--sidebar-hover)] rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${model.percent}%`, backgroundColor: getModelColor(model.name) }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── SAĞ PANEL: Hatalar ve Kullanım Oranları ── */}
                <div className="lg:col-span-4 space-y-6 flex flex-col">

                    {/* Hata Analizi */}
                    <div className="bg-white rounded-sm ring-1 ring-black/[0.06] shadow-sm p-5 flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-[10px] font-medium text-[var(--workspace-text)] uppercase tracking-widest flex items-center gap-2">
                                <AlertCircle size={12} className={d.errors?.length > 0 ? "text-red-500" : "text-emerald-500"} /> Hata Analizi
                            </h3>
                        </div>

                        {(d.errors?.length ?? 0) === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-10 bg-gray-50 rounded-sm mt-2">
                                <CheckCircle2 size={24} className="text-emerald-500 mb-2 opacity-80" />
                                <span className="text-[10px] font-medium tracking-widest uppercase text-emerald-600/80">Sistem Hatasız</span>
                            </div>
                        ) : (
                            <>
                                <div className="h-[140px] relative my-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={d.errors} innerRadius={40} outerRadius={55} paddingAngle={3} dataKey="value" stroke="none" animationDuration={600}>
                                                {(d.errors || []).map((e, i) => <Cell key={i} fill={e.color} />)}
                                            </Pie>
                                            <RechartsTooltip content={<CustomTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-xl font-medium text-[var(--workspace-text)] font-mono leading-none">
                                            {(d.errors || []).reduce((s, e) => s + e.value, 0)}
                                        </span>
                                        <span className="text-[8px] font-medium tracking-widest text-red-500/80 mt-1 uppercase">Hata</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5 mt-2 bg-gray-50 p-2 rounded-sm ring-1 ring-black/[0.04]">
                                    {(d.errors || []).map((err, i) => (
                                        <div key={i} className="flex items-center justify-between p-1.5 bg-white rounded-sm ring-1 ring-black/[0.04]">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: err.color }} />
                                                <span className="text-[9px] font-medium uppercase tracking-wider text-[var(--workspace-text)]">Kod {err.name}</span>
                                            </div>
                                            <span className="text-[10px] font-medium font-mono text-[var(--sidebar-text-muted)]">{err.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Popüler Modeller */}
                    <div className="bg-white rounded-sm ring-1 ring-black/[0.06] shadow-sm p-5 flex-1">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[10px] font-medium text-[var(--workspace-text)] uppercase tracking-widest flex items-center gap-2">
                                <Activity size={12} className="text-[var(--accent)]" /> Popüler Modeller
                            </h3>
                        </div>
                        <div className="space-y-4">
                            {(d.topModels || []).slice(0, 5).map((model, idx) => (
                                <div key={idx} className="group">
                                    <div className="flex justify-between items-baseline mb-1.5">
                                        <div className="flex items-center gap-2 max-w-[70%]">
                                            <span className="text-[10px] font-medium truncate text-[var(--workspace-text)] group-hover:text-[var(--accent)] transition-colors">{model.name}</span>
                                        </div>
                                        <span className="text-[9px] font-medium tracking-wider text-[var(--sidebar-text-muted)]">%{model.percent}</span>
                                    </div>
                                    <div className="h-1 w-full bg-[var(--sidebar-hover)] rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${model.percent}%`, backgroundColor: getModelColor(model.name) }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── TRAFİK ANALİZİ (Alt Kısım) ── */}
            <div className="bg-white rounded-sm ring-1 ring-black/[0.06] shadow-sm p-5 overflow-hidden">
                <div className="flex sm:items-center justify-between mb-6 flex-col sm:flex-row gap-3">
                    <h3 className="text-[10px] font-medium text-[var(--workspace-text)] uppercase tracking-widest flex items-center gap-2">
                        <Activity size={12} className="text-[var(--accent)]" /> Günlük İşlem Trafiği (İstekler)
                    </h3>
                    <div className="flex flex-wrap gap-2 text-[9px] font-medium text-[var(--sidebar-text-muted)] uppercase tracking-wider bg-gray-50 p-1.5 rounded-sm ring-1 ring-black/[0.04]">
                        {Object.entries(MODEL_COLORS).filter(([k]) => k !== 'default').map(([model, color]) => (
                            <span key={model} className="flex items-center gap-1.5 px-1.5">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                                {model}
                            </span>
                        ))}
                    </div>
                </div>
                {(() => {
                    // Her gün için toplam success/error hesapla
                    const chartData = (d.requests || []).map(day => ({
                        date: day.date,
                        success: Object.values(day.models || {}).reduce((s, v) => s + (v?.success || 0), 0),
                        error: Object.values(day.models || {}).reduce((s, v) => s + (v?.error || 0), 0),
                    }));
                    return (
                        <div className="h-[260px] w-full mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={chartData}
                                    margin={{ top: 10, right: 5, left: -25, bottom: 0 }}
                                    barCategoryGap="20%"
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--window-border)" vertical={false} opacity={0.5} />
                                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: axisColor, fontWeight: 700 }} axisLine={false} tickLine={false} dy={10} />
                                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'var(--sidebar-hover)' }} />

                                    {/* Barlar */}
                                    <Bar dataKey="success" name="Başarılı" fill="#10b981" radius={[2, 2, 0, 0]} maxBarSize={40} animationDuration={600} />
                                    <Bar dataKey="error" name="Hatalı" fill="#ef4444" fillOpacity={0.8} radius={[2, 2, 0, 0]} maxBarSize={40} animationDuration={600} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
});
