import React from 'react';
import {
    Database, FileText, Search, Trash2, AlertTriangle, Layers,
    ChevronDown, ChevronRight, X, Network, Share2, Box
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

const getFileStyle = (filename = '') => {
    if (filename.includes('.pdf')) return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' };
    if (filename.includes('.bpmn')) return { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' };
    if (filename.includes('.pptx')) return { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' };
    if (filename.includes('.xlsx') || filename.includes('.xls')) return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' };
    return { color: 'text-[#A01B1B]', bg: 'bg-red-50', border: 'border-red-100' };
};

const SkeletonRow = () => (
    <div className="grid grid-cols-[3fr_1.5fr_1fr_1.5fr_60px] items-center px-6 py-4 border-b border-slate-100 animate-pulse">
        {[['w-48'], ['w-24'], ['w-16'], ['w-28'], []].map(([w], i) =>
            w ? <div key={i} className={`h-3 bg-slate-200 rounded-full ${w}`} /> : <div key={i} />
        )}
    </div>
);

const DatabaseMemoryTable = ({
    records, filteredRecords, dbLoading, search, setSearch,
    expandedRecord, toggleRecordExpansion,
    recordVectors, expandedPages, togglePageExpansion,
    deleteConfirm, setDeleteConfirm,
    handleDeleteRecord, handleDeleteVector,
    fetchRecords, recordGraphStats = {}
}) => {
    return (
        <div className="flex flex-col flex-1 min-h-0">

            {/* ══ ÜSTLÜK ══ */}
            <div className="px-6 py-2.5 border-b border-slate-200 flex items-center gap-3 shrink-0 bg-white z-10 relative">
                <div className="p-1.5 bg-slate-100 border border-slate-200 rounded-md">
                    <Database size={13} className="text-slate-500" />
                </div>
                <span className="text-[11px] font-bold text-slate-600 tracking-widest uppercase">Aktif Bilgi Ağı</span>

                <div className="ml-6 relative flex-1 max-w-xs">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Dosya ara..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-[12px] bg-slate-50 border border-slate-200 rounded-lg
                            focus:outline-none focus:bg-white focus:border-[#A01B1B]/40
                            placeholder:text-slate-400 text-slate-700 transition-all"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X size={11} />
                        </button>
                    )}
                </div>

                <span className="ml-auto text-[11px] font-medium text-slate-400">
                    <span className="font-bold text-slate-700">{filteredRecords.length}</span> kayıt
                </span>
            </div>

            {/* ══ KOLON BAŞLIKLARI ══ */}
            <div className="grid grid-cols-[3fr_1.5fr_1fr_1.5fr_60px] items-center px-6 py-2 border-b border-slate-200 bg-slate-50 shrink-0">
                {['Kaynak Düğüm', 'Bağlantı', 'Parça', 'Tarih', ''].map((h, i) => (
                    <span key={i} className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{h}</span>
                ))}
            </div>

            {/* ══ SATIRLAR ══ */}
            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">

                {dbLoading && [1, 2, 3].map(i => <SkeletonRow key={i} />)}

                {!dbLoading && filteredRecords.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                        <Box size={32} strokeWidth={1} className="text-slate-200" />
                        <p className="text-[13px] font-semibold text-slate-500">{search ? `"${search}" bulunamadı` : 'Ağda henüz dosya yok'}</p>
                    </div>
                )}

                <AnimatePresence>
                    {!dbLoading && filteredRecords.map((rec) => {
                        const style = getFileStyle(rec.file);
                        const isExpanded = expandedRecord === rec.id;
                        const gs = recordGraphStats[rec.id];
                        const totalLinks = (gs?.total_internal_links ?? 0) + (gs?.total_external_links ?? 0);
                        const connFiles = gs?.connected_files || [];
                        const vectors = recordVectors[rec.id] || [];

                        return (
                            <motion.div
                                key={rec.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className={`border-b border-slate-100 ${isExpanded ? 'bg-slate-50' : 'bg-white hover:bg-slate-50/60'} transition-colors`}
                            >
                                {/* ── Ana Satır ── */}
                                <div
                                    onClick={() => toggleRecordExpansion(rec)}
                                    className="grid grid-cols-[3fr_1.5fr_1fr_1.5fr_60px] items-center px-6 py-3 cursor-pointer"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0 pr-4">
                                        <div className={`p-1.5 rounded-lg shrink-0 ${style.bg} border ${style.border}`}>
                                            <FileText size={13} className={style.color} />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[12px] text-slate-800 truncate font-semibold">{rec.file}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">…{rec.id.substring(rec.id.length - 8)}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <Network size={11} className="text-slate-400 shrink-0" />
                                        <span className="text-[12px] font-semibold text-slate-600">
                                            {gs ? totalLinks : (rec.chunks > 1 ? rec.chunks - 1 : 0)}
                                        </span>
                                        <span className="text-[10px] text-slate-400">link</span>
                                    </div>

                                    <div>
                                        <span className="text-[12px] font-bold text-[#A01B1B]">{rec.chunks}</span>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                        <span className="text-[11px] text-slate-400">{fmtDate(rec.date)}</span>
                                    </div>

                                    <div className="flex items-center justify-end gap-1 pr-1">
                                        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'record', id: rec.id }); }}
                                            className="p-1 rounded hover:bg-red-50 hover:text-red-500 text-slate-300 transition-all"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                        {deleteConfirm?.type === 'record' && deleteConfirm?.id === rec.id && (
                                            <div
                                                className="absolute right-16 z-50 flex items-center gap-2 bg-white border border-red-200 shadow-lg rounded-lg p-2.5 min-w-max"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <AlertTriangle size={14} className="text-red-500" />
                                                <span className="text-[11px] text-slate-700">Silinsin mi?</span>
                                                <button onClick={() => handleDeleteRecord(rec)} className="px-2.5 py-1 bg-[#A01B1B] text-white rounded text-[10px] font-bold">Evet</button>
                                                <button onClick={() => setDeleteConfirm(null)} className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded text-[10px]">İptal</button>
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
                                            className="overflow-hidden border-t border-slate-200 bg-white"
                                        >
                                            {/* ── Özet şerit ── */}
                                            <div className="flex items-center gap-0 border-b border-slate-100">
                                                <div className="flex-1 flex items-center gap-2 px-6 py-3 border-r border-slate-100">
                                                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Vektör</span>
                                                    <span className="text-[14px] font-extrabold text-[#A01B1B] ml-auto">{rec.chunks}</span>
                                                </div>
                                                <div className="flex-1 flex items-center gap-2 px-6 py-3 border-r border-slate-100">
                                                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">İç Link</span>
                                                    <span className="text-[14px] font-extrabold text-slate-700 ml-auto">{gs ? gs.total_internal_links : '…'}</span>
                                                </div>
                                                <div className="flex-1 flex items-center gap-2 px-6 py-3 border-r border-slate-100">
                                                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Dış Link</span>
                                                    <span className="text-[14px] font-extrabold text-slate-700 ml-auto">{gs ? gs.total_external_links : '…'}</span>
                                                </div>
                                                <div className="flex-1 flex items-center gap-2 px-6 py-3">
                                                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Bağlı Dosya</span>
                                                    <span className="text-[14px] font-extrabold text-slate-700 ml-auto">{connFiles.length}</span>
                                                </div>
                                            </div>

                                            {/* ── Bağlı dosyalar (varsa) ── */}
                                            {connFiles.length > 0 && (
                                                <div className="flex items-center gap-2 flex-wrap px-6 py-3 border-b border-slate-100 bg-slate-50/50">
                                                    <Share2 size={11} className="text-slate-400 shrink-0" />
                                                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold shrink-0">Bağlı:</span>
                                                    {connFiles.map(cf => (
                                                        <span key={cf.filename} className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-white border border-slate-200 rounded px-2.5 py-1 font-medium">
                                                            {cf.filename}
                                                            <span className="text-[10px] font-bold text-[#A01B1B]">{cf.links}×</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* ── Düğüm listesi ── */}
                                            <div className="max-h-64 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                                                {vectors.length === 0 && recordVectors[rec.id] !== undefined && (
                                                    <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                                                        <Network size={16} strokeWidth={1.5} />
                                                        <span className="text-[12px]">ChromaDB'de eşleşen vektör bulunamadı.</span>
                                                    </div>
                                                )}
                                                {vectors.length === 0 && recordVectors[rec.id] === undefined && (
                                                    <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                                                        <div className="w-3.5 h-3.5 border-2 border-[#A01B1B]/30 border-t-[#A01B1B] rounded-full animate-spin" />
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
                                                                    className="flex items-center gap-2.5 px-6 py-2.5 cursor-pointer border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                                                >
                                                                    <ChevronRight size={12} className={`text-slate-400 transition-transform duration-150 ${open ? 'rotate-90' : ''}`} />
                                                                    <Layers size={12} className={open ? 'text-[#A01B1B]' : 'text-slate-400'} />
                                                                    <span className="text-[12px] font-semibold text-slate-700">Sayfa / Yapı: {page}</span>
                                                                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${open ? 'text-[#A01B1B] bg-red-50 border-[#A01B1B]/20' : 'text-slate-400 bg-slate-100 border-slate-200'}`}>
                                                                        {pVecs.length} düğüm
                                                                    </span>
                                                                </div>

                                                                {/* Düğümler */}
                                                                <AnimatePresence>
                                                                    {open && (
                                                                        <motion.div
                                                                            initial={{ height: 0, opacity: 0 }}
                                                                            animate={{ height: 'auto', opacity: 1 }}
                                                                            exit={{ height: 0, opacity: 0 }}
                                                                            transition={{ duration: 0.15 }}
                                                                            className="overflow-hidden"
                                                                        >
                                                                            {pVecs.map((vector, vIdx) => (
                                                                                <div
                                                                                    key={vector.id}
                                                                                    className={`relative group/v flex items-start gap-3 pl-12 pr-5 py-2.5 border-b border-slate-50 transition-colors
                                                                                        ${deleteConfirm?.id === vector.id ? 'bg-red-50/50' : 'hover:bg-slate-50/80'}`}
                                                                                >
                                                                                    {/* Numara */}
                                                                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border border-slate-200 bg-white text-[9px] font-bold text-slate-400 flex items-center justify-center group-hover/v:border-[#A01B1B]/40 group-hover/v:text-[#A01B1B] transition-colors">
                                                                                        {vIdx + 1}
                                                                                    </div>

                                                                                    {/* İçerik */}
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <div className="flex items-center gap-2 mb-1">
                                                                                            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Nodül</span>
                                                                                            <span className="font-mono text-[9px] text-slate-300 bg-slate-100 px-1 py-0.5 rounded">#{vector.id.substring(vector.id.length - 6)}</span>
                                                                                        </div>
                                                                                        <p className="text-[12px] text-slate-700 leading-relaxed line-clamp-2">{vector.text}</p>
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
                                                                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteVector(rec.id, vector.id); }} className="px-2.5 py-1 bg-[#A01B1B] text-white rounded text-[10px] font-bold">Evet</button>
                                                                                                <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }} className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded text-[10px]">İptal</button>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
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
