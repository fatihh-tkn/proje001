import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { User, Bot, Zap, MessageSquareText, FileText, Video, PencilLine, FileJson, FileCode, AlertTriangle, Power, Loader2, SlidersHorizontal } from 'lucide-react';
import ApiPayloadPreview from './ApiPayloadPreview';
import { RagCalibrationTab } from '../tabs/RagCalibrationTab';

const PopupPortal = ({ title, icon: Icon = FileJson, iconColor, popupPos, onClose, width = 340, anchor = 'middle', children }) => ReactDOM.createPortal(
    <>
        <div className="fixed inset-0 z-[9998]" onClick={onClose} />
        <div
            className="fixed z-[9999] rounded-xl border border-stone-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col"
            style={{
                left: popupPos.x,
                top: popupPos.y,
                width,
                transform: anchor === 'middle' ? 'translateY(-50%)' : 'none',
            }}
        >
            <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between gap-2 bg-stone-50 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <Icon size={14} strokeWidth={2} style={{ color: iconColor || '#378ADD' }} />
                    <span className="text-[11px] font-black uppercase tracking-widest text-stone-600">{title}</span>
                </div>
                <button onClick={onClose} className="text-slate-300 hover:text-slate-500 transition-colors text-lg leading-none">×</button>
            </div>
            {children}
        </div>
    </>,
    document.body
);

// Ghost node definitions — shown at bottom of diagram when inactive
const GHOST_DEFS = [
    { id: 'sys_agent_prompt_001', nodeId: 'prompt', label: 'İstem Revize', Icon: PencilLine },
    { id: 'sys_agent_chatbot_001', nodeId: 'chat', label: 'Sohbet Asistanı', Icon: Bot },
    { id: 'sys_agent_msg_001', nodeId: 'msg', label: 'Mesaj Revize', Icon: MessageSquareText },
    { id: 'sys_agent_action_001', nodeId: 'action', label: 'İşlem Botu', Icon: Zap },
];

// Cubic bezier point at t=0.5
const bezierMid = (p0, p1, p2, p3) => {
    const t = 0.5;
    const mt = 1 - t;
    return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
};

