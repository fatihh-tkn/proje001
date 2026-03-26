import React, { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw, LayoutDashboard, List, Monitor, Key, Users, Shield } from 'lucide-react';
import { API_BASE, fetchWithTimeout } from './utils';
import { TabButton } from './components/TabButton';
import { DashboardTab } from './tabs/DashboardTab';
import { LogsTab } from './tabs/LogsTab';
import { ComputersTab } from './tabs/ComputersTab';
import { UsersTab, RolesTab } from './tabs/AuthTabs';
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
        <div className="flex flex-col h-full w-full bg-[#f8f9fa] font-sans">
            {/* ── HEADER ── */}
            <div className="flex-none px-6 py-4 flex items-center justify-between border-b border-slate-200/60 bg-white">
                <div>
                    <h2 className="text-[14px] font-semibold text-slate-800 flex items-center gap-2">
                        <Activity className="text-[#b91d2c]" size={18} />
                        Yapay Zeka Sunucusu
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-1">Sunucu durumunu, aktif modelleri ve log kayıtlarını inceleyin.</p>
                </div>
            </div>

            {/* ── YATAY SEKMELER ── */}
            <div className="flex-none px-6 flex items-center gap-4 border-b border-slate-200/60 bg-white pt-2 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex items-center gap-2 px-1 pb-3 text-[12px] font-medium transition-all relative whitespace-nowrap
                        ${activeTab === 'dashboard' ? 'text-[#b91d2c]' : 'text-slate-500 hover:text-slate-800'}
                    `}
                >
                    <LayoutDashboard size={14} /> Genel Özet
                    {activeTab === 'dashboard' && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#b91d2c] rounded-t-md" />}
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`flex items-center gap-2 px-1 pb-3 text-[12px] font-medium transition-all relative whitespace-nowrap
                        ${activeTab === 'logs' ? 'text-[#b91d2c]' : 'text-slate-500 hover:text-slate-800'}
                    `}
                >
                    <List size={14} /> Detaylı Loglar
                    {activeTab === 'logs' && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#b91d2c] rounded-t-md" />}
                </button>
                <button
                    onClick={() => setActiveTab('sessions')}
                    className={`flex items-center gap-2 px-1 pb-3 text-[12px] font-medium transition-all relative whitespace-nowrap
                        ${activeTab === 'sessions' ? 'text-[#b91d2c]' : 'text-slate-500 hover:text-slate-800'}
                    `}
                >
                    <Monitor size={14} /> Aktif Bilgisayarlar
                    {activeTab === 'sessions' && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#b91d2c] rounded-t-md" />}
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`flex items-center gap-2 px-1 pb-3 text-[12px] font-medium transition-all relative whitespace-nowrap
                        ${activeTab === 'users' ? 'text-[#b91d2c]' : 'text-slate-500 hover:text-slate-800'}
                    `}
                >
                    <Users size={14} /> Kullanıcılar
                    {activeTab === 'users' && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#b91d2c] rounded-t-md" />}
                </button>
                <button
                    onClick={() => setActiveTab('roles')}
                    className={`flex items-center gap-2 px-1 pb-3 text-[12px] font-medium transition-all relative whitespace-nowrap
                        ${activeTab === 'roles' ? 'text-[#b91d2c]' : 'text-slate-500 hover:text-slate-800'}
                    `}
                >
                    <Shield size={14} /> Rol ve Yetki
                    {activeTab === 'roles' && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#b91d2c] rounded-t-md" />}
                </button>
            </div>

            {/* ── İÇERİK ALANI ── */}
            <div className="flex-1 overflow-auto bg-[#f8f9fa] flex flex-col">
                {activeTab === 'dashboard' && <DashboardTab data={data} />}
                {activeTab === 'logs' && <LogsTab />}
                {activeTab === 'sessions' && <ComputersTab />}
                {activeTab === 'users' && <UsersTab />}
                {activeTab === 'roles' && <RolesTab />}
            </div>
        </div>
    );
}
