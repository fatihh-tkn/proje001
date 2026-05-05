import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail, Lock, Eye, EyeOff, Check, ArrowRight, X,
    UserPlus, AlertTriangle, Search, Clock, Shield,
} from 'lucide-react';

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
   Tutarlı Avatar Rengi (her isim için aynı renk)
   ══════════════════════════════════════════════════════════════════ */
const AVATAR_PALETTE = [
    { bg: '#DC2626', fg: '#FFFFFF' }, // kurumsal kırmızı
    { bg: '#0E7490', fg: '#FFFFFF' }, // teal
    { bg: '#475569', fg: '#FFFFFF' }, // slate
    { bg: '#7C2D12', fg: '#FFFFFF' }, // kahve
    { bg: '#0F766E', fg: '#FFFFFF' }, // yeşil
    { bg: '#6D28D9', fg: '#FFFFFF' }, // mor
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
   Avatar Pill — yatay seçici listesi için
   ══════════════════════════════════════════════════════════════════ */
function AccountPill({ session, isActive, onSelect, onRemove }) {
    const av = avatarOf(session.name);
    const firstName = (session.name || '').split(' ')[0] || session.email;
    return (
        <div className="relative group shrink-0">
            <button
                type="button"
                onClick={() => onSelect(session)}
                className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border-2 transition-all duration-200 ${
                    isActive
                        ? 'bg-[#DC2626] border-[#DC2626] text-white shadow-sm'
                        : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300 hover:bg-stone-50'
                }`}
                title={`${session.name} · ${session.email}`}
            >
                <span
                    style={{
                        backgroundColor: isActive ? 'rgba(255,255,255,0.18)' : av.bg,
                        color: isActive ? '#fff' : av.fg,
                    }}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black tracking-tight"
                >
                    {av.initials}
                </span>
                <span className="text-[12px] font-bold whitespace-nowrap max-w-[80px] truncate">
                    {firstName}
                </span>
                {isActive && <Check size={13} strokeWidth={3} className="ml-0.5" />}
            </button>
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove(session.id); }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white border border-stone-300 text-stone-400 hover:bg-red-50 hover:text-red-500 hover:border-red-300 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-[8px] font-bold shadow-sm"
                title="Bu hesabı kaldır"
            >
                <X size={10} strokeWidth={3} />
            </button>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════
   Ana Login Bileşeni
   ══════════════════════════════════════════════════════════════════ */
const Login = ({ onLogin }) => {
    // Mod: 'login' (mevcut hesap) | 'register' (yeni hesap)
    const [mode, setMode] = useState('login');

    const [quickSessions, setQuickSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null); // { id, name, email, ... }

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberDevice, setRememberDevice] = useState(true);

    const [error, setError] = useState('');
    const [errorType, setErrorType] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [confirmShake, setConfirmShake] = useState(false);
    const [isStarting, setIsStarting] = useState(false);

    /* ── Kayıtlı oturumları yükle, varsa ilkini otomatik seç ── */
    useEffect(() => {
        const sessions = getQuickSessions();
        setQuickSessions(sessions);
        if (sessions.length > 0) {
            setSelectedSession(sessions[0]);
            setEmail(sessions[0].email);
        }
    }, []);

    const refreshSessions = () => setQuickSessions(getQuickSessions());

    const handleRemoveSession = (id) => {
        removeQuickSession(id);
        const remaining = getQuickSessions();
        setQuickSessions(remaining);
        // Aktif seçim kaldırıldıysa sıradakine geç
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

    // "+ Başka hesap" → kayıtlı oturum yokmuş gibi davran (manuel email gir)
    const handleNewAccount = () => {
        setSelectedSession(null);
        setEmail('');
        setPassword('');
        setError('');
        setMode('login');
    };

    /* ── Şifre gücü (sadece kayıt için) ── */
    const REQUIREMENTS = [
        { regex: /.{8,}/, text: 'En az 8 karakter' },
        { regex: /[A-Z]/, text: 'En az 1 büyük harf' },
        { regex: /[0-9]/, text: 'En az 1 rakam' },
    ];
    const strength = useMemo(() =>
        REQUIREMENTS.map(r => ({ met: r.regex.test(password), text: r.text })),
        [password]);
    const strengthScore = strength.filter(r => r.met).length;
    const strengthBarColor =
        strengthScore === 0 ? 'bg-stone-200' :
            strengthScore === 1 ? 'bg-red-400' :
                strengthScore === 2 ? 'bg-amber-400' : 'bg-emerald-500';
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

    /* ── Submit ── */
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

        // Cihazda yeni hesap kaydedilecekse limit kontrolü
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

            // Başarılı: cihazda hatırla seçeneği işaretliyse oturuma kaydet
            try {
                if (rememberDevice) {
                    saveQuickSession({ ...data, eposta: data.eposta || loginEmail });
                }
                localStorage.setItem('current_user', JSON.stringify({
                    id: data.id, super: data.super, name: data.tam_ad, email: data.eposta || loginEmail,
                }));
            } catch (_) { /* localStorage kısıtlıysa sessizce geç */ }
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

    /* ════════════════════════════════════════════════════════════════
       Render
       ════════════════════════════════════════════════════════════════ */
    return (
        <div className="flex h-screen w-full items-center justify-center overflow-hidden font-sans bg-[#F4F4F5]">
            <motion.div
                className="relative w-full max-w-[420px] px-6"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
                {isStarting && (
                    <style>{`@keyframes traceCCW { from { transform: translate(-50%,-50%) rotate(0deg); } to { transform: translate(-50%,-50%) rotate(-360deg); } }`}</style>
                )}

                <div className={`relative ${isStarting ? 'p-[2px] rounded-[16px] overflow-hidden' : ''}`}>
                    {isStarting && (
                        <div
                            className="absolute top-1/2 left-1/2 w-[200%] h-[200%]"
                            style={{ background: 'conic-gradient(from 0deg, transparent 75%, #DC2626 100%)', animation: 'traceCCW 1.8s linear infinite', zIndex: 0 }}
                        />
                    )}

                    <div className={`relative z-10 px-8 py-8 ${isStarting ? 'bg-white rounded-[14px]' : 'bg-white rounded-2xl border border-stone-200/80 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.10)]'}`}>

                        {/* ── Header: GİRİŞ ── */}
                        <div className="flex justify-end mb-6">
                            <h2 className="text-[13px] font-black tracking-[0.25em] text-stone-400 uppercase">
                                {mode === 'register' ? 'KAYIT' : 'GİRİŞ'}
                            </h2>
                        </div>

                        {/* ── Hata Mesajı ── */}
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    key={error}
                                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    className={`relative mb-4 rounded-md text-sm font-semibold border overflow-hidden
                                        ${errorType === 'suspended' ? 'bg-amber-50 border-amber-300'
                                            : errorType === 'not_found' ? 'bg-blue-50 border-blue-200'
                                                : errorType === 'starting' ? 'bg-stone-50 border-stone-200'
                                                    : errorType === 'limit' ? 'bg-orange-50 border-orange-200'
                                                        : 'bg-red-50 border-red-200'}`}
                                >
                                    <div className={`h-1 w-full ${errorType === 'suspended' ? 'bg-amber-400'
                                        : errorType === 'not_found' ? 'bg-blue-400'
                                            : errorType === 'starting' ? 'bg-stone-400'
                                                : errorType === 'limit' ? 'bg-orange-400'
                                                    : 'bg-red-400'}`} />
                                    <div className="flex items-start gap-2.5 p-3">
                                        <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${errorType === 'suspended' ? 'text-amber-600'
                                            : errorType === 'not_found' ? 'text-blue-600'
                                                : errorType === 'starting' ? 'text-stone-500'
                                                    : errorType === 'limit' ? 'text-orange-600'
                                                        : 'text-red-600'}`} />
                                        <span className={`leading-snug text-[12px] ${errorType === 'suspended' ? 'text-amber-800'
                                            : errorType === 'not_found' ? 'text-blue-700'
                                                : errorType === 'starting' ? 'text-stone-600'
                                                    : errorType === 'limit' ? 'text-orange-700'
                                                        : 'text-red-700'}`}>
                                            {error}
                                        </span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-5" autoComplete="off">

                            {/* ── KAYITLI HESAPLAR (sadece login modu) ── */}
                            {mode === 'login' && quickSessions.length > 0 && (
                                <div className="flex flex-col gap-2.5">
                                    <p className="text-[10px] font-black tracking-[0.2em] text-stone-500 uppercase">
                                        Kayıtlı Hesaplar
                                    </p>
                                    <div className="flex items-center gap-2 overflow-x-auto pb-1.5 -mx-1 px-1 mac-horizontal-scrollbar">
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
                                                className={`shrink-0 flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-full border-2 border-dashed transition-all duration-200 ${
                                                    !selectedSession
                                                        ? 'border-stone-400 bg-stone-50 text-stone-700'
                                                        : 'border-stone-300 bg-white text-stone-500 hover:border-stone-400 hover:text-stone-700'
                                                }`}
                                                title="Mevcut hesaplardan hiçbiri değil"
                                            >
                                                <UserPlus size={13} strokeWidth={2.5} />
                                                <span className="text-[12px] font-bold whitespace-nowrap">+ Başka hesap</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── Ad Soyad (sadece kayıt) ── */}
                            {mode === 'register' && (
                                <div className="space-y-1.5">
                                    <label htmlFor="reg-name" className="text-[12px] font-bold text-stone-700">Ad Soyad</label>
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                                        <input
                                            id="reg-name" type="text" value={name} onChange={e => setName(e.target.value)}
                                            placeholder="Ad Soyad"
                                            className="w-full h-12 pl-10 pr-3 bg-stone-50 border border-stone-200 rounded-md text-[13px] font-semibold text-stone-800 placeholder:text-stone-400 focus:bg-white focus:border-[#DC2626]/50 focus:ring-2 focus:ring-[#DC2626]/15 outline-none transition-all"
                                            autoComplete="off"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ── E-posta ── */}
                            <div className="space-y-1.5">
                                <label htmlFor="login-email" className="text-[12px] font-bold text-stone-700">E-posta</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none z-10" />
                                    <input
                                        id="login-email"
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder={selectedSession ? selectedSession.email : 'eposta@sirket.com'}
                                        className={`w-full h-12 pl-10 ${isAutoFilled && mode === 'login' ? 'pr-28' : 'pr-3'} bg-stone-50 border border-stone-200 rounded-md text-[13px] font-semibold text-stone-800 placeholder:text-stone-400 focus:bg-white focus:border-[#DC2626]/50 focus:ring-2 focus:ring-[#DC2626]/15 outline-none transition-all`}
                                        autoComplete="off"
                                        spellCheck={false}
                                        required
                                    />
                                    {isAutoFilled && mode === 'login' && (
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black tracking-wider uppercase">
                                            <Check size={11} strokeWidth={3} />
                                            OTOMATİK
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* ── Şifre ── */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="login-password" className="text-[12px] font-bold text-stone-700">Şifre</label>
                                    {mode === 'login' && (
                                        <a
                                            href="#"
                                            onClick={(e) => e.preventDefault()}
                                            className="text-[11px] font-bold text-[#DC2626] hover:text-[#B91C1C] hover:underline transition-colors"
                                        >
                                            Unuttum
                                        </a>
                                    )}
                                </div>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none z-10" />
                                    <input
                                        id="login-password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full h-12 pl-10 pr-11 bg-stone-50 border border-stone-200 rounded-md text-[13px] font-semibold text-stone-800 placeholder:text-stone-300 focus:bg-white focus:border-[#DC2626]/50 focus:ring-2 focus:ring-[#DC2626]/15 outline-none transition-all"
                                        autoComplete="new-password"
                                        name="login-password-secret"
                                        data-1p-ignore="true"
                                        data-lpignore="true"
                                        data-form-type="other"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors p-1"
                                        tabIndex={-1}
                                        title={showPassword ? 'Gizle' : 'Göster'}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* ── Şifre gücü (kayıt) ── */}
                            {mode === 'register' && password.length > 0 && (
                                <div className="-mt-2">
                                    <div className="h-1 w-full overflow-hidden rounded-full bg-stone-100 mb-2">
                                        <div className={`h-full transition-all duration-500 ease-out ${strengthBarColor}`}
                                            style={{ width: `${(strengthScore / 3) * 100}%` }} />
                                    </div>
                                    <ul className="flex flex-col gap-1">
                                        {strength.map((req, i) => (
                                            <li key={i} className="flex items-center gap-2">
                                                {req.met
                                                    ? <Check size={12} className="text-emerald-500 shrink-0" strokeWidth={3} />
                                                    : <X size={12} className="text-stone-300 shrink-0" strokeWidth={3} />}
                                                <span className={`text-[11px] font-medium ${req.met ? 'text-emerald-600' : 'text-stone-400'}`}>{req.text}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* ── Şifre Tekrar (kayıt) ── */}
                            {mode === 'register' && (
                                <div className="space-y-1.5">
                                    <label htmlFor="reg-pwd2" className="text-[12px] font-bold text-stone-700">Şifre Tekrar</label>
                                    <div className="relative">
                                        <Shield size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                                        <motion.input
                                            id="reg-pwd2"
                                            type={showPassword ? 'text' : 'password'}
                                            value={passwordConfirm} onChange={handleConfirmChange}
                                            placeholder="••••••••"
                                            className="w-full h-12 pl-10 pr-3 bg-stone-50 border rounded-md text-[13px] font-semibold text-stone-800 placeholder:text-stone-300 focus:bg-white focus:ring-2 focus:ring-[#DC2626]/15 outline-none transition-all"
                                            autoComplete="new-password"
                                            data-1p-ignore="true"
                                            data-lpignore="true"
                                            animate={{
                                                x: confirmShake ? [-8, 8, -6, 6, -4, 4, 0] : 0,
                                                borderColor: passwordsMatch ? 'rgb(16 185 129)' : 'rgb(231 229 228)',
                                            }}
                                            transition={{ duration: 0.4 }}
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ── Bu cihazda beni hatırla (sadece login) ── */}
                            {mode === 'login' && (
                                <label className="flex items-center gap-2.5 cursor-pointer select-none -my-1">
                                    <span className="relative flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            checked={rememberDevice}
                                            onChange={e => setRememberDevice(e.target.checked)}
                                            className="peer appearance-none w-4 h-4 rounded border-2 border-stone-300 checked:border-[#DC2626] checked:bg-[#DC2626] transition-colors cursor-pointer"
                                        />
                                        <Check
                                            size={11}
                                            strokeWidth={4}
                                            className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"
                                        />
                                    </span>
                                    <span className="text-[12px] font-semibold text-stone-700">
                                        Bu cihazda beni hatırla
                                    </span>
                                </label>
                            )}

                            {/* ── Giriş Yap / Hesabı Aç butonu ── */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full h-12 rounded-md bg-[#DC2626] hover:bg-[#B91C1C] active:bg-[#991B1B] text-white font-bold text-[13px] tracking-wide flex items-center justify-center gap-2 shadow-[0_4px_14px_-4px_rgba(220,38,38,0.5)] transition-all duration-200 ${
                                    isLoading ? 'opacity-70 cursor-wait' : 'hover:shadow-[0_6px_18px_-4px_rgba(220,38,38,0.6)] hover:-translate-y-0.5'
                                }`}
                            >
                                {isLoading ? (
                                    <span className="tracking-widest">BEKLEYİN...</span>
                                ) : (
                                    <>
                                        <span>{mode === 'register' ? 'Hesabı Aç' : 'Giriş Yap'}</span>
                                        <ArrowRight size={16} strokeWidth={2.5} />
                                    </>
                                )}
                            </button>

                            {/* ── Alt bağlantı: Kayıt ol / Giriş'e dön ── */}
                            <div className="text-center pt-1">
                                {mode === 'login' ? (
                                    <p className="text-[12px] font-semibold text-stone-500">
                                        Hesabın yok mu?{' '}
                                        <button
                                            type="button"
                                            onClick={() => { setMode('register'); setError(''); setSelectedSession(null); setEmail(''); setPassword(''); }}
                                            className="text-[#DC2626] hover:text-[#B91C1C] hover:underline font-bold transition-colors"
                                        >
                                            Kayıt ol
                                        </button>
                                    </p>
                                ) : (
                                    <p className="text-[12px] font-semibold text-stone-500">
                                        Hesabın var mı?{' '}
                                        <button
                                            type="button"
                                            onClick={() => { setMode('login'); setError(''); }}
                                            className="text-[#DC2626] hover:text-[#B91C1C] hover:underline font-bold transition-colors"
                                        >
                                            Giriş yap
                                        </button>
                                    </p>
                                )}
                            </div>
                        </form>

                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
