import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useErrorStore } from '../../store/errorStore';

/**
 * Profilim — Claude Design "Klasik Koyu" varyantı.
 * Tasarım birebir aktarımı (Profilim - Koyu Tema.html):
 *   - bg: #050507 / kart: #1a1a1d / border: rgba(255,255,255,0.06)
 *   - aksan: #a01b1b → #d24452 gradyanı, metin #e87080
 *   - 1080px konteyner; üstte identity card (300px) + (stats + storage)
 *   - sonra "Açık Taleplerim" + "Son Dosyalarım" kartları
 *
 * Backend:
 *   GET   /api/auth/users
 *   GET   /api/auth/users/{id}/dashboard
 *   GET   /api/archive/quota/{id}
 *   GET   /api/archive/my-documents/{id}
 *   GET   /api/talepler/benim?kullanici_kimlik={id}
 *   PATCH /api/auth/users/{id}/profile
 */

const DESIGN_CSS = `
.prf-cmp {
  --bg: #050507;
  --card: #1a1a1d;
  --card-2: #0e0e10;
  --bd: rgba(255,255,255,0.06);
  --bd-strong: rgba(255,255,255,0.10);
  --hover: rgba(255,255,255,0.02);
  --hover-2: rgba(255,255,255,0.04);
  --hover-3: rgba(255,255,255,0.08);
  --brand-1: #a01b1b;
  --brand-2: #d24452;
  --brand-text: #e87080;
  --brand-text-hover: #ff8a99;
  --fg-85: rgba(255,255,255,0.85);
  --fg-65: rgba(255,255,255,0.65);
  --fg-55: rgba(255,255,255,0.55);
  --fg-45: rgba(255,255,255,0.45);
  --fg-40: rgba(255,255,255,0.40);
  --fg-35: rgba(255,255,255,0.35);
  --fg-20: rgba(255,255,255,0.20);
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
  height: 100%; width: 100%;
  background: var(--bg); color: var(--fg-85);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  display: flex; flex-direction: column;
}
.prf-cmp *, .prf-cmp *::before, .prf-cmp *::after { box-sizing: border-box; }
.prf-cmp button { font-family: inherit; cursor: pointer; }
.prf-cmp input { font-family: inherit; }
.prf-cmp .scroll::-webkit-scrollbar { width: 10px; height: 10px; }
.prf-cmp .scroll::-webkit-scrollbar-track { background: transparent; }
.prf-cmp .scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 999px; border: 2px solid var(--bg); }
.prf-cmp .scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.12); }

/* SHELL */
.prf-cmp .shell { width: min(1080px, 100%); margin: 0 auto; padding: 24px 22px 28px; }

/* HEADER STRIP */
.prf-cmp .head-strip { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; gap: 14px; }
.prf-cmp .head-title { font-size: 14px; font-weight: 600; color: white; display: inline-flex; align-items: center; gap: 8px; }
.prf-cmp .head-title svg { color: #d24452; }
.prf-cmp .head-sub { font-size: 11px; color: var(--fg-45); margin-top: 4px; }
.prf-cmp .logout-btn { display: inline-flex; align-items: center; gap: 8px; background: var(--hover-2); border: 1px solid var(--bd-strong); color: rgba(255,255,255,0.80); padding: 6px 14px; border-radius: 6px; font-size: 11px; font-weight: 500; transition: background-color 0.12s; }
.prf-cmp .logout-btn:hover { background: var(--hover-3); }

/* TOP GRID — 300px identity + 1fr right */
.prf-cmp .top-grid { display: grid; grid-template-columns: 300px 1fr; gap: 16px; }

/* COMMON CARD */
.prf-cmp .card { background: var(--card); border: 1px solid var(--bd); border-radius: 12px; }

/* IDENTITY CARD */
.prf-cmp .id-card { padding: 20px; display: flex; flex-direction: column; }
.prf-cmp .id-row { display: flex; align-items: flex-start; gap: 14px; }
.prf-cmp .avatar { position: relative; width: 56px; height: 56px; flex-shrink: 0; border-radius: 999px; background: linear-gradient(135deg, #a01b1b 0%, #5e0f0f 100%); display: grid; place-items: center; color: white; font-size: 16px; font-weight: 600; box-shadow: 0 4px 18px -4px rgba(160,27,27,0.6); }
.prf-cmp .avatar .dot-online { position: absolute; bottom: 0; right: 0; width: 14px; height: 14px; border-radius: 999px; background: #34d399; border: 2px solid var(--card); }
.prf-cmp .id-name { padding-top: 4px; }
.prf-cmp .id-name .nm { font-size: 13px; font-weight: 600; color: white; }
.prf-cmp .id-name .em { font-size: 11px; color: var(--fg-45); margin-top: 2px; }
.prf-cmp .pill-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 16px; }
.prf-cmp .pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 500; border: 1px solid; }
.prf-cmp .pill.ok { background: rgba(16,185,129,0.10); color: #6ee7b7; border-color: rgba(16,185,129,0.20); }
.prf-cmp .pill.ok::before { content: ''; width: 6px; height: 6px; border-radius: 999px; background: #34d399; }
.prf-cmp .pill.role { background: rgba(160,27,27,0.15); color: #e87080; border-color: rgba(160,27,27,0.30); text-transform: uppercase; letter-spacing: 0.05em; }
.prf-cmp .pill.role svg { color: #e87080; }
.prf-cmp .meta-grid { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--bd); display: grid; grid-template-columns: 1fr 1fr; row-gap: 12px; column-gap: 12px; }
.prf-cmp .meta-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-35); font-weight: 600; margin-bottom: 4px; }
.prf-cmp .meta-value { font-size: 11px; color: var(--fg-85); display: inline-flex; align-items: center; gap: 6px; font-weight: 500; }
.prf-cmp .meta-value.ok { color: #6ee7b7; }
.prf-cmp .meta-value svg { color: var(--fg-40); }
.prf-cmp .edit-btn { margin-top: 20px; width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: var(--hover-2); border: 1px solid var(--bd-strong); color: rgba(255,255,255,0.80); padding: 8px; border-radius: 6px; font-size: 11px; font-weight: 500; transition: background-color 0.12s; }
.prf-cmp .edit-btn:hover { background: var(--hover-3); }
.prf-cmp .name-edit-row { margin-top: 20px; display: flex; gap: 6px; }
.prf-cmp .name-input { flex: 1; background: var(--card-2); border: 1px solid rgba(160,27,27,0.4); border-radius: 6px; padding: 7px 10px; color: white; font-size: 12px; outline: none; min-width: 0; }
.prf-cmp .name-input:focus { border-color: var(--brand-text); }
.prf-cmp .name-save, .prf-cmp .name-cancel { padding: 7px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; border: none; }
.prf-cmp .name-save { background: var(--brand-1); color: white; }
.prf-cmp .name-cancel { background: var(--hover-2); color: var(--fg-55); border: 1px solid var(--bd-strong); }

/* RIGHT COLUMN — stats row + storage */
.prf-cmp .right-col { display: flex; flex-direction: column; gap: 16px; }
.prf-cmp .stats-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.prf-cmp .stat-card { padding: 16px; }
.prf-cmp .stat-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.prf-cmp .stat-icon { width: 24px; height: 24px; border-radius: 6px; background: rgba(160,27,27,0.15); border: 1px solid rgba(160,27,27,0.25); display: grid; place-items: center; color: var(--brand-text); }
.prf-cmp .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--fg-45); font-weight: 700; }
.prf-cmp .stat-value { font-size: 28px; font-weight: 600; color: white; line-height: 1; }
.prf-cmp .stat-sub { font-size: 10px; color: var(--fg-40); margin-top: 6px; }

/* STORAGE */
.prf-cmp .storage { padding: 20px; flex: 1; }
.prf-cmp .storage-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; gap: 12px; }
.prf-cmp .storage-h-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--fg-55); }
.prf-cmp .storage-h-sub { font-size: 10px; color: var(--fg-35); margin-top: 2px; }
.prf-cmp .detail-link { font-size: 10px; color: var(--brand-text); display: inline-flex; align-items: center; gap: 4px; font-weight: 500; cursor: pointer; background: transparent; border: none; padding: 0; }
.prf-cmp .detail-link:hover { color: var(--brand-text-hover); }
.prf-cmp .storage-body { display: grid; grid-template-columns: 140px 1fr; gap: 20px; align-items: center; }
.prf-cmp .ring { position: relative; width: 140px; height: 140px; }
.prf-cmp .ring svg { width: 100%; height: 100%; }
.prf-cmp .ring-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; pointer-events: none; }
.prf-cmp .ring-center .ring-mb { font-size: 15px; font-weight: 600; color: white; line-height: 1; }
.prf-cmp .ring-center .ring-mb .unit { font-size: 10px; color: var(--fg-45); font-weight: 500; }
.prf-cmp .ring-center .ring-pct { font-size: 9px; color: var(--fg-40); margin-top: 6px; text-transform: uppercase; letter-spacing: 0.06em; }
.prf-cmp .breakdown { display: flex; flex-direction: column; gap: 8px; }
.prf-cmp .bd-row { display: grid; grid-template-columns: 80px 1fr 60px; align-items: center; gap: 12px; }
.prf-cmp .bd-name { font-size: 11px; color: var(--fg-65); }
.prf-cmp .bd-bar { height: 6px; border-radius: 999px; background: rgba(255,255,255,0.05); overflow: hidden; }
.prf-cmp .bd-fill { height: 100%; background: linear-gradient(90deg, #a01b1b 0%, #d24452 100%); border-radius: 999px; transition: width 0.4s ease; }
.prf-cmp .bd-count { font-size: 10px; color: var(--fg-45); text-align: right; }

/* SECTION CARDS */
.prf-cmp .sec-card { margin-top: 16px; }
.prf-cmp .sec-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-bottom: 1px solid var(--bd); gap: 8px; flex-wrap: wrap; }
.prf-cmp .sec-head-l { display: inline-flex; align-items: center; gap: 8px; }
.prf-cmp .sec-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--fg-55); }
.prf-cmp .sec-count { font-size: 10px; color: var(--fg-35); }
.prf-cmp .sec-head-r { display: inline-flex; align-items: center; gap: 8px; }
.prf-cmp .alert-pill { display: inline-flex; align-items: center; gap: 4px; background: rgba(245,158,11,0.10); color: #fcd34d; border: 1px solid rgba(245,158,11,0.20); padding: 2px 7px; border-radius: 6px; font-size: 9px; font-weight: 500; }
.prf-cmp .new-btn { display: inline-flex; align-items: center; gap: 4px; background: var(--hover-2); border: 1px solid var(--bd-strong); color: rgba(255,255,255,0.75); padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 500; transition: background-color 0.12s; }
.prf-cmp .new-btn:hover { background: var(--hover-3); }
.prf-cmp .sec-divide > * + * { border-top: 1px solid rgba(255,255,255,0.04); }

/* REQUEST ROW */
.prf-cmp .req-row { display: grid; grid-template-columns: 90px 1fr 90px 130px 100px 30px; gap: 16px; align-items: center; padding: 12px 20px; transition: background-color 0.12s; }
.prf-cmp .req-row:hover { background: var(--hover); }
.prf-cmp .req-id { font-size: 10px; color: var(--fg-40); font-family: var(--font-mono); }
.prf-cmp .req-title-wrap { display: flex; align-items: center; gap: 8px; min-width: 0; }
.prf-cmp .prio-rail { width: 4px; height: 16px; border-radius: 2px; flex-shrink: 0; }
.prf-cmp .prio-rail.high { background: #fb7185; }
.prf-cmp .prio-rail.med  { background: #fbbf24; }
.prf-cmp .prio-rail.low  { background: rgba(255,255,255,0.15); }
.prf-cmp .req-title { font-size: 12px; color: var(--fg-85); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.prf-cmp .prio-text { font-size: 10px; font-weight: 500; }
.prf-cmp .prio-text.high { color: #fda4af; }
.prf-cmp .prio-text.med  { color: #fcd34d; }
.prf-cmp .prio-text.low  { color: var(--fg-45); }
.prf-cmp .state-pill { font-size: 10px; font-weight: 500; padding: 2px 8px; border-radius: 6px; border: 1px solid; width: max-content; }
.prf-cmp .state-incele     { background: rgba(56,189,248,0.10); color: #7dd3fc;  border-color: rgba(56,189,248,0.20); }
.prf-cmp .state-onayBekl   { background: rgba(245,158,11,0.10); color: #fcd34d;  border-color: rgba(245,158,11,0.20); }
.prf-cmp .state-bilgiBekl  { background: rgba(139,92,246,0.10); color: #c4b5fd;  border-color: rgba(139,92,246,0.20); }
.prf-cmp .state-yapiliyor  { background: rgba(168,85,247,0.10); color: #d8b4fe;  border-color: rgba(168,85,247,0.20); }
.prf-cmp .state-cozuldu    { background: rgba(16,185,129,0.10); color: #6ee7b7;  border-color: rgba(16,185,129,0.20); }
.prf-cmp .state-reddedildi { background: rgba(239,68,68,0.10);  color: #fca5a5;  border-color: rgba(239,68,68,0.20); }
.prf-cmp .req-meta { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; color: var(--fg-40); }
.prf-cmp .req-meta .sep { color: var(--fg-20); }
.prf-cmp .req-action { background: transparent; border: none; color: var(--fg-40); opacity: 0; transition: opacity 0.12s, color 0.12s; padding: 4px; border-radius: 4px; }
.prf-cmp .req-row:hover .req-action { opacity: 1; }
.prf-cmp .req-action:hover { color: rgba(255,255,255,0.80); }

/* FILE ROW */
.prf-cmp .file-row { display: grid; grid-template-columns: 44px 1fr 90px 110px 90px; gap: 16px; align-items: center; padding: 12px 20px; transition: background-color 0.12s; }
.prf-cmp .file-row:hover { background: var(--hover); }
.prf-cmp .file-ext { width: 36px; height: 36px; border-radius: 6px; display: grid; place-items: center; font-size: 9px; font-weight: 700; letter-spacing: 0.06em; border: 1px solid; }
.prf-cmp .ft-xls { background: rgba(16,185,129,0.10); color: #6ee7b7; border-color: rgba(16,185,129,0.20); }
.prf-cmp .ft-doc { background: rgba(56,189,248,0.10); color: #7dd3fc; border-color: rgba(56,189,248,0.20); }
.prf-cmp .ft-bpm { background: rgba(139,92,246,0.10); color: #c4b5fd; border-color: rgba(139,92,246,0.20); }
.prf-cmp .ft-ppt { background: rgba(245,158,11,0.10); color: #fcd34d; border-color: rgba(245,158,11,0.20); }
.prf-cmp .ft-pdf { background: rgba(244,63,94,0.10);  color: #fda4af; border-color: rgba(244,63,94,0.20); }
.prf-cmp .ft-img { background: rgba(168,85,247,0.10); color: #d8b4fe; border-color: rgba(168,85,247,0.20); }
.prf-cmp .ft-default { background: var(--hover-2); color: var(--fg-65); border-color: var(--bd-strong); }
.prf-cmp .file-name { display: flex; align-items: center; gap: 8px; min-width: 0; }
.prf-cmp .file-name svg { color: var(--fg-40); flex-shrink: 0; }
.prf-cmp .file-name .nm { font-size: 12px; color: var(--fg-85); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.prf-cmp .file-size { font-size: 10px; color: var(--fg-40); font-family: var(--font-mono); }
.prf-cmp .file-state { font-size: 10px; font-weight: 500; padding: 2px 8px; border-radius: 6px; border: 1px solid; width: max-content; }
.prf-cmp .fs-duzenlendi   { background: rgba(245,158,11,0.10); color: #fcd34d; border-color: rgba(245,158,11,0.20); }
.prf-cmp .fs-yuklendi     { background: rgba(16,185,129,0.10); color: #6ee7b7; border-color: rgba(16,185,129,0.20); }
.prf-cmp .fs-goruntulendi { background: rgba(148,163,184,0.10); color: #cbd5e1; border-color: rgba(148,163,184,0.20); }
.prf-cmp .fs-paylasildi   { background: rgba(56,189,248,0.10); color: #7dd3fc; border-color: rgba(56,189,248,0.20); }
.prf-cmp .file-time { font-size: 10px; color: var(--fg-40); text-align: right; }

/* EMPTY */
.prf-cmp .empty-row { padding: 20px; text-align: center; font-size: 11px; color: var(--fg-40); }

/* RESPONSIVE */
@media (max-width: 920px) {
  .prf-cmp .top-grid { grid-template-columns: 1fr; }
  .prf-cmp .req-row { grid-template-columns: 80px 1fr 90px 110px 30px; }
  .prf-cmp .req-row > :nth-child(5) { display: none; }
  .prf-cmp .file-row { grid-template-columns: 36px 1fr 90px 90px; }
  .prf-cmp .file-row > :nth-child(5) { display: none; }
}
@media (max-width: 600px) {
  .prf-cmp .stats-row { grid-template-columns: 1fr 1fr; }
  .prf-cmp .stats-row > :nth-child(3) { grid-column: 1 / -1; }
  .prf-cmp .storage-body { grid-template-columns: 1fr; justify-items: center; gap: 16px; }
  .prf-cmp .req-row { grid-template-columns: 70px 1fr 100px; gap: 10px; padding: 10px 14px; }
  .prf-cmp .req-row > :nth-child(3), .prf-cmp .req-row > :nth-child(5), .prf-cmp .req-row > :nth-child(6) { display: none; }
  .prf-cmp .file-row { grid-template-columns: 32px 1fr 90px; gap: 10px; padding: 10px 14px; }
  .prf-cmp .file-row > :nth-child(4), .prf-cmp .file-row > :nth-child(5) { display: none; }
}
`;

