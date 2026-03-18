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
                                <div className={`flex gap-3 max-w-[90%] ${isAI ? 'flex-row' : 'flex-row-reverse'}`}>

                                    {/* AI LOGO */}
                                    {isAI && (
                                        <div className="shrink-0 mt-1 no-toggle">
                                            <div className={`w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-1 shadow-sm ${msg.isStreaming ? 'animate-pulse' : ''}`}>
                                                <img src={AILogo} alt="AI" className="w-full h-full object-contain mix-blend-multiply" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-1 no-toggle">
                                        {/* Kullanıcı mesajında dosya chip'i */}
                                        {!isAI && msg.fileContext && (
                                            <div className="flex justify-end">
                                                <span className="inline-flex items-center gap-1 text-[10px] bg-red-50 border border-red-200 text-red-500 rounded-md px-2 py-0.5">
                                                    <FileText size={10} />
                                                    {msg.fileContext.name}
                                                </span>
                                            </div>
                                        )}

                                        <div className={`p-3 rounded-2xl text-sm shadow-sm ${!isAI
                                            ? 'bg-red-50 border border-red-100 text-slate-800 rounded-tr-sm'
                                            : msg.isError
                                                ? 'bg-red-50 border border-red-200 text-red-600 rounded-tl-sm'
                                                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                                            }`}>

                                            {/* İçerik: boşsa "yazıyor" göster, doluysa metni ve imleci göster */}
                                            {isAI && msg.isStreaming && msg.text === '' ? (
                                                <span className="text-[10px] text-slate-400 tracking-widest animate-pulse">
                                                    Yanıt oluşturuluyor...
                                                </span>
                                            ) : (
                                                <p className="leading-relaxed whitespace-pre-wrap break-words">
                                                    {msg.text}
                                                    {/* Mesaj hâlâ geliyor ve içerik varsa: canlı imleç */}
                                                    {isAI && msg.isStreaming && msg.text !== '' && <StreamingCursor />}
                                                </p>
                                            )}

                                            {/* Zaman damgası — streaming bitince göster */}
                                            {!msg.isStreaming && (
                                                <span className="text-[10px] opacity-50 mt-1 block text-right">{msg.time}</span>
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
