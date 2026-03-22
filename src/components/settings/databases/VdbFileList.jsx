import React from 'react';
import { File as FileIcon, ChevronRight, Trash2 } from 'lucide-react';

const VdbFileList = ({ filesToRender, selectedFileId, handleFileSelect, handleDeleteFile, searchTerm }) => (
    <div className="w-1/3 min-w-[200px] border-r border-slate-200 bg-white flex flex-col h-full overflow-hidden shrink-0">
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 font-semibold text-[11px] tracking-wide text-slate-600 uppercase shrink-0 sticky top-0 z-10 flex justify-between">
            <span>Yüklenen Dosyalar</span>
            {searchTerm && <span className="text-[#b91d2c] lowercase normal-case">filtre var</span>}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {filesToRender.map(f => {
                const isSelected = selectedFileId === f.id;
                const isDimmed = searchTerm && f.matchCount === 0;
                return (
                    <button
                        key={f.id}
                        onClick={() => handleFileSelect(f)}
                        className={`group w-full text-left px-3 py-2 rounded-lg text-[12px] flex items-center justify-between transition-colors relative
                            ${isSelected ? 'bg-[#b91d2c] text-white font-medium' : 'text-slate-700 hover:bg-slate-100'}
                            ${isDimmed && !isSelected ? 'opacity-40' : ''}
                        `}
                    >
                        <div className="flex items-center gap-2 truncate pr-2">
                            <FileIcon size={14} className={isSelected ? 'text-white' : 'text-slate-400'} />
                            <span className="truncate">{f.file}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {searchTerm !== '' && !isSelected && f.matchCount > 0 && (
                                <span className="text-[10px] font-mono shrink-0 px-1 text-slate-500 bg-slate-200 rounded">{f.matchCount}</span>
                            )}
                            {isSelected && <ChevronRight size={14} className="shrink-0 opacity-80" />}
                            <div
                                className="absolute right-8 p-1 bg-white rounded text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all border border-slate-200 shadow-sm"
                                onClick={(e) => handleDeleteFile(f.file, f.id, e)}
                            >
                                <Trash2 size={12} />
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    </div>
);

export default VdbFileList;
