import React, { useEffect, useRef, useState } from 'react';
import * as docx from 'docx-preview';
// docx-preview jszip kütüphanesine ihtiyaç duyar (dependency)

const DocxViewerComponent = ({ url }) => {
    const containerRef = useRef(null);
    const [loading, setLoading] = useState(true);

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
                    ignoreWidth: false, // sayfa genişliği A4 kurallarına uysun
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

    return (
        <div className="w-full h-full overflow-y-auto bg-slate-100 flex-1 relative custom-scrollbar">
            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-slate-400 bg-slate-100/80 z-20 backdrop-blur-sm">
                    <div className="w-8 h-8 rounded-full border-4 border-slate-300 border-t-blue-500 animate-spin mb-4" />
                    <span className="text-sm font-medium">Word Belleğe Aktarılıyor (docx-preview)...</span>
                </div>
            )}

            {/* 
        docx-preview'in render ettiği HTML'ler otomatik olarak orjinal word 
        stillerine sahip olacaktır. Özel tailwind class'ları word'ün kendi css'i 
        ile çakışmasını engellemek için dış sargıyı güvenli tutuyoruz.
      */}
            <div
                ref={containerRef}
                className="flex flex-col items-center relative z-10 w-full py-6 min-w-[max-content]"
            />
        </div>
    );
};

export default DocxViewerComponent;
