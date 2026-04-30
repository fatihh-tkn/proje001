import { useState, useEffect } from "react";
import { X, Plus, Trash2, Upload, CheckCircle } from "lucide-react";
import { mutate } from "../../../api/client";

/* ── Renk sabitleri ── */
const MODULE_COLORS = {
    FI: { bg: "#E6F1FB", text: "#0C447C", border: "#B5D4F4" },
    CO: { bg: "#EEEDFE", text: "#3C3489", border: "#AFA9EC" },
    MM: { bg: "#E1F5EE", text: "#085041", border: "#9FE1CB" },
    SD: { bg: "#FAEEDA", text: "#633806", border: "#FAC775" },
    HR: { bg: "#FBEAF0", text: "#72243E", border: "#F4C0D1" },
    PP: { bg: "#EAF3DE", text: "#3B6D11", border: "#C0DD97" },
    ABAP: { bg: "#FAECE7", text: "#712B13", border: "#F5C4B3" },
    Fiori: { bg: "#FAEEDA", text: "#854F0B", border: "#FAC775" },
};

const TYPE_COLORS = {
    Zorunlu: { bg: "#FEF2F2", text: "#991B1B", border: "#F7C1C1" },
    Ekstra: { bg: "#EEEDFE", text: "#3C3489", border: "#AFA9EC" },
    Yenileme: { bg: "#E6F1FB", text: "#0C447C", border: "#B5D4F4" },
    Onboarding: { bg: "#E1F5EE", text: "#085041", border: "#9FE1CB" },
};

const LVL_COLORS = { bg: "#E1F5EE", text: "#085041", border: "#9FE1CB" };
const FMT_COLORS = { bg: "#FAEEDA", text: "#633806", border: "#FAC775" };

/* ── Küçük yardımcı bileşenler ── */
function SectionTitle({ num, children }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, color: "#1e293b", marginBottom: 3 }}>
            <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 22, height: 22, borderRadius: "50%", background: "#EEEDFE",
                color: "#3C3489", fontSize: 11, fontWeight: 500, flexShrink: 0,
            }}>{num}</span>
            {children}
        </div>
    );
}

function SectionHint({ children }) {
    return <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 14 }}>{children}</div>;
}

function FieldLabel({ children, required }) {
    return (
        <label style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 500, marginBottom: 3 }}>
            {children}{required && <span style={{ color: "#A32D2D", marginLeft: 2 }}>*</span>}
        </label>
    );
}

function StyledInput({ ...props }) {
    return (
        <input {...props} style={{
            width: "100%", padding: "8px 10px", border: "0.5px solid #cbd5e1",
            borderRadius: 6, fontSize: 12, color: "#1e293b", outline: "none",
            background: "#fff", fontFamily: "inherit",
            ...props.style
        }} />
    );
}

function StyledTextarea({ ...props }) {
    return (
        <textarea {...props} style={{
            width: "100%", padding: "8px 10px", border: "0.5px solid #cbd5e1",
            borderRadius: 6, fontSize: 12, color: "#1e293b", outline: "none",
            background: "#fff", fontFamily: "inherit", minHeight: 64, resize: "vertical",
            ...props.style
        }} />
    );
}

function StyledSelect({ children, ...props }) {
    return (
        <select {...props} style={{
            width: "100%", padding: "8px 10px", border: "0.5px solid #cbd5e1",
            borderRadius: 6, fontSize: 12, color: "#1e293b", outline: "none",
            background: "#fff", fontFamily: "inherit",
            ...props.style
        }}>
            {children}
        </select>
    );
}

function Pill({ label, active, onClick, activeStyle }) {
    const base = {
        fontSize: 11, padding: "5px 12px", borderRadius: 6,
        border: "0.5px solid #cbd5e1", background: "#fff", color: "#64748b",
        cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
    };
    const activeS = activeStyle || { background: "#E6F1FB", color: "#0C447C", border: "0.5px solid #B5D4F4" };
    return (
        <button onClick={onClick} style={active ? { ...base, ...activeS } : base}>{label}</button>
    );
}

