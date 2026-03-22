import React from 'react';
import {
    Database, FileText, Zap, Search, RefreshCw,
    Trash2, AlertTriangle, AlignLeft, Layers,
    ChevronDown, ChevronRight, CornerDownRight, X
} from 'lucide-react';

const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

const SkeletonRow = () => (
    <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr_40px] items-center px-5 py-3.5 border-b border-slate-100 animate-pulse">
        {[['w-40', 'mr-2'], ['w-20'], ['w-14'], ['w-24'], []].map(([w, extra], i) =>
            w ? <div key={i} className={`h-2.5 bg-slate-200 rounded ${w} ${extra || ''}`} /> : <div key={i} />
        )}
    </div>
);

const DatabaseMemoryTable = ({
    records, filteredRecords, dbLoading, search, setSearch,
    expandedRecord, toggleRecordExpansion,
    recordVectors, expandedPages, togglePageExpansion,
    deleteConfirm, setDeleteConfirm,
    handleDeleteRecord, handleDeleteVector,
    fetchRecords
}) => {
    return (
        <div className="flex flex-col flex-1 min-h-0">
            <div className="px-5 py-2 border-b border-slate-200 flex items-center gap-2 shrink-0 bg-slate-50/60">
                <Zap size={12} className="text-[#A01B1B]" />
                <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Aktif Hafıza / Veritabanı</span>

                <div className="ml-3 relative flex-1 max-w-xs">
                    <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Dosya ara..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-7 pr-3 py-1 text-[11px] bg-white border border-slate-200 rounded-lg
                            focus:outline-none focus:border-[#A01B1B] focus:ring-1 focus:ring-red-100
                            placeholder:text-slate-300 text-slate-700 transition-all"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X size={10} />
                        </button>
                    )}
                </div>

                <span className="ml-auto text-[10px] text-slate-400">
                    {search ? `${filteredRecords.length} / ${records.length}` : `${records.length}`} kayıt
                </span>
            </div>

            {/* Tablo başlıkları */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr_40px] items-center px-5 py-2 border-b border-slate-100 bg-slate-50 shrink-0">
                {['Dosya Adı', 'Durum', 'Parça Sayısı', 'Eklenme Tarihi', ''].map(h => (
                    <span key={h} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</span>
                ))}
            </div>

            {/* Satırlar */}
            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">
                {dbLoading && <>{[1, 2, 3].map(i => <SkeletonRow key={i} />)}</>}

                {!dbLoading && filteredRecords.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 py-8">
                        <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl">
                            <Database size={24} className="text-slate-300" />
                        </div>
                        <div className="text-center">
                            <p className="text-[12px] font-medium text-slate-500">
                                {search ? `"${search}" için sonuç bulunamadı` : 'Henüz indekslenmiş dosya yok'}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                {search ? 'Farklı bir arama terimi deneyin' : 'Dosya yükleyip onaylayarak başlayın'}
                            </p>
                        </div>
                    </div>
                )}

                {!dbLoading && filteredRecords.map((rec, i) => (
                    <div key={rec.id} className="border-b border-slate-100">
                        <div
                            onClick={() => toggleRecordExpansion(rec)}
                            className={`grid grid-cols-[2fr_1fr_1fr_1.5fr_40px] items-center px-5 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                        >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                                <FileText size={13} className="text-[#A01B1B] shrink-0" />
                                <span className="text-[12px] text-slate-700 truncate font-medium">{rec.file}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)] inline-block shrink-0" />
                                <span className="text-[11px] text-emerald-600 font-semibold">İndekslendi</span>
                            </div>
                            <span className="text-[12px] text-slate-600">{rec.chunks} Parça</span>
                            <span className="text-[11px] text-slate-400">{fmtDate(rec.date)}</span>
                            <div className="relative flex items-center justify-end">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'record', id: rec.id }); }}
                                    className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-300 transition-all"
                                    title="Tüm Dosyayı Sil"
                                >
                                    <Trash2 size={13} />
                                </button>

                                {deleteConfirm?.type === 'record' && deleteConfirm?.id === rec.id && (
                                    <div className="absolute right-full mr-2 z-50 flex items-center gap-2 bg-white border border-red-200 shadow-[0_4px_12px_rgba(0,0,0,0.1)] rounded-lg p-2 animate-in fade-in slide-in-from-right-2" onClick={e => e.stopPropagation()}>
                                        <AlertTriangle size={14} className="text-red-500 shrink-0" />
                                        <span className="text-[11px] font-medium text-slate-700 whitespace-nowrap">Kalıcı olarak silinecek. Emin misiniz?</span>
                                        <button onClick={() => handleDeleteRecord(rec)} className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-[10px] font-bold transition-colors ml-1 border border-red-100">Evet, Sil</button>
                                        <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded text-[10px] font-medium transition-colors border border-slate-200">İptal</button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {expandedRecord === rec.id && (
                            <div className="bg-slate-50/50 border-t border-slate-100 py-1.5 shadow-inner">
                                <div className="flex flex-col gap-0.5 px-5">
                                    {(() => {
                                        const vectors = recordVectors[rec.id] || [];
                                        if (vectors.length === 0 && recordVectors[rec.id]) {
                                            return <p className="text-[11px] text-slate-400 italic py-2 pl-4">Detaylarına ulaşılabilecek vektör verisi bulunamadı.</p>;
                                        }
                                        const groupedByPage = vectors.reduce((acc, v) => {
                                            const p = v.page || 'Bilinmeyen';
                                            if (!acc[p]) acc[p] = [];
                                            acc[p].push(v);
                                            return acc;
                                        }, {});

                                        return Object.entries(groupedByPage).map(([page, pageVectors]) => {
                                            const isPageExpanded = expandedPages[page];
                                            return (
                                                <div key={`page-${page}`} className="flex flex-col">
                                                    <div onClick={() => togglePageExpansion(page)} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-100/80 rounded-sm cursor-pointer transition-colors ml-4">
                                                        {isPageExpanded ? <ChevronDown size={11} className="text-slate-400" /> : <ChevronRight size={11} className="text-slate-400" />}
                                                        <Layers size={11} className="text-slate-500" />
                                                        <span className="text-[11px] font-medium text-slate-600">Sayfa {page}</span>
                                                        <span className="text-[9px] text-slate-400 font-medium bg-white border border-slate-200 px-1 rounded">{pageVectors.length} parça</span>
                                                    </div>

                                                    {isPageExpanded && (
                                                        <div className="flex flex-col gap-0.5 ml-11 my-0.5 border-l border-slate-200/50 pl-2 animate-in slide-in-from-left-2 fade-in duration-200">
                                                            {pageVectors.map((vector, vIdx) => (
                                                                <div key={vector.id} className="relative group/vector flex items-center">
                                                                    <div className={`flex items-center gap-1.5 px-3 py-1 border rounded-sm cursor-help transition-all duration-200 z-10 w-max ${deleteConfirm?.id === vector.id ? 'bg-white shadow-sm border-slate-200' : 'border-transparent hover:border-slate-200 hover:bg-white hover:shadow-sm'}`}>
                                                                        <AlignLeft size={10} className="text-slate-400 group-hover/vector:text-[#A01B1B] transition-colors" />
                                                                        <span className="text-[10px] text-slate-600 group-hover/vector:text-slate-800">Parça #{vIdx + 1}</span>

                                                                        <div className="relative flex items-center">
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'vector', id: vector.id, recId: rec.id }); }}
                                                                                className={`ml-2 text-slate-400 hover:text-red-500 hover:bg-red-50 p-0.5 rounded transition-all shrink-0 ${deleteConfirm?.id === vector.id ? 'opacity-100 bg-red-50 text-red-500' : 'opacity-0 group-hover/vector:opacity-100'}`}
                                                                                title="Vektörü Sil"
                                                                            >
                                                                                <Trash2 size={10} />
                                                                            </button>

                                                                            {deleteConfirm?.type === 'vector' && deleteConfirm?.id === vector.id && (
                                                                                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-[70] flex items-center gap-2 bg-white border border-red-200 shadow-lg rounded-lg p-1.5 animate-in fade-in slide-in-from-left-2" onClick={e => e.stopPropagation()}>
                                                                                    <AlertTriangle size={12} className="text-red-500 shrink-0" />
                                                                                    <span className="text-[10px] font-medium text-slate-700 whitespace-nowrap">Silinecek?</span>
                                                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteVector(rec.id, vector.id); }} className="px-2 py-0.5 bg-red-50 text-red-600 hover:bg-red-100 rounded text-[10px] font-bold transition-colors ml-1 border border-red-100">Evet</button>
                                                                                    <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }} className="px-2 py-0.5 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded text-[10px] font-medium transition-colors border border-slate-200">İptal</button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className={`absolute top-full left-[25px] mt-1 w-max max-w-[600px] min-w-[250px] max-h-[110px] flex flex-col bg-white border border-slate-200 text-slate-700 rounded-xl opacity-0 invisible group-hover/vector:opacity-100 group-hover/vector:visible transition-all duration-300 origin-top-left transform scale-95 group-hover/vector:scale-100 shadow-[0_10px_25px_rgba(0,0,0,0.08)] z-[60] pointer-events-auto overflow-hidden text-left ${deleteConfirm?.id === vector.id ? 'hidden' : ''}`}>
                                                                        <div className="absolute -top-[7px] left-[15px] w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-transparent border-b-slate-200"></div>
                                                                        <div className="absolute -top-[6px] left-[15px] w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-transparent border-b-white"></div>
                                                                        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5 px-3 pt-3 shrink-0 gap-4">
                                                                            <span className="text-[10px] font-bold text-slate-500">Vektör ID: <span className="text-slate-700 font-mono font-medium">{vector.id}</span></span>
                                                                            <span className="text-[9px] text-slate-500 bg-slate-50 border border-slate-100 font-medium px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                                                                                <CornerDownRight size={8} /> x:{vector.x}, y:{vector.y}
                                                                            </span>
                                                                        </div>
                                                                        <div className="overflow-y-auto px-3 pb-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
                                                                            <p className="text-[11px] leading-relaxed text-slate-600 font-medium whitespace-pre-wrap">{vector.text}</p>
                                                                        </div>
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
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DatabaseMemoryTable;
