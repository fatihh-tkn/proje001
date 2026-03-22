import React, { useEffect, useState, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { Database, Key, Link2 } from 'lucide-react';

export default function SqlSchemaViewer() {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [positions, setPositions] = useState({});
    
    // Arkaplan Panning ve Zoom
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [isDraggingBg, setIsDraggingBg] = useState(false);
    const lastMousePos = useRef({ x: 0, y: 0 });
    const containerRef = useRef(null);

    useEffect(() => {
        const fetchSchema = async () => {
            try {
                const res = await fetch('/api/sql/schema');
                if (res.ok) {
                    const data = await res.json();
                    setTables(data.tables || []);
                    
                    const initialPos = {};
                    data.tables.forEach((t, i) => {
                        const row = Math.floor(i / 4);
                        const col = i % 4;
                        initialPos[t.name] = { x: col * 300 + 50, y: row * 350 + 50 };
                    });
                    setPositions(initialPos);
                }
            } catch (err) {
                console.error("Şema alınamadı:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSchema();
    }, []);

    const handleMouseDown = (e) => {
        if (e.target.closest('.react-draggable')) return;
        setIsDraggingBg(true);
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
        if (!isDraggingBg) return;
        
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        
        setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
        setIsDraggingBg(false);
    };

    const handleWheel = (e) => {
        if (!containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const zoomSensitivity = 0.0015;
        const delta = -e.deltaY * zoomSensitivity;
        
        setZoom(prevZoom => {
            let newZoom = prevZoom + delta;
            if (newZoom < 0.3) newZoom = 0.3;
            if (newZoom > 2.5) newZoom = 2.5;
            
            const zoomRatio = newZoom / prevZoom;
            
            setOffset(prevOffset => ({
                x: mouseX - (mouseX - prevOffset.x) * zoomRatio,
                y: mouseY - (mouseY - prevOffset.y) * zoomRatio
            }));
            
            return newZoom;
        });
    };

    const renderEdges = () => {
        const edges = [];
        tables.forEach(table => {
            table.foreign_keys.forEach(fk => {
                const sourcePos = positions[table.name];
                const targetPos = positions[fk.target_table];
                
                if (sourcePos && targetPos) {
                    const sx = sourcePos.x + 125; 
                    const sy = sourcePos.y + 100; 
                    const tx = targetPos.x + 125;
                    const ty = targetPos.y + 100;
                    
                    edges.push(
                        <g key={`${table.name}-${fk.target_table}-${fk.source_col}`}>
                            <path
                                d={`M ${sx} ${sy} C ${(sx+tx)/2} ${sy}, ${(sx+tx)/2} ${ty}, ${tx} ${ty}`}
                                fill="none"
                                stroke="#b91d2c"
                                strokeWidth="2"
                                strokeOpacity="0.5"
                                markerEnd="url(#arrowhead)"
                                className="transition-all duration-75"
                            />
                        </g>
                    );
                }
            });
        });
        return edges;
    };

    if (loading) {
        return <div className="p-8 text-slate-500">Şema Yükleniyor...</div>;
    }

    return (
        <div 
            ref={containerRef}
            className={`w-full h-full bg-[#f8f9fa] overflow-hidden relative ${isDraggingBg ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
        >
            {/* Zoom Oranı Göstergesi (Geçici Float) */}
            <div className="absolute top-4 left-4 z-20 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-slate-200 text-[11px] font-bold text-slate-500 shadow-sm pointer-events-none">
                {Math.round(zoom * 100)}%
            </div>

            {/* Sonsuz Canvas Katmanı */}
            <div 
                className="w-full h-full origin-top-left"
                style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
            >
                {/* Arkaplan SVG Ok Yüzeyi */}
                <svg className="absolute top-0 left-0 w-[5000px] h-[5000px] pointer-events-none z-0 overflow-visible">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#b91d2c" opacity="0.8" />
                        </marker>
                    </defs>
                    {renderEdges()}
                </svg>

                {tables.map(table => (
                    <Rnd
                        key={table.name}
                        position={positions[table.name]}
                        scale={zoom}
                        onDrag={(e, data) => {
                            setPositions(prev => ({
                                ...prev,
                                [table.name]: { x: data.x, y: data.y }
                            }));
                        }}
                        enableResizing={false}
                        className="z-10 shadow-lg border border-slate-200/60 rounded-xl overflow-hidden bg-white/95 backdrop-blur-sm react-draggable"
                        style={{ width: '250px' }}
                    >
                        <div className="bg-[#b91d2c] px-3 py-2 flex items-center justify-between text-white w-full cursor-move">
                            <div className="flex items-center gap-2 pointer-events-none">
                                <Database size={13} className="opacity-80" />
                                <span className="text-[12px] font-bold tracking-wide">{table.name}</span>
                            </div>
                        </div>
                        <div className="p-0 max-h-[300px] overflow-y-auto cursor-default pointer-events-auto">
                            <table className="w-full text-left border-collapse">
                                <tbody>
                                    {table.columns.map(col => {
                                        const isFk = table.foreign_keys.some(fk => fk.source_col === col.name);
                                        return (
                                            <tr key={col.name} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${col.primary_key ? 'bg-amber-50/30' : ''}`}>
                                                <td className="px-3 py-1.5 w-max">
                                                    <div className="flex items-center gap-1.5">
                                                        {col.primary_key && <Key size={10} className="text-amber-500" />}
                                                        {isFk && <Link2 size={10} className="text-[#b91d2c]" />}
                                                        <span className={`text-[11px] font-medium ${col.primary_key ? 'text-amber-700' : (isFk ? 'text-[#b91d2c]' : 'text-slate-700')}`}>
                                                            {col.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-1.5 text-right">
                                                    <span className="text-[10px] text-slate-400 uppercase tracking-tight">{col.type.split('(')[0]}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Rnd>
                ))}
            </div>
        </div>
    );
}
