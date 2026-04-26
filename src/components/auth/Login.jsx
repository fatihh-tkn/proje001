import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../../assets/sap yılgenci logo.png';

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
    if (idx >= 0) {
        sessions[idx] = entry;
    } else {
        sessions.unshift(entry);
        sessions.splice(MAX_SESSIONS); // max 5 tut
    }
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
   Yardımcı CSS
   ══════════════════════════════════════════════════════════════════ */
const LABEL_CLS =
    'absolute z-10 pointer-events-none transition-all duration-200 ' +
    'top-0 left-3 -translate-y-1/2 scale-[0.78] ' +
    'text-[11px] font-bold uppercase tracking-wider text-slate-500 ' +
    'peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-11 ' +
    'peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 ' +
    'peer-placeholder-shown:text-[13px] peer-placeholder-shown:normal-case ' +
    'peer-placeholder-shown:font-semibold peer-placeholder-shown:tracking-normal ' +
    'peer-placeholder-shown:text-slate-400 ' +
    'group-focus-within:top-0 group-focus-within:left-3 ' +
    'group-focus-within:-translate-y-1/2 group-focus-within:scale-[0.78] ' +
    'group-focus-within:text-[11px] group-focus-within:uppercase ' +
    'group-focus-within:font-bold group-focus-within:tracking-wider group-focus-within:text-slate-500';

const INPUT_CLS =
    'peer w-full pl-11 pr-4 py-3.5 ' +
    'bg-white/80 border border-slate-200/80 rounded-md outline-none ' +
    'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 focus:bg-white ' +
    'transition-all font-semibold text-slate-800 ' +
    'shadow-[inset_0_1px_2px_rgba(0,0,0,0.01),0_1px_3px_rgba(0,0,0,0.02)] hover:bg-white/90';

const INPUT_CLS_PR = INPUT_CLS.replace('pr-4', 'pr-12');

/* ══════════════════════════════════════════════════════════════════
   Avatar Harfi
   ══════════════════════════════════════════════════════════════════ */
function Avatar({ name, size = 40 }) {
    const initials = name
        ? name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : '?';
    const colors = [
        ['#1e40af', '#dbeafe'], ['#065f46', '#d1fae5'], ['#7c2d12', '#fee2e2'],
        ['#4c1d95', '#ede9fe'], ['#0c4a6e', '#e0f2fe'], ['#713f12', '#fef3c7'],
    ];
    const [fg, bg] = colors[name?.charCodeAt(0) % colors.length || 0];
    return (
        <div
            style={{ width: size, height: size, backgroundColor: bg, color: fg, borderRadius: size * 0.28 }}
            className="flex items-center justify-center font-black text-[14px] shrink-0 select-none"
        >
            {initials}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════
   Hızlı Oturum Kartı
   ══════════════════════════════════════════════════════════════════ */
function QuickSessionCard({ session, onSelect, onRemove }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="relative group"
        >
            <button
                type="button"
                onClick={() => onSelect(session)}
                className="w-full flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-200/80 bg-white/70 hover:bg-white hover:border-blue-300/60 hover:shadow-md transition-all duration-200 text-center"
            >
                <Avatar name={session.name} size={44} />
                <div className="w-full min-w-0">
                    <p className="text-[12px] font-bold text-slate-800 truncate leading-tight">
                        {session.name}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                        {session.email}
                    </p>
                </div>
            </button>
            {/* Kaldır butonu */}
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove(session.id); }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-[10px] font-bold"
                title="Bu oturumu kaldır"
            >
                ×
            </button>
        </motion.div>
    );
}

/* ══════════════════════════════════════════════════════════════════
   Ana Login Bileşeni
   ══════════════════════════════════════════════════════════════════ */
