import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Settings2, Send, ChevronsUp, X, FileText,
    Sparkles, ChevronDown, FileSearch, Zap, Table2,
    HelpCircle, ListChecks, Upload, FolderOpen, Loader2, AlertTriangle, FileSpreadsheet, Square
} from 'lucide-react';
import FilePickerModal from './FilePickerModal';
import { useErrorStore } from '../../store/errorStore';

// ── Hızlı Aksiyonlar ────────────────────────────────────────────────────────
export const QUICK_ACTIONS = [
    { id: 'error_solve',      label: 'Hata Çözümü',       icon: AlertTriangle,  color: '#A01B1B' },
    { id: 'zli_report_query', label: "Z'li Rapor Sorgusu", icon: FileSpreadsheet, color: '#7c3aed' },
    { id: 'summarize',        label: 'PDF Özetle',        icon: FileSearch,     color: '#DC2626' },
    { id: 'bpmn_analyze',     label: 'BPMN Analizi',      icon: Zap,            color: '#0d9488' },
    { id: 'extract_tables',   label: 'Tablo Çıkar',       icon: Table2,         color: '#2563eb' },
    { id: 'gen_questions',    label: 'Soru Üret',         icon: HelpCircle,     color: '#d97706' },
    { id: 'action_items',     label: 'Aksiyon Listesi',   icon: ListChecks,     color: '#16a34a' },
];

// ── Dosya tipi ikonu ─────────────────────────────────────────────────────────
const fileTypeColor = (type) => {
    switch (type) {
        case 'pdf':  return 'bg-[#FEF2F2] text-[#991B1B] border-red-200';
        case 'bpmn': return 'bg-[#E1F5EE] text-[#085041] border-teal-200';
        case 'xls': case 'xlsx': return 'bg-[#EAF3DE] text-[#3B6D11] border-green-200';
        case 'doc': case 'docx': return 'bg-[#EFF6FF] text-[#1e40af] border-blue-200';
        default:     return 'bg-stone-100 text-stone-600 border-stone-200';
    }
};

