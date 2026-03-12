import React, { useEffect, useRef, useState } from 'react';
import * as docx from 'docx-preview';
// docx-preview jszip kütüphanesine ihtiyaç duyar (dependency)

const DocxViewerComponent = ({ url }) => {
    const containerRef = useRef(null);
    const wrapperRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [zoom, setZoom] = useState(1);

    useEffect(() => {
        if (!url || !containerRef.current) return;

        let isMounted = true;
        setLoading(true);

        // Eski döküman render kalıntıları engellemek için içeriği boşalt
        containerRef.current.innerHTML = "";

        fetch(url)
            .then(res => res.blob())
            .then(blob => {
                if (!isMounted) return;
                return docx.renderAsync(blob, containerRef.current, null, {
                    className: "docx-viewer-wrapper", // custom CSS prefix
                    inWrapper: true, // içeriği bir wrapper içine koyar (ortalama için iyi)
                    ignoreWidth: false, // sayfa genişliği A4 kurallarına uysun. Biz CSS scale ile daraltacağız
                    ignoreHeight: false,
                    ignoreFonts: false, // Orijinal fontları baz almaya çalışsın
                    breakPages: true, // Her sayfa ayrı çizilsin
                    ignoreLastRenderedPageBreak: true,
                    experimental: true,
                    trimXmlDeclaration: true,
                    useBase64URL: false,
                    useMathMLPolyfill: true
                });
            })
            .then(() => {
                if (isMounted) setLoading(false);
            })
            .catch(err => {
                console.error("Word Docx Loading Error (docx-preview):", err);
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [url]);

    // Ctrl + Tekerlek ile yakınlaştırma mantığı
    useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;

        const handleWheel = (e) => {
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
                    <div className="w-8 h-8 rounded-full border-4 border-slate-300 border-t-blue-500 animate-spin mb-4" />
                    <span className="text-sm font-medium">Word Belleğe Aktarılıyor (docx-preview)...</span>
                </div>
            )}

            <div
                className="flex-1 min-w-min min-h-min p-8 flex flex-col items-center justify-center transition-transform duration-100 origin-top"
                style={{ transform: `scale(${zoom})` }}
            >
                {/* 
                  docx-preview'in render ettiği HTML'ler otomatik olarak orjinal word 
                  stillerine sahip olacaktır. 
                */}
                <div
                    ref={containerRef}
                    className="relative z-10 w-auto min-w-[800px] shadow-2xl bg-white rounded-lg overflow-hidden py-10 px-6"
                />
            </div>

            <div className="fixed bottom-4 right-4 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full shadow-lg z-30 opacity-70 hover:opacity-100 transition-opacity">
                Yakınlaştır: Ctrl + Tekerlek ({(zoom * 100).toFixed(0)}%)
            </div>
        </div>
    );
};

export default DocxViewerComponent;
