import React, { useState } from 'react';
import { User, Heart, MapPin, Bell, ChevronRight, Check } from 'lucide-react';

const INTERESTS = [
    { label: 'Yapay Zeka', icon: '🤖' },
    { label: 'Yazılım', icon: '💻' },
    { label: 'Sanat & Tasarım', icon: '🎨' },
    { label: 'Finans & Ekonomi', icon: '📈' },
    { label: 'Bilim', icon: '🔬' },
    { label: 'Verimlilik', icon: '⚡' },
    { label: 'Eğitim', icon: '📚' },
    { label: 'Spor', icon: '⚽' },
    { label: 'Müzik', icon: '🎵' },
];

export default function OnboardingWizard({ user, onComplete }) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        birthDate: '',
        gender: '',
        interests: [],
        location: '',
        prefs: {
            email: true,
            sms: false,
        }
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleInterestToggle = (label) => {
        setFormData(prev => ({
            ...prev,
            interests: prev.interests.includes(label)
                ? prev.interests.filter(i => i !== label)
                : [...prev.interests, label]
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/auth/users/${user.id}/meta`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...(user.meta || {}),
                    ...formData,
                    onboarding_completed: true,
                })
            });

            if (res.ok) {
                onComplete({
                    ...(user.meta || {}),
                    ...formData,
                    onboarding_completed: true,
                });
            }
        } catch (err) {
            console.error('Onboarding kaydedilemedi:', err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-200">

                {/* Stepper Header */}
                <div className="bg-stone-50 border-b border-stone-200 px-6 py-4 flex items-center justify-between">
                    <div className="flex gap-2">
                        {[1, 2, 3].map(s => (
                            <div
                                key={s}
                                className={`h-1.5 w-8 rounded-full transition-all duration-300 ${s <= step ? 'bg-[#378ADD]' : 'bg-stone-200'
                                    }`}
                            />
                        ))}
                    </div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Adım {step} / 3</span>
                </div>

                <div className="p-8">
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <h1 className="text-xl font-black text-stone-800 tracking-tight">Seni biraz tanıyalım</h1>
                                <p className="text-sm text-stone-500">Deneyimini kişiselleştirmemiz için temel bilgilerine ihtiyacımız var.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Doğum Tarihi</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={formData.birthDate}
                                            onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                                            className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-sm text-stone-700 focus:outline-none focus:border-[#378ADD] transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Cinsiyet</label>
                                    <select
                                        value={formData.gender}
                                        onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                        className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-sm text-stone-700 focus:outline-none focus:border-[#378ADD] transition-colors appearance-none"
                                    >
                                        <option value="">Seçiniz</option>
                                        <option value="Erkek">Erkek</option>
                                        <option value="Kadın">Kadın</option>
                                        <option value="Diğer">Diğer</option>
                                        <option value="Belirtmek İstemiyorum">Belirtmek İstemiyorum</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Lokasyon (Şehir, Ülke)</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3.5 text-stone-300" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Örn: İstanbul, Türkiye"
                                            value={formData.location}
                                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                                            className="w-full bg-stone-50 border border-stone-200 rounded-lg pl-10 pr-4 py-3 text-sm text-stone-700 focus:outline-none focus:border-[#378ADD] transition-colors placeholder:text-stone-300"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <h1 className="text-xl font-black text-stone-800 tracking-tight">İlgi Alanların</h1>
                                <p className="text-sm text-stone-500">Sana en uygun eğitim ve araçları önermemize yardımcı ol.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {INTERESTS.map(item => (
                                    <button
                                        key={item.label}
                                        onClick={() => handleInterestToggle(item.label)}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[12px] font-medium transition-all ${formData.interests.includes(item.label)
                                                ? 'bg-[#378ADD]/10 border-[#378ADD] text-[#378ADD]'
                                                : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                                            }`}
                                    >
                                        <span>{item.icon}</span>
                                        <span>{item.label}</span>
                                        {formData.interests.includes(item.label) && <Check size={12} className="ml-auto" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <h1 className="text-xl font-black text-stone-800 tracking-tight">Tercihlerini Belirle</h1>
                                <p className="text-sm text-stone-500">Nasıl iletişimde kalalım?</p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                            <Bell size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-bold text-stone-700">Akıllı Öneriler</p>
                                            <p className="text-[11px] text-stone-400">Yapay zeka ipuçları ve haftalık bülten.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setFormData({ ...formData, prefs: { ...formData.prefs, email: !formData.prefs.email } })}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${formData.prefs.email ? 'bg-[#1D9E75]' : 'bg-stone-300'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.prefs.email ? 'right-1' : 'left-1'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                                            <Bell size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-bold text-stone-700">SMS Bildirimleri</p>
                                            <p className="text-[11px] text-stone-400">Önemli duyurular ve doğrulama kodları.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setFormData({ ...formData, prefs: { ...formData.prefs, sms: !formData.prefs.sms } })}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${formData.prefs.sms ? 'bg-[#1D9E75]' : 'bg-stone-300'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.prefs.sms ? 'right-1' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="bg-stone-50 border-t border-stone-200 p-6 flex justify-between items-center">
                    {step > 1 ? (
                        <button
                            onClick={() => setStep(step - 1)}
                            className="text-stone-400 hover:text-stone-700 text-sm font-bold transition-colors"
                        >
                            Geri Dön
                        </button>
                    ) : <div />}

                    <button
                        onClick={() => step < 3 ? setStep(step + 1) : handleSave()}
                        disabled={isSaving}
                        className="bg-[#378ADD] hover:bg-[#2d74b9] text-white px-8 py-2.5 rounded-xl text-sm font-black transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                    >
                        {isSaving ? 'Kaydediliyor...' : step === 3 ? 'Hadi Başlayalım!' : 'Devam Et'}
                        {step < 3 && <ChevronRight size={16} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
