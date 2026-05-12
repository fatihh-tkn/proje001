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
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useErrorStore } from '../../store/errorStore';
import { mutate } from '../../api/client';

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
const DatabaseViewer = ({ readOnly, onOpenFile }) => {
    const currentUser = useWorkspaceStore(state => state.currentUser);
    const addToast = useErrorStore((s) => s.addToast);
    const [backendReady, setBackendReady] = useState(null); // null=kontrol ediliyor, true=hazır, false=kapalı
    const [phase, setPhase] = useState('idle');          // idle | analyzing | staged | saving | error
    const [useVision, setUseVision] = useState(false);
    const [visionFailedCount, setVisionFailedCount] = useState(0); // backend'den gelen vision hata sayısı
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
    const [analysisError, setAnalysisError] = useState('');
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
                        setApprovedChunks(new Set());
                        if (data.temp_path) setTempFilePath(data.temp_path);
                        setAnalysisError('');
                        setVisionFailedCount(data.vision_failed || 0);
                        setPhase('staged');
                    } else if (data.chunks && data.chunks.length === 0) {
                        setAnalysisError('Dosyadan hiç parça çıkarılamadı. Dosyanın metin içerdiğinden emin olun.');
                        setChunks([]);
                        setPhase('error');
                    } else {
                        setAnalysisError(data.message || 'Sunucu geçerli parça döndermedi.');
                        setChunks([]);
                        setPhase('error');
                    }
                } catch (err) {
                    setAnalysisError(`Sunucu yanıtı okunamadı: ${err.message}`);
                    setChunks([]);
                    setPhase('error');
                }
            } else {
                let errMsg = `Sunucu ${xhr.status} hatası döndü.`;
                try { const errData = JSON.parse(xhr.responseText); errMsg = errData.detail || errMsg; } catch (_) { }
                setAnalysisError(errMsg);
                setChunks([]);
                addToast({ type: 'error', message: `Analiz hatası (${xhr.status}): ${errMsg}`, duration: 6000 });
                setPhase('error');
            }
        };

        xhr.onerror = () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setProgress(0);
            setSkeletonChunks(0);
            const errMsg = 'Ağ hatası veya bağlantı koptu. Sunucu çalışıyor mu?';
            setAnalysisError(errMsg);
            setChunks([]);
            addToast({ type: 'error', message: errMsg, duration: 6000 });
            setPhase('error');
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
                addToast({ type: 'error', message: 'Arşiv dosyası aktarılamadı.' });
            }
        }
    };

    const handleFileInput = (e) => {
        const file = e.target.files?.[0];
        if (file) startAnalysis(file);
    };

    /* ── tümünü kaydet ── */
    const handleSave = async () => {
        if (phase !== 'staged' || !stagedFile || approvedChunks.size === 0) return;
        const validChunks = chunks.filter(c =>
            approvedChunks.has(c.id) &&
            !c.id.startsWith('error-') &&
            !c.id.startsWith('warn-')
        );
        if (validChunks.length === 0) return;
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
                        chroma_collection: COLLECTION,
                        user_id: currentUser?.id || null,
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

            // Başarı bildirimi
            addToast({
                type: archiveWarning ? 'info' : 'success',
                message: archiveWarning
                    ? `Belge kısmen kaydedildi: ${safeFileName} — ${archiveWarning}`
                    : `Belge kaydedildi: ${safeFileName}`,
                copyable: !!archiveWarning,
            });
            if (archiveWarning) setSaveError(`⚠️ ${archiveWarning}`);

            await fetchRecords(); // Listeyi SQL'den taze çeker
            dispatchArchiveChanged();
        } catch (err) {
            const msg = err.message || 'Kayıt sırasında hata oluştu.';
            setSaveError(msg);
            addToast({ type: 'error', message: `Vektörleştirme hatası: ${msg}`, duration: 8000 });
            setPhase('staged');
        }
    };


    const handleDeleteRecord = async (rec) => {
        setDeleteConfirm(null);
        try {
            await mutate.remove('/api/archive/delete',
                { ids: [rec.id] },
                { subject: 'Belge', detail: rec.dosya_adi || rec.filename }
            );
            if (expandedRecord === rec.id) setExpandedRecord(null);
            await fetchRecords();
            dispatchArchiveChanged();
        } catch { /* mutate toast attı */ }
    };

    const handleDeleteVector = async (recId, vectorId) => {
        setDeleteConfirm(null);
        try {
            await mutate.remove(`/api/chunk/${encodeURIComponent(vectorId)}`, null,
                { subject: 'Parça' }
            );
            setRecordVectors(prev => {
                const updated = { ...prev };
                if (updated[recId]) {
                    updated[recId] = updated[recId].filter(v => v.id !== vectorId);
                }
                return updated;
            });
            await fetchRecords();
        } catch { /* mutate toast attı */ }
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
        if (xhrRef.current) xhrRef.current.abort();
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        clearInterval(progressRef.current);
        setPhase('idle');
        setStagedFile(null);
        setChunks([]);
        setApprovedChunks(new Set());
        setProgress(0);
        setSkeletonChunks(0);
        setPendingMediaFile(null);
        setAnalysisError('');
        setSaveError('');
        setVisionFailedCount(0);
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
            <div className="w-full h-full flex flex-col items-center justify-center gap-5 bg-stone-50 text-stone-500">
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
        <div className="w-full h-full flex flex-col bg-stone-50 text-stone-800 overflow-hidden select-none">

            {/* ══ VİSİON BAŞARISIZ DİALOGU ══ */}
            {visionFailedCount > 0 && phase === 'staged' && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/25 backdrop-blur-[2px]">
                    <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 p-6 max-w-sm w-full mx-4 flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl shrink-0">
                                <AlertTriangle size={20} className="text-amber-500" />
                            </div>
                            <div>
                                <p className="text-[14px] font-bold text-stone-800 mb-1">
                                    Vision İşlemi Başarısız
                                </p>
                                <p className="text-[12px] text-stone-500 leading-relaxed">
                                    <strong className="text-stone-700">{visionFailedCount}</strong> görsel bölüm okunamadı.
                                    Model görsel çıktıyı desteklemiyor olabilir.
                                    Yine de metin bazlı parçalarla devam edebilirsiniz.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => setVisionFailedCount(0)}
                                className="w-full py-2.5 bg-[#378ADD] hover:bg-[#2d6fb5] text-white rounded-lg text-[12px] font-bold transition-all"
                            >
                                Görsel Okuma Olmadan Devam Et
                            </button>
                            <button
                                onClick={() => handleCancel()}
                                className="w-full py-2 text-stone-400 hover:text-stone-600 rounded-lg text-[12px] font-medium transition-all"
                            >
                                İptal Et
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ ÜST İKİLİ PANEL ══ */}
            {
                !readOnly && (
                    <div className="relative z-50 flex border-b border-stone-200 transition-[height] duration-500 ease-in-out shadow-[0_4px_20px_-15px_rgba(0,0,0,0.1)]" style={{ height: expandedRecord ? '0' : '55%', minHeight: 0, overflow: 'hidden' }}>

                        {/* ── PANEL 1: BESLEME ALANI / MODEL SEÇİM ── */}
                        {pendingMediaFile ? (
                            <div className="flex-1 flex flex-col bg-white border-r border-stone-200 overflow-hidden"
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }}>

                                {/* Dosya bilgisi */}
                                <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-3 bg-stone-50 relative shrink-0">
                                    <button onClick={() => setPendingMediaFile(null)} className="absolute top-3 right-3 text-stone-300 hover:text-[#991B1B] transition-colors p-0.5"><X size={13} /></button>
                                    <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center shrink-0">
                                        {pendingMediaFile.type?.startsWith('video/') ? (
                                            <div className="w-4 h-4 rounded bg-[#378ADD]/10 text-[#378ADD] flex items-center justify-center text-[10px]">▶</div>
                                        ) : (
                                            <div className="text-base leading-none">♫</div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 pr-6">
                                        <p className="text-[12px] font-bold text-stone-800 truncate">{pendingMediaFile.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-bold text-stone-400">{(pendingMediaFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                                            <span className="text-[10px] font-bold text-[#378ADD]">⏱ {mediaDuration || "Ölçülüyor..."}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Seçenekler */}
                                <div className="flex-1 overflow-y-auto py-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-stone-200">

                                    <div className="px-4 pt-3 pb-1.5">
                                        <span className="text-[9px] font-black tracking-[0.18em] text-stone-400 uppercase">Transkripsiyon Modeli</span>
                                    </div>
                                    {[
                                        { id: 'tiny',     label: 'Whisper Tiny',     tag: 'Hızlı',     desc: 'Kabataslak notlar için',             color: '#6b7280', bg: '#f3f4f6' },
                                        { id: 'base',     label: 'Whisper Base',     tag: 'Dengeli',   desc: 'Normal toplantı kayıtları için',     color: '#378ADD', bg: '#EBF4FD' },
                                        { id: 'large-v3', label: 'Whisper Large v3', tag: 'Gelişmiş',  desc: 'GPU gerektirir · Kusursuz doğruluk',  color: '#7c3aed', bg: '#f5f3ff' },
                                    ].map(m => {
                                        const isSel = selectedModel === m.id;
                                        return (
                                            <div
                                                key={m.id}
                                                onClick={() => setSelectedModel(m.id)}
                                                className={`relative flex items-center gap-2.5 px-4 py-2.5 cursor-pointer transition-all duration-100
                                                    ${isSel ? 'bg-[#378ADD]/8 text-stone-800' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'}`}
                                            >
                                                {isSel && <span className="absolute left-0 top-1 bottom-1 w-[2px] bg-[#378ADD] rounded-r" />}
                                                <div className="w-6 h-6 shrink-0 rounded flex items-center justify-center text-[9px] font-black text-white" style={{ background: m.color }}>W</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`text-[12px] truncate ${isSel ? 'font-bold' : 'font-medium'}`}>{m.label}</span>
                                                        <span className="text-[9px] font-black px-1.5 py-px rounded tracking-wide shrink-0" style={{ color: m.color, background: m.bg }}>{m.tag}</span>
                                                    </div>
                                                    <span className="text-[10px] text-stone-400 font-mono">{m.desc}</span>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    <div className="px-4 pt-4 pb-1.5">
                                        <span className="text-[9px] font-black tracking-[0.18em] text-stone-400 uppercase">Hesaplama Cihazı</span>
                                    </div>
                                    {[
                                        { id: 'cpu',  label: 'İşlemci (CPU)',     tag: 'Evrensel', desc: 'Tüm sistemlerde çalışır',            color: '#0369a1', bg: '#e0f2fe' },
                                        { id: 'cuda', label: 'Ekran Kartı (GPU)', tag: 'Hızlı',    desc: 'NVIDIA CUDA gerektirir · 4× hız',    color: '#059669', bg: '#d1fae5' },
                                    ].map(d => {
                                        const isSel = computeDevice === d.id;
                                        return (
                                            <div
                                                key={d.id}
                                                onClick={() => setComputeDevice(d.id)}
                                                className={`relative flex items-center gap-2.5 px-4 py-2.5 cursor-pointer transition-all duration-100
                                                    ${isSel ? 'bg-[#378ADD]/8 text-stone-800' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'}`}
                                            >
                                                {isSel && <span className="absolute left-0 top-1 bottom-1 w-[2px] bg-[#378ADD] rounded-r" />}
                                                <div className="w-6 h-6 shrink-0 rounded flex items-center justify-center text-[9px] font-black text-white" style={{ background: d.color }}>
                                                    {d.id === 'cpu' ? 'C' : 'G'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`text-[12px] truncate ${isSel ? 'font-bold' : 'font-medium'}`}>{d.label}</span>
                                                        <span className="text-[9px] font-black px-1.5 py-px rounded tracking-wide shrink-0" style={{ color: d.color, background: d.bg }}>{d.tag}</span>
                                                    </div>
                                                    <span className="text-[10px] text-stone-400 font-mono">{d.desc}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Yükle butonu */}
                                <div className="px-4 py-3 border-t border-stone-100 bg-white shrink-0">
                                    <button
                                        onClick={() => {
                                            executeAnalysis(pendingMediaFile, selectedModel, computeDevice);
                                            setPendingMediaFile(null);
                                        }}
                                        className="w-full py-2.5 bg-[#378ADD] hover:bg-[#0C447C] text-white text-[12px] font-bold rounded-md transition-all flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0-12l4 4m-4-4L8 8m-4 8v1a3 3 0 003 3h10a3 3 0 003-3v-1" /></svg>
                                        Yükle
                                    </button>
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
                                analysisError={analysisError}
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
                totalChunks={records.reduce((acc, r) => acc + (r.chunks || 0), 0)}
                totalDocs={records.length}
                onOpenFile={onOpenFile}
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