import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { sendMessageStream } from '../../api/chatService';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useErrorStore } from '../../store/errorStore';

import RecentChats from './RecentChats';
const PartsTimeViewer = lazy(() => import('../settings/parts-time/PartsTimeViewer'));
import MessageList from './MessageList';
import ChatInputArea from './ChatInputArea';

const MAX_ATTACH = 5;
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

const CHAT_WIDTH_KEY = 'chatBar:width';
const CHAT_WIDTH_MIN = 360;        // px — fazla daralırsa mesaj baloncukları kırılır
const CHAT_WIDTH_DEFAULT = 540;    // 540px
const CHAT_WIDTH_MAX_RATIO = 0.7;  // ekran genişliğinin %70'inden büyük olamaz

const ChatBar = ({ onOpenFile, isSideOpen, setIsSideOpen }) => {
    const currentUser = useWorkspaceStore(state => state.currentUser);
    const setChatBarWidth = useWorkspaceStore(state => state.setChatBarWidth);
    const isLeftCollapsed = useWorkspaceStore(state => state.isLeftCollapsed);
    const addToast = useErrorStore(state => state.addToast);
    const [sideMode, setSideMode] = useState('chat'); // 'chat' | 'parts-time'
    const [noTransition, setNoTransition] = useState(false);
    const [isChatsOpen, setIsChatsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState(`session_${Date.now()}`);

    const [attachedFiles, setAttachedFiles] = useState([]); // { id, name, type, url, size, source }
    const [isDragOver, setIsDragOver] = useState(false);
    const [activeCommand, setActiveCommand] = useState(null);
    const [activeModelName, setActiveModelName] = useState(null);
    const [compactMaxTurns, setCompactMaxTurns] = useState(0); // 0 = kapalı
    const [isCompacting, setIsCompacting] = useState(false);

    const [isChatScrolling, setIsChatScrolling] = useState(false);
    const [isTextareaScrolling, setIsTextareaScrolling] = useState(false);
    const chatScrollTimeout = useRef(null);
    const textareaScrollTimeout = useRef(null);
    const messagesEndRef = useRef(null);
    const lastUserMsgRef = useRef(null);
    const pendingScrollToUser = useRef(false);
    const userScrolledUpRef = useRef(false);
    const textareaRef = useRef(null);
    const streamingMsgIdRef = useRef(null);
    const abortControllerRef = useRef(null);
    const justSentRef = useRef(false);
    const isTypingRef = useRef(false);

    // ── Yeniden boyutlandırma (sola doğru sürükleyerek genişlet) ──────────
    const [chatWidth, setChatWidth] = useState(() => {
        try {
            const stored = parseInt(localStorage.getItem(CHAT_WIDTH_KEY) || '', 10);
            if (Number.isFinite(stored) && stored >= CHAT_WIDTH_MIN) return stored;
        } catch (_) { /* localStorage erişilemez (private mode vb.) */ }
        return CHAT_WIDTH_DEFAULT;
    });
    const [isResizing, setIsResizing] = useState(false);
    const dragStateRef = useRef(null);

    useEffect(() => { setChatBarWidth(chatWidth); }, [chatWidth, setChatBarWidth]);

    const clampWidth = (w) => {
        const max = Math.max(CHAT_WIDTH_MIN, Math.floor(window.innerWidth * CHAT_WIDTH_MAX_RATIO));
        return Math.min(Math.max(w, CHAT_WIDTH_MIN), max);
    };

    useEffect(() => {
        if (!isResizing) return;
        const onMove = (e) => {
            const st = dragStateRef.current;
            if (!st) return;
            // Sol kenara yapışık handle: imleç sola hareket → genişlik artar
            const next = clampWidth(st.startWidth + (st.startX - e.clientX));
            setChatWidth(next);
        };
        const onUp = () => {
            setIsResizing(false);
            dragStateRef.current = null;
            try { localStorage.setItem(CHAT_WIDTH_KEY, String(chatWidth)); } catch (_) { /* yok say */ }
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        const prevCursor = document.body.style.cursor;
        const prevSelect = document.body.style.userSelect;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            document.body.style.cursor = prevCursor;
            document.body.style.userSelect = prevSelect;
        };
    }, [isResizing, chatWidth]);

    useEffect(() => {
        const onResize = () => setChatWidth(w => clampWidth(w));
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const startResize = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragStateRef.current = { startX: e.clientX, startWidth: chatWidth };
        setIsResizing(true);
    };

    const resetWidth = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const next = clampWidth(CHAT_WIDTH_DEFAULT);
        setChatWidth(next);
        try { localStorage.setItem(CHAT_WIDTH_KEY, String(next)); } catch (_) { /* yok say */ }
    };

    // ── Dosya ekleme yardımcıları ──────────────────────────────────────────
    const addAttachedFiles = (incoming) => {
        setAttachedFiles(prev => {
            const existingIds = new Set(prev.map(f => f.id));
            const fresh = incoming.filter(f => !existingIds.has(f.id));
            const canAdd = MAX_ATTACH - prev.length;
            if (fresh.length > canAdd) {
                addToast({ type: 'error', message: `En fazla ${MAX_ATTACH} dosya ekleyebilirsiniz. ${fresh.length - canAdd} dosya eklenmedi.` });
            }
            return [...prev, ...fresh.slice(0, canAdd)];
        });
    };

    const removeAttachedFile = (id) => setAttachedFiles(prev => prev.filter(f => f.id !== id));
    const clearAttachedFiles = () => setAttachedFiles([]);
    // ──────────────────────────────────────────────────────────────────────

    // ── Compact işlemi ────────────────────────────────────────────────────
    const turnsSinceCompact = (() => {
        let lastCompactIdx = -1;
        messages.forEach((m, i) => { if (m.role === 'compact_summary') lastCompactIdx = i; });
        return messages.slice(lastCompactIdx + 1).filter(m => m.sender === 'ai' && !m.isStreaming).length;
    })();

    const handleCompact = async () => {
        if (isCompacting || !currentSessionId) return;
        setIsCompacting(true);
        try {
            const res = await fetch('/api/chat/compact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: currentSessionId }),
            });
            const data = await res.json();
            console.log('[compact] response:', data);
            if (data.success) {
                setMessages(prev => [...prev, {
                    id: `compact_${Date.now()}`,
                    role: 'compact_summary',
                    sender: 'compact_summary',
                    text: data.summary,
                    turnsCount: data.turns_summarized,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                }]);
            } else {
                addToast({ type: 'error', message: 'Özet oluşturulamadı: ' + (data.error || 'Bilinmeyen hata') });
            }
        } catch (err) {
            console.error('[compact] hata:', err);
            addToast({ type: 'error', message: 'Bağlantı hatası, özet alınamadı.' });
        } finally {
            setIsCompacting(false);
        }
    };

    const handleNewChat = () => {
        if (sideMode !== 'parts-time') setSideMode('chat');
        setMessages([]);
        setInputValue('');
        setIsExpanded(false);
        clearAttachedFiles();
        setActiveCommand(null);
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
            isStreaming: false,
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
        if (sideMode === 'parts-time') {
            if (!isSideOpen) {
                setIsSideOpen(true);
            } else {
                const isNoToggle = e.target.closest('.no-toggle, button, input, textarea, a, summary');
                if (!isNoToggle) setIsSideOpen(false);
            }
            return;
        }
        if (!isSideOpen) {
            setIsSideOpen(true);
        } else {
            const isNoToggle = e.target.closest('.no-toggle, button, input, textarea, a, summary');
            if (!isNoToggle) setIsSideOpen(false);
        }
    };

    const handleChatScroll = (e) => {
        setIsChatScrolling(true);
        if (chatScrollTimeout.current) clearTimeout(chatScrollTimeout.current);
        chatScrollTimeout.current = setTimeout(() => setIsChatScrolling(false), 3000);
        if (isChatsOpen) setIsChatsOpen(false);
        // Kullanıcı bottom'dan 100px+ uzakta ise auto-scroll'u durdur
        const el = e?.target;
        if (el) {
            const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
            userScrolledUpRef.current = distFromBottom > 100;
        }
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
        if (pendingScrollToUser.current && lastUserMsgRef.current) {
            const el = lastUserMsgRef.current;
            const container = el.closest('[data-chat-scroll]');
            if (container) {
                const delta = el.getBoundingClientRect().top - container.getBoundingClientRect().top;
                container.scrollBy({ top: delta, behavior: 'smooth' });
            } else {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            pendingScrollToUser.current = false;
            userScrolledUpRef.current = false;
        } else if (!isTyping && !userScrolledUpRef.current) {
            const endEl = messagesEndRef.current;
            if (endEl) {
                const container = endEl.closest('[data-chat-scroll]');
                if (container) {
                    const containerRect = container.getBoundingClientRect();
                    const endElRect = endEl.getBoundingClientRect();
                    const overflow = endElRect.bottom - containerRect.bottom;
                    if (overflow > 0) {
                        container.scrollBy({ top: overflow + 24, behavior: 'smooth' });
                    }
                } else {
                    endEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }
            }
        }
    }, [messages, isTyping]);

    useEffect(() => {
        requestAnimationFrame(() => {
            const endEl = messagesEndRef.current;
            if (!endEl) return;
            const container = endEl.closest('[data-chat-scroll]');
            if (container) {
                const containerRect = container.getBoundingClientRect();
                const endElRect = endEl.getBoundingClientRect();
                const overflow = endElRect.bottom - containerRect.bottom;
                if (overflow > 0) {
                    container.scrollTop += overflow + 24;
                }
            } else {
                endEl.scrollIntoView({ block: 'end' });
            }
        });
    }, [currentSessionId]);

    useEffect(() => {
        if (!isSideOpen) setIsChatsOpen(false);
    }, [isSideOpen]);

    // ── Compact ayarını aggregator node_config'inden çek ─────────────────
    useEffect(() => {
        // Önce localStorage'dan anlık değeri oku
        try {
            const cached = localStorage.getItem('agg:compact_every_n_turns');
            if (cached !== null) setCompactMaxTurns(parseInt(cached) || 0);
        } catch {}

        fetch('/api/orchestrator/agents')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                const agents = Array.isArray(data) ? data : (data?.agents ?? []);
                const agg = agents.find(a => a.id === 'sys_node_aggregator' || a.role === 'aggregator');
                const turns = agg?.nodeConfig?.compact_every_n_turns
                    ?? agg?.node_config?.compact_every_n_turns
                    ?? 0;
                const val = parseInt(turns) || 0;
                setCompactMaxTurns(val);
                try { localStorage.setItem('agg:compact_every_n_turns', String(val)); } catch {}
            })
            .catch(() => {});

        // Ayarlar panelinden anlık değişiklikleri yakala
        const onSettingChange = (e) => setCompactMaxTurns(parseInt(e.detail) || 0);
        window.addEventListener('compact-setting-changed', onSettingChange);
        return () => window.removeEventListener('compact-setting-changed', onSettingChange);
    }, []);

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

    // ── Drag & Drop ────────────────────────────────────────────────────────
    const handleDragOver = (e) => {
        if (e.dataTransfer.types.includes('application/json')) {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(true);
            if (!isSideOpen) setIsSideOpen(true);
        }
    };

    const handleDragLeave = (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setIsDragOver(false);
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
                addAttachedFiles([{
                    id: fileData.id || `drop_${Date.now()}`,
                    name: fileData.title || fileData.name,
                    type: fileData.type,
                    url: fileData.url || '',
                    size: null,
                    source: 'archive',
                }]);
                setTimeout(() => { if (textareaRef.current) textareaRef.current.focus(); }, 150);
            }
        } catch (_) { }
    };
    // ──────────────────────────────────────────────────────────────────────

    const handleSendMessage = async (overrideText) => {
        const textPayload = overrideText ?? inputValue;
        if (textPayload.trim() === '' || isTypingRef.current) return;
        isTypingRef.current = true;

        const filesSnapshot = [...attachedFiles];

        const userMsg = {
            id: Date.now(),
            text: textPayload,
            sender: 'user',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            attachedFiles: filesSnapshot.length ? filesSnapshot : undefined,
        };

        const aiMsgId = Date.now() + 1;
        streamingMsgIdRef.current = aiMsgId;
        const startedAt = Date.now();
        const aiPlaceholder = {
            id: aiMsgId, text: '', sender: 'ai',
            isError: false, isStreaming: true,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            ragUsed: false, ragSources: [],
            // Düşünme süreci paneli için meta
            startedAt,
            completedAt: null,
            command: activeCommand ? { id: activeCommand.id, label: activeCommand.label } : null,
            attachedFileNames: filesSnapshot.length ? filesSnapshot.map(f => f.name) : [],
            userQuery: textPayload,
            // LangGraph telemetrisi (flag açıkken doldurulur)
            graphNodes: [],
            graphIntent: null,
            graphPlan: null,
            graphErrors: [],
        };

        justSentRef.current = true;
        pendingScrollToUser.current = true;
        setMessages((prev) => [...prev, userMsg, aiPlaceholder]);
        if (!overrideText) { setInputValue(''); setIsExpanded(false); }
        setIsTyping(true);
        clearAttachedFiles();

        // Dosya seçenekleri: tek dosya → file_name, çoklu → file_names
        const fileOpts = filesSnapshot.length === 1
            ? { fileName: filesSnapshot[0].name }
            : filesSnapshot.length > 1
                ? { fileNames: filesSnapshot.map(f => f.name) }
                : null;

        const commandOpts = activeCommand ? { commandId: activeCommand.id } : null;
        setActiveCommand(null);

        // Yeni stream için yeni AbortController — kullanıcı durdur basarsa abort()
        const controller = new AbortController();
        abortControllerRef.current = controller;

        await sendMessageStream(
            textPayload,
            currentSessionId,
            currentUser?.id,
            {
                onChunk: (chunk) => {
                    setMessages((prev) =>
                        prev.map((m) => m.id === aiMsgId ? { ...m, text: m.text + chunk } : m)
                    );
                },
                onReplace: (newText) => {
                    // Mesaj Revize Botu cevabı revize ettiğinde tüm baloncuk metni
                    // güncellenmiş haliyle değiştirilir.
                    setMessages((prev) =>
                        prev.map((m) => m.id === aiMsgId ? { ...m, text: newText, wasRevised: true } : m)
                    );
                },
                onDone: ({ rag_used, rag_sources, ui_action, model, provider, prompt_tokens, completion_tokens, duration_ms }) => {
                    setMessages((prev) =>
                        prev.map((m) => {
                            if (m.id !== aiMsgId) return m;
                            // Defense-in-depth: backend done diye bildirsin ama metin
                            // boş kaldıysa (chunk gelmediyse) kullanıcıya hata göster —
                            // sessiz başarısızlık değil. node_error'lar varsa onlardan
                            // anlamlı bir özet üret.
                            const hasText = !!(m.text && m.text.trim());
                            if (!hasText) {
                                const errs = m.graphErrors || [];
                                const summary = errs.length
                                    ? errs.map(e => `• ${e.node}: ${e.text}`).join('\n')
                                    : 'API anahtarınızın geçerli ve yeterli krediye sahip olduğundan emin olun (Ayarlar → Yapay Zeka Modelleri).';
                                return {
                                    ...m,
                                    text: `❌ Yapay zeka cevabı üretilemedi.\n\n${summary}`,
                                    isStreaming: false,
                                    isError: true,
                                    ragUsed: rag_used,
                                    ragSources: rag_sources,
                                    completedAt: Date.now(),
                                    model, provider,
                                    promptTokens: prompt_tokens,
                                    completionTokens: completion_tokens,
                                    backendDurationMs: duration_ms,
                                };
                            }
                            return { ...m, isStreaming: false, ragUsed: rag_used, ragSources: rag_sources, completedAt: Date.now(), model, provider, promptTokens: prompt_tokens, completionTokens: completion_tokens, backendDurationMs: duration_ms };
                        })
                    );

                    if (ui_action?.command === 'N8N_TRIGGERED') {
                        const statusMsg = ui_action.status === 'ok'
                            ? `✅ **${ui_action.workflow}** otomasyonu başarıyla tetiklendi.`
                            : `⚠️ **${ui_action.workflow}** tetiklenmeye çalışıldı. ${ui_action.detail || ''}`;
                        setMessages(prev => prev.map(m =>
                            m.id === aiMsgId ? { ...m, text: m.text ? m.text + '\n\n' + statusMsg : statusMsg } : m
                        ));
                    }

                    // Sekme açma sadece backend açıkça OPEN_PDF_AT istemişse (kullanıcı
                    // belirli bir dosya hakkında soru sorduğunda set ediliyor).
                    // Genel RAG'da sekme açmıyoruz — kullanıcı kaynak chip'lerine
                    // tıklayarak istediğini açar.
                    if (ui_action?.command === 'OPEN_PDF_AT' && onOpenFile) {
                        const { doc_id, pdf_url, source_file, page, bbox } = ui_action;
                        const url = doc_id ? `/api/archive/file/${doc_id}` : pdf_url || '';
                        if (url) {
                            const nameMatch = (source_file || '').match(/[^/\\]+$/);
                            const name = nameMatch ? nameMatch[0] : (source_file || 'Belge');
                            const tabKey = `pdf-${doc_id || name}-p${page || 1}`;
                            onOpenFile({
                                id: tabKey,
                                title: `📍 ${name}${page ? ` – Slayt ${page}` : ''}`,
                                type: 'pdf', url,
                                meta: { page: page || 1, highlightPage: page || 1, bbox: bbox || null },
                            });
                        }
                    }

                    setIsTyping(false); isTypingRef.current = false;
                    streamingMsgIdRef.current = null;

                    // Auto-compact: tur limiti dolmuşsa otomatik özetle
                    if (compactMaxTurns > 0) {
                        setMessages(prev => {
                            let lastCompactIdx = -1;
                            prev.forEach((m, i) => { if (m.sender === 'compact_summary') lastCompactIdx = i; });
                            const turnsNow = prev.slice(lastCompactIdx + 1).filter(m => m.sender === 'ai' && !m.isStreaming).length;
                            if (turnsNow >= compactMaxTurns) {
                                setTimeout(() => handleCompact(), 300);
                            }
                            return prev;
                        });
                    }

                    // Dinamik takip sorusu önerileri (Grok-stili). Mesaj balonunun altında
                    // chip olarak gösterilir; AI'ın metin gövdesine eklenmez.
                    (async () => {
                        try {
                            // En güncel AI metnini state'ten oku
                            const finalAi = await new Promise((resolve) => {
                                setMessages(prev => {
                                    resolve((prev.find(m => m.id === aiMsgId)?.text) || '');
                                    return prev;
                                });
                            });
                            if (!finalAi || finalAi.length < 20) return;
                            const fuCfg = (() => { try { return JSON.parse(localStorage.getItem('chat_followup_settings') || '{}'); } catch { return {}; } })();
                            if (fuCfg.enabled === false) return;
                            const fuMaxCount = fuCfg.max_count ?? 2;
                            const res = await fetch('/api/chat/followups', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    user_message: textPayload,
                                    bot_reply: finalAi,
                                    max_count: fuMaxCount,
                                }),
                            });
                            if (!res.ok) return;
                            const data = await res.json();
                            const qs = Array.isArray(data?.questions) ? data.questions.filter(Boolean) : [];
                            if (qs.length === 0) return;
                            setMessages(prev => prev.map(m =>
                                m.id === aiMsgId ? { ...m, followups: qs } : m
                            ));
                        } catch (_) { /* sessizce yut */ }
                    })();
                },
                onError: (errText) => {
                    setMessages((prev) =>
                        prev.map((m) => {
                            if (m.id !== aiMsgId) return m;
                            // Replace event ile gerçek içerik geldi ve hata değilse:
                            // sonradan gelen backend error event'ini bastır — kart/cevap ekranda kalsın.
                            // Diğer durumlarda (onDone'ın sentezlediği hata, partial chunk, vs.)
                            // gerçek backend hatasını göster.
                            const hasRealContent = !!(m.text && m.text.trim()) && m.wasRevised && !m.isError;
                            if (hasRealContent) {
                                console.warn('[chat] Backend error after response, suppressed:', errText);
                                return { ...m, isStreaming: false };
                            }
                            return { ...m, text: errText, isStreaming: false, isError: true };
                        })
                    );
                    setIsTyping(false); isTypingRef.current = false;
                    streamingMsgIdRef.current = null;
                    abortControllerRef.current = null;
                },
                onAbort: () => {
                    // Kullanıcı durdurma butonuna bastı: o ana kadarki yanıtı koru,
                    // streaming bayrağını düşür, "(durduruldu)" notu ekle.
                    setMessages(prev => prev.map(m => {
                        if (m.id !== aiMsgId) return m;
                        const stub = m.text?.trim()
                            ? m.text + '\n\n_— Yanıt durduruldu —_'
                            : '_Yanıt başlamadan durduruldu._';
                        return { ...m, text: stub, isStreaming: false, isAborted: true, completedAt: Date.now() };
                    }));
                    setIsTyping(false); isTypingRef.current = false;
                    streamingMsgIdRef.current = null;
                    abortControllerRef.current = null;
                },
                // ── LangGraph telemetri callback'leri ─────────────────
                onProgress: ({ node, phase, elapsed_ms, intent, plan, reasoning, approved, feedback, revision_count }) => {
                    setMessages(prev => prev.map(m => {
                        if (m.id !== aiMsgId) return m;
                        const next = {
                            ...m,
                            graphNodes: [
                                ...(m.graphNodes || []),
                                { node, phase, elapsedMs: elapsed_ms, approved, feedback, revision_count },
                            ],
                        };
                        if (intent && !m.graphIntent) next.graphIntent = intent;
                        if (Array.isArray(plan) && !m.graphPlan) next.graphPlan = plan;
                        if (reasoning && !m.graphReasoning) next.graphReasoning = reasoning;
                        if (node === 'critic') {
                            next.criticApproved = approved !== false;
                            next.criticFeedback = feedback || '';
                            next.criticRevisionCount = (m.criticRevisionCount || 0) + (approved === false ? 1 : 0);
                        }
                        return next;
                    }));
                },
                onSources: ({ items, score }) => {
                    if (!Array.isArray(items) || items.length === 0) return;
                    setMessages(prev => prev.map(m => m.id === aiMsgId
                        ? { ...m, ragUsed: true, ragSources: items, ragScore: score }
                        : m
                    ));
                },
                onUiAction: ({ action }) => {
                    if (!action) return;
                    // RAG sonucu: belirli dosya bağlamında otomatik PDF sekmesi
                    if (action.command === 'OPEN_PDF_AT' && onOpenFile) {
                        const { doc_id, pdf_url, source_file, page, bbox } = action;
                        const url = doc_id ? `/api/archive/file/${doc_id}` : (pdf_url || '');
                        if (!url) return;
                        const nameMatch = (source_file || '').match(/[^/\\]+$/);
                        const name = nameMatch ? nameMatch[0] : (source_file || 'Belge');
                        const tabKey = `pdf-${doc_id || name}-p${page || 1}`;
                        onOpenFile({
                            id: tabKey,
                            title: `📍 ${name}${page ? ` – Slayt ${page}` : ''}`,
                            type: 'pdf', url,
                            meta: { page: page || 1, highlightPage: page || 1, bbox: bbox || null },
                        });
                    }
                },
                onN8nAction: ({ action }) => {
                    if (!action) return;
                    const ok = action.status === 'ok';
                    const statusMsg = ok
                        ? `✅ **${action.workflow}** otomasyonu başarıyla tetiklendi.`
                        : `⚠️ **${action.workflow}** tetiklenmeye çalışıldı. ${action.detail || ''}`;
                    setMessages(prev => prev.map(m => m.id === aiMsgId
                        ? { ...m, text: m.text ? m.text + '\n\n' + statusMsg : statusMsg, n8nAction: action }
                        : m
                    ));
                },
                onNodeError: ({ node, text }) => {
                    setMessages(prev => prev.map(m => m.id === aiMsgId
                        ? { ...m, graphErrors: [...(m.graphErrors || []), { node, text }] }
                        : m
                    ));
                },
            },
            fileOpts,
            commandOpts,
            controller.signal,
        );
    };

    const handleStop = () => {
        const c = abortControllerRef.current;
        if (c && !c.signal.aborted) {
            c.abort();
        }
    };

    /**
     * Clarification kartından "Devam et" / "Vazgeç" tıklandığında çağrılır.
     * Mevcut AI mesajını in-place günceller (yeni baloncuk açılmaz).
     */
    const handleClarificationContinue = async (aiMsgId, {
        originalError, qaHistory, screenshotBase64, screenshotMime, forceMaxRound,
    }) => {
        // Mevcut kartı "yükleniyor" durumuna al
        setMessages(prev => prev.map(m =>
            m.id === aiMsgId
                ? { ...m, isStreaming: true, text: '', wasRevised: false, graphNodes: [], graphErrors: [] }
                : m
        ));
        streamingMsgIdRef.current = aiMsgId;
        isTypingRef.current = true;
        setIsTyping(true);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        await sendMessageStream(
            originalError || '',
            currentSessionId,
            currentUser?.id,
            {
                onChunk: (chunk) => {
                    setMessages(prev =>
                        prev.map(m => m.id === aiMsgId ? { ...m, text: m.text + chunk } : m)
                    );
                },
                onReplace: (newText) => {
                    setMessages(prev =>
                        prev.map(m => m.id === aiMsgId ? { ...m, text: newText, wasRevised: true } : m)
                    );
                },
                onDone: ({ rag_used, rag_sources, model, provider, prompt_tokens, completion_tokens, duration_ms }) => {
                    setMessages(prev => prev.map(m => {
                        if (m.id !== aiMsgId) return m;
                        const hasText = !!(m.text && m.text.trim());
                        if (!hasText) {
                            return {
                                ...m,
                                text: '❌ Yapay zeka cevabı üretilemedi.',
                                isStreaming: false,
                                isError: true,
                                completedAt: Date.now(),
                            };
                        }
                        return {
                            ...m,
                            isStreaming: false,
                            ragUsed: rag_used,
                            ragSources: rag_sources,
                            completedAt: Date.now(),
                            model, provider,
                            promptTokens: prompt_tokens,
                            completionTokens: completion_tokens,
                            backendDurationMs: duration_ms,
                        };
                    }));
                    setIsTyping(false); isTypingRef.current = false;
                    streamingMsgIdRef.current = null;
                },
                onError: (errText) => {
                    setMessages(prev => prev.map(m => {
                        if (m.id !== aiMsgId) return m;
                        const hasRealContent = !!(m.text && m.text.trim()) && m.wasRevised && !m.isError;
                        if (hasRealContent) return { ...m, isStreaming: false };
                        return { ...m, text: errText, isStreaming: false, isError: true };
                    }));
                    setIsTyping(false); isTypingRef.current = false;
                    streamingMsgIdRef.current = null;
                },
                onAbort: () => {
                    setMessages(prev => prev.map(m =>
                        m.id !== aiMsgId ? m : {
                            ...m,
                            text: (m.text?.trim() ? m.text + '\n\n_— Yanıt durduruldu —_' : '_Yanıt başlamadan durduruldu._'),
                            isStreaming: false,
                            isAborted: true,
                            completedAt: Date.now(),
                        }
                    ));
                    setIsTyping(false); isTypingRef.current = false;
                    streamingMsgIdRef.current = null;
                },
                onProgress: ({ node, phase, elapsed_ms, approved, feedback, revision_count }) => {
                    setMessages(prev => prev.map(m => {
                        if (m.id !== aiMsgId) return m;
                        const next = {
                            ...m,
                            graphNodes: [...(m.graphNodes || []), { node, phase, elapsedMs: elapsed_ms, approved, feedback, revision_count }],
                        };
                        if (node === 'critic') {
                            next.criticApproved = approved !== false;
                            next.criticFeedback = feedback || '';
                            next.criticRevisionCount = (m.criticRevisionCount || 0) + (approved === false ? 1 : 0);
                        }
                        return next;
                    }));
                },
                onNodeError: ({ node, text }) => {
                    setMessages(prev => prev.map(m =>
                        m.id === aiMsgId
                            ? { ...m, graphErrors: [...(m.graphErrors || []), { node, text }] }
                            : m
                    ));
                },
            },
            null,  // fileOpts
            { commandId: forceMaxRound ? 'clarification_continue' : 'clarification_continue' },
            controller.signal,
            { qaHistory: qaHistory || [], screenshotBase64: screenshotBase64 || null },
        );
    };

    const handleEditAndResend = (msgId, newText) => {
        const idx = messages.findIndex(m => m.id === msgId);
        if (idx === -1) return;
        setMessages(messages.slice(0, idx));
        handleSendMessage(newText);
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
            style={sideMode === 'parts-time'
                ? { width: `calc(100vw - ${isLeftCollapsed ? 68 : 288}px)` }
                : isSideOpen ? { width: `${chatWidth}px` } : undefined}
            className={`h-screen flex shrink-0 z-20 overflow-hidden font-sans
                ${isResizing || noTransition ? '' : 'transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)]'}
                ${isSideOpen || sideMode === 'parts-time' ? 'cursor-default' : 'w-[68px] cursor-pointer hover:bg-stone-100'}
                relative bg-gradient-to-b from-stone-50 to-stone-100/30 border-l shadow-[-10px_0_40px_rgba(0,0,0,0.03)]
                ${isDragOver ? 'border-[#DC2626]/40 bg-[#FEF2F2]/30' : 'border-stone-200'}
            `}
        >
            {/* Sol kenar tutamak — sürükleyerek genişlet, çift tıkla sıfırla */}
            {isSideOpen && (
                <div
                    onMouseDown={startResize}
                    onDoubleClick={resetWidth}
                    onClick={(e) => e.stopPropagation()}
                    title="Sürükleyerek genişliği ayarla (çift tıkla sıfırla)"
                    className={`no-toggle absolute top-0 left-0 h-full w-1.5 z-30 cursor-col-resize group
                        ${isResizing ? '' : 'transition-colors duration-150'}`}
                >
                    {/* görünür ince çubuk (hover/aktif durumunda kırmızı) */}
                    <div className={`absolute inset-y-0 left-0 w-px transition-colors
                        ${isResizing ? 'bg-[#DC2626]' : 'bg-transparent group-hover:bg-[#DC2626]/50'}
                    `} />
                </div>
            )}
            {isDragOver && (
                <div className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none">
                    <div className="bg-white/90 border-2 border-dashed border-[#DC2626]/50 rounded-2xl px-8 py-6 flex flex-col items-center gap-2 shadow-xl">
                        <span className="text-3xl">📎</span>
                        <p className="text-sm font-semibold text-[#DC2626]">Dosyayı buraya bırak</p>
                        <p className="text-xs text-stone-400">
                            {attachedFiles.length >= MAX_ATTACH
                                ? `Maksimum ${MAX_ATTACH} dosya limitine ulaşıldı`
                                : 'Bu dosya hakkında soru sorabilirsin'}
                        </p>
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col min-w-0 h-full relative w-full bg-gradient-to-b from-stone-50 to-stone-100/30">
                {sideMode === 'parts-time' ? (
                    /* ── Süre Hesaplama: sol panel + sağ kapalı şerit ── */
                    <div className="flex flex-row h-full w-full overflow-hidden">
                        {/* Sol: PartsTimeViewer — tıklamalar aside'a kabarcıklanmasın */}
                        <div className="flex-1 flex flex-col overflow-hidden border-r border-stone-200" onClick={(e) => e.stopPropagation()}>
                            <Suspense fallback={
                                <div className="flex items-center justify-center h-full text-stone-400 text-[12px]">
                                    Yükleniyor…
                                </div>
                            }>
                                <PartsTimeViewer />
                            </Suspense>
                        </div>
                        {/* Sağ: chat açıksa tam panel, kapalıysa 68px şerit */}
                        <div
                            className="shrink-0 flex flex-col h-full transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)]"
                            style={isSideOpen ? { width: `${chatWidth}px` } : { width: '68px' }}
                        >
                            <MessageList
                                messages={messages}
                                isTyping={isSideOpen ? isTyping : false}
                                isSideOpen={isSideOpen}
                                handleChatScroll={isSideOpen ? handleChatScroll : () => {}}
                                isChatScrolling={isSideOpen ? isChatScrolling : false}
                                messagesEndRef={messagesEndRef}
                                lastUserMsgRef={lastUserMsgRef}
                                handleNewChat={handleNewChat}
                                onEditAndResend={isSideOpen ? handleEditAndResend : () => {}}
                                onSendFollowup={isSideOpen ? (q) => handleSendMessage(q) : () => {}}
                                onClarificationContinue={isSideOpen ? handleClarificationContinue : () => {}}
                                currentUser={currentUser}
                                currentSessionId={currentSessionId}
                                onOpenFile={onOpenFile}
                                onPartsTime={() => {
                                    if (!isSideOpen) {
                                        setNoTransition(true);
                                        requestAnimationFrame(() => requestAnimationFrame(() => setNoTransition(false)));
                                    }
                                    setSideMode('chat');
                                }}
                            />
                            {isSideOpen && (
                                <ChatInputArea
                                    isSideOpen={true}
                                    inputValue={inputValue}
                                    setInputValue={setInputValue}
                                    isExpanded={isExpanded}
                                    setIsExpanded={setIsExpanded}
                                    handleSendMessage={handleSendMessage}
                                    handleKeyDown={handleKeyDown}
                                    handleTextareaScroll={handleTextareaScroll}
                                    isTextareaScrolling={isTextareaScrolling}
                                    textareaRef={textareaRef}
                                    attachedFiles={attachedFiles}
                                    onAddFiles={addAttachedFiles}
                                    onRemoveFile={removeAttachedFile}
                                    maxAttach={MAX_ATTACH}
                                    maxBytes={MAX_BYTES}
                                    isTyping={isTyping}
                                    onStop={handleStop}
                                    activeCommand={activeCommand}
                                    setActiveCommand={setActiveCommand}
                                />
                            )}
                        </div>
                    </div>
                ) : (
                    /* ── Normal sohbet paneli ── */
                    <>
                    {isSideOpen && <RecentChats
                        isSideOpen={isSideOpen}
                        isChatsOpen={isChatsOpen}
                        setIsChatsOpen={setIsChatsOpen}
                        handleNewChat={handleNewChat}
                        handleLoadSession={handleLoadSession}
                        currentSessionId={currentSessionId}
                    />}

                    <div
                        className="flex-1 flex flex-col min-w-0 overflow-hidden"
                        onClickCapture={() => { if (isChatsOpen) setIsChatsOpen(false); }}
                        onFocusCapture={() => { if (isChatsOpen) setIsChatsOpen(false); }}
                    >
                        <MessageList
                            messages={messages}
                            isTyping={isTyping}
                            isSideOpen={isSideOpen}
                            handleChatScroll={handleChatScroll}
                            isChatScrolling={isChatScrolling}
                            messagesEndRef={messagesEndRef}
                            lastUserMsgRef={lastUserMsgRef}
                            handleNewChat={handleNewChat}
                            onEditAndResend={handleEditAndResend}
                            onSendFollowup={(q) => handleSendMessage(q)}
                            onClarificationContinue={handleClarificationContinue}
                            currentUser={currentUser}
                            currentSessionId={currentSessionId}
                            onOpenFile={onOpenFile}
                            onPartsTime={() => { setSideMode('parts-time'); setIsSideOpen(false); }}
                        />

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
                            attachedFiles={attachedFiles}
                            onAddFiles={addAttachedFiles}
                            onRemoveFile={removeAttachedFile}
                            maxAttach={MAX_ATTACH}
                            maxBytes={MAX_BYTES}
                            isTyping={isTyping}
                            onStop={handleStop}
                            activeCommand={activeCommand}
                            setActiveCommand={setActiveCommand}
                            compactMaxTurns={compactMaxTurns}
                            compactCurrentTurns={turnsSinceCompact}
                            onCompact={handleCompact}
                            isCompacting={isCompacting}
                        />
                    </div>
                    </>
                )}
            </div>
        </aside>
    );
};

export default ChatBar;
