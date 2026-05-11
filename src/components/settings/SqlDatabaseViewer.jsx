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
    const [columnFilters, setColumnFilters] = useState({});
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
                if (allowed && allowed.length > 0 && !allowed.includes(String(row[col]))) return false;
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
                if (data.tables?.length > 0 && !activeTable) setActiveTable(data.tables[0]);
            }
        } catch (err) { console.error('Tablo listesi alınamadı', err); }
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
                setColumnFilters({});
            }
        } catch (err) { console.error('Tablo verisi alınamadı', err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchTables(); }, []);
    useEffect(() => { if (activeTable) fetchTableData(activeTable, 0); }, [activeTable]);

    const handleNext = () => { if (tableData && offset + limit < tableData.total) fetchTableData(activeTable, offset + limit); };
    const handlePrev = () => { if (offset > 0) fetchTableData(activeTable, Math.max(0, offset - limit)); };

    return (
        <div className="w-full h-full flex flex-col bg-white text-stone-800 font-sans overflow-hidden">

            {/* ══ HEADER ══ */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-stone-100 bg-white shrink-0">
                <div className="p-1.5 bg-[#E6F1FB] border border-[#B8D4F0] rounded-lg">
                    <Database size={14} className="text-[#378ADD]" />
                </div>
                <div>
                    <h2 className="text-[13px] font-black text-stone-800 leading-none">İlişkisel Veritabanı</h2>
                    <p className="text-[10px] text-stone-400 mt-0.5 tracking-wide">PostgreSQL · Tablolar</p>
                </div>

                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={() => setShowSchema(v => !v)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-[11px] font-bold border shadow-sm
                            ${showSchema
                                ? 'bg-[#378ADD] text-white border-[#378ADD] hover:bg-[#0C447C]'
                                : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}
                    >
                        <Network size={13} />
                        {showSchema ? 'Tablo Görünümü' : 'ER Şeması'}
                    </button>

                    <button
                        onClick={() => { fetchTables(); if (activeTable) fetchTableData(activeTable, offset); }}
                        className="p-1.5 bg-white border border-stone-200 hover:bg-stone-50 rounded-lg transition-colors shadow-sm"
                        title="Yenile"
                    >
                        <RefreshCw size={13} className={`text-stone-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#EAF3DE] border border-[#C5DFA8] rounded-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3B6D11] shadow-[0_0_4px_rgba(59,109,17,0.5)] inline-block" />
                        <span className="text-[10px] text-[#3B6D11] font-black tracking-wide">Bağlı</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 min-h-0 relative">
                {showSchema ? (
                    <div className="w-full h-full absolute inset-0 z-10 bg-white">
                        <SqlSchemaViewer />
                    </div>
                ) : (
                    <>
                        {/* ── SOL PANEL ── */}
                        <div className="w-56 border-r border-stone-100 bg-stone-50 flex flex-col shrink-0">
                            <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-2">
                                <Layers size={13} className="text-stone-400" />
                                <span className="text-[9px] font-black text-stone-400 uppercase tracking-[0.18em]">Tablolar</span>
                                <span className="ml-auto text-[10px] text-stone-400 font-black font-mono">{tables.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-0.5
                                [&::-webkit-scrollbar]:w-1
                                [&::-webkit-scrollbar-track]:bg-transparent
                                [&::-webkit-scrollbar-thumb]:bg-stone-300
                                hover:[&::-webkit-scrollbar-thumb]:bg-stone-400"
                            >
                                {tables.map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setActiveTable(t)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg text-[12px] transition-all
                                            ${activeTable === t
                                                ? 'bg-[#E6F1FB] text-[#378ADD] font-black border border-[#B8D4F0]'
                                                : 'text-stone-600 hover:bg-white hover:shadow-sm border border-transparent font-medium'}`}
                                    >
                                        <TableIcon size={13} className={activeTable === t ? 'text-[#378ADD] shrink-0' : 'text-stone-400 shrink-0'} />
                                        <span className="truncate">{t}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ── SAĞ PANEL ── */}
                        <div className="flex-1 flex flex-col min-w-0 bg-white">
                            {!activeTable ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-stone-300 gap-3">
                                    <LayoutGrid size={28} />
                                    <p className="text-[12px] text-stone-400 font-medium">Soldan bir tablo seçin.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Veri Header */}
                                    <div className="px-5 py-2.5 border-b border-stone-100 flex items-center justify-between bg-white shrink-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-[13px] font-black text-stone-700">{activeTable}</h3>
                                            {tableData && (
                                                <span className="px-2 py-0.5 bg-stone-100 text-stone-500 rounded text-[10px] font-black border border-stone-200 font-mono">
                                                    {tableData.total} satır
                                                </span>
                                            )}
                                        </div>

                                        {tableData && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-stone-400 font-mono mr-1">
                                                    {offset + 1}–{Math.min(offset + limit, tableData.total)} / {tableData.total}
                                                </span>
                                                <button
                                                    onClick={handlePrev}
                                                    disabled={offset === 0}
                                                    className="px-3 py-1.5 text-[11px] font-bold bg-white border border-stone-200 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
                                                >
                                                    ← Önceki
                                                </button>
                                                <button
                                                    onClick={handleNext}
                                                    disabled={offset + limit >= tableData.total}
                                                    className="px-3 py-1.5 text-[11px] font-bold bg-white border border-stone-200 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
                                                >
                                                    Sonraki →
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Tablo */}
                                    <div className="flex-1 overflow-auto">
                                        {loading && !tableData ? (
                                            <div className="flex items-center justify-center gap-2 p-10 text-stone-400">
                                                <RefreshCw size={14} className="animate-spin" />
                                                <span className="text-[12px] font-medium">Yükleniyor...</span>
                                            </div>
                                        ) : tableData?.columns.length > 0 ? (
                                            <table className="w-full text-left border-collapse min-w-max">
                                                <thead className="sticky top-0 z-10">
                                                    <tr className="bg-stone-50/90 backdrop-blur-sm border-b border-stone-200">
                                                        {tableData.columns.map(col => {
                                                            const uniqueVals = getUniqueValues(col);
                                                            const searchVals = uniqueVals.filter(v => v.toLowerCase().includes(filterSearch.toLowerCase()));
                                                            const isActive = columnFilters[col]?.length > 0;
                                                            return (
                                                                <th key={col} className="relative px-4 py-2.5 text-[10px] font-black text-stone-500 uppercase tracking-[0.12em] border-r border-stone-100 last:border-r-0">
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <span className="truncate">{col}</span>
                                                                        <button
                                                                            onClick={e => {
                                                                                e.stopPropagation();
                                                                                if (activeFilterCol === col) setActiveFilterCol(null);
                                                                                else { setActiveFilterCol(col); setFilterSearch(''); }
                                                                            }}
                                                                            className={`p-1 rounded transition-colors shrink-0
                                                                                ${isActive ? 'bg-[#E6F1FB] text-[#378ADD]' : 'text-stone-300 hover:bg-stone-200 hover:text-stone-600'}`}
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                                                                        </button>
                                                                    </div>

                                                                    {activeFilterCol === col && (
                                                                        <div className="absolute top-full right-0 mt-1 w-52 bg-white border border-stone-200 shadow-xl rounded-xl z-50 flex flex-col font-normal normal-case tracking-normal">
                                                                            <div className="p-2 border-b border-stone-100">
                                                                                <input
                                                                                    type="text"
                                                                                    placeholder="Ara..."
                                                                                    value={filterSearch}
                                                                                    onChange={e => setFilterSearch(e.target.value)}
                                                                                    onClick={e => e.stopPropagation()}
                                                                                    autoComplete="off"
                                                                                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20 font-medium"
                                                                                />
                                                                            </div>
                                                                            <div className="max-h-48 overflow-y-auto p-1.5 text-[11px] flex flex-col gap-0.5" onClick={e => e.stopPropagation()}>
                                                                                <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-stone-50 rounded-lg cursor-pointer select-none">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={!isActive}
                                                                                        onChange={() => { setColumnFilters(prev => ({ ...prev, [col]: [] })); setActiveFilterCol(null); }}
                                                                                        className="rounded border-stone-300 accent-[#378ADD]"
                                                                                    />
                                                                                    <span className="font-black text-stone-700">(Tümünü Seç)</span>
                                                                                </label>
                                                                                {searchVals.map(v => {
                                                                                    const isChecked = columnFilters[col]?.includes(v) || !isActive;
                                                                                    return (
                                                                                        <label key={v} className="flex items-center gap-2 px-2 py-1 hover:bg-stone-50 rounded-lg cursor-pointer select-none">
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={isChecked}
                                                                                                onChange={() => {
                                                                                                    setColumnFilters(prev => {
                                                                                                        const cur = prev[col] || [];
                                                                                                        const next = !isActive ? [v] : cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v];
                                                                                                        return { ...prev, [col]: next };
                                                                                                    });
                                                                                                }}
                                                                                                className="rounded border-stone-300 accent-[#378ADD]"
                                                                                            />
                                                                                            <span className="truncate text-stone-600 font-medium" title={v}>{v || '(Boş)'}</span>
                                                                                        </label>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                            <div className="p-2 border-t border-stone-100 bg-stone-50 rounded-b-xl">
                                                                                <button
                                                                                    onClick={e => { e.stopPropagation(); setActiveFilterCol(null); }}
                                                                                    className="w-full px-3 py-1.5 bg-[#378ADD] text-white text-[11px] font-black rounded-lg hover:bg-[#0C447C] transition-colors shadow-sm"
                                                                                >
                                                                                    Uygula
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </th>
                                                            );
                                                        })}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredRows.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={tableData.columns.length} className="px-4 py-10 text-center text-[12px] text-stone-400 font-medium">
                                                                Bu kriterlere uygun veri bulunamadı.
                                                            </td>
                                                        </tr>
                                                    ) : filteredRows.map((row, i) => (
                                                        <tr key={i} className="border-b border-stone-50 hover:bg-stone-50/60 transition-colors">
                                                            {tableData.columns.map(col => (
                                                                <td
                                                                    key={`${i}-${col}`}
                                                                    className="px-4 py-2 text-[12px] text-stone-700 max-w-[300px] truncate border-r border-stone-50 last:border-r-0 font-medium"
                                                                    title={String(row[col])}
                                                                >
                                                                    {row[col] === null
                                                                        ? <span className="text-stone-300 italic font-normal">null</span>
                                                                        : String(row[col])}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div className="p-10 text-center text-[12px] text-stone-400 font-medium">
                                                Tablo verisi alınamadı veya sütun yok.
                                            </div>
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
