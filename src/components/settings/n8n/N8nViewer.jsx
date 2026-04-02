import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Square, ExternalLink } from 'lucide-react';

const N8nViewer = () => {
    const [iframeUrl, setIframeUrl] = useState(() => {
        return localStorage.getItem('n8n_target_url') || "http://localhost:5678";
    });
    const [isIframeLoaded, setIsIframeLoaded] = useState(false);

    // Deep linking güncellemelerini yakala (Açıkken tetiklenirse)
    useEffect(() => {
        const handler = () => {
            const url = localStorage.getItem('n8n_target_url') || "http://localhost:5678";
            setIframeUrl(url);
        };
        window.addEventListener('open-n8n-workspace', handler);
        return () => window.removeEventListener('open-n8n-workspace', handler);
    }, []);

    const handleStop = async () => {
        try { await fetch('/api/n8n/stop', { method: 'POST' }); } catch { /* sessizce */ }
    };

    return (
        <div className="relative w-full h-full overflow-hidden bg-[#fafafa] font-sans">

            {/* ── İskelet Ekran (Skeleton UI) ── */}
            <AnimatePresence>
                {!isIframeLoaded && (
                    <motion.div
                        key="skeleton"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 z-0 flex"
                    >
                        {/* Sol Menü (Sidebar) Skeleton */}
                        <div className="w-[60px] h-full bg-white border-r border-slate-200 flex flex-col items-center py-4 gap-6">
                            <div className="w-8 h-8 rounded-md bg-slate-100 animate-pulse" />
                            <div className="w-6 h-6 rounded-md bg-slate-100 animate-pulse mt-4" />
                            <div className="w-6 h-6 rounded-md bg-slate-100 animate-pulse" />
                            <div className="w-6 h-6 rounded-md bg-slate-100 animate-pulse" />
                        </div>

                        <div className="flex-1 flex flex-col">
                            {/* Üst Bar (Header) Skeleton */}
                            <div className="h-[60px] bg-white border-b border-slate-200 flex items-center px-6 justify-between shrink-0">
                                <div className="flex gap-4 items-center">
                                    <div className="w-8 h-8 rounded-md bg-slate-100 animate-pulse" />
                                    <div className="w-32 h-5 rounded-md bg-slate-100 animate-pulse" />
                                </div>
                                <div className="flex gap-3">
                                    <div className="w-24 h-8 rounded-full bg-slate-100 animate-pulse" />
                                    <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />
                                </div>
                            </div>

                            {/* Tuval (Canvas / İçerik) Skeleton */}
                            <div className="flex-1 p-8">
                                <div className="max-w-4xl mx-auto space-y-6">
                                    <div className="flex justify-between items-center mb-8">
                                        <div className="w-48 h-8 rounded-md bg-slate-200/60 animate-pulse" />
                                        <div className="w-20 h-8 rounded-md bg-slate-200/60 animate-pulse" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="h-32 rounded-xl bg-white border border-slate-200 shadow-sm animate-pulse" />
                                        <div className="h-32 rounded-xl bg-white border border-slate-200 shadow-sm animate-pulse delay-75" />
                                        <div className="h-32 rounded-xl bg-white border border-slate-200 shadow-sm animate-pulse delay-150" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Gerçek İframe ── */}
            <motion.div
                key="ui"
                initial={{ opacity: 0 }}
                animate={{ opacity: isIframeLoaded ? 1 : 0 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 z-10"
            >
                <iframe
                    src={iframeUrl}
                    className="absolute top-0 left-0 w-full h-full border-0"
                    style={{ width: '100%', height: '100%', display: 'block' }}
                    title="n8n Engine Portal"
                    allow="clipboard-read; clipboard-write"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-presentation"
                    onLoad={() => setIsIframeLoaded(true)}
                />
            </motion.div>

            {/* ── Floating kontrol çubuğu ── */}
            <motion.div
                key="ctrl"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
                className="absolute bottom-5 right-6 z-[100] flex items-center gap-2 bg-[#1a1a1c]/90 backdrop-blur-xl px-2 py-1.5 rounded-full shadow-2xl border border-white/10"
            >
                {/* Canlı göstergesi */}
                <div className="pl-2 pr-3 flex items-center gap-2 border-r border-white/10">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase">Canlı</span>
                </div>

                {/* Harici aç */}
                <a
                    href="http://localhost:5678"
                    target="_blank"
                    rel="noreferrer"
                    className="w-7 h-7 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    title="Harici Sekmede Aç"
                >
                    <ExternalLink size={13} />
                </a>

                {/* Durdur */}
                <button
                    onClick={handleStop}
                    className="h-7 px-3 rounded-full font-semibold text-[11px] flex items-center gap-1.5 bg-rose-500/15 text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
                    title="Motoru Durdur"
                >
                    <Square size={12} fill="currentColor" />
                    Durdur
                </button>
            </motion.div>
        </div>
    );
};

export default N8nViewer;
