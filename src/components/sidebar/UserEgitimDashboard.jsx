import React, { useState, useEffect } from 'react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    LineChart, Line
} from 'recharts';

const UserEgitimDashboard = ({ currentUser }) => {

    const [stats, setStats] = useState({ atanan: 0, disModul: 0, icEgitim: 0, disEgitim: 0, disSert: 0, icSert: 0 });

    useEffect(() => {
        if (!currentUser?.kimlik) return;
        const fetchDashboard = async () => {
            try {
                const res = await fetch(`http://127.0.0.1:8000/api/egitim/dashboard/${currentUser.kimlik}`);
                if (res.ok) {
                    const data = await res.json();
                    setStats({
                        atanan: data.ic_atamalar.length,
                        disModul: data.dis_profil.moduller.length,
                        icEgitim: data.ic_atamalar.length * 12,
                        disEgitim: data.dis_profil.dis_egitimler_sayisi,
                        disSert: data.dis_profil.dis_sertifika_sayisi,
                        icSert: 3
                    });
                }
            } catch (e) {}
        };
        fetchDashboard();
    }, [currentUser]);

    const radarData = [];
    const usageData = [];
    const stackedData = [];
    const trendData = [];

    const initials = (currentUser?.tam_ad || 'AK')
        .split(' ')
        .filter(Boolean)
        .map(p => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="ued" style={{ fontFamily: 'sans-serif', padding: '0 0.5rem 1rem' }}>
            <style>{`
                .ued {
                    --bg-1: #111110;
                    --bg-2: #1c1917;
                    --bd:   #292524;
                    --bd2:  #2a2827;
                    --tx1:  #f1f5f9;
                    --tx2:  #94a3b8;
                    --tx3:  #64748b;
                    --red:  #DC2626;
                    --red2: #f87171;
                    --r4:   4px;
                    --r6:   6px;
                    --r8:   8px;
                }
                .ued * { box-sizing: border-box; }

                /* Header */
                .ued-hdr { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem; padding-bottom:0.75rem; border-bottom:1px solid var(--bd); }
                .ued-hdr h1 { font-size:13px; font-weight:600; margin-bottom:3px; color:var(--tx1); }
                .ued-hdr .sub { font-size:10px; color:var(--tx2); }

                /* Role chip */
                .ued-chip { display:inline-flex; align-items:center; gap:4px; background:rgba(220,38,38,0.12); color:var(--red2); font-size:9px; padding:2px 6px; border-radius:var(--r4); margin-right:4px; margin-top:6px; border:1px solid rgba(220,38,38,0.25); }

                /* Avatar */
                .ued-av { width:34px; height:34px; border-radius:50%; background:var(--red); color:#fff; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; flex-shrink:0; }

                /* Metric cards */
                .ued-g4 { display:grid; grid-template-columns:repeat(2,1fr); gap:6px; margin-bottom:1rem; }
                .ued-mc { background:var(--bg-2); border:1px solid var(--bd); padding:0.6rem 0.8rem; border-radius:var(--r6); }
                .ued-mc .l { font-size:9px; color:var(--tx3); margin-bottom:2px; text-transform:uppercase; letter-spacing:0.04em; }
                .ued-mc .v { font-size:16px; font-weight:600; color:var(--tx1); }
                .ued-mc .d { font-size:9px; color:var(--tx3); margin-top:2px; }

                /* Card container */
                .ued-card { background:var(--bg-1); border:1px solid var(--bd); border-radius:var(--r8); padding:0.8rem 1rem; margin-bottom:1rem; }
                .ued-ct { font-size:10px; font-weight:600; color:var(--tx2); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:0.15rem; }
                .ued-ct-sub { font-size:9px; color:var(--tx3); margin-bottom:0.8rem; }

                /* Module grid */
                .ued-mod-grid { display:grid; grid-template-columns:1fr; gap:8px; }
                .ued-mod-card { background:var(--bg-2); border-radius:var(--r6); padding:0.6rem 0.8rem; border:1px solid var(--bd2); }
                .ued-mod-card.ext { background:rgba(239,159,39,0.08); border:1px solid rgba(239,159,39,0.2); }
                .ued-mod-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:4px; }
                .ued-mod-name { font-size:11px; font-weight:600; }
                .ued-mod-name.fi   { color:var(--red2); }
                .ued-mod-name.co   { color:#c4b5fd; }
                .ued-mod-name.mm   { color:#34d399; }
                .ued-mod-name.abap { color:#fb923c; }
                .ued-mod-name.fiori{ color:#facc15; }

                /* Badges */
                .ued-badge { font-size:8px; padding:1px 5px; border-radius:3px; font-weight:500; letter-spacing:0.03em; }
                .b-req  { background:rgba(220,38,38,0.15); color:#fca5a5; border:1px solid rgba(220,38,38,0.25); }
                .b-key  { background:rgba(16,185,129,0.12); color:#6ee7b7; border:1px solid rgba(16,185,129,0.25); }
                .b-ext  { background:rgba(245,158,11,0.12); color:#fde68a; border:1px solid rgba(245,158,11,0.25); }

                /* Progress */
                .ued-dur  { font-size:9px; color:var(--tx2); margin-bottom:6px; }
                .ued-stat { display:flex; justify-content:space-between; font-size:9px; color:var(--tx2); margin-bottom:3px; }
                .ued-stat b { color:var(--tx1); }
                .ued-bar  { height:4px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden; margin-bottom:6px; }
                .ued-fill { height:100%; border-radius:2px; }
                .ued-foot { display:flex; justify-content:space-between; font-size:8px; color:var(--tx3); border-top:1px solid rgba(255,255,255,0.05); padding-top:4px; margin-top:4px; }

                /* Chart */
                .ued-chart { position:relative; width:100%; margin-top:8px; }
                .ued-legend { display:flex; flex-wrap:wrap; gap:10px; margin-bottom:4px; font-size:9px; color:var(--tx2); }
                .ued-legend span { display:inline-flex; align-items:center; gap:4px; }
                .ued-sq { width:8px; height:8px; border-radius:2px; display:inline-block; }

                /* Training list */
                .ued-tr { display:flex; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid var(--bd); }
                .ued-tr:last-child { border-bottom:none; }
                .ued-tr-src { width:28px; height:28px; border-radius:var(--r4); display:flex; align-items:center; justify-content:center; font-size:8px; font-weight:600; flex-shrink:0; text-align:center; }
                .src-int { background:rgba(220,38,38,0.15); color:var(--red2); border:1px solid rgba(220,38,38,0.25); }
                .src-ext { background:rgba(239,159,39,0.15); color:#fbbf24; border:1px solid rgba(239,159,39,0.25); }
                .ued-tr-info { flex:1; min-width:0; }
                .ued-tr-name { font-size:10px; font-weight:500; color:var(--tx1); margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
                .ued-tr-meta { font-size:8px; color:var(--tx2); display:flex; gap:4px; flex-wrap:wrap; align-items:center; }
                .ued-tag { padding:1px 4px; border-radius:2px; }
                .t-fi   { background:rgba(220,38,38,0.15); color:#fca5a5; }
                .t-co   { background:rgba(127,119,221,0.15); color:#c4b5fd; }
                .t-mm   { background:rgba(29,158,117,0.15); color:#6ee7b7; }
                .t-abap { background:rgba(216,90,48,0.15); color:#fdba74; }
                .t-fiori{ background:rgba(239,159,39,0.15); color:#fde047; }
                .ued-dot { width:2px; height:2px; border-radius:50%; background:var(--tx3); }
                .ued-pct { font-size:9px; font-weight:500; min-width:30px; text-align:right; color:var(--tx1); }
                .ued-mini-bar { width:40px; height:3px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden; }
                .ued-mini-fill{ height:100%; border-radius:2px; }

                /* Tooltip */
                .ued-tip { background:var(--bg-1); border:1px solid var(--bd); padding:6px 10px; border-radius:var(--r4); font-size:9px; color:var(--tx1); }
                .ued-tip p { margin:0 0 2px 0; }
            `}</style>

            {/* Header */}
            <div className="ued-hdr">
                <div>
                    <h1>{currentUser?.tam_ad || 'Kullanıcı'} · Eğitim Paneli</h1>
                    <div className="sub">SAP FI/CO Functional Consultant</div>
                    <div>
                        <span className="ued-chip">Functional Cons.</span>
                        <span className="ued-chip">MM Key User</span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ textAlign: 'right', fontSize: 9, color: 'var(--tx2)' }}>Sv 4 · 3420 XP</div>
                    <div className="ued-av">{initials}</div>
                </div>
            </div>

            {/* Metric cards */}
            <div className="ued-g4">
                <div className="ued-mc">
                    <div className="l">Atanan</div>
                    <div className="v">{stats.atanan}</div>
                    <div className="d">İç eğitimler</div>
                </div>
                <div className="ued-mc">
                    <div className="l">Dış modüller</div>
                    <div className="v">{stats.disModul}</div>
                    <div className="d">Kayıtlı uzmanlık</div>
                </div>
                <div className="ued-mc">
                    <div className="l">Eğitim st.</div>
                    <div className="v">{stats.icEgitim + stats.disEgitim * 8}</div>
                    <div className="d">{stats.icEgitim} iç · {stats.disEgitim * 8} dış</div>
                </div>
                <div className="ued-mc">
                    <div className="l">Sertifikalar</div>
                    <div className="v">{stats.icSert + stats.disSert}</div>
                    <div className="d">{stats.icSert} iç · {stats.disSert} dış</div>
                </div>
            </div>

            {/* Assigned modules */}
            <div className="ued-card">
                <div className="ued-ct">Rolüme atanan modüller</div>
                <div className="ued-mod-grid">
                    {/* Sunucudan gelecek */}
                </div>
            </div>

            {/* Radar chart */}
            <div className="ued-card">
                <div className="ued-ct">Yetkinlik (Mevcut vs Hedef)</div>
                <div className="ued-chart" style={{ height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                            <PolarGrid stroke="rgba(255,255,255,0.08)" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Tooltip content={({ active, payload }) => {
                                if (active && payload?.length) {
                                    return (
                                        <div className="ued-tip">
                                            <p style={{ color: '#f87171' }}>Mevcut: {payload[0].value}</p>
                                            <p style={{ color: '#fca5a5' }}>Hedef: {payload[1]?.value}</p>
                                        </div>
                                    );
                                }
                                return null;
                            }} />
                            <Radar name="Mevcut" dataKey="A" stroke="#DC2626" fill="#DC2626" fillOpacity={0.25} />
                            <Radar name="Hedef"  dataKey="B" stroke="#f87171" fill="#f87171" fillOpacity={0.08} strokeDasharray="3 3" />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bar chart */}
            <div className="ued-card">
                <div className="ued-ct">Modül Kullanım Süresi (Ay)</div>
                <div className="ued-chart" style={{ height: 140 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={usageData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="mod" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9 }} />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                                content={({ active, payload }) =>
                                    active && payload ? <div className="ued-tip">{payload[0]?.payload?.mod}: {payload[0]?.value} ay</div> : null
                                }
                            />
                            <Bar dataKey="month" radius={[0, 4, 4, 0]} barSize={12} fill="#DC2626" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Line chart */}
            <div className="ued-card">
                <div className="ued-ct">Eğitim Eğilimi (Saat)</div>
                <div className="ued-legend">
                    <span><span className="ued-sq" style={{ background: '#DC2626' }} />İç</span>
                    <span><span className="ued-sq" style={{ background: '#f59e0b' }} />Dış</span>
                </div>
                <div className="ued-chart" style={{ height: 120 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9 }} />
                            <Tooltip
                                contentStyle={{ background: '#111110', border: '1px solid #292524', borderRadius: 4, fontSize: 9 }}
                                itemStyle={{ fontSize: 9, padding: 0 }}
                            />
                            <Line type="monotone" dataKey="ic"  stroke="#DC2626" strokeWidth={2} dot={{ r: 2 }} />
                            <Line type="monotone" dataKey="dis" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Active trainings */}
            <div className="ued-card">
                <div className="ued-ct" style={{ marginBottom: 6 }}>Aktif Eğitimler</div>
                {/* Sunucudan gelecek listesi */}
            </div>
        </div>
    );
};

export default UserEgitimDashboard;
