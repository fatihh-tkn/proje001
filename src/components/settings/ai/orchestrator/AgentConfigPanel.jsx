import React from 'react';
import { User, Hash, AlignLeft, ShieldCheck, Database, CheckCircle2, ToggleRight, ToggleLeft, Sparkles } from 'lucide-react';
import { PROVIDERS, MODELS_BY_PROVIDER } from './constants';

const AgentConfigPanel = ({ selectedItem, rags, updateAgent, toggleRagAccess }) => {
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
                        <label className="block text-[10px] font-semibold text-slate-500 mb-2">Zekâ Modeli</label>
                        <select
                            value={selectedItem.model} onChange={(e) => updateAgent('model', e.target.value)}
                            className="w-full bg-slate-50 border border-black/[0.08] text-[var(--workspace-text)] text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:border-[var(--accent)] cursor-pointer font-mono transition-all"
                        >
                            {PROVIDERS.map(p => (
                                <optgroup key={p.id} label={p.name}>
                                    {MODELS_BY_PROVIDER[p.id]?.map(m => <option key={m} value={m}>{m}</option>)}
                                </optgroup>
                            ))}
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
                                return (
                                    <div
                                        key={rag.id}
                                        onClick={() => toggleRagAccess(selectedItem.id, rag.id)}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-all ${hasAccess
                                            ? 'bg-white border-[var(--accent)] text-[var(--workspace-text)] font-semibold shadow-sm'
                                            : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'
                                            }`}
                                    >
                                        {hasAccess
                                            ? <CheckCircle2 size={14} className="text-[var(--accent)] shrink-0" />
                                            : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 shrink-0" />}
                                        {rag.name}
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
