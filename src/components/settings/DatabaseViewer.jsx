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
import { dispatchArchiveChanged, useArchiveChangedListener } from '../../utils/archiveEvents';

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
    <div className="bg-white border border-stone-100 rounded-xl p-3 animate-pulse">
        <div className="flex gap-2">
            <div className="w-3 h-3 rounded bg-stone-200 mt-0.5 shrink-0" />
            <div className="flex-1 space-y-1.5">
                <div className="h-2.5 bg-stone-200 rounded w-full" />
                <div className="h-2.5 bg-stone-200 rounded w-4/5" />
            </div>
        </div>
        <div className="flex gap-4 mt-2.5 pt-2 border-t border-stone-100">
            <div className="h-2 bg-stone-100 rounded w-16" />
            <div className="h-2 bg-stone-100 rounded w-20" />
        </div>
    </div>
);

/* ── Skeleton tablo satırı ── */
const SkeletonRow = () => (
    <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr_40px] items-center px-5 py-3.5 border-b border-stone-100 animate-pulse">
        {[['w-40', 'mr-2'], ['w-20'], ['w-14'], ['w-24'], []].map(([w, extra], i) =>
            w ? <div key={i} className={`h-2.5 bg-stone-200 rounded ${w} ${extra || ''}`} /> : <div key={i} />
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
    const [pendingMediaFile, setPendingMediaFile] = useState(null);
    const [mediaDuration, setMediaDuration] = useState(null);
    const [selectedModel, setSelectedModel] = useState('base');
    const [computeDevice, setComputeDevice] = useState('cuda');
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
    const xhrRef = useRef(null);
    const pollIntervalRef = useRef(null);

    useEffect(() => {
        return () => {
            if (xhrRef.current) xhrRef.current.abort();
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, []);

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
    useArchiveChangedListener(fetchRecords);

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
    const executeAnalysis = (file, whisperModel = "large-v3", whisperDevice = "cuda") => {
        // Önceki yüklemeden kalan interval'ı temizle (üzerine yazılıp kaybolmasın)
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        if (xhrRef.current) {
            xhrRef.current.abort();
            xhrRef.current = null;
        }

        setStagedFile(file);
        setPhase('analyzing');
        setProgress(0);
        setChunks([]);
        setSkeletonChunks(Math.floor(Math.random() * 5) + 3);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('use_vision', useVision ? 'true' : 'false');
        formData.append('whisper_model', whisperModel);
        formData.append('whisper_device', whisperDevice);

        const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        formData.append('task_id', taskId);

        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open('POST', '/api/upload-and-analyze', true);

        const isMedia = file.type.startsWith('audio/') || file.type.startsWith('video/') || file.name.match(/\.(mp3|wav|ogg|m4a|flac|aac|opus|wma|mp4|avi|mov|mkv|webm|m4v|wmv)$/i);

        // Upload progressini gercek zamanli goster (dosya aktarimi)
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const cap = isMedia ? 15 : 85;
                const percent = (e.loaded / e.total) * cap;
                setProgress(Math.round(percent) || 1);
            }
        };

        const stopPolling = () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };

        let pollInterval = null;
        if (isMedia) {
            pollInterval = setInterval(async () => {
                try {
                    const r = await fetch(`/api/progress/${taskId}`);
                    if (!r.ok) { stopPolling(); return; }

                    const d = await r.json();

                    // İş bitti veya bilinmiyor → interval'ı durdur
                    if (d.status === 'done' || d.status === 'idle') {
                        stopPolling();
                        return;
                    }

                    const realPercent = d.percent > 0 ? Math.round(d.percent) : 0;

                    setProgress(prev => {
                        if (d.status === 'loading_model' && prev >= 15 && prev < 24) return prev + 1;
                        if (d.status === 'transcribing' && prev >= 25 && prev < 35 && realPercent <= prev) return prev + 1;
                        if (realPercent > prev) return realPercent;
                        return prev;
                    });
                } catch (_) { }
            }, 1000);
            pollIntervalRef.current = pollInterval;
        } else {
            let currentProg = 85;
            pollInterval = setInterval(() => {
                if (currentProg < 98) {
                    currentProg += (98 - currentProg) * 0.05;
                    setProgress(Math.round(currentProg));
                }
            }, 800);
            pollIntervalRef.current = pollInterval;
        }

        xhr.onload = () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setProgress(100);
            setSkeletonChunks(0);

            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);

                    if (data.status === 'success' && data.chunks && data.chunks.length > 0) {
                        const mapped = data.chunks.map(c => ({
                            id: c.id,
                            text: c.text,
                            page: c.metadata?.page || 1,
                            x: c.metadata?.bbox ? parseFloat(c.metadata.bbox.split(',')[0]).toFixed(1) : 0,
                            y: c.metadata?.bbox ? parseFloat(c.metadata.bbox.split(',')[1]).toFixed(1) : 0,
                            metadata: c.metadata
                        }));
                        setChunks(mapped);
                        setApprovedChunks(new Set()); // Chunklar Karantina mantigina uygun olarak kullanici tarafindan incelenip secilmeli
                        if (data.temp_path) {
                            setTempFilePath(data.temp_path);
                        }
                    } else if (data.chunks && data.chunks.length === 0) {
                        setChunks([{ id: 'warn-empty', text: 'Dosyadan hiç chunk çıkarılamadı. Dosyanın metin içerdiğinden emin olun.', page: 1, x: 0, y: 0 }]);
                    } else {
                        setChunks([{ id: 'warn-1', text: data.message || 'Sunucu geçerli chunk döndermedi.', page: 1, x: 0, y: 0 }]);
                    }
                    setPhase('staged');
                } catch (err) {
                    setChunks([{ id: 'error-1', text: `Sunucu yanıtı okunamadı: ${err.message}`, page: 1, x: 0, y: 0 }]);
                    setPhase('staged');
                }
            } else {
                let errMsg = `Hata: Sunucu ${xhr.status} döndü.`;
                try { const errData = JSON.parse(xhr.responseText); errMsg = errData.detail || errMsg; } catch (_) { }
                setChunks([{ id: 'error-1', text: errMsg, page: 1, x: 0, y: 0 }]);
                setPhase('staged');
            }
        };

        xhr.onerror = () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setProgress(100);
            setSkeletonChunks(0);
            setChunks([{ id: 'error-1', text: `Ağ hatası veya bağlantı koptu.`, page: 1, x: 0, y: 0 }]);
            setPhase('staged');
        };

        xhr.send(formData);
    };

    const startAnalysis = (file) => {
        const isMedia = file.type?.startsWith('audio/') || file.type?.startsWith('video/') || file.name.match(/\.(mp3|wav|ogg|m4a|flac|aac|opus|wma|mp4|avi|mov|mkv|webm|m4v|wmv)$/i);
        if (isMedia) {
            setPendingMediaFile(file);
            setMediaDuration("Ölçülüyor...");
            setSelectedModel('base');

            // Medya süresini (duration) hesapla
            const url = URL.createObjectURL(file);
            const media = new Audio(url);
            media.onloadedmetadata = () => {
                const totalSeconds = media.duration;
                if (!totalSeconds || isNaN(totalSeconds)) {
                    setMediaDuration("Süre Bilinmiyor");
                } else if (totalSeconds < 60) {
                    setMediaDuration(`${Math.round(totalSeconds)} Sn`);
                } else {
                    const mins = Math.floor(totalSeconds / 60);
                    const secs = Math.round(totalSeconds % 60);
                    setMediaDuration(`${mins} Dk ${secs} Sn`);
                }
                URL.revokeObjectURL(url);
            };
            media.onerror = () => setMediaDuration("Bilinmiyor");

            return;
        }
        executeAnalysis(file, "large-v3");
    };

    const getArchiveFileBlob = async (id) => {
        try {
            let realFileName = `arsiv_dosyasi_${id}`;
            // Liste üzerinden orijinal isme erişmeyi deneyelim
            const metaRes = await fetch('/api/archive/list');
            if (metaRes.ok) {
                const metaData = await metaRes.json();
                const found = (metaData.items || []).find(i => i.id === id);
                if (found) realFileName = found.filename;
            }

            const res = await fetch(`/api/archive/file/${id}`);
            if (!res.ok) throw new Error('Arşiv dosyası alınamadı');
            // Dosyanın adını header'dan (Content-Disposition) okumaya çalış, yoksa meta veriyi, yoksa fallback kullan
            const contentDisposition = res.headers.get('Content-Disposition');
            let hasExtensionFromHeader = false;
            if (contentDisposition && contentDisposition.includes('filename=')) {
                const matches = contentDisposition.match(/filename="?([^"]+)"?/);
                if (matches && matches[1]) {
                    realFileName = matches[1];
                    hasExtensionFromHeader = true;
                }
            }
            if (!hasExtensionFromHeader && !realFileName.includes('.')) {
                realFileName += '.pdf'; // Son çare fallback
            }

            const blob = await res.blob();
            return new File([blob], realFileName, { type: blob.type });
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
                archiveFile.sourceArchiveId = firstId;
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
            let belgeKimlik = stagedFile.sourceArchiveId || null;
            let archiveWarning = null;

            // temp_path varsa her zaman arşivle (arXivden düşürme durumunda da backend yeni temp_path üretir)
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
                    // Arşivden gelen dosyalarda sourceArchiveId tercih edilir, yoksa sunucudan al
                    belgeKimlik = belgeKimlik || archiveData.belge_kimlik || null;
                    if (!belgeKimlik) {
                        archiveWarning = 'Dosya arşivlendi ancak belge kimliği alınamadı. Depolama yolu boş kalabilir.';
                        console.warn('[handleSave] archive-document 200 ama belge_kimlik yok:', archiveData);
                    }
                } else {
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
                dispatchArchiveChanged();
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

        if (!recordVectors[rec.id]) {
            try {
                const res = await fetch(`/api/sql/documents/${encodeURIComponent(rec.id)}/chunks`);
                if (res.ok) {
                    const data = await res.json();
                    setRecordVectors(prev => ({ ...prev, [rec.id]: data.chunks || [] }));

                    // UX İyileştirmesi: Chunk'lar geldiğinde tüm sayfaları otomatik olarak açık yap
                    if (data.chunks && data.chunks.length > 0) {
                        const allPages = {};
                        data.chunks.forEach(v => {
                            const p = v.page || 'Genel';
                            allPages[p] = true;
                        });
                        setExpandedPages(allPages);
                    }
                } else {
                    setRecordVectors(prev => ({ ...prev, [rec.id]: [] }));
                }
            } catch (e) {
                console.error("Fetch vector list failed", e);
                setRecordVectors(prev => ({ ...prev, [rec.id]: [] }));
            }
        } else {
            // Zaten yüklüyse yine tüm sayfaları açık (expanded) duruma getir
            const allPages = {};
            recordVectors[rec.id].forEach(v => {
                const p = v.page || 'Genel';
                allPages[p] = true;
            });
            setExpandedPages(allPages);
        }
    };

    const togglePageExpansion = (page) => {
        setExpandedPages(prev => ({ ...prev, [page]: !prev[page] }));
    };

    const handleCancel = () => {
        if (xhrRef.current) xhrRef.current.abort();
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        clearInterval(progressRef.current);
        setPhase('idle'); setStagedFile(null); setChunks([]); setApprovedChunks(new Set()); setProgress(0); setSkeletonChunks(0); setPendingMediaFile(null);
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
            <div className="w-full h-full flex flex-col items-center justify-center gap-5 bg-white text-stone-500">
                <div className="p-5 bg-[#FAEEDA] border border-[#F5DDB3] rounded-2xl">
                    <Activity size={36} className="text-[#854F0B] animate-pulse" />
                </div>
                <div className="text-center">
                    <p className="text-base font-bold text-stone-700">Backend Başlatılıyor...</p>
                    <p className="text-sm text-stone-400 mt-1">Python sunucusu (FastAPI) henüz hazır değil.</p>
                    <p className="text-xs text-stone-400 mt-0.5 font-mono">localhost:8000 bekleniyor</p>
                </div>
                <button
                    onClick={fetchRecords}
                    className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 rounded-xl text-sm font-semibold text-stone-600 transition-all"
                >
                    <RefreshCw size={14} /> Tekrar Dene
                </button>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col bg-white text-stone-800 overflow-hidden font-sans">




            {/* ══ ÜST İKİLİ PANEL ══ */}
            {
                !readOnly && (
                    <div className="relative z-50 flex border-b border-stone-200 transition-[height] duration-500 ease-in-out" style={{ height: expandedRecord ? '30%' : '55%', minHeight: 0 }}>

                        {/* ── PANEL 1: BESLEME ALANI / MODEL SEÇİM ── */}
                        {pendingMediaFile ? (
                            <div className="flex-1 p-6 flex flex-col justify-center items-center bg-white border-r border-stone-200"
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                <div className="w-full max-w-[420px] rounded-2xl overflow-hidden border border-stone-200 shadow-sm animate-in fade-in zoom-in-95 duration-200 bg-white flex flex-col">
                                    <div className="p-5 border-b border-stone-100 flex items-start gap-4 relative bg-stone-50/30">
                                        <button onClick={() => setPendingMediaFile(null)} className="absolute top-4 right-4 text-stone-300 hover:text-[#791F1F] transition-colors p-1"><X size={16} /></button>

                                        <div className="w-12 h-12 rounded-xl bg-white border border-stone-200 shadow-sm flex items-center justify-center shrink-0">
                                            {pendingMediaFile.type?.startsWith('video/') ? (
                                                <div className="w-6 h-6 rounded bg-[#378ADD]/10 text-[#378ADD] flex items-center justify-center">▶</div>
                                            ) : (
                                                <div className="w-6 h-6 rounded bg-[#FAEEDA] text-[#854F0B] flex items-center justify-center text-lg leading-none mt-[-2px]">♫</div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 pr-6">
                                            <h3 className="text-[14px] font-bold text-stone-800 truncate">{pendingMediaFile.name}</h3>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-[11px] font-bold text-stone-500 border border-stone-200 bg-white px-2 py-0.5 rounded shadow-sm">
                                                    {(pendingMediaFile.size / (1024 * 1024)).toFixed(2)} MB
                                                </span>
                                                <span className="text-[11px] font-bold text-[#378ADD] bg-[#378ADD]/10 px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                                                    ⏱ {mediaDuration || "Ölçülüyor..."}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5 flex flex-col gap-3 bg-white">
                                        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 ml-1">Kullanılacak Yapay Zeka Modeli</div>
                                        <div className="flex bg-stone-100 p-1.5 rounded-xl border border-stone-200 shadow-inner">
                                            <button
                                                onClick={() => setSelectedModel('tiny')}
                                                className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-all ${selectedModel === 'tiny' ? 'bg-white text-stone-800 shadow-sm border border-stone-200/60' : 'text-stone-500 hover:text-stone-700'}`}
                                            >Hızlı</button>
                                            <button
                                                onClick={() => setSelectedModel('base')}
                                                className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-all ${selectedModel === 'base' ? 'bg-white text-stone-800 shadow-sm border border-stone-200/60' : 'text-stone-500 hover:text-stone-700'}`}
                                            >Dengeli</button>
                                            <button
                                                onClick={() => setSelectedModel('large-v3')}
                                                className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-all ${selectedModel === 'large-v3' ? 'bg-white text-stone-800 shadow-sm border border-stone-200/60' : 'text-stone-500 hover:text-stone-700'}`}
                                            >Gelişmiş</button>
                                        </div>

                                        <div className="flex bg-stone-100 p-1.5 rounded-xl border border-stone-200 shadow-inner mt-1">
                                            <button
                                                onClick={() => setComputeDevice('cpu')}
                                                className={`flex-1 py-1.5 text-[12px] font-bold rounded-lg transition-all ${computeDevice === 'cpu' ? 'bg-white text-stone-800 shadow-sm border border-stone-200/60' : 'text-stone-500 hover:text-stone-700'}`}
                                            >İşlemci (CPU)</button>
                                            <button
                                                onClick={() => setComputeDevice('cuda')}
                                                className={`flex-1 py-1.5 text-[12px] font-bold rounded-lg transition-all ${computeDevice === 'cuda' ? 'bg-white text-stone-800 shadow-sm border border-stone-200/60' : 'text-stone-500 hover:text-stone-700'}`}
                                            >Ekran Kartı (GPU)</button>
                                        </div>

                                        <div className="mt-1 min-h-[40px] flex items-center justify-center p-3 bg-stone-50 rounded-lg border border-stone-100">
                                            {selectedModel === 'tiny' && <span className="text-[11px] text-stone-500 font-medium text-center animate-in fade-in slide-in-from-top-1">İşlemcide şipşak sonuç verir. Kabataslak ve hızlı notlar içindir.</span>}
                                            {selectedModel === 'base' && <span className="text-[11px] text-stone-500 font-medium text-center animate-in fade-in slide-in-from-top-1">Hız ve doğruluk dengesi idealdir. Normal toplantı kayıtları için.</span>}
                                            {selectedModel === 'large-v3' && <span className="text-[11px] text-stone-500 font-medium text-center animate-in fade-in slide-in-from-top-1">Kusursuz harfiyen metin çıkarır. Güçlü GPU ekran kartı gerektirir.</span>}
                                        </div>
                                    </div>

                                    <div className="p-4 border-t border-stone-100 bg-stone-50/50">
                                        <button
                                            onClick={() => {
                                                executeAnalysis(pendingMediaFile, selectedModel, computeDevice);
                                                setPendingMediaFile(null);
                                            }}
                                            className="w-full py-3 bg-[#378ADD] hover:bg-[#0C447C] text-white text-[13px] font-bold rounded-xl shadow-lg shadow-[#378ADD]/30 transition-all hover:scale-[0.99] active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-4 h-4 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0-12l4 4m-4-4L8 8m-4 8v1a3 3 0 003 3h10a3 3 0 003-3v-1" /></svg>
                                            Yükle
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
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
                        )}
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