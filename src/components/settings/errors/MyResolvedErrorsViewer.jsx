import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { mutate } from '../../../api/client';

/**
 * Çözdüğüm Hatalar — koyu tema, marka kırmızı (#b91d2c) aksanlı, SAP iş akışına
 * özel kart görünümü. Tasarım Claude Design'da iterasyonla netleştirildi
 * (single-card layout). Tema tokenları aşağıda <style> ile component scope'una
 * enjekte edilir; dış (app) light teması bu kapsayıcının dışında etkilenmez.
 */

// ── tasarım tokenları + tüm CSS (component-scoped, prefix: ".cz-cmp") ──
const DESIGN_CSS = `
.cz-cmp {
  --bg-0: #0b0d12;
  --bg-1: #11141b;
  --bg-2: #161a23;
  --bg-3: #1c2230;
  --bg-hover: #1f2533;
  --border-1: #232a39;
  --border-2: #2c3445;
  --border-strong: #3a445b;
  --fg-0: #e7ecf3;
  --fg-1: #b6bdcb;
  --fg-2: #7a8294;
  --fg-3: #545b6b;
  --brand: #e23a4a;
  --brand-strong: #b91d2c;
  --brand-soft: rgba(226, 58, 74, 0.12);
  --brand-line: rgba(226, 58, 74, 0.32);
  --sev-low: #4ea76b;
  --sev-low-soft: rgba(78, 167, 107, 0.14);
  --sev-med: #e3a23a;
  --sev-med-soft: rgba(227, 162, 58, 0.14);
  --sev-high: #e23a4a;
  --sev-high-soft: rgba(226, 58, 74, 0.14);
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
  height: 100%;
  width: 100%;
  background: var(--bg-0);
  color: var(--fg-0);
  font-family: var(--font-sans);
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
  display: flex;
  flex-direction: column;
}
.cz-cmp *, .cz-cmp *::before, .cz-cmp *::after { box-sizing: border-box; }
.cz-cmp button { font-family: inherit; cursor: pointer; }
.cz-cmp input { font-family: inherit; }
.cz-cmp .mono { font-family: var(--font-mono); }
.cz-cmp .scroll::-webkit-scrollbar { width: 10px; height: 10px; }
.cz-cmp .scroll::-webkit-scrollbar-track { background: transparent; }
.cz-cmp .scroll::-webkit-scrollbar-thumb { background: #232a39; border-radius: 999px; border: 2px solid var(--bg-0); }
.cz-cmp .scroll::-webkit-scrollbar-thumb:hover { background: #2f3a52; }

/* TOOLBAR */
.cz-cmp .toolbar { padding: 14px 22px; display: flex; gap: 10px; align-items: center; border-bottom: 1px solid var(--border-1); flex-wrap: wrap; }
.cz-cmp .search { flex: 1; min-width: 180px; display: flex; align-items: center; gap: 8px; background: var(--bg-2); border: 1px solid var(--border-1); border-radius: 8px; padding: 7px 10px; }
.cz-cmp .search:focus-within { border-color: var(--border-strong); }
.cz-cmp .search input { flex: 1; background: transparent; border: none; outline: none; color: var(--fg-0); font-size: 13px; }
.cz-cmp .search input::placeholder { color: var(--fg-3); }
.cz-cmp .kbd { font-size: 10.5px; color: var(--fg-3); border: 1px solid var(--border-1); background: var(--bg-1); padding: 1px 5px; border-radius: 4px; font-family: var(--font-mono); }
.cz-cmp .filter-group { display: flex; gap: 4px; padding: 3px; background: var(--bg-2); border: 1px solid var(--border-1); border-radius: 8px; }
.cz-cmp .filter-btn { background: transparent; border: none; color: var(--fg-2); font-size: 11.5px; padding: 5px 10px; border-radius: 5px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; }
.cz-cmp .filter-btn:hover { color: var(--fg-0); }
.cz-cmp .filter-btn.active { background: var(--bg-3); color: var(--fg-0); }
.cz-cmp .filter-btn .dot { width: 6px; height: 6px; border-radius: 999px; }
.cz-cmp .icon-btn { background: var(--bg-2); border: 1px solid var(--border-1); color: var(--fg-1); width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; }
.cz-cmp .icon-btn:hover { background: var(--bg-3); color: var(--fg-0); }

/* MODULE FILTER ROW */
.cz-cmp .mod-row { padding: 0 22px 12px; border-bottom: 1px solid var(--border-1); display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.cz-cmp .mod-row .mod-label { font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--fg-3); font-weight: 600; margin-right: 4px; }

/* LIST + SECTION LABEL */
.cz-cmp .list-wrap { flex: 1; overflow: auto; padding: 14px 22px 22px; }
.cz-cmp .section-label { display: flex; align-items: center; gap: 8px; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--fg-3); font-weight: 600; margin: 6px 2px 12px; }
.cz-cmp .section-label .line { flex: 1; height: 1px; background: var(--border-1); }

/* CARD */
.cz-cmp .card { background: var(--bg-2); border: 1px solid var(--border-1); border-radius: 12px; margin-bottom: 10px; transition: border-color 0.15s, background 0.15s; overflow: hidden; }
.cz-cmp .card:hover { border-color: var(--border-2); }
.cz-cmp .card.expanded { border-color: var(--border-strong); }
.cz-cmp .card-head { display: grid; grid-template-columns: auto 1fr auto; gap: 14px; padding: 14px 16px; align-items: center; cursor: pointer; }
.cz-cmp .card-head:hover { background: rgba(255,255,255,0.015); }
.cz-cmp .sev-rail { width: 3px; height: 36px; border-radius: 2px; }
.cz-cmp .sev-rail.low { background: var(--sev-low); }
.cz-cmp .sev-rail.medium { background: var(--sev-med); }
.cz-cmp .sev-rail.high { background: var(--sev-high); }
.cz-cmp .card-main { min-width: 0; }
.cz-cmp .card-codes { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.cz-cmp .code-chip { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.02em; padding: 2px 7px; border-radius: 4px; background: var(--bg-3); color: var(--fg-1); border: 1px solid var(--border-1); }
.cz-cmp .module-chip { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.05em; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
.cz-cmp .module-chip.sd { background: rgba(91,141,239,0.14); color: #8aaef5; border: 1px solid rgba(91,141,239,0.28); }
.cz-cmp .module-chip.mm { background: rgba(155,108,242,0.14); color: #b993f6; border: 1px solid rgba(155,108,242,0.28); }
.cz-cmp .module-chip.fi { background: rgba(45,191,163,0.14); color: #5fd3ba; border: 1px solid rgba(45,191,163,0.28); }
.cz-cmp .module-chip.hr { background: rgba(224,122,184,0.14); color: #ec9bcb; border: 1px solid rgba(224,122,184,0.28); }
.cz-cmp .module-chip.pp { background: rgba(227,162,58,0.14); color: #efbe6b; border: 1px solid rgba(227,162,58,0.28); }
.cz-cmp .module-chip.co { background: rgba(95,191,103,0.14); color: #88d495; border: 1px solid rgba(95,191,103,0.28); }
.cz-cmp .module-chip.gen { background: rgba(120,130,150,0.14); color: #aab2c2; border: 1px solid rgba(120,130,150,0.28); }
.cz-cmp .card-title { font-size: 14.5px; font-weight: 600; margin-top: 6px; letter-spacing: -0.005em; color: var(--fg-0); }
.cz-cmp .card-meta { display: flex; align-items: center; gap: 12px; margin-top: 4px; font-size: 11.5px; color: var(--fg-2); flex-wrap: wrap; }
.cz-cmp .card-meta .dot { width: 3px; height: 3px; border-radius: 999px; background: var(--fg-3); }
.cz-cmp .card-side { display: flex; align-items: center; gap: 8px; }
.cz-cmp .sev-pill { font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; padding: 3px 8px; border-radius: 999px; }
.cz-cmp .sev-pill.low { background: var(--sev-low-soft); color: var(--sev-low); }
.cz-cmp .sev-pill.medium { background: var(--sev-med-soft); color: var(--sev-med); }
.cz-cmp .sev-pill.high { background: var(--sev-high-soft); color: var(--sev-high); }
.cz-cmp .ghost-btn { background: transparent; border: none; color: var(--fg-3); width: 28px; height: 28px; border-radius: 6px; display: grid; place-items: center; }
.cz-cmp .ghost-btn:hover { background: var(--bg-3); color: var(--fg-1); }
.cz-cmp .ghost-btn.danger:hover { color: var(--brand); }
.cz-cmp .chev { transition: transform 0.18s ease; color: var(--fg-3); display: grid; place-items: center; }
.cz-cmp .chev.open { transform: rotate(180deg); }

/* CARD BODY */
.cz-cmp .card-body { padding: 4px 18px 18px 31px; border-top: 1px dashed var(--border-1); margin-top: -1px; animation: cz-fadeIn 0.18s ease; }
@keyframes cz-fadeIn { from { opacity: 0; transform: translateY(-2px); } to { opacity: 1; transform: translateY(0); } }
.cz-cmp .body-desc { color: var(--fg-1); font-size: 13px; line-height: 1.55; margin: 14px 0 12px; }
.cz-cmp .cause-block { border-left: 2px solid var(--sev-med); background: var(--sev-med-soft); padding: 10px 14px; border-radius: 0 8px 8px 0; margin-bottom: 16px; }
.cz-cmp .cause-label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--sev-med); font-weight: 700; margin-bottom: 4px; }
.cz-cmp .cause-text { font-size: 12.5px; color: var(--fg-1); line-height: 1.55; }
.cz-cmp .steps-label { font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--fg-3); font-weight: 600; margin: 4px 0 10px; }
.cz-cmp .steps { display: flex; flex-direction: column; gap: 2px; position: relative; }
.cz-cmp .step { display: grid; grid-template-columns: 26px 1fr; gap: 12px; padding: 8px 0; position: relative; }
.cz-cmp .step:not(:last-child)::before { content: ''; position: absolute; left: 13px; top: 30px; bottom: -2px; width: 1px; background: var(--border-1); }
.cz-cmp .step-num { width: 26px; height: 26px; border-radius: 8px; background: var(--bg-3); border: 1px solid var(--border-2); color: var(--fg-1); display: grid; place-items: center; font-size: 11px; font-weight: 600; font-family: var(--font-mono); z-index: 1; }
.cz-cmp .step-body { padding-top: 2px; }
.cz-cmp .step-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--fg-0); flex-wrap: wrap; }
.cz-cmp .tcode { font-family: var(--font-mono); font-size: 10.5px; font-weight: 500; letter-spacing: 0.04em; padding: 1px 6px; border-radius: 4px; background: var(--brand-soft); color: #ff8a96; border: 1px solid var(--brand-line); }
.cz-cmp .step-note { margin-top: 4px; font-size: 12px; color: var(--fg-2); line-height: 1.6; }
.cz-cmp .body-actions { display: flex; gap: 8px; margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--border-1); flex-wrap: wrap; }
.cz-cmp .body-btn { background: var(--bg-3); border: 1px solid var(--border-1); color: var(--fg-1); padding: 6px 12px; border-radius: 7px; font-size: 12px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; }
.cz-cmp .body-btn:hover { background: var(--bg-hover); color: var(--fg-0); border-color: var(--border-2); }
.cz-cmp .body-btn.primary { background: var(--brand-strong); color: white; border-color: var(--brand); }
.cz-cmp .body-btn.primary:hover { background: var(--brand); }

/* EMPTY */
.cz-cmp .empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: var(--fg-3); }
.cz-cmp .empty-icon { width: 48px; height: 48px; border-radius: 12px; background: var(--bg-2); display: grid; place-items: center; color: var(--fg-3); margin-bottom: 14px; }
.cz-cmp .empty-title { color: var(--fg-1); font-weight: 600; font-size: 13.5px; }
.cz-cmp .empty-text { font-size: 12px; margin-top: 4px; max-width: 320px; text-align: center; line-height: 1.6; }
`;

