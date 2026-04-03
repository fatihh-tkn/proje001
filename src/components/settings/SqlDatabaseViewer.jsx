import React, { useState, useEffect } from 'react';
import { Database, Table as TableIcon, RefreshCw, Layers, LayoutGrid, Network } from 'lucide-react';
import SqlSchemaViewer from './databases/SqlSchemaViewer';

const SqlDatabaseViewer = () => {
    const [tables, setTables] = useState([]);
    const [activeTable, setActiveTable] = useState(null);
    const [tableData, setTableData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [limit] = useState(100);
    const [offset, setOffset] = useState(0);

    const [columnFilters, setColumnFilters] = useState({}); // Örn { tablo_adi: ['Deger1', 'Deger2'] }
    const [activeFilterCol, setActiveFilterCol] = useState(null);
    const [filterSearch, setFilterSearch] = useState('');
    const [showSchema, setShowSchema] = useState(false);

    const getUniqueValues = (col) => {
        if (!tableData) return [];
        return Array.from(new Set(tableData.rows.map(r => String(r[col])))).sort();
    };

    const getFilteredRows = () => {
        if (!tableData) return [];
        return tableData.rows.filter(row => {
            for (const col of Object.keys(columnFilters)) {
                const allowed = columnFilters[col];
                if (allowed && allowed.length > 0) {
                    if (!allowed.includes(String(row[col]))) return false;
                }
            }
            return true;
        });
    };

    const filteredRows = getFilteredRows();

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
                setColumnFilters({}); // Tablo/Sayfa değişince filtreleri sıfırla
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

                <div className="ml-auto flex items-center gap-3">
                    <button
                        onClick={() => setShowSchema(!showSchema)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-[11px] font-bold ${showSchema ? 'bg-[#b91d2c] text-white hover:bg-[#a01a26]' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'}`}
                    >
                        <Network size={14} />
                        {showSchema ? "Tablo Görünümü" : "ER Şeması"}
                    </button>

                    <button
                        onClick={() => {
                            fetchTables();
                            if (activeTable) fetchTableData(activeTable, offset);
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

            <div className="flex flex-1 min-h-0 bg-white relative">
                {showSchema ? (
                    <div className="w-full h-full absolute inset-0 z-10 bg-white">
                        <SqlSchemaViewer />
                    </div>
                ) : (
                    <>
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
                                                        {tableData.columns.map(col => {
                                                            const uniqueVals = getUniqueValues(col);
                                                            const searchVals = uniqueVals.filter(v => v.toLowerCase().includes(filterSearch.toLowerCase()));
                                                            const isActive = columnFilters[col] && columnFilters[col].length > 0;

                                                            return (
                                                                <th key={col} className="relative px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 last:border-r-0">
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <span className="truncate">{col}</span>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (activeFilterCol === col) setActiveFilterCol(null);
                                                                                else { setActiveFilterCol(col); setFilterSearch(''); }
                                                                            }}
                                                                            className={`p-1 rounded transition-colors shrink-0 ${isActive ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-200'}`}
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                                                                        </button>
                                                                    </div>

                                                                    {/* Filtre Dropdown */}
                                                                    {activeFilterCol === col && (
                                                                        <div className="absolute top-full right-0 mt-1 w-52 bg-white border border-slate-200 shadow-xl rounded-xl z-50 flex flex-col font-normal normal-case tracking-normal">
                                                                            <div className="p-2 border-b border-slate-100">
                                                                                <input
                                                                                    type="text"
                                                                                    placeholder="Ara..."
                                                                                    value={filterSearch}
                                                                                    onChange={e => setFilterSearch(e.target.value)}
                                                                                    onClick={e => e.stopPropagation()}
                                                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none focus:border-blue-400 font-medium"
                                                                                />
                                                                            </div>
                                                                            <div className="max-h-48 overflow-y-auto p-1.5 text-[11px] flex flex-col gap-0.5" onClick={e => e.stopPropagation()}>
                                                                                <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-md cursor-pointer select-none">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={!isActive}
                                                                                        onChange={() => {
                                                                                            setColumnFilters(prev => ({ ...prev, [col]: [] }));
                                                                                            setActiveFilterCol(null);
                                                                                        }}
                                                                                        className="rounded border-slate-300 text-blue-600"
                                                                                    />
                                                                                    <span className="font-semibold text-slate-700">(Tümünü Seç)</span>
                                                                                </label>
                                                                                {searchVals.map(v => {
                                                                                    const isChecked = columnFilters[col]?.includes(v) || (!isActive);
                                                                                    return (
                                                                                        <label key={v} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded-md cursor-pointer select-none">
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={isChecked}
                                                                                                onChange={() => {
                                                                                                    setColumnFilters(prev => {
                                                                                                        const cur = prev[col] || [];
                                                                                                        let next;
                                                                                                        if (!isActive) next = [v]; // Hepsinden çık, buna limitlen
                                                                                                        else if (cur.includes(v)) next = cur.filter(x => x !== v);
                                                                                                        else next = [...cur, v];
                                                                                                        return { ...prev, [col]: next };
                                                                                                    });
                                                                                                }}
                                                                                                className="rounded border-slate-300 text-blue-600"
                                                                                            />
                                                                                            <span className="truncate text-slate-600" title={v}>{v || '(Boş)'}</span>
                                                                                        </label>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                            <div className="p-2 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50 rounded-b-xl">
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); setActiveFilterCol(null); }}
                                                                                    className="px-3 py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded-lg shadow-sm shadow-blue-600/20 hover:bg-blue-700 w-full"
                                                                                >
                                                                                    Uygula
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </th>
                                                            )
                                                        })}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200">
                                                    {filteredRows.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={tableData.columns.length} className="px-4 py-10 text-center flex flex-col items-center justify-center gap-2">
                                                                <span className="text-slate-400 text-[13px] font-medium">Bu kriterlere uygun veri bulunamadı.</span>
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        filteredRows.map((row, i) => (
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
                    </>
                )}
            </div>
        </div>
    );
};

export default SqlDatabaseViewer;
