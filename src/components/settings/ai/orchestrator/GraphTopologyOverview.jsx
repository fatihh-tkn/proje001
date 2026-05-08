import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
    User, GitBranch, Search, Wrench, Database, Webhook,
    Sparkles, Wand2, FileJson, AlertTriangle, Power,
    PencilLine, FileText, Mic, Save, Brain, Clock, History,
    Info, ChevronDown,
} from 'lucide-react';
import ApiPayloadPreview from './ApiPayloadPreview';

/* ── Portal popup ─────────────────────────────────────────────── */
const PopupPortal = ({ title, icon: Icon = FileJson, iconColor, popupPos, onClose, width = 340, anchor = 'middle', children }) =>
    ReactDOM.createPortal(
        <>
            <div className="fixed inset-0 z-[9998]" onClick={onClose} />
            <div
                className="fixed z-[9999] rounded-xl border border-stone-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col"
                style={{ left: popupPos.x, top: popupPos.y, width, transform: anchor === 'middle' ? 'translateY(-50%)' : 'none' }}
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

/* ── Data ─────────────────────────────────────────────────────── */
const SPECIALISTS = [
    { id: 'rag_search',   label: 'RAG Arama',   sub: 'hybrid kb',  icon: Search,   color: '#0ea5e9', bg: 'rgba(14,165,233,0.08)',  usesAgent: 'sys_node_rag_search',   info: 'Vektör + tam metin hibrit arama. Belge & toplantı havuzlarından kullanıcı sorgusuyla en alakalı parçaları çeker.' },
    { id: 'error_solver', label: 'Hata Çözücü', sub: 'json schema', icon: Wrench,   color: '#ef4444', bg: 'rgba(239,68,68,0.07)',   usesAgent: 'sys_node_error_solver', info: 'SAP/sistem hatalarını yapılandırılmış JSON formatında (error_solution) çözümleyen uzman.' },
    { id: 'zli_finder',   label: "Z'li Rapor",  sub: 'sql + llm',  icon: Database,  color: '#0891b2', bg: 'rgba(8,145,178,0.08)',   usesAgent: 'sys_node_zli_finder',   info: "SQL'den aday Z'li raporları çekip LLM ile en uygunu seçen uzman." },
    { id: 'n8n_trigger',  label: 'n8n Tetikle', sub: 'workflow',    icon: Webhook,  color: '#16a34a', bg: 'rgba(22,163,74,0.07)',   usesAgent: 'sys_node_n8n_trigger',  info: 'sys_node_n8n_trigger ajanı kullanıcı mesajını analiz edip n8n workflow tetikler.' },
];

const HIDDEN_COMPONENTS = [
    { id: 'history',    label: 'Sohbet Geçmişi',       icon: History, info: "Önceki turlar (user/assistant mesajları) supervisor tarafından state.history'e doldurulur, aggregator LLM çağrısında geri beslenir." },
    { id: 'memory',     label: 'Semantik Hafıza',      icon: Brain,   info: "Eski konuşmalardan vektör DB ile semantik benzerlik araması — aggregator system prompt'una enjekte edilir." },
    { id: 'checkpoint', label: 'Checkpointer',         icon: Save,    info: 'PostgresSaver — her node sonrası state DB\'ye yazılır.' },
    { id: 'persist',    label: 'Log + History Yazımı', icon: Clock,   info: 'Runner sonunda add_log_to_db + _save_to_history threadpool\'da çalışır.' },
];

/* ── Canvas config ─────────────────────────────────────────────── */
const CANVAS_W = 960;
const CANVAS_H = 480;
const EXPANDED_W = 380;
const EXPANDED_H = 340;
const DRAG_THRESHOLD = 4;
const STORAGE_KEY = 'graph_topology_positions_v4';

// Left-to-right flow: User → Supervisor → [4 Specialists] → Aggregator → [MsgPolish?] → Response
const DEFAULT_POSITIONS = {
    user:         { x: 68,  y: 240 },
    prompt_bot:   { x: 192, y: 98  },
    supervisor:   { x: 210, y: 240 },
    rag_search:   { x: 450, y: 118 },
    error_solver: { x: 450, y: 210 },
    zli_finder:   { x: 450, y: 302 },
    n8n_trigger:  { x: 450, y: 375 },
    aggregator:   { x: 730, y: 240 },
    msg_polish:   { x: 840, y: 365 },
    response:     { x: 930, y: 240 },
    rag_pool_1:   { x: 600, y: 55  },
    rag_pool_2:   { x: 600, y: 84  },
};

const NODE_SIZE = {
    user:         { w: 60,  h: 60  },
    prompt_bot:   { w: 155, h: 44  },
    supervisor:   { w: 145, h: 48  },
    rag_search:   { w: 155, h: 50  },
    error_solver: { w: 155, h: 50  },
    zli_finder:   { w: 155, h: 50  },
    n8n_trigger:  { w: 155, h: 50  },
    aggregator:   { w: 155, h: 48  },
    msg_polish:   { w: 140, h: 44  },
    response:     { w: 60,  h: 60  },
    rag_pool_1:   { w: 80,  h: 24  },
    rag_pool_2:   { w: 94,  h: 24  },
};

/* ── Main component ────────────────────────────────────────────── */
const GraphTopologyOverview = ({ allAgents, rags, onOpenPayload, onToggleAgent }) => {
    const [popupId, setPopupId] = useState(null);
    const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
    const [expandedId, setExpandedId] = useState(null);
    const [positions, setPositions] = useState(() => {
        try {
            const raw = typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY);
            if (raw) return { ...DEFAULT_POSITIONS, ...JSON.parse(raw) };
        } catch { /* ignore */ }
        return DEFAULT_POSITIONS;
    });

    useEffect(() => {
        try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(positions)); }
        catch { /* ignore */ }
    }, [positions]);

    const canvasRef = useRef(null);
    const dragRef = useRef(null);

    const getAgentById = (id) => allAgents?.find(a => a.id === id);
    const isAgentActive = (id) => { const a = getAgentById(id); return !a || a.active !== false; };

    const aggregatorAgent = getAgentById('sys_node_aggregator') || getAgentById('sys_agent_chatbot_001');
    const msgAgent        = getAgentById('sys_node_msg_polish')  || getAgentById('sys_agent_msg_001');
    const promptAgent     = getAgentById('sys_agent_prompt_001');
    const supervisorAgent = getAgentById('sys_node_supervisor');

    const chatbotActive   = aggregatorAgent ? aggregatorAgent.active !== false : false;
    const msgPolishActive = msgAgent ? msgAgent.active !== false : false;
    const actionActive    = isAgentActive('sys_node_n8n_trigger') || isAgentActive('sys_agent_action_001');
    const promptActive    = isAgentActive('sys_agent_prompt_001');

    const allowedRags = aggregatorAgent?.allowedRags || aggregatorAgent?.allowed_rags || [];
    const isRag1Active = chatbotActive && allowedRags.includes('rag_1');
    const isRag2Active = chatbotActive && allowedRags.includes('rag_2');

    /* ── Drag ── */
    const onPointerDown = useCallback((e, id) => {
        if (e.button !== undefined && e.button !== 0) return;
        e.stopPropagation();
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /**/ }
        const rect = canvasRef.current?.getBoundingClientRect();
        dragRef.current = {
            id, pointerId: e.pointerId,
            startX: e.clientX, startY: e.clientY,
            origX: positions[id].x, origY: positions[id].y,
            scale: rect ? rect.width / CANVAS_W : 1,
            moved: false, target: e.currentTarget,
        };
    }, [positions]);

    const onPointerMove = useCallback((e) => {
        const d = dragRef.current;
        if (!d || d.pointerId !== e.pointerId) return;
        const dx = (e.clientX - d.startX) / d.scale;
        const dy = (e.clientY - d.startY) / d.scale;
        if (!d.moved && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) d.moved = true;
        if (d.moved) {
            setPositions(p => ({
                ...p,
                [d.id]: { x: Math.max(0, Math.min(CANVAS_W, d.origX + dx)), y: Math.max(0, Math.min(CANVAS_H, d.origY + dy)) },
            }));
        }
    }, []);

    const onPointerUp = useCallback((e) => {
        const d = dragRef.current;
        if (!d || d.pointerId !== e.pointerId) return;
        const { moved, id, target } = d;
        try { target.releasePointerCapture(e.pointerId); } catch { /**/ }
        dragRef.current = null;
        if (!moved && !id.startsWith('rag_pool_')) {
            setExpandedId(prev => prev === id ? null : id);
            if (onOpenPayload) onOpenPayload();
        }
    }, [onOpenPayload]);

    const dragHandlers = useCallback((id) => ({
        onPointerDown: (e) => onPointerDown(e, id),
        onPointerMove, onPointerUp, onPointerCancel: onPointerUp,
    }), [onPointerDown, onPointerMove, onPointerUp]);

    /* ── SVG paths ── */
    const paths = useMemo(() => {
        const p = positions;
        // Horizontal side edges — used for the left-to-right main flow
        const rE = (id) => ({ x: p[id].x + NODE_SIZE[id].w / 2, y: p[id].y });
        const lE = (id) => ({ x: p[id].x - NODE_SIZE[id].w / 2, y: p[id].y });
        // Smart edge — for diagonal paths (aggregator → msg_polish)
        const smartEdge = (id, tx, ty) => {
            const { x, y } = p[id];
            const { w, h } = NODE_SIZE[id];
            const dx = tx - x, dy = ty - y;
            const hw = w / 2, hh = h / 2;
            if (Math.abs(dx) * hh >= Math.abs(dy) * hw)
                return { x: x + (dx >= 0 ? hw : -hw), y };
            return { x, y: y + (dy >= 0 ? hh : -hh) };
        };
        const curve = (a, b) => {
            const dx = b.x - a.x, dy = b.y - a.y;
            if (Math.abs(dx) >= Math.abs(dy)) {
                const cx = (a.x + b.x) / 2;
                return `M ${a.x} ${a.y} C ${cx} ${a.y} ${cx} ${b.y} ${b.x} ${b.y}`;
            }
            const cy = (a.y + b.y) / 2;
            return `M ${a.x} ${a.y} C ${a.x} ${cy} ${b.x} ${cy} ${b.x} ${b.y}`;
        };
        // Left-to-right: always right-edge → left-edge
        const h2h = (a, b) => curve(rE(a), lE(b));
        return {
            userToSup:       h2h('user', 'supervisor'),
            specialistPaths: SPECIALISTS.map(s => ({
                color: s.color, id: s.id,
                dispatch: h2h('supervisor', s.id),
                fanIn:    h2h(s.id, 'aggregator'),
            })),
            aggToPolish:  curve(
                smartEdge('aggregator', p.msg_polish.x, p.msg_polish.y),
                smartEdge('msg_polish', p.aggregator.x, p.aggregator.y),
            ),
            polishToResp: h2h('msg_polish', 'response'),
            aggToResp:    h2h('aggregator', 'response'),
            // RAG pool bağlantıları: rag_search SAĞ ORTASINDAN çık, yatay ayrıl, pool sol merkezine gir
            ragLines: (['rag_pool_1', 'rag_pool_2']).map(pid => {
                const sx = p.rag_search.x + NODE_SIZE.rag_search.w / 2;
                const sy = p.rag_search.y;
                const tx = p[pid].x - NODE_SIZE[pid].w / 2;
                const ty = p[pid].y;
                const c1x = sx + Math.max(18, Math.abs(ty - sy));
                return `M ${sx} ${sy} C ${c1x} ${sy} ${tx} ${ty} ${tx} ${ty}`;
            }),
        };
    }, [positions]);

    /* ── Parallel group bounding box ── */
    const pBounds = useMemo(() => {
        const specs = SPECIALISTS.map(s => ({ ...positions[s.id], ...NODE_SIZE[s.id] }));
        const minY = Math.min(...specs.map(s => s.y - s.h / 2));
        const maxY = Math.max(...specs.map(s => s.y + s.h / 2));
        const minX = Math.min(...specs.map(s => s.x - s.w / 2));
        const maxX = Math.max(...specs.map(s => s.x + s.w / 2));
        return { x: minX - 14, y: minY - 20, w: maxX - minX + 28, h: maxY - minY + 34 };
    }, [positions]);

    const closeExpanded = () => setExpandedId(null);

    /* ── Node renderer ── */
    const renderNode = (id, pill, expTitle, expIcon, expIconColor, expBody) => {
        const isExp = expandedId === id;
        const pos = positions[id];
        const sz = NODE_SIZE[id];
        const bottomAnchor = isExp && pos.y + EXPANDED_H - sz.h / 2 > CANVAS_H + 40;
        const top = bottomAnchor ? pos.y + sz.h / 2 - EXPANDED_H : pos.y - sz.h / 2;

        return (
            <div
                key={id}
                className="absolute"
                style={{
                    left: pos.x, top,
                    width: isExp ? EXPANDED_W : sz.w,
                    height: isExp ? EXPANDED_H : sz.h,
                    transform: 'translate(-50%, 0)',
                    zIndex: isExp ? 40 : 10,
                    transition: 'width 220ms cubic-bezier(0.22,1,0.36,1), height 220ms cubic-bezier(0.22,1,0.36,1)',
                }}
            >
                {isExp ? (
                    <ExpandedCard title={expTitle} icon={expIcon} iconColor={expIconColor} onClose={closeExpanded} headerHandlers={dragHandlers(id)}>
                        {expBody}
                    </ExpandedCard>
                ) : (
                    <div {...dragHandlers(id)} className="w-full h-full" style={{ touchAction: 'none' }}>
                        {pill}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-full h-full relative flex items-center justify-center bg-transparent rounded-xl border border-stone-200/60 isolate overflow-visible">

            {/* Animated dash keyframes */}
            <style>{`
                @keyframes tpFlow     { to { stroke-dashoffset: -28; } }
                @keyframes tpFlowFast { to { stroke-dashoffset: -24; } }
                @keyframes tpFlowSlow { to { stroke-dashoffset: -32; } }
                .tp-line      { animation: tpFlow     2s   linear infinite; }
                .tp-line-fast { animation: tpFlowFast 1.3s linear infinite; }
                .tp-line-slow { animation: tpFlowSlow 3s   linear infinite; }
            `}</style>

            <div
                ref={canvasRef}
                className="relative z-10 scale-[0.52] sm:scale-[0.65] md:scale-[0.82] lg:scale-[0.93] transition-transform origin-center"
                style={{ width: CANVAS_W, height: CANVAS_H }}
            >
                {/* SVG layer */}
                <svg
                    className="absolute inset-0 w-full h-full pointer-events-none z-0"
                    viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
                    preserveAspectRatio="none"
                >
                    <defs>
                        <pattern id="tpGrid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
                            <circle cx="0.8" cy="0.8" r="0.9" fill="#dde1e9" />
                        </pattern>
                    </defs>

                    {/* Dot grid bg */}
                    <rect width={CANVAS_W} height={CANVAS_H} fill="url(#tpGrid)" opacity="0.55" />

                    {/* Parallel group border — no fill, dashed stroke only */}
                    <rect
                        x={pBounds.x} y={pBounds.y}
                        width={pBounds.w} height={pBounds.h}
                        rx={16}
                        fill="none"
                        stroke="#a5b4fc"
                        strokeWidth={1.5}
                        strokeDasharray="6 4"
                        strokeOpacity="0.7"
                    />
                    {/* Label with a tiny white pill background so it's readable over the dot grid */}
                    <rect
                        x={pBounds.x + pBounds.w / 2 - 22}
                        y={pBounds.y - 8}
                        width={44} height={12}
                        rx={4}
                        fill="#f8f9fb"
                    />
                    <text
                        x={pBounds.x + pBounds.w / 2}
                        y={pBounds.y - 1}
                        textAnchor="middle"
                        fontSize={7}
                        fill="#818cf8"
                        fontWeight="800"
                        fontFamily="system-ui, -apple-system, sans-serif"
                        letterSpacing="2"
                    >PARALEL</text>

                    {/* User → Supervisor */}
                    <path d={paths.userToSup} stroke="#94a3b8" strokeWidth="1.5" fill="none" strokeDasharray="8 5" className="tp-line" />

                    {/* Supervisor → Specialists (dispatch) */}
                    {paths.specialistPaths.map(sp => (
                        <path key={`d-${sp.id}`} d={sp.dispatch} stroke={sp.color} strokeWidth="1.5" strokeDasharray="7 5" strokeOpacity="0.5" fill="none" className="tp-line" />
                    ))}

                    {/* Specialists → Aggregator (fan-in) */}
                    {paths.specialistPaths.map(sp => (
                        <path key={`fi-${sp.id}`} d={sp.fanIn} stroke={sp.color} strokeWidth="1.5" strokeDasharray="7 5" strokeOpacity="0.4" fill="none" className="tp-line-fast" />
                    ))}

                    {/* Aggregator → Msg Polish (optional) */}
                    {msgPolishActive && (
                        <path d={paths.aggToPolish} stroke="#a855f7" strokeWidth="1.5" strokeDasharray="5 4" strokeOpacity="0.65" fill="none" className="tp-line-slow" />
                    )}

                    {/* Final → Response */}
                    <path d={msgPolishActive ? paths.polishToResp : paths.aggToResp} stroke="#378ADD" strokeWidth="2" strokeDasharray="8 5" strokeOpacity="0.75" fill="none" className="tp-line-fast" />

                    {/* RAG pool bağlantı çizgileri */}
                    {paths.ragLines.map((d, i) => (
                        <path key={`rag-${i}`} d={d} stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="4 3" strokeOpacity="0.6" fill="none" />
                    ))}
                </svg>

                {/* ── USER ── */}
                {renderNode('user',
                    <div
                        className="w-full h-full rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing hover:shadow-lg transition-all shadow-md select-none relative border-2"
                        style={{ background: 'linear-gradient(145deg,#fff,#f0f4ff)', borderColor: '#c7d2fe' }}
                    >
                        <User size={20} strokeWidth={1.8} className="text-indigo-400" />
                        <span className="absolute left-1/2 -translate-x-1/2 -bottom-5 text-[9px] font-bold tracking-widest uppercase text-stone-400 whitespace-nowrap pointer-events-none">Başlatıcı</span>
                    </div>,
                    'Ham Kullanıcı İstemi', User, '#6366f1',
                    <ApiPayloadPreview agent={{ persona: 'Kullanıcının yazdığı ham metin', model: 'N/A' }} rags={[]} isUser />
                )}

                {/* ── RAG POOL CHIPS (sürüklenebilir) ── */}
                {[
                    { id: 'rag_pool_1', active: isRag1Active, Icon: FileText, label: 'Belge KB',    title: 'Resmi Belgeler Öz Havuzu' },
                    { id: 'rag_pool_2', active: isRag2Active, Icon: Mic,      label: 'Toplantı KB', title: 'Canlı Toplantılar Havuzu' },
                ].map(({ id, active, Icon, label, title }) => {
                    const pos = positions[id];
                    const sz  = NODE_SIZE[id];
                    return (
                        <div
                            key={id}
                            className="absolute"
                            style={{ left: pos.x, top: pos.y - sz.h / 2, width: sz.w, height: sz.h, transform: 'translate(-50%, 0)', zIndex: 8, touchAction: 'none' }}
                            {...dragHandlers(id)}
                        >
                            <div
                                className={`w-full h-full flex items-center gap-1 px-2 rounded-full border cursor-grab active:cursor-grabbing select-none shadow-sm transition-all ${
                                    active
                                        ? 'bg-sky-50 border-sky-200 text-sky-600 hover:-translate-y-px hover:shadow-md'
                                        : 'bg-white border-stone-200 text-stone-400 opacity-50'
                                }`}
                                title={title}
                            >
                                <Icon size={9} strokeWidth={2.5} />
                                <span className="text-[7.5px] font-bold uppercase tracking-wide whitespace-nowrap flex-1">{label}</span>
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-sky-400' : 'bg-stone-300'}`} />
                            </div>
                        </div>
                    );
                })}

                {/* ── PROMPT BOT (out-of-flow) ── */}
                {renderNode('prompt_bot',
                    <PillNode icon={PencilLine} label="İstem Revize" sub="akış dışı" dotColor="#d97706" inactive={!promptActive} dashedBorder />,
                    'İstem Revize Botu — Akış Dışı', PencilLine, '#d97706',
                    <div className="px-4 py-4 text-[11px] text-stone-600 leading-relaxed space-y-3">
                        <div className="px-2 py-1 rounded bg-amber-50 border border-amber-200 text-[10px] text-amber-700 font-bold inline-block">
                            Bu ajan LangGraph akışında DEĞİL
                        </div>
                        <p>✨ butonuna tıkladığında <code className="bg-stone-100 px-1 py-0.5 rounded text-[10px]">/api/chat/revise-prompt</code> endpoint'i ayrıca çağrılır. Mesaj graph'a girmeden dönüştürülür.</p>
                        {promptAgent ? (
                            <>
                                <p className="text-stone-500"><strong>Bağlı ajan:</strong> {promptAgent.name}</p>
                                {!promptActive && (
                                    <button onClick={() => onToggleAgent?.('sys_agent_prompt_001')}
                                        className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-all text-amber-700">
                                        <Power size={11} strokeWidth={2.5} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Aktifleştir</span>
                                    </button>
                                )}
                            </>
                        ) : (
                            <p className="text-stone-400 italic">sys_agent_prompt_001 bulunamadı.</p>
                        )}
                    </div>
                )}

                {/* ── SUPERVISOR ── */}
                {renderNode('supervisor',
                    <PillNode icon={GitBranch} label="Supervisor" sub="intent router" dotColor="#7c3aed" bgColor="rgba(124,58,237,0.07)" />,
                    'Supervisor — Intent Sınıflandırıcı', GitBranch, '#7c3aed',
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

                {/* ── SPECIALISTS ── */}
                {SPECIALISTS.map((spec) => {
                    const inactive = spec.id === 'n8n_trigger' && !actionActive;
                    const specAgent = spec.usesAgent ? getAgentById(spec.usesAgent) : null;
                    return renderNode(
                        spec.id,
                        <PillNode icon={spec.icon} label={spec.label} sub={spec.sub} dotColor={spec.color} bgColor={spec.bg} inactive={inactive} />,
                        `${spec.label} — Specialist`, spec.icon, spec.color,
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

                {/* ── AGGREGATOR ── */}
                {renderNode('aggregator',
                    <PillNode
                        icon={Sparkles} label="Aggregator" sub="fan-in synthesis"
                        dotColor={chatbotActive ? '#378ADD' : '#94a3b8'}
                        bgColor={chatbotActive ? 'rgba(55,138,221,0.08)' : undefined}
                        inactive={!chatbotActive}
                    />,
                    'Aggregator — Yanıt Sentezi', Sparkles, '#378ADD',
                    aggregatorAgent ? (
                        <ApiPayloadPreview agent={aggregatorAgent} rags={rags} />
                    ) : (
                        <div className="px-4 py-6 flex flex-col items-center gap-3">
                            <AlertTriangle size={20} className="text-amber-500" />
                            <p className="text-[11px] text-stone-500 text-center">sys_node_aggregator bulunamadı.</p>
                        </div>
                    )
                )}

                {/* ── MSG POLISH (optional) ── */}
                {msgPolishActive && renderNode('msg_polish',
                    <PillNode icon={Wand2} label="Msg Polish" sub="opsiyonel revize" dotColor="#a855f7" bgColor="rgba(168,85,247,0.07)" dashedBorder />,
                    'Msg Polish — Mesaj Revize', Wand2, '#a855f7',
                    msgAgent ? (
                        <ApiPayloadPreview agent={msgAgent} rags={[]} />
                    ) : (
                        <div className="px-4 py-6 flex flex-col items-center gap-3">
                            <AlertTriangle size={20} className="text-amber-500" />
                            <p className="text-[11px] text-stone-500 text-center">sys_node_msg_polish bulunamadı.</p>
                        </div>
                    )
                )}

                {/* ── RESPONSE ── */}
                {renderNode('response',
                    <div
                        className={`relative w-full h-full rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing transition-all shadow-md select-none border-2 ${chatbotActive ? 'hover:shadow-lg' : ''}`}
                        style={chatbotActive
                            ? { background: 'linear-gradient(145deg,rgba(55,138,221,0.08),#fff)', borderColor: 'rgba(55,138,221,0.35)' }
                            : { background: '#f1f5f9', borderColor: '#e2e8f0' }
                        }
                    >
                        <User size={20} strokeWidth={1.8} className={chatbotActive ? 'text-[#378ADD]' : 'text-stone-400'} />
                        <span className="absolute left-1/2 -translate-x-1/2 -bottom-5 text-[9px] font-bold tracking-widest uppercase text-stone-400 whitespace-nowrap pointer-events-none">Yanıt</span>
                    </div>,
                    'Yanıt', User, '#378ADD',
                    chatbotActive ? (
                        <ApiPayloadPreview agent={aggregatorAgent} rags={rags} />
                    ) : (
                        <div className="px-4 py-8 flex flex-col items-center gap-4">
                            <AlertTriangle size={20} strokeWidth={2.5} className="text-amber-500" />
                            <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 text-center leading-relaxed">
                                Sohbet Asistanı pasif.<br />Yanıt üretilemez.
                            </p>
                        </div>
                    )
                )}

                {/* ── Hidden runtime components strip ── */}
                <div
                    className="absolute z-10 flex items-center gap-1.5 pointer-events-auto"
                    style={{ bottom: 12, left: '50%', transform: 'translateX(-50%)' }}
                >
                    <span className="text-[7.5px] font-black uppercase tracking-[2px] text-stone-400 whitespace-nowrap mr-1">Runtime</span>
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
                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-stone-200 hover:border-violet-300 hover:bg-violet-50 transition-all group shadow-sm"
                        >
                            <Icon size={10} strokeWidth={2.5} className="text-stone-400 group-hover:text-violet-500 transition-colors" />
                            <span className="text-[8.5px] font-bold uppercase tracking-wide text-stone-500 group-hover:text-violet-700 transition-colors whitespace-nowrap">{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Hidden component popups */}
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

/* ── PillNode ─────────────────────────────────────────────────── */
const PillNode = ({ icon: Icon, label, sub, dotColor, bgColor, inactive = false, dashedBorder = false }) => (
    <div
        className={`relative w-full h-full rounded-full flex items-center gap-2.5 px-3 cursor-grab active:cursor-grabbing select-none transition-all shadow-sm ${dashedBorder ? 'border border-dashed' : 'border'} ${inactive ? 'opacity-40' : 'hover:-translate-y-px hover:shadow-md'}`}
        style={{
            borderColor: dashedBorder ? `${dotColor}70` : `${dotColor}45`,
            backgroundColor: bgColor || 'white',
        }}
    >
        <div className="relative shrink-0 w-[26px] h-[26px] rounded-full bg-white/80 flex items-center justify-center shadow-sm">
            <Icon size={12} strokeWidth={2.2} style={{ color: dotColor }} />
            <span
                className="absolute -top-0.5 -right-0.5 w-[7px] h-[7px] rounded-full ring-[1.5px] ring-white"
                style={{ backgroundColor: inactive ? '#94a3b8' : dotColor }}
            />
        </div>
        <div className="flex-1 min-w-0 flex flex-col leading-tight">
            <span className="text-[9.5px] font-black uppercase tracking-wider text-stone-700 truncate">{label}</span>
            {sub && <span className="text-[8.5px] font-medium text-stone-400 truncate mt-px">{sub}</span>}
        </div>
        <ChevronDown size={10} strokeWidth={2.5} className="text-stone-300 shrink-0" />
    </div>
);

/* ── ExpandedCard ─────────────────────────────────────────────── */
const ExpandedCard = ({ title, icon: Icon = FileJson, iconColor, onClose, headerHandlers, children }) => (
    <div className="w-full h-full rounded-xl border border-stone-200 bg-white shadow-[0_12px_40px_rgb(0,0,0,0.16)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
            >×</button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
);

export default GraphTopologyOverview;
