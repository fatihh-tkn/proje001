import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import logo from '../../assets/sap yılgenci logo.png';

// Dolu/focus → border çizgisinin üstünde  |  Boş → input içinde (placeholder gibi)
const LABEL_CLS =
    'absolute z-10 pointer-events-none transition-all duration-200 ' +
    // Dolu hâl (default): border üstünde
    'top-0 left-3 -translate-y-1/2 scale-[0.78] ' +
    'text-[11px] font-bold uppercase tracking-wider text-slate-500 ' +
    // Boş hâl: input içinde, icon yanında
    'peer-placeholder-shown:top-1/2 peer-placeholder-shown:left-11 ' +
    'peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 ' +
    'peer-placeholder-shown:text-[13px] peer-placeholder-shown:normal-case ' +
    'peer-placeholder-shown:font-semibold peer-placeholder-shown:tracking-normal ' +
    'peer-placeholder-shown:text-slate-400 ' +
    // Focus: boş olsa bile border üstüne çık
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

const INPUT_CLS_PR = INPUT_CLS.replace('pr-4', 'pr-12'); // şifre alanları için gözet ikonu boşluğu

const Login = ({ onLogin }) => {
    const [isRegisterMode, setIsRegisterMode] = useState(false);
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

    // Şifre gücü kontrolü (sadece kayıt modunda aktif)
    const REQUIREMENTS = [
        { regex: /.{8,}/,  text: 'En az 8 karakter' },
        { regex: /[A-Z]/,  text: 'En az 1 büyük harf' },
        { regex: /[0-9]/,  text: 'En az 1 rakam' },
    ];

    const strength = useMemo(() =>
        REQUIREMENTS.map(r => ({ met: r.regex.test(password), text: r.text })),
    [password]);

    const strengthScore = strength.filter(r => r.met).length;

    const strengthBarColor =
        strengthScore === 0 ? 'bg-slate-200' :
        strengthScore === 1 ? 'bg-red-400'   :
        strengthScore === 2 ? 'bg-amber-400'  :
                              'bg-emerald-500';

    // Şifre tekrar: uzunluk sınırı aşılırsa salla, eşleşme durumunu hesapla
    const passwordsMatch = password.length > 0 && password === passwordConfirm;

    const getLetterStatus = (index) => {
        if (!passwordConfirm[index]) return '';
        return passwordConfirm[index] === password[index] ? 'bg-green-500/25' : 'bg-red-500/25';
    };

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

        if (!email || !password) { setError('Lütfen e-posta ve şifrenizi girin.'); return; }
        if (isRegisterMode) {
            if (!name) { setError('Lütfen ad soyad bilgisini girin.'); return; }
            if (strengthScore < 3) { setError('Şifre gereksinimlerini karşılamıyor.'); return; }
            if (password !== passwordConfirm) { setError('Şifreler birbiriyle uyuşmuyor. Kontrol ediniz.'); return; }
        }

        setError('');
        setIsStarting(false);
        setIsLoading(true);
        try {
            const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
            const payload = isRegisterMode
                ? { tam_ad: name, eposta: email, sifre: password }
                : { eposta: email, sifre: password };

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
            onLogin(data);
        } catch {
            setError('Sunucu ile bağlantı kurulamadı.');
            setErrorType('generic');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full items-center justify-center overflow-hidden font-sans bg-[#f8f9fa]">
            <motion.div className="relative w-full max-w-[420px] px-6"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>

                    {/* Sistem başlatılıyor animasyonu — yalnızca 503 geldiğinde */}
                    {isStarting && (
                        <style>{`
                            @keyframes traceCCW {
                                from { transform: rotate(0deg); }
                                to   { transform: rotate(-360deg); }
                            }
                        `}</style>
                    )}

                    {/* Kart */}
                    <div
                        className="rounded-xl"
                        style={isStarting ? {
                            padding: '2px',
                            background: 'conic-gradient(from 0deg, transparent 96%, #b91c1c 96%, #b91c1c 100%)',
                            animation: 'traceCCW 2.2s linear infinite',
                        } : {}}
                    >
                    <div className={`relative bg-white/85 backdrop-blur-[40px] px-9 pt-0 pb-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.12),inset_0_1px_2px_rgba(255,255,255,0.9)] overflow-hidden ${isStarting ? 'rounded-[10px]' : 'rounded-xl border border-white/60'}`}>

                        {/* Header */}
                        <div className="flex flex-col items-center justify-center mb-5">
                            <div className="flex items-center justify-center w-auto -mx-10 -mt-16 -mb-12 pointer-events-none">
                                <img src={logo} alt="SAP Yılgenci Logo"
                                    className="w-full h-auto object-contain mix-blend-multiply scale-[1.10]"
                                    onError={(e) => { e.target.style.display = 'none'; }} />
                            </div>
                            <h2 className="text-[22px] font-black tracking-tight text-slate-800">
                                {isRegisterMode ? "Hesap Oluşturun" : "Akıllı Çalışma Alanı"}
                            </h2>
                        </div>

                        {error && (
                            <div className={`relative mb-4 rounded-md text-sm font-semibold shadow-sm border overflow-hidden ${
                                errorType === 'suspended' ? 'bg-amber-50 border-amber-300'
                                : errorType === 'not_found' ? 'bg-blue-50 border-blue-200'
                                : errorType === 'starting' ? 'bg-slate-50 border-slate-200'
                                : 'bg-red-50 border-red-200'}`}>
                                <div className={`h-1 w-full ${
                                    errorType === 'suspended' ? 'bg-amber-400'
                                    : errorType === 'not_found' ? 'bg-blue-400'
                                    : errorType === 'starting' ? 'bg-slate-400'
                                    : 'bg-red-400'}`} />
                                <div className="flex items-start gap-3 p-3">
                                    <span className="text-xl shrink-0 mt-0.5">
                                        {errorType === 'suspended' ? '⚠️'
                                        : errorType === 'not_found' ? '🔍'
                                        : errorType === 'starting' ? '⏳'
                                        : '🔐'}
                                    </span>
                                    <span className={`leading-snug text-[12px] ${
                                        errorType === 'suspended' ? 'text-amber-800'
                                        : errorType === 'not_found' ? 'text-blue-700'
                                        : errorType === 'starting' ? 'text-slate-600'
                                        : 'text-red-600'}`}>
                                        {error}
                                    </span>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="relative flex flex-col gap-5">

                            {/* Ad Soyad */}
                            {isRegisterMode && (
                                <div className="group relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors duration-200 z-10">
                                        <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <input id="name" type="text" value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className={INPUT_CLS} placeholder=" " required={isRegisterMode} />
                                    <label htmlFor="name" className={LABEL_CLS}>Ad Soyad</label>
                                </div>
                            )}

                            {/* E-posta */}
                            <div className="group relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors duration-200 z-10">
                                    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                    </svg>
                                </div>
                                <input id="email" type="email" value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={INPUT_CLS} placeholder=" " required />
                                <label htmlFor="email" className={LABEL_CLS}>Geçerli E-posta</label>
                            </div>

                            {/* Şifre */}
                            <div className="group relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors duration-200 z-10">
                                    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <input id="password" type={showPassword ? 'text' : 'password'} value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={INPUT_CLS_PR} placeholder=" " required />
                                <label htmlFor="password" className={LABEL_CLS}>Şifre</label>
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-600 transition-colors z-10 outline-none"
                                    title={showPassword ? "Gizle" : "Göster"}>
                                    {showPassword ? (
                                        <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0l-3.59-3.59" />
                                        </svg>
                                    ) : (
                                        <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>

                            {/* Şifre gücü göstergesi — sadece kayıt modunda, şifre girilince */}
                            {isRegisterMode && password.length > 0 && (
                                <div className="-mt-1">
                                    {/* Progress bar */}
                                    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100 mb-2.5">
                                        <div
                                            className={`h-full transition-all duration-500 ease-out ${strengthBarColor}`}
                                            style={{ width: `${(strengthScore / 3) * 100}%` }}
                                        />
                                    </div>
                                    {/* Gereksinim listesi */}
                                    <ul className="flex flex-col gap-1">
                                        {strength.map((req, i) => (
                                            <li key={i} className="flex items-center gap-2">
                                                {req.met ? (
                                                    <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-3.5 h-3.5 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                )}
                                                <span className={`text-[11px] font-medium transition-colors duration-200 ${req.met ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    {req.text}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Şifre Tekrar */}
                            {isRegisterMode && (
                                <div className="group relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-600 transition-colors duration-200 z-10">
                                        <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                    </div>
                                    <motion.input
                                        id="passwordConfirm"
                                        type={showPassword ? 'text' : 'password'}
                                        value={passwordConfirm}
                                        onChange={handleConfirmChange}
                                        placeholder=" "
                                        required={isRegisterMode}
                                        className={`peer ${INPUT_CLS_PR}`}
                                        animate={{
                                            x: confirmShake ? [-8, 8, -6, 6, -4, 4, 0] : 0,
                                            borderColor: passwordsMatch
                                                ? 'rgb(34 197 94)'
                                                : 'rgb(226 232 240)',
                                        }}
                                        transition={{ duration: 0.4 }}
                                    />
                                    <label htmlFor="passwordConfirm" className={LABEL_CLS}>Şifre Tekrar</label>

                                    {/* Karakter eşleşme — input içinde alt kenarda */}
                                    {password.length > 0 && (
                                        <div className="absolute bottom-[7px] left-11 right-4 flex gap-[3px] pointer-events-none z-10">
                                            {password.split('').map((letter, i) => (
                                                <div
                                                    key={i}
                                                    className={`h-[3px] flex-1 rounded-full transition-all duration-200 ${
                                                        passwordConfirm[i] === letter ? 'bg-green-500' :
                                                        passwordConfirm[i]            ? 'bg-red-400'   :
                                                                                        'bg-slate-200'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {!isRegisterMode && (
                                <div className="flex justify-end -mt-2 mr-1">
                                    <a href="#" className="relative text-[11px] text-blue-600 hover:text-blue-800 transition-colors font-bold z-10
                                        after:content-[''] after:absolute after:-bottom-0.5 after:left-0 after:w-0 after:h-[1px] after:bg-blue-600 hover:after:w-full after:transition-all after:duration-300">
                                        Şifremi Mi Unuttum?
                                    </a>
                                </div>
                            )}

                            <div className="flex gap-3 mt-1">
                                <button type="button" onClick={() => setIsRegisterMode(!isRegisterMode)}
                                    className="flex-[0.8] relative overflow-hidden bg-white/50 text-slate-700 border border-slate-200/60 font-bold uppercase text-[11px] tracking-wider py-3.5 rounded-md shadow-sm transform hover:-translate-y-0.5 active:translate-y-0 hover:bg-white/90 hover:shadow-md transition-all duration-300">
                                    {isRegisterMode ? "GİRİŞE DÖN" : "YENİ KAYIT"}
                                </button>
                                <button type="submit" disabled={isLoading}
                                    className={`flex-[1.2] relative overflow-hidden bg-slate-900 border border-slate-800 text-white font-bold tracking-widest uppercase text-xs py-3.5 rounded-md shadow-[0_4px_15px_-4px_rgba(0,0,0,0.4)] transform transition-all duration-300 ${isLoading ? 'opacity-70 cursor-wait' : 'hover:-translate-y-0.5 active:translate-y-0 hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.5)]'}`}>
                                    {isLoading ? "BEKLEYİN..." : (isRegisterMode ? "Hesabı Aç" : "GİRİŞ YAP")}
                                </button>
                            </div>
                        </form>
                    </div>
                    </div>{/* gradient wrapper kapanışı */}
            </motion.div>
        </div>
    );
};

export default Login;
