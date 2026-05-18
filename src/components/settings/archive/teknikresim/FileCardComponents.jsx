import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Ruler, Loader2, Eye, ScanLine, Scissors, Link2, FolderOpen,
    Download, Table2, Cpu, ChevronRight, CheckCircle2, Clock,
    AlertTriangle, FileText, Trash2
} from 'lucide-react';
import { fmtSize, fmtDate, getNestingIds, getKimlikNo, isImage } from './ArchiveHelpers';

/* ── Drag helpers (module-level, aynı dosyada tanımlanıyor) ─────── */
const DRAG_KEY = 'teknik/item';
export let _dragId = null;
export const getDragId = (e) => { try { return JSON.parse(e.dataTransfer.getData(DRAG_KEY))?.id; } catch { return null; } };
export const setDragData = (e, id) => { _dragId = id; e.dataTransfer.setData(DRAG_KEY, JSON.stringify({ id })); e.dataTransfer.effectAllowed = 'move'; };

/* ── Sağ tık menüsü ─────────────────────────────────────────────── */
export function ContextMenu({ x, y, item, onDelete, onClose }) {
    const ref = useRef(null);
    const [pos, setPos] = useState({ top: y, left: x, opacity: 0 });

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) onClose();
        };
        document.addEventListener('mousedown', handler);
        document.addEventListener('contextmenu', handler);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('contextmenu', handler);
        };
    }, [onClose]);

    // İmleç köşede kalacak şekilde flip
    useEffect(() => {
        if (!ref.current) return;
        const { offsetWidth: w, offsetHeight: h } = ref.current;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        setPos({
            top:     y + h > vh ? y - h : y,
            left:    x + w > vw ? x - w : x,
            opacity: 1,
        });
    }, [x, y]);

    return createPortal(
        <div
            ref={ref}
            className="fixed z-[9999] bg-white border border-stone-200 rounded-xl shadow-2xl overflow-hidden py-1 min-w-[160px]"
            style={{ top: pos.top, left: pos.left, opacity: pos.opacity }}
        >
            <button
                onClick={() => { onDelete(item); onClose(); }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12px] font-semibold text-red-500 hover:bg-red-50 transition-colors"
            >
                <Trash2 size={13} /> Sil
            </button>
        </div>,
        document.body
    );
}

/* ── Durum rozeti ────────────────────────────────────────────────── */
export function StatusBadge({ item }) {
    const status  = item.meta?.transcription_status;
    const va      = item.meta?.vision_analysis;
    const imgType = va?.image_type;

    if (status === 'processing') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-bold rounded border border-amber-200">
            <Loader2 size={9} className="animate-spin" /> İŞLEMDE
        </span>
    );
    if (imgType === 'teknik_resim') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded border border-emerald-200">
            <CheckCircle2 size={9} /> TEKNİK RESİM
        </span>
    );
    if (imgType === 'nesting') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-bold rounded border border-orange-200">
            <Scissors size={9} /> NESTİNG
        </span>
    );
    if (va) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#378ADD]/10 text-[#378ADD] text-[10px] font-bold rounded border border-[#378ADD]/20">
            <ScanLine size={9} /> ANALİZ EDİLDİ
        </span>
    );
    if (status === 'done') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-100 text-stone-500 text-[10px] font-bold rounded border border-stone-200">
            <FileText size={9} /> VEKTÖRİZE
        </span>
    );
    if (status === 'pending') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-50 text-stone-400 text-[10px] font-bold rounded border border-stone-200">
            <Clock size={9} /> BEKLİYOR
        </span>
    );
    if (status === 'failed') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-500 text-[10px] font-bold rounded border border-red-200">
            <AlertTriangle size={9} /> HATA
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-50 text-stone-400 text-[10px] font-bold rounded border border-stone-200">
            <AlertTriangle size={9} /> ANALİZ YOK
        </span>
    );
}

