import React from 'react';
import { FileText, ChevronRight } from 'lucide-react';

const VdbPageList = ({ pageNumbers, pagesMap, selectedPage, handlePageSelect, searchTerm }) => (
    <div className="w-[28%] min-w-[150px] border-r border-stone-100 bg-stone-50 flex flex-col h-full overflow-hidden shrink-0">
        <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-2 shrink-0">
            <FileText size={13} className="text-stone-400" />
            <span className="text-[9px] font-black text-stone-400 uppercase tracking-[0.18em]">Sayfalar</span>
            <span className="ml-auto text-[10px] font-black text-stone-400 font-mono">{pageNumbers.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5
            [&::-webkit-scrollbar]:w-1
            [&::-webkit-scrollbar-track]:bg-transparent
            [&::-webkit-scrollbar-thumb]:bg-stone-300
            hover:[&::-webkit-scrollbar-thumb]:bg-stone-400">
            {pageNumbers.map(pageNum => {
                const isSelected = selectedPage === pageNum;
                const chunkCountForPage = pagesMap[pageNum].length;
                const hasMatch = searchTerm && pagesMap[pageNum].some(v => v.text.toLowerCase().includes(searchTerm.toLowerCase()));
                return (
                    <button
                        key={pageNum}
                        onClick={() => handlePageSelect(pageNum)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[12px] flex items-center justify-between transition-all border
                            ${isSelected
                                ? 'bg-[#E6F1FB] text-[#378ADD] font-black border-[#B8D4F0]'
                                : hasMatch
                                    ? 'bg-amber-50 border-amber-200 text-amber-700 font-medium'
                                    : 'text-stone-600 hover:bg-white hover:shadow-sm border-transparent font-medium'}
                            ${searchTerm && !hasMatch && !isSelected ? 'opacity-30' : ''}
                        `}
                    >
                        <div className="flex items-center gap-2">
                            <FileText size={13} className={isSelected ? 'text-[#378ADD] shrink-0' : hasMatch ? 'text-amber-500 shrink-0' : 'text-stone-400 shrink-0'} />
                            <span>Sayfa {pageNum}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-black font-mono px-1.5 py-0.5 rounded border
                                ${isSelected
                                    ? 'bg-[#378ADD]/10 border-[#B8D4F0] text-[#378ADD]'
                                    : 'bg-white border-stone-200 text-stone-400'}`}>
                                {chunkCountForPage}
                            </span>
                            {isSelected && <ChevronRight size={13} className="shrink-0 text-[#378ADD]" />}
                        </div>
                    </button>
                );
            })}
        </div>
    </div>
);

export default VdbPageList;