function Toggle({ on, onChange, label, desc }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "0.5px solid #f1f5f9" }}>
            <div>
                <div style={{ fontSize: 13, color: "#1e293b" }}>{label}</div>
                {desc && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{desc}</div>}
            </div>
            <div
                onClick={onChange}
                style={{
                    position: "relative", width: 34, height: 20,
                    background: on ? "#378ADD" : "#D3D1C7",
                    borderRadius: 10, cursor: "pointer",
                    transition: "background 0.2s", flexShrink: 0,
                }}
            >
                <div style={{
                    position: "absolute", top: 2, left: on ? 16 : 2,
                    width: 16, height: 16, background: "#fff",
                    borderRadius: "50%", transition: "left 0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
            </div>
        </div>
    );
}

function CheckboxCard({ label, checked, onChange }) {
    return (
        <label style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 10px", border: `0.5px solid ${checked ? "#B5D4F4" : "#e2e8f0"}`,
            borderRadius: 6, cursor: "pointer", fontSize: 12,
            color: checked ? "#0C447C" : "#1e293b",
            background: checked ? "#E6F1FB" : "#fff",
            transition: "all 0.15s",
        }}>
            <input type="checkbox" checked={checked} onChange={onChange} style={{ margin: 0, width: 14, height: 14, accentColor: "#378ADD" }} />
            {label}
        </label>
    );
}

