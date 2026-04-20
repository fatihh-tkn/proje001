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
                        icEgitim: data.ic_atamalar.length * 12, // mock hesabı
                        disEgitim: data.dis_profil.dis_egitimler_sayisi,
                        disSert: data.dis_profil.dis_sertifika_sayisi,
                        icSert: 3 // mock
                    });
                }
            } catch (e) { }
        }
        fetchDashboard();
    }, [currentUser]);

    const radarData = [];

    const usageData = [];

    const stackedData = [];

    const trendData = [];

    // Avatar
    const initials = (currentUser?.tam_ad || 'AK')
        .split(' ')
        .filter(Boolean)
        .map(p => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="user-egitim-dashboard" style={{ fontFamily: 'sans-serif', padding: '0 0.5rem 1rem' }}>
            <style>{`
                .user-egitim-dashboard {
                    --color-border-tertiary: #2a2a2d;
                    --color-text-primary: #f1f5f9;
                    --color-text-secondary: #94a3b8;
                    --color-text-tertiary: #64748b;
                    --color-background-primary: #0f172a;
                    --color-background-secondary: #1e293b;
                    --border-radius-md: 6px;
                    --border-radius-lg: 8px;
                }
                .user-egitim-dashboard * { box-sizing: border-box; }
                .dash-hdr { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; padding-bottom: 0.8rem; border-bottom: 0.5px solid var(--color-border-tertiary); }
                .dash-hdr h1 { font-size: 13px; font-weight: 600; margin-bottom: 3px; color: var(--color-text-primary); }
                .dash-hdr .sub { font-size: 10px; color: var(--color-text-secondary); }
                .role-chip { display: inline-flex; align-items: center; gap: 4px; background: rgba(60,52,137,0.2); color: #818cf8; font-size: 9px; padding: 2px 6px; border-radius: var(--border-radius-md); margin-right: 4px; margin-top: 6px; border: 1px solid rgba(60,52,137,0.4); }
                .av { width: 34px; height: 34px; border-radius: 50%; background: #CECBF6; color: #3C3489; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; }
                .g4 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 1rem; }
                .mc { background: var(--color-background-secondary); padding: 0.6rem 0.8rem; border-radius: var(--border-radius-md); }
                .mc .l { font-size: 9px; color: var(--color-text-secondary); margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.03em; }
                .mc .v { font-size: 16px; font-weight: 600; color: #f1f5f9; }
                .mc .d { font-size: 9px; color: var(--color-text-tertiary); margin-top: 2px; }
                .d-card { background: var(--color-background-primary); border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-lg); padding: 0.8rem 1rem; margin-bottom: 1rem; }
                .ct { font-size: 10px; font-weight: 600; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.1rem; }
                .ct-sub { font-size: 9px; color: var(--color-text-tertiary); margin-bottom: 0.8rem; }
                .mod-grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
                .mod-card { background: var(--color-background-secondary); border-radius: var(--border-radius-md); padding: 0.6rem 0.8rem; }
                .mod-card.ext { background: rgba(239,159,39,0.1); border: 1px solid rgba(239,159,39,0.2); }
                .mod-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
                .mod-name { font-size: 11px; font-weight: 600; }
                .mod-name.fi { color: #60a5fa; }
                .mod-name.co { color: #a78bfa; }
                .mod-name.mm { color: #34d399; }
                .mod-name.abap { color: #fb923c; }
                .mod-name.fiori { color: #facc15; }
                .mod-badge { font-size: 8px; padding: 1px 4px; border-radius: 3px; font-weight: 500; letter-spacing: 0.03em; }
                .b-req { background: #1e3a8a; color: #bfdbfe; }
                .b-key { background: #064e3b; color: #a7f3d0; }
                .b-ext { background: #78350f; color: #fde68a; }
                .mod-dur { font-size: 9px; color: var(--color-text-secondary); margin-bottom: 6px; }
                .mod-stat { display: flex; justify-content: space-between; font-size: 9px; color: var(--color-text-secondary); margin-bottom: 3px; }
                .mod-stat b { color: var(--color-text-primary); }
                .mbar { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; margin-bottom: 6px; }
                .mfill { height: 100%; border-radius: 2px; }
                .mod-foot { display: flex; justify-content: space-between; font-size: 8px; color: var(--color-text-tertiary); border-top: 0.5px solid rgba(255,255,255,0.05); padding-top: 4px; margin-top: 4px; }
                .chart-wrap { position: relative; width: 100%; height: 160px; margin-top: 8px; }
                .legend { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 4px; font-size: 9px; color: var(--color-text-secondary); }
                .legend span { display: inline-flex; align-items: center; gap: 4px; }
                .sq { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
                
                .tr-item { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 0.5px solid var(--color-border-tertiary); }
                .tr-item:last-child { border-bottom: none; }
                .tr-src { width: 28px; height: 28px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 600; flex-shrink: 0; text-align: center; }
                .src-int { background: rgba(55,138,221,0.2); color: #60a5fa; border: 1px solid rgba(55,138,221,0.3); }
                .src-ext { background: rgba(239,159,39,0.2); color: #fbbf24; border: 1px solid rgba(239,159,39,0.3); }
                .tr-info { flex: 1; min-width: 0; }
                .tr-name { font-size: 10px; font-weight: 500; color: var(--color-text-primary); margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .tr-meta { font-size: 8px; color: var(--color-text-secondary); display: flex; gap: 4px; flex-wrap: wrap; align-items: center; }
                .tag { padding: 1px 4px; border-radius: 2px; }
                .t-fi { background: rgba(55,138,221,0.2); color: #93c5fd; }
                .t-co { background: rgba(127,119,221,0.2); color: #c4b5fd; }
                .t-mm { background: rgba(29,158,117,0.2); color: #6ee7b7; }
                .t-abap { background: rgba(216,90,48,0.2); color: #fdba74; }
                .t-fiori { background: rgba(239,159,39,0.2); color: #fde047; }
                .dot { width: 2px; height: 2px; border-radius: 50%; background: var(--color-text-tertiary); }
                .tr-pct { font-size: 9px; font-weight: 500; min-width: 30px; text-align: right; color: #f1f5f9; }
                .mini-bar { width: 40px; height: 3px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
                .mini-fill { height: 100%; border-radius: 2px; }
                
                /* Custom Recharts Tooltip */
                .custom-tooltip { background: #0f172a; border: 1px solid #334155; padding: 6px 10px; border-radius: 4px; font-size: 9px; color: #f1f5f9; }
                .custom-tooltip p { margin: 0 0 2px 0; }
            `}</style>

            <div className="dash-hdr">
                <div>
                    <h1>{currentUser?.tam_ad || 'Ayşe Kılıç'} · Eğitim Paneli</h1>
                    <div className="sub">SAP FI/CO Functional Consultant</div>
                    <div>
                        <span className="role-chip">Functional Cons.</span>
                        <span className="role-chip">MM Key User</span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '9px', color: 'var(--color-text-secondary)' }}>Sv 4 · 3420 XP</div>
                    </div>
                    <div className="av">{initials}</div>
                </div>
            </div>

            <div className="g4">
                <div className="mc"><div className="l">Atanan</div><div className="v">{stats.atanan}</div><div className="d">İç eğitimler</div></div>
                <div className="mc"><div className="l">Dış modüller</div><div className="v">{stats.disModul}</div><div className="d">Kayıtlı uzmanlık</div></div>
                <div className="mc"><div className="l">Eğitim st.</div><div className="v">{stats.icEgitim + stats.disEgitim * 8}</div><div className="d">{stats.icEgitim} iç · {stats.disEgitim * 8} dış</div></div>
                <div className="mc"><div className="l">Sertifikalar</div><div className="v">{stats.icSert + stats.disSert}</div><div className="d">{stats.icSert} iç · {stats.disSert} dış</div></div>
            </div>

            <div className="d-card">
                <div className="ct">Rolüme atanan modüller</div>
                <div className="mod-grid">
                    {/* Sunucudan gelecek */}
                </div>
            </div>

            <div className="d-card">
                <div className="ct">Yetkinlik (Mevcut vs Hedef)</div>
                <div className="chart-wrap" style={{ height: '180px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                            <PolarGrid stroke="rgba(255,255,255,0.1)" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Tooltip content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="custom-tooltip">
                                            <p style={{ color: '#60a5fa' }}>Mevcut: {payload[0].value}</p>
                                            <p style={{ color: '#a78bfa' }}>Hedef: {payload[1].value}</p>
                                        </div>
                                    );
                                }
                                return null;
                            }} />
                            <Radar name="Mevcut" dataKey="A" stroke="#378ADD" fill="#378ADD" fillOpacity={0.3} />
                            <Radar name="Hedef" dataKey="B" stroke="#7F77DD" fill="#7F77DD" fillOpacity={0.1} strokeDasharray="3 3" />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="d-card">
                <div className="ct">Modül Kullanım Süresi (Ay)</div>
                <div className="chart-wrap" style={{ height: '140px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={usageData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="mod" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={({ active, payload }) => active && payload ? <div className="custom-tooltip">{payload[0].payload.mod}: {payload[0].value} ay</div> : null} />
                            <Bar dataKey="month" radius={[0, 4, 4, 0]} barSize={12} fill="#378ADD" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="d-card">
                <div className="ct">Eğitim Eğilimi (Saat)</div>
                <div className="legend">
                    <span><span className="sq" style={{ background: '#378ADD' }}></span>İç</span>
                    <span><span className="sq" style={{ background: '#EF9F27' }}></span>Dış</span>
                </div>
                <div className="chart-wrap" style={{ height: '120px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', fontSize: '9px' }} itemStyle={{ fontSize: '9px', padding: 0 }} />
                            <Line type="monotone" dataKey="ic" stroke="#378ADD" strokeWidth={2} dot={{ r: 2 }} />
                            <Line type="monotone" dataKey="dis" stroke="#EF9F27" strokeWidth={2} dot={{ r: 2 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="d-card">
                <div className="ct" style={{ marginBottom: '6px' }}>Aktif Eğitimler</div>
                {/* Sunucudan gelecek listesi */}
            </div>
        </div>
    );
};

export default UserEgitimDashboard;
