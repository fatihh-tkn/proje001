import React, { useState, useRef, useEffect } from 'react';
import { ChevronsRight, ChevronsLeft } from 'lucide-react';
import { sendMessageToAI, sendMessageWithFile } from '../../api/chatService';

import RecentChats from './RecentChats';
import MessageList from './MessageList';
import ChatInputArea from './ChatInputArea';

const ChatBar = ({ onOpenFile, isSideOpen, setIsSideOpen }) => {
    const [isChatsOpen, setIsChatsOpen] = useState(true);
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isTyping, setIsTyping] = useState(false);

    // Sürüklenen dosya state'i
    const [droppedFile, setDroppedFile] = useState(null); // { name, type, url }
    const [isDragOver, setIsDragOver] = useState(false);

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
        setDroppedFile(null);
        setIsSideOpen(true);
        setTimeout(() => { if (textareaRef.current) textareaRef.current.focus(); }, 300);
    };

    const handleEmptyClick = (e) => {
        if (e.target.closest('button, textarea, .no-toggle')) return;
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

    // ── DRAG & DROP HANDLERS ─────────────────────────────────────────────────
    const handleDragOver = (e) => {
        // Sadece sidebar'dan gelen uygulama verisini kabul et
        if (e.dataTransfer.types.includes('application/json')) {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(true);
            // Chat paneli kapalıysa otomatik aç
            if (!isSideOpen) setIsSideOpen(true);
        }
    };

    const handleDragLeave = (e) => {
        // Çocuk elementlere geçişte tetiklenmesin
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsDragOver(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const raw = e.dataTransfer.getData('application/json');
        if (!raw) return;

        try {
            const fileData = JSON.parse(raw);
            // Sadece dosya node'larını kabul et (klasör değil)
            if (fileData.type && fileData.type !== 'folder') {
                setDroppedFile({
                    name: fileData.title || fileData.name,
                    type: fileData.type,
                    url: fileData.url || '',
                });
                // input'a otomatik focus
                setTimeout(() => { if (textareaRef.current) textareaRef.current.focus(); }, 150);
            }
        } catch (_) { }
    };
    // ────────────────────────────────────────────────────────────────────────

    const handleSendMessage = async () => {
        if (inputValue.trim() === '') return;

        const textPayload = inputValue;
        const fileContext = droppedFile ? { ...droppedFile } : null;

        const userMsg = {
            id: Date.now(),
            text: textPayload,
            sender: 'user',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fileContext, // mesajda hangi dosya soruldu
        };

        setMessages((prev) => [...prev, userMsg]);
        setInputValue('');
        setIsExpanded(false);
        setIsTyping(true);

        // Dosya varsa dosya-özelinde sorgu, yoksa genel
        const result = fileContext
            ? await sendMessageWithFile(textPayload, fileContext.name)
            : await sendMessageToAI(textPayload);

        const aiMsg = {
            id: Date.now() + 1,
            text: result.reply,
            sender: 'ai',
            isError: !result.success,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            ragUsed: result.rag_used,
            ragSources: result.rag_sources,
        };

        setMessages((prev) => [...prev, aiMsg]);
        setIsTyping(false);
        // Dosyayı chip'ten kaldırma: kullanıcı bir sonraki mesajda tekrar sürmezse temizle
        // (sohbet devam edebilsin diye burada kaldırıyoruz)
        setDroppedFile(null);
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
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`h-screen bg-white border-l flex shrink-0 z-20 shadow-[-5px_0_15px_rgba(0,0,0,0.03)] overflow-hidden font-sans transition-all duration-500 ease-in-out cursor-default relative
                ${isSideOpen ? 'w-[27rem]' : 'w-20'}
                ${isDragOver ? 'border-red-400 bg-red-50/30' : 'border-slate-200'}
            `}
        >
            {/* Drop overlay göstergesi */}
            {isDragOver && (
                <div className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none">
                    <div className="bg-white/90 border-2 border-dashed border-red-400 rounded-2xl px-8 py-6 flex flex-col items-center gap-2 shadow-xl">
                        <span className="text-3xl">📎</span>
                        <p className="text-sm font-semibold text-red-500">Dosyayı buraya bırak</p>
                        <p className="text-xs text-slate-400">Bu dosya hakkında soru sorabilirsin</p>
                    </div>
                </div>
            )}

            {/* 1. GÖRÜNMEZ TOGGLE BARI */}
            <div
                className="absolute left-0 top-0 bottom-0 w-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group z-30 hover:bg-slate-100"
                title={isSideOpen ? "Paneli Daralt" : "Paneli Genişlet"}
            >
                <div className="flex-1 flex items-center justify-center w-full text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    {isSideOpen ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
                </div>
            </div>

            {/* 2. ANA İÇERİK ALANI */}
            <div className="flex-1 flex flex-col min-w-0 h-full relative bg-slate-50/30 w-full">
                {/* ÜST KISIM */}
                <RecentChats
                    isSideOpen={isSideOpen}
                    isChatsOpen={isChatsOpen}
                    setIsChatsOpen={setIsChatsOpen}
                    handleNewChat={handleNewChat}
                />

                {/* ORTA KISIM (Mesajlar Alanı) */}
                <MessageList
                    messages={messages}
                    isTyping={isTyping}
                    isSideOpen={isSideOpen}
                    handleChatScroll={handleChatScroll}
                    isChatScrolling={isChatScrolling}
                    messagesEndRef={messagesEndRef}
                    handleNewChat={handleNewChat}
                />

                {/* ALT KISIM (Input ve Hızlı Aksiyonlar) */}
                <ChatInputArea
                    isSideOpen={isSideOpen}
                    inputValue={inputValue}
                    setInputValue={setInputValue}
                    isExpanded={isExpanded}
                    setIsExpanded={setIsExpanded}
                    handleSendMessage={handleSendMessage}
                    handleKeyDown={handleKeyDown}
                    handleTextareaScroll={handleTextareaScroll}
                    isTextareaScrolling={isTextareaScrolling}
                    textareaRef={textareaRef}
                    droppedFile={droppedFile}
                    onClearFile={() => setDroppedFile(null)}
                />
            </div>
        </aside>
    );
};

export default ChatBar;
