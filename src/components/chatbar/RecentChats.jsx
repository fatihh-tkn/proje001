import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Edit, ChevronDown, Plus } from 'lucide-react';

const RecentChats = ({ isSideOpen, isChatsOpen, setIsChatsOpen, handleNewChat }) => {
    return (
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
    );
};

export default RecentChats;
