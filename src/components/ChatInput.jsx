import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Settings2, Zap, FileSearch,
  MessageSquare, ChevronDown, Plus, ChevronsUp,
  ChevronsRight, ChevronsLeft, Edit
} from 'lucide-react';

// YAPAY ZEKA LOGOSU İÇERİ AKTARILIYOR
import AILogo from '../assets/logo-kapali.png';
import { sendMessageToAI } from '../api/chatService';

const ChatInput = () => {
  const [isSideOpen, setIsSideOpen] = useState(true);
  const [isChatsOpen, setIsChatsOpen] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const [isChatScrolling, setIsChatScrolling] = useState(false);
  const [isTextareaScrolling, setIsTextareaScrolling] = useState(false);
  const chatScrollTimeout = useRef(null);
  const textareaScrollTimeout = useRef(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const handleNewChat = () => {
    setMessages([]);
    setInputValue('');
    setIsExpanded(false);
    setIsSideOpen(true);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 300);
  };

  const handleEmptyClick = (e) => {
    if (e.target.closest('button, textarea, .no-toggle')) {
      return;
    }
    setIsSideOpen((prev) => !prev);
  };

  const handleChatScroll = () => {
    setIsChatScrolling(true);
    if (chatScrollTimeout.current) clearTimeout(chatScrollTimeout.current);
    chatScrollTimeout.current = setTimeout(() => setIsChatScrolling(false), 3000);
  };

  const handleTextareaScroll = () => {
    setIsTextareaScrolling(true);
    if (textareaScrollTimeout.current) clearTimeout(textareaScrollTimeout.current);
    textareaScrollTimeout.current = setTimeout(() => setIsTextareaScrolling(false), 3000);
  };

  useEffect(() => {
    return () => {
      if (chatScrollTimeout.current) clearTimeout(chatScrollTimeout.current);
      if (textareaScrollTimeout.current) clearTimeout(textareaScrollTimeout.current);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!textareaRef.current || !isSideOpen) return;

    const initialHeight = 51.2;
    const maxHeight = initialHeight * 3;

    if (isExpanded) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = scrollHeight > maxHeight ? `${maxHeight}px` : `${scrollHeight}px`;
    } else {
      textareaRef.current.style.height = '3.2rem';
    }
  }, [inputValue, isExpanded, isSideOpen]);

  const handleSendMessage = async () => {
    if (inputValue.trim() === '') return;

    const textPayload = inputValue;
    const userMsg = {
      id: Date.now(),
      text: textPayload,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsExpanded(false);
    setIsTyping(true);

    // Backend'e asenkron istek
    const result = await sendMessageToAI(textPayload);

    const aiMsg = {
      id: Date.now() + 1,
      text: result.reply,
      sender: 'ai',
      isError: !result.success, // Başarılı değilse isError true olur
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, aiMsg]);
    setIsTyping(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <aside
      onClick={handleEmptyClick}
      className={`h-screen bg-white border-l border-slate-200 flex shrink-0 z-20 shadow-[-5px_0_15px_rgba(0,0,0,0.03)] overflow-hidden font-sans transition-all duration-500 ease-in-out cursor-default relative ${isSideOpen ? 'w-[27rem]' : 'w-20'}`}
    >

      {/* --- 1. GÖRÜNMEZ TOGGLE BARI --- */}
      <div
        className="absolute left-0 top-0 bottom-0 w-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group z-30 hover:bg-slate-100"
        title={isSideOpen ? "Paneli Daralt" : "Paneli Genişlet"}
      >
        <div className="flex-1 flex items-center justify-center w-full text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-300">
          {isSideOpen ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
        </div>
      </div>

      {/* --- 2. ANA İÇERİK ALANI --- */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative bg-slate-50/30 w-full">

        {/* ÜST KISIM */}
        <div className={`pt-6 shrink-0 bg-transparent flex transition-all duration-300 ${isSideOpen ? 'pb-4 pt-4 pr-4 pl-8 flex-col border-b border-slate-200' : 'px-0 pb-2 flex-col items-center border-transparent w-full'}`}>
          {isSideOpen && (
            <div className="flex items-center justify-between mb-2 w-full shrink-0">
              <div className="flex items-center gap-2 cursor-pointer group no-toggle" onClick={() => setIsChatsOpen(!isChatsOpen)}>
                <h3 className="text-xs font-bold text-slate-500 tracking-widest uppercase group-hover:text-slate-700">Son Sohbetler</h3>
                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isChatsOpen ? 'rotate-180' : ''}`} />
              </div>
              <button onClick={handleNewChat} className="flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors focus:outline-none p-1 rounded" title="Yeni Sohbet Başlat">
                <Plus size={16} />
              </button>
            </div>
          )}

          <AnimatePresence>
            {(isChatsOpen || !isSideOpen) && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden w-full">
                <div className={`pb-1 w-full ${isSideOpen ? 'mt-2 grid grid-cols-2 gap-2' : 'flex flex-col items-center gap-3'}`}>
                  <div className={`rounded-xl bg-white border border-slate-200 hover:border-slate-300 cursor-pointer shadow-sm group transition-all flex items-center no-toggle ${isSideOpen ? 'p-3 flex-col items-start w-full' : 'w-10 h-10 justify-center mx-auto'}`} title="Müşteri Analizi">
                    <div className="flex items-center gap-2 font-medium text-slate-700 text-xs">
                      <MessageSquare size={14} className="text-slate-400 group-hover:text-red-500" />
                      {isSideOpen && <span className="truncate">Müşteri Analizi</span>}
                    </div>
                    {isSideOpen && <span className="text-[10px] text-slate-400 mt-1">2 saat önce</span>}
                  </div>
                  <div className={`rounded-xl bg-white border border-slate-200 hover:border-slate-300 cursor-pointer shadow-sm group transition-all flex items-center no-toggle ${isSideOpen ? 'p-3 flex-col items-start w-full' : 'w-10 h-10 justify-center mx-auto'}`} title="IK Onay Akışı">
                    <div className="flex items-center gap-2 font-medium text-slate-700 text-xs">
                      <Edit size={14} className="text-slate-400 group-hover:text-red-500" />
                      {isSideOpen && <span className="truncate">IK Onay Akışı</span>}
                    </div>
                    {isSideOpen && <span className="text-[10px] text-slate-400 mt-1">Dün</span>}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ORTA KISIM (Mesajlar Alanı) */}
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

        {/* ALT KISIM (Input ve Hızlı Aksiyonlar) */}
        <div className={`shrink-0 bg-transparent flex flex-col transition-all duration-300 ${isSideOpen ? 'pr-5 pl-8 pb-6 pt-4 gap-4 border-t border-slate-200' : 'px-0 pb-6 pt-2 items-center gap-3 border-transparent w-full'}`}>
          <AnimatePresence>
            {isSideOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20, height: 0, marginTop: 0 }}
                className="relative flex flex-col w-full bg-white border border-slate-200 rounded-2xl focus-within:border-red-500/40 focus-within:ring-2 focus-within:ring-red-100 transition-all shadow-sm overflow-hidden no-toggle"
              >
                <div onClick={() => setIsExpanded(!isExpanded)} className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center justify-center w-14 h-4 cursor-pointer z-30 group">
                  <div className="flex items-center justify-center bg-slate-100 border-x border-b border-slate-200 rounded-b-lg px-2.5 py-0.5 group-hover:bg-slate-200 transition-colors">
                    <ChevronsUp size={12} className={`text-slate-400 group-hover:text-red-500 transition-transform duration-500 ${isExpanded ? 'rotate-180' : 'rotate-0'}`} />
                  </div>
                </div>

                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onScroll={handleTextareaScroll}
                  data-scrolling={isTextareaScrolling}
                  placeholder="Asistana bir soru sor..."
                  className={`w-full bg-transparent text-sm text-slate-800 px-4 pb-2 pt-6 resize-none border-none outline-none focus:ring-0 placeholder:text-slate-400 leading-relaxed transition-all duration-300
                    [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-slate-200 data-[scrolling=true]:[&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full
                    ${isExpanded ? 'overflow-y-auto' : 'overflow-hidden'}`}
                ></textarea>

                <div className="flex items-center justify-between px-3 pb-3 mt-1 shrink-0">
                  <button className="p-2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"><Settings2 size={16} /></button>
                  <button onClick={handleSendMessage} disabled={!inputValue.trim()} className="flex items-center gap-2 bg-[#961e27] hover:bg-[#7a1820] disabled:bg-slate-100 disabled:text-slate-400 text-white px-5 py-2 rounded-xl font-bold text-sm transition-all focus:outline-none shadow-sm active:scale-95">
                    <span>Gönder</span> <Send size={14} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className={`flex w-full ${isSideOpen ? 'gap-2 flex-row' : 'gap-3 flex-col items-center'}`}>
            <button className={`flex items-center justify-center gap-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 shadow-sm transition-all focus:outline-none ${isSideOpen ? 'flex-1 py-2 px-1 text-[11px] font-medium' : 'w-10 h-10 mx-auto'}`} title="PDF Özetle">
              <FileSearch size={16} className="text-slate-400" /> {isSideOpen && "PDF Özetle"}
            </button>
            <button className={`flex items-center justify-center gap-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 shadow-sm transition-all focus:outline-none ${isSideOpen ? 'flex-1 py-2 px-1 text-[11px] font-medium' : 'w-10 h-10 mx-auto'}`} title="BPMN Analizi">
              <Zap size={16} className="text-slate-400" /> {isSideOpen && "BPMN Analizi"}
            </button>
          </div>

        </div>
      </div>
    </aside>
  );
};

export default ChatInput;