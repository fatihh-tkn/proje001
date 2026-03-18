import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const PdfViewerComponent = ({ url, title, initialPage }) => {
    const containerRef = useRef(null);
    const wrapperRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(0);
    const [zoom, setZoom] = useState(1);

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
                const viewport = page.getViewport({ scale: 1.5 });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                canvas.className = 'my-4 shadow-lg bg-white block rounded max-w-full h-auto';
                // Scroll hedefi için sayfa numarasını data attribute olarak işaretle
                canvas.dataset.pageNum = pageNum;

                const wrapper = document.createElement('div');
                wrapper.className = 'flex justify-center w-full px-4';
                wrapper.dataset.pageNum = pageNum;
                wrapper.appendChild(canvas);

                if (containerRef.current) {
                    containerRef.current.appendChild(wrapper);
                }

                await page.render({ canvasContext: context, viewport }).promise;

                // Tüm render bitti → hedef sayfaya smooth scroll
                if (pageNum === pdf.numPages) {
                    setLoading(false);
                    if (initialPage && initialPage > 1 && wrapperRef.current) {
                        setTimeout(() => {
                            const target = wrapperRef.current?.querySelector(
                                `[data-page-num="${initialPage}"]`
                            );
                            if (target) {
                                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        }, 80);
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
    }, [url, initialPage]);

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
                {initialPage && totalPages > 0 && (
                    <div className="bg-red-600/80 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full shadow-lg">
                        📍 Sayfa {initialPage} / {totalPages}
                    </div>
                )}
                <div className="bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full shadow-lg opacity-70 hover:opacity-100 transition-opacity">
                    Yakınlaştır: Ctrl + Tekerlek ({(zoom * 100).toFixed(0)}%)
                </div>
            </div>
        </div>
    );
};

export default PdfViewerComponent;