/* ── CAD / Nesting rozeti ────────────────────────────────────────── */
export function CadBadge({ item }) {
    const t = item.meta?.cad_turu;
    if (t === 'cad') return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-violet-50 text-violet-600 text-[9px] font-bold rounded border border-violet-200">
            <Cpu size={8} /> CAD
        </span>
    );
    if (t === 'nesting') return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-50 text-orange-500 text-[9px] font-bold rounded border border-orange-200">
            <Scissors size={8} /> NES
        </span>
    );
    return null;
}

/* ── Grid kartı ──────────────────────────────────────────────────── */
export function TeknikKart({ item, allItems, onOpen, onVectorize, vectorizing, onOpenLinked, onStartLink, onUnlink, onDetail, onAjan, onDelete, draggingId }) {
    const [imgErr,   setImgErr]   = useState(false);
    const [ctxMenu,  setCtxMenu]  = useState(null);
    const clickTimer = useRef(null);
    const isDwg = ['dwg','dxf','stp','step'].includes((item.file_type||'').toLowerCase());

    const va        = item.meta?.vision_analysis;
    const isTR      = ['teknik_resim', 'step_model', 'nesting'].includes(va?.image_type);
    const bb        = isTR ? (va.baslik_bloku || {}) : {};
    const status    = item.meta?.transcription_status;
    const canAnalyze = status !== 'processing' && !va;
    const bagli      = item.meta?.bagli_dosyalar || {};
    const cadId      = bagli.cad;

    const nestingIds  = getNestingIds(bagli);
    const nestingId   = nestingIds[0] ?? null;
    const nestingItems   = nestingIds.map(id => (allItems || []).find(i => i.id === id)).filter(Boolean);
    const nestingItem    = nestingItems[0] ?? null;
    const nestingVision  = nestingItem?.meta?.vision_analysis;
    const nestingMatNum  = getKimlikNo(nestingVision, nestingItem?.filename || '');
    const kimlikNo       = getKimlikNo(va, item.filename);

    // Tek tık → görüntüle   |   Çift tık → nesting aç
    const handleClick = () => {
        if (clickTimer.current) {
            clearTimeout(clickTimer.current);
            clickTimer.current = null;
            if (nestingId) onOpenLinked(nestingId);
        } else {
            clickTimer.current = setTimeout(() => {
                clickTimer.current = null;
                onOpen(item);
            }, 220);
        }
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setCtxMenu({ x: e.clientX, y: e.clientY });
    };

    return (
        <>
        {ctxMenu && (
            <ContextMenu
                x={ctxMenu.x} y={ctxMenu.y}
                item={item}
                onDelete={onDelete}
                onClose={() => setCtxMenu(null)}
            />
        )}
        <div
            draggable
            onDragStart={e => setDragData(e, item.id)}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            className={`group bg-white border border-stone-200 rounded-xl overflow-hidden hover:border-[#378ADD]/30 hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing flex flex-col
                ${draggingId === item.id ? 'opacity-40' : ''}`}
        >
            {/* Önizleme */}
            <div className="relative h-[172px] bg-stone-50 overflow-hidden">
                {!imgErr && !isDwg ? (
                    <img
                        src={`/api/archive/file/${item.id}`}
                        alt={item.filename}
                        className="w-full h-full object-contain p-2"
                        onError={() => setImgErr(true)}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-stone-200">
                        <Ruler size={36} strokeWidth={1} />
                        {isDwg && <span className="text-[10px] font-black tracking-widest text-stone-300">{(item.file_type||'').toUpperCase()}</span>}
                    </div>
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-end justify-end gap-2 p-3">
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={e => { e.stopPropagation(); onOpen(item); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 text-stone-800 text-[11px] font-bold rounded-lg shadow-md hover:bg-white transition-colors"
                        >
                            <Eye size={12} /> Görüntüle
                        </button>
                        {canAnalyze && (
                            <button
                                onClick={e => { e.stopPropagation(); onVectorize(item); }}
                                disabled={vectorizing === item.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#378ADD] text-white text-[11px] font-bold rounded-lg shadow-md hover:bg-[#2a6ab8] transition-colors disabled:opacity-60"
                            >
                                {vectorizing === item.id ? <Loader2 size={11} className="animate-spin" /> : <ScanLine size={11} />}
                                Analiz Et
                            </button>
                        )}
                    </div>
                </div>

                <div className="absolute top-2 left-2">
                    <StatusBadge item={item} />
                </div>
                <div className="absolute top-2 right-2 flex items-center gap-1">
                    <button
                        onClick={e => { e.stopPropagation(); onAjan?.(item); }}
                        title="Teknik Döküman Ajanı"
                        className="flex items-center justify-center w-5 h-5 rounded bg-white/80 text-stone-500 hover:bg-white hover:text-violet-600 shadow-sm transition-colors"
                    >
                        <Cpu size={11} strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={e => { e.stopPropagation(); onDetail(item); }}
                        title="Detayları göster"
                        className="flex items-center justify-center w-5 h-5 rounded bg-white/80 text-stone-500 hover:bg-white hover:text-[#378ADD] shadow-sm transition-colors"
                    >
                        <Table2 size={11} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Bilgi */}
            <div className="px-3.5 pt-3 pb-2.5 flex-1 flex flex-col gap-1.5 min-w-0">
                {isTR && (bb.cizim_numarasi || kimlikNo) && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {bb.cizim_numarasi && (
                            <span className="text-[10px] font-black text-[#378ADD] font-mono tracking-wide">
                                #{bb.cizim_numarasi}
                            </span>
                        )}
                        {kimlikNo && (
                            <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-mono">
                                SAP {kimlikNo}
                            </span>
                        )}
                    </div>
                )}
                <h3 className="text-[13px] font-bold text-stone-800 truncate leading-snug">
                    {(isTR && bb.baslik) ? bb.baslik : item.filename.replace(/\.[^.]+$/, '')}
                </h3>
                {isTR && (
                    <div className="flex flex-wrap gap-1">
                        {bb.revizyon && <span className="text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-semibold font-mono">Rev {bb.revizyon}</span>}
                        {bb.olcek    && <span className="text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-semibold font-mono">{bb.olcek}</span>}
                        {bb.malzeme  && <span className="text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-semibold">{bb.malzeme}</span>}
                    </div>
                )}

                {/* Bağlı nesting şeritleri (birden fazla olabilir) */}
                {nestingItems.map((nItem, ni) => {
                    const nVa  = nItem.meta?.vision_analysis;
                    const nNum = getKimlikNo(nVa, nItem.filename || '');
                    return nVa ? (
                        <div key={nItem.id} className="flex flex-col gap-0.5 px-2.5 py-1.5 bg-orange-50 border border-orange-100 rounded-lg mt-1">
                            <div className="flex items-center gap-1">
                                <Scissors size={8} className="text-orange-400 shrink-0" />
                                <span className="text-[9px] text-orange-600 font-black uppercase tracking-wide">
                                    Nesting{nestingIds.length > 1 ? ` ${ni + 1}` : ''}
                                </span>
                                {nNum && <span className="ml-auto text-[9px] text-amber-600 font-bold">{nNum}</span>}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0">
                                {nVa.malzeme && <span className="text-[9px] text-stone-500 font-medium">{nVa.malzeme}</span>}
                                {nVa.kalinlik && <span className="text-[9px] text-stone-500">{nVa.kalinlik}mm</span>}
                                {nVa.kullanim_orani && (
                                    <span className="text-[9px] text-emerald-600 font-bold">
                                        {String(nVa.kullanim_orani).replace('%', '')}%
                                    </span>
                                )}
                                {nVa.levha_boyutu && <span className="text-[9px] text-stone-400">{nVa.levha_boyutu}</span>}
                            </div>
                            {Array.isArray(nVa.islemler) && nVa.islemler.length > 0 && (
                                <div className="flex flex-wrap gap-0.5 mt-0.5">
                                    {nVa.islemler.slice(0, 3).map((op, i) => {
                                        const label = typeof op === 'string' ? op : (op?.islem || '');
                                        return label ? (
                                            <span key={i} className="text-[8px] bg-orange-100 text-orange-500 px-1 py-0.5 rounded font-semibold">{label}</span>
                                        ) : null;
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div key={nItem.id} className="flex items-center gap-1 px-2 py-1 bg-orange-50 border border-orange-100 rounded-lg mt-1">
                            <Scissors size={8} className="text-orange-400 shrink-0" />
                            <span className="text-[9px] text-orange-500 font-semibold">Nesting bağlı</span>
                            <Link2 size={8} className="text-orange-300 ml-auto" />
                        </div>
                    );
                })}

                {/* Nesting kartı: bağlı teknik çizimi göster */}
                {va?.image_type === 'nesting' && bagli.cizim && (() => {
                    const cizimItem = (allItems || []).find(i => i.id === bagli.cizim);
                    const cizimVa   = cizimItem?.meta?.vision_analysis;
                    const cizimBb   = cizimVa?.baslik_bloku || {};
                    return (
                        <div
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-violet-50 border border-violet-100 rounded-lg mt-1 cursor-pointer hover:bg-violet-100 transition-colors"
                            onClick={e => { e.stopPropagation(); onOpenLinked?.(bagli.cizim); }}
                        >
                            <Cpu size={8} className="text-violet-400 shrink-0" />
                            <span className="text-[9px] text-violet-600 font-black uppercase tracking-wide">Teknik Çizim</span>
                            {cizimBb.baslik && (
                                <span className="text-[9px] text-violet-500 font-medium truncate ml-1 max-w-[120px]">{cizimBb.baslik}</span>
                            )}
                            <Link2 size={8} className="text-violet-300 ml-auto shrink-0" />
                        </div>
                    );
                })()}

                {/* Alt bilgi */}
                <div className="mt-auto pt-2 border-t border-stone-100 flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
                        <span className="uppercase font-black tracking-wider bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-mono">{item.file_type}</span>
                        {fmtSize(item.file_size) && <span className="text-stone-400 font-mono tabular-nums">{fmtSize(item.file_size)}</span>}
                    </div>
                    <a
                        href={`/api/archive/download/${item.id}`}
                        onClick={e => e.stopPropagation()}
                        className="p-1 rounded-md text-stone-400 hover:text-[#378ADD] hover:bg-[#378ADD]/10 transition-colors"
                        title="İndir"
                    >
                        <Download size={12} />
                    </a>
                </div>
            </div>
        </div>
        </>
    );
}

/* ── Liste satırı ────────────────────────────────────────────────── */
const LCOLS = { gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,0.7fr) minmax(0,0.7fr) minmax(0,0.9fr) 80px 80px 100px 110px 110px 60px' };

export function ListHeader() {
    return (
        <div className="grid gap-3 px-4 py-2.5 text-[10px] font-black tracking-widest uppercase text-stone-400 border-b border-stone-200 bg-stone-50/80 sticky top-0 z-10" style={LCOLS}>
            <span>DOSYA ADI</span>
            <span>ÇİZİM NO</span>
            <span>SAP NO</span>
            <span>BAŞLIK</span>
            <span>REVİZYON</span>
            <span>ÖLÇEK</span>
            <span>DURUM</span>
            <span>BOYUT</span>
            <span>TARİH</span>
            <span />
        </div>
    );
}

export function ListRow({ item, allItems, onOpen, onVectorize, vectorizing, onOpenLinked, onStartLink, onUnlink, onDetail, onAjan, onDelete, draggingId }) {
    const [ctxMenu, setCtxMenu] = useState(null);
    const va = item.meta?.vision_analysis;
    const isTR = ['teknik_resim', 'step_model', 'nesting'].includes(va?.image_type);
    const bb = isTR ? (va.baslik_bloku || {}) : {};
    const canAnalyze = !va && item.meta?.transcription_status !== 'processing';

    const bagli        = item.meta?.bagli_dosyalar || {};
    const nestingIds   = getNestingIds(bagli);
    const nestingItems = nestingIds.map(id => (allItems || []).find(i => i.id === id)).filter(Boolean);
    const kimlikNo     = getKimlikNo(va, item.filename);

    return (
        <>
        {ctxMenu && (
            <ContextMenu
                x={ctxMenu.x} y={ctxMenu.y}
                item={item}
                onDelete={onDelete}
                onClose={() => setCtxMenu(null)}
            />
        )}
        <div
            draggable
            onDragStart={e => setDragData(e, item.id)}
            onClick={() => onOpen(item)}
            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY }); }}
            className={`group grid gap-3 px-4 py-3 items-center bg-white hover:bg-[#378ADD]/3 border-b border-stone-100 cursor-grab active:cursor-grabbing transition-colors duration-150
                ${draggingId === item.id ? 'opacity-40' : ''}`}
            style={LCOLS}
        >
            <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded text-white uppercase font-mono" style={{ background: '#8b5cf6' }}>
                    {(item.file_type || 'IMG').slice(0, 4).toUpperCase()}
                </span>
                <span className="text-[11px] font-semibold text-stone-800 truncate">{item.filename.replace(/\.[^.]+$/, '')}</span>
            </div>
            <span className="text-[11px] text-[#378ADD] font-black font-mono truncate">{bb.cizim_numarasi || '—'}</span>
            <span className="text-[11px] text-amber-600 font-black font-mono truncate">{kimlikNo || '—'}</span>
            <span className="text-[11px] text-stone-600 truncate">{bb.baslik || '—'}</span>
            <span className="text-[11px] text-stone-500 font-mono tabular-nums">{bb.revizyon || '—'}</span>
            <span className="text-[11px] text-stone-500 font-mono tabular-nums">{bb.olcek || '—'}</span>
            <StatusBadge item={item} />
            <span className="text-[11px] text-stone-500 font-mono tabular-nums">{fmtSize(item.file_size) || '—'}</span>
            <span className="text-[11px] text-stone-500 font-mono tabular-nums">{fmtDate(item.created_at)}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {canAnalyze && (
                    <button
                        onClick={e => { e.stopPropagation(); onVectorize(item); }}
                        disabled={vectorizing === item.id}
                        title="Analiz Et"
                        className="p-1 rounded text-stone-400 hover:text-[#378ADD] hover:bg-[#378ADD]/10 transition-all"
                    >
                        {vectorizing === item.id
                            ? <Loader2 size={12} className="animate-spin" />
                            : <ScanLine size={12} />
                        }
                    </button>
                )}
                <button
                    onClick={e => { e.stopPropagation(); onAjan?.(item); }}
                    title="Teknik Döküman Ajanı"
                    className="p-1 rounded text-stone-400 hover:text-violet-600 hover:bg-violet-50 transition-all"
                >
                    <Cpu size={12} />
                </button>
                <button
                    onClick={e => { e.stopPropagation(); onDetail(item); }}
                    title="Detayları göster"
                    className="p-1 rounded text-stone-400 hover:text-[#378ADD] hover:bg-[#378ADD]/10 transition-all"
                >
                    <Table2 size={12} />
                </button>
                <a
                    href={`/api/archive/download/${item.id}`}
                    onClick={e => e.stopPropagation()}
                    className="p-1 rounded text-stone-400 hover:text-[#378ADD] hover:bg-[#378ADD]/10 transition-all"
                >
                    <Download size={12} />
                </a>
            </div>
        </div>

        {/* Bağlı nesting alt satırı */}
        {va?.image_type === 'nesting' && bagli.cizim && (() => {
            const cizimItem = (allItems || []).find(i => i.id === bagli.cizim);
            const cizimVa   = cizimItem?.meta?.vision_analysis;
            const cizimBb   = cizimVa?.baslik_bloku || {};
            return (
                <div
                    className="grid gap-3 px-4 py-1.5 items-center border-b border-violet-100 bg-violet-50/40 hover:bg-violet-50 cursor-pointer transition-colors"
                    style={LCOLS}
                    onClick={e => { e.stopPropagation(); onOpenLinked?.(bagli.cizim); }}
                >
                    <div className="flex items-center gap-1.5 pl-4 min-w-0">
                        <div className="w-px h-3 bg-violet-200 shrink-0" />
                        <Cpu size={9} className="text-violet-400 shrink-0" />
                        <span className="text-[10px] text-violet-600 font-semibold truncate">
                            {cizimItem ? cizimItem.filename.replace(/\.[^.]+$/, '') : '—'}
                        </span>
                    </div>
                    <span className="text-[10px] text-stone-400 truncate">{cizimBb.cizim_numarasi || '—'}</span>
                    <span className="text-[10px] text-amber-500 font-bold truncate">{getKimlikNo(cizimVa, cizimItem?.filename || '') || '—'}</span>
                    <span className="text-[10px] text-stone-600 truncate">{cizimBb.baslik || '—'}</span>
                    <span /><span /><span /><span /><span /><span />
                </div>
            );
        })()}
        {nestingItems.map((nItem, ni) => {
            const nVision = nItem.meta?.vision_analysis;
            const nKimlik = getKimlikNo(nVision, nItem.filename || '');
            return (
                <div
                    key={nItem.id}
                    className="grid gap-3 px-4 py-1.5 items-center border-b border-orange-100 bg-orange-50/50 hover:bg-orange-50 cursor-pointer transition-colors"
                    style={LCOLS}
                    onClick={e => { e.stopPropagation(); onOpenLinked?.(nItem.id); }}
                >
                    <div className="flex items-center gap-1.5 pl-4 min-w-0">
                        <div className="w-px h-3 bg-orange-200 shrink-0" />
                        <Scissors size={9} className="text-orange-400 shrink-0" />
                        <span className="text-[10px] text-orange-500 font-semibold truncate">
                            {nItem.filename.replace(/\.[^.]+$/, '')}
                            {nestingIds.length > 1 && <span className="ml-1 text-orange-300">#{ni + 1}</span>}
                        </span>
                    </div>
                    <span className="text-[10px] text-stone-400 truncate">
                        {nVision?.program_adi || '—'}
                    </span>
                    <span className="text-[10px] text-amber-500 font-bold truncate">
                        {nKimlik || '—'}
                    </span>
                    <span className="text-[10px] text-stone-500 truncate">
                        {[nVision?.malzeme, nVision?.kalinlik ? `${nVision.kalinlik}mm` : '']
                            .filter(Boolean).join(' · ') || '—'}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold">
                        {nVision?.kullanim_orani
                            ? `${String(nVision.kullanim_orani).replace('%', '')}%`
                            : '—'}
                    </span>
                    <span className="text-[10px] text-stone-400 truncate">
                        {nVision?.levha_boyutu || '—'}
                    </span>
                    <span /><span /><span /><span />
                </div>
            );
        })}
        </>
    );
}

/* ── Klasör kartı ────────────────────────────────────────────────── */
export function FolderCard({ folder, depth, onClick, onDelete, draggingId, onDrop }) {
    const [ctxMenu, setCtxMenu] = useState(null);
    const [isOver,  setIsOver]  = useState(false);
    const label  = depth === 0 ? 'Mamul' : depth === 1 ? 'Alt Bileşen' : 'Klasör';
    const accent = depth === 0 ? '#f59e0b' : depth === 1 ? '#3b82f6' : '#8b5cf6';
    const isDraggingSelf = draggingId === folder.id;

    return (
        <>
        {ctxMenu && (
            <ContextMenu x={ctxMenu.x} y={ctxMenu.y} item={folder}
                onDelete={onDelete} onClose={() => setCtxMenu(null)} />
        )}
        <div
            draggable
            onClick={!isDraggingSelf ? onClick : undefined}
            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY }); }}
            onDragStart={e => { e.stopPropagation(); setDragData(e, folder.id); }}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); if (!isDraggingSelf) setIsOver(true); }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setIsOver(false); }}
            onDrop={e => { e.preventDefault(); e.stopPropagation(); setIsOver(false); const id = getDragId(e); if (id && id !== folder.id) onDrop?.(id, folder.id); }}
            className={`bg-white border rounded-xl p-4 cursor-pointer transition-all duration-200 flex items-center gap-3.5 group
                ${isOver ? 'border-[#378ADD] shadow-[0_0_0_3px_rgba(55,138,221,0.10)] scale-[1.01]' : 'border-stone-200 hover:shadow-md hover:border-stone-300'}
                ${isDraggingSelf ? 'opacity-40' : ''}`}
            style={{ borderLeftWidth: 4, borderLeftColor: isOver ? '#378ADD' : accent }}
        >
            <div className="p-3 rounded-xl shrink-0" style={{ background: isOver ? '#378ADD18' : `${accent}15` }}>
                <FolderOpen size={22} style={{ color: isOver ? '#378ADD' : accent }} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-stone-800 truncate">{folder.filename}</p>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md mt-0.5 inline-block" style={{ background: `${accent}18`, color: accent }}>{label}</span>
            </div>
            <ChevronRight size={15} className="text-stone-300 group-hover:text-stone-500 transition-colors shrink-0" />
        </div>
        </>
    );
}