if (typeof document !== 'undefined') {
    // Eski versiyondan kalan stilleri temizle, en güncelini enjekte et
    const old = document.getElementById('prf-cmp-style');
    if (old) old.remove();
    const s = document.createElement('style');
    s.id = 'prf-cmp-style';
    s.textContent = DESIGN_CSS;
    document.head.appendChild(s);
}

// ── inline svg icons (lucide profili ile aynı) ──
const Icon = ({ d, size = 14, stroke = 1.6 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const I = {
    user:    <Icon d={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>} size={16} />,
    logout:  <Icon d={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>} size={13} />,
    edit:    <Icon d={<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>} size={12} />,
    upload:  <Icon d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>} size={12} />,
    activity:<Icon d={<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />} size={12} />,
    shield:  <Icon d={<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></>} size={12} />,
    shieldRole: <Icon d={<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />} size={10} />,
    chevronR:<Icon d={<polyline points="9 18 15 12 9 6" />} size={11} />,
    cal:     <Icon d={<><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>} size={11} />,
    clock:   <Icon d={<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>} size={11} />,
    key:     <Icon d={<><circle cx="8" cy="15" r="4" /><line x1="10.85" y1="12.15" x2="19" y2="4" /><line x1="18" y1="5" x2="20" y2="7" /><line x1="15" y1="8" x2="17" y2="10" /></>} size={11} />,
    phone:   <Icon d={<><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12" y2="18" /></>} size={11} />,
    inbox:   <Icon d={<><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>} size={13} />,
    alert:   <Icon d={<><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>} size={9} />,
    msg:     <Icon d={<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />} size={10} />,
    plus:    <Icon d={<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>} size={11} />,
    more:    <Icon d={<><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></>} size={12} />,
    fileSheet:<Icon d={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /></>} size={13} />,
    fileText: <Icon d={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>} size={13} />,
    fileCode: <Icon d={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><polyline points="10 13 8 15 10 17" /><polyline points="14 13 16 15 14 17" /></>} size={13} />,
    filePres: <Icon d={<><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></>} size={13} />,
    fileType: <Icon d={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="12" y1="13" x2="12" y2="17" /></>} size={13} />,
};

// ── helpers ──
const fmtMB = (mb) => mb == null ? '—' : `${Number(mb).toFixed(1)} MB`;
const fmtGB = (mb) => mb == null ? '—' : (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Number(mb).toFixed(1)} MB`);
const fmtBytes = (b) => {
    if (b == null) return '—';
    if (b >= 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
    if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`;
    return `${b} B`;
};
const initials = (n) => (n || 'U').split(/\s+/).filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2);
const monthYearTR = (iso) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }); }
    catch { return '—'; }
};
const dateTimeShortTR = (iso) => {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        const dp = d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
        const tp = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        return `${dp} ${tp}`;
    } catch { return iso; }
};
const relTime = (iso) => {
    if (!iso) return '—';
    const dt = new Date(iso);
    const days = Math.round((Date.now() - dt) / 86400000);
    if (Number.isNaN(days)) return iso;
    if (days <= 0) {
        const h = Math.round((Date.now() - dt) / 3600000);
        if (h <= 0) return 'Az önce';
        if (h === 1) return '1 saat önce';
        return `${h} saat önce`;
    }
    if (days === 1) return 'Dün';
    if (days < 7) return `${days} gün önce`;
    if (days < 30) return `${Math.floor(days / 7)} hafta önce`;
    return dt.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
};

