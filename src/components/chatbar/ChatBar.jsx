import React, { useState, useRef, useEffect } from 'react';
import { ChevronsRight, ChevronsLeft } from 'lucide-react';
import { sendMessageStream } from '../../api/chatService';

import RecentChats from './RecentChats';
import MessageList from './MessageList';
import ChatInputArea from './ChatInputArea';

const ChatBar = ({ onOpenFile, isSideOpen, setIsSideOpen }) => {
    const [isChatsOpen, setIsChatsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState(`session_${Date.now()}`);

    // Sürüklenen dosya state'i
    const [droppedFile, setDroppedFile] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const [isChatScrolling, setIsChatScrolling] = useState(false);
    const [isTextareaScrolling, setIsTextareaScrolling] = useState(false);
    const chatScrollTimeout = useRef(null);
    const textareaScrollTimeout = useRef(null);

    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    // Streaming AI mesajının ID'sini tutuyoruz
    const streamingMsgIdRef = useRef(null);

    const handleNewChat = () => {
        setMessages([]);
        setInputValue('');
        setIsExpanded(false);
        setDroppedFile(null);
        setCurrentSessionId(`session_${Date.now()}`);
        setIsSideOpen(true);
        setTimeout(() => { if (textareaRef.current) textareaRef.current.focus(); }, 300);
    };

    const handleLoadSession = (session) => {
        if (!session.messages) return;
        const loadedMessages = session.messages.map(m => ({
            id: m.id,
            text: m.content,
            sender: m.role === 'user' ? 'user' : 'ai',
            time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isError: m.content.startsWith('❌') || m.content.startsWith('[ERROR]'),
            ragUsed: false,
            ragSources: [],
        }));
        setMessages(loadedMessages);
        setCurrentSessionId(session.sessionId);
        setIsSideOpen(true);
    };

    const handleEmptyClick = (e) => {
        if (!isSideOpen) {
            setIsSideOpen(true);
        } else {
            // Açıkken sadece boşluklara tıklandığında kapansın
            const isInteractive = e.target.closest('button, input, textarea, a, summary, .interactive, .message-bubble');
            if (!isInteractive) {
                setIsSideOpen(false);
            }
        }
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

    // Panel kapandığında, geçmiş menüsünü de kapat
    useEffect(() => {
        if (!isSideOpen) {
            setIsChatsOpen(false);
        }
    }, [isSideOpen]);

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
        if (e.dataTransfer.types.includes('application/json')) {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(true);
            if (!isSideOpen) setIsSideOpen(true);
        }
    };

    const handleDragLeave = (e) => {
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
            if (fileData.type && fileData.type !== 'folder') {
                setDroppedFile({
                    name: fileData.title || fileData.name,
                    type: fileData.type,
                    url: fileData.url || '',
                });
                setTimeout(() => { if (textareaRef.current) textareaRef.current.focus(); }, 150);
            }
        } catch (_) { }
    };
    // ────────────────────────────────────────────────────────────────────────

    const handleSendMessage = async () => {
        if (inputValue.trim() === '' || isTyping) return;

        const textPayload = inputValue;
        const fileContext = droppedFile ? { ...droppedFile } : null;

        const userMsg = {
            id: Date.now(),
            text: textPayload,
            sender: 'user',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fileContext,
        };

        // Boş streaming placeholder ekle
        const aiMsgId = Date.now() + 1;
        streamingMsgIdRef.current = aiMsgId;
        const aiPlaceholder = {
            id: aiMsgId,
            text: '',
            sender: 'ai',
            isError: false,
            isStreaming: true,   // ← animasyon için flag
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            ragUsed: false,
            ragSources: [],
        };

        setMessages((prev) => [...prev, userMsg, aiPlaceholder]);
        setInputValue('');
        setIsExpanded(false);
        setIsTyping(true);

        const fileOpts = fileContext ? { fileName: fileContext.name } : null;

        await sendMessageStream(
            textPayload,
            currentSessionId,
            {
                // Her gelen chunk'ı streaming mesajına ekle
                onChunk: (chunk) => {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === aiMsgId
                                ? { ...m, text: m.text + chunk }
                                : m
                        )
                    );
                },
                // Stream bitti — isStreaming kapat, RAG kaynakları sekme olarak aç
                onDone: ({ rag_used, rag_sources }) => {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === aiMsgId
                                ? { ...m, isStreaming: false, ragUsed: rag_used, ragSources: rag_sources }
                                : m
                        )
                    );

                    // RAG kullanıldıysa: yapay zekanın kullandığı her chunk'ı ayrı sekme olarak aç
                    if (rag_used && rag_sources && rag_sources.length > 0 && onOpenFile) {
                        const openedKeys = new Set();

                        rag_sources.forEach(sourceObj => {
                            if (typeof sourceObj === 'string') return;
                            // page=0 → belge özeti chunk'ı, sekme açma
                            if (!sourceObj.page || sourceObj.page === 0) return;

                            // Her benzersiz (dosya + sayfa) için 1 sekme aç
                            const key = `${sourceObj.file}_p${sourceObj.page}`;
                            if (openedKeys.has(key)) return;
                            openedKeys.add(key);

                            const nameMatch = sourceObj.file.match(/[^/\\]+$/);
                            const name = nameMatch ? nameMatch[0] : sourceObj.file;
                            const extMatch = name.match(/\.([^.]+)$/);
                            const ext = extMatch ? extMatch[1].toLowerCase() : 'pdf';

                            // PDF → doğrudan PDF viewer'da aç, o sayfaya scroll yap
                            onOpenFile({
                                id: key,
                                title: `${name} – Sayfa ${sourceObj.page}`,
                                type: ext,
                                url: `/api/files/download?path=${encodeURIComponent(sourceObj.file)}`,
                                meta: {
                                    page: sourceObj.page,
                                    bbox: sourceObj.bbox,
                                }
                            });
                        });
                    }

                    setIsTyping(false);
                    streamingMsgIdRef.current = null;
                },
                // Hata — mesaj güncelle
                onError: (errText) => {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === aiMsgId
                                ? { ...m, text: errText, isStreaming: false, isError: true }
                                : m
                        )
                    );
                    setIsTyping(false);
                    streamingMsgIdRef.current = null;
                },
            },
            fileOpts,
        );

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
            className={`h-screen flex shrink-0 z-20 overflow-hidden font-sans transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${isSideOpen ? 'w-[27rem] cursor-default' : 'w-[68px] cursor-pointer hover:bg-slate-200/50'} relative bg-[#f1f5f9] border-l border-slate-200/60 shadow-[-10px_0_40px_rgba(0,0,0,0.03)]
                ${isDragOver ? 'border-red-400 bg-red-50/40' : 'border-slate-200'}
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



            {/* 2. ANA İÇERİK ALANI */}
            <div className="flex-1 flex flex-col min-w-0 h-full relative w-full bg-gradient-to-b from-[#f1f5f9] to-[#e2e8f0]/30">
                {/* ÜST KISIM */}
                <RecentChats
                    isSideOpen={isSideOpen}
                    isChatsOpen={isChatsOpen}
                    setIsChatsOpen={setIsChatsOpen}
                    handleNewChat={handleNewChat}
                    handleLoadSession={handleLoadSession}
                    currentSessionId={currentSessionId}
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
                    isTyping={isTyping}
                />
            </div>
        </aside>
    );
};

export default ChatBar;
