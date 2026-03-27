import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    Brain, Database, ShieldCheck, Power, FolderX, Link,
    Layers, Activity, Cpu, Search, ChevronRight, Save,
    User, Sliders, MessageSquareText, FileJson, CheckCircle2,
    BookOpen, Hash, AlignLeft, ToggleLeft, ToggleRight, Sparkles,
    PanelLeftClose, PanelLeftOpen, Send, Loader2, Bot
} from 'lucide-react';
import { ModelsTab } from './tabs/ModelsTab';

// --- DATA CONSTANTS ---
const PROVIDERS = [
    { id: 'openai', name: 'OpenAI (GPT-4)' },
    { id: 'anthropic', name: 'Anthropic (Claude)' },
    { id: 'gemini', name: 'Google (Gemini)' },
    { id: 'ollama', name: 'Ollama (Local)' },
];

const MODELS_BY_PROVIDER = {
    'openai': ['gpt-4o', 'gpt-4-turbo'],
    'anthropic': ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    'gemini': ['gemini-1.5-pro', 'gemini-1.5-flash'],
    'ollama': ['llama3', 'mistral', 'qwen']
};

const READ_MODES = [
    { id: 'raw', name: 'Saf Metin (Raw Extraction)' },
    { id: 'structured', name: 'Yapısal Şablon (Structured Markdown)' },
    { id: 'chunked', name: 'Parça Odaklı Analiz (Chunk-by-Chunk)' }
];

const OUTPUT_FORMATS = [
    { id: 'markdown', name: 'Standart Markdown' },
    { id: 'json', name: 'Kati JSON Verisi' },
    { id: 'plain', name: 'Düz Metin (Plain Text)' },
    { id: 'table', name: 'Tablo Ağırlıklı (Grid)' }
];

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;

const getIcon = (type) => {
    switch (type) {
        case 'rag': return <Database size={16} />;
        case 'agent': return <Brain size={16} />;
        case 'logic': return <ShieldCheck size={16} />;
        default: return <Layers size={16} />;
    }
};

