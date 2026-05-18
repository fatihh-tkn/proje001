import React, { useState, useEffect, useMemo } from 'react';
import { Check, X, UserPlus, AlertTriangle, Shield, Eye, EyeOff } from 'lucide-react';
import sapKnockoutLogo from '../../assets/sap-yilgenci-logo-knockout.png';
import logoKapali from '../../assets/logo-kapali.png';

/* ══════════════════════════════════════════════════════════════════
   Hızlı Oturum Yönetimi (localStorage)
   ══════════════════════════════════════════════════════════════════ */
const SESSIONS_KEY = '_quick_sessions';
const MAX_SESSIONS = 5;

function getQuickSessions() {
    try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]'); }
    catch { return []; }
}

function saveQuickSession(user) {
    const sessions = getQuickSessions();
    const idx = sessions.findIndex(s => s.id === user.id);
    const entry = {
        id: user.id,
        name: user.tam_ad,
        email: user.eposta,
        meta: user.meta || {},
        isSuper: user.super || false,
        logged_at: new Date().toISOString(),
    };
    if (idx >= 0) sessions[idx] = entry;
    else { sessions.unshift(entry); sessions.splice(MAX_SESSIONS); }
    sessions.sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function removeQuickSession(id) {
    const sessions = getQuickSessions().filter(s => s.id !== id);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function isSessionLimitReached(email) {
    const sessions = getQuickSessions();
    const alreadyExists = sessions.some(s => s.email === email);
    return sessions.length >= MAX_SESSIONS && !alreadyExists;
}

/* ══════════════════════════════════════════════════════════════════
   Avatar
   ══════════════════════════════════════════════════════════════════ */
const AVATAR_PALETTE = [
    { bg: '#A01B1B', fg: '#FFFFFF' },
    { bg: '#0E7490', fg: '#FFFFFF' },
    { bg: '#475569', fg: '#FFFFFF' },
    { bg: '#7C2D12', fg: '#FFFFFF' },
    { bg: '#0F766E', fg: '#FFFFFF' },
    { bg: '#6D28D9', fg: '#FFFFFF' },
];

function avatarOf(name) {
    const initials = name
        ? name.trim().split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : '?';
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    const palette = AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
    return { initials, ...palette };
}

/* ══════════════════════════════════════════════════════════════════
   AccountPill
   ══════════════════════════════════════════════════════════════════ */
function AccountPill({ session, isActive, onSelect, onRemove }) {
    const av = avatarOf(session.name);
    const firstName = (session.name || '').split(' ')[0] || session.email;
    return (
        <div style={{ position: 'relative', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.querySelector('.pill-remove').style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.querySelector('.pill-remove').style.opacity = '0'}
        >
            <button
                type="button"
                onClick={() => onSelect(session)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    paddingLeft: 4, paddingRight: 12, paddingTop: 4, paddingBottom: 4,
                    borderRadius: 999,
                    border: `2px solid ${isActive ? '#A01B1B' : '#e2e8f0'}`,
                    background: isActive ? '#A01B1B' : '#fff',
                    color: isActive ? '#fff' : '#374151',
                    cursor: 'pointer',
                    transition: 'all .15s ease',
                    fontFamily: 'inherit',
                }}
            >
                <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: isActive ? 'rgba(255,255,255,0.2)' : av.bg,
                    color: isActive ? '#fff' : av.fg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 900, letterSpacing: '-0.02em',
                }}>
                    {av.initials}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {firstName}
                </span>
                {isActive && <Check size={12} strokeWidth={3} />}
            </button>
            <button
                type="button"
                className="pill-remove"
                onClick={e => { e.stopPropagation(); onRemove(session.id); }}
                style={{
                    position: 'absolute', top: -3, right: -3,
                    width: 16, height: 16, borderRadius: '50%',
                    background: '#fff', border: '1px solid #e2e8f0',
                    color: '#94a3b8', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0, transition: 'opacity .15s ease',
                    padding: 0,
                }}
                title="Bu hesabı kaldır"
            >
                <X size={9} strokeWidth={3} />
            </button>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════
   Yardımcı stiller
   ══════════════════════════════════════════════════════════════════ */
function inputStyle(focused) {
    return {
        width: '100%',
        boxSizing: 'border-box',
        padding: '13px 14px',
        background: '#fff',
        border: `1px solid ${focused ? '#A01B1B' : '#e2e8f0'}`,
        outline: 'none',
        fontSize: 13,
        color: '#0f172a',
        borderRadius: 3,
        boxShadow: focused ? '0 0 0 3px rgba(160,27,27,0.10)' : 'none',
        fontFamily: 'inherit',
        transition: 'all .15s ease',
    };
}

const labelStyle = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#475569',
    display: 'block',
    marginBottom: 7,
};

const FEATURE_PILLS = [
    { label: 'Vektör veri tabanı', meta: 'pgvector · hibrit arama' },
    { label: 'Aktif modeller', meta: 'GPT-4 · Claude · Gemini' },
    { label: 'Çalışan akışlar', meta: 'n8n · otomasyon' },
];

/* ══════════════════════════════════════════════════════════════════
   Ana Login Bileşeni
   ══════════════════════════════════════════════════════════════════ */
const Login = ({ onLogin }) => {
    const [mode, setMode] = useState('login');
    const [quickSessions, setQuickSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberDevice, setRememberDevice] = useState(true);
    const [focus, setFocus] = useState(null);

    const [error, setError] = useState('');
    const [errorType, setErrorType] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [confirmShake, setConfirmShake] = useState(false);

    useEffect(() => {
        const sessions = getQuickSessions();
        setQuickSessions(sessions);
        if (sessions.length > 0) {
            setSelectedSession(sessions[0]);
            setEmail(sessions[0].email);
        }
    }, []);

    const handleRemoveSession = (id) => {
        removeQuickSession(id);
        const remaining = getQuickSessions();
        setQuickSessions(remaining);
        if (selectedSession?.id === id) {
            const next = remaining[0] || null;
            setSelectedSession(next);
            setEmail(next?.email || '');
            setPassword('');
        }
    };

    const handleSelectSession = (session) => {
        setSelectedSession(session);
        setEmail(session.email);
        setPassword('');
        setError('');
        setMode('login');
    };

    const handleNewAccount = () => {
        setSelectedSession(null);
        setEmail('');
        setPassword('');
        setError('');
        setMode('login');
    };

    /* Şifre gücü */
    const REQUIREMENTS = [
        { regex: /.{8,}/, text: 'En az 8 karakter' },
        { regex: /[A-Z]/, text: 'En az 1 büyük harf' },
        { regex: /[0-9]/, text: 'En az 1 rakam' },
    ];
    const strength = useMemo(() =>
        REQUIREMENTS.map(r => ({ met: r.regex.test(password), text: r.text })),
        [password]);
    const strengthScore = strength.filter(r => r.met).length;
    const strengthColor = strengthScore === 0 ? '#e2e8f0' : strengthScore === 1 ? '#f87171' : strengthScore === 2 ? '#fbbf24' : '#10b981';
    const passwordsMatch = password.length > 0 && password === passwordConfirm;

    const handleConfirmChange = (e) => {
        if (passwordConfirm.length >= password.length && e.target.value.length > passwordConfirm.length) {
            setConfirmShake(true);
        } else {
            setPasswordConfirm(e.target.value);
        }
    };

    useEffect(() => {
        if (confirmShake) {
            const t = setTimeout(() => setConfirmShake(false), 500);
            return () => clearTimeout(t);
        }
    }, [confirmShake]);

    /* Submit */
    const handleSubmit = async (e) => {
        e.preventDefault();
        const isRegister = mode === 'register';
        const loginEmail = email.trim();

        if (!loginEmail || !password) { setError('Lütfen e-posta ve şifrenizi girin.'); setErrorType('generic'); return; }

        if (isRegister) {
            if (!name) { setError('Lütfen ad soyad bilgisini girin.'); setErrorType('generic'); return; }
            if (strengthScore < 3) { setError('Şifre gereksinimlerini karşılamıyor.'); setErrorType('generic'); return; }
            if (password !== passwordConfirm) { setError('Şifreler birbiriyle uyuşmuyor.'); setErrorType('generic'); return; }
        }

        if (rememberDevice && isSessionLimitReached(loginEmail)) {
            setError(`Bu cihazda en fazla ${MAX_SESSIONS} kayıtlı hesap tutulabilir. Listeden birini kaldırarak devam edin.`);
            setErrorType('limit');
            return;
        }

        setError('');
        setIsStarting(false);
        setIsLoading(true);
        try {
            const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
            const payload = isRegister
                ? { tam_ad: name, eposta: loginEmail, sifre: password }
                : { eposta: loginEmail, sifre: password };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();

            if (!response.ok) {
                const status = response.status;
                setError(data.detail || 'Bir hata oluştu.');
                if (status === 503) { setErrorType('starting'); setIsStarting(true); }
                else if (status === 404) setErrorType('not_found');
                else if (status === 403) setErrorType('suspended');
                else if (status === 401) setErrorType('wrong_password');
                else setErrorType('generic');
                return;
            }

            try {
                if (rememberDevice) saveQuickSession({ ...data, eposta: data.eposta || loginEmail });
                localStorage.setItem('current_user', JSON.stringify({
                    id: data.id, super: data.super, name: data.tam_ad, email: data.eposta || loginEmail,
                }));
            } catch (_) { }
            onLogin(data);
        } catch {
            setError('Sunucu ile bağlantı kurulamadı.');
            setErrorType('generic');
        } finally {
            setIsLoading(false);
        }
    };

    const isAutoFilled = !!selectedSession && email === selectedSession.email;
    const sessionLimitReached = quickSessions.length >= MAX_SESSIONS;
    const isRegister = mode === 'register';

    /* Hata bandı rengi */
    const errorColors = {
        suspended: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', bar: '#fbbf24', icon: '#b45309' },
        not_found:  { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', bar: '#60a5fa', icon: '#2563eb' },
        starting:   { bg: '#f8fafc', border: '#e2e8f0', text: '#374151', bar: '#94a3b8', icon: '#6b7280' },
        limit:      { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412', bar: '#fb923c', icon: '#c2410c' },
    };
    const ec = errorColors[errorType] || { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', bar: '#f87171', icon: '#dc2626' };

    return (
        <div style={{
            display: 'flex', width: '100%', height: '100vh',
            fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
            color: '#0f172a', overflow: 'hidden',
        }}>
            {isStarting && (
                <style>{`@keyframes traceCCW { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }`}</style>
            )}

            {/* ── LEFT · BRAND PANEL ── */}
            <div style={{
                width: 580, minWidth: 480,
                background: 'linear-gradient(180deg, #1a1a1c 0%, #161618 100%)',
                borderRight: '1px solid #2a2a2d',
                color: '#fff',
                padding: '48px 52px',
                position: 'relative',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
            }}>
                {/* kırmızı glow */}
                <div style={{
                    position: 'absolute', top: -200, left: -160,
                    width: 520, height: 520,
                    background: 'radial-gradient(circle, rgba(160,27,27,0.32) 0%, rgba(160,27,27,0) 60%)',
                    pointerEvents: 'none',
                }} />
                {/* faint grid */}
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
                    backgroundSize: '44px 44px',
                    maskImage: 'radial-gradient(ellipse at 40% 50%, black 0%, transparent 75%)',
                    WebkitMaskImage: 'radial-gradient(ellipse at 40% 50%, black 0%, transparent 75%)',
                    pointerEvents: 'none',
                }} />
                {/* watermark */}
                <img src={logoKapali} alt="" style={{
                    position: 'absolute', right: -80, bottom: -60,
                    height: 440, opacity: 0.06,
                    pointerEvents: 'none', filter: 'grayscale(1)',
                }} />

                {/* orta içerik */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
                        <img src={sapKnockoutLogo} alt="SAP · Yılgenci" style={{
                            height: 60, display: 'block',
                            filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.45))',
                        }} />
                    </div>

                    <div style={{
                        fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
                        color: '#A01B1B', fontWeight: 700, marginBottom: 18,
                        display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                        <span style={{ width: 24, height: 1, background: '#A01B1B', display: 'inline-block' }} />
                        Kurumsal Bilgi Platformu
                    </div>

                    <h2 style={{ fontSize: 36, lineHeight: 1.15, fontWeight: 600, letterSpacing: '-0.025em', margin: 0, color: '#f8fafc' }}>
                        Belge, model<br />ve otomasyon —<br />
                        <span style={{ color: '#A01B1B' }}>tek panelden.</span>
                    </h2>

                    <p style={{ marginTop: 20, maxWidth: 340, fontSize: 13, lineHeight: 1.65, color: '#94a3b8' }}>
                        Yapay zeka destekli iş akışlarına, vektör arşivine ve n8n
                        otomasyonlarına erişmek için kurumsal hesabınızla oturum açın.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 30, maxWidth: 360 }}>
                        {FEATURE_PILLS.map((row, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '10px 14px',
                                background: 'rgba(255,255,255,0.025)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: 2,
                            }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{
                                        width: 6, height: 6, borderRadius: 999,
                                        background: '#10b981',
                                        boxShadow: '0 0 0 3px rgba(16,185,129,0.12)',
                                    }} />
                                    <span style={{ fontSize: 12, color: '#e2e8f0' }}>{row.label}</span>
                                </span>
                                <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                                    {row.meta}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* footer */}
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
                    <span>© 2026 Yılgenci A.Ş.</span>
                    <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>v2.4.1</span>
                </div>
            </div>

            {/* ── RIGHT · FORM PANEL ── */}
            <div style={{
                flex: 1,
                background: '#f8f9fa',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '60px 48px',
                position: 'relative',
                overflow: 'auto',
            }}>
                {/* IT Destek linki */}
                <div style={{ position: 'absolute', top: 28, right: 28, fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 7 }}>
                    Hesap talep formu için
                    <a href="#it-destek" style={{ color: '#A01B1B', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid currentColor', paddingBottom: 1 }}>
                        IT Destek
                    </a>
                </div>

                {/* isStarting border animasyonu */}
                <div style={{
                    position: 'relative',
                    ...(isStarting ? { padding: 2, borderRadius: 6, overflow: 'hidden' } : {}),
                }}>
                    {isStarting && (
                        <div style={{
                            position: 'absolute', top: '50%', left: '50%',
                            width: '200%', height: '200%',
                            background: 'conic-gradient(from 0deg, transparent 75%, #A01B1B 100%)',
                            animation: 'traceCCW 1.8s linear infinite',
                            zIndex: 0,
                            transformOrigin: 'center center',
                        }} />
                    )}

                    <form
                        onSubmit={handleSubmit}
                        style={{
                            width: 400,
                            position: 'relative', zIndex: 1,
                            ...(isStarting ? { background: '#f8f9fa', borderRadius: 4, padding: 2 } : {}),
                        }}
                        autoComplete="off"
                    >
                        <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.025em', color: '#0f172a', margin: 0 }}>
                            {isRegister ? 'Hesap Oluştur' : 'Oturum açın'}
                        </h1>
                        <p style={{ fontSize: 13, color: '#64748b', marginTop: 8, marginBottom: 28, lineHeight: 1.55 }}>
                            {isRegister
                                ? 'Yeni bir kurumsal hesap oluşturun.'
                                : 'Devam etmek için Yılgenci kurumsal kimliğinizi kullanın.'
                            }
                        </p>

                        {/* ── Kayıtlı hesaplar (sadece login) ── */}
                        {!isRegister && quickSessions.length > 0 && (
                            <div style={{ marginBottom: 20 }}>
                                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 10, margin: '0 0 10px' }}>
                                    Kayıtlı Hesaplar
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                                    {quickSessions.map(sess => (
                                        <AccountPill
                                            key={sess.id}
                                            session={sess}
                                            isActive={selectedSession?.id === sess.id}
                                            onSelect={handleSelectSession}
                                            onRemove={handleRemoveSession}
                                        />
                                    ))}
                                    {!sessionLimitReached && (
                                        <button
                                            type="button"
                                            onClick={handleNewAccount}
                                            style={{
                                                flexShrink: 0,
                                                display: 'flex', alignItems: 'center', gap: 6,
                                                paddingLeft: 10, paddingRight: 12, paddingTop: 5, paddingBottom: 5,
                                                borderRadius: 999,
                                                border: `2px dashed ${!selectedSession ? '#94a3b8' : '#e2e8f0'}`,
                                                background: !selectedSession ? '#f1f5f9' : '#fff',
                                                color: '#64748b', cursor: 'pointer',
                                                fontSize: 12, fontWeight: 700,
                                                fontFamily: 'inherit',
                                            }}
                                        >
                                            <UserPlus size={12} strokeWidth={2.5} />
                                            <span>+ Başka hesap</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── Ad Soyad (sadece kayıt) ── */}
                        {isRegister && (
                            <div style={{ marginBottom: 16 }}>
                                <label style={labelStyle}>Ad Soyad</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Ad Soyad"
                                    onFocus={() => setFocus('name')}
                                    onBlur={() => setFocus(null)}
                                    style={inputStyle(focus === 'name')}
                                    autoComplete="off"
                                    required
                                />
                            </div>
                        )}

                        {/* ── E-posta ── */}
                        <div style={{ marginBottom: 16 }}>
                            <label htmlFor="yl-email" style={labelStyle}>Kurumsal E-Posta</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="yl-email"
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder={selectedSession ? selectedSession.email : 'ad.soyad@yilgenci.com'}
                                    onFocus={() => setFocus('email')}
                                    onBlur={() => setFocus(null)}
                                    autoComplete="off"
                                    spellCheck={false}
                                    required
                                    style={{ ...inputStyle(focus === 'email'), paddingRight: isAutoFilled && !isRegister ? 100 : 14 }}
                                />
                                {isAutoFilled && !isRegister && (
                                    <span style={{
                                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                        display: 'flex', alignItems: 'center', gap: 4,
                                        padding: '3px 8px', borderRadius: 3,
                                        background: '#f0fdf4', border: '1px solid #bbf7d0',
                                        color: '#15803d', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                                    }}>
                                        <Check size={10} strokeWidth={3} />
                                        OTOMATİK
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* ── Şifre ── */}
                        <div style={{ marginBottom: isRegister ? 8 : 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                                <label htmlFor="yl-password" style={{ ...labelStyle, marginBottom: 0 }}>Şifre</label>
                                {!isRegister && (
                                    <button type="button" style={{
                                        background: 'transparent', border: 0, padding: 0,
                                        cursor: 'pointer', fontSize: 11, color: '#A01B1B',
                                        fontWeight: 500, fontFamily: 'inherit',
                                    }}>
                                        Şifremi unuttum
                                    </button>
                                )}
                            </div>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="yl-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••••"
                                    onFocus={() => setFocus('pw')}
                                    onBlur={() => setFocus(null)}
                                    autoComplete="new-password"
                                    data-1p-ignore="true"
                                    data-lpignore="true"
                                    required
                                    style={{ ...inputStyle(focus === 'pw'), paddingRight: 50 }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    style={{
                                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                        background: 'transparent', border: 0, cursor: 'pointer',
                                        color: '#94a3b8', padding: 4,
                                    }}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        {/* ── Şifre gücü (kayıt) ── */}
                        {isRegister && password.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ height: 3, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
                                    <div style={{ height: '100%', background: strengthColor, width: `${(strengthScore / 3) * 100}%`, transition: 'all .4s ease', borderRadius: 999 }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {strength.map((req, i) => (
                                        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: req.met ? '#059669' : '#94a3b8' }}>
                                            {req.met ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
                                            {req.text}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Şifre tekrar (kayıt) ── */}
                        {isRegister && (
                            <div style={{ marginBottom: 16 }}>
                                <label style={labelStyle}>Şifre Tekrar</label>
                                <div style={{ position: 'relative' }}>
                                    <Shield size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={passwordConfirm}
                                        onChange={handleConfirmChange}
                                        placeholder="••••••••••"
                                        autoComplete="new-password"
                                        data-1p-ignore="true"
                                        required
                                        style={{
                                            ...inputStyle(false),
                                            paddingLeft: 38,
                                            border: `1px solid ${passwordsMatch ? '#6ee7b7' : '#e2e8f0'}`,
                                            animation: confirmShake ? 'shake 0.4s ease' : 'none',
                                        }}
                                    />
                                </div>
                                <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-7px)} 40%{transform:translateX(7px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }`}</style>
                            </div>
                        )}

                        {/* ── Beni hatırla (sadece login) ── */}
                        {!isRegister && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#475569', marginBottom: 20, cursor: 'pointer', userSelect: 'none' }}>
                                <input
                                    type="checkbox"
                                    checked={rememberDevice}
                                    onChange={e => setRememberDevice(e.target.checked)}
                                    style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                                />
                                <span style={{
                                    width: 16, height: 16, borderRadius: 2, flexShrink: 0,
                                    border: `1.5px solid ${rememberDevice ? '#A01B1B' : '#cbd5e1'}`,
                                    background: rememberDevice ? '#A01B1B' : '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all .15s ease',
                                }}>
                                    {rememberDevice && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>}
                                </span>
                                Bu cihazda beni hatırla
                            </label>
                        )}

                        {/* ── Hata mesajı ── */}
                        {error && (
                            <div role="alert" style={{
                                background: ec.bg, border: `1px solid ${ec.border}`,
                                borderRadius: 3, marginBottom: 16, overflow: 'hidden',
                            }}>
                                <div style={{ height: 3, background: ec.bar }} />
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px' }}>
                                    <AlertTriangle size={14} style={{ color: ec.icon, flexShrink: 0, marginTop: 1 }} />
                                    <span style={{ fontSize: 12, color: ec.text, lineHeight: 1.5 }}>{error}</span>
                                </div>
                            </div>
                        )}

                        {/* ── Giriş / Kayıt butonu ── */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                                width: '100%', padding: '13px',
                                background: '#A01B1B', color: '#fff',
                                border: 0, borderRadius: 3,
                                fontSize: 13, fontWeight: 600,
                                cursor: isLoading ? 'wait' : 'pointer',
                                opacity: isLoading ? 0.7 : 1,
                                boxShadow: '0 6px 14px -4px rgba(160,27,27,0.45), 0 0 0 1px rgba(160,27,27,0.4)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                fontFamily: 'inherit',
                                transition: 'opacity .15s ease',
                            }}
                        >
                            {isLoading ? (
                                <span style={{ letterSpacing: '0.15em' }}>BEKLEYİN…</span>
                            ) : (
                                <>
                                    <span>{isRegister ? 'Hesabı Oluştur' : 'Oturum Aç'}</span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                        <path d="M5 12h14M13 5l7 7-7 7" />
                                    </svg>
                                </>
                            )}
                        </button>

                        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 22, textAlign: 'center', lineHeight: 1.6 }}>
                            Bu sistem yetkili Yılgenci personeli içindir. Tüm oturumlar kayıt altına alınır.
                        </p>

                        {/* ── Mod geçiş ── */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 14px' }}>
                            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                            <span style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                {isRegister ? 'Hesabınız var mı?' : 'Hesabınız yok mu?'}
                            </span>
                            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                        </div>

                        <SecondaryButton onClick={() => {
                            setMode(isRegister ? 'login' : 'register');
                            setError('');
                            setSelectedSession(null);
                            setEmail(''); setPassword(''); setPasswordConfirm(''); setName('');
                        }}>
                            {isRegister ? (
                                <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                                    <span>Giriş Yap</span>
                                </>
                            ) : (
                                <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                                    <span>Yeni Hesap Aç</span>
                                </>
                            )}
                        </SecondaryButton>
                    </form>
                </div>
            </div>
        </div>
    );
};

function SecondaryButton({ onClick, children }) {
    const [hover, setHover] = useState(false);
    return (
        <button
            type="button"
            onClick={onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                width: '100%', padding: '12px',
                background: '#fff',
                color: hover ? '#A01B1B' : '#0f172a',
                border: `1px solid ${hover ? '#A01B1B' : '#e2e8f0'}`,
                borderRadius: 3, fontSize: 12.5, fontWeight: 600,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                fontFamily: 'inherit',
                boxShadow: '0 1px 0 rgba(15,23,42,0.04)',
                transition: 'all .15s ease',
            }}
        >
            {children}
        </button>
    );
}

export default Login;