const ChatInputArea = ({
    isSideOpen, inputValue, setInputValue, isExpanded, setIsExpanded,
    handleSendMessage, handleKeyDown, handleTextareaScroll, isTextareaScrolling, textareaRef,
    attachedFiles = [], onAddFiles, onRemoveFile, maxAttach = 5, maxBytes = 20 * 1024 * 1024,
    isTyping, onStop, activeCommand, setActiveCommand,
}) => {
    const addToast = useErrorStore(s => s.addToast);
    const fileInputRef = useRef(null);

    const [isCommandsOpen,  setIsCommandsOpen]  = React.useState(false);
    const [isModelMenuOpen, setIsModelMenuOpen] = React.useState(false);
    const [isFileMenuOpen,  setIsFileMenuOpen]  = React.useState(false);
    const [isPickerOpen,    setIsPickerOpen]    = React.useState(false);
    const [isUploading,     setIsUploading]     = React.useState(false);
    const sparklesBtnRef = useRef(null);
    const [activeModel, setActiveModel] = React.useState('Model Seçiliyor...');
    const [availableModels, setAvailableModels] = React.useState([]);

    React.useEffect(() => {
        if (!isSideOpen) {
            setIsCommandsOpen(false);
            setIsModelMenuOpen(false);
            setIsFileMenuOpen(false);
        }
    }, [isSideOpen]);

    React.useEffect(() => {
        fetch('/api/monitor/catalog')
            .then(r => r.json())
            .then(data => {
                if (data?.models?.length > 0) {
                    const aliases = JSON.parse(localStorage.getItem('model_aliases') || '{}');
                    const loaded = data.models.map(m => aliases[m.id] || m.name);
                    setAvailableModels([...new Set(loaded)]);
                    setActiveModel(loaded[0]);
                } else {
                    setAvailableModels(['Varsayılan Model']);
                    setActiveModel('Varsayılan Model');
                }
            })
            .catch(() => { setAvailableModels(['Bağlantı Hatası']); setActiveModel('Bağlantı Hatası'); });
    }, []);

    // ── Sistemden dosya yükleme ──────────────────────────────────────────────
    const handleSystemUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (!files.length) return;

        const oversized = files.filter(f => f.size > maxBytes);
        if (oversized.length) {
            addToast({ type: 'error', message: `${oversized.map(f => f.name).join(', ')} dosyası 20 MB limitini aşıyor.` });
            return;
        }

        const canAdd = maxAttach - attachedFiles.length;
        if (canAdd <= 0) {
            addToast({ type: 'error', message: `En fazla ${maxAttach} dosya ekleyebilirsiniz.` });
            return;
        }

        const toUpload = files.slice(0, canAdd);
        setIsUploading(true);
        setIsFileMenuOpen(false);

        const uploaded = [];
        for (const file of toUpload) {
            try {
                const form = new FormData();
                form.append('file', file);
                const res = await fetch('/api/archive/direct-upload', { method: 'POST', body: form });
                if (res.ok) {
                    const data = await res.json();
                    uploaded.push({
                        id: `upload_${data.id || Date.now()}`,
                        name: file.name,
                        type: file.name.split('.').pop().toLowerCase(),
                        url: data.url || `/api/archive/file/${data.id}`,
                        size: file.size,
                        source: 'upload',
                    });
                } else {
                    addToast({ type: 'error', message: `"${file.name}" yüklenemedi.` });
                }
            } catch {
                addToast({ type: 'error', message: `"${file.name}" yüklenirken hata oluştu.` });
            }
        }

        if (uploaded.length) onAddFiles(uploaded);
        setIsUploading(false);
    };

    // ── Aksiyon seçimi ───────────────────────────────────────────────────────
    const selectAction = (action) => {
        setActiveCommand(activeCommand?.id === action.id ? null : action);
        setIsCommandsOpen(false);
    };

    const ActiveIcon = activeCommand?.icon || null;

    const placeholderText = activeCommand
        ? `${activeCommand.label} için mesajını yaz...`
        : attachedFiles.length
            ? `${attachedFiles.length} dosya eklendi — soru sor...`
            : 'Asistana bir soru sor...';

    return (
        <>
            {/* Dosya Seçici Modal */}
            <AnimatePresence>
                {isPickerOpen && (
                    <FilePickerModal
                        alreadyAttached={attachedFiles}
                        onClose={() => setIsPickerOpen(false)}
                        onConfirm={(files) => {
                            onAddFiles(files);
                            setIsPickerOpen(false);
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Gizli file input */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.bpmn,.png,.jpg,.jpeg"
                className="hidden"
                onChange={handleSystemUpload}
            />

            <div className={`shrink-0 bg-transparent flex flex-col transition-all duration-300 ${isSideOpen ? 'px-2 pb-2 pt-2 gap-2' : 'px-0 pb-2 pt-2 items-center gap-3 border-transparent w-full'}`}>
                <AnimatePresence>
                    {isSideOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20, height: 0, marginTop: 0 }}
                            className="relative flex flex-col w-full bg-white/80 backdrop-blur-xl border-2 border-white/60 rounded-md focus-within:border-[#DC2626]/40 transition-all shadow-[0_4px_20px_rgb(0,0,0,0.04)] no-toggle"
                        >
                            {/* Genişlet/Daralt */}
                            <div onClick={() => setIsExpanded(!isExpanded)} className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center justify-center cursor-pointer z-30 group px-4 py-0.5 interactive">
                                <ChevronsUp size={13} className={`text-stone-300 group-hover:text-[#DC2626] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>

                            {/* ── Ekli Dosya Chip'leri ── */}
                            <AnimatePresence>
                                {attachedFiles.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="px-3 pt-5 pb-1 flex flex-wrap gap-1.5"
                                    >
                                        {attachedFiles.map(file => (
                                            <div
                                                key={file.id}
                                                className={`inline-flex items-center gap-1.5 border rounded-lg px-2 py-1 text-[11px] font-medium max-w-[160px] ${fileTypeColor(file.type)}`}
                                            >
                                                <FileText size={11} className="shrink-0" />
                                                <span className="truncate">{file.name}</span>
                                                <button onClick={() => onRemoveFile(file.id)} className="ml-0.5 hover:opacity-60 transition-opacity shrink-0">
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                        {attachedFiles.length < maxAttach && (
                                            <span className="text-[10px] text-stone-400 self-center">
                                                {maxAttach - attachedFiles.length} daha eklenebilir
                                            </span>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Textarea */}
                            <textarea
                                ref={textareaRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onScroll={handleTextareaScroll}
                                onDoubleClick={() => setIsExpanded(!isExpanded)}
                                data-scrolling={isTextareaScrolling}
                                placeholder={placeholderText}
                                className={`w-full bg-transparent text-[15px] text-stone-800 px-4 pb-2 resize-none border-none outline-none focus:ring-0 placeholder:text-stone-400/80 leading-relaxed transition-all duration-300
                    [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-stone-200 [&::-webkit-scrollbar-thumb]:rounded-full
                    ${isExpanded ? 'overflow-y-auto' : 'overflow-hidden'}
                    ${attachedFiles.length ? 'pt-2' : 'pt-6'}`}
                                style={{ fontFamily: 'Söhne, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
                            />

                            {/* ── Alt Araç Çubuğu ── */}
                            <div className="flex items-center justify-between px-3 pb-2 mt-1 shrink-0 gap-2">

                                {/* Sol: Ayarlar + Sparkles + Aktif Komut Chip */}
                                <div className="flex items-center gap-1 relative min-w-0">

                                    {/* Ayarlar butonu — dosya ekleme dropdown'ı */}
                                    <div className="relative">
                                        <button
                                            onClick={() => { setIsFileMenuOpen(v => !v); setIsCommandsOpen(false); }}
                                            className={`p-2 transition-colors focus:outline-none shrink-0 relative ${isFileMenuOpen ? 'text-[#DC2626]' : 'text-stone-400 hover:text-[#DC2626]'}`}
                                            title="Dosya Ekle"
                                        >
                                            {isUploading
                                                ? <Loader2 size={16} className="animate-spin" />
                                                : <Settings2 size={16} />
                                            }
                                            {attachedFiles.length > 0 && (
                                                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#DC2626] text-white text-[8px] font-bold rounded-full flex items-center justify-center leading-none">
                                                    {attachedFiles.length}
                                                </span>
                                            )}
                                        </button>

                                        <AnimatePresence>
                                            {isFileMenuOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    transition={{ duration: 0.12 }}
                                                    className="absolute bottom-full left-0 mb-2 bg-white border border-stone-200 rounded-lg p-1.5 flex flex-col gap-0.5 z-50 shadow-[0_8px_30px_rgb(0,0,0,0.08)] min-w-[180px]"
                                                >
                                                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest px-2 pt-1 pb-0.5">Dosya Ekle</p>

                                                    <button
                                                        onClick={() => {
                                                            if (attachedFiles.length >= maxAttach) {
                                                                addToast({ type: 'error', message: `En fazla ${maxAttach} dosya ekleyebilirsiniz.` });
                                                                setIsFileMenuOpen(false);
                                                                return;
                                                            }
                                                            fileInputRef.current?.click();
                                                            setIsFileMenuOpen(false);
                                                        }}
                                                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[11px] font-semibold text-stone-600 hover:text-[#DC2626] hover:bg-stone-50 transition-colors text-left"
                                                    >
                                                        <Upload size={13} className="text-stone-400 shrink-0" />
                                                        <div>
                                                            <div>Sistemden Yükle</div>
                                                            <div className="text-[9px] font-normal text-stone-400">Maks. 20 MB</div>
                                                        </div>
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            if (attachedFiles.length >= maxAttach) {
                                                                addToast({ type: 'error', message: `En fazla ${maxAttach} dosya ekleyebilirsiniz.` });
                                                                setIsFileMenuOpen(false);
                                                                return;
                                                            }
                                                            setIsPickerOpen(true);
                                                            setIsFileMenuOpen(false);
                                                        }}
                                                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[11px] font-semibold text-stone-600 hover:text-[#DC2626] hover:bg-stone-50 transition-colors text-left"
                                                    >
                                                        <FolderOpen size={13} className="text-stone-400 shrink-0" />
                                                        <div>
                                                            <div>Dosyalarımdan Seç</div>
                                                            <div className="text-[9px] font-normal text-stone-400">En fazla {maxAttach} dosya</div>
                                                        </div>
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Sparkles — hızlı aksiyonlar */}
                                    <button
                                        ref={sparklesBtnRef}
                                        onClick={() => { setIsCommandsOpen(v => !v); setIsFileMenuOpen(false); }}
                                        className={`p-2 transition-colors focus:outline-none shrink-0 ${isCommandsOpen ? 'text-[#DC2626]' : 'text-stone-400 hover:text-[#DC2626]'}`}
                                        title="Hızlı Aksiyonlar"
                                    >
                                        <Sparkles size={16} />
                                    </button>

                                    {/* Seçili komut chip'i */}
                                    <AnimatePresence>
                                        {activeCommand && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.85, x: -6 }}
                                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                                exit={{ opacity: 0, scale: 0.85, x: -6 }}
                                                transition={{ duration: 0.15 }}
                                                className="flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 border select-none"
                                                style={{
                                                    color: activeCommand.color,
                                                    backgroundColor: activeCommand.color + '18',
                                                    borderColor: activeCommand.color + '40',
                                                }}
                                            >
                                                <ActiveIcon size={10} />
                                                <span className="truncate max-w-[80px]">{activeCommand.label}</span>
                                                <button onClick={() => setActiveCommand(null)} className="ml-0.5 hover:opacity-60 shrink-0">
                                                    <X size={9} />
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Hızlı Aksiyon Popup — body altına portal */}
                                    {isCommandsOpen && sparklesBtnRef.current && createPortal(
                                        <AnimatePresence>
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                transition={{ duration: 0.12 }}
                                                style={{
                                                    position: 'fixed',
                                                    left: sparklesBtnRef.current.getBoundingClientRect().left,
                                                    bottom: window.innerHeight - sparklesBtnRef.current.getBoundingClientRect().top + 8,
                                                    transformOrigin: 'bottom left',
                                                    zIndex: 9999,
                                                }}
                                                className="bg-white border border-stone-200 rounded-lg p-1.5 flex flex-col gap-0.5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] min-w-[200px]"
                                            >
                                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest px-2 pt-1 pb-0.5">Hızlı Aksiyon</p>
                                                {QUICK_ACTIONS.map(action => {
                                                    const Icon = action.icon;
                                                    const isActive = activeCommand?.id === action.id;
                                                    return (
                                                        <button
                                                            key={action.id}
                                                            type="button"
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); selectAction(action); }}
                                                            className="flex items-center gap-2 px-2.5 py-2 rounded-md transition-colors text-left text-[11px] font-semibold w-full"
                                                            style={{
                                                                color: isActive ? action.color : '#57534e',
                                                                backgroundColor: isActive ? action.color + '15' : 'transparent',
                                                            }}
                                                            onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = action.color + '0d'; }}
                                                            onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = isActive ? action.color + '15' : 'transparent'; }}
                                                        >
                                                            <Icon size={13} style={{ color: action.color }} />
                                                            {action.label}
                                                            {isActive && <span className="ml-auto text-[9px] opacity-60">✓</span>}
                                                        </button>
                                                    );
                                                })}
                                            </motion.div>
                                        </AnimatePresence>,
                                        document.body
                                    )}
                                </div>

                                {/* Sağ: Model + Gönder */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <div className="relative">
                                        <button
                                            onClick={() => { setIsModelMenuOpen(v => !v); setIsCommandsOpen(false); setIsFileMenuOpen(false); }}
                                            title={activeModel}
                                            className={`flex items-center gap-1.5 text-[11px] font-semibold rounded-lg px-2.5 py-1 border transition-all focus:outline-none
                                                ${isModelMenuOpen
                                                    ? 'text-[#DC2626] border-[#DC2626]/30 bg-[#FEF2F2]/70'
                                                    : 'text-stone-600 border-stone-200/80 bg-white/60 hover:text-[#DC2626] hover:border-[#DC2626]/30 hover:bg-[#FEF2F2]/50'
                                                }`}
                                        >
                                            <span className="max-w-[140px] truncate">{activeModel}</span>
                                            <ChevronDown size={11} className={`transition-transform ${isModelMenuOpen ? 'rotate-180 text-[#DC2626]' : 'text-stone-400'}`} />
                                        </button>
                                        <AnimatePresence>
                                            {isModelMenuOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                                                    transition={{ duration: 0.12 }}
                                                    style={{ transformOrigin: 'bottom right' }}
                                                    className="absolute bottom-full right-0 mb-2 bg-white border border-stone-200 rounded-lg p-1.5 flex flex-col gap-0.5 z-50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] min-w-[200px] max-w-[260px]"
                                                >
                                                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest px-2 pt-1 pb-0.5">Aktif Model</p>
                                                    {availableModels.map(m => {
                                                        const isActive = activeModel === m;
                                                        return (
                                                            <button
                                                                key={m}
                                                                onClick={() => { setActiveModel(m); setIsModelMenuOpen(false); }}
                                                                title={m}
                                                                className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-[11px] font-semibold text-left transition-colors w-full
                                                                    ${isActive
                                                                        ? 'text-[#DC2626] bg-[#DC2626]/10'
                                                                        : 'text-stone-600 hover:text-[#DC2626] hover:bg-stone-50'
                                                                    }`}
                                                            >
                                                                <span className="flex-1 truncate">{m}</span>
                                                                {isActive && <span className="text-[9px] opacity-60 shrink-0">✓</span>}
                                                            </button>
                                                        );
                                                    })}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <button
                                        onClick={isTyping ? onStop : handleSendMessage}
                                        disabled={!isTyping && !inputValue.trim()}
                                        className={`flex items-center justify-center w-8 h-8 rounded-md transition-all focus:outline-none active:scale-[0.93]
                                            ${isTyping
                                                ? 'bg-stone-900 hover:bg-black text-white shadow-sm'
                                                : inputValue.trim()
                                                    ? 'bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-sm'
                                                    : 'bg-stone-100 text-stone-300'
                                            }`}
                                        title={isTyping ? 'Yanıtı durdur' : 'Gönder'}
                                    >
                                        {isTyping
                                            ? <Square size={11} fill="currentColor" strokeWidth={0} />
                                            : <Send size={15} className="ml-0.5 mt-0.5" />
                                        }
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
};

export default ChatInputArea;
