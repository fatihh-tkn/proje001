import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
    User, MessageSquareText, GitBranch, Search, Wrench,
    Database, Webhook, Sparkles, Wand2, FileJson, AlertTriangle, Power,
    PencilLine, FileText, Mic, Save, Brain, Clock, History,
    Info, ChevronDown,
} from 'lucide-react';
import ApiPayloadPreview from './ApiPayloadPreview';

/**
 * LangGraph topolojisi — pill düğümler. Tıklayınca yerinde genişler (expand).
 * Sürükleme: pill modunda tüm pill, expanded modunda sadece üst başlık.
 */

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

const SPECIALISTS = [
    {
        id: 'rag_search',
        label: 'RAG Arama',
        sub: 'hybrid kb',
        icon: Search,
        color: '#0ea5e9',
        usesAgent: 'sys_node_rag_search',
        info: 'Vektör + tam metin hibrit arama. Belge & toplantı havuzlarından kullanıcı sorgusuyla en alakalı parçaları çeker.',
    },
    {
        id: 'error_solver',
        label: 'Hata Çözücü',
        sub: 'json schema',
        icon: Wrench,
        color: '#dc2626',
        usesAgent: 'sys_node_error_solver',
        info: 'SAP/sistem hatalarını yapılandırılmış JSON formatında (error_solution) çözümleyen uzman.',
    },
    {
        id: 'zli_finder',
        label: "Z'li Rapor",
        sub: 'sql + llm',
        icon: Database,
        color: '#0891b2',
        usesAgent: 'sys_node_zli_finder',
        info: "SQL'den aday Z'li raporları çekip LLM ile en uygunu seçen uzman.",
    },
    {
        id: 'n8n_trigger',
        label: 'n8n Tetikle',
        sub: 'workflow',
        icon: Webhook,
        color: '#16a34a',
        usesAgent: 'sys_node_n8n_trigger',
        info: 'sys_node_n8n_trigger ajanı kullanıcı mesajını analiz edip n8n workflow tetikler.',
    },
];

const HIDDEN_COMPONENTS = [
    { id: 'history',    label: 'Sohbet Geçmişi',     icon: History, info: 'Önceki turlar (user/assistant mesajları) supervisor tarafından state.history\'e doldurulur, aggregator LLM çağrısında geri beslenir.' },
    { id: 'memory',     label: 'Semantik Hafıza',    icon: Brain,   info: 'Eski konuşmalardan vektör DB ile semantik benzerlik araması — aggregator system prompt\'una enjekte edilir.' },
    { id: 'checkpoint', label: 'Checkpointer',       icon: Save,    info: 'PostgresSaver — her node sonrası state DB\'ye yazılır.' },
    { id: 'persist',    label: 'Log + History Yazımı', icon: Clock, info: 'Runner sonunda add_log_to_db + _save_to_history threadpool\'da çalışır.' },
];

const CANVAS_W = 1040;
const CANVAS_H = 680;

const DEFAULT_POSITIONS = {
    user:         { x: 110, y: 220 },
    prompt_bot:   { x: 230, y: 100 },
    supervisor:   { x: 660, y: 100 },
    rag_search:   { x: 230, y: 270 },
    error_solver: { x: 470, y: 270 },
    zli_finder:   { x: 690, y: 270 },
    n8n_trigger:  { x: 910, y: 270 },
    aggregator:   { x: 480, y: 460 },
    msg_polish:   { x: 320, y: 600 },
    response:     { x: 690, y: 640 },
};

const NODE_SIZE = {
    user:         { w: 56,  h: 56  },
    prompt_bot:   { w: 170, h: 50  },
    supervisor:   { w: 150, h: 44  },
    rag_search:   { w: 170, h: 56  },
    error_solver: { w: 170, h: 56  },
    zli_finder:   { w: 170, h: 56  },
    n8n_trigger:  { w: 170, h: 56  },
    aggregator:   { w: 180, h: 50  },
    msg_polish:   { w: 140, h: 44  },
    response:     { w: 56,  h: 56  },
};

const EXPANDED_W = 380;
const EXPANDED_H = 340;
const DRAG_THRESHOLD = 4;
const STORAGE_KEY = 'graph_topology_positions_v1';

