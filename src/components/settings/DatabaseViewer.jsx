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
            // Önce Backend/ChromaDB ayakta mı kontrol ediliyor
            await fetchWithTimeout(`${BASE}/collections/${COLLECTION}`, {}, 5000);
            setBackendReady(true);

            // Gerçek SQL listesini çek
            const res = await fetch('/api/sql/documents');
            if (!res.ok) throw new Error("SQL Belge listesi alınamadı");
            const data = await res.json();

            setRecords(data.records || []);
            setTotalVectors(data.records?.reduce((s, r) => s + (r.chunks || 0), 0) || 0);
        } catch (err) {
            console.error("fetchRecords error:", err);
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

    const getArchiveFileBlob = async (id) => {
        try {
            const res = await fetch(`/api/archive/file/${id}`);
            if (!res.ok) throw new Error('Arşiv dosyası alınamadı');
            // Dosyanın adını header'dan (Content-Disposition) okumaya çalış, yoksa varsayılan
            const contentDisposition = res.headers.get('Content-Disposition');
            let filename = `arsiv_dosyasi_${id}.pdf`; // Fallback extension
            if (contentDisposition && contentDisposition.includes('filename=')) {
                const matches = contentDisposition.match(/filename="?([^"]+)"?/);
                if (matches && matches[1]) filename = matches[1];
            }
            const blob = await res.blob();
            return new File([blob], filename, { type: blob.type });
        } catch (err) {
            console.error('Arşivden dosya okuma hatası:', err);
            return null;
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setDragOver(false);
        setDragActive(false);

        // 1. OS Üstünden Gelen Dosya Kontrolü
        const file = e.dataTransfer.files?.[0];
        if (file && phase === 'idle') {
            startAnalysis(file);
            return;
        }

        // 2. Arşiv'den Sürüklenen Dosya Kontrolü
        // (application/json veya itemId formatında)
        const payloadStr = e.dataTransfer.getData('application/json');
        let archiveIds = [];
        if (payloadStr) {
            try {
                const payload = JSON.parse(payloadStr);
                if (payload.type === 'archive_items' && payload.ids) {
                    archiveIds = payload.ids;
                }
            } catch (err) { }
        }
        if (archiveIds.length === 0) {
            const fallbackId = e.dataTransfer.getData('itemId');
            if (fallbackId) archiveIds = [fallbackId];
        }

        if (archiveIds.length > 0 && phase === 'idle') {
            // Şimdilik sadece ilk dosyayı analiz edelim
            const firstId = archiveIds[0];
            const archiveFile = await getArchiveFileBlob(firstId);
            if (archiveFile) {
                startAnalysis(archiveFile);
            } else {
                alert("Arşiv dosyası aktarılamadı.");
            }
        }
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

        // Backend'in uyguladığı normalize ile tutarlı olsun (boşluk → alt çizgi)
        const safeFileName = stagedFile.name.replace(/ /g, '_');

        try {
            // ── ADIM 1: Arşivleme (fiziksel dosya + belgeler tablosu) ──────────────
            let belgeKimlik = null;
            let archiveWarning = null;

            if (tempFilePath) {
                const archiveRes = await fetch('/api/archive-document', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        temp_path: tempFilePath,
                        final_name: safeFileName,
                        chunk_count: validChunks.length,
                        chroma_collection: COLLECTION
                    })
                });

                if (archiveRes.ok) {
                    const archiveData = await archiveRes.json();
                    belgeKimlik = archiveData.belge_kimlik ?? null;
                    if (!belgeKimlik) {
                        // Sunucu 200 döndürdü ama belge_kimlik yoksa beklenmedik durum
                        archiveWarning = 'Dosya arşivlendi ancak belge kimliği alınamadı. Depolama yolu boş kalabilir.';
                        console.warn('[handleSave] archive-document 200 ama belge_kimlik yok:', archiveData);
                    }
                } else {
                    // HTTP hata kodu → sessizce geçme, kullanıcıya uyar ama işlemi durdurma
                    let detail = '';
                    try { const errData = await archiveRes.json(); detail = errData.detail || ''; } catch (_) { }
                    archiveWarning = `Fiziksel arşivleme başarısız (${archiveRes.status}${detail ? ': ' + detail : ''}). Vektör kaydı yine de yapılacak ancak depolama yolu boş kalacak.`;
                    console.error('[handleSave] archive-document hata:', archiveRes.status, detail);
                }
            }

            // ── ADIM 2: Vektör + SQL İlişkileri kaydet ───────────────────────────
            const saveRes = await fetch('/api/save-to-db', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file_name: safeFileName,
                    chunks: validChunks,
                    collection_name: COLLECTION,
                    belge_kimlik: belgeKimlik   // null ise bridge kendi Belge'yi bulur/oluşturur
                })
            });

            if (!saveRes.ok) {
                const errData = await saveRes.json().catch(() => ({}));
                throw new Error(`Vektör kaydı başarısız: ${errData.detail || saveRes.status}`);
            }

            // localStorage yazımı iptal edildi, gerçek veritabanı yansıması kullanılacak.

            // ── Temizle & Yenile ─────────────────────────────────────────────────
            setPhase('idle');
            setStagedFile(null);
            setChunks([]);
            setApprovedChunks(new Set());
            setTempFilePath(null);

            // Arşiv uyarısı varsa kullanıcıya göster (kaydı engelleme)
            if (archiveWarning) setSaveError(`⚠️ ${archiveWarning}`);

            await fetchRecords(); // Listeyi SQL'den taze çeker
        } catch (err) {
            setSaveError(err.message || 'Kayıt sırasında hata oluştu.');
            setPhase('staged');
        }
    };


    const handleDeleteRecord = async (rec) => {
        setDeleteConfirm(null);

        try {
            // /api/archive/delete endpoint'i her şeyi (SQL + Chroma + Graph + Disk) atomik temizler
            const res = await fetch('/api/archive/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [rec.id] }),
            });

            if (res.ok) {
                if (expandedRecord === rec.id) setExpandedRecord(null);
                await fetchRecords(); // Tabloyu tazeleyelim
            } else {
                const err = await res.json().catch(() => ({}));
                alert(`Dosya silinemedi: ${err.detail || res.statusText}`);
            }
        } catch (err) {
            console.error("Record deletion failed:", err);
            alert("Dosya silinirken hata oluştu.");
        }
    };

    const handleDeleteVector = async (recId, vectorId) => {
        setDeleteConfirm(null);
        try {
            // /api/chunk/{id} endpoint'i parça bazlı atomik silme yapar (re-linking dahil)
            const res = await fetch(`/api/chunk/${encodeURIComponent(vectorId)}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                // UI'ı anlık güncelle
                setRecordVectors(prev => {
                    const updated = { ...prev };
                    if (updated[recId]) {
                        updated[recId] = updated[recId].filter(v => v.id !== vectorId);
                    }
                    return updated;
                });
                await fetchRecords(); // İstatistikleri (parça sayısı) güncelle
            } else {
                const err = await res.json().catch(() => ({}));
                alert(`Parça silinemedi: ${err.detail || res.statusText}`);
            }
        } catch (err) {
            console.error("Vector item deletion error", err);
            alert("Parça silinirken hata oluştu.");
        }
    };


    const [recordGraphStats, setRecordGraphStats] = useState({});

    const toggleRecordExpansion = async (rec) => {
        if (expandedRecord === rec.id) {
            setExpandedRecord(null);
            setExpandedPages({});
            return;
        }

        setExpandedRecord(rec.id);
        setExpandedPages({});

        // Graph stats fetch
        if (!recordGraphStats[rec.id]) {
            try {
                const url = `/api/sql/file-graph-stats?filename=${encodeURIComponent(rec.file)}`;
                const graphRes = await fetch(url);
                if (graphRes.ok) {
                    const stats = await graphRes.json();
                    setRecordGraphStats(prev => ({ ...prev, [rec.id]: stats }));
                }
            } catch (err) {
                console.error("Fetch graph stats failed", err);
            }
        }

        // Fetch actual vectors from Chroma DB mapping to this file if we havent yet
        if (!recordVectors[rec.id]) {
            try {
                const res = await fetch(`${BASE}/collections/${COLLECTION}/documents?limit=50000`);
                if (res.ok) {
                    const data = await res.json();

                    const vectors = [];
                    if (data && Array.isArray(data.ids)) {
                        for (let i = 0; i < data.ids.length; i++) {
                            const meta = data.metadatas ? data.metadatas[i] : null;
                            if (meta && (meta.file === rec.file || meta.source === rec.file)) {
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


            {/* ══ ÜST İKİLİ PANEL ══ */}
            {
                !readOnly && (
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
                )
            }

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
                recordGraphStats={recordGraphStats}
            />
        </div >
    );
};

export default DatabaseViewer;