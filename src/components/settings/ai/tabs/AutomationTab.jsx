import React, { useState, useEffect } from 'react';
import { Webhook, Activity, Clock, Server, CheckCircle2, XCircle, Search, Filter, ExternalLink, Play, SlidersHorizontal, ArrowUpDown, KeyRound, AlertCircle, Save } from 'lucide-react';

export const AutomationTab = () => {
    const [workflows, setWorkflows] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [needsAuth, setNeedsAuth] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [authError, setAuthError] = useState('');
    const [isActionLoading, setIsActionLoading] = useState(false);

    // n8n API'den iş akışlarını çek
    const fetchWorkflows = async (showLoader = true) => {
        if (showLoader) setIsLoading(true);
        setAuthError('');
        try {
            const savedKey = localStorage.getItem('n8n_api_key') || '';
            const headers = savedKey ? { 'x-n8n-api-key': savedKey } : {};

            const res = await fetch('/api/n8n/workflows', { headers });
            const data = await res.json();

            if (data.need_auth) {
                setNeedsAuth(true);
                setIsLoading(false);
                return;
            }

            if (data.success && data.workflows) {
                setWorkflows(data.workflows);
                setNeedsAuth(false);
            } else {
                console.error("n8n Workflow hatası:", data.error);
                if (data.error && (data.error.includes("401") || data.error.includes("403"))) {
                    setNeedsAuth(true);
                    setAuthError('API Anahtarı geçersiz veya yetkisiz.');
                }
                setWorkflows([]);
            }
        } catch (error) {
            console.error("n8n workflow fetch error:", error);
            setWorkflows([]);
        } finally {
            if (showLoader) setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkflows(true);

        const interval = setInterval(() => {
            // Sadece key girilmişse weya auth hatası yoksa can olarak çek (Live polling)
            fetchWorkflows(false);
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const saveApiKeyAndRetry = () => {
        if (!apiKeyInput.trim()) return;
        localStorage.setItem('n8n_api_key', apiKeyInput.trim());
        fetchWorkflows(true);
    };

    const toggleWorkflowStatus = async (id, currentStatus) => {
        if (isActionLoading) return;
        setIsActionLoading(true);
        const newStatus = !currentStatus;

        // Optimistic UI update
        setWorkflows(prev => prev.map(w => w.id === id ? { ...w, active: newStatus, status: newStatus ? 'healthy' : 'stopped' } : w));

        try {
            const savedKey = localStorage.getItem('n8n_api_key') || '';
            const headers = {
                'Content-Type': 'application/json',
                ...(savedKey ? { 'x-n8n-api-key': savedKey } : {})
            };

            await fetch(`/api/n8n/workflows/${id}/toggle`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ active: newStatus })
            });
            // Bir sonraki Canılı veri çekiminde gerçek durumu netleşecek
        } catch (error) {
            console.error("Toggle error:", error);
            // Geri al
            setWorkflows(prev => prev.map(w => w.id === id ? { ...w, active: currentStatus, status: currentStatus ? 'healthy' : 'stopped' } : w));
        } finally {
            setIsActionLoading(false);
        }
    };

    const openInN8n = (id) => {
        // Hedef n8n adresini local'e at
        localStorage.setItem('n8n_target_url', `http://localhost:5678/workflow/${id}`);
        // Ana App.jsx'e sekme açmasını söyleyen global event
        window.dispatchEvent(new CustomEvent('open-n8n-workspace'));
    };

    const createNewN8n = () => {
        localStorage.setItem('n8n_target_url', 'http://localhost:5678/workflow/new');
        window.dispatchEvent(new CustomEvent('open-n8n-workspace'));
    };

    const filteredWorkflows = workflows.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()));

    // Dinamik Üst İstatistiklerin Hesaplanması
    const activeCount = workflows.filter(w => w.active).length;
    const totalCount = workflows.length;
    const totalExecutions = workflows.reduce((sum, w) => sum + (w.executionsCount || 0), 0);
    const avgSuccess = totalCount > 0
        ? (workflows.reduce((sum, w) => sum + (w.successRate || 0), 0) / totalCount).toFixed(1)
        : "0.0";
    const failingCount = workflows.filter(w => w.status !== 'healthy' || w.successRate < 100).length;

    if (needsAuth) {
        return (
            <div className="flex flex-col items-center justify-center w-full h-full bg-[#f4f4f5] p-6 animate-in fade-in duration-300">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 border border-slate-200">
                    <div className="w-16 h-16 bg-[#f06e57]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <KeyRound size={32} className="text-[#f06e57]" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 text-center mb-2 tracking-tight">API Yetkilendirmesi</h3>
                    <p className="text-sm text-slate-500 text-center mb-8 leading-relaxed">
                        n8n sunucusuna bağlanabilmek için geçerli bir API anahtarına ihtiyacımız var.
                        <strong> n8n arayüzünden (Settings &gt; n8n API) </strong> oluşturduğunuz anahtarı aşağıya yapıştırın.
                    </p>

                    {authError && (
                        <div className="mb-6 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2">
                            <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                            <p className="text-xs font-semibold text-rose-600">{authError}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">n8n API Key</label>
                            <input
                                type="password"
                                value={apiKeyInput}
                                onChange={(e) => setApiKeyInput(e.target.value)}
                                placeholder="ny8_***************************"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-700 focus:outline-none focus:border-[#f06e57] focus:ring-1 focus:ring-[#f06e57]"
                                onKeyDown={(e) => e.key === 'Enter' && saveApiKeyAndRetry()}
                            />
                        </div>
                        <button
                            onClick={saveApiKeyAndRetry}
                            className="w-full flex justify-center items-center gap-2 bg-[#f06e57] hover:bg-[#d95b45] text-white rounded-xl px-4 py-3 text-sm font-bold shadow-md transition-all"
                        >
                            <Save size={16} /> Sistemi Bağla
                        </button>
                        <p className="text-[10px] text-center text-slate-400 mt-4">
                            Anahtarınız siber güvenlik gereği backend'e iletilir ve tarayıcınızda lokal olarak saklanır.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full h-full bg-[#f4f4f5]">

            {/* ── Üst Araç Çubuğu ── */}
            <div className="shrink-0 px-8 py-5 flex items-center justify-between bg-white border-b border-slate-200">
                <div>
                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 tracking-tight">
                        <Activity className="text-[#f06e57]" size={20} />
                        n8n Şema Kütüphanesi
                    </h2>
                    <p className="text-[11px] font-medium text-slate-500 mt-1 uppercase tracking-widest">Merkezi İş Akışı Ve API Yönetimi</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Otomasyon ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-700 w-64 focus:outline-none focus:border-[#f06e57] focus:ring-1 focus:ring-[#f06e57]"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors">
                        <Filter size={14} /> Filtrele
                    </button>
                    <button
                        onClick={createNewN8n}
                        className="flex items-center gap-2 px-4 py-1.5 bg-[#f06e57] text-white rounded-lg text-xs font-bold hover:bg-[#d95b45] shadow-sm transition-colors"
                    >
                        <Webhook size={14} /> Yeni Otomasyon
                    </button>
                </div>
            </div>

            {/* ── İstatistik Şeridi ── */}
            <div className="grid grid-cols-4 gap-px bg-slate-200 border-b border-slate-200 shrink-0">
                <div className="bg-white p-4 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Aktif Senaryo</p>
                        <p className="text-xl font-black text-slate-800 mt-0.5">{activeCount} <span className="text-[11px] font-medium text-slate-400">/ {totalCount}</span></p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                        <Activity size={18} className="text-emerald-500" />
                    </div>
                </div>
                <div className="bg-white p-4 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Toplam Yürütme</p>
                        <p className="text-xl font-black text-slate-800 mt-0.5">{totalExecutions > 1000 ? (totalExecutions / 1000).toFixed(1) + 'K' : totalExecutions} <span className="text-[11px] font-medium text-slate-400">tahmini</span></p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                        <Server size={18} className="text-blue-500" />
                    </div>
                </div>
                <div className="bg-white p-4 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ortalama Başarı</p>
                        <p className="text-xl font-black text-emerald-600 mt-0.5">% {avgSuccess}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                        <CheckCircle2 size={18} className="text-emerald-500" />
                    </div>
                </div>
                <div className="bg-white p-4 flex items-center justify-between relative overflow-hidden group">
                    <div className="absolute inset-0 bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Uyarı / Hata</p>
                        <p className={`text-xl font-black mt-0.5 ${failingCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{failingCount} <span className="text-[11px] font-medium text-slate-400">düğüm uyarısı</span></p>
                    </div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center relative z-10 ${failingCount > 0 ? 'bg-rose-100' : 'bg-slate-100'}`}>
                        <XCircle size={18} className={failingCount > 0 ? 'text-rose-600' : 'text-slate-400'} />
                    </div>
                </div>
            </div>

            {/* ── Tablo Alanı ── */}
            <div className="flex-1 min-h-0 overflow-y-auto p-8">
                {isLoading ? (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-4 animate-pulse">
                            <Webhook size={24} className="text-slate-300" />
                        </div>
                        <p className="text-xs font-semibold text-slate-400">n8n Şemaları Yükleniyor...</p>
                    </div>
                ) : filteredWorkflows.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-white border border-slate-200 rounded-xl shadow-sm">
                        <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
                            <Search size={28} className="text-slate-300" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-700 mb-1">Şema Bulunamadı</h3>
                        <p className="text-xs text-slate-500 max-w-sm text-center">Arama kriterlerinize uygun n8n iş akışı veritabanında bulunmuyor.</p>
                    </div>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-5 py-3 text-[10px] font-black tracking-wider text-slate-500 uppercase">Durum</th>
                                    <th className="px-5 py-3 text-[10px] font-black tracking-wider text-slate-500 uppercase">Şema Adı / ID</th>
                                    <th className="px-5 py-3 text-[10px] font-black tracking-wider text-slate-500 uppercase">Tetikleyici</th>
                                    <th className="px-5 py-3 text-[10px] font-black tracking-wider text-slate-500 uppercase">Son Çalışma</th>
                                    <th className="px-5 py-3 text-[10px] font-black tracking-wider text-slate-500 uppercase text-right">Başarı</th>
                                    <th className="px-5 py-3 text-[10px] font-black tracking-wider text-slate-500 uppercase text-center">Aksiyon</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredWorkflows.map((wk) => (
                                    <tr key={wk.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-5 py-4 w-16" onClick={() => toggleWorkflowStatus(wk.id, wk.active)}>
                                            <div className="w-9 h-5 rounded-full relative bg-slate-200 cursor-pointer">
                                                <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300 shadow-sm ${wk.active ? 'bg-[#f06e57] right-0.5' : 'bg-slate-400 left-0.5'}`}></div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${wk.status === 'healthy' ? 'bg-slate-50 border-slate-200' : 'bg-rose-50 border-rose-200'}`}>
                                                    <Webhook size={14} className={wk.status === 'healthy' ? 'text-slate-500' : 'text-rose-500'} />
                                                </div>
                                                <div>
                                                    <p className="text-[13px] font-bold text-slate-800">{wk.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] font-medium text-slate-400 font-mono">{wk.id}</span>
                                                        <div className="flex gap-1">
                                                            {wk.tags.map(tag => (
                                                                <span key={tag} className="px-1.5 py-px rounded bg-slate-100 text-[9px] font-black uppercase tracking-wider text-slate-500">{tag}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 border border-slate-200/60 text-[11px] font-semibold text-slate-600">
                                                <Clock size={11} className="text-slate-400" />
                                                {wk.trigger}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="text-[12px] font-semibold text-slate-700">{wk.lastRun}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{wk.executionsCount} toplam yürütme</p>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className={`text-[13px] font-bold ${wk.successRate === 100 ? 'text-emerald-500' : wk.successRate > 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                                                    %{wk.successRate}
                                                </span>
                                                <div className="w-16 h-1 mt-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${wk.successRate === 100 ? 'bg-emerald-500' : wk.successRate > 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${wk.successRate}%` }}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                {wk.trigger !== 'Webhook' && (
                                                    <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all opacity-50 cursor-not-allowed" title="Sadece Webhooklar manuel tetiklenebilir">
                                                        <Play size={14} fill="currentColor" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => openInN8n(wk.id)}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#f06e57] hover:bg-[#f06e57]/10 border border-transparent hover:border-[#f06e57]/20 transition-all cursor-pointer"
                                                    title="n8n'de Düzenle"
                                                >
                                                    <ExternalLink size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
};
