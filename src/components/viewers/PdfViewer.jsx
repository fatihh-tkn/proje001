import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// ── Yardımcı: bbox string → objeye dönüştür ──────────────────────────
// Format: "x0,y0,x1,y1" (PDF user-space koordinatları)
function parseBbox(bboxStr) {
    if (!bboxStr || typeof bboxStr !== 'string') return null;
    const parts = bboxStr.split(',').map(Number);
    if (parts.length < 4 || parts.some(isNaN)) return null;
    return { x0: parts[0], y0: parts[1], x1: parts[2], y1: parts[3] };
}

const PdfViewerComponent = ({ url, title, initialPage, highlightBbox, highlightPage }) => {
    const containerRef = useRef(null);
    const wrapperRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(0);
    const [zoom, setZoom] = useState(1);

    const SCALE = 1.5; // pdfjs render scale

    useEffect(() => {
        if (!url || !containerRef.current) return;

        let isMounted = true;
        setLoading(true);
        containerRef.current.innerHTML = '';

        const loadingTask = pdfjsLib.getDocument(url);

        loadingTask.promise.then(async (pdf) => {
            if (!isMounted) return;
            setTotalPages(pdf.numPages);

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                if (!isMounted) break;

                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: SCALE });

                // ── Canvas ──────────────────────────────────────────────
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                canvas.dataset.pageNum = pageNum;

                // ── Wrapper: canvas + highlight overlay birlikte ────────
                const wrapper = document.createElement('div');
                wrapper.className = 'flex justify-center w-full px-4';
                wrapper.dataset.pageNum = pageNum;

                // canvas'ı relative kapsayıcıya al
                const pageContainer = document.createElement('div');
                pageContainer.style.position = 'relative';
                pageContainer.style.display = 'inline-block';
                pageContainer.appendChild(canvas);

                // ── Highlight overlay ────────────────────────────────────
                const shouldHighlight =
                    highlightPage && highlightBbox &&
                    pageNum === Number(highlightPage);

                if (shouldHighlight) {
                    const bbox = parseBbox(highlightBbox);
                    if (bbox) {
                        // PDF user-space → canvas piksel koordinatları
                        // viewport.convertToViewportPoint veya basit çarpım:
                        const x = Math.round(bbox.x0 * SCALE);
                        const y = Math.round(bbox.y0 * SCALE);
                        const w = Math.round((bbox.x1 - bbox.x0) * SCALE);
                        const h = Math.round((bbox.y1 - bbox.y0) * SCALE);

                        const overlay = document.createElement('div');
                        overlay.style.cssText = `
                            position: absolute;
                            left: ${x}px;
                            top: ${y}px;
                            width: ${w}px;
                            height: ${h}px;
                            background: rgba(255, 220, 0, 0.28);
                            border: 2.5px solid rgba(255, 160, 0, 0.85);
                            border-radius: 5px;
                            pointer-events: none;
                            z-index: 10;
                            animation: pdf-highlight-pulse 1.4s ease-in-out 3;
                            box-shadow: 0 0 0 4px rgba(255,200,0,0.18);
                        `;
                        pageContainer.appendChild(overlay);
                    }
                }

                wrapper.appendChild(pageContainer);

                if (containerRef.current) {
                    containerRef.current.appendChild(wrapper);
                }

                await page.render({ canvasContext: context, viewport }).promise;

                // ── Son sayfa render bitti ───────────────────────────────
                if (pageNum === pdf.numPages) {
                    setLoading(false);

                    // initialPage scroll (highlight yoksa)
                    const targetPage = highlightPage || initialPage;
                    if (targetPage && Number(targetPage) > 1 && wrapperRef.current) {
                        setTimeout(() => {
                            const target = wrapperRef.current?.querySelector(
                                `[data-page-num="${targetPage}"]`
                            );
                            if (target) {
                                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        }, 80);
                    }

                    // Highlight varsa zoom artır (küçük alanlar daha görünür olsun)
                    if (shouldHighlight) {
                        const bbox = parseBbox(highlightBbox);
                        const areaHeight = bbox ? (bbox.y1 - bbox.y0) * SCALE : 200;
                        if (areaHeight < 120) {
                            setZoom(2.2);
                        } else if (areaHeight < 250) {
                            setZoom(1.8);
                        }
                    }
                }
            }
        }).catch(err => {
            console.error('PDF Loading Error:', err);
            setLoading(false);
        });

        return () => {
            isMounted = false;
            if (loadingTask) loadingTask.destroy();
        };
    }, [url, initialPage, highlightPage, highlightBbox]);

    // Ctrl + Tekerlek → Zoom
    useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;

        const handleWheel = (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                setZoom(z => {
                    const newZoom = z - e.deltaY * 0.003;
                    return Math.min(Math.max(0.3, newZoom), 5);
                });
            }
        };

        wrapper.addEventListener('wheel', handleWheel, { passive: false });
        return () => wrapper.removeEventListener('wheel', handleWheel);
    }, []);

    return (
        <>
            {/* Highlight animasyon keyframe'i — global style olarak enjekte et */}
            <style>{`
                @keyframes pdf-highlight-pulse {
                    0%   { opacity: 0.25; box-shadow: 0 0 0 4px rgba(255,200,0,0.10); }
                    50%  { opacity: 0.85; box-shadow: 0 0 0 8px rgba(255,200,0,0.35); }
                    100% { opacity: 0.25; box-shadow: 0 0 0 4px rgba(255,200,0,0.10); }
                }
            `}</style>

            <div ref={wrapperRef} className="w-full h-full overflow-auto bg-[var(--window-bg)] flex-1 relative custom-scrollbar flex flex-col items-center">
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-[var(--sidebar-text-muted)] bg-[var(--window-bg)]/80 z-20 backdrop-blur-sm">
                        <div className="w-8 h-8 rounded-full border-4 border-slate-300 border-t-red-500 animate-spin mb-4" />
                        <span className="text-sm font-medium">PDF İşleniyor...</span>
                    </div>
                )}

                <div
                    className="flex-1 min-w-min min-h-min p-8 flex items-center justify-center transition-transform duration-100 origin-top"
                    style={{ transform: `scale(${zoom})` }}
                >
                    <div ref={containerRef} className="flex flex-col items-center justify-center relative z-10 min-w-max shadow-2xl bg-white rounded-lg overflow-hidden" />
                </div>

                {/* Alt durum çubuğu */}
                <div className="absolute bottom-4 right-4 flex items-center gap-3 z-30">
                    {highlightPage && totalPages > 0 && (
                        <div className="bg-amber-500/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                            <span>🔍</span>
                            <span>Slayt {highlightPage} / {totalPages} — Alan İşaretlendi</span>
                        </div>
                    )}
                    {!highlightPage && initialPage && totalPages > 0 && (
                        <div className="bg-red-600/80 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full shadow-lg">
                            📍 Sayfa {initialPage} / {totalPages}
                        </div>
                    )}
                    <div className="bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full shadow-lg opacity-70 hover:opacity-100 transition-opacity">
                        Yakınlaştır: Ctrl + Tekerlek ({(zoom * 100).toFixed(0)}%)
                    </div>
                </div>
            </div>
        </>
    );
};

export default PdfViewerComponent;

