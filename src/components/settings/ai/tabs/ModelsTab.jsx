import React, { useState, useEffect, useCallback } from 'react';
import { Zap, Activity } from 'lucide-react';
import { API_BASE, fetchWithTimeout } from '../utils';

export const ModelsTab = React.memo(() => {
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedModel, setSelectedModel] = useState(null);

    const fetchModels = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchWithTimeout(`${API_BASE}/catalog`);
            const data = await res.json();
            setModels(data.models || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchModels(); }, [fetchModels]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full text-[var(--sidebar-text-muted)] text-center py-12">Modeller yükleniyor...</div>
                ) : models.map(m => (
                    <div key={m.id} onClick={() => setSelectedModel(m)}
                        className="bg-[var(--window-bg)] border border-[var(--window-border)] rounded-sm p-5 shadow-sm hover:shadow-md hover:border-[var(--accent)] transition-all cursor-pointer group flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <div className={`p-2 rounded-sm bg-[var(--sidebar-hover)] text-[var(--accent)] group-hover:scale-110 transition-transform`}>
                                <Zap size={20} />
                            </div>
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full uppercase font-black border border-emerald-500/20">
                                {m.status}
                            </span>
                        </div>
                        <div>
                            <h3 className="font-bold text-[var(--workspace-text)] text-base">{m.name}</h3>
                            <p className="text-[10px] text-[var(--sidebar-text-muted)] font-mono uppercase tracking-wider">{m.provider}</p>
                        </div>
                        <p className="text-xs text-[var(--sidebar-text-muted)] line-clamp-2 min-h-[32px]">{m.description}</p>
                        <div className="flex justify-between items-center pt-2 border-t border-[var(--window-border)]">
                            <span className="text-[10px] font-mono font-bold text-[var(--accent)]">{m.cost_per_1k} <span className="text-gray-400">/ 1k tk</span></span>
                            <span className="text-[10px] font-mono text-[var(--sidebar-text-muted)]">{m.avg_latency}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Model Detay Modalı */}
            {selectedModel && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[var(--window-bg)] border border-[var(--window-border)] rounded-sm w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-[var(--window-border)] bg-[var(--sidebar-hover)] flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-[var(--accent)] rounded-sm text-white shadow-lg shadow-[var(--accent-light)]">
                                    <Zap size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-[var(--workspace-text)]">{selectedModel.name}</h2>
                                    <p className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest">{selectedModel.provider}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedModel(null)} className="p-2 hover:bg-white/50 rounded-full text-[var(--sidebar-text-muted)]">
                                <Activity size={20} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <h4 className="text-[10px] uppercase font-black text-[var(--sidebar-text-muted)] tracking-widest mb-2 opacity-60">Açıklama</h4>
                                <p className="text-sm leading-relaxed text-[var(--workspace-text)] font-medium">{selectedModel.description}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[var(--sidebar-hover)] p-3 rounded-sm border border-[var(--window-border)]">
                                    <span className="block text-[9px] uppercase font-black text-[var(--sidebar-text-muted)] mb-1">Maliyet</span>
                                    <span className="text-sm font-bold text-[var(--accent)] font-mono">{selectedModel.cost_per_1k}</span>
                                    <span className="text-[10px] text-[var(--sidebar-text-muted)]"> / 1k token</span>
                                </div>
                                <div className="bg-[var(--sidebar-hover)] p-3 rounded-sm border border-[var(--window-border)]">
                                    <span className="block text-[9px] uppercase font-black text-[var(--sidebar-text-muted)] mb-1">Max Token</span>
                                    <span className="text-sm font-bold text-[var(--workspace-text)] font-mono">{selectedModel.max_tokens}</span>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[10px] uppercase font-black text-[var(--sidebar-text-muted)] tracking-widest mb-3 opacity-60">Öne Çıkan Özellikler</h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedModel.features.map((f, i) => (
                                        <span key={i} className="px-3 py-1.5 bg-white border border-[var(--window-border)] rounded-sm text-xs font-bold text-[var(--workspace-text)] shadow-sm">
                                            {f}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-[var(--sidebar-hover)] text-right border-t border-[var(--window-border)]">
                            <button onClick={() => setSelectedModel(null)} className="px-6 py-2.5 bg-[var(--workspace-text)] text-[var(--window-bg)] text-xs font-black rounded-sm hover:opacity-90 transition-all shadow-md">
                                KAPAT
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