/* ──────────────────────────────────────────────────────
   ANA BİLEŞEN
────────────────────────────────────────────────────── */
export default function EgitimAcmaSlideOver({ open, onClose }) {
    /* ── Form state ── */
    const [formData, setFormData] = useState({ name: "", code: "", desc: "", duration: "", passMark: "", trainer: "" });
    const [selectedType, setSelectedType] = useState("Zorunlu");
    const [selectedModules, setSelectedModules] = useState([]);
    const [selectedLevel, setSelectedLevel] = useState("Orta");
    const [selectedFormat, setSelectedFormat] = useState("Online");
    const [selectedRoles, setSelectedRoles] = useState(["Functional Consultant"]);
    const [selectedDepts, setSelectedDepts] = useState(["Finans"]);
    const [prerequisite, setPrerequisite] = useState("Yok");
    const [minUsage, setMinUsage] = useState("Gerekli değil");
    const [publishDate, setPublishDate] = useState("");
    const [deadline, setDeadline] = useState("");
    const [reminder, setReminder] = useState("7 gün öncesinden");
    const [chapters, setChapters] = useState([{ title: "", duration: "" }, { title: "", duration: "" }]);
    const [toggles, setToggles] = useState({ sinav: true, sertifika: true, tekrar: true, onay: false, email: true });
    const [toast, setToast] = useState(null); // 'published' | 'draft'
    const [loading, setLoading] = useState(false);

    /* ── Scroll kilitle ── */
    useEffect(() => {
        if (open) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "";
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    /* ── Yardımcı ── */
    const toggleRole = (r) => setSelectedRoles(p => p.includes(r) ? p.filter(x => x !== r) : [...p, r]);
    const toggleDept = (d) => setSelectedDepts(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);
    const toggleModule = (m) => setSelectedModules(p => p.includes(m) ? p.filter(x => x !== m) : [...p, m]);
    const toggleKey = (k) => setToggles(p => ({ ...p, [k]: !p[k] }));
    const addChapter = () => setChapters(p => [...p, { title: "", duration: "" }]);
    const removeChapter = (i) => setChapters(p => p.filter((_, idx) => idx !== i));
    const updateChapter = (i, k, v) => setChapters(p => p.map((c, idx) => idx === i ? { ...c, [k]: v } : c));

    const showToast = (type) => {
        setToast(type);
        setTimeout(() => setToast(null), 2500);
    };

    const handlePublish = async () => {
        setLoading(true);
        const payload = {
            ad: formData.name || "İsimsiz Eğitim",
            kod: formData.code,
            aciklama: formData.desc,
            sure_saat: parseFloat(formData.duration) || 0,
            gecme_notu: parseInt(formData.passMark) || null,
            egitmen: formData.trainer,
            tur: selectedType,
            seviye: selectedLevel,
            format: selectedFormat,
            ilgili_moduller: selectedModules,
            hedef_roller: selectedRoles,
            hedef_departmanlar: selectedDepts,
            sinav_zorunlu: toggles.sinav,
            sertifika_ver: toggles.sertifika,
            tekrar_izni: toggles.tekrar,
            onay_gerekli: toggles.onay,
            durum: "Yayınlandı",
            yayin_tarihi: publishDate || null,
            son_tamamlama_tarihi: deadline || null,
            bolumler: chapters.filter(c => c.title).map((c, i) => ({
                baslik: c.title,
                sure_dk: parseInt(c.duration) || 0,
                sira: i + 1
            }))
        };

        try {
            await mutate.create('/api/egitim/', payload, {
                subject: 'Eğitim',
                detail: payload?.baslik || payload?.title,
            });
            showToast("published");
            setTimeout(() => onClose(), 2500);
        } catch { /* mutate toast attı */ }
        setLoading(false);
    };
    const handleDraft = () => showToast("draft");

    /* ── Section wrapper ── */
    const Section = ({ children }) => (
        <div style={{
            background: "#fff", border: "0.5px solid #e2e8f0",
            borderRadius: 10, padding: "16px 18px", marginBottom: 12,
        }}>
            {children}
        </div>
    );

    const types = ["Zorunlu", "Ekstra", "Yenileme", "Onboarding"];
    const modules = ["FI", "CO", "MM", "SD", "HR", "PP", "ABAP", "Fiori"];
    const levels = ["Başlangıç", "Orta", "İleri", "Uzman"];
    const formats = ["Online", "Yüz yüze", "Karma"];
    const roles = ["Functional Consultant", "Key User", "End User", "Developer", "Yönetici", "Stajyer"];
    const depts = ["Finans", "Satın Alma", "İK", "Satış", "IT", "Üretim"];

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0, zIndex: 998,
                    background: "rgba(15,23,42,0.45)",
                    opacity: open ? 1 : 0,
                    pointerEvents: open ? "auto" : "none",
                    transition: "opacity 0.25s",
                    backdropFilter: "blur(2px)",
                }}
            />

            {/* Panel */}
            <div style={{
                position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 999,
                width: "clamp(320px, 520px, 100vw)",
                background: "#f8fafc",
                borderLeft: "1px solid #e2e8f0",
                boxShadow: open ? "-8px 0 40px rgba(0,0,0,0.18)" : "none",
                display: "flex", flexDirection: "column",
                transform: open ? "translateX(0)" : "translateX(100%)",
                transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1)",
                fontFamily: "sans-serif",
            }}>

                {/* Header */}
                <div style={{
                    flexShrink: 0, padding: "18px 20px 14px",
                    borderBottom: "0.5px solid #e2e8f0",
                    background: "#fff",
                    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                }}>
                    <div>
                        <h1 style={{ fontSize: 16, fontWeight: 600, color: "#1e293b", marginBottom: 3 }}>
                            Yeni şirket içi eğitim aç
                        </h1>
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                            Eğitimi oluştur, rol ve modülleri ata, içerik ekleyip yayınla
                        </div>
                        <span style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            background: "#FEF2F2", color: "#991B1B",
                            fontSize: 11, padding: "3px 9px", borderRadius: 6, marginTop: 8,
                        }}>● Admin · Eğitim yönetimi</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                        <button onClick={onClose} style={{
                            background: "transparent", border: "none", cursor: "pointer",
                            color: "#94a3b8", padding: 4, borderRadius: 6,
                            display: "flex", alignItems: "center",
                        }}>
                            <X size={16} />
                        </button>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>Taslak · otomatik kaydedildi</span>
                    </div>
                </div>

                {/* Scrollable body */}
                <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>

                    {/* ─── 1. Temel Bilgiler ─── */}
                    <Section>
                        <SectionTitle num={1}>Eğitim temel bilgileri</SectionTitle>
                        <SectionHint>Eğitimin adı, kodu ve kısa açıklaması</SectionHint>

                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 10 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                <FieldLabel required>Eğitim adı</FieldLabel>
                                <StyledInput placeholder="Örn. FI-AP: Borç Hesapları Derinleşme" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                <FieldLabel>Eğitim kodu</FieldLabel>
                                <StyledInput placeholder="FI-AP-02" value={formData.code} onChange={e => setFormData(p => ({ ...p, code: e.target.value }))} />
                            </div>
                        </div>

                        <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 3 }}>
                            <FieldLabel>Açıklama</FieldLabel>
                            <StyledTextarea placeholder="Eğitimin içeriğini, kazanımları ve hedeflerini kısaca yazın..." value={formData.desc} onChange={e => setFormData(p => ({ ...p, desc: e.target.value }))} />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                <FieldLabel required>Süre (saat)</FieldLabel>
                                <StyledInput type="number" placeholder="8" min="0" value={formData.duration} onChange={e => setFormData(p => ({ ...p, duration: e.target.value }))} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                <FieldLabel>Geçme notu (%)</FieldLabel>
                                <StyledInput type="number" placeholder="70" min="0" max="100" value={formData.passMark} onChange={e => setFormData(p => ({ ...p, passMark: e.target.value }))} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                <FieldLabel>Eğitmen</FieldLabel>
                                <StyledInput placeholder="Eğitmen adı" value={formData.trainer} onChange={e => setFormData(p => ({ ...p, trainer: e.target.value }))} />
                            </div>
                        </div>
                    </Section>

                    {/* ─── 2. Kategori & Seviye ─── */}
                    <Section>
                        <SectionTitle num={2}>Kategori ve seviye</SectionTitle>
                        <SectionHint>Eğitim türü, ilgili modül ve seviye</SectionHint>

                        <div style={{ marginBottom: 14 }}>
                            <FieldLabel required>Eğitim türü</FieldLabel>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                                {types.map(t => (
                                    <Pill
                                        key={t} label={t} active={selectedType === t}
                                        onClick={() => setSelectedType(t)}
                                        activeStyle={TYPE_COLORS[t] ? { background: TYPE_COLORS[t].bg, color: TYPE_COLORS[t].text, border: `0.5px solid ${TYPE_COLORS[t].border}` } : undefined}
                                    />
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <FieldLabel required>İlgili modül(ler)</FieldLabel>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                                {modules.map(m => {
                                    const active = selectedModules.includes(m);
                                    const c = MODULE_COLORS[m];
                                    return (
                                        <Pill
                                            key={m} label={m} active={active}
                                            onClick={() => toggleModule(m)}
                                            activeStyle={{ background: c.bg, color: c.text, border: `0.5px solid ${c.border}` }}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <div>
                                <FieldLabel>Seviye</FieldLabel>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                                    {levels.map(l => (
                                        <Pill key={l} label={l} active={selectedLevel === l} onClick={() => setSelectedLevel(l)}
                                            activeStyle={{ background: LVL_COLORS.bg, color: LVL_COLORS.text, border: `0.5px solid ${LVL_COLORS.border}` }} />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <FieldLabel>Format</FieldLabel>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                                    {formats.map(f => (
                                        <Pill key={f} label={f} active={selectedFormat === f} onClick={() => setSelectedFormat(f)}
                                            activeStyle={{ background: FMT_COLORS.bg, color: FMT_COLORS.text, border: `0.5px solid ${FMT_COLORS.border}` }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Section>

                    {/* ─── 3. Atama Kuralları ─── */}
                    <Section>
                        <SectionTitle num={3}>Atama kuralları</SectionTitle>
                        <SectionHint>Eğitim kimlere atansın? Rol, departman veya kullanıcı bazında</SectionHint>

                        <div style={{ marginBottom: 14 }}>
                            <FieldLabel>Roller</FieldLabel>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 4 }}>
                                {roles.map(r => <CheckboxCard key={r} label={r} checked={selectedRoles.includes(r)} onChange={() => toggleRole(r)} />)}
                            </div>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <FieldLabel>Departmanlar</FieldLabel>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 4 }}>
                                {depts.map(d => <CheckboxCard key={d} label={d} checked={selectedDepts.includes(d)} onChange={() => toggleDept(d)} />)}
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                <FieldLabel>Ön koşul eğitim</FieldLabel>
                                <StyledSelect value={prerequisite} onChange={e => setPrerequisite(e.target.value)}>
                                    <option>Yok</option>
                                    <option>FI Temelleri (FI-01)</option>
                                    <option>SAP Navigasyon (GEN-01)</option>
                                </StyledSelect>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                <FieldLabel>Minimum kullanım süresi</FieldLabel>
                                <StyledSelect value={minUsage} onChange={e => setMinUsage(e.target.value)}>
                                    <option>Gerekli değil</option>
                                    <option>3 ay</option>
                                    <option>6 ay</option>
                                    <option>1 yıl</option>
                                </StyledSelect>
                            </div>
                        </div>

                        {/* Önizleme */}
                        <div style={{ background: "#E6F1FB", border: "0.5px solid #B5D4F4", borderRadius: 6, padding: "12px 14px" }}>
                            <div style={{ fontSize: 11, color: "#0C447C", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 500, marginBottom: 8 }}>Tahmini atama önizlemesi</div>
                            {[
                                ["Eşleşen çalışan sayısı", `${selectedDepts.length * 6 + selectedRoles.length * 2} kişi`],
                                [`${selectedDepts[0] || "—"} · ${selectedRoles[0] || "—"}`, `${selectedRoles.length * 4} kişi`],
                                ["Ön koşulu tamamlayan", prerequisite === "Yok" ? "Tümü (%100)" : "24 kişi (%86)"],
                            ].map(([k, v]) => (
                                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12, borderBottom: "none" }}>
                                    <span style={{ color: "#185FA5" }}>{k}</span>
                                    <span style={{ fontWeight: 500, color: "#0C447C" }}>{v}</span>
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* ─── 4. Zaman Planlaması ─── */}
                    <Section>
                        <SectionTitle num={4}>Zaman planlaması</SectionTitle>
                        <SectionHint>Başlangıç, son tarih ve hatırlatma ayarları</SectionHint>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                <FieldLabel required>Yayın tarihi</FieldLabel>
                                <StyledInput type="date" value={publishDate} onChange={e => setPublishDate(e.target.value)} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                <FieldLabel required>Son tamamlama tarihi</FieldLabel>
                                <StyledInput type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                <FieldLabel>Hatırlatma</FieldLabel>
                                <StyledSelect value={reminder} onChange={e => setReminder(e.target.value)}>
                                    <option>7 gün öncesinden</option>
                                    <option>14 gün öncesinden</option>
                                    <option>30 gün öncesinden</option>
                                </StyledSelect>
                            </div>
                        </div>
                    </Section>

                    {/* ─── 5. İçerik & Bölümler ─── */}
                    <Section>
                        <SectionTitle num={5}>İçerik ve bölümler</SectionTitle>
                        <SectionHint>Eğitim materyallerini ve bölüm yapısını ekle</SectionHint>

                        {chapters.map((ch, i) => (
                            <div key={i} style={{
                                display: "flex", alignItems: "center", gap: 10,
                                background: "#f8fafc", borderRadius: 8, padding: "10px 12px", marginBottom: 8,
                            }}>
                                <div style={{
                                    width: 24, height: 24, borderRadius: "50%",
                                    background: "#fff", color: "#64748b", border: "0.5px solid #e2e8f0",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 11, fontWeight: 500, flexShrink: 0,
                                }}>{i + 1}</div>
                                <div style={{ flex: 1, display: "grid", gridTemplateColumns: "3fr 1fr", gap: 8 }}>
                                    <StyledInput placeholder="Bölüm adı" value={ch.title} onChange={e => updateChapter(i, "title", e.target.value)} />
                                    <StyledInput type="number" placeholder="Süre (dk)" value={ch.duration} onChange={e => updateChapter(i, "duration", e.target.value)} />
                                </div>
                                <button onClick={() => removeChapter(i)} style={{
                                    background: "transparent", border: "none", cursor: "pointer",
                                    color: "#94a3b8", padding: "4px 6px", borderRadius: 4,
                                    fontSize: 16, lineHeight: 1,
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.color = "#A32D2D"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}
                                >×</button>
                            </div>
                        ))}

                        <button onClick={addChapter} style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                            width: "100%", background: "transparent",
                            border: "0.5px dashed #94a3b8", color: "#64748b",
                            fontSize: 12, padding: "9px 14px", borderRadius: 6, cursor: "pointer",
                            fontFamily: "inherit", marginBottom: 10, transition: "all 0.15s",
                        }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.color = "#1e293b"; e.currentTarget.style.borderStyle = "solid"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748b"; e.currentTarget.style.borderStyle = "dashed"; }}
                        >
                            <Plus size={14} /> Bölüm ekle
                        </button>

                        {/* Upload */}
                        <div style={{
                            border: "0.5px dashed #94a3b8", borderRadius: 6,
                            padding: 16, textAlign: "center", fontSize: 12,
                            color: "#64748b", cursor: "pointer", transition: "all 0.15s",
                        }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#64748b"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#94a3b8"; }}
                        >
                            <Upload size={18} style={{ margin: "0 auto 6px", color: "#378ADD" }} />
                            <div><strong style={{ color: "#378ADD", fontWeight: 500 }}>Dosya yükle</strong> veya sürükle bırak</div>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>PDF, PPTX, MP4 · maks. 200 MB</div>
                        </div>
                    </Section>

                    {/* ─── 6. Değerlendirme ─── */}
                    <Section>
                        <SectionTitle num={6}>Değerlendirme ayarları</SectionTitle>
                        <SectionHint>Sınav, sertifika ve geçiş kuralları</SectionHint>
                        <Toggle on={toggles.sinav} onChange={() => toggleKey("sinav")} label="Sınav zorunlu" desc="Eğitimin sonunda sınav yapılacak" />
                        <Toggle on={toggles.sertifika} onChange={() => toggleKey("sertifika")} label="Sertifika ver" desc="Tamamlayanlara dijital sertifika verilsin" />
                        <Toggle on={toggles.tekrar} onChange={() => toggleKey("tekrar")} label="Tekrar denemeye izin ver" desc="Başarısız olanlar sınavı tekrar alabilir" />
                        <Toggle on={toggles.onay} onChange={() => toggleKey("onay")} label="Yönetici onayı gereksin" desc="Tamamlama yöneticinin onayıyla geçerli olsun" />
                        <Toggle on={toggles.email} onChange={() => toggleKey("email")} label="Otomatik e-posta bildirimi" desc="Atanan kullanıcılara e-posta gönderilsin" />
                    </Section>

                    <div style={{ height: 80 }} /> {/* footer boşluğu */}
                </div>

                {/* Footer */}
                <div style={{
                    flexShrink: 0, padding: "12px 16px",
                    borderTop: "0.5px solid #e2e8f0", background: "#fff",
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                }}>
                    {/* Toast */}
                    {toast && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "#3B6D11" }}>
                            <CheckCircle size={13} /> {toast === "published" ? "● Eğitim başarıyla yayınlandı" : "● Taslak kaydedildi"}
                        </span>
                    )}
                    {!toast && <span />}

                    <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                        {/* Sil */}
                        <button onClick={onClose} style={{
                            background: "transparent", color: "#A32D2D",
                            border: "0.5px solid #e2e8f0", fontSize: 12, padding: "8px 14px",
                            borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                        }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.borderColor = "#F7C1C1"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
                        >Sil</button>

                        {/* Taslak */}
                        <button onClick={handleDraft} style={{
                            background: "transparent", color: "#64748b",
                            border: "0.5px solid #cbd5e1", fontSize: 12, padding: "8px 14px",
                            borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                        }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.color = "#1e293b"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748b"; }}
                        >Taslak kaydet</button>

                        {/* Önizle */}
                        <button style={{
                            background: "transparent", color: "#64748b",
                            border: "0.5px solid #cbd5e1", fontSize: 12, padding: "8px 14px",
                            borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                        }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.color = "#1e293b"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748b"; }}
                        >Önizle ↗</button>

                        {/* Yayınla */}
                        <button onClick={handlePublish} disabled={loading} style={{
                            background: loading ? "#94a3b8" : "#378ADD", color: "#fff",
                            border: "none", fontSize: 13, fontWeight: 500,
                            padding: "9px 20px", borderRadius: 6, cursor: loading ? "not-allowed" : "pointer",
                            fontFamily: "inherit",
                        }}
                            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "#185FA5"; }}
                            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "#378ADD"; }}
                        >
                            {loading ? "Yayınlanıyor..." : "Yayınla"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
