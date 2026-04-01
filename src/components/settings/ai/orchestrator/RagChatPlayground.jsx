import React, { useState, useRef, useEffect } from 'react';
import { Bot, ShieldCheck, Database, Layers, Cpu, CheckCircle2, Loader2, Activity, Send } from 'lucide-react';

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

    const handleSend = () => {
        if (!input.trim()) return;
        const msg = input;
        setInput('');
        setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: msg }]);

        setIsSimulating(true);
        setCurrentStep(1);

        // Aşama 1: Yetki Kontrolü
        setTimeout(() => {
            setCurrentStep(2);
            // Aşama 2: Vektör Araması
            setTimeout(() => {
                setCurrentStep(3);
                // Aşama 3: Prompt Sentezi
                setTimeout(() => {
                    setCurrentStep(4);
                    // Aşama 4: LLM ve Üretim
                    setTimeout(() => {
                        setIsSimulating(false);
                        setCurrentStep(0);
                        setMessages(prev => [...prev, {
                            id: Date.now() + 1,
                            role: 'system',
                            ragSources: defaultAgent?.allowedRags || ['rag_1', 'rag_2'],
                            agentSettings: {
                                persona: defaultAgent?.persona,
                                model: defaultAgent?.model,
                                factCheck: defaultAgent?.strictFactCheck
                            },
                            text: `İşlem tamamlandı! Seçtiğiniz havuzlarda okuduğum bağlama göre sorunuzun yanıtı şudur:\n\n**${msg}** ile ilgili olarak veritabanlarındaki dökümanlara göre büyüme oranı %15 olarak hedeflenmiştir.\n\n*(Not: Arka uç (Backend) kodları bağlandığında, yukarıdaki 4 aşama gerçek API sunucunuzda koşup buraya canlı akacaktır!)*`
                        }]);
                    }, 2000);
                }, 1500);
            }, 2000);
        }, 1000);
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
                                                <div className="text-[9px] text-slate-400 font-bold uppercase">LLM Motoru & Guardrail</div>
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
                        </div>
                    ))}

                    {/* VİZYONEL BORU HATTI ANİMASYONU */}
                    {isSimulating && (
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