const GraphTopologyOverview = ({ allAgents, rags, onOpenPayload, onToggleAgent }) => {
    const [popupId, setPopupId] = useState(null); // alt şerit info popup'ları
    const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
    const [expandedId, setExpandedId] = useState(null); // graph nod in-place expansion
    const [positions, setPositions] = useState(() => {
        try {
            const raw = typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                // Yeni node eklendiyse default'larla merge et.
                return { ...DEFAULT_POSITIONS, ...parsed };
            }
        } catch { /* ignore */ }
        return DEFAULT_POSITIONS;
    });

    // Pozisyon her değişiminde localStorage'a yaz.
    useEffect(() => {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
        } catch { /* quota / unavailable — ignore */ }
    }, [positions]);

    const canvasRef = useRef(null);
    const dragRef = useRef(null);

    const getAgentById = (id) => allAgents?.find(a => a.id === id);
    const isAgentActive = (id) => {
        const a = getAgentById(id);
        return !a || a.active !== false;
    };

    const aggregatorAgent = getAgentById('sys_node_aggregator') || getAgentById('sys_agent_chatbot_001');
    const msgAgent = getAgentById('sys_node_msg_polish') || getAgentById('sys_agent_msg_001');
    const promptAgent = getAgentById('sys_agent_prompt_001');
    const supervisorAgent = getAgentById('sys_node_supervisor');
    const chatbotAgent = aggregatorAgent;

    const chatbotActive = aggregatorAgent ? aggregatorAgent.active !== false : false;
    const msgPolishActive = msgAgent ? msgAgent.active !== false : false;
    const actionActive = isAgentActive('sys_node_n8n_trigger') || isAgentActive('sys_agent_action_001');
    const promptActive = isAgentActive('sys_agent_prompt_001');

    const allowedRags = aggregatorAgent?.allowedRags || aggregatorAgent?.allowed_rags || [];
    const isRag1Active = chatbotActive && allowedRags.includes('rag_1');
    const isRag2Active = chatbotActive && allowedRags.includes('rag_2');

    // Drag — pointer events + click eşiği.
    const onPointerDown = useCallback((e, id) => {
        if (e.button !== undefined && e.button !== 0) return;
        e.stopPropagation();
        const target = e.currentTarget;
        try { target.setPointerCapture(e.pointerId); } catch { /* ignore */ }
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        const scale = canvasRect ? canvasRect.width / CANVAS_W : 1;
        dragRef.current = {
            id,
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            origX: positions[id].x,
            origY: positions[id].y,
            scale: scale || 1,
            moved: false,
            target,
        };
    }, [positions]);

    const onPointerMove = useCallback((e) => {
        const d = dragRef.current;
        if (!d || d.pointerId !== e.pointerId) return;
        const dx = (e.clientX - d.startX) / d.scale;
        const dy = (e.clientY - d.startY) / d.scale;
        if (!d.moved && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
            d.moved = true;
        }
        if (d.moved) {
            // Sadece merkezin kanvas içinde kalmasını şart koş — kullanıcı node'u
            // istediği köşeye yapıştırabilsin (edge tamamen kanvas içinde olmak zorunda değil).
            const nx = Math.max(0, Math.min(CANVAS_W, d.origX + dx));
            const ny = Math.max(0, Math.min(CANVAS_H, d.origY + dy));
            setPositions(p => ({ ...p, [d.id]: { x: nx, y: ny } }));
        }
    }, []);

    const onPointerUp = useCallback((e) => {
        const d = dragRef.current;
        if (!d || d.pointerId !== e.pointerId) return;
        const moved = d.moved;
        const id = d.id;
        const target = d.target;
        try { target.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
        dragRef.current = null;

        if (!moved) {
            // Click — in-place genişle/daralt.
            setExpandedId(prev => prev === id ? null : id);
            if (onOpenPayload) onOpenPayload();
        }
    }, [onOpenPayload]);

    const dragHandlers = useCallback((id) => ({
        onPointerDown: (e) => onPointerDown(e, id),
        onPointerMove,
        onPointerUp,
        onPointerCancel: onPointerUp,
    }), [onPointerDown, onPointerMove, onPointerUp]);

    // Çizgi geometrisi — bağlantılar her zaman iki node'un birbirine
    // BAKAN kenarlarından çıkar; node nereye sürüklenirse sürüklensin
    // çıkış noktası dinamik olarak kayar.
    const paths = useMemo(() => {
        const p = positions;
        // Bir node'un bounding rect'inden, hedefe doğru baskın yöndeki çıkış noktası.
        const edge = (id, towardX, towardY) => {
            const node = p[id];
            const size = NODE_SIZE[id];
            const dx = towardX - node.x;
            const dy = towardY - node.y;
            const hw = size.w / 2;
            const hh = size.h / 2;
            // Bounding box aspect'i hesaba kat — uzun pill'lerde kısa kenardan çıkmasın.
            if (Math.abs(dx) * hh >= Math.abs(dy) * hw) {
                return { x: node.x + (dx >= 0 ? hw : -hw), y: node.y };
            }
            return { x: node.x, y: node.y + (dy >= 0 ? hh : -hh) };
        };
        // Yatay/dikey baskın yöne göre tanjant seçen tatlı bezier.
        const smooth = (a, b) => {
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            if (Math.abs(dx) >= Math.abs(dy)) {
                const cx = (a.x + b.x) / 2;
                return `M ${a.x} ${a.y} C ${cx} ${a.y} ${cx} ${b.y} ${b.x} ${b.y}`;
            }
            const cy = (a.y + b.y) / 2;
            return `M ${a.x} ${a.y} C ${a.x} ${cy} ${b.x} ${cy} ${b.x} ${b.y}`;
        };
        const connect = (fromId, toId) => smooth(
            edge(fromId, p[toId].x, p[toId].y),
            edge(toId, p[fromId].x, p[fromId].y),
        );

        return {
            userToSup: connect('user', 'supervisor'),
            specialistPaths: SPECIALISTS.map(s => ({
                color: s.color,
                dispatch: connect('supervisor', s.id),
                fanIn: connect(s.id, 'aggregator'),
            })),
            aggToPolish: connect('aggregator', 'msg_polish'),
            polishToResp: connect('msg_polish', 'response'),
            aggToResp: connect('aggregator', 'response'),
        };
    }, [positions]);

    const closeExpanded = () => setExpandedId(null);

    // Renderer per nod tipinin expanded içeriği.
    const renderNode = (id, pillContent, expandedTitle, expandedIcon, expandedIconColor, expandedBody) => {
        const isExpanded = expandedId === id;
        const pos = positions[id];
        const pillSize = NODE_SIZE[id];
        // Alta yakınsa kart yukarı doğru açılsın (kanvas dışına taşmasın).
        const bottomAnchor = isExpanded && pos.y + EXPANDED_H - pillSize.h / 2 > CANVAS_H + 40;
        const top = bottomAnchor
            ? pos.y + pillSize.h / 2 - EXPANDED_H
            : pos.y - pillSize.h / 2;
        const width = isExpanded ? EXPANDED_W : pillSize.w;
        const height = isExpanded ? EXPANDED_H : pillSize.h;

        return (
            <div
                key={id}
                className="absolute"
                style={{
                    left: pos.x,
                    top,
                    width,
                    height,
                    transform: 'translate(-50%, 0)',
                    zIndex: isExpanded ? 40 : 10,
                    transition: 'width 220ms cubic-bezier(0.22,1,0.36,1), height 220ms cubic-bezier(0.22,1,0.36,1)',
                }}
            >
                {isExpanded ? (
                    <ExpandedCard
                        title={expandedTitle}
                        icon={expandedIcon}
                        iconColor={expandedIconColor}
                        onClose={closeExpanded}
                        headerHandlers={dragHandlers(id)}
                    >
                        {expandedBody}
                    </ExpandedCard>
                ) : (
                    <div {...dragHandlers(id)} className="w-full h-full" style={{ touchAction: 'none' }}>
                        {pillContent}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-full h-full relative flex items-center justify-center bg-stone-50/50 rounded-xl border border-stone-200 isolate overflow-visible">
            <div
                ref={canvasRef}
                className="relative z-10 scale-[0.55] sm:scale-[0.7] md:scale-[0.85] lg:scale-95 transition-transform origin-center"
                style={{ width: CANVAS_W, height: CANVAS_H }}
            >
                {/* SVG bağlantı çizgileri */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="graphFlow" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.05" />
                            <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.05" />
                        </linearGradient>
                    </defs>

                    <path d={paths.userToSup} stroke="#cbd5e1" strokeWidth="1.5" fill="none" />

                    {paths.specialistPaths.map((sp, i) => (
                        <path key={`disp-${i}`} d={sp.dispatch} stroke={sp.color} strokeWidth="1.5" strokeDasharray="5 5" strokeOpacity="0.45" fill="none" />
                    ))}

                    {paths.specialistPaths.map((sp, i) => (
                        <path key={`fanin-${i}`} d={sp.fanIn} stroke={sp.color} strokeWidth="1.5" strokeDasharray="5 5" strokeOpacity="0.35" fill="none" />
                    ))}

                    {msgPolishActive && (
                        <path d={paths.aggToPolish} stroke="#a855f7" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.55" fill="none" />
                    )}

                    <path d={msgPolishActive ? paths.polishToResp : paths.aggToResp} stroke="url(#graphFlow)" strokeWidth="2" strokeDasharray="4 4" fill="none" />
                </svg>

                {/* BAŞLATICI */}
                {renderNode(
                    'user',
                    <div className="w-full h-full rounded-full bg-white border border-stone-200 flex items-center justify-center cursor-grab active:cursor-grabbing hover:border-stone-400 hover:shadow-md transition-all shadow-sm select-none relative">
                        <User size={20} strokeWidth={1.8} className="text-stone-400" />
                        <span className="absolute left-1/2 -translate-x-1/2 -bottom-5 text-[9px] font-bold tracking-widest uppercase text-stone-400 whitespace-nowrap pointer-events-none">Başlatıcı</span>
                        <div className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+22px)] flex items-center gap-2 pointer-events-none">
                            <div className={`flex flex-col items-center gap-0.5 ${isRag1Active ? '' : 'opacity-40'}`}>
                                <div className="w-7 h-7 rounded-md bg-white border border-stone-200 flex items-center justify-center shadow-sm">
                                    <FileText size={12} strokeWidth={2} className={isRag1Active ? 'text-[#0ea5e9]' : 'text-stone-400'} />
                                </div>
                                <span className="text-[8px] font-bold tracking-widest uppercase text-stone-400">Belge</span>
                            </div>
                            <div className={`flex flex-col items-center gap-0.5 ${isRag2Active ? '' : 'opacity-40'}`}>
                                <div className="w-7 h-7 rounded-md bg-white border border-stone-200 flex items-center justify-center shadow-sm">
                                    <Mic size={12} strokeWidth={2} className={isRag2Active ? 'text-[#0ea5e9]' : 'text-stone-400'} />
                                </div>
                                <span className="text-[8px] font-bold tracking-widest uppercase text-stone-400">Toplantı</span>
                            </div>
                        </div>
                    </div>,
                    'Ham Kullanıcı İstemi',
                    User,
                    '#64748b',
                    <ApiPayloadPreview agent={{ persona: 'Kullanıcının yazdığı ham metin', model: 'N/A' }} rags={[]} isUser={true} />
                )}

                {/* İstem Revize (akış dışı) */}
                {renderNode(
                    'prompt_bot',
                    <PillNode icon={PencilLine} label="İstem Revize" sub="akış dışı" dotColor="#d97706" inactive={!promptActive} dashedBorder />,
                    'İstem Revize Botu — Akış Dışı',
                    PencilLine,
                    '#d97706',
                    <div className="px-4 py-4 text-[11px] text-stone-600 leading-relaxed space-y-3">
                        <div className="px-2 py-1 rounded bg-amber-50 border border-amber-200 text-[10px] text-amber-700 font-bold inline-block">
                            Bu ajan LangGraph akışında DEĞİL
                        </div>
                        <p>Kullanıcı chat input'undaki sihirli değnek (✨) butonuna tıkladığında <code className="bg-stone-100 px-1 py-0.5 rounded text-[10px]">/api/chat/revise-prompt</code> endpoint'i ayrıca çağrılır. Mesaj graph'a girmeden, ham metin daha kaliteli prompt'a dönüştürülür.</p>
                        {promptAgent ? (
                            <>
                                <p className="text-stone-500"><strong>Bağlı ajan:</strong> {promptAgent.name}</p>
                                {!promptActive && (
                                    <button
                                        onClick={() => onToggleAgent && onToggleAgent('sys_agent_prompt_001')}
                                        className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-all text-amber-700"
                                    >
                                        <Power size={11} strokeWidth={2.5} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Aktifleştir</span>
                                    </button>
                                )}
                            </>
                        ) : (
                            <p className="text-stone-400 italic">sys_agent_prompt_001 ajanı bulunamadı.</p>
                        )}
                    </div>
                )}

                {/* SUPERVISOR */}
                {renderNode(
                    'supervisor',
                    <PillNode icon={GitBranch} label="Supervisor" sub="" dotColor="#7c3aed" compact />,
                    'Supervisor — Intent Sınıflandırıcı',
                    GitBranch,
                    '#7c3aed',
                    supervisorAgent ? (
                        <ApiPayloadPreview agent={supervisorAgent} rags={[]} />
                    ) : (
                        <div className="px-4 py-4 text-[11px] text-stone-600 leading-relaxed space-y-2">
                            <p><strong>Görev:</strong> Kullanıcı mesajını + komutu + dosya bağlamını okuyup intent ve specialist plan'ı üretir.</p>
                            <p><strong>5 intent:</strong> general, hata_cozumu, rapor_arama, n8n, dosya_qa.</p>
                            <p className="text-stone-400 italic mt-2">Kod: backend/services/agent_graph/nodes/supervisor.py</p>
                        </div>
                    )
                )}

                {/* Specialist'ler */}
                {SPECIALISTS.map((spec) => {
                    const isInactive = (spec.id === 'n8n_trigger' && !actionActive);
                    const specAgent = spec.usesAgent ? getAgentById(spec.usesAgent) : null;
                    return renderNode(
                        spec.id,
                        <PillNode icon={spec.icon} label={spec.label} sub={spec.sub} dotColor={spec.color} inactive={isInactive} />,
                        `${spec.label} — Specialist`,
                        spec.icon,
                        spec.color,
                        specAgent ? (
                            <ApiPayloadPreview agent={specAgent} rags={spec.id === 'rag_search' ? rags : []} />
                        ) : (
                            <div className="px-4 py-4 text-[11px] text-stone-600 leading-relaxed space-y-2">
                                <p>{spec.info}</p>
                                {spec.usesAgent && (
                                    <p className="text-stone-500"><strong>Bağlı ajan:</strong> {spec.usesAgent} <span className="text-amber-600">(seed bekleniyor)</span></p>
                                )}
                                <p className="text-stone-400 italic mt-2">Kod: backend/services/agent_graph/nodes/{spec.id}.py</p>
                            </div>
                        )
                    );
                })}

                {/* AGGREGATOR */}
                {renderNode(
                    'aggregator',
                    <PillNode icon={Sparkles} label="Aggregator" sub="" dotColor={chatbotActive ? '#378ADD' : '#94a3b8'} inactive={!chatbotActive} compact />,
                    'Aggregator — Yanıt Sentezi',
                    Sparkles,
                    '#378ADD',
                    aggregatorAgent ? (
                        <ApiPayloadPreview agent={aggregatorAgent} rags={rags} />
                    ) : (
                        <div className="px-4 py-6 flex flex-col items-center gap-3">
                            <AlertTriangle size={20} className="text-amber-500" />
                            <p className="text-[11px] text-stone-500 text-center">Aggregator ajanı (sys_node_aggregator) bulunamadı.</p>
                        </div>
                    )
                )}

                {/* MSG POLISH */}
                {msgPolishActive && renderNode(
                    'msg_polish',
                    <PillNode icon={Wand2} label="Msg Polish" sub="" dotColor="#a855f7" compact dashedBorder />,
                    'Msg Polish — Mesaj Revize',
                    MessageSquareText,
                    '#a855f7',
                    msgAgent ? (
                        <ApiPayloadPreview agent={msgAgent} rags={[]} />
                    ) : (
                        <div className="px-4 py-6 flex flex-col items-center gap-3">
                            <AlertTriangle size={20} className="text-amber-500" />
                            <p className="text-[11px] text-stone-500 text-center">sys_node_msg_polish ajanı bulunamadı.</p>
                        </div>
                    )
                )}

                {/* YANIT */}
                {renderNode(
                    'response',
                    <div className={`relative w-full h-full rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing transition-all shadow-sm select-none ${chatbotActive ? 'bg-white border border-stone-200 hover:border-[#378ADD] hover:shadow-md' : 'bg-stone-100 border border-stone-200'}`}>
                        <User size={20} strokeWidth={1.8} className={chatbotActive ? 'text-stone-500' : 'text-stone-400'} />
                        <span className="absolute left-1/2 -translate-x-1/2 -bottom-5 text-[9px] font-bold tracking-widest uppercase text-stone-400 whitespace-nowrap pointer-events-none">Yanıt</span>
                    </div>,
                    'Yanıt',
                    User,
                    '#378ADD',
                    chatbotActive ? (
                        <ApiPayloadPreview agent={chatbotAgent} rags={rags} />
                    ) : (
                        <div className="px-4 py-8 flex flex-col items-center gap-4">
                            <AlertTriangle size={20} strokeWidth={2.5} className="text-amber-500" />
                            <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 text-center leading-relaxed">
                                Sohbet Asistanı pasif.<br />Yanıt üretilemez.
                            </p>
                        </div>
                    )
                )}

                {/* Alt şerit — sadece görünmeyen runtime bileşenleri */}
                <div
                    className="absolute z-10 flex items-center gap-2 pointer-events-auto"
                    style={{ bottom: 8, left: '50%', transform: 'translateX(-50%)' }}
                >
                    <span className="text-[8px] font-black uppercase tracking-widest text-stone-400 whitespace-nowrap">Görünmeyen Bileşenler</span>
                    {HIDDEN_COMPONENTS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setPopupPos({ x: rect.right + 12, y: rect.top + rect.height / 2 });
                                setPopupId(popupId === `hidden_${id}` ? null : `hidden_${id}`);
                                if (onOpenPayload) onOpenPayload();
                            }}
                            title={label}
                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-stone-50 border border-stone-200 hover:border-violet-300 hover:bg-violet-50 transition-all group"
                        >
                            <Icon size={10} strokeWidth={2.5} className="text-stone-400 group-hover:text-violet-600 transition-colors" />
                            <span className="text-[9px] font-bold uppercase tracking-wide text-stone-500 group-hover:text-violet-700 transition-colors whitespace-nowrap">{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Görünmeyen bileşen popup'ları */}
            {HIDDEN_COMPONENTS.map(comp => popupId === `hidden_${comp.id}` && (
                <PopupPortal key={comp.id} title={comp.label} icon={comp.icon} iconColor="#7c3aed" popupPos={popupPos} onClose={() => setPopupId(null)} width={400}>
                    <div className="px-4 py-4 bg-stone-50 rounded-b-xl text-[11px] text-stone-600 leading-relaxed space-y-2">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Info size={11} strokeWidth={2.5} className="text-violet-600" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-violet-700">Runtime Bileşeni</span>
                        </div>
                        <p>{comp.info}</p>
                    </div>
                </PopupPortal>
            ))}
        </div>
    );
};

// Pill — kompakt kapsül.
const PillNode = ({ icon: Icon, label, sub, dotColor, inactive = false, compact = false, dashedBorder = false }) => (
    <div
        className={`relative w-full h-full rounded-full bg-white flex items-center gap-2 px-3 cursor-grab active:cursor-grabbing select-none transition-all shadow-sm ${dashedBorder ? 'border border-dashed' : 'border'} ${inactive ? 'opacity-50' : 'hover:border-stone-400 hover:-translate-y-0.5 hover:shadow-md'}`}
        style={{ borderColor: dashedBorder ? '#d8b4fe' : '#e7e5e4' }}
    >
        <div className="relative shrink-0 w-7 h-7 rounded-full bg-stone-50 flex items-center justify-center">
            <Icon size={13} strokeWidth={2} className="text-stone-500" />
            <span
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-white"
                style={{ backgroundColor: dotColor }}
            />
        </div>
        <div className="flex-1 min-w-0 flex flex-col leading-tight">
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-700 truncate">{label}</span>
            {!compact && sub && <span className="text-[9px] font-medium text-stone-400 truncate">{sub}</span>}
        </div>
        <ChevronDown size={11} strokeWidth={2.5} className="text-stone-300 shrink-0" />
    </div>
);

// Genişlemiş kart — header sürüklenebilir, gövde scrollable.
const ExpandedCard = ({ title, icon: Icon = FileJson, iconColor, onClose, headerHandlers, children }) => (
    <div className="w-full h-full rounded-xl border border-stone-200 bg-white shadow-[0_12px_40px_rgb(0,0,0,0.18)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div
            {...headerHandlers}
            style={{ touchAction: 'none' }}
            className="px-4 py-2.5 border-b border-stone-100 flex items-center justify-between gap-2 bg-stone-50 shrink-0 cursor-grab active:cursor-grabbing select-none"
        >
            <div className="flex items-center gap-2 min-w-0">
                <Icon size={13} strokeWidth={2} style={{ color: iconColor || '#378ADD' }} className="shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-600 truncate">{title}</span>
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                onPointerDown={(e) => e.stopPropagation()}
                className="text-slate-300 hover:text-slate-500 transition-colors text-base leading-none shrink-0"
                title="Kapat"
            >×</button>
        </div>
        <div className="flex-1 overflow-y-auto">
            {children}
        </div>
    </div>
);

export default GraphTopologyOverview;