const Login = ({ onLogin }) => {
    const [mode, setMode] = useState('quick'); // 'quick' | 'form' | 'register' | 'selected'
    const [quickSessions, setQuickSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [errorType, setErrorType] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [confirmShake, setConfirmShake] = useState(false);
    const [isStarting, setIsStarting] = useState(false);

    // Hızlı oturumları yükle
    useEffect(() => {
        const sessions = getQuickSessions();
        setQuickSessions(sessions);
        // Hiç oturum yoksa direkt form moduna geç
        if (sessions.length === 0) setMode('form');
        else setMode('quick');
    }, []);

    const refreshSessions = () => {
        const sessions = getQuickSessions();
        setQuickSessions(sessions);
    };

    const handleRemoveSession = (id) => {
        removeQuickSession(id);
        refreshSessions();
        const updated = getQuickSessions();
        if (updated.length === 0) setMode('form');
    };

    const handleSelectSession = (session) => {
        setSelectedSession(session);
        setEmail(session.email);
        setPassword('');
        setError('');
        setMode('selected');
    };

    const handleBackToQuick = () => {
        setSelectedSession(null);
        setEmail('');
        setPassword('');
        setError('');
        setMode('quick');
    };

    // Şifre gücü (sadece kayıt)
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
        strengthScore === 0 ? 'bg-slate-200' :
            strengthScore === 1 ? 'bg-red-400' :
                strengthScore === 2 ? 'bg-amber-400' :
                    'bg-emerald-500';

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        const isRegister = mode === 'register';
        const loginEmail = email.trim();

        if (!loginEmail || !password) { setError('Lütfen e-posta ve şifrenizi girin.'); return; }

        if (isRegister) {
            if (!name) { setError('Lütfen ad soyad bilgisini girin.'); return; }
            if (strengthScore < 3) { setError('Şifre gereksinimlerini karşılamıyor.'); return; }
            if (password !== passwordConfirm) { setError('Şifreler birbiriyle uyuşmuyor.'); return; }
        }

        // Hem giriş hem kayıt için 5-limit kontrolü (listeye yeni ekleme olacaksa)
        if (isSessionLimitReached(loginEmail)) {
            setError(
                `Bu bilgisayarda en fazla ${MAX_SESSIONS} kayıtlı oturum tutulabilir. ` +
                'Yeni bir hesapla giriş yapmak için mevcut oturumlardan birini kaldırın.'
            );
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

            // Başarılı giriş veya kayıt → hızlı oturuma kaydet
            try {
                saveQuickSession({ ...data, eposta: data.eposta || loginEmail });
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

    /* ── Render ── */
    return (
        <div className="flex h-screen w-full items-center justify-center overflow-hidden font-sans bg-[#f8f9fa]">
            <motion.div className="relative w-full max-w-[440px] px-6"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>

                {isStarting && (
                    <style>{`@keyframes traceCCW { from { transform: translate(-50%,-50%) rotate(0deg); } to { transform: translate(-50%,-50%) rotate(-360deg); } }`}</style>
                )}

                <div className={`relative ${isStarting ? 'p-[2px] rounded-[14px] overflow-hidden' : ''}`}>
                    {isStarting && (
                        <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%]"
                            style={{ background: 'conic-gradient(from 0deg, transparent 75%, #b91c1c 100%)', animation: 'traceCCW 1.8s linear infinite', zIndex: 0 }}
                        />
                    )}

                    <div className={`relative z-10 backdrop-blur-[40px] px-9 pt-0 pb-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.12),inset_0_1px_2px_rgba(255,255,255,0.9)] overflow-hidden ${isStarting ? 'bg-[#f8f9fa] rounded-[12px]' : 'bg-white/85 rounded-xl border border-white/60'}`}>

                        {/* Logo */}
                        <div className="flex flex-col items-center justify-center mb-5">
                            <div className="flex items-center justify-center w-auto -mx-10 -mt-16 -mb-12 pointer-events-none">
                                <img src={logo} alt="SAP Yılgenci Logo"
                                    className="w-full h-auto object-contain mix-blend-multiply scale-[1.10]"
                                    onError={(e) => { e.target.style.display = 'none'; }} />
                            </div>
                            <h2 className="text-[22px] font-black tracking-tight text-slate-800">
                                {mode === 'register' ? 'Hesap Oluşturun' : 'Akıllı Çalışma Alanı'}
                            </h2>
                        </div>

                        {/* Hata Mesajı */}
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    key={error}
                                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    className={`relative mb-4 rounded-md text-sm font-semibold shadow-sm border overflow-hidden
                                        ${errorType === 'suspended' ? 'bg-amber-50 border-amber-300'
                                        : errorType === 'not_found' ? 'bg-blue-50 border-blue-200'
                                        : errorType === 'starting' ? 'bg-slate-50 border-slate-200'
                                        : errorType === 'limit' ? 'bg-orange-50 border-orange-200'
                                        : 'bg-red-50 border-red-200'}`}
                                >
                                    <div className={`h-1 w-full ${errorType === 'suspended' ? 'bg-amber-400'
                                        : errorType === 'not_found' ? 'bg-blue-400'
                                        : errorType === 'starting' ? 'bg-slate-400'
                                        : errorType === 'limit' ? 'bg-orange-400'
                                        : 'bg-red-400'}`} />
                                    <div className="flex items-start gap-3 p-3">
                                        <span className="text-xl shrink-0 mt-0.5">
                                            {errorType === 'suspended' ? '⚠️'
                                                : errorType === 'not_found' ? '🔍'
                                                : errorType === 'starting' ? '⏳'
                                                : errorType === 'limit' ? '🔒'
                                                : '🔐'}
                                        </span>
                                        <span className={`leading-snug text-[12px] ${errorType === 'suspended' ? 'text-amber-800'
                                            : errorType === 'not_found' ? 'text-blue-700'
                                            : errorType === 'starting' ? 'text-slate-600'
                                            : errorType === 'limit' ? 'text-orange-700'
                                            : 'text-red-600'}`}>
                                            {error}
                                        </span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ── MOD: Hızlı Oturum Seçimi ── */}
                        <AnimatePresence mode="wait">
                            {mode === 'quick' && (
                                <motion.div key="quick"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="flex flex-col gap-4"
                                >
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">
                                        Hızlı Oturum Aç
                                    </p>
                                    <div className={`grid gap-2.5 ${quickSessions.length === 1 ? 'grid-cols-1' : quickSessions.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                        <AnimatePresence>
                                            {quickSessions.map(sess => (
                                                <QuickSessionCard
                                                    key={sess.id}
                                                    session={sess}
                                                    onSelect={handleSelectSession}
                                                    onRemove={handleRemoveSession}
                                                />
                                            ))}
                                        </AnimatePresence>
                                    </div>

                                    {/* Oturum doluluk göstergesi */}
                                    {quickSessions.length > 0 && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${(quickSessions.length / MAX_SESSIONS) * 100}%`,
                                                        backgroundColor: quickSessions.length >= MAX_SESSIONS ? '#ef4444' : '#3b82f6',
                                                    }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 shrink-0">
                                                {quickSessions.length}/{MAX_SESSIONS}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 mt-1">
                                        <div className="flex-1 h-px bg-slate-100" />
                                        <button
                                            type="button"
                                            onClick={() => { setMode('form'); setEmail(''); setPassword(''); setError(''); }}
                                            className="text-[11px] font-bold text-slate-400 hover:text-blue-600 transition-colors whitespace-nowrap"
                                        >
                                            {quickSessions.length >= MAX_SESSIONS
                                                ? 'Oturum limiti dolu'
                                                : '+ Başka bir hesapla giriş yap'}
                                        </button>
                                        <div className="flex-1 h-px bg-slate-100" />
                                    </div>
                                </motion.div>
                            )}

                            {/* ── MOD: Seçili Oturum (şifre adımı) ── */}
                            {mode === 'selected' && selectedSession && (
                                <motion.div key="selected"
                                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                >
                                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                                        {/* Seçili kullanıcı kartı */}
                                        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200/60 rounded-xl">
                                            <Avatar name={selectedSession.name} size={40} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-bold text-slate-800 truncate">{selectedSession.name}</p>
                                                <p className="text-[11px] text-slate-400 truncate font-mono">{selectedSession.email}</p>
                                            </div>
                                            <button type="button" onClick={handleBackToQuick}
                                                className="text-[10px] font-bold text-slate-400 hover:text-blue-600 transition-colors shrink-0 px-2 py-1 rounded hover:bg-blue-50">
                                                Değiştir
                                            </button>
                                        </div>

                                        {/* Şifre */}
                                        <div className="group relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors z-10">
                                                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                            </div>
                                            <input autoFocus id="password-quick" type={showPassword ? 'text' : 'password'}
                                                value={password} onChange={e => setPassword(e.target.value)}
                                                className={INPUT_CLS_PR} placeholder=" " required />
                                            <label htmlFor="password-quick" className={LABEL_CLS}>Şifre</label>
                                            <button type="button" onClick={() => setShowPassword(v => !v)}
                                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-600 transition-colors z-10 outline-none">
                                                {showPassword
                                                    ? <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0l-3.59-3.59" /></svg>
                                                    : <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                }
                                            </button>
                                        </div>

                                        <button type="submit" disabled={isLoading}
                                            className={`w-full bg-slate-900 border border-slate-800 text-white font-bold tracking-widest uppercase text-xs py-3.5 rounded-md shadow-[0_4px_15px_-4px_rgba(0,0,0,0.4)] transition-all duration-300 ${isLoading ? 'opacity-70 cursor-wait' : 'hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.5)]'}`}>
                                            {isLoading ? 'BEKLEYİN...' : 'GİRİŞ YAP'}
                                        </button>
                                    </form>
                                </motion.div>
                            )}

                            {/* ── MOD: Tam Form (yeni hesap girişi) ── */}
                            {(mode === 'form' || mode === 'register') && (
                                <motion.div key="form"
                                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                >
                                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                                        {mode === 'register' && (
                                            <div className="group relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors z-10">
                                                    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                </div>
                                                <input id="name" type="text" value={name} onChange={e => setName(e.target.value)}
                                                    className={INPUT_CLS} placeholder=" " required />
                                                <label htmlFor="name" className={LABEL_CLS}>Ad Soyad</label>
                                            </div>
                                        )}

                                        <div className="group relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors z-10">
                                                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" /></svg>
                                            </div>
                                            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                                                className={INPUT_CLS} placeholder=" " required />
                                            <label htmlFor="email" className={LABEL_CLS}>Geçerli E-posta</label>
                                        </div>

                                        <div className="group relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors z-10">
                                                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                            </div>
                                            <input id="password" type={showPassword ? 'text' : 'password'} value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                className={INPUT_CLS_PR} placeholder=" " required />
                                            <label htmlFor="password" className={LABEL_CLS}>Şifre</label>
                                            <button type="button" onClick={() => setShowPassword(v => !v)}
                                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-600 transition-colors z-10 outline-none">
                                                {showPassword
                                                    ? <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0l-3.59-3.59" /></svg>
                                                    : <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                }
                                            </button>
                                        </div>

                                        {/* Şifre gücü */}
                                        {mode === 'register' && password.length > 0 && (
                                            <div className="-mt-1">
                                                <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100 mb-2.5">
                                                    <div className={`h-full transition-all duration-500 ease-out ${strengthBarColor}`}
                                                        style={{ width: `${(strengthScore / 3) * 100}%` }} />
                                                </div>
                                                <ul className="flex flex-col gap-1">
                                                    {strength.map((req, i) => (
                                                        <li key={i} className="flex items-center gap-2">
                                                            {req.met
                                                                ? <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                                : <svg className="w-3.5 h-3.5 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                                            }
                                                            <span className={`text-[11px] font-medium ${req.met ? 'text-emerald-600' : 'text-slate-400'}`}>{req.text}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Şifre tekrar */}
                                        {mode === 'register' && (
                                            <div className="group relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-600 transition-colors z-10">
                                                    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                                </div>
                                                <motion.input
                                                    id="passwordConfirm" type={showPassword ? 'text' : 'password'}
                                                    value={passwordConfirm} onChange={handleConfirmChange}
                                                    placeholder=" " required
                                                    className={`peer ${INPUT_CLS_PR}`}
                                                    animate={{
                                                        x: confirmShake ? [-8, 8, -6, 6, -4, 4, 0] : 0,
                                                        borderColor: passwordsMatch ? 'rgb(34 197 94)' : 'rgb(226 232 240)',
                                                    }}
                                                    transition={{ duration: 0.4 }}
                                                />
                                                <label htmlFor="passwordConfirm" className={LABEL_CLS}>Şifre Tekrar</label>
                                                {password.length > 0 && (
                                                    <div className="absolute bottom-[7px] left-11 right-4 flex gap-[3px] pointer-events-none z-10">
                                                        {password.split('').map((letter, i) => (
                                                            <div key={i} className={`h-[3px] flex-1 rounded-full transition-all duration-200 ${passwordConfirm[i] === letter ? 'bg-green-500' : passwordConfirm[i] ? 'bg-red-400' : 'bg-slate-200'}`} />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {mode === 'form' && (
                                            <div className="flex justify-end -mt-2 mr-1">
                                                <a href="#" className="relative text-[11px] text-blue-600 hover:text-blue-800 font-bold transition-colors after:content-[''] after:absolute after:-bottom-0.5 after:left-0 after:w-0 after:h-[1px] after:bg-blue-600 hover:after:w-full after:transition-all after:duration-300">
                                                    Şifremi Mi Unuttum?
                                                </a>
                                            </div>
                                        )}

                                        <div className="flex gap-3 mt-1">
                                            {quickSessions.length > 0 && (
                                                <button type="button" onClick={() => { setMode('quick'); setError(''); }}
                                                    className="flex-[0.6] bg-white/50 text-slate-700 border border-slate-200/60 font-bold uppercase text-[10px] tracking-wider py-3.5 rounded-md shadow-sm hover:bg-white/90 hover:shadow-md transition-all duration-300">
                                                    ← Geri
                                                </button>
                                            )}
                                            <button type="button"
                                                onClick={() => { setMode(mode === 'register' ? 'form' : 'register'); setError(''); }}
                                                className="flex-[0.8] bg-white/50 text-slate-700 border border-slate-200/60 font-bold uppercase text-[11px] tracking-wider py-3.5 rounded-md shadow-sm hover:bg-white/90 hover:shadow-md transition-all duration-300">
                                                {mode === 'register' ? 'GİRİŞE DÖN' : 'YENİ KAYIT'}
                                            </button>
                                            <button type="submit" disabled={isLoading}
                                                className={`flex-[1.2] bg-slate-900 border border-slate-800 text-white font-bold tracking-widest uppercase text-xs py-3.5 rounded-md shadow-[0_4px_15px_-4px_rgba(0,0,0,0.4)] transition-all duration-300 ${isLoading ? 'opacity-70 cursor-wait' : 'hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.5)]'}`}>
                                                {isLoading ? 'BEKLEYİN...' : mode === 'register' ? 'Hesabı Aç' : 'GİRİŞ YAP'}
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>

                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
