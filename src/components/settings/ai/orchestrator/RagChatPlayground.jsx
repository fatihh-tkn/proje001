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
            <div className="bg-white border border-stone-200 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
                            <Bot size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-stone-700 tracking-tight">{defaultAgent?.name || 'Sohbet Botu'} <span className="text-[10px] bg-[#EAF3DE] text-[#3B6D11] border border-[#3B6D11]/20 px-2 py-0.5 rounded-full ml-2">MİMARİ TEST</span></h3>
                            <p className="text-[11px] font-bold text-stone-400 mt-0.5">{defaultAgent?.persona || 'Asistan'} • Model: {defaultAgent?.model || 'gpt-4o'}</p>
                        </div>
                    </div>
                </div>

                {/* Chat Feed */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white custom-scrollbar">
                    {messages.map(m => (
                        <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                            {m.actionResult ? (
                                /* İşlem Botu Karar Kartı */
                                <div className="w-full max-w-[90%] bg-stone-50 border border-stone-200 rounded-2xl rounded-bl-none shadow-sm overflow-hidden">
                                    <div className="px-4 py-2.5 border-b border-stone-100 bg-[#E8E8FA]/60 flex items-center gap-2">
                                        <Zap size={14} className="text-[#6C6CDB]" strokeWidth={2.5} />
                                        <span className="text-[10px] font-black text-[#4E4EBA] uppercase tracking-widest">İşlem Botu Kararı</span>
                                        <span className={`ml-auto text-[9px] px-2 py-0.5 rounded-full font-bold border tracking-tight ${m.actionResult.action === 'n8n' ? 'bg-[#FFF0E0] text-[#B86200] border-[#B86200]/20' :
                                            m.actionResult.action === 'ui_navigate' ? 'bg-[#E3F2FD] text-[#0D47A1] border-[#0D47A1]/20' :
                                                'bg-stone-100 text-stone-500 border-stone-200'
                                            }`}>
                                            {m.actionResult.action === 'n8n' ? '⚡ N8N TETİKLENİYOR' :
                                                m.actionResult.action === 'ui_navigate' ? '📲 SAYFA YÖNLENDİRMESİ' :
                                                    '✕ AKSİYON YOK'}
                                        </span>
                                    </div>
                                    <div className="p-4 space-y-2">
                                        {m.actionResult.action === 'n8n' && (
                                            <>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <Network size={14} className="text-[#B86200] shrink-0" strokeWidth={2.5} />
                                                    <span className="text-stone-500 font-bold tracking-tight">Webhook:</span>
                                                    <code className="bg-[#FFF0E0] text-[#B86200] px-2 py-0.5 rounded font-mono text-[11px] border border-[#B86200]/20">{m.actionResult.webhook}</code>
                                                </div>
                                                {m.actionResult.payload && Object.keys(m.actionResult.payload).length > 0 && (
                                                    <div className="text-[10px] font-mono bg-white border border-stone-200 shadow-sm rounded-lg p-2 text-stone-600 mt-1">
                                                        {JSON.stringify(m.actionResult.payload, null, 2)}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {m.actionResult.action === 'ui_navigate' && (
                                            <div className="flex items-center gap-2 text-xs">
                                                <Navigation size={14} className="text-[#0D47A1] shrink-0" strokeWidth={2.5} />
                                                <span className="text-stone-500 font-bold tracking-tight">Hedef Sekme:</span>
                                                <code className="bg-[#E3F2FD] text-[#0D47A1] px-2 py-0.5 rounded font-mono text-[11px] border border-[#0D47A1]/20">{m.actionResult.target}</code>
                                            </div>
                                        )}
                                        {m.actionResult.action === 'none' && (
                                            <p className="text-[11px] text-stone-400 italic">Bu mesaj için tetiklenecek bir aksiyon belirlenmedi.</p>
                                        )}
                                        <div className="pt-2 mt-2 border-t border-stone-200 flex items-center gap-1.5 text-[10px] font-bold tracking-tight text-stone-400">
                                            <span>Model: {m.agentSettings?.model}</span>
                                            <span className="mx-1">•</span>
                                            <span>{m.agentSettings?.persona}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm/relaxed shadow-sm font-medium ${m.role === 'user' ? 'bg-stone-800 text-stone-50 rounded-br-none' : 'bg-stone-50 border border-stone-200 text-stone-700 rounded-bl-none'
                                    }`}>
                                    {m.ragSources && m.ragSources.length > 0 && (
                                        <div className="mb-4">
                                            <div className="text-[10px] font-black text-[#378ADD] uppercase tracking-widest flex items-center gap-2 mb-2 border-b border-stone-200 pb-2">
                                                <ShieldCheck size={14} strokeWidth={2.5} /> ARKA PLAN ÖZETİ (DEBUG LOG)
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 mt-3 bg-white border border-stone-200 shadow-sm rounded-xl p-3">
                                                <div>
                                                    <div className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Kimlik Mimarisi</div>
                                                    <div className="text-[10px] font-mono text-stone-700 mt-1">{m.agentSettings?.persona}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">LLM Motoru &amp; Guardrail</div>
                                                    <div className="text-[10px] font-mono text-stone-700 mt-1">{m.agentSettings?.model} | Fact: {m.agentSettings?.factCheck ? 'ON' : 'OFF'}</div>
                                                </div>
                                                <div className="col-span-2">
                                                    <div className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-1.5">Bağlantı Kurulan Havuzlar (RAG)</div>
                                                    <div className="flex gap-1.5 flex-wrap">
                                                        {m.ragSources.map((src, i) => (
                                                            <span key={i} className="text-[10px] font-bold bg-[#378ADD]/10 border border-[#378ADD]/20 text-[#378ADD] px-2 py-0.5 rounded-md tracking-tight font-mono">{src}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="whitespace-pre-wrap">{m.text}</div>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* VİZYONEL BORU HATTI ANİMASYONU */}
                    {isSimulating && (isPromptReviser || isMessageReviser || isRouter) && (
                        <div className="flex justify-start w-full">
                            <div className="w-full max-w-[85%] bg-white border border-stone-200 rounded-2xl rounded-bl-none p-5 text-sm shadow-sm flex items-center gap-3">
                                <Loader2 size={18} strokeWidth={2.5} className={`animate-spin ${isRouter ? 'text-[#6C6CDB]' : 'text-stone-400'}`} />
                                <span className="text-xs font-bold text-stone-600 tracking-tight">
                                    {isPromptReviser ? `İsteminiz dönüştürülüyor (${defaultAgent?.model})...` :
                                        isMessageReviser ? `Taslak metin yeniden yazılıyor (${defaultAgent?.model})...` :
                                            `Aksiyon analiz ediliyor... (${defaultAgent?.model})`}
                                </span>
                            </div>
                        </div>
                    )}

                    {isSimulating && !isPromptReviser && !isMessageReviser && (
                        <div className="flex justify-start w-full">
                            <div className="w-full max-w-[85%] bg-white border border-stone-200 rounded-2xl rounded-bl-none p-5 text-sm shadow-sm">
                                <h4 className="text-[10px] font-black text-stone-700 uppercase tracking-widest flex items-center gap-2 border-b border-stone-100 pb-3 mb-5">
                                    <Activity size={14} className="text-[#378ADD] animate-pulse" strokeWidth={2.5} /> SİSTEM İŞLİYOR (4 Aşama)
                                </h4>

                                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[13px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-[2px] before:bg-gradient-to-b before:from-transparent before:via-stone-200 before:to-transparent">
                                    {/* Aşama 1 */}
                                    <div className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group transition-all ${currentStep >= 1 ? 'opacity-100' : 'opacity-20'}`}>
                                        <div className={`flex items-center justify-center w-7 h-7 rounded-full border-[3px] border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${currentStep === 1 ? 'bg-[#EF9F27]' : 'bg-[#3B6D11]'}`}>
                                            {currentStep > 1 ? <CheckCircle2 size={12} strokeWidth={3} className="text-white" /> : <Loader2 size={12} strokeWidth={3} className={`text-white ${currentStep === 1 ? 'animate-spin' : ''}`} />}
                                        </div>
                                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.75rem)] bg-stone-50 p-3 rounded-lg border border-stone-200">
                                            <div className="text-[10px] font-black tracking-widest text-stone-700 uppercase">Aşama 1: Yetki Sınaması</div>
                                            <div className="text-[11px] font-semibold tracking-tight text-stone-500 mt-1 font-mono">"{defaultAgent?.name}" profili kontrol ediliyor. RAG erişimleri doğrulanıyor.</div>
                                        </div>
                                    </div>

                                    {/* Aşama 2 */}
                                    <div className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group transition-all duration-500 ${currentStep >= 2 ? 'opacity-100' : 'opacity-20 grayscale'}`}>
                                        <div className={`flex items-center justify-center w-7 h-7 rounded-full border-[3px] border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${currentStep === 2 ? 'bg-[#EF9F27]' : currentStep > 2 ? 'bg-[#3B6D11]' : 'bg-stone-300'}`}>
                                            {currentStep > 2 ? <CheckCircle2 size={12} strokeWidth={3} className="text-white" /> : <Database size={10} strokeWidth={3} className={`text-white ${currentStep === 2 ? 'animate-pulse' : ''}`} />}
                                        </div>
                                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.75rem)] bg-stone-50 p-3 rounded-lg border border-stone-200">
                                            <div className="text-[10px] font-black tracking-widest text-stone-700 uppercase">Aşama 2: Vektörel RAG Çıkarımı</div>
                                            <div className="text-[11px] font-semibold tracking-tight text-stone-500 mt-1 font-mono leading-relaxed">Kelime vektöre çevrildi. Top-K limiti uygulandı. {defaultAgent?.allowedRags?.length || 0} havuzda eşleşen parçalar çıkarılıyor...</div>
                                        </div>
                                    </div>

                                    {/* Aşama 3 */}
                                    <div className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group transition-all duration-500 ${currentStep >= 3 ? 'opacity-100' : 'opacity-20 grayscale'}`}>
                                        <div className={`flex items-center justify-center w-7 h-7 rounded-full border-[3px] border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${currentStep === 3 ? 'bg-[#EF9F27]' : currentStep > 3 ? 'bg-[#3B6D11]' : 'bg-stone-300'}`}>
                                            {currentStep > 3 ? <CheckCircle2 size={12} strokeWidth={3} className="text-white" /> : <Layers size={10} strokeWidth={3} className={`text-white ${currentStep === 3 ? 'animate-pulse' : ''}`} />}
                                        </div>
                                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.75rem)] bg-stone-50 p-3 rounded-lg border border-stone-200">
                                            <div className="text-[10px] font-black tracking-widest text-stone-700 uppercase">Aşama 3: İstem Sentezi</div>
                                            <div className="text-[11px] font-semibold tracking-tight text-stone-500 mt-1 font-mono leading-relaxed">[Context] + System Prompt + Soru birleştiriliyor.</div>
                                        </div>
                                    </div>

                                    {/* Aşama 4 */}
                                    <div className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group transition-all duration-500 ${currentStep >= 4 ? 'opacity-100' : 'opacity-20 grayscale'}`}>
                                        <div className={`flex items-center justify-center w-7 h-7 rounded-full border-[3px] border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${currentStep === 4 ? 'bg-[#378ADD] animate-pulse' : 'bg-stone-300'}`}>
                                            <Cpu size={12} strokeWidth={3} className="text-white" />
                                        </div>
                                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.75rem)] bg-[#378ADD]/10 p-3 rounded-lg border border-[#378ADD]/20">
                                            <div className="text-[10px] font-black tracking-widest text-[#378ADD] uppercase">Aşama 4: LLM Sentezi</div>
                                            <div className="text-[11px] font-bold tracking-tight text-stone-600 mt-1 font-mono leading-relaxed">{defaultAgent?.model} tetikleniyor. Yaratıcılık: {defaultAgent?.temp}...</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={endRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-stone-200">
                    <div className="flex items-end gap-3 bg-stone-50 border border-stone-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-stone-400/20 focus-within:border-stone-400 transition-all">
                        <textarea
                            value={input} onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder={`${defaultAgent?.name || 'Bot'} ile RAG boru hattını (Pipeline) test et...`}
                            className="flex-1 bg-transparent resize-none outline-none max-h-32 min-h-[44px] py-3 px-3 text-sm font-medium text-stone-700 custom-scrollbar placeholder:text-stone-400"
                        />
                        <button onClick={handleSend} disabled={!input.trim() || isSimulating} className="mb-1 mr-1 p-3 bg-stone-800 text-white rounded-lg hover:bg-stone-700 disabled:bg-stone-300 disabled:text-stone-500 transition-all focus:outline-none focus:ring-2 focus:ring-stone-500/30">
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RagChatPlayground;
