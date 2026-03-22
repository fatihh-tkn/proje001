import React, { useState, useEffect } from 'react';
import { Database, Table as TableIcon, RefreshCw, Layers, LayoutGrid } from 'lucide-react';

const SqlDatabaseViewer = () => {
    const [tables, setTables] = useState([]);
    const [activeTable, setActiveTable] = useState(null);
    const [tableData, setTableData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [limit] = useState(100);
    const [offset, setOffset] = useState(0);

    const fetchTables = async () => {
        try {
            const res = await fetch('/api/sql/tables');
            if (res.ok) {
                const data = await res.json();
                setTables(data.tables || []);
                if (data.tables && data.tables.length > 0 && !activeTable) {
                    setActiveTable(data.tables[0]);
                }
            }
        } catch (err) {
            console.error("Tablo listesi alınamadı", err);
        }
    };

    const fetchTableData = async (tableName, off = 0) => {
        if (!tableName) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/sql/tables/${tableName}?limit=${limit}&offset=${off}`);
            if (res.ok) {
                const data = await res.json();
                setTableData(data);
                setOffset(off);
            }
        } catch (err) {
            console.error("Tablo verisi alınamadı", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTables();
    }, []);

    useEffect(() => {
        if (activeTable) {
            fetchTableData(activeTable, 0);
        }
    }, [activeTable]);

    const handleNext = () => {
        if (tableData && offset + limit < tableData.total) {
            fetchTableData(activeTable, offset + limit);
        }
    };

    const handlePrev = () => {
        if (offset > 0) {
            fetchTableData(activeTable, Math.max(0, offset - limit));
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-white text-slate-800 font-sans overflow-hidden">
            {/* ══ HEADER ══ */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
                <div className="p-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                    <Database size={15} className="text-blue-600" />
                </div>
                <div>
                    <h2 className="text-[13px] font-bold text-slate-800 leading-none">İlişkisel Veritabanı</h2>
                    <p className="text-[10px] text-slate-400 mt-0.5">SQLite / PostgreSQL Tabloları</p>
                </div>

                <div className="ml-auto flex items-center gap-2">
                    <button 
                        onClick={() => {
                            fetchTables();
                            if(activeTable) fetchTableData(activeTable, offset);
                        }} 
                        className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer" 
                        title="Yenile"
                    >
                        <RefreshCw size={13} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)] inline-block" />
                        <span className="text-[10px] text-emerald-600 font-semibold">Bağlı</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 min-h-0 bg-white">
                {/* ── SOL PANEL: Tablolar ── */}
                <div className="w-64 border-r border-slate-200 bg-slate-50 flex flex-col shrink-0">
                    <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                        <Layers size={14} className="text-slate-400" />
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Tablolar</span>
                        <span className="ml-auto text-[10px] text-slate-400 font-medium">{tables.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {tables.map(t => (
                            <button
                                key={t}
                                onClick={() => setActiveTable(t)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg text-[12px] transition-colors cursor-pointer
                                    ${activeTable === t 
                                        ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200' 
                                        : 'text-slate-600 hover:bg-slate-200/50 border border-transparent'
                                    }`}
                            >
                                <TableIcon size={14} className={activeTable === t ? 'text-blue-600' : 'text-slate-400'} />
                                <span className="truncate">{t}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── SAĞ PANEL: Veri Tablosu ── */}
                <div className="flex-1 flex flex-col min-w-0 bg-white">
                    {!activeTable ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
                            <LayoutGrid size={32} className="text-slate-300" />
                            <p className="text-sm">Görüntülemek için soldan bir tablo seçin.</p>
                        </div>
                    ) : (
                        <>
                            {/* Veri Header */}
                            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold text-slate-700">{activeTable}</h3>
                                    {tableData && (
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-semibold border border-slate-200">
                                            Toplam: {tableData.total}
                                        </span>
                                    )}
                                </div>
                                
                                {/* Pagination Controls */}
                                {tableData && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-slate-500 mr-2">
                                            {offset + 1} - {Math.min(offset + limit, tableData.total)} / {tableData.total}
                                        </span>
                                        <button 
                                            onClick={handlePrev} 
                                            disabled={offset === 0}
                                            className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-slate-200 font-semibold"
                                        >
                                            Önceki
                                        </button>
                                        <button 
                                            onClick={handleNext} 
                                            disabled={offset + limit >= tableData.total}
                                            className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-slate-200 font-semibold"
                                        >
                                            Sonraki
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Data Table */}
                            <div className="flex-1 overflow-auto bg-slate-50/30">
                                {loading && !tableData ? (
                                    <div className="p-8 text-center text-slate-400 text-sm">Yükleniyor...</div>
                                ) : tableData && tableData.columns.length > 0 ? (
                                    <table className="w-full text-left border-collapse min-w-max">
                                        <thead className="sticky top-0 bg-slate-100 shadow-sm z-10 border-b border-slate-300">
                                            <tr>
                                                {tableData.columns.map(col => (
                                                    <th key={col} className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap border-r border-slate-200 last:border-r-0">
                                                        {col}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {tableData.rows.length === 0 ? (
                                                <tr>
                                                    <td colSpan={tableData.columns.length} className="px-4 py-8 text-center text-slate-400 text-sm">
                                                        Bu tabloda hiç kayıt yok.
                                                    </td>
                                                </tr>
                                            ) : (
                                                tableData.rows.map((row, i) => (
                                                    <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                                                        {tableData.columns.map(col => (
                                                            <td key={`${i}-${col}`} className="px-4 py-2 text-[12px] text-slate-700 max-w-[300px] truncate border-r border-slate-100 last:border-r-0" title={String(row[col])}>
                                                                {row[col] === null ? <span className="text-slate-400 italic">null</span> : String(row[col])}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="p-8 text-center text-slate-400 text-sm">Tablo verisi alınamadı veya sütun yok.</div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SqlDatabaseViewer;
