import React, { useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Activity, AlertCircle, TrendingUp, DollarSign, Zap, Clock, CheckCircle2, MoreHorizontal, ShieldAlert, Coins, Flame, BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import { CustomTooltip } from '../components/CustomTooltip';
import { StatCard } from '../components/StatCard';
import { fmt, fmtMs, fmtCost, getModelColor, MODEL_COLORS } from '../utils';

/* ─── Mini badge component for Dashboard ─────────────────────────── */
function Badge({ children, color = 'default' }) {
    const colors = {
        success: 'bg-[#EAF3DE] text-[#3B6D11] border-[#EAF3DE]/50',
        error: 'bg-[#FCEBEB] text-[#791F1F] border-[#FCEBEB]/50',
        warn: 'bg-[#FAEEDA] text-[#854F0B] border-[#FAEEDA]/50',
        default: 'bg-stone-100 text-stone-600 border-stone-200',
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest border ${colors[color]}`}>
            {children}
        </span>
    );
}

export const DashboardTab = React.memo(({ data }) => {
    const d = data || {};
    const axisColor = '#94a3b8';

    const [timeRange, setTimeRange] = useState('15d');

    const ERROR_CATALOG = {
        '401': { label: 'Yetki (API Anahtarı)', desc: 'Geçersiz veya süresi dolmuş anahtar', color: '#D85A30' },
        '403': { label: 'Erişim Engeli', desc: 'Bölgesel veya lisans engeli', color: '#791F1F' },
        '429': { label: 'Hız Sınırı (Limit)', desc: 'Çok fazla istek, kota aşıldı', color: '#EF9F27' },
        '500': { label: 'AI Sunucu Çöktü', desc: 'İç sistem hatası', color: '#6b7280' },
        '502': { label: 'Ağ Geçidi Hatası', desc: 'Sağlayıcı bağlantısı koptu', color: '#4b5563' },
        '503': { label: 'Servis Çok Yoğun', desc: 'Model yanıt veremiyor', color: '#374151' },
        'timeout': { label: 'Zaman Aşımı', desc: 'Cevap süresi aşıldı', color: '#854F0B' },
    };

    const getErrorMeta = (name) => ERROR_CATALOG[String(name).toLowerCase()] || { label: `Tanımsız Kod (${name})`, desc: 'Sistemsel Kesinti', color: '#a8a29e' };

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

    return (
        <div className="w-full h-full overflow-y-auto bg-stone-50 animate-in fade-in duration-300 mac-horizontal-scrollbar">
            <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">

                {/* ── ÜST SATIR: İstatistik Kartları ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={TrendingUp} label="Toplam İstek" value={fmt(d.totalRequests)} />
                    <StatCard icon={Zap} label="Token Tüketimi" value={fmt(d.totalTokens)} />
                    <StatCard icon={Clock} label="Yanıt Süresi" value={d.avgLatency ? fmtMs(d.avgLatency) : '—'} />
                    <StatCard icon={DollarSign} label="Tahmini Gider" value={((d.totalCost ?? 0) * 36.5).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* 1. Harcama Trendi */}
                    <div className="lg:col-span-8 bg-white rounded-xl border border-stone-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="px-5 py-3 border-b border-stone-100 bg-white flex justify-between items-center rounded-t-xl">
                            <h3 className="text-[12px] font-medium text-stone-600 uppercase tracking-wide flex items-center gap-2.5">
                                <div className="p-1.5 bg-[#D85A30]/10 text-[#D85A30] rounded-lg flex items-center justify-center">
                                    <LineChartIcon size={14} strokeWidth={2.5} />
                                </div>
                                Harcama Trendi (USD)
                            </h3>
                            <div className="flex gap-0.5 bg-stone-50 p-1 rounded-lg border border-stone-200">
                                {timeOptions.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setTimeRange(opt.id)}
                                        className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${timeRange === opt.id ? 'bg-white shadow-sm border border-stone-200 text-stone-700' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="p-5 flex-1 min-h-[250px] relative mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: axisColor, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                                    <RechartsTooltip content={<CustomTooltip />} isAnimationActive={false} cursor={{ stroke: 'rgba(0,0,0,0.06)', strokeWidth: 1 }} allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 9999 }} />
                                    <Line type="monotone" dataKey="amount" name={`Maliyet (USD)`} stroke="#D85A30" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: "#D85A30", stroke: "#ffffff", strokeWidth: 2 }} animationDuration={600} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 2. Hata Analizi & Koruma Bariyeri */}
                    <div className="lg:col-span-4 bg-white rounded-xl border border-stone-200 shadow-sm p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[12px] font-medium text-stone-600 uppercase tracking-wide flex items-center gap-2.5">
                                <div className={`p-1.5 rounded-lg flex items-center justify-center ${(d.errors?.length || 0) > 0 ? "bg-[#FCEBEB] text-[#791F1F]" : "bg-[#EAF3DE] text-[#3B6D11]"}`}>
                                    <ShieldAlert size={14} strokeWidth={2.5} />
                                </div>
                                Hata Analizi
                            </h3>
                        </div>

                        {(d.errors?.length ?? 0) === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-10 bg-stone-50 rounded-lg border border-stone-200 border-dashed mt-2">
                                <CheckCircle2 size={28} className="text-[#1D9E75] mb-2 opacity-80" />
                                <span className="text-[11px] font-bold tracking-widest uppercase text-[#3B6D11]">Sistem Stabil</span>
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
                                                    <Pie data={processedErrors} innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value" stroke="none" animationDuration={600}>
                                                        {processedErrors.map((e, i) => <Cell key={i} fill={e.color} />)}
                                                    </Pie>
                                                    <RechartsTooltip content={<CustomTooltip />} isAnimationActive={false} allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 9999 }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                <span className="text-[20px] font-black text-stone-700 leading-none">
                                                    {processedErrors.reduce((s, e) => s + e.value, 0)}
                                                </span>
                                                <span className="text-[10px] font-bold tracking-widest text-[#791F1F] mt-1 uppercase">Müdahale</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5 mt-4 bg-stone-50 p-2 rounded-lg border border-stone-100">
                                            {processedErrors.map((err, i) => (
                                                <div key={i} title={err.desc} className="flex items-center justify-between p-2 bg-white rounded border border-stone-100 hover:bg-stone-50 transition-colors cursor-default">
                                                    <div className="flex items-center gap-2 truncate">
                                                        <div className="w-1.5 h-1.5 rounded-full shadow-sm shrink-0" style={{ backgroundColor: err.color }} />
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 truncate">{err.displayName}</span>
                                                    </div>
                                                    <span className="text-[11px] font-bold text-stone-400 shrink-0 pl-2">{err.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                );
                            })()
                        )}
                    </div>

                    {/* 3. Model Maliyet Dağılımı */}
                    <div className="lg:col-span-8 bg-white rounded-xl border border-stone-200 shadow-sm p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[12px] font-medium text-stone-600 uppercase tracking-wide flex items-center gap-2.5">
                                <div className="p-1.5 bg-[#EF9F27]/10 text-[#EF9F27] rounded-lg flex items-center justify-center">
                                    <Coins size={14} strokeWidth={2.5} />
                                </div>
                                Model Maliyet Dağılımı
                            </h3>
                            <button className="text-stone-400 hover:text-stone-700 transition-colors"><MoreHorizontal size={16} /></button>
                        </div>

                        {/* Bütçe Payı (Stacked Bar) */}
                        <div className="h-2.5 w-full rounded-md overflow-hidden flex ring-1 ring-stone-200 mb-6">
                            {(d.modelCosts || []).slice(0, 6).map((model, idx) => (
                                <div
                                    key={idx}
                                    className="h-full transition-all duration-1000 hover:opacity-80 cursor-default border-r border-white/20 last:border-0"
                                    style={{ width: `${model.percent}%`, backgroundColor: getModelColor(model.name) }}
                                    title={`${model.name}: ${fmtCost(model.cost)}`}
                                />
                            ))}
                        </div>

                        {/* Finansal Bloklar */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 flex-1 content-start">
                            {(d.modelCosts || []).slice(0, 6).map((model, idx) => (
                                <div key={idx} className="p-4 bg-stone-50 border border-stone-200 rounded-lg flex flex-col justify-between hover:bg-stone-100 transition-colors group">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-2 h-2 rounded-sm shadow-sm" style={{ backgroundColor: getModelColor(model.name) }} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-700 truncate">{model.name}</span>
                                    </div>
                                    <div>
                                        <div className="text-[15px] font-black text-stone-700 group-hover:scale-105 transition-transform origin-left">{fmtCost(model.cost)}</div>
                                        <div className="text-[10px] font-bold tracking-widest uppercase text-stone-400 mt-1">%{model.percent} Tüketim</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 4. Popüler Modeller */}
                    <div className="lg:col-span-4 bg-white rounded-xl border border-stone-200 shadow-sm p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[12px] font-medium text-stone-600 uppercase tracking-wide flex items-center gap-2.5">
                                <div className="p-1.5 bg-[#378ADD]/10 text-[#378ADD] rounded-lg flex items-center justify-center">
                                    <Flame size={14} strokeWidth={2.5} />
                                </div>
                                Popüler Modeller
                            </h3>
                        </div>
                        <div className="space-y-5">
                            {(d.topModels || []).slice(0, 5).map((model, idx) => (
                                <div key={idx} className="group">
                                    <div className="flex justify-between items-baseline mb-2">
                                        <div className="flex items-center gap-2 max-w-[70%]">
                                            <span className="text-[11px] font-bold truncate text-stone-700 group-hover:text-[#378ADD] transition-colors">{model.name}</span>
                                        </div>
                                        <span className="text-[10px] font-bold tracking-wider text-stone-400">%{model.percent}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${model.percent}%`, backgroundColor: getModelColor(model.name) }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* ── TRAFİK ANALİZİ (Alt Kısım) ── */}
                <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 relative">
                    <div className="flex sm:items-center justify-between mb-6 flex-col sm:flex-row gap-3">
                        <h3 className="text-[12px] font-medium text-stone-600 uppercase tracking-wide flex items-center gap-2.5">
                            <div className="p-1.5 bg-[#1D9E75]/10 text-[#1D9E75] rounded-lg flex items-center justify-center">
                                <BarChart3 size={14} strokeWidth={2.5} />
                            </div>
                            Günlük İşlem Trafiği
                        </h3>
                        <div className="flex flex-wrap gap-2 text-[10px] font-bold text-stone-500 uppercase tracking-wider bg-stone-50 p-2 rounded-lg border border-stone-200">
                            {Array.from(new Set((d.requests || []).flatMap(day => Object.keys(day.models || {})))).map(model => (
                                <span key={model} className="flex items-center gap-1.5 px-1.5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getModelColor(model) }} />
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
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: axisColor, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                                        <RechartsTooltip content={<CustomTooltip />} cursor={false} isAnimationActive={false} allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 9999 }} />

                                        {/* Barlar */}
                                        <Bar dataKey="success" name="Başarılı" fill="#1D9E75" radius={[4, 4, 0, 0]} maxBarSize={40} animationDuration={600} />
                                        <Bar dataKey="error" name="Hatalı" fill="#791F1F" fillOpacity={0.8} radius={[4, 4, 0, 0]} maxBarSize={40} animationDuration={600} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
});
