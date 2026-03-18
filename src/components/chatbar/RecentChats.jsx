import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, ChevronDown, Plus, Loader2, Trash2 } from 'lucide-react';

const RecentChats = ({ isSideOpen, isChatsOpen, setIsChatsOpen, handleNewChat, handleLoadSession, currentSessionId }) => {
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [deletingId, setDeletingId] = useState(null); // hangi session siliniyor

    const fetchSessions = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await fetch('http://localhost:8000/api/monitor/sessions?limit=10');
            const data = await res.json();
            if (data && data.sessions) {
                setSessions(data.sessions.filter(s => s.messageCount > 0));
            }
        } catch (error) {
            console.error("Sohbetler yüklenemedi:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isChatsOpen && isSideOpen) {
            fetchSessions();
        }
    }, [isChatsOpen, isSideOpen, currentSessionId, fetchSessions]);

    // ── Sohbet silme ──────────────────────────────────────────────────────────
    const handleDelete = async (e, sessionId) => {
        e.stopPropagation(); // session'a tıklamayı engelle
        setDeletingId(sessionId);
        try {
            await fetch(`http://localhost:8000/api/monitor/sessions/${sessionId}`, {
                method: 'DELETE',
            });
            setSessions((prev) => prev.filter(s => s.sessionId !== sessionId));
            // Silinen sohbet aktif sohbetse yeni sohbet başlat
            if (sessionId === currentSessionId) {
                handleNewChat();
            }
        } catch (err) {
            console.error("Sohbet silinemedi:", err);
        } finally {
            setDeletingId(null);
        }
    };
    // ─────────────────────────────────────────────────────────────────────────

    const getChatTitle = (session) => {
        const firstUserMsg = session.messages?.find(m => m.role === 'user');
        if (firstUserMsg && firstUserMsg.content) {
            return firstUserMsg.content.substring(0, 32) + (firstUserMsg.content.length > 32 ? '...' : '');
        }
        return 'Yeni Sohbet';
    };

    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    };

    return (
        <div className={`pt-6 shrink-0 bg-transparent flex transition-all duration-300 ${isSideOpen ? 'pb-2 pt-4 pr-4 pl-8 flex-col' : 'px-0 pb-2 flex-col items-center w-full'}`}>
            {isSideOpen && (
                <div className="flex items-center justify-between mb-2 w-full shrink-0">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 cursor-pointer group no-toggle" onClick={() => setIsChatsOpen(!isChatsOpen)}>
                            <h3 className="text-xs font-bold text-slate-500 tracking-widest uppercase group-hover:text-slate-700">Son Sohbetler</h3>
                            <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isChatsOpen ? 'rotate-180' : ''}`} />
                        </div>
                        {/* Yazı uzunluğunda alt çizgi */}
                        <div className="h-[1px] bg-slate-200 w-full opacity-60"></div>
                    </div>
                    <button onClick={handleNewChat} className="flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors focus:outline-none p-1 rounded" title="Yeni Sohbet Başlat">
                        <Plus size={16} />
                    </button>
                </div>
            )}

            <AnimatePresence>
                {(isChatsOpen || !isSideOpen) && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden w-full">
                        <div className={`pb-1 w-full ${isSideOpen ? 'mt-2 flex flex-col gap-1.5' : 'flex flex-col items-center gap-3'}`}>
                            {isLoading && isSideOpen && <div className="flex justify-center py-2"><Loader2 size={16} className="animate-spin text-slate-400" /></div>}

                            {!isLoading && sessions.length === 0 && isSideOpen && (
                                <div className="text-[11px] text-slate-400 py-2 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
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
                                    className={`rounded-lg bg-white border cursor-pointer group transition-all flex items-center no-toggle relative
                                        ${session.sessionId === currentSessionId ? 'border-red-300 shadow-[0_2px_8px_rgba(239,68,68,0.08)] bg-red-50/10' : 'border-slate-100 hover:border-slate-300 shadow-sm'}
                                        ${isSideOpen ? 'px-3 py-2 flex-col items-start w-full' : 'w-10 h-10 justify-center mx-auto'}`}
                                    title={getChatTitle(session)}
                                >
                                    <div className="flex items-center gap-2 font-medium text-slate-700 text-xs w-full">
                                        <MessageSquare size={13} className={`shrink-0 transition-colors ${session.sessionId === currentSessionId ? 'text-red-400' : 'text-slate-400 group-hover:text-red-500'}`} />
                                        {isSideOpen && <span className="truncate flex-1 pr-5">{getChatTitle(session)}</span>}
                                    </div>
                                    {isSideOpen && <span className="text-[9px] text-slate-400 mt-0.5 opacity-80">{formatTime(session.endTime)}</span>}

                                    {/* ── Sil butonu — sadece açıkken ve hover'da ─── */}
                                    {isSideOpen && (
                                        <button
                                            onClick={(e) => handleDelete(e, session.sessionId)}
                                            disabled={deletingId === session.sessionId}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all focus:outline-none disabled:opacity-50"
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