// CSS'i tek seferlik enjekte et
if (typeof document !== 'undefined' && !document.getElementById('cz-cmp-style')) {
    const s = document.createElement('style');
    s.id = 'cz-cmp-style';
    s.textContent = DESIGN_CSS;
    document.head.appendChild(s);
}

// ── tiny inline icons (lucide bağımlılığı yok; tasarımla aynı çizimler) ──
const Icon = ({ d, size = 14, stroke = 1.6, className = '' }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
        {d}
    </svg>
);
const I = {
    search: <Icon d={<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" /></>} />,
    chevron: <Icon d={<path d="m6 9 6 6 6-6" />} />,
    trash: <Icon d={<><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>} />,
    copy: <Icon d={<><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>} />,
    check: <Icon d={<path d="M20 6 9 17l-5-5" />} />,
    alert: <Icon d={<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>} />,
    download: <Icon d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>} />,
    bookmark: <Icon d={<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />} />,
    external: <Icon d={<><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></>} />,
    clock: <Icon d={<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>} />,
    play: <Icon d={<polygon points="5 3 19 12 5 21 5 3" />} />,
    refresh: <Icon d={<><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></>} />,
};

// ── helpers ──
const KNOWN_MODULES = ['SD', 'MM', 'FI', 'HR', 'PP', 'CO'];
const moduleSlug = (m) => {
    const up = (m || '').toUpperCase().trim();
    return KNOWN_MODULES.includes(up) ? up.toLowerCase() : 'gen';
};
const sevToken = (s) => {
    const v = (s || '').toLowerCase();
    if (v === 'critical' || v === 'high') return 'high';
    if (v === 'low') return 'low';
    return 'medium';
};
const sevLabel = (s) => {
    const t = sevToken(s);
    return t === 'high' ? 'YÜKSEK' : t === 'low' ? 'DÜŞÜK' : 'ORTA';
};
const fmtDate = (d) => {
    if (!d) return '';
    try {
        return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return String(d).slice(0, 10); }
};
const relTime = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    const now = new Date();
    const days = Math.round((now - dt) / 86400000);
    if (Number.isNaN(days)) return fmtDate(d);
    const time = dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    if (days <= 0) return `Bugün ${time}`;
    if (days === 1) return `Dün ${time}`;
    if (days < 7) return `${days} gün önce`;
    return fmtDate(d);
};

