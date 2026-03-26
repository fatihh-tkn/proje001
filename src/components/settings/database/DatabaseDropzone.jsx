import React from 'react';
import { Upload, Zap, Activity, CheckCircle2, ShieldCheck, X, Network } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DatabaseDropzone = ({
    phase,
    useVision,
    setUseVision,
    dragOver,
    setDragOver,
    dragActive,
    handleDrop,
    handleFileInput,
    dropRef,
    progress,
    stagedFile,
    handleCancel,
    chunksLength,
    approvedCount
}) => {
    return (
        <div className="w-[42%] shrink-0 border-r border-slate-200 flex flex-col bg-slate-50/30 relative">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 shrink-0 bg-white/50 backdrop-blur-md z-10">
                <Network size={14} className="text-slate-400" />
                <span className="text-[11px] font-bold text-slate-500 tracking-widest uppercase">Dosya Yükleme</span>
                {(phase === 'staged' || phase === 'saving') && (
                    <button onClick={handleCancel} className="ml-auto text-slate-400 hover:text-[#A01B1B] transition-colors p-1 bg-white hover:bg-red-50 rounded-md border border-slate-200 hover:border-red-200">
                        <X size={14} />
                    </button>
                )}
            </div>

            <div className="flex-1 p-5 flex items-center justify-center relative">
                <AnimatePresence mode="wait">
                    {/* ── idle: drop zone ── */}
                    {phase === 'idle' && (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full h-full flex flex-col gap-5 px-2 py-2"
                        >
                            {/* ── KUTU 1: AI YOLU GÖRSEL OKUMA (B YOLU) ── */}
                            <div className={`relative overflow-hidden flex items-center justify-between px-4 py-3.5 border rounded-md transition-all duration-300 cursor-pointer
                                ${useVision
                                    ? 'bg-[#A01B1B]/[0.02] border-[#A01B1B]/40 shadow-[0_2px_15px_-3px_rgba(160,27,27,0.1)]'
                                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                }`}
                                onClick={() => setUseVision(!useVision)}
                            >
                                <div className="flex items-center">
                                    <div className={`p-2 rounded border transition-all duration-300
                                        ${useVision
                                            ? 'bg-[#A01B1B] border-[#8a1717] text-white shadow-[0_2px_8px_rgba(160,27,27,0.3)]'
                                            : 'bg-slate-50 border-slate-200 text-slate-400'
                                        }`}
                                    >
                                        <Zap size={16} fill={useVision ? 'currentColor' : 'none'} className={useVision ? 'animate-pulse' : ''} />
                                    </div>
                                    <div className="flex flex-col ml-3">
                                        <p className={`text-[12px] font-bold tracking-wide uppercase transition-colors duration-300 ${useVision ? 'text-[#A01B1B]' : 'text-slate-700'}`}>
                                            Derin AI Görsel Okuma
                                        </p>
                                        <p className={`text-[10px] font-medium mt-0.5 tracking-wide transition-colors duration-300 ${useVision ? 'text-[#A01B1B]/70' : 'text-slate-400'}`}>
                                            KOMPLEKS GÖRSEL ÇÖZÜMLEME
                                        </p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer pointer-events-none">
                                    <input type="checkbox" className="sr-only peer" checked={useVision} readOnly />
                                    <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-md peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-[4px] after:h-[18px] after:w-[18px] after:shadow-sm after:transition-all peer-checked:bg-[#A01B1B]"></div>
                                </label>
                            </div>

                            {/* ── KUTU 2: DROPZONE ── */}
                            <motion.label
                                onDragEnter={() => setDragOver(true)}
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={(e) => {
                                    if (!dropRef.current?.contains(e.relatedTarget)) setDragOver(false);
                                }}
                                onDrop={handleDrop}
                                ref={dropRef}
                                className={`relative w-full h-full flex flex-col items-center justify-center rounded-md border border-dashed cursor-pointer transition-all duration-300 overflow-hidden group select-none shadow-[inset_0_2px_15px_rgba(0,0,0,0.01)]
                                ${dragOver || dragActive
                                        ? 'border-[#A01B1B] bg-red-50/20 shadow-[0_4px_25px_-5px_rgba(160,27,27,0.15)] scale-[1.01]'
                                        : 'border-slate-300/80 hover:border-[#A01B1B]/50 bg-white/50 hover:bg-white'
                                    }`}
                            >
                                <input type="file" className="hidden" onChange={handleFileInput} accept=".pdf,.txt,.docx,.bpmn,.xlsx" />

                                <div className="relative flex items-center justify-center mb-6 mt-2 w-20 h-20">
                                    <div className={`absolute inset-0 rounded-md border transition-all duration-700 pointer-events-none ${dragOver || dragActive ? 'border-[#A01B1B]/40 scale-[1.8] animate-ping opacity-0' : 'border-slate-200 scale-100 group-hover:border-[#A01B1B]/20 group-hover:scale-[1.4] opacity-50'}`} />
                                    <div className={`absolute inset-0 rounded-md border transition-all duration-500 delay-75 pointer-events-none ${dragOver || dragActive ? 'border-[#A01B1B]/60 scale-[1.4]' : 'border-slate-200 scale-100 group-hover:border-[#A01B1B]/30 group-hover:scale-110 opacity-70'}`} />

                                    <motion.div
                                        animate={{ y: dragOver || dragActive ? -4 : 0 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                        className={`relative z-10 p-4 rounded-md transition-all duration-300 border flex items-center justify-center
                                        ${dragOver || dragActive
                                                ? 'bg-[#A01B1B] text-white border-[#A01B1B] shadow-[0_4px_15px_rgba(160,27,27,0.3)]'
                                                : 'bg-white text-slate-500 border-slate-200 group-hover:text-[#A01B1B] group-hover:border-[#A01B1B]/40 group-hover:bg-red-50/50 shadow-sm'
                                            }`}
                                    >
                                        <Network size={28} strokeWidth={1.5} className={dragOver || dragActive ? 'animate-pulse' : ''} />
                                    </motion.div>
                                </div>

                                <p className={`text-[13px] font-bold z-10 transition-colors duration-300 tracking-widest uppercase ${dragOver || dragActive ? 'text-[#A01B1B]' : 'text-slate-600 group-hover:text-slate-800'}`}>
                                    {dragOver || dragActive ? 'Dosyayı Bırakın' : 'Dosya Sürükleyin'}
                                </p>
                                <div className="flex gap-1.5 mt-3 z-10">
                                    {['PDF', 'DOCX', 'TXT', 'BPMN', 'XLSX'].map(ext => (
                                        <span key={ext} className="text-[9px] font-bold text-slate-400 px-2 py-1 rounded-sm border border-slate-200/60 bg-white/80 group-hover:border-slate-300 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                            {ext}
                                        </span>
                                    ))}
                                </div>
                            </motion.label>
                        </motion.div>
                    )}

                    {/* ── analyzing: AI Graph Network Effect ── */}
                    {phase === 'analyzing' && (
                        <motion.div
                            key="analyzing"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="w-full h-full flex flex-col items-center justify-center gap-6 px-8"
                        >
                            <div className="relative w-24 h-24 flex items-center justify-center">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 8, ease: "linear", repeat: Infinity }}
                                    className="absolute inset-0 border-[1px] border-dashed border-slate-300 rounded-full"
                                />
                                <motion.div
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 12, ease: "linear", repeat: Infinity }}
                                    className="absolute inset-2 border-[1px] border-[#A01B1B]/30 rounded-full"
                                />
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="w-12 h-12 bg-gradient-to-br from-[#A01B1B] to-red-600 rounded-full shadow-[0_0_20px_rgba(160,27,27,0.4)] flex items-center justify-center text-white"
                                >
                                    <Network size={20} />
                                </motion.div>
                            </div>
                            <div className="w-full text-center">
                                <p className="text-[13px] font-bold text-slate-800 mb-1 truncate">{stagedFile?.name}</p>
                                <motion.p
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    className="text-[11px] font-medium text-[#A01B1B] mb-5 tracking-wide"
                                >
                                    DOSYA İŞLENİYOR...
                                </motion.p>
                                <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden border border-slate-200/50">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-[#A01B1B] to-rose-400 rounded-full"
                                        style={{ width: `${progress}%` }}
                                        layout
                                    />
                                </div>
                                <div className="flex justify-between items-center mt-2 px-1">
                                    <span className="text-[10px] text-slate-400 font-mono">CHUNK_EXTRACT</span>
                                    <span className="text-[10px] text-slate-500 font-bold">{Math.round(progress)}%</span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── staged / saving ── */}
                    {(phase === 'staged' || phase === 'saving') && stagedFile && (
                        <motion.div
                            key="staged"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full h-full flex flex-col items-center justify-center gap-4 px-6 text-center"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring" }}
                                className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-sm"
                            >
                                <CheckCircle2 size={32} className="text-emerald-500" />
                            </motion.div>
                            <div>
                                <p className="text-[14px] font-bold text-slate-800 truncate max-w-full mb-1">{stagedFile.name}</p>
                                <p className="text-[11px] text-slate-500 font-medium">Parçalar Başarıyla Çıkarıldı</p>
                            </div>
                            <div className="px-5 py-3 bg-white border border-slate-200 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] w-full text-left">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[11px] text-slate-500">Çıkarılan Parça</span>
                                    <span className="text-[11px] font-bold text-slate-700">{chunksLength}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] text-slate-500">Onaylanan Parça</span>
                                    <span className="text-[11px] font-bold text-[#A01B1B]">{approvedCount}</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default DatabaseDropzone;
