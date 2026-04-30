import React, { useState, useEffect, useCallback, useMemo } from 'react';
import TalepGonderModal from '../../sidebar/TalepGonderModal';

/**
 * Taleplerim — koyu tema, emerald aksanlı workspace görünümü.
 * Tasarım: ekran görüntüsündeki "Sisteme İlettiğim Talepler" paneli.
 * Backend: /api/talepler/benim?kullanici_kimlik=...
 *
 * Ek dosyalar / yorum thread / status history backend'de henüz yok —
 * yorum bölümünde admin notu (yonetici_notu) tek "yorum" olarak
 * gösterilir; status history olusturulma + güncelleme tarihinden
 * türetilir; ek dosyalar gizlenir.
 */

const DESIGN_CSS = `
.tlp-cmp {
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
  --accent: #10b981;
  --accent-soft: rgba(16,185,129,0.14);
  --accent-line: rgba(16,185,129,0.32);
  --st-yeni: #38bdf8;          /* mavi */
  --st-yeni-soft: rgba(56,189,248,0.14);
  --st-incele: #f59e0b;        /* amber */
  --st-incele-soft: rgba(245,158,11,0.14);
  --st-yapiliyor: #8b5cf6;     /* mor */
  --st-yapiliyor-soft: rgba(139,92,246,0.14);
  --st-cozuldu: #10b981;       /* emerald */
  --st-cozuldu-soft: rgba(16,185,129,0.14);
  --st-reddedildi: #ef4444;    /* kırmızı */
  --st-reddedildi-soft: rgba(239,68,68,0.14);
  --pri-low: #4ea76b;
  --pri-med: #b6bdcb;
  --pri-high: #ef4444;
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
  height: 100%; width: 100%;
  background: var(--bg-0); color: var(--fg-0);
  font-family: var(--font-sans); font-size: 14px;
  -webkit-font-smoothing: antialiased;
  display: flex; flex-direction: column;
}
.tlp-cmp *, .tlp-cmp *::before, .tlp-cmp *::after { box-sizing: border-box; }
.tlp-cmp button { font-family: inherit; cursor: pointer; }
.tlp-cmp input, .tlp-cmp textarea, .tlp-cmp select { font-family: inherit; }
.tlp-cmp .mono { font-family: var(--font-mono); }
.tlp-cmp .scroll::-webkit-scrollbar { width: 10px; height: 10px; }
.tlp-cmp .scroll::-webkit-scrollbar-track { background: transparent; }
.tlp-cmp .scroll::-webkit-scrollbar-thumb { background: #232a39; border-radius: 999px; border: 2px solid var(--bg-0); }
.tlp-cmp .scroll::-webkit-scrollbar-thumb:hover { background: #2f3a52; }

/* HEADER */
.tlp-cmp .head { padding: 14px 22px; border-bottom: 1px solid var(--border-1); display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.tlp-cmp .head-title { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--fg-2); }
.tlp-cmp .head-spacer { flex: 1; }
.tlp-cmp .search { display: flex; align-items: center; gap: 8px; background: var(--bg-2); border: 1px solid var(--border-1); border-radius: 8px; padding: 7px 10px; min-width: 240px; }
.tlp-cmp .search:focus-within { border-color: var(--border-strong); }
.tlp-cmp .search input { flex: 1; background: transparent; border: none; outline: none; color: var(--fg-0); font-size: 13px; min-width: 0; }
.tlp-cmp .search input::placeholder { color: var(--fg-3); }
.tlp-cmp .sort { display: flex; align-items: center; gap: 6px; background: var(--bg-2); border: 1px solid var(--border-1); border-radius: 8px; padding: 6px 10px; color: var(--fg-1); font-size: 12px; cursor: pointer; }
.tlp-cmp .sort select { background: transparent; border: none; color: var(--fg-0); font-size: 12px; outline: none; cursor: pointer; }
.tlp-cmp .new-btn { background: var(--accent); color: #04221a; padding: 7px 14px; border-radius: 8px; border: 1px solid var(--accent-line); font-size: 12.5px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; }
.tlp-cmp .new-btn:hover { filter: brightness(1.08); }

/* FILTER CHIPS ROW */
.tlp-cmp .chip-row { padding: 12px 22px; border-bottom: 1px solid var(--border-1); display: flex; gap: 6px; flex-wrap: wrap; }
.tlp-cmp .chip { background: transparent; border: 1px solid transparent; color: var(--fg-2); font-size: 12px; font-weight: 500; padding: 6px 11px; border-radius: 7px; display: inline-flex; align-items: center; gap: 7px; transition: all 0.12s; }
.tlp-cmp .chip:hover { color: var(--fg-0); background: var(--bg-2); }
.tlp-cmp .chip.active { background: var(--bg-3); border-color: var(--border-2); color: var(--fg-0); }
.tlp-cmp .chip-count { font-size: 10.5px; font-weight: 700; color: var(--fg-3); background: var(--bg-1); padding: 1px 6px; border-radius: 999px; min-width: 18px; text-align: center; }
.tlp-cmp .chip.active .chip-count { color: var(--fg-1); background: var(--bg-1); }

/* LIST */
.tlp-cmp .list-wrap { flex: 1; overflow: auto; padding: 14px 22px 22px; }

/* CARD */
.tlp-cmp .card { background: var(--bg-2); border: 1px solid var(--border-1); border-radius: 12px; margin-bottom: 10px; overflow: hidden; transition: border-color 0.15s; position: relative; }
.tlp-cmp .card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--accent); opacity: 0; transition: opacity 0.15s; }
.tlp-cmp .card.expanded { border-color: var(--border-strong); }
.tlp-cmp .card.expanded::before { opacity: 1; }
.tlp-cmp .card:hover { border-color: var(--border-2); }

.tlp-cmp .card-head { display: grid; grid-template-columns: 1fr auto; gap: 14px; padding: 14px 16px 12px; cursor: pointer; }
.tlp-cmp .card-head:hover { background: rgba(255,255,255,0.015); }
.tlp-cmp .card-meta-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
.tlp-cmp .id-chip { font-family: var(--font-mono); font-size: 10.5px; padding: 2px 7px; border-radius: 4px; background: var(--bg-3); color: var(--fg-1); border: 1px solid var(--border-1); letter-spacing: 0.04em; }
.tlp-cmp .cat-chip { font-size: 10.5px; padding: 2px 8px; border-radius: 4px; background: var(--bg-1); color: var(--fg-1); border: 1px solid var(--border-1); display: inline-flex; align-items: center; gap: 4px; }
.tlp-cmp .card-title { font-size: 14.5px; font-weight: 600; color: var(--fg-0); letter-spacing: -0.005em; }
.tlp-cmp .card-meta-bot { display: flex; align-items: center; gap: 12px; margin-top: 6px; font-size: 11.5px; color: var(--fg-2); flex-wrap: wrap; }
.tlp-cmp .card-meta-bot .dot { width: 3px; height: 3px; border-radius: 999px; background: var(--fg-3); }
.tlp-cmp .meta-pill { display: inline-flex; align-items: center; gap: 4px; }

.tlp-cmp .card-side { display: flex; align-items: center; gap: 8px; }
.tlp-cmp .status-pill { font-size: 10px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px; display: inline-flex; align-items: center; gap: 5px; }
.tlp-cmp .status-pill::before { content: ''; width: 5px; height: 5px; border-radius: 999px; background: currentColor; }
.tlp-cmp .status-yeni { color: var(--st-yeni); background: var(--st-yeni-soft); }
.tlp-cmp .status-incelemede { color: var(--st-incele); background: var(--st-incele-soft); }
.tlp-cmp .status-yapiliyor { color: var(--st-yapiliyor); background: var(--st-yapiliyor-soft); }
.tlp-cmp .status-cozuldu { color: var(--st-cozuldu); background: var(--st-cozuldu-soft); }
.tlp-cmp .status-reddedildi { color: var(--st-reddedildi); background: var(--st-reddedildi-soft); }

.tlp-cmp .chev { color: var(--fg-3); transition: transform 0.18s ease; display: grid; place-items: center; }
.tlp-cmp .chev.open { transform: rotate(180deg); }

.tlp-cmp .assignee { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--fg-1); }
.tlp-cmp .ava { width: 18px; height: 18px; border-radius: 5px; background: linear-gradient(135deg, #c9263a 0%, #7c1421 100%); color: white; display: grid; place-items: center; font-size: 9px; font-weight: 700; letter-spacing: 0.04em; }
.tlp-cmp .ava.lg { width: 26px; height: 26px; font-size: 10px; border-radius: 6px; }
.tlp-cmp .badge-count { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; color: var(--fg-2); }

/* CARD BODY (expanded) */
.tlp-cmp .card-body { padding: 14px 16px 18px; border-top: 1px dashed var(--border-1); animation: tlp-fade 0.18s ease; display: grid; grid-template-columns: 1fr 220px; gap: 18px; }
@keyframes tlp-fade { from { opacity: 0; transform: translateY(-2px); } to { opacity: 1; transform: translateY(0); } }
.tlp-cmp .body-main { min-width: 0; }
.tlp-cmp .body-side { display: flex; flex-direction: column; gap: 14px; padding-left: 16px; border-left: 1px solid var(--border-1); }

.tlp-cmp .body-desc { color: var(--fg-1); font-size: 13px; line-height: 1.6; margin-bottom: 12px; white-space: pre-wrap; }
.tlp-cmp .tags-row { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 14px; }
.tlp-cmp .tag { font-size: 11px; color: var(--accent); background: var(--accent-soft); border: 1px solid var(--accent-line); padding: 1px 7px; border-radius: 4px; font-family: var(--font-mono); }

.tlp-cmp .section-head { font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--fg-3); font-weight: 700; margin: 12px 0 8px; display: flex; align-items: center; gap: 6px; }

/* TIMELINE */
.tlp-cmp .timeline { position: relative; padding-left: 16px; }
.tlp-cmp .timeline::before { content: ''; position: absolute; left: 4px; top: 6px; bottom: 6px; width: 1px; background: var(--border-1); }
.tlp-cmp .tl-item { position: relative; padding: 5px 0; font-size: 12px; }
.tlp-cmp .tl-item::before { content: ''; position: absolute; left: -16px; top: 9px; width: 9px; height: 9px; border-radius: 999px; background: var(--bg-0); border: 2px solid var(--border-strong); }
.tlp-cmp .tl-item.accent::before { border-color: var(--accent); }
.tlp-cmp .tl-item.amber::before { border-color: var(--st-incele); }
.tlp-cmp .tl-actor { color: var(--fg-1); font-weight: 600; }
.tlp-cmp .tl-text { color: var(--fg-1); margin-top: 1px; }
.tlp-cmp .tl-time { color: var(--fg-3); font-size: 11px; margin-top: 2px; }

/* COMMENTS */
.tlp-cmp .comments { display: flex; flex-direction: column; gap: 10px; margin-top: 6px; }
.tlp-cmp .comment { background: var(--bg-1); border: 1px solid var(--border-1); border-radius: 10px; padding: 10px 12px; }
.tlp-cmp .comment-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.tlp-cmp .comment-actor { font-size: 12px; font-weight: 600; color: var(--fg-0); }
.tlp-cmp .comment-time { font-size: 10.5px; color: var(--fg-3); margin-left: auto; }
.tlp-cmp .comment-body { font-size: 12.5px; color: var(--fg-1); line-height: 1.55; white-space: pre-wrap; }
.tlp-cmp .reply-row { display: flex; align-items: center; gap: 10px; margin-top: 4px; padding: 8px 12px; background: var(--bg-1); border: 1px solid var(--border-1); border-radius: 10px; }
.tlp-cmp .reply-row input { flex: 1; background: transparent; border: none; outline: none; color: var(--fg-0); font-size: 12.5px; }
.tlp-cmp .reply-row input::placeholder { color: var(--fg-3); }
.tlp-cmp .reply-send { background: var(--bg-3); color: var(--fg-2); border: 1px solid var(--border-2); padding: 6px 12px; border-radius: 7px; font-size: 11.5px; display: inline-flex; align-items: center; gap: 5px; }
.tlp-cmp .reply-send:disabled { opacity: 0.6; cursor: not-allowed; }

/* SIDE PANEL FIELDS */
.tlp-cmp .side-field { display: flex; flex-direction: column; gap: 4px; }
.tlp-cmp .side-label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--fg-3); font-weight: 700; }
.tlp-cmp .side-value { font-size: 12.5px; color: var(--fg-0); display: inline-flex; align-items: center; gap: 6px; }
.tlp-cmp .side-mute { font-size: 12px; color: var(--fg-2); }

/* EMPTY */
.tlp-cmp .empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: var(--fg-3); }
.tlp-cmp .empty-icon { width: 48px; height: 48px; border-radius: 12px; background: var(--bg-2); display: grid; place-items: center; color: var(--fg-3); margin-bottom: 14px; }
.tlp-cmp .empty-title { color: var(--fg-1); font-weight: 600; font-size: 13.5px; }
.tlp-cmp .empty-text { font-size: 12px; margin-top: 4px; max-width: 340px; text-align: center; line-height: 1.6; }

/* RESPONSIVE — sidebar altta görüntülensin küçük ekranlarda */
@media (max-width: 880px) {
  .tlp-cmp .card-body { grid-template-columns: 1fr; }
  .tlp-cmp .body-side { padding-left: 0; border-left: none; border-top: 1px solid var(--border-1); padding-top: 12px; }
}
`;