const fileMeta = (ext) => {
    const e = (ext || '').toLowerCase().replace('.', '');
    if (['xls', 'xlsx', 'csv'].includes(e))
        return { tone: 'ft-xls', icon: I.fileSheet, ext: 'XLS' };
    if (['doc', 'docx', 'txt', 'rtf'].includes(e))
        return { tone: 'ft-doc', icon: I.fileText, ext: 'DOC' };
    if (e === 'pdf')
        return { tone: 'ft-pdf', icon: I.fileType, ext: 'PDF' };
    if (['ppt', 'pptx'].includes(e))
        return { tone: 'ft-ppt', icon: I.filePres, ext: 'PPT' };
    if (e === 'bpmn')
        return { tone: 'ft-bpm', icon: I.fileCode, ext: 'BPM' };
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(e))
        return { tone: 'ft-img', icon: I.fileType, ext: e.toUpperCase().slice(0, 3) };
    return { tone: 'ft-default', icon: I.fileText, ext: (e || 'FILE').toUpperCase().slice(0, 3) };
};
const fileCategory = (ext) => {
    const e = (ext || '').toLowerCase().replace('.', '');
    if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(e)) return 'belgeler';
    if (['ppt', 'pptx'].includes(e)) return 'sunumlar';
    if (['xls', 'xlsx', 'csv'].includes(e)) return 'tablolar';
    return 'diger';
};
const filenameToExt = (n) => { const m = (n || '').match(/\.([^./\\]+)$/); return m ? m[1].toLowerCase() : ''; };

