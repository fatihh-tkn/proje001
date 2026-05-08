import React, {
    useState, useEffect, useRef, useMemo, useCallback,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Hash, Send, X, Search, Reply, Trash2, ArrowDown, Users,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { fetchMessages, buildWsUrl } from '../../api/globalChatService';

// ── Sabitler ──────────────────────────────────────────────────────────────────
const EMOJI_LIST   = ['👍', '❤️', '😂', '😮', '😢', '🎉'];
const GROUP_GAP_MS = 5 * 60 * 1000;

const AVATAR_PALETTES = [
    ['#DC2626','#991b1b'], ['#b91c1c','#7f1d1d'], ['#be185d','#831843'],
    ['#7c3aed','#4c1d95'], ['#4f46e5','#312e81'], ['#0e7490','#164e63'],
    ['#0f766e','#134e4a'], ['#b45309','#78350f'], ['#92400e','#451a03'],
    ['#9f1239','#4c0519'],
];

// ── Yardımcılar ───────────────────────────────────────────────────────────────
function avatarPalette(id, name) {
    const key = id || name || '';
    let h = 0;
    for (let i = 0; i < key.length; i++) h = key.charCodeAt(i) + ((h << 5) - h);
    return AVATAR_PALETTES[Math.abs(h) % AVATAR_PALETTES.length];
}

function initials(name) {
    if (!name) return '?';
    const p = name.trim().split(/\s+/);
    return p.length === 1
        ? p[0][0].toUpperCase()
        : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function fmtFull(ts) {
    const d   = new Date(ts);
    const now = new Date();
    const time = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return time;
    const yest = new Date(now); yest.setDate(now.getDate() - 1);
    if (d.toDateString() === yest.toDateString()) return `Dün ${time}`;
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }) + ' ' + time;
}

