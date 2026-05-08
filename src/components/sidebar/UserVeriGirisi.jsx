import { useState, useEffect } from 'react';
import { Plus, CheckCircle } from 'lucide-react';
import { mutate } from '../../api/client';

/* ── Modül renk haritası — tüm modüller kendi renklerini koruyor, FI kırmızıya alındı ── */
const MOD_COLORS = {
    FI:   { bg: 'rgba(220,38,38,0.12)',   text: '#f87171', border: 'rgba(220,38,38,0.35)',   label: 'FI · Muhasebe' },
    CO:   { bg: 'rgba(127,119,221,0.12)', text: '#a78bfa', border: 'rgba(127,119,221,0.35)', label: 'CO · Kontrol' },
    MM:   { bg: 'rgba(29,158,117,0.12)',  text: '#34d399', border: 'rgba(29,158,117,0.35)',  label: 'MM · Malzeme' },
    SD:   { bg: 'rgba(239,159,39,0.12)',  text: '#fbbf24', border: 'rgba(239,159,39,0.35)',  label: 'SD · Satış' },
    HR:   { bg: 'rgba(212,83,126,0.12)',  text: '#f472b6', border: 'rgba(212,83,126,0.35)',  label: 'HR · İK' },
    PP:   { bg: 'rgba(99,170,34,0.12)',   text: '#86efac', border: 'rgba(99,170,34,0.35)',   label: 'PP · Üretim' },
    ABAP: { bg: 'rgba(216,90,48,0.12)',   text: '#fb923c', border: 'rgba(216,90,48,0.35)',   label: 'ABAP' },
    Fiori:{ bg: 'rgba(239,159,39,0.10)',  text: '#facc15', border: 'rgba(239,159,39,0.30)',  label: 'Fiori' },
};

const MODULES  = ['FI', 'CO', 'MM', 'SD', 'HR', 'PP', 'ABAP', 'Fiori'];
const DEPTS    = ['Finans', 'Satın Alma', 'İK', 'Satış', 'IT', 'Üretim', 'Lojistik', 'Pazarlama'];
const MOD_OPTS = ['', 'FI', 'CO', 'MM', 'SD', 'HR', 'PP', 'ABAP', 'Fiori', 'Diğer'];

/* ── Stil sabitleri — uygulama teması ── */
const css = {
    section: {
        background: '#111110',
        border: '1px solid #292524',
        borderRadius: 8,
        padding: '18px 20px',
        marginBottom: 14,
    },
    secTitle: {
        fontSize: 14, fontWeight: 600, color: '#f1f5f9',
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4,
    },
    stepNum: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 22, height: 22, borderRadius: '50%',
        background: 'rgba(220,38,38,0.15)', color: '#f87171',
        fontSize: 11, fontWeight: 700, flexShrink: 0,
        border: '1px solid rgba(220,38,38,0.3)',
    },
    hint: { fontSize: 12, color: '#64748b', marginBottom: 14 },
    label: {
        fontSize: 11, color: '#64748b', textTransform: 'uppercase',
        letterSpacing: '0.05em', fontWeight: 500, marginBottom: 5,
    },
    input: {
        width: '100%',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid #292524',
        color: '#f1f5f9',
        padding: '9px 12px',
        borderRadius: 4,
        fontSize: 13,
        outline: 'none',
        fontFamily: 'sans-serif',
        transition: 'border-color 0.15s',
    },
    select: {
        width: '100%',
        background: '#1a1917',
        border: '1px solid #292524',
        color: '#f1f5f9',
        padding: '9px 12px',
        borderRadius: 4,
        fontSize: 13,
        outline: 'none',
        fontFamily: 'sans-serif',
        cursor: 'pointer',
    },
    entryCard: {
        background: '#1a1917',
        border: '1px solid #292524',
        borderRadius: 6,
        padding: '14px 16px',
        marginBottom: 10,
    },
    entryHead: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
    },
    entryTitle: {
        fontSize: 11, fontWeight: 600, color: '#64748b',
        textTransform: 'uppercase', letterSpacing: '0.05em',
    },
    removeBtn: {
        background: 'transparent', border: 'none', color: '#475569',
        cursor: 'pointer', fontSize: 18, padding: '2px 6px', borderRadius: 4,
        lineHeight: 1, fontFamily: 'sans-serif',
    },
    addBtn: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        width: '100%', background: 'transparent',
        border: '1px dashed #292524', color: '#475569',
        fontSize: 12, padding: '10px 14px', borderRadius: 6,
        cursor: 'pointer', fontFamily: 'sans-serif', transition: 'all 0.15s',
    },
};

