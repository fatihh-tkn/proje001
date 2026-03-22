import React from 'react';
import { Trash2, Code } from 'lucide-react';

const HighlightWrapper = ({ text = '', highlight = '' }) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    return (
        <span>
            {parts.map((p, i) =>
                p.toLowerCase() === highlight.toLowerCase() ? (
                    <mark key={i} className="bg-yellow-200 text-yellow-900 rounded-[2px] font-bold px-0.5">{p}</mark>
                ) : p
            )}
        </span>
    );
};

const VdbChunkPanel = ({ activeChunks, targetChunkId, chunkRefs, searchTerm, expandedJson, toggleJsonInfo, handleDeleteChunk }) => (
    <div className="flex-1 bg-white flex flex-col h-full overflow-x-hidden overflow-y-auto min-w-[300px]">
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 font-semibold text-[11px] tracking-wide text-slate-600 uppercase shrink-0 sticky top-0 z-10 flex justify-between">
            <span>Bilgi Parçacıkları (Chunks)</span>
        </div>
        <div className="p-4 space-y-4 pb-20">
            {activeChunks.map((chunk, idx) => {
                const isTarget = targetChunkId === chunk.id;
                return (
                    <div
                        key={chunk.id}
                        id={chunk.id}
                        ref={el => chunkRefs.current[chunk.id] = el}
                        style={{ scrollMarginTop: '100px' }}
                        className={`border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group
                            ${isTarget ? 'border-amber-400 ring-4 ring-amber-100 bg-amber-50' : 'border-slate-200 bg-white'}
                        `}
                    >
                        <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${isTarget ? 'bg-amber-500' : 'bg-[#b91d2c]'}`} /> Parça {idx + 1}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-mono text-slate-400 bg-white border border-slate-200 px-1 py-0.5 rounded">ID: {chunk.id.substring(0, 8)}</span>
                                <button
                                    onClick={(e) => handleDeleteChunk(chunk.id, e)}
                                    className="p-1 px-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex items-center gap-1 border border-transparent hover:border-red-100"
                                    title="Bu Chunk'ı Veritabanından Sil"
                                >
                                    <Trash2 size={10} />
                                    <span className="text-[9px] font-semibold invisible group-hover:visible">Sil</span>
                                </button>
                            </div>
                        </div>
                        <div className="p-3">
                            <p className="text-[12px] text-slate-700 leading-relaxed break-words font-mono whitespace-pre-wrap">
                                <HighlightWrapper text={chunk.text} highlight={searchTerm} />
                            </p>
                        </div>
                        <div className="px-3 py-2 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                            <div className="flex gap-3">
                                <span className="font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm">X: {chunk.x}</span>
                                <span className="font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm">Y: {chunk.y}</span>
                            </div>
                            <button
                                onClick={() => toggleJsonInfo(chunk.id)}
                                className="flex items-center gap-1 px-2 py-1 text-slate-500 hover:text-[#b91d2c] hover:bg-red-50 border border-transparent hover:border-red-100 rounded transition-colors font-medium"
                            >
                                <Code size={12} /> {expandedJson[chunk.id] ? 'Detayı Gizle' : 'JSON Detayı'}
                            </button>
                        </div>
                        {expandedJson[chunk.id] && (
                            <div className="border-t border-slate-200 bg-[#0f172a] p-3 animate-in fade-in slide-in-from-top-1">
                                <pre className="text-[10px] text-emerald-400 font-mono overflow-x-auto">
{JSON.stringify({ id: chunk.id, ...chunk.rawMeta, char_length: chunk.text.length }, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
);

export default VdbChunkPanel;
