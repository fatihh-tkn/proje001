import React, { useState, useEffect } from 'react';
import { User, Hash, AlignLeft, ShieldCheck, Database, CheckCircle2, ToggleRight, ToggleLeft, Sparkles, Loader2, ChevronDown, ChevronUp, FileText, Webhook, RefreshCw, AlertCircle } from 'lucide-react';
import { API_BASE, fetchWithTimeout } from '../utils';

/* ── İşlem Botu için n8n Workflow Seçici ─────────────────────────── */
function RouterWorkflowPanel({ selectedItem, updateAgent }) {
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchWorkflows = async () => {
        setLoading(true);
        setError(false);
        try {
            const savedKey = localStorage.getItem('n8n_api_key') || '';
            const headers = savedKey ? { 'x-n8n-api-key': savedKey } : {};
            const res = await fetch('/api/n8n/workflows', { headers });
            const data = await res.json();
            if (data.success && data.workflows) {
                setWorkflows(data.workflows);
            } else {
                setError(true);
            }
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchWorkflows(); }, []);

    const allowedWorkflows = selectedItem.allowedWorkflows || [];

    const toggleWorkflow = (wf) => {
        const isSelected = allowedWorkflows.includes(wf.name);
        const newList = isSelected
            ? allowedWorkflows.filter(n => n !== wf.name)
            : [...allowedWorkflows, wf.name];

        updateAgent('allowedWorkflows', newList);

        // Prompt içindeki webhook listesini otomatik güncelle
        const webhookLine = newList.length > 0
            ? `Mevcut n8n webhook'ları: ${newList.join(', ')}`
            : `Mevcut n8n webhook'ları: (henüz seçilmedi)`;
        const updatedPrompt = (selectedItem.prompt || '').replace(
            /Mevcut n8n webhook'ları:.*$/m,
            webhookLine
        );
        updateAgent('prompt', updatedPrompt);
    };

    return (
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100 bg-[#4E4EBA]/5">
                <div className="flex items-center gap-2">
                    <Webhook size={13} className="text-[#4E4EBA]" />
                    <span className="text-[10px] font-black text-[#4E4EBA] uppercase tracking-widest">n8n Tetikleyici Workflow'lar</span>
                </div>
                <button onClick={fetchWorkflows} className="p-1 rounded text-stone-400 hover:text-[#4E4EBA] hover:bg-stone-100 transition-colors">
                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>
            <div className="p-5">
                {loading ? (
                    <div className="flex items-center gap-2 text-stone-400 text-[11px] py-2">
                        <Loader2 size={14} className="animate-spin" /> n8n workflow'ları çekiliyor...
                    </div>
                ) : error ? (
                    <div className="flex items-center gap-2 text-[#854F0B] text-[11px] bg-[#FAEEDA] rounded-lg px-3 py-2.5">
                        <AlertCircle size={13} /> n8n sunucusuna bağlanılamadı. API anahtarını kontrol edin.
                    </div>
                ) : workflows.length === 0 ? (
                    <p className="text-[11px] text-stone-400 py-2">n8n'de aktif workflow bulunamadı.</p>
                ) : (
                    <div className="space-y-1.5">
                        {workflows.map(wf => {
                            const isSelected = allowedWorkflows.includes(wf.name);
                            return (
                                <div
                                    key={wf.id}
                                    onClick={() => toggleWorkflow(wf)}
                                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border text-xs cursor-pointer transition-all ${isSelected
                                        ? 'bg-white border-[#4E4EBA]/30 text-stone-700 font-bold shadow-sm ring-1 ring-[#4E4EBA]/10'
                                        : 'bg-stone-50 border-stone-100/50 text-stone-500 font-medium hover:bg-stone-100'
                                    }`}
                                >
                                    {isSelected
                                        ? <CheckCircle2 size={16} className="text-[#4E4EBA] shrink-0" strokeWidth={2.5} />
                                        : <div className="w-4 h-4 rounded-full border-2 border-stone-300 shrink-0 bg-white" />
                                    }
                                    <span className="flex-1">{wf.name}</span>
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${wf.active ? 'bg-[#1D9E75]' : 'bg-stone-300'}`} />
                                </div>
                            );
                        })}
                    </div>
                )}
                {allowedWorkflows.length > 0 && (
                    <p className="text-[10px] text-stone-400 mt-3 tracking-tight">
                        <span className="font-bold text-[#4E4EBA]">{allowedWorkflows.length}</span> workflow seçili — prompt otomatik güncellendi.
                    </p>
                )}
            </div>
        </div>
    );
}

