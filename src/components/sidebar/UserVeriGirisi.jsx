import { useState, useEffect } from 'react';
import { Plus, CheckCircle } from 'lucide-react';

/* ── Modül renk haritası ── */
const MOD_COLORS = {
    FI: { bg: 'rgba(55,138,221,0.15)', text: '#60a5fa', border: 'rgba(55,138,221,0.4)', label: 'FI · Muhasebe' },
    CO: { bg: 'rgba(127,119,221,0.15)', text: '#a78bfa', border: 'rgba(127,119,221,0.4)', label: 'CO · Kontrol' },
    MM: { bg: 'rgba(29,158,117,0.15)', text: '#34d399', border: 'rgba(29,158,117,0.4)', label: 'MM · Malzeme' },
    SD: { bg: 'rgba(239,159,39,0.15)', text: '#fbbf24', border: 'rgba(239,159,39,0.4)', label: 'SD · Satış' },
    HR: { bg: 'rgba(212,83,126,0.15)', text: '#f472b6', border: 'rgba(212,83,126,0.4)', label: 'HR · İK' },
    PP: { bg: 'rgba(99,170,34,0.15)', text: '#86efac', border: 'rgba(99,170,34,0.4)', label: 'PP · Üretim' },
    ABAP: { bg: 'rgba(216,90,48,0.15)', text: '#fb923c', border: 'rgba(216,90,48,0.4)', label: 'ABAP' },
    Fiori: { bg: 'rgba(239,159,39,0.1)', text: '#facc15', border: 'rgba(239,159,39,0.35)', label: 'Fiori' },
};

const MODULES = ['FI', 'CO', 'MM', 'SD', 'HR', 'PP', 'ABAP', 'Fiori'];
const DEPTS = ['Finans', 'Satın Alma', 'İK', 'Satış', 'IT', 'Üretim', 'Lojistik', 'Pazarlama'];
const MOD_OPTS = ['', 'FI', 'CO', 'MM', 'SD', 'HR', 'PP', 'ABAP', 'Fiori', 'Diğer'];

/* ── Stil sabitleri ── */
const css = {
    section: {
        background: '#0f172a', border: '0.5px solid #2a2a2d',
        borderRadius: 8, padding: '12px 14px', marginBottom: 10,
    },
    secTitle: {
        fontSize: 11, fontWeight: 500, color: '#f1f5f9',
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2,
    },
    stepNum: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 18, height: 18, borderRadius: '50%',
        background: '#334155', color: '#e2e8f0', fontSize: 9, fontWeight: 600, flexShrink: 0,
    },
    hint: { fontSize: 9, color: '#64748b', marginBottom: 10 },
    label: {
        fontSize: 9, color: '#94a3b8', textTransform: 'uppercase',
        letterSpacing: '0.04em', fontWeight: 500, marginBottom: 3,
    },
    input: {
        width: '100%', background: '#1e293b', border: '1px solid #334155',
        color: '#f1f5f9', padding: '7px 8px', borderRadius: 4,
        fontSize: 11, outline: 'none', fontFamily: 'sans-serif',
    },
    select: {
        width: '100%', background: '#1e293b', border: '1px solid #334155',
        color: '#f1f5f9', padding: '7px 8px', borderRadius: 4,
        fontSize: 11, outline: 'none', fontFamily: 'sans-serif', cursor: 'pointer',
    },
    entryCard: {
        background: '#1e293b', borderRadius: 6, padding: '10px 12px', marginBottom: 8,
    },
    entryHead: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
    },
    entryTitle: {
        fontSize: 9, fontWeight: 500, color: '#94a3b8',
        textTransform: 'uppercase', letterSpacing: '0.04em',
    },
    removeBtn: {
        background: 'transparent', border: 'none', color: '#64748b',
        cursor: 'pointer', fontSize: 14, padding: '2px 6px', borderRadius: 4,
        lineHeight: 1, fontFamily: 'sans-serif',
    },
    addBtn: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        width: '100%', background: 'transparent',
        border: '0.5px dashed #475569', color: '#64748b',
        fontSize: 10, padding: '7px 10px', borderRadius: 6,
        cursor: 'pointer', fontFamily: 'sans-serif', transition: 'all 0.15s',
    },
};

/* ── Yardımcı alt bileşenler ── */
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

function Req() { return <span style={{ color: '#A32D2D', marginLeft: 2 }}>*</span>; }

