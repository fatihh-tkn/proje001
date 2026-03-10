import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// Vite ve modern bundlerlar worker'ı bu şekilde otomatik yükleyebilmektedir
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const PdfViewerComponent = ({ url, title }) => {
    const containerRef = useRef(null);
    const [loading, setLoading] = useState(true);

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

    return (
        <div className="w-full h-full overflow-y-auto bg-slate-100 flex-1 relative hide-scrollbar">
            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-slate-400 bg-slate-100/80 z-20 backdrop-blur-sm">
                    <div className="w-8 h-8 rounded-full border-4 border-slate-300 border-t-red-500 animate-spin mb-4" />
                    <span className="text-sm font-medium">PDF İşleniyor (Offline Canvas Render)...</span>
                </div>
            )}
            <div ref={containerRef} className="flex flex-col items-center relative z-10 w-full py-4 min-w-[max-content]" />
        </div>
    );
};

export default PdfViewerComponent;
