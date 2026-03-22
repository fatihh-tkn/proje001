import React from 'react';
import { X, FileText, Database, User } from 'lucide-react';

const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024, dm = 2, sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const AnimatePresenceWrapper = ({ isOpen, children }) => (
    <div style={{
        position: 'absolute', right: isOpen ? 0 : '-320px', top: 0, bottom: 0, width: '320px',
        transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)', zIndex: 50
    }}>
        {children}
    </div>
);

const ArchiveDetailPanel = ({ selectedDoc, onClose }) => (
    <AnimatePresenceWrapper isOpen={!!selectedDoc}>
        {selectedDoc && (
            <div className="absolute top-0 right-0 w-[320px] h-full bg-white border-l border-slate-200 shadow-xl flex flex-col z-50 overflow-hidden">
                <div className="flex-none px-5 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-[14px] font-bold text-slate-800">Dosya Detayları</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto w-full">
                    <div className="p-5 flex flex-col gap-6">
                        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-100 rounded-xl text-center">
                            <FileText size={48} className={selectedDoc.is_vectorized ? "text-teal-500" : "text-blue-500"} strokeWidth={1} />
                            <h4 className="text-[14px] font-bold text-slate-800 mt-3 break-all">{selectedDoc.filename}</h4>
                            <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded mt-2 uppercase">{selectedDoc.file_type}</span>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-center text-[12px] border-b border-slate-100 pb-2">
                                <span className="text-slate-500 font-medium">Durum</span>
                                {selectedDoc.is_vectorized ? (
                                    <span className="flex items-center gap-1 text-teal-600 font-semibold"><Database size={12} /> Vektörde İşli</span>
                                ) : (
                                    <span className="text-blue-600 font-semibold">Sadece Arşivde</span>
                                )}
                            </div>
                            <div className="flex justify-between items-center text-[12px] border-b border-slate-100 pb-2">
                                <span className="text-slate-500 font-medium">Boyut</span>
                                <span className="text-slate-800 font-semibold">{formatBytes(selectedDoc.file_size)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[12px] border-b border-slate-100 pb-2">
                                <span className="text-slate-500 font-medium whitespace-nowrap">Yükleyen</span>
                                <span className="text-slate-800 font-semibold flex items-center gap-1.5 truncate">
                                    <User size={12} className="text-slate-400" /> {selectedDoc.uploader}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-[12px] border-b border-slate-100 pb-2">
                                <span className="text-slate-500 font-medium">Tarih</span>
                                <span className="text-slate-800 font-semibold">{new Date(selectedDoc.created_at).toLocaleString()}</span>
                            </div>
                            {selectedDoc.is_vectorized && (
                                <div className="flex justify-between items-center text-[12px] border-b border-slate-100 pb-2">
                                    <span className="text-slate-500 font-medium">Parça (Chunk) Sayısı</span>
                                    <span className="bg-[#A01B1B]/10 text-[#A01B1B] font-bold px-2 py-0.5 rounded">{selectedDoc.total_chunks}</span>
                                </div>
                            )}
                        </div>

                        {selectedDoc.total_chunks > 0 && selectedDoc.chunks_preview && (
                            <div className="flex flex-col gap-2">
                                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Bağlantılı Örnek Parçalar</div>
                                {selectedDoc.chunks_preview.map((chunk, idx) => (
                                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded p-2 flex flex-col gap-1">
                                        <span className="text-[10px] text-slate-400 truncate">Vektör ID: {chunk.chroma_id}</span>
                                    </div>
                                ))}
                                {selectedDoc.total_chunks > 5 && (
                                    <div className="text-center text-[10px] text-slate-400 italic mt-1">ve {selectedDoc.total_chunks - 5} daha fazlası...</div>
                                )}
                            </div>
                        )}

                        <div className="mt-2 text-[10px] text-slate-400 break-all leading-relaxed p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="font-semibold block mb-1">Fiziksel Yol:</span>
                            {selectedDoc.storage_path}
                        </div>
                    </div>
                </div>
            </div>
        )}
    </AnimatePresenceWrapper>
);

export default ArchiveDetailPanel;
