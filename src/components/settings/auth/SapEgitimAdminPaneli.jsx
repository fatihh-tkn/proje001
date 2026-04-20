import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from "recharts";

const COLORS = {
    blue: "#378ADD", purple: "#7F77DD", teal: "#1D9E75",
    pink: "#D4537E", amber: "#EF9F27", coral: "#D85A30",
    green: "#63AA22", gray: "#B4B2A9"
};

const filters = ["Tüm departmanlar", "Finans", "Satın Alma", "İK", "Satış", "IT"];
const otherFilters = ["Tüm roller", "Tüm modüller"];

const initialKpis = [
    { label: "Toplam kullanıcı", value: "148", delta: "▲ 6 bu çeyrek", dir: "up" },
    { label: "Ortalama tamamlanma", value: "0%", delta: "—", dir: "neutral" },
    { label: "Gecikmiş eğitim", value: "0", delta: "—", dir: "neutral" },
    { label: "Toplam eğitim", value: "0", delta: "aktif", dir: "neutral" }
];

const deptCompletion = [];

const statusData = [];

const moduleAdoption = [];

const enrollmentTrend = [];

const heatmap = [];

const heatLegend = [
    { label: "Atanmadı", bg: "#F1EFE8", text: "#888780" },
    { label: "Başlangıç", bg: "#FCEBEB", text: "#791F1F" },
    { label: "Orta", bg: "#FAEEDA", text: "#854F0B" },
    { label: "İleri", bg: "#EAF3DE", text: "#3B6D11" },
    { label: "Uzman", bg: "#C0DD97", text: "#173404" },
    { label: "Dış eğitim", bg: "#EEEDFE", text: "#3C3489" }
];

const heatColors = {
    0: { bg: "#F1EFE8", text: "#888780" },
    1: { bg: "#FCEBEB", text: "#791F1F" },
    2: { bg: "#FAEEDA", text: "#854F0B" },
    3: { bg: "#EAF3DE", text: "#3B6D11" },
    4: { bg: "#C0DD97", text: "#173404" },
    E: { bg: "#EEEDFE", text: "#3C3489" }
};

const riskEmployees = [];

const tagColors = {
    FI: { bg: "#E6F1FB", text: "#0C447C" },
    CO: { bg: "#EEEDFE", text: "#3C3489" },
    MM: { bg: "#E1F5EE", text: "#085041" },
    SD: { bg: "#FAEEDA", text: "#633806" },
    HR: { bg: "#FBEAF0", text: "#72243E" },
    ABAP: { bg: "#FAECE7", text: "#712B13" },
    Fiori: { bg: "#FAEEDA", text: "#854F0B" }
};

const expiringCerts = [];

const departments = [];

function Card({ title, subtitle, children, className = "" }) {
    return (
        <div className={`bg-white border border-stone-200 rounded-xl p-4 ${className}`}>
            <div className="text-[12px] font-medium text-stone-600 uppercase tracking-wide">{title}</div>
            {subtitle && <div className="text-[11px] text-stone-400 mb-3">{subtitle}</div>}
            {!subtitle && <div className="mb-3"></div>}
            {children}
        </div>
    );
}

function KpiCard({ label, value, delta, dir }) {
    const color = dir === "up" ? "text-green-700" : dir === "down" ? "text-red-700" : "text-stone-400";
    return (
        <div className="bg-stone-100 rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-wide text-stone-500 mb-1">{label}</div>
            <div className="text-2xl font-medium">{value}</div>
            <div className={`text-[11px] mt-0.5 ${color}`}>{delta}</div>
        </div>
    );
}

function StatusBadge({ status, label }) {
    const colors = {
        ok: { bg: "#EAF3DE", text: "#3B6D11" },
        warn: { bg: "#FAEEDA", text: "#854F0B" },
        risk: { bg: "#FCEBEB", text: "#791F1F" }
    };
    const c = colors[status];
    return (
        <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: c.bg, color: c.text }}>{label}</span>
    );
}

function MiniBar({ value, color }) {
    return (
        <div className="inline-flex items-center gap-1.5">
            <div className="w-12 h-1 bg-stone-100 rounded-sm overflow-hidden">
                <div className="h-full rounded-sm" style={{ width: `${value}%`, background: color }}></div>
            </div>
            <span className="text-[12px]">{value}%</span>
        </div>
    );
}