const fileStateLabel = (ext, days) => {
    if (days <= 0) return { label: 'Düzenlendi', cls: 'fs-duzenlendi' };
    if (days === 1) return { label: 'Yüklendi', cls: 'fs-yuklendi' };
    if (['ppt', 'pptx'].includes((ext || '').toLowerCase())) return { label: 'Paylaşıldı', cls: 'fs-paylasildi' };
    if (days > 1 && days < 4) return { label: 'Görüntülendi', cls: 'fs-goruntulendi' };
    return { label: 'Yüklendi', cls: 'fs-yuklendi' };
};

const REQ_STATE_MAP = {
    yapiliyor:   { label: 'Yapılıyor',     cls: 'state-yapiliyor' },
    incelemede:  { label: 'İncelemede',    cls: 'state-incele' },
    yeni:        { label: 'Onay Bekliyor', cls: 'state-onayBekl' },
    bilgi:       { label: 'Bilgi Bekliyor',cls: 'state-bilgiBekl' },
    cozuldu:     { label: 'Çözüldü',       cls: 'state-cozuldu' },
    reddedildi:  { label: 'Reddedildi',    cls: 'state-reddedildi' },
};
const uiReqState = (t) => {
    const d = (t.durum || '').toLowerCase();
    if (d === 'tamamlandi') return 'cozuldu';
    if (d === 'reddedildi') return 'reddedildi';
    if (d === 'onaylandi') return 'yapiliyor';
    if (t.yonetici_notu || t.yonetici_kimlik) return 'incelemede';
    return 'yeni';
};
const PRIO_MAP = {
    yuksek: { label: 'Yüksek', cls: 'high' },
    orta:   { label: 'Orta',   cls: 'med'  },
    dusuk:  { label: 'Düşük',  cls: 'low'  },
};
const reqIsOpen = (t) => {
    const d = (t.durum || '').toLowerCase();
    return d !== 'tamamlandi' && d !== 'reddedildi';
};
const shortReqId = (id) => 'TLP-' + (String(id).replace(/-/g, '').toUpperCase().slice(0, 4) || '0000');

