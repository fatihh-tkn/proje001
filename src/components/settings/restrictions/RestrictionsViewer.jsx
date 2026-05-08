import React, { useState, useMemo } from 'react';
import {
    Shield, Users, Server, Activity, Cpu, Database, FileText, Bot, Search, Plus,
    X, Check, ChevronRight, Lock, AlertTriangle, Clock, Globe, Ban, Save,
    RotateCcw, Sparkles, Zap, HardDrive, Coins, Filter, Power, FileWarning,
    ShieldAlert, Layers, Hash, GaugeCircle, Network, Pin, ArrowRight,
    FlaskConical, CheckCircle2,
} from 'lucide-react';

/* ── Mock Data ─────────────────────────────────────────────────────── */

const ROLES = [
    {
        id: 'admin', name: 'Sistem Yöneticisi',
        desc: 'Tüm modeller, veri tabanları ve kullanıcılar üzerinde tam yetki.',
        count: 2, icon: Shield, tone: 'rose', locked: true,
        rules: {
            models: { gpt4: true, gpt35: true, claude: true, gemini: true, local: true },
            tokenDaily: 5000000, tokenMonthly: 150000000, fileSizeMB: 2048,
            allowedTypes: ['pdf', 'docx', 'xlsx', 'txt', 'csv', 'img', 'audio'],
            rags: ['rag_1', 'rag_2', 'rag_3'],
            hours: { mode: 'always', from: '08:00', to: '20:00', days: [1,2,3,4,5] },
            approval: { delete: false, share: false, modelChange: false, exportRaw: false },
            concurrency: 12,
        },
    },
    {
        id: 'analyst', name: 'Veri Analisti',
        desc: 'Vektör veri tabanları, ileri modeller ve raporlama.',
        count: 8, icon: Database, tone: 'indigo',
        rules: {
            models: { gpt4: true, gpt35: true, claude: true, gemini: false, local: true },
            tokenDaily: 750000, tokenMonthly: 18000000, fileSizeMB: 512,
            allowedTypes: ['pdf', 'docx', 'xlsx', 'csv', 'txt'],
            rags: ['rag_1', 'rag_2'],
            hours: { mode: 'office', from: '08:00', to: '20:00', days: [1,2,3,4,5] },
            approval: { delete: true, share: false, modelChange: false, exportRaw: true },
            concurrency: 4,
        },
    },
    {
        id: 'marketing', name: 'Pazarlama',
        desc: 'Belge oluşturma + temel modeller. RAG sınırlı.',
        count: 12, icon: Sparkles, tone: 'amber',
        rules: {
            models: { gpt4: false, gpt35: true, claude: false, gemini: true, local: true },
            tokenDaily: 250000, tokenMonthly: 5500000, fileSizeMB: 128,
            allowedTypes: ['pdf', 'docx', 'img'],
            rags: ['rag_1'],
            hours: { mode: 'office', from: '09:00', to: '18:00', days: [1,2,3,4,5] },
            approval: { delete: true, share: true, modelChange: true, exportRaw: true },
            concurrency: 2,
        },
    },
    {
        id: 'standard', name: 'Standart Kullanıcı',
        desc: 'Sadece temel sohbet ve şirket dosyaları.',
        count: 45, icon: FileText, tone: 'slate',
        rules: {
            models: { gpt4: false, gpt35: true, claude: false, gemini: false, local: true },
            tokenDaily: 100000, tokenMonthly: 2200000, fileSizeMB: 64,
            allowedTypes: ['pdf', 'docx'],
            rags: ['rag_1'],
            hours: { mode: 'office', from: '08:30', to: '18:30', days: [1,2,3,4,5] },
            approval: { delete: true, share: true, modelChange: true, exportRaw: true },
            concurrency: 1,
        },
    },
];

const MODELS = [
    { id: 'gpt4',    name: 'GPT-4 Turbo',        tag: 'Yüksek maliyet', cost: '$$$',     color: '#10a37f' },
    { id: 'claude',  name: 'Claude 3.5 Sonnet',   tag: 'Uzun bağlam',   cost: '$$$',     color: '#d97757' },
    { id: 'gpt35',   name: 'GPT-3.5',             tag: 'Hızlı, ucuz',   cost: '$',       color: '#10a37f' },
    { id: 'gemini',  name: 'Gemini 1.5 Pro',      tag: 'Multimodal',    cost: '$$',      color: '#4285f4' },
    { id: 'local',   name: 'Llama 3 (Yerel)',     tag: 'Kapalı devre',  cost: 'Ücretsiz',color: '#7c3aed' },
];

const RAGS = [
    { id: 'rag_1', name: 'Resmi Belgeler Öz Havuzu', docs: 1240 },
    { id: 'rag_2', name: 'Canlı Toplantılar',         docs: 512  },
    { id: 'rag_3', name: 'Hukuk & Sözleşmeler',      docs: 88   },
];

const FILE_TYPES = [
    { id: 'pdf',   label: 'PDF'    },
    { id: 'docx',  label: 'Word'   },
    { id: 'xlsx',  label: 'Excel'  },
    { id: 'csv',   label: 'CSV'    },
    { id: 'txt',   label: 'Metin'  },
    { id: 'img',   label: 'Görsel' },
    { id: 'audio', label: 'Ses'    },
];

const USERS = [
    { name: 'Ahmet Yılmaz',  email: 'ahmet@yilgenci.com',  role: 'admin',    initials: 'AY', over: false, status: 'Aktif',   lastLogin: '10 dk önce'    },
    { name: 'Ayşe Demir',    email: 'ayse@yilgenci.com',   role: 'analyst',  initials: 'AD', over: true,  status: 'Aktif',   lastLogin: '2 saat önce',   overrideNote: 'Token: +%50' },
    { name: 'Mehmet Kaya',   email: 'mehmet@yilgenci.com', role: 'standard', initials: 'MK', over: false, status: 'Pasif',   lastLogin: '3 gün önce'    },
    { name: 'Zeynep Çelik',  email: 'zeynep@yilgenci.com', role: 'marketing',initials: 'ZÇ', over: true,  status: 'Aktif',   lastLogin: '1 gün önce',    overrideNote: 'GPT-4 izin'  },
    { name: 'Ferhat Acar',   email: 'ferhat@yilgenci.com', role: 'analyst',  initials: 'FA', over: false, status: 'Aktif',   lastLogin: '20 dk önce'    },
    { name: 'Selin Aksoy',   email: 'selin@yilgenci.com',  role: 'standard', initials: 'SA', over: false, status: 'Aktif',   lastLogin: 'saatler önce'  },
    { name: 'Kerem Öz',      email: 'kerem@yilgenci.com',  role: 'marketing',initials: 'KÖ', over: false, status: 'Askıda',  lastLogin: '1 hafta önce', suspended: true },
];

