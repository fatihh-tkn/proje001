import React from 'react';
import { FileJson } from 'lucide-react';

const ApiPayloadPreview = ({ agent, rags }) => {
    const isChatbot = agent.agentKind === 'chatbot';
    const ragNames = agent.allowedRags.map(id => rags.find(r => r.id === id)?.name || id);

    return (
        <div className="relative flex flex-col h-full bg-white">
            {/* Code Content */}
            <div className="p-5 sm:p-6 pb-10 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] font-mono text-[10.5px] leading-relaxed text-slate-600 relative">
                <div className="relative z-10">
                    <span className="text-slate-400">{"{"}</span>

                    <div className="pl-4">
                        <div className="flex transition-colors duration-300">
                            <span className="text-indigo-600">"model"</span>
                            <span className="text-slate-400 mx-1">:</span>
                            <span className="text-emerald-600">"{agent.model}"</span>
                            <span className="text-slate-400">,</span>
                        </div>

                        <div className="flex transition-colors duration-300">
                            <span className="text-indigo-600">"system_role"</span>
                            <span className="text-slate-400 mx-1">:</span>
                            <span className="text-emerald-600 truncate max-w-[150px] inline-block align-bottom" title={agent.persona}>"{agent.persona || 'Bilinmiyor'}"</span>
                            <span className="text-slate-400">,</span>
                        </div>

                        {isChatbot && (
                            <div className="flex transition-colors duration-300">
                                <span className="text-indigo-600">"memory_window"</span>
                                <span className="text-slate-400 mx-1">:</span>
                                <span className="text-amber-600">{agent.chatHistoryLength}</span>
                                <span className="text-slate-400">,</span>
                            </div>
                        )}

                        <div className="mt-2 text-indigo-600">"parameters"<span className="text-slate-400 mx-1">:</span><span className="text-slate-400">{"{"}</span></div>
                        <div className="pl-4">
                            <div className="flex transition-colors duration-300">
                                <span className="text-indigo-600">"temperature"</span>
                                <span className="text-slate-400 mx-1">:</span>
                                <span className="text-amber-600">{typeof agent.temp === 'string' ? 0.7 : agent.temp.toFixed(1)}</span>
                                <span className="text-slate-400">,</span>
                            </div>
                            <div className="flex transition-colors duration-300">
                                <span className="text-indigo-600">"max_tokens"</span>
                                <span className="text-slate-400 mx-1">:</span>
                                <span className="text-amber-600">{agent.maxTokens}</span>
                            </div>
                        </div>
                        <div><span className="text-slate-400">{"}"}</span><span className="text-slate-400">{(isChatbot || agent.strictFactCheck) ? ',' : ''}</span></div>

                        {isChatbot && (
                            <>
                                <div className="mt-2 text-indigo-600">"rag_context"<span className="text-slate-400 mx-1">:</span><span className="text-slate-400">{"["}</span></div>
                                <div className="pl-4">
                                    {ragNames.length === 0 ? (
                                        <span className="text-slate-400 italic">// Havuz yok</span>
                                    ) : (
                                        ragNames.map((name, i) => (
                                            <div key={i} className="flex transition-colors duration-300 truncate w-full" title={name}>
                                                <span className="text-emerald-600 shrink-0">"{name}"</span>
                                                <span className="text-slate-400">{i < ragNames.length - 1 ? ',' : ''}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div><span className="text-slate-400">{"]"}</span><span className="text-slate-400">,</span></div>
                            </>
                        )}

                        {isChatbot && (
                            <div className="mt-2 text-indigo-600">"guardrails"<span className="text-slate-400 mx-1">:</span><span className="text-slate-400">{"{"}</span></div>
                        )}
                        {isChatbot && (
                            <div className="pl-4">
                                <div className="flex transition-colors duration-300">
                                    <span className="text-indigo-600">"strict_fact_check"</span>
                                    <span className="text-slate-400 mx-1">:</span>
                                    <span className="text-amber-600">{agent.strictFactCheck ? 'true' : 'false'}</span>
                                </div>
                            </div>
                        )}
                        {isChatbot && (
                            <div><span className="text-slate-400">{"}"}</span></div>
                        )}
                    </div>

                    <span className="text-slate-400">{"}"}</span>
                </div>
            </div>
            {/* Alt Bilgi */}
            <div className="absolute bottom-3 right-4 flex items-center gap-1.5 opacity-50 z-20">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-[9.5px] font-mono text-emerald-600 font-semibold">Canlı Senkron</span>
            </div>
        </div>
    );
};

export default ApiPayloadPreview;
