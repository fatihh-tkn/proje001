import React from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Activity, AlertCircle, TrendingUp, DollarSign, Zap, Clock, CheckCircle2 } from 'lucide-react';
import { CustomTooltip } from '../components/CustomTooltip';
import { StatCard } from '../components/StatCard';
import { fmt, fmtMs, fmtCost, getModelColor, MODEL_COLORS } from '../utils';

export const DashboardTab = React.memo(({ data }) => {
    const d = data || {};
    const axisColor = '#94a3b8';

    if ((d.totalRequests ?? 0) === 0) {
        return (
            <div className="bg-[var(--window-bg)] rounded-sm border border-dashed border-[var(--window-border)] p-16 flex flex-col items-center justify-center gap-4 text-[var(--sidebar-text-muted)]">
                <div className="p-4 bg-[var(--sidebar-hover)] rounded-full text-[var(--window-border)]">
                    <Activity size={48} strokeWidth={1.5} />
                </div>
                <div className="text-center">
                    <p className="text-lg font-bold text-[var(--workspace-text)]">Henüz Veri Toplanmadı</p>
                    <p className="text-sm max-w-xs opacity-70">Uygulama kullanımına başladığınızda istatistikler burada gerçek zamanlı olarak belirecektir.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 w-full">
            {/* ÜST SATIR: Özet Kutuları */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={TrendingUp} label="Toplam İstek" value={fmt(d.totalRequests)} subLabel="Toplam API Çağrısı" />
                <StatCard icon={Zap} label="Token Tüketimi" value={fmt(d.totalTokens)} subLabel="Giriş ve Çıkış Toplamı" />
                <StatCard icon={Clock} label="Yanıt Süresi" value={d.avgLatency ? fmtMs(d.avgLatency) : '—'} subLabel="Sistem Ort. Gecikmesi" />
                <StatCard icon={DollarSign} label="Tahmini Gider" value={fmtCost(d.totalCost ?? 0)} subLabel="Model Birim Fiyatları" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* SOL PANEL: Maliyet ve Harcama Detayı */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-[var(--window-bg)] rounded-sm border border-[var(--window-border)] shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-[var(--window-border)] flex justify-between items-center bg-gray-50/20">
                            <div>
                                <h3 className="text-xs font-black text-[var(--workspace-text)] uppercase tracking-wider">Harcama Trendi</h3>
                                <p className="text-[9px] text-[var(--sidebar-text-muted)] font-bold opacity-60">Son 14 günlük maliyet değişimi</p>
                            </div>
                            <div className="px-2 py-0.5 bg-white border border-[var(--window-border)] rounded text-[9px] font-black text-[var(--sidebar-text-muted)]">USD</div>
                        </div>
                        <div className="p-5">
                            <div className="h-[240px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={d.costs || []} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.12} />
                                                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--window-border)" vertical={false} />
                                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: axisColor, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                        <RechartsTooltip content={<CustomTooltip />} />
                                        <Area type="monotone" dataKey="amount" stroke="var(--accent)" fill="url(#costGrad)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--accent)", strokeWidth: 1.5, stroke: "#fff" }} animationDuration={400} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Model Harcamaları */}
                    <div className="bg-[var(--window-bg)] rounded-sm border border-[var(--window-border)] shadow-sm p-5">
                        <h3 className="text-xs font-black text-[var(--workspace-text)] uppercase tracking-wider mb-5">Model Bazlı Maliyet Dağılımı</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
                            {(d.modelCosts || []).slice(0, 6).map((model, idx) => (
                                <div key={idx} className="space-y-1.5">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-bold text-[var(--workspace-text)]">{model.name}</span>
                                        <div className="text-right flex items-baseline gap-2">
                                            <span className="text-[10px] font-black font-mono text-[var(--accent)]">{fmtCost(model.cost)}</span>
                                            <span className="text-[8px] text-[var(--sidebar-text-muted)] font-bold">%{model.percent}</span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-full bg-[var(--sidebar-hover)] rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-1000 shadow-sm" style={{ width: `${model.percent}%`, backgroundColor: getModelColor(model.name) }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* SAĞ PANEL: Hatalar ve En Çok Kullanılanlar */}
                <div className="lg:col-span-4 space-y-6">

                    <div className="bg-[var(--window-bg)] rounded-sm border border-[var(--window-border)] shadow-sm p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black text-[var(--workspace-text)] uppercase tracking-wider">Hata Analizi</h3>
                            <AlertCircle size={14} className={d.errors?.length > 0 ? "text-red-500" : "text-emerald-500"} />
                        </div>

                        {(d.errors?.length ?? 0) === 0 ? (
                            <div className="flex flex-col items-center justify-center py-6 bg-emerald-50/30 rounded-sm border border-emerald-100/50">
                                <CheckCircle2 size={24} className="text-emerald-500 mb-1 opacity-70" />
                                <span className="text-[9px] font-black text-emerald-600">SİSTEM HATASIZ</span>
                            </div>
                        ) : (
                            <div className="h-[140px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={d.errors} innerRadius={35} outerRadius={48} paddingAngle={2} dataKey="value" stroke="none" animationDuration={400}>
                                            {(d.errors || []).map((e, i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                        <RechartsTooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-lg font-black text-[var(--workspace-text)] font-mono leading-none">
                                        {(d.errors || []).reduce((s, e) => s + e.value, 0)}
                                    </span>
                                    <span className="text-[8px] font-bold text-[var(--sidebar-text-muted)] mt-1">HATA</span>
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            {(d.errors || []).map((err, i) => (
                                <div key={i} className="flex items-center justify-between p-1.5 hover:bg-[var(--sidebar-hover)] rounded-sm transition-colors">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: err.color }} />
                                        <span className="text-[10px] font-bold text-[var(--workspace-text)]">Kod {err.name}</span>
                                    </div>
                                    <span className="text-[10px] font-black font-mono text-[var(--sidebar-text-muted)]">{err.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[var(--window-bg)] rounded-sm border border-[var(--window-border)] shadow-sm p-5 space-y-4">
                        <h3 className="text-xs font-black text-[var(--workspace-text)] uppercase tracking-wider">Popüler Modeller</h3>
                        <div className="space-y-3">
                            {(d.topModels || []).slice(0, 4).map((model, idx) => (
                                <div key={idx} className="space-y-1.5">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-[10px] font-bold truncate text-[var(--workspace-text)]">{model.name}</span>
                                        <span className="text-[9px] font-black text-[var(--sidebar-text-muted)]">%{model.percent}</span>
                                    </div>
                                    <div className="h-1 w-full bg-[var(--sidebar-hover)] rounded-full overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${model.percent}%`, backgroundColor: getModelColor(model.name) }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* TRAFİK ANALİZİ — İki sütun */}
            <div className="bg-[var(--window-bg)] rounded-sm border border-[var(--window-border)] shadow-sm p-5">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-xs font-black text-[var(--workspace-text)] uppercase tracking-wider">İşlem Trafiği</h3>
                    <div className="flex flex-wrap gap-3 text-[9px] font-black text-[var(--sidebar-text-muted)]">
                        {Object.entries(MODEL_COLORS).filter(([k]) => k !== 'default').map(([model, color]) => (
                            <span key={model} className="flex items-center gap-1">
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
                        <div className="h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={chartData}
                                    margin={{ top: 10, right: 5, left: -25, bottom: 0 }}
                                    barCategoryGap="35%"
                                    barGap={4}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--window-border)" vertical={false} />
                                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: axisColor, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'var(--sidebar-hover)' }} />
                                    <Bar dataKey="success" name="Başarılı" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={32} animationDuration={400} />
                                    <Bar dataKey="error" name="Hatalı" fill="#ef4444" fillOpacity={0.7} radius={[3, 3, 0, 0]} maxBarSize={32} animationDuration={400} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
});

// ── Logs Tab ──
