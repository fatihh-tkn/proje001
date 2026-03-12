import React from 'react';
import { Plus } from 'lucide-react';
import AILogo from '../../assets/logo-kapali.png';

const MessageList = ({
    messages, isTyping, isSideOpen, handleChatScroll, isChatScrolling, messagesEndRef, handleNewChat
}) => {
    return (
        <div className="flex-1 relative overflow-hidden transition-all duration-500">
            <div
                onScroll={handleChatScroll}
                data-scrolling={isChatScrolling}
                className={`absolute inset-0 overflow-y-auto scroll-smooth transition-opacity duration-300 
          [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent 
          hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 data-[scrolling=true]:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full 
          ${isSideOpen ? 'py-5 pr-5 pl-8 opacity-100 z-10' : 'p-0 opacity-0 pointer-events-none z-0'}`}
            >
                <div className="flex flex-col gap-4">
                    {messages.map((msg) => {
                        const isAI = msg.sender === 'ai';

                        return (
                            <div key={msg.id} className={`flex w-full ${isAI ? 'justify-start' : 'justify-end'}`}>
                                <div className={`flex gap-3 max-w-[90%] ${isAI ? 'flex-row' : 'flex-row-reverse'}`}>

                                    {/* ==========================================
                      YAPAY ZEKA LOGOSU (AVATAR) BURADA
                      ========================================== */}
                                    {isAI && (
                                        <div className="shrink-0 mt-1 no-toggle">
                                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-1 shadow-sm">
                                                <img src={AILogo} alt="AI" className="w-full h-full object-contain mix-blend-multiply" />
                                            </div>
                                        </div>
                                    )}

                                    <div className={`p-3 rounded-2xl text-sm shadow-sm no-toggle ${!isAI
                                        ? 'bg-red-50 border border-red-100 text-slate-800 rounded-tr-sm'
                                        : msg.isError
                                            ? 'bg-red-50 border border-red-200 text-red-600 rounded-tl-sm' // Hata Mesajı
                                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm' // Normal Mesaj
                                        }`}>
                                        <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                                        <span className="text-[10px] opacity-50 mt-1 block text-right">{msg.time}</span>
                                    </div>

                                </div>
                            </div>
                        );
                    })}

                    {/* YAPAY ZEKA YANIT VERİYOR (YAZIYOR) ANİMASYONU */}
                    {isTyping && (
                        <div className="flex justify-start gap-3 w-full no-toggle">
                            <div className="shrink-0 mt-1">
                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-1 shadow-sm">
                                    <img src={AILogo} alt="AI" className="w-full h-full object-contain animate-pulse mix-blend-multiply" />
                                </div>
                            </div>
                            <div className="flex items-center p-3 rounded-2xl rounded-tl-sm bg-white border border-slate-200 text-sm shadow-sm">
                                <span className="text-[10px] text-slate-500 animate-pulse tracking-widest">Yanıt oluşturuluyor...</span>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* KAPALIYKEN ÇIKAN MERKEZİ DEV + BUTONU */}
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
