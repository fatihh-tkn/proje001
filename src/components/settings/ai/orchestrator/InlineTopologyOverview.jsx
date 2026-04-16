import { useState } from 'react';
import ReactDOM from 'react-dom';
import { User, Bot, Zap, MessageSquareText, FileText, Video, PencilLine, FileJson, AlertTriangle, Power } from 'lucide-react';
import ApiPayloadPreview from './ApiPayloadPreview';

const PopupPortal = ({ title, iconColor, popupPos, onClose, children }) => ReactDOM.createPortal(
    <>
        <div className="fixed inset-0 z-[9998]" onClick={onClose} />
        <div
            className="fixed z-[9999] w-[340px] rounded-xl border border-slate-200 bg-white shadow-2xl flex flex-col"
            style={{ left: popupPos.x, top: popupPos.y, transform: 'translateY(-50%)' }}
        >
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <FileJson size={12} style={{ color: iconColor || '#64748b' }} />
                    <span className="text-[11px] font-medium text-slate-600">{title}</span>
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
    { id: 'sys_agent_chatbot_001', nodeId: 'chat',   label: 'Sohbet Asistanı', Icon: Bot },
    { id: 'sys_agent_msg_001',    nodeId: 'msg',    label: 'Mesaj Revize',  Icon: MessageSquareText },
    { id: 'sys_agent_action_001', nodeId: 'action', label: 'İşlem Botu',    Icon: Zap },
];

