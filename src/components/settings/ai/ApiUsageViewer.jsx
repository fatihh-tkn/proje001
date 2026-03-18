import React, { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw, LayoutDashboard, List, Monitor, Key } from 'lucide-react';
import { API_BASE, fetchWithTimeout } from './utils';
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

    // Backend henüz başlatılmadıysa bilgi ekranı göster
    if (backendReady === false) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center gap-5 bg-[var(--window-bg)] text-[var(--sidebar-text-muted)] font-sans">
                <div className="p-5 bg-amber-50 border border-amber-200 rounded-sm">
                    <Activity size={36} className="text-amber-500 animate-pulse" />
                </div>
                <div className="text-center">
                    <p className="text-base font-medium text-[var(--workspace-text)]">Yapay Zeka Sunucusu Başlatılıyor...</p>
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
        <div className="w-full h-full flex flex-col bg-[#f5f5f7] font-sans text-[var(--workspace-text)]">

            {/* ═══ BODY: Sol Sekme Nav + Sağ İçerik ══════════════════════ */}
            <div className="flex flex-1 overflow-hidden">

                {/* Sol dikey sekme listesi */}
                <div className="w-52 shrink-0 border-r border-black/[0.05] bg-white/70 backdrop-blur-sm flex flex-col gap-1 p-3 overflow-y-auto">
                    <span className="text-[10px] uppercase font-medium text-[var(--sidebar-text-muted)] tracking-widest px-3 pt-1 pb-2 opacity-60">Görünüm</span>
                    <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={LayoutDashboard} label="Genel Özet" />
                    <TabButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={List} label="Detaylı Loglar" />
                    <TabButton active={activeTab === 'sessions'} onClick={() => setActiveTab('sessions')} icon={Monitor} label="Aktif Bilgisayarlar" />
                    <TabButton active={activeTab === 'models'} onClick={() => setActiveTab('models')} icon={Key} label="Yapay Zeka Modelleri" />
                </div>

                {/* Sağ içerik alanı */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {activeTab === 'sessions' && <ComputersTab />}
                    {activeTab === 'dashboard' && <DashboardTab data={data} />}
                    {activeTab === 'logs' && <LogsTab />}
                    {activeTab === 'models' && <ModelsTab />}
                </div>

            </div>
        </div>
    );
}
