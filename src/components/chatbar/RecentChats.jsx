import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, ChevronDown, Plus, Loader2, Trash2 } from 'lucide-react';

const RecentChats = ({ isSideOpen, isChatsOpen, setIsChatsOpen, handleNewChat, handleLoadSession, currentSessionId }) => {
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [editingSessionId, setEditingSessionId] = useState(null);
    const [editValue, setEditValue] = useState('');

    const fetchSessions = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/api/monitor/sessions?limit=10');
            const data = await res.json();
            setSessions(data.sessions || []);
        } catch (e) {
            console.error("Geçmiş oturumlar yüklenemedi", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isChatsOpen) fetchSessions();
    }, [isChatsOpen, fetchSessions]);

    const handleDelete = async (e, sessionId) => {
        e.stopPropagation();
        setDeletingId(sessionId);
        try {
            await fetch(`/api/monitor/sessions/${sessionId}`, { method: 'DELETE' });
            setSessions((prev) => prev.filter(s => s.sessionId !== sessionId));
            if (sessionId === currentSessionId) handleNewChat();
        } catch (err) {
            console.error("Sohbet silinemedi:", err);
        } finally {
            setDeletingId(null);
        }
    };

    const getChatTitle = (session) => {
        const customTitles = JSON.parse(localStorage.getItem('custom_chat_titles') || '{}');
        if (customTitles[session.sessionId]) return customTitles[session.sessionId];
        const firstUserMsg = session.messages?.find(m => m.role === 'user');
        if (firstUserMsg && firstUserMsg.content) {
            return firstUserMsg.content.substring(0, 32) + (firstUserMsg.content.length > 32 ? '...' : '');
        }
        return 'Yeni Sohbet';
    };

    const handleDoubleClick = (e, session) => {
        e.stopPropagation();
        setEditingSessionId(session.sessionId);
        setEditValue(getChatTitle(session));
    };

    const handleSaveEdit = (sessionId) => {
        if (editValue.trim() !== '') {
            const customTitles = JSON.parse(localStorage.getItem('custom_chat_titles') || '{}');
            customTitles[sessionId] = editValue.trim();
            localStorage.setItem('custom_chat_titles', JSON.stringify(customTitles));
            setSessions(prev => [...prev]);
        }
        setEditingSessionId(null);
    };

    const handleKeyDown = (e, sessionId) => {
        if (e.key === 'Enter') handleSaveEdit(sessionId);
        else if (e.key === 'Escape') setEditingSessionId(null);
    };

    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    };

    return (
        <div className={`shrink-0 bg-transparent flex transition-all duration-300 ${isSideOpen ? 'pb-2 pt-3 pr-4 pl-4 flex-col' : 'pt-5 px-0 pb-2 flex-col items-center w-full'}`}>
            {isSideOpen && (
                <div className="flex items-center justify-between mb-2 w-full shrink-0">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 cursor-pointer group no-toggle interactive" onClick={() => setIsChatsOpen(!isChatsOpen)}>
                            <h3 className="text-[10px] font-medium text-stone-400 uppercase tracking-wide group-hover:text-stone-600">Son Sohbetler</h3>
                            <ChevronDown size={12} className={`text-stone-300 group-hover:text-stone-500 transition-transform duration-300 ${isChatsOpen ? 'rotate-180' : ''}`} />
                        </div>
                        <div className="h-[1px] bg-stone-200/50 w-full opacity-60"></div>
                    </div>
                    <button
                        onClick={handleNewChat}
                        className="flex items-center justify-center text-[10px] font-medium tracking-wide text-stone-400 hover:text-[#DC2626] transition-colors focus:outline-none p-1 rounded"
                        title="Yeni Sohbet Başlat"
                    >
                        Yeni Sohbet
                    </button>
                </div>
            )}

            <AnimatePresence>
                {(isChatsOpen || !isSideOpen) && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden w-full">
                        <div className={`pb-1 w-full ${isSideOpen ? 'mt-2 flex flex-col gap-1.5' : 'flex flex-col items-center gap-3'}`}>
                            {isLoading && isSideOpen && (
                                <div className="flex justify-center py-2">
                                    <Loader2 size={16} className="animate-spin text-stone-400" />
                                </div>
                            )}

                            {!isLoading && sessions.length === 0 && isSideOpen && (
                                <div className="text-[11px] text-stone-400 py-2 text-center bg-stone-50/50 rounded-lg border border-dashed border-stone-200">
                                    Henüz sohbet bulunmuyor.
                                </div>
                            )}

                            {!isLoading && sessions.map(session => (
                                <motion.div
                                    key={session.sessionId}
                                    layout
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10, height: 0, marginBottom: 0 }}
                                    transition={{ duration: 0.18 }}
                                    onClick={() => handleLoadSession && handleLoadSession(session)}
                                    className={`cursor-pointer group transition-colors duration-200 flex items-center no-toggle interactive relative
                                        ${session.sessionId === currentSessionId ? 'text-[#DC2626]' : 'text-stone-600 hover:text-stone-900'}
                                        ${isSideOpen ? 'py-1 w-full' : 'w-7 h-7 justify-center mx-auto'}`}
                                    title="İsmini değiştirmek için çift tıkla"
                                >
                                    <div className={`flex items-center gap-1.5 font-medium text-[12px] w-full h-full min-w-0 ${session.sessionId === currentSessionId ? 'font-bold' : ''}`}>
                                        <MessageSquare size={13} className={`shrink-0 transition-colors ${session.sessionId === currentSessionId ? 'text-[#DC2626]' : 'text-stone-400 group-hover:text-[#DC2626]'}`} />

                                        {isSideOpen && (
                                            <div
                                                className="flex flex-row items-center justify-between w-full min-w-0 pr-6"
                                                onDoubleClick={(e) => handleDoubleClick(e, session)}
                                            >
                                                {editingSessionId === session.sessionId ? (
                                                    <input
                                                        type="text"
                                                        value={editValue}
                                                        onChange={e => setEditValue(e.target.value)}
                                                        onBlur={() => handleSaveEdit(session.sessionId)}
                                                        onKeyDown={e => handleKeyDown(e, session.sessionId)}
                                                        autoFocus
                                                        onClick={e => e.stopPropagation()}
                                                        className="w-full bg-white border border-[#DC2626]/50 rounded px-1 -ml-1 text-[11px] h-4 outline-none shadow-sm"
                                                    />
                                                ) : (
                                                    <>
                                                        <span className="truncate flex-1 pr-1.5 leading-none">{getChatTitle(session)}</span>
                                                        <span className="text-[9px] text-stone-400 opacity-80 shrink-0 leading-none">{formatTime(session.endTime)}</span>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {isSideOpen && (
                                        <button
                                            onClick={(e) => handleDelete(e, session.sessionId)}
                                            disabled={deletingId === session.sessionId}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-stone-300 hover:text-[#991B1B] hover:bg-[#FEF2F2] opacity-0 group-hover:opacity-100 transition-all focus:outline-none disabled:opacity-50"
                                            title="Sohbeti Sil"
                                        >
                                            {deletingId === session.sessionId
                                                ? <Loader2 size={12} className="animate-spin" />
                                                : <Trash2 size={12} />
                                            }
                                        </button>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RecentChats;
