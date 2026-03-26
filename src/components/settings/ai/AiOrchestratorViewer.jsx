import React, { useState, useRef, useCallback } from 'react';
import {
    Brain, Key, Bot, Settings2, Database, MessageSquare,
    MonitorPlay, Plus, Trash2, X, SlidersHorizontal, Layers,
    Server, Wand2, Zap, ZoomIn, ZoomOut, Maximize, Play, Save,
    GitBranch, FileText, CalendarDays
} from 'lucide-react';

const PROVIDERS = [
    { id: 'openai', name: 'OpenAI', icon: '⚡' },
    { id: 'anthropic', name: 'Anthropic', icon: '🧠' },
    { id: 'gemini', name: 'Google Gemini', icon: '✨' },
    { id: 'ollama', name: 'Ollama (Local)', icon: '🦙' },
];

const MODELS_BY_PROVIDER = {
    'openai': ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    'anthropic': ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    'gemini': ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
    'ollama': ['llama3', 'mistral', 'qwen']
};

const NODE_WIDTH = { box: 150, circle: 130, diamond: 130 };
const NODE_HEIGHT = { box: 100, circle: 130, diamond: 130 };

const initialNodes = [
    { id: 'n_input', type: 'input', label: 'Tetikleyici (Girdi)', shape: 'box', x: -400, y: 0, color: 'cyan' },
    { id: 'n_rag_1', type: 'rag', label: 'Toplantı Notları', shape: 'box', x: -150, y: -100, limit: 3, threshold: 1.2, category: 'meetings', color: 'amber' },
    { id: 'n_rag_2', type: 'rag', label: 'Genel Belgeler', shape: 'box', x: -150, y: 100, limit: 5, threshold: 1.6, category: 'documents', color: 'amber' },
    { id: 'agent_1', type: 'agent', label: 'Stratejist Ajan', shape: 'circle', x: 100, y: 0, provider: 'openai', model: 'gpt-4o', temp: 0.7, promptMode: 'auto', prompt: 'Sen uzman bir danışmansın. Belgeleri ve kullanıcı mesajını analiz et.', color: 'indigo' },
    { id: 'logic_1', type: 'logic', label: 'Kalite Kontrol', shape: 'diamond', x: 400, y: 0, condition: 'Cevap Tutarlılığı > %80', color: 'rose' },
    { id: 'agent_2', type: 'agent', label: 'Denetçi Ajan', shape: 'circle', x: 100, y: 250, provider: 'gemini', model: 'gemini-1.5-flash', temp: 0.1, promptMode: 'auto', prompt: 'Bir önceki ajanın ürettiği metni denetle ve onay ver.', color: 'purple' },
    { id: 'n_output', type: 'output', label: 'Kullanıcı Ekranı', shape: 'box', x: 650, y: 0, color: 'emerald' }
];

const initialEdges = [
    { id: 'e1', source: 'n_input', target: 'agent_1', type: 'solid' },
    { id: 'e2', source: 'n_rag_1', target: 'agent_1', type: 'solid' },
    { id: 'e3', source: 'n_rag_2', target: 'agent_1', type: 'solid' },
    { id: 'e4', source: 'agent_1', target: 'logic_1', type: 'solid' },
    { id: 'e5', source: 'logic_1', target: 'n_output', type: 'solid', label: 'Evet (Geçer)' },
    { id: 'e6', source: 'logic_1', target: 'agent_2', type: 'revise', label: 'Hayır (Red)' },
    { id: 'e7', source: 'agent_2', target: 'agent_1', type: 'revise', label: 'Revize Notu' },
];