export default function SapEgitimAdminPaneli() {
    const [activeFilter, setActiveFilter] = useState("Tüm departmanlar");
    const [kpiData, setKpiData] = useState(initialKpis);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("http://127.0.0.1:8000/api/egitim/istatistikler");
                if (res.ok) {
                    const data = await res.json();
                    setKpiData([
                        { label: "Toplam kullanıcı", value: data.toplam_kullanici.toString(), delta: "Sistemde", dir: "neutral" },
                        { label: "Ortalama tamamlanma", value: `${data.ortalama_tamamlanma_yuzdesi}%`, delta: "Güncel veri", dir: "up" },
                        { label: "Toplam Atama", value: data.toplam_atama.toString(), delta: "Tüm çalışanlara", dir: "neutral" },
                        { label: "Toplam Aktif Eğitim", value: data.toplam_aktif_egitim.toString(), delta: "Sistemde yüklü", dir: "neutral" }
                    ]);
                }
            } catch (err) {
                console.error("KPI Data Error", err);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="min-h-screen bg-stone-50 p-4 md:p-8">
            <div className="max-w-5xl mx-auto font-sans">
                {/* Header */}
                <div className="flex justify-between items-start mb-4 pb-3 border-b border-stone-200">
                    <div>
                        <h1 className="text-xl font-medium text-stone-900 mb-1">SAP Eğitim Yönetimi · Admin</h1>
                        <div className="text-xs text-stone-600">Tüm çalışanlar · rol, modül ve sertifika takibi</div>
                        <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] px-2 py-0.5 rounded" style={{ background: "#FCEBEB", color: "#791F1F" }}>● Admin erişimi</span>
                    </div>
                    <div className="text-right">
                        <div className="text-[11px] text-stone-600">Güncelleme: Bugün 09:00</div>
                        <div className="text-[11px] text-stone-400">Q2 2026 dönemi</div>
                    </div>
                </div>

                {/* Filter bar */}
                <div className="flex gap-1.5 flex-wrap items-center mb-4">
                    <span className="text-[11px] text-stone-400 mr-1">FİLTRE:</span>
                    {filters.map((f) => (
                        <button
                            key={f}
                            onClick={() => setActiveFilter(f)}
                            className={`text-[11px] px-2.5 py-1 rounded border border-stone-200 ${activeFilter === f ? "bg-blue-50 text-blue-900 border-blue-200" : "bg-white text-stone-600 hover:bg-stone-50"
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                    <span className="text-[11px] text-stone-400 mx-1">·</span>
                    {otherFilters.map((f) => (
                        <button key={f} className="text-[11px] px-2.5 py-1 rounded border border-stone-200 bg-white text-stone-600 hover:bg-stone-50">{f}</button>
                    ))}
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
                    {kpiData.map((k, i) => <KpiCard key={i} {...k} />)}
                </div>

                {/* Department & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <Card title="Departman bazlı tamamlanma" subtitle="Zorunlu eğitimlerin ortalama tamamlanma yüzdesi">
                        <div style={{ width: "100%", height: 220 }}>
                            <ResponsiveContainer>
                                <BarChart data={deptCompletion} layout="vertical" margin={{ left: 0, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#5F5E5A" }} tickFormatter={(v) => `${v}%`} />
                                    <YAxis dataKey="dept" type="category" tick={{ fontSize: 11, fill: "#5F5E5A" }} width={85} />
                                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => `${v}% tamamlanma`} />
                                    <Bar dataKey="value" radius={[3, 3, 3, 3]} barSize={18} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card title="Eğitim durum dağılımı" subtitle="Atanan tüm eğitimler üzerinden">
                        <div className="flex flex-wrap gap-3 mb-2 text-[11px] text-stone-600">
                            {statusData.map((s, i) => (
                                <span key={i} className="inline-flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }}></span>{s.name} {s.value}
                                </span>
                            ))}
                        </div>
                        <div style={{ width: "100%", height: 200 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={1}>
                                        {statusData.map((s, i) => <Cell key={i} fill={s.color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                {/* Module adoption & enrollment trend */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                    <Card title="Modül adopsiyonu" subtitle="Şirket içi vs. dışarıdan alınan eğitim sayısı · modül başına" className="md:col-span-3">
                        <div className="flex flex-wrap gap-3 mb-2 text-[11px] text-stone-600">
                            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS.blue }}></span>Şirket içi</span>
                            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS.amber }}></span>Dış</span>
                        </div>
                        <div style={{ width: "100%", height: 220 }}>
                            <ResponsiveContainer>
                                <BarChart data={moduleAdoption}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                                    <XAxis dataKey="module" tick={{ fontSize: 11, fill: "#5F5E5A" }} />
                                    <YAxis tick={{ fontSize: 11, fill: "#5F5E5A" }} />
                                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                                    <Bar dataKey="internal" stackId="a" fill={COLORS.blue} name="Şirket içi" barSize={20} />
                                    <Bar dataKey="external" stackId="a" fill={COLORS.amber} name="Dış" radius={[3, 3, 0, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card title="Aylık kayıt trendi" subtitle="Son 6 ay · yeni eğitim kayıtları" className="md:col-span-2">
                        <div style={{ width: "100%", height: 220 }}>
                            <ResponsiveContainer>
                                <AreaChart data={enrollmentTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5F5E5A" }} />
                                    <YAxis tick={{ fontSize: 11, fill: "#5F5E5A" }} />
                                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => `${v} yeni kayıt`} />
                                    <Area type="monotone" dataKey="value" stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.2} strokeWidth={1.8} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                {/* Heatmap */}
                <Card title="Yetkinlik ısı haritası" subtitle="Çalışan × modül · renk = yetkinlik seviyesi · mor = dış eğitim" className="mb-4">
                    <div className="flex flex-wrap gap-3 mb-3 text-[11px] text-stone-600">
                        {heatLegend.map((l, i) => (
                            <span key={i} className="inline-flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.bg }}></span>{l.label}
                            </span>
                        ))}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[11px]">
                            <thead>
                                <tr>
                                    <th className="text-left pl-2 pr-2.5 py-1 text-[10px] font-medium text-stone-500 uppercase tracking-wide min-w-[130px]">Çalışan</th>
                                    {["FI", "CO", "MM", "SD", "HR", "ABAP", "Fiori"].map((m) => (
                                        <th key={m} className="text-center py-1 text-[10px] font-medium text-stone-500 uppercase">{m}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {heatmap.map((row, i) => (
                                    <tr key={i}>
                                        <td className="pl-2 pr-2.5 py-1 border border-white">
                                            <div className="font-medium text-stone-900">{row.name}</div>
                                            <div className="text-[10px] text-stone-400 font-normal">{row.role}</div>
                                        </td>
                                        {["FI", "CO", "MM", "SD", "HR", "ABAP", "Fiori"].map((m) => {
                                            const v = row.levels[m];
                                            const c = heatColors[v];
                                            const label = v === 0 ? "—" : v === "E" ? "E1" : v;
                                            return (
                                                <td key={m} className="text-center p-1 border border-white" style={{ background: c.bg, color: c.text, borderRadius: 3 }}>
                                                    {label}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Risk & Expiring */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <Card title="Risk altındaki çalışanlar" subtitle="Zorunlu eğitimde geride kalan · öncelik sırasıyla">
                        <table className="w-full text-[12px]">
                            <tbody>
                                {riskEmployees.map((e, i) => (
                                    <tr key={i} className="border-b border-stone-100 last:border-none">
                                        <td className="py-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0" style={{ background: e.avBg, color: e.avText }}>{e.initials}</div>
                                                <div>
                                                    <div className="font-medium text-stone-900 text-[12px]">{e.name}</div>
                                                    <div className="text-[10px] text-stone-600">{e.dept}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-2">
                                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: tagColors[e.module].bg, color: tagColors[e.module].text }}>{e.module}</span>
                                        </td>
                                        <td className="py-2"><MiniBar value={e.progress} color={e.severity === "risk" ? COLORS.coral : COLORS.amber} /></td>
                                        <td className="py-2 text-right"><StatusBadge status={e.severity} label={e.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>

                    <Card title="Süresi dolmak üzere sertifikalar" subtitle="90 gün içinde yenilenmesi gereken sertifikalar">
                        {expiringCerts.map((c, i) => {
                            const textColor = c.days < 30 ? "text-red-700" : c.days < 60 ? "text-amber-700" : "text-green-700";
                            return (
                                <div key={i} className="mb-2.5 last:mb-0">
                                    <div className="flex justify-between text-[12px] mb-1">
                                        <span className="font-medium">{c.name}</span>
                                        <span className={`text-[11px] ${textColor}`}>{c.days} gün</span>
                                    </div>
                                    <div className="relative h-[18px] bg-stone-100 rounded overflow-hidden">
                                        <div className="h-full rounded" style={{ width: `${c.percent}%`, background: c.color }}></div>
                                        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-medium">{c.month}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </Card>
                </div>

                {/* Department summary */}
                <Card title="Departman özet tablosu" subtitle="Her departmanın eğitim durumu · detay için tıkla">
                    <table className="w-full text-[12px]">
                        <thead>
                            <tr>
                                {["Departman", "Çalışan", "Aktif eğitim", "Ort. tamamlanma", "Dış sertifika", "Durum"].map((h) => (
                                    <th key={h} className="text-left py-2 px-2 text-[10px] font-medium text-stone-500 uppercase tracking-wide border-b border-stone-200">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {departments.map((d, i) => {
                                const barColor = d.status === "ok" ? COLORS.teal : d.status === "warn" ? COLORS.amber : COLORS.coral;
                                return (
                                    <tr key={i} className="border-b border-stone-100 last:border-none">
                                        <td className="py-2 px-2">{d.name}</td>
                                        <td className="py-2 px-2">{d.employees}</td>
                                        <td className="py-2 px-2">{d.active}</td>
                                        <td className="py-2 px-2"><MiniBar value={d.completion} color={barColor} /></td>
                                        <td className="py-2 px-2">{d.external}</td>
                                        <td className="py-2 px-2"><StatusBadge status={d.status} label={d.label} /></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </Card>
            </div>
        </div>
    );
}
