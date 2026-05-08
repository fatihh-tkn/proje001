import React, { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw, Terminal, X, LayoutDashboard, Users, ScrollText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE, fetchWithTimeout } from './utils';
import { UsersOverviewTab } from './tabs/UsersOverviewTab';
import { LogsTab } from './tabs/LogsTab';
import { MonitoringTab } from './tabs/MonitoringTab';

const TABS = [
    { id: 'monitoring', label: 'Genel Yönetim', icon: LayoutDashboard },
    { id: 'users',      label: 'Kullanıcılar',  icon: Users },
    { id: 'logs',       label: 'Loglar',         icon: ScrollText },
];

export default function ApiUsageViewer() {
    const [activeTab, setActiveTab] = useState('monitoring');
    const [logFilterUser, setLogFilterUser] = useState(null);
    const [backendReady, setBackendReady] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetchWithTimeout(`${API_BASE}/dashboard`);
            await res.json();
            setBackendReady(true);
        } catch {
            setBackendReady(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

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
        <div className="flex flex-col h-full w-full bg-[#f4f5f7] font-sans overflow-hidden">
            {/* ── Tab Bar ─────────────────────────────────────────── */}
            <div className="flex items-center gap-1 px-4 h-10 bg-white border-b border-slate-200 shrink-0">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-3 h-8 text-[11px] font-bold uppercase tracking-widest transition-all rounded-md ${
                                active
                                    ? 'bg-[#b91d2c]/10 text-[#b91d2c]'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                            <Icon size={13} strokeWidth={2.5} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* ── Tab Content ─────────────────────────────────────── */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'monitoring' && <MonitoringTab />}

                {activeTab === 'users' && (
                    <div className="flex h-full overflow-hidden">
                        <div className="flex-1 overflow-hidden min-w-0">
                            <UsersOverviewTab
                                logsOpen={false}
                                onToggleLogs={() => setActiveTab('logs')}
                                logFilterUser={logFilterUser}
                                onSelectLogUser={(user) => {
                                    setLogFilterUser(user);
                                    setActiveTab('logs');
                                }}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div className="flex flex-col h-full overflow-hidden bg-white">
                        {logFilterUser && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-[#378ADD]/5 border-b border-[#378ADD]/20 shrink-0">
                                <span className="text-[11px] text-[#378ADD] font-bold">Filtre:</span>
                                <span className="text-[11px] text-slate-600">{logFilterUser.name || logFilterUser.email}</span>
                                <button
                                    onClick={() => setLogFilterUser(null)}
                                    className="ml-auto p-1 text-slate-400 hover:text-slate-600"
                                >
                                    <X size={13} />
                                </button>
                            </div>
                        )}
                        <div className="flex-1 overflow-hidden">
                            <LogsTab
                                filterUser={logFilterUser}
                                onClearUserFilter={() => setLogFilterUser(null)}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
