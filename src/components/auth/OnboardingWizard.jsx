import React, { useState } from 'react';
import {
    User, Sparkles, Bell, Calendar, MapPin,
    ChevronRight, Check, ArrowRight,
    Briefcase, BookOpen, Code2, Palette, BarChart2, Globe,
} from 'lucide-react';
import { mutation } from '../../api/client';

/* ─── Inline accent helper ─────────────────────────────────────── */
// CSS değişkeni --th-tab-active-bg tema rengi (kırmızı/mavi/yeşil vb.)
const ACCENT = 'var(--th-tab-active-bg)';

/* ─── Adım tanımları ─────────────────────────────────────────────── */
const STEPS = [
    { label: 'Profil' },
    { label: 'İlgi Alanları' },
    { label: 'Tercihler' },
];

/* ─── Step Tabs ──────────────────────────────────────────────────── */
function StepTabs({ step }) {
    return (
        <div className="flex items-center gap-2">
            {STEPS.map((s, i) => {
                const active = i === step;
                const done = i < step;
                return (
                    <React.Fragment key={i}>
                        <div
                            className={`flex items-center gap-2 rounded-full transition-all
                ${active ? 'px-3 py-1.5 pr-3.5 text-white' : 'px-2.5 py-1.5'}
                ${done
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                    : active
                                        ? 'text-white'
                                        : 'bg-slate-100 text-slate-500 border border-slate-200/70'
                                }`}
                            style={active ? { background: ACCENT } : {}}
                        >
                            <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold
                  ${active ? 'bg-white/25 text-white' : done ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}
                            >
                                {done ? <Check size={11} strokeWidth={3} /> : i + 1}
                            </span>
                            {active && <span className="text-[12px] font-semibold tracking-tight">{s.label}</span>}
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={`h-px w-4 ${i < step ? 'bg-emerald-200' : 'bg-slate-200'}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

/* ─── Form primitifleri ──────────────────────────────────────────── */
function Label({ children }) {
    return (
        <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 mb-1.5">
            {children}
        </label>
    );
}
function Field({ children, icon }) {
    return (
        <div className="relative">
            {icon && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    {icon}
                </div>
            )}
            {children}
        </div>
    );
}
const inputCls =
    'w-full bg-white border border-slate-200 rounded-lg text-[13px] text-slate-800 placeholder-slate-400 px-3.5 py-2.5 transition outline-none focus:border-[var(--th-tab-active-bg)] focus:ring-2 focus:ring-[var(--th-tab-active-bg)]/10';
const inputClsIcon = inputCls + ' pl-9';

/* ─── Chip grubu ─────────────────────────────────────────────────── */
function ChipGroup({ options, value, onChange, multi = false }) {
    const isActive = (v) => (multi ? value?.includes(v) : value === v);
    const toggle = (v) => {
        if (multi) {
            const next = value?.includes(v) ? value.filter((x) => x !== v) : [...(value || []), v];
            onChange(next);
        } else {
            onChange(v);
        }
    };
    return (
        <div className="flex flex-wrap gap-1.5">
            {options.map((o) => {
                const active = isActive(o.value);
                return (
                    <button
                        key={o.value}
                        type="button"
                        onClick={() => toggle(o.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all
              ${active
                                ? 'text-white border-transparent shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                        style={active ? { background: ACCENT } : {}}
                    >
                        {o.icon && React.cloneElement(o.icon, { size: 13 })}
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}

/* ─── İlgi alanı kartı (Step 2) ──────────────────────────────────── */
function InterestCard({ icon, label, hint, selected, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`text-left p-3.5 rounded-xl border transition-all group relative overflow-hidden
        ${selected
                    ? 'bg-white border-transparent shadow-sm ring-1'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
            style={
                selected
                    ? { boxShadow: `0 0 0 1px ${ACCENT}, 0 1px 2px rgba(15,23,42,0.04)` }
                    : {}
            }
        >
            <div className="flex items-center gap-2.5 mb-1.5">
                <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
            ${selected ? '' : 'bg-slate-50 border border-slate-100 text-slate-500'}`}
                    style={
                        selected
                            ? { background: ACCENT + '12', color: ACCENT, border: `1px solid ${ACCENT}33` }
                            : {}
                    }
                >
                    {React.cloneElement(icon, { size: 16 })}
                </div>
                <span className="text-[13px] font-semibold text-slate-800">{label}</span>
                {selected && (
                    <span
                        className="ml-auto w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0"
                        style={{ background: ACCENT }}
                    >
                        <Check size={10} strokeWidth={3.5} />
                    </span>
                )}
            </div>
            <div className="text-[11px] text-slate-500 leading-relaxed pl-[42px]">{hint}</div>
        </button>
    );
}

/* ─── Toggle satırı ──────────────────────────────────────────────── */
function ToggleRow({ title, hint, on, onChange }) {
    return (
        <div className="flex items-center justify-between px-3.5 py-3">
            <div className="pr-4">
                <div className="text-[12.5px] font-medium text-slate-800">{title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{hint}</div>
            </div>
            <button
                type="button"
                onClick={() => onChange(!on)}
                className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${on ? '' : 'bg-slate-200'}`}
                style={on ? { background: ACCENT } : {}}
            >
                <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform
            ${on ? 'translate-x-4' : 'translate-x-0'}`}
                />
            </button>
        </div>
    );
}

/* ─── Adım 1 ─────────────────────────────────────────────────────── */
function Step1({ data, set }) {
    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                    <User size={18} />
                </div>
                <div>
                    <h2 className="text-[18px] font-semibold tracking-tight text-slate-800">
                        Seni biraz tanıyalım
                    </h2>
                    <p className="text-[12.5px] text-slate-500 leading-relaxed mt-0.5 max-w-md">
                        Deneyimini kişiselleştirmemiz için birkaç temel bilgiye ihtiyacımız var.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                    <Label>Doğum Tarihi</Label>
                    <Field icon={<Calendar size={14} />}>
                        <input
                            type="date"
                            value={data.birth}
                            onChange={(e) => set('birth', e.target.value)}
                            className={inputClsIcon}
                        />
                    </Field>
                </div>
                <div>
                    <Label>Cinsiyet</Label>
                    <Field>
                        <select
                            value={data.gender}
                            onChange={(e) => set('gender', e.target.value)}
                            className={inputCls + ' appearance-none pr-9'}
                        >
                            <option value="">Seçiniz</option>
                            <option value="f">Kadın</option>
                            <option value="m">Erkek</option>
                            <option value="o">Diğer</option>
                            <option value="n">Belirtmek istemiyorum</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90">
                            <ChevronRight size={12} />
                        </div>
                    </Field>
                </div>
            </div>

            <div>
                <Label>Lokasyon (Şehir, Ülke)</Label>
                <Field icon={<MapPin size={14} />}>
                    <input
                        type="text"
                        value={data.location}
                        onChange={(e) => set('location', e.target.value)}
                        placeholder="Örn: İstanbul, Türkiye"
                        className={inputClsIcon}
                    />
                </Field>
            </div>

            <div>
                <Label>Mesleki Alan</Label>
                <ChipGroup
                    value={data.role}
                    onChange={(v) => set('role', v)}
                    options={[
                        { value: 'pro',    label: 'Profesyonel',  icon: <Briefcase /> },
                        { value: 'edu',    label: 'Öğrenci',       icon: <BookOpen /> },
                        { value: 'dev',    label: 'Geliştirici',   icon: <Code2 /> },
                        { value: 'design', label: 'Tasarımcı',     icon: <Palette /> },
                        { value: 'other',  label: 'Diğer' },
                    ]}
                />
            </div>
        </div>
    );
}

/* ─── Adım 2 ─────────────────────────────────────────────────────── */
function Step2({ data, set }) {
    const toggle = (v) => {
        const cur = data.interests || [];
        set('interests', cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
    };
    const options = [
        { v: 'research',   label: 'Araştırma',          hint: 'Derin analiz, kaynak tarama ve rapor üretimi.',     icon: <BookOpen /> },
        { v: 'dev',        label: 'Yazılım Geliştirme', hint: 'Kod üretimi, hata ayıklama ve mimari tasarım.',      icon: <Code2 /> },
        { v: 'writing',    label: 'İçerik & Yazım',     hint: 'Uzun metin, özetleme, düzenleme ve ton ayarı.',      icon: <Palette /> },
        { v: 'data',       label: 'Veri & Analiz',      hint: 'Tablo okuma, SQL üretimi ve içgörü çıkarımı.',       icon: <BarChart2 /> },
        { v: 'automation', label: 'Otomasyon',          hint: 'n8n akışları, API zincirleri ve tetikleyiciler.',    icon: <Sparkles /> },
        { v: 'language',   label: 'Dil & Çeviri',       hint: 'Çok dilli içerik, lokalizasyon ve düzeltme.',        icon: <Globe /> },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                    <Sparkles size={18} />
                </div>
                <div>
                    <h2 className="text-[18px] font-semibold tracking-tight text-slate-800">
                        İlgi alanların neler?
                    </h2>
                    <p className="text-[12.5px] text-slate-500 leading-relaxed mt-0.5 max-w-md">
                        Yapay zeka asistanını ve varsayılan araçları ilgi alanlarına göre ayarlıyoruz.{' '}
                        Birden fazla seçebilirsin.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                {options.map((o) => (
                    <InterestCard
                        key={o.v}
                        icon={o.icon}
                        label={o.label}
                        hint={o.hint}
                        selected={(data.interests || []).includes(o.v)}
                        onClick={() => toggle(o.v)}
                    />
                ))}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-200/70 rounded-lg px-3 py-2">
                <Sparkles size={12} className="shrink-0" style={{ color: ACCENT }} />
                <span>
                    En az 2 alan seçmeni öneririz. Sonradan{' '}
                    <b className="text-slate-700 font-medium">Ayarlar → Profil</b> altından değiştirebilirsin.
                </span>
            </div>
        </div>
    );
}

/* ─── Adım 3 ─────────────────────────────────────────────────────── */
function Step3({ data, set }) {
    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                    <Bell size={18} />
                </div>
                <div>
                    <h2 className="text-[18px] font-semibold tracking-tight text-slate-800">Son rötuşlar</h2>
                    <p className="text-[12.5px] text-slate-500 leading-relaxed mt-0.5 max-w-md">
                        Asistanı nasıl çağıracağını ve bildirim tercihlerini ayarla. İstediğin zaman değiştirebilirsin.
                    </p>
                </div>
            </div>

            <div>
                <Label>Asistana hitap şeklin</Label>
                <ChipGroup
                    value={data.address}
                    onChange={(v) => set('address', v)}
                    options={[
                        { value: 'first',  label: 'Adımla' },
                        { value: 'formal', label: 'Resmi' },
                        { value: 'casual', label: 'Samimi' },
                        { value: 'pro',    label: 'Profesyonel' },
                    ]}
                />
            </div>

            <div>
                <Label>Varsayılan Dil</Label>
                <ChipGroup
                    value={data.lang}
                    onChange={(v) => set('lang', v)}
                    options={[
                        { value: 'tr',   label: 'Türkçe' },
                        { value: 'en',   label: 'English' },
                        { value: 'auto', label: 'Otomatik' },
                    ]}
                />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                <ToggleRow
                    title="E-posta özetleri"
                    hint="Haftalık kullanım özeti ve yeni özellik duyuruları."
                    on={data.emailOpt}
                    onChange={(v) => set('emailOpt', v)}
                />
                <ToggleRow
                    title="Masaüstü bildirimleri"
                    hint="Uzun süren görevler tamamlandığında haber ver."
                    on={data.desktopOpt}
                    onChange={(v) => set('desktopOpt', v)}
                />
                <ToggleRow
                    title="Analitik paylaşımı"
                    hint="Anonim kullanım verisi ile ürünü geliştirmemize yardım et."
                    on={data.analyticsOpt}
                    onChange={(v) => set('analyticsOpt', v)}
                />
            </div>
        </div>
    );
}

/* ─── Tamamlandı kartı ───────────────────────────────────────────── */
function DoneCard({ data, onFinish }) {
    return (
        <div className="text-center py-4">
            <div
                className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3"
                style={{ background: ACCENT + '14', color: ACCENT, border: `1px solid ${ACCENT}33` }}
            >
                <Check size={26} strokeWidth={2.2} />
            </div>
            <h2 className="text-[18px] font-semibold tracking-tight text-slate-800">Hazırsın!</h2>
            <p className="text-[12.5px] text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Profilini kişiselleştirdik. Asistan ve çalışma alanı tercihlerine göre ayarlandı.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-left">
                <Stat label="İlgi alanı" value={(data.interests || []).length} />
                <Stat
                    label="Dil"
                    value={data.lang === 'tr' ? 'TR' : data.lang === 'en' ? 'EN' : 'Auto'}
                />
                <Stat
                    label="Bildirim"
                    value={`${[data.emailOpt, data.desktopOpt].filter(Boolean).length}/2`}
                />
            </div>
            <div className="mt-4 border-t border-slate-200/70 pt-3.5 flex justify-end">
                <button
                    onClick={onFinish}
                    className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white px-4 py-2 rounded-lg shadow-sm"
                    style={{ background: ACCENT }}
                >
                    Çalışma alanına git <ArrowRight size={13} strokeWidth={2.2} />
                </button>
            </div>
        </div>
    );
}

function Stat({ label, value }) {
    return (
        <div className="bg-slate-50 border border-slate-200/70 rounded-lg px-3 py-2">
            <div className="text-[9.5px] uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
            <div className="text-[14px] font-semibold text-slate-800 mt-0.5">{value}</div>
        </div>
    );
}

/* ─── Ana bileşen ────────────────────────────────────────────────── */
export default function OnboardingWizard({ user, onComplete }) {
    const [step, setStep] = useState(0);
    const [done, setDone] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [data, setData] = useState({
        birth: '',
        gender: '',
        location: '',
        role: '',
        interests: [],
        address: 'first',
        lang: 'tr',
        emailOpt: true,
        desktopOpt: true,
        analyticsOpt: false,
    });

    const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

    const canAdvance =
        step === 0
            ? !!(data.birth && data.gender && data.location && data.role)
            : step === 1
                ? (data.interests || []).length >= 1
                : true;

    const handleNext = async () => {
        if (step < 2) {
            setStep(step + 1);
            return;
        }
        // Son adım → kaydet
        setIsSaving(true);
        const payload = {
            ...(user.meta || {}),
            ...data,
            onboarding_completed: true,
        };
        try {
            await mutation('PUT', `/api/auth/users/${user.id}/meta`, payload, {
                kind: 'save', subject: 'Profil tercihleri',
            });
        } catch (err) {
            console.error('Onboarding kaydedilemedi:', err);
        }
        setIsSaving(false);
        setDone(true);
    };

    const handleFinish = () => {
        onComplete({
            ...(user.meta || {}),
            ...data,
            onboarding_completed: true,
        });
    };

    const handleSkip = () => {
        if (step < 2) setStep(step + 1);
        else setDone(true);
    };

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-6"
            style={{
                background:
                    'radial-gradient(ellipse at center, rgba(248,249,250,0.35) 0%, rgba(15,23,42,0.55) 100%)',
                backdropFilter: 'blur(4px)',
            }}
        >
            {/* Kart */}
            <div
                className="relative bg-white rounded-2xl border border-slate-200/80 w-full overflow-hidden"
                style={{
                    maxWidth: 560,
                    boxShadow:
                        '0 24px 60px rgba(15,23,42,0.14), 0 2px 6px rgba(15,23,42,0.05)',
                    animation: 'owScaleIn .22s ease-out',
                }}
            >
                {/* Progress bar */}
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-slate-100">
                    <div
                        className="h-full transition-all duration-300"
                        style={{
                            width: done ? '100%' : `${((step + 1) / 3) * 100}%`,
                            background: ACCENT,
                        }}
                    />
                </div>

                {/* Header */}
                {!done && (
                    <div className="px-6 pt-5 pb-3 flex items-center justify-between">
                        <StepTabs step={step} />
                        <span className="text-[10.5px] uppercase tracking-[0.1em] font-semibold text-slate-400">
                            Adım {step + 1} / 3
                        </span>
                    </div>
                )}

                {/* Body */}
                <div className="px-6 pt-2 pb-5">
                    {done ? (
                        <DoneCard data={data} onFinish={handleFinish} />
                    ) : (
                        <>
                            {step === 0 && <Step1 data={data} set={set} />}
                            {step === 1 && <Step2 data={data} set={set} />}
                            {step === 2 && <Step3 data={data} set={set} />}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!done && (
                    <div className="border-t border-slate-200/70 px-6 py-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            {step > 0 ? (
                                <button
                                    onClick={() => setStep(Math.max(0, step - 1))}
                                    className="text-[12px] text-slate-500 hover:text-slate-800 font-medium transition-colors flex items-center gap-1"
                                >
                                    <ChevronRight size={12} className="rotate-180" /> Geri
                                </button>
                            ) : (
                                <button
                                    onClick={handleSkip}
                                    className="text-[12px] text-slate-400 hover:text-slate-700 transition-colors"
                                >
                                    Atlamak için ilerle →
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {step > 0 && (
                                <button
                                    onClick={handleSkip}
                                    className="text-[12px] text-slate-500 hover:text-slate-800 font-medium px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    Sonra
                                </button>
                            )}
                            <button
                                onClick={handleNext}
                                disabled={!canAdvance || isSaving}
                                className={`flex items-center gap-1.5 text-[12.5px] font-semibold text-white px-4 py-2 rounded-lg transition-all shadow-sm
                  ${canAdvance && !isSaving
                                        ? 'hover:brightness-110 active:brightness-95'
                                        : 'opacity-40 cursor-not-allowed'
                                    }`}
                                style={{ background: ACCENT }}
                            >
                                {isSaving ? (
                                    <>
                                        <span
                                            className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full"
                                            style={{ animation: 'owSpin 0.7s linear infinite' }}
                                        />
                                        Kaydediliyor...
                                    </>
                                ) : step < 2 ? (
                                    <>
                                        Devam Et <ArrowRight size={13} strokeWidth={2.2} />
                                    </>
                                ) : (
                                    <>
                                        Tamamla <ArrowRight size={13} strokeWidth={2.2} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
        @keyframes owScaleIn {
          from { opacity: 0; transform: scale(.97) translateY(6px); }
          to   { opacity: 1; transform: scale(1)   translateY(0); }
        }
        @keyframes owSpin {
          to { transform: rotate(360deg); }
        }
        input[type="date"]::-webkit-calendar-picker-indicator {
          opacity: 0.45; cursor: pointer;
        }
        input[type="date"]::-webkit-calendar-picker-indicator:hover { opacity: 0.8; }
      `}</style>
        </div>
    );
}
