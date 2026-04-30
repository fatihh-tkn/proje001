import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Database, File as FileIcon, RefreshCw, Search, X, Activity } from 'lucide-react';
import { mutate } from '../../../api/client';

import VdbFileList from './VdbFileList';
import VdbPageList from './VdbPageList';
import VdbChunkPanel from './VdbChunkPanel';
import { dispatchArchiveChanged, useArchiveChangedListener } from '../../../utils/archiveEvents';

const BASE = '/api/db';
const COLLECTION = 'documents';

const fetchWithTimeout = (url, options = {}, timeoutMs = 5000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timer));
};

export default function VectorDatabaseViewer() {
    const [backendReady, setBackendReady] = useState(null);
    const [dbLoading, setDbLoading] = useState(false);
    const [files, setFiles] = useState([]);
    const [allVectors, setAllVectors] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedFileId, setSelectedFileId] = useState(null);
    const [selectedPage, setSelectedPage] = useState(null);
    const [targetChunkId, setTargetChunkId] = useState(null);
    const [expandedJson, setExpandedJson] = useState({});

    const chunkRefs = useRef({});

    useEffect(() => {
        if (targetChunkId && chunkRefs.current[targetChunkId]) {
            const timer = setTimeout(() => {
                const el = chunkRefs.current[targetChunkId];
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [targetChunkId, selectedPage, selectedFileId]);

    const fetchRecords = useCallback(async () => {
        setDbLoading(true);
        try {
            setBackendReady(true);
            // Dosya tablosunu (sol panel) SQL'den daha verimli sekilde cek
            const sqlRes = await fetch('/api/sql/documents');
            const sqlData = sqlRes.ok ? await sqlRes.json() : { records: [] };
            const sqlFiles = (sqlData.records || []).map(r => ({ id: r.id, file: r.file }));
            setFiles(sqlFiles);

            // Vektörleri tamamen PostgreSQL (pgvector) özel endpoint'inden çekiyoruz
            const res = await fetch(`/api/sql/chunks?limit=1000`);
            if (res.ok) {
                const data = await res.json();
                const vectors = [];
                if (data && Array.isArray(data.chunks)) {
                    for (let i = 0; i < data.chunks.length; i++) {
                        const chunkObj = data.chunks[i];
                        const meta = chunkObj.rawMeta || {};
                        vectors.push({
                            id: chunkObj.id,
                            text: chunkObj.text,
                            file: chunkObj.file,
                            page: chunkObj.page,
                            x: chunkObj.x || 0,
                            y: chunkObj.y || 0,
                            rawMeta: meta
                        });
                    }
                }
                setAllVectors(vectors);
                if (sqlFiles.length === 0) {
                    const uniqueFiles = new Set(vectors.map(v => v.file));
                    setFiles(Array.from(uniqueFiles).map((fileName, idx) => ({ id: `gen_file_${idx}`, file: fileName })));
                }
            }
        } catch (e) {
            console.warn('[VectorDB] Kayıtlar alınamadı:', e.message);
            setBackendReady(false);
            setFiles([]);
            setAllVectors([]);
        } finally {
            setDbLoading(false);
        }
    }, []);

    useEffect(() => { fetchRecords(); }, [fetchRecords]);
    useArchiveChangedListener(fetchRecords);

    const handleDeleteChunk = async (chunkId, e) => {
        e.stopPropagation();
        if (!window.confirm("Bu bilgi parçacığını tüm veritabanlarından (Vektör + SQL + Graf) kalıcı olarak silmek istiyor musunuz?")) return;
        try {
            await mutate.remove(`/api/chunk/${encodeURIComponent(chunkId)}`, null,
                { subject: 'Bilgi parçacığı' }
            );
            setAllVectors(prev => prev.filter(v => v.id !== chunkId));
        } catch { /* mutate toast attı */ }
    };

    const handleDeleteFile = async (fileName, fileId, e) => {
        e.stopPropagation();
        if (!window.confirm(`"${fileName}" dosyası ve tüm vektör parçacıkları kalıcı olarak silinecek. Emin misiniz?`)) return;
        try {
            await mutate.remove('/api/archive/delete',
                { ids: [fileId] },
                { subject: 'Belge', detail: fileName }
            );
            setAllVectors(prev => prev.filter(v => v.file !== fileName));
            setFiles(prev => prev.filter(f => f.id !== fileId));
            if (selectedFileId === fileId) { setSelectedFileId(null); setSelectedPage(null); }
            dispatchArchiveChanged();
        } catch { /* mutate toast attı */ }
    };


    const filteredVectors = React.useMemo(() => {
        if (!searchTerm) return [];
        const lower = searchTerm.toLocaleLowerCase('tr-TR');
        return allVectors.filter(v => v.text.toLocaleLowerCase('tr-TR').includes(lower));
    }, [allVectors, searchTerm]);

    const handleSearchItemClick = (vector) => {
        const fileObj = files.find(f => f.file === vector.file) || files.find(f => vector.file.includes(f.file) || f.file.includes(vector.file));
        if (fileObj) { setSelectedFileId(fileObj.id); setSelectedPage(vector.page); setTargetChunkId(vector.id); setShowDropdown(false); }
        else alert("Bu parçanın ait olduğu orijinal dosya yerel listede bulunamadı.");
    };

    const clearSearch = () => { setSearchTerm(''); setShowDropdown(false); setTargetChunkId(null); };
    const handleFileSelect = (file) => { if (selectedFileId === file.id) return; setSelectedFileId(file.id); setSelectedPage(null); setTargetChunkId(null); };
    const handlePageSelect = (page) => { setSelectedPage(page); setTargetChunkId(null); };
    const toggleJsonInfo = (chunkId) => setExpandedJson(prev => ({ ...prev, [chunkId]: !prev[chunkId] }));

    if (backendReady === false) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center gap-5 bg-stone-50 text-stone-500">
                <div className="p-5 bg-[#FAEEDA] border border-[#F5DDB3] rounded-2xl">
                    <Activity size={36} className="text-[#854F0B] animate-pulse" />
                </div>
                <div className="text-center">
                    <p className="text-base font-bold text-stone-700">Backend Başlatılıyor...</p>
                </div>
                <button onClick={fetchRecords} className="flex items-center gap-2 px-4 py-2 bg-stone-200 hover:bg-stone-300 rounded-xl text-sm font-semibold text-stone-700 transition-all">
                    <RefreshCw size={14} /> Tekrar Dene
                </button>
            </div>
        );
    }

    const activeFileObj = files.find(f => f.id === selectedFileId);
    const activeVectors = activeFileObj ? allVectors.filter(v => v.file === activeFileObj.file) : [];
    const pagesMap = {};
    activeVectors.forEach(v => { if (!pagesMap[v.page]) pagesMap[v.page] = []; pagesMap[v.page].push(v); });
    const pageNumbers = Object.keys(pagesMap).map(Number).sort((a, b) => a - b);
    const activeChunks = selectedPage ? (pagesMap[selectedPage] || []) : [];
    const filesToRender = files.map(f => ({ ...f, matchCount: filteredVectors.filter(v => v.file === f.file).length }));

    return (
        <div className="w-full h-full flex flex-col bg-stone-50 font-sans">
            {/* Header */}
            <div className="px-6 py-2.5 border-b border-stone-200 bg-white flex items-center justify-between text-[11px] text-stone-500 shrink-0 gap-4">
                <div className="flex items-center gap-4 shrink-0">
                    <span className="flex items-center gap-1.5 font-medium"><Database size={13} className="text-[#378ADD]" /> Vektör Hafızası ({files.length} Dosya)</span>
                </div>

                {/* Arama */}
                <div className="flex-1 max-w-lg relative">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(e.target.value.length > 0); }}
                            onFocus={() => { if (searchTerm.length > 0) setShowDropdown(true); }}
                            placeholder="Tüm vektörler içinde içerik ara..."
                            className="w-full pl-8 pr-8 py-1.5 bg-stone-100 border border-transparent focus:border-stone-300 focus:bg-white rounded-lg text-stone-700 text-[12px] outline-none transition-all placeholder:text-stone-400"
                        />
                        {searchTerm && <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"><X size={14} /></button>}
                    </div>

                    {showDropdown && searchTerm && (
                        <div className="absolute top-full left-0 mt-1.5 w-[600px] max-h-[400px] bg-white border border-stone-200 shadow-2xl rounded-xl z-50 overflow-hidden flex flex-col">
                            <div className="px-4 py-2 bg-stone-50 border-b border-stone-100 text-[10px] font-bold text-stone-500 uppercase flex justify-between">
                                Arama Sonuçları <span className="text-[#378ADD] bg-[#E6F1FB] px-1.5 py-0.5 rounded">{filteredVectors.length} Adet</span>
                            </div>
                            <div className="flex-1 overflow-y-auto w-full p-2 space-y-1">
                                {filteredVectors.length === 0 ? (
                                    <div className="p-4 text-center text-stone-400 text-xs">Sonuç bulunamadı.</div>
                                ) : (
                                    filteredVectors.slice(0, 50).map(v => (
                                        <button key={v.id} onClick={() => handleSearchItemClick(v)} className="w-full text-left p-3 hover:bg-stone-50 border border-transparent hover:border-stone-200 rounded-lg transition-all flex flex-col gap-1.5 focus:bg-stone-50">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-[#378ADD] flex items-center gap-1"><FileIcon size={10} /> {v.file}</span>
                                                <span className="text-[9px] bg-stone-100 px-1.5 py-0.5 rounded font-mono text-stone-500">Sayfa: {v.page}</span>
                                            </div>
                                            <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">{v.text}</p>
                                        </button>
                                    ))
                                )}
                            </div>
                            {filteredVectors.length > 50 && <div className="p-2 text-center text-[10px] text-stone-400 bg-stone-50 border-t border-stone-100">Sadece ilk 50 sonuç gösteriliyor.</div>}
                        </div>
                    )}
                </div>

                <button onClick={fetchRecords} title="Yenile" className="shrink-0">
                    <RefreshCw size={14} className={`hover:text-[#378ADD] ${dbLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Columns */}
            <div className="flex flex-1 min-h-0" onClick={() => setShowDropdown(false)}>
                <VdbFileList
                    filesToRender={filesToRender}
                    selectedFileId={selectedFileId}
                    handleFileSelect={handleFileSelect}
                    handleDeleteFile={handleDeleteFile}
                    searchTerm={searchTerm}
                />
                <VdbPageList
                    pageNumbers={pageNumbers}
                    pagesMap={pagesMap}
                    selectedPage={selectedPage}
                    handlePageSelect={handlePageSelect}
                    searchTerm={searchTerm}
                />
                <VdbChunkPanel
                    activeChunks={activeChunks}
                    targetChunkId={targetChunkId}
                    chunkRefs={chunkRefs}
                    searchTerm={searchTerm}
                    expandedJson={expandedJson}
                    toggleJsonInfo={toggleJsonInfo}
                    handleDeleteChunk={handleDeleteChunk}
                />
            </div>
        </div>
    );
}
