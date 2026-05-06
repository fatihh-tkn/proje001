import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Activity, Filter, Box, CheckCircle2, AlertCircle, Clock, Trash2, X, User } from 'lucide-react';
import { API_BASE, fetchWithTimeout, formatRelativeTime, truncatedText, getModelColor, fmtCost } from '../utils';
import { LogDetailPanel } from '../components/LogDetailPanel';

export const LogsTab = ({ compact = false, filterUser = null, onClearUserFilter }) => {
    const [logs, setLogs] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);
    const [filters, setFilters] = useState({
        search: '',
        model: '',
        status: ''
    });

    const [clearing, setClearing] = useState(false);

    // Stream bağlantısı
    const streamRef = useRef(null);
    const bufferRef = useRef("");

    const connectStream = useCallback(() => {
        const query = new URLSearchParams();
        if (filters.search) query.append('search', filters.search);
        if (filters.model) query.append('model', filters.model);
        if (filters.status) query.append('status', filters.status);
        if (filterUser?.id) query.append('user_id', filterUser.id);

        const url = `${API_BASE}/logs/stream?${query.toString()}`;

        // Abort previous
        if (streamRef.current) {
            streamRef.current.abort();
        }

        const controller = new AbortController();
        streamRef.current = controller;
        setIsConnected(false);

        fetch(url, { signal: controller.signal })
            .then(async (res) => {
                setIsConnected(true);
                const reader = res.body.getReader();
                const decoder = new TextDecoder('utf-8');
                
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        
                        bufferRef.current += decoder.decode(value, { stream: true });
                        const lines = bufferRef.current.split('\n');
                        bufferRef.current = lines.pop() || "";
                        
                        for (const line of lines) {
                            if (!line.trim().startsWith('data:')) continue;
                            const raw = line.replace(/^data:\s*/, '');
                            if (!raw) continue;
                            
                            try {
                                const evt = JSON.parse(raw);
                                if (evt.type === 'snapshot') {
                                    setLogs(evt.logs || []);
                                } else if (evt.type === 'new' && evt.logs) {
                                    setLogs(prev => {
                                        // Yeni gelenler başa eklenecek, sondan düşülecek (max 1000 filan tutalım)
                                        const combined = [...evt.logs, ...prev];
                                        return combined.slice(0, 1000);
                                    });
                                }
                            } catch (e) {
                                // ignore parse error
                            }
                        }
                    }
                } catch (e) {
                    if (e.name !== 'AbortError') {
                        console.error('Log stream okuma hatası:', e);
                        setIsConnected(false);
                    }
                }
            })
            .catch(e => {
                if (e.name !== 'AbortError') {
                    console.error('Log stream bağlantı hatası:', e);
                    setIsConnected(false);
                }
            });

    }, [filters, filterUser]);

    useEffect(() => {
        // Debounce search filter
        const timer = setTimeout(() => {
            connectStream();
        }, 500);
        return () => {
            clearTimeout(timer);
            if (streamRef.current) streamRef.current.abort();
        };
    }, [connectStream]);

    const handleClearLogs = async () => {
        if (!window.confirm("Tüm log kayıtlarını temizlemek istediğinize emin misiniz? Bu işlem geri alınamaz.")) return;
        setClearing(true);
        try {
            await fetchWithTimeout(`${API_BASE}/logs`, { method: 'DELETE' });
            setLogs([]);
        } catch (e) {
            console.error("Loglar silinemedi:", e);
        } finally {
            setClearing(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8f9fa] p-4 relative font-sans animate-in fade-in duration-300 w-full">
            {/* Header — compact modda sadece canlı badge + temizle butonu */}
            <div className={`flex flex-wrap items-center justify-between gap-3 ${compact ? 'mb-3' : 'mb-6'}`}>
                {!compact && (
                    <div>
                        <h3 className="text-[14px] font-bold text-slate-800 flex items-center gap-2">
                            <Activity size={18} className="text-[#b91d2c]" />
                            Canlı İstek Logları
                        </h3>
                        <p className="text-[12px] text-slate-500 mt-1">
                            Uygulama genelindeki tüm AI isteklerini canlı olarak izleyin.
                        </p>
                    </div>
                )}
                <div className="flex items-center gap-2 ml-auto">
                    {isConnected ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Canlı
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-[10px] text-amber-600 font-bold px-2 py-0.5 bg-amber-50 rounded-full border border-amber-100">
                            <Activity size={10} className="animate-spin" /> Bağlanıyor...
                        </span>
                    )}
                    <button
                        onClick={handleClearLogs}
                        disabled={clearing}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 rounded-lg transition-colors text-[11px] font-semibold"
                    >
                        {clearing ? <Activity size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        Temizle
                    </button>
                </div>
            </div>

            {/* Kullanıcı filtresi bandı */}
            {filterUser && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-[#378ADD]/10 border border-[#378ADD]/30 rounded-lg">
                    <User size={12} className="text-[#378ADD] shrink-0" strokeWidth={2.5} />
                    <span className="text-[11px] font-bold text-[#378ADD] flex-1 truncate">
                        {filterUser.name || filterUser.email} — logları
                    </span>
                    {onClearUserFilter && (
                        <button
                            onClick={onClearUserFilter}
                            className="p-0.5 rounded text-[#378ADD] hover:text-[#1a4f8a] transition-colors shrink-0"
                            title="Filtreyi temizle"
                        >
                            <X size={12} strokeWidth={2.5} />
                        </button>
                    )}
                </div>
            )}

            {/* Filtreler */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                        type="text"
                        placeholder="İstek, yanıt, IP, MAC ara..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#b91d2c] focus:ring-1 focus:ring-[#b91d2c] transition-all"
                        value={filters.search}
                        onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                        autoComplete="off"
                    />
                </div>

                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <select
                        className="appearance-none pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-[12px] text-slate-700 focus:outline-none focus:border-[#b91d2c] focus:ring-1 focus:ring-[#b91d2c] transition-all font-semibold"
                        value={filters.model}
                        onChange={(e) => setFilters(f => ({ ...f, model: e.target.value }))}
                    >
                        <option value="">Tüm Modeller</option>
                        <option value="gpt-4">gpt-4</option>
                        <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                        <option value="claude-3-opus">claude-3-opus</option>
                        <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                        <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                        <option value="gemma3:4b">gemma3:4b</option>
                    </select>
                </div>

                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <select
                        className="appearance-none pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-[12px] text-slate-700 focus:outline-none focus:border-[#b91d2c] focus:ring-1 focus:ring-[#b91d2c] transition-all font-semibold"
                        value={filters.status}
                        onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                    >
                        <option value="">Tüm Durumlar</option>
                        <option value="success">Başarılı</option>
                        <option value="error">Hatalı</option>
                    </select>
                </div>
            </div>

            {/* Tablo */}
            <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-16 text-center">Durum</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-32">Model</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">İstek (Prompt)</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right w-24">Süre</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right w-24">Token</th>
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right w-24">Zaman</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                                        <Activity className="mx-auto mb-3 opacity-50" size={32} />
                                        <p className="text-[13px] font-semibold">Gösterilecek log kaydı bulunamadı.</p>
                                        <p className="text-[11px] mt-1">Uygulamadan AI isteği yapıldıkça burada listelenecektir.</p>
                                    </td>
                                </tr>
                            ) : (
                                logs.map(log => {
                                    const isError = log.status !== 'success';
                                    return (
                                        <tr 
                                            key={log.id} 
                                            onClick={() => setSelectedLog(log)}
                                            className="hover:bg-slate-50 cursor-pointer transition-colors group"
                                        >
                                            <td className="px-4 py-3 text-center">
                                                {isError ? (
                                                    <AlertCircle size={16} className="text-red-500 mx-auto" />
                                                ) : (
                                                    <CheckCircle2 size={16} className="text-emerald-500 mx-auto" />
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div 
                                                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold border"
                                                    style={{ 
                                                        color: getModelColor(log.model), 
                                                        borderColor: `${getModelColor(log.model)}40`, 
                                                        backgroundColor: `${getModelColor(log.model)}10` 
                                                    }}
                                                >
                                                    <Box size={10} />
                                                    {log.model}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-[12px] text-slate-600 font-mono">
                                                {isError ? (
                                                    <span className="text-red-600 font-semibold">{log.error || 'Hata Oluştu'}</span>
                                                ) : (
                                                    truncatedText(log.request, 80) || <span className="text-slate-400 italic">Boş istek</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-[12px] font-mono text-slate-500 text-right">
                                                {log.duration || 0} ms
                                            </td>
                                            <td className="px-4 py-3 text-[12px] font-mono text-slate-500 text-right">
                                                <span className="text-slate-700 font-bold">{log.totalTokens || 0}</span>
                                            </td>
                                            <td className="px-4 py-3 text-[11px] text-slate-500 text-right flex items-center justify-end gap-1.5 whitespace-nowrap">
                                                <Clock size={12} className="opacity-60" />
                                                {formatRelativeTime(log.timestamp)}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detay Paneli */}
            {selectedLog && (
                <>
                    <div 
                        className="fixed inset-0 bg-slate-900/20 z-40 animate-in fade-in duration-200"
                        onClick={() => setSelectedLog(null)}
                    />
                    <LogDetailPanel log={selectedLog} onClose={() => setSelectedLog(null)} />
                </>
            )}

        </div>
    );
};