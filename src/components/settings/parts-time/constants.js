// src/components/settings/parts-time/constants.js
// ──────────────────────────────────────────────────────────────
// Operasyon tanımları + örnek BOM/parça verisi + biçim yardımcıları.
// Gerçek API'ye bağlandığında bu dosya yalnızca operasyon meta'sını
// (renk, ikon, etiket) ve format yardımcılarını barındırmalı; veri kısmı
// /api/parts-time/* uçlarından gelecek.
// ──────────────────────────────────────────────────────────────

import {
  Zap, Disc, CornerDownRight, Flame, Sparkles,
  Paintbrush, Wrench, CheckCircle2,
} from 'lucide-react';

// ── Operasyonlar
export const OPERATIONS = [
  { id: 'laser',    name: 'Lazer Kesim',    short: 'Lazer',    Icon: Zap,             color: '#d97706', bg: '#fef3c7' },
  { id: 'punch',    name: 'Punch / CNC',    short: 'Punch',    Icon: Disc,            color: '#0891b2', bg: '#cffafe' },
  { id: 'bend',     name: 'Abkant',         short: 'Abkant',   Icon: CornerDownRight, color: '#4f46e5', bg: '#e0e7ff' },
  { id: 'weld',     name: 'Kaynak',         short: 'Kaynak',   Icon: Flame,           color: '#ea580c', bg: '#ffedd5' },
  { id: 'grind',    name: 'Taşlama',        short: 'Taşlama',  Icon: Sparkles,        color: '#64748b', bg: '#f1f5f9' },
  { id: 'paint',    name: 'Boya',           short: 'Boya',     Icon: Paintbrush,      color: '#e11d48', bg: '#ffe4e6' },
  { id: 'assembly', name: 'Montaj',         short: 'Montaj',   Icon: Wrench,          color: '#059669', bg: '#d1fae5' },
  { id: 'qc',       name: 'Kalite Kontrol', short: 'KK',       Icon: CheckCircle2,    color: '#0d9488', bg: '#ccfbf1' },
];

// ── Teknik çizim sembolleri (placeholder — gerçek thumbnail gelene kadar)
export const DRAWING_SHAPES = {
  bracket: `<svg viewBox="0 0 100 80" fill="none" stroke="#334155" stroke-width="1.2">
      <path d="M10 12 L72 12 L72 28 L88 28 L88 68 L10 68 Z" stroke-linejoin="round"/>
      <circle cx="22" cy="22" r="3"/><circle cx="60" cy="22" r="3"/>
      <circle cx="22" cy="58" r="3"/><circle cx="76" cy="58" r="3"/>
      <line x1="10" y1="36" x2="72" y2="36" stroke-dasharray="2 2" opacity="0.5"/>
    </svg>`,
  plate: `<svg viewBox="0 0 100 80" fill="none" stroke="#334155" stroke-width="1.2">
      <rect x="10" y="14" width="80" height="52" rx="2"/>
      <circle cx="20" cy="24" r="2.5"/><circle cx="80" cy="24" r="2.5"/>
      <circle cx="20" cy="56" r="2.5"/><circle cx="80" cy="56" r="2.5"/>
      <circle cx="50" cy="40" r="6"/>
      <line x1="10" y1="40" x2="44" y2="40" stroke-dasharray="2 2" opacity="0.4"/>
      <line x1="56" y1="40" x2="90" y2="40" stroke-dasharray="2 2" opacity="0.4"/>
    </svg>`,
  lShape: `<svg viewBox="0 0 100 80" fill="none" stroke="#334155" stroke-width="1.2">
      <path d="M14 10 L46 10 L46 46 L86 46 L86 70 L14 70 Z" stroke-linejoin="round"/>
      <circle cx="24" cy="20" r="2.5"/><circle cx="38" cy="20" r="2.5"/>
      <circle cx="62" cy="58" r="2.5"/><circle cx="78" cy="58" r="2.5"/>
      <line x1="46" y1="10" x2="46" y2="46" stroke-dasharray="2 2" opacity="0.4"/>
    </svg>`,
  uChannel: `<svg viewBox="0 0 100 80" fill="none" stroke="#334155" stroke-width="1.2">
      <path d="M14 14 L14 66 L86 66 L86 14 L74 14 L74 54 L26 54 L26 14 Z" stroke-linejoin="round"/>
      <circle cx="20" cy="60" r="2"/><circle cx="80" cy="60" r="2"/>
      <circle cx="50" cy="60" r="2"/>
    </svg>`,
  flange: `<svg viewBox="0 0 100 80" fill="none" stroke="#334155" stroke-width="1.2">
      <circle cx="50" cy="40" r="28"/>
      <circle cx="50" cy="40" r="10"/>
      <circle cx="50" cy="18" r="2.5"/><circle cx="72" cy="40" r="2.5"/>
      <circle cx="50" cy="62" r="2.5"/><circle cx="28" cy="40" r="2.5"/>
    </svg>`,
  gusset: `<svg viewBox="0 0 100 80" fill="none" stroke="#334155" stroke-width="1.2">
      <path d="M14 14 L86 14 L14 70 Z" stroke-linejoin="round"/>
      <circle cx="22" cy="22" r="2.5"/><circle cx="40" cy="22" r="2.5"/>
      <circle cx="58" cy="22" r="2.5"/><circle cx="22" cy="42" r="2.5"/>
      <circle cx="22" cy="60" r="2.5"/>
    </svg>`,
  tube: `<svg viewBox="0 0 100 80" fill="none" stroke="#334155" stroke-width="1.2">
      <rect x="10" y="32" width="80" height="16" rx="2"/>
      <line x1="20" y1="32" x2="20" y2="48"/>
      <line x1="80" y1="32" x2="80" y2="48"/>
      <circle cx="50" cy="40" r="3"/>
      <line x1="10" y1="28" x2="90" y2="28" stroke-dasharray="2 2" opacity="0.4"/>
      <line x1="10" y1="52" x2="90" y2="52" stroke-dasharray="2 2" opacity="0.4"/>
    </svg>`,
  ring: `<svg viewBox="0 0 100 80" fill="none" stroke="#334155" stroke-width="1.2">
      <circle cx="50" cy="40" r="28"/>
      <circle cx="50" cy="40" r="20"/>
    </svg>`,
};

