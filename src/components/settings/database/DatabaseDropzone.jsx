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
        <div className="w-[42%] shrink-0 border-r border-stone-200 flex flex-col bg-stone-50/30 relative">
            <div className="px-5 py-3 border-b border-stone-100 flex items-center gap-2 shrink-0 bg-white/50 backdrop-blur-md z-10">
                <Network size={14} className="text-stone-400" />
                <span className="text-[11px] font-bold text-stone-500 tracking-widest uppercase">Dosya Yükleme</span>
                {(phase === 'staged' || phase === 'saving') && (
                    <button onClick={handleCancel} className="ml-auto text-stone-400 hover:text-[#991B1B] transition-colors p-1 bg-white hover:bg-[#FEF2F2] rounded-md border border-stone-200 hover:border-[#991B1B]/30">
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
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="w-full h-full flex flex-col p-6 max-w-md mx-auto justify-center"
                        >
                            <motion.label
                                onDragEnter={() => setDragOver(true)}
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={(e) => {
                                    if (!dropRef.current?.contains(e.relatedTarget)) setDragOver(false);
                                }}
                                onDrop={handleDrop}
                                ref={dropRef}
                                className={`flex-1 relative w-full flex flex-col items-center justify-center rounded-3xl border-2 border-dashed cursor-pointer transition-all duration-300 overflow-hidden group select-none bg-white
                                ${dragOver || dragActive
                                        ? 'border-[#378ADD] bg-[#E6F1FB]/30 scale-[1.02] shadow-[0_10px_40px_rgba(55,138,221,0.08)]'
                                        : 'border-stone-200 hover:border-stone-300 shadow-[0_2px_15px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-1'
                                    }`}
                            >
                                <input type="file" className="hidden" onChange={handleFileInput} accept=".pdf,.docx,.doc,.txt,.md,.pptx,.ppt,.xlsx,.xls,.csv,.mp3,.wav,.ogg,.m4a,.flac,.aac,.opus,.wma,.mp4,.avi,.mov,.mkv,.webm,.m4v,.wmv,.bpmn" />

                                <div className={`p-4 rounded-2xl mb-5 transition-all duration-300 ${dragOver || dragActive ? 'bg-[#378ADD] text-white scale-110 shadow-lg' : 'bg-stone-50 text-stone-400 group-hover:bg-stone-100 group-hover:text-stone-600'}`}>
                                    <Upload size={28} strokeWidth={2} className={dragOver || dragActive ? 'animate-bounce' : ''} />
                                </div>

                                <p className="text-[15px] font-bold text-stone-800 mb-1">
                                    {dragOver || dragActive ? 'Dosyayı Bırakın' : 'Dökümanınızı sürükleyin'}
                                </p>
                                <p className="text-[13px] text-[#378ADD] mb-8 font-medium hover:underline">
                                    Veya bilgisayarınızdan seçin
                                </p>

                                {/* Background subtle HUD corners for Vision mode focus */}
                                <AnimatePresence>
                                    {useVision && (
                                        <motion.div
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                            className="absolute inset-4 pointer-events-none"
                                        >
                                            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#378ADD]/30 rounded-tl-xl" />
                                            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#378ADD]/30 rounded-tr-xl" />
                                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#378ADD]/30 rounded-bl-xl" />
                                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#378ADD]/30 rounded-br-xl" />

                                            {/* Laser scan line active when Vision is ON and Dropzone is idle */}
                                            <motion.div
                                                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#378ADD]/50 to-transparent blur-[1px]"
                                                animate={{ top: ['0%', '100%'] }}
                                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.label>

                            {/* Vision AI Ribbon at the bottom */}
                            <div className="mt-5 shrink-0 flex items-center justify-between px-5 py-4 bg-white border border-stone-200 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-colors hover:border-stone-300 cursor-pointer" onClick={() => setUseVision(!useVision)}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg transition-colors ${useVision ? 'bg-[#378ADD]/10 text-[#378ADD]' : 'bg-stone-100 text-stone-400'}`}>
                                        <Zap size={16} fill={useVision ? 'currentColor' : 'none'} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[13px] font-bold text-stone-800 tracking-wide">Derin AI Görsel Okuma</span>
                                        <span className="text-[11px] font-medium text-stone-400">Gelişmiş analitik için açın</span>
                                    </div>
                                </div>

                                {/* SaaS Switch */}
                                <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${useVision ? 'bg-[#378ADD]' : 'bg-stone-200'}`}>
                                    <motion.div
                                        className="w-5 h-5 bg-white rounded-full shadow-sm"
                                        layout
                                        initial={false}
                                        animate={{ x: useVision ? 20 : 0 }}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── analyzing: Modern Scan Effect ── */}
                    {phase === 'analyzing' && (
                        <motion.div
                            key="analyzing"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="w-full h-full flex flex-col p-6 max-w-sm mx-auto justify-center"
                        >
                            <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex flex-col items-center text-center relative overflow-hidden group">
                                {/* İşlem İptal Edici Buton */}
                                <button onClick={handleCancel} className="absolute top-4 right-4 z-20 text-stone-400 hover:text-white bg-stone-50 hover:bg-[#991B1B] p-1.5 rounded-lg border border-stone-100 hover:border-[#991B1B] transition-all shadow-sm hover:scale-105 active:scale-95" title="İşlemi İptal Et">
                                    <X size={14} strokeWidth={3} />
                                </button>

                                {/* Scanning Laser Background (Subtle Pulsing) */}
                                <motion.div
                                    className="absolute left-0 right-0 h-40 bg-gradient-to-b from-transparent via-[#378ADD]/5 to-transparent blur-md pointer-events-none"
                                    animate={{ y: [-150, 250] }}
                                    transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                                />

                                <div className="w-16 h-16 bg-stone-50 border border-stone-100 rounded-2xl flex items-center justify-center mb-6 relative z-10 shadow-sm">
                                    <Activity size={26} className="text-[#378ADD] animate-pulse" />
                                </div>

                                <p className="text-[15px] font-bold text-stone-800 mb-1 truncate w-full px-4 relative z-10">{stagedFile?.name}</p>
                                <p className="text-[11px] font-bold text-stone-400 mb-8 relative z-10 uppercase tracking-widest">Analiz Ediliyor</p>

                                <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden relative z-10">
                                    <motion.div
                                        className="h-full bg-[#378ADD] rounded-full"
                                        style={{ width: `${progress}%` }}
                                        layout
                                    />
                                </div>
                                <div className="w-full flex justify-between items-center mt-3 relative z-10">
                                    <span className="text-[10px] font-bold text-stone-400 tracking-wider">İŞLENİYOR</span>
                                    <span className="text-[11px] font-bold text-stone-700">{Math.round(progress)}%</span>
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
                                className="p-4 bg-[#EAF3DE] border border-[#C5DFA8] rounded-2xl shadow-sm"
                            >
                                <CheckCircle2 size={32} className="text-[#3B6D11]" />
                            </motion.div>
                            <div>
                                <p className="text-[14px] font-bold text-stone-800 truncate max-w-full mb-1">{stagedFile.name}</p>
                                <p className="text-[11px] text-stone-500 font-medium">Parçalar Başarıyla Çıkarıldı</p>
                            </div>
                            <div className="px-5 py-3 bg-white border border-stone-200 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] w-full text-left">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[11px] text-stone-500">Çıkarılan Parça</span>
                                    <span className="text-[11px] font-bold text-stone-700">{chunksLength}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] text-stone-500">Onaylanan Parça</span>
                                    <span className="text-[11px] font-bold text-[#378ADD]">{approvedCount}</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div >
    );
};

export default DatabaseDropzone;
