import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    Database, Upload, CheckCircle2, Trash2, Zap, FileText,
    RefreshCw, Loader2, ShieldCheck, Save, CornerDownRight,
    X, AlertTriangle, Activity, Search, CheckCheck, BarChart3,
    AlignLeft, Layers, ChevronDown, ChevronRight
} from 'lucide-react';

const BASE = '/api/db';
const COLLECTION = 'documents';

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
const DatabaseViewer = () => {
    const [phase, setPhase] = useState('idle');          // idle | analyzing | staged | saving
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
            await fetch(`${BASE}/collections/${COLLECTION}`).catch(() => { });
            const stored = JSON.parse(localStorage.getItem('db_records') || '[]');
            setRecords(stored);
            setTotalVectors(stored.reduce((s, r) => s + (r.chunks || 0), 0));
        } catch {
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

    /* ── analiz animasyonu ── */
    const startAnalysis = (file) => {
        setStagedFile(file);
        setPhase('analyzing');
        setProgress(0);
        setChunks([]);
        setSkeletonChunks(Math.floor(Math.random() * 5) + 3);
        let p = 0;
        progressRef.current = setInterval(() => {
            p += Math.random() * 13 + 4;
            if (p >= 100) {
                p = 100;
                clearInterval(progressRef.current);
                setSkeletonChunks(0);
                setChunks(makeChunks(file));
                setApprovedChunks(new Set());
                setPhase('staged');
            }
            setProgress(Math.min(p, 100));
        }, 150);
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
                    metadatas: validChunks.map(c => ({ file: stagedFile.name, page: c.page, x: c.x, y: c.y })),
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
            setPhase('idle'); setStagedFile(null); setChunks([]); setApprovedChunks(new Set());
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
            <div className="flex border-b border-slate-200 transition-[height] duration-500 ease-in-out" style={{ height: expandedRecord ? '30%' : '55%', minHeight: 0 }}>

                {/* ── PANEL 1: BESLEME ALANI ── */}
                <div className="w-[42%] shrink-0 border-r border-slate-200 flex flex-col">
                    <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 shrink-0 bg-slate-50/60">
                        <Upload size={12} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Besleme Alanı</span>
                        {(phase === 'staged' || phase === 'saving') && (
                            <button onClick={handleCancel} className="ml-auto text-slate-400 hover:text-red-500 transition-colors">
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    <div className="flex-1 p-4 flex items-center justify-center">
                        {/* ── idle: drop zone ── */}
                        {phase === 'idle' && (
                            <label
                                onDragEnter={() => setDragOver(true)}
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={(e) => {
                                    if (!dropRef.current?.contains(e.relatedTarget)) setDragOver(false);
                                }}
                                onDrop={handleDrop}
                                ref={dropRef}
                                className={`relative w-full h-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 overflow-hidden group select-none
                                    ${dragOver || dragActive
                                        ? 'border-[#A01B1B] bg-red-50 shadow-[0_0_0_4px_rgba(160,27,27,0.08),inset_0_0_20px_rgba(160,27,27,0.04)]'
                                        : 'border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-white'
                                    }`}
                            >
                                <input type="file" className="hidden" onChange={handleFileInput} accept=".pdf,.txt,.docx,.bpmn,.xlsx" />

                                {/* köşe aksentleri */}
                                {['top-3 left-3', 'top-3 right-3', 'bottom-3 left-3', 'bottom-3 right-3'].map(pos => (
                                    <span key={pos} className={`absolute ${pos} w-3.5 h-3.5 transition-all duration-200
                                        ${pos.includes('top') && pos.includes('left') ? 'border-t-2 border-l-2 rounded-tl' : ''}
                                        ${pos.includes('top') && pos.includes('right') ? 'border-t-2 border-r-2 rounded-tr' : ''}
                                        ${pos.includes('bottom') && pos.includes('left') ? 'border-b-2 border-l-2 rounded-bl' : ''}
                                        ${pos.includes('bottom') && pos.includes('right') ? 'border-b-2 border-r-2 rounded-br' : ''}
                                        ${dragOver || dragActive ? 'border-[#A01B1B] scale-110' : 'border-slate-300 group-hover:border-slate-500'}
                                    `} />
                                ))}

                                {/* ikon */}
                                <div className={`p-4 rounded-xl mb-4 transition-all duration-200
                                    ${dragOver || dragActive
                                        ? 'bg-red-100 border border-red-200 scale-110'
                                        : 'bg-white border border-slate-200 group-hover:border-slate-300 shadow-sm'
                                    }`}
                                >
                                    <Upload size={28} className={`transition-colors ${dragOver || dragActive ? 'text-[#A01B1B]' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                </div>

                                <p className={`text-sm font-semibold transition-colors ${dragOver || dragActive ? 'text-[#A01B1B]' : 'text-slate-600 group-hover:text-slate-800'}`}>
                                    {dragOver || dragActive ? 'Dosyayı bırakın' : 'Dosya sürükleyin veya seçin'}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-1.5">PDF, DOCX, TXT, BPMN, XLSX</p>

                                {/* pulse ring - drag active */}
                                {(dragOver || dragActive) && (
                                    <span className="absolute inset-0 rounded-xl border-2 border-[#A01B1B]/30 animate-ping pointer-events-none" />
                                )}
                            </label>
                        )}

                        {/* ── analyzing: spinner + progress ── */}
                        {phase === 'analyzing' && (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-5 px-6">
                                <div className="relative w-16 h-16 flex items-center justify-center">
                                    <div className="absolute inset-0 rounded-full border-2 border-slate-200" />
                                    <div className="absolute inset-0 rounded-full border-t-2 border-[#A01B1B] animate-spin" />
                                    <div className="absolute inset-2 rounded-full border border-slate-100 border-t-red-200 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
                                    <Activity size={18} className="text-[#A01B1B]" />
                                </div>
                                <div className="w-full text-center">
                                    <p className="text-[12px] font-semibold text-slate-800 mb-0.5 truncate">{stagedFile?.name}</p>
                                    <p className="text-[11px] text-slate-500 mb-4">OCR ve Koordinat Taraması yapılıyor...</p>
                                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[#A01B1B] rounded-full transition-all duration-150"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1.5 text-right">{Math.round(progress)}%</p>
                                </div>
                            </div>
                        )}

                        {/* ── staged / saving ── */}
                        {(phase === 'staged' || phase === 'saving') && stagedFile && (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-4">
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                                    <CheckCircle2 size={26} className="text-emerald-500" />
                                </div>
                                <p className="text-[13px] font-semibold text-slate-800 truncate max-w-full">{stagedFile.name}</p>
                                <p className="text-[11px] text-slate-500 text-center">
                                    Analiz tamamlandı.<br />
                                    <span className="text-[#A01B1B] font-semibold">{chunks.length} parçadan {approvedChunks.size} adedi</span> onaylandı.
                                </p>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                                    <ShieldCheck size={12} className="text-amber-500" />
                                    <span className="text-[10px] text-amber-600 font-medium">Veritabanı korunuyor</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── PANEL 2: KARANTİNA ── */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 shrink-0 bg-slate-50/60">
                        <ShieldCheck size={12} className="text-amber-500" />
                        <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Karantina / Onay İstasyonu</span>
                        {/* ── TOPLU ONAY (sağ üst köşe) ── */}
                        {chunks.length > 0 && phase !== 'saving' && (
                            <button
                                onClick={handleApproveAll}
                                className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-[#A01B1B] hover:bg-[#8a1717] text-white text-[10px] font-bold rounded-lg transition-all active:scale-95 shadow-sm"
                                title="Tüm Parçaları Onayla"
                            >
                                <CheckCheck size={11} /> Tümünü Onayla
                            </button>
                        )}
                        {chunks.length > 0 && (
                            <span className={`text-[10px] bg-amber-100 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full font-semibold ${chunks.length > 0 && phase !== 'saving' ? '' : 'ml-auto'}`}>
                                {chunks.length} parça
                            </span>
                        )}
                    </div>

                    {/* skeleton + chunks */}
                    {skeletonChunks > 0 ? (
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {Array.from({ length: skeletonChunks }).map((_, i) => <SkeletonChunk key={i} />)}
                        </div>
                    ) : chunks.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 p-6">
                            <ShieldCheck size={26} className="text-slate-300" />
                            <p className="text-[11px] text-center text-slate-400">
                                Dosya analiz edildiğinde parçalar<br />burada onay için sıralanacak.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col flex-1 min-h-0">
                            <div className="flex-1 overflow-y-auto p-3 space-y-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">
                                {chunks.map((c, idx) => {
                                    const isApproved = approvedChunks.has(c.id);
                                    return (
                                        <div
                                            key={c.id}
                                            onClick={() => toggleApproval(c.id)}
                                            className={`bg-white border-2 rounded-xl p-3 hover:shadow-sm transition-all cursor-pointer ${isApproved ? 'border-[#A01B1B] bg-red-50/20' : 'border-slate-200 hover:border-slate-300'}`}
                                        >
                                            <div className="flex items-start gap-2">
                                                <CornerDownRight size={11} className="text-slate-400 mt-0.5 shrink-0" />
                                                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed flex-1">{c.text}</p>
                                            </div>
                                            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100">
                                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                    <FileText size={9} /> Sayfa {c.page}
                                                </span>
                                                <span className="text-[10px] text-slate-400">[x:{c.x}, y:{c.y}]</span>
                                                <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold">
                                                    {isApproved ? <CheckCircle2 size={11} className="text-[#A01B1B]" /> : <></>}
                                                    <span className={isApproved ? "text-[#A01B1B]" : "text-amber-500"}>#{idx + 1}</span>
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {saveError && (
                                <div className="mx-3 mb-2 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg shrink-0">
                                    <AlertTriangle size={12} className="text-red-500 shrink-0" />
                                    <p className="text-[11px] text-red-600">{saveError}</p>
                                </div>
                            )}

                            <div className="p-3 shrink-0 border-t border-slate-200 bg-slate-50/40">
                                <button
                                    onClick={handleSave}
                                    disabled={phase === 'saving' || approvedChunks.size === 0}
                                    className={`w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm focus:outline-none
                                        ${approvedChunks.size > 0
                                            ? 'bg-[#A01B1B] hover:bg-[#8a1717] text-white hover:shadow-md active:scale-[0.98]'
                                            : 'bg-slate-200 text-slate-400 hover:bg-slate-300'}
                                        ${(phase === 'saving' || approvedChunks.size === 0) ? 'cursor-not-allowed opacity-70' : ''}`}
                                >
                                    {phase === 'saving'
                                        ? <><Loader2 size={15} className="animate-spin" /> Kaydediliyor...</>
                                        : <><Save size={15} /> Vektörleştir ve Hafızaya Kaydet</>
                                    }
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ══ PANEL 3: AKTİF HAFIZA TABLOSU ══ */}
            <div className="flex flex-col flex-1 min-h-0">
                <div className="px-5 py-2 border-b border-slate-200 flex items-center gap-2 shrink-0 bg-slate-50/60">
                    <Zap size={12} className="text-[#A01B1B]" />
                    <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Aktif Hafıza / Veritabanı</span>

                    {/* ── ARAMA ÇUBUĞU ── */}
                    <div className="ml-3 relative flex-1 max-w-xs">
                        <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Dosya ara..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-7 pr-3 py-1 text-[11px] bg-white border border-slate-200 rounded-lg
                                focus:outline-none focus:border-[#A01B1B] focus:ring-1 focus:ring-red-100
                                placeholder:text-slate-300 text-slate-700 transition-all"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X size={10} />
                            </button>
                        )}
                    </div>

                    <span className="ml-auto text-[10px] text-slate-400">
                        {search ? `${filteredRecords.length} / ${records.length}` : `${records.length}`} kayıt
                    </span>
                </div>

                {/* Tablo başlıkları */}
                <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr_40px] items-center px-5 py-2 border-b border-slate-100 bg-slate-50 shrink-0">
                    {['Dosya Adı', 'Durum', 'Parça Sayısı', 'Eklenme Tarihi', ''].map(h => (
                        <span key={h} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</span>
                    ))}
                </div>

                {/* Satırlar */}
                <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">
                    {dbLoading && (
                        <>
                            {[1, 2, 3].map(i => <SkeletonRow key={i} />)}
                        </>
                    )}
                    {!dbLoading && filteredRecords.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 py-8">
                            <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl">
                                <Database size={24} className="text-slate-300" />
                            </div>
                            <div className="text-center">
                                <p className="text-[12px] font-medium text-slate-500">
                                    {search ? `"${search}" için sonuç bulunamadı` : 'Henüz indekslenmiş dosya yok'}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    {search ? 'Farklı bir arama terimi deneyin' : 'Dosya yükleyip onaylayarak başlayın'}
                                </p>
                            </div>
                        </div>
                    )}
                    {!dbLoading && filteredRecords.map((rec, i) => (
                        <div key={rec.id} className="border-b border-slate-100">
                            <div
                                onClick={() => toggleRecordExpansion(rec)}
                                className={`grid grid-cols-[2fr_1fr_1fr_1.5fr_40px] items-center px-5 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                            >
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                    <FileText size={13} className="text-[#A01B1B] shrink-0" />
                                    <span className="text-[12px] text-slate-700 truncate font-medium">{rec.file}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)] inline-block shrink-0" />
                                    <span className="text-[11px] text-emerald-600 font-semibold">İndekslendi</span>
                                </div>
                                <span className="text-[12px] text-slate-600">{rec.chunks} Parça</span>
                                <span className="text-[11px] text-slate-400">{fmtDate(rec.date)}</span>
                                <div className="relative flex items-center justify-end">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'record', id: rec.id }); }}
                                        className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-300 transition-all"
                                        title="Tüm Dosyayı Sil"
                                    >
                                        <Trash2 size={13} />
                                    </button>

                                    {deleteConfirm?.type === 'record' && deleteConfirm?.id === rec.id && (
                                        <div className="absolute right-full mr-2 z-50 flex items-center gap-2 bg-white border border-red-200 shadow-[0_4px_12px_rgba(0,0,0,0.1)] rounded-lg p-2 animate-in fade-in slide-in-from-right-2" onClick={e => e.stopPropagation()}>
                                            <AlertTriangle size={14} className="text-red-500 shrink-0" />
                                            <span className="text-[11px] font-medium text-slate-700 whitespace-nowrap">Kalıcı olarak silinecek. Emin misiniz?</span>
                                            <button
                                                onClick={() => handleDeleteRecord(rec)}
                                                className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-[10px] font-bold transition-colors ml-1 border border-red-100"
                                            >
                                                Evet, Sil
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm(null)}
                                                className="px-2 py-1 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded text-[10px] font-medium transition-colors border border-slate-200"
                                            >
                                                İptal
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Genişletilmiş vektör detay paneli (Ağaç Görünümü) */}
                            {expandedRecord === rec.id && (
                                <div className="bg-slate-50/50 border-t border-slate-100 py-1.5 shadow-inner">
                                    <div className="flex flex-col gap-0.5 px-5">
                                        {(() => {
                                            const vectors = recordVectors[rec.id] || [];
                                            if (vectors.length === 0 && recordVectors[rec.id]) {
                                                return <p className="text-[11px] text-slate-400 italic py-2 pl-4">Detaylarına ulaşılabilecek vektör verisi bulunamadı.</p>;
                                            }

                                            // Vektörleri sayfalara göre grupla
                                            const groupedByPage = vectors.reduce((acc, v) => {
                                                const p = v.page || 'Bilinmeyen';
                                                if (!acc[p]) acc[p] = [];
                                                acc[p].push(v);
                                                return acc;
                                            }, {});

                                            return Object.entries(groupedByPage).map(([page, pageVectors]) => {
                                                const isPageExpanded = expandedPages[page];
                                                return (
                                                    <div key={`page-${page}`} className="flex flex-col">
                                                        <div
                                                            onClick={() => togglePageExpansion(page)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-100/80 rounded-sm cursor-pointer transition-colors ml-4"
                                                        >
                                                            {isPageExpanded ? <ChevronDown size={11} className="text-slate-400" /> : <ChevronRight size={11} className="text-slate-400" />}
                                                            <Layers size={11} className="text-slate-500" />
                                                            <span className="text-[11px] font-medium text-slate-600">Sayfa {page}</span>
                                                            <span className="text-[9px] text-slate-400 font-medium bg-white border border-slate-200 px-1 rounded">{pageVectors.length} parça</span>
                                                        </div>

                                                        {isPageExpanded && (
                                                            <div className="flex flex-col gap-0.5 ml-11 my-0.5 border-l border-slate-200/50 pl-2 animate-in slide-in-from-left-2 fade-in duration-200">
                                                                {pageVectors.map((vector, vIdx) => (
                                                                    <div key={vector.id} className="relative group/vector flex items-center">
                                                                        {/* Parça etiketi - Hover ile pop-up tetikleyen element */}
                                                                        <div className={`flex items-center gap-1.5 px-3 py-1 border rounded-sm cursor-help transition-all duration-200 z-10 w-max ${deleteConfirm?.id === vector.id ? 'bg-white shadow-sm border-slate-200' : 'border-transparent hover:border-slate-200 hover:bg-white hover:shadow-sm'}`}>
                                                                            <AlignLeft size={10} className="text-slate-400 group-hover/vector:text-[#A01B1B] transition-colors" />
                                                                            <span className="text-[10px] text-slate-600 group-hover/vector:text-slate-800">Parça #{vIdx + 1}</span>

                                                                            <div className="relative flex items-center">
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'vector', id: vector.id, recId: rec.id }); }}
                                                                                    className={`ml-2 text-slate-400 hover:text-red-500 hover:bg-red-50 p-0.5 rounded transition-all shrink-0 ${deleteConfirm?.id === vector.id ? 'opacity-100 bg-red-50 text-red-500' : 'opacity-0 group-hover/vector:opacity-100'}`}
                                                                                    title="Vektörü Sil"
                                                                                >
                                                                                    <Trash2 size={10} />
                                                                                </button>

                                                                                {deleteConfirm?.type === 'vector' && deleteConfirm?.id === vector.id && (
                                                                                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-[70] flex items-center gap-2 bg-white border border-red-200 shadow-lg rounded-lg p-1.5 animate-in fade-in slide-in-from-left-2" onClick={e => e.stopPropagation()}>
                                                                                        <AlertTriangle size={12} className="text-red-500 shrink-0" />
                                                                                        <span className="text-[10px] font-medium text-slate-700 whitespace-nowrap">Silinecek?</span>
                                                                                        <button
                                                                                            onClick={(e) => { e.stopPropagation(); handleDeleteVector(rec.id, vector.id); }}
                                                                                            className="px-2 py-0.5 bg-red-50 text-red-600 hover:bg-red-100 rounded text-[10px] font-bold transition-colors ml-1 border border-red-100"
                                                                                        >
                                                                                            Evet
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }}
                                                                                            className="px-2 py-0.5 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded text-[10px] font-medium transition-colors border border-slate-200"
                                                                                        >
                                                                                            İptal
                                                                                        </button>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {/* Hover Pop-up (Hayalet baloncuk) */}
                                                                        <div className={`absolute top-full left-[25px] mt-1 w-max max-w-[600px] min-w-[250px] max-h-[110px] flex flex-col bg-white border border-slate-200 text-slate-700 rounded-xl opacity-0 invisible group-hover/vector:opacity-100 group-hover/vector:visible transition-all duration-300 origin-top-left transform scale-95 group-hover/vector:scale-100 shadow-[0_10px_25px_rgba(0,0,0,0.08)] z-[60] pointer-events-auto overflow-hidden text-left ${deleteConfirm?.id === vector.id ? 'hidden' : ''}`}>
                                                                            {/* Pop-up iğnesi (artık üstte) */}
                                                                            <div className="absolute -top-[7px] left-[15px] w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-transparent border-b-slate-200"></div>
                                                                            <div className="absolute -top-[6px] left-[15px] w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-transparent border-b-white"></div>

                                                                            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5 px-3 pt-3 shrink-0 gap-4">
                                                                                <span className="text-[10px] font-bold text-slate-500">Vektör ID: <span className="text-slate-700 font-mono font-medium">{vector.id}</span></span>
                                                                                <span className="text-[9px] text-slate-500 bg-slate-50 border border-slate-100 font-medium px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                                                                                    <CornerDownRight size={8} /> x:{vector.x}, y:{vector.y}
                                                                                </span>
                                                                            </div>
                                                                            <div className="overflow-y-auto px-3 pb-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
                                                                                <p className="text-[11px] leading-relaxed text-slate-600 font-medium whitespace-pre-wrap">{vector.text}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DatabaseViewer;
