import React, { useState, useEffect } from 'react';
import { Webhook, Activity, Clock, Server, CheckCircle2, XCircle, Search, Filter, ExternalLink, Play, SlidersHorizontal, ArrowUpDown, KeyRound, AlertCircle, Save, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { mutate } from '../../../../api/client';

export const AutomationTab = () => {
    const [workflows, setWorkflows] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [needsAuth, setNeedsAuth] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [authError, setAuthError] = useState('');
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isCachedData, setIsCachedData] = useState(false);
    const [triggeringId, setTriggeringId] = useState(null);
    const [triggerResults, setTriggerResults] = useState({});
    const [expandedPayload, setExpandedPayload] = useState(null);
    const [payloadInputs, setPayloadInputs] = useState({});

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
                setIsCachedData(data.is_cached === true);
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
        if (isActionLoading || isCachedData) return;
        setIsActionLoading(true);
        const newStatus = !currentStatus;
        const wk = workflows.find(w => w.id === id);

        setWorkflows(prev => prev.map(w => w.id === id ? { ...w, active: newStatus, status: newStatus ? 'healthy' : 'stopped' } : w));

        try {
            const savedKey = localStorage.getItem('n8n_api_key') || '';
            const headers = savedKey ? { 'x-n8n-api-key': savedKey } : {};
            await mutate.toggle(`/api/n8n/workflows/${id}/toggle`,
                { active: newStatus },
                {
                    subject: 'Workflow',
                    detail: wk?.name,
                    customSuccess: `Workflow ${newStatus ? 'aktifleştirildi' : 'durduruldu'}: ${wk?.name || id}.`,
                    headers,
                }
            );
        } catch {
            // Optimistic UI'i geri al
            setWorkflows(prev => prev.map(w => w.id === id ? { ...w, active: currentStatus, status: currentStatus ? 'healthy' : 'stopped' } : w));
        }
        setIsActionLoading(false);
    };

    const triggerWorkflow = async (wk) => {
        if (isCachedData || triggeringId) return;
        setTriggeringId(wk.id);
        setTriggerResults(prev => ({ ...prev, [wk.id]: null }));
        try {
            const savedKey = localStorage.getItem('n8n_api_key') || '';
            const headers = savedKey ? { 'x-n8n-api-key': savedKey } : {};
            let payload = {};
            try { payload = JSON.parse(payloadInputs[wk.id] || '{}'); } catch { payload = {}; }
            const data = await mutate.trigger(`/api/n8n/workflows/${wk.id}/run`, payload, {
                subject: 'Workflow',
                detail: wk.name,
                headers,
                silentSuccess: true, // sonuç UI'da result indicator ile gösterilir
            });
            setTriggerResults(prev => ({ ...prev, [wk.id]: data.success ? 'ok' : 'error' }));
        } catch {
            setTriggerResults(prev => ({ ...prev, [wk.id]: 'error' }));
        } finally {
            setTriggeringId(null);
            setTimeout(() => setTriggerResults(prev => ({ ...prev, [wk.id]: null })), 4000);
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
            <div className="flex flex-col items-center justify-center w-full h-full bg-[#fafafa] p-6 animate-in fade-in duration-300">
                <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-stone-200 p-8">
                    <div className="w-12 h-12 bg-stone-50 rounded-lg flex items-center justify-center mx-auto mb-6 border border-stone-100">
                        <KeyRound size={24} className="text-[#378ADD]" />
                    </div>
                    <h3 className="text-[14px] font-bold text-stone-800 text-center mb-2 uppercase tracking-wide">API Yetkilendirmesi</h3>
                    <p className="text-[11px] text-stone-500 text-center mb-6">
                        n8n sunucusuna bağlanabilmek için geçerli bir API anahtarına ihtiyacımız var.
                        <strong className="text-stone-700"> n8n arayüzünden (Settings &gt; n8n API) </strong> oluşturduğunuz anahtarı aşağıya yapıştırın.
                    </p>

                    {authError && (
                        <div className="mb-4 p-3 bg-[#FEF2F2] border border-[#FEF2F2] rounded-lg flex items-start gap-2">
                            <AlertCircle size={14} className="text-[#991B1B] shrink-0 mt-0.5" />
                            <p className="text-[10px] font-medium text-[#991B1B]">{authError}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">n8n API Key</label>
                            <input
                                type="password"
                                value={apiKeyInput}
                                onChange={(e) => setApiKeyInput(e.target.value)}
                                placeholder="ny8_***************************"
                                className="w-full bg-stone-50 border border-stone-200 rounded-md px-3 py-2 text-[11px] font-mono text-stone-700 focus:outline-none focus:bg-white focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD] transition-all"
                                onKeyDown={(e) => e.key === 'Enter' && saveApiKeyAndRetry()}
                            />
                        </div>
                        <button
                            onClick={saveApiKeyAndRetry}
                            className="w-full flex justify-center items-center gap-2 bg-[#378ADD] hover:bg-[#2A68AB] text-white rounded-md px-4 py-2 text-[11px] font-bold shadow-sm transition-all"
                        >
                            <Save size={14} /> Sistemi Bağla
                        </button>
                        <p className="text-[10px] text-center text-stone-400 mt-2">
                            Anahtarınız siber güvenlik gereği backend'e iletilir ve tarayıcınızda lokal olarak saklanır.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full h-full bg-[#fafafa] animate-in fade-in duration-300">
            {isCachedData && (
                <div className="w-full bg-[#FAEEDA] border-b border-[#EAD5AB] px-8 py-2 flex items-center gap-2 shadow-sm shrink-0">
                    <AlertCircle size={14} className="text-[#854F0B]" />
                    <p className="text-[11px] font-bold text-[#854F0B]">
                        n8n motoru şu an kapalı. İş akışlarınızın son yedeklenmiş versiyonunu görüntülüyorsunuz. (Salt Okunur)
                    </p>
                </div>
            )}
            {/* ── Üst Araç Çubuğu (Unboxed) ── */}
            <div className="shrink-0 px-8 pt-8 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-[12px] font-bold text-stone-600 uppercase tracking-wide flex items-center gap-2">
                        <Activity size={16} className="text-[#378ADD]" />
                        Otomasyon & İş Akışları
                    </h3>
                    <p className="text-[11px] text-stone-400 mt-1 max-w-lg">
                        Sistem içi eylemleri ve dış servis etkileşimlerini (n8n) yönetin.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="relative group">
                        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-[#378ADD] transition-colors" />
                        <input
                            type="text"
                            placeholder="İş akışı ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoComplete="off"
                            className="bg-white border border-stone-200 rounded-md pl-8 pr-4 py-1.5 text-[11px] text-stone-700 w-60 focus:outline-none focus:border-[#378ADD] transition-all placeholder:text-stone-400"
                        />
                    </div>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-md text-[11px] font-semibold transition-all">
                        <Filter size={12} /> Filtre
                    </button>
                    <button
                        onClick={createNewN8n}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-[#378ADD] hover:bg-[#2A68AB] text-white rounded-md text-[11px] font-bold shadow-sm transition-all"
                    >
                        <Webhook size={12} /> Yeni Ekle
                    </button>
                </div>
            </div>

            {/* ── İstatistik Şeridi ── */}
            <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-4 px-8 pb-6 pt-2">
                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-stone-200 shadow-sm">
                    <div className="w-8 h-8 rounded-md bg-[#EAF3DE] flex items-center justify-center shrink-0 border border-[#b4dc8f]/30">
                        <Activity size={14} className="text-[#3B6D11]" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-0.5">Aktif Senaryo</p>
                        <p className="text-[14px] font-black text-stone-700 leading-none">{activeCount} <span className="text-[10px] font-medium text-stone-400">/ {totalCount}</span></p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-stone-200 shadow-sm">
                    <div className="w-8 h-8 rounded-md bg-[#378ADD]/10 flex items-center justify-center shrink-0 border border-[#378ADD]/20">
                        <Server size={14} className="text-[#378ADD]" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-0.5">Toplam İstek</p>
                        <p className="text-[14px] font-black text-stone-700 leading-none">{totalExecutions > 1000 ? (totalExecutions / 1000).toFixed(1) + 'K' : totalExecutions}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-stone-200 shadow-sm">
                    <div className="w-8 h-8 rounded-md bg-[#EAF3DE] flex items-center justify-center shrink-0 border border-[#b4dc8f]/30">
                        <CheckCircle2 size={14} className="text-[#3B6D11]" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-0.5">Başarı Oranı</p>
                        <p className="text-[14px] font-black text-stone-700 leading-none">% {avgSuccess}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-stone-200 shadow-sm">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 border ${failingCount > 0 ? 'bg-[#FEF2F2] border-[#FEF2F2]/50' : 'bg-stone-50 border-stone-100'}`}>
                        <XCircle size={14} className={failingCount > 0 ? 'text-[#991B1B]' : 'text-stone-400'} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-0.5">Uyarı / Hata</p>
                        <p className={`text-[14px] font-black leading-none ${failingCount > 0 ? 'text-[#991B1B]' : 'text-stone-700'}`}>{failingCount}</p>
                    </div>
                </div>
            </div>

            {/* ── Tablo Alanı ── */}
            <div className="flex-1 min-h-0 overflow-y-auto px-8 pb-8">
                {isLoading ? (
                    <div className="w-full h-16 rounded-lg bg-stone-100 animate-pulse"></div>
                ) : filteredWorkflows.length === 0 ? (
                    <div className="w-full py-16 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-4">
                            <Search size={28} className="text-stone-400" />
                        </div>
                        <h3 className="text-[12px] font-bold text-stone-700 uppercase tracking-widest mb-2">Şema Bulunamadı</h3>
                        <p className="text-[11px] text-stone-500 max-w-sm">N8n iş akışınız bulunmuyor veya arama kriterlerini değiştirmeniz gerekiyor.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-stone-200 bg-stone-50">
                                    <th className="px-4 py-3 text-[9px] font-bold tracking-widest text-stone-400 uppercase w-16 text-center">Aç/Kapat</th>
                                    <th className="px-4 py-3 text-[9px] font-bold tracking-widest text-stone-400 uppercase">İş Akışı</th>
                                    <th className="px-4 py-3 text-[9px] font-bold tracking-widest text-stone-400 uppercase">Tetikleyici</th>
                                    <th className="px-4 py-3 text-[9px] font-bold tracking-widest text-stone-400 uppercase">Durum</th>
                                    <th className="px-4 py-3 text-[9px] font-bold tracking-widest text-stone-400 uppercase text-right">Başarı Oranı</th>
                                    <th className="px-4 py-3 text-[9px] font-bold tracking-widest text-stone-400 uppercase text-center w-36">Aksiyon</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredWorkflows.map((wk, index) => (
                                    <React.Fragment key={wk.id}>
                                        <tr className={`${index !== filteredWorkflows.length - 1 ? 'border-b border-stone-100' : ''} hover:bg-stone-50/50 transition-colors group ${isCachedData ? 'opacity-90' : ''}`}>
                                            <td className={`px-4 py-4 text-center ${isCachedData ? 'cursor-not-allowed' : 'cursor-pointer'}`} onClick={() => toggleWorkflowStatus(wk.id, wk.active)}>
                                                <div className={`w-8 h-4 rounded-full relative inline-block align-middle transition-colors duration-300 ${wk.active ? (isCachedData ? 'bg-[#1D9E75]/50' : 'bg-[#1D9E75]') : 'bg-stone-300'}`}>
                                                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-300 shadow-sm ${wk.active ? 'right-0.5' : 'left-0.5'}`}></div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 border 
                                                    ${wk.status === 'offline' ? 'bg-stone-100 border-stone-200 text-stone-400'
                                                            : wk.status === 'healthy' ? 'bg-[#378ADD]/10 border-[#378ADD]/20 text-[#378ADD]'
                                                                : 'bg-[#FEF2F2] border-[#FEF2F2]/50 text-[#991B1B]'}`}>
                                                        <Webhook size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-stone-700 group-hover:text-[#378ADD] transition-colors cursor-pointer" onClick={() => openInN8n(wk.id)}>{wk.name}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[9px] font-medium text-stone-400 font-mono tracking-wide">{wk.id}</span>
                                                            <div className="flex flex-wrap gap-1">
                                                                {wk.tags && wk.tags.map(tag => (
                                                                    <span key={tag} className="px-1.5 py-0.5 rounded border border-stone-200 bg-stone-100 text-[8px] font-bold text-stone-500 uppercase">{tag}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-stone-50 border border-stone-200 text-[10px] font-semibold text-stone-600">
                                                    <Clock size={10} className={wk.trigger === 'Webhook' ? 'text-[#378ADD]' : 'text-stone-400'} />
                                                    {wk.trigger}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="text-[11px] font-bold text-stone-600">{wk.lastRun || "Henüz tetiklenmedi"}</p>
                                                <p className="text-[10px] text-stone-400 mt-0.5">{wk.executionsCount} işlem</p>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className={`text-[11px] font-black ${wk.successRate === 100 ? 'text-[#3B6D11]' : wk.successRate > 50 ? 'text-[#854F0B]' : 'text-[#991B1B]'}`}>
                                                        %{wk.successRate || 0}
                                                    </span>
                                                    <div className="w-16 h-1 mt-1 bg-stone-100 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${wk.successRate === 100 ? 'bg-[#EAF3DE]' : wk.successRate > 50 ? 'bg-[#FAEEDA]' : 'bg-[#FEF2F2]'}`} style={{ width: `${wk.successRate || 0}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {/* Manuel Tetikle */}
                                                    <button
                                                        onClick={() => triggerWorkflow(wk)}
                                                        disabled={!!triggeringId || isCachedData}
                                                        title="Manuel Tetikle"
                                                        className={`w-7 h-7 rounded-md border flex items-center justify-center transition-all shadow-sm text-[10px] font-bold ${triggerResults[wk.id] === 'ok' ? 'bg-[#EAF3DE] border-[#EAF3DE] text-[#3B6D11]' :
                                                                triggerResults[wk.id] === 'error' ? 'bg-[#FEF2F2] border-[#FEF2F2] text-[#991B1B]' :
                                                                    triggeringId === wk.id ? 'bg-stone-50 border-stone-200 text-[#378ADD]' :
                                                                        'bg-white border-stone-200 text-stone-400 hover:text-[#1D9E75] hover:border-[#1D9E75] opacity-0 group-hover:opacity-100'
                                                            }`}
                                                    >
                                                        {triggeringId === wk.id ? <Loader2 size={11} className="animate-spin" /> :
                                                            triggerResults[wk.id] === 'ok' ? <CheckCircle2 size={11} /> :
                                                                triggerResults[wk.id] === 'error' ? <XCircle size={11} /> :
                                                                    <Play size={11} />}
                                                    </button>
                                                    {/* Payload toggle */}
                                                    <button
                                                        onClick={() => setExpandedPayload(expandedPayload === wk.id ? null : wk.id)}
                                                        title="Payload Düzenle"
                                                        className="w-7 h-7 rounded-md bg-white border border-stone-200 flex items-center justify-center text-stone-400 hover:text-[#854F0B] hover:border-[#854F0B] transition-all shadow-sm opacity-0 group-hover:opacity-100"
                                                    >
                                                        {expandedPayload === wk.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                                    </button>
                                                    {/* n8n'de aç */}
                                                    <button
                                                        onClick={() => openInN8n(wk.id)}
                                                        className="w-7 h-7 rounded-md bg-white border border-stone-200 flex items-center justify-center text-stone-400 hover:text-[#378ADD] hover:border-[#378ADD] transition-all shadow-sm opacity-0 group-hover:opacity-100"
                                                        title="n8n'de Düzenle"
                                                    >
                                                        <ExternalLink size={11} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {/* Payload satırı */}
                                        {expandedPayload === wk.id && (
                                            <tr key={`${wk.id}-payload`}>
                                                <td colSpan={6} className="px-6 py-3 bg-stone-50 border-b border-stone-100">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 shrink-0">JSON Payload</span>
                                                        <input
                                                            value={payloadInputs[wk.id] || '{}'}
                                                            onChange={e => setPayloadInputs(prev => ({ ...prev, [wk.id]: e.target.value }))}
                                                            placeholder='{"key": "value"}'
                                                            className="flex-1 bg-white border border-stone-200 rounded-md px-3 py-1.5 text-[11px] font-mono text-stone-700 focus:outline-none focus:border-[#854F0B] focus:ring-1 focus:ring-[#854F0B]/20 transition-all"
                                                        />
                                                        <button
                                                            onClick={() => triggerWorkflow(wk)}
                                                            disabled={!!triggeringId || isCachedData}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1D9E75] text-white rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-[#178060] transition-all shrink-0"
                                                        >
                                                            <Play size={11} /> Tetikle
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
};
