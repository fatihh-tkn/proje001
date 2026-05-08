import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Hash, Send, X } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';

const STORAGE_CHANNELS = 'global_chat_channels';
const messagesKey = (channelId) => `global_chat_messages_${channelId}`;

const DEFAULT_CHANNELS = [
    { id: 'genel', name: 'genel' },
    { id: 'duyurular', name: 'duyurular' },
];

const loadChannels = () => {
    try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_CHANNELS) || 'null');
        if (Array.isArray(stored) && stored.length) return stored;
    } catch (_) {}
    return DEFAULT_CHANNELS;
};

const loadMessages = (channelId) => {
    try {
        return JSON.parse(localStorage.getItem(messagesKey(channelId)) || '[]');
    } catch (_) { return []; }
};

// Her kullanıcıya tutarlı renk — kırmızı ton ağırlıklı, temaya yakın
const AVATAR_COLORS = [
    '#DC2626', '#b91c1c', '#9f1239', '#be185d',
    '#7c3aed', '#4f46e5', '#0e7490', '#0f766e',
    '#b45309', '#92400e',
];

const getAvatarColor = (authorId, author) => {
    const key = authorId || author || '';
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const GROUP_THRESHOLD_MS = 5 * 60 * 1000;

const groupMessages = (messages) => {
    const groups = [];
    messages.forEach((msg) => {
        const last = groups[groups.length - 1];
        if (
            last &&
            last.authorId === msg.authorId &&
            last.author === msg.author &&
            msg.timestamp - last.lastTimestamp < GROUP_THRESHOLD_MS
        ) {
            last.messages.push(msg);
            last.lastTimestamp = msg.timestamp;
        } else {
            groups.push({
                id: msg.id,
                author: msg.author,
                authorId: msg.authorId,
                timestamp: msg.timestamp,
                lastTimestamp: msg.timestamp,
                messages: [msg],
            });
        }
    });
    return groups;
};

const formatTimestamp = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const time = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return `Bugün ${time}`;
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return `Dün ${time}`;
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + time;
};

const formatMsgTime = (ts) =>
    new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

