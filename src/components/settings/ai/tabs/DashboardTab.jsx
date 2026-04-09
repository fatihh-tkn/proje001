import React, { useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Activity, AlertCircle, TrendingUp, DollarSign, Zap, Clock, CheckCircle2, MoreHorizontal, ShieldAlert, Coins, Flame, BarChart3, LineChart as LineChartIcon } from 'lucide-react';
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

    const [timeRange, setTimeRange] = useState('15d');

    const ERROR_CATALOG = {
        '401': { label: 'Yetki (API Anahtarı)', desc: 'Geçersiz veya süresi dolmuş anahtar', color: '#ef4444' },
        '403': { label: 'Erişim Engeli', desc: 'Bölgesel veya lisans engeli', color: '#dc2626' },
        '429': { label: 'Hız Sınırı (Limit)', desc: 'Çok fazla istek, kota aşıldı', color: '#f59e0b' },
        '500': { label: 'AI Sunucu Çöktü', desc: 'İç sistem hatası', color: '#8b5cf6' },
        '502': { label: 'Ağ Geçidi Hatası', desc: 'Sağlayıcı bağlantısı koptu', color: '#a855f7' },
        '503': { label: 'Servis Çok Yoğun', desc: 'Model yanıt veremiyor', color: '#6366f1' },
        'timeout': { label: 'Zaman Aşımı', desc: 'Cevap süresi aşıldı', color: '#f97316' },
    };

    const getErrorMeta = (name) => ERROR_CATALOG[String(name).toLowerCase()] || { label: `Tanımsız Kod (${name})`, desc: 'Sistemsel Kesinti', color: '#64748b' };

    const chartData = React.useMemo(() => {
        const source = d.costs || [];
        if (source.length === 0) return [];

        let sliceLength = source.length;
        if (timeRange === '12h') sliceLength = Math.max(1, Math.floor(source.length / 30));
        if (timeRange === '1d') sliceLength = Math.max(1, Math.floor(source.length / 15));
        if (timeRange === '7d') sliceLength = Math.min(7, source.length);
        if (timeRange === '15d') sliceLength = Math.min(15, source.length);
        if (timeRange === '30d') sliceLength = Math.min(30, source.length);

        return source.slice(-sliceLength);
    }, [timeRange, d.costs]);

    const timeOptions = [
        { id: '12h', label: '12 Saatlik' },
        { id: '1d', label: 'Günlük' },
        { id: '7d', label: 'Haftalık' },
        { id: '15d', label: '15 Günlük' },
        { id: '30d', label: 'Aylık' },
    ];

    if ((d.totalRequests ?? 0) === 0) {
        return (
            <div className="bg-[var(--sidebar-hover)] rounded-sm ring-1 ring-black/[0.04] p-20 flex flex-col items-center justify-center gap-5 text-[var(--sidebar-text-muted)] animate-in fade-in duration-300 font-mono">
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
        <div className="space-y-6 w-full h-full overflow-y-auto bg-transparent px-6 py-6 animate-in fade-in duration-300 mac-horizontal-scrollbar font-mono">
            {/* ── ÜST SATIR: İstatistik Kartları ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={TrendingUp} label="Toplam İstek" value={fmt(d.totalRequests)} />
                <StatCard icon={Zap} label="Token Tüketimi" value={fmt(d.totalTokens)} />
                <StatCard icon={Clock} label="Yanıt Süresi" value={d.avgLatency ? fmtMs(d.avgLatency) : '—'} />
                <StatCard icon={DollarSign} label="Tahmini Gider" value={((d.totalCost ?? 0) * 36.5).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* 1. Harcama Trendi */}
                <div className="lg:col-span-8 bg-white rounded-sm ring-1 ring-black/[0.04] shadow-sm flex flex-col">
                    <div className="px-5 py-2.5 border-b border-black/[0.04] bg-gray-50 flex justify-between items-center rounded-t-sm">
                        <h3 className="text-[10px] font-medium text-[var(--workspace-text)] uppercase tracking-widest flex items-center gap-2.5">
                            <div className="p-1 bg-red-500/10 text-red-500 rounded flex items-center justify-center">
                                <LineChartIcon size={12} strokeWidth={2.5} />
                            </div>
                            Harcama Trendi (USD)
                        </h3>
                        <div className="flex gap-0.5 bg-gray-50/50 p-0.5 rounded ring-1 ring-black/[0.04]">
                            {timeOptions.map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => setTimeRange(opt.id)}
                                    className={`px-2 py-0.5 text-[9px] font-medium uppercase tracking-widest rounded-sm transition-all ${timeRange === opt.id ? 'bg-white shadow-sm ring-1 ring-black/[0.04] text-[var(--workspace-text)]' : 'text-[var(--sidebar-text-muted)] hover:text-[var(--workspace-text)] hover:bg-black/[0.02]'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="p-5 flex-1 min-h-[250px] relative mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} opacity={0.5} />
                                <XAxis dataKey="date" tick={{ fontSize: 9, fill: axisColor, fontWeight: 700 }} axisLine={false} tickLine={false} dy={10} />
                                <RechartsTooltip content={<CustomTooltip />} isAnimationActive={false} cursor={{ stroke: 'rgba(0,0,0,0.05)', strokeWidth: 1 }} allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 9999 }} />
                                <Line type="monotone" dataKey="amount" name={`Maliyet (USD)`} stroke="#ef4444" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: "#ef4444", stroke: "var(--window-bg)", strokeWidth: 2 }} animationDuration={600} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Hata Analizi & Koruma Bariyeri */}
                <div className="lg:col-span-4 bg-white rounded-sm ring-1 ring-black/[0.06] shadow-sm p-5 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-medium text-[var(--workspace-text)] uppercase tracking-widest flex items-center gap-2.5">
                            <div className={`p-1 rounded flex items-center justify-center ${(d.errors?.length || 0) > 0 ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"}`}>
                                <ShieldAlert size={12} strokeWidth={2.5} />
                            </div>
                            Hata Analizi
                        </h3>
                    </div>

                    {(d.errors?.length ?? 0) === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-10 bg-gray-50 rounded-sm mt-2">
                            <CheckCircle2 size={24} className="text-emerald-500 mb-2 opacity-80" />
                            <span className="text-[10px] font-medium tracking-widest uppercase text-emerald-600/80">Sistem Stabil</span>
                        </div>
                    ) : (
                        (() => {
                            const processedErrors = (d.errors || []).map(err => {
                                const meta = getErrorMeta(err.name);
                                return { ...err, displayName: meta.label, desc: meta.desc, color: meta.color };
                            });
                            return (
                                <>
                                    <div className="h-[140px] relative my-2 flex-1">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={processedErrors} innerRadius={40} outerRadius={55} paddingAngle={3} dataKey="value" stroke="none" animationDuration={600}>
                                                    {processedErrors.map((e, i) => <Cell key={i} fill={e.color} />)}
                                                </Pie>
                                                <RechartsTooltip content={<CustomTooltip />} isAnimationActive={false} allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 9999 }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-xl font-medium text-[var(--workspace-text)] font-mono leading-none">
                                                {processedErrors.reduce((s, e) => s + e.value, 0)}
                                            </span>
                                            <span className="text-[8px] font-medium tracking-widest text-red-500/80 mt-1 uppercase">Müdahale</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 mt-2 bg-gray-50 p-2 rounded-sm ring-1 ring-black/[0.04]">
                                        {processedErrors.map((err, i) => (
                                            <div key={i} title={err.desc} className="flex items-center justify-between p-1.5 bg-white rounded-sm ring-1 ring-black/[0.04] hover:bg-gray-50 transition-colors cursor-default">
                                                <div className="flex items-center gap-2 truncate">
                                                    <div className="w-1.5 h-1.5 rounded-full shadow-sm shrink-0" style={{ backgroundColor: err.color }} />
                                                    <span className="text-[9px] font-medium uppercase tracking-wider text-[var(--workspace-text)] truncate">{err.displayName}</span>
                                                </div>
                                                <span className="text-[10px] font-medium font-mono text-[var(--sidebar-text-muted)] shrink-0 pl-2">{err.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            );
                        })()
                    )}
                </div>

                {/* 3. Model Maliyet Dağılımı */}
                <div className="lg:col-span-8 bg-white rounded-sm ring-1 ring-black/[0.06] shadow-sm p-5 flex flex-col">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-[10px] font-medium text-[var(--workspace-text)] uppercase tracking-widest flex items-center gap-2.5">
                            <div className="p-1 bg-amber-500/10 text-amber-500 rounded flex items-center justify-center">
                                <Coins size={12} strokeWidth={2.5} />
                            </div>
                            Model Maliyet Dağılımı
                        </h3>
                        <button className="text-[var(--sidebar-text-muted)] hover:text-[var(--workspace-text)] transition-colors"><MoreHorizontal size={14} /></button>
                    </div>

                    {/* Bütçe Payı (Stacked Bar) */}
                    <div className="h-2 w-full rounded-sm overflow-hidden flex ring-1 ring-black/[0.04] mb-5">
                        {(d.modelCosts || []).slice(0, 6).map((model, idx) => (
                            <div
                                key={idx}
                                className="h-full transition-all duration-1000 hover:opacity-80 cursor-default"
                                style={{ width: `${model.percent}%`, backgroundColor: getModelColor(model.name) }}
                                title={`${model.name}: ${fmtCost(model.cost)}`}
                            />
                        ))}
                    </div>

                    {/* Finansal Bloklar */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 flex-1 content-start">
                        {(d.modelCosts || []).slice(0, 6).map((model, idx) => (
                            <div key={idx} className="p-3 bg-gray-50/50 rounded-sm ring-1 ring-black/[0.04] flex flex-col justify-between hover:bg-gray-50 transition-colors group">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-1.5 h-1.5 rounded-sm shadow-sm" style={{ backgroundColor: getModelColor(model.name) }} />
                                    <span className="text-[9px] font-medium uppercase tracking-wider text-[var(--workspace-text)] truncate">{model.name}</span>
                                </div>
                                <div>
                                    <div className="text-[14px] font-medium text-[var(--workspace-text)] font-mono group-hover:scale-105 transition-transform origin-left">{fmtCost(model.cost)}</div>
                                    <div className="text-[8px] font-medium tracking-widest uppercase text-[var(--sidebar-text-muted)] mt-1">%{model.percent} Tüketim</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4. Popüler Modeller */}
                <div className="lg:col-span-4 bg-white rounded-sm ring-1 ring-black/[0.06] shadow-sm p-5 flex flex-col">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-[10px] font-medium text-[var(--workspace-text)] uppercase tracking-widest flex items-center gap-2.5">
                            <div className="p-1 bg-indigo-500/10 text-indigo-500 rounded flex items-center justify-center">
                                <Flame size={12} strokeWidth={2.5} />
                            </div>
                            Popüler Modeller
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

            {/* ── TRAFİK ANALİZİ (Alt Kısım) ── */}
            <div className="bg-white rounded-sm ring-1 ring-black/[0.06] shadow-sm p-5 relative">
                <div className="flex sm:items-center justify-between mb-6 flex-col sm:flex-row gap-3">
                    <h3 className="text-[10px] font-medium text-[var(--workspace-text)] uppercase tracking-widest flex items-center gap-2.5">
                        <div className="p-1 bg-cyan-500/10 text-cyan-600 rounded flex items-center justify-center">
                            <BarChart3 size={12} strokeWidth={2.5} />
                        </div>
                        Günlük İşlem Trafiği
                    </h3>
                    <div className="flex flex-wrap gap-2 text-[9px] font-medium text-[var(--sidebar-text-muted)] uppercase tracking-wider bg-gray-50 p-1.5 rounded-sm ring-1 ring-black/[0.04]">
                        {Array.from(new Set((d.requests || []).flatMap(day => Object.keys(day.models || {})))).map(model => (
                            <span key={model} className="flex items-center gap-1.5 px-1.5">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getModelColor(model) }} />
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
                                    <RechartsTooltip content={<CustomTooltip />} cursor={false} isAnimationActive={false} allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 9999 }} />

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
