import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    Database, Upload, CheckCircle2, Trash2, Zap, FileText,
    RefreshCw, Loader2, ShieldCheck, Save, CornerDownRight,
    X, AlertTriangle, Activity, Search, CheckCheck, BarChart3,
    AlignLeft, Layers, ChevronDown, ChevronRight
} from 'lucide-react';

import DatabaseDropzone from './database/DatabaseDropzone';
import DatabaseQuarantine from './database/DatabaseQuarantine';
import DatabaseMemoryTable from './database/DatabaseMemoryTable';

const BASE = '/api/db';
const COLLECTION = 'documents';

// ── 5 saniyelik timeout ile fetch ──
const fetchWithTimeout = (url, options = {}, timeoutMs = 5000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timer));
};

const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

const makeChunks = (file) => {
    const count = Math.floor(Math.random() * 8) + 4;
    return Array.from({ length: count }, (_, i) => ({
        id: `chunk_${Date.now()}_${i}`,
        page: Math.floor(Math.random() * 15) + 1,
        x: Math.floor(Math.random() * 600) + 60,
        y: Math.floor(Math.random() * 800) + 40,
        text: `${file.name} dosyasından çıkarılan metin parçası ${i + 1}. Bu bölüm belgenin ${['giriş', 'analiz', 'sonuç', 'özet', 'ekler', 'referans'][i % 6]} kısmından alınmıştır. Koordinat tabanlı segment, belgenin ilgili bölümünde yer almaktadır.`,
    }));
};

/* ── Skeleton satır ── */
const SkeletonChunk = () => (
    <div className="bg-white border border-slate-100 rounded-xl p-3 animate-pulse">
        <div className="flex gap-2">
            <div className="w-3 h-3 rounded bg-slate-200 mt-0.5 shrink-0" />
            <div className="flex-1 space-y-1.5">
                <div className="h-2.5 bg-slate-200 rounded w-full" />
                <div className="h-2.5 bg-slate-200 rounded w-4/5" />
            </div>
        </div>
        <div className="flex gap-4 mt-2.5 pt-2 border-t border-slate-100">
            <div className="h-2 bg-slate-100 rounded w-16" />
            <div className="h-2 bg-slate-100 rounded w-20" />
        </div>
    </div>
);

/* ── Skeleton tablo satırı ── */
const SkeletonRow = () => (
    <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr_40px] items-center px-5 py-3.5 border-b border-slate-100 animate-pulse">
        {[['w-40', 'mr-2'], ['w-20'], ['w-14'], ['w-24'], []].map(([w, extra], i) =>
            w ? <div key={i} className={`h-2.5 bg-slate-200 rounded ${w} ${extra || ''}`} /> : <div key={i} />
        )}
    </div>
);

