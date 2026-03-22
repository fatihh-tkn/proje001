import React from 'react';
import { Plus, FileText, Database } from 'lucide-react';
import AILogo from '../../assets/logo-kapali.png';

// ── Canlı yazma imleci animasyonu ────────────────────────────────────────────
const StreamingCursor = () => (
    <span
        className="inline-block w-[2px] h-[1em] bg-slate-400 ml-0.5 align-middle"
        style={{ animation: 'blink 0.8s step-end infinite' }}
    />
);

// global style — sadece bir kez enjekte edilir
if (typeof document !== 'undefined' && !document.getElementById('blink-style')) {
    const s = document.createElement('style');
    s.id = 'blink-style';
    s.textContent = '@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }';
    document.head.appendChild(s);
}
// ─────────────────────────────────────────────────────────────────────────────

const MessageList = ({
    messages, isTyping, isSideOpen, handleChatScroll, isChatScrolling, messagesEndRef, handleNewChat
}) => {
    return (
        <div className="flex-1 relative overflow-hidden transition-all duration-500">
            <div
                onScroll={handleChatScroll}
                data-scrolling={isChatScrolling}
                className={`absolute inset-0 overflow-y-auto overflow-x-hidden scroll-smooth transition-opacity duration-300 
          [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent 
          [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full 
          ${isSideOpen ? 'py-5 pr-5 pl-8 opacity-100 z-10' : 'p-0 opacity-0 pointer-events-none z-0'}`}
            >
                <div className="flex flex-col gap-4">
                    {messages.map((msg) => {
                        const isAI = msg.sender === 'ai';

                        return (
                            <div key={msg.id} className={`flex w-full ${isAI ? 'justify-start' : 'justify-end'}`}>
                                <div className={`flex flex-col gap-1.5 max-w-[95%] ${isAI ? 'items-start' : 'items-end'}`}>

                                    {/* AI LOGO & ISIM */}
                                    {isAI && (
                                        <div className="flex items-center no-toggle pl-1.5 mb-0.5">
                                            <div className={`w-8 h-8 flex items-center justify-center ${msg.isStreaming ? 'animate-pulse' : ''}`}>
                                                <img src={AILogo} alt="AI" className="w-full h-full object-contain mix-blend-multiply opacity-80" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-1 no-toggle min-w-0">
                                        {/* Kullanıcı mesajında dosya chip'i */}
                                        {!isAI && msg.fileContext && (
                                            <div className="flex justify-end">
                                                <span className="inline-flex items-center gap-1 text-[11px] bg-white/20 backdrop-blur-sm border border-white/30 text-slate-700 shadow-sm rounded-lg px-2.5 py-1 mb-1">
                                                    <FileText size={12} className="text-red-500" />
                                                    {msg.fileContext.name}
                                                </span>
                                            </div>
                                        )}

                                        <div className={`p-3 text-[15px] transition-all overflow-hidden [overflow-wrap:anywhere] ${!isAI
                                            ? 'text-slate-800 border border-slate-800/80 rounded-2xl rounded-tr-sm bg-transparent shadow-sm'
                                            : msg.isError
                                                ? 'text-red-600 bg-transparent'
                                                : 'text-slate-800 bg-transparent'
                                            }`}
                                            style={{ fontFamily: 'Söhne, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, Cantarell, "Noto Sans", sans-serif, "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}
                                        >

                                            {/* İçerik: boşsa "yazıyor" göster, doluysa metni ve imleci göster */}
                                            {isAI && msg.isStreaming && msg.text === '' ? (
                                                <span className="text-[10px] text-slate-400 tracking-widest animate-pulse">
                                                    Yanıt oluşturuluyor...
                                                </span>
                                            ) : (
                                                <p className="leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                                                    {msg.text}
                                                    {/* Mesaj hâlâ geliyor ve içerik varsa: canlı imleç */}
                                                    {isAI && msg.isStreaming && msg.text !== '' && <StreamingCursor />}
                                                </p>
                                            )}

                                            {/* Zaman damgası — streaming bitince göster */}
                                            {!msg.isStreaming && (
                                                <span className="text-[10px] mt-1.5 block text-right tracking-wide font-medium text-slate-400">
                                                    {msg.time}
                                                </span>
                                            )}
                                        </div>

                                        {/* AI mesajında RAG badge'i */}
                                        {isAI && !msg.isStreaming && msg.ragUsed && msg.ragSources && msg.ragSources.length > 0 && (
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <Database size={10} className="text-slate-300" />
                                                <span className="text-[10px] text-slate-400">
                                                    Belge: {msg.ragSources.slice(0, 2).map(s => typeof s === 'string' ? s : `${s.file} (s.${s.page})`).join(', ')}
                                                    {msg.ragSources.length > 2 && ` +${msg.ragSources.length - 2} daha`}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* KAPALIYKEN ÇIKAN DEV + BUTONU */}
            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 w-full ${!isSideOpen ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 scale-90 z-0 pointer-events-none'}`}>
                <button
                    onClick={handleNewChat}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 hover:border-red-400 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all shadow-sm focus:outline-none group mx-auto"
                    title="Yeni Sohbet Başlat"
                >
                    <Plus size={20} className="group-hover:scale-110 transition-transform duration-300" />
                </button>
            </div>
        </div>
    );
};

export default MessageList;
