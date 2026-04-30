import React from 'react';
import { Plus, FileText, Database, Copy, Pencil, Check, Image, Network, X, CornerDownRight, Sparkles } from 'lucide-react';
import AILogo from '../../assets/logo-kapali.png';
import { useErrorStore } from '../../store/errorStore';
import ErrorSolutionCard, { parseErrorSolution } from './ErrorSolutionCard';
import ZliReportSuggestionCard, { parseZliReportQuery } from './ZliReportSuggestionCard';
import ThinkingProcessPanel from './ThinkingProcessPanel';

const ChunkPreviewModal = ({ source, onClose }) => {
    const isBpmn = (source.chunk_type || '').startsWith('bpmn') || (source.file || '').toLowerCase().endsWith('.bpmn');
    const hasImage = !isBpmn && source.image_path;

    const imgSrc = hasImage
        ? `/api/files/image/highlight?image_path=${encodeURIComponent(source.image_path)}&bbox=${encodeURIComponent(source.bbox || '')}&slide_w=${source.slide_w || 0}&slide_h=${source.slide_h || 0}`
        : null;

    const fileName = (source.file || '').match(/[^/\\]+$/)?.[0] || source.file || '';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden border border-stone-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                        {isBpmn
                            ? <Network size={15} className="text-[#DC2626]" />
                            : <Image size={15} className="text-[#DC2626]" />
                        }
                        <span className="text-[13px] font-semibold text-stone-700 truncate max-w-xs">{fileName}</span>
                        {source.page && (
                            <span className="text-[11px] text-stone-400 bg-stone-100 rounded px-1.5 py-0.5">sayfa {source.page}</span>
                        )}
                        {source.chunk_type && (
                            <span className="text-[10px] text-stone-400 bg-stone-100 rounded px-1.5 py-0.5 font-mono">{source.chunk_type}</span>
                        )}
                    </div>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Image preview */}
                {hasImage && (
                    <div className="bg-stone-900 flex items-center justify-center max-h-80 overflow-hidden">
                        <img
                            src={imgSrc}
                            alt="Chunk önizleme"
                            className="max-h-80 max-w-full object-contain"
                            onError={e => { e.target.style.display = 'none'; }}
                        />
                    </div>
                )}

                {/* BPMN info or metadata */}
                <div className="px-4 py-3 space-y-1.5 text-[12px]">
                    {isBpmn && source.element_name && (
                        <div className="flex items-center gap-2">
                            <Network size={11} className="text-stone-400 shrink-0" />
                            <span className="text-stone-500">Eleman:</span>
                            <span className="text-stone-700 font-medium">{source.element_name}</span>
                        </div>
                    )}
                    {isBpmn && source.element_id && (
                        <div className="flex items-center gap-2">
                            <span className="text-stone-400 font-mono text-[10px]">ID:</span>
                            <span className="text-stone-500 font-mono text-[10px]">{source.element_id}</span>
                        </div>
                    )}
                    {source.bbox && (
                        <div className="flex items-center gap-2">
                            <span className="text-stone-400 text-[10px]">bbox:</span>
                            <span className="text-stone-500 font-mono text-[10px]">{source.bbox}</span>
                        </div>
                    )}
                    {source.location_marker && (
                        <div className="flex items-center gap-2">
                            <span className="text-stone-400 text-[10px]">konum:</span>
                            <span className="text-stone-500 text-[10px]">{source.location_marker}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StreamingCursor = () => (
    <span
        className="inline-block w-[2px] h-[1em] bg-stone-400 ml-0.5 align-middle"
        style={{ animation: 'blink 0.8s step-end infinite' }}
    />
);

if (typeof document !== 'undefined' && !document.getElementById('blink-style')) {
    const s = document.createElement('style');
    s.id = 'blink-style';
    s.textContent = `
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes ai-logo-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ai-logo-soft-pulse {
            0%, 100% { opacity: 0.85; transform: scale(1); }
            50%      { opacity: 1;    transform: scale(1.04); }
        }
        .ai-logo-spinner { animation: ai-logo-spin 1.2s linear infinite; transform-origin: 50% 50%; }
        .ai-logo-pulse   { animation: ai-logo-soft-pulse 1.6s ease-in-out infinite; }
    `;
    document.head.appendChild(s);
}

const MessageList = ({
    messages, isSideOpen, handleChatScroll, isChatScrolling, messagesEndRef, handleNewChat,
    onEditAndResend, onSendFollowup, currentUser, currentSessionId,
}) => {
    const [copiedId, setCopiedId] = React.useState(null);
    const [editingId, setEditingId] = React.useState(null);
    const [editValue, setEditValue] = React.useState('');
    const [previewSource, setPreviewSource] = React.useState(null);
    const editRef = React.useRef(null);
    const addToast = useErrorStore((s) => s.addToast);

    const lastUserMsgId = React.useMemo(
        () => [...messages].reverse().find(m => m.sender !== 'ai')?.id,
        [messages]
    );

    React.useEffect(() => {
        if (editingId && editRef.current) {
            const el = editRef.current;
            el.focus();
            el.setSelectionRange(el.value.length, el.value.length);
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
        }
    }, [editingId]);

    const handleCopy = (e, text, id) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        addToast({ type: 'success', message: 'Mesaj panoya kopyalandı.' });
        setTimeout(() => setCopiedId(null), 2000);
    };

    const startEdit = (e, msg) => {
        e.stopPropagation();
        setEditingId(msg.id);
        setEditValue(msg.text);
    };

    const commitEdit = () => {
        if (editValue.trim() && onEditAndResend) onEditAndResend(editingId, editValue.trim());
        setEditingId(null);
    };

    const cancelEdit = () => setEditingId(null);

    const handleEditKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); }
        if (e.key === 'Escape') cancelEdit();
    };

    return (
        <>
            {previewSource && (
                <ChunkPreviewModal source={previewSource} onClose={() => setPreviewSource(null)} />
            )}
            <div className="flex-1 relative overflow-hidden transition-all duration-500">
                <div
                    onScroll={handleChatScroll}
                    data-scrolling={isChatScrolling}
                    className={`absolute inset-0 overflow-y-auto overflow-x-hidden scroll-smooth transition-opacity duration-300
          [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-stone-300 hover:[&::-webkit-scrollbar-thumb]:bg-stone-400 [&::-webkit-scrollbar-thumb]:rounded-full
          ${isSideOpen ? 'py-5 pr-5 pl-8 opacity-100 z-10' : 'p-0 opacity-0 pointer-events-none z-0'}`}
                >
                    <div className="flex flex-col gap-4">
                        {messages.map((msg, idx) => {
                            const isAI = msg.sender === 'ai';
                            const isLastInList = idx === messages.length - 1;
                            return (
                                <div key={msg.id} className={`flex w-full ${isAI ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`flex flex-col gap-1.5 max-w-[95%] ${isAI ? 'items-start' : 'items-end'}`}>

                                        {isAI && (
                                            <div className="flex flex-col no-toggle pl-1.5 mb-0.5">
                                                <div className="flex items-start gap-2">
                                                    <div className="w-9 h-9 flex items-center justify-center shrink-0">
                                                        <img
                                                            src={AILogo} alt="AI"
                                                            className={`w-7 h-7 object-contain mix-blend-multiply transition-opacity duration-300
                                                                    ${msg.isStreaming ? 'opacity-95 ai-logo-pulse' : 'opacity-80'}`}
                                                        />
                                                    </div>

                                                    {/* Düşünme süreci paneli — logo hizasında ama genişlediğinde logoyu aşağı çekmez */}
                                                    <div className="mt-1">
                                                        {!msg.isStreaming && msg.completedAt && (
                                                            <ThinkingProcessPanel message={msg} />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-col gap-1 no-toggle min-w-0 group relative">
                                            {!isAI && msg.fileContext && (
                                                <div className="flex justify-end">
                                                    <span className="inline-flex items-center gap-1 text-[11px] bg-white/20 backdrop-blur-sm border border-white/30 text-stone-700 shadow-sm rounded-lg px-2.5 py-1 mb-1">
                                                        <FileText size={12} className="text-[#DC2626]" />
                                                        {msg.fileContext.name}
                                                    </span>
                                                </div>
                                            )}

                                            <div className={`p-3 text-[15px] transition-all overflow-hidden [overflow-wrap:anywhere] min-w-[5rem] ${!isAI
                                                ? 'text-stone-800 border border-stone-800/80 rounded-2xl rounded-tr-sm bg-transparent shadow-sm'
                                                : msg.isError
                                                    ? 'text-[#991B1B] bg-transparent'
                                                    : 'text-stone-800 bg-transparent'
                                                }`}
                                                style={{ fontFamily: 'Söhne, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, Cantarell, "Noto Sans", sans-serif, "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}
                                            >
                                                {editingId === msg.id ? (
                                                    <div className="flex flex-col gap-2">
                                                        <textarea
                                                            ref={editRef}
                                                            value={editValue}
                                                            onChange={(e) => {
                                                                setEditValue(e.target.value);
                                                                e.target.style.height = 'auto';
                                                                e.target.style.height = e.target.scrollHeight + 'px';
                                                            }}
                                                            onKeyDown={handleEditKeyDown}
                                                            className="w-full resize-none bg-transparent outline-none text-stone-800 leading-relaxed text-[15px] min-h-[1.5em] overflow-hidden"
                                                            style={{ fontFamily: 'inherit' }}
                                                            rows={1}
                                                        />
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={cancelEdit}
                                                                className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-stone-400 hover:text-stone-600 transition-colors rounded"
                                                            >
                                                                İptal
                                                            </button>
                                                            <button
                                                                onClick={commitEdit}
                                                                disabled={editValue.trim() === msg.text.trim()}
                                                                className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded transition-colors disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed bg-[#DC2626] text-white hover:bg-[#B91C1C]"
                                                            >
                                                                Güncelle
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {isAI && msg.isStreaming && msg.text === '' ? (
                                                            <span className="text-[10px] text-stone-400 tracking-widest animate-pulse">
                                                                Yanıt oluşturuluyor...
                                                            </span>
                                                        ) : (() => {
                                                            if (isAI && !msg.isStreaming) {
                                                                const zliQuery = parseZliReportQuery(msg.text);
                                                                if (zliQuery) {
                                                                    return <ZliReportSuggestionCard data={zliQuery} userId={currentUser?.id} />;
                                                                }
                                                                const errorSolution = parseErrorSolution(msg.text);
                                                                if (errorSolution) {
                                                                    return <ErrorSolutionCard data={errorSolution} userId={currentUser?.id} sessionId={currentSessionId} />;
                                                                }
                                                            }
                                                            return (
                                                                <p className="leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                                                                    {msg.text}
                                                                    {isAI && msg.isStreaming && msg.text !== '' && <StreamingCursor />}
                                                                </p>
                                                            );
                                                        })()}

                                                        {!msg.isStreaming && (
                                                            <div className={`flex items-center mt-1.5 transition-all ${isAI ? 'justify-between' : 'justify-between flex-row-reverse'}`}>
                                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                                                    <button onClick={(e) => handleCopy(e, msg.text, msg.id)} className="text-stone-400 hover:text-[#DC2626] transition-colors focus:outline-none" title="Kopyala">
                                                                        {copiedId === msg.id ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                                                                    </button>
                                                                    {!isAI && msg.id === lastUserMsgId && (
                                                                        <button onClick={(e) => startEdit(e, msg)} className="text-stone-400 hover:text-[#DC2626] transition-colors focus:outline-none" title="Düzenle">
                                                                            <Pencil size={12} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <span className="text-[10px] tracking-wide font-medium text-stone-400">
                                                                    {msg.time}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            {isAI && !msg.isStreaming && isLastInList && Array.isArray(msg.followups) && msg.followups.length > 0 && (
                                                <div className="mt-2.5 flex flex-col gap-1.5 max-w-[640px] no-toggle">
                                                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-stone-400 font-semibold pl-1">
                                                        <Sparkles size={10} className="text-[#DC2626]/70" />
                                                        Önerilen Sorular
                                                    </div>
                                                    {msg.followups.map((q, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (onSendFollowup) onSendFollowup(q);
                                                            }}
                                                            className="group/fu w-full text-left bg-white border border-stone-200 hover:border-[#DC2626]/40 hover:bg-[#FEF2F2]/40 rounded-xl px-3 py-2 text-[13px] text-stone-700 hover:text-stone-900 transition-all shadow-sm flex items-start gap-2"
                                                            title="Bu soruyla devam et"
                                                        >
                                                            <CornerDownRight size={13} className="shrink-0 mt-0.5 text-stone-300 group-hover/fu:text-[#DC2626] transition-colors" />
                                                            <span className="flex-1 leading-snug [overflow-wrap:anywhere]">{q}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {(() => {
                                                if (!isAI || msg.isStreaming || !msg.ragUsed) return null;
                                                const allSources = (msg.ragSources || []).filter(s => s && typeof s === 'object');
                                                if (allSources.length === 0) return null;

                                                // Alaka filtresi: score varsa skor sırasına diz, en üstteki referansa
                                                // göre %50 altındakileri ele. Yoksa (legacy) ilk birkaç tanesi.
                                                const withScore = allSources.filter(s => typeof s.score === 'number');
                                                let relevant;
                                                if (withScore.length > 0) {
                                                    const sorted = [...withScore].sort((a, b) => (b.score || 0) - (a.score || 0));
                                                    const top = sorted[0]?.score || 0;
                                                    const cutoff = Math.max(top * 0.5, 0.05); // dinamik eşik
                                                    relevant = sorted.filter(s => (s.score || 0) >= cutoff).slice(0, 4);
                                                } else {
                                                    relevant = allSources.slice(0, 3);
                                                }
                                                if (relevant.length === 0) return null;

                                                return (
                                                    <div className="flex flex-wrap items-center gap-1 mt-1">
                                                        {relevant.map((s, i) => {
                                                            const isBpmn = (s.chunk_type || '').startsWith('bpmn') || (s.file || '').toLowerCase().endsWith('.bpmn');
                                                            const hasVisual = isBpmn || !!s.image_path;
                                                            const fname = (s.file || '').match(/[^/\\]+$/)?.[0] || s.file || '';
                                                            return (
                                                                <button
                                                                    key={i}
                                                                    onClick={() => hasVisual && setPreviewSource(s)}
                                                                    className={`inline-flex items-center gap-1 text-[10px] rounded-md px-2 py-0.5 border transition-all
                                                                ${hasVisual
                                                                            ? 'bg-white border-stone-200 text-stone-500 hover:border-[#DC2626]/40 hover:text-[#DC2626] cursor-pointer shadow-sm'
                                                                            : 'bg-transparent border-stone-100 text-stone-400 cursor-default'
                                                                        }`}
                                                                    title={hasVisual ? 'Chunk önizlemesini göster' : fname}
                                                                >
                                                                    {isBpmn
                                                                        ? <Network size={9} className="shrink-0" />
                                                                        : s.image_path
                                                                            ? <Image size={9} className="shrink-0" />
                                                                            : <Database size={9} className="shrink-0" />
                                                                    }
                                                                    <span className="max-w-[120px] truncate">{fname}</span>
                                                                    {s.page && <span className="text-stone-300">s.{s.page}</span>}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* KAPALIYKEN ÇIKAN + BUTONU */}
                <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 w-full ${!isSideOpen ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 scale-90 z-0 pointer-events-none'}`}>
                    <button
                        onClick={handleNewChat}
                        className="w-10 h-10 rounded-xl bg-white border border-stone-200 hover:border-[#DC2626]/50 flex items-center justify-center text-stone-400 hover:text-[#DC2626] transition-all shadow-sm focus:outline-none group mx-auto"
                        title="Yeni Sohbet Başlat"
                    >
                        <Plus size={20} className="group-hover:scale-110 transition-transform duration-300" />
                    </button>
                </div>
            </div>
        </>
    );
};

export default MessageList;