// ── Örnek Ürün BOM (gerçek veride /api/bom/:id'den gelir)
export const SAMPLE_BOM = {
  code: 'SX-2104',
  name: 'Ana Şasi Modülü',
  revision: 'Rev.3.2',
  family: 'Endüstriyel Şasi · Kompakt Seri',
  lastModified: '14 May 2026',
  designer: 'M. Yılmaz',
  totalWeight: 142,
  customer: 'Mega Lift A.Ş.',
  orderQty: 8,
  workOrder: 'İE-2026-0418',
};

export const SAMPLE_SUBASSEMBLIES = [
  { id: 'A-100', code: 'A-100', name: 'Ana Çerçeve',         color: '#A01B1B' },
  { id: 'A-200', code: 'A-200', name: 'Üst Grup',            color: '#0891b2' },
  { id: 'A-300', code: 'A-300', name: 'Motor & Aks Grubu',   color: '#4f46e5' },
  { id: 'A-400', code: 'A-400', name: 'Bağlantı Elemanları', color: '#059669' },
  { id: 'A-500', code: 'A-500', name: 'Aksesuarlar',         color: '#d97706' },
];

export const SAMPLE_NESTING_REFS = [
  { id: 'NEST-2104-v3-S01', filename: 'SX-2104_v3_Sac6mm.nc1',  sheets: 2 },
  { id: 'NEST-2104-v3-S02', filename: 'SX-2104_v3_Sac3mm.nc1',  sheets: 2 },
  { id: 'NEST-2104-v3-S03', filename: 'SX-2104_v3_Sac10mm.nc1', sheets: 1 },
];