const AiOrchestratorViewer = () => {
    // Component State
    const [nodes, setNodes] = useState(initialNodes);
    const [edges, setEdges] = useState(initialEdges);
    const [selectedNodeId, setSelectedNodeId] = useState(null);

    // Pan & Zoom Canvas State
    const [pan, setPan] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 - 50 });
    const [scale, setScale] = useState(1);
    const [isPanning, setIsPanning] = useState(false);

    // Drag Node State
    const [draggingNodeId, setDraggingNodeId] = useState(null);

    // --- Node Helpers ---
    const handleUpdateNode = (id, field, value) => {
        setNodes(prev => prev.map(n => {
            if (n.id === id) {
                const updated = { ...n, [field]: value };
                if (field === 'provider' && n.type === 'agent') {
                    updated.model = MODELS_BY_PROVIDER[value]?.[0] || '';
                }
                // When changing to custom prompt mode, seed with variables if empty
                if (field === 'promptMode' && value === 'custom' && !n.prompt.includes('{{')) {
                    updated.prompt = `${n.prompt}\n\n[Sistem Bağlamı]:\n{{context}}\n\n[Kullanıcı Girdisi]:\n{{user_input}}`;
                }
                return updated;
            }
            return n;
        }));
    };

    const handleAddNode = (type, shape, color, label) => {
        const newId = `${type}_${Date.now()}`;
        const baseSettings = {
            id: newId, type, shape, color, label,
            x: -pan.x + window.innerWidth / 2 - 50,
            y: -pan.y + window.innerHeight / 2 - 50,
        };

        let specificSettings = {};
        if (type === 'agent') {
            specificSettings = { provider: 'openai', model: 'gpt-3.5-turbo', temp: 0.7, promptMode: 'auto', prompt: 'Yeni bir zeka birimi...' };
        } else if (type === 'rag') {
            specificSettings = { limit: 5, threshold: 1.6, category: 'all' };
        } else if (type === 'logic') {
            specificSettings = { condition: 'Skor > 7' };
        }

        setNodes(prev => [...prev, { ...baseSettings, ...specificSettings }]);
        setSelectedNodeId(newId);
    };

    const handleRemoveNode = (id) => {
        setNodes(prev => prev.filter(n => n.id !== id));
        if (selectedNodeId === id) setSelectedNodeId(null);
    };

    // --- Pointer Interaction (Drag/Pan) ---
    const handlePointerDown = (e, targetType, nodeId = null) => {
        if (e.button !== 0 && e.button !== 1) return;
        e.stopPropagation();
        e.target.setPointerCapture(e.pointerId);

        if (targetType === 'node') {
            setDraggingNodeId(nodeId);
            setSelectedNodeId(nodeId);
        } else if (targetType === 'canvas' || e.button === 1) {
            setIsPanning(true);
            setSelectedNodeId(null);
        }
    };

    const handlePointerMove = useCallback((e) => {
        const movementX = e.movementX / scale;
        const movementY = e.movementY / scale;

        if (isPanning) {
            setPan(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
        } else if (draggingNodeId) {
            setNodes(prev => prev.map(n => {
                if (n.id === draggingNodeId) {
                    return { ...n, x: n.x + movementX, y: n.y + movementY };
                }
                return n;
            }));
        }
    }, [isPanning, draggingNodeId, scale]);

    const handlePointerUp = useCallback((e) => {
        e.target.releasePointerCapture(e.pointerId);
        setIsPanning(false);
        setDraggingNodeId(null);
    }, []);

    // --- Minimalist Deep Light Theme Styling Maps ---
    const colorMap = {
        cyan: { bg: 'bg-white', badge: 'bg-cyan-50 text-cyan-600 border-cyan-100', text: 'text-slate-700', border: 'border-slate-200', activeRing: 'ring-cyan-100 border-cyan-400', stroke: 'stroke-cyan-400' },
        amber: { bg: 'bg-white', badge: 'bg-amber-50 text-amber-600 border-amber-100', text: 'text-slate-700', border: 'border-slate-200', activeRing: 'ring-amber-100 border-amber-400', stroke: 'stroke-amber-400' },
        indigo: { bg: 'bg-white', badge: 'bg-indigo-50 text-indigo-600 border-indigo-100', text: 'text-slate-800', border: 'border-slate-200', activeRing: 'ring-indigo-100 border-indigo-500', stroke: 'stroke-indigo-400' },
        purple: { bg: 'bg-white', badge: 'bg-purple-50 text-purple-600 border-purple-100', text: 'text-slate-800', border: 'border-slate-200', activeRing: 'ring-purple-100 border-purple-500', stroke: 'stroke-purple-400' },
        emerald: { bg: 'bg-white', badge: 'bg-emerald-50 text-emerald-600 border-emerald-100', text: 'text-slate-700', border: 'border-slate-200', activeRing: 'ring-emerald-100 border-emerald-400', stroke: 'stroke-emerald-400' },
        rose: { bg: 'bg-white', badge: 'bg-rose-50 text-rose-600 border-rose-100', text: 'text-slate-800', border: 'border-slate-200', activeRing: 'ring-rose-100 border-rose-500', stroke: 'stroke-rose-400' },
    };

    const getIcon = (type) => {
        if (type === 'input') return <MessageSquare size={18} />;
        if (type === 'rag') return <Database size={18} />;
        if (type === 'agent') return <Brain size={24} />;
        if (type === 'logic') return <GitBranch size={20} />;
        if (type === 'output') return <MonitorPlay size={18} />;
        return <Box size={18} />;
    };

    // --- SVG Paths calculation ---
    const renderEdges = () => {
        return edges.map(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;

            const sWidth = NODE_WIDTH[sourceNode.shape];
            const sHeight = NODE_HEIGHT[sourceNode.shape];
            const tWidth = NODE_WIDTH[targetNode.shape];
            const tHeight = NODE_HEIGHT[targetNode.shape];

            let pathD = '';
            let sColor = colorMap[sourceNode.color].stroke;

            if (edge.type === 'revise') {
                // Feedback Loop: Bottom Center or Top Center
                const x1 = sourceNode.x + sWidth / 2;
                const y1 = sourceNode.y + sHeight;
                const x2 = targetNode.x + tWidth / 2;
                const y2 = targetNode.y + tHeight;

                const arcHeight = Math.max(y1, y2) + 100; // Curve downwards below nodes
                pathD = `M ${x1} ${y1} C ${x1} ${arcHeight}, ${x2} ${arcHeight}, ${x2} ${y2}`;

                return (
                    <g key={edge.id}>
                        <path d={pathD} fill="none" className="stroke-rose-200" strokeWidth="3" />
                        <path d={pathD} fill="none" className="stroke-rose-400 animate-[dash_15s_linear_infinite]" strokeWidth="2" strokeDasharray="6 6" />
                        <circle cx={x1} cy={y1} r="4" className="fill-white border-2 border-rose-400" />
                        {edge.label && (
                            <foreignObject x={(x1 + x2) / 2 - 50} y={arcHeight - 12} width="100" height="25">
                                <div className="bg-rose-50 text-rose-600 border border-rose-200 text-[9px] font-bold text-center py-0.5 rounded-full shadow-sm">
                                    {edge.label}
                                </div>
                            </foreignObject>
                        )}
                    </g>
                );
            } else {
                // Forward Path: Right Center to Left Center
                const x1 = sourceNode.x + sWidth;
                const y1 = sourceNode.y + sHeight / 2;
                const x2 = targetNode.x;
                const y2 = targetNode.y + tHeight / 2;

                const deltaX = Math.abs(x2 - x1);
                const controlX = x1 + Math.max(deltaX / 2, 50);
                pathD = `M ${x1} ${y1} C ${controlX} ${y1}, ${controlX} ${y2}, ${x2} ${y2}`;

                return (
                    <g key={edge.id}>
                        <path d={pathD} fill="none" className="stroke-slate-200/80" strokeWidth="3" />
                        <path d={pathD} fill="none" className={`${sColor} animate-[flowDash_2.5s_linear_infinite] opacity-60`} strokeWidth="3" strokeDasharray="10 30" />
                        <circle cx={x1} cy={y1} r="4" className={`fill-white border-2 border-slate-300`} />
                        <circle cx={x2} cy={y2} r="4" className="fill-slate-100 border border-slate-300" />
                        {edge.label && (
                            <foreignObject x={(x1 + x2) / 2 - 40} y={(y1 + y2) / 2 - 25} width="80" height="25">
                                <div className="bg-white text-slate-500 border border-slate-200 text-[9px] font-bold text-center py-0.5 rounded-full shadow-sm">
                                    {edge.label}
                                </div>
                            </foreignObject>
                        )}
                    </g>
                );
            }
        });
    };

    const selectedNode = nodes.find(n => n.id === selectedNodeId);

    // Render the shape content based on type
    const renderShapeContent = (node, cTheme) => {
        if (node.shape === 'diamond') {
            return (
                <div className="w-full h-full relative flex items-center justify-center">
                    {/* The Diamond Background */}
                    <div className={`absolute w-24 h-24 bg-white/90 backdrop-blur-md border rotate-45 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300
                         ${cTheme.border} ${selectedNodeId === node.id ? `ring-4 ${cTheme.activeRing} shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] scale-105` : `hover:border-slate-300`}
                    `}></div>

                    {/* The Content (Not Rotated) */}
                    <div className="relative z-10 flex flex-col items-center justify-center gap-1.5">
                        <div className={`flex items-center justify-center p-2 rounded-xl bg-white border ${cTheme.badge}`}>
                            {getIcon(node.type)}
                        </div>
                        <span className="text-[10px] font-bold tracking-wide text-center leading-tight text-slate-700 max-w-[80px]">
                            {node.label}
                        </span>
                    </div>

                    {/* Ports */}
                    <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-slate-100 rounded-full border border-slate-300 shadow-sm pointer-events-none" />
                    <div className={`absolute left-[-10px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full border border-rose-300 shadow-sm pointer-events-none`} />
                    <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-rose-50 rounded-full border border-rose-300 shadow-sm pointer-events-none" />
                </div>
            );
        }

        // Box & Circle Content
        return (
            <div className={`w-full h-full bg-white/90 backdrop-blur-md flex flex-col items-center justify-center gap-2 relative transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]
                ${cTheme.text} ${selectedNodeId === node.id ? `ring-4 ${cTheme.activeRing} shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] scale-[1.03]` : `border border-slate-200 hover:border-slate-300`}
                ${node.shape === 'circle' ? 'rounded-full' : 'rounded-2xl'}
            `}>
                <div className={`flex items-center justify-center border ${node.shape === 'circle' ? `w-14 h-14 rounded-full ${cTheme.badge}` : `p-2 rounded-xl mb-1 ${cTheme.badge}`}`}>
                    {getIcon(node.type)}
                </div>

                <span className="text-xs font-bold tracking-wide text-center px-3 leading-tight text-slate-700">
                    {node.label}
                </span>

                {node.type === 'agent' && (
                    <span className="text-[9px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full mt-1 border border-slate-100">
                        {node.model}
                    </span>
                )}
                {node.type === 'rag' && (
                    <span className="text-[9px] font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full mt-1 border border-amber-100 flex items-center gap-1">
                        {node.category === 'meetings' ? <CalendarDays size={10} /> : node.category === 'documents' ? <FileText size={10} /> : <Layers size={10} />}
                        {node.category === 'meetings' ? 'Toplantılar' : node.category === 'documents' ? 'Belgeler' : 'Tümü'}
                    </span>
                )}

                {/* Standard Ports */}
                {node.type !== 'output' && <div className="absolute right-[-7px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-slate-100 rounded-full border border-slate-300 shadow-sm pointer-events-none" />}
                {node.type !== 'input' && node.type !== 'rag' && <div className={`absolute left-[-7px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full border border-[${cTheme.stroke.split('-')[1]}] shadow-sm pointer-events-none`} />}

                {/* Extra Loop Port for Agent Bottom */}
                {node.type === 'agent' && <div className="absolute bottom-[-7px] left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full border border-rose-300 shadow-sm pointer-events-none" />}
            </div>
        );
    };

    return (
        <div className="h-full w-full bg-[#FCFCFD] text-slate-800 flex overflow-hidden font-sans relative selection:bg-indigo-100">
            <style jsx>{`
                @keyframes flowDash { to { stroke-dashoffset: -40; } }
                @keyframes dash { to { stroke-dashoffset: -40; } }
                .minimal-grid {
                    background-image: radial-gradient(#d1d5db 1px, transparent 1px);
                    background-size: 24px 24px;
                }
            `}</style>

            {/* CANVAS */}
            <div
                className={`absolute inset-0 z-0 minimal-grid ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
                onPointerDown={(e) => handlePointerDown(e, 'canvas')}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                style={{ backgroundPosition: `${pan.x}px ${pan.y}px` }}
            >
                <div
                    className="absolute inset-0 origin-top-left pointer-events-none"
                    style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
                >
                    <svg className="absolute inset-0 overflow-visible z-10">
                        {renderEdges()}
                    </svg>

                    {nodes.map(node => (
                        <div
                            key={node.id}
                            onPointerDown={(e) => handlePointerDown(e, 'node', node.id)}
                            className={`absolute pointer-events-auto cursor-grab active:cursor-grabbing select-none hover:z-30 transition-none
                                ${selectedNodeId === node.id ? 'z-40' : 'z-20'}
                            `}
                            style={{ left: node.x, top: node.y, width: NODE_WIDTH[node.shape], height: NODE_HEIGHT[node.shape] }}
                        >
                            {renderShapeContent(node, colorMap[node.color])}
                        </div>
                    ))}
                </div>
            </div>

            {/* HEADER */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center justify-between pointer-events-none">
                <div className="pointer-events-auto bg-white/80 backdrop-blur-xl border border-slate-200/60 px-6 py-3 rounded-2xl shadow-sm flex items-center gap-8 text-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100">
                            <Layers size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black tracking-widest uppercase text-slate-800">Agentic OS</h2>
                            <p className="text-[10px] text-slate-400 font-mono">Kernel v2.5 - Logic Studio</p>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-slate-200" />
                    <div className="flex items-center gap-2">
                        <button className="h-9 px-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-600 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm">
                            <Play size={14} className="fill-current" /> Çalıştır
                        </button>
                        <button className="h-9 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm">
                            <Save size={14} /> Kaydet
                        </button>
                    </div>
                </div>
            </div>

            {/* LEFT TOOLBOX */}
            <div className="absolute left-6 top-1/2 -translate-y-1/2 z-[100] pointer-events-none">
                <div className="pointer-events-auto w-[72px] bg-white/90 backdrop-blur-xl border border-slate-200 rounded-3xl p-3 flex flex-col items-center gap-4 shadow-lg pb-5 pt-5">

                    <button onClick={() => handleAddNode('input', 'box', 'cyan', 'Yeni Girdi')} className="w-12 h-12 bg-white hover:bg-cyan-50 border border-slate-200 text-slate-500 hover:text-cyan-600 rounded-xl flex flex-col items-center justify-center transition-all group relative shadow-sm hover:border-cyan-200">
                        <MessageSquare size={18} /><Plus size={12} className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 text-cyan-500 bg-white rounded-full" />
                    </button>

                    <button onClick={() => handleAddNode('rag', 'box', 'amber', 'Veritabanı')} className="w-12 h-12 bg-white hover:bg-amber-50 border border-slate-200 text-slate-500 hover:text-amber-600 rounded-xl flex flex-col items-center justify-center transition-all group relative shadow-sm hover:border-amber-200">
                        <Database size={18} /><Plus size={12} className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 text-amber-500 bg-white rounded-full" />
                    </button>

                    <button onClick={() => handleAddNode('agent', 'circle', 'indigo', 'Yeni Zeka')} className="w-12 h-12 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 rounded-full flex flex-col items-center justify-center transition-all group relative shadow-sm">
                        <Brain size={18} /><Plus size={12} className="absolute -top-0 -right-0 opacity-0 group-hover:opacity-100 text-indigo-600 bg-white rounded-full" />
                    </button>

                    {/* NEW LOGIC NODE */}
                    <button onClick={() => handleAddNode('logic', 'diamond', 'rose', 'Karar Köprüsü')} className="w-12 h-12 bg-white hover:bg-rose-50 border border-slate-200 text-slate-500 hover:text-rose-600 rounded-xl flex flex-col items-center justify-center transition-all group relative shadow-sm hover:border-rose-200 rotate-45 mt-2 mb-2">
                        <div className="-rotate-45 flex items-center justify-center"><GitBranch size={16} /></div>
                        <Plus size={12} className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 text-rose-500 bg-white rounded-full -rotate-45" />
                    </button>

                    <button onClick={() => handleAddNode('output', 'box', 'emerald', 'Yeni Çıktı')} className="w-12 h-12 bg-white hover:bg-emerald-50 border border-slate-200 text-slate-500 hover:text-emerald-600 rounded-xl flex flex-col items-center justify-center transition-all group relative shadow-sm hover:border-emerald-200">
                        <MonitorPlay size={18} /><Plus size={12} className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 text-emerald-500 bg-white rounded-full" />
                    </button>

                    <div className="mt-2 pt-4 border-t border-slate-200 w-full flex flex-col gap-3">
                        <button onClick={() => setScale(s => Math.min(s + 0.1, 2))} className="text-slate-400 hover:text-slate-700 flex justify-center"><ZoomIn size={16} /></button>
                        <button onClick={() => setPan({ x: window.innerWidth / 2, y: window.innerHeight / 2 - 50 })} className="text-slate-400 hover:text-slate-700 flex justify-center"><Maximize size={16} /></button>
                        <button onClick={() => setScale(s => Math.max(s - 0.1, 0.5))} className="text-slate-400 hover:text-slate-700 flex justify-center"><ZoomOut size={16} /></button>
                    </div>
                </div>
            </div>

            {/* RIGHT SLIDE-OVER INSPECTOR */}
            <div className={`absolute right-0 top-0 bottom-0 w-[420px] bg-white/95 backdrop-blur-2xl border-l border-slate-200 z-[100] transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] shadow-[-30px_0_40px_rgba(0,0,0,0.03)] flex flex-col overscroll-contain
                ${selectedNode ? 'translate-x-0' : 'translate-x-full'}`
            }
            >
                {selectedNode && (
                    <>
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl bg-${selectedNode.color}-50 text-${selectedNode.color}-600 border border-${selectedNode.color}-100`}>
                                    {getIcon(selectedNode.type)}
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-800">{selectedNode.label}</h3>
                                    <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Tür: {selectedNode.type}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedNodeId(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar relative">

                            {/* General Setting - Name */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-2">Düğüm Tanımı</label>
                                <input
                                    type="text"
                                    value={selectedNode.label}
                                    onChange={(e) => handleUpdateNode(selectedNode.id, 'label', e.target.value)}
                                    className="w-full bg-white border border-slate-200 text-slate-800 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all shadow-sm"
                                />
                            </div>

                            {/* AGENT LOGIC */}
                            {selectedNode.type === 'agent' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Server size={12} /> API Sağlayıcı</label>
                                            <select
                                                value={selectedNode.provider}
                                                onChange={(e) => handleUpdateNode(selectedNode.id, 'provider', e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-indigo-400 cursor-pointer shadow-sm appearance-none"
                                            >
                                                {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Brain size={12} /> Akıl Modeli</label>
                                            <select
                                                value={selectedNode.model}
                                                onChange={(e) => handleUpdateNode(selectedNode.id, 'model', e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 text-indigo-600 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-indigo-400 cursor-pointer shadow-sm appearance-none"
                                            >
                                                {MODELS_BY_PROVIDER[selectedNode.provider]?.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* PROMPT MODE TOGGLE */}
                                    <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 flex text-xs font-bold">
                                        <button
                                            onClick={() => handleUpdateNode(selectedNode.id, 'promptMode', 'auto')}
                                            className={`flex-1 py-2 rounded-lg transition-all ${selectedNode.promptMode === 'auto' ? 'bg-white shadow-sm text-indigo-600 border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Otomatik Mod
                                        </button>
                                        <button
                                            onClick={() => handleUpdateNode(selectedNode.id, 'promptMode', 'custom')}
                                            className={`flex-1 py-2 rounded-lg transition-all ${selectedNode.promptMode === 'custom' ? 'bg-white shadow-sm text-indigo-600 border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Kalıp (Şablon) Modu
                                        </button>
                                    </div>

                                    <div>
                                        <label className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-2">
                                            <span>{selectedNode.promptMode === 'auto' ? 'Sistem Görevi (Statik)' : 'Değişkenli Kalıp (Dynamic)'}</span>
                                            <Wand2 size={12} className="text-indigo-400" />
                                        </label>

                                        {selectedNode.promptMode === 'custom' && (
                                            <div className="flex gap-2 mb-3">
                                                <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-500 px-2 py-1 rounded-md font-mono cursor-pointer hover:bg-indigo-50 hover:text-indigo-600 transition-colors">{'{{context}}'}</span>
                                                <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-500 px-2 py-1 rounded-md font-mono cursor-pointer hover:bg-indigo-50 hover:text-indigo-600 transition-colors">{'{{user_input}}'}</span>
                                            </div>
                                        )}

                                        <textarea
                                            value={selectedNode.prompt}
                                            onChange={(e) => handleUpdateNode(selectedNode.id, 'prompt', e.target.value)}
                                            placeholder={selectedNode.promptMode === 'auto' ? "Örn: Sen uzman bir danışmansın..." : "Sana şu kaynaklar verildi: {{context}}..."}
                                            className="w-full bg-white border border-slate-200 text-slate-600 text-sm leading-relaxed rounded-xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 min-h-[160px] resize-y shadow-sm font-mono"
                                        />

                                        {selectedNode.promptMode === 'auto' && (
                                            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                                                * Otomatik modda, veritabanından çekilen kaynaklar ve kullanıcı sorusu ajanın talimatının sonuna sistem tarafından <b>otomatik olarak</b> eklenir. Şablon yazmanıza gerek yoktur.
                                            </p>
                                        )}
                                    </div>

                                </div>
                            )}

                            {/* RAG DB LOGIC */}
                            {selectedNode.type === 'rag' && (
                                <div className="space-y-6">
                                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-amber-700 text-xs leading-relaxed">
                                        Vektörel (Semantic) arama düğümü. Seçtiğiniz kategoriye göre sadece ilgili metinleri süzerek ajanlara bilgi akışı sağlar.
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">Veri Nereden Çekilsin?</label>
                                        <select
                                            value={selectedNode.category || 'all'}
                                            onChange={(e) => handleUpdateNode(selectedNode.id, 'category', e.target.value)}
                                            className="w-full bg-white border border-slate-200 text-amber-600 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:border-amber-400 cursor-pointer shadow-sm appearance-none"
                                        >
                                            <option value="all">📁 Tüm Veritabanı (Hepsi)</option>
                                            <option value="meetings">🗓️ Toplantı Notları</option>
                                            <option value="documents">📄 Resmi Belgeler & Raporlar</option>
                                        </select>
                                    </div>

                                    <div className="space-y-6 pt-4 border-t border-slate-100">
                                        <div>
                                            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-2">
                                                <span>Sayfa Limiti (K Limit)</span>
                                                <span className="text-amber-600 font-bold">{selectedNode.limit} Blok Metin</span>
                                            </div>
                                            <input type="range" min="1" max="10" value={selectedNode.limit} onChange={(e) => handleUpdateNode(selectedNode.id, 'limit', parseInt(e.target.value))} className="w-full accent-amber-500 cursor-pointer" />
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-2">
                                                <span>Alakasızlık Filtresi (Threshold)</span>
                                                <span className="text-amber-600 font-bold">{'<'} {selectedNode.threshold} Mesafe</span>
                                            </div>
                                            <input type="range" min="0.5" max="2.0" step="0.1" value={selectedNode.threshold} onChange={(e) => handleUpdateNode(selectedNode.id, 'threshold', parseFloat(e.target.value))} className="w-full accent-amber-500 cursor-pointer" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* LOGIC IF/CONDITION NODE */}
                            {selectedNode.type === 'logic' && (
                                <div className="space-y-6">
                                    <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 text-rose-700 text-xs leading-relaxed">
                                        Bu düğüm gelen veriyi inceler ve verdiğiniz koşula göre <b>Geçer (True)</b> veya <b>Reddedilir (False)</b> olarak iki farklı yola ayrılır.
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-2">Karar Koşulu (Kural)</label>
                                        <input
                                            type="text"
                                            value={selectedNode.condition}
                                            onChange={(e) => handleUpdateNode(selectedNode.id, 'condition', e.target.value)}
                                            placeholder="Örn: Kalite Skoru > 8"
                                            className="w-full bg-white border border-slate-200 text-slate-800 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-50 transition-all shadow-sm"
                                        />
                                        <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                                            Ajanın ürettiği metinde bu kural aranır (Örn JSON içerisindeki 'skor' değeri okunur).
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Delete Node */}
                            <div className="pt-8 mt-auto border-t border-slate-100">
                                <button
                                    onClick={() => handleRemoveNode(selectedNode.id)}
                                    className="w-full py-3 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-500 text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <Trash2 size={14} /> Düğümü Sil
                                </button>
                            </div>

                        </div>
                    </>
                )}
            </div>

        </div>
    );
};

export default AiOrchestratorViewer;