function Field({ label, children }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={css.label}>{label}</div>
            {children}
        </div>
    );
}

function Row({ cols = 1, children, mb = 10 }) {
    const templates = { 1: '1fr', 2: '1fr 1fr', 3: '1fr 1fr 1fr' };
    return (
        <div style={{ display: 'grid', gridTemplateColumns: templates[cols], gap: 8, marginBottom: mb }}>
            {children}
        </div>
    );
}

function Req() { return <span style={{ color: '#DC2626', marginLeft: 2 }}>*</span>; }

function ExtTrainingCard({ idx, data, onChange, onRemove }) {
    const upd = (k, v) => onChange(idx, k, v);
    return (
        <div style={css.entryCard}>
            <div style={css.entryHead}>
                <span style={css.entryTitle}>Eğitim {idx + 1}</span>
                <button style={css.removeBtn} onClick={onRemove}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.1)'; e.currentTarget.style.color = '#f87171'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}
                >×</button>
            </div>
            <Row cols={2} mb={8}>
                <Field label="Eğitim adı">
                    <input style={css.input} placeholder="Örn. SAP Fiori Developer" value={data.name} onChange={e => upd('name', e.target.value)} />
                </Field>
                <Field label="Sağlayıcı">
                    <input style={css.input} placeholder="Udemy, Coursera, openSAP..." value={data.provider} onChange={e => upd('provider', e.target.value)} />
                </Field>
            </Row>
            <Row cols={3} mb={0}>
                <Field label="İlgili modül">
                    <select style={css.select} value={data.module} onChange={e => upd('module', e.target.value)}>
                        {MOD_OPTS.map(m => <option key={m} value={m}>{m || 'Seçiniz'}</option>)}
                    </select>
                </Field>
                <Field label="Süre (saat)">
                    <input style={css.input} type="number" placeholder="0" min="0" value={data.hours} onChange={e => upd('hours', e.target.value)} />
                </Field>
                <Field label="Tamamlanma tarihi">
                    <input style={css.input} type="date" value={data.date} onChange={e => upd('date', e.target.value)} />
                </Field>
            </Row>
        </div>
    );
}

function ExtCertCard({ idx, data, onChange, onRemove }) {
    const upd = (k, v) => onChange(idx, k, v);
    return (
        <div style={css.entryCard}>
            <div style={css.entryHead}>
                <span style={css.entryTitle}>Sertifika {idx + 1}</span>
                <button style={css.removeBtn} onClick={onRemove}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.1)'; e.currentTarget.style.color = '#f87171'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}
                >×</button>
            </div>
            <Row cols={2} mb={8}>
                <Field label="Sertifika adı">
                    <input style={css.input} placeholder="Örn. SAP Certified Associate — FI" value={data.name} onChange={e => upd('name', e.target.value)} />
                </Field>
                <Field label="Veren kurum">
                    <input style={css.input} placeholder="SAP, PMI, Microsoft..." value={data.issuer} onChange={e => upd('issuer', e.target.value)} />
                </Field>
            </Row>
            <Row cols={3} mb={0}>
                <Field label="İlgili modül">
                    <select style={css.select} value={data.module} onChange={e => upd('module', e.target.value)}>
                        {MOD_OPTS.map(m => <option key={m} value={m}>{m || 'Seçiniz'}</option>)}
                    </select>
                </Field>
                <Field label="Alındığı tarih">
                    <input style={css.input} type="date" value={data.issuedAt} onChange={e => upd('issuedAt', e.target.value)} />
                </Field>
                <Field label="Geçerlilik">
                    <input style={css.input} type="date" value={data.expiresAt} onChange={e => upd('expiresAt', e.target.value)} />
                </Field>
            </Row>
        </div>
    );
}

const newTraining = () => ({ name: '', provider: '', module: '', hours: '', date: '' });
const newCert     = () => ({ name: '', issuer: '', module: '', issuedAt: '', expiresAt: '' });

export default function UserVeriGirisi({ currentUser }) {
    const [kisisel, setKisisel] = useState({ ad: currentUser?.tam_ad || '', tarih: '', departman: '' });
    const [selectedModules, setSelectedModules] = useState([]);
    const [trainings, setTrainings] = useState([newTraining()]);
    const [certs, setCerts]         = useState([newCert()]);
    const [toast, setToast]         = useState(false);
    const [loading, setLoading]     = useState(false);

    useEffect(() => {
        if (!currentUser?.kimlik) return;
        const load = async () => {
            try {
                const res = await fetch(`http://127.0.0.1:8000/api/egitim/profil/${currentUser.kimlik}`);
                if (!res.ok) return;
                const data = await res.json();
                if (data.ise_baslama_tarihi || data.departman)
                    setKisisel(p => ({ ...p, tarih: data.ise_baslama_tarihi || '', departman: data.departman || '' }));
                if (data.kullanilan_moduller?.length)  setSelectedModules(data.kullanilan_moduller);
                if (data.dis_egitimler?.length)        setTrainings(data.dis_egitimler);
                if (data.dis_sertifikalar?.length)     setCerts(data.dis_sertifikalar);
            } catch (err) { console.error('Profil yükleme hatası', err); }
        };
        load();
    }, [currentUser?.kimlik]);

    const toggleMod     = (m) => setSelectedModules(p => p.includes(m) ? p.filter(x => x !== m) : [...p, m]);
    const addTraining   = () => setTrainings(p => [...p, newTraining()]);
    const removeTraining= (i) => setTrainings(p => p.filter((_, idx) => idx !== i));
    const updateTraining= (i, k, v) => setTrainings(p => p.map((t, idx) => idx === i ? { ...t, [k]: v } : t));
    const addCert       = () => setCerts(p => [...p, newCert()]);
    const removeCert    = (i) => setCerts(p => p.filter((_, idx) => idx !== i));
    const updateCert    = (i, k, v) => setCerts(p => p.map((c, idx) => idx === i ? { ...c, [k]: v } : c));

    const handleSave = async () => {
        if (!currentUser?.kimlik) return;
        setLoading(true);
        try {
            await mutate.save(`/api/egitim/profil/${currentUser.kimlik}`, {
                ise_baslama_tarihi: kisisel.tarih || null,
                departman: kisisel.departman || null,
                kullanilan_moduller: selectedModules,
                dis_egitimler: trainings.filter(t => t.name),
                dis_sertifikalar: certs.filter(c => c.name),
            }, { subject: 'Eğitim profili' });
            setToast(true);
            setTimeout(() => setToast(false), 2400);
        } catch (err) { console.error('Profil kaydetme hatası', err); }
        setLoading(false);
    };

    return (
        <div style={{ fontFamily: 'sans-serif', padding: '0 0 1rem' }}>

            {/* Başlık */}
            <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid #292524' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
                    Bilgilerimi Gir
                </div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
                    Kişisel bilgilerini, kullandığın modülleri ve dış eğitim/sertifikalarını buradan girebilirsin.
                </div>
                <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: 'rgba(220,38,38,0.10)', color: '#f87171',
                    border: '1px solid rgba(220,38,38,0.25)',
                    fontSize: 10, padding: '2px 10px', borderRadius: 4, marginTop: 8,
                }}>● Kullanıcı bilgi girişi</span>
            </div>

            {/* 1. Kişisel Bilgiler */}
            <div style={css.section}>
                <div style={css.secTitle}><span style={css.stepNum}>1</span>Kişisel bilgiler</div>
                <div style={css.hint}>Ad, işe başlama tarihi ve departman</div>
                <Row cols={2} mb={8}>
                    <Field label={<>Ad Soyad<Req /></>}>
                        <input style={css.input} placeholder="Örn. Ayşe Kılıç"
                            value={kisisel.ad}
                            onChange={e => setKisisel(p => ({ ...p, ad: e.target.value }))} />
                    </Field>
                    <Field label={<>İşe başlama tarihi<Req /></>}>
                        <input style={css.input} type="date"
                            value={kisisel.tarih}
                            onChange={e => setKisisel(p => ({ ...p, tarih: e.target.value }))} />
                    </Field>
                </Row>
                <Field label={<>Departman<Req /></>}>
                    <select style={css.select} value={kisisel.departman}
                        onChange={e => setKisisel(p => ({ ...p, departman: e.target.value }))}>
                        <option value="">Seçiniz...</option>
                        {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </Field>
            </div>

            {/* 2. Kullandığım Modüller */}
            <div style={css.section}>
                <div style={css.secTitle}><span style={css.stepNum}>2</span>Kullandığım modüller</div>
                <div style={css.hint}>Aktif olarak kullandığın tüm SAP modüllerini işaretle · birden fazla seçebilirsin</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {MODULES.map(m => {
                        const active = selectedModules.includes(m);
                        const c = MOD_COLORS[m];
                        return (
                            <button key={m} onClick={() => toggleMod(m)} style={{
                                fontSize: 12, padding: '7px 13px', borderRadius: 4, cursor: 'pointer',
                                fontFamily: 'sans-serif', transition: 'all 0.15s',
                                background: active ? c.bg : 'rgba(255,255,255,0.03)',
                                color: active ? c.text : '#64748b',
                                border: `1px solid ${active ? c.border : '#292524'}`,
                            }}>
                                {c.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 3. Dışarıdan Aldığım Eğitimler */}
            <div style={css.section}>
                <div style={css.secTitle}>
                    <span style={css.stepNum}>3</span>
                    Dışarıdan aldığım eğitimler
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(239,159,39,0.10)', color: '#fbbf24', border: '1px solid rgba(239,159,39,0.25)', marginLeft: 4 }}>Dış</span>
                </div>
                <div style={css.hint}>Udemy, Coursera, openSAP gibi platformlardan aldığın eğitimler</div>
                {trainings.map((t, i) => (
                    <ExtTrainingCard key={i} idx={i} data={t} onChange={updateTraining} onRemove={() => removeTraining(i)} />
                ))}
                <button style={css.addBtn} onClick={addTraining}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#f1f5f9'; e.currentTarget.style.borderColor = '#475569'; e.currentTarget.style.borderStyle = 'solid'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#292524'; e.currentTarget.style.borderStyle = 'dashed'; }}
                >
                    <Plus size={12} /> Dış eğitim ekle
                </button>
            </div>

            {/* 4. Dış Sertifikalar */}
            <div style={css.section}>
                <div style={css.secTitle}>
                    <span style={css.stepNum}>4</span>
                    Dış sertifikalar
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(239,159,39,0.10)', color: '#fbbf24', border: '1px solid rgba(239,159,39,0.25)', marginLeft: 4 }}>Dış</span>
                </div>
                <div style={css.hint}>SAP, PMI, Microsoft gibi kurumlardan aldığın sertifikalar</div>
                {certs.map((c, i) => (
                    <ExtCertCard key={i} idx={i} data={c} onChange={updateCert} onRemove={() => removeCert(i)} />
                ))}
                <button style={css.addBtn} onClick={addCert}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#f1f5f9'; e.currentTarget.style.borderColor = '#475569'; e.currentTarget.style.borderStyle = 'solid'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#292524'; e.currentTarget.style.borderStyle = 'dashed'; }}
                >
                    <Plus size={12} /> Sertifika ekle
                </button>
            </div>

            {/* Aksiyonlar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, paddingTop: 16, borderTop: '1px solid #292524' }}>
                {toast && (
                    <span style={{ marginRight: 'auto', fontSize: 12, color: '#34d399', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle size={14} /> Bilgiler kaydedildi
                    </span>
                )}
                {!toast && <span style={{ marginRight: 'auto' }} />}

                <button style={{
                    background: 'transparent', color: '#64748b',
                    border: '1px solid #292524', fontSize: 12,
                    padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontFamily: 'sans-serif',
                }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#f1f5f9'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                >
                    Özetle ↗
                </button>

                <button onClick={handleSave} disabled={loading} style={{
                    background: loading ? '#64748b' : '#DC2626',
                    color: '#fff', border: 'none',
                    fontSize: 13, fontWeight: 600, padding: '9px 22px',
                    borderRadius: 4, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'sans-serif',
                    transition: 'background 0.15s',
                }}
                    onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#b91c1c'; }}
                    onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#DC2626'; }}
                >
                    {loading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
            </div>
        </div>
    );
}