const SYSTEM_DEFAULTS = {
    costCapDaily: 240, costCapMonthly: 5200, concurrencyMax: 32,
    fileQuarantine: true, piiMasking: true, retentionDays: 90,
    ipAllowList: ['10.0.0.0/8', '192.168.1.0/24', '85.34.112.18'],
    blockedKeywords: ['maaş bordrosu', 'tc kimlik no', 'kart numarası', 'CVV'],
    emergencyKill: false, autoSuspendOver: 3,
    geo: ['TR', 'DE', 'NL'],
};

/* ── Helpers ───────────────────────────────────────────────────────── */

function compactNumber(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + 'K';
    return String(n);
}

const TONE_CLS = {
    slate:  'bg-slate-100 text-slate-600 border-slate-200',
    rose:   'bg-rose-50 text-rose-600 border-rose-100',
    emerald:'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber:  'bg-amber-50 text-amber-600 border-amber-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    accent: 'bg-[#b91d2c]/10 text-[#b91d2c] border-[#b91d2c]/25',
};

/* ── Atoms ─────────────────────────────────────────────────────────── */

function Toggle({ checked, onChange, disabled }) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            className={`relative h-[18px] w-[32px] rounded-full transition-all duration-200 shrink-0 ${
                disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
            } ${checked ? 'bg-[#b91d2c]' : 'bg-slate-200'}`}
        >
            <span className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition-all duration-200 ${
                checked ? 'left-[16px]' : 'left-[2px]'
            }`} />
        </button>
    );
}

function Pill({ tone = 'slate', children, icon: Icon }) {
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-[3px] rounded-md text-[10px] font-medium border ${TONE_CLS[tone] || TONE_CLS.slate}`}>
            {Icon && <Icon size={10} />}
            {children}
        </span>
    );
}

function Card({ children, className = '', padded = true }) {
    return (
        <div className={`bg-white border border-slate-200/70 rounded-lg shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${padded ? 'p-5' : ''} ${className}`}>
            {children}
        </div>
    );
}

function SectionLabel({ icon: Icon, title, hint, right }) {
    return (
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
                {Icon && <Icon size={13} className="text-slate-400" />}
                <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{title}</h4>
                {hint && <span className="text-[11px] text-slate-400">· {hint}</span>}
            </div>
            {right}
        </div>
    );
}

function RangeSlider({ value, onChange, min = 0, max = 100, step = 1, format }) {
    const pct = ((value - min) / (max - min)) * 100;
    return (
        <div className="flex items-center gap-3 w-full">
            <div className="relative flex-1 h-[18px] flex items-center">
                <div className="absolute inset-x-0 h-[4px] bg-slate-100 rounded-full" />
                <div className="absolute h-[4px] rounded-full bg-[#b91d2c]" style={{ width: `${pct}%` }} />
                <input
                    type="range" min={min} max={max} step={step} value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div
                    className="absolute w-3 h-3 rounded-full bg-white border-2 border-[#b91d2c] shadow pointer-events-none"
                    style={{ left: `calc(${pct}% - 6px)` }}
                />
            </div>
            <div className="text-[11px] font-mono font-semibold text-slate-700 min-w-[72px] text-right tabular-nums">
                {format ? format(value) : value}
            </div>
        </div>
    );
}

function TimeField({ label, value, onChange }) {
    return (
        <div>
            <div className="text-[10px] text-slate-500 mb-1">{label}</div>
            <input
                type="time" value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-[11px] font-mono text-slate-700 focus:outline-none focus:border-[#b91d2c]"
            />
        </div>
    );
}

function DaysPicker({ value, onChange }) {
    const days = ['Pt','Sa','Ça','Pe','Cu','Ct','Pz'];
    return (
        <div className="flex gap-1">
            {days.map((d, i) => {
                const idx = i + 1;
                const on = value.includes(idx);
                return (
                    <button
                        key={d}
                        onClick={() => onChange(on ? value.filter(x => x !== idx) : [...value, idx])}
                        className={`flex-1 py-1 text-[10px] font-bold rounded transition-all ${
                            on ? 'bg-[#b91d2c] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                    >{d}</button>
                );
            })}
        </div>
    );
}

function StatInline({ label, value }) {
    return (
        <div className="flex flex-col items-end">
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">{label}</div>
            <div className="text-[12px] font-mono font-semibold text-slate-800 tabular-nums">{value}</div>
        </div>
    );
}

/* ── System Health strip ───────────────────────────────────────────── */
function SystemHealth({ system }) {
    const usedCost = 138;
    const pct = Math.min(100, (usedCost / system.costCapDaily) * 100);
    return (
        <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
                <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Günlük tavan</div>
                <div className="flex items-center gap-1.5">
                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] font-mono tabular-nums text-slate-600">${usedCost}/${system.costCapDaily}</span>
                </div>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-medium text-emerald-700">Politika Aktif</span>
            </div>
        </div>
    );
}

/* ── Role Editor ───────────────────────────────────────────────────── */
function RoleEditor({ role, updateRole }) {
    if (!role) return null;
    const r = role.rules;
    const Icon = role.icon;

    return (
        <div className="grid grid-cols-12 gap-4">
            {/* Meta bar */}
            <Card className="col-span-12 !py-3 !px-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#b91d2c]/10 border border-[#b91d2c]/25 flex items-center justify-center">
                    <Icon size={18} className="text-[#b91d2c]" />
                </div>
                <div className="flex-1">
                    <div className="text-[13px] font-semibold text-slate-800 flex items-center gap-2">
                        {role.name}
                        {role.locked && <Pill tone="slate" icon={Lock}>Sistem rolü</Pill>}
                    </div>
                    <div className="text-[11px] text-slate-500">{role.desc}</div>
                </div>
                <div className="flex items-center gap-3 pr-2">
                    <StatInline label="Kullanıcı" value={role.count} />
                    <div className="w-px h-7 bg-slate-200" />
                    <StatInline label="Token / Gün" value={compactNumber(r.tokenDaily)} />
                    <div className="w-px h-7 bg-slate-200" />
                    <StatInline label="Eşzamanlı" value={r.concurrency} />
                    <div className="w-px h-7 bg-slate-200" />
                    <StatInline label="RAG erişimi" value={`${r.rags.length}/${RAGS.length}`} />
                </div>
                <div className="flex items-center gap-1.5">
                    <button className="text-[11px] text-slate-500 hover:text-[#b91d2c] flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-slate-50">
                        <FlaskConical size={11} /> Simüle Et
                    </button>
                    {!role.locked && (
                        <button className="text-[11px] text-rose-500 hover:text-rose-700 flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-rose-50">
                            <X size={11} /> Rolü Sil
                        </button>
                    )}
                </div>
            </Card>

            {/* Model Erişimi */}
            <Card className="col-span-12 lg:col-span-8">
                <SectionLabel icon={Cpu} title="Model Erişimi" hint="hangi modelleri çağırabilir"
                    right={<button className="text-[10px] text-slate-400 hover:text-[#b91d2c]">Tümünü kapat</button>}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {MODELS.map(m => {
                        const enabled = !!r.models[m.id];
                        return (
                            <div key={m.id} className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-md border transition-all ${
                                enabled ? 'border-slate-200 bg-white' : 'border-dashed border-slate-200 bg-slate-50/50'
                            }`}>
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                                        style={{ background: m.color }}>
                                        {m.cost === 'Ücretsiz' ? 'F' : m.cost}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[12px] font-semibold text-slate-700 truncate">{m.name}</div>
                                        <div className="text-[10px] text-slate-500">{m.tag}</div>
                                    </div>
                                </div>
                                <Toggle checked={enabled} disabled={role.locked}
                                    onChange={(v) => updateRole(role.id, { models: { ...r.models, [m.id]: v } })} />
                            </div>
                        );
                    })}
                </div>
            </Card>

            {/* Kullanım Kotaları */}
            <Card className="col-span-12 lg:col-span-4">
                <SectionLabel icon={Coins} title="Kullanım Kotaları" />
                <div className="space-y-4">
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] text-slate-600">Günlük token</span>
                            <span className="text-[10px] text-slate-400">soft + hard limit</span>
                        </div>
                        <RangeSlider value={r.tokenDaily} min={50000} max={5000000} step={50000}
                            format={compactNumber}
                            onChange={(v) => updateRole(role.id, { tokenDaily: v })} />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] text-slate-600">Aylık token</span>
                            <span className="text-[10px] text-slate-400">{Math.round(r.tokenMonthly / r.tokenDaily)} gün</span>
                        </div>
                        <RangeSlider value={r.tokenMonthly} min={1000000} max={200000000} step={1000000}
                            format={compactNumber}
                            onChange={(v) => updateRole(role.id, { tokenMonthly: v })} />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] text-slate-600">Eşzamanlı istek</span>
                        </div>
                        <RangeSlider value={r.concurrency} min={1} max={32} step={1}
                            format={(v) => `${v}×`}
                            onChange={(v) => updateRole(role.id, { concurrency: v })} />
                    </div>
                </div>
            </Card>

            {/* Dosya & Kaynak Erişimi */}
            <Card className="col-span-12 lg:col-span-7">
                <SectionLabel icon={HardDrive} title="Dosya & Kaynak Erişimi" />
                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 md:col-span-5">
                        <div className="text-[11px] text-slate-600 mb-1.5">Maks. dosya boyutu</div>
                        <RangeSlider value={r.fileSizeMB} min={16} max={2048} step={16}
                            format={(v) => `${v} MB`}
                            onChange={(v) => updateRole(role.id, { fileSizeMB: v })} />
                        <div className="mt-4 text-[11px] text-slate-600 mb-1.5">RAG (Bilgi tabanı) erişimi</div>
                        <div className="space-y-1.5">
                            {RAGS.map(rag => {
                                const allowed = r.rags.includes(rag.id);
                                return (
                                    <label key={rag.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Database size={11} className="text-slate-400 shrink-0" />
                                            <span className="text-[11px] text-slate-700 truncate">{rag.name}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">{rag.docs}</span>
                                        </div>
                                        <Toggle checked={allowed} disabled={role.locked}
                                            onChange={(v) => updateRole(role.id, {
                                                rags: v ? [...r.rags, rag.id] : r.rags.filter(x => x !== rag.id)
                                            })} />
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                    <div className="col-span-12 md:col-span-7 md:border-l md:border-slate-100 md:pl-4">
                        <div className="text-[11px] text-slate-600 mb-2">İzinli dosya türleri</div>
                        <div className="grid grid-cols-2 gap-1.5">
                            {FILE_TYPES.map(ft => {
                                const on = r.allowedTypes.includes(ft.id);
                                return (
                                    <button key={ft.id}
                                        onClick={() => updateRole(role.id, {
                                            allowedTypes: on ? r.allowedTypes.filter(x => x !== ft.id) : [...r.allowedTypes, ft.id]
                                        })}
                                        disabled={role.locked}
                                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border text-[11px] transition-all ${
                                            on ? 'border-[#b91d2c]/30 bg-[#b91d2c]/5 text-[#b91d2c]' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                        }`}
                                    >
                                        <span className="font-medium">.{ft.id}</span>
                                        {on ? <Check size={11} /> : <Plus size={11} />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Çalışma & Onay Kuralları */}
            <Card className="col-span-12 lg:col-span-5">
                <SectionLabel icon={Clock} title="Çalışma & Onay Kuralları" />
                <div className="space-y-3">
                    <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-md">
                        {[
                            { id: 'always', label: '7/24' },
                            { id: 'office', label: 'Mesai içi' },
                            { id: 'custom', label: 'Özel takvim' },
                        ].map(o => {
                            const active = r.hours.mode === o.id;
                            return (
                                <button key={o.id}
                                    onClick={() => updateRole(role.id, { hours: { ...r.hours, mode: o.id } })}
                                    disabled={role.locked}
                                    className={`flex-1 px-2 py-1.5 rounded text-[11px] font-medium transition-all ${
                                        active ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >{o.label}</button>
                            );
                        })}
                    </div>

                    {r.hours.mode !== 'always' && (
                        <div className="grid grid-cols-2 gap-2">
                            <TimeField label="Başlangıç" value={r.hours.from}
                                onChange={v => updateRole(role.id, { hours: { ...r.hours, from: v } })} />
                            <TimeField label="Bitiş" value={r.hours.to}
                                onChange={v => updateRole(role.id, { hours: { ...r.hours, to: v } })} />
                            <div className="col-span-2">
                                <div className="text-[10px] text-slate-500 mb-1">İzinli günler</div>
                                <DaysPicker value={r.hours.days}
                                    onChange={v => updateRole(role.id, { hours: { ...r.hours, days: v } })} />
                            </div>
                        </div>
                    )}

                    <div className="border-t border-slate-100 pt-3">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Onay gerektirenler</div>
                        <div className="space-y-1.5">
                            {[
                                { id: 'delete',      label: 'Belge silme',            Icon: X           },
                                { id: 'share',       label: 'Dış paylaşım',           Icon: Globe       },
                                { id: 'modelChange', label: 'Pahalı model çağrısı',   Icon: Sparkles    },
                                { id: 'exportRaw',   label: 'Ham veri dışa aktarımı', Icon: FileWarning },
                            ].map(a => (
                                <label key={a.id} className="flex items-center justify-between px-2 py-1 rounded hover:bg-slate-50 cursor-pointer">
                                    <span className="text-[11px] text-slate-700 flex items-center gap-1.5">
                                        <a.Icon size={11} className="text-slate-400" /> {a.label}
                                    </span>
                                    <Toggle checked={r.approval[a.id]} disabled={role.locked}
                                        onChange={(v) => updateRole(role.id, { approval: { ...r.approval, [a.id]: v } })} />
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}

/* ── Users & Roles Scope ───────────────────────────────────────────── */
function UsersScope({ roles, users, search, activeRoleId, setActiveRoleId, updateRole, onOpenUser }) {
    const activeRole = roles.find(r => r.id === activeRoleId);
    const filteredUsers = useMemo(() => users.filter(u =>
        !search ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        roles.find(r => r.id === u.role)?.name.toLowerCase().includes(search.toLowerCase())
    ), [users, search, roles]);

    return (
        <div className="flex h-full overflow-hidden">
            {/* Left: Roles Rail */}
            <aside className="w-[260px] shrink-0 border-r border-slate-200/60 bg-white flex flex-col">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Roller</span>
                    <button className="text-slate-400 hover:text-[#b91d2c] transition-colors" title="Yeni rol">
                        <Plus size={13} />
                    </button>
                </div>
                <div className="flex-1 overflow-auto py-1">
                    {roles.map(r => {
                        const active = r.id === activeRoleId;
                        const Icon = r.icon;
                        return (
                            <button key={r.id} onClick={() => setActiveRoleId(r.id)}
                                className={`relative w-full text-left px-4 py-2.5 flex items-start gap-2.5 border-l-2 transition-all ${
                                    active ? 'border-l-[#b91d2c] bg-[#b91d2c]/5' : 'border-l-transparent hover:bg-slate-50'
                                }`}
                            >
                                <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                                    active ? 'bg-white border border-[#b91d2c]/25' : 'bg-slate-50 border border-slate-100'
                                }`}>
                                    <Icon size={13} className={active ? 'text-[#b91d2c]' : 'text-slate-400'} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-[12px] font-semibold ${active ? 'text-slate-800' : 'text-slate-700'}`}>{r.name}</span>
                                        {r.locked && <Lock size={9} className="text-slate-400" />}
                                    </div>
                                    <div className="text-[10px] text-slate-500 leading-snug mt-0.5 line-clamp-1">{r.desc}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[9px] font-mono text-slate-500 tabular-nums">{r.count} kullanıcı</span>
                                        <span className="text-slate-300">·</span>
                                        <span className="text-[9px] font-mono text-slate-500 tabular-nums">
                                            {compactNumber(r.rules.tokenDaily)} tok/gün
                                        </span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
                <div className="border-t border-slate-100 p-3">
                    <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-2">Bu role atanmış</div>
                    <div className="flex flex-wrap gap-1">
                        {users.filter(u => u.role === activeRoleId).slice(0, 6).map(u => (
                            <button key={u.email} onClick={() => onOpenUser(u)} title={u.name}
                                className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-[9px] font-bold text-slate-600 hover:border-[#b91d2c] hover:text-[#b91d2c] transition-colors"
                            >{u.initials}</button>
                        ))}
                        {users.filter(u => u.role === activeRoleId).length > 6 && (
                            <span className="w-6 h-6 rounded-full bg-slate-50 border border-slate-100 text-[9px] font-mono text-slate-500 flex items-center justify-center">
                                +{users.filter(u => u.role === activeRoleId).length - 6}
                            </span>
                        )}
                    </div>
                </div>
            </aside>

            {/* Center: Role Editor + User Table */}
            <div className="flex-1 overflow-auto px-6 py-5">
                <RoleEditor role={activeRole} updateRole={updateRole} />

                {/* User table */}
                <div className="mt-6">
                    <SectionLabel icon={Users} title="Bu kapsamdaki kullanıcılar"
                        hint={`${filteredUsers.length} kayıt`}
                        right={
                            <button className="text-[11px] text-slate-500 hover:text-[#b91d2c] flex items-center gap-1">
                                <Filter size={11} /> Filtrele
                            </button>
                        }
                    />
                    <Card padded={false} className="overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/70 border-b border-slate-200/60 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                                    <th className="px-4 py-2.5">Kullanıcı</th>
                                    <th className="px-4 py-2.5">Rol</th>
                                    <th className="px-4 py-2.5">Kişisel Override</th>
                                    <th className="px-4 py-2.5">Durum</th>
                                    <th className="px-4 py-2.5">Son Giriş</th>
                                    <th className="px-4 py-2.5 text-center w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="text-[12px] text-slate-700 divide-y divide-slate-100">
                                {filteredUsers.map(u => {
                                    const role = ROLES.find(r => r.id === u.role);
                                    return (
                                        <tr key={u.email}
                                            className="hover:bg-slate-50/60 group cursor-pointer transition-colors"
                                            onClick={() => onOpenUser(u)}
                                        >
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                                                        {u.initials}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-800 leading-tight flex items-center gap-1.5">
                                                            {u.name}
                                                            {u.suspended && <Pill tone="rose" icon={Ban}>Askıda</Pill>}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500">{u.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5"><Pill tone={role?.tone}>{role?.name}</Pill></td>
                                            <td className="px-4 py-2.5">
                                                {u.over
                                                    ? <Pill tone="amber" icon={Sparkles}>{u.overrideNote}</Pill>
                                                    : <span className="text-[11px] text-slate-400">Rol varsayılanları</span>
                                                }
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <Pill tone={u.status === 'Aktif' ? 'emerald' : u.status === 'Askıda' ? 'rose' : 'slate'}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                                        u.status === 'Aktif' ? 'bg-emerald-500' : u.status === 'Askıda' ? 'bg-rose-500' : 'bg-slate-400'
                                                    }`} />
                                                    {u.status}
                                                </Pill>
                                            </td>
                                            <td className="px-4 py-2.5 text-[11px] text-slate-500">{u.lastLogin}</td>
                                            <td className="px-4 py-2.5 text-center">
                                                <ChevronRight size={13} className="text-slate-300 group-hover:text-[#b91d2c] transition-colors mx-auto" />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </Card>
                </div>
            </div>
        </div>
    );
}

/* ── System Scope ──────────────────────────────────────────────────── */
function SystemScope({ system, updateSystem }) {
    const [keyword, setKeyword] = useState('');
    const [ip, setIp] = useState('');

    return (
        <div className="h-full overflow-auto px-6 py-5">
            {/* Emergency Banner */}
            <div className={`mb-5 rounded-lg border p-4 flex items-center gap-4 ${
                system.emergencyKill ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200/70'
            }`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    system.emergencyKill ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
                }`}>
                    <Power size={18} />
                </div>
                <div className="flex-1">
                    <div className="text-[13px] font-semibold text-slate-800 flex items-center gap-2">
                        Acil Durum Kilidi
                        {system.emergencyKill && <Pill tone="rose" icon={AlertTriangle}>Devrede</Pill>}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                        Etkinleştirildiğinde tüm yapay zeka çağrıları, dış API'ler ve dosya işlemleri 30 saniye içinde kesilir. Yalnızca yöneticiler oturum açabilir.
                    </div>
                </div>
                <button
                    onClick={() => updateSystem({ emergencyKill: !system.emergencyKill })}
                    className={`px-4 py-2 rounded-md text-[12px] font-semibold transition-all ${
                        system.emergencyKill
                            ? 'bg-rose-600 text-white hover:bg-rose-700'
                            : 'bg-white border border-slate-200 text-slate-700 hover:border-rose-300 hover:text-rose-600'
                    }`}
                >
                    {system.emergencyKill ? 'Kilidi Aç' : 'Sistemi Kilitle'}
                </button>
            </div>

            <div className="grid grid-cols-12 gap-5">
                {/* Maliyet Tavanı */}
                <Card className="col-span-12 lg:col-span-7">
                    <SectionLabel icon={GaugeCircle} title="Maliyet Tavanı" hint="API tüketimi"
                        right={<Pill tone="emerald" icon={Activity}>Şu an: $138 / gün</Pill>}
                    />
                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] text-slate-600">Günlük tavan ($)</span>
                                <span className="text-[10px] text-slate-400">aşıldığında uyar</span>
                            </div>
                            <RangeSlider value={system.costCapDaily} min={50} max={2000} step={10}
                                format={(v) => `$${v}`}
                                onChange={(v) => updateSystem({ costCapDaily: v })} />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] text-slate-600">Aylık tavan ($)</span>
                                <span className="text-[10px] text-slate-400">aşıldığında durdur</span>
                            </div>
                            <RangeSlider value={system.costCapMonthly} min={1000} max={50000} step={100}
                                format={(v) => `$${v.toLocaleString()}`}
                                onChange={(v) => updateSystem({ costCapMonthly: v })} />
                        </div>
                        <div className="col-span-2 grid grid-cols-3 gap-2 pt-2">
                            {[
                                { label: 'Bu hafta', v: '$612',   trend: '+8%'  },
                                { label: 'Bu ay',    v: '$2.840', trend: '+14%' },
                                { label: 'Geçen ay', v: '$2.490', trend: '—'   },
                            ].map((s, i) => (
                                <div key={i} className="px-3 py-2 rounded-md bg-slate-50/70 border border-slate-100">
                                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{s.label}</div>
                                    <div className="flex items-baseline gap-1.5 mt-0.5">
                                        <span className="text-[14px] font-bold tabular-nums text-slate-800">{s.v}</span>
                                        <span className="text-[10px] text-slate-500">{s.trend}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* Yük & Saklama */}
                <Card className="col-span-12 lg:col-span-5">
                    <SectionLabel icon={Layers} title="Yük & Saklama" />
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] text-slate-600">Eşzamanlı sistem isteği</span>
                                <span className="text-[10px] text-slate-400">tüm kullanıcılar</span>
                            </div>
                            <RangeSlider value={system.concurrencyMax} min={4} max={128} step={2}
                                format={(v) => `${v} eşzamanlı`}
                                onChange={(v) => updateSystem({ concurrencyMax: v })} />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] text-slate-600">Konuşma kaydı saklama</span>
                                <span className="text-[10px] text-slate-400">KVKK uyumu</span>
                            </div>
                            <RangeSlider value={system.retentionDays} min={7} max={365} step={1}
                                format={(v) => `${v} gün`}
                                onChange={(v) => updateSystem({ retentionDays: v })} />
                        </div>
                        <label className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 cursor-pointer">
                            <div>
                                <div className="text-[11px] text-slate-700 font-medium">Karantina yükleme</div>
                                <div className="text-[10px] text-slate-500">Yüklenen dosyalar virüs taraması bitene kadar erişime kapalı</div>
                            </div>
                            <Toggle checked={system.fileQuarantine} onChange={v => updateSystem({ fileQuarantine: v })} />
                        </label>
                        <label className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 cursor-pointer">
                            <div>
                                <div className="text-[11px] text-slate-700 font-medium">Otomatik PII maskeleme</div>
                                <div className="text-[10px] text-slate-500">TC, IBAN, e-posta, telefon model girdisinden önce maskelenir</div>
                            </div>
                            <Toggle checked={system.piiMasking} onChange={v => updateSystem({ piiMasking: v })} />
                        </label>
                    </div>
                </Card>

                {/* Ağ & Coğrafi Erişim */}
                <Card className="col-span-12 lg:col-span-6">
                    <SectionLabel icon={Network} title="Ağ & Coğrafi Erişim" />
                    <div>
                        <div className="text-[11px] text-slate-600 mb-1.5">İzinli IP / CIDR</div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {system.ipAllowList.map(ipv => (
                                <span key={ipv} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-700">
                                    <Pin size={9} className="text-slate-400" />
                                    {ipv}
                                    <button
                                        onClick={() => updateSystem({ ipAllowList: system.ipAllowList.filter(x => x !== ipv) })}
                                        className="text-slate-300 hover:text-rose-500"
                                    ><X size={9} /></button>
                                </span>
                            ))}
                        </div>
                        <form
                            onSubmit={(e) => { e.preventDefault(); if (ip.trim()) { updateSystem({ ipAllowList: [...system.ipAllowList, ip.trim()] }); setIp(''); } }}
                            className="flex gap-1.5"
                        >
                            <input value={ip} onChange={e => setIp(e.target.value)}
                                placeholder="192.168.0.0/16"
                                className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-md text-[11px] font-mono focus:outline-none focus:border-[#b91d2c]"
                            />
                            <button type="submit" className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-md text-[11px] font-semibold text-slate-700">+ Ekle</button>
                        </form>
                        <div className="mt-4 text-[11px] text-slate-600 mb-1.5">İzinli Ülkeler</div>
                        <div className="flex flex-wrap gap-1">
                            {['TR','DE','NL','US','FR','UK','AZ'].map(c => {
                                const on = system.geo.includes(c);
                                return (
                                    <button key={c}
                                        onClick={() => updateSystem({ geo: on ? system.geo.filter(x => x !== c) : [...system.geo, c] })}
                                        className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded border transition-all ${
                                            on ? 'bg-[#b91d2c]/5 border-[#b91d2c]/30 text-[#b91d2c]' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                        }`}
                                    >{c}</button>
                                );
                            })}
                        </div>
                    </div>
                </Card>

                {/* Yasaklı Anahtar Kelimeler */}
                <Card className="col-span-12 lg:col-span-6">
                    <SectionLabel icon={Ban} title="Yasaklı Anahtar Kelimeler" hint="prompt + dosya tarama" />
                    <div>
                        <div className="flex flex-wrap gap-1.5 mb-2 min-h-[36px]">
                            {system.blockedKeywords.map(k => (
                                <span key={k} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-50 border border-rose-100 text-[11px] text-rose-700">
                                    <Ban size={9} /> {k}
                                    <button
                                        onClick={() => updateSystem({ blockedKeywords: system.blockedKeywords.filter(x => x !== k) })}
                                        className="text-rose-300 hover:text-rose-600"
                                    ><X size={9} /></button>
                                </span>
                            ))}
                        </div>
                        <form
                            onSubmit={(e) => { e.preventDefault(); if (keyword.trim()) { updateSystem({ blockedKeywords: [...system.blockedKeywords, keyword.trim()] }); setKeyword(''); } }}
                            className="flex gap-1.5"
                        >
                            <input value={keyword} onChange={e => setKeyword(e.target.value)}
                                placeholder="Yeni yasaklı kelime / regex..."
                                className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-md text-[11px] focus:outline-none focus:border-[#b91d2c]"
                            />
                            <button type="submit" className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 rounded-md text-[11px] font-semibold text-rose-600 border border-rose-100">+ Yasakla</button>
                        </form>
                        <div className="mt-4 border-t border-slate-100 pt-3">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] text-slate-600">Otomatik askıya alma eşiği</span>
                                <span className="text-[10px] text-slate-400">{system.autoSuspendOver} ihlal sonrası</span>
                            </div>
                            <RangeSlider value={system.autoSuspendOver} min={1} max={10} step={1}
                                format={(v) => `${v} kez`}
                                onChange={(v) => updateSystem({ autoSuspendOver: v })} />
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}

/* ── Events Scope ──────────────────────────────────────────────────── */
function EventsScope() {
    const events = [
        { t: 'Şimdi', sev: 'high',   actor: 'Zeynep Çelik',  msg: 'GPT-4 çağrısı engellendi — rol limiti aşıldı',     meta: 'model:gpt-4 · tok:8.2K' },
        { t: '2 dk',  sev: 'medium', actor: 'Sistem',         msg: 'Günlük maliyet tavanı %58\'e ulaştı',              meta: '$138 / $240' },
        { t: '12 dk', sev: 'high',   actor: 'Ferhat Acar',    msg: 'Yasaklı kelime tespit edildi ("tc kimlik no")',     meta: 'prompt:rag-call' },
        { t: '1 sa',  sev: 'low',    actor: 'Mehmet Kaya',    msg: 'Mesai dışı erişim denemesi reddedildi',            meta: 'saat:23:14' },
        { t: '3 sa',  sev: 'medium', actor: 'Sistem',         msg: 'Eşzamanlı istek limiti tetiklendi',                meta: '12/12 · kuyruk' },
        { t: '1 gün', sev: 'low',    actor: 'Selin Aksoy',    msg: 'Dosya boyutu limiti aşıldı (98 MB > 64 MB)',       meta: 'rapor.xlsx' },
        { t: '2 gün', sev: 'high',   actor: 'Sistem',         msg: 'IP allowlist dışı erişim — 4 deneme',             meta: '84.51.x.x' },
        { t: '3 gün', sev: 'medium', actor: 'Kerem Öz',       msg: 'Otomatik askıya alma — 3 ihlal',                  meta: 'suspended' },
    ];
    const sevTone = { high: 'rose', medium: 'amber', low: 'slate' };
    const sevDot  = { high: 'bg-rose-500', medium: 'bg-amber-500', low: 'bg-slate-400' };
    const [filter, setFilter] = useState('Tümü');

    const filtered = filter === 'Tümü' ? events :
        filter === 'Yüksek' ? events.filter(e => e.sev === 'high') :
        filter === 'Orta'   ? events.filter(e => e.sev === 'medium') :
                              events.filter(e => e.sev === 'low');

    return (
        <div className="h-full overflow-auto px-6 py-5">
            <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                    { label: 'Son 24 saat ihlal',     value: '14', trend: '+3',  tone: 'rose'  },
                    { label: 'Otomatik blok',          value: '38', trend: '+12', tone: 'amber' },
                    { label: 'Manuel inceleme bekleyen', value: '2', trend: '',   tone: 'slate' },
                ].map((s, i) => (
                    <Card key={i}>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{s.label}</div>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className={`text-[24px] font-bold tabular-nums ${
                                s.tone === 'rose' ? 'text-rose-600' : s.tone === 'amber' ? 'text-amber-600' : 'text-slate-600'
                            }`}>{s.value}</span>
                            {s.trend && <span className="text-[11px] text-slate-400 font-mono">{s.trend}</span>}
                        </div>
                    </Card>
                ))}
            </div>
            <Card padded={false}>
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Politika Tetiklenmeleri</span>
                    <div className="flex items-center gap-1">
                        {['Tümü','Yüksek','Orta','Düşük'].map((f) => (
                            <button key={f}
                                onClick={() => setFilter(f)}
                                className={`px-2 py-1 text-[10px] font-medium rounded ${
                                    filter === f ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:bg-slate-50'
                                }`}
                            >{f}</button>
                        ))}
                    </div>
                </div>
                <ul className="divide-y divide-slate-100">
                    {filtered.map((e, i) => (
                        <li key={i} className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50/60 cursor-pointer">
                            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${sevDot[e.sev]}`} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-[12px] font-medium text-slate-800">{e.msg}</span>
                                    <Pill tone={sevTone[e.sev]}>
                                        {e.sev === 'high' ? 'Yüksek' : e.sev === 'medium' ? 'Orta' : 'Düşük'}
                                    </Pill>
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{e.actor} · {e.meta}</div>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono shrink-0">{e.t} önce</div>
                            <ChevronRight size={13} className="text-slate-300 shrink-0" />
                        </li>
                    ))}
                </ul>
            </Card>
        </div>
    );
}

/* ── User Drawer ───────────────────────────────────────────────────── */
function UserDrawer({ user, role, onClose }) {
    return (
        <div className="absolute inset-0 z-50 flex justify-end" onClick={onClose}>
            <div className="absolute inset-0 bg-slate-900/20 animate-in fade-in duration-150" />
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-[440px] h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
            >
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700 text-[12px] font-bold flex items-center justify-center">
                            {user.initials}
                        </div>
                        <div>
                            <div className="text-[13px] font-semibold text-slate-800">{user.name}</div>
                            <div className="text-[11px] text-slate-500">{user.email}</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                        <X size={14} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-5 space-y-4">
                    <div className="rounded-lg border border-slate-200/70 p-4">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Mevcut rol</div>
                        <div className="flex items-center gap-2">
                            <Pill tone={role?.tone}>{role?.name}</Pill>
                            <button className="text-[11px] text-[#b91d2c] hover:underline">Rolü değiştir</button>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Kişisel override'lar</span>
                            <button className="text-[11px] text-[#b91d2c] hover:underline flex items-center gap-1">
                                <Plus size={11} /> Yeni override
                            </button>
                        </div>
                        {user.over ? (
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-amber-50/40 border border-amber-100">
                                    <Coins size={13} className="text-amber-600" />
                                    <div className="flex-1">
                                        <div className="text-[11px] font-semibold text-slate-800">Token /gün</div>
                                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 font-mono">
                                            <span className="line-through text-slate-400">{compactNumber(role?.rules?.tokenDaily || 0)}</span>
                                            <ArrowRight size={9} />
                                            <span className="text-amber-700">{compactNumber(Math.round((role?.rules?.tokenDaily || 0) * 1.5))}</span>
                                        </div>
                                    </div>
                                    <button className="text-slate-400 hover:text-rose-500"><X size={11} /></button>
                                </div>
                                {user.overrideNote?.includes('GPT-4') && (
                                    <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-amber-50/40 border border-amber-100">
                                        <Cpu size={13} className="text-amber-600" />
                                        <div className="flex-1">
                                            <div className="text-[11px] font-semibold text-slate-800">GPT-4 erişimi</div>
                                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 font-mono">
                                                <span className="line-through text-slate-400">Kapalı</span>
                                                <ArrowRight size={9} />
                                                <span className="text-amber-700">Açık (geçici)</span>
                                            </div>
                                        </div>
                                        <button className="text-slate-400 hover:text-rose-500"><X size={11} /></button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-[11px] text-slate-500 px-3 py-4 rounded-md bg-slate-50/70 border border-dashed border-slate-200 text-center">
                                Bu kullanıcı rol varsayılanlarıyla çalışıyor.
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Kullanım (son 7 gün)</div>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { label: 'Token', value: '184K', pct: 62 },
                                { label: 'İstek', value: '412',  pct: 48 },
                                { label: 'Maliyet', value: '$8.40', pct: 28 },
                            ].map(m => (
                                <div key={m.label} className="px-2.5 py-2 rounded-md bg-slate-50 border border-slate-100">
                                    <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">{m.label}</div>
                                    <div className="text-[13px] font-bold tabular-nums text-slate-800 mt-0.5">{m.value}</div>
                                    <div className="mt-1.5 h-1 bg-white rounded-full overflow-hidden">
                                        <div className="h-full bg-[#b91d2c]" style={{ width: `${m.pct}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {user.suspended || (
                        <div className="rounded-lg bg-amber-50/50 border border-amber-100 p-3 flex gap-2">
                            <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                            <div>
                                <div className="text-[11px] font-semibold text-amber-800">2 politika ihlali</div>
                                <div className="text-[10px] text-amber-700 leading-snug mt-0.5">
                                    Sonraki ihlalde otomatik askıya alma tetiklenecek. Detaylar için Olaylar sekmesine bakın.
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button className="text-[11px] text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5">
                        <Ban size={12} /> Hesabı askıya al
                    </button>
                    <button className="bg-[#b91d2c] text-white text-[11px] font-semibold px-4 py-1.5 rounded-md hover:bg-[#9b1824] flex items-center gap-1.5">
                        <Save size={12} /> Override Kaydet
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Root Component ────────────────────────────────────────────────── */
export default function RestrictionsViewer() {
    const [scope, setScope] = useState('users');
    const [activeRoleId, setActiveRoleId] = useState('analyst');
    const [roles, setRoles] = useState(ROLES);
    const [system, setSystem] = useState(SYSTEM_DEFAULTS);
    const [dirty, setDirty] = useState(false);
    const [search, setSearch] = useState('');
    const [userDrawer, setUserDrawer] = useState(null);

    const updateRole = (id, patch) => {
        setRoles(rs => rs.map(r => r.id === id ? { ...r, rules: { ...r.rules, ...patch } } : r));
        setDirty(true);
    };
    const updateSystem = (patch) => { setSystem(s => ({ ...s, ...patch })); setDirty(true); };

    return (
        <div className="flex flex-col h-full w-full bg-[#f8f9fa] font-sans text-slate-800 select-none animate-in fade-in duration-300 relative">

            {/* ── Header ── */}
            <div className="flex-none px-6 py-3.5 flex items-center justify-between border-b border-slate-200/60 bg-white">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#b91d2c]/10 border border-[#b91d2c]/25 flex items-center justify-center">
                        <ShieldAlert size={16} className="text-[#b91d2c]" />
                    </div>
                    <div>
                        <h2 className="text-[14px] font-semibold text-slate-800 leading-tight flex items-center gap-2">
                            Kısıtlamalar Paneli
                            <Pill tone="accent" icon={Hash}>v1.4</Pill>
                        </h2>
                        <p className="text-[11px] text-slate-500 mt-[1px]">Kullanıcı, rol ve sistem genelindeki erişim kurallarını tek noktadan yönetin.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <SystemHealth system={system} />
                    <div className="w-px h-6 bg-slate-200" />
                    <button
                        onClick={() => setDirty(false)} disabled={!dirty}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-all ${
                            dirty ? 'bg-white border-slate-200 text-slate-600 hover:border-slate-300' : 'border-transparent text-slate-300 cursor-not-allowed'
                        }`}
                    >
                        <RotateCcw size={12} /> Geri Al
                    </button>
                    <button
                        disabled={!dirty} onClick={() => setDirty(false)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                            dirty ? 'bg-[#b91d2c] text-white hover:bg-[#9b1824] shadow-sm' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        <Save size={12} /> {dirty ? 'Değişiklikleri Kaydet' : 'Senkronize'}
                    </button>
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex-none px-6 flex items-center gap-1 border-b border-slate-200/60 bg-white pt-1">
                {[
                    { id: 'users',  icon: Users,    label: 'Kullanıcı & Roller',         count: USERS.length },
                    { id: 'system', icon: Server,   label: 'Sistem Geneli'                                   },
                    { id: 'events', icon: Activity, label: 'Olaylar & Tetiklenmeler',     count: 12           },
                ].map(tab => {
                    const active = scope === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setScope(tab.id)}
                            className={`relative flex items-center gap-2 px-3 pb-2.5 pt-2 text-[12px] font-medium transition-all ${
                                active ? 'text-[#b91d2c]' : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <tab.icon size={13} />
                            {tab.label}
                            {tab.count != null && (
                                <span className={`text-[10px] font-mono tabular-nums px-1.5 py-[1px] rounded ${
                                    active ? 'bg-[#b91d2c]/10 text-[#b91d2c]' : 'bg-slate-100 text-slate-500'
                                }`}>{tab.count}</span>
                            )}
                            {active && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#b91d2c] rounded-t" />}
                        </button>
                    );
                })}
                {scope === 'users' && (
                    <div className="ml-auto pb-2 relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Kullanıcı / rol ara..."
                            className="pl-7 pr-3 py-1.5 border border-slate-200 rounded-md text-[11px] w-52 focus:outline-none focus:border-[#b91d2c]"
                        />
                    </div>
                )}
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-hidden">
                {scope === 'users' && (
                    <UsersScope
                        roles={roles} users={USERS} search={search}
                        activeRoleId={activeRoleId} setActiveRoleId={setActiveRoleId}
                        updateRole={updateRole} onOpenUser={setUserDrawer}
                    />
                )}
                {scope === 'system' && (
                    <SystemScope system={system} updateSystem={updateSystem} />
                )}
                {scope === 'events' && <EventsScope />}
            </div>

            {/* ── User Drawer ── */}
            {userDrawer && (
                <UserDrawer
                    user={userDrawer}
                    role={roles.find(r => r.id === userDrawer.role)}
                    onClose={() => setUserDrawer(null)}
                />
            )}
        </div>
    );
}
