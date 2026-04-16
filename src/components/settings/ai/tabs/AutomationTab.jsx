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

    const fetchWorkflows = async (showLoader = true) => {
        if (showLoader) setIsLoading(true);
        if (showLoader) setAuthError('');
        try {
            const savedKey = localStorage.getItem('n8n_api_key') || '';
            const headers = savedKey ? { 'x-n8n-api-key': savedKey } : {};

            const res = await fetch('/api/n8n/workflows', { headers });
            const data = await res.json();

            if (data.need_auth) {
                setNeedsAuth(true);
                if (showLoader) setIsLoading(false);
                return;
            }

            if (data.success && data.workflows) {
                setWorkflows(data.workflows);
                setNeedsAuth(false);
            } else {
                console.error("n8n Workflow hatası:", data.error);
                if (data.error && (String(data.error).includes("401") || String(data.error).includes("403") || String(data.error).includes("Unauthorized"))) {
                    setNeedsAuth(true);
                    setAuthError('API Anahtarı geçersiz veya yetkisiz.');
                    setWorkflows([]); // Sadece yetki hatası varsa listeyi sıfırla
                }
                // Geçici bağlantı hatalarında mevcut listeyi silme
            }
        } catch (error) {
            console.error("n8n workflow fetch error:", error);
            // Component ilk yüklenirken (showLoader=true) hata alırsa listeyi sıfırla ki Sonsuz Yüklenme kalmasın,
            // Ama arkada 5 saniyede bir poll ederken hata alırsa mevcut listeyi bozma.
            if (showLoader) {
                setWorkflows([]);
            }
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
            <div className="flex flex-col items-center justify-center w-full h-full bg-white p-6 animate-in fade-in duration-300">
                <div className="max-w-md w-full bg-white rounded-sm ring-1 ring-black/[0.06] shadow-sm p-8">
                    <div className="w-12 h-12 bg-gray-50 rounded-sm flex items-center justify-center mx-auto mb-6 ring-1 ring-black/[0.04]">
                        <KeyRound size={24} className="text-[var(--accent)]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--workspace-text)] text-center mb-2">API Yetkilendirmesi</h3>
                    <p className="text-xs text-[var(--sidebar-text-muted)] text-center mb-6">
                        n8n sunucusuna bağlanabilmek için geçerli bir API anahtarına ihtiyacımız var.
                        <strong> n8n arayüzünden (Settings &gt; n8n API) </strong> oluşturduğunuz anahtarı aşağıya yapıştırın.
                    </p>

                    {authError && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-sm flex items-start gap-2">
                            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                            <p className="text-xs font-medium text-red-600">{authError}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-semibold text-[var(--sidebar-text-muted)] uppercase tracking-wider mb-1.5">n8n API Key</label>
                            <input
                                type="password"
                                value={apiKeyInput}
                                onChange={(e) => setApiKeyInput(e.target.value)}
                                placeholder="ny8_***************************"
                                className="w-full bg-gray-50 border border-black/[0.08] rounded-sm px-3 py-2 text-xs font-mono text-[var(--workspace-text)] focus:outline-none focus:bg-white focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                                onKeyDown={(e) => e.key === 'Enter' && saveApiKeyAndRetry()}
                            />
                        </div>
                        <button
                            onClick={saveApiKeyAndRetry}
                            className="w-full flex justify-center items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-sm px-4 py-2.5 text-xs font-bold shadow-sm transition-all"
                        >
                            <Save size={14} /> Sistemi Bağla
                        </button>
                        <p className="text-[10px] text-center text-gray-400 mt-2">
                            Anahtarınız siber güvenlik gereği backend'e iletilir ve tarayıcınızda lokal olarak saklanır.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full h-full bg-white animate-in fade-in duration-300">

            {/* ── Üst Araç Çubuğu (Unboxed) ── */}
            <div className="shrink-0 px-8 pt-8 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-[var(--workspace-text)] flex items-center gap-2">
                        <Activity size={20} className="text-[var(--accent)]" />
                        Otomasyon & İş Akışları
                    </h3>
                    <p className="text-sm text-[var(--sidebar-text-muted)] mt-1 ml-1 max-w-lg">
                        Sistem içi eylemleri ve dış servis etkileşimlerini (n8n) doğrudan buradan yönetin.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="relative group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--accent)] transition-colors" />
                        <input
                            type="text"
                            placeholder="İş akışı ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-black/[0.03] hover:bg-black/[0.05] rounded-full pl-9 pr-4 py-2 text-sm text-[var(--workspace-text)] w-60 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[var(--accent)] transition-all placeholder:text-gray-400"
                        />
                    </div>
                    <button className="flex items-center gap-1.5 px-4 py-2 text-[var(--sidebar-text-muted)] hover:text-[var(--workspace-text)] hover:bg-black/[0.04] rounded-full text-sm font-semibold transition-all">
                        <Filter size={14} /> Filtre
                    </button>
                    <button
                        onClick={createNewN8n}
                        className="flex items-center gap-1.5 px-5 py-2 bg-[var(--workspace-text)] text-white rounded-full text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                    >
                        <Webhook size={14} /> Yeni Ekle
                    </button>
                </div>
            </div>

            {/* ── İstatistik Şeridi (Unboxed) ── */}
            <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-6 px-8 pb-8 pt-2">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <Activity size={16} className="text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-[var(--sidebar-text-muted)] mb-0.5">Aktif Senaryo</p>
                        <p className="text-2xl font-bold text-[var(--workspace-text)] leading-none">{activeCount} <span className="text-sm font-medium text-gray-400">/ {totalCount}</span></p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Server size={16} className="text-blue-600" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-[var(--sidebar-text-muted)] mb-0.5">Toplam İstek</p>
                        <p className="text-2xl font-bold text-[var(--workspace-text)] leading-none">{totalExecutions > 1000 ? (totalExecutions / 1000).toFixed(1) + 'K' : totalExecutions}</p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={16} className="text-[var(--accent)]" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-[var(--sidebar-text-muted)] mb-0.5">Başarı Oranı</p>
                        <p className="text-2xl font-bold text-[var(--workspace-text)] leading-none">% {avgSuccess}</p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${failingCount > 0 ? 'bg-rose-500/10' : 'bg-black/[0.04]'}`}>
                        <XCircle size={16} className={failingCount > 0 ? 'text-rose-600' : 'text-gray-400'} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-[var(--sidebar-text-muted)] mb-0.5">Uyarı / Hata</p>
                        <p className={`text-2xl font-bold leading-none ${failingCount > 0 ? 'text-rose-600' : 'text-[var(--workspace-text)]'}`}>{failingCount}</p>
                    </div>
                </div>
            </div>

            {/* ── Tablo Alanı (Unboxed) ── */}
            <div className="flex-1 min-h-0 overflow-y-auto px-8 pb-8">
                {isLoading ? (
                    <div className="w-full h-16 rounded-lg bg-black/[0.03] animate-pulse"></div>
                ) : filteredWorkflows.length === 0 ? (
                    <div className="w-full py-16 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-black/[0.03] flex items-center justify-center mb-4">
                            <Search size={28} className="text-[var(--sidebar-text-muted)]" />
                        </div>
                        <h3 className="text-base font-bold text-[var(--workspace-text)] mb-2">Şema Bulunamadı</h3>
                        <p className="text-sm text-[var(--sidebar-text-muted)] max-w-sm">N8n iş akışınız bulunmuyor veya arama kriterlerini değiştirmeniz gerekiyor.</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 border-black/[0.04]">
                                <th className="px-2 py-4 text-[11px] font-semibold tracking-widest text-gray-400 uppercase w-16 text-center">Aç/Kapat</th>
                                <th className="px-4 py-4 text-[11px] font-semibold tracking-widest text-gray-400 uppercase">İş Akışı</th>
                                <th className="px-4 py-4 text-[11px] font-semibold tracking-widest text-gray-400 uppercase">Tetikleyici</th>
                                <th className="px-4 py-4 text-[11px] font-semibold tracking-widest text-gray-400 uppercase">Durum</th>
                                <th className="px-4 py-4 text-[11px] font-semibold tracking-widest text-gray-400 uppercase text-right">Başarı Oranı</th>
                                <th className="px-2 py-4 text-[11px] font-semibold tracking-widest text-gray-400 uppercase text-center w-24">Aksiyon</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredWorkflows.map((wk) => (
                                <tr key={wk.id} className="border-b border-black/[0.03] hover:bg-black/[0.02] transition-colors group">
                                    <td className="px-2 py-5 text-center" onClick={() => toggleWorkflowStatus(wk.id, wk.active)}>
                                        <div className={`w-10 h-5 rounded-full relative cursor-pointer inline-block align-middle transition-colors duration-300 ${wk.active ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${wk.active ? 'right-0.5' : 'left-0.5'}`}></div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${wk.status === 'healthy' ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-rose-500/10 text-rose-500'}`}>
                                                <Webhook size={18} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-[var(--workspace-text)] group-hover:text-[var(--accent)] transition-colors cursor-pointer" onClick={() => openInN8n(wk.id)}>{wk.name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[11px] font-medium text-gray-400 font-mono tracking-wide">{wk.id}</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {wk.tags && wk.tags.map(tag => (
                                                            <span key={tag} className="px-2 py-0.5 rounded-full bg-black/[0.04] text-[10px] font-bold text-[var(--sidebar-text-muted)]">{tag}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-5">
                                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white ring-1 ring-black/[0.06] text-xs font-semibold text-[var(--sidebar-text-muted)]">
                                            <Clock size={12} className={wk.trigger === 'Webhook' ? 'text-blue-500' : 'text-[var(--accent)]'} />
                                            {wk.trigger}
                                        </span>
                                    </td>
                                    <td className="px-4 py-5">
                                        <p className="text-sm font-semibold text-[var(--workspace-text)]">{wk.lastRun || "Henüz tetiklenmedi"}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{wk.executionsCount} toplam yürütme</p>
                                    </td>
                                    <td className="px-4 py-5 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className={`text-sm font-black ${wk.successRate === 100 ? 'text-emerald-500' : wk.successRate > 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                                                %{wk.successRate || 0}
                                            </span>
                                            <div className="w-20 h-1.5 mt-1.5 bg-black/[0.04] rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${wk.successRate === 100 ? 'bg-emerald-500' : wk.successRate > 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${wk.successRate || 0}%` }}></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-2 py-5">
                                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openInN8n(wk.id)}
                                                className="w-8 h-8 rounded-full bg-white ring-1 ring-black/[0.08] flex items-center justify-center text-[var(--sidebar-text-muted)] hover:text-[var(--accent)] hover:ring-[var(--accent)] transition-all shadow-sm"
                                                title="Düzenle"
                                            >
                                                <ExternalLink size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

        </div>
    );
};
