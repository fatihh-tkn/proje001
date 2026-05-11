import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, RefreshCw, Play, ExternalLink, Square, AlertTriangle } from 'lucide-react';

const N8nViewer = () => {
    const [status, setStatus] = useState('checking'); // checking | running | starting | stopped | error
    const [iframeUrl, setIframeUrl] = useState(() =>
        localStorage.getItem('n8n_target_url') || 'http://localhost:5678'
    );
    const [iframeLoaded, setIframeLoaded] = useState(false);
    const evtRef = useRef(null);

    const checkStatus = useCallback(async () => {
        setStatus('checking');
        try {
            const res = await fetch('/api/n8n/status');
            if (res.ok) {
                const data = await res.json();
                if (data.status === 'running') { setStatus('running'); return; }
            }
        } catch (_) {}
        setStatus('stopped');
    }, []);

    useEffect(() => {
        checkStatus();
        return () => { if (evtRef.current) { evtRef.current.close(); evtRef.current = null; } };
    }, [checkStatus]);

    // deep-link güncelleme (başka yerden tetiklenirse)
    useEffect(() => {
        const h = () => {
            const url = localStorage.getItem('n8n_target_url') || 'http://localhost:5678';
            setIframeUrl(url);
        };
        window.addEventListener('open-n8n-workspace', h);
        return () => window.removeEventListener('open-n8n-workspace', h);
    }, []);

    const startN8n = async () => {
        setStatus('starting');
        try {
            const res = await fetch('/api/n8n/start', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                if (data.status === 'already_running') { setStatus('running'); return; }
                if (data.status === 'error') { setStatus('error'); return; }
            }
        } catch (_) { setStatus('error'); return; }

        // SSE ile hazır olmasını bekle
        const es = new EventSource('/api/n8n/status/stream');
        evtRef.current = es;
        es.onmessage = (e) => {
            try {
                const d = JSON.parse(e.data);
                if (d.status === 'running') {
                    es.close(); evtRef.current = null;
                    setIframeLoaded(false);
                    setStatus('running');
                } else if (d.status === 'timeout' || d.status === 'stopped') {
                    es.close(); evtRef.current = null;
                    setStatus('error');
                }
            } catch (_) {}
        };
        es.onerror = () => { es.close(); evtRef.current = null; setStatus('error'); };
    };

    const stopN8n = async () => {
        try { await fetch('/api/n8n/stop', { method: 'POST' }); } catch (_) {}
        setStatus('stopped');
    };

    // ── CHECKING ───────────────────────────────────────────────────────
    if (status === 'checking') {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-white font-sans">
                <div className="w-7 h-7 border-[2.5px] border-[#378ADD] border-t-transparent rounded-full animate-spin" />
                <span className="text-[11px] font-black text-stone-400 uppercase tracking-[0.18em]">Durum Kontrol Ediliyor...</span>
            </div>
        );
    }

    // ── STARTING ───────────────────────────────────────────────────────
    if (status === 'starting') {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-white font-sans">
                <div className="p-4 bg-[#E6F1FB] border border-[#B8D4F0] rounded-xl">
                    <Zap size={28} className="text-[#378ADD]" />
                </div>
                <div className="text-center">
                    <p className="text-[13px] font-black text-stone-800">Otomasyon Motoru Başlatılıyor</p>
                    <p className="text-[11px] text-stone-400 mt-1 font-medium">n8n hazır olana kadar bekleyin...</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#378ADD] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#378ADD] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#378ADD] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
        );
    }

    // ── STOPPED / ERROR ────────────────────────────────────────────────
    if (status === 'stopped' || status === 'error') {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-white font-sans">
                <div className={`p-4 rounded-xl border ${status === 'error' ? 'bg-red-50 border-red-200' : 'bg-stone-100 border-stone-200'}`}>
                    {status === 'error'
                        ? <AlertTriangle size={28} className="text-red-400" />
                        : <Zap size={28} className="text-stone-300" />
                    }
                </div>
                <div className="text-center">
                    <p className="text-[13px] font-black text-stone-800">
                        {status === 'error' ? 'Başlatma Başarısız' : 'Otomasyon Motoru Durduruldu'}
                    </p>
                    <p className="text-[11px] text-stone-400 mt-1 font-medium">
                        {status === 'error'
                            ? 'n8n başlatılamadı. Kurulu olduğundan emin olun.'
                            : 'n8n şu anda çalışmıyor.'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={startN8n}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#378ADD] hover:bg-[#0C447C] text-white text-[12px] font-black rounded-lg shadow-sm transition-colors"
                    >
                        <Play size={13} fill="currentColor" /> n8n'i Başlat
                    </button>
                    {status === 'error' && (
                        <button
                            onClick={checkStatus}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-stone-200 hover:border-[#378ADD] hover:text-[#378ADD] text-stone-500 text-[12px] font-black rounded-lg shadow-sm transition-colors"
                        >
                            <RefreshCw size={12} /> Yeniden Kontrol Et
                        </button>
                    )}
                </div>
                <p className="text-[10px] text-stone-300 font-medium mt-1">
                    Hedef: {iframeUrl}
                </p>
            </div>
        );
    }

    // ── RUNNING ────────────────────────────────────────────────────────
    return (
        <div className="relative w-full h-full overflow-hidden bg-stone-50 font-sans">
            {/* Skeleton — iframe yüklenene kadar */}
            {!iframeLoaded && (
                <div className="absolute inset-0 z-10 flex bg-stone-50">
                    <div className="w-[60px] h-full bg-white border-r border-stone-100 flex flex-col items-center py-4 gap-5">
                        <div className="w-8 h-8 rounded-lg bg-stone-100 animate-pulse" />
                        <div className="w-6 h-6 rounded-md bg-stone-100 animate-pulse mt-3" />
                        <div className="w-6 h-6 rounded-md bg-stone-100 animate-pulse" />
                    </div>
                    <div className="flex-1 flex flex-col">
                        <div className="h-14 bg-white border-b border-stone-100 flex items-center px-5 gap-4 shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-stone-100 animate-pulse" />
                            <div className="w-36 h-4 rounded bg-stone-100 animate-pulse" />
                            <div className="ml-auto flex gap-2">
                                <div className="w-20 h-7 rounded-lg bg-stone-100 animate-pulse" />
                                <div className="w-7 h-7 rounded-lg bg-stone-100 animate-pulse" />
                            </div>
                        </div>
                        <div className="flex-1 p-6 flex flex-col gap-4">
                            <div className="w-48 h-7 rounded-lg bg-stone-100 animate-pulse" />
                            <div className="grid grid-cols-3 gap-4 mt-2">
                                <div className="h-28 rounded-xl bg-white border border-stone-100 shadow-sm animate-pulse" />
                                <div className="h-28 rounded-xl bg-white border border-stone-100 shadow-sm animate-pulse delay-75" />
                                <div className="h-28 rounded-xl bg-white border border-stone-100 shadow-sm animate-pulse delay-150" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* İframe */}
            <iframe
                src={iframeUrl}
                className="absolute inset-0 w-full h-full border-0"
                style={{ display: 'block' }}
                title="n8n Engine Portal"
                allow="clipboard-read; clipboard-write"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-presentation"
                onLoad={() => setIframeLoaded(true)}
            />

            {/* Floating kontrol çubuğu */}
            {iframeLoaded && (
                <div className="absolute bottom-5 right-5 z-50 flex items-center gap-1.5 bg-white border border-stone-200 shadow-lg px-2 py-1.5 rounded-full">
                    <div className="pl-1 pr-2 flex items-center gap-1.5 border-r border-stone-200">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                        </span>
                        <span className="text-[10px] font-black text-stone-500 tracking-[0.12em] uppercase">Canlı</span>
                    </div>
                    <a
                        href={iframeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-7 h-7 flex items-center justify-center rounded-full text-stone-400 hover:text-[#378ADD] hover:bg-stone-50 transition-all"
                        title="Harici Sekmede Aç"
                    >
                        <ExternalLink size={12} />
                    </a>
                    <button
                        onClick={stopN8n}
                        className="h-7 px-2.5 rounded-full font-black text-[10px] flex items-center gap-1 text-stone-500 hover:text-red-600 hover:bg-red-50 transition-all"
                        title="Motoru Durdur"
                    >
                        <Square size={10} fill="currentColor" /> Durdur
                    </button>
                </div>
            )}
        </div>
    );
};

export default N8nViewer;
