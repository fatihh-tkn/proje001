import React from 'react';
import { ShieldCheck, CheckCheck, FileText, CheckCircle2, CornerDownRight, AlertTriangle, Loader2, Save } from 'lucide-react';

const SkeletonChunk = () => (
    <div className="bg-white border border-slate-100 rounded-xl p-3 animate-pulse">
        <div className="flex gap-2">
            <div className="w-3 h-3 rounded bg-slate-200 mt-0.5 shrink-0" />
            <div className="flex-1 space-y-1.5">
                <div className="h-2.5 bg-slate-200 rounded w-full" />
                <div className="h-2.5 bg-slate-200 rounded w-4/5" />
            </div>
        </div>
        <div className="flex gap-4 mt-2.5 pt-2 border-t border-slate-100">
            <div className="h-2 bg-slate-100 rounded w-16" />
            <div className="h-2 bg-slate-100 rounded w-20" />
        </div>
    </div>
);

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
    return (
        <div className="flex-1 flex flex-col min-w-0">
            <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 shrink-0 bg-slate-50/60">
                <ShieldCheck size={12} className="text-amber-500" />
                <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Karantina / Onay İstasyonu</span>
                {/* ── TOPLU ONAY (sağ üst köşe) ── */}
                {chunks.length > 0 && phase !== 'saving' && (
                    <button
                        onClick={handleApproveAll}
                        className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-[#A01B1B] hover:bg-[#8a1717] text-white text-[10px] font-bold rounded-lg transition-all active:scale-95 shadow-sm"
                        title="Tüm Parçaları Onayla"
                    >
                        <CheckCheck size={11} /> Tümünü Onayla
                    </button>
                )}
                {chunks.length > 0 && (
                    <span className={`text-[10px] bg-amber-100 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full font-semibold ${chunks.length > 0 && phase !== 'saving' ? '' : 'ml-auto'}`}>
                        {chunks.length} parça
                    </span>
                )}
            </div>

            {/* skeleton + chunks */}
            {skeletonChunks > 0 ? (
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {Array.from({ length: skeletonChunks }).map((_, i) => <SkeletonChunk key={i} />)}
                </div>
            ) : chunks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 p-6">
                    <ShieldCheck size={26} className="text-slate-300" />
                    <p className="text-[11px] text-center text-slate-400">
                        Dosya analiz edildiğinde parçalar<br />burada onay için sıralanacak.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col flex-1 min-h-0">
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">
                        {chunks.map((c, idx) => {
                            const isApproved = approvedChunks.has(c.id);
                            return (
                                <div
                                    key={c.id}
                                    onClick={() => toggleApproval(c.id)}
                                    className={`bg-white border-2 rounded-xl p-3 hover:shadow-sm transition-all cursor-pointer ${isApproved ? 'border-[#A01B1B] bg-red-50/20' : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    <div className="flex items-start gap-2">
                                        <CornerDownRight size={11} className="text-slate-400 mt-0.5 shrink-0" />
                                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed flex-1">{c.text}</p>
                                    </div>
                                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100">
                                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                            <FileText size={9} /> Sayfa {c.page}
                                        </span>
                                        <span className="text-[10px] text-slate-400">[x:{c.x}, y:{c.y}]</span>
                                        <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold">
                                            {isApproved ? <CheckCircle2 size={11} className="text-[#A01B1B]" /> : <></>}
                                            <span className={isApproved ? "text-[#A01B1B]" : "text-amber-500"}>#{idx + 1}</span>
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {saveError && (
                        <div className="mx-3 mb-2 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg shrink-0">
                            <AlertTriangle size={12} className="text-red-500 shrink-0" />
                            <p className="text-[11px] text-red-600">{saveError}</p>
                        </div>
                    )}

                    <div className="p-3 shrink-0 border-t border-slate-200 bg-slate-50/40">
                        <button
                            onClick={handleSave}
                            disabled={phase === 'saving' || approvedChunks.size === 0}
                            className={`w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm focus:outline-none
                                ${approvedChunks.size > 0
                                    ? 'bg-[#A01B1B] hover:bg-[#8a1717] text-white hover:shadow-md active:scale-[0.98]'
                                    : 'bg-slate-200 text-slate-400 hover:bg-slate-300'}
                                ${(phase === 'saving' || approvedChunks.size === 0) ? 'cursor-not-allowed opacity-70' : ''}`}
                        >
                            {phase === 'saving'
                                ? <><Loader2 size={15} className="animate-spin" /> Kaydediliyor...</>
                                : <><Save size={15} /> Vektörleştir ve Hafızaya Kaydet</>
                            }
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatabaseQuarantine;
