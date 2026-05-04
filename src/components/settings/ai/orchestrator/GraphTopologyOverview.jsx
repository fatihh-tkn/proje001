import { useState } from 'react';
import ReactDOM from 'react-dom';
import {
    User, MessageSquareText, GitBranch, Search, Wrench,
    Database, Webhook, Sparkles, Wand2, FileJson, AlertTriangle, Power,
    PencilLine, FileText, Video, Save, Brain, Clock, History,
    Code2, Info,
} from 'lucide-react';
import ApiPayloadPreview from './ApiPayloadPreview';

/**
 * LangGraph topolojisi — agent_graph_enabled flag açıkken çizilir.
 * Klasik User → Prompt → Chat → Msg → Action akışının yerine gerçek
 * graph mimarisini gösterir:
 *
 *      User → Supervisor → [4 paralel uzman] → Aggregator → MsgPolish? → Yanıt
 *
 * DB ajanları (chatbot, msg_bot, action_bot) artık bu graf düğümlerinin
 * BİRİNDE konfigürasyon olarak kullanılıyor — dolayısıyla ilgili graph
 * node'una tıklandığında ajan payload preview açılır.
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

// Specialist node tanımları (paralel branch).
// `intents` — bu specialist'in supervisor tarafından dispatch edildiği intent'ler.
// Bu sayede UI'da "rag_search 4 intent'te çalışır, error_solver sadece hata_cozumu'nda" diye gösterebiliriz.
const SPECIALISTS = [
    {
        id: 'rag_search',
        label: 'RAG Arama',
        sub: 'Bilgi tabanı (hibrit)',
        icon: Search,
        color: '#0ea5e9',
        usesAgent: null,
        intents: ['general', 'hata_cozumu', 'n8n', 'dosya_qa'],
        info: 'Vektör + tam metin hibrit arama. Belge & toplantı havuzlarından kullanıcı sorgusuyla en alakalı parçaları çeker.',
    },
    {
        id: 'error_solver',
        label: 'Hata Çözücü',
        sub: 'JSON çıktı şeması',
        icon: Wrench,
        color: '#dc2626',
        usesAgent: 'sys_agent_chatbot_001',
        intents: ['hata_cozumu'],
        info: 'SAP/sistem hatalarını yapılandırılmış JSON formatında (error_solution) çözümleyen uzman. Chatbot ajanının modeli + prompt\'u kullanılır.',
    },
    {
        id: 'zli_finder',
        label: "Z'li Rapor",
        sub: 'SQL eşleşme + LLM',
        icon: Database,
        color: '#0891b2',
        usesAgent: 'sys_agent_chatbot_001',
        intents: ['rapor_arama'],
        info: "SQL'den aday Z'li raporları çekip LLM ile en uygunu seçen uzman. JSON çıktısı (zli_report_query).",
    },
    {
        id: 'n8n_trigger',
        label: 'n8n Tetikle',
        sub: 'İşlem Botu',
        icon: Webhook,
        color: '#16a34a',
        usesAgent: 'sys_agent_action_001',
        intents: ['n8n'],
        info: 'İşlem Botu ajanı kullanıcı mesajını analiz edip n8n workflow tetikler. allowed_workflows kontrolü yapılır.',
    },
];

// Intent kısa adları → rozet etiketi
const INTENT_BADGE = {
    general:     { label: 'genel',  bg: '#f1f5f9', fg: '#475569' },
    hata_cozumu: { label: 'hata',   bg: '#fee2e2', fg: '#b91c1c' },
    rapor_arama: { label: 'rapor',  bg: '#cffafe', fg: '#0e7490' },
    n8n:         { label: 'n8n',    bg: '#dcfce7', fg: '#15803d' },
    dosya_qa:    { label: 'dosya',  bg: '#fef3c7', fg: '#a16207' },
};

// Görünmeyen runtime bileşenleri — sağ panelde rozet listesi olarak çizilir.
const HIDDEN_COMPONENTS = [
    {
        id: 'history',
        label: 'Sohbet Geçmişi',
        icon: History,
        info: 'Önceki turlar (user/assistant mesajları) supervisor tarafından state.history\'e doldurulur, aggregator LLM çağrısında geri beslenir.',
    },
    {
        id: 'memory',
        label: 'Semantik Hafıza',
        icon: Brain,
        info: 'Eski konuşmalardan vektör DB ile semantik benzerlik araması (`_fetch_chat_memory`) — aggregator system prompt\'una enjekte edilir.',
    },
    {
        id: 'checkpoint',
        label: 'Checkpointer',
        icon: Save,
        info: 'PostgresSaver — her node sonrası state DB\'ye yazılır. Restart-safe; thread aynı session_id ile devam edebilir.',
    },
    {
        id: 'persist',
        label: 'Log + History Yazımı',
        icon: Clock,
        info: 'Runner sonunda (done event\'inden önce) `add_log_to_db` + `_save_to_history` threadpool\'da çalışır. İptal/hata yollarında da log status="error" olarak yazılır.',
    },
];


const GraphTopologyOverview = ({ allAgents, rags, onOpenPayload, onToggleAgent }) => {
    const [activePopup, setActivePopup] = useState(null);
    const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });

    const getAgentById = (id) => allAgents?.find(a => a.id === id);
    const isAgentActive = (id) => {
        const a = getAgentById(id);
        return !a || a.active !== false;
    };

    const chatbotAgent = getAgentById('sys_agent_chatbot_001');
    const msgAgent = getAgentById('sys_agent_msg_001');
    const promptAgent = getAgentById('sys_agent_prompt_001');

    const chatbotActive = isAgentActive('sys_agent_chatbot_001');
    const msgPolishActive = isAgentActive('sys_agent_msg_001');
    const actionActive = isAgentActive('sys_agent_action_001');
    const promptActive = isAgentActive('sys_agent_prompt_001');

    // Chatbot ajanın allowed_rags listesi → rag_search üstündeki havuz rozetleri
    const allowedRags = chatbotAgent?.allowedRags || chatbotAgent?.allowed_rags || [];
    const isRag1Active = chatbotActive && allowedRags.includes('rag_1');
    const isRag2Active = chatbotActive && allowedRags.includes('rag_2');

    // Canvas geometrisi
    const W = 1000;
    const supervisorY = 78;
    const specialistY = 210;
    const aggregatorY = 340;
    const polishY = 442;
    const responseY = 442;
    // Aggregator yüksekliği (header + JSON satırı + LLM satırı) — ortalama ~90px
    const aggregatorHalfH = 45;

    // Specialist x koordinatları
    const specCount = SPECIALISTS.length;
    const specPad = 80;
    const specGap = (W - 2 * specPad) / (specCount - 1);
    const specX = SPECIALISTS.map((_, i) => specPad + i * specGap);
    const supervisorX = W / 2;
    const aggregatorX = W / 2;
    const polishX = W / 2 - 130;
    const responseX = W / 2 + 130;

    const handleNodeClick = (key, e) => {
        if (activePopup === key) { setActivePopup(null); return; }
        const rect = e.currentTarget.getBoundingClientRect();
        setPopupPos({ x: rect.right + 12, y: rect.top + rect.height / 2 });
        setActivePopup(key);
        if (onOpenPayload) onOpenPayload();
    };

    const closePopup = () => setActivePopup(null);

    return (
        <div className="w-full h-full relative flex items-center justify-center bg-stone-50/50 rounded-xl border border-stone-200 isolate overflow-visible">
            <div className="relative w-[1000px] h-[540px] z-10 scale-[0.55] sm:scale-[0.7] md:scale-[0.85] lg:scale-95 transition-transform origin-center">

                {/* Mode badge */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 border border-violet-200 shadow-sm">
                    <GitBranch size={11} strokeWidth={2.5} className="text-violet-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-violet-700">LangGraph Modu</span>
                </div>

                {/* SVG bağlantı çizgileri */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    <defs>
                        <linearGradient id="graphFlow" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.05" />
                            <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.05" />
                        </linearGradient>
                    </defs>

                    {/* User → Supervisor */}
                    <line x1={60} y1={supervisorY} x2={supervisorX - 90} y2={supervisorY} stroke="#cbd5e1" strokeWidth="2" />

                    {/* Supervisor → Her specialist (paralel dispatch) */}
                    {specX.map((x, i) => (
                        <path
                            key={`disp-${i}`}
                            d={`M ${supervisorX} ${supervisorY + 35} C ${supervisorX} ${(supervisorY + specialistY) / 2} ${x} ${(supervisorY + specialistY) / 2} ${x} ${specialistY - 39}`}
                            stroke={SPECIALISTS[i].color}
                            strokeWidth="2"
                            strokeDasharray="5 5"
                            strokeOpacity="0.45"
                            fill="none"
                        />
                    ))}

                    {/* Specialist'ler → Aggregator (fan-in, aggregator üst kenarına bağlanır) */}
                    {specX.map((x, i) => (
                        <path
                            key={`fanin-${i}`}
                            d={`M ${x} ${specialistY + 39} C ${x} ${(specialistY + aggregatorY) / 2} ${aggregatorX} ${(specialistY + aggregatorY) / 2} ${aggregatorX} ${aggregatorY - aggregatorHalfH}`}
                            stroke="#94a3b8"
                            strokeWidth="2"
                            strokeOpacity="0.4"
                            fill="none"
                        />
                    ))}

                    {/* Aggregator → MsgPolish (conditional, aggregator alt kenarından) */}
                    {msgPolishActive && (
                        <path
                            d={`M ${aggregatorX} ${aggregatorY + aggregatorHalfH} C ${aggregatorX} ${(aggregatorY + polishY) / 2} ${polishX} ${(aggregatorY + polishY) / 2} ${polishX} ${polishY - 25}`}
                            stroke="#a855f7"
                            strokeWidth="2"
                            strokeDasharray="4 4"
                            strokeOpacity="0.55"
                            fill="none"
                        />
                    )}

                    {/* Polish → Response (polish aktifken) veya Aggregator → Response (direkt) */}
                    <path
                        d={msgPolishActive
                            ? `M ${polishX + 60} ${polishY} L ${responseX - 22} ${responseY}`
                            : `M ${aggregatorX} ${aggregatorY + aggregatorHalfH} C ${aggregatorX} ${(aggregatorY + responseY) / 2} ${responseX} ${(aggregatorY + responseY) / 2} ${responseX} ${responseY}`}
                        stroke="url(#graphFlow)"
                        strokeWidth="2.5"
                        fill="none"
                    />
                </svg>

                {/* Kullanıcı düğümü */}
                <div
                    className="absolute z-10 flex flex-col items-center pointer-events-auto"
                    style={{ left: 60, top: supervisorY, transform: 'translate(-50%, -50%)' }}
                >
                    <div
                        onClick={(e) => handleNodeClick('user', e)}
                        className="w-[44px] h-[44px] rounded-full bg-white border border-stone-300 flex items-center justify-center cursor-pointer hover:border-stone-400 hover:shadow-md transition-all shadow-sm"
                    >
                        <User size={16} strokeWidth={2.5} className="text-stone-500" />
                    </div>
                    <span className="absolute top-12 text-[9px] font-bold text-stone-400 tracking-widest uppercase whitespace-nowrap">Kullanıcı</span>
                </div>

                {/* Supervisor düğümü */}
                <div
                    className="absolute z-10 pointer-events-auto"
                    style={{ left: supervisorX, top: supervisorY, transform: 'translate(-50%, -50%)' }}
                >
                    <div
                        onClick={(e) => handleNodeClick('supervisor', e)}
                        className="w-[180px] h-[70px] rounded-2xl bg-white border-2 border-violet-300 shadow-[0_0_20px_rgba(124,58,237,0.15)] flex flex-col items-center justify-center cursor-pointer hover:border-violet-500 hover:-translate-y-0.5 hover:shadow-lg transition-all"
                    >
                        <div className="flex items-center gap-1.5">
                            <GitBranch size={14} strokeWidth={2.5} className="text-violet-600" />
                            <span className="text-[11px] font-black uppercase tracking-widest text-stone-700">Supervisor</span>
                        </div>
                        <span className="text-[9px] font-semibold text-stone-400 mt-0.5">intent + plan</span>
                        <span className="text-[8px] font-bold text-violet-600/80 mt-0.5 tracking-wider">↓ intent'e göre 1-2 uzman dispatch</span>
                    </div>
                </div>

                {/* RAG havuz rozetleri — chatbot.allowed_rags'e göre rag_search üstünde */}
                {(isRag1Active || isRag2Active) && (
                    <div
                        className="absolute z-10 flex items-center gap-1.5 pointer-events-none"
                        style={{ left: specX[0], top: specialistY - 56, transform: 'translate(-50%, -50%)' }}
                    >
                        {isRag1Active && (
                            <div title="rag_1 (Belge havuzu)" className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white border border-[#0ea5e9]/40 shadow-sm">
                                <FileText size={9} strokeWidth={2.5} className="text-[#0ea5e9]" />
                                <span className="text-[8px] font-black uppercase tracking-wider text-[#0ea5e9]">Belge</span>
                            </div>
                        )}
                        {isRag2Active && (
                            <div title="rag_2 (Toplantı havuzu)" className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white border border-[#0ea5e9]/40 shadow-sm">
                                <Video size={9} strokeWidth={2.5} className="text-[#0ea5e9]" />
                                <span className="text-[8px] font-black uppercase tracking-wider text-[#0ea5e9]">Toplantı</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Specialist'ler (paralel, 4 düğüm yan yana) — her birinin altında
                    `intents` rozetleri: hangi intent(ler)de tetiklenir */}
                {SPECIALISTS.map((spec, i) => {
                    const isInactive = (spec.id === 'n8n_trigger' && !actionActive);
                    const Icon = spec.icon;
                    return (
                        <div
                            key={spec.id}
                            className="absolute z-10 pointer-events-auto"
                            style={{ left: specX[i], top: specialistY, transform: 'translate(-50%, -50%)' }}
                        >
                            <div
                                onClick={(e) => handleNodeClick(spec.id, e)}
                                className={`w-[150px] h-[78px] rounded-xl border bg-white flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all shadow-sm ${isInactive ? 'opacity-50 border-stone-200' : 'hover:-translate-y-0.5 hover:shadow-md'}`}
                                style={{
                                    borderColor: isInactive ? undefined : spec.color + '60',
                                }}
                            >
                                <div className="flex items-center gap-1.5">
                                    <Icon size={13} strokeWidth={2.5} style={{ color: isInactive ? '#94a3b8' : spec.color }} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-700">{spec.label}</span>
                                </div>
                                <span className="text-[9px] font-semibold text-stone-400">{spec.sub}</span>
                                {/* Intent rozetleri — bu specialist hangi intent(ler)de dispatch edilir */}
                                <div className="flex items-center gap-0.5 flex-wrap justify-center mt-0.5 max-w-[140px]">
                                    {spec.intents.map(intent => {
                                        const meta = INTENT_BADGE[intent];
                                        if (!meta) return null;
                                        return (
                                            <span
                                                key={intent}
                                                className="text-[8px] font-bold uppercase tracking-wide px-1 py-0.5 rounded"
                                                style={{ backgroundColor: meta.bg, color: meta.fg }}
                                            >
                                                {meta.label}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Aggregator — dual mode kutu:
                    Üst yarı: JSON pass-through (hata_cozumu/rapor_arama intent'lerinde
                              specialist'in chat_draft'ı doğrudan final_reply'a kopyalanır,
                              LLM çağrısı YAPILMAZ).
                    Alt yarı: LLM sentezi (general/n8n/dosya_qa — chatbot ajanı + RAG +
                              chat memory ile token-level streaming yapar). */}
                <div
                    className="absolute z-10 pointer-events-auto"
                    style={{ left: aggregatorX, top: aggregatorY, transform: 'translate(-50%, -50%)' }}
                >
                    <div
                        onClick={(e) => handleNodeClick('aggregator', e)}
                        className={`w-[230px] rounded-2xl bg-white border-2 ${chatbotActive ? 'border-[#378ADD] shadow-[0_0_20px_rgba(55,138,221,0.18)]' : 'border-stone-300'} cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all overflow-hidden`}
                    >
                        {/* Başlık şeridi */}
                        <div className="px-3 py-1.5 border-b border-stone-100 bg-stone-50 flex items-center justify-center gap-1.5">
                            <Sparkles size={13} strokeWidth={2.5} className={chatbotActive ? 'text-[#378ADD]' : 'text-stone-400'} />
                            <span className="text-[11px] font-black uppercase tracking-widest text-stone-700">Aggregator</span>
                        </div>
                        {/* Üst yarı: JSON pass-through */}
                        <div className="px-3 py-1.5 border-b border-stone-100 flex items-center gap-1.5">
                            <Code2 size={10} strokeWidth={2.5} className="text-stone-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-[9px] font-black uppercase tracking-wider text-stone-500">JSON pass-through</div>
                                <div className="text-[8px] text-stone-400 leading-tight">specialist draft → final_reply</div>
                            </div>
                            <div className="flex gap-0.5">
                                <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded" style={{ backgroundColor: INTENT_BADGE.hata_cozumu.bg, color: INTENT_BADGE.hata_cozumu.fg }}>hata</span>
                                <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded" style={{ backgroundColor: INTENT_BADGE.rapor_arama.bg, color: INTENT_BADGE.rapor_arama.fg }}>rapor</span>
                            </div>
                        </div>
                        {/* Alt yarı: LLM sentezi */}
                        <div className="px-3 py-1.5 flex items-center gap-1.5">
                            <Sparkles size={10} strokeWidth={2.5} className={chatbotActive ? 'text-[#378ADD] shrink-0' : 'text-stone-400 shrink-0'} />
                            <div className="flex-1 min-w-0">
                                <div className="text-[9px] font-black uppercase tracking-wider text-stone-700">LLM sentezi</div>
                                <div className="text-[8px] text-stone-400 leading-tight">
                                    {chatbotActive ? 'chatbot prompt + RAG + memory' : 'chatbot pasif'}
                                </div>
                            </div>
                            <div className="flex gap-0.5">
                                <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded" style={{ backgroundColor: INTENT_BADGE.general.bg, color: INTENT_BADGE.general.fg }}>genel</span>
                                <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded" style={{ backgroundColor: INTENT_BADGE.n8n.bg, color: INTENT_BADGE.n8n.fg }}>n8n</span>
                                <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded" style={{ backgroundColor: INTENT_BADGE.dosya_qa.bg, color: INTENT_BADGE.dosya_qa.fg }}>dosya</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MsgPolish düğümü (opsiyonel, conditional) */}
                {msgPolishActive && (
                    <div
                        className="absolute z-10 pointer-events-auto"
                        style={{ left: polishX, top: polishY, transform: 'translate(-50%, -50%)' }}
                    >
                        <div
                            onClick={(e) => handleNodeClick('msg_polish', e)}
                            className="w-[120px] h-[50px] rounded-xl bg-white border border-violet-300 border-dashed flex flex-col items-center justify-center cursor-pointer hover:border-violet-500 hover:-translate-y-0.5 hover:shadow-md transition-all shadow-sm"
                        >
                            <div className="flex items-center gap-1.5">
                                <Wand2 size={12} strokeWidth={2.5} className="text-violet-600" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-stone-700">Msg Polish</span>
                            </div>
                            <span className="text-[8px] font-semibold text-stone-400">opsiyonel</span>
                        </div>
                    </div>
                )}

                {/* Yanıt düğümü */}
                <div
                    className="absolute z-10 flex flex-col items-center pointer-events-auto"
                    style={{ left: responseX, top: responseY, transform: 'translate(-50%, -50%)' }}
                >
                    <div
                        onClick={(e) => handleNodeClick('response', e)}
                        className={`w-[44px] h-[44px] rounded-full flex items-center justify-center cursor-pointer transition-all shadow-sm ${chatbotActive ? 'bg-[#378ADD] hover:bg-[#2A6AAB] shadow-[#378ADD]/30' : 'bg-stone-200 hover:bg-stone-300'}`}
                    >
                        <User size={16} strokeWidth={2.5} className={chatbotActive ? 'text-white' : 'text-stone-400'} />
                    </div>
                    <span className="absolute top-12 text-[9px] font-bold tracking-widest text-stone-400 uppercase whitespace-nowrap">Yanıt</span>
                </div>

                {/* ── Alt şerit: Akış dışı ajan + Görünmeyen runtime bileşenleri ── */}
                <div
                    className="absolute z-10 flex items-center gap-2 pointer-events-auto"
                    style={{ bottom: 8, left: '50%', transform: 'translateX(-50%)' }}
                >
                    {/* İstem Revize Botu — graph dışı endpoint, hep görünür */}
                    <button
                        onClick={(e) => handleNodeClick('prompt_bot', e)}
                        title="İstem Revize Botu — graph dışı, /api/chat/revise-prompt"
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border shadow-sm transition-all ${promptActive ? 'border-amber-300 hover:border-amber-500 hover:-translate-y-0.5 hover:shadow-md' : 'border-stone-200 opacity-60'}`}
                    >
                        <PencilLine size={11} strokeWidth={2.5} className={promptActive ? 'text-amber-600' : 'text-stone-300'} />
                        <span className={`text-[9px] font-black uppercase tracking-widest ${promptActive ? 'text-stone-700' : 'text-stone-400'}`}>İstem Revize</span>
                        <span className="text-[7px] font-bold uppercase px-1 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200/60 tracking-wide">Akış dışı</span>
                        {!promptActive && (
                            <span
                                role="button"
                                onClick={(e) => { e.stopPropagation(); onToggleAgent && onToggleAgent('sys_agent_prompt_001'); }}
                                title="Aktifleştir"
                                className="ml-1"
                            >
                                <Power size={9} strokeWidth={2.5} className="text-stone-300 hover:text-[#3B6D11]/60 transition-colors" />
                            </span>
                        )}
                    </button>

                    <div className="h-5 w-px bg-stone-200 mx-1" />

                    {/* Görünmeyen runtime bileşenleri — info-only rozetler */}
                    <span className="text-[8px] font-black uppercase tracking-widest text-stone-400 whitespace-nowrap">Görünmeyen Bileşenler</span>
                    {HIDDEN_COMPONENTS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={(e) => handleNodeClick(`hidden_${id}`, e)}
                            title={label}
                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-stone-50 border border-stone-200 hover:border-violet-300 hover:bg-violet-50 transition-all group"
                        >
                            <Icon size={10} strokeWidth={2.5} className="text-stone-400 group-hover:text-violet-600 transition-colors" />
                            <span className="text-[9px] font-bold uppercase tracking-wide text-stone-500 group-hover:text-violet-700 transition-colors whitespace-nowrap">{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Popups ── */}
            {activePopup === 'user' && (
                <PopupPortal title="Ham Kullanıcı İstemi" popupPos={popupPos} onClose={closePopup}>
                    <ApiPayloadPreview agent={{ persona: 'Kullanıcının yazdığı ham metin', model: 'N/A' }} rags={[]} isUser={true} />
                </PopupPortal>
            )}

            {activePopup === 'supervisor' && (
                <PopupPortal title="Supervisor — Intent Sınıflandırıcı" icon={GitBranch} iconColor="#7c3aed" popupPos={popupPos} onClose={closePopup} width={400}>
                    <div className="px-4 py-4 bg-stone-50 rounded-b-xl text-[11px] text-stone-600 leading-relaxed space-y-2">
                        <p><strong>Görev:</strong> Kullanıcı mesajını + komutu + dosya bağlamını okuyup intent ve specialist plan'ı üretir.</p>
                        <p><strong>5 intent:</strong> general, hata_cozumu, rapor_arama, n8n, dosya_qa.</p>
                        <p><strong>Strateji:</strong> Önce komut/dosya rule'u, sonra LLM JSON-mode (chatbot ajanı, T=0). Hata olursa regex fallback.</p>
                        <p className="text-stone-400 italic mt-2">Kod: backend/services/agent_graph/nodes/supervisor.py</p>
                    </div>
                </PopupPortal>
            )}

            {SPECIALISTS.map(spec => activePopup === spec.id && (
                <PopupPortal key={spec.id} title={`${spec.label} — Specialist`} icon={spec.icon} iconColor={spec.color} popupPos={popupPos} onClose={closePopup} width={400}>
                    <div className="px-4 py-4 bg-stone-50 rounded-b-xl text-[11px] text-stone-600 leading-relaxed space-y-2">
                        <p>{spec.info}</p>
                        {spec.usesAgent && (
                            <p className="text-stone-500"><strong>Bağlı ajan:</strong> {getAgentById(spec.usesAgent)?.name || spec.usesAgent}</p>
                        )}
                        <p className="text-stone-400 italic mt-2">Kod: backend/services/agent_graph/nodes/{spec.id}.py</p>
                    </div>
                </PopupPortal>
            ))}

            {activePopup === 'aggregator' && (
                <PopupPortal title="Aggregator — Yanıt Sentezi" icon={Sparkles} iconColor="#378ADD" popupPos={popupPos} onClose={closePopup}>
                    {chatbotAgent
                        ? <ApiPayloadPreview agent={chatbotAgent} rags={rags} />
                        : (
                            <div className="px-4 py-6 flex flex-col items-center gap-3 bg-stone-50 rounded-b-xl">
                                <AlertTriangle size={20} className="text-amber-500" />
                                <p className="text-[11px] text-stone-500 text-center">Sohbet Asistanı ajanı bulunamadı.</p>
                            </div>
                        )
                    }
                </PopupPortal>
            )}

            {activePopup === 'msg_polish' && (
                <PopupPortal title="Msg Polish — Mesaj Revize Botu" icon={MessageSquareText} iconColor="#a855f7" popupPos={popupPos} onClose={closePopup}>
                    {msgAgent
                        ? <ApiPayloadPreview agent={msgAgent} rags={[]} />
                        : (
                            <div className="px-4 py-6 flex flex-col items-center gap-3 bg-stone-50 rounded-b-xl">
                                <AlertTriangle size={20} className="text-amber-500" />
                                <p className="text-[11px] text-stone-500 text-center">Mesaj Revize Botu bulunamadı.</p>
                            </div>
                        )
                    }
                </PopupPortal>
            )}

            {activePopup === 'response' && (
                <PopupPortal title="Yanıt" popupPos={popupPos} onClose={closePopup}>
                    {chatbotActive ? (
                        <ApiPayloadPreview agent={chatbotAgent} rags={rags} />
                    ) : (
                        <div className="px-4 py-8 flex flex-col items-center gap-4 bg-stone-50 rounded-b-xl">
                            <AlertTriangle size={20} strokeWidth={2.5} className="text-amber-500" />
                            <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500 text-center leading-relaxed">
                                Sohbet Asistanı pasif.<br />Yanıt üretilemez.
                            </p>
                        </div>
                    )}
                </PopupPortal>
            )}

            {/* İstem Revize Botu — graph dışı endpoint */}
            {activePopup === 'prompt_bot' && (
                <PopupPortal title="İstem Revize Botu — Akış Dışı" icon={PencilLine} iconColor="#d97706" popupPos={popupPos} onClose={closePopup} width={400}>
                    <div className="px-4 py-4 bg-stone-50 rounded-b-xl text-[11px] text-stone-600 leading-relaxed space-y-2">
                        <div className="px-2 py-1 rounded bg-amber-50 border border-amber-200 text-[10px] text-amber-700 font-bold inline-block">
                            Bu ajan LangGraph akışında DEĞİL
                        </div>
                        <p>Kullanıcı chat input'undaki sihirli değnek (✨) butonuna tıkladığında <code className="bg-white px-1 py-0.5 rounded text-[10px]">/api/chat/revise-prompt</code> endpoint'i ayrıca çağrılır.</p>
                        <p>Mesaj henüz graph'a girmeden, kullanıcının yazdığı ham metin daha kaliteli bir prompt'a dönüştürülür.</p>
                        {promptAgent && (
                            <p className="text-stone-500 mt-2"><strong>Bağlı ajan:</strong> {promptAgent.name}</p>
                        )}
                    </div>
                </PopupPortal>
            )}

            {/* Görünmeyen bileşen popup'ları */}
            {HIDDEN_COMPONENTS.map(comp => activePopup === `hidden_${comp.id}` && (
                <PopupPortal key={comp.id} title={comp.label} icon={comp.icon} iconColor="#7c3aed" popupPos={popupPos} onClose={closePopup} width={400}>
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

export default GraphTopologyOverview;
