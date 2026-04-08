import React, { useState } from 'react';
import logo from '../../assets/sap yılgenci logo.png';

const Login = ({ onLogin }) => {
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email || !password) {
            setError('Lütfen e-posta ve şifrenizi girin.');
            return;
        }

        if (isRegisterMode) {
            if (!name) {
                setError('Lütfen ad soyad bilgisini girin.');
                return;
            }
            if (password !== passwordConfirm) {
                setError('Şifreler birbiriyle uyuşmuyor. Kontrol ediniz.');
                return;
            }
        }

        setError('');
        setIsLoading(true);

        try {
            const endpoint = isRegisterMode ? 'http://localhost:8000/api/auth/register' : 'http://localhost:8000/api/auth/login';
            const payload = isRegisterMode
                ? { tam_ad: name, eposta: email, sifre: password }
                : { eposta: email, sifre: password };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.detail || 'Bir hata oluştu.');
                return;
            }

            // Başarılı (kimlik, tam_ad gibi bilgiler data içinde)
            onLogin(data);
        } catch (err) {
            setError('Sunucu ile bağlantı kurulamadı. Backend kapalı.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-[420px] animate-fade-in-up mx-auto">
            {/* Premium Enterprise Workspace Kartı */}
            <div className="relative bg-white/85 backdrop-blur-[40px] px-9 pt-0 pb-6 rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8),inset_0_1px_2px_rgba(255,255,255,0.9)] border border-white/40 overflow-hidden">

                {/* Header Alanı */}
                <div className="flex flex-col items-center justify-center mb-3">
                    {/* Logo (SAP Yılgenci) */}
                    <div className="flex items-center justify-center w-auto -mx-10 -mt-16 -mb-12 pointer-events-none">
                        <img src={logo} alt="SAP Yılgenci Logo" className="w-full h-auto object-contain mix-blend-multiply scale-[1.10]" onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>

                    <h2 className="text-[22px] font-black tracking-tight text-slate-800">
                        {isRegisterMode ? "Hesap Oluşturun" : "Akıllı Çalışma Alanı"}
                    </h2>

                </div>

                {error && (
                    <div className="relative mb-5 p-3 bg-red-50/90 border border-red-200 text-red-600 rounded-xl text-sm text-center font-semibold animate-pulse shadow-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="relative flex flex-col gap-4">
                    {/* İsim Alanı (Sadece Kayıt Modunda) */}
                    {isRegisterMode && (
                        <div className="group relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors duration-300 z-10">
                                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="peer w-full pl-11 pr-4 pt-6 pb-2.5 bg-white/80 border border-slate-200/80 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 focus:bg-white transition-all font-semibold text-slate-800 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01),0_1px_3px_rgba(0,0,0,0.02)] hover:bg-white/90"
                                placeholder=" "
                                required={isRegisterMode}
                            />
                            <label
                                htmlFor="name"
                                className="absolute text-slate-500 duration-300 transform -translate-y-2 scale-[0.80] top-4 z-10 origin-[0] left-11 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0.5 peer-focus:scale-[0.80] peer-focus:-translate-y-2 peer-autofill:scale-[0.80] peer-autofill:-translate-y-2 peer-focus:text-blue-600 font-bold uppercase tracking-wider pointer-events-none"
                            >
                                Ad Soyad
                            </label>
                        </div>
                    )}

                    {/* E-posta Alanı */}
                    <div className="group relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors duration-300 z-10">
                            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                            </svg>
                        </div>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="peer w-full pl-11 pr-4 pt-6 pb-2.5 bg-white/80 border border-slate-200/80 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 focus:bg-white transition-all font-semibold text-slate-800 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01),0_1px_3px_rgba(0,0,0,0.02)] hover:bg-white/90"
                            placeholder=" "
                            required
                        />
                        <label
                            htmlFor="email"
                            className="absolute text-slate-500 duration-300 transform -translate-y-2 scale-[0.80] top-4 z-10 origin-[0] left-11 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0.5 peer-focus:scale-[0.80] peer-focus:-translate-y-2 peer-autofill:scale-[0.80] peer-autofill:-translate-y-2 peer-focus:text-blue-600 font-bold uppercase tracking-wider pointer-events-none"
                        >
                            Geçerli E-posta
                        </label>
                    </div>

                    {/* Şifre Alanı */}
                    <div className="group relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors duration-300 z-10">
                            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="peer w-full pl-11 pr-12 pt-6 pb-2.5 bg-white/80 border border-slate-200/80 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 focus:bg-white transition-all font-semibold text-slate-800 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01),0_1px_3px_rgba(0,0,0,0.02)] hover:bg-white/90"
                            placeholder=" "
                            required
                        />
                        <label
                            htmlFor="password"
                            className="absolute text-slate-500 duration-300 transform -translate-y-2 scale-[0.80] top-4 z-10 origin-[0] left-11 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0.5 peer-focus:scale-[0.80] peer-focus:-translate-y-2 peer-autofill:scale-[0.80] peer-autofill:-translate-y-2 peer-focus:text-blue-600 font-bold uppercase tracking-wider pointer-events-none"
                        >
                            Şifre
                        </label>

                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-600 transition-colors z-10 outline-none"
                            title={showPassword ? "Gizle" : "Göster"}
                        >
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

                    {/* Şifre Tekrar Alanı (Sadece Yeni Kayıt İçin) */}
                    {isRegisterMode && (
                        <div className="group relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors duration-300 z-10">
                                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <input
                                id="passwordConfirm"
                                type={showPassword ? 'text' : 'password'}
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value)}
                                className="peer w-full pl-11 pr-12 pt-6 pb-2.5 bg-white/80 border border-slate-200/80 rounded-[1.25rem] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 focus:bg-white transition-all font-semibold text-slate-800 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01),0_1px_3px_rgba(0,0,0,0.02)] hover:bg-white/90"
                                placeholder=" "
                                required={isRegisterMode}
                            />
                            <label
                                htmlFor="passwordConfirm"
                                className="absolute text-slate-500 duration-300 transform -translate-y-2 scale-[0.80] top-4 z-10 origin-[0] left-11 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0.5 peer-focus:scale-[0.80] peer-focus:-translate-y-2 peer-autofill:scale-[0.80] peer-autofill:-translate-y-2 peer-focus:text-blue-600 font-bold uppercase tracking-wider pointer-events-none"
                            >
                                Şifre Tekrar
                            </label>
                        </div>
                    )}

                    {!isRegisterMode && (
                        <div className="flex justify-end -mt-3 mr-1">
                            <a href="#" className="relative text-[11px] text-blue-600 hover:text-blue-800 transition-colors font-bold z-10 
                                    after:content-[''] after:absolute after:-bottom-0.5 after:left-0 after:w-0 after:h-[1px] after:bg-blue-600 hover:after:w-full after:transition-all after:duration-300">
                                Şifremi Mi Unuttum?
                            </a>
                        </div>
                    )}

                    {/* Butonlar Grubu (Kurumsal) */}
                    <div className="flex gap-3 mt-1">
                        {/* İkincil Buton / Moda Geçiş */}
                        <button
                            type="button"
                            onClick={() => setIsRegisterMode(!isRegisterMode)}
                            className="flex-[0.8] relative overflow-hidden bg-white/50 text-slate-700 border border-slate-200/60 font-bold uppercase text-[11px] tracking-wider py-3.5 rounded-[1rem] shadow-sm transform hover:-translate-y-0.5 active:translate-y-0 hover:bg-white/90 hover:shadow-md transition-all duration-300"
                        >
                            {isRegisterMode ? "GİRİŞE DÖN" : "YENİ KAYIT"}
                        </button>

                        {/* Ana Aksiyon Butonu */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`flex-[1.2] relative overflow-hidden bg-slate-900 border border-slate-800 text-white font-bold tracking-widest uppercase text-xs py-3.5 rounded-[1rem] shadow-[0_4px_15px_-4px_rgba(0,0,0,0.4)] transform transition-all duration-300 ${isLoading ? 'opacity-70 cursor-wait' : 'hover:-translate-y-0.5 active:translate-y-0 hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.5)]'}`}
                        >
                            {isLoading ? "BEKLEYİN..." : (isRegisterMode ? "Hesabı Aç" : "GİRİŞ YAP")}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
};

export default Login;