if (typeof document !== 'undefined' && !document.getElementById('tlp-cmp-style')) {
    const s = document.createElement('style');
    s.id = 'tlp-cmp-style';
    s.textContent = DESIGN_CSS;
    document.head.appendChild(s);
}

// ── inline svg icons ──
const Icon = ({ d, size = 14, stroke = 1.6 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const I = {
    search:  <Icon d={<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" /></>} />,
    plus:    <Icon d={<><path d="M12 5v14" /><path d="M5 12h14" /></>} />,
    chev:    <Icon d={<path d="m6 9 6 6 6-6" />} />,
    cal:     <Icon d={<><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>} />,
    flag:    <Icon d={<><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></>} />,
    msg:     <Icon d={<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />} />,
    paper:   <Icon d={<><path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49L12.95 2.56a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83L15.07 6.1" /></>} />,
    send:    <Icon d={<><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>} />,
    inbox:   <Icon d={<><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>} />,
    file:    <Icon d={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>} />,
    img:     <Icon d={<><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>} />,
    refresh: <Icon d={<><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></>} />,
    link:    <Icon d={<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>} />,
    history: <Icon d={<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>} />,
    bell:    <Icon d={<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>} />,
};

// ── helpers ──
const KATEGORI_LABEL = {
    erisim:    'Erişim Talebi',
    kota:      'Kota Artırımı',
    egitim:    'Eğitim',
    hata:      'Hata Bildirimi',
    zli_rapor: "Z'li Rapor İsteği",
    diger:     'Diğer',
};
const ONCELIK_LABEL = { dusuk: 'Düşük', orta: 'Orta', yuksek: 'Yüksek', orta_default: 'Normal' };
const ONCELIK_COLOR = (p) => p === 'yuksek' ? 'var(--pri-high)' : p === 'dusuk' ? 'var(--pri-low)' : 'var(--pri-med)';

// Backend durum + admin notu/tarihi → UI status (yeni/incelemede/yapiliyor/cozuldu/reddedildi)
const uiStatus = (talep) => {
    const d = (talep.durum || '').toLowerCase();
    if (d === 'reddedildi') return 'reddedildi';
    if (d === 'tamamlandi') return 'cozuldu';
    if (d === 'onaylandi') return 'yapiliyor';
    // incelemede
    if (talep.yonetici_notu || talep.yonetici_kimlik) return 'incelemede';
    return 'yeni';
};
const STATUS_LABEL = {
    yeni:       'YENİ',
    incelemede: 'İNCELEMEDE',
    yapiliyor:  'YAPILIYOR',
    cozuldu:    'ÇÖZÜLDÜ',
    reddedildi: 'REDDEDİLDİ',
};

const fmtDate = (iso) => {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return String(iso).slice(0, 10); }
};
const fmtDateTime = (iso) => {
    if (!iso) return '';
    try {
        const dt = new Date(iso);
        return dt.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
               ' ' + dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } catch { return String(iso); }
};
const relTime = (iso) => {
    if (!iso) return '';
    const dt = new Date(iso);
    const days = Math.round((Date.now() - dt) / 86400000);
    if (Number.isNaN(days)) return fmtDate(iso);
    if (days <= 0) return 'Bugün';
    if (days === 1) return '1 gün önce';
    if (days < 7) return `${days} gün önce`;
    return fmtDate(iso);
};

// "TLP-A1B2" gibi kısa ID
const shortId = (id) => {
    if (!id) return 'TLP-—';
    const cleaned = String(id).replace(/-/g, '').toUpperCase();
    return 'TLP-' + cleaned.slice(0, 4);
};

const initials = (name) => {
    if (!name) return 'KU';
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'KU';
};

// Mesajdan #etiket çıkar
const extractTags = (mesaj) => {
    if (!mesaj) return [];
    const matches = mesaj.match(/#[\wçğıöşüÇĞİÖŞÜ_-]+/g);
    return matches ? [...new Set(matches.map(t => t.toLowerCase()))].slice(0, 8) : [];
};

// ── Sidebar kart üzerindeki meta (Durum/Öncelik/Kategori/...) ──
const StatusPill = ({ status }) => (
    <span className={`status-pill status-${status}`}>{STATUS_LABEL[status]}</span>
);

const RequestCard = ({ talep, expanded, onToggle, currentUserName }) => {
    const status = uiStatus(talep);
    const cat = KATEGORI_LABEL[talep.kategori] || talep.kategori || 'Diğer';
    const oncLabel = ONCELIK_LABEL[talep.oncelik] || 'Normal';
    const oncColor = ONCELIK_COLOR(talep.oncelik);
    const tags = useMemo(() => extractTags(talep.mesaj), [talep.mesaj]);
    const desc = useMemo(() => (talep.mesaj || '').replace(/#[\wçğıöşüÇĞİÖŞÜ_-]+/g, '').trim(), [talep.mesaj]);
    const adminName = talep.yonetici_adi || (talep.yonetici_kimlik ? 'Yönetici' : null);
    const commentCount = talep.yonetici_notu ? 1 : 0;

    // Status history türet
    const history = useMemo(() => {
        const arr = [];
        arr.push({
            actor:  currentUserName || 'Sen',
            text:   'Talep oluşturuldu',
            time:   talep.olusturulma_tarihi,
            kind:   'accent',
        });
        if (talep.yonetici_kimlik) {
            arr.push({
                actor: 'Sistem',
                text:  'İlgili ekibe atandı',
                time:  talep.olusturulma_tarihi,
                kind:  '',
            });
            arr.push({
                actor: adminName || 'Yönetici',
                text:  'İncelemeye alındı',
                time:  talep.guncelleme_tarihi || talep.olusturulma_tarihi,
                kind:  'amber',
            });
        }
        if (talep.yonetici_notu) {
            arr.push({
                actor: adminName || 'Yönetici',
                text:  'Geri bildirim eklendi',
                time:  talep.guncelleme_tarihi || talep.olusturulma_tarihi,
                kind:  'accent',
            });
        }
        if (status === 'cozuldu') {
            arr.push({ actor: adminName || 'Yönetici', text: 'Talep çözüldü', time: talep.guncelleme_tarihi, kind: 'accent' });
        }
        if (status === 'reddedildi') {
            arr.push({ actor: adminName || 'Yönetici', text: 'Talep reddedildi', time: talep.guncelleme_tarihi, kind: 'amber' });
        }
        return arr;
    }, [talep, status, adminName, currentUserName]);

    return (
        <div className={`card ${expanded ? 'expanded' : ''}`}>
            <div className="card-head" onClick={onToggle}>
                <div style={{ minWidth: 0 }}>
                    <div className="card-meta-top">
                        <span className="id-chip mono">{shortId(talep.id)}</span>
                        <span className="cat-chip">{cat}</span>
                    </div>
                    <div className="card-title">{talep.baslik || 'Adsız Talep'}</div>
                    <div className="card-meta-bot">
                        <span className="meta-pill" style={{ color: 'var(--fg-2)' }}>
                            {I.cal} {fmtDate(talep.olusturulma_tarihi)}
                        </span>
                        <span className="dot" />
                        <span className="meta-pill" style={{ color: oncColor }}>
                            {I.flag} {oncLabel}
                        </span>
                        {adminName ? (
                            <>
                                <span className="dot" />
                                <span className="assignee">
                                    <span className="ava">{initials(adminName)}</span>
                                    {adminName}
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="dot" />
                                <span style={{ color: 'var(--fg-3)' }}>atanmamış</span>
                            </>
                        )}
                        {commentCount > 0 && (
                            <>
                                <span className="dot" />
                                <span className="badge-count">{I.msg} {commentCount}</span>
                            </>
                        )}
                    </div>
                </div>
                <div className="card-side" onClick={(e) => e.stopPropagation()}>
                    <StatusPill status={status} />
                    <span className={`chev ${expanded ? 'open' : ''}`} onClick={onToggle}>{I.chev}</span>
                </div>
            </div>

            {expanded && (
                <div className="card-body">
                    <div className="body-main">
                        {desc ? <div className="body-desc">{desc}</div> : <div className="body-desc" style={{ color: 'var(--fg-3)', fontStyle: 'italic' }}>Açıklama eklenmemiş.</div>}

                        {tags.length > 0 && (
                            <div className="tags-row">
                                {tags.map((t, i) => <span key={i} className="tag">{t}</span>)}
                            </div>
                        )}

                        <div className="section-head">{I.history} Durum Geçmişi</div>
                        <div className="timeline">
                            {history.map((h, i) => (
                                <div key={i} className={`tl-item ${h.kind}`}>
                                    <div><span className="tl-actor">{h.actor}</span> <span style={{ color: 'var(--fg-2)' }}>— {h.text}</span></div>
                                    <div className="tl-time">{fmtDateTime(h.time)}</div>
                                </div>
                            ))}
                        </div>

                        <div className="section-head">{I.msg} Yorumlar ({commentCount})</div>
                        {talep.yonetici_notu ? (
                            <div className="comments">
                                <div className="comment">
                                    <div className="comment-head">
                                        <span className="ava">{initials(adminName || 'Yönetici')}</span>
                                        <span className="comment-actor">{adminName || 'Yönetici'}</span>
                                        <span className="comment-time">{relTime(talep.guncelleme_tarihi)}</span>
                                    </div>
                                    <div className="comment-body">{talep.yonetici_notu}</div>
                                </div>
                            </div>
                        ) : (
                            <div className="side-mute" style={{ fontSize: 12, color: 'var(--fg-3)', padding: '4px 0' }}>
                                Henüz yönetici yorumu yok.
                            </div>
                        )}

                        <div className="reply-row" style={{ marginTop: 10 }}>
                            <span className="ava">{initials(currentUserName)}</span>
                            <input placeholder="Yanıt ekle... (yorum gönderimi yakında aktif olacak)" disabled />
                            <button className="reply-send" disabled>{I.send} Gönder</button>
                        </div>
                    </div>

                    <div className="body-side">
                        <div className="side-field">
                            <span className="side-label">Durum</span>
                            <StatusPill status={status} />
                        </div>
                        <div className="side-field">
                            <span className="side-label">Öncelik</span>
                            <span className="side-value" style={{ color: oncColor }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: oncColor }} />
                                {oncLabel}
                            </span>
                        </div>
                        <div className="side-field">
                            <span className="side-label">Kategori</span>
                            <span className="side-value">{cat}</span>
                        </div>
                        <div className="side-field">
                            <span className="side-label">Atanan</span>
                            {adminName ? (
                                <span className="assignee">
                                    <span className="ava lg">{initials(adminName)}</span>
                                    <span className="side-value" style={{ fontSize: 12 }}>
                                        {adminName}
                                        <span style={{ display: 'block', fontSize: 10.5, color: 'var(--fg-3)', fontWeight: 400 }}>Yönetici</span>
                                    </span>
                                </span>
                            ) : (
                                <span className="side-mute">atanmamış</span>
                            )}
                        </div>
                        <div className="side-field">
                            <span className="side-label">Oluşturulma</span>
                            <span className="side-value" style={{ fontSize: 12 }}>{fmtDate(talep.olusturulma_tarihi)}</span>
                        </div>
                        <div className="side-field">
                            <span className="side-label">Son Güncelleme</span>
                            <span className="side-value" style={{ fontSize: 12 }}>{fmtDate(talep.guncelleme_tarihi || talep.olusturulma_tarihi)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const SORT_OPTIONS = [
    { id: 'newest',  label: 'En yeni' },
    { id: 'oldest',  label: 'En eski' },
    { id: 'priority', label: 'Önceliğe göre' },
];

const PRIORITY_RANK = { yuksek: 0, orta: 1, dusuk: 2 };

const STATUS_CHIPS = [
    { id: 'all',        label: 'Tümü' },
    { id: 'open',       label: 'Açık' },
    { id: 'yeni',       label: 'Yeni' },
    { id: 'incelemede', label: 'İncelemede' },
    { id: 'yapiliyor',  label: 'Yapılıyor' },
    { id: 'cozuldu',    label: 'Çözüldü' },
    { id: 'reddedildi', label: 'Reddedildi' },
];

const MyRequestsViewer = ({ currentUser }) => {
    const [talepler, setTalepler] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortMode, setSortMode] = useState('newest');
    const [expandedId, setExpandedId] = useState(null);
    const [newModalOpen, setNewModalOpen] = useState(false);

    const userId = currentUser?.id;
    const userName = currentUser?.tam_ad || 'Sen';

    const load = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/talepler/benim?kullanici_kimlik=${userId}`);
            const data = await res.json();
            setTalepler(Array.isArray(data) ? data : []);
        } catch (e) {
            console.warn('[MyRequests] Talepler alınamadı:', e?.message);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => { load(); }, [load]);

    // Counts per chip
    const counts = useMemo(() => {
        const map = { all: talepler.length, open: 0, yeni: 0, incelemede: 0, yapiliyor: 0, cozuldu: 0, reddedildi: 0 };
        talepler.forEach(t => {
            const s = uiStatus(t);
            if (map[s] !== undefined) map[s] += 1;
            if (s !== 'cozuldu' && s !== 'reddedildi') map.open += 1;
        });
        return map;
    }, [talepler]);

    // Filtered + sorted list
    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        let arr = talepler.filter(t => {
            const s = uiStatus(t);
            if (statusFilter === 'open' && (s === 'cozuldu' || s === 'reddedildi')) return false;
            if (statusFilter !== 'all' && statusFilter !== 'open' && s !== statusFilter) return false;
            if (q) {
                const hay = `${t.baslik || ''} ${t.mesaj || ''} ${t.kategori || ''} ${shortId(t.id)}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });

        if (sortMode === 'newest') {
            arr.sort((a, b) => String(b.olusturulma_tarihi || '').localeCompare(String(a.olusturulma_tarihi || '')));
        } else if (sortMode === 'oldest') {
            arr.sort((a, b) => String(a.olusturulma_tarihi || '').localeCompare(String(b.olusturulma_tarihi || '')));
        } else if (sortMode === 'priority') {
            arr.sort((a, b) => (PRIORITY_RANK[a.oncelik] ?? 99) - (PRIORITY_RANK[b.oncelik] ?? 99));
        }
        return arr;
    }, [talepler, search, statusFilter, sortMode]);

    if (!userId) {
        return (
            <div className="tlp-cmp">
                <div className="empty" style={{ flex: 1 }}>
                    <div className="empty-icon">{I.bell}</div>
                    <div className="empty-title">Giriş gerekli</div>
                    <div className="empty-text">Bu görünüm için giriş yapmalısınız.</div>
                </div>
            </div>
        );
    }

    return (
        <div className="tlp-cmp">
            {/* HEADER */}
            <div className="head">
                <span className="head-title">Sisteme İlettiğim Talepler</span>
                <div className="head-spacer" />
                <div className="search">
                    <span style={{ color: 'var(--fg-3)', display: 'grid', placeItems: 'center' }}>{I.search}</span>
                    <input
                        placeholder="Talep ara..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <label className="sort">
                    <select value={sortMode} onChange={e => setSortMode(e.target.value)}>
                        {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                </label>
                <button className="new-btn" type="button" onClick={() => setNewModalOpen(true)}>
                    {I.plus} Yeni Talep
                </button>
                <button
                    type="button"
                    title="Yenile"
                    onClick={load}
                    style={{
                        background: 'var(--bg-2)', border: '1px solid var(--border-1)',
                        color: loading ? 'var(--fg-3)' : 'var(--fg-1)',
                        width: 32, height: 32, borderRadius: 8,
                        display: 'grid', placeItems: 'center',
                    }}
                >{I.refresh}</button>
            </div>

            {/* STATUS CHIPS */}
            <div className="chip-row">
                {STATUS_CHIPS.map(c => (
                    <button
                        key={c.id}
                        type="button"
                        className={`chip ${statusFilter === c.id ? 'active' : ''}`}
                        onClick={() => setStatusFilter(c.id)}
                    >
                        {c.label}
                        <span className="chip-count">{counts[c.id] ?? 0}</span>
                    </button>
                ))}
            </div>

            {/* LIST */}
            <div className="list-wrap scroll">
                {visible.length === 0 ? (
                    <div className="empty">
                        <div className="empty-icon">{I.inbox}</div>
                        <div className="empty-title">
                            {talepler.length === 0 ? 'Henüz bir talep yok' : 'Eşleşen talep yok'}
                        </div>
                        <div className="empty-text">
                            {talepler.length === 0
                                ? <>“+ Yeni Talep” ile yöneticilere iletmek istediğiniz konuyu yazın.</>
                                : 'Arama veya filtreyi temizleyin.'}
                        </div>
                    </div>
                ) : (
                    visible.map(t => (
                        <RequestCard
                            key={t.id}
                            talep={t}
                            expanded={expandedId === t.id}
                            onToggle={() => setExpandedId(expandedId === t.id ? null : t.id)}
                            currentUserName={userName}
                        />
                    ))
                )}
            </div>

            {/* + Yeni Talep modal — mevcut bileşen, kayıtla load() */}
            <TalepGonderModal
                open={newModalOpen}
                onClose={() => setNewModalOpen(false)}
                currentUser={currentUser}
                onSubmitted={() => { setNewModalOpen(false); load(); }}
            />
        </div>
    );
};

export default MyRequestsViewer;
