import React, { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw, Terminal, X } from 'lucide-react';
// Activity, RefreshCw used in backendReady=false screen only
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE, fetchWithTimeout } from './utils';
import { UsersOverviewTab } from './tabs/UsersOverviewTab';
import { LogsTab } from './tabs/LogsTab';

export default function ApiUsageViewer() {
    const [logsOpen, setLogsOpen] = useState(false);
    const [logFilterUser, setLogFilterUser] = useState(null); // { id, name, email }
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
        <div className="flex flex-col h-full w-full bg-[#f8f9fa] font-sans">
            {/* ── İÇERİK: Kullanıcılar + opsiyonel Loglar paneli ── */}
            <div className="flex-1 overflow-hidden flex">

                {/* Kullanıcı listesi */}
                <div className="flex-1 overflow-hidden min-w-0">
                    <UsersOverviewTab
                        logsOpen={logsOpen}
                        onToggleLogs={() => setLogsOpen(v => !v)}
                        logFilterUser={logFilterUser}
                        onSelectLogUser={(user) => {
                            setLogFilterUser(user);
                            setLogsOpen(true);
                        }}
                    />
                </div>

                {/* Loglar paneli */}
                <AnimatePresence initial={false}>
                    {logsOpen && (
                        <motion.div
                            key="logs-panel"
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 700, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="shrink-0 flex flex-col border-l border-slate-200 bg-white shadow-[-4px_0_20px_-8px_rgba(0,0,0,0.08)] overflow-hidden"
                        >
                            <div className="w-[700px] flex flex-col h-full overflow-hidden">
                                {/* Panel başlık */}
                                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <Terminal size={14} className="text-[#378ADD]" strokeWidth={2.5} />
                                        <span className="text-[12px] font-black uppercase tracking-widest text-slate-700">Sistem Logları</span>
                                    </div>
                                    <button
                                        onClick={() => setLogsOpen(false)}
                                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                {/* LogsTab içeriği */}
                                <div className="flex-1 overflow-hidden">
                                    <LogsTab
                                        compact
                                        filterUser={logFilterUser}
                                        onClearUserFilter={() => setLogFilterUser(null)}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
