import React from 'react';
import { File as FileIcon, ChevronRight, Trash2, Layers } from 'lucide-react';

const VdbFileList = ({ filesToRender, selectedFileId, handleFileSelect, handleDeleteFile, searchTerm }) => (
    <div className="w-1/3 min-w-[200px] border-r border-stone-100 bg-stone-50 flex flex-col h-full overflow-hidden shrink-0">
        <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-2 shrink-0">
            <Layers size={13} className="text-stone-400" />
            <span className="text-[9px] font-black text-stone-400 uppercase tracking-[0.18em]">Yüklenen Dosyalar</span>
            <span className="ml-auto text-[10px] font-black text-stone-400 font-mono">{filesToRender.length}</span>
            {searchTerm && (
                <span className="text-[9px] font-black text-[#378ADD] bg-[#E6F1FB] border border-[#B8D4F0] px-1.5 py-0.5 rounded">Filtre</span>
            )}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5
            [&::-webkit-scrollbar]:w-1
            [&::-webkit-scrollbar-track]:bg-transparent
            [&::-webkit-scrollbar-thumb]:bg-stone-300
            hover:[&::-webkit-scrollbar-thumb]:bg-stone-400">
            {filesToRender.map(f => {
                const isSelected = selectedFileId === f.id;
                const isDimmed = searchTerm && f.matchCount === 0;
                return (
                    <button
                        key={f.id}
                        onClick={() => handleFileSelect(f)}
                        className={`group w-full text-left px-3 py-2 rounded-lg text-[12px] flex items-center justify-between transition-all relative
                            ${isSelected
                                ? 'bg-[#E6F1FB] text-[#378ADD] font-black border border-[#B8D4F0]'
                                : 'text-stone-600 hover:bg-white hover:shadow-sm border border-transparent font-medium'}
                            ${isDimmed && !isSelected ? 'opacity-30' : ''}
                        `}
                    >
                        <div className="flex items-center gap-2 truncate pr-2">
                            <FileIcon size={13} className={isSelected ? 'text-[#378ADD] shrink-0' : 'text-stone-400 shrink-0'} />
                            <span className="truncate">{f.file}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {searchTerm !== '' && !isSelected && f.matchCount > 0 && (
                                <span className="text-[9px] font-black font-mono shrink-0 px-1.5 py-0.5 text-[#378ADD] bg-[#E6F1FB] border border-[#B8D4F0] rounded">
                                    {f.matchCount}
                                </span>
                            )}
                            {isSelected && <ChevronRight size={13} className="shrink-0 text-[#378ADD]" />}
                            <div
                                className="absolute right-8 p-1 bg-white rounded-lg text-stone-400 opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 transition-all border border-stone-200 shadow-sm"
                                onClick={(e) => handleDeleteFile(f.file, f.id, e)}
                            >
                                <Trash2 size={11} />
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    </div>
);

export default VdbFileList;