/* ──────────────────────────────────────────────────── */
const DatabaseViewer = ({ readOnly }) => {
    const [backendReady, setBackendReady] = useState(null); // null=kontrol ediliyor, true=hazır, false=kapalı
    const [phase, setPhase] = useState('idle');          // idle | analyzing | staged | saving
    const [useVision, setUseVision] = useState(false);
    const [tempFilePath, setTempFilePath] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [dragActive, setDragActive] = useState(false); // tüm ekran drag sinyali
    const [stagedFile, setStagedFile] = useState(null);
    const [chunks, setChunks] = useState([]);
    const [approvedChunks, setApprovedChunks] = useState(new Set());
    const [skeletonChunks, setSkeletonChunks] = useState(0);
    const [progress, setProgress] = useState(0);
    const [records, setRecords] = useState([]);
    const [dbLoading, setDbLoading] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [search, setSearch] = useState('');
    const [totalVectors, setTotalVectors] = useState(0);
    const [expandedRecord, setExpandedRecord] = useState(null);
    const [recordVectors, setRecordVectors] = useState({});
    const [expandedPages, setExpandedPages] = useState({});
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const progressRef = useRef(null);
    const dropRef = useRef(null);

    /* ── kayıtları yükle ── */
    const fetchRecords = useCallback(async () => {
        setDbLoading(true);
        try {
            // Backend hazır mı? 5 saniye timeout
            await fetchWithTimeout(`${BASE}/collections/${COLLECTION}`, {}, 5000);
            setBackendReady(true);
            const stored = JSON.parse(localStorage.getItem('db_records') || '[]');
            setRecords(stored);
            setTotalVectors(stored.reduce((s, r) => s + (r.chunks || 0), 0));
        } catch {
            setBackendReady(false);
            setRecords([]);
        } finally {
            setDbLoading(false);
        }
    }, []);

    useEffect(() => { fetchRecords(); }, [fetchRecords]);

    /* ── Tüm-ekran drag dinleyicisi ── */
    useEffect(() => {
        const onEnter = (e) => {
            if (e.dataTransfer?.types?.includes('Files')) setDragActive(true);
        };
        const onLeave = (e) => {
            if (e.clientX === 0 && e.clientY === 0) setDragActive(false);
        };
        const onDrop = () => setDragActive(false);
        window.addEventListener('dragenter', onEnter);
        window.addEventListener('dragleave', onLeave);
        window.addEventListener('drop', onDrop);
        return () => {
            window.removeEventListener('dragenter', onEnter);
            window.removeEventListener('dragleave', onLeave);
            window.removeEventListener('drop', onDrop);
        };
    }, []);

    /* ── analiz animasyonu ve dosya yükleme ── */
    const startAnalysis = async (file) => {
        setStagedFile(file);
        setPhase('analyzing');
        setProgress(15);
        setChunks([]);
        setSkeletonChunks(Math.floor(Math.random() * 5) + 3);

        // Pseudo progress until real fetch completes
        let p = 15;
        progressRef.current = setInterval(() => {
            p += Math.random() * 10;
            if (p > 90) p = 90;
            setProgress(p);
        }, 500);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('use_vision', useVision ? 'true' : 'false');

        try {
            const res = await fetch('/api/upload-and-analyze', {
                method: 'POST',
                body: formData,
            });

            clearInterval(progressRef.current);
            setProgress(100);

            if (!res.ok) throw new Error("Sunucu okuma hatası verdi.");

            const data = await res.json();
            setSkeletonChunks(0);

            if (data.status === 'success' && data.chunks) {
                // Backend'den gelen chunks verisini state'e ekle
                // x,y verileri backend'deyken dict içindeki metadata.bbox
                setChunks(data.chunks.map(c => ({
                    id: c.id,
                    text: c.text,
                    page: c.metadata?.page || 1,
                    // Bbox string parsing for frontend compatibility if needed
                    x: c.metadata?.bbox ? parseFloat(c.metadata.bbox.split(',')[0]).toFixed(1) : 0,
                    y: c.metadata?.bbox ? parseFloat(c.metadata.bbox.split(',')[1]).toFixed(1) : 0,
                    metadata: c.metadata // Store the whole metadata
                })));
                if (data.temp_path) {
                    setTempFilePath(data.temp_path);
                }
            } else {
                setChunks([]);
            }
            setApprovedChunks(new Set());
            setPhase('staged');
        } catch (e) {
            console.error("Upload Error:", e);
            clearInterval(progressRef.current);
            setProgress(100);
            setSkeletonChunks(0);
            setChunks([{ id: 'error-1', text: `Hata: ${e.message}`, page: 1, x: 0, y: 0 }]);
            setPhase('staged');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file && phase === 'idle') startAnalysis(file);
    };

    const handleFileInput = (e) => {
        const file = e.target.files?.[0];
        if (file) startAnalysis(file);
    };

    /* ── tümünü kaydet ── */
    const handleSave = async () => {
        if (!stagedFile || chunks.length === 0 || approvedChunks.size === 0) return;
        const validChunks = chunks.filter(c => approvedChunks.has(c.id));
        setPhase('saving');
        setSaveError('');
        try {
            await fetch(`${BASE}/documents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    collection: COLLECTION,
                    documents: validChunks.map(c => c.text),
                    metadatas: validChunks.map(c => ({
                        ...c.metadata, // BBox ve image_path dahil her şeyi aktar
                        file: stagedFile.name
                    })),
                    ids: validChunks.map(c => c.id),
                }),
            });
            const stored = JSON.parse(localStorage.getItem('db_records') || '[]');
            const idx = stored.findIndex(r => r.file === stagedFile.name);
            const entry = {
                id: `rec_${Date.now()}`,
                file: stagedFile.name,
                chunks: validChunks.length + (idx >= 0 ? stored[idx].chunks : 0),
                date: new Date().toISOString(),
                active: true,
            };
            if (idx >= 0) stored[idx] = entry; else stored.push(entry);
            localStorage.setItem('db_records', JSON.stringify(stored));
            // Yeni Eklenen: Vektörleştirme bittiğinde asıl dosyayı arşive taşı ve veritabanına ekle
            if (tempFilePath) {
                try {
                    await fetch('/api/archive-document', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            temp_path: tempFilePath,
                            final_name: stagedFile.name,
                            chunk_count: validChunks.length,
                            chroma_collection: COLLECTION
                        })
                    });
                } catch (archiveErr) {
                    console.error("Arşivleme hatası:", archiveErr);
                }
            }

            setPhase('idle'); setStagedFile(null); setChunks([]); setApprovedChunks(new Set()); setTempFilePath(null);
            await fetchRecords();
        } catch (err) {
            setSaveError(err.message || 'Kayıt sırasında hata oluştu.');
            setPhase('staged');
        }
    };

    const handleDeleteRecord = async (rec) => {
        // Confirm is now handled by inline popup
        setDeleteConfirm(null);

        // Find all vectors for this file and delete them from chroma
        const vectors = recordVectors[rec.id] || [];
        const vectorIds = vectors.map(v => v.id).filter(Boolean);

        if (vectorIds.length > 0) {
            try {
                await fetch(`${BASE}/documents`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ collection: COLLECTION, ids: vectorIds }),
                });
            } catch (err) {
                console.error("Vector deletion failed", err);
            }
        }

        const stored = JSON.parse(localStorage.getItem('db_records') || '[]').filter(r => r.id !== rec.id);
        localStorage.setItem('db_records', JSON.stringify(stored));
        setRecords(stored);
        setTotalVectors(stored.reduce((s, r) => s + (r.chunks || 0), 0));

        if (expandedRecord === rec.id) setExpandedRecord(null);
    };

    const handleDeleteVector = async (recId, vectorId) => {
        // Confirm is now handled by inline popup
        setDeleteConfirm(null);
        try {
            await fetch(`${BASE}/documents`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ collection: COLLECTION, ids: [vectorId] }),
            });

            // update UI state
            setRecordVectors(prev => {
                const updated = { ...prev };
                if (updated[recId]) {
                    updated[recId] = updated[recId].filter(v => v.id !== vectorId);
                }
                return updated;
            });

            // update localStorage count
            const stored = JSON.parse(localStorage.getItem('db_records') || '[]');
            const idx = stored.findIndex(r => r.id === recId);
            if (idx >= 0) {
                stored[idx].chunks = Math.max(0, stored[idx].chunks - 1);
                localStorage.setItem('db_records', JSON.stringify(stored));
                setRecords(stored);
                setTotalVectors(stored.reduce((s, r) => s + (r.chunks || 0), 0));
            }
        } catch (err) {
            console.error("Vector item deletion error", err);
        }
    };

    const toggleRecordExpansion = async (rec) => {
        if (expandedRecord === rec.id) {
            setExpandedRecord(null);
            setExpandedPages({});
            return;
        }

        setExpandedRecord(rec.id);
        setExpandedPages({});

        // Fetch actual vectors from Chroma DB mapping to this file if we havent yet
        if (!recordVectors[rec.id]) {
            try {
                const res = await fetch(`${BASE}/collections/${COLLECTION}/documents?limit=1000`);
                if (res.ok) {
                    const data = await res.json();

                    const vectors = [];
                    if (data && Array.isArray(data.ids)) {
                        for (let i = 0; i < data.ids.length; i++) {
                            const meta = data.metadatas ? data.metadatas[i] : null;
                            if (meta && meta.file === rec.file) {
                                vectors.push({
                                    id: data.ids[i],
                                    text: data.documents ? data.documents[i] : '',
                                    page: meta.page || 1,
                                    x: meta.x || 0,
                                    y: meta.y || 0
                                });
                            }
                        }
                    }
                    setRecordVectors(prev => ({ ...prev, [rec.id]: vectors }));
                } else {
                    setRecordVectors(prev => ({ ...prev, [rec.id]: [] }));
                }
            } catch (e) {
                console.error("Fetch vector list failed", e);
                setRecordVectors(prev => ({ ...prev, [rec.id]: [] }));
            }
        }
    };

    const togglePageExpansion = (page) => {
        setExpandedPages(prev => ({ ...prev, [page]: !prev[page] }));
    };

    const handleCancel = () => {
        clearInterval(progressRef.current);
        setPhase('idle'); setStagedFile(null); setChunks([]); setApprovedChunks(new Set()); setProgress(0); setSkeletonChunks(0);
    };

    const handleApproveAll = () => {
        const allIds = chunks.map(c => c.id);
        setApprovedChunks(new Set(allIds));
    };

    const toggleApproval = (id) => {
        setApprovedChunks(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const filteredRecords = records.filter(r =>
        r.file.toLowerCase().includes(search.toLowerCase())
    );

    /* ──────────────────────────── RENDER ──────────────────────────── */

    // Backend henüz başlatılmadıysa bilgi ekranı göster
    if (backendReady === false) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center gap-5 bg-white text-slate-500">
                <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl">
                    <Activity size={36} className="text-amber-500 animate-pulse" />
                </div>
                <div className="text-center">
                    <p className="text-base font-bold text-slate-700">Backend Başlatılıyor...</p>
                    <p className="text-sm text-slate-400 mt-1">Python sunucusu (FastAPI) henüz hazır değil.</p>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">localhost:8000 bekleniyor</p>
                </div>
                <button
                    onClick={fetchRecords}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-semibold text-slate-600 transition-all"
                >
                    <RefreshCw size={14} /> Tekrar Dene
                </button>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col bg-white text-slate-800 overflow-hidden font-sans">

            {/* ══ HEADER ══ */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
                <div className="p-1.5 bg-red-50 border border-red-200 rounded-lg">
                    <Database size={15} className="text-[#A01B1B]" />
                </div>
                <div>
                    <h2 className="text-[13px] font-bold text-slate-800 leading-none">Vektör Hafıza Yönetimi</h2>
                    <p className="text-[10px] text-slate-400 mt-0.5">ChromaDB • Kalıcı Depolama • {COLLECTION}</p>
                </div>

                {/* ── metrikler ── */}
                <div className="ml-4 flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg">
                        <BarChart3 size={11} className="text-[#A01B1B]" />
                        <span className="text-[10px] font-semibold text-slate-600">
                            {totalVectors.toLocaleString('tr-TR')} Vektör
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg">
                        <Zap size={11} className="text-slate-400" />
                        <span className="text-[10px] font-semibold text-slate-600">
                            {records.length} Döküman
                        </span>
                    </div>
                </div>

                <div className="ml-auto flex items-center gap-2">
                    <button onClick={fetchRecords} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors" title="Yenile">
                        <RefreshCw size={13} className={`text-slate-400 ${dbLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)] inline-block" />
                        <span className="text-[10px] text-emerald-600 font-semibold">Bağlı</span>
                    </div>
                </div>
            </div>

            {/* ══ ÜST İKİLİ PANEL ══ */}
            {!readOnly && (
                <div className="flex border-b border-slate-200 transition-[height] duration-500 ease-in-out" style={{ height: expandedRecord ? '30%' : '55%', minHeight: 0 }}>

                {/* ── PANEL 1: BESLEME ALANI ── */}
                <DatabaseDropzone
                    phase={phase}
                    useVision={useVision}
                    setUseVision={setUseVision}
                    dragOver={dragOver}
                    setDragOver={setDragOver}
                    dragActive={dragActive}
                    handleDrop={handleDrop}
                    handleFileInput={handleFileInput}
                    dropRef={dropRef}
                    progress={progress}
                    stagedFile={stagedFile}
                    handleCancel={handleCancel}
                    chunksLength={chunks.length}
                    approvedCount={approvedChunks.size}
                />
                <DatabaseQuarantine
                    chunks={chunks}
                    phase={phase}
                    skeletonChunks={skeletonChunks}
                    approvedChunks={approvedChunks}
                    handleApproveAll={handleApproveAll}
                    toggleApproval={toggleApproval}
                    handleSave={handleSave}
                    saveError={saveError}
                />
            </div>
            )}

            {/* ══ PANEL 3: AKTİF HAFIZA TABLOSU ══ */}
            <DatabaseMemoryTable
                records={records}
                filteredRecords={filteredRecords}
                dbLoading={dbLoading}
                search={search}
                setSearch={setSearch}
                expandedRecord={expandedRecord}
                toggleRecordExpansion={toggleRecordExpansion}
                recordVectors={recordVectors}
                expandedPages={expandedPages}
                togglePageExpansion={togglePageExpansion}
                deleteConfirm={deleteConfirm}
                setDeleteConfirm={setDeleteConfirm}
                handleDeleteRecord={handleDeleteRecord}
                handleDeleteVector={handleDeleteVector}
                fetchRecords={fetchRecords}
            />
        </div>
    );
};

export default DatabaseViewer;