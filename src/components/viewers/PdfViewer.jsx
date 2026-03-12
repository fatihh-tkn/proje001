import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// Vite ve modern bundlerlar worker'ı bu şekilde otomatik yükleyebilmektedir
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const PdfViewerComponent = ({ url, title }) => {
    const containerRef = useRef(null);
    const wrapperRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [zoom, setZoom] = useState(1);

    useEffect(() => {
        if (!url || !containerRef.current) return;

        let renderTask = null;
        let isMounted = true;

        setLoading(true);
        containerRef.current.innerHTML = ''; // Önceki sayfaları temizle

        // PDF'i tamamen offline mantığında URL üzerinden veya Blob çevirisinden okuyoruz
        const loadingTask = pdfjsLib.getDocument(url);

        loadingTask.promise.then(async (pdf) => {
            if (!isMounted) return;

            // Tüm PDF sayfalarını tek tek Canvas'a dökelim
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                if (!isMounted) break;

                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 1.5 }); // Yakınlaştırma oranı (okunabilirlik için 1.5 iyidir)

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                // Tasarım ayarları: Her sayfa gölgeli bir A4 kağıt gibi görünsün
                canvas.className = 'my-4 shadow-lg bg-white block rounded max-w-full h-auto';

                const wrapper = document.createElement('div');
                wrapper.className = 'flex justify-center w-full px-4';
                wrapper.appendChild(canvas);

                if (containerRef.current) {
                    containerRef.current.appendChild(wrapper);
                }

                renderTask = page.render({
                    canvasContext: context,
                    viewport: viewport,
                });

                await renderTask.promise;
            }
            setLoading(false);
        }).catch(err => {
            console.error("PDF Loading Error:", err);
            setLoading(false);
        });

        return () => {
            isMounted = false;
            if (loadingTask) loadingTask.destroy();
        };
    }, [url]);

    // Ctrl+Tekerlek veya Shift+Tekerlek veya sadece Tekerlek ile zoom
    useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;

        const handleWheel = (e) => {
            // Kullanıcı tekerlek ile büyütme küçültme istedi. 
            // Direkt tekerleği zoom olarak kullanmak için e.ctrlKey şartını kaldırabiliriz, 
            // Ancak dokümanlarda kaydırma da önemlidir. İkisi bir arada çalışsın diye 
            // e.preventDefault() ile sayfa kaymasını durdurup sadece zoom yapıyoruz
            // NOT: Kaydırmayı engellememesi için Ctrl basılıyken zoom yapmayı zorunlu kılıyoruz.
            if (e.ctrlKey) {
                e.preventDefault();
                setZoom(z => {
                    const newZoom = z - e.deltaY * 0.003;
                    return Math.min(Math.max(0.3, newZoom), 5); // 0.3x - 5x arası
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
                    <span className="text-sm font-medium">PDF İşleniyor (Offline Canvas Render)...</span>
                </div>
            )}

            {/* 
              Ortalama ve yakınlaştırma konteyneri. 
              Genişlik/Yükseklik otomatik ayarlanır, transform ile ölçeklendirilir.
            */}
            <div
                className="flex-1 min-w-min min-h-min p-8 flex items-center justify-center transition-transform duration-100 origin-top"
                style={{ transform: `scale(${zoom})` }}
            >
                <div ref={containerRef} className="flex flex-col items-center justify-center relative z-10 min-w-max shadow-2xl bg-white rounded-lg overflow-hidden" />
            </div>

            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full shadow-lg z-30 opacity-70 hover:opacity-100 transition-opacity">
                Yakınlaştır: Ctrl + Tekerlek ({(zoom * 100).toFixed(0)}%)
            </div>
        </div>
    );
};

export default PdfViewerComponent;
