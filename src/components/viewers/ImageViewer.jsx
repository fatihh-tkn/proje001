import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, ChevronDown, ChevronRight, Ruler, FileText, Settings, AlertTriangle, List, Layers, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const MIN_SCALE = 0.1;
const MAX_SCALE = 8;
const ZOOM_SENSITIVITY = 0.001;

const ImageViewer = ({ url, title, bbox, docId }) => {
    const [loading, setLoading]   = useState(true);
    const [imgSize, setImgSize]   = useState({ w: 0, h: 0 });
    const [scale, setScale]       = useState(1);
    const [offset, setOffset]     = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [panelOpen, setPanelOpen] = useState(true);

    const containerRef = useRef(null);
    const imgRef       = useRef(null);
    const lastMouse    = useRef({ x: 0, y: 0 });
    const isDragging   = useRef(false);

    /* ── Vision analizi fetch ─────────────────────────────────────── */
    const fetchAnalysis = useCallback(async () => {
        if (!docId) return;
        try {
            const res = await fetch(`/api/archive/detail/${docId}`);
            if (!res.ok) return;
            const data = await res.json();
            const va = data?.meta?.vision_analysis;
            if (va?.image_type) setAnalysis(va);
        } catch {}
    }, [docId]);

    useEffect(() => { fetchAnalysis(); }, [fetchAnalysis]);

    /* ── Yüklenince görsel merkezle ───────────────────────────────── */
    const handleLoad = (e) => {
        setImgSize({ w: e.target.naturalWidth, h: e.target.naturalHeight });
        setLoading(false);
        fitToContainer();
    };

    const fitToContainer = useCallback(() => {
        const el = containerRef.current;
        const img = imgRef.current;
        if (!el || !img) return;
        const { width: cw, height: ch } = el.getBoundingClientRect();
        const iw = img.naturalWidth  || img.clientWidth  || cw;
        const ih = img.naturalHeight || img.clientHeight || ch;
        if (!iw || !ih) return;
        const newScale = Math.min((cw * 0.9) / iw, (ch * 0.9) / ih, 1);
        setScale(newScale);
        setOffset({ x: 0, y: 0 });
    }, []);

    /* ── Wheel zoom (cursor pozisyonuna göre) ─────────────────────── */
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onWheel = (e) => {
            e.preventDefault();
            const rect = el.getBoundingClientRect();
            const cx = e.clientX - rect.left - rect.width  / 2;
            const cy = e.clientY - rect.top  - rect.height / 2;

            setScale(prev => {
                const factor = 1 - e.deltaY * ZOOM_SENSITIVITY * (e.deltaMode === 1 ? 30 : 1);
                const next = Math.min(Math.max(prev * factor, MIN_SCALE), MAX_SCALE);
                const ratio = next / prev;
                setOffset(o => ({ x: cx + (o.x - cx) * ratio, y: cy + (o.y - cy) * ratio }));
                return next;
            });
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    /* ── Mouse drag pan ───────────────────────────────────────────── */
    const onMouseDown = (e) => {
        if (e.button !== 0) return;
        isDragging.current = true;
        lastMouse.current  = { x: e.clientX, y: e.clientY };
        setDragging(true);
    };
    const onMouseMove = (e) => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        setOffset(o => ({ x: o.x + dx, y: o.y + dy }));
    };
    const onMouseUp   = () => { isDragging.current = false; setDragging(false); };

    /* ── Bbox kutusu ──────────────────────────────────────────────── */
    const renderBbox = () => {
        if (!bbox || !imgSize.w || !imgRef.current) return null;
        const parts = String(bbox).split(',').map(Number);
        if (parts.length !== 4) return null;
        const [x0, y0, x1, y1] = parts;
        const rendered = imgRef.current.getBoundingClientRect();
        const sx = rendered.width  / imgSize.w;
        const sy = rendered.height / imgSize.h;
        return (
            <div style={{
                position: 'absolute', pointerEvents: 'none', zIndex: 10,
                border: '3px solid rgba(239,68,68,0.8)', borderRadius: 4,
                backgroundColor: 'rgba(239,68,68,0.15)',
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                left: x0 * sx, top: y0 * sy,
                width: (x1 - x0) * sx, height: (y1 - y0) * sy,
            }} />
        );
    };

    const isTeknikResim = analysis?.image_type === 'teknik_resim';
    const pct = Math.round(scale * 100);

    return (
        <div className="w-full h-full flex overflow-hidden bg-slate-900 select-none">

            {/* ── Görsel alanı ─────────────────────────────────────── */}
            <div
                ref={containerRef}
                className={`relative flex-1 overflow-hidden ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
            >
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                        <Loader2 size={32} className="animate-spin text-teal-500" />
                    </div>
                )}

                {/* Transform wrapper */}
                <div
                    style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
                        transformOrigin: 'center center',
                        transition: dragging ? 'none' : 'transform 0.05s ease-out',
                        opacity: loading ? 0 : 1,
                    }}
                >
                    <div className="relative">
                        <img
                            ref={imgRef}
                            src={url}
                            alt={title}
                            draggable={false}
                            className="block max-w-none rounded shadow-2xl bg-white"
                            style={{ display: 'block' }}
                            onLoad={handleLoad}
                            onError={() => setLoading(false)}
                        />
                        {!loading && renderBbox()}
                    </div>
                </div>

                {/* Zoom kontrol çubuğu */}
                {!loading && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-800/90 backdrop-blur-sm text-white rounded-full px-2 py-1 shadow-lg z-30">
                        <button onClick={() => { setScale(s => Math.max(s / 1.3, MIN_SCALE)); }} className="p-1 rounded-full hover:bg-white/15 transition-colors">
                            <ZoomOut size={13} />
                        </button>
                        <button
                            onClick={fitToContainer}
                            className="text-[10px] font-mono font-bold w-12 text-center hover:bg-white/15 rounded px-1 py-0.5 transition-colors"
                            title="Sıfırla"
                        >
                            {pct}%
                        </button>
                        <button onClick={() => { setScale(s => Math.min(s * 1.3, MAX_SCALE)); }} className="p-1 rounded-full hover:bg-white/15 transition-colors">
                            <ZoomIn size={13} />
                        </button>
                        <div className="w-px h-4 bg-white/20 mx-0.5" />
                        <button onClick={fitToContainer} className="p-1 rounded-full hover:bg-white/15 transition-colors" title="Sığdır">
                            <RotateCcw size={11} />
                        </button>
                    </div>
                )}

                {bbox && !loading && (
                    <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-sm px-4 py-2 rounded-full shadow-lg opacity-90 z-50 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        Sorduğunuz bilginin belgedeki konumu tespit edildi ve işaretlendi
                    </div>
                )}
            </div>

            {/* ── Teknik Resim Analiz Paneli ───────────────────────── */}
            {isTeknikResim && (
                <div className={`shrink-0 bg-white border-l border-stone-200 flex flex-col overflow-hidden transition-all duration-200 ${panelOpen ? 'w-72' : 'w-9'}`}>
                    <button
                        onClick={() => setPanelOpen(o => !o)}
                        className="flex items-center gap-2 px-2.5 py-2 border-b border-stone-100 hover:bg-stone-50 transition-colors shrink-0 w-full text-left"
                    >
                        {panelOpen
                            ? <ChevronRight size={12} className="text-stone-400 shrink-0" />
                            : <ChevronDown  size={12} className="text-stone-400 shrink-0 rotate-90" />
                        }
                        {panelOpen && (
                            <span className="text-[9px] font-black tracking-[0.18em] text-stone-500 uppercase">
                                Teknik Resim Analizi
                            </span>
                        )}
                    </button>
                    {panelOpen && (
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 text-[11px]">
                            <TeknikResimPanel data={analysis} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/* ── Teknik Resim Detay Paneli ─────────────────────────────────── */

function Section({ icon: Icon, title, children }) {
    const [open, setOpen] = useState(true);
    return (
        <div className="border border-stone-100 rounded-lg overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 bg-stone-50 hover:bg-stone-100 transition-colors text-left"
            >
                <Icon size={10} className="text-[#378ADD] shrink-0" />
                <span className="text-[10px] font-bold text-stone-600 flex-1">{title}</span>
                {open ? <ChevronDown size={9} className="text-stone-300" /> : <ChevronRight size={9} className="text-stone-300" />}
            </button>
            {open && <div className="px-2.5 py-2 space-y-1">{children}</div>}
        </div>
    );
}

function Row({ label, value }) {
    if (!value) return null;
    return (
        <div className="flex gap-1.5">
            <span className="text-stone-400 shrink-0 w-20">{label}</span>
            <span className="text-stone-700 font-medium break-all">{value}</span>
        </div>
    );
}

function TagList({ items }) {
    if (!items?.length) return <span className="text-stone-300 italic">—</span>;
    return (
        <div className="flex flex-wrap gap-1">
            {items.map((item, i) => (
                <span key={i} className="bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded text-[10px]">{item}</span>
            ))}
        </div>
    );
}

function TeknikResimPanel({ data }) {
    if (!data) return null;
    const bb          = data.baslik_bloku    || {};
    const parcalar    = data.parca_listesi   || [];
    const olcular     = data.olcular         || [];
    const tolerans    = data.toleranslar     || [];
    const islemSirasi = data.islem_sirasi    || [];
    const notlar      = data.notlar          || [];
    const yuzeyler    = data.yuzey_islemleri || [];
    const kesitler    = data.kesitler        || [];
    const hasBb       = Object.values(bb).some(v => v);

    return (
        <>
            {hasBb && (
                <Section icon={FileText} title="Başlık Bloğu">
                    <Row label="Çizim No"      value={bb.cizim_numarasi} />
                    <Row label="Kimlik No"      value={bb.kimlik_numarasi} />
                    <Row label="Başlık"         value={bb.baslik}         />
                    <Row label="Revizyon"       value={bb.revizyon}       />
                    <Row label="Ölçek"          value={bb.olcek}          />
                    <Row label="Tarih"          value={bb.tarih}          />
                    <Row label="Çizen"          value={bb.cizen}          />
                    <Row label="Onaylayan"      value={bb.onaylayan}      />
                    <Row label="Kontrol"        value={bb.kontrol_eden}   />
                    <Row label="Firma"          value={bb.firma}          />
                    <Row label="Proje"          value={bb.proje}          />
                    <Row label="Malzeme"        value={bb.malzeme}        />
                    <Row label="Yüzey"          value={bb.yuzey_islem}    />
                    <Row label="Sertlik"        value={bb.sertlik}        />
                    <Row label="Ağırlık"        value={bb.agirlik}        />
                    <Row label="Birim"          value={bb.birim}          />
                    <Row label="Format"         value={bb.blatt_format}   />
                    <Row label="Sayfa"          value={bb.sayfa}          />
                </Section>
            )}

            {parcalar.length > 0 && (
                <Section icon={List} title={`Parça Listesi (${parcalar.length})`}>
                    {parcalar.map((p, i) => (
                        <div key={i} className="border border-stone-100 rounded p-1.5 space-y-0.5">
                            <div className="flex gap-2">
                                {p.poz    && <span className="bg-[#378ADD]/10 text-[#378ADD] px-1 rounded font-mono text-[9px]">#{p.poz}</span>}
                                {p.adet   && <span className="text-stone-500">×{p.adet}</span>}
                            </div>
                            {p.malzeme  && <div className="text-stone-600 font-medium">{p.malzeme}</div>}
                            {p.aciklama && <div className="text-stone-400">{p.aciklama}</div>}
                        </div>
                    ))}
                </Section>
            )}

            {(olcular.length > 0 || tolerans.length > 0) && (
                <Section icon={Ruler} title="Ölçüler & Toleranslar">
                    {olcular.length > 0 && (
                        <div>
                            <div className="text-[9px] text-stone-400 mb-1">Ölçüler</div>
                            <div className="flex flex-wrap gap-1">
                                {olcular.map((o, i) => {
                                    const label = typeof o === 'object'
                                        ? `${o.etiket ? o.etiket + ': ' : ''}${o.deger || ''}${o.birim ? ' ' + o.birim : ''}${o.tolerans ? ' [' + o.tolerans + ']' : ''}`
                                        : String(o);
                                    return <span key={i} className="bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded text-[10px]">{label}</span>;
                                })}
                            </div>
                        </div>
                    )}
                    {tolerans.length > 0 && (
                        <div className="mt-1.5">
                            <div className="text-[9px] text-stone-400 mb-1">Toleranslar</div>
                            <div className="flex flex-wrap gap-1">
                                {tolerans.map((t, i) => {
                                    const label = typeof t === 'object'
                                        ? [t.tip, t.deger, t.aciklama].filter(Boolean).join(' — ')
                                        : String(t);
                                    return <span key={i} className="bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded text-[10px]">{label}</span>;
                                })}
                            </div>
                        </div>
                    )}
                </Section>
            )}

            {islemSirasi.length > 0 && (
                <Section icon={List} title={`İşlem Sırası (${islemSirasi.length})`}>
                    {islemSirasi.map((s, i) => {
                        const text = typeof s === 'object'
                            ? `${s.sira ? s.sira + '. ' : ''}${s.islem || ''}${s.aciklama ? ' — ' + s.aciklama : ''}`
                            : String(s);
                        return (
                            <div key={i} className="flex gap-1.5 text-stone-600">
                                <span className="text-[#378ADD] font-bold shrink-0">{i + 1}.</span>
                                <span>{text}</span>
                            </div>
                        );
                    })}
                </Section>
            )}

            {(yuzeyler.length > 0 || kesitler.length > 0 || data.projeksiyon_acisi) && (
                <Section icon={Layers} title="Teknik Detaylar">
                    <Row label="Projeksiyon" value={data.projeksiyon_acisi} />
                    {kesitler.length > 0 && (
                        <div className="mt-1">
                            <div className="text-[9px] text-stone-400 mb-1">Kesitler</div>
                            <TagList items={kesitler} />
                        </div>
                    )}
                    {yuzeyler.length > 0 && (
                        <div className="mt-1">
                            <div className="text-[9px] text-stone-400 mb-1">Yüzey İşlemleri</div>
                            <TagList items={yuzeyler} />
                        </div>
                    )}
                </Section>
            )}

            {notlar.length > 0 && (
                <Section icon={AlertTriangle} title="Notlar">
                    {notlar.map((n, i) => (
                        <div key={i} className="flex gap-1.5 text-stone-600">
                            <span className="text-stone-300 shrink-0">•</span>
                            <span>{n}</span>
                        </div>
                    ))}
                </Section>
            )}

            {data.genel_metin && (
                <Section icon={Settings} title="Genel Metin">
                    <p className="text-stone-500 leading-relaxed">{data.genel_metin}</p>
                </Section>
            )}
        </>
    );
}

export default ImageViewer;
