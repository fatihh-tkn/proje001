import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Square, ExternalLink } from 'lucide-react';

const N8nViewer = () => {
    const [iframeUrl, setIframeUrl] = useState(() => {
        return localStorage.getItem('n8n_target_url') || "http://localhost:5678";
    });

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
        <div className="relative w-full h-full overflow-hidden bg-[#0f0f10] font-sans">
            <motion.div
                key="ui"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 z-10"
            >
                <iframe
                    src={iframeUrl}
                    className="absolute top-0 left-0 w-full h-full border-0"
                    style={{ width: '100%', height: '100%', display: 'block' }}
                    title="n8n Engine Portal"
                    allow="clipboard-read; clipboard-write"
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
