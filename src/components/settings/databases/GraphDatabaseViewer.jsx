import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Network, RefreshCw, Loader2, Info, X, Pause, Play, Filter } from 'lucide-react';
import ForceGraph3D from 'react-force-graph-3d';

const MEDIA_EXTS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'mp4', 'avi', 'mov', 'webm']);

const GraphDatabaseViewer = () => {
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [rawGraphData, setRawGraphData] = useState({ nodes: [], links: [] });
    const [filterType, setFilterType] = useState('all');
    const [loading, setLoading] = useState(true);

    // Yüksek aydınlıklar için state
    const [selectedNode, setSelectedNode] = useState(null);
    const [highlightNodes, setHighlightNodes] = useState(new Set());
    const [highlightLinks, setHighlightLinks] = useState(new Set());
    const [hoverNode, setHoverNode] = useState(null);

    // Otomatik Döndürme
    const [autoRotate, setAutoRotate] = useState(true);

    const fgRef = useRef();

    // PERFORMANS: Array'i döngü dışına çıkararak garbage collector kasmasını önlüyoruz
    const isMedia = useCallback((type) => MEDIA_EXTS.has((type || '').toLowerCase()), []);

    const fetchGraph = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/sql/graph');
            if (res.ok) {
                const data = await res.json();

                const degreeMap = {};
                const validIds = new Set(data.nodes.map(n => n.id));

                // Sadece geçerli node'lara sahip kenarları al (Aksi takdirde ForceGraph motoru çöker)
                const validEdges = data.edges.filter(e => validIds.has(e.source) && validIds.has(e.target));

                validEdges.forEach(e => {
                    degreeMap[e.source] = (degreeMap[e.source] || 0) + 1;
                    degreeMap[e.target] = (degreeMap[e.target] || 0) + 1;
                });

                const gData = {
                    nodes: data.nodes.map(n => {
                        const len = n.content ? n.content.length : 0;
                        const degree = degreeMap[n.id] || 0;

                        let sizeVal = 1.0;
                        if (len > 0) {
                            sizeVal = 1 + (Math.log2(len + 10) - 3.3) * 0.35;
                            sizeVal = Math.max(1.0, Math.min(sizeVal, 4.0));
                        }

                        if (degree > 4) {
                            sizeVal += Math.min(1.0, degree * 0.08);
                        }

                        return { ...n, val: sizeVal, degree: degree };
                    }),
                    links: validEdges.map(e => ({
                        source: e.source,
                        target: e.target,
                        weight: e.weight || 1,
                        name: e.relation
                    }))
                };

                setRawGraphData(gData);
                // graphData will be updated by the filter useEffect

                // Fetch attiktan sonra secimleri sifirla
                clearSelection();
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

        const checkMedia = (type) => MEDIA_EXTS.has((type || '').toLowerCase());

        const filteredNodes = rawGraphData.nodes.filter(n => {
            if (filterType === 'media') return checkMedia(n.file_type);
            if (filterType === 'text') return !checkMedia(n.file_type);
            return true;
        });

        const nodeIds = new Set(filteredNodes.map(n => n.id));

        const filteredLinks = rawGraphData.links.filter(l => {
            const sId = typeof l.source === 'object' ? l.source.id : l.source;
            const tId = typeof l.target === 'object' ? l.target.id : l.target;
            return nodeIds.has(sId) && nodeIds.has(tId);
        });

        setGraphData({ nodes: filteredNodes, links: filteredLinks });
        clearSelection();
    }, [filterType, rawGraphData]);

    // Seçimleri temizleme
    const clearSelection = useCallback(() => {
        setSelectedNode(null);
        setHighlightNodes(new Set());
        setHighlightLinks(new Set());
    }, []);

    const handleNodeClick = useCallback((node) => {
        if (!node) {
            clearSelection();
            return;
        }

        const linkedNodes = new Set();
        const connectedLinks = new Set();

        graphData.links.forEach(link => {
            const sId = typeof link.source === 'object' ? link.source.id : link.source;
            const tId = typeof link.target === 'object' ? link.target.id : link.target;

            if (sId === node.id || tId === node.id) {
                connectedLinks.add(link);
                linkedNodes.add(sId);
                linkedNodes.add(tId);
            }
        });

        setHighlightNodes(linkedNodes);
        setHighlightLinks(connectedLinks);
        setSelectedNode(node);

        if (fgRef.current) {
            // Sadece otomatik dönüşü durdur, kamerayla oynama (oto-zoom kapalı)
            setAutoRotate(false);
        }
    }, [graphData.links, clearSelection]);

    // Otomatik Döndürme (Kamera Animasyonu)
    useEffect(() => {
        let animationFrameId;

        const rotateCamera = () => {
            try {
                if (autoRotate && fgRef.current && !selectedNode) {
                    const camPos = fgRef.current.cameraPosition();

                    // Güvenlik kontrolü (Graf tam yüklenmeden önce çalışırsa çökmesin)
                    if (camPos && typeof camPos.x === 'number') {
                        const distance = Math.hypot(camPos.x, camPos.z) || 300;
                        const currentAngle = Math.atan2(camPos.z, camPos.x);
                        const nextAngle = currentAngle + 0.0015;

                        fgRef.current.cameraPosition({
                            x: distance * Math.cos(nextAngle),
                            z: distance * Math.sin(nextAngle),
                            y: camPos.y // Y yüksekliği sabit kalır
                        }, null, 0);
                    }
                }
            } catch (err) { }
            animationFrameId = requestAnimationFrame(rotateCamera);
        };

        if (autoRotate && !selectedNode) {
            animationFrameId = requestAnimationFrame(rotateCamera);
        }

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [autoRotate, selectedNode]);

    // Fizik Ayarları
    useEffect(() => {
        if (!fgRef.current || typeof fgRef.current.d3Force !== 'function' || !graphData.nodes.length) return;

        try {
            fgRef.current.d3Force('charge').strength(node => {
                const degree = node.degree || 1;
                return -150 - (degree * 20);
            });

            fgRef.current.d3Force('link').distance(link => {
                const w = link.weight || 1;
                return 80 / w;
            });

            fgRef.current.d3ReheatSimulation();
        } catch (err) { }
    }, [graphData]);

    return (
        <div className="flex flex-col w-full h-full bg-[#fafafa] relative overflow-hidden font-sans">
            <div className="flex items-center gap-3 px-5 py-2.5 border-b border-stone-200 bg-white shrink-0 z-20 shadow-sm">
                <div className="p-1.5 bg-[#378ADD]/10 border border-[#378ADD]/20 rounded-lg">
                    <Network size={15} className="text-[#378ADD]" />
                </div>
                <div>
                    <h2 className="text-[13px] font-bold text-stone-800 leading-none">Ağ İlişki Haritası (Knowledge Graph)</h2>
                    <p className="text-[10px] text-stone-400 mt-0.5">
                        Düğümlere tıklayarak ilişkileri izole edebilir, fare ile haritayı döndürebilirsiniz.
                    </p>
                </div>

                <div className="ml-auto flex items-center gap-2">
                    {/* Auto Rotate Toggle */}
                    <button
                        onClick={() => setAutoRotate(!autoRotate)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors duration-200 border ${autoRotate
                            ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                            : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'
                            }`}
                        title="Otomatik Döndürme (Tüm ağı yavaşça çevirir)"
                    >
                        {autoRotate ? <Pause size={12} className="fill-blue-600" /> : <Play size={12} className="fill-stone-500" />}
                        {autoRotate ? 'Durdur' : 'Döndür'}
                    </button>

                    <span className="w-[1px] h-4 bg-stone-200 mx-1"></span>

                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="text-[11px] font-semibold text-stone-600 bg-stone-50 px-2.5 py-1 rounded-md border border-stone-200 focus:outline-none focus:border-[#378ADD] appearance-none"
                    >
                        <option value="all">Tümü (Metin + Medya)</option>
                        <option value="text">Sadece Metinler</option>
                        <option value="media">Sadece Ses & Video</option>
                    </select>

                    <span className="text-[11px] font-semibold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-md border border-stone-200">
                        {graphData.nodes?.length || 0} Node, {graphData.links?.length || 0} Edge
                    </span>
                    <button
                        onClick={fetchGraph}
                        className="p-1.5 hover:bg-stone-100 text-stone-500 rounded-lg transition-colors border border-transparent hover:border-stone-200"
                    >
                        <RefreshCw size={13} className={`${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-gradient-to-b from-white to-stone-50">
                {loading ? (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-[3px] border-[#378ADD] border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-semibold text-stone-500 tracking-wide">Graf Yükleniyor...</span>
                    </div>
                ) : (
                    <ForceGraph3D
                        ref={fgRef}
                        graphData={graphData}
                        nodeLabel="content"
                        nodeVal="val"
                        nodeResolution={32}

                        // ── NODE OPACITY (Soluklaştırma) ──
                        nodeOpacity={1}
                        nodeColor={node => {
                            const defaultColor = isMedia(node.file_type) ? '#4F46E5' : '#E11D48'; // Indigo & Rose

                            // Hiçbir şey seçili değilse herkes normal
                            if (highlightNodes.size === 0) return defaultColor;

                            // Seçili ana node
                            if (selectedNode && node.id === selectedNode.id) return '#10B981'; // Zümrüt Yeşili (Dikkat Çekici)

                            // Komşu node'lar: ana rengi korur ama biraz dikkat çekebilir
                            if (highlightNodes.has(node.id)) return defaultColor;

                            // İlgisiz düğümler tamamen soluk-gri olur
                            return 'rgba(200, 203, 212, 0.1)';
                        }}

                        // ── LINK OPACITY (Soluklaştırma) ──
                        linkWidth={link => highlightLinks.has(link) ? 2 : 1}
                        linkColor={link => {
                            if (highlightNodes.size === 0) return 'rgba(148, 163, 184, 0.4)'; // Slate-400 yari saydam
                            if (highlightLinks.has(link)) return '#F59E0B'; // Kehribar (Amber) - çok dikkat çekici
                            return 'rgba(226, 232, 240, 0.05)'; // Seçimsizken neredeyse görünmez
                        }}
                        linkDirectionalParticles={link => highlightLinks.has(link) ? 4 : 0}
                        linkDirectionalParticleWidth={1.5}

                        onNodeClick={handleNodeClick}
                        onBackgroundClick={clearSelection}
                        onNodeHover={(node) => setHoverNode(node || null)}
                        backgroundColor="#ffffff"
                        nodeRelSize={4}
                        warmupTicks={100}
                        cooldownTicks={150}
                    />
                )}
            </div>

            {selectedNode && (
                <div className="absolute left-6 bottom-6 w-80 bg-white/95 backdrop-blur-md border border-stone-200 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] rounded-xl p-4 z-30 flex flex-col gap-3 transition-opacity">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1 px-1.5 bg-[#378ADD]/10 rounded-md border border-[#378ADD]/20">
                                <span className="text-[10px] font-black tracking-wide text-[#378ADD]">ODAK</span>
                            </div>
                            <h3 className="text-[12px] font-bold text-stone-800 uppercase tracking-wide truncate max-w-[150px]">{selectedNode.file_type || 'Metin'}</h3>
                        </div>
                        <button
                            onClick={clearSelection}
                            className="text-stone-400 hover:text-red-500 transition-colors p-1 rounded-md"
                        >
                            <X size={14} />
                        </button>
                    </div>
                    <div className="space-y-2.5">
                        <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Doküman:</span>
                            <span className="text-[11px] text-indigo-700 font-semibold bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded inline-block truncate max-w-full">{selectedNode.document_id}</span>
                        </div>
                        {selectedNode.location && (
                            <div>
                                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-0.5">Harita Konumu (Chunk P.):</span>
                                <span className="text-[11px] text-stone-600 bg-stone-50 px-1.5 py-0.5 rounded border border-stone-200">{selectedNode.location}</span>
                            </div>
                        )}
                        <div>
                            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-0.5">Vektörel İçerik:</span>
                            <p className="text-[10.5px] text-stone-700 font-serif leading-relaxed line-clamp-4 border-l-2 border-[#378ADD] pl-2 mt-1">
                                {selectedNode.content || 'İçerik yok'}
                            </p>
                        </div>

                        <div className="pt-2 mt-2 border-t border-stone-100 flex items-center justify-between">
                            <span className="text-[10px] font-medium text-stone-500">
                                Toplam <strong className="text-[#378ADD] font-bold">{highlightLinks.size}</strong> ağ bağlantısı
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GraphDatabaseViewer;