const InlineTopologyOverview = ({ agent, allAgents, rags, onOpenPayload, onToggleAgent }) => {
    const [activePopupNode, setActivePopupNode] = useState(null);
    const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });

    const getAgentById = (id) => allAgents?.find(a => a.id === id);
    const getAgentByKind = (kind) => allAgents?.find(a => a.agentKind === kind);

    const isAgentActive = (agentId) => {
        const a = getAgentById(agentId);
        return !a || a.active !== false;
    };

    const chatbotAgent = getAgentById('sys_agent_chatbot_001') || agent;
    const chatbotActive = isAgentActive('sys_agent_chatbot_001');
    const promptActive  = isAgentActive('sys_agent_prompt_001');
    const msgActive     = isAgentActive('sys_agent_msg_001');
    const actionActive  = isAgentActive('sys_agent_action_001');

    const isRag1Active = chatbotActive && Array.isArray(chatbotAgent?.allowedRags) && chatbotAgent.allowedRags.includes('rag_1');
    const isRag2Active = chatbotActive && Array.isArray(chatbotAgent?.allowedRags) && chatbotAgent.allowedRags.includes('rag_2');

    // Passive bots shown as ghost nodes at the bottom
    const ghostNodes = GHOST_DEFS.filter(g => !isAgentActive(g.id));

    // Build visible node list in pipeline order
    const nodeDefs = [
        { id: 'user',     always: true },
        { id: 'prompt',   active: promptActive },
        { id: 'chat',     active: chatbotActive },
        { id: 'msg',      active: msgActive },
        { id: 'action',   active: actionActive },
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

    const handleNodeClick = (nodeId, e) => {
        if (activePopupNode === nodeId) { setActivePopupNode(null); return; }
        const rect = e.currentTarget.getBoundingClientRect();
        setPopupPos({ x: rect.right + 12, y: rect.top + rect.height / 2 });
        setActivePopupNode(nodeId);
        if (onOpenPayload) onOpenPayload();
    };

    const closePopup = () => setActivePopupNode(null);

    const rectBorder = (agentId) =>
        agent?.id === agentId ? 'border-2 border-[#b91d2c]/60' : 'border border-[#b91d2c]/25';
    const chatBorderClass = agent?.id === 'sys_agent_chatbot_001'
        ? 'border-2 border-[#b91d2c]/70' : 'border border-[#b91d2c]/35';

    return (
        <div className="w-full h-full relative flex items-center justify-center bg-white rounded-xl border border-slate-100 isolate overflow-visible">
            <div className="relative w-[1000px] h-[420px] z-10 scale-[0.6] sm:scale-[0.75] md:scale-90 lg:scale-100 transition-transform origin-center">

                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    <defs>
                        <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f1f5f9" />
                            <stop offset="50%" stopColor="#b91d2c" />
                            <stop offset="100%" stopColor="#f1f5f9" />
                        </linearGradient>
                    </defs>

                    <path d={`M ${padX} ${centerY} L ${canvasW - padX} ${centerY}`} stroke="#cbd5e1" strokeWidth="2" fill="none" />
                    <path d={`M ${padX} ${centerY} L ${canvasW - padX} ${centerY}`} stroke="url(#flowGrad)" strokeWidth="2" strokeDasharray="6 8" fill="none" className="animate-[dash_18s_linear_infinite]" />

                    {isRag1Active && pos.chat != null && (
                        <path d={`M ${pos.chat - 65} ${centerY - 123} C ${pos.chat - 65} ${centerY - 82} ${pos.chat - 10} ${centerY - 82} ${pos.chat - 10} ${centerY - 42}`}
                            stroke="#b91d2c" strokeWidth="2" strokeDasharray="4 5" strokeOpacity="0.5" fill="none" />
                    )}
                    {isRag2Active && pos.chat != null && (
                        <path d={`M ${pos.chat + 65} ${centerY - 123} C ${pos.chat + 65} ${centerY - 82} ${pos.chat + 10} ${centerY - 82} ${pos.chat + 10} ${centerY - 42}`}
                            stroke="#b91d2c" strokeWidth="2" strokeDasharray="4 5" strokeOpacity="0.5" fill="none" />
                    )}

                    {showFeedbackLoop && (
                        <>
                            <path d={`M ${pos.msg} ${centerY + 36} C ${pos.msg} ${loopY} ${pos.msg} ${loopY} ${pos.msg - 30} ${loopY} L ${pos.chat + 30} ${loopY} C ${pos.chat} ${loopY} ${pos.chat} ${loopY} ${pos.chat} ${centerY + 42}`}
                                stroke="#cbd5e1" strokeWidth="2" fill="none" />
                            <path d={`M ${pos.msg} ${centerY + 36} C ${pos.msg} ${loopY} ${pos.msg} ${loopY} ${pos.msg - 30} ${loopY} L ${pos.chat + 30} ${loopY} C ${pos.chat} ${loopY} ${pos.chat} ${loopY} ${pos.chat} ${centerY + 42}`}
                                stroke="#b91d2c" strokeWidth="2" strokeDasharray="6 7" strokeOpacity="0.6" fill="none" className="animate-[dash_10s_linear_infinite]" />
                        </>
                    )}
                </svg>

                <style dangerouslySetInnerHTML={{ __html: `@keyframes dash { to { stroke-dashoffset: -1000; } }` }} />

                {/* User node */}
                {pos.user != null && (
                    <div className="absolute z-10 flex flex-col items-center pointer-events-auto" style={{ left: pos.user, top: centerY, transform: 'translate(-50%, -50%)' }}>
                        <div onClick={(e) => handleNodeClick('user', e)} className="w-11 h-11 rounded-full bg-white border border-[#b91d2c]/25 flex items-center justify-center cursor-pointer hover:border-[#b91d2c]/50 transition-colors">
                            <User size={16} className="text-slate-400" />
                        </div>
                        <span className="absolute top-14 text-[9px] text-slate-400 tracking-wider whitespace-nowrap">Kullanıcı</span>
                    </div>
                )}

                {/* Prompt Reviser */}
                {pos.prompt != null && (
                    <div className="absolute z-10 pointer-events-auto" style={{ left: pos.prompt, top: centerY, transform: 'translate(-50%, -50%)' }}>
                        <div onClick={(e) => handleNodeClick('prompt', e)} className={`w-[130px] h-[72px] rounded-xl bg-white ${rectBorder('sys_agent_prompt_001')} flex flex-col items-center justify-center gap-1 cursor-pointer hover:shadow-sm transition-all`}>
                            <PencilLine size={16} className="text-slate-400" />
                            <span className="text-[10px] text-slate-500 text-center leading-snug">İstem Revize<br />Botu</span>
                        </div>
                    </div>
                )}

                {/* DB nodes */}
                {isRag1Active && pos.chat != null && (
                    <div className="absolute z-10 flex flex-col items-center pointer-events-none" style={{ left: pos.chat - 65, top: centerY - 145, transform: 'translate(-50%, -50%)' }}>
                        <div className="w-[52px] h-[44px] rounded-xl bg-white border border-[#b91d2c]/30 flex items-center justify-center">
                            <FileText size={15} className="text-[#b91d2c]" />
                        </div>
                        <span className="mt-1.5 text-[9px] text-slate-400 tracking-wider">Döküman</span>
                    </div>
                )}
                {isRag2Active && pos.chat != null && (
                    <div className="absolute z-10 flex flex-col items-center pointer-events-none" style={{ left: pos.chat + 65, top: centerY - 145, transform: 'translate(-50%, -50%)' }}>
                        <div className="w-[52px] h-[44px] rounded-xl bg-white border border-[#b91d2c]/30 flex items-center justify-center">
                            <Video size={15} className="text-[#b91d2c]" />
                        </div>
                        <span className="mt-1.5 text-[9px] text-slate-400 tracking-wider">Toplantı</span>
                    </div>
                )}

                {/* Chat Assistant */}
                {pos.chat != null && (
                    <div className="absolute z-10 pointer-events-auto" style={{ left: pos.chat, top: centerY, transform: 'translate(-50%, -50%)' }}>
                        <div onClick={(e) => handleNodeClick('chat', e)} className={`w-[140px] h-[84px] rounded-2xl bg-white ${chatBorderClass} flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-[#b91d2c]/60 transition-all relative z-20`}>
                            <Bot size={22} className="text-[#b91d2c]" />
                            <span className="text-[11px] font-semibold text-slate-700 text-center">Sohbet Asistanı</span>
                        </div>
                    </div>
                )}

                {/* Message Reviser */}
                {pos.msg != null && (
                    <div className="absolute z-10 pointer-events-auto" style={{ left: pos.msg, top: centerY, transform: 'translate(-50%, -50%)' }}>
                        <div onClick={(e) => handleNodeClick('msg', e)} className={`w-[130px] h-[72px] rounded-xl bg-white ${rectBorder('sys_agent_msg_001')} flex flex-col items-center justify-center gap-1 cursor-pointer hover:shadow-sm transition-all`}>
                            <MessageSquareText size={16} className="text-slate-400" />
                            <span className="text-[10px] text-slate-500 text-center leading-snug">Mesaj Revize<br />Botu</span>
                        </div>
                    </div>
                )}

                {/* Action Bot */}
                {pos.action != null && (
                    <div className="absolute z-10 pointer-events-auto" style={{ left: pos.action, top: centerY, transform: 'translate(-50%, -50%)' }}>
                        <div onClick={(e) => handleNodeClick('action', e)} className={`w-[130px] h-[72px] rounded-xl bg-white ${rectBorder('sys_agent_action_001')} flex flex-col items-center justify-center gap-1 cursor-pointer hover:shadow-sm transition-all`}>
                            <Zap size={16} className="text-slate-400" />
                            <span className="text-[10px] text-slate-500 text-center leading-snug">İşlem<br />Botu</span>
                        </div>
                    </div>
                )}

                {/* Response node */}
                {pos.response != null && (
                    <div className="absolute z-10 flex flex-col items-center pointer-events-auto" style={{ left: pos.response, top: centerY, transform: 'translate(-50%, -50%)' }}>
                        <div onClick={(e) => handleNodeClick('response', e)} className={`w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-colors ${chatbotActive ? 'bg-[#b91d2c] hover:bg-[#a01b2a]' : 'bg-slate-200 hover:bg-slate-300'}`}>
                            <User size={16} className={chatbotActive ? 'text-white' : 'text-slate-400'} />
                        </div>
                        <span className="absolute top-14 text-[9px] text-slate-400 tracking-wider whitespace-nowrap">Yanıt</span>
                    </div>
                )}

                {/* Ghost tray — passive bots at the bottom */}
                {ghostNodes.length > 0 && (
                    <div
                        className="absolute z-10 flex items-center gap-3 pointer-events-auto"
                        style={{
                            bottom: 12,
                            left: '50%',
                            transform: 'translateX(-50%)',
                        }}
                    >
                        <span className="text-[8px] text-slate-300 tracking-widest uppercase whitespace-nowrap">Pasif</span>
                        {ghostNodes.map(({ id, label, Icon }) => (
                            <button
                                key={id}
                                onClick={() => onToggleAgent && onToggleAgent(id)}
                                title={`${label} — Aktifleştir`}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-dashed border-slate-200 hover:border-[#b91d2c]/40 hover:bg-rose-50 transition-all group"
                            >
                                <Icon size={11} className="text-slate-300 group-hover:text-[#b91d2c]/60 transition-colors" />
                                <span className="text-[9px] text-slate-300 group-hover:text-slate-500 transition-colors whitespace-nowrap">{label}</span>
                                <Power size={9} className="text-slate-200 group-hover:text-[#b91d2c]/50 transition-colors" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Portal Popups */}
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
                <PopupPortal title="API İsteği — Sohbet Asistanı" iconColor="#b91d2c" popupPos={popupPos} onClose={closePopup}>
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
                        <div className="px-4 py-6 flex flex-col items-center gap-3">
                            <AlertTriangle size={22} className="text-amber-400" />
                            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                                Sohbet Asistanı pasif durumda.<br />
                                Yanıt üretilemez.
                            </p>
                        </div>
                    )}
                </PopupPortal>
            )}
        </div>
    );
};

export default InlineTopologyOverview;
