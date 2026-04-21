import React from 'react';
import { FileJson } from 'lucide-react';

const ApiPayloadPreview = ({ agent, rags = [], isUser = false }) => {
    if (!agent) return null;

    const isChatbot = agent.agentKind === 'chatbot';
    const ragNames = agent.allowedRags ? agent.allowedRags.map(id => rags.find(r => r.id === id)?.name || id) : [];

    if (isUser) {
        return (
            <div className="relative flex flex-col h-full bg-white rounded-b-xl">
                <div className="p-5 overflow-y-auto font-mono text-[11px] leading-relaxed text-stone-600 font-medium">
                    <span className="text-stone-300">{"{"}</span>
                    <div className="pl-4">
                        <div className="flex transition-colors duration-300">
                            <span className="text-[#378ADD]">"role"</span>
                            <span className="text-stone-300 mx-1">:</span>
                            <span className="text-[#1D9E75]">"user"</span>
                            <span className="text-stone-300">,</span>
                        </div>
                        <div className="flex transition-colors duration-300">
                            <span className="text-[#378ADD]">"content"</span>
                            <span className="text-stone-300 mx-1">:</span>
                            <span className="text-[#1D9E75]">"Bana 2024 Ciro Raporu'nu analiz et."</span>
                        </div>
                    </div>
                    <span className="text-stone-300">{"}"}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex flex-col h-full bg-white">
            {/* Code Content */}
            <div className="p-5 sm:p-6 pb-10 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] font-mono text-[11px] font-medium leading-relaxed text-stone-600 relative">
                <div className="relative z-10">
                    <span className="text-stone-300">{"{"}</span>

                    <div className="pl-4">
                        <div className="flex transition-colors duration-300">
                            <span className="text-[#378ADD]">"model"</span>
                            <span className="text-stone-300 mx-1">:</span>
                            <span className="text-[#1D9E75]">"{agent.model}"</span>
                            <span className="text-stone-300">,</span>
                        </div>

                        <div className="flex transition-colors duration-300">
                            <span className="text-[#378ADD]">"system_instruction"</span>
                            <span className="text-stone-300 mx-1">:</span>
                            <span className="text-[#1D9E75] truncate max-w-[150px] inline-block align-bottom" title={agent.prompt || agent.persona || ''}>
                                "{agent.prompt || agent.persona || 'Tanımlı Değil'}"
                            </span>
                            <span className="text-stone-300">,</span>
                        </div>

                        {agent.negativePrompt && (
                            <div className="flex transition-colors duration-300">
                                <span className="text-[#D85A30]">"negative_prompt"</span>
                                <span className="text-stone-300 mx-1">:</span>
                                <span className="text-[#D85A30]/80 truncate max-w-[150px] inline-block align-bottom" title={agent.negativePrompt}>
                                    "{agent.negativePrompt}"
                                </span>
                                <span className="text-stone-300">,</span>
                            </div>
                        )}

                        {isChatbot && (
                            <div className="flex transition-colors duration-300">
                                <span className="text-[#378ADD]">"memory_window"</span>
                                <span className="text-stone-300 mx-1">:</span>
                                <span className="text-[#EF9F27]">{agent.chatHistoryLength || 10}</span>
                                <span className="text-stone-300">,</span>
                            </div>
                        )}

                        <div className="mt-2 text-[#378ADD]">"parameters"<span className="text-stone-300 mx-1">:</span><span className="text-stone-300">{"{"}</span></div>
                        <div className="pl-4">
                            <div className="flex transition-colors duration-300">
                                <span className="text-[#378ADD]">"temperature"</span>
                                <span className="text-stone-300 mx-1">:</span>
                                <span className="text-[#EF9F27]">{typeof agent.temp === 'string' ? 0.7 : agent.temp.toFixed(1)}</span>
                                <span className="text-stone-300">,</span>
                            </div>
                            <div className="flex transition-colors duration-300">
                                <span className="text-[#378ADD]">"max_tokens"</span>
                                <span className="text-stone-300 mx-1">:</span>
                                <span className="text-[#EF9F27]">{agent.maxTokens}</span>
                            </div>
                        </div>
                        <div><span className="text-stone-300">{"}"}</span><span className="text-stone-300">{(isChatbot || agent.strictFactCheck) ? ',' : ''}</span></div>

                        {isChatbot && (
                            <>
                                <div className="mt-2 text-[#378ADD]">"rag_context"<span className="text-stone-300 mx-1">:</span><span className="text-stone-300">{"["}</span></div>
                                <div className="pl-4">
                                    {ragNames.length === 0 ? (
                                        <span className="text-stone-400 italic">// Havuz yok</span>
                                    ) : (
                                        ragNames.map((name, i) => (
                                            <div key={i} className="flex transition-colors duration-300 truncate w-full" title={name}>
                                                <span className="text-[#1D9E75] shrink-0">"{name}"</span>
                                                <span className="text-stone-300">{i < ragNames.length - 1 ? ',' : ''}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div><span className="text-stone-300">{"]"}</span><span className="text-stone-300">,</span></div>
                            </>
                        )}

                        {isChatbot && (
                            <div className="mt-2 text-[#378ADD]">"guardrails"<span className="text-stone-300 mx-1">:</span><span className="text-stone-300">{"{"}</span></div>
                        )}
                        {isChatbot && (
                            <div className="pl-4">
                                <div className="flex transition-colors duration-300">
                                    <span className="text-[#378ADD]">"strict_fact_check"</span>
                                    <span className="text-stone-300 mx-1">:</span>
                                    <span className="text-[#EF9F27]">{agent.strictFactCheck ? 'true' : 'false'}</span>
                                </div>
                            </div>
                        )}
                        {isChatbot && (
                            <div><span className="text-stone-300">{"}"}</span></div>
                        )}
                    </div>

                    <span className="text-stone-300">{"}"}</span>
                </div>
            </div>
            {/* Alt Bilgi */}
            <div className="absolute bottom-3 right-4 flex items-center gap-1.5 opacity-50 z-20">
                <span className="w-1.5 h-1.5 bg-[#1D9E75] rounded-full animate-pulse shadow-[0_0_8px_rgba(29,158,117,1)]"></span>
                <span className="text-[10px] font-mono tracking-tight text-stone-400 font-bold uppercase">{agent.name || 'Bot'} Ayarları İle Eşleşti</span>
            </div>
        </div>
    );
};

export default ApiPayloadPreview;
