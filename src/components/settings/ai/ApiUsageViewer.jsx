import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Zap, Trash2, RefreshCw, LayoutDashboard, List, Monitor, Key } from 'lucide-react';
import { API_BASE, fetchWithTimeout, makeDemoLog } from './utils';
import { TabButton } from './components/TabButton';
import { DashboardTab } from './tabs/DashboardTab';
import { LogsTab } from './tabs/LogsTab';
import { ComputersTab } from './tabs/ComputersTab';
import { ModelsTab } from './tabs/ModelsTab';
/* ════════════════════════════════════════════════════════════════════
   Ana Bileşen (Tabs wrapper)
═══════════════════════════════════════════════════════════════════ */
export default function ApiUsageViewer() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [data, setData] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const [sendStatus, setSendStatus] = useState(null); // 'ok' | 'error' | null
    const [backendReady, setBackendReady] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetchWithTimeout(`${API_BASE}/dashboard`);
            const json = await res.json();
            setData(json);
            setBackendReady(true);
        } catch (err) {
            console.warn('Dashboard fetch fail', err);
            setBackendReady(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'dashboard') fetchData();
    }, [activeTab, fetchData]);

    const sendDemoLog = async () => {
        setIsSending(true);
        setSendStatus(null);
        try {
            const res = await fetch(`${API_BASE}/logs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(makeDemoLog()),
            });
            if (res.ok) {
                setSendStatus('ok');
                await fetchData(); // her durumda dashboard'u yenile
            } else {
                setSendStatus('error');
            }
        } catch (e) {
            setSendStatus('error');
            console.warn('Demo log send failed', e);
        } finally {
            setIsSending(false);
            setTimeout(() => setSendStatus(null), 2000);
        }
    };

    const clearLogs = async () => {
        await fetch(`${API_BASE}/logs`, { method: 'DELETE' });
        if (activeTab === 'dashboard') fetchData();
    };

    // Backend henüz başlatılmadıysa bilgi ekranı göster
    if (backendReady === false) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center gap-5 bg-[var(--window-bg)] text-[var(--sidebar-text-muted)] font-sans">
                <div className="p-5 bg-amber-50 border border-amber-200 rounded-sm">
                    <Activity size={36} className="text-amber-500 animate-pulse" />
                </div>
                <div className="text-center">
                    <p className="text-base font-bold text-[var(--workspace-text)]">Yapay Zeka Sunucusu Başlatılıyor...</p>
                    <p className="text-sm mt-1">Python backend (FastAPI) ortamının ayağa kalkması bekleniyor.</p>
                    <p className="text-xs mt-0.5 font-mono opacity-60">localhost:8000</p>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--sidebar-hover)] hover:bg-[var(--window-border)] rounded-sm text-sm font-semibold transition-all mt-2 text-[var(--workspace-text)] hover:shadow-sm"
                >
                    <RefreshCw size={14} /> Tekrar Dene
                </button>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col bg-[var(--window-bg)] font-sans text-[var(--workspace-text)]">

            {/* ═══ HEADER ═══════════════════════════════════════════════════ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--window-border)] px-6 py-5 shrink-0">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-[var(--workspace-text)] flex items-center gap-3">
                        <Activity className="text-[var(--accent)]" size={26} /> Yapay Zeka Paneli
                    </h1>
                    <p className="text-[var(--sidebar-text-muted)] text-xs mt-1 font-medium italic opacity-80">Gerçek zamanlı model tüketim ve maliyet istatistikleri</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={sendDemoLog}
                        disabled={isSending}
                        className={`flex items-center gap-2 px-4 py-2 text-white text-xs font-black rounded-sm transition-all shadow-lg disabled:opacity-50 active:scale-95 ${sendStatus === 'ok' ? 'bg-emerald-500 shadow-emerald-200' :
                                sendStatus === 'error' ? 'bg-red-500 shadow-red-200' :
                                    'bg-[var(--accent)] hover:bg-[var(--accent-hover)] shadow-[var(--accent-light)]'
                            }`}
                    >
                        {isSending
                            ? <RefreshCw size={14} className="animate-spin" />
                            : sendStatus === 'ok' ? <span>✓</span>
                                : sendStatus === 'error' ? <span>✗</span>
                                    : <Zap size={14} />
                        }
                        {isSending ? 'GÖNDERİLİYOR...' : sendStatus === 'ok' ? 'GÖNDERILDI!' : sendStatus === 'error' ? 'HATA!' : 'DEMO LOG ÜRET'}
                    </button>
                    <button onClick={clearLogs} className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white text-xs font-black rounded-sm transition-all shadow-sm active:scale-95">
                        <Trash2 size={14} /> TEMİZLE
                    </button>
                </div>
            </div>

            {/* ═══ BODY: Sol Sekme Nav + Sağ İçerik ══════════════════════ */}
            <div className="flex flex-1 overflow-hidden">

                {/* Sol dikey sekme listesi */}
                <div className="w-52 shrink-0 border-r border-[var(--window-border)] bg-[var(--sidebar-hover)] flex flex-col gap-1 p-3 overflow-y-auto">
                    <span className="text-[10px] uppercase font-bold text-[var(--sidebar-text-muted)] tracking-widest px-3 pt-1 pb-2 opacity-60">Görünüm</span>
                    <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={LayoutDashboard} label="Genel Özet" />
                    <TabButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={List} label="Detaylı Loglar" />
                    <TabButton active={activeTab === 'sessions'} onClick={() => setActiveTab('sessions')} icon={Monitor} label="Aktif Bilgisayarlar" />
                    <TabButton active={activeTab === 'models'} onClick={() => setActiveTab('models')} icon={Key} label="Yapay Zeka Modelleri" />
                </div>

                {/* Sağ içerik alanı */}
                <div className="flex-1 overflow-y-auto mac-horizontal-scrollbar">
                    <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {activeTab === 'dashboard' && <DashboardTab data={data} />}
                        {activeTab === 'logs' && <LogsTab />}
                        {activeTab === 'sessions' && <ComputersTab />}
                        {activeTab === 'models' && <ModelsTab />}
                        <div className="h-8" />
                    </div>
                </div>

            </div>
        </div>
    );
}
