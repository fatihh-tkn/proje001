import React, { useState, useRef, useEffect } from 'react';
import { Bot, ShieldCheck, Database, Layers, Cpu, CheckCircle2, Loader2, Activity, Send, Zap, Navigation, Network } from 'lucide-react';


const RagChatPlayground = ({ defaultAgent }) => {
    const [messages, setMessages] = useState([
        { id: 1, role: 'system', text: 'Ben test amaçlı Sohbet Botuyum. Gönderdiğiniz istekleri, az önce planladığımız 4 aşamalı RAG (Retrieval-Augmented Generation) boru hattından geçirerek size arka plan işleyişini göstereceğim.' }
    ]);
    const [input, setInput] = useState('');

    // Pipeline State
    const [isSimulating, setIsSimulating] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    // Step 0: None, 1: Auth, 2: RAG, 3: Synth, 4: Execute

    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, currentStep]);

    const isPromptReviser = defaultAgent?.agentKind === 'prompt_reviser';
    const isMessageReviser = defaultAgent?.agentKind === 'message_reviser';
    const isRouter = defaultAgent?.agentKind === 'router';

    const handleSend = async () => {
        if (!input.trim()) return;
        const msg = input;
        setInput('');
        setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: msg }]);

        setIsSimulating(true);

        if (isPromptReviser) {
            try {
                const res = await fetch('/api/chat/revise-prompt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: msg })
                });
                const data = await res.json();

                setIsSimulating(false);

                if (data.success) {
                    setMessages(prev => [...prev, {
                        id: Date.now() + 1,
                        role: 'system',
                        agentSettings: {
                            persona: defaultAgent?.persona,
                            model: defaultAgent?.model
                        },
                        text: `✨ Orijinal İstemi İyileştirdik:\n\n${data.revised_prompt}`
                    }]);
                } else {
                    setMessages(prev => [...prev, { id: Date.now() + 1, role: 'system', text: `Hata: ${data.error}` }]);
                }
            } catch (err) {
                console.error("Revise API Error:", err);
                setIsSimulating(false);
                setMessages(prev => [...prev, { id: Date.now() + 1, role: 'system', text: '❌ Backend servisine bağlanılamadı. İstem revize edilemedi.' }]);
            }
            return;
        }

        if (isMessageReviser) {
            try {
                const res = await fetch('/api/chat/revise-message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: msg })
                });
                const data = await res.json();

                setIsSimulating(false);

                if (data.success) {
                    setMessages(prev => [...prev, {
                        id: Date.now() + 1,
                        role: 'system',
                        agentSettings: {
                            persona: defaultAgent?.persona,
                            model: defaultAgent?.model
                        },
                        text: `📝 Taslak Metin İyileştirildi:\n\n${data.revised_message}`
                    }]);
                } else {
                    setMessages(prev => [...prev, { id: Date.now() + 1, role: 'system', text: `Hata: ${data.error}` }]);
                }
            } catch (err) {
                console.error("Revise Message API Error:", err);
                setIsSimulating(false);
                setMessages(prev => [...prev, { id: Date.now() + 1, role: 'system', text: '❌ Backend servisine bağlanılamadı. Mesaj revize edilemedi.' }]);
            }
            return;
        }

        if (isRouter) {
            try {
                const res = await fetch('/api/chat/route-action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: msg })
                });
                const data = await res.json();

                setIsSimulating(false);

                if (data.success) {
                    setMessages(prev => [...prev, {
                        id: Date.now() + 1,
                        role: 'system',
                        actionResult: data.action_result,
                        agentSettings: {
                            persona: defaultAgent?.persona,
                            model: defaultAgent?.model
                        },
                        text: ''
                    }]);
                } else {
                    setMessages(prev => [...prev, { id: Date.now() + 1, role: 'system', text: `❌ Hata: ${data.error}` }]);
                }
            } catch (err) {
                console.error("Route Action API Error:", err);
                setIsSimulating(false);
                setMessages(prev => [...prev, { id: Date.now() + 1, role: 'system', text: '❌ Backend servisine bağlanılamadı. İşlem Botu tetiklenemedi.' }]);
            }
            return;
        }


        // Genel Sohbet Asistanı RAG Akışı
        setCurrentStep(1);

        try {
            // Animasyon adımlarını backend isteği süresince göstermek için kısa simülatif geçişler
            await new Promise(r => setTimeout(r, 600));
            setCurrentStep(2);

            await new Promise(r => setTimeout(r, 600));
            setCurrentStep(3);

            await new Promise(r => setTimeout(r, 600));
            setCurrentStep(4);

            // Gerçek API ÇAĞRISI (Backend'in Sohbet Asistanı Ucu)
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: msg,
                    session_id: 'playground_test'
                })
            });

            const data = await res.json();

            setIsSimulating(false);
            setCurrentStep(0);

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'system',
                ragSources: data.rag_sources?.map(s => s.file) || [],
                agentSettings: {
                    persona: defaultAgent?.persona,
                    model: defaultAgent?.model,
                    factCheck: defaultAgent?.strictFactCheck
                },
                text: data.reply || "API'den geçerli metin dönmedi."
            }]);

        } catch (error) {
            console.error("Chat API Hatası:", error);
            setIsSimulating(false);
            setCurrentStep(0);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'system',
                text: '❌ Backend servisine bağlanılamadı. Lütfen sunucunun (Python) çalıştığından emin olun.'
            }]);
        }
    };

    return (
        <div className="flex flex-col w-full h-full p-6 animate-in fade-in duration-300 max-w-[1000px] mx-auto">
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-black/[0.05] flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
                            <Bot size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-[var(--workspace-text)]">{defaultAgent?.name || 'Sohbet Botu'} <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full ml-2">MİMARİ TEST</span></h3>
                            <p className="text-[11px] font-medium text-slate-400 mt-0.5">{defaultAgent?.persona || 'Asistan'} • Model: {defaultAgent?.model || 'gpt-4o'}</p>
                        </div>
                    </div>
                </div>

                {/* Chat Feed */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#f8fafc] custom-scrollbar">
                    {messages.map(m => (
                        <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                            {m.actionResult ? (
                                /* İşlem Botu Karar Kartı */
                                <div className="w-full max-w-[90%] bg-white border border-slate-200 rounded-2xl rounded-bl-none shadow-sm overflow-hidden">
                                    <div className="px-4 py-2.5 border-b border-slate-100 bg-violet-50/60 flex items-center gap-2">
                                        <Zap size={13} className="text-violet-500" />
                                        <span className="text-[10px] font-bold text-violet-700 uppercase tracking-widest">İşlem Botu Kararı</span>
                                        <span className={`ml-auto text-[9px] px-2 py-0.5 rounded-full font-bold ${m.actionResult.action === 'n8n' ? 'bg-orange-100 text-orange-700' :
                                                m.actionResult.action === 'ui_navigate' ? 'bg-sky-100 text-sky-700' :
                                                    'bg-slate-100 text-slate-500'
                                            }`}>
                                            {m.actionResult.action === 'n8n' ? '⚡ N8N TETKİKLENİYOR' :
                                                m.actionResult.action === 'ui_navigate' ? '📲 SAYFA YÖNLENDİRMESİ' :
                                                    '✕ AKSIYON YOK'}
                                        </span>
                                    </div>
                                    <div className="p-4 space-y-2">
                                        {m.actionResult.action === 'n8n' && (
                                            <>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <Network size={13} className="text-orange-500 shrink-0" />
                                                    <span className="text-slate-500 font-semibold">Webhook:</span>
                                                    <code className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded font-mono text-[11px] border border-orange-100">{m.actionResult.webhook}</code>
                                                </div>
                                                {m.actionResult.payload && Object.keys(m.actionResult.payload).length > 0 && (
                                                    <div className="text-[10px] font-mono bg-slate-50 border border-slate-100 rounded-lg p-2 text-slate-600 mt-1">
                                                        {JSON.stringify(m.actionResult.payload, null, 2)}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {m.actionResult.action === 'ui_navigate' && (
                                            <div className="flex items-center gap-2 text-xs">
                                                <Navigation size={13} className="text-sky-500 shrink-0" />
                                                <span className="text-slate-500 font-semibold">Hedef Sekme:</span>
                                                <code className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded font-mono text-[11px] border border-sky-100">{m.actionResult.target}</code>
                                            </div>
                                        )}
                                        {m.actionResult.action === 'none' && (
                                            <p className="text-[11px] text-slate-400 italic">Bu mesaj için tetiklenecek bir aksiyon belirlenmedi.</p>
                                        )}
                                        <div className="pt-1 border-t border-slate-100 flex items-center gap-1.5 text-[9px] text-slate-400">
                                            <span>Model: {m.agentSettings?.model}</span>
                                            <span className="mx-1">•</span>
                                            <span>{m.agentSettings?.persona}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm shadow-sm ${m.role === 'user' ? 'bg-[var(--accent)] text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
                                    }`}>
                                    {m.ragSources && m.ragSources.length > 0 && (
                                        <div className="mb-4">
                                            <div className="text-[11px] font-bold text-indigo-800 uppercase flex items-center gap-1 mb-2 border-b border-indigo-100 pb-1">
                                                <ShieldCheck size={12} /> ARKA PLAN ÖZETİ (DEBUG LOG)
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mt-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                                                <div>
                                                    <div className="text-[9px] text-slate-400 font-bold uppercase">Kimlik Mimarisi</div>
                                                    <div className="text-[10px] font-mono text-slate-700 mt-0.5">{m.agentSettings?.persona}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[9px] text-slate-400 font-bold uppercase">LLM Motoru &amp; Guardrail</div>
                                                    <div className="text-[10px] font-mono text-slate-700 mt-0.5">{m.agentSettings?.model} | Fact: {m.agentSettings?.factCheck ? 'ON' : 'OFF'}</div>
                                                </div>
                                                <div className="col-span-2">
                                                    <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Bağlantı Kurulan Havuzlar (RAG)</div>
                                                    <div className="flex gap-1.5 flex-wrap">
                                                        {m.ragSources.map((src, i) => (
                                                            <span key={i} className="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 py-0.5 rounded-md font-mono">{src}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="leading-relaxed whitespace-pre-wrap">{m.text}</div>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* VİZYONEL BORU HATTI ANİMASYONU */}
                    {isSimulating && (isPromptReviser || isMessageReviser || isRouter) && (
                        <div className="flex justify-start w-full">
                            <div className="w-full max-w-[85%] bg-white border border-slate-200 rounded-2xl rounded-bl-none p-5 text-sm shadow-sm flex items-center gap-3">
                                <Loader2 size={16} className={`animate-spin ${isRouter ? 'text-violet-500' : 'text-amber-500'}`} />
                                <span className="text-xs font-medium text-slate-600">
                                    {isPromptReviser ? `İsteminiz dönüştürülüyor (${defaultAgent?.model})...` :
                                        isMessageReviser ? `Taslak metin yeniden yazılıyor (${defaultAgent?.model})...` :
                                            `Aksiyon analiz ediliyor... (${defaultAgent?.model})`}
                                </span>
                            </div>
                        </div>
                    )}

                    {isSimulating && !isPromptReviser && !isMessageReviser && (
                        <div className="flex justify-start w-full">
                            <div className="w-full max-w-[85%] bg-white border border-slate-200 rounded-2xl rounded-bl-none p-5 text-sm shadow-sm">
                                <h4 className="text-[11px] font-bold text-[var(--accent)] uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                                    <Activity size={14} className="animate-pulse" /> SİSTEM İŞLİYOR (4 Aşama)
                                </h4>

                                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                                    {/* Aşama 1 */}
                                    <div className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group transition-all ${currentStep >= 1 ? 'opacity-100' : 'opacity-20'}`}>
                                        <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${currentStep === 1 ? 'bg-amber-400' : 'bg-emerald-500'}`}>
                                            {currentStep > 1 ? <CheckCircle2 size={12} className="text-white" /> : <Loader2 size={12} className={`text-white ${currentStep === 1 ? 'animate-spin' : ''}`} />}
                                        </div>
                                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] bg-slate-50 p-3 rounded border border-slate-100">
                                            <div className="text-[10px] font-bold text-slate-800 uppercase">Aşama 1: Yetki Sınaması</div>
                                            <div className="text-[10px] text-slate-500 mt-1 font-mono">"{defaultAgent?.name}" profili kontrol ediliyor. RAG erişimleri doğrulanıyor.</div>
                                        </div>
                                    </div>

                                    {/* Aşama 2 */}
                                    <div className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group transition-all duration-500 ${currentStep >= 2 ? 'opacity-100' : 'opacity-20 grayscale'}`}>
                                        <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${currentStep === 2 ? 'bg-amber-400' : currentStep > 2 ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                            {currentStep > 2 ? <CheckCircle2 size={12} className="text-white" /> : <Database size={10} className={`text-white ${currentStep === 2 ? 'animate-pulse' : ''}`} />}
                                        </div>
                                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] bg-slate-50 p-3 rounded border border-slate-100">
                                            <div className="text-[10px] font-bold text-slate-800 uppercase">Aşama 2: Vektörel RAG Çıkarımı</div>
                                            <div className="text-[10px] text-slate-500 mt-1 font-mono leading-relaxed">Kelime vektöre çevrildi. Top-K limiti uygulandı. {defaultAgent?.allowedRags?.length || 0} havuzda eşleşen chunk'lar çıkarılıyor...</div>
                                        </div>
                                    </div>

                                    {/* Aşama 3 */}
                                    <div className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group transition-all duration-500 ${currentStep >= 3 ? 'opacity-100' : 'opacity-20 grayscale'}`}>
                                        <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${currentStep === 3 ? 'bg-amber-400' : currentStep > 3 ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                            {currentStep > 3 ? <CheckCircle2 size={12} className="text-white" /> : <Layers size={10} className={`text-white ${currentStep === 3 ? 'animate-pulse' : ''}`} />}
                                        </div>
                                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] bg-slate-50 p-3 rounded border border-slate-100">
                                            <div className="text-[10px] font-bold text-slate-800 uppercase">Aşama 3: Prompt Sentezi</div>
                                            <div className="text-[10px] text-slate-500 mt-1 font-mono leading-relaxed">[Context] + System Prompt + Soru tek bir şablonda birleştiriliyor.</div>
                                        </div>
                                    </div>

                                    {/* Aşama 4 */}
                                    <div className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group transition-all duration-500 ${currentStep >= 4 ? 'opacity-100' : 'opacity-20 grayscale'}`}>
                                        <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${currentStep === 4 ? 'bg-[var(--accent)] animate-pulse' : 'bg-slate-300'}`}>
                                            <Cpu size={10} className="text-white" />
                                        </div>
                                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] bg-[var(--accent)]/5 p-3 rounded border border-[var(--accent)]/20">
                                            <div className="text-[10px] font-bold text-[var(--workspace-text)] uppercase">Aşama 4: LLM Sentezi</div>
                                            <div className="text-[10px] text-slate-500 mt-1 font-mono leading-relaxed">{defaultAgent?.model} modeli tetikleniyor. Yaratıcılık: {defaultAgent?.temp}...</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={endRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-100">
                    <div className="flex items-end gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-[var(--accent)]/20 focus-within:border-[var(--accent)] transition-all">
                        <textarea
                            value={input} onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder={`${defaultAgent?.name || 'Bot'} ile RAG boru hattını (Pipeline) test et...`}
                            className="flex-1 bg-transparent resize-none outline-none max-h-32 min-h-[44px] py-3 px-3 text-sm text-[var(--workspace-text)] custom-scrollbar"
                        />
                        <button onClick={handleSend} disabled={!input.trim() || isSimulating} className="mb-1 mr-1 p-3 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-all">
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RagChatPlayground;
