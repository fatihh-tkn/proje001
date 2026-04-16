import React, { useState } from 'react';
import { User, Hash, AlignLeft, ShieldCheck, Database, CheckCircle2, ToggleRight, ToggleLeft, Sparkles, Loader2, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { API_BASE, fetchWithTimeout } from '../utils';

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
            <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-black/[0.05] bg-slate-50/60">
                    <User size={13} className="text-[var(--accent)]" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Karakter &amp; Yetkinlik</span>
                </div>
                <div className="grid grid-cols-2 gap-5 p-5">
                    <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-2">Ajan Rolü / Yeteneği</label>
                        <input
                            type="text" value={selectedItem.persona} onChange={(e) => updateAgent('persona', e.target.value)}
                            placeholder="Örn: Finansal Asistan, Müşteri Temsilcisi"
                            className="w-full bg-slate-50 border border-black/[0.08] text-[var(--workspace-text)] text-sm rounded-lg px-3 py-2 outline-none focus:border-[var(--accent)] focus:bg-white transition-all placeholder:text-slate-300"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-2 flex justify-between items-center">
                            <span>Zekâ Modeli</span>
                            {loadingModels && <Loader2 size={10} className="animate-spin text-[var(--accent)]" />}
                        </label>
                        <select
                            value={fetchedModels.find(m => m.name === selectedItem.model) ? selectedItem.model : ''}
                            onChange={(e) => updateAgent('model', e.target.value)}
                            className="w-full bg-slate-50 border border-black/[0.08] text-[var(--workspace-text)] text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:border-[var(--accent)] cursor-pointer font-mono transition-all"
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
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                                <Hash size={11} className="text-violet-400" /> Konuşma Hafızası (son kaç mesaj?)
                            </label>
                            <input
                                type="number" min={1} max={50} value={selectedItem.chatHistoryLength}
                                onChange={e => updateAgent('chatHistoryLength', parseInt(e.target.value))}
                                className="w-full bg-slate-50 border border-black/[0.08] text-[var(--workspace-text)] text-xs font-mono rounded-lg px-3 py-2 outline-none focus:border-[var(--accent)] transition-all"
                            />
                            <p className="text-[9px] text-slate-400 mt-1.5">Bot son bu kadar mesajı hatırlar.</p>
                        </div>
                    )}
                    <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-2 flex items-center justify-between">
                            <span>Yaratıcılık (Temperature)</span>
                            <span className="text-violet-500 font-mono text-xs">{typeof selectedItem.temp === 'string' ? 0.7 : selectedItem.temp.toFixed(1)}</span>
                        </label>
                        <input
                            type="range" min="0.0" max="2.0" step="0.1"
                            value={typeof selectedItem.temp === 'string' ? 0.7 : selectedItem.temp}
                            onChange={(e) => updateAgent('temp', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-500 mt-1"
                        />
                        <div className="flex justify-between text-[9px] font-semibold text-slate-400 mt-1.5">
                            <span>Analitik (0.0)</span><span>Dengeli (1.0)</span><span>Yaratıcı (2.0)</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                            <Hash size={11} className="text-violet-400" /> Maks. Çıktı (Max Tokens)
                        </label>
                        <input
                            type="number" value={selectedItem.maxTokens}
                            onChange={(e) => updateAgent('maxTokens', parseInt(e.target.value))}
                            className="w-full bg-slate-50 border border-black/[0.08] text-[var(--workspace-text)] text-xs font-mono rounded-lg px-3 py-2 outline-none focus:border-[var(--accent)] transition-all"
                        />
                        <p className="text-[9px] text-slate-400 mt-1.5">Daha kısa = daha az maliyet.</p>
                    </div>
                </div>
            </div>

            {/* ── KUTU 3: Görev Tanımı & Talimatlar ── */}
            <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-black/[0.05] bg-amber-50/40">
                    <AlignLeft size={13} className="text-amber-500" />
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Görev Tanımı &amp; Talimatlar</span>
                </div>
                <div className="grid grid-cols-2 gap-5 p-5">
                    <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                            <AlignLeft size={12} className="text-amber-500" /> Pozitif Görevler (Do's)
                        </label>
                        <textarea
                            value={selectedItem.prompt}
                            onChange={(e) => updateAgent('prompt', e.target.value)}
                            className="w-full bg-slate-50 border border-black/[0.08] text-[var(--workspace-text)] text-xs font-mono rounded-lg px-4 py-3 outline-none focus:border-amber-400 focus:bg-white min-h-[130px] resize-none leading-relaxed transition-all"
                            placeholder="Görevi ve beklentileri girin..."
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-semibold text-rose-500 mb-2 flex items-center gap-1.5">
                            <ShieldCheck size={12} className="text-rose-500" /> Kısıtlamalar (Don'ts)
                        </label>
                        <textarea
                            value={selectedItem.negativePrompt}
                            onChange={(e) => updateAgent('negativePrompt', e.target.value)}
                            className="w-full bg-rose-50/30 border border-rose-100 text-[var(--workspace-text)] text-xs font-mono rounded-lg px-4 py-3 outline-none focus:border-rose-400 focus:bg-white min-h-[130px] resize-none leading-relaxed transition-all placeholder:text-rose-200"
                            placeholder="Örn: Fiyat verme, siyaset konuşma..."
                        />
                    </div>
                </div>
            </div>

            {/* ── KUTU 4: Bilgi Kaynağı (sadece chatbot) ── */}
            {selectedItem.agentKind === 'chatbot' && (
                <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-3 border-b border-black/[0.05] bg-emerald-50/40">
                        <Database size={13} className="text-emerald-500" />
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Bilgi Kaynağı (Vektör Havuzları)</span>
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
                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-all ${hasAccess
                                                ? 'bg-white border-[var(--accent)] text-[var(--workspace-text)] font-semibold shadow-sm'
                                                : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'
                                                }`}
                                        >
                                            {hasAccess
                                                ? <CheckCircle2 size={14} className="text-[var(--accent)] shrink-0" />
                                                : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 shrink-0" />}
                                            <span className="flex-1">{rag.name}</span>

                                            {rag.files && rag.files.length > 0 && (
                                                <button
                                                    onClick={(e) => toggleRagAccordion(e, rag.id)}
                                                    className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors"
                                                    title="Dosyaları Göster/Gizle"
                                                >
                                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </button>
                                            )}
                                        </div>

                                        {/* Akordeon İçeriği (Dosyalar) */}
                                        {isExpanded && rag.files && (
                                            <div className="pl-9 pr-3 py-1 space-y-1 mt-1 mb-2 animate-in slide-in-from-top-2 fade-in duration-200">
                                                {rag.files.map((file) => {
                                                    const isFileDisabled = selectedItem.allowedRags.includes(`!${file.id}`);
                                                    return (
                                                        <div
                                                            key={file.id}
                                                            onClick={(e) => toggleFileAccess(e, file.id)}
                                                            className={`flex items-center gap-2 text-[10px] px-2 py-1.5 rounded border cursor-pointer transition-colors ${isFileDisabled ? 'bg-rose-50/50 border-rose-100 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'}`}
                                                            title={isFileDisabled ? "Yapay zeka erişimine kapalı. Açmak için tıklayın." : "Yapay zeka erişimine açık. Kapatmak için tıklayın."}
                                                        >
                                                            <div className="flex-1 flex items-center gap-2 truncate">
                                                                <FileText size={10} className={isFileDisabled ? "text-rose-300" : "text-emerald-400"} />
                                                                <span className={`truncate ${isFileDisabled ? 'line-through' : ''}`}>{file.filename}</span>
                                                            </div>
                                                            <div className="shrink-0">
                                                                {isFileDisabled ? <ToggleLeft size={14} className="text-rose-400" /> : <ToggleRight size={14} className="text-emerald-500" />}
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

            {/* ── KUTU 5: Akıllı Denetim (sadece chatbot) ── */}
            {selectedItem.agentKind === 'chatbot' && (
                <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-3 border-b border-black/[0.05] bg-sky-50/40">
                        <ShieldCheck size={13} className="text-sky-500" />
                        <span className="text-[10px] font-bold text-sky-600 uppercase tracking-widest">Akıllı Denetim</span>
                    </div>
                    <div className="grid grid-cols-2 gap-5 p-5">
                        {/* Sol sütun: Toggle'lar */}
                        <div className="space-y-3">
                            <div
                                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedItem.strictFactCheck ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-black/[0.08] hover:bg-slate-50'
                                    }`}
                                onClick={() => updateAgent('strictFactCheck', !selectedItem.strictFactCheck)}
                            >
                                <div>
                                    <div className={`text-xs font-semibold flex items-center gap-1.5 ${selectedItem.strictFactCheck ? 'text-emerald-700' : 'text-[var(--workspace-text)]'}`}>
                                        <CheckCircle2 size={14} className={selectedItem.strictFactCheck ? 'text-emerald-500' : 'text-slate-400'} />
                                        Sıkı Doğruluk (Fact Check)
                                    </div>
                                    <div className={`text-[10px] mt-0.5 ${selectedItem.strictFactCheck ? 'text-emerald-600/70' : 'text-slate-500'}`}>
                                        RAG dışına çıkılmasını yasaklar.
                                    </div>
                                </div>
                                {selectedItem.strictFactCheck ? <ToggleRight size={26} className="text-emerald-500" /> : <ToggleLeft size={26} className="text-slate-300" />}
                            </div>

                            <div
                                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedItem.canAskFollowUp ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-black/[0.08] hover:bg-slate-50'
                                    }`}
                                onClick={() => updateAgent('canAskFollowUp', !selectedItem.canAskFollowUp)}
                            >
                                <div>
                                    <div className={`text-xs font-semibold flex items-center gap-1.5 ${selectedItem.canAskFollowUp ? 'text-indigo-700' : 'text-[var(--workspace-text)]'}`}>
                                        <Sparkles size={13} className={selectedItem.canAskFollowUp ? 'text-indigo-500' : 'text-slate-400'} />
                                        Takip Sorusu Önerisi
                                    </div>
                                    <div className={`text-[10px] mt-0.5 ${selectedItem.canAskFollowUp ? 'text-indigo-600/70' : 'text-slate-500'}`}>
                                        Cevap bitince akıllı öneriler çıkar.
                                    </div>
                                </div>
                                {selectedItem.canAskFollowUp ? <ToggleRight size={26} className="text-indigo-500" /> : <ToggleLeft size={26} className="text-slate-300" />}
                            </div>
                        </div>

                        {/* Sağ sütun: Hata yanıtı */}
                        <div>
                            <label className="block text-[10px] font-semibold text-rose-500 mb-1.5">Hata Durumu Yanıtı</label>
                            <textarea
                                value={selectedItem.errorMessage}
                                onChange={e => updateAgent('errorMessage', e.target.value)}
                                className="w-full bg-rose-50/40 border border-rose-100 text-[var(--workspace-text)] text-xs rounded-lg px-3 py-2 outline-none focus:border-rose-400 transition-all resize-none min-h-[96px]"
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
