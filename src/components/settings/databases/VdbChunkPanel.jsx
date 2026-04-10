import { useState, useEffect } from 'react';
import { Trash2, Code, Image, X, Target } from 'lucide-react';

// ── Chunk tipi → renk/etiket ─────────────────────────────────────────
const CHUNK_TYPE_META = {
    pptx_title:             { label: 'Başlık',    color: 'bg-blue-100 text-blue-700 border-blue-200' },
    pptx_callout:           { label: 'Açıklama',  color: 'bg-orange-100 text-orange-700 border-orange-200' },
    pptx_body:              { label: 'Gövde',     color: 'bg-slate-100 text-slate-600 border-slate-200' },
    pptx_notes:             { label: 'Notlar',    color: 'bg-purple-100 text-purple-700 border-purple-200' },
    pptx_slide:             { label: 'Slayt',     color: 'bg-slate-100 text-slate-600 border-slate-200' },
    pptx_summary:           { label: 'Özet',      color: 'bg-green-100 text-green-700 border-green-200' },
    pptx_screenshot_vision: { label: 'Vision',    color: 'bg-pink-100 text-pink-700 border-pink-200' },
    pptx_error:             { label: 'Hata',      color: 'bg-red-100 text-red-700 border-red-200' },
};

const ChunkTypeBadge = ({ type }) => {
    if (!type) return null;
    const meta = CHUNK_TYPE_META[type] || { label: type.replace('pptx_', ''), color: 'bg-slate-100 text-slate-500 border-slate-200' };
    return (
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide ${meta.color}`}>
            {meta.label}
        </span>
    );
};

// ── Highlight ────────────────────────────────────────────────────────
const HighlightWrapper = ({ text = '', highlight = '' }) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const regex = new RegExp(`(${highlight})`, 'gi');
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

// ── Image Popup ──────────────────────────────────────────────────────
const ImagePopup = ({ chunk, mode, onClose }) => {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const sw = chunk.rawMeta.slide_emu_w || chunk.rawMeta.page_width || 0;
    const sh = chunk.rawMeta.slide_emu_h || chunk.rawMeta.page_height || 0;

    // mode: 'callout' → kendi bbox, 'target' → hedef bbox (okun işaret ettiği yer)
    const bbox = mode === 'target'
        ? (chunk.rawMeta.target_bbox || chunk.rawMeta.bbox)
        : chunk.rawMeta.bbox;

    const src = `/api/files/image/crop?image_path=${encodeURIComponent(chunk.rawMeta.image_path)}&bbox=${encodeURIComponent(bbox)}&slide_w=${sw}&slide_h=${sh}`;

    const isTarget = mode === 'target';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-700 flex flex-col max-w-[90vw] max-h-[90vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700 shrink-0">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                        {isTarget
                            ? <><Target size={13} className="text-amber-400" /> Hedef Alan</>
                            : <><Image size={13} className="text-emerald-400" /> Chunk Görseli</>
                        }
                        <span className="text-slate-500 font-mono normal-case tracking-normal">
                            ID: {chunk.id.substring(0, 8)}
                        </span>
                    </span>
                    <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex items-center justify-center p-6 overflow-auto">
                    <img
                        src={src}
                        alt="Görsel"
                        className="max-w-full max-h-[75vh] rounded-lg border border-slate-700 shadow-2xl object-contain bg-white"
                        loading="lazy"
                        onError={e => {
                            e.currentTarget.replaceWith(
                                Object.assign(document.createElement('p'), {
                                    className: 'text-slate-400 text-sm',
                                    textContent: 'Görsel yüklenemedi.'
                                })
                            );
                        }}
                    />
                </div>

                <div className="px-4 py-2 border-t border-slate-700 shrink-0 flex gap-4 text-[10px] font-mono text-slate-500">
                    <span>bbox: {bbox}</span>
                    {sw > 0 && <span>w: {sw}</span>}
                    {sh > 0 && <span>h: {sh}</span>}
                </div>
            </div>
        </div>
    );
};

// ── Ana Panel ────────────────────────────────────────────────────────
const VdbChunkPanel = ({ activeChunks, targetChunkId, chunkRefs, searchTerm, expandedJson, toggleJsonInfo, handleDeleteChunk }) => {
    const [popup, setPopup] = useState(null);  // { chunk, mode: 'callout'|'target' }

    const hasImage = (chunk) =>
        chunk.rawMeta?.image_path &&
        chunk.rawMeta?.bbox &&
        chunk.rawMeta.bbox !== '0,0,0,0';

    const hasTarget = (chunk) =>
        hasImage(chunk) &&
        chunk.rawMeta?.target_bbox &&
        chunk.rawMeta.target_bbox !== '0,0,0,0' &&
        chunk.rawMeta.target_bbox !== chunk.rawMeta.bbox;

    return (
        <div className="flex-1 bg-white flex flex-col h-full overflow-x-hidden overflow-y-auto min-w-[300px]">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 font-semibold text-[11px] tracking-wide text-slate-600 uppercase shrink-0 sticky top-0 z-10">
                Bilgi Parçacıkları (Chunks)
            </div>
            <div className="p-4 space-y-4 pb-20">
                {activeChunks.map((chunk, idx) => {
                    const isTarget = targetChunkId === chunk.id;
                    const chunkType = chunk.rawMeta?.type;
                    return (
                        <div
                            key={chunk.id}
                            id={chunk.id}
                            ref={el => chunkRefs.current[chunk.id] = el}
                            style={{ scrollMarginTop: '100px' }}
                            className={`border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group
                                ${isTarget ? 'border-amber-400 ring-4 ring-amber-100 bg-amber-50' : 'border-slate-200 bg-white'}
                            `}
                        >
                            {/* Header */}
                            <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${isTarget ? 'bg-amber-500' : 'bg-[#b91d2c]'}`} />
                                    Parça {idx + 1}
                                    <ChunkTypeBadge type={chunkType} />
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-mono text-slate-400 bg-white border border-slate-200 px-1 py-0.5 rounded">
                                        ID: {chunk.id.substring(0, 8)}
                                    </span>
                                    <button
                                        onClick={(e) => handleDeleteChunk(chunk.id, e)}
                                        className="p-1 px-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex items-center gap-1 border border-transparent hover:border-red-100"
                                        title="Bu Chunk'ı Veritabanından Sil"
                                    >
                                        <Trash2 size={10} />
                                        <span className="text-[9px] font-semibold invisible group-hover:visible">Sil</span>
                                    </button>
                                </div>
                            </div>

                            {/* Text */}
                            <div className="p-3">
                                <p className="text-[12px] text-slate-700 leading-relaxed break-words font-mono whitespace-pre-wrap">
                                    <HighlightWrapper text={chunk.text} highlight={searchTerm} />
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="px-3 py-2 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                                <div className="flex gap-3">
                                    <span className="font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm">X: {chunk.x}</span>
                                    <span className="font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm">Y: {chunk.y}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {hasTarget(chunk) && (
                                        <button
                                            onClick={() => setPopup({ chunk, mode: 'target' })}
                                            className="flex items-center gap-1 px-2 py-1 text-slate-500 hover:text-amber-700 hover:bg-amber-50 border border-transparent hover:border-amber-200 rounded transition-colors font-medium"
                                            title="Okun İşaret Ettiği Alanı Göster"
                                        >
                                            <Target size={12} /> Hedef
                                        </button>
                                    )}
                                    {hasImage(chunk) && (
                                        <button
                                            onClick={() => setPopup({ chunk, mode: 'callout' })}
                                            className="flex items-center gap-1 px-2 py-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 rounded transition-colors font-medium"
                                            title="Chunk Görselini Göster"
                                        >
                                            <Image size={12} /> Görsel
                                        </button>
                                    )}
                                    <button
                                        onClick={() => toggleJsonInfo(chunk.id)}
                                        className="flex items-center gap-1 px-2 py-1 text-slate-500 hover:text-[#b91d2c] hover:bg-red-50 border border-transparent hover:border-red-100 rounded transition-colors font-medium"
                                    >
                                        <Code size={12} /> {expandedJson[chunk.id] ? 'Gizle' : 'JSON'}
                                    </button>
                                </div>
                            </div>

                            {/* JSON detail */}
                            {expandedJson[chunk.id] && (
                                <div className="border-t border-slate-200 bg-[#0f172a] animate-in fade-in slide-in-from-top-1">
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

            {popup && (
                <ImagePopup
                    chunk={popup.chunk}
                    mode={popup.mode}
                    onClose={() => setPopup(null)}
                />
            )}
        </div>
    );
};

export default VdbChunkPanel;
