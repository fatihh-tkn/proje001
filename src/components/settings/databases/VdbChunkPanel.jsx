import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Code, X, Workflow, Eye, Image } from 'lucide-react';
import BpmnViewerComponent from '../../viewers/BpmnViewer';

// ── Chunk tipi → renk/etiket ─────────────────────────────────────────
const CHUNK_TYPE_META = {
    pptx_title:             { label: 'Başlık',    color: 'bg-[#E6F1FB] text-[#0C447C] border-[#B8D4F0]' },
    pptx_callout:           { label: 'Açıklama',  color: 'bg-orange-100 text-orange-700 border-orange-200' },
    pptx_body:              { label: 'Gövde',     color: 'bg-stone-100 text-stone-600 border-stone-200' },
    pptx_notes:             { label: 'Notlar',    color: 'bg-purple-100 text-purple-700 border-purple-200' },
    pptx_slide:             { label: 'Slayt',     color: 'bg-stone-100 text-stone-600 border-stone-200' },
    pptx_summary:           { label: 'Özet',      color: 'bg-green-100 text-green-700 border-green-200' },
    pptx_screenshot_vision: { label: 'Vision',    color: 'bg-pink-100 text-pink-700 border-pink-200' },
    pptx_error:             { label: 'Hata',      color: 'bg-red-100 text-red-700 border-red-200' },
    audio_transcript:       { label: 'Transkript',color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    bpmn_task:              { label: 'Görev',     color: 'bg-teal-100 text-teal-700 border-teal-200' },
    bpmn_userTask:          { label: 'Kullanıcı', color: 'bg-teal-100 text-teal-700 border-teal-200' },
    bpmn_serviceTask:       { label: 'Servis',    color: 'bg-teal-100 text-teal-700 border-teal-200' },
    bpmn_exclusiveGateway:  { label: 'Karar',     color: 'bg-amber-100 text-amber-700 border-amber-200' },
    bpmn_summary:           { label: 'Özet',      color: 'bg-green-100 text-green-700 border-green-200' },
};

const ChunkTypeBadge = ({ type }) => {
    if (!type) return null;
    const meta = CHUNK_TYPE_META[type] || {
        label: type.replace(/^bpmn_|^pptx_/, ''),
        color: 'bg-stone-100 text-stone-500 border-stone-200',
    };
    return (
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide ${meta.color}`}>
            {meta.label}
        </span>
    );
};

const HighlightWrapper = ({ text = '', highlight = '' }) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
        <span>
            {parts.map((p, i) =>
                p.toLowerCase() === highlight.toLowerCase()
                    ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded-[2px] font-bold px-0.5">{p}</mark>
                    : p
            )}
        </span>
    );
};

// ── Popup konumu hesapla (ekranın ortasına sabitle) ────────────────
function calcPopupStyle(mouseX, mouseY, popW, popH) {
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;

    const w = Math.min(popW, vpW - 40);
    const h = Math.min(popH, vpH - 40);

    const left = Math.max(20, (vpW - w) / 2);
    const top  = Math.max(20, (vpH - h) / 2);

    return { position: 'fixed', width: w, height: h, top, left, zIndex: 99999 };
}

// ── Floating Popup (Portal ile body'e mount edilir) ──────────────────
const ChunkPopup = ({ chunk, mouseX, mouseY, onClose, onMouseEnter, onMouseLeave }) => {
    const raw    = chunk.rawMeta || {};
    const isBpmn = !!(raw.element_id || (raw.type || '').startsWith('bpmn_'));
    const popupRef = useRef(null);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const popW  = isBpmn ? 550 : 960;
    const popH  = isBpmn ? 450 : 900;
    const style = calcPopupStyle(mouseX, mouseY, popW, popH);

    const content = isBpmn ? (() => {
        const docId   = raw.sql_doc_id || raw.sqlite_doc_id || '';
        const elemId  = raw.element_id || null;
        const title   = raw.element_name || raw.source || 'BPMN';
        const bpmnUrl = docId ? `/api/archive/file/${docId}` : null;

        return (
            <>
                <div className="flex items-center justify-between px-3 py-2 bg-stone-50 border-b border-stone-200 shrink-0">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-stone-600 uppercase tracking-wide">
                        <Workflow size={12} className="text-teal-500" />
                        {title}
                        {elemId && <span className="font-mono text-stone-400 normal-case tracking-normal text-[10px]">#{elemId}</span>}
                    </span>
                    <button onClick={onClose} className="p-0.5 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors">
                        <X size={14} />
                    </button>
                </div>
                <div className="flex-1 bg-white overflow-hidden" style={{ height: 840 }}>
                    {bpmnUrl
                        ? <BpmnViewerComponent url={bpmnUrl} elementId={elemId} />
                        : <div className="flex items-center justify-center h-full text-stone-400 text-sm">Dosya bulunamadı.</div>
                    }
                </div>
            </>
        );
    })() : (() => {
        const sw   = raw.slide_emu_w || raw.page_width  || 0;
        const sh   = raw.slide_emu_h || raw.page_height || 0;
        const bbox = raw.bbox || '';
        const page = raw.page || 1;
        // sql_doc_id varsa daha güvenilir endpoint'i kullan (eski/bozuk image_path'e bağlı kalmaz)
        const src  = raw.sql_doc_id
            ? `/api/files/page-image/${raw.sql_doc_id}/${page}?bbox=${encodeURIComponent(bbox)}&slide_w=${sw}&slide_h=${sh}`
            : `/api/files/image/highlight?${new URLSearchParams({ image_path: raw.image_path || '', bbox, slide_w: sw, slide_h: sh })}`;

        return (
            <>
                <div className="flex items-center justify-between px-3 py-2 bg-stone-50 border-b border-stone-200 shrink-0">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-stone-600 uppercase tracking-wide">
                        <Eye size={12} className="text-emerald-500" />
                        {raw.source || 'Sayfa Görünümü'}
                    </span>
                    <button onClick={onClose} className="p-0.5 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors">
                        <X size={14} />
                    </button>
                </div>
                <div className="flex items-center justify-center p-3 overflow-auto bg-stone-100 flex-1">
                    <img
                        src={src}
                        alt="Sayfa"
                        className="max-w-full max-h-[820px] rounded-lg border border-stone-200 shadow object-contain bg-white"
                        loading="lazy"
                        onError={e => {
                            e.currentTarget.replaceWith(
                                Object.assign(document.createElement('p'), {
                                    className: 'text-stone-400 text-sm py-8 px-4',
                                    textContent: 'Görsel yüklenemedi.',
                                })
                            );
                        }}
                    />
                </div>
            </>
        );
    })();

    return createPortal(
        <div
            ref={popupRef}
            style={style}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className="bg-white rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
            {content}
        </div>,
        document.body
    );
};

// ── Ana Panel ────────────────────────────────────────────────────────
const VdbChunkPanel = ({ activeChunks, targetChunkId, chunkRefs, searchTerm, expandedJson, toggleJsonInfo, handleDeleteChunk }) => {
    const [popup, setPopup] = useState(null); // { chunk, mouseX, mouseY }
    const hoverTimer = useRef(null);
    const leaveTimer = useRef(null);

    const hasImage = (chunk) => {
        const raw = chunk.rawMeta || {};
        const bbox = raw.bbox || '';
        if (!bbox || bbox === '0,0,0,0') return false;
        // has_page_images: backend'in gerçek disk kontrolü sonucu
        // true  → arşiv görseli var, yeni endpoint çalışır
        // false → görsel yok (PDF dönüşüm başarısız veya arşiv silinmiş) – ikonu gösterme
        // undefined → eski API yanıtı, image_path'e bak
        if (raw.has_page_images === true)  return !!(raw.sql_doc_id);
        if (raw.has_page_images === false) return false;
        return !!(raw.image_path); // eski fallback
    };

    const hasBpmn = (chunk) => {
        const raw = chunk.rawMeta || {};
        return !!(raw.element_id || (raw.type || '').startsWith('bpmn_'));
    };

    const openPopup = useCallback((chunk, mx, my) => {
        clearTimeout(hoverTimer.current);
        clearTimeout(leaveTimer.current);
        setPopup({ chunk, mouseX: mx, mouseY: my });
    }, []);

    const closePopup = useCallback(() => {
        clearTimeout(hoverTimer.current);
        clearTimeout(leaveTimer.current);
        setPopup(null);
    }, []);

    // İkon butonuna hover → gecikmeli aç
    const handleBtnEnter = useCallback((chunk, e) => {
        e.stopPropagation();
        clearTimeout(leaveTimer.current);
        clearTimeout(hoverTimer.current);
        const mx = e.clientX, my = e.clientY;
        hoverTimer.current = setTimeout(() => openPopup(chunk, mx, my), 200);
    }, [openPopup]);

    // İkon butonundan çık → gecikmeli kapat (popup'a geçişe izin ver)
    const handleBtnLeave = useCallback(() => {
        clearTimeout(hoverTimer.current);
        leaveTimer.current = setTimeout(closePopup, 150);
    }, [closePopup]);

    // Popup içine girilince kapanmayı iptal et
    const handlePopupEnter = useCallback(() => {
        clearTimeout(leaveTimer.current);
        clearTimeout(hoverTimer.current);
    }, []);

    // Popup'tan çıkınca kapat
    const handlePopupLeave = useCallback(() => {
        leaveTimer.current = setTimeout(closePopup, 150);
    }, [closePopup]);

    useEffect(() => () => {
        clearTimeout(hoverTimer.current);
        clearTimeout(leaveTimer.current);
    }, []);

    return (
        <div className="flex-1 bg-white flex flex-col h-full overflow-x-hidden overflow-y-auto min-w-[300px]">
            <div className="px-4 py-2 bg-stone-50 border-b border-stone-100 font-semibold text-[11px] tracking-wide text-stone-600 uppercase shrink-0 sticky top-0 z-10">
                Bilgi Parçacıkları (Chunks)
            </div>

            <div className="p-4 space-y-4 pb-20">
                {activeChunks.map((chunk, idx) => {
                    const isTarget  = targetChunkId === chunk.id;
                    const chunkType = chunk.rawMeta?.type;
                    const imgOk     = hasImage(chunk);
                    const bpmnOk    = hasBpmn(chunk);

                    return (
                        <div
                            key={chunk.id}
                            id={chunk.id}
                            ref={el => chunkRefs.current[chunk.id] = el}
                            style={{ scrollMarginTop: '100px' }}
                            className={`border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group
                                ${isTarget ? 'border-[#F5DDB3] ring-4 ring-[#FAEEDA] bg-[#FAEEDA]/50' : 'border-stone-200 bg-white'}
                            `}
                        >
                            {/* Header */}
                            <div className="bg-stone-50 px-3 py-1.5 border-b border-stone-100 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${isTarget ? 'bg-[#854F0B]' : 'bg-[#378ADD]'}`} />
                                    Parça {idx + 1}
                                    <ChunkTypeBadge type={chunkType} />
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-mono text-stone-400 bg-white border border-stone-200 px-1 py-0.5 rounded">
                                        ID: {chunk.id.substring(0, 8)}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteChunk(chunk.id)}
                                        className="p-1 px-1.5 text-stone-400 hover:text-[#991B1B] hover:bg-[#FEF2F2] rounded transition-colors flex items-center gap-1 border border-transparent hover:border-[#FEF2F2]/50"
                                        title="Bu Chunk'ı Veritabanından Sil"
                                    >
                                        <Trash2 size={10} />
                                        <span className="text-[9px] font-semibold invisible group-hover:visible">Sil</span>
                                    </button>
                                </div>
                            </div>

                            {/* Text */}
                            <div className="p-3">
                                <p className="text-[12px] text-stone-700 leading-relaxed break-words font-mono whitespace-pre-wrap">
                                    <HighlightWrapper text={chunk.text} highlight={searchTerm} />
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="px-3 py-2 bg-stone-50/50 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-500">
                                <div className="flex gap-3">
                                    {(chunk.rawMeta?.start_time_fmt || chunk.rawMeta?.end_time_fmt) ? (
                                        <>
                                            <span className="font-mono bg-white border border-stone-200 px-1.5 py-0.5 rounded shadow-sm text-[#378ADD] font-semibold">{chunk.rawMeta.start_time_fmt || '00:00:00'}</span>
                                            <span className="font-mono px-0.5 text-stone-400 font-bold">-</span>
                                            <span className="font-mono bg-white border border-stone-200 px-1.5 py-0.5 rounded shadow-sm text-[#378ADD] font-semibold">{chunk.rawMeta.end_time_fmt || '00:00:00'}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="font-mono bg-white border border-stone-200 px-1.5 py-0.5 rounded shadow-sm">X: {chunk.x}</span>
                                            <span className="font-mono bg-white border border-stone-200 px-1.5 py-0.5 rounded shadow-sm">Y: {chunk.y}</span>
                                        </>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                    {/* PDF / PPTX görsel ikonu */}
                                    {imgOk && (
                                        <button
                                            onMouseEnter={(e) => handleBtnEnter(chunk, e)}
                                            onMouseLeave={handleBtnLeave}
                                            onClick={(e) => openPopup(chunk, e.clientX, e.clientY)}
                                            className="flex items-center gap-1 px-2 py-1 text-stone-500 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 rounded transition-colors font-medium"
                                            title="Sayfada Göster"
                                        >
                                            <Image size={12} /> Görsel
                                        </button>
                                    )}
                                    {/* BPMN diyagram ikonu */}
                                    {bpmnOk && (
                                        <button
                                            onMouseEnter={(e) => handleBtnEnter(chunk, e)}
                                            onMouseLeave={handleBtnLeave}
                                            onClick={(e) => openPopup(chunk, e.clientX, e.clientY)}
                                            className="flex items-center gap-1 px-2 py-1 text-stone-500 hover:text-teal-700 hover:bg-teal-50 border border-transparent hover:border-teal-200 rounded transition-colors font-medium"
                                            title="BPMN Diyagramında Göster"
                                        >
                                            <Workflow size={12} /> Diyagram
                                        </button>
                                    )}
                                    {/* JSON */}
                                    <button
                                        onClick={() => toggleJsonInfo(chunk.id)}
                                        className="flex items-center gap-1 px-2 py-1 text-stone-500 hover:text-[#378ADD] hover:bg-[#E6F1FB] border border-transparent hover:border-[#B8D4F0] rounded transition-colors font-medium"
                                    >
                                        <Code size={12} /> {expandedJson[chunk.id] ? 'Gizle' : 'JSON'}
                                    </button>
                                </div>
                            </div>

                            {/* JSON detail */}
                            {expandedJson[chunk.id] && (
                                <div className="border-t border-stone-200 bg-[#0f172a] animate-in fade-in slide-in-from-top-1">
                                    <div className="p-3 overflow-x-auto">
                                        <pre className="text-[10px] text-emerald-400 font-mono">
                                            {JSON.stringify({ id: chunk.id, ...chunk.rawMeta, char_length: chunk.text.length }, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Portal popup — body'e mount edilir, her şeyin üzerinde */}
            {popup && (
                <ChunkPopup
                    chunk={popup.chunk}
                    mouseX={popup.mouseX}
                    mouseY={popup.mouseY}
                    onClose={closePopup}
                    onMouseEnter={handlePopupEnter}
                    onMouseLeave={handlePopupLeave}
                />
            )}
        </div>
    );
};

export default VdbChunkPanel;