// ── ring chart ──
const RingChart = ({ pct, used }) => {
    const r = 52;
    const c = 2 * Math.PI * r;
    const off = c - (Math.min(pct, 100) / 100) * c;
    return (
        <div className="ring">
            <svg viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="70" cy="70" r={r} stroke="rgba(255,255,255,0.06)" strokeWidth="10" fill="none" />
                <defs>
                    <linearGradient id="ringGrad-prf" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%"   stopColor="#a01b1b" />
                        <stop offset="100%" stopColor="#d24452" />
                    </linearGradient>
                </defs>
                <circle
                    cx="70" cy="70" r={r}
                    stroke="url(#ringGrad-prf)" strokeWidth="10"
                    strokeLinecap="round" fill="none"
                    strokeDasharray={c}
                    strokeDashoffset={off}
                />
            </svg>
            <div className="ring-center">
                <div className="ring-mb">{Number(used || 0).toFixed(1)} <span className="unit">MB</span></div>
                <div className="ring-pct">{pct.toFixed(1)}% dolu</div>
            </div>
        </div>
    );
};

const MyProfileViewer = ({ currentUser, onLogout }) => {
    const setCurrentUser = useWorkspaceStore(s => s.setCurrentUser);
    const addToast = useErrorStore(s => s.addToast);

    const [userData, setUserData] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [quota, setQuota] = useState(null);
    const [userDocs, setUserDocs] = useState([]);
    const [talepler, setTalepler] = useState([]);
    const [nameEditing, setNameEditing] = useState(false);
    const [nameValue, setNameValue] = useState('');
    const [nameSaving, setNameSaving] = useState(false);

    const userId = currentUser?.id;

    useEffect(() => {
        if (!userId) return;
        setNameValue(currentUser?.tam_ad || '');

        fetch('/api/auth/users')
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(users => {
                const u = users?.find?.(x => x.id === userId);
                if (u) setUserData(u);
            })
            .catch(() => {});

        fetch(`/api/auth/users/${userId}/dashboard`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setDashboard(d); })
            .catch(() => {});

        fetch(`/api/archive/quota/${userId}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setQuota(d); })
            .catch(() => {});

        fetch(`/api/archive/my-documents/${userId}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.items) setUserDocs(d.items); })
            .catch(() => {});

        fetch(`/api/talepler/benim?kullanici_kimlik=${userId}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (Array.isArray(d)) setTalepler(d); })
            .catch(() => {});
    }, [userId, currentUser?.tam_ad]);

    const saveName = useCallback(async () => {
        const trimmed = nameValue.trim();
        if (!trimmed || trimmed === currentUser?.tam_ad) {
            setNameEditing(false);
            setNameValue(currentUser?.tam_ad || '');
            return;
        }
        setNameSaving(true);
        try {
            const res = await fetch(`/api/auth/users/${userId}/profile`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tam_ad: trimmed }),
            });
            if (res.ok) {
                setCurrentUser({ ...currentUser, tam_ad: trimmed });
                setUserData(prev => prev ? { ...prev, name: trimmed, tam_ad: trimmed } : prev);
                addToast?.({ type: 'success', message: 'Profil güncellendi.' });
            } else {
                addToast?.({ type: 'error', message: 'Profil güncellenemedi.' });
            }
        } catch {
            addToast?.({ type: 'error', message: 'Sunucuya bağlanılamadı.' });
        }
        setNameSaving(false);
        setNameEditing(false);
    }, [nameValue, currentUser, userId, setCurrentUser, addToast]);

    const isAktif = (userData?.status || 'Aktif') === 'Aktif';
    const isAdmin = (currentUser?.super || currentUser?.super_kullanici_mi) === true;
    const role = isAdmin ? 'Sistem Yöneticisi' : (userData?.role || 'Standart Kullanıcı');

    const memberSince = monthYearTR(userData?.olusturulma_tarihi || userData?.created_at || dashboard?.olusturulma_tarihi);
    const lastLogin = (() => {
        const iso = userData?.lastLogin || userData?.son_giris || dashboard?.lastLogin;
        return (iso && iso !== 'Bilinmiyor') ? dateTimeShortTR(iso) : '—';
    })();
    const monthlyActivity = dashboard?.monthly_activity ?? dashboard?.bu_ay_islem ?? dashboard?.total_calls ?? 0;
    const totalUploaded = userDocs.length || dashboard?.total_uploads || 0;

    const usedMb = quota?.kullanilan_mb ?? 0;
    const totalMb = quota?.depolama_limiti_mb ?? 0;
    const usedPct = totalMb > 0 ? Math.min((usedMb / totalMb) * 100, 100) : 0;

    const breakdown = useMemo(() => {
        const map = { belgeler: 0, sunumlar: 0, tablolar: 0, diger: 0 };
        userDocs.forEach(d => {
            const ext = filenameToExt(d.filename || d.dosya_adi || d.name);
            map[fileCategory(ext)] += 1;
        });
        const max = Math.max(map.belgeler, map.sunumlar, map.tablolar, map.diger, 1);
        return [
            { label: 'Belgeler', count: map.belgeler, pct: map.belgeler / max },
            { label: 'Sunumlar', count: map.sunumlar, pct: map.sunumlar / max },
            { label: 'Tablolar', count: map.tablolar, pct: map.tablolar / max },
            { label: 'Diğer',    count: map.diger,    pct: map.diger / max },
        ];
    }, [userDocs]);

    const recentFiles = useMemo(() => {
        return [...userDocs]
            .sort((a, b) => {
                const ta = new Date(a.kayit_tarihi || a.created_at || a.tarih || 0).getTime();
                const tb = new Date(b.kayit_tarihi || b.created_at || b.tarih || 0).getTime();
                return tb - ta;
            })
            .slice(0, 5);
    }, [userDocs]);

    const openTalepler = useMemo(() => {
        return talepler
            .filter(reqIsOpen)
            .sort((a, b) => String(b.olusturulma_tarihi || '').localeCompare(String(a.olusturulma_tarihi || '')))
            .slice(0, 6);
    }, [talepler]);

    const awaitingReply = useMemo(
        () => openTalepler.filter(t => uiReqState(t) === 'incelemede').length,
        [openTalepler],
    );

    if (!currentUser) return null;

    return (
        <div className="prf-cmp scroll" style={{ overflowY: 'auto' }}>
            <div className="shell">
                {/* HEADER STRIP */}
                <div className="head-strip">
                    <div>
                        <div className="head-title">{I.user} Profilim</div>
                        <div className="head-sub">Hesap bilgilerinizi, depolamayı ve son aktivitenizi yönetin.</div>
                    </div>
                    {onLogout && (
                        <button type="button" className="logout-btn" onClick={onLogout}>
                            {I.logout} Oturumu Kapat
                        </button>
                    )}
                </div>

                {/* TOP GRID */}
                <div className="top-grid">
                    {/* IDENTITY CARD */}
                    <div className="card id-card">
                        <div className="id-row">
                            <div className="avatar">
                                {initials(currentUser.tam_ad)}
                                {isAktif && <span className="dot-online" />}
                            </div>
                            <div className="id-name">
                                <div className="nm">{currentUser.tam_ad || 'Kullanıcı'}</div>
                                <div className="em">{currentUser.eposta || userData?.email || '—'}</div>
                            </div>
                        </div>

                        <div className="pill-row">
                            {isAktif && <span className="pill ok">Aktif</span>}
                            <span className="pill role">{I.shieldRole} {role}</span>
                        </div>

                        <div className="meta-grid">
                            <div>
                                <div className="meta-label">Üyelik</div>
                                <div className="meta-value">{I.cal} {memberSince}</div>
                            </div>
                            <div>
                                <div className="meta-label">Son giriş</div>
                                <div className="meta-value">{I.clock} {lastLogin}</div>
                            </div>
                            <div>
                                <div className="meta-label">2FA</div>
                                <div className="meta-value ok">{I.key} Aktif</div>
                            </div>
                            <div>
                                <div className="meta-label">Açık oturum</div>
                                <div className="meta-value">{I.phone} {dashboard?.active_sessions ?? 1} cihaz</div>
                            </div>
                        </div>

                        {nameEditing ? (
                            <div className="name-edit-row">
                                <input
                                    autoFocus
                                    className="name-input"
                                    value={nameValue}
                                    onChange={e => setNameValue(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') saveName();
                                        if (e.key === 'Escape') { setNameEditing(false); setNameValue(currentUser.tam_ad || ''); }
                                    }}
                                />
                                <button className="name-save" onClick={saveName} disabled={nameSaving}>
                                    {nameSaving ? '…' : 'Kaydet'}
                                </button>
                                <button className="name-cancel" onClick={() => { setNameEditing(false); setNameValue(currentUser.tam_ad || ''); }}>
                                    İptal
                                </button>
                            </div>
                        ) : (
                            <button className="edit-btn" type="button" onClick={() => setNameEditing(true)}>
                                {I.edit} Profili Düzenle
                            </button>
                        )}
                    </div>

                    {/* RIGHT — stats + storage */}
                    <div className="right-col">
                        <div className="stats-row">
                            <div className="card stat-card">
                                <div className="stat-head">
                                    <span className="stat-icon">{I.upload}</span>
                                    <span className="stat-label">Yüklenen Dosya</span>
                                </div>
                                <div className="stat-value">{totalUploaded}</div>
                                <div className="stat-sub">bu hesapta</div>
                            </div>
                            <div className="card stat-card">
                                <div className="stat-head">
                                    <span className="stat-icon">{I.activity}</span>
                                    <span className="stat-label">Bu Ay Aktivite</span>
                                </div>
                                <div className="stat-value">{monthlyActivity}</div>
                                <div className="stat-sub">işlem</div>
                            </div>
                            <div className="card stat-card">
                                <div className="stat-head">
                                    <span className="stat-icon">{I.shield}</span>
                                    <span className="stat-label">Yetki Seviyesi</span>
                                </div>
                                <div className="stat-value">{isAdmin ? 'A1' : 'A3'}</div>
                                <div className="stat-sub">{isAdmin ? 'Tam erişim' : 'Standart erişim'}</div>
                            </div>
                        </div>

                        <div className="card storage">
                            <div className="storage-head">
                                <div>
                                    <div className="storage-h-title">Depolama Kotası</div>
                                    <div className="storage-h-sub">
                                        {fmtMB(usedMb)} / {fmtGB(totalMb)} kotanız kullanılıyor.
                                    </div>
                                </div>
                                <button className="detail-link" type="button">
                                    Detay {I.chevronR}
                                </button>
                            </div>
                            <div className="storage-body">
                                <RingChart pct={usedPct} used={usedMb} />
                                <div className="breakdown">
                                    {breakdown.map(b => (
                                        <div className="bd-row" key={b.label}>
                                            <div className="bd-name">{b.label}</div>
                                            <div className="bd-bar">
                                                <div className="bd-fill" style={{ width: `${Math.max(b.pct * 100, b.count ? 6 : 0)}%` }} />
                                            </div>
                                            <div className="bd-count">{b.count} dosya</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AÇIK TALEPLERİM */}
                <div className="card sec-card">
                    <div className="sec-head">
                        <div className="sec-head-l">
                            <span style={{ color: 'var(--brand-text)', display: 'inline-flex' }}>{I.inbox}</span>
                            <span className="sec-title">Açık Taleplerim</span>
                            <span className="sec-count">{openTalepler.length}</span>
                            {awaitingReply > 0 && (
                                <span className="alert-pill">
                                    {I.alert} {awaitingReply} yanıt bekliyor
                                </span>
                            )}
                        </div>
                        <div className="sec-head-r">
                            <button className="new-btn" type="button">{I.plus} Yeni Talep</button>
                            <button className="detail-link" type="button">Tümü {I.chevronR}</button>
                        </div>
                    </div>
                    <div className="sec-divide">
                        {openTalepler.length === 0 ? (
                            <div className="empty-row">Açık talebiniz yok.</div>
                        ) : openTalepler.map(t => {
                            const stKey = uiReqState(t);
                            const st = REQ_STATE_MAP[stKey] || REQ_STATE_MAP.incelemede;
                            const prio = PRIO_MAP[(t.oncelik || '').toLowerCase()] || { label: 'Orta', cls: 'med' };
                            const commentCount = t.yonetici_notu ? 1 : 0;
                            return (
                                <div className="req-row" key={t.id}>
                                    <span className="req-id">{shortReqId(t.id)}</span>
                                    <div className="req-title-wrap">
                                        <span className={`prio-rail ${prio.cls}`} />
                                        <span className="req-title" title={t.baslik}>{t.baslik || 'Adsız Talep'}</span>
                                    </div>
                                    <span className={`prio-text ${prio.cls}`}>{prio.label}</span>
                                    <span className={`state-pill ${st.cls}`}>{st.label}</span>
                                    <span className="req-meta">
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            {I.msg} {commentCount}
                                        </span>
                                        <span className="sep">·</span>
                                        <span>{relTime(t.olusturulma_tarihi)}</span>
                                    </span>
                                    <button className="req-action" type="button">{I.more}</button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* SON DOSYALARIM */}
                <div className="card sec-card">
                    <div className="sec-head">
                        <div className="sec-head-l">
                            <span className="sec-title">Son Dosyalarım</span>
                            <span className="sec-count">{recentFiles.length}</span>
                        </div>
                        <button className="detail-link" type="button">Tümü {I.chevronR}</button>
                    </div>
                    <div className="sec-divide">
                        {recentFiles.length === 0 ? (
                            <div className="empty-row">Henüz yüklenmiş bir dosya yok.</div>
                        ) : recentFiles.map((d, i) => {
                            const fname = d.filename || d.dosya_adi || d.name || 'isimsiz';
                            const ext = filenameToExt(fname);
                            const meta = fileMeta(ext);
                            const sizeBytes = d.size_bytes ?? d.dosya_boyutu_bayt ?? d.size ?? null;
                            const tarih = d.kayit_tarihi || d.created_at || d.tarih;
                            const days = tarih ? Math.round((Date.now() - new Date(tarih)) / 86400000) : 1;
                            const state = fileStateLabel(ext, days);
                            return (
                                <div className="file-row" key={d.id || i}>
                                    <div className={`file-ext ${meta.tone}`}>{meta.ext}</div>
                                    <div className="file-name">
                                        {meta.icon}
                                        <span className="nm" title={fname}>{fname}</span>
                                    </div>
                                    <span className="file-size">{sizeBytes != null ? fmtBytes(sizeBytes) : '—'}</span>
                                    <span className={`file-state ${state.cls}`}>{state.label}</span>
                                    <span className="file-time">{relTime(tarih)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyProfileViewer;
