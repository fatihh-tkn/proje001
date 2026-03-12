import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, Send, ChevronsUp, FileSearch, Zap } from 'lucide-react';

const ChatInputArea = ({
    isSideOpen, inputValue, setInputValue, isExpanded, setIsExpanded,
    handleSendMessage, handleKeyDown, handleTextareaScroll, isTextareaScrolling, textareaRef
}) => {
    return (
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
    );
};

export default ChatInputArea;
