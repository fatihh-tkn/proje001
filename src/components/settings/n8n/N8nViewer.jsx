import React, { useState, useEffect } from 'react';
import { Play, Square, Activity, Webhook, Zap, Loader2, Link, Database, DownloadCloud } from 'lucide-react';

const N8nViewer = () => {
    const [status, setStatus] = useState('loading'); // 'loading', 'stopped', 'running', 'installing'
    const [isActionLoading, setIsActionLoading] = useState(false);

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/n8n/status');
            if (!res.ok) return;
            const data = await res.json();
            setStatus(data.status);
        } catch {
            // backend henüz hazır değil, sessizce bekle
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 500); // 500ms ile anlık takip (hızlandırııldı)
        return () => clearInterval(interval);
    }, []);

    const toggleEngine = async () => {
        if (isActionLoading) return;
        setIsActionLoading(true);
        try {
            const endpoint = status === 'running' ? '/api/n8n/stop' : '/api/n8n/start';
            await fetch(endpoint, { method: 'POST' });
            setTimeout(fetchStatus, 2000);
        } catch (error) {
            console.error(error);
        }
        setIsActionLoading(false);
    };

    return (
        <div className="h-full bg-slate-50 relative flex flex-col font-sans overflow-hidden w-full">
            {/* Header (Sadece n8n kapalıyken veya kuruluyorken görünür) */}
            {status !== 'running' && (
                <div className="px-8 py-4 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between z-30 shadow-sm">
                    <div>
                        <h2 className="text-lg font-black flex items-center gap-2 text-slate-800">
                            <Webhook size={20} className={"text-slate-400"} />
                            n8n Otomasyon Motoru
                        </h2>
                        <p className="text-[11px] text-slate-500 font-medium opacity-70 uppercase tracking-tighter">AI Ops Execution Environment</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
                            <span className="relative flex h-2 w-2">
                                {status === 'installing' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${status === 'stopped' ? 'bg-slate-300' : 'bg-amber-400'}`}></span>
                            </span>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                {status === 'installing' ? "Kuruluyor" : "Kapalı"}
                            </span>
                        </div>

                        <button
                            onClick={toggleEngine}
                            disabled={isActionLoading || status === 'loading'}
                            className={`px-4 py-1.5 rounded-lg font-bold text-[12px] flex items-center gap-2 transition-all bg-[#f06e57] text-white hover:bg-[#d95b45] shadow-md shadow-[#f06e57]/20 border border-[#f06e57] disabled:opacity-50`}
                        >
                            {isActionLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                            Ateşle
                        </button>
                    </div>
                </div>
            )}

            {/* Content Area - Full Bleed Integration */}
            <div className={`flex-1 overflow-hidden flex relative w-full h-full ${status === 'running' ? 'bg-white' : 'bg-slate-100 p-6'}`}>
                {status === 'running' ? (
                    <div className="absolute inset-0 w-full h-full overflow-hidden flex flex-col animate-in fade-in duration-700 bg-white z-0">

                        {/* FLOATING CONTROL BAR (Tam Ekran Modu İçin) */}
                        <div className="absolute bottom-6 right-8 z-[100] flex items-center gap-2 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-full shadow-2xl border border-slate-700/50 group transition-all hover:bg-slate-900/95">

                            <div className="px-3 flex items-center gap-2 border-r border-slate-700/50">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-[10px] font-bold text-white tracking-widest uppercase">Canlı</span>
                            </div>

                            <a href="http://localhost:5678" target="_blank" rel="noreferrer" className="w-8 h-8 flex items-center justify-center rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition-all" title="Harici Sekmede Aç">
                                <Link size={14} />
                            </a>

                            <button
                                onClick={toggleEngine}
                                disabled={isActionLoading}
                                className="h-8 px-4 rounded-full font-bold text-[11px] flex items-center gap-2 transition-all bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white"
                                title="Motoru Durdur"
                            >
                                {isActionLoading ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
                                Durdur
                            </button>
                        </div>

                        <iframe
                            src="http://localhost:5678"
                            className="absolute top-0 left-0 w-full h-full border-0 select-none"
                            style={{ width: '100%', height: '100%', display: 'block' }}
                            title="n8n Engine Portal"
                            allow="clipboard-read; clipboard-write"
                        />
                    </div>
                ) : status === 'installing' ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="max-w-md w-full text-center">
                            <div className="w-20 h-20 bg-white border border-rose-100 rounded-2xl flex items-center justify-center mx-auto shadow-sm mb-6 animate-pulse rotate-3">
                                <DownloadCloud size={32} className="text-[#f06e57]" />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">Motor Hazırlanıyor</h3>
                            <p className="text-sm text-slate-500 mb-8 leading-relaxed px-4">
                                n8n çekirdek dosyaları doğrulanıyor ve ServerBoot aşaması kontrol ediliyor. Lütfen bekleyiniz...
                            </p>
                            <div className="w-48 h-1 bg-slate-200 rounded-full mx-auto overflow-hidden">
                                <div className="h-full bg-[#f06e57] animate-pulse" style={{ width: '60%' }}></div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="max-w-2xl w-full text-center">
                            <div className="w-24 h-24 bg-white border border-slate-200 rounded-3xl flex items-center justify-center mx-auto shadow-sm mb-8 group hover:border-[#f06e57]/30 transition-all duration-500 rotate-12 hover:rotate-0">
                                <Activity size={40} className="text-slate-200 group-hover:text-[#f06e57]/40 transition-colors" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter">n8n Otomasyon Motoru</h3>
                            <p className="text-base text-slate-500 mb-12 leading-relaxed px-12">
                                Bu modül, yapay zeka ajanlarının dosya okuma, mail gönderme ve veritabanı güncelleme gibi "fiziksel" eylemleri gerçekleştirmesini sağlayan ana istasyonudur.
                            </p>

                            <div className="grid grid-cols-2 gap-8 text-left px-8">
                                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mb-6">
                                        <Zap size={24} className="text-[#f06e57]" />
                                    </div>
                                    <h4 className="font-black text-slate-800 text-sm mb-3 uppercase tracking-tight">Otomatik Webhook</h4>
                                    <p className="text-[13px] text-slate-500 leading-relaxed font-medium">
                                        Sistem tetiklendiğinde Python katmanı n8n'e anlık veri akışını JSON paketleriyle iletir.
                                    </p>
                                </div>
                                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                                        <Database size={24} className="text-blue-500" />
                                    </div>
                                    <h4 className="font-black text-slate-800 text-sm mb-3 uppercase tracking-tight">Çift Yönlü SQL</h4>
                                    <p className="text-[13px] text-slate-500 leading-relaxed font-medium">
                                        n8n üzerinden Bilgi İlişkileri tablosuna veya Vektör DB'ye doğrudan müdahale edilebilir.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default N8nViewer;