function dayLabel(ts) {
    const d   = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Bugün';
    const yest = new Date(now); yest.setDate(now.getDate() - 1);
    if (d.toDateString() === yest.toDateString()) return 'Dün';
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function groupMessages(messages) {
    const groups = [];
    messages.forEach(msg => {
        const last = groups[groups.length - 1];
        if (
            last &&
            last.authorId === msg.author_id &&
            last.author   === msg.author &&
            msg.timestamp - last.lastTs < GROUP_GAP_MS
        ) {
            last.messages.push(msg);
            last.lastTs = msg.timestamp;
        } else {
            groups.push({
                key:      msg.id,
                author:   msg.author,
                authorId: msg.author_id,
                firstTs:  msg.timestamp,
                lastTs:   msg.timestamp,
                messages: [msg],
            });
        }
    });
    return groups;
}

// ── Ortak CSS değişkenleri ────────────────────────────────────────────────────
const glass = {
    background: 'rgba(255,255,255,0.06)',
    border:     '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(12px)',
};

// ── Alt Bileşenler ────────────────────────────────────────────────────────────

function DateSep({ label }) {
    return (
        <div className="flex items-center gap-3 px-5 py-4 select-none">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <span className="text-[10px] font-semibold tracking-widest uppercase px-3 py-1 rounded-full"
                style={{ color: '#64748b', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {label}
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>
    );
}

function Avatar({ authorId, author, size = 32 }) {
    const [from, to] = avatarPalette(authorId, author);
    const ini = initials(author);
    return (
        <div
            className="rounded-full flex items-center justify-center font-bold text-white select-none shrink-0"
            style={{
                width: size, height: size,
                fontSize: size * 0.34,
                background: `linear-gradient(135deg, ${from}, ${to})`,
                boxShadow: `0 2px 8px ${from}55`,
            }}>
            {ini}
        </div>
    );
}

function ReplyPreview({ reply_to }) {
    if (!reply_to) return null;
    return (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 mb-1 rounded-lg max-w-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.05)', borderLeft: '2px solid rgba(100,116,139,0.6)' }}>
            <Reply size={10} className="text-slate-500 shrink-0" />
            <span className="text-[10px] font-semibold text-slate-400 shrink-0">{reply_to.author}</span>
            <span className="text-[10px] text-slate-600 truncate">
                {reply_to.deleted ? <em>silindi</em> : reply_to.text}
            </span>
        </div>
    );
}

function ReplyBar({ replyTo, onClear }) {
    if (!replyTo) return null;
    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden mb-1.5">
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mx-0.5"
                style={{
                    background:     'linear-gradient(135deg, rgba(220,38,38,0.1), rgba(185,28,28,0.06))',
                    border:         '1px solid rgba(220,38,38,0.25)',
                    backdropFilter: 'blur(8px)',
                }}>
                <div className="w-[3px] self-stretch rounded-full shrink-0"
                    style={{ background: 'linear-gradient(180deg, #DC2626, #991b1b)' }} />
                <Reply size={13} className="shrink-0" style={{ color: 'rgba(220,38,38,0.6)' }} />
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold leading-none mb-0.5" style={{ color: '#f87171' }}>
                        {replyTo.author}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate leading-snug">
                        {replyTo.deleted ? <em className="text-slate-600">silindi</em> : replyTo.text}
                    </p>
                </div>
                <button onClick={onClear}
                    className="w-6 h-6 flex items-center justify-center rounded-full shrink-0 transition-all text-slate-600 hover:text-white hover:bg-white/10">
                    <X size={12} />
                </button>
            </div>
        </motion.div>
    );
}

function TypingBar({ users }) {
    if (!users.length) return null;
    const label = users.length === 1
        ? `${users[0]} yazıyor`
        : users.length === 2
            ? `${users[0]} ve ${users[1]} yazıyor`
            : `${users.length} kişi yazıyor`;
    return (
        <div className="px-4 pb-2 flex items-center gap-2">
            <div className="flex gap-[3px] items-center">
                {[0,1,2].map(i => (
                    <span key={i} className="block w-[5px] h-[5px] rounded-full"
                        style={{
                            background: '#475569',
                            animation: `gcTyping 1.4s ${i * 0.18}s infinite ease-in-out`,
                        }} />
                ))}
            </div>
            <span className="text-[11px] text-slate-500">{label}</span>
        </div>
    );
}

function ContextMenu({ menu, onReact, onReply, onDelete, onClose }) {
    const ref = useRef(null);

    useEffect(() => {
        const close = e => {
            if (ref.current && !ref.current.contains(e.target)) onClose();
        };
        const closeOnEsc = e => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', closeOnEsc);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', closeOnEsc);
        };
    }, [onClose]);

    // panel içinde kalsın
    const PANEL_W  = 480;
    const MENU_W   = 220;
    const left = Math.min(menu.x, menu.panelLeft + PANEL_W - MENU_W - 8);
    const top  = menu.y + 6;

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1,   y: 0  }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            transition={{ duration: 0.13 }}
            onContextMenu={e => e.preventDefault()}
            className="fixed z-[200] rounded-2xl shadow-2xl overflow-hidden"
            style={{
                left,
                top,
                width:          MENU_W,
                background:     '#1a1714',
                border:         '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(24px)',
            }}>

            {/* Emoji satırı */}
            <div className="flex items-center justify-between px-3 py-2.5"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {EMOJI_LIST.map(e => (
                    <button key={e}
                        onClick={() => { onReact(menu.msg.id, e); onClose(); }}
                        className="w-8 h-8 flex items-center justify-center text-[18px] rounded-xl hover:bg-white/10 transition-all hover:scale-125 active:scale-95">
                        {e}
                    </button>
                ))}
            </div>

            {/* Aksiyonlar */}
            <div className="py-1.5">
                <button
                    onClick={() => { onReply({ id: menu.msg.id, author: menu.msg.author, text: menu.msg.text, deleted: menu.msg.deleted }); onClose(); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-slate-300 hover:bg-white/6 hover:text-white transition-colors text-left">
                    <Reply size={14} className="text-slate-500 shrink-0" />
                    Yanıtla
                </button>

                {menu.isMine && !menu.msg.deleted && (
                    <>
                        <div className="mx-3 my-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                        <button
                            onClick={() => { onDelete(menu.msg.id); onClose(); }}
                            className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-red-400 hover:bg-red-500/10 transition-colors text-left">
                            <Trash2 size={14} className="shrink-0" />
                            Mesajı Sil
                        </button>
                    </>
                )}
            </div>
        </motion.div>
    );
}

