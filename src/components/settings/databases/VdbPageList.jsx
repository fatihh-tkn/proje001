import React from 'react';
import { FileText, ChevronRight } from 'lucide-react';

const VdbPageList = ({ pageNumbers, pagesMap, selectedPage, handlePageSelect, searchTerm }) => (
    <div className="w-[28%] min-w-[150px] border-r border-slate-200 bg-slate-50 flex flex-col h-full overflow-hidden shrink-0">
        <div className="px-4 py-2 bg-slate-100/80 border-b border-slate-200 font-semibold text-[11px] tracking-wide text-slate-600 uppercase shrink-0 sticky top-0 z-10 flex justify-between">
            <span>Sayfalar</span>
            <span className="opacity-50 font-mono normal-case tracking-normal">{pageNumbers.length} Sayfa</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {pageNumbers.map(pageNum => {
                const isSelected = selectedPage === pageNum;
                const chunkCountForPage = pagesMap[pageNum].length;
                const hasMatch = searchTerm && pagesMap[pageNum].some(v => v.text.toLowerCase().includes(searchTerm.toLowerCase()));
                return (
                    <button
                        key={pageNum}
                        onClick={() => handlePageSelect(pageNum)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[12px] flex items-center justify-between transition-colors
                            ${isSelected ? 'bg-slate-800 text-white font-medium shadow-sm' : 'text-slate-700 hover:bg-slate-200/60'}
                            ${hasMatch && !isSelected ? 'border border-amber-300 bg-amber-50' : ''}
                            ${searchTerm && !hasMatch && !isSelected ? 'opacity-40' : ''}
                        `}
                    >
                        <div className="flex items-center gap-2">
                            <FileText size={14} className={isSelected ? 'text-slate-300' : 'text-[#b91d2c]'} />
                            <span>Sayfa {pageNum}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-slate-700 text-slate-300' : 'bg-white border border-slate-200 text-slate-400'}`}>
                                {chunkCountForPage} parça
                            </span>
                            {isSelected && <ChevronRight size={14} className="shrink-0 opacity-80 text-white" />}
                        </div>
                    </button>
                );
            })}
        </div>
    </div>
);

export default VdbPageList;
