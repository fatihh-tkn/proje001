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
                <span className="text-[11px] font-bold text-slate-500 tracking-widest uppercase">Veri Madenciliği Merkezi</span>
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
                            className="w-full h-full flex flex-col gap-4"
                        >
                            <div className="flex items-center justify-between px-4 py-3 bg-white/70 backdrop-blur-sm border border-slate-200/80 rounded-2xl shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100/50 rounded-xl">
                                        <Zap size={14} className="text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-bold text-slate-700">Derin AI Görsel Okuma (B Yolu)</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">Gemini 1.5 Pro ile grafik ve akışları çözümler</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={useVision} onChange={e => setUseVision(e.target.checked)} />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-[#A01B1B]"></div>
                                </label>
                            </div>

                            <motion.label
                                onDragEnter={() => setDragOver(true)}
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={(e) => {
                                    if (!dropRef.current?.contains(e.relatedTarget)) setDragOver(false);
                                }}
                                onDrop={handleDrop}
                                ref={dropRef}
                                animate={{
                                    scale: dragOver || dragActive ? 1.02 : 1,
                                    boxShadow: dragOver || dragActive ? '0 0 25px rgba(160,27,27,0.15)' : 'none'
                                }}
                                className={`relative w-full h-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed cursor-pointer transition-colors overflow-hidden group select-none backdrop-blur-sm
                                ${dragOver || dragActive
                                        ? 'border-[#A01B1B] bg-red-50/40'
                                        : 'border-slate-300 hover:border-slate-400 bg-white/50 hover:bg-white/80'
                                    }`}
                            >
                                <input type="file" className="hidden" onChange={handleFileInput} accept=".pdf,.txt,.docx,.bpmn,.xlsx" />

                                <motion.div
                                    animate={{
                                        y: dragOver || dragActive ? -5 : 0,
                                        scale: dragOver || dragActive ? 1.1 : 1
                                    }}
                                    className={`p-5 rounded-2xl mb-4 transition-colors relative z-10
                                    ${dragOver || dragActive
                                            ? 'bg-gradient-to-br from-red-50 to-rose-100 border border-red-200 text-[#A01B1B]'
                                            : 'bg-white border border-slate-200 text-slate-400 group-hover:text-slate-600 group-hover:border-slate-300 shadow-sm'
                                        }`}
                                >
                                    <Network size={32} />
                                </motion.div>

                                <p className={`text-[14px] font-bold z-10 transition-colors ${dragOver || dragActive ? 'text-[#A01B1B]' : 'text-slate-600 group-hover:text-slate-800'}`}>
                                    {dragOver || dragActive ? 'Veri Ağına Besle' : 'Dosya sürükleyin veya seçin'}
                                </p>
                                <p className="text-[11px] font-medium text-slate-400 mt-2 z-10 bg-slate-100/50 px-3 py-1 rounded-full border border-slate-200">
                                    PDF, DOCX, TXT, BPMN, XLSX
                                </p>

                                {/* pulse ring - drag active */}
                                {(dragOver || dragActive) && (
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: [0.2, 0.5, 0] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                        className="absolute inset-0 rounded-2xl border-2 border-[#A01B1B]/40 pointer-events-none"
                                    />
                                )}
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
                                    BİLGİ AĞI ÇÖZÜMLENİYOR...
                                </motion.p>
                                <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden border border-slate-200/50">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-[#A01B1B] to-rose-400 rounded-full"
                                        style={{ width: `${progress}%` }}
                                        layout
                                    />
                                </div>
                                <div className="flex justify-between items-center mt-2 px-1">
                                    <span className="text-[10px] text-slate-400 font-mono">NODE_EXTRACT</span>
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
                                <p className="text-[11px] text-slate-500 font-medium">Ağ Düğümleri Başarıyla Çıkarıldı</p>
                            </div>
                            <div className="px-5 py-3 bg-white border border-slate-200 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] w-full text-left">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[11px] text-slate-500">Çıkarılan Düğüm</span>
                                    <span className="text-[11px] font-bold text-slate-700">{chunksLength}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] text-slate-500">Seçili Önaylı Dügüm</span>
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