function ReactionRow({ reactions, currentUserId, onReact }) {
    const entries = Object.entries(reactions || {}).filter(([, u]) => u.length > 0);
    if (!entries.length) return null;
    return (
        <div className="flex flex-wrap gap-1 mt-1.5">
            {entries.map(([emoji, users]) => {
                const mine = users.includes(currentUserId || '');
                return (
                    <motion.button
                        key={emoji}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => onReact(emoji)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors
                            ${mine
                                ? 'text-white'
                                : 'text-slate-300 hover:text-white'}`}
                        style={mine
                            ? { background: 'rgba(220,38,38,0.25)', border: '1px solid rgba(220,38,38,0.5)' }
                            : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <span>{emoji}</span>
                        <span className="text-[10px] opacity-80">{users.length}</span>
                    </motion.button>
                );
            })}
        </div>
    );
}

function MsgGroup({ group, isMine, currentUserId, onReact, onCtxMenu }) {
    const [palette] = useState(() => avatarPalette(group.authorId, group.author));

    const handleCtx = (e, msg) => {
        e.preventDefault();
        onCtxMenu({ x: e.clientX, y: e.clientY, msg, isMine });
    };

    if (isMine) {
        return (
            <div className="flex flex-col items-end px-4 gap-1 py-0.5">
                <span className="text-[10px] text-slate-600 pr-0.5 select-none tabular-nums">
                    {group.author} · {fmtFull(group.firstTs)}
                </span>
                {group.messages.map(msg => (
                    <div key={msg.id} className="flex flex-col items-end" style={{ maxWidth: '78%' }}>
                        {msg.reply_to && <ReplyPreview reply_to={msg.reply_to} />}
                        <div
                            onContextMenu={e => handleCtx(e, msg)}
                            className={`px-3.5 py-2 rounded-[18px] rounded-tr-[6px] text-[13px] leading-relaxed whitespace-pre-wrap break-words select-text cursor-default
                                ${msg.deleted ? 'italic text-slate-500' : 'text-white'}`}
                            style={msg.deleted
                                ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }
                                : { background: `linear-gradient(135deg, ${palette[0]}, ${palette[1]})`, boxShadow: `0 2px 12px ${palette[0]}44` }}>
                            {msg.deleted ? '🚫 Bu mesaj silindi.' : msg.text}
                        </div>
                        <ReactionRow
                            reactions={msg.reactions}
                            currentUserId={currentUserId}
                            onReact={e => onReact(msg.id, e)}
                        />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex gap-2.5 px-4 items-end py-0.5">
            <Avatar authorId={group.authorId} author={group.author} size={30} />
            <div className="flex flex-col gap-1" style={{ maxWidth: '78%' }}>
                <span className="text-[10px] font-semibold text-slate-400 pl-1 select-none">
                    {group.author}
                    <span className="font-normal text-slate-600 ml-1.5 tabular-nums">{fmtFull(group.firstTs)}</span>
                </span>
                {group.messages.map(msg => (
                    <div key={msg.id} className="flex flex-col">
                        {msg.reply_to && <ReplyPreview reply_to={msg.reply_to} />}
                        <div
                            onContextMenu={e => handleCtx(e, msg)}
                            className={`px-3.5 py-2 rounded-[18px] rounded-tl-[6px] text-[13px] leading-relaxed whitespace-pre-wrap break-words select-text cursor-default
                                ${msg.deleted ? 'italic text-slate-500' : 'text-slate-100'}`}
                            style={msg.deleted
                                ? { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }
                                : { ...glass }}>
                            {msg.deleted ? '🚫 Bu mesaj silindi.' : msg.text}
                        </div>
                        <ReactionRow
                            reactions={msg.reactions}
                            currentUserId={currentUserId}
                            onReact={e => onReact(msg.id, e)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

function LoadingDots() {
    return (
        <div className="flex items-center justify-center flex-1">
            <div className="flex gap-2">
                {[0,1,2].map(i => (
                    <span key={i} className="w-2 h-2 rounded-full"
                        style={{
                            background: '#374151',
                            animation: `gcTyping 1.2s ${i * 0.2}s infinite ease-in-out`,
                        }} />
                ))}
            </div>
        </div>
    );
}

// ── Ana Bileşen ───────────────────────────────────────────────────────────────

const GlobalChatRoom = ({
    open,
    onClose,
    isCollapsed = false,
    activeChannelId,
    setActiveChannelId,
    channels = [],
    onNewMessage,
}) => {
    const currentUser = useWorkspaceStore(s => s.currentUser);
    const userId   = currentUser?.id   || null;
    const userName = currentUser?.tam_ad || currentUser?.kullanici_adi || 'Kullanıcı';

    const [messages,    setMessages]    = useState([]);
    const [input,       setInput]       = useState('');
    const [replyTo,     setReplyTo]     = useState(null);
    const [ctxMenu,     setCtxMenu]     = useState(null);
    const [typingUsers, setTypingUsers] = useState([]);
    const [onlineCount, setOnlineCount] = useState(0);
    const [onlineNames, setOnlineNames] = useState([]);
    const [showOnline,  setShowOnline]  = useState(false);
    const [isAtBottom,  setIsAtBottom]  = useState(true);
    const [newMsgCount, setNewMsgCount] = useState(0);
    const [showSearch,  setShowSearch]  = useState(false);
    const [searchQ,     setSearchQ]     = useState('');
    const [loading,     setLoading]     = useState(false);

    const wsRef          = useRef(null);
    const messagesEndRef = useRef(null);
    const scrollRef      = useRef(null);
    const inputRef       = useRef(null);
    const typingTimerRef = useRef(null);
    const isAtBottomRef  = useRef(true);

    const activeChannel = useMemo(
        () => channels.find(c => c.id === activeChannelId),
        [channels, activeChannelId]
    );

    // ── Mesaj yükle ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!activeChannelId || !open) return;
        setMessages([]);
        setTypingUsers([]);
        setOnlineCount(0);
        setReplyTo(null);
        setSearchQ('');
        setLoading(true);
        fetchMessages(activeChannelId)
            .then(msgs => setMessages(msgs))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [activeChannelId, open]);

    // ── WebSocket ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!activeChannelId || !open) return;
        const ws = new WebSocket(buildWsUrl(activeChannelId, userId, userName));
        wsRef.current = ws;

        ws.onmessage = (ev) => {
            try {
                const data = JSON.parse(ev.data);
                if (data.type === 'message') {
                    const msg = data.message;
                    setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
                    if (!isAtBottomRef.current) setNewMsgCount(n => n + 1);
                    if (onNewMessage) onNewMessage(msg.channel_id, msg);
                } else if (data.type === 'message_deleted') {
                    setMessages(prev => prev.map(m =>
                        m.id === data.message_id ? { ...m, deleted: true, text: null } : m
                    ));
                } else if (data.type === 'reaction_update') {
                    setMessages(prev => prev.map(m =>
                        m.id === data.message_id ? { ...m, reactions: data.reactions } : m
                    ));
                } else if (data.type === 'typing') {
                    setTypingUsers((data.users || []).filter(n => n !== userName));
                } else if (data.type === 'presence') {
                    setOnlineCount(data.count || 0);
                    setOnlineNames(data.users || []);
                }
            } catch (_) {}
        };

        ws.onerror = () => {};
        return () => { ws.close(); wsRef.current = null; };
    }, [activeChannelId, open, userId, userName]);

    // ── Scroll ────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!open) return;
        const el = scrollRef.current;
        if (!el) return;
        const handle = () => {
            const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            isAtBottomRef.current = atBottom;
            setIsAtBottom(atBottom);
            if (atBottom) setNewMsgCount(0);
        };
        el.addEventListener('scroll', handle, { passive: true });
        return () => el.removeEventListener('scroll', handle);
    }, [open]);

    useEffect(() => {
        if (isAtBottomRef.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: messages.length <= 5 ? 'instant' : 'smooth' });
        }
    }, [messages]);

    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 130);
    }, [open, activeChannelId]);

    // ── Gönder ───────────────────────────────────────────────────────────────
    const sendMessage = useCallback(() => {
        const text = input.trim();
        if (!text || !activeChannelId || wsRef.current?.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(JSON.stringify({ type: 'message', text, reply_id: replyTo?.id || null }));
        setInput('');
        setReplyTo(null);
        clearTimeout(typingTimerRef.current);
        wsRef.current?.send(JSON.stringify({ type: 'typing', is_typing: false }));
    }, [input, activeChannelId, replyTo]);

    // ── Typing ───────────────────────────────────────────────────────────────
    const handleInputChange = (e) => {
        setInput(e.target.value);
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'typing', is_typing: true }));
            clearTimeout(typingTimerRef.current);
            typingTimerRef.current = setTimeout(() => {
                wsRef.current?.send(JSON.stringify({ type: 'typing', is_typing: false }));
            }, 3000);
        }
    };

    // ── Reaksiyon + Sil ──────────────────────────────────────────────────────
    const handleReact = useCallback((msgId, emoji) => {
        wsRef.current?.readyState === WebSocket.OPEN &&
            wsRef.current.send(JSON.stringify({ type: 'react', message_id: msgId, emoji }));
    }, []);

    const handleDelete = useCallback((msgId) => {
        wsRef.current?.readyState === WebSocket.OPEN &&
            wsRef.current.send(JSON.stringify({ type: 'delete', message_id: msgId }));
    }, []);

    // ── Mesaj grupları + tarih ayırıcıları ────────────────────────────────────
    const filteredMessages = useMemo(() => {
        if (!searchQ.trim()) return messages;
        const q = searchQ.toLocaleLowerCase('tr-TR');
        return messages.filter(m => m.text?.toLocaleLowerCase('tr-TR').includes(q));
    }, [messages, searchQ]);

    const { groups, separators } = useMemo(() => {
        const grps = groupMessages(filteredMessages);
        const seps = new Set();
        grps.forEach((g, i) => {
            if (i === 0) { seps.add(g.key); return; }
            const prev = grps[i - 1];
            if (new Date(g.firstTs).toDateString() !== new Date(prev.lastTs).toDateString())
                seps.add(g.key);
        });
        return { groups: grps, separators: seps };
    }, [filteredMessages]);

    // ── Panel ─────────────────────────────────────────────────────────────────
    const sidebarW   = isCollapsed ? 68 : 288;
    const panelWidth = 480;

    return (
        <>
            <style>{`
                @keyframes gcTyping {
                    0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
                    30%           { transform: translateY(-5px); opacity: 1; }
                }
                .gc-scrollbar::-webkit-scrollbar { width: 3px; }
                .gc-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .gc-scrollbar::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.3); border-radius: 99px; }
                .gc-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.55); }
                .gc-input-wrap:focus-within { border-color: rgba(220,38,38,0.45) !important; }
            `}</style>

            <div style={{
                position:      'fixed',
                top:           0,
                left:          open ? sidebarW : sidebarW - panelWidth - 24,
                width:         panelWidth,
                height:        '100vh',
                zIndex:        45,
                transition:    'left 0.3s cubic-bezier(0.16,1,0.3,1), opacity 0.22s',
                opacity:       open ? 1 : 0,
                pointerEvents: open ? 'auto' : 'none',
                display:       'flex',
                flexDirection: 'column',
                background:    '#13110f',
                borderRight:   '1px solid rgba(255,255,255,0.07)',
                boxShadow:     open ? '12px 0 48px rgba(0,0,0,0.8), inset -1px 0 0 rgba(255,255,255,0.04)' : 'none',
            }}>

                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="shrink-0 px-4"
                    style={{
                        background:   'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)',
                        borderBottom: '1px solid rgba(255,255,255,0.07)',
                        minHeight:    60,
                        display:      'flex',
                        flexDirection:'column',
                        justifyContent: 'center',
                        paddingTop: 12,
                        paddingBottom: 12,
                    }}>
                    <div className="flex items-center gap-2.5">
                        {/* Kanal ikonu */}
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.25)' }}>
                            <Hash size={13} className="text-[#DC2626]" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <span className="font-semibold text-slate-100 text-[14px] truncate block tracking-wide">
                                {activeChannel?.name ?? 'kanal seçilmedi'}
                            </span>
                            {activeChannel?.description && (
                                <span className="text-[10px] text-slate-600 truncate block leading-snug">
                                    {activeChannel.description}
                                </span>
                            )}
                        </div>

                        {/* Online göstergesi */}
                        {onlineCount > 0 && (
                            <div className="relative">
                                <button onClick={() => setShowOnline(v => !v)}
                                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors hover:bg-white/5"
                                    title="Online kullanıcılar">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 block"
                                        style={{ boxShadow: '0 0 6px #34d399' }} />
                                    <span className="text-[11px] font-medium text-slate-400">{onlineCount}</span>
                                    <Users size={11} className="text-slate-500" />
                                </button>
                                <AnimatePresence>
                                    {showOnline && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -6, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0,  scale: 1 }}
                                            exit={{ opacity: 0, y: -6, scale: 0.95 }}
                                            transition={{ duration: 0.12 }}
                                            className="absolute right-0 top-full mt-1.5 z-50 min-w-[160px] rounded-xl py-1.5 shadow-2xl"
                                            style={{ background: '#1e1a17', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-3 pb-1">
                                                Online — {onlineCount}
                                            </p>
                                            {onlineNames.map(n => (
                                                <div key={n} className="flex items-center gap-2 px-3 py-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
                                                        style={{ boxShadow: '0 0 4px #34d399' }} />
                                                    <span className="text-[12px] text-slate-300 truncate">{n}</span>
                                                </div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Arama */}
                        <button
                            onClick={() => { setShowSearch(v => !v); if (showSearch) setSearchQ(''); }}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all
                                ${showSearch ? 'text-[#DC2626] bg-[#DC2626]/10' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`}
                            title="Mesajlarda ara">
                            <Search size={13} />
                        </button>

                        {/* Kapat */}
                        <button onClick={onClose}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-all"
                            title="Kapat">
                            <X size={14} />
                        </button>
                    </div>

                    {/* Arama kutusu */}
                    <AnimatePresence>
                        {showSearch && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden">
                                <div className="flex items-center gap-2 mt-2.5 px-3 py-2 rounded-xl gc-input-wrap"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', transition: 'border-color 0.2s' }}>
                                    <Search size={11} className="text-slate-600 shrink-0" />
                                    <input
                                        autoFocus
                                        type="text"
                                        value={searchQ}
                                        onChange={e => setSearchQ(e.target.value)}
                                        placeholder="Mesajlarda ara…"
                                        className="flex-1 bg-transparent outline-none text-[12px] text-slate-200 placeholder-slate-600"
                                    />
                                    {searchQ && (
                                        <button onClick={() => setSearchQ('')}
                                            className="text-slate-600 hover:text-slate-300 transition-colors">
                                            <X size={11} />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ── Mesajlar ────────────────────────────────────────────── */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto gc-scrollbar relative">

                    {!activeChannel && (
                        <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <Hash size={22} className="text-slate-600" />
                            </div>
                            <p className="text-slate-600 text-[12px] leading-relaxed">
                                Soldaki listeden bir kanal seçin.
                            </p>
                        </div>
                    )}

                    {loading && activeChannel && <LoadingDots />}

                    {/* Hoş geldin ekranı */}
                    {!loading && activeChannel && messages.length === 0 && !searchQ && (
                        <div className="px-6 pt-10 pb-8">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                                style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.2), rgba(185,28,28,0.1))', border: '1px solid rgba(220,38,38,0.25)' }}>
                                <Hash size={30} className="text-[#DC2626]" />
                            </div>
                            <h2 className="text-[20px] font-bold text-slate-100 mb-1 tracking-tight">
                                #{activeChannel.name}
                            </h2>
                            {activeChannel.description && (
                                <p className="text-slate-500 text-[13px] mb-3 leading-relaxed">{activeChannel.description}</p>
                            )}
                            <p className="text-slate-600 text-[12px]">Bu kanalın başlangıcı. 👋 İlk mesajı sen at.</p>
                            <div className="mt-6 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                        </div>
                    )}

                    {/* Arama yok */}
                    {!loading && searchQ && filteredMessages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-48 gap-2">
                            <Search size={20} className="text-slate-700" />
                            <p className="text-[12px] text-slate-600">
                                "<span className="text-slate-400">{searchQ}</span>" için sonuç bulunamadı.
                            </p>
                        </div>
                    )}

                    {/* Mesaj grupları */}
                    {!loading && (
                        <div className="flex flex-col py-2">
                            {groups.map(group => (
                                <React.Fragment key={group.key}>
                                    {separators.has(group.key) && (
                                        <DateSep label={dayLabel(group.firstTs)} />
                                    )}
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.18 }}>
                                        <MsgGroup
                                            group={group}
                                            isMine={group.authorId ? group.authorId === userId : group.author === userName}
                                            currentUserId={userId || userName}
                                            onReact={handleReact}
                                            onCtxMenu={m => setCtxMenu({ ...m, panelLeft: sidebarW })}
                                        />
                                    </motion.div>
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    <div ref={messagesEndRef} className="h-3" />
                </div>

                {/* ── Sağ tıklama menüsü ──────────────────────────────────── */}
                <AnimatePresence>
                    {ctxMenu && (
                        <ContextMenu
                            menu={ctxMenu}
                            onReact={handleReact}
                            onReply={setReplyTo}
                            onDelete={handleDelete}
                            onClose={() => setCtxMenu(null)}
                        />
                    )}
                </AnimatePresence>

                {/* ── Scroll to bottom ────────────────────────────────────── */}
                <AnimatePresence>
                    {!isAtBottom && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.7 }}
                            onClick={() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); setNewMsgCount(0); }}
                            className="absolute right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white shadow-xl"
                            style={{
                                bottom: activeChannel ? 88 : 20,
                                background: 'linear-gradient(135deg, #DC2626, #b91c1c)',
                                boxShadow: '0 4px 16px rgba(220,38,38,0.45)',
                                zIndex: 20,
                            }}>
                            <ArrowDown size={12} />
                            {newMsgCount > 0 ? `${newMsgCount} yeni` : 'Aşağı'}
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* ── Input ───────────────────────────────────────────────── */}
                {activeChannel && (
                    <div className="shrink-0 px-3 pb-4 pt-1"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <TypingBar users={typingUsers} />
                        <AnimatePresence>
                            {replyTo && (
                                <ReplyBar replyTo={replyTo} onClear={() => setReplyTo(null)} />
                            )}
                        </AnimatePresence>

                        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl gc-input-wrap"
                            style={{
                                background:  'rgba(255,255,255,0.05)',
                                border:      '1px solid rgba(255,255,255,0.09)',
                                transition:  'border-color 0.2s, background 0.2s',
                            }}>
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={handleInputChange}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                                    if (e.key === 'Escape') setReplyTo(null);
                                }}
                                placeholder={`#${activeChannel.name} kanalına yaz…`}
                                className="flex-1 bg-transparent outline-none text-[13px] text-slate-200 placeholder-slate-600"
                            />
                            <motion.button
                                whileTap={{ scale: 0.85 }}
                                onClick={sendMessage}
                                disabled={!input.trim()}
                                className="w-7 h-7 flex items-center justify-center rounded-xl transition-all disabled:opacity-25"
                                style={input.trim()
                                    ? { background: 'linear-gradient(135deg,#DC2626,#b91c1c)', boxShadow: '0 2px 10px rgba(220,38,38,0.4)' }
                                    : { background: 'rgba(255,255,255,0.06)' }}
                                title="Gönder (Enter)">
                                <Send size={13} className={input.trim() ? 'text-white' : 'text-slate-500'} />
                            </motion.button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default GlobalChatRoom;
