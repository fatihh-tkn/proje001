import React, { useEffect, useState, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { Database, Key, Link2, Hash, Save, Check } from 'lucide-react';

export default function SqlSchemaViewer() {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [positions, setPositions] = useState({});
    const [draggingTable, setDraggingTable] = useState(null);
    const [isZooming, setIsZooming] = useState(false);
    const [focusedTable, setFocusedTable] = useState(null);
    const zoomTimeout = useRef(null);

    // Düzen kaydetme durumu
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Arkaplan Panning ve Zoom
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [isDraggingBg, setIsDraggingBg] = useState(false);
    const lastMousePos = useRef({ x: 0, y: 0 });
    const containerRef = useRef(null);

    // Tablo boyut sabitleri (Hesaplamalar için)
    const CARD_WIDTH = 260;
    const HEADER_HEIGHT = 44; // Gradient başlık
    const SUBHEADER_HEIGHT = 28; // Sütunlar başlığı
    const ROW_HEIGHT = 36; // Her bir tr yüksekliği yaklaşık olarak
    const ROW_OFFSET = HEADER_HEIGHT + SUBHEADER_HEIGHT; // İlk satırın başladığı nokta

    // Dinamik Nokta Arkaplanı
    const dotBackgroundStyle = {
        backgroundImage: `radial-gradient(circle, #cbd5e1 1.5px, transparent 1px)`,
        backgroundSize: `28px 28px`,
        backgroundPosition: `${offset.x}px ${offset.y}px`
    };

    useEffect(() => {
        const fetchSchema = async () => {
            try {
                const res = await fetch('/api/sql/schema');
                if (res.ok) {
                    const data = await res.json();
                    setTables(data.tables || []);

                    // --- AKILLI HİYERARŞİK DİZİLİM (Topological Leveling) ---
                    const levels = {};

                    const getLevel = (tableName, path = new Set()) => {
                        if (levels[tableName] !== undefined) return levels[tableName];
                        if (path.has(tableName)) return 0; // Döngü koruması

                        path.add(tableName);
                        const tbl = data.tables.find(t => t.name === tableName);

                        // Yabancı anahtarı yoksa KÖK tablodur (Level 0)
                        if (!tbl || !tbl.foreign_keys || tbl.foreign_keys.length === 0) {
                            levels[tableName] = 0;
                            return 0;
                        }

                        // Diğer tablolara bağlıysa, onlardan 1 sağda olmalı
                        let maxLvl = 0;
                        for (const fk of tbl.foreign_keys) {
                            maxLvl = Math.max(maxLvl, getLevel(fk.target_table, path) + 1);
                        }

                        levels[tableName] = maxLvl;
                        path.delete(tableName); // Temizlik
                        return maxLvl;
                    };

                    // Tüm tabloların hiyerarşi seviyelerini hesapla
                    data.tables.forEach(t => getLevel(t.name));

                    // Aynı seviyedekileri aşağıya doğru dizmek için sayaç
                    const levelCounts = {};
                    const initialPos = {};

                    data.tables.forEach(t => {
                        const lvl = levels[t.name] || 0;
                        levelCounts[lvl] = (levelCounts[lvl] || 0) + 1;

                        // X = Seviye * (KartGenişliği + Boşluk)
                        // Y = O seviyedeki kaçıncı kart olduğu * (OrtalamaKartYüksekliği + Boşluk)
                        initialPos[t.name] = {
                            x: (lvl * 400) + 100,
                            y: ((levelCounts[lvl] - 1) * 350) + 100
                        };
                    });

                    // Kaydedilmiş pozisyon var mı kontrol et
                    const savedState = localStorage.getItem('sqlSchemaViewerPositions');
                    if (savedState) {
                        try {
                            const parsedState = JSON.parse(savedState);
                            // Sadece geçerli objeyse yükle
                            if (Object.keys(parsedState).length > 0) {
                                setPositions(parsedState);
                            } else {
                                setPositions(initialPos);
                            }
                        } catch (e) {
                            setPositions(initialPos);
                        }
                    } else {
                        setPositions(initialPos);
                    }
                }
            } catch (err) {
                console.error("Şema alınamadı:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSchema();
    }, []);

    const handleSaveLayout = () => {
        setIsSaving(true);
        // Harita pozisyonlarını tarayıcıya kaydet
        localStorage.setItem('sqlSchemaViewerPositions', JSON.stringify(positions));

        setTimeout(() => {
            setIsSaving(false);
            setSaveSuccess(true);
            setHasChanges(false);
            setTimeout(() => setSaveSuccess(false), 2000); // 2 saniye sonra başarılı mesajını gizle
        }, 600);
    };

    const handleMouseDown = (e) => {
        if (e.target.closest('.react-draggable')) return;
        setIsDraggingBg(true);
        lastMousePos.current = { x: e.clientX, y: e.clientY };

        // Boşluğa tıklanınca odaklanmayı kaldır
        if (focusedTable) setFocusedTable(null);
    };

    const handleMouseMove = (e) => {
        if (!isDraggingBg) return;

        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;

        setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => setIsDraggingBg(false);

    const handleWheel = (e) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomSensitivity = 0.0015;
        const delta = -e.deltaY * zoomSensitivity;

        setIsZooming(true);
        if (zoomTimeout.current) clearTimeout(zoomTimeout.current);
        zoomTimeout.current = setTimeout(() => setIsZooming(false), 1000);

        setZoom(prevZoom => {
            let newZoom = prevZoom + delta;
            if (newZoom < 0.2) newZoom = 0.2;
            if (newZoom > 2.0) newZoom = 2.0;

            const zoomRatio = newZoom / prevZoom;

            setOffset(prevOffset => ({
                x: mouseX - (mouseX - prevOffset.x) * zoomRatio,
                y: mouseY - (mouseY - prevOffset.y) * zoomRatio
            }));

            return newZoom;
        });
    };

    const getColumnOffsetY = (tableName, columnName) => {
        const table = tables.find(t => t.name === tableName);
        if (!table) return ROW_OFFSET;
        const index = table.columns.findIndex(c => c.name === columnName);
        if (index === -1) return ROW_OFFSET;

        // Satirin ortasina denk getirmek için:
        return ROW_OFFSET + (index * ROW_HEIGHT) + (ROW_HEIGHT / 2);
    };

    const isTableRelated = (tableName) => {
        if (!focusedTable) return true;
        if (tableName === focusedTable) return true;

        // Odaklanan tablonun bu tabloya bağı var mı (foreign_key)
        const focusedTblData = tables.find(t => t.name === focusedTable);
        if (focusedTblData && focusedTblData.foreign_keys.some(fk => fk.target_table === tableName)) return true;

        // Bu tablonun odaklanan tabloya bağı var mı
        const thisTblData = tables.find(t => t.name === tableName);
        if (thisTblData && thisTblData.foreign_keys.some(fk => fk.target_table === focusedTable)) return true;

        return false;
    };

    const renderEdges = () => {
        const edges = [];
        tables.forEach(table => {
            table.foreign_keys.forEach(fk => {
                if (draggingTable === table.name || draggingTable === fk.target_table) {
                    return; // OPTIMIZASYON: Taşınan tablonun çizgilerini GİZLE
                }

                const sourcePos = positions[table.name];
                const targetPos = positions[fk.target_table];

                if (sourcePos && targetPos) {
                    // Kaynak Sütun Y Konumu
                    const sourceColY = getColumnOffsetY(table.name, fk.source_col);
                    // Hedef (Hedeflenen Tablodaki PK Sütunu genellikle "id" veya target_col dur)
                    const targetColY = getColumnOffsetY(fk.target_table, fk.target_col || 'id'); // fallback to id usually

                    // Tablonun hangi tarafta olduğuna karar ver ve kenarı (Sağ/Sol) seç
                    const isTargetRight = targetPos.x > sourcePos.x;

                    const sx = sourcePos.x + (isTargetRight ? CARD_WIDTH : 0);
                    const sy = sourcePos.y + sourceColY;

                    const tx = targetPos.x + (isTargetRight ? 0 : CARD_WIDTH);
                    const ty = targetPos.y + targetColY;

                    // Yumuşak S Kıvrımı için Kontrol Noktaları (Cubic Bezier Curve)
                    // İki nokta arasındaki mesafe kadar X kontrol noktasını uzat (daha yumuşak bir eğri yapar)
                    const controlOffset = Math.max(Math.abs(tx - sx) * 0.5, 50);
                    const cx1 = sx + (isTargetRight ? controlOffset : -controlOffset);
                    const cx2 = tx + (isTargetRight ? -controlOffset : controlOffset);

                    // Odaklanma durumu kontrolü (Çizgilerin silinmesi veya kırmızı vurgulanması)
                    const isHighlighted = focusedTable && (table.name === focusedTable || fk.target_table === focusedTable);
                    const isFaded = focusedTable && !isHighlighted;

                    edges.push(
                        <g key={`${table.name}-${fk.target_table}-${fk.source_col}`} className={`group ${isFaded ? 'opacity-5 pointer-events-none' : 'opacity-100'}`}>
                            {/* Geniş ve görünmez bir hover alanı için arka çizgi (kalın) */}
                            <path
                                d={`M ${sx} ${sy} C ${cx1} ${sy}, ${cx2} ${ty}, ${tx} ${ty}`}
                                fill="none"
                                stroke="transparent"
                                strokeWidth="15"
                                className={isFaded ? '' : "cursor-pointer"}
                            />
                            {/* Gerçek Çizgi */}
                            <path
                                d={`M ${sx} ${sy} C ${cx1} ${sy}, ${cx2} ${ty}, ${tx} ${ty}`}
                                fill="none"
                                stroke={isHighlighted ? '#ef4444' : '#94a3b8'} // Vurgulananları Kırmızı yap
                                strokeWidth={isHighlighted ? "3" : "2"}
                                markerEnd={isHighlighted ? "url(#arrowhead-highlight)" : "url(#arrowhead)"}
                                className={`transition-all duration-300 ${isHighlighted ? 'opacity-100 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] z-50' : 'group-hover:stroke-indigo-500 opacity-70 group-hover:opacity-100 drop-shadow-sm group-hover:drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]'}`}
                            />
                        </g>
                    );
                }
            });
        });
        return edges;
    };

    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-semibold text-slate-600 tracking-wide">Mühendislik Mimari Çiziliyor...</span>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`w-full h-full bg-[#f8fafc] overflow-hidden relative ${isDraggingBg ? 'cursor-grabbing' : 'cursor-grab'} selection:bg-indigo-100 selection:text-indigo-900 group/canvas`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
        >
            {/* Dinamik Grid Arkaplan */}
            <div className="absolute inset-0 pointer-events-none opacity-80" style={dotBackgroundStyle} />

            {/* Zoom Göstergesi ve Sağ/Sol Menüler */}
            <div className={`absolute top-4 left-4 z-20 bg-white/95 backdrop-blur shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] px-4 py-2 rounded-md border border-slate-200/60 pointer-events-none flex items-center gap-2 transition-all duration-300 ${isZooming ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                <span className="text-[10px] font-bold tracking-widest text-slate-600 uppercase">ÖLÇEK: {Math.round(zoom * 100)}%</span>
            </div>

            {/* Sağ Üst Kaydet Butonu */}
            <div className={`absolute top-4 right-4 z-50 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${hasChanges || saveSuccess ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto' : '-translate-y-6 opacity-0 scale-90 pointer-events-none'}`}>
                <button
                    onMouseDown={(e) => e.stopPropagation()} // Tıklamayı engellememek için Pan durdurulur
                    onClick={handleSaveLayout}
                    disabled={isSaving || saveSuccess}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-md backdrop-blur-md shadow-md font-bold text-[12px] tracking-wide transition-all ${saveSuccess
                        ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                        : 'bg-white hover:bg-red-500 text-slate-700 hover:text-white border border-slate-200 hover:border-red-500 active:scale-95 group'
                        }`}
                >
                    {isSaving ? (
                        <div className="w-3.5 h-3.5 border-[2px] border-slate-400 border-t-slate-700 rounded-full animate-spin" />
                    ) : saveSuccess ? (
                        <Check size={14} className="text-white" strokeWidth={3} />
                    ) : (
                        <Save size={14} className="text-slate-500 group-hover:text-white transition-colors" />
                    )}
                    {isSaving ? 'KAYDEDİLİYOR...' : saveSuccess ? 'KAYDEDİLDİ' : 'DÜZENİ KAYDET'}
                </button>
            </div>

            {/* Sonsuz Canvas Katmanı */}
            <div
                className="w-full h-full origin-top-left"
                style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    willChange: 'transform' // GPU hızlandırması eklendi
                }}
            >
                {/* SVG Ok / Bağlantı Yüzeyi */}
                <svg className={`absolute top-0 left-0 w-[8000px] h-[8000px] pointer-events-none z-0 overflow-visible ${draggingTable ? 'opacity-30' : 'opacity-100 transition-opacity duration-300'}`}>
                    <defs>
                        {/* Standart Ok */}
                        <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                            <polygon points="0 0, 6 3, 0 6" fill="currentColor" className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                        </marker>
                        {/* Vurgulu Ok */}
                        <marker id="arrowhead-highlight" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                            <polygon points="0 0, 6 3, 0 6" fill="#ef4444" />
                        </marker>
                    </defs>
                    {renderEdges()}
                </svg>

                {tables.map(table => (
                    <Rnd
                        key={table.name}
                        position={positions[table.name]}
                        scale={zoom}
                        onDragStart={() => setDraggingTable(table.name)} // Taşıma başlarsa gizle
                        onDrag={(e, data) => {
                            setPositions(prev => ({
                                ...prev,
                                [table.name]: { x: data.x, y: data.y }
                            }));
                        }}
                        onDragStop={() => {
                            setDraggingTable(null); // Taşıma bitince çizgileri geri getir
                            setHasChanges(true); // Tasarım düzenini değişti olarak işaretle
                        }}
                        enableResizing={false}
                        onDoubleClick={() => setFocusedTable(prev => prev === table.name ? null : table.name)}
                        className={`z-10 shadow-xl border border-slate-200/80 rounded-xl bg-white/95 backdrop-blur-xl react-draggable 
                            ${draggingTable === table.name ? 'shadow-2xl shadow-indigo-500/20 border-indigo-400 scale-[1.02] z-50 ring-4 ring-indigo-500/10' : 'hover:border-indigo-300 hover:shadow-indigo-500/10'} 
                            ${focusedTable && !isTableRelated(table.name) ? 'opacity-20' : 'opacity-100'} 
                            ${focusedTable === table.name ? 'ring-2 ring-red-400 shadow-2xl shadow-red-500/10 z-40' : ''} 
                            transition-opacity duration-200`}
                        style={{ width: `${CARD_WIDTH}px` }}
                    >
                        {/* Tablo Başlığı (Modern Uzay Grisi Gradient) */}
                        <div className={`h-[44px] ${focusedTable === table.name ? 'bg-gradient-to-r from-red-600 to-red-800' : (draggingTable === table.name ? 'bg-gradient-to-r from-indigo-600 to-indigo-800' : 'bg-gradient-to-r from-slate-800 to-slate-900')} border-b border-slate-700/60 px-4 flex items-center justify-between text-white w-full cursor-move rounded-t-xl transition-colors duration-300`} title="Çift tıklayarak odaklan, sürükleyerek taşı">
                            <div className="flex items-center gap-2 pointer-events-none">
                                <Database size={14} className={focusedTable === table.name ? "text-red-200 drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]" : (draggingTable === table.name ? "text-indigo-200" : "text-indigo-400 drop-shadow-[0_0_6px_rgba(99,102,241,0.5)]")} />
                                <span className="text-[13px] font-bold tracking-widest font-mono uppercase text-slate-100">{table.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 pointer-events-none">
                                {table.db && (
                                    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${table.db === 'logs' ? 'bg-amber-500/30 text-amber-300' : 'bg-indigo-500/30 text-indigo-300'}`}>
                                        {table.db}
                                    </span>
                                )}
                                {table.row_count != null && table.row_count >= 0 && (
                                    <span className="text-[9px] font-mono text-slate-400 bg-white/10 px-1.5 py-0.5 rounded">
                                        {table.row_count.toLocaleString()} satır
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Kolon Boyut Göstergesi */}
                        <div className="h-[28px] px-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between pointer-events-none">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Kolonlar</span>
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded">{table.columns.length} </span>
                        </div>

                        {/* Kolon Listesi (Tamamiyle Açık, Kaydırılamaz) */}
                        <div className="p-0 cursor-default pointer-events-auto pb-1 rounded-b-xl overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <tbody>
                                    {table.columns.map(col => {
                                        const isFk = table.foreign_keys.some(fk => fk.source_col === col.name);
                                        return (
                                            <tr key={col.name} className={`h-[36px] border-b border-slate-100/50 last:border-0 hover:bg-indigo-50/40 transition-colors group ${col.primary_key ? 'bg-amber-50/20' : ''}`}>
                                                <td className="px-4 py-0 w-max group-hover:pl-5 transition-all duration-200">
                                                    <div className="flex items-center gap-2">
                                                        {col.primary_key ? (
                                                            <div className="p-0.5 bg-amber-100/80 rounded text-amber-600 shadow-sm">
                                                                <Key size={11} strokeWidth={2.5} />
                                                            </div>
                                                        ) : isFk ? (
                                                            <div className="p-0.5 bg-indigo-100/80 rounded text-indigo-600 shadow-sm">
                                                                <Link2 size={11} strokeWidth={2.5} />
                                                            </div>
                                                        ) : (
                                                            <div className="p-0.5 text-slate-300">
                                                                <Hash size={11} strokeWidth={2.5} />
                                                            </div>
                                                        )}
                                                        <span className={`text-[12px] font-mono tracking-tight ${col.primary_key ? 'text-amber-700 font-bold' : (isFk ? 'text-indigo-600 font-bold' : 'text-slate-700 font-medium')}`}>
                                                            {col.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-0 text-right">
                                                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter bg-slate-100/70 border border-slate-200/50 px-1.5 py-0.5 rounded">{col.type.split('(')[0]}</span>
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