export function FolderListRow({ folder, depth, onClick, onDelete, draggingId, onDrop }) {
    const [ctxMenu, setCtxMenu] = useState(null);
    const [isOver,  setIsOver]  = useState(false);
    const label  = depth === 0 ? 'Mamul' : depth === 1 ? 'Alt Bileşen' : 'Klasör';
    const accent = depth === 0 ? '#f59e0b' : depth === 1 ? '#3b82f6' : '#8b5cf6';
    const isDraggingSelf = draggingId === folder.id;

    return (
        <>
        {ctxMenu && (
            <ContextMenu x={ctxMenu.x} y={ctxMenu.y} item={folder}
                onDelete={onDelete} onClose={() => setCtxMenu(null)} />
        )}
        <div
            draggable
            onClick={!isDraggingSelf ? onClick : undefined}
            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY }); }}
            onDragStart={e => { e.stopPropagation(); setDragData(e, folder.id); }}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); if (!isDraggingSelf) setIsOver(true); }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setIsOver(false); }}
            onDrop={e => { e.preventDefault(); e.stopPropagation(); setIsOver(false); const id = getDragId(e); if (id && id !== folder.id) onDrop?.(id, folder.id); }}
            className={`flex items-center gap-3 px-4 py-3.5 border-b border-stone-100 cursor-pointer transition-all duration-200 group
                ${isOver ? 'bg-[#378ADD]/5' : 'bg-white hover:bg-stone-50/80'}
                ${isDraggingSelf ? 'opacity-40' : ''}`}
            style={{ borderLeftWidth: 4, borderLeftColor: isOver ? '#378ADD' : accent }}
        >
            <FolderOpen size={16} style={{ color: isOver ? '#378ADD' : accent }} />
            <span className="text-[13px] font-bold text-stone-800 flex-1 truncate">{folder.filename}</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0" style={{ background: `${accent}18`, color: accent }}>{label}</span>
            <ChevronRight size={14} className="text-stone-300 group-hover:text-stone-500 transition-colors shrink-0" />
        </div>
        </>
    );
}
