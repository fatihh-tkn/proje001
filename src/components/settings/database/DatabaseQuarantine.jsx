import React, { useState } from 'react';
import { ShieldCheck, CheckCheck, FileText, CheckCircle2, AlertTriangle, Loader2, Save, Fingerprint, DatabaseZap, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmbeddingModelPanel from '../databases/EmbeddingModelPanel';

const SkeletonChunk = () => (
    <div className="bg-white border-l-4 border-stone-200 border-y border-r rounded-r-xl rounded-l-md p-4 animate-pulse flex flex-col gap-3 shadow-sm">
        <div className="flex gap-2 items-center">
            <div className="w-4 h-4 rounded-md bg-stone-200 shrink-0" />
            <div className="h-3 bg-stone-200 rounded w-1/3" />
        </div>
        <div className="space-y-2">
            <div className="h-2.5 bg-stone-200 rounded w-full" />
            <div className="h-2.5 bg-stone-200 rounded w-4/5" />
            <div className="h-2.5 bg-stone-200 rounded w-2/3" />
        </div>
        <div className="flex gap-4 mt-1 pt-2 border-t border-stone-100">
            <div className="h-2 bg-stone-100 rounded w-16" />
            <div className="h-2 bg-stone-100 rounded w-20" />
        </div>
    </div>
);

const getTypeColor = (type) => {
    if (!type) return 'border-stone-300';
    if (type.includes('bpmn')) return 'border-purple-500';
    if (type.includes('pdf')) return 'border-blue-500';
    if (type.includes('pptx')) return 'border-orange-500';
    if (type.includes('excel')) return 'border-emerald-500';
    return 'border-stone-300';
};

const DatabaseQuarantine = ({
    chunks,
    phase,
    skeletonChunks,
    approvedChunks,
    handleApproveAll,
    toggleApproval,
    handleSave,
    saveError
}) => {
    const [showEmbeddingPanel, setShowEmbeddingPanel] = useState(false);

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-white">
            <div className="px-5 py-3 border-b border-stone-100 flex items-center gap-2 shrink-0 bg-white z-10">
                <ShieldCheck size={14} className="text-[#3B6D11]" />
                <span className="text-[11px] font-bold text-stone-500 tracking-widest uppercase">Parça İnceleme</span>

                {/* ── Embedding Ayarları Butonu (Parça İnceleme'nin Sağı) ── */}
                <div className="relative ml-2">
                    <button
                        onClick={() => setShowEmbeddingPanel(!showEmbeddingPanel)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-colors ${showEmbeddingPanel ? 'bg-[#E6F1FB] border-[#B8D4F0] text-[#378ADD]' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}
                        title="Embedding Model Ayarları"
                    >
                        <Brain size={13} className={showEmbeddingPanel ? 'text-[#378ADD]' : 'text-stone-400'} />
                        Model Seç
                    </button>

                    {/* Popup / Panel */}
                    <AnimatePresence>
                        {showEmbeddingPanel && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowEmbeddingPanel(false)} />
                                <motion.div
                                    initial={{ opacity: 0, y: 5, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 5, scale: 0.98 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute left-0 top-full mt-2 w-[400px] bg-white border border-stone-200 rounded-xl shadow-2xl z-50 overflow-hidden"
                                >
                                    <div className="max-h-[70vh] overflow-y-auto px-4 py-2 custom-scrollbar">
                                        <EmbeddingModelPanel />
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
                {/* ── TOPLU ONAY (sağ üst köşe) ── */}
                <AnimatePresence>
                    {chunks.length > 0 && phase !== 'saving' && (
                        <motion.button
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            onClick={handleApproveAll}
                            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-[#378ADD] text-stone-600 hover:text-white text-[11px] font-bold rounded-lg transition-colors active:scale-95 shadow-sm"
                            title="Tüm Parçaları Onayla"
                        >
                            <CheckCheck size={14} /> Tümünü Onayla
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            {/* skeleton + chunks */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
                {skeletonChunks > 0 ? (
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {Array.from({ length: skeletonChunks }).map((_, i) => <SkeletonChunk key={i} />)}
                    </div>
                ) : chunks.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4 p-6 bg-slate-50/30"
                    >
                        <DatabaseZap size={40} className="text-slate-200" />
                        <p className="text-[12px] text-center text-slate-400 font-medium">
                            Henüz dosya yüklenmedi.<br />Parçalar burada görünecek.
                        </p>
                    </motion.div>
                ) : (
                    <div className="flex flex-col flex-1 min-h-0 bg-stone-50/50">
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-stone-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-stone-400">
                            <AnimatePresence>
                                {chunks.map((c, idx) => {
                                    const isApproved = approvedChunks.has(c.id);
                                    const borderColor = getTypeColor(c.metadata?.type);

                                    return (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, x: 20 }}
                                            animate={
                                                phase === 'saving' && isApproved
                                                    ? { x: -400, opacity: 0, scale: 0.95 }
                                                    : { x: 0, opacity: 1, y: 0, scale: 1 }
                                            }
                                            transition={
                                                phase === 'saving' && isApproved
                                                    ? { duration: 0.5, ease: "anticipate", delay: (idx % 15) * 0.08 }
                                                    : { duration: 0.3, ease: "easeOut", delay: idx * 0.05 > 0.5 ? 0 : idx * 0.05 }
                                            }
                                            key={c.id}
                                            onClick={() => toggleApproval(c.id)}
                                            className={`relative bg-white border-y border-r border-l-4 rounded-r-xl rounded-l-md p-4 transition-all cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.02)]
                                                hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:-translate-y-0.5
                                                ${isApproved ? 'border-l-[#378ADD] border-y-[#378ADD]/30 border-r-[#378ADD]/30 bg-[#E6F1FB]/10' : `${borderColor} border-y-stone-200 border-r-stone-200 hover:border-r-stone-300`}
                                            `}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`mt-0.5 p-1.5 rounded-md shrink-0 ${isApproved ? 'bg-[#378ADD]/10 text-[#378ADD]' : 'bg-stone-100 text-stone-400'}`}>
                                                    <Fingerprint size={14} />
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                                                            Node #{idx + 1}
                                                        </span>
                                                        {isApproved && <CheckCircle2 size={14} className="text-[#378ADD]" />}
                                                    </div>
                                                    <p className="text-[12px] text-stone-700 font-medium leading-relaxed font-sans whitespace-pre-wrap">
                                                        {c.text}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-stone-100">
                                                <span className="text-[10px] text-stone-400 flex items-center gap-1.5 font-medium">
                                                    <FileText size={11} /> Kaynak: {c.metadata?.source || 'Bilinmiyor'}
                                                </span>
                                                <span className="text-[10px] text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md">
                                                    Sayfa {c.page}
                                                </span>
                                                {c.metadata?.type && (
                                                    <span className="text-[10px] text-stone-400 border border-stone-200 px-2 py-0.5 rounded-md ml-auto truncate max-w-[100px]">
                                                        {c.metadata.type}
                                                    </span>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>

                        {saveError && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-4 mb-2 flex items-center gap-2 px-4 py-3 bg-[#FEF2F2] border border-[#F0C0C0] rounded-xl shrink-0">
                                <AlertTriangle size={16} className="text-[#991B1B] shrink-0" />
                                <p className="text-[12px] font-medium text-[#991B1B]">{saveError}</p>
                            </motion.div>
                        )}

                        <div className="p-4 shrink-0 border-t border-stone-200 bg-white z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
                            <motion.button
                                whileHover={phase !== 'saving' && approvedChunks.size > 0 ? { scale: 1.01 } : {}}
                                whileTap={phase !== 'saving' && approvedChunks.size > 0 ? { scale: 0.98 } : {}}
                                onClick={handleSave}
                                disabled={phase === 'saving' || approvedChunks.size === 0}
                                className={`relative w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-[13px] transition-all overflow-hidden
                                    ${approvedChunks.size > 0
                                        ? 'bg-gradient-to-r from-[#378ADD] to-[#0C447C] text-white shadow-[0_4px_15px_rgba(55,138,221,0.3)]'
                                        : 'bg-stone-100 text-stone-400'}
                                    ${(phase === 'saving' || approvedChunks.size === 0) ? 'cursor-not-allowed opacity-80' : ''}`}
                            >
                                {phase === 'saving' && (
                                    <motion.div
                                        className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] w-[200%]"
                                        animate={{ x: ["-100%", "50%"] }}
                                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                    />
                                )}

                                {phase === 'saving'
                                    ? <><Loader2 size={16} className="animate-spin relative z-10" /> <span className="relative z-10">Kaydediliyor...</span></>
                                    : <><Save size={16} /> Seçili {approvedChunks.size} Parçayı Kaydet</>
                                }
                            </motion.button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DatabaseQuarantine;
