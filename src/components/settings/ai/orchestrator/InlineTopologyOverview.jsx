import React, { useState } from 'react';
import { User, Database, Bot, Brain, CheckCircle2, Power, MessageSquareText, ShieldCheck, X, FileJson } from 'lucide-react';
import ApiPayloadPreview from './ApiPayloadPreview';

const InlineTopologyOverview = ({ agent, rags, onOpenPayload }) => {
    const [showPopup, setShowPopup] = useState(false);
    const isChatbot = agent.agentKind === 'chatbot';

    const hasRags = Array.isArray(agent.allowedRags) && agent.allowedRags.length > 0;
    const ragCount = Array.isArray(agent.allowedRags) ? agent.allowedRags.length : 0;

    const handlePayloadClick = () => {
        setShowPopup(prev => !prev);
        if (onOpenPayload) onOpenPayload(); // Yukarıya da bildir (isFlowExpanded vs.)
    };

    return (
        <div className="w-full relative flex items-center justify-center pt-2 pb-6 shrink-0">
            {/* Konteyner yatay esneklik */}
            <div className="relative flex items-center justify-center gap-1 sm:gap-4 md:gap-8 w-full max-w-4xl mx-auto px-4">

                {/* 1. KULLANICI İSTEMİ (TIKLANABİLİR BUTON) */}
                <div className="relative shrink-0">
                    <div
                        title="API Payload'u Görüntüle"
                        onClick={handlePayloadClick}
                        className={`relative z-10 flex flex-col items-center gap-2 transition-all duration-500 cursor-pointer ${!agent.active && 'opacity-40 grayscale'} group`}
                    >
                        <div className={`w-12 h-12 rounded-2xl border bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-md relative transition-all ring-4 ${showPopup ? 'border-indigo-500 bg-indigo-50 ring-indigo-500/15 -translate-y-1' : 'border-indigo-200/60 text-indigo-600 group-hover:border-indigo-400 group-hover:bg-indigo-50 group-hover:-translate-y-1 ring-transparent group-hover:ring-indigo-500/10'} text-indigo-600`}>
                            <User size={18} className="group-hover:scale-110 transition-transform" />
                            <div className="absolute -right-1 -top-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                                <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                            </div>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-widest block px-2 py-0.5 rounded-full border transition-all ${showPopup ? 'text-indigo-700 bg-indigo-100 border-indigo-200' : 'text-indigo-600 bg-indigo-50 border-indigo-100'}`}>Payload</span>
                    </div>

                    {/* ── BAĞLANTILI POPUP ── */}
                    {showPopup && (
                        <div className="absolute left-full top-1/2 -translate-y-[55%] ml-5 z-50 w-[340px] rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)] flex flex-col animate-in zoom-in-95 slide-in-from-left-2 fade-in duration-200 origin-left overflow-y-auto max-h-[75vh] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

                            {/* Bağlantı Oku */}
                            <div className="absolute -left-[7px] top-[45%] w-3.5 h-3.5 bg-white border-l border-b border-slate-200/80 rotate-45 rounded-sm shadow-[-2px_2px_4px_rgba(0,0,0,0.04)]"></div>

                            <ApiPayloadPreview agent={agent} rags={rags} />
                        </div>
                    )}
                </div>

                {/* YOL 1 */}
                <div className={`flex-1 max-w-[80px] h-[3px] relative overflow-hidden hidden sm:block rounded-full shadow-sm ${!agent.active ? 'bg-slate-200/50' : 'bg-indigo-100'}`}>
                    {agent.active && (
                        <div className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-[flowRight_2s_ease-in-out_infinite] shadow-[0_0_6px_rgba(99,102,241,0.6)]"></div>
                    )}
                </div>

                {/* 2. RAG KATMANI (Sadece Chatbotlar) */}
                {isChatbot && (
                    <>
                        <div className={`relative z-10 flex flex-col items-center gap-2 transition-all duration-500 shrink-0 ${!agent.active && 'opacity-40 grayscale'}`}>
                            <div className={`w-[130px] py-2.5 px-2 rounded-2xl flex items-center justify-center gap-3 shadow-sm relative group hover:-translate-y-0.5 transition-all ${hasRags ? 'bg-emerald-50/80 backdrop-blur-sm border border-emerald-200/60' : 'bg-slate-50/50 border border-slate-200/50 border-dashed text-slate-400'}`}>
                                <div className={`p-2 rounded-xl shrink-0 ${hasRags ? 'bg-emerald-100/60 text-emerald-600' : 'bg-slate-100/50 text-slate-400'}`}>
                                    <Database size={14} />
                                </div>
                                <div className="text-left">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider block truncate ${hasRags ? 'text-emerald-800' : 'text-slate-500'}`}>Vektörler</span>
                                    <span className={`text-[9px] font-mono font-medium block ${hasRags ? 'text-emerald-600' : 'text-slate-400'}`}>{ragCount} Kaynak</span>
                                </div>
                            </div>
                        </div>

                        {/* YOL 2 */}
                        <div className={`flex-1 max-w-[80px] h-[3px] relative overflow-hidden hidden sm:block rounded-full shadow-sm ${!agent.active ? 'bg-slate-200/50' : 'bg-emerald-100'}`}>
                            {agent.active && hasRags && (
                                <div className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-[flowRight_2s_ease-in-out_infinite_0.5s] shadow-[0_0_6px_rgba(16,185,129,0.6)]"></div>
                            )}
                        </div>
                    </>
                )}

                {/* 3. ZEKÂ MOTORU (AGENT) */}
                <div className={`relative z-10 flex flex-col items-center gap-2 transition-all duration-500 shrink-0 ${!agent.active && 'opacity-40 grayscale'}`}>
                    <div className="w-14 h-14 rounded-2xl border border-[var(--accent)] bg-gradient-to-br from-[var(--accent)] to-indigo-700 text-white flex items-center justify-center shadow-[0_4px_16px_rgba(99,102,241,0.25)] relative group hover:scale-110 transition-transform">
                        {isChatbot ? <Bot size={24} /> : <Brain size={24} />}
                        <div className={`absolute -right-2 -bottom-2 w-5 h-5 rounded-full border-2 border-white ${agent.active ? 'bg-emerald-500 shadow-sm' : 'bg-slate-400'} flex items-center justify-center`}>
                            {agent.active ? <CheckCircle2 size={12} className="text-white" /> : <Power size={10} className="text-white" />}
                        </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block truncate max-w-[120px]">{agent.model}</span>
                </div>

                {/* YOL 3 */}
                <div className={`flex-1 max-w-[80px] h-[3px] relative overflow-hidden hidden sm:block rounded-full shadow-sm ${!agent.active ? 'bg-slate-200/50' : 'bg-sky-100'}`}>
                    {agent.active && (
                        <div className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-sky-500 to-transparent animate-[flowRight_2s_ease-in-out_infinite_1s] shadow-[0_0_6px_rgba(14,165,233,0.6)]"></div>
                    )}
                </div>

                {/* 4. ÇIKTI (MÜŞTERİ / LOGIC) */}
                <div className={`relative z-10 flex flex-col items-center gap-2 transition-all duration-500 shrink-0 ${!agent.active && 'opacity-40 grayscale'}`}>
                    <div className="w-12 h-12 rounded-2xl border border-sky-200/60 bg-sky-50/80 backdrop-blur-sm flex items-center justify-center text-sky-600 shadow-sm relative group hover:border-sky-300 transition-all">
                        <MessageSquareText size={18} className="group-hover:scale-110 transition-transform" />
                        {isChatbot && agent.strictFactCheck && (
                            <div className="absolute -left-2 -top-2 bg-rose-500 text-white p-1 rounded-lg shadow-sm border-2 border-white flex items-center" title="Sıkı Doğruluk Aktif">
                                <ShieldCheck size={10} />
                            </div>
                        )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Çıktı</span>
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes flowRight {
                        0% { left: -50%; opacity: 0; }
                        50% { opacity: 1; }
                        100% { left: 100%; opacity: 0; }
                    }
                `}} />
            </div>
        </div>
    );
};

export default InlineTopologyOverview;