/* ─── TAB 2: TOPOLOGY MAP (CANVAS) ─────────────────────────────────── */
const TopologyCanvas = ({ rags, agents }) => {
    const nodes = useMemo(() => {
        let n = [];
        n.push({ id: 'n_input', type: 'input', label: 'Kullanıcı İstemi', shape: 'box', x: 50, y: 220, color: 'blue' });

        rags.forEach((rag, idx) => {
            n.push({ id: rag.id, type: 'rag', label: rag.name, shape: 'box', x: 280, y: 120 + (idx * 160), color: 'amber', limit: 5 });
        });

        agents.forEach((agent, idx) => {
            n.push({
                id: agent.id, type: 'agent', label: agent.name, shape: 'circle',
                x: 600, y: 120 + (idx * 160), color: agent.active ? 'indigo' : 'slate',
                model: agent.model, active: agent.active
            });
            n.push({ id: `logic_${agent.id}`, type: 'logic', label: 'Çıktı Kontrolü', shape: 'diamond', x: 880, y: 120 + (idx * 160), color: 'rose' });
        });

        n.push({ id: 'n_output', type: 'output', label: 'Müşteri (UI)', shape: 'box', x: 1150, y: 220, color: 'emerald' });

        return n;
    }, [rags, agents]);

    const edges = useMemo(() => {
        let e = [];
        const activeAgents = agents.filter(a => a.active);

        rags.forEach(rag => {
            agents.forEach(agent => {
                if (agent.active && agent.allowedRags.includes(rag.id)) {
                    e.push({ id: `e_${rag.id}_${agent.id}`, source: rag.id, target: agent.id });
                }
            });
        });

        if (activeAgents.length > 0) {
            e.push({ id: `e_in_${activeAgents[0].id}`, source: 'n_input', target: activeAgents[0].id });

            for (let i = 0; i < activeAgents.length - 1; i++) {
                e.push({ id: `e_${activeAgents[i].id}_${activeAgents[i + 1].id}`, source: activeAgents[i].id, target: activeAgents[i + 1].id, label: 'Devret' });
            }

            activeAgents.forEach(agent => {
                e.push({ id: `e_${agent.id}_logic`, source: agent.id, target: `logic_${agent.id}` });
            });

            e.push({ id: `e_logic_out`, source: `logic_${activeAgents[activeAgents.length - 1].id}`, target: 'n_output', label: 'Onaylandı' });
        } else {
            e.push({ id: `e_in_out`, source: 'n_input', target: 'n_output', label: 'Agents Bypassed' });
        }

        return e;
    }, [rags, agents]);

    return (
        <div className="w-full h-full p-6 animate-in fade-in duration-300">
            <div className="w-full h-full relative bg-[#0B0F19] rounded-xl overflow-hidden shadow-sm border border-black/[0.05]">
                <style jsx>{`
                    .canvas-mesh {
                        background-image: linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
                        background-size: 40px 40px;
                    }
                    .flow-dash { stroke-dasharray: 8 16; animation: dashAnim 1.5s linear infinite; }
                    @keyframes dashAnim { to { stroke-dashoffset: -48; } }
                `}</style>
                <div className="absolute inset-0 canvas-mesh z-0"></div>

                <div className="flex-1 w-full h-full relative overflow-auto custom-scrollbar flex items-center justify-center p-12 z-10">
                    <div className="relative w-[1300px] h-[550px] shrink-0 mx-auto">
                        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                            {edges.map(edge => {
                                const sNode = nodes.find(n => n.id === edge.source);
                                const tNode = nodes.find(n => n.id === edge.target);
                                if (!sNode || !tNode) return null;
                                const x1 = sNode.x + NODE_WIDTH / 2;
                                const y1 = sNode.y + NODE_HEIGHT / 2;
                                const x2 = tNode.x + NODE_WIDTH / 2;
                                const y2 = tNode.y + NODE_HEIGHT / 2;
                                const midX = (x1 + x2) / 2;
                                return (
                                    <g key={edge.id}>
                                        <path d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`} fill="none" className="stroke-slate-700/60" strokeWidth="2" />
                                        <path d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`} fill="none" className="stroke-indigo-400 flow-dash" strokeWidth="2" strokeLinecap="round" />
                                    </g>
                                );
                            })}
                        </svg>

                        {nodes.map(node => (
                            <div key={node.id} className={`absolute flex items-center px-4 py-3 rounded-2xl bg-[#131B2A]/90 backdrop-blur-md border ${node.color === 'slate' ? 'opacity-40 grayscale border-slate-700' : 'border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]'} z-20`} style={{ left: node.x, top: node.y, width: NODE_WIDTH, height: NODE_HEIGHT }}>
                                <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mr-3 bg-indigo-500/10 text-indigo-400 border border-white/5">{getIcon(node.type)}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 opacity-80">{node.type}</div>
                                    <div className="text-xs font-semibold text-slate-200 truncate">{node.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ─── INLINE TOPOLOGY (WHITE THEME / LIGHT) ────────── */
const InlineTopologyOverview = ({ agent, rags }) => {
    const isChatbot = agent.agentKind === 'chatbot';

    return (
        <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-black/[0.05] bg-slate-50/50">
                <Activity size={14} className="text-slate-500" />
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Sistem Akış Haritası (Canlı)</span>
            </div>
            <div className="p-6 relative max-w-[800px] mx-auto flex items-center justify-between">
                {/* Yarı Saydam Grid Arka Plan */}
                <div className="absolute inset-0 pointer-events-none opacity-20" style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0,0,0,0.1) 1px, transparent 0)',
                    backgroundSize: '24px 24px'
                }}></div>

                {/* 1. KULLANICI İSTEMİ */}
                <div className={`relative z-10 flex flex-col items-center gap-2 transition-all ${!agent.active && 'opacity-50 grayscale'}`}>
                    <div className="w-12 h-12 rounded-full border border-indigo-200 bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-sm relative">
                        <User size={20} />
                        <div className="absolute -right-1 -top-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white"></div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Kullanıcı İstemi</span>
                </div>

                {/* OK 1 */}
                <div className={`flex-1 h-[2px] mx-4 relative overflow-hidden hidden sm:block ${!agent.active ? 'bg-slate-200' : 'bg-indigo-100'}`}>
                    {agent.active && (
                        <div className="absolute top-0 left-0 h-full w-10 bg-indigo-400 animate-[moveRight_1.5s_linear_infinite] shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                    )}
                </div>

                {/* 2. RAG KATMANI (Sadece Chatbotlar) */}
                {isChatbot && (
                    <>
                        <div className={`relative z-10 flex flex-col items-center gap-2 transition-all min-w-[120px] ${!agent.active && 'opacity-50 grayscale'}`}>
                            <div className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 shadow-sm w-full transition-all ${agent.allowedRags.length > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-slate-50 text-slate-400 border-dashed'}`}>
                                <Database size={20} />
                                <span className="text-[10px] font-bold uppercase text-center">{agent.allowedRags.length} Vektör Havuzu</span>
                            </div>
                        </div>

                        {/* OK 2 */}
                        <div className={`flex-1 h-[2px] mx-4 relative overflow-hidden hidden sm:block ${!agent.active ? 'bg-slate-200' : 'bg-emerald-100'}`}>
                            {agent.active && agent.allowedRags.length > 0 && (
                                <div className="absolute top-0 left-0 h-full w-10 bg-emerald-400 animate-[moveRight_1.5s_linear_infinite] shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                            )}
                        </div>
                    </>
                )}

                {/* 3. ZEKÂ MOTORU (AGENT) */}
                <div className={`relative z-10 flex flex-col items-center gap-2 transition-all ${!agent.active && 'opacity-50 grayscale'}`}>
                    <div className="w-14 h-14 rounded-2xl border border-[var(--accent)] bg-[var(--accent)] text-white flex items-center justify-center shadow-md relative">
                        {isChatbot ? <Bot size={24} /> : <Brain size={24} />}
                        <div className={`absolute -right-1 -bottom-1 w-4 h-4 rounded-full border-2 border-white ${agent.active ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-rose-400'} flex items-center justify-center`}>
                            {agent.active ? <CheckCircle2 size={10} className="text-emerald-900" /> : <Power size={10} className="text-white" />}
                        </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 uppercase">{agent.model}</span>
                </div>

                {/* OK 3 */}
                <div className={`flex-1 h-[2px] mx-4 relative overflow-hidden hidden sm:block ${!agent.active ? 'bg-slate-200' : 'bg-sky-100'}`}>
                    {agent.active && (
                        <div className="absolute top-0 left-0 h-full w-10 bg-sky-400 animate-[moveRight_1.5s_linear_infinite] shadow-[0_0_8px_rgba(56,189,248,0.8)]"></div>
                    )}
                </div>

                {/* 4. ÇIKTI (MÜŞTERİ / LOGIC) */}
                <div className={`relative z-10 flex flex-col items-center gap-2 transition-all ${!agent.active && 'opacity-50 grayscale'}`}>
                    <div className="w-12 h-12 rounded-xl border border-sky-200 bg-sky-50 flex items-center justify-center text-sky-500 shadow-sm relative">
                        <MessageSquareText size={20} />
                        {isChatbot && agent.strictFactCheck && (
                            <div className="absolute -left-2 -top-2 bg-rose-500 text-white p-0.5 rounded-md shadow-sm border border-white" title="Sıkı Doğruluk Filtrlmesi Aktif">
                                <ShieldCheck size={12} />
                            </div>
                        )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Arayüz Çıktısı</span>
                </div>

                <style jsx>{`
                    @keyframes moveRight {
                        0% { left: -40px; }
                        100% { left: 100%; }
                    }
                `}</style>
            </div>
        </div>
    );
};



/* ─── TAB 4: RAG CHAT PLAYGROUND (PIPELINE TRACER) ─────────── */
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

                    {/* YENİ: VİZYONEL BORU HATTI ANİMASYONU */}
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

/* ─── MAIN ORCHESTRATOR HUB ──────────────────────────────────────── */
const AiOrchestratorViewer = () => {
    // Top Navigation
    const [activeMainTab, setActiveMainTab] = useState('architecture');

    // UI Local State
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [activeAgentTab, setActiveAgentTab] = useState('character'); // 'character' | 'model' | 'data'

    const [rags] = useState([
        { id: 'rag_1', type: 'rag', name: 'Resmi Belgeler Öz Havuzu' },
        { id: 'rag_2', type: 'rag', name: 'Canlı Toplantılar' }
    ]);

    const DEFAULT_CHATBOT = {
        id: 'sys_agent_chatbot_001',
        type: 'agent',
        agentKind: 'chatbot',
        name: 'Genel Sohbet Asistanı',
        active: true,
        persona: 'Şirket içi bilgi asistanı',
        tone: 'professional',
        prompt: 'Kullanıcının sorularını şirket belgelerine ve veri tabanına dayanarak yanıtla. Kısa, net ve profesyonel ol.',
        negativePrompt: 'Fiyat, indirim veya kişisel tavsiye verme. Politika ve din konularına girme.',
        provider: 'openai',
        model: 'gpt-4o',
        temp: 0.5,
        maxTokens: 2048,
        outputFormat: 'markdown',
        logicCondition: '',
        allowedRags: ['rag_1'],
        readMode: 'structured',
        strictFactCheck: true,
        excludedFiles: [],
        welcomeMessage: 'Merhaba! Size nasıl yardımcı olabilirim?',
        chatHistoryLength: 10,
        canAskFollowUp: true,
        followUpCount: 2,
        avatarEmoji: '🤖',
        widgetColor: '#10b981',
        offlineMessage: '',
        errorMessage: 'Şu anda bilgiye ulaşamıyorum, lütfen daha sonra tekrar deneyin.'
    };

    const [agents, setAgents] = useState([DEFAULT_CHATBOT]);

    const [selectedItemId, setSelectedItemId] = useState('sys_agent_chatbot_001');
    const selectedItem = agents.find(agent => agent.id === selectedItemId);
    const [search, setSearch] = useState('');

    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            setHasUnsavedChanges(false);
        }, 800);
    };

    const toggleAgent = (id) => {
        setAgents(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
        setHasUnsavedChanges(true);
    };
    const updateAgent = (key, val) => {
        setAgents(prev => prev.map(a => a.id === selectedItem?.id ? { ...a, [key]: val } : a));
        setHasUnsavedChanges(true);
    };

    const toggleRagAccess = (agentId, ragId) => {
        setAgents(prev => prev.map(a => {
            if (a.id !== agentId) return a;
            const hasAccess = a.allowedRags.includes(ragId);
            return { ...a, allowedRags: hasAccess ? a.allowedRags.filter(id => id !== ragId) : [...a.allowedRags, ragId] };
        }));
        setHasUnsavedChanges(true);
    };

    // Component segmented control
    const SegmentControl = ({ options, value, onChange }) => (
        <div className="flex bg-slate-100 p-1 rounded-lg border border-black/[0.05]">
            {options.map(opt => (
                <button
                    key={opt.id}
                    onClick={() => onChange(opt.id)}
                    className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-all ${value === opt.id
                        ? 'bg-white text-[var(--workspace-text)] shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );

    /* ─── Render Sub-Tabs Content ──────────────────── */
    const renderSubTabContent = () => {
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


    /* ─── Render Root Logic ───────────────────────── */
    return (
        <div className="flex flex-col w-full h-full bg-[#f4f4f5] select-none text-[var(--workspace-text)] animate-in fade-in duration-300">
            {/* Top Level Nav Bar */}
            <div className="h-[52px] border-b border-black/[0.06] bg-white px-2 sm:px-6 flex items-center gap-2 shrink-0">
                <button onClick={() => setActiveMainTab('architecture')} className={`h-full px-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest transition-all border-b-[3px] ${activeMainTab === 'architecture' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-slate-500 hover:text-[var(--workspace-text)]'}`}><Layers size={14} /> Mimari Merkezi</button>
                <button onClick={() => setActiveMainTab('topology')} className={`h-full px-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest transition-all border-b-[3px] ${activeMainTab === 'topology' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-[var(--workspace-text)]'}`}><Activity size={14} /> Topoloji Haritası</button>
                <button onClick={() => setActiveMainTab('models')} className={`h-full px-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest transition-all border-b-[3px] ${activeMainTab === 'models' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-[var(--workspace-text)]'}`}><Cpu size={14} /> Zekâ Kaynakları</button>
                <button onClick={() => setActiveMainTab('playground')} className={`h-full px-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest transition-all border-b-[3px] ml-auto ${activeMainTab === 'playground' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-[var(--workspace-text)]'}`}><MessageSquareText size={14} /> Playground (Test Terminali)</button>
            </div>

            <div className="flex-1 overflow-hidden">
                {activeMainTab === 'architecture' && (
                    <div className="flex w-full h-full overflow-hidden p-6 gap-6 max-w-[1600px] mx-auto transition-all duration-500">

                        {/* LEFT SIDEBAR (Collapsible) */}
                        <div className={`shrink-0 flex flex-col bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-[72px]' : 'w-[320px]'}`}>
                            <div className="px-4 py-3 border-b border-black/[0.05] bg-slate-50/50 flex items-center justify-between shrink-0 h-[56px]">
                                {!sidebarCollapsed && (
                                    <div className="relative flex-1 opacity-100 transition-opacity duration-200">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
                                        <input
                                            className="w-full pl-8 pr-2 py-1.5 bg-white border border-black/[0.08] rounded-md text-[11px] text-[var(--workspace-text)] shadow-sm placeholder:text-slate-400 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                                            placeholder="Ajan ara..."
                                            value={search} onChange={(e) => setSearch(e.target.value)}
                                        />
                                    </div>
                                )}
                                <button
                                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                    className={`p-1.5 text-slate-400 hover:text-[var(--accent)] rounded-md hover:bg-slate-100 transition-colors ${sidebarCollapsed ? 'mx-auto' : 'ml-2'}`}
                                >
                                    {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto py-3 space-y-1 custom-scrollbar">
                                {!sidebarCollapsed && (
                                    <div className="px-5 pb-2 flex items-center justify-between">
                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Workflow Agents</div>
                                    </div>
                                )}
                                {agents.filter(a => a.name.toLowerCase().includes(search.toLowerCase())).map(agent => {
                                    const isSelected = selectedItemId === agent.id;
                                    return (
                                        <div
                                            key={agent.id}
                                            onClick={() => setSelectedItemId(agent.id)}
                                            className={`group cursor-pointer transition-all duration-200 overflow-hidden rounded-lg mx-2 ${isSelected ? 'bg-[var(--accent)]/5 shadow-sm ring-1 ring-[var(--accent)]/20' : 'hover:bg-slate-50'}`}
                                            title={sidebarCollapsed ? agent.name : ''}
                                        >
                                            <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'p-2 justify-center' : 'px-3 py-2.5'}`}>
                                                <div className="relative shrink-0">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200 ${isSelected ? 'bg-[var(--accent)] text-white' : 'bg-white border border-black/[0.05] text-slate-500'}`}>
                                                        {agent.agentKind === 'chatbot' ? <Bot size={18} /> : <Brain size={18} />}
                                                    </div>
                                                    <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${agent.active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                                </div>
                                                {!sidebarCollapsed && (
                                                    <div className="flex-1 min-w-0 opacity-100 transition-opacity">
                                                        <p className={`text-[12px] font-bold truncate transition-colors duration-200 ${isSelected ? 'text-[var(--accent)]' : 'text-slate-700'}`}>{agent.name}</p>
                                                        <p className="text-[10px] font-medium truncate mt-0.5 text-slate-400">{agent.persona}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>


                        {/* RIGHT DETAIL PANEL */}
                        <div className="flex-1 flex flex-col gap-4 overflow-hidden transition-all duration-300">
                            {selectedItem ? (
                                <>
                                    {/* ── KUTU 0: Mini Sistem Topolojisi (Standalone Box) ── */}
                                    <div className="shrink-0">
                                        <InlineTopologyOverview agent={selectedItem} rags={rags} />
                                    </div>

                                    {/* ── KUTU 1..N: Ajan Konfigürasyon Paneli ── */}
                                    <div className="flex-1 flex flex-col bg-white border border-slate-200/80 rounded-xl shadow-[0_2px_18px_rgba(0,0,0,0.03)] overflow-hidden">
                                        <div className="flex flex-col h-full relative">

                                            {/* Agent Header */}
                                            <div className="px-8 py-5 border-b border-black/[0.05] flex items-center justify-between shrink-0">
                                                <div className="min-w-0 flex-1">
                                                    <input
                                                        type="text" value={selectedItem.name} onChange={(e) => updateAgent('name', e.target.value)}
                                                        className="text-xl font-bold text-[var(--workspace-text)] bg-transparent outline-none border-b border-transparent focus:border-[var(--accent)]/40 w-full truncate transition-colors"
                                                    />
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedItem.active ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                            {selectedItem.active ? 'Online & Routed' : 'Bypassed (Sleeping)'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0 ml-4">
                                                    <button
                                                        onClick={handleSave}
                                                        disabled={!hasUnsavedChanges || isSaving}
                                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all min-w-[140px] justify-center ${isSaving ? 'bg-indigo-100 text-indigo-400 border-indigo-200 cursor-not-allowed' :
                                                            hasUnsavedChanges ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 shadow-md ring-2 ring-indigo-500/30' :
                                                                'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                                                            }`}
                                                    >
                                                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                        {isSaving ? 'Kaydediliyor' : hasUnsavedChanges ? 'Sisteme Kaydet' : 'Kaydedildi'}
                                                    </button>

                                                    <button onClick={() => toggleAgent(selectedItem.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm ${selectedItem.active ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100' : 'bg-[var(--accent)] text-white border border-[var(--accent-hover)] hover:bg-[var(--accent-hover)]'}`}>
                                                        <Power size={14} /> {selectedItem.active ? 'Pasife Al' : 'Aktifleştir'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Tek sekme kaldığı için navigasyon barı kaldırıldı */}

                                            {/* Tab Content Container */}
                                            <div className={`flex-1 overflow-y-auto p-8 custom-scrollbar ${!selectedItem.active && 'opacity-60 grayscale-[0.2] pointer-events-none transition-all'}`}>
                                                {renderSubTabContent()}
                                            </div>

                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-[var(--sidebar-text-muted)] p-8 bg-white border border-slate-200/80 rounded-xl shadow-sm">
                                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center border border-black/[0.05]">
                                        <Bot size={28} className="text-slate-300" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-slate-600 mb-1">Sol panelden bir ajan seçin</p>
                                        <p className="text-[11px] text-slate-400 max-w-[240px] leading-relaxed">
                                            Ajanlar sistem tarafından yönetilmektedir. Yapılandırmak için sol listeden bir ajan seçin.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {activeMainTab === 'topology' && <TopologyCanvas rags={rags} agents={agents} />}
                {activeMainTab === 'models' && <ModelsTab />}
                {activeMainTab === 'playground' && <RagChatPlayground defaultAgent={selectedItem} />}
            </div>
        </div>
    );
};

export default AiOrchestratorViewer;
