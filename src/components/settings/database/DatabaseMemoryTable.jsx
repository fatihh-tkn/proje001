import {
    Database, FileText, Search, Trash2, AlertTriangle, Layers,
    ChevronDown, ChevronRight, X, Network, Share2, Box, CheckCircle2,
    BarChart3, Zap, RefreshCw, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { mutate, notify } from '../../../api/client';

const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

const getFileStyle = (filename = '') => {
    if (filename.includes('.pdf')) return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' };
    if (filename.includes('.bpmn')) return { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' };
    if (filename.includes('.pptx')) return { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' };
    if (filename.includes('.xlsx') || filename.includes('.xls')) return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' };
    return { color: 'text-[#378ADD]', bg: 'bg-[#E6F1FB]', border: 'border-[#B8D4F0]' };
};

const SkeletonRow = () => (
    <div className="grid grid-cols-[3fr_1.5fr_1fr_1.5fr_60px] items-center px-6 py-4 border-b border-stone-100 animate-pulse">
        {[['w-48'], ['w-24'], ['w-16'], ['w-28'], []].map(([w], i) =>
            w ? <div key={i} className={`h-3 bg-stone-200 rounded-full ${w}`} /> : <div key={i} />
        )}
    </div>
);

const DatabaseMemoryTable = ({
    records, filteredRecords, dbLoading, search, setSearch,
    expandedRecord, toggleRecordExpansion,
    recordVectors, expandedPages, togglePageExpansion,
    deleteConfirm, setDeleteConfirm,
    handleDeleteRecord, handleDeleteVector,
    fetchRecords, recordGraphStats = {}, handleApproveDocument = () => { }
}) => {
    return (
        <div className="flex flex-col flex-1 min-h-0">

            {/* ══ ÜSTLÜK ══ */}
            <div className="px-6 py-2.5 border-b border-stone-200 flex items-center gap-3 shrink-0 bg-white z-10 relative">
                <div className="p-1.5 bg-stone-100 border border-stone-200 rounded-md">
                    <Database size={13} className="text-stone-500" />
                </div>
                <span className="text-[11px] font-bold text-stone-600 tracking-widest uppercase">Dosya Listesi</span>

                <div className="ml-6 relative flex-1 max-w-xs">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Dosya ara..."
                        value={search}
                        onChange={e = autoComplete="off"> setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-[12px] bg-stone-50 border border-stone-200 rounded-lg
                            focus:outline-none focus:bg-white focus:border-[#378ADD]/40
                            placeholder:text-stone-400 text-stone-700 transition-all"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                            <X size={11} />
                        </button>
                    )}
                </div>

                <div className="ml-auto flex items-center gap-3">
                    <span className="text-[11px] font-medium text-stone-400 mr-2">
                        <span className="font-bold text-stone-700">{filteredRecords.length}</span> kayıt
                    </span>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg shadow-sm">
                        <BarChart3 size={12} className="text-[#378ADD]" />
                        <span className="text-[11px] font-bold text-stone-600">
                            {records.reduce((acc, curr) => acc + (curr.chunks || 0), 0).toLocaleString('tr-TR')} Parça
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg shadow-sm">
                        <Zap size={12} className="text-stone-400" />
                        <span className="text-[11px] font-bold text-stone-600">
                            {records.length} Döküman
                        </span>
                    </div>
                    <button onClick={fetchRecords} className="p-1.5 flex items-center justify-center bg-white hover:bg-stone-50 border border-stone-200 rounded-lg shadow-sm transition-colors text-stone-500 hover:text-[#378ADD]" title="Yenile">
                        <RefreshCw size={13} className={dbLoading ? 'animate-spin text-[#378ADD]' : ''} />
                    </button>
                    <button
                        onClick={async () => {
                            try {
                                const d = await mutate.process('/api/sql/repair-integrity', null, {
                                    subject: 'Bütünlük onarımı',
                                    silentSuccess: true,
                                    showLoading: true,
                                });
                                notify.success(
                                    `Onarım tamamlandı: ${d.repaired_chunks} chunk · ${d.created_belgeler} belge oluşturuldu.`,
                                    { copyable: true }
                                );
                                fetchRecords();
                            } catch { /* mutate toast attı */ }
                        }}
                        className="p-1.5 flex items-center justify-center bg-white hover:bg-stone-50 border border-stone-200 rounded-lg shadow-sm transition-colors text-stone-500 hover:text-[#378ADD]" title="Ağ Onarımı Yürüt"
                    >
                        <ShieldCheck size={13} />
                    </button>
                </div>
            </div>

            {/* ══ KOLON BAŞLIKLARI ══ */}
            <div className="grid grid-cols-[3fr_1.5fr_1fr_1.5fr_60px] items-center px-6 py-2 border-b border-stone-200 bg-stone-50 shrink-0">
                {['Dosya', 'Bağlantı', 'Parça', 'Tarih', ''].map((h, i) => (
                    <span key={i} className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider">{h}</span>
                ))}
            </div>

            {/* ══ SATIRLAR ══ */}
            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-stone-200 [&::-webkit-scrollbar-thumb]:rounded-full">

                {dbLoading && [1, 2, 3].map(i => <SkeletonRow key={i} />)}

                {!dbLoading && filteredRecords.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-stone-400">
                        <Box size={32} strokeWidth={1} className="text-stone-200" />
                        <p className="text-[13px] font-semibold text-stone-500">{search ? `"${search}" bulunamadı` : 'Henüz işlenen dosya yok'}</p>
                    </div>
                )}

                <AnimatePresence>
                    {!dbLoading && filteredRecords.map((rec) => {
                        // SQL'den gelen format ile eşleştirme:
                        const recordId = rec.id;
                        const recordFile = rec.file || "İsimsiz";
                        const recordChunks = rec.chunks || 0;
                        const recordDate = rec.date || new Date().toISOString();

                        const style = getFileStyle(recordFile);
                        const isExpanded = expandedRecord === recordId;
                        const gs = recordGraphStats[recordId];
                        const totalLinks = (gs?.total_internal_links ?? 0) + (gs?.total_external_links ?? 0);
                        const connFiles = gs?.connected_files || [];
                        const vectors = recordVectors[recordId] || [];

                        return (
                            <motion.div
                                key={recordId}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className={`border-b border-stone-100 ${isExpanded ? 'bg-stone-50' : 'bg-white hover:bg-stone-50/60'} transition-colors`}
                            >
                                {/* ── Ana Satır ── */}
                                <div
                                    onClick={() => toggleRecordExpansion({ id: recordId, file: recordFile })}
                                    className="grid grid-cols-[3fr_1.5fr_1fr_1.5fr_60px] items-center px-6 py-3 cursor-pointer"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0 pr-4">
                                        <div className={`p-1.5 rounded-lg shrink-0 ${style.bg} border ${style.border}`}>
                                            <FileText size={13} className={style.color} />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[12px] text-stone-800 truncate font-semibold">{recordFile}</span>
                                            <span className="text-[10px] text-stone-400 font-mono">…{recordId.substring(recordId.length - 8)}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <Network size={11} className="text-stone-400 shrink-0" />
                                        <span className="text-[12px] font-semibold text-stone-600">
                                            {gs ? totalLinks : (recordChunks > 1 ? recordChunks - 1 : 0)}
                                        </span>
                                        <span className="text-[10px] text-stone-400">link</span>
                                    </div>

                                    <div>
                                        <span className="text-[12px] font-bold text-[#378ADD]">{recordChunks}</span>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${rec.status === 'karantina' ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                                        <span className="text-[11px] text-stone-400">{fmtDate(recordDate)}</span>
                                    </div>

                                    <div className="flex items-center justify-end gap-1 pr-1">
                                        <ChevronDown size={14} className={`text-stone-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />

                                        {rec.status === 'karantina' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleApproveDocument(recordId); }}
                                                className="p-1 rounded hover:bg-emerald-50 hover:text-emerald-500 text-amber-500 transition-all flex items-center gap-1"
                                                title="Onayla ve Aktifleştir"
                                            >
                                                <CheckCircle2 size={13} />
                                            </button>
                                        )}

                                        <button
                                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'record', id: recordId }); }}
                                            className="p-1 rounded hover:bg-[#FEF2F2] hover:text-[#991B1B] text-stone-300 transition-all"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                        {deleteConfirm?.type === 'record' && deleteConfirm?.id === recordId && (
                                            <div
                                                className="absolute right-16 z-50 flex items-center gap-2 bg-white border border-red-200 shadow-lg rounded-lg p-2.5 min-w-max"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <AlertTriangle size={14} className="text-red-500" />
                                                <span className="text-[11px] text-slate-700">Silinsin mi?</span>
                                                <button onClick={() => handleDeleteRecord(rec)} className="px-2.5 py-1 bg-[#378ADD] text-white rounded text-[10px] font-bold">Evet</button>
                                                <button onClick={() => setDeleteConfirm(null)} className="px-2.5 py-1 bg-stone-100 text-stone-600 rounded text-[10px]">İptal</button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ── Genişletilmiş Alan: TAM GENİŞLİKTE TEK PANEL ── */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden border-t border-stone-200 bg-white"
                                        >
                                            {/* ── Özet şerit ── */}
                                            <div className="flex items-center gap-0 border-b border-stone-100">
                                                <div className="flex-1 flex items-center gap-2 px-6 py-3 border-r border-stone-100">
                                                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Parça</span>
                                                    <span className="text-[14px] font-extrabold text-[#378ADD] ml-auto">{rec.chunks}</span>
                                                </div>
                                                <div className="flex-1 flex items-center gap-2 px-6 py-3 border-r border-stone-100">
                                                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">İç Link</span>
                                                    <span className="text-[14px] font-extrabold text-stone-700 ml-auto">{gs ? gs.total_internal_links : '…'}</span>
                                                </div>
                                                <div className="flex-1 flex items-center gap-2 px-6 py-3 border-r border-stone-100">
                                                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Dış Link</span>
                                                    <span className="text-[14px] font-extrabold text-stone-700 ml-auto">{gs ? gs.total_external_links : '…'}</span>
                                                </div>
                                                <div className="flex-1 flex items-center gap-2 px-6 py-3">
                                                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Bağlı Dosya</span>
                                                    <span className="text-[14px] font-extrabold text-stone-700 ml-auto">{connFiles.length}</span>
                                                </div>
                                            </div>

                                            {/* ── Bağlı dosyalar (varsa) ── */}
                                            {connFiles.length > 0 && (
                                                <div className="flex items-center gap-2 flex-wrap px-6 py-3 border-b border-stone-100 bg-stone-50/50">
                                                    <Share2 size={11} className="text-stone-400 shrink-0" />
                                                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold shrink-0">Bağlı:</span>
                                                    {connFiles.map(cf => (
                                                        <span key={cf.filename} className="flex items-center gap-1.5 text-[11px] text-stone-600 bg-white border border-stone-200 rounded px-2.5 py-1 font-medium">
                                                            {cf.filename}
                                                            <span className="text-[10px] font-bold text-[#378ADD]">{cf.links}×</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* ── Düğüm listesi ── */}
                                            <div className="max-h-64 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-stone-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                                                {vectors.length === 0 && recordVectors[rec.id] !== undefined && (
                                                    <div className="flex items-center justify-center py-8 text-stone-400 gap-2">
                                                        <Network size={16} strokeWidth={1.5} />
                                                        <span className="text-[12px]">ChromaDB'de eşleşen vektör bulunamadı.</span>
                                                    </div>
                                                )}
                                                {vectors.length === 0 && recordVectors[rec.id] === undefined && (
                                                    <div className="flex items-center justify-center py-8 gap-2 text-stone-400">
                                                        <div className="w-3.5 h-3.5 border-2 border-[#378ADD]/30 border-t-[#378ADD] rounded-full animate-spin" />
                                                        <span className="text-[12px]">Yükleniyor...</span>
                                                    </div>
                                                )}

                                                {(() => {
                                                    if (vectors.length === 0) return null;

                                                    const grouped = vectors.reduce((acc, v) => {
                                                        const p = v.page || 'Genel';
                                                        if (!acc[p]) acc[p] = [];
                                                        acc[p].push(v);
                                                        return acc;
                                                    }, {});

                                                    return Object.entries(grouped).map(([page, pVecs]) => {
                                                        const open = expandedPages[page];
                                                        return (
                                                            <div key={page}>
                                                                {/* Sayfa satırı */}
                                                                <div
                                                                    onClick={() => togglePageExpansion(page)}
                                                                    className="flex items-center gap-2.5 px-6 py-2.5 cursor-pointer border-b border-stone-100 hover:bg-stone-50 transition-colors"
                                                                >
                                                                    <ChevronRight size={12} className={`text-stone-400 transition-transform duration-150 ${open ? 'rotate-90' : ''}`} />
                                                                    <Layers size={12} className={open ? 'text-[#378ADD]' : 'text-stone-400'} />
                                                                    <span className="text-[12px] font-semibold text-stone-700">Sayfa / Yapı: {page}</span>
                                                                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${open ? 'text-[#378ADD] bg-[#E6F1FB] border-[#B8D4F0]' : 'text-stone-400 bg-stone-100 border-stone-200'}`}>
                                                                        {pVecs.length} düğüm
                                                                    </span>
                                                                </div>

                                                                {/* Düğümler */}
                                                                {open && (
                                                                    <div className="overflow-hidden border-t border-stone-50 transition-all duration-300">
                                                                        {pVecs.map((vector, vIdx) => (
                                                                            <div
                                                                                key={vector.id}
                                                                                className={`relative group/v flex items-start gap-3 pl-12 pr-5 py-2.5 border-b border-stone-50 transition-colors
                                                                                        ${deleteConfirm?.id === vector.id ? 'bg-[#FEF2F2]/50' : 'hover:bg-stone-50/80'}`}
                                                                            >
                                                                                {/* Numara */}
                                                                                <div className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border border-stone-200 bg-white text-[9px] font-bold text-stone-400 flex items-center justify-center group-hover/v:border-[#378ADD]/40 group-hover/v:text-[#378ADD] transition-colors">
                                                                                    {vIdx + 1}
                                                                                </div>

                                                                                {/* İçerik */}
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="flex items-center gap-2 mb-1">
                                                                                        <span className="text-[9px] text-stone-400 uppercase tracking-widest font-bold">Parça</span>
                                                                                        <span className="font-mono text-[9px] text-stone-300 bg-stone-100 px-1 py-0.5 rounded">#{vector.id.substring(vector.id.length - 6)}</span>
                                                                                    </div>
                                                                                    <p className="text-[12px] text-stone-700 leading-relaxed line-clamp-2">{vector.text}</p>
                                                                                </div>

                                                                                {/* Sil */}
                                                                                <div className="shrink-0 self-center relative">
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'vector', id: vector.id, recId: rec.id }); }}
                                                                                        className={`p-1 rounded transition-all ${deleteConfirm?.id === vector.id ? 'opacity-100 text-red-500' : 'opacity-0 group-hover/v:opacity-100 text-slate-300 hover:text-red-400'}`}
                                                                                    >
                                                                                        <Trash2 size={12} />
                                                                                    </button>
                                                                                    {deleteConfirm?.type === 'vector' && deleteConfirm?.id === vector.id && (
                                                                                        <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 flex items-center gap-2 bg-white border border-red-200 shadow-lg rounded-lg p-2 min-w-max" onClick={e => e.stopPropagation()}>
                                                                                            <span className="text-[11px] text-slate-700 font-medium">Kes?</span>
                                                                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteVector(rec.id, vector.id); }} className="px-2.5 py-1 bg-[#378ADD] text-white rounded text-[10px] font-bold">Evet</button>
                                                                                            <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }} className="px-2.5 py-1 bg-stone-100 text-stone-600 rounded text-[10px]">İptal</button>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default DatabaseMemoryTable;
