import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Upload, Trash2, Play, Loader2, CheckCircle2, AlertCircle, FileAudio, X } from 'lucide-react';
import { mutate } from '../../../api/client';

const API = 'http://localhost:8000/api/meetings';

const StatusBadge = ({ status }) => {
    const map = {
        processing: { icon: <Loader2 size={10} className="animate-spin" />, label: 'İşleniyor', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
        done: { icon: <CheckCircle2 size={10} />, label: 'Hazır', cls: 'bg-green-500/15 text-green-400 border-green-500/30' },
        error: { icon: <AlertCircle size={10} />, label: 'Hata', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
    };
    const s = map[status] || map.processing;
    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-semibold ${s.cls}`}>
            {s.icon}{s.label}
        </span>
    );
};

const MeetingUploadViewer = () => {
    const [meetings, setMeetings] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const fetchMeetings = async () => {
        try {
            const res = await fetch(`${API}/list`);
            if (res.ok) {
                const data = await res.json();
                // API bazen array, bazen {value:[...]} döner
                const list = Array.isArray(data) ? data : (data.value || []);
                // status normalize et: "karantina" → "done", null/undefined → "done"
                const normalized = list.map(m => ({
                    ...m,
                    status: (m.status === 'karantina' || !m.status) ? 'done' : m.status
                }));
                setMeetings(normalized);
            }
        } catch { /* backend henüz hazır değilse sessizce geç */ }
    };

    useEffect(() => { fetchMeetings(); }, []);

    const uploadFile = async (file) => {
        if (!file) return;
        const allowed = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/flac', 'audio/aac', 'video/mp4'];
        const ext = file.name.split('.').pop().toLowerCase();
        const allowedExt = ['mp3', 'mp4', 'm4a', 'wav', 'ogg', 'webm', 'flac', 'aac'];
        if (!allowedExt.includes(ext)) {
            setError(`Desteklenmeyen format: .${ext}`);
            return;
        }

        setUploading(true);
        setError(null);
        try {
            const form = new FormData();
            form.append('file', file);
            await mutate.upload(`${API}/upload`, form, {
                subject: 'Toplantı kaydı', detail: file.name, rawBody: true, showLoading: true,
            });
            await fetchMeetings();
        } catch { /* mutate toast attı */ }
        setUploading(false);
    };

    const deleteMeeting = async (id) => {
        const m = meetings.find(x => x.id === id);
        try {
            await mutate.remove(`${API}/${id}`, null, {
                subject: 'Toplantı kaydı', detail: m?.title,
            });
            setMeetings(prev => prev.filter(x => x.id !== id));
        } catch { /* mutate toast attı */ }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) uploadFile(file);
    };

    const formatDate = (str) => {
        if (!str) return '';
        try { return new Date(str).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
        catch { return str; }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8f9fa] overflow-hidden">

            {/* Header */}
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-200/80 bg-white shrink-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                    <Mic size={15} className="text-white" />
                </div>
                <div>
                    <h2 className="text-[13px] font-bold text-slate-800 leading-tight">Toplantı Arşivi</h2>
                    <p className="text-[10px] text-slate-400">Ses dosyaları bağımsız veritabanına kaydedilir</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {meetings.length} toplantı
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

                {/* Upload Zone */}
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-all duration-200 select-none
                        ${dragOver ? 'border-violet-400 bg-violet-50' : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/40'}
                    `}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".mp3,.mp4,.m4a,.wav,.ogg,.webm,.flac,.aac"
                        className="hidden"
                        onChange={(e) => uploadFile(e.target.files[0])}
                    />

                    <AnimatePresence mode="wait">
                        {uploading ? (
                            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2">
                                <Loader2 size={28} className="text-violet-500 animate-spin" />
                                <p className="text-[12px] font-semibold text-violet-600">Yükleniyor...</p>
                            </motion.div>
                        ) : (
                            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${dragOver ? 'bg-violet-100' : 'bg-slate-100'}`}>
                                    <Upload size={20} className={dragOver ? 'text-violet-500' : 'text-slate-400'} />
                                </div>
                                <p className="text-[12px] font-semibold text-slate-600">
                                    {dragOver ? 'Bırakın!' : 'Ses dosyası sürükleyin veya tıklayın'}
                                </p>
                                <p className="text-[10px] text-slate-400">MP3, MP4, WAV, OGG, WEBM, FLAC desteklenir</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Error */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                            className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-600"
                        >
                            <AlertCircle size={13} className="shrink-0" />
                            <span className="flex-1">{error}</span>
                            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X size={12} /></button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Meeting List */}
                {meetings.length > 0 && (
                    <div className="flex flex-col gap-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-0.5">Yüklenen Toplantılar</p>
                        <AnimatePresence>
                            {meetings.map((m) => (
                                <motion.div
                                    key={m.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="flex items-center gap-3 px-3 py-2.5 bg-white border border-slate-200/80 rounded-xl shadow-sm hover:shadow-md transition-shadow group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center shrink-0">
                                        <FileAudio size={14} className="text-violet-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12px] font-semibold text-slate-700 truncate">{m.title}</p>
                                        <p className="text-[9px] text-slate-400">{formatDate(m.created_at)}</p>
                                    </div>
                                    <StatusBadge status={m.status} />
                                    <a
                                        href={m.source === 'archive' ? `/api/archive/file/${m.id}` : `${API}/${m.id}/audio`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-violet-500 hover:bg-violet-50 transition-all opacity-0 group-hover:opacity-100"
                                        title="Dinle"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Play size={12} />
                                    </a>
                                    <button
                                        onClick={() => deleteMeeting(m.id)}
                                        className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                        title="Sil"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {meetings.length === 0 && !uploading && (
                    <div className="flex flex-col items-center justify-center gap-2 py-8 text-slate-400">
                        <Mic size={28} className="opacity-20" />
                        <p className="text-[11px]">Henüz toplantı yüklenmedi</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MeetingUploadViewer;