export const SAMPLE_PARTS = [
  { id: 'P-001', code: 'YLG.SX.001', name: 'Ana Şasi Yan Sac',          subId: 'A-100', shape: 'plate',    qty: 2, mat: 'S355MC', thick: 6,  dim: '1840 × 620',  ops: { laser: 312, bend: 96,  weld: 180, grind: 60,  paint: 240, qc: 45 } },
  { id: 'P-002', code: 'YLG.SX.002', name: 'Şasi Köşe Bağlantı L',      subId: 'A-100', shape: 'lShape',   qty: 4, mat: 'S275JR', thick: 5,  dim: '420 × 380',   ops: { laser: 124, bend: 48,  weld: 90,  grind: 30,  qc: 25 } },
  { id: 'P-008', code: 'YLG.SX.008', name: 'Ön Tampon Profili',         subId: 'A-100', shape: 'uChannel', qty: 1, mat: 'S355MC', thick: 4,  dim: '1620 × 120',  ops: { laser: 152, bend: 108, weld: 96,  paint: 210, qc: 40 } },
  { id: 'P-003', code: 'YLG.SX.003', name: 'Üst Kapak Sacı',            subId: 'A-200', shape: 'plate',    qty: 1, mat: 'DC04',   thick: 3,  dim: '1820 × 980',  ops: { laser: 186, punch: 72, bend: 132, paint: 220, qc: 35 } },
  { id: 'P-004', code: 'YLG.SX.004', name: 'Çamurluk Sacı',             subId: 'A-200', shape: 'bracket',  qty: 2, mat: 'DC04',   thick: 2,  dim: '720 × 460',   ops: { laser: 96,  bend: 84,  paint: 180, qc: 30 } },
  { id: 'P-005', code: 'YLG.SX.005', name: 'Motor Yatağı Plakası',      subId: 'A-300', shape: 'plate',    qty: 1, mat: 'S355MC', thick: 10, dim: '480 × 320',   ops: { laser: 168, grind: 90,  paint: 150, qc: 50, assembly: 240 } },
  { id: 'P-006', code: 'YLG.SX.006', name: 'Aks Yatağı Flanşı',         subId: 'A-300', shape: 'flange',   qty: 4, mat: 'S355MC', thick: 12, dim: 'Ø 220',       ops: { laser: 144, grind: 120, qc: 60 } },
  { id: 'P-010', code: 'YLG.SX.010', name: 'Hidrolik Bağlantı Halkası', subId: 'A-300', shape: 'ring',     qty: 6, mat: 'S355MC', thick: 8,  dim: 'Ø 140',       ops: { laser: 64,  grind: 30,  qc: 15 } },
  { id: 'P-007', code: 'YLG.SX.007', name: 'Yük Asma Köşebenti',        subId: 'A-400', shape: 'gusset',   qty: 8, mat: 'S275JR', thick: 8,  dim: '180 × 180',   ops: { laser: 72,  weld: 60,  paint: 90,  qc: 20 } },
  { id: 'P-011', code: 'YLG.SX.011', name: 'Pnömatik Hat Borusu',       subId: 'A-400', shape: 'tube',     qty: 4, mat: 'St37',   thick: 3,  dim: '860 × Ø 40',  ops: { laser: 56,  weld: 75,  paint: 60,  qc: 18 } },
  { id: 'P-009', code: 'YLG.SX.009', name: 'Kablo Kanalı',              subId: 'A-500', shape: 'uChannel', qty: 3, mat: 'DC04',   thick: 2,  dim: '1200 × 60',   ops: { laser: 80,  bend: 64,  paint: 90,  qc: 18 } },
  { id: 'P-012', code: 'YLG.SX.012', name: 'Arka Stop Sacı',            subId: 'A-500', shape: 'bracket',  qty: 2, mat: 'DC04',   thick: 2,  dim: '380 × 240',   ops: { laser: 48,  punch: 36, bend: 42,  paint: 80, qc: 18 } },
];

// İlk yükleme: status 'pending', çizim eşleşmesi (örnek olarak 2 parça eksik)
export const initializeParts = (raw) => raw.map((p) => ({
  ...p,
  status: 'pending',
  drawingMatched: p.id !== 'P-009' && p.id !== 'P-012',
  calculatedOps: null,
}));

// ── Yardımcılar
export const partTotalSec = (ops) =>
  Object.values(ops || {}).reduce((s, v) => s + (v || 0), 0);

export const fmtSec = (s) => {
  if (s == null) return '—';
  s = Math.round(s);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}s ${String(m).padStart(2, '0')}d`;
  if (m > 0) return `${m}d ${String(sec).padStart(2, '0')}sn`;
  return `${sec} sn`;
};

export const fmtSecCompact = (s) => {
  if (s == null) return '—';
  s = Math.round(s);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m > 0 && sec > 0) return `${m}:${String(sec).padStart(2, '0')}`;
  if (m > 0) return `${m} dk`;
  return `${sec} sn`;
};

export const fmtCurrency = (n, cur = '₺') => {
  if (n == null) return '—';
  return `${cur} ${n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;
};
