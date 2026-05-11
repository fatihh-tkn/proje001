import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Network, RefreshCw, X, Plus, Minus, Crosshair } from 'lucide-react';
import ForceGraph3D from 'react-force-graph-3d';

const MEDIA_EXTS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'mp4', 'avi', 'mov', 'webm']);

// Kamera matrisi sütunlarından sağ/yukarı vektör — pan uygula
function applyCameraPan(fg, dx, dy) {
    try {
        const camera   = fg.camera();
        const controls = fg.controls();
        if (!camera || !controls) return;
        const e    = camera.matrixWorld.elements;
        const dist = camera.position.length() || 200;
        const step = dist * 0.06;
        const mx = (e[0]*dx + e[4]*dy) * step;
        const my = (e[1]*dx + e[5]*dy) * step;
        const mz = (e[2]*dx + e[6]*dy) * step;
        camera.position.x += mx; camera.position.y += my; camera.position.z += mz;
        controls.target.x += mx; controls.target.y += my; controls.target.z += mz;
        controls.update();
    } catch (_) {}
}

function applyCameraZoom(fg, direction) {
    try {
        const p = fg.cameraPosition();
        const dist = Math.hypot(p.x, p.y, p.z) || 300;
        const factor  = direction > 0 ? 0.75 : 1.33;
        const newDist = Math.max(30, Math.min(dist * factor, 2000));
        const ratio   = newDist / dist;
        fg.cameraPosition({ x: p.x*ratio, y: p.y*ratio, z: p.z*ratio }, null, 250);
    } catch (_) {}
}

function doCameraReset(fg) {
    try {
        const controls = fg.controls();
        if (controls) { controls.target.set(0,0,0); controls.update(); }
        fg.cameraPosition({ x:0, y:0, z:350 }, { x:0, y:0, z:0 }, 500);
    } catch (_) {}
}

const DBtn = ({ onClick, children, title }) => (
    <button
        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
        onClick={e => { e.stopPropagation(); onClick(); }}
        title={title}
        className="w-8 h-8 flex items-center justify-center bg-white border border-stone-200 hover:border-[#378ADD] hover:text-[#378ADD] text-stone-500 rounded-lg shadow-sm transition-all active:scale-95"
    >
        {children}
    </button>
);

