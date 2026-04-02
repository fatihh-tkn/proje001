import React, { useEffect, useState, useRef, Suspense } from 'react';
import { Network, RefreshCw, Loader2, Info, X, Filter } from 'lucide-react';

// Lazy loading kütüphanesi - Sadece bu sekmeye tıklandığında (ve componente mount olduğunda) yüklenir
const ForceGraph3D = React.lazy(() => import('react-force-graph-3d'));

const GraphDatabaseViewer = () => {
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [rawGraphData, setRawGraphData] = useState({ nodes: [], links: [] });
    const [filterType, setFilterType] = useState('all');
    const [loading, setLoading] = useState(true);
    const [selectedNode, setSelectedNode] = useState(null);
    const fgRef = useRef();

    const fetchGraph = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/sql/graph');
            if (res.ok) {
                const data = await res.json();

                const gData = {
                    nodes: data.nodes.map(n => ({ ...n, val: 1 })),
                    links: data.edges.map(e => ({
                        source: e.source,
                        target: e.target,
                        weight: e.weight || 1,
                        name: e.relation
                    }))
                };

                setRawGraphData(gData);
                // graphData will be updated by the filter useEffect
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

    useEffect(() => {
        if (!rawGraphData.nodes.length) {
            setGraphData({ nodes: [], links: [] });
            return;
        }

        if (filterType === 'all') {
            setGraphData(rawGraphData);
            return;
        }

        const isMedia = (type) => ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'mp4', 'avi', 'mov', 'webm'].includes((type || '').toLowerCase());

        const filteredNodes = rawGraphData.nodes.filter(n => {
            if (filterType === 'media') return isMedia(n.file_type);
            if (filterType === 'text') return !isMedia(n.file_type);
            return true;
        });

        const nodeIds = new Set(filteredNodes.map(n => n.id));

        const filteredLinks = rawGraphData.links.filter(l => {
            const sId = typeof l.source === 'object' ? l.source.id : l.source;
            const tId = typeof l.target === 'object' ? l.target.id : l.target;
            return nodeIds.has(sId) && nodeIds.has(tId);
        });

        setGraphData({ nodes: filteredNodes, links: filteredLinks });
    }, [filterType, rawGraphData]);

    const handleNodeClick = (node) => {
        if (fgRef.current) {
            const distance = 60;
            const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

            fgRef.current.cameraPosition(
                { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
                node,
                2000
            );
        }
        setSelectedNode(node);
    };

    return (
        <div className="flex flex-col w-full h-full bg-white relative overflow-hidden font-sans">
            {/* Header — uygulama temasıyla uyumlu */}
            <div className="flex items-center gap-3 px-5 py-2.5 border-b border-slate-200 bg-white shrink-0 z-20">
                <div className="p-1.5 bg-[#A01B1B]/10 border border-[#A01B1B]/20 rounded-lg">
                    <Network size={15} className="text-[#A01B1B]" />
                </div>
                <div>
                    <h2 className="text-[13px] font-bold text-slate-800 leading-none">İlişkisel Veritabanı Modeli (3D Uzay)</h2>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                        Sadece tıklandığında yüklenir (WebGL Hızlandırmalı)
                    </p>
                </div>

                <div className="ml-auto flex items-center gap-2">
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="text-[11px] font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 focus:outline-none focus:border-[#A01B1B] appearance-none"
                    >
                        <option value="all">Tümü (Metin + Medya)</option>
                        <option value="text">Sadece Metinler</option>
                        <option value="media">Sadece Ses & Video</option>
                    </select>

                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                        {graphData.nodes?.length || 0} Node, {graphData.links?.length || 0} Edge
                    </span>
                    <button
                        onClick={fetchGraph}
                        className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                    >
                        <RefreshCw size={13} className={`${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Graph Area */}
            <div className="flex-1 relative overflow-hidden bg-white flex items-center justify-center">
                {loading ? (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-[3px] border-[#A01B1B] border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-semibold text-slate-500 tracking-wide">Graf Yükleniyor...</span>
                    </div>
                ) : (
                    <Suspense fallback={
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-[3px] border-[#A01B1B] border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm text-slate-500 animate-pulse">3D Motor Yükleniyor...</span>
                        </div>
                    }>
                        <ForceGraph3D
                            ref={fgRef}
                            graphData={graphData}
                            nodeLabel="content"
                            nodeColor={node => {
                                if (selectedNode && node.id === selectedNode.id) return '#ff3b3b';
                                const isMedia = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'mp4', 'avi', 'mov', 'webm'].includes((node.file_type || '').toLowerCase());
                                return isMedia ? '#3b82f6' : '#A01B1B';
                            }}
                            linkColor={() => '#fca5a5'}
                            linkWidth={link => Math.max(0.5, link.weight * 0.5)}
                            onNodeClick={handleNodeClick}
                            backgroundColor="#ffffff"
                            nodeRelSize={4}
                            linkDirectionalArrowLength={3.5}
                            linkDirectionalArrowRelPos={1}
                            linkDirectionalArrowColor={() => '#A01B1B'}
                        />
                    </Suspense>
                )}
            </div>

            {/* Selected Node Panel */}
            {selectedNode && (
                <div className="absolute left-6 bottom-6 w-80 bg-white border border-slate-200 shadow-2xl rounded-xl p-4 z-30 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1 bg-[#A01B1B]/10 rounded-md border border-[#A01B1B]/20">
                                <Info size={12} className="text-[#A01B1B]" />
                            </div>
                            <h3 className="text-[12px] font-bold text-slate-800 uppercase tracking-wide">Düğüm Detayı</h3>
                        </div>
                        <button
                            onClick={() => setSelectedNode(null)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1 hover:bg-red-50 rounded-md"
                        >
                            <X size={14} />
                        </button>
                    </div>
                    <div className="space-y-2.5">
                        <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">ID:</span>
                            <span className="text-[11px] text-slate-700 font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">{selectedNode.id}</span>
                        </div>
                        <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Doküman:</span>
                            <span className="text-[11px] text-[#A01B1B] bg-[#A01B1B]/5 border border-[#A01B1B]/20 px-1.5 py-0.5 rounded inline-block truncate max-w-full">{selectedNode.document_id}</span>
                            {selectedNode.file_type && <span className="ml-1 text-[10px] text-slate-400 uppercase">({selectedNode.file_type})</span>}
                        </div>
                        <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Konum (Location):</span>
                            <span className="text-[11px] text-slate-600">{selectedNode.location}</span>
                        </div>
                        <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">İçerik Başlangıcı:</span>
                            <p className="text-[11px] text-slate-500 line-clamp-3 leading-relaxed border-l-2 border-[#A01B1B]/40 pl-2 mt-1">
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
