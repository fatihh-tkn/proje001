import React, { useState } from 'react';
import { User, Database, Bot, Brain, Zap, MessageSquareText, FileText, Video, PencilLine, FileJson } from 'lucide-react';
import ApiPayloadPreview from './ApiPayloadPreview';

const InlineTopologyOverview = ({ agent, rags, onOpenPayload }) => {
    const [showPopup, setShowPopup] = useState(false);

    // Helpers to check if current agent is the one in the graph
    const isNodeActive = (nodeId) => agent?.id === nodeId || (agent?.agentKind === nodeId);
    const isChatbot = agent?.agentKind === 'chatbot';
    const hasRags = Array.isArray(agent?.allowedRags) && agent.allowedRags.length > 0;

    const handlePayloadClick = () => {
        setShowPopup(prev => !prev);
        if (onOpenPayload) onOpenPayload();
    };

    return (
        <div className="w-full h-full relative flex items-center justify-center p-2 shrink-0 bg-[#f8fafc] overflow-hidden rounded-xl border border-slate-200/60 shadow-[inset_0_0_100px_rgba(0,0,0,0.02)] isolate">

            {/* Arka Plan Izgara Deseni (Grid Pattern) */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.15]"
                style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>

            {/* Merkez Derinlik Aydınlatması (Radial Gradient) */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-sky-400/5 blur-[120px] rounded-[100%] pointer-events-none -z-10"></div>

            {/* FLOW CONTAINER - Belli bir boyutta tutup ekrana sığacak şekilde ölçekleyeceğiz */}
            <div className="relative w-[1000px] h-[450px] z-10 scale-[0.6] sm:scale-[0.75] md:scale-90 lg:scale-100 transition-transform origin-center">

                {/* SVG Çizgiler Arka Plan Katmanı */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    <defs>
                        <linearGradient id="glowLine" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#cbd5e1" />
                            <stop offset="50%" stopColor="#818cf8" />
                            <stop offset="100%" stopColor="#cbd5e1" />
                        </linearGradient>
                        <mask id="dashMask">
                            <rect x="0" y="0" width="100%" height="100%" fill="white" />
                            <rect x="0" y="0" width="100%" height="100%" fill="url(#glowLine)" className="animate-[slideRight_3s_linear_infinite]" />
                        </mask>
                    </defs>

                    {/* Ana Yatay Çizgi Merkezi: y=250 */}
                    <path d="M 60 250 L 940 250" stroke="#cbd5e1" strokeWidth="2" fill="none" />

                    {/* Hareketli Ana Çift Çizgi */}
                    <path d="M 60 250 L 940 250" stroke="url(#glowLine)" strokeWidth="2" strokeDasharray="6 6" fill="none" className="animate-[dash_20s_linear_infinite]" />

                    {/* Döküman DB -> Sohbet Asistanı (x=400 to 470) */}
                    <path d="M 410 160 C 410 200 460 200 460 230" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" fill="none" />
                    {/* Toplantı DB -> Sohbet Asistanı (x=530 to 470) */}
                    <path d="M 530 160 C 530 200 480 200 480 230" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" fill="none" />

                    {/* Geri Besleme Döngüsü (Mesaj Botundan Sohbet Asistanına Geri) */}
                    {/* Mesaj: x=670, Sohbet: x=470 */}
                    <path d="M 670 280 C 670 340 670 340 570 340 L 470 340 C 470 340 470 300 470 280"
                        stroke="#cbd5e1" strokeWidth="2" fill="none" />
                    {/* Hareketli Geri Besleme İzi */}
                    <path d="M 670 280 C 670 340 670 340 570 340 L 470 340 C 470 340 470 300 470 280"
                        stroke="#3b82f6" strokeWidth="2" strokeDasharray="8 6" fill="none" className="animate-[dash_8s_linear_infinite]" />

                    {/* Ok uçları (x pozisyonları Node'ların aralarına göre ayarlandı) */}
                    {/* İstem Revize sol ok (node: 230) -> left arr ~165 */}
                    <polygon points="160,246 170,250 160,254" fill="#94a3b8" />
                    {/* Sohbet sol ok (node: 470) -> left arr ~350 */}
                    <polygon points="350,246 360,250 350,254" fill="#94a3b8" />
                    {/* Mesaj sol ok (node: 670) -> left arr ~580 */}
                    <polygon points="570,246 580,250 570,254" fill="#94a3b8" />
                    {/* İşlem sol ok (node: 840) -> left arr ~750 */}
                    <polygon points="750,246 760,250 750,254" fill="#94a3b8" />
                    {/* Kullanıcı çıkış sol ok -> left arr ~900 */}
                    <polygon points="900,246 910,250 900,254" fill="#94a3b8" />

                    {/* Döngü ucu (yukarı ok Sohbet Asistanına) */}
                    <polygon points="466,285 470,275 474,285" fill="#3b82f6" />
                    {/* DB uçları */}
                    <polygon points="456,220 460,230 464,220" fill="#94a3b8" />
                    <polygon points="476,220 480,230 484,220" fill="#94a3b8" />
                </svg>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes dash { to { stroke-dashoffset: -1000; } }
                    @keyframes dashReverse { to { stroke-dashoffset: 1000; } }
                `}} />

                {/* --- 1. Kullanıcı İstemi (Giriş) --- - Center: x=60, y=250 */}
                <div className="absolute z-10 flex flex-col items-center group pointer-events-auto" style={{ left: 60, top: 250, transform: 'translate(-50%, -50%)' }}>
                    <div
                        onClick={handlePayloadClick}
                        className="w-14 h-14 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center cursor-pointer hover:border-indigo-400 hover:ring-4 hover:ring-indigo-100 transition-all z-20">
                        <User size={20} className="text-slate-500 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <span className="absolute top-16 text-[10px] font-bold text-slate-600 uppercase tracking-widest bg-white/80 px-2 rounded-lg backdrop-blur-sm shadow-sm whitespace-nowrap">Kullanıcı İstemi</span>

                    {/* Payload Popup */}
                    {showPopup && (
                        <div className="absolute top-[80px] left-0 mt-2 z-50 w-[340px] rounded-2xl border border-slate-200/80 bg-white shadow-2xl flex flex-col animate-in zoom-in-95 origin-top-left -translate-x-[20%]">
                            <ApiPayloadPreview agent={agent} rags={rags} />
                        </div>
                    )}
                </div>

                {/* --- 2. İstem Revize Botu --- - Center: x=230, y=250 */}
                <div className="absolute z-10 pointer-events-auto group" style={{ left: 230, top: 250, transform: 'translate(-50%, -50%)' }}>
                    <div className="w-[140px] h-[80px] rounded-[1.25rem] bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center justify-center gap-1.5 transition-all hover:-translate-y-1 hover:border-amber-300 hover:shadow-[0_8px_30px_rgba(251,191,36,0.15)] relative">
                        {isNodeActive('sys_agent_prompt_001') && <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-white animate-pulse"></div>}
                        <PencilLine size={20} className="text-amber-500" />
                        <span className="text-[11px] font-bold text-slate-700 leading-tight text-center">İstem Revize<br />Botu</span>
                    </div>
                </div>

                {/* --- 3. Sohbet Asistanı Katmanı (Merkez) --- - Center: x=470, y=250 */}
                <div className="absolute z-10 pointer-events-auto" style={{ left: 470, top: 250, transform: 'translate(-50%, -50%)' }}>

                    {/* Yukarıdaki Veritabanları */}
                    <div className="absolute -top-[150px] left-1/2 -translate-x-1/2 flex items-center justify-between w-[150px] pointer-events-none">
                        <div className="flex flex-col items-center group -translate-x-4">
                            <div className="w-[60px] h-[50px] rounded-xl bg-gradient-to-b from-slate-50 to-slate-200 border border-slate-300 shadow-sm flex flex-col items-center justify-center">
                                <FileText size={18} className="text-slate-500" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-wide">Döküman</span>
                        </div>
                        <div className="flex flex-col items-center group translate-x-4">
                            <div className="w-[60px] h-[50px] rounded-xl bg-gradient-to-b from-slate-50 to-slate-200 border border-slate-300 shadow-sm flex flex-col items-center justify-center">
                                <Video size={18} className="text-slate-500" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-wide">Toplantı</span>
                        </div>
                    </div>

                    <div className="w-[140px] h-[90px] rounded-[1.5rem] bg-white backdrop-blur-md border-[2.5px] border-emerald-100 shadow-[0_12px_40px_rgba(16,185,129,0.15)] flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-105 hover:border-emerald-300 relative z-20 pointer-events-auto cursor-pointer">
                        {isNodeActive('sys_agent_chatbot_001') && <div className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm ring-4 ring-emerald-500/20"></div>}
                        <Bot size={26} className="text-emerald-600" />
                        <span className="text-[13px] font-bold text-slate-800 text-center uppercase tracking-wide">Sohbet<br />Asistanı</span>
                    </div>
                </div>

                {/* --- 4. Mesaj Revize Botu --- - Center: x=670, y=250 */}
                <div className="absolute z-10 pointer-events-auto group" style={{ left: 670, top: 250, transform: 'translate(-50%, -50%)' }}>
                    <div className="w-[140px] h-[80px] rounded-[1.25rem] bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center justify-center gap-1.5 transition-all hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_8px_30px_rgba(59,130,246,0.15)] relative">
                        {isNodeActive('sys_agent_msg_001') && <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white animate-pulse"></div>}
                        <MessageSquareText size={20} className="text-blue-500" />
                        <span className="text-[11px] font-bold text-slate-700 leading-tight text-center">Mesaj Revize<br />Botu</span>
                    </div>
                </div>

                {/* --- 5. İşlem Botu --- - Center: x=840, y=250 */}
                <div className="absolute z-10 pointer-events-auto group" style={{ left: 840, top: 250, transform: 'translate(-50%, -50%)' }}>
                    <div className="w-[140px] h-[80px] rounded-[1.25rem] bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center justify-center gap-1.5 transition-all hover:-translate-y-1 hover:border-purple-300 hover:shadow-[0_8px_30px_rgba(139,92,246,0.15)] relative">
                        {isNodeActive('sys_agent_action_001') && <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-purple-500 rounded-full border-2 border-white animate-pulse"></div>}
                        <Zap size={20} className="text-purple-500" />
                        <span className="text-[11px] font-bold text-slate-700 leading-tight text-center">İşlem<br />Botu</span>
                    </div>
                </div>

                {/* --- 6. Kullanıcı Yanıtı (Çıkış) --- - Center: x=960, y=250 */}
                <div className="absolute z-10 flex flex-col items-center group pointer-events-auto" style={{ left: 960, top: 250, transform: 'translate(-50%, -50%)' }}>
                    <div className="w-14 h-14 rounded-full bg-[#1e293b] border-[3px] border-[#334155] shadow-xl flex items-center justify-center transition-transform hover:scale-110 cursor-default">
                        <User size={20} className="text-white" />
                    </div>
                    <span className="absolute top-16 text-[10px] font-bold text-slate-600 uppercase tracking-widest bg-white/80 px-2 rounded-lg backdrop-blur-sm shadow-sm whitespace-nowrap">Kullanıcı Yanıtı</span>
                </div>

            </div>
        </div>
    );
};

export default InlineTopologyOverview;