const GraphDatabaseViewer = () => {
    const [graphData, setGraphData]       = useState({ nodes: [], links: [] });
    const [rawGraphData, setRawGraphData] = useState({ nodes: [], links: [] });
    const [filterType, setFilterType]     = useState('all');
    const [loading, setLoading]           = useState(true);

    const [selectedNode, setSelectedNode]     = useState(null);
    const [highlightNodes, setHighlightNodes] = useState(new Set());
    const [highlightLinks, setHighlightLinks] = useState(new Set());

    const fgRef          = useRef();
    const isHoveredRef   = useRef(false);
    const wheelSetupRef  = useRef(false);   // kurulum bir kez yapılsın
    const wheelCleanRef  = useRef(null);    // önceki listener'ı temizle

    const isMedia = useCallback((type) => MEDIA_EXTS.has((type || '').toLowerCase()), []);

    // ── Klavye ok tuşları (sadece imleç grafın üzerindeyken) ──────────
    useEffect(() => {
        const map = { ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,1], ArrowDown:[0,-1] };
        const h = (e) => {
            if (!isHoveredRef.current || !fgRef.current || !map[e.key]) return;
            e.preventDefault();
            const [dx, dy] = map[e.key];
            applyCameraPan(fgRef.current, dx, dy);
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, []);

    // ── İmlece doğru zoom: wheel'i kanvasa doğrudan bağla ────────────
    // Three.js col-major matrixWorld: col0=sağ col1=yukarı col2=-ileri
    // İmleç NDC'si → kamera uzayı → dünya uzayı → kamera + target'ı kaydır
    const setupWheelZoom = useCallback(() => {
        if (wheelSetupRef.current || !fgRef.current) return;
        try {
            const renderer = fgRef.current.renderer();
            const controls = fgRef.current.controls();
            const camera   = fgRef.current.camera();
            if (!renderer || !controls || !camera) return;

            controls.enableZoom = false; // OrbitControls zoom'unu kapat, kendimiz yönetiriz

            const canvas = renderer.domElement;

            const onWheel = (e) => {
                e.preventDefault();
                e.stopPropagation();

                const rect   = canvas.getBoundingClientRect();
                // Fare NDC [-1,+1]
                const mx = ((e.clientX - rect.left) / rect.width)  *  2 - 1;
                const my = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

                // Kamera perspektif parametreleri
                const fovTan = Math.tan((camera.fov || 75) * (Math.PI / 360));
                const aspect = camera.aspect || 1;

                // Kamera uzayında yön: (mx*fovTan*aspect, my*fovTan, -1)
                // Dünya uzayına çevir: matrixWorld * yön (col-major, w=0)
                const em = camera.matrixWorld.elements;
                const cdx = mx * fovTan * aspect;
                const cdy = my * fovTan;
                // col0*cdx + col1*cdy + col2*(-1)
                let wx = em[0]*cdx + em[4]*cdy - em[8];
                let wy = em[1]*cdx + em[5]*cdy - em[9];
                let wz = em[2]*cdx + em[6]*cdy - em[10];
                const wl = Math.hypot(wx, wy, wz) || 1;
                wx /= wl; wy /= wl; wz /= wl;

                const cp   = camera.position;
                const ct   = controls.target;
                const dist = Math.hypot(cp.x-ct.x, cp.y-ct.y, cp.z-ct.z);
                const safe = Math.max(30, Math.min(dist, 2000));

                // deltaMode: 0=piksel 1=satır 2=sayfa — normalize et
                let dy = e.deltaY;
                if (e.deltaMode === 1) dy *= 20;
                if (e.deltaMode === 2) dy *= 400;

                const zoomDir = dy > 0 ? -1 : 1; // tekerlek yukarı → yakınlaştır
                const amount  = safe * 0.18 * zoomDir;

                // Kamerayı imleç yönünde taşı
                cp.x += wx*amount; cp.y += wy*amount; cp.z += wz*amount;
                // Hedefi de bir miktar taşı — orbit merkezi de kaymalı
                ct.x += wx*amount*0.25; ct.y += wy*amount*0.25; ct.z += wz*amount*0.25;

                controls.update();
            };

            canvas.addEventListener('wheel', onWheel, { passive: false });
            wheelCleanRef.current  = () => canvas.removeEventListener('wheel', onWheel);
            wheelSetupRef.current  = true;
        } catch (_) {}
    }, []);

    // graphData değişince (filtre / yenile) kurulumu sıfırla
    useEffect(() => {
        wheelSetupRef.current = false;
        if (wheelCleanRef.current) { wheelCleanRef.current(); wheelCleanRef.current = null; }
    }, [graphData]);

    // Unmount temizliği
    useEffect(() => () => { if (wheelCleanRef.current) wheelCleanRef.current(); }, []);

    const fetchGraph = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/sql/graph');
            if (res.ok) {
                const data     = await res.json();
                const degreeMap = {};
                const validIds  = new Set(data.nodes.map(n => n.id));
                const validEdges = data.edges.filter(e => validIds.has(e.source) && validIds.has(e.target));
                validEdges.forEach(e => {
                    degreeMap[e.source] = (degreeMap[e.source]||0) + 1;
                    degreeMap[e.target] = (degreeMap[e.target]||0) + 1;
                });
                const gData = {
                    nodes: data.nodes.map(n => {
                        const len    = n.content ? n.content.length : 0;
                        const degree = degreeMap[n.id] || 0;
                        let sizeVal  = 1.0;
                        if (len > 0) {
                            sizeVal = 1 + (Math.log2(len+10) - 3.3) * 0.35;
                            sizeVal = Math.max(1.0, Math.min(sizeVal, 4.0));
                        }
                        if (degree > 4) sizeVal += Math.min(1.0, degree*0.08);
                        return { ...n, val: sizeVal, degree };
                    }),
                    links: validEdges.map(e => ({
                        source: e.source, target: e.target,
                        weight: e.weight||1, name: e.relation
                    }))
                };
                setRawGraphData(gData);
                clearSelection();
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchGraph(); }, []);

    useEffect(() => {
        if (!rawGraphData.nodes.length) { setGraphData({ nodes:[], links:[] }); return; }
        if (filterType === 'all') { setGraphData(rawGraphData); return; }
        const checkMedia = (t) => MEDIA_EXTS.has((t||'').toLowerCase());
        const filteredNodes = rawGraphData.nodes.filter(n =>
            filterType === 'media' ? checkMedia(n.file_type) : !checkMedia(n.file_type)
        );
        const nodeIds = new Set(filteredNodes.map(n => n.id));
        const filteredLinks = rawGraphData.links.filter(l => {
            const sId = typeof l.source==='object' ? l.source.id : l.source;
            const tId = typeof l.target==='object' ? l.target.id : l.target;
            return nodeIds.has(sId) && nodeIds.has(tId);
        });
        setGraphData({ nodes: filteredNodes, links: filteredLinks });
        clearSelection();
    }, [filterType, rawGraphData]);

    const clearSelection = useCallback(() => {
        setSelectedNode(null); setHighlightNodes(new Set()); setHighlightLinks(new Set());
    }, []);

    const handleNodeClick = useCallback((node) => {
        if (!node) { clearSelection(); return; }
        const linkedNodes = new Set(); const connectedLinks = new Set();
        graphData.links.forEach(link => {
            const sId = typeof link.source==='object' ? link.source.id : link.source;
            const tId = typeof link.target==='object' ? link.target.id : link.target;
            if (sId===node.id || tId===node.id) {
                connectedLinks.add(link); linkedNodes.add(sId); linkedNodes.add(tId);
            }
        });
        setHighlightNodes(linkedNodes); setHighlightLinks(connectedLinks); setSelectedNode(node);
    }, [graphData.links, clearSelection]);

    useEffect(() => {
        if (!fgRef.current || typeof fgRef.current.d3Force!=='function' || !graphData.nodes.length) return;
        try {
            fgRef.current.d3Force('charge').strength(n => -200 - ((n.degree||1)*15));
            fgRef.current.d3Force('link').distance(()=>60).strength(0.5);
            const cf = fgRef.current.d3Force('center');
            if (cf) cf.strength(0.05);
            fgRef.current.d3ReheatSimulation();
        } catch (_) {}
    }, [graphData]);

    const hasGraph = !loading && graphData.nodes.length > 0;

    return (
        <div className="flex flex-col w-full h-full bg-white relative overflow-hidden font-sans">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-stone-100 bg-white shrink-0 z-20">
                <div className="p-1.5 bg-[#E6F1FB] border border-[#B8D4F0] rounded-lg shrink-0">
                    <Network size={14} className="text-[#378ADD]" />
                </div>
                <div>
                    <h2 className="text-[13px] font-black text-stone-800 leading-none">Graf Veritabanı</h2>
                    <p className="text-[10px] text-stone-400 mt-0.5 tracking-wide">
                        Sol tık: döndür · Sağ tık / ← → ↑ ↓: kaydır · Tekerlek: imlece yakınlaştır
                    </p>
                </div>

                <div className="ml-auto flex items-center gap-2">
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        className="text-[11px] font-black text-stone-600 bg-white px-2.5 py-1.5 rounded-lg border border-stone-200 focus:outline-none focus:border-[#378ADD] shadow-sm appearance-none cursor-pointer"
                    >
                        <option value="all">Tümü</option>
                        <option value="text">Sadece Metinler</option>
                        <option value="media">Sadece Ses & Video</option>
                    </select>

                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-100 border border-stone-200 rounded-lg">
                        <span className="text-[10px] font-black font-mono text-stone-500">
                            {graphData.nodes?.length||0} node · {graphData.links?.length||0} edge
                        </span>
                    </div>

                    <button onClick={fetchGraph} className="p-1.5 bg-white border border-stone-200 hover:bg-stone-50 rounded-lg transition-colors shadow-sm" title="Yenile">
                        <RefreshCw size={13} className={`text-stone-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#EAF3DE] border border-[#C5DFA8] rounded-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3B6D11] shadow-[0_0_4px_rgba(59,109,17,0.5)] inline-block" />
                        <span className="text-[10px] text-[#3B6D11] font-black tracking-wide">Bağlı</span>
                    </div>
                </div>
            </div>

            {/* Graf Alanı */}
            <div
                className="flex-1 relative overflow-hidden bg-stone-50"
                onMouseEnter={() => { isHoveredRef.current = true; }}
                onMouseLeave={() => { isHoveredRef.current = false; }}
            >
                {loading ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                        <div className="w-7 h-7 border-[2.5px] border-[#378ADD] border-t-transparent rounded-full animate-spin" />
                        <span className="text-[11px] font-black text-stone-500 uppercase tracking-[0.18em]">Graf Yükleniyor...</span>
                    </div>
                ) : graphData.nodes.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                        <div className="p-4 bg-stone-100 border border-stone-200 rounded-xl">
                            <Network size={28} className="text-stone-300" />
                        </div>
                        <p className="text-[12px] font-black text-stone-400 uppercase tracking-[0.14em]">Graf Verisi Yok</p>
                        <p className="text-[11px] text-stone-400 font-medium">Henüz hiç dosya yüklenmemiş.</p>
                    </div>
                ) : (
                    <ForceGraph3D
                        ref={fgRef}
                        graphData={graphData}
                        nodeLabel="content"
                        nodeVal="val"
                        nodeResolution={12}
                        nodeOpacity={1}
                        nodeColor={node => {
                            const def = isMedia(node.file_type) ? '#6366F1' : '#378ADD';
                            if (highlightNodes.size === 0) return def;
                            if (selectedNode && node.id === selectedNode.id) return '#10B981';
                            if (highlightNodes.has(node.id)) return def;
                            return 'rgba(200,200,210,0.08)';
                        }}
                        linkWidth={link => highlightLinks.has(link) ? 2 : 0.8}
                        linkColor={link => {
                            if (highlightNodes.size === 0) return 'rgba(148,163,184,0.35)';
                            if (highlightLinks.has(link)) return '#F59E0B';
                            return 'rgba(226,232,240,0.04)';
                        }}
                        linkDirectionalParticles={link => highlightLinks.has(link) ? 3 : 0}
                        linkDirectionalParticleWidth={1.5}
                        onNodeClick={handleNodeClick}
                        onBackgroundClick={clearSelection}
                        onEngineTick={setupWheelZoom}
                        backgroundColor="#f8f7f6"
                        nodeRelSize={4}
                        warmupTicks={300}
                        cooldownTicks={0}
                    />
                )}

                {hasGraph && (
                    <div className="absolute bottom-5 right-5 z-30 flex flex-col items-center gap-1.5 select-none">
                        <DBtn onClick={() => applyCameraZoom(fgRef.current, 1)} title="Yakınlaştır">
                            <Plus size={13} />
                        </DBtn>
                        <DBtn onClick={() => doCameraReset(fgRef.current)} title="Merkeze al">
                            <Crosshair size={12} />
                        </DBtn>
                        <DBtn onClick={() => applyCameraZoom(fgRef.current, -1)} title="Uzaklaştır">
                            <Minus size={13} />
                        </DBtn>
                    </div>
                )}
            </div>

            {selectedNode && (
                <div className="absolute left-5 bottom-5 z-30 bg-white border border-stone-200 shadow-xl rounded-xl p-4 flex flex-col gap-3" style={{ width: 300 }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1 px-1.5 bg-[#E6F1FB] border border-[#B8D4F0] rounded-md">
                                <span className="text-[9px] font-black tracking-[0.12em] text-[#378ADD] uppercase">Odak</span>
                            </div>
                            <h3 className="text-[12px] font-black text-stone-800 uppercase tracking-wide truncate max-w-[140px]">
                                {selectedNode.file_type || 'Metin'}
                            </h3>
                        </div>
                        <button onClick={clearSelection} className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors">
                            <X size={13} />
                        </button>
                    </div>
                    <div className="space-y-2.5">
                        <div>
                            <span className="text-[9px] font-black text-stone-400 uppercase tracking-[0.18em] block mb-1">Doküman</span>
                            <span className="text-[11px] text-[#378ADD] font-black bg-[#E6F1FB] border border-[#B8D4F0] px-1.5 py-0.5 rounded inline-block truncate max-w-full font-mono">
                                {selectedNode.document_id}
                            </span>
                        </div>
                        {selectedNode.location && (
                            <div>
                                <span className="text-[9px] font-black text-stone-400 uppercase tracking-[0.18em] block mb-1">Konum</span>
                                <span className="text-[11px] text-stone-600 font-black bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded font-mono">
                                    {selectedNode.location}
                                </span>
                            </div>
                        )}
                        <div>
                            <span className="text-[9px] font-black text-stone-400 uppercase tracking-[0.18em] block mb-1">İçerik</span>
                            <p className="text-[11px] text-stone-700 font-medium leading-relaxed line-clamp-4 border-l-2 border-[#378ADD] pl-2">
                                {selectedNode.content || 'İçerik yok'}
                            </p>
                        </div>
                        <div className="pt-2 border-t border-stone-100">
                            <span className="text-[10px] font-medium text-stone-400">
                                <strong className="text-[#378ADD] font-black">{highlightLinks.size}</strong> bağlantı
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GraphDatabaseViewer;