/* ── Dinamik kart bileşeni (Eğitim) ── */
function ExtTrainingCard({ idx, data, onChange, onRemove }) {
    const upd = (k, v) => onChange(idx, k, v);
    return (
        <div style={css.entryCard}>
            <div style={css.entryHead}>
                <span style={css.entryTitle}>Eğitim {idx + 1}</span>
                <button style={css.removeBtn} onClick={onRemove}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,27,27,0.15)'; e.currentTarget.style.color = '#ef4444'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
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

/* ── Dinamik kart bileşeni (Sertifika) ── */
function ExtCertCard({ idx, data, onChange, onRemove }) {
    const upd = (k, v) => onChange(idx, k, v);
    return (
        <div style={css.entryCard}>
            <div style={css.entryHead}>
                <span style={css.entryTitle}>Sertifika {idx + 1}</span>
                <button style={css.removeBtn} onClick={onRemove}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,27,27,0.15)'; e.currentTarget.style.color = '#ef4444'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
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

/* ══════════════════════════════════════
   ANA BİLEŞEN
══════════════════════════════════════ */
const newTraining = () => ({ name: '', provider: '', module: '', hours: '', date: '' });
const newCert = () => ({ name: '', issuer: '', module: '', issuedAt: '', expiresAt: '' });

export default function UserVeriGirisi({ currentUser }) {
    const [kisisel, setKisisel] = useState({
        ad: currentUser?.tam_ad || '',
        tarih: '',
        departman: '',
    });
    const [selectedModules, setSelectedModules] = useState([]);
    const [trainings, setTrainings] = useState([newTraining()]);
    const [certs, setCerts] = useState([newCert()]);
    const [toast, setToast] = useState(false);
    const [loading, setLoading] = useState(false);

    /* ── Veri Yükleme ── */
    useEffect(() => {
        if (!currentUser?.kimlik) return;
        const loadProfile = async () => {
            try {
                const res = await fetch(`http://127.0.0.1:8000/api/egitim/profil/${currentUser.kimlik}`);
                if (res.ok) {
                    const data = await res.json();

                    if (data.ise_baslama_tarihi || data.departman) {
                        setKisisel(p => ({
                            ...p,
                            tarih: data.ise_baslama_tarihi || "",
                            departman: data.departman || ""
                        }));
                    }
                    if (data.kullanilan_moduller && data.kullanilan_moduller.length > 0) {
                        setSelectedModules(data.kullanilan_moduller);
                    }
                    if (data.dis_egitimler && data.dis_egitimler.length > 0) {
                        setTrainings(data.dis_egitimler);
                    }
                    if (data.dis_sertifikalar && data.dis_sertifikalar.length > 0) {
                        setCerts(data.dis_sertifikalar);
                    }
                }
            } catch (err) {
                console.error("Profil Yükleme Hatası", err);
            }
        };
        loadProfile();
    }, [currentUser?.kimlik]);

    /* ── Modül toggle ── */
    const toggleMod = (m) =>
        setSelectedModules(p => p.includes(m) ? p.filter(x => x !== m) : [...p, m]);

    /* ── Eğitim CRUD ── */
    const addTraining = () => setTrainings(p => [...p, newTraining()]);
    const removeTraining = (i) => setTrainings(p => p.filter((_, idx) => idx !== i));
    const updateTraining = (i, k, v) =>
        setTrainings(p => p.map((t, idx) => idx === i ? { ...t, [k]: v } : t));

    /* ── Sertifika CRUD ── */
    const addCert = () => setCerts(p => [...p, newCert()]);
    const removeCert = (i) => setCerts(p => p.filter((_, idx) => idx !== i));
    const updateCert = (i, k, v) =>
        setCerts(p => p.map((c, idx) => idx === i ? { ...c, [k]: v } : c));

    /* ── Kaydet ── */
    const handleSave = async () => {
        if (!currentUser?.kimlik) return;
        setLoading(true);
        const payload = {
            ise_baslama_tarihi: kisisel.tarih || null,
            departman: kisisel.departman || null,
            kullanilan_moduller: selectedModules,
            dis_egitimler: trainings.filter(t => t.name), // boş olanları yollama
            dis_sertifikalar: certs.filter(c => c.name)
        };

        try {
            const res = await fetch(`http://127.0.0.1:8000/api/egitim/profil/${currentUser.kimlik}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setToast(true);
                setTimeout(() => setToast(false), 2400);
            } else {
                alert("Bilgiler kaydedilirken bir hata oluştu.");
            }
        } catch (err) {
            console.error("Profil Kaydetme Hatası", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ fontFamily: 'sans-serif', padding: '0 0 1rem' }}>

            {/* ─── Başlık ─── */}
            <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: '0.5px solid #2a2a2d' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', marginBottom: 2 }}>
                    Bilgilerimi Gir
                </div>
                <div style={{ fontSize: 9, color: '#64748b' }}>
                    Kişisel bilgilerini, kullandığın modülleri ve dış eğitim/sertifikalarını buradan girebilirsin.
                </div>
                <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: 'rgba(55,138,221,0.12)', color: '#60a5fa', border: '1px solid rgba(55,138,221,0.3)',
                    fontSize: 9, padding: '2px 7px', borderRadius: 4, marginTop: 6,
                }}>● Kullanıcı bilgi girişi</span>
            </div>

            {/* ─── 1. Kişisel Bilgiler ─── */}
            <div style={css.section}>
                <div style={css.secTitle}><span style={css.stepNum}>1</span>Kişisel bilgiler</div>
                <div style={css.hint}>Ad, işe başlama tarihi ve departman</div>

                <Row cols={2} mb={8}>
                    <Field label={<>Ad Soyad<Req /></>}>
                        <input
                            style={css.input}
                            placeholder="Örn. Ayşe Kılıç"
                            value={kisisel.ad}
                            onChange={e => setKisisel(p => ({ ...p, ad: e.target.value }))}
                        />
                    </Field>
                    <Field label={<>İşe başlama tarihi<Req /></>}>
                        <input
                            style={css.input}
                            type="date"
                            value={kisisel.tarih}
                            onChange={e => setKisisel(p => ({ ...p, tarih: e.target.value }))}
                        />
                    </Field>
                </Row>

                <Field label={<>Departman<Req /></>}>
                    <select
                        style={css.select}
                        value={kisisel.departman}
                        onChange={e => setKisisel(p => ({ ...p, departman: e.target.value }))}
                    >
                        <option value="">Seçiniz...</option>
                        {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </Field>
            </div>

            {/* ─── 2. Kullandığım Modüller ─── */}
            <div style={css.section}>
                <div style={css.secTitle}><span style={css.stepNum}>2</span>Kullandığım modüller</div>
                <div style={css.hint}>Aktif olarak kullandığın tüm SAP modüllerini işaretle · birden fazla seçebilirsin</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {MODULES.map(m => {
                        const active = selectedModules.includes(m);
                        const c = MOD_COLORS[m];
                        return (
                            <button
                                key={m}
                                onClick={() => toggleMod(m)}
                                style={{
                                    fontSize: 10, padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                                    fontFamily: 'sans-serif', transition: 'all 0.15s',
                                    background: active ? c.bg : '#1e293b',
                                    color: active ? c.text : '#64748b',
                                    border: `0.5px solid ${active ? c.border : '#334155'}`,
                                }}
                            >
                                {c.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ─── 3. Dışarıdan Aldığım Eğitimler ─── */}
            <div style={css.section}>
                <div style={css.secTitle}>
                    <span style={css.stepNum}>3</span>
                    Dışarıdan aldığım eğitimler
                    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: 'rgba(239,159,39,0.12)', color: '#fbbf24', border: '1px solid rgba(239,159,39,0.3)', marginLeft: 4 }}>Dış</span>
                </div>
                <div style={css.hint}>Udemy, Coursera, openSAP gibi platformlardan aldığın eğitimler</div>

                {trainings.map((t, i) => (
                    <ExtTrainingCard
                        key={i} idx={i} data={t}
                        onChange={updateTraining}
                        onRemove={() => removeTraining(i)}
                    />
                ))}

                <button
                    style={css.addBtn}
                    onClick={addTraining}
                    onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#f1f5f9'; e.currentTarget.style.borderStyle = 'solid'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderStyle = 'dashed'; }}
                >
                    <Plus size={12} /> Dış eğitim ekle
                </button>
            </div>

            {/* ─── 4. Dış Sertifikalar ─── */}
            <div style={css.section}>
                <div style={css.secTitle}>
                    <span style={css.stepNum}>4</span>
                    Dış sertifikalar
                    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: 'rgba(239,159,39,0.12)', color: '#fbbf24', border: '1px solid rgba(239,159,39,0.3)', marginLeft: 4 }}>Dış</span>
                </div>
                <div style={css.hint}>SAP, PMI, Microsoft gibi kurumlardan aldığın sertifikalar</div>

                {certs.map((c, i) => (
                    <ExtCertCard
                        key={i} idx={i} data={c}
                        onChange={updateCert}
                        onRemove={() => removeCert(i)}
                    />
                ))}

                <button
                    style={css.addBtn}
                    onClick={addCert}
                    onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#f1f5f9'; e.currentTarget.style.borderStyle = 'solid'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderStyle = 'dashed'; }}
                >
                    <Plus size={12} /> Sertifika ekle
                </button>
            </div>

            {/* ─── Aksiyonlar ─── */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, paddingTop: 12, borderTop: '0.5px solid #2a2a2d' }}>
                {toast && (
                    <span style={{ marginRight: 'auto', fontSize: 10, color: '#34d399', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={12} /> Bilgiler kaydedildi
                    </span>
                )}
                {!toast && <span style={{ marginRight: 'auto' }} />}

                <button
                    style={{
                        background: 'transparent', color: '#94a3b8',
                        border: '0.5px solid #475569', fontSize: 10,
                        padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontFamily: 'sans-serif',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#f1f5f9'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                >
                    Özetle ↗
                </button>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    style={{
                        background: loading ? '#94a3b8' : '#378ADD', color: '#fff', border: 'none',
                        fontSize: 11, fontWeight: 500, padding: '7px 16px',
                        borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'sans-serif',
                    }}
                    onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#185FA5'; }}
                    onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#378ADD'; }}
                >
                    {loading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
            </div>
        </div>
    );
}