const AgentConfigPanel = ({ selectedItem, rags, updateAgent, toggleRagAccess }) => {
    const [fetchedModels, setFetchedModels] = React.useState([]);
    const [loadingModels, setLoadingModels] = React.useState(false);
    const [aliases, setAliases] = React.useState({});
    const [expandedRags, setExpandedRags] = useState({});
    const toggleRagAccordion = (e, ragId) => {
        e.stopPropagation();
        setExpandedRags(prev => ({
            ...prev,
            [ragId]: !prev[ragId]
        }));
    };

    const toggleFileAccess = (e, fileId) => {
        e.stopPropagation();
        const disabledKey = `!${fileId}`;
        const newAllowedRags = selectedItem.allowedRags.includes(disabledKey)
            ? selectedItem.allowedRags.filter(id => id !== disabledKey)
            : [...selectedItem.allowedRags, disabledKey];
        updateAgent('allowedRags', newAllowedRags);
    };

    React.useEffect(() => {
        setLoadingModels(true);
        // localStorage'dan takma adları (alias) çek
        try {
            const savedAliases = JSON.parse(localStorage.getItem('model_aliases') || '{}');
            setAliases(savedAliases);
        } catch (e) { }

        fetchWithTimeout(`${API_BASE}/catalog`)
            .then(r => r.json())
            .then(data => {
                if (data?.models) {
                    setFetchedModels(data.models);
                }
            })
            .catch(err => console.error("Modeller alınamadı:", err))
            .finally(() => setLoadingModels(false));
    }, []);

    const groupedModels = React.useMemo(() => {
        const groups = {};
        fetchedModels.forEach(m => {
            const p = m.provider || 'Custom';
            if (!groups[p]) groups[p] = [];
            groups[p].push(m);
        });
        return groups;
    }, [fetchedModels]);

    if (!selectedItem) return null;

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* ── KUTU 1: Karakter & Yetkinlik ── */}
            <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-stone-100 bg-stone-50">
                    <User size={13} className="text-[#378ADD]" />
                    <span className="text-[10px] font-black text-stone-600 uppercase tracking-widest">Karakter &amp; Yetkinlik</span>
                </div>
                <div className="grid grid-cols-2 gap-5 p-5">
                    <div>
                        <label className="block text-[10px] font-bold text-stone-500 mb-2 uppercase tracking-wide">Ajan Rolü / Yeteneği</label>
                        <input
                            type="text" value={selectedItem.persona} onChange={(e) => updateAgent('persona', e.target.value)}
                            placeholder="Örn: Finansal Asistan, Müşteri Temsilcisi"
                            className="w-full bg-stone-50 border border-stone-200 text-stone-700 text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:border-[#378ADD] focus:bg-white focus:ring-1 focus:ring-[#378ADD]/30 transition-all placeholder:text-stone-400 placeholder:font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-stone-500 mb-2 uppercase tracking-wide flex justify-between items-center">
                            <span>Zekâ Modeli</span>
                            {loadingModels && <Loader2 size={12} className="animate-spin text-[#378ADD]" />}
                        </label>
                        <select
                            value={fetchedModels.find(m => m.name === selectedItem.model) ? selectedItem.model : ''}
                            onChange={(e) => updateAgent('model', e.target.value)}
                            className="w-full bg-stone-50 border border-stone-200 text-stone-700 text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/30 cursor-pointer font-mono transition-all"
                        >
                            {loadingModels ? (
                                <option value="">Modeller yükleniyor...</option>
                            ) : fetchedModels.length === 0 ? (
                                <option value="">— Sistemde kayıtlı model yok —</option>
                            ) : (
                                <>
                                    <option value="">Model seçin...</option>
                                    {Object.entries(groupedModels).map(([providerName, mList]) => (
                                        <optgroup key={providerName} label={providerName}>
                                            {mList.map(m => (
                                                <option key={m.id} value={m.name}>
                                                    {aliases[m.id] ? `${aliases[m.id]} (${m.name})` : m.name}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </>
                            )}
                        </select>
                    </div>
                    {selectedItem.agentKind === 'chatbot' && (
                        <div>
                            <label className="block text-[10px] font-bold text-stone-500 mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
                                <Hash size={12} className="text-[#378ADD]" /> Konuşma Hafızası <span className="normal-case tracking-normal opacity-70">(son mesaj limiti)</span>
                            </label>
                            <input
                                type="number" min={1} max={50} value={selectedItem.chatHistoryLength}
                                onChange={e => updateAgent('chatHistoryLength', parseInt(e.target.value))}
                                className="w-full bg-stone-50 border border-stone-200 text-stone-700 text-xs font-black rounded-lg px-3 py-2 outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/30 transition-all font-mono"
                            />
                            <p className="text-[10px] font-semibold text-stone-400 mt-1.5 tracking-tight">Bot son bu kadar mesajı hatırlar.</p>
                        </div>
                    )}
                    <div>
                        <label className="block text-[10px] font-bold text-stone-500 mb-2 uppercase tracking-wide flex items-center justify-between">
                            <span>Yaratıcılık (Temperature)</span>
                            <span className="text-[#378ADD] font-black text-xs font-mono">{typeof selectedItem.temp === 'string' ? 0.7 : selectedItem.temp.toFixed(1)}</span>
                        </label>
                        <input
                            type="range" min="0.0" max="2.0" step="0.1"
                            value={typeof selectedItem.temp === 'string' ? 0.7 : selectedItem.temp}
                            onChange={(e) => updateAgent('temp', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#378ADD] mt-1"
                        />
                        <div className="flex justify-between text-[10px] font-bold text-stone-400 mt-1.5 tracking-tight">
                            <span>Analitik (0.0)</span><span>Dengeli (1.0)</span><span>Yaratıcı (2.0)</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-stone-500 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                            <Hash size={12} className="text-[#378ADD]" /> Maks. Çıktı (Max Token)
                        </label>
                        <input
                            type="number" value={selectedItem.maxTokens}
                            onChange={(e) => updateAgent('maxTokens', parseInt(e.target.value))}
                            className="w-full bg-stone-50 border border-stone-200 text-stone-700 text-xs font-black rounded-lg px-3 py-2 outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/30 transition-all font-mono"
                        />
                        <p className="text-[10px] font-semibold text-stone-400 mt-1.5 tracking-tight">Daha kısa değer = daha düşük maliyet.</p>
                    </div>
                </div>
            </div>

            {/* ── KUTU 3: Görev Tanımı & Talimatlar ── */}
            <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-stone-100 bg-[#FAEEDA]/40">
                    <AlignLeft size={13} className="text-[#854F0B]" />
                    <span className="text-[10px] font-black text-[#854F0B] uppercase tracking-widest">Görev Tanımı &amp; Talimatlar</span>
                </div>
                <div className="grid grid-cols-2 gap-5 p-5">
                    <div>
                        <label className="block text-[10px] font-bold text-stone-500 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                            <CheckCircle2 size={12} className="text-[#3B6D11]" /> Pozitif Görevler (Do's)
                        </label>
                        <textarea
                            value={selectedItem.prompt}
                            onChange={(e) => updateAgent('prompt', e.target.value)}
                            className="w-full bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium rounded-lg px-4 py-3 outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/30 focus:bg-white min-h-[130px] resize-none leading-relaxed transition-all placeholder:text-stone-400 placeholder:font-normal"
                            placeholder="Görevi ve beklentileri girin..."
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-[#791F1F] mb-2 uppercase tracking-wide flex items-center gap-1.5">
                            <ShieldCheck size={12} className="text-[#791F1F]" /> Kısıtlamalar (Don'ts)
                        </label>
                        <textarea
                            value={selectedItem.negativePrompt}
                            onChange={(e) => updateAgent('negativePrompt', e.target.value)}
                            className="w-full bg-[#FCEBEB]/30 border border-[#FCEBEB] text-[#791F1F] text-xs font-medium rounded-lg px-4 py-3 outline-none focus:border-[#791F1F]/40 focus:ring-1 focus:ring-[#791F1F]/20 focus:bg-[#FCEBEB]/50 min-h-[130px] resize-none leading-relaxed transition-all placeholder:text-[#791F1F]/40 placeholder:font-normal"
                            placeholder="Örn: Fiyat verme, siyaset konuşma..."
                        />
                    </div>
                </div>
            </div>

            {/* ── KUTU 4: Bilgi Kaynağı (sadece chatbot) ── */}
            {selectedItem.agentKind === 'chatbot' && (
                <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm">
                    <div className="flex items-center gap-2 px-5 py-3 border-b border-stone-100 bg-stone-50">
                        <Database size={13} className="text-stone-500" />
                        <span className="text-[10px] font-black text-stone-600 uppercase tracking-widest">Bilgi Kaynağı (Vektör Havuzları)</span>
                    </div>
                    <div className="p-5">
                        <div className="space-y-1.5">
                            {rags.map(rag => {
                                const hasAccess = selectedItem.allowedRags.includes(rag.id);
                                const isExpanded = expandedRags[rag.id];
                                return (
                                    <div key={rag.id} className="flex flex-col gap-1">
                                        <div
                                            onClick={() => toggleRagAccess(selectedItem.id, rag.id)}
                                            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border text-xs cursor-pointer transition-all ${hasAccess
                                                ? 'bg-white border-[#378ADD]/30 text-stone-700 font-bold shadow-sm ring-1 ring-[#378ADD]/10'
                                                : 'bg-stone-50 border-stone-100/50 text-stone-500 font-medium hover:bg-stone-100'
                                                }`}
                                        >
                                            {hasAccess
                                                ? <CheckCircle2 size={16} className="text-[#378ADD] shrink-0" strokeWidth={2.5} />
                                                : <div className="w-4 h-4 rounded-full border-2 border-stone-300 shrink-0 bg-white" />}
                                            <span className="flex-1">{rag.name}</span>

                                            {rag.files && rag.files.length > 0 && (
                                                <button
                                                    onClick={(e) => toggleRagAccordion(e, rag.id)}
                                                    className="p-1 hover:bg-stone-200 rounded text-stone-400 hover:text-stone-600 transition-colors"
                                                    title="Dosyaları Göster/Gizle"
                                                >
                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </button>
                                            )}
                                        </div>

                                        {/* Akordeon İçeriği (Dosyalar) */}
                                        {isExpanded && rag.files && (
                                            <div className="pl-9 pr-3 py-1 space-y-1.5 mt-2 mb-3 animate-in slide-in-from-top-2 fade-in duration-200">
                                                {rag.files.map((file) => {
                                                    const isFileDisabled = selectedItem.allowedRags.includes(`!${file.id}`);
                                                    return (
                                                        <div
                                                            key={file.id}
                                                            onClick={(e) => toggleFileAccess(e, file.id)}
                                                            className={`flex items-center gap-2 text-[11px] px-3 py-2 rounded border cursor-pointer transition-colors font-semibold tracking-tight ${isFileDisabled ? 'bg-[#FCEBEB]/50 border-[#FCEBEB] text-stone-400' : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'}`}
                                                            title={isFileDisabled ? "Yapay zeka erişimine kapalı. Açmak için tıklayın." : "Yapay zeka erişimine açık. Kapatmak için tıklayın."}
                                                        >
                                                            <div className="flex-1 flex items-center gap-2.5 truncate">
                                                                <FileText size={12} strokeWidth={2.5} className={isFileDisabled ? "text-[#791F1F]/50" : "text-[#378ADD]"} />
                                                                <span className={`truncate ${isFileDisabled ? 'line-through decoration-stone-300' : ''}`}>{file.filename}</span>
                                                            </div>
                                                            <div className="shrink-0">
                                                                {isFileDisabled ? <ToggleLeft size={16} strokeWidth={2.5} className="text-[#791F1F]/60" /> : <ToggleRight size={16} strokeWidth={2.5} className="text-[#378ADD]" />}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ── KUTU 5: n8n Tetikleyiciler (sadece router/işlem botu) ── */}
            {selectedItem.agentKind === 'router' && (
                <RouterWorkflowPanel selectedItem={selectedItem} updateAgent={updateAgent} />
            )}

            {/* ── KUTU 6: Akıllı Denetim (sadece chatbot) ── */}
            {selectedItem.agentKind === 'chatbot' && (
                <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm">
                    <div className="flex items-center gap-2 px-5 py-3 border-b border-stone-100 bg-stone-50">
                        <ShieldCheck size={13} className="text-stone-500" />
                        <span className="text-[10px] font-black text-stone-600 uppercase tracking-widest">Akıllı Denetim</span>
                    </div>
                    <div className="grid grid-cols-2 gap-5 p-5">
                        {/* Sol sütun: Toggle'lar */}
                        <div className="space-y-3">
                            <div
                                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-colors ${selectedItem.strictFactCheck ? 'bg-[#EAF3DE] border-[#EAF3DE]/60 shadow-[inset_0_2px_10px_-5px_rgba(59,109,17,0.1)]' : 'bg-white border-stone-200 hover:bg-stone-50 shadow-sm'
                                    }`}
                                onClick={() => updateAgent('strictFactCheck', !selectedItem.strictFactCheck)}
                            >
                                <div>
                                    <div className={`text-xs font-black flex items-center gap-2 tracking-tight ${selectedItem.strictFactCheck ? 'text-[#3B6D11]' : 'text-stone-700'}`}>
                                        <CheckCircle2 size={15} strokeWidth={2.5} className={selectedItem.strictFactCheck ? 'text-[#3B6D11]' : 'text-stone-400'} />
                                        Sıkı Doğruluk (Fact Check)
                                    </div>
                                    <div className={`text-[11px] font-semibold tracking-tight mt-1 ${selectedItem.strictFactCheck ? 'text-[#3B6D11]/70' : 'text-stone-500'}`}>
                                        RAG dışına çıkılmasını yasaklar.
                                    </div>
                                </div>
                                {selectedItem.strictFactCheck ? <ToggleRight size={28} strokeWidth={2} className="text-[#3B6D11]" /> : <ToggleLeft size={28} strokeWidth={2} className="text-stone-300" />}
                            </div>

                            <div
                                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-colors ${selectedItem.canAskFollowUp ? 'bg-[#378ADD]/10 border-[#378ADD]/20 shadow-[inset_0_2px_10px_-5px_rgba(55,138,221,0.1)]' : 'bg-white border-stone-200 hover:bg-stone-50 shadow-sm'
                                    }`}
                                onClick={() => updateAgent('canAskFollowUp', !selectedItem.canAskFollowUp)}
                            >
                                <div>
                                    <div className={`text-xs font-black flex items-center gap-2 tracking-tight ${selectedItem.canAskFollowUp ? 'text-[#378ADD]' : 'text-stone-700'}`}>
                                        <Sparkles size={14} strokeWidth={2.5} className={selectedItem.canAskFollowUp ? 'text-[#378ADD]' : 'text-stone-400'} />
                                        Takip Sorusu Önerisi
                                    </div>
                                    <div className={`text-[11px] font-semibold tracking-tight mt-1 ${selectedItem.canAskFollowUp ? 'text-[#378ADD]/70' : 'text-stone-500'}`}>
                                        Cevap bitince akıllı öneriler çıkar.
                                    </div>
                                </div>
                                {selectedItem.canAskFollowUp ? <ToggleRight size={28} strokeWidth={2} className="text-[#378ADD]" /> : <ToggleLeft size={28} strokeWidth={2} className="text-stone-300" />}
                            </div>
                        </div>

                        {/* Sağ sütun: Hata yanıtı */}
                        <div>
                            <label className="block text-[10px] font-bold text-[#791F1F] mb-1.5 uppercase tracking-wide">Hata Durumu Yanıtı (Fallback)</label>
                            <textarea
                                value={selectedItem.errorMessage}
                                onChange={e => updateAgent('errorMessage', e.target.value)}
                                className="w-full bg-[#FCEBEB]/30 border border-[#FCEBEB] text-[#791F1F] text-xs font-medium rounded-xl px-4 py-3 outline-none focus:border-[#791F1F]/40 focus:ring-1 focus:ring-[#791F1F]/20 focus:bg-[#FCEBEB]/50 transition-all resize-none min-h-[110px] placeholder:text-[#791F1F]/40 placeholder:font-normal"
                                placeholder="Bilgi bulamazsa kullanıcıya ne desin?"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgentConfigPanel;