const GlobalChatRoom = ({ open, onClose, isCollapsed = false, activeChannelId, setActiveChannelId }) => {
    const currentUser = useWorkspaceStore(state => state.currentUser);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (activeChannelId) setMessages(loadMessages(activeChannelId));
    }, [activeChannelId, open]);

    useEffect(() => {
        if (open) {
            const t = setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
            return () => clearTimeout(t);
        }
    }, [messages, open]);

    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 120);
    }, [open, activeChannelId]);

    const sendMessage = () => {
        const text = input.trim();
        if (!text || !activeChannelId) return;
        const msg = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            author: currentUser?.tam_ad || currentUser?.kullanici_adi || 'Kullanıcı',
            authorId: currentUser?.id || null,
            text,
            timestamp: Date.now(),
        };
        const next = [...messages, msg];
        setMessages(next);
        localStorage.setItem(messagesKey(activeChannelId), JSON.stringify(next));
        setInput('');
    };

    const channels = loadChannels();
    const activeChannel = channels.find(c => c.id === activeChannelId);
    const messageGroups = useMemo(() => groupMessages(messages), [messages]);

    const sidebarW = isCollapsed ? 68 : 288;
    const panelWidth = 500;

    const panelStyle = {
        position: 'fixed',
        top: 0,
        left: open ? sidebarW : sidebarW - panelWidth - 20,
        width: `${panelWidth}px`,
        height: '100vh',
        zIndex: 45,
        transition: 'left 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        background: 'linear-gradient(180deg, #1c1917 0%, #161310 100%)',
        borderRight: '1px solid #292524',
        boxShadow: open ? '8px 0 40px rgba(0,0,0,0.7)' : 'none',
        display: 'flex',
        flexDirection: 'column',
    };

    return (
        <div style={panelStyle}>
            {/* Header */}
            <div className="h-12 px-4 flex items-center gap-2 shrink-0"
                style={{ borderBottom: '1px solid #292524' }}>
                <Hash size={16} className="text-[#DC2626] shrink-0" />
                <span className="font-semibold text-slate-100 text-[14px] flex-1 truncate tracking-wide">
                    {activeChannel?.name ?? 'kanal seçilmedi'}
                </span>
                <button
                    onClick={onClose}
                    className="text-slate-500 hover:text-slate-200 transition-colors p-1 rounded hover:bg-white/5"
                    title="Kapat"
                >
                    <X size={15} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto
                [&::-webkit-scrollbar]:w-1
                [&::-webkit-scrollbar-track]:bg-transparent
                [&::-webkit-scrollbar-thumb]:bg-slate-700/60
                [&::-webkit-scrollbar-thumb]:rounded-none
                hover:[&::-webkit-scrollbar-thumb]:bg-slate-600">

                {/* Kanal yok */}
                {!activeChannel && (
                    <div className="flex items-center justify-center h-full text-slate-600 text-[12px]">
                        Soldaki listeden bir kanal seçin.
                    </div>
                )}

                {/* Welcome screen */}
                {activeChannel && messages.length === 0 && (
                    <div className="px-5 pt-8 pb-6 mb-2" style={{ borderBottom: '1px solid #292524' }}>
                        <div className="w-14 h-14 rounded flex items-center justify-center mb-4"
                            style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.2)' }}>
                            <Hash size={28} className="text-[#DC2626]" />
                        </div>
                        <h2 className="text-[18px] font-bold text-slate-100 mb-1">
                            #{activeChannel.name}
                        </h2>
                        <p className="text-slate-500 text-[12px]">
                            Bu kanalın en başı. İlk mesajı sen at.
                        </p>
                    </div>
                )}

                {/* Message groups */}
                <div className="flex flex-col py-2 gap-1">
                    {messageGroups.map(group => {
                        const isMine = group.authorId
                            ? group.authorId === currentUser?.id
                            : group.author === (currentUser?.tam_ad || currentUser?.kullanici_adi);
                        const color = getAvatarColor(group.authorId, group.author);
                        const initials = getInitials(group.author);

                        if (isMine) {
                            return (
                                <div key={group.id} className="flex flex-col items-end px-4 gap-[3px]">
                                    <span className="text-[10px] text-slate-600 pr-1">
                                        {formatTimestamp(group.timestamp)}
                                    </span>
                                    {group.messages.map((msg) => (
                                        <div key={msg.id}
                                            className="max-w-[75%] px-3 py-[7px] rounded-[14px] rounded-tr-[4px] text-[13px] text-white leading-relaxed whitespace-pre-wrap break-words"
                                            style={{ background: '#DC2626' }}>
                                            {msg.text}
                                        </div>
                                    ))}
                                </div>
                            );
                        }

                        return (
                            <div key={group.id} className="flex gap-2.5 px-4 items-end">
                                {/* Avatar */}
                                <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white select-none mb-0.5"
                                    style={{ background: color }}>
                                    {initials}
                                </div>
                                {/* Bubbles */}
                                <div className="flex flex-col gap-[3px] max-w-[75%]">
                                    <span className="text-[10px] text-slate-600 pl-1 mb-0.5">
                                        {group.author} · {formatTimestamp(group.timestamp)}
                                    </span>
                                    {group.messages.map((msg) => (
                                        <div key={msg.id}
                                            className="px-3 py-[7px] rounded-[14px] rounded-tl-[4px] text-[13px] text-slate-200 leading-relaxed whitespace-pre-wrap break-words"
                                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                            {msg.text}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div ref={messagesEndRef} className="h-2" />
            </div>

            {/* Input */}
            {activeChannel && (
                <div className="px-4 pb-5 pt-2 shrink-0">
                    <div className="flex items-center gap-2 rounded-[3px] px-3 py-2.5 transition-colors"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #2d2a28' }}
                        onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(220,38,38,0.4)'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#2d2a28'}>
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    sendMessage();
                                }
                            }}
                            placeholder={`#${activeChannel.name} kanalına yaz…`}
                            className="flex-1 bg-transparent outline-none text-[13px] text-slate-200 placeholder-slate-600"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim()}
                            className="text-slate-600 hover:text-[#DC2626] disabled:opacity-25 disabled:hover:text-slate-600 transition-colors"
                            title="Gönder (Enter)"
                        >
                            <Send size={15} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GlobalChatRoom;
