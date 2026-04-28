import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, Send, ChevronsUp, FileSearch, Zap, X, FileText, Activity, Sparkles, ChevronDown, Cpu } from 'lucide-react';

// Dosya tipine göre ikon ve renk
const fileChipMeta = (type) => {
    switch (type) {
        case 'pdf': return { icon: <FileText size={12} />, color: 'bg-[#FCEBEB] border-stone-200 text-[#791F1F]' };
        case 'bpmn': return { icon: <Activity size={12} />, color: 'bg-[#E1F5EE] border-stone-200 text-[#085041]' };
        case 'xls':
        case 'xlsx': return { icon: <FileText size={12} />, color: 'bg-[#EAF3DE] border-stone-200 text-[#3B6D11]' };
        case 'docx':
        case 'doc': return { icon: <FileText size={12} />, color: 'bg-[#E6F1FB] border-stone-200 text-[#0C447C]' };
        default: return { icon: <FileText size={12} />, color: 'bg-stone-100 border-stone-200 text-stone-600' };
    }
};

const ChatInputArea = ({
    isSideOpen, inputValue, setInputValue, isExpanded, setIsExpanded,
    handleSendMessage, handleKeyDown, handleTextareaScroll, isTextareaScrolling, textareaRef,
    droppedFile, onClearFile, isTyping,
}) => {
    const chip = droppedFile ? fileChipMeta(droppedFile.type) : null;
    const [isCommandsOpen, setIsCommandsOpen] = React.useState(false);
    const [isModelMenuOpen, setIsModelMenuOpen] = React.useState(false);
    const [activeModel, setActiveModel] = React.useState('Model Seçiliyor...');
    const [availableModels, setAvailableModels] = React.useState([]);

    React.useEffect(() => {
        if (!isSideOpen) {
            setIsCommandsOpen(false);
            setIsModelMenuOpen(false);
        }
    }, [isSideOpen]);

    React.useEffect(() => {
        fetch('/api/monitor/catalog')
            .then(res => res.json())
            .then(data => {
                if (data && data.models && data.models.length > 0) {
                    const aliases = JSON.parse(localStorage.getItem('model_aliases') || '{}');
                    const loaded = data.models.map(m => aliases[m.id] || m.name);
                    setAvailableModels([...new Set(loaded)]); // Deduplicate if same name
                    setActiveModel(loaded[0]);
                } else {
                    const fallbacks = ['Varsayılan Model'];
                    setAvailableModels(fallbacks);
                    setActiveModel(fallbacks[0]);
                }
            })
            .catch(() => {
                const fallbacks = ['Bağlantı Hatası'];
                setAvailableModels(fallbacks);
                setActiveModel(fallbacks[0]);
            });
    }, []);

    return (
        <div className={`shrink-0 bg-transparent flex flex-col transition-all duration-300 ${isSideOpen ? 'px-2 pb-2 pt-2 gap-4' : 'px-0 pb-2 pt-2 items-center gap-3 border-transparent w-full'}`}>
            <AnimatePresence>
                {isSideOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20, height: 0, marginTop: 0 }}
                        className="relative flex flex-col w-full bg-white/80 backdrop-blur-xl border-2 border-white/60 rounded-md focus-within:border-[#378ADD] transition-all shadow-[0_4px_20px_rgb(0,0,0,0.04)] no-toggle"
                    >
                        {/* Genişlet/Daralt düğmesi */}
                        <div onClick={() => setIsExpanded(!isExpanded)} className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center justify-center cursor-pointer z-30 group px-4 py-0.5 interactive" title={isExpanded ? 'Daralt' : 'Genişlet'}>
                            <ChevronsUp size={13} className={`text-stone-300 group-hover:text-[#378ADD] transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`} />
                        </div>

                        {/* ── Sürüklenen Dosya Chip'i ────────────────────────── */}
                        <AnimatePresence>
                            {droppedFile && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="px-4 pt-5 pb-1"
                                >
                                    <div className={`inline-flex items-center gap-1.5 border rounded-lg px-2.5 py-1 text-xs font-medium max-w-full ${chip.color}`}>
                                        {chip.icon}
                                        <span className="truncate max-w-[180px]" title={droppedFile.name}>
                                            {droppedFile.name}
                                        </span>
                                        <span className="opacity-50 text-[10px] ml-0.5">üzerinde soru sor</span>
                                        <button
                                            onClick={onClearFile}
                                            className="ml-1 hover:opacity-70 transition-opacity shrink-0"
                                            title="Dosyayı kaldır"
                                        >
                                            <X size={11} />
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {/* ─────────────────────────────────────────────────── */}

                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onScroll={handleTextareaScroll}
                            onDoubleClick={() => setIsExpanded(!isExpanded)}
                            data-scrolling={isTextareaScrolling}
                            placeholder={droppedFile ? `"${droppedFile.name}" hakkında bir soru sor...` : "Asistana bir soru sor..."}
                            className={`w-full bg-transparent text-[15px] text-stone-800 px-4 pb-2 resize-none border-none outline-none focus:ring-0 placeholder:text-stone-400/80 leading-relaxed transition-all duration-300
                [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-stone-200 data-[scrolling=true]:[&::-webkit-scrollbar-thumb]:bg-stone-300 [&::-webkit-scrollbar-thumb]:rounded-full
                ${isExpanded ? 'overflow-y-auto' : 'overflow-hidden'}
                ${droppedFile ? 'pt-2' : 'pt-6'}`}
                            style={{ fontFamily: 'Söhne, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, Cantarell, "Noto Sans", sans-serif, "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}
                        ></textarea>

                        <div className="flex items-center justify-between px-3 pb-2 mt-1 shrink-0">
                            <div className="flex items-center gap-1 relative">
                                <button className="p-2 text-stone-400 hover:text-[#378ADD] focus:outline-none transition-colors" title="Ayarlar"><Settings2 size={16} /></button>
                                {isSideOpen && (
                                    <>
                                        <button
                                            onClick={() => setIsCommandsOpen(!isCommandsOpen)}
                                            className={`p-2 transition-colors focus:outline-none ${isCommandsOpen ? 'text-[#378ADD]' : 'text-stone-400 hover:text-[#378ADD]'}`}
                                            title="Hızlı Komutlar"
                                        >
                                            <Sparkles size={16} />
                                        </button>

                                        <AnimatePresence>
                                            {isCommandsOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    className="absolute bottom-full left-8 mb-2 bg-white border border-stone-200 rounded-lg p-1 flex flex-col gap-0.5 z-50 shadow-[0_8px_30px_rgb(0,0,0,0.06)] min-w-[140px]"
                                                >
                                                    <button
                                                        onClick={() => {
                                                            setInputValue(prev => prev ? prev + ' Bu dökümanın özetini çıkart.' : 'Lütfen bu dökümanın özetini çıkart.');
                                                            setIsCommandsOpen(false);
                                                        }}
                                                        className="px-3 py-2 text-[11px] font-semibold text-stone-600 hover:text-[#378ADD] hover:bg-stone-50 flex items-center gap-2 rounded-md transition-colors text-left"
                                                    >
                                                        <FileSearch size={14} /> PDF Özetle
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setInputValue(prev => prev ? prev + ' Bu dökümanın BPMN analizini yap.' : 'Lütfen bu dökümanın BPMN analizini yap.');
                                                            setIsCommandsOpen(false);
                                                        }}
                                                        className="px-3 py-2 text-[11px] font-semibold text-stone-600 hover:text-[#378ADD] hover:bg-stone-50 flex items-center gap-2 rounded-md transition-colors text-left"
                                                    >
                                                        <Zap size={14} /> BPMN Analizi
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </>
                                )}
                            </div>

                            <div className="flex items-center gap-1.5">
                                {/* MODEL SEÇİCİ */}
                                {isSideOpen && (
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                                            className="flex items-center gap-1.5 text-[11px] font-bold text-stone-400 hover:text-stone-600 transition-colors focus:outline-none px-2"
                                            title="Aktif Modeller"
                                        >
                                            <Cpu size={13} className="text-stone-300" />
                                            <span>{activeModel.length > 20 ? activeModel.substring(0, 18) + '...' : activeModel}</span>
                                            <ChevronDown size={11} className={`text-stone-400 transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {isModelMenuOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 6 }}
                                                    className="absolute bottom-full right-0 mb-2 bg-white border border-stone-200 rounded-lg z-50 shadow-[0_8px_24px_rgba(0,0,0,0.08)] min-w-[160px] max-w-[210px] py-1.5 overflow-hidden"
                                                >
                                                    {availableModels.map(m => {
                                                        const isActive = activeModel === m;
                                                        return (
                                                            <button
                                                                key={m}
                                                                onClick={() => { setActiveModel(m); setIsModelMenuOpen(false); }}
                                                                title={m}
                                                                className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-left transition-colors truncate
                                                                    ${isActive
                                                                        ? 'text-[#378ADD] bg-[#E6F1FB]/60'
                                                                        : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                                                                    }`}
                                                            >
                                                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-[#378ADD]' : 'bg-stone-300'}`} />
                                                                {m}
                                                            </button>
                                                        );
                                                    })}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {/* SADELEŞTİRİLMİŞ GÖNDER BUTONU */}
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!inputValue.trim() || isTyping}
                                    className={`flex items-center justify-center w-8 h-8 rounded-md transition-all focus:outline-none active:scale-[0.93] ${inputValue.trim() || isTyping ? 'bg-[#378ADD] hover:bg-[#0C447C] text-white shadow-sm' : 'bg-stone-100 text-stone-300'}`}
                                    title="Gönder"
                                >
                                    {isTyping ? <Send size={15} className="opacity-50 animate-pulse ml-0.5 mt-0.5" /> : <Send size={15} className="ml-0.5 mt-0.5" />}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChatInputArea;
