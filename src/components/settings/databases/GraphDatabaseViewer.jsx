import React, { useEffect, useState, useRef } from 'react';
import { Network, RefreshCw, ZoomIn, ZoomOut, Maximize, Loader2, Info, X } from 'lucide-react';

const GraphDatabaseViewer = () => {
    const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
    const [loading, setLoading] = useState(true);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [selectedNode, setSelectedNode] = useState(null);
    const [nodePositions, setNodePositions] = useState({});

    const fetchGraph = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/sql/graph');
            if (res.ok) {
                const data = await res.json();
                setGraphData(data);
                
                // Basit bir çember (circular) yerleşimi hesapla
                const width = 2000;
                const height = 2000;
                const cx = width / 2;
                const cy = height / 2;
                const radius = 400;
                const newPos = {};
                
                const nb = data.nodes.length;
                data.nodes.forEach((node, i) => {
                    const angle = (2 * Math.PI * i) / nb;
                    newPos[node.id] = {
                        x: cx + radius * Math.cos(angle) + (Math.random() * 50 - 25),
                        y: cy + radius * Math.sin(angle) + (Math.random() * 50 - 25),
                    };
                });
                
                // Sadece küçük bir force layout iterasyonu (relax) - 10 step
                for (let k = 0; k < 10; k++) {
                    data.edges.forEach(edge => {
                        const s = newPos[edge.source];
                        const t = newPos[edge.target];
                        if(!s || !t) return;
                        const dx = t.x - s.x;
                        const dy = t.y - s.y;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        if(dist > 0) {
                            const force = (dist - 150) * 0.1;
                            const fx = (dx / dist) * force;
                            const fy = (dy / dist) * force;
                            s.x += fx; s.y += fy;
                            t.x -= fx; t.y -= fy;
                        }
                    });
                }
                
                setNodePositions(newPos);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGraph();
    }, []);

    const zoomIn = () => setScale(s => Math.min(s + 0.2, 3));
    const zoomOut = () => setScale(s => Math.max(s - 0.2, 0.3));
    const resetZoom = () => { setScale(1); setOffset({ x: 0, y: 0 }); };

    const handleWheel = (e) => {
        e.preventDefault();
        setScale(s => {
            const newScale = s - e.deltaY * 0.001;
            return Math.min(Math.max(newScale, 0.2), 4);
        });
    };

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };

    const handleMouseUp = () => setIsDragging(false);

    return (
        <div className="flex flex-col w-full h-full bg-slate-50 relative overflow-hidden font-sans pb-4">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200 bg-white shrink-0 shadow-sm z-20">
                <div className="p-1.5 bg-purple-50 border border-purple-200 rounded-lg">
                    <Network size={15} className="text-purple-600" />
                </div>
                <div>
                    <h2 className="text-[13px] font-bold text-slate-800 leading-none">İlişkisel Veritabanı Modeli</h2>
                    <p className="text-[10px] text-slate-400 mt-0.5">Düğümler ve İlişkiler (Graph) Görünümü</p>
                </div>
                
                <div className="ml-auto flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                        {graphData.nodes.length} Node, {graphData.edges.length} Edge
                    </span>
                    <button onClick={fetchGraph} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200">
                        <RefreshCw size={13} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Graph Area */}
            <div className="flex-1 relative overflow-hidden" 
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-50">
                        <Loader2 size={32} className="text-purple-500 animate-spin" />
                    </div>
                ) : (
                    <div 
                        className="absolute w-full h-full cursor-grab active:cursor-grabbing origin-top-left flex items-center justify-center transform-gpu"
                        style={{
                            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                        }}
                    >
                        <svg className="w-[2000px] h-[2000px] overflow-visible absolute pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
                            {graphData.edges.map((e, index) => {
                                const source = nodePositions[e.source];
                                const target = nodePositions[e.target];
                                if (!source || !target) return null;
                                return (
                                    <line
                                        key={e.id || index}
                                        x1={source.x} y1={source.y}
                                        x2={target.x} y2={target.y}
                                        stroke="#cbd5e1"
                                        strokeWidth={Math.max(1, e.weight * 1.5)}
                                        className="transition-all duration-300"
                                    />
                                );
                            })}
                        </svg>

                        <div className="w-[2000px] h-[2000px] absolute pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
                            {graphData.nodes.map(n => {
                                const pos = nodePositions[n.id];
                                if (!pos) return null;
                                const isSelected = selectedNode?.id === n.id;
                                return (
                                    <div
                                        key={n.id}
                                        onClick={(e) => { e.stopPropagation(); setSelectedNode(n); }}
                                        className={`absolute flex flex-col items-center justify-center transition-all duration-300 cursor-pointer w-10 h-10 rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto
                                            ${isSelected ? 'bg-purple-500 border-white shadow-[0_0_0_4px_#a855f7]' : 'bg-white border-purple-400 hover:border-purple-600 hover:scale-125 shadow-md'}
                                        `}
                                        style={{ left: pos.x, top: pos.y }}
                                        title={n.content}
                                    >
                                        <div className={`w-3 h-3 rounded-full ${isSelected ? 'bg-white' : 'bg-purple-300'}`} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="absolute right-6 bottom-6 flex flex-col gap-2 z-30">
                <button onClick={zoomIn} className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors text-slate-600"><ZoomIn size={16} /></button>
                <button onClick={resetZoom} className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors text-slate-600"><Maximize size={16} /></button>
                <button onClick={zoomOut} className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors text-slate-600"><ZoomOut size={16} /></button>
            </div>

            {/* Selected Node Panel */}
            {selectedNode && (
                <div className="absolute left-6 bottom-6 w-80 bg-white border border-slate-200 shadow-xl rounded-xl p-4 z-30 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Info size={14} className="text-purple-500" />
                            <h3 className="text-[12px] font-bold text-slate-700 uppercase tracking-wide">Düğüm Detayı</h3>
                        </div>
                        <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                    </div>
                    <div className="space-y-2">
                        <div>
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest block mb-0.5">ID:</span>
                            <span className="text-[11px] text-slate-800 font-mono bg-slate-100 px-1 py-0.5 rounded">{selectedNode.id}</span>
                        </div>
                        <div>
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest block mb-0.5">Doküman:</span>
                            <span className="text-[11px] text-slate-700 bg-blue-50 text-blue-700 px-1 py-0.5 rounded inline-block truncate max-w-full">{selectedNode.document_id}</span>
                        </div>
                        <div>
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest block mb-0.5">Konum (Location):</span>
                            <span className="text-[11px] text-slate-700">{selectedNode.location}</span>
                        </div>
                        <div>
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest block mb-0.5">İçerik Başlangıcı:</span>
                            <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed border-l-2 border-purple-200 pl-2 mt-1">
                                {selectedNode.content || 'İçerik yok'}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GraphDatabaseViewer;
