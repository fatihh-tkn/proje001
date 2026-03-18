import React, { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const ImageViewer = ({ url, title, bbox }) => {
    const [loading, setLoading] = useState(true);
    const [imgNativeSize, setImgNativeSize] = useState({ width: 0, height: 0 });
    const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
    const imgRef = useRef(null);

    // Eğer pencere boyutu değişirse iframe'in boyutu değişebilir. Bu yüzden tekrar render edeceğiz.
    useEffect(() => {
        const handleResize = () => {
            if (imgRef.current) {
                setDisplaySize({
                    width: imgRef.current.clientWidth,
                    height: imgRef.current.clientHeight
                });
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const updateDimensions = (e) => {
        setImgNativeSize({
            width: e.target.naturalWidth,
            height: e.target.naturalHeight
        });
        setDisplaySize({
            width: e.target.clientWidth,
            height: e.target.clientHeight
        });
        setLoading(false);
    };

    const renderBbox = () => {
        if (!bbox || !imgNativeSize.width || !displaySize.width) return null;

        const scaleX = displaySize.width / imgNativeSize.width;
        const scaleY = displaySize.height / imgNativeSize.height;

        const parts = String(bbox).split(',').map(Number);
        if (parts.length === 4) {
            const [x0, y0, x1, y1] = parts;
            return (
                <div
                    style={{
                        position: 'absolute',
                        border: '3px solid rgba(239, 68, 68, 0.8)',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        left: `${x0 * scaleX}px`,
                        top: `${y0 * scaleY}px`,
                        width: `${(x1 - x0) * scaleX}px`,
                        height: `${(y1 - y0) * scaleY}px`,
                        pointerEvents: 'none',
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
                        zIndex: 10,
                        borderRadius: '4px'
                    }}
                />
            );
        }
        return null;
    };

    return (
        <div className="w-full h-full relative flex items-center justify-center bg-slate-900 overflow-auto p-8 custom-scrollbar">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-20">
                    <Loader2 size={32} className="animate-spin text-teal-500" />
                </div>
            )}
            <div className="relative inline-block max-w-[90%] transition-opacity duration-500" style={{ opacity: loading ? 0 : 1 }}>
                <img
                    ref={imgRef}
                    src={url}
                    alt={title}
                    className="w-full h-auto object-contain rounded shadow-2xl bg-white"
                    onLoad={updateDimensions}
                    onError={() => setLoading(false)}
                />
                {!loading && renderBbox()}
            </div>

            {bbox && !loading && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-sm px-4 py-2 rounded-full shadow-lg opacity-90 backdrop-blur-sm z-50 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    Sorduğunuz bilginin belgedeki konumu tespit edildi ve işaretlendi
                </div>
            )}
        </div>
    );
};

export default ImageViewer;
