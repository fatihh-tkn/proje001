import React, { useState, useRef, useEffect } from 'react';
import { ChevronsRight, ChevronsLeft } from 'lucide-react';
import { sendMessageStream } from '../../api/chatService';
import { useWorkspaceStore } from '../../store/workspaceStore';

import RecentChats from './RecentChats';
import MessageList from './MessageList';
import ChatInputArea from './ChatInputArea';

const ChatBar = ({ onOpenFile, isSideOpen, setIsSideOpen }) => {
    const currentUser = useWorkspaceStore(state => state.currentUser);
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
            // Mesaj balonlarına veya interaktif elemanlara tıklanınca kapanma
            const isNoToggle = e.target.closest('.no-toggle, button, input, textarea, a, summary');
            if (!isNoToggle) {
                setIsSideOpen(false);
            }
        }
    };

    const handleChatScroll = () => {
        setIsChatScrolling(true);
        if (chatScrollTimeout.current) clearTimeout(chatScrollTimeout.current);
        chatScrollTimeout.current = setTimeout(() => setIsChatScrolling(false), 3000);
        if (isChatsOpen) setIsChatsOpen(false);
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
            currentUser?.id,
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
                onDone: ({ rag_used, rag_sources, ui_action }) => {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === aiMsgId
                                ? { ...m, isStreaming: false, ragUsed: rag_used, ragSources: rag_sources }
                                : m
                        )
                    );

                    // ── OPEN_PDF_AT komutu: koordinatlı PDF viewer ──────────────────
                    if (ui_action?.command === 'OPEN_PDF_AT' && onOpenFile) {
                        const { doc_id, pdf_url, source_file, page, bbox } = ui_action;
                        const url = doc_id
                            ? `/api/archive/file/${doc_id}`
                            : pdf_url || '';

                        if (url) {
                            const nameMatch = (source_file || '').match(/[^/\\]+$/);
                            const name = nameMatch ? nameMatch[0] : (source_file || 'Belge');
                            const tabKey = `pdf-${doc_id || name}-p${page || 1}`;

                            onOpenFile({
                                id: tabKey,
                                title: `📍 ${name}${page ? ` – Slayt ${page}` : ''}`,
                                type: 'pdf',
                                url,
                                meta: {
                                    page: page || 1,
                                    highlightPage: page || 1,
                                    bbox: bbox || null,
                                },
                            });
                        }
                    } else if (rag_used && rag_sources && rag_sources.length > 0 && onOpenFile) {
                        // ── Fallback: koordinatsız kaynak açma (eski davranış) ──────
                        const openedKeys = new Set();

                        rag_sources.forEach(sourceObj => {
                            if (typeof sourceObj === 'string') return;
                            if (!sourceObj.page || sourceObj.page === 0) return;

                            const key = `${sourceObj.file}_p${sourceObj.page}`;
                            if (openedKeys.has(key)) return;
                            openedKeys.add(key);

                            const nameMatch = sourceObj.file.match(/[^/\\]+$/);
                            const name = nameMatch ? nameMatch[0] : sourceObj.file;
                            const extMatch = name.match(/\.([^.]+)$/);
                            const ext = extMatch ? extMatch[1].toLowerCase() : 'pdf';

                            const url = sourceObj.doc_id
                                ? `/api/archive/file/${sourceObj.doc_id}`
                                : '';

                            onOpenFile({
                                id: key,
                                title: `${name} – Slayt ${sourceObj.page}`,
                                type: ext === 'pptx' || ext === 'ppt' ? 'pdf' : ext,
                                url,
                                meta: {
                                    page: sourceObj.page,
                                    highlightPage: sourceObj.page,
                                    bbox: sourceObj.bbox || null,
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
            className={`h-screen flex shrink-0 z-20 overflow-hidden font-sans transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${isSideOpen ? 'w-[27rem] cursor-default' : 'w-[68px] cursor-pointer hover:bg-stone-100'} relative bg-stone-50 border-l border-stone-200 shadow-[-10px_0_40px_rgba(0,0,0,0.03)]
                ${isDragOver ? 'border-[#378ADD] bg-[#E6F1FB]/40' : 'border-stone-200'}
            `}
        >
            {/* Drop overlay göstergesi */}
            {isDragOver && (
                <div className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none">
                    <div className="bg-white/90 border-2 border-dashed border-[#378ADD] rounded-2xl px-8 py-6 flex flex-col items-center gap-2 shadow-xl">
                        <span className="text-3xl">📎</span>
                        <p className="text-sm font-semibold text-[#378ADD]">Dosyayı buraya bırak</p>
                        <p className="text-xs text-stone-400">Bu dosya hakkında soru sorabilirsin</p>
                    </div>
                </div>
            )}



            {/* 2. ANA İÇERİK ALANI */}
            <div className="flex-1 flex flex-col min-w-0 h-full relative w-full bg-gradient-to-b from-stone-50 to-stone-100/30">
                {/* ÜST KISIM */}
                <RecentChats
                    isSideOpen={isSideOpen}
                    isChatsOpen={isChatsOpen}
                    setIsChatsOpen={setIsChatsOpen}
                    handleNewChat={handleNewChat}
                    handleLoadSession={handleLoadSession}
                    currentSessionId={currentSessionId}
                />

                {/* İÇERİK ALANLARI (Tıklanması veya Odaklanılması geçmişi kapatır) */}
                <div
                    className="flex-1 flex flex-col min-w-0 overflow-hidden"
                    onClickCapture={() => { if (isChatsOpen) setIsChatsOpen(false); }}
                    onFocusCapture={() => { if (isChatsOpen) setIsChatsOpen(false); }}
                >
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
            </div>
        </aside>
    );
};

export default ChatBar;