// Backend kayıt → kart modeline dönüştür
const adaptRecord = (rec) => {
    const cevap = rec.cevap_json || {};
    const rawSteps = Array.isArray(cevap.steps) ? cevap.steps : [];
    const steps = rawSteps.map(s => {
        // tcode tek string olabilir; tcodes array olabilir; ikisi de olmayabilir
        let tcodes = [];
        if (Array.isArray(s.tcodes)) tcodes = s.tcodes.filter(Boolean);
        else if (s.tcode) tcodes = [s.tcode];
        return {
            title: s.title || 'Adım',
            tcodes,
            note: s.detail || s.note || '',
        };
    });
    return {
        id: rec.kimlik,
        code: rec.hata_kodu || '—',
        title: rec.baslik || 'Başlıksız hata',
        module: (rec.modul || '').toUpperCase() || 'GEN',
        moduleColor: moduleSlug(rec.modul),
        date: rec.kayit_tarihi || '',
        severity: sevToken(rec.severity),
        description: rec.ozet || cevap.summary || '',
        cause: cevap.cause || '',
        steps,
        docs: Array.isArray(cevap.docs) ? cevap.docs : [],
        raw: rec,
    };
};

// ── kart gövdesi (genişleyen kısım) ──
const CardBody = ({ err, onDelete }) => {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        const text = `${err.code} — ${err.title}\n\n${err.description}\n\n` +
            (err.cause ? `SEBEP: ${err.cause}\n\n` : '') +
            err.steps.map((s, i) => `${i + 1}. ${s.title}${s.tcodes.length ? ` [${s.tcodes.join(', ')}]` : ''}\n   ${s.note}`).join('\n');
        try { navigator.clipboard?.writeText(text); } catch (_) { /* yok say */ }
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
    };

    return (
        <div className="card-body">
            {err.description && <div className="body-desc">{err.description}</div>}
            {err.cause && (
                <div className="cause-block">
                    <div className="cause-label">Sebep</div>
                    <div className="cause-text">{err.cause}</div>
                </div>
            )}
            {err.steps.length > 0 && (
                <>
                    <div className="steps-label">Çözüm Adımları</div>
                    <div className="steps">
                        {err.steps.map((s, i) => (
                            <div className="step" key={i}>
                                <div className="step-num">{i + 1}</div>
                                <div className="step-body">
                                    <div className="step-title">
                                        {s.title}
                                        {s.tcodes.map(tc => <span className="tcode" key={tc}>{tc}</span>)}
                                    </div>
                                    {s.note && <div className="step-note">{s.note}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
            <div className="body-actions">
                <button className="body-btn primary" type="button">
                    {I.play} Çözümü Yeniden Çalıştır
                </button>
                <button className="body-btn" onClick={copy} type="button">
                    {copied ? I.check : I.copy} {copied ? 'Kopyalandı' : 'Çözümü Kopyala'}
                </button>
                <button className="body-btn" type="button">
                    {I.external} Talep Olarak Aç
                </button>
                <button className="body-btn" type="button" onClick={onDelete} style={{ marginLeft: 'auto' }}>
                    {I.trash} Sil
                </button>
            </div>
        </div>
    );
};

// ── kart ──
const ErrorCard = ({ err, expanded, onToggle, onDelete }) => (
    <div className={`card ${expanded ? 'expanded' : ''}`}>
        <div className="card-head" onClick={onToggle}>
            <div className={`sev-rail ${err.severity}`} />
            <div className="card-main">
                <div className="card-codes">
                    <span className="code-chip mono">{err.code}</span>
                    <span className={`module-chip ${err.moduleColor}`}>{err.module}</span>
                </div>
                <div className="card-title">{err.title}</div>
                <div className="card-meta">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {I.clock} {relTime(err.date)}
                    </span>
                    {err.steps.length > 0 && (
                        <>
                            <span className="dot" />
                            <span>{err.steps.length} adım</span>
                        </>
                    )}
                    {err.docs.length > 0 && (
                        <>
                            <span className="dot" />
                            <span>{err.docs.length} belge</span>
                        </>
                    )}
                </div>
            </div>
            <div className="card-side" onClick={(e) => e.stopPropagation()}>
                <span className={`sev-pill ${err.severity}`}>{sevLabel(err.severity)}</span>
                <button className="ghost-btn" type="button" title="Yer işareti">{I.bookmark}</button>
                <button className="ghost-btn danger" type="button" title="Sil" onClick={onDelete}>{I.trash}</button>
                <span className={`chev ${expanded ? 'open' : ''}`}>{I.chevron}</span>
            </div>
        </div>
        {expanded && <CardBody err={err} onDelete={onDelete} />}
    </div>
);

// ── ana viewer ──
const MyResolvedErrorsViewer = ({ currentUser }) => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [sevFilter, setSevFilter] = useState('all');
    const [modFilter, setModFilter] = useState('all');
    const [expandedId, setExpandedId] = useState(null);

    const userId = currentUser?.id;

    const load = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/errors/user/${userId}`);
            const data = await res.json();
            const list = Array.isArray(data?.records) ? data.records.map(adaptRecord) : [];
            setRecords(list);
        } catch (e) {
            console.warn('[MyResolvedErrors] Kayıtlar alınamadı:', e?.message);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => { load(); }, [load]);

    const handleDelete = useCallback(async (kimlik) => {
        if (!window.confirm('Bu kayıt silinsin mi?')) return;
        const r = records.find(x => x.id === kimlik);
        try {
            await mutate.remove(`/api/errors/user-record/${kimlik}`, null, {
                subject: 'Hata çözümü',
                detail: r?.hata_kodu || r?.baslik,
            });
            setRecords(prev => prev.filter(x => x.id !== kimlik));
            if (expandedId === kimlik) setExpandedId(null);
        } catch { /* mutate toast attı */ }
    }, [expandedId, records]);

    // Modül listesi (mevcut kayıtlardan türet)
    const modules = useMemo(() => {
        const set = new Set(records.map(r => r.module).filter(m => m && m !== 'GEN'));
        return ['all', ...set];
    }, [records]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return records.filter(e => {
            if (sevFilter !== 'all' && e.severity !== sevFilter) return false;
            if (modFilter !== 'all' && e.module !== modFilter) return false;
            if (q) {
                const hay = `${e.code} ${e.title} ${e.description} ${e.cause}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [records, search, sevFilter, modFilter]);

    if (!userId) {
        return (
            <div className="cz-cmp">
                <div className="empty" style={{ flex: 1 }}>
                    <div className="empty-icon">{I.alert}</div>
                    <div className="empty-title">Giriş gerekli</div>
                    <div className="empty-text">Bu görünüm için giriş yapmalısınız.</div>
                </div>
            </div>
        );
    }

    return (
        <div className="cz-cmp">
            {/* TOOLBAR */}
            <div className="toolbar">
                <div className="search">
                    <span style={{ color: 'var(--fg-3)', display: 'grid', placeItems: 'center' }}>{I.search}</span>
                    <input
                        placeholder="Hata kodu, başlık veya etiket ara..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <span className="kbd">⌘K</span>
                </div>
                <div className="filter-group">
                    {[
                        ['all', 'Tümü', null],
                        ['high', 'Yüksek', 'var(--sev-high)'],
                        ['medium', 'Orta', 'var(--sev-med)'],
                        ['low', 'Düşük', 'var(--sev-low)'],
                    ].map(([id, label, color]) => (
                        <button
                            key={id}
                            type="button"
                            className={`filter-btn ${sevFilter === id ? 'active' : ''}`}
                            onClick={() => setSevFilter(id)}
                        >
                            {color && <span className="dot" style={{ background: color }} />}
                            {label}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    className="icon-btn"
                    title="Yenile"
                    onClick={load}
                    style={{ opacity: loading ? 0.6 : 1 }}
                >
                    <span style={{
                        display: 'grid', placeItems: 'center',
                        animation: loading ? 'cz-fadeIn 0.2s' : undefined,
                    }}>{I.refresh}</span>
                </button>
                <button type="button" className="icon-btn" title="Dışa Aktar">{I.download}</button>
            </div>

            {/* MODÜL FİLTRESİ */}
            {modules.length > 1 && (
                <div className="mod-row">
                    <span className="mod-label">Modül</span>
                    {modules.map(m => (
                        <button
                            key={m}
                            type="button"
                            className={`filter-btn ${modFilter === m ? 'active' : ''}`}
                            onClick={() => setModFilter(m)}
                            style={{
                                border: '1px solid ' + (modFilter === m ? 'var(--border-2)' : 'transparent'),
                                background: modFilter === m ? 'var(--bg-3)' : 'transparent',
                            }}
                        >
                            {m === 'all' ? 'Tümü' : m}
                        </button>
                    ))}
                </div>
            )}

            {/* LİSTE */}
            <div className="list-wrap scroll">
                <div className="section-label">
                    {I.alert}
                    Chat'ten kaydedilen çözümler
                    <span style={{ color: 'var(--fg-2)', fontWeight: 500, letterSpacing: 0, textTransform: 'none' }}>
                        · {filtered.length}
                    </span>
                    <span className="line" />
                </div>

                {filtered.length === 0 ? (
                    <div className="empty">
                        <div className="empty-icon">{I.search}</div>
                        <div className="empty-title">
                            {records.length === 0 ? 'Henüz kayıt yok' : 'Eşleşen kayıt bulunamadı'}
                        </div>
                        <div className="empty-text">
                            {records.length === 0
                                ? <>Chat'te <em>“Hata Çözümü”</em> hızlı aksiyonuyla cevap aldıktan sonra <strong style={{ color: 'var(--brand)' }}>“+ Hatayı Kaydet”</strong> ile saklayabilirsiniz.</>
                                : 'Filtreleri sıfırlayın veya farklı bir hata kodu/başlık deneyin.'}
                        </div>
                    </div>
                ) : (
                    filtered.map(err => (
                        <ErrorCard
                            key={err.id}
                            err={err}
                            expanded={expandedId === err.id}
                            onToggle={() => setExpandedId(expandedId === err.id ? null : err.id)}
                            onDelete={(e) => {
                                if (e?.stopPropagation) e.stopPropagation();
                                handleDelete(err.id);
                            }}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default MyResolvedErrorsViewer;
