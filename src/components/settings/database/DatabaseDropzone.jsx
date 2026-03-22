import React from 'react';
import { Upload, Zap, Activity, CheckCircle2, ShieldCheck, X } from 'lucide-react';

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
        <div className="w-[42%] shrink-0 border-r border-slate-200 flex flex-col">
            <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 shrink-0 bg-slate-50/60">
                <Upload size={12} className="text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Besleme Alanı</span>
                {(phase === 'staged' || phase === 'saving') && (
                    <button onClick={handleCancel} className="ml-auto text-slate-400 hover:text-red-500 transition-colors">
                        <X size={12} />
                    </button>
                )}
            </div>

            <div className="flex-1 p-4 flex items-center justify-center">
                {/* ── idle: drop zone ── */}
                {phase === 'idle' && (
                    <div className="w-full h-full flex flex-col gap-3">
                        <div className="flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-purple-50 rounded-lg">
                                    <Zap size={13} className="text-purple-600 animate-pulse" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-700">Derin AI Görsel Okuma (B Yolu)</p>
                                    <p className="text-[9px] text-slate-400">Gemini 1.5 Pro API ile okları ve grafikleri anlar</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={useVision} onChange={e => setUseVision(e.target.checked)} />
                                <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                        </div>

                        <label
                            onDragEnter={() => setDragOver(true)}
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={(e) => {
                                if (!dropRef.current?.contains(e.relatedTarget)) setDragOver(false);
                            }}
                            onDrop={handleDrop}
                            ref={dropRef}
                            className={`relative w-full h-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 overflow-hidden group select-none
                            ${dragOver || dragActive
                                    ? 'border-[#A01B1B] bg-red-50 shadow-[0_0_0_4px_rgba(160,27,27,0.08),inset_0_0_20px_rgba(160,27,27,0.04)]'
                                    : 'border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-white'
                                }`}
                        >
                            <input type="file" className="hidden" onChange={handleFileInput} accept=".pdf,.txt,.docx,.bpmn,.xlsx" />

                            {/* köşe aksentleri */}
                            {['top-3 left-3', 'top-3 right-3', 'bottom-3 left-3', 'bottom-3 right-3'].map(pos => (
                                <span key={pos} className={`absolute ${pos} w-3.5 h-3.5 transition-all duration-200
                                ${pos.includes('top') && pos.includes('left') ? 'border-t-2 border-l-2 rounded-tl' : ''}
                                ${pos.includes('top') && pos.includes('right') ? 'border-t-2 border-r-2 rounded-tr' : ''}
                                ${pos.includes('bottom') && pos.includes('left') ? 'border-b-2 border-l-2 rounded-bl' : ''}
                                ${pos.includes('bottom') && pos.includes('right') ? 'border-b-2 border-r-2 rounded-br' : ''}
                                ${dragOver || dragActive ? 'border-[#A01B1B] scale-110' : 'border-slate-300 group-hover:border-slate-500'}
                            `} />
                            ))}

                            {/* ikon */}
                            <div className={`p-4 rounded-xl mb-4 transition-all duration-200
                            ${dragOver || dragActive
                                    ? 'bg-red-100 border border-red-200 scale-110'
                                    : 'bg-white border border-slate-200 group-hover:border-slate-300 shadow-sm'
                                }`}
                            >
                                <Upload size={28} className={`transition-colors ${dragOver || dragActive ? 'text-[#A01B1B]' : 'text-slate-400 group-hover:text-slate-600'}`} />
                            </div>

                            <p className={`text-sm font-semibold transition-colors ${dragOver || dragActive ? 'text-[#A01B1B]' : 'text-slate-600 group-hover:text-slate-800'}`}>
                                {dragOver || dragActive ? 'Dosyayı bırakın' : 'Dosya sürükleyin veya seçin'}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1.5">PDF, DOCX, TXT, BPMN, XLSX</p>

                            {/* pulse ring - drag active */}
                            {(dragOver || dragActive) && (
                                <span className="absolute inset-0 rounded-xl border-2 border-[#A01B1B]/30 animate-ping pointer-events-none" />
                            )}
                        </label>
                    </div>
                )}

                {/* ── analyzing: spinner + progress ── */}
                {phase === 'analyzing' && (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-5 px-6">
                        <div className="relative w-16 h-16 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-2 border-slate-200" />
                            <div className="absolute inset-0 rounded-full border-t-2 border-[#A01B1B] animate-spin" />
                            <div className="absolute inset-2 rounded-full border border-slate-100 border-t-red-200 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
                            <Activity size={18} className="text-[#A01B1B]" />
                        </div>
                        <div className="w-full text-center">
                            <p className="text-[12px] font-semibold text-slate-800 mb-0.5 truncate">{stagedFile?.name}</p>
                            <p className="text-[11px] text-slate-500 mb-4">OCR ve Koordinat Taraması yapılıyor...</p>
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[#A01B1B] rounded-full transition-all duration-150"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1.5 text-right">{Math.round(progress)}%</p>
                        </div>
                    </div>
                )}

                {/* ── staged / saving ── */}
                {(phase === 'staged' || phase === 'saving') && stagedFile && (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-4">
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <CheckCircle2 size={26} className="text-emerald-500" />
                        </div>
                        <p className="text-[13px] font-semibold text-slate-800 truncate max-w-full">{stagedFile.name}</p>
                        <p className="text-[11px] text-slate-500 text-center">
                            Analiz tamamlandı.<br />
                            <span className="text-[#A01B1B] font-semibold">{chunksLength} parçadan {approvedCount} adedi</span> onaylandı.
                        </p>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                            <ShieldCheck size={12} className="text-amber-500" />
                            <span className="text-[10px] text-amber-600 font-medium">Veritabanı korunuyor</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DatabaseDropzone;