const InlineTopologyOverview = ({ agent, allAgents, rags, onOpenPayload, onToggleAgent }) => {
    const [activePopupNode, setActivePopupNode] = useState(null);
    const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });

    // Prompt template state
    const [prompts, setPrompts] = useState([]);
    const [loadingPrompts, setLoadingPrompts] = useState(true);
    const [activePromptEdge, setActivePromptEdge] = useState(null);
    const [promptPopupPos, setPromptPopupPos] = useState({ x: 0, y: 0 });

    // RAG ayarları popup state
    const [ragSettingsOpen, setRagSettingsOpen] = useState(false);
    const [ragSettingsPos, setRagSettingsPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        fetch('/api/settings/prompts')
            .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
            .then(data => setPrompts(data.prompts || []))
            .catch((e) => console.warn('[InlineTopology] Prompt listesi alınamadı:', e.message))
            .finally(() => setLoadingPrompts(false));
    }, []);

    const getAgentById = (id) => allAgents?.find(a => a.id === id);
    const getAgentByKind = (kind) => allAgents?.find(a => a.agentKind === kind);

    const isAgentActive = (agentId) => {
        const a = getAgentById(agentId);
        return !a || a.active !== false;
    };

    const chatbotAgent = getAgentById('sys_agent_chatbot_001') || agent;
    const chatbotActive = isAgentActive('sys_agent_chatbot_001');
    const promptActive = isAgentActive('sys_agent_prompt_001');
    const msgActive = isAgentActive('sys_agent_msg_001');
    const actionActive = isAgentActive('sys_agent_action_001');

    const isRag1Active = chatbotActive && Array.isArray(chatbotAgent?.allowedRags) && chatbotAgent.allowedRags.includes('rag_1');
    const isRag2Active = chatbotActive && Array.isArray(chatbotAgent?.allowedRags) && chatbotAgent.allowedRags.includes('rag_2');

    // Passive bots shown as ghost nodes at the bottom
    const ghostNodes = GHOST_DEFS.filter(g => !isAgentActive(g.id));

    // Build visible node list in pipeline order
    const nodeDefs = [
        { id: 'user', always: true },
        { id: 'prompt', active: promptActive },
        { id: 'chat', active: chatbotActive },
        { id: 'msg', active: msgActive },
        { id: 'action', active: actionActive },
        { id: 'response', always: true },
    ];
    const visibleNodes = nodeDefs.filter(n => n.always || n.active);

    const canvasW = 1000;
    const centerY = 220;
    const padX = 60;
    const count = visibleNodes.length;
    const gap = count > 1 ? (canvasW - padX * 2) / (count - 1) : 0;

    const pos = {};
    visibleNodes.forEach((n, i) => { pos[n.id] = padX + i * gap; });

    const loopY = centerY + 80;
    const showFeedbackLoop = chatbotActive && msgActive;

    // ── Prompt key → kenar eşleştirmesi (gerçek API anahtarlarına göre) ──
    // Backend: general_rag | file_qa | chat_memory
    const edgePromptKey = {};

    // User → ilk bot: chat_memory (konuşma hafızası her zaman enjekte edilir)
    const firstBotNode = visibleNodes.find(n => n.id !== 'user');
    if (pos.user != null && firstBotNode) {
        edgePromptKey[`pe_user_${firstBotNode.id}`] = 'chat_memory';
    }

    // RAG1 (Döküman) → Chat: file_qa
    if (isRag1Active && pos.chat != null) {
        edgePromptKey['pe_rag1_chat'] = 'file_qa';
    }

    // RAG2 (Toplantı) → Chat: general_rag
    if (isRag2Active && pos.chat != null) {
        edgePromptKey['pe_rag2_chat'] = 'general_rag';
    }

    const getPromptForEdge = (edgeId) => {
        const key = edgePromptKey[edgeId];
        if (!key) return null;
        return prompts.find(p => p.key === key) || null;
    };

    // ── Kenar düğüm listesi ────────────────────────────────────────────
    // Ana pipeline: ardışık düğümler arası orta nokta
    const candidatePipelineEdges = [];
    for (let i = 0; i < visibleNodes.length - 1; i++) {
        const a = visibleNodes[i].id;
        const b = visibleNodes[i + 1].id;
        const id = `pe_${a}_${b}`;
        candidatePipelineEdges.push({ id, x: (pos[a] + pos[b]) / 2, y: centerY });
    }

    // RAG bağlantıları — cubic bezier t=0.5 noktası
    const candidateRagEdges = [];
    if (isRag1Active && pos.chat != null) {
        candidateRagEdges.push({
            id: 'pe_rag1_chat',
            x: bezierMid(pos.chat - 65, pos.chat - 65, pos.chat - 10, pos.chat - 10),
            y: bezierMid(centerY - 123, centerY - 82, centerY - 82, centerY - 42),
        });
    }
    if (isRag2Active && pos.chat != null) {
        candidateRagEdges.push({
            id: 'pe_rag2_chat',
            x: bezierMid(pos.chat + 65, pos.chat + 65, pos.chat + 10, pos.chat + 10),
            y: bezierMid(centerY - 123, centerY - 82, centerY - 82, centerY - 42),
        });
    }

    // Sadece gerçek promptu olan kenarları göster
    const allEdges = [...candidatePipelineEdges, ...candidateRagEdges]
        .filter(edge => !!edgePromptKey[edge.id]);

    // ── Click handlers ──────────────────────────────────────────────────
    const handleNodeClick = (nodeId, e) => {
        setActivePromptEdge(null);
        if (activePopupNode === nodeId) { setActivePopupNode(null); return; }
        const rect = e.currentTarget.getBoundingClientRect();
        setPopupPos({ x: rect.right + 12, y: rect.top + rect.height / 2 });
        setActivePopupNode(nodeId);
        if (onOpenPayload) onOpenPayload();
    };

    const handlePromptCircleClick = (edgeId, e) => {
        e.stopPropagation();
        setActivePopupNode(null);
        if (activePromptEdge === edgeId) { setActivePromptEdge(null); return; }
        const rect = e.currentTarget.getBoundingClientRect();
        setPromptPopupPos({ x: rect.right + 12, y: rect.top + rect.height / 2 });
        setActivePromptEdge(edgeId);
        if (onOpenPayload) onOpenPayload();
    };

    const closePopup = () => setActivePopupNode(null);
    const closePromptPopup = () => setActivePromptEdge(null);

    const handleRagSettingsClick = (e) => {
        e.stopPropagation();
        setActivePopupNode(null);
        setActivePromptEdge(null);
        if (ragSettingsOpen) { setRagSettingsOpen(false); return; }
        const rect = e.currentTarget.getBoundingClientRect();
        const POPUP_W = 440;
        const margin = 12;
        // Sağa açılması ekrandan taşacaksa sola çevir
        const overflowsRight = rect.right + margin + POPUP_W > window.innerWidth;
        const x = overflowsRight ? Math.max(margin, rect.left - margin - POPUP_W) : rect.right + margin;
        // Pop-up dökümanın hizasında, üstten aç (uzayabilir)
        const y = Math.min(rect.top, window.innerHeight - 100);
        setRagSettingsPos({ x, y });
        setRagSettingsOpen(true);
        if (onOpenPayload) onOpenPayload();
    };
    const closeRagSettings = () => setRagSettingsOpen(false);

    const rectBorder = (agentId) =>
        agent?.id === agentId ? 'border-2 border-[#378ADD]/60 shadow-[0_0_15px_rgba(55,138,221,0.15)] bg-white' : 'border border-[#378ADD]/20 bg-stone-50';
    const chatBorderClass = agent?.id === 'sys_agent_chatbot_001'
        ? 'border-2 border-[#378ADD]/80 shadow-[0_0_20px_rgba(55,138,221,0.2)] bg-white' : 'border border-[#378ADD]/30 bg-stone-50';

    return (
        <div className="w-full h-full relative flex items-center justify-center bg-stone-50/50 rounded-xl border border-stone-200 isolate overflow-visible">
            <div className="relative w-[1000px] h-[420px] z-10 scale-[0.6] sm:scale-[0.75] md:scale-90 lg:scale-100 transition-transform origin-center">

                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    <defs>
                        <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#fafaf9" />
                            <stop offset="50%" stopColor="#378ADD" />
                            <stop offset="100%" stopColor="#fafaf9" />
                        </linearGradient>
                    </defs>

                    <path d={`M ${padX} ${centerY} L ${canvasW - padX} ${centerY}`} stroke="#e5e7eb" strokeWidth="2" fill="none" />
                    <path d={`M ${padX} ${centerY} L ${canvasW - padX} ${centerY}`} stroke="url(#flowGrad)" strokeWidth="2" strokeDasharray="6 8" fill="none" className="animate-[dash_18s_linear_infinite]" />

                    {isRag1Active && pos.chat != null && (
                        <path d={`M ${pos.chat - 65} ${centerY - 123} C ${pos.chat - 65} ${centerY - 82} ${pos.chat - 10} ${centerY - 82} ${pos.chat - 10} ${centerY - 42}`}
                            stroke="#378ADD" strokeWidth="2" strokeDasharray="4 5" strokeOpacity="0.5" fill="none" />
                    )}
                    {isRag2Active && pos.chat != null && (
                        <path d={`M ${pos.chat + 65} ${centerY - 123} C ${pos.chat + 65} ${centerY - 82} ${pos.chat + 10} ${centerY - 82} ${pos.chat + 10} ${centerY - 42}`}
                            stroke="#378ADD" strokeWidth="2" strokeDasharray="4 5" strokeOpacity="0.5" fill="none" />
                    )}

                    {showFeedbackLoop && (
                        <>
                            <path d={`M ${pos.msg} ${centerY + 36} C ${pos.msg} ${loopY} ${pos.msg} ${loopY} ${pos.msg - 30} ${loopY} L ${pos.chat + 30} ${loopY} C ${pos.chat} ${loopY} ${pos.chat} ${loopY} ${pos.chat} ${centerY + 42}`}
                                stroke="#e5e7eb" strokeWidth="2" fill="none" />
                            <path d={`M ${pos.msg} ${centerY + 36} C ${pos.msg} ${loopY} ${pos.msg} ${loopY} ${pos.msg - 30} ${loopY} L ${pos.chat + 30} ${loopY} C ${pos.chat} ${loopY} ${pos.chat} ${loopY} ${pos.chat} ${centerY + 42}`}
                                stroke="#378ADD" strokeWidth="2" strokeDasharray="6 7" strokeOpacity="0.6" fill="none" className="animate-[dash_10s_linear_infinite]" />
                        </>
                    )}
                </svg>

                <style dangerouslySetInnerHTML={{ __html: `@keyframes dash { to { stroke-dashoffset: -1000; } }` }} />

                {/* ── Prompt düğümleri (oklar üzerindeki küçük daireler) ── */}
                {allEdges.map(edge => {
                    const prompt = getPromptForEdge(edge.id);
                    const isEdgeActive = activePromptEdge === edge.id;
                    const isRagEdge = edge.id.startsWith('pe_rag');
                    return (
                        <div
                            key={edge.id}
                            className="absolute z-20 pointer-events-auto"
                            style={{ left: edge.x, top: edge.y, transform: 'translate(-50%, -50%)' }}
                        >
                            <button
                                onClick={(e) => handlePromptCircleClick(edge.id, e)}
                                title={prompt?.name || 'Prompt Şablonu'}
                                className={`w-[26px] h-[26px] rounded-full border-2 flex items-center justify-center transition-all duration-150 shadow-sm
                                    ${isEdgeActive
                                        ? 'bg-violet-50 border-violet-400 scale-125 shadow-violet-200'
                                        : isRagEdge
                                            ? 'bg-white border-[#378ADD]/40 hover:border-violet-300 hover:bg-violet-50 hover:scale-110'
                                            : 'bg-white border-stone-300 hover:border-violet-300 hover:bg-violet-50 hover:scale-110'
                                    }`}
                            >
                                {loadingPrompts
                                    ? <Loader2 size={9} strokeWidth={2.5} className="text-stone-300 animate-spin" />
                                    : <FileCode size={9} strokeWidth={2.5} className={isEdgeActive ? 'text-violet-600' : 'text-stone-400'} />
                                }
                            </button>
                        </div>
                    );
                })}

                {/* User node */}
                {pos.user != null && (
                    <div className="absolute z-10 flex flex-col items-center pointer-events-auto" style={{ left: pos.user, top: centerY, transform: 'translate(-50%, -50%)' }}>
                        <div onClick={(e) => handleNodeClick('user', e)} className="w-[48px] h-[48px] rounded-full bg-stone-50 border border-[#378ADD]/30 flex items-center justify-center cursor-pointer hover:border-[#378ADD]/60 hover:bg-white hover:shadow-md transition-all shadow-sm">
                            <User size={18} strokeWidth={2.5} className="text-stone-400" />
                        </div>
                        <span className="absolute top-16 text-[10px] font-bold text-stone-400 tracking-widest uppercase whitespace-nowrap">Kullanıcı</span>
                    </div>
                )}

                {/* Prompt Reviser */}
                {pos.prompt != null && (
                    <div className="absolute z-10 pointer-events-auto" style={{ left: pos.prompt, top: centerY, transform: 'translate(-50%, -50%)' }}>
                        <div onClick={(e) => handleNodeClick('prompt', e)} className={`w-[130px] h-[72px] rounded-xl ${rectBorder('sys_agent_prompt_001')} flex flex-col items-center justify-center gap-1 cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all`}>
                            <PencilLine size={18} strokeWidth={2} className="text-stone-400" />
                            <span className="text-[10px] uppercase font-bold tracking-widest text-stone-500 text-center leading-snug">İstem Revize<br />Botu</span>
                        </div>
                    </div>
                )}

                {/* DB nodes */}
                {isRag1Active && pos.chat != null && (
                    <div className="absolute z-10 flex flex-col items-center pointer-events-auto" style={{ left: pos.chat - 65, top: centerY - 145, transform: 'translate(-50%, -50%)' }}>
                        <button
                            onClick={handleRagSettingsClick}
                            title="RAG Ayarları"
                            className={`w-[56px] h-[48px] rounded-xl bg-white border flex items-center justify-center shadow-sm transition-all ${ragSettingsOpen ? 'border-[#378ADD] ring-2 ring-[#378ADD]/30 -translate-y-0.5 shadow-md' : 'border-[#378ADD]/30 hover:border-[#378ADD]/70 hover:-translate-y-0.5 hover:shadow-md'}`}
                        >
                            <FileText size={16} strokeWidth={2.5} className="text-[#378ADD]" />
                        </button>
                        <span className="mt-2 text-[10px] font-bold text-stone-400 tracking-widest uppercase">Döküman</span>
                    </div>
                )}
                {isRag2Active && pos.chat != null && (
                    <div className="absolute z-10 flex flex-col items-center pointer-events-none" style={{ left: pos.chat + 65, top: centerY - 145, transform: 'translate(-50%, -50%)' }}>
                        <div className="w-[56px] h-[48px] rounded-xl bg-white border border-[#378ADD]/30 flex items-center justify-center shadow-sm">
                            <Video size={16} strokeWidth={2.5} className="text-[#378ADD]" />
                        </div>
                        <span className="mt-2 text-[10px] font-bold text-stone-400 tracking-widest uppercase">Toplantı</span>
                    </div>
                )}

                {/* Chat Assistant */}
                {pos.chat != null && (
                    <div className="absolute z-10 pointer-events-auto" style={{ left: pos.chat, top: centerY, transform: 'translate(-50%, -50%)' }}>
                        <div onClick={(e) => handleNodeClick('chat', e)} className={`w-[140px] h-[84px] rounded-2xl ${chatBorderClass} flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#378ADD]/80 hover:-translate-y-0.5 hover:shadow-lg transition-all relative z-20`}>
                            <Bot size={24} strokeWidth={2.5} className="text-[#378ADD]" />
                            <span className="text-[11px] font-black uppercase tracking-widest text-stone-700 text-center">Sohbet Asistanı</span>
                        </div>
                    </div>
                )}

                {/* Message Reviser */}
                {pos.msg != null && (
                    <div className="absolute z-10 pointer-events-auto" style={{ left: pos.msg, top: centerY, transform: 'translate(-50%, -50%)' }}>
                        <div onClick={(e) => handleNodeClick('msg', e)} className={`w-[130px] h-[72px] rounded-xl ${rectBorder('sys_agent_msg_001')} flex flex-col items-center justify-center gap-1 cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all`}>
                            <MessageSquareText size={18} strokeWidth={2} className="text-stone-400" />
                            <span className="text-[10px] uppercase font-bold tracking-widest text-stone-500 text-center leading-snug">Mesaj Revize<br />Botu</span>
                        </div>
                    </div>
                )}

                {/* Action Bot */}
                {pos.action != null && (
                    <div className="absolute z-10 pointer-events-auto" style={{ left: pos.action, top: centerY, transform: 'translate(-50%, -50%)' }}>
                        <div onClick={(e) => handleNodeClick('action', e)} className={`w-[130px] h-[72px] rounded-xl ${rectBorder('sys_agent_action_001')} flex flex-col items-center justify-center gap-1 cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all`}>
                            <Zap size={18} strokeWidth={2} className="text-stone-400" />
                            <span className="text-[10px] uppercase font-bold tracking-widest text-stone-500 text-center leading-snug">İşlem<br />Botu</span>
                        </div>
                    </div>
                )}

                {/* Response node */}
                {pos.response != null && (
                    <div className="absolute z-10 flex flex-col items-center pointer-events-auto" style={{ left: pos.response, top: centerY, transform: 'translate(-50%, -50%)' }}>
                        <div onClick={(e) => handleNodeClick('response', e)} className={`w-[48px] h-[48px] rounded-full flex items-center justify-center cursor-pointer transition-all shadow-sm ${chatbotActive ? 'bg-[#378ADD] hover:bg-[#2A6AAB] shadow-[#378ADD]/30' : 'bg-stone-200 hover:bg-stone-300'}`}>
                            <User size={18} strokeWidth={2.5} className={chatbotActive ? 'text-white' : 'text-stone-400'} />
                        </div>
                        <span className="absolute top-16 text-[10px] font-bold tracking-widest text-stone-400 uppercase whitespace-nowrap">Yanıt</span>
                    </div>
                )}

                {/* Ghost tray — passive bots at the bottom */}
                {ghostNodes.length > 0 && (
                    <div
                        className="absolute z-10 flex items-center gap-3 pointer-events-auto"
                        style={{ bottom: 12, left: '50%', transform: 'translateX(-50%)' }}
                    >
                        <span className="text-[10px] font-black text-stone-400 tracking-widest uppercase whitespace-nowrap">Pasif</span>
                        {ghostNodes.map(({ id, label, Icon }) => (
                            <button
                                key={id}
                                onClick={() => onToggleAgent && onToggleAgent(id)}
                                title={`${label} — Aktifleştir`}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-stone-200 hover:border-[#3B6D11]/40 hover:bg-[#EAF3DE]/50 transition-all group shadow-sm"
                            >
                                <Icon size={12} strokeWidth={2.5} className="text-stone-400 group-hover:text-[#3B6D11]/60 transition-colors" />
                                <span className="text-[10px] font-bold text-stone-400 group-hover:text-[#3B6D11]/80 uppercase tracking-widest transition-colors whitespace-nowrap">{label}</span>
                                <Power size={10} strokeWidth={2.5} className="text-stone-300 group-hover:text-[#3B6D11]/50 transition-colors" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Bot API popupları ── */}
            {activePopupNode === 'user' && (
                <PopupPortal title="Ham Kullanıcı İstemi" popupPos={popupPos} onClose={closePopup}>
                    <ApiPayloadPreview agent={{ persona: "Kullanıcının yazdığı ham metin", model: "N/A" }} rags={[]} isUser={true} />
                </PopupPortal>
            )}
            {activePopupNode === 'prompt' && (
                <PopupPortal title="API İsteği — İstem Revize Botu" popupPos={popupPos} onClose={closePopup}>
                    <ApiPayloadPreview agent={getAgentByKind('prompt_reviser') || getAgentById('sys_agent_prompt_001')} rags={[]} />
                </PopupPortal>
            )}
            {activePopupNode === 'chat' && (
                <PopupPortal title="API İsteği — Sohbet Asistanı" iconColor="#378ADD" popupPos={popupPos} onClose={closePopup}>
                    <ApiPayloadPreview agent={getAgentByKind('chatbot') || chatbotAgent} rags={rags} />
                </PopupPortal>
            )}
            {activePopupNode === 'msg' && (
                <PopupPortal title="API İsteği — Mesaj Revize Botu" popupPos={popupPos} onClose={closePopup}>
                    <ApiPayloadPreview agent={getAgentByKind('message_reviser') || getAgentById('sys_agent_msg_001')} rags={[]} />
                </PopupPortal>
            )}
            {activePopupNode === 'action' && (
                <PopupPortal title="API İsteği — İşlem Botu" popupPos={popupPos} onClose={closePopup}>
                    <ApiPayloadPreview agent={getAgentByKind('action_router') || getAgentById('sys_agent_action_001')} rags={[]} />
                </PopupPortal>
            )}
            {activePopupNode === 'response' && (
                <PopupPortal title="Yanıt" popupPos={popupPos} onClose={closePopup}>
                    {chatbotActive ? (
                        <ApiPayloadPreview agent={getAgentByKind('chatbot') || chatbotAgent} rags={rags} />
                    ) : (
                        <div className="px-4 py-8 flex flex-col items-center gap-4 bg-stone-50 rounded-b-xl">
                            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shadow-sm">
                                <AlertTriangle size={20} strokeWidth={2.5} className="text-amber-500" />
                            </div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 text-center leading-relaxed">
                                Sohbet Asistanı pasif durumda.<br />
                                Yanıt üretilemez.
                            </p>
                        </div>
                    )}
                </PopupPortal>
            )}

            {/* ── RAG Ayarları popup ── */}
            {ragSettingsOpen && (
                <PopupPortal
                    title="RAG Kalibrasyon"
                    icon={SlidersHorizontal}
                    iconColor="#378ADD"
                    popupPos={ragSettingsPos}
                    width={440}
                    anchor="top"
                    onClose={closeRagSettings}
                >
                    <RagCalibrationTab />
                </PopupPortal>
            )}

            {/* ── Prompt şablonu popup ── */}
            {activePromptEdge && (() => {
                const prompt = getPromptForEdge(activePromptEdge);
                if (!prompt && !loadingPrompts) return null;

                return (
                    <PopupPortal
                        title={prompt?.label || 'Prompt Şablonu'}
                        icon={FileCode}
                        iconColor="#7C3AED"
                        popupPos={promptPopupPos}
                        onClose={closePromptPopup}
                    >
                        <div className="flex flex-col bg-stone-50 rounded-b-xl overflow-hidden">
                            {/* Açıklama satırı */}
                            {prompt?.desc && (
                                <div className="px-4 pt-3 pb-2 border-b border-stone-100">
                                    <p className="text-[10px] font-semibold text-stone-400 leading-relaxed">{prompt.desc}</p>
                                </div>
                            )}
                            {/* Prompt içeriği */}
                            <div className="px-4 py-3 max-h-[280px] overflow-y-auto [&::-webkit-scrollbar]:hidden">
                                {loadingPrompts ? (
                                    <div className="flex items-center gap-2 py-6 justify-center">
                                        <Loader2 size={16} className="animate-spin text-violet-400" />
                                        <span className="text-[11px] text-stone-400 font-semibold">Yükleniyor...</span>
                                    </div>
                                ) : prompt?.value ? (
                                    <pre className="text-[11px] font-mono text-stone-700 whitespace-pre-wrap leading-relaxed tracking-tight bg-white border border-stone-100 rounded-lg p-3 shadow-sm">
                                        {prompt.value}
                                    </pre>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 py-6">
                                        <FileCode size={24} strokeWidth={1.5} className="text-stone-300" />
                                        <p className="text-[11px] text-stone-400 font-semibold text-center">
                                            Prompt şablonu boş.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </PopupPortal>
                );
            })()}
        </div>
    );
};

export default InlineTopologyOverview;
