import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Mic, Search, X, Star, Calendar, Clock, Tag, Users,
    Play, Pause, Download, FileText, Plus, ChevronRight,
    CheckCircle2, Circle, RefreshCw, Loader2
} from 'lucide-react';

/* ── Yardımcılar ─────────────────────────────────────────────────── */
const _isAudio = t => ['mp3','wav','ogg','m4a','flac','aac','opus','wma'].includes(t);
const _isVideo = t => ['mp4','avi','mov','mkv','webm','m4v','wmv'].includes(t);
const isMeetingFile = t => _isAudio(t) || _isVideo(t);

function formatDur(seconds) {
    if (!seconds) return null;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}s ${m}dk` : `${m} dk`;
}
function fmtTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}
function fmtDate(str) {
    return new Date(str).toLocaleDateString('tr', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtClock(str) {
    return new Date(str).toLocaleTimeString('tr', { hour: '2-digit', minute: '2-digit' });
}

/* ── Avatar ──────────────────────────────────────────────────────── */
function Avatar({ name = '?', size = 28 }) {
    const initials = name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const palettes = [
        ['#1e40af','#dbeafe'], ['#065f46','#d1fae5'], ['#7c2d12','#fee2e2'],
        ['#4c1d95','#ede9fe'], ['#0c4a6e','#e0f2fe'], ['#713f12','#fef3c7'],
    ];
    const [fg, bg] = palettes[(name.charCodeAt(0) || 0) % palettes.length];
    return (
        <div
            style={{ width: size, height: size, background: bg, color: fg, borderRadius: size * 0.3, fontSize: size * 0.38 }}
            className="flex items-center justify-center font-black shrink-0 select-none"
        >
            {initials}
        </div>
    );
}

/* ── Ses oynatıcı ────────────────────────────────────────────────── */
function AudioPlayer({ url, metaDuration }) {
    const audioRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [current, setCurrent] = useState(0);
    const [total, setTotal] = useState(metaDuration || 0);

    useEffect(() => { setPlaying(false); setCurrent(0); }, [url]);

    const toggle = () => {
        const a = audioRef.current;
        if (!a) return;
        if (playing) { a.pause(); setPlaying(false); }
        else a.play().then(() => setPlaying(true)).catch(() => {});
    };

    const seek = (e) => {
        if (!audioRef.current || !total) return;
        const r = e.currentTarget.getBoundingClientRect();
        audioRef.current.currentTime = ((e.clientX - r.left) / r.width) * total;
    };

    const pct = total ? (current / total) * 100 : 0;

    return (
        <div className="flex items-center gap-3 bg-stone-900 rounded-xl px-4 py-3">
            <audio
                ref={audioRef} src={url}
                onTimeUpdate={() => audioRef.current && setCurrent(audioRef.current.currentTime)}
                onLoadedMetadata={() => audioRef.current && setTotal(audioRef.current.duration)}
                onEnded={() => setPlaying(false)}
            />
            <button
                onClick={toggle}
                className="w-9 h-9 rounded-full bg-[#D44B4B] hover:bg-[#B83A3A] flex items-center justify-center shrink-0 transition-colors"
            >
                {playing
                    ? <Pause size={14} className="text-white" />
                    : <Play size={14} className="text-white ml-0.5" />}
            </button>

            <div className="flex-1 min-w-0">
                <div
                    onClick={seek}
                    className="w-full h-[6px] bg-white/15 rounded-full cursor-pointer relative"
                >
                    <div
                        className="h-full bg-[#D44B4B] rounded-full"
                        style={{ width: `${pct}%`, transition: 'none' }}
                    />
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow"
                        style={{ left: `calc(${pct}% - 6px)` }}
                    />
                </div>
            </div>

            <span className="text-[11px] font-mono text-white/60 shrink-0 tabular-nums">
                {fmtTime(current)} / {fmtTime(total)}
            </span>
        </div>
    );
}

/* ── Toplantı listesi satırı ─────────────────────────────────────── */
function MeetingRow({ meeting, isActive, onClick }) {
    const title       = meeting.filename.replace(/\.[^.]+$/, '');
    const summary     = meeting.meta?.transcription_preview || meeting.aciklama || null;
    const participants = meeting.meta?.participants || [];
    const actionCount  = meeting.meta?.action_items?.length || 0;
    const dur          = formatDur(meeting.meta?.duration_seconds);

    return (
        <div
            onClick={onClick}
            className={`px-5 py-4 border-b border-stone-100 cursor-pointer transition-colors group
                ${isActive
                    ? 'bg-[#378ADD]/5 border-l-2 border-l-[#378ADD]'
                    : 'border-l-2 border-l-transparent hover:bg-stone-50/80'}`}
        >
            {/* Meta satırı */}
            <div className="flex items-center gap-2 mb-1.5">
                <span className="flex items-center gap-1 text-[10px] text-stone-400">
                    <Calendar size={9} strokeWidth={2.5} />
                    {fmtDate(meeting.created_at)}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-stone-400">
                    <Clock size={9} strokeWidth={2.5} />
                    {fmtClock(meeting.created_at)}
                </span>
                {dur && <span className="text-[10px] text-stone-400">· {dur}</span>}
                <span className="ml-auto flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D44B4B] animate-pulse" />
                    <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wide">Kayıt</span>
                </span>
            </div>

            {/* Başlık */}
            <h3 className={`text-[13px] font-bold truncate mb-1 ${isActive ? 'text-[#378ADD]' : 'text-stone-800 group-hover:text-stone-900'}`}>
                {title}
            </h3>

            {/* Özet */}
            {summary && (
                <p className="text-[11px] text-stone-400 line-clamp-1 mb-2 leading-relaxed">{summary}</p>
            )}

            {/* Alt satır */}
            <div className="flex items-center gap-2">
                {participants.length > 0 ? (
                    <div className="flex items-center gap-[-4px]">
                        {participants.slice(0, 4).map((p, i) => (
                            <div key={i} style={{ marginLeft: i > 0 ? -6 : 0, zIndex: 4 - i }}>
                                <Avatar name={typeof p === 'string' ? p : (p.name || '?')} size={20} />
                            </div>
                        ))}
                        {participants.length > 4 && (
                            <span className="text-[9px] text-stone-400 ml-1">+{participants.length - 4}</span>
                        )}
                    </div>
                ) : (
                    <Users size={12} className="text-stone-300" />
                )}
                {actionCount > 0 && (
                    <span className="ml-auto text-[10px] font-bold text-stone-500 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-md">
                        {actionCount} aksiyon
                    </span>
                )}
            </div>
        </div>
    );
}

/* ── Toplantı detay paneli ───────────────────────────────────────── */
function MeetingDetail({ meeting }) {
    const title        = meeting.filename.replace(/\.[^.]+$/, '');
    const summary      = meeting.meta?.transcription_full_text || meeting.meta?.transcription_preview || meeting.aciklama || null;
    const tags         = meeting.etiketler || [];
    const participants = meeting.meta?.participants || [];
    const actionItems  = meeting.meta?.action_items || [];
    const dur          = formatDur(meeting.meta?.duration_seconds);
    const audioUrl     = `/api/archive/file/${meeting.id}`;
    const downloadUrl  = `/api/archive/download/${meeting.id}`;

    return (
        <div className="flex-1 overflow-y-auto bg-white minimal-scroll">
            <div className="max-w-2xl mx-auto px-8 py-8 space-y-6">

                {/* Tarih/saat/süre */}
                <div className="flex items-center gap-2 text-[11px] text-stone-400 font-medium">
                    <span>{fmtDate(meeting.created_at)}</span>
                    <span className="text-stone-300">·</span>
                    <span>{fmtClock(meeting.created_at)}</span>
                    {dur && (
                        <>
                            <span className="text-stone-300">·</span>
                            <span className="font-bold text-stone-600">{dur}</span>
                        </>
                    )}
                </div>

                {/* Başlık */}
                <h1 className="text-[26px] font-black text-stone-900 leading-tight">{title}</h1>

                {/* Etiketler */}
                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {tags.map((tag, i) => (
                            <span
                                key={i}
                                className="px-2.5 py-1 bg-[#378ADD]/8 text-[#378ADD] text-[11px] font-bold rounded-full border border-[#378ADD]/20"
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Ses oynatıcı */}
                <div className="space-y-2">
                    <AudioPlayer url={audioUrl} metaDuration={meeting.meta?.duration_seconds} />
                    <div className="flex items-center gap-4 px-1 text-[11px] text-stone-400">
                        <span>Toplantı kaydı</span>
                        <a
                            href={audioUrl} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 text-[#378ADD] hover:underline font-semibold"
                        >
                            <FileText size={11} /> Transkript
                        </a>
                        <a
                            href={downloadUrl}
                            className="flex items-center gap-1 text-[#378ADD] hover:underline font-semibold"
                        >
                            <Download size={11} /> İndir
                        </a>
                    </div>
                </div>

                {/* AI Özet */}
                {summary && (
                    <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-stone-400 flex items-center gap-1.5">
                            <span className="text-[#378ADD]">✦</span> AI Özet
                        </p>
                        <p className="text-[13px] text-stone-700 leading-relaxed">{summary}</p>
                    </div>
                )}

                {/* Aksiyon maddeleri */}
                {actionItems.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-stone-400">
                            Aksiyon Maddeleri · {actionItems.length}
                        </p>
                        <div className="space-y-2">
                            {actionItems.map((item, i) => {
                                const text     = typeof item === 'string' ? item : (item.text || item.title || '');
                                const assignee = typeof item === 'object' ? (item.assignee || item.responsible || null) : null;
                                const due      = typeof item === 'object' ? (item.due || item.deadline || null) : null;
                                const done     = typeof item === 'object' ? !!item.done : false;
                                return (
                                    <div key={i} className="flex items-start gap-3 px-4 py-3 bg-stone-50 border border-stone-100 rounded-xl">
                                        {done
                                            ? <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                                            : <Circle size={15} className="text-stone-300 shrink-0 mt-0.5" />}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-semibold text-stone-700 leading-snug">{text}</p>
                                            {assignee && (
                                                <p className="text-[10px] text-stone-400 mt-0.5">{assignee}</p>
                                            )}
                                        </div>
                                        {due && (
                                            <span className="text-[10px] text-stone-400 shrink-0">{due}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Katılımcılar */}
                {participants.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-stone-400">Katılımcılar</p>
                        <div className="flex flex-wrap gap-2">
                            {participants.map((p, i) => {
                                const name = typeof p === 'string' ? p : (p.name || p.email || '?');
                                return (
                                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl">
                                        <Avatar name={name} size={24} />
                                        <span className="text-[11px] font-semibold text-stone-700">{name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Ana bileşen ─────────────────────────────────────────────────── */
const FILTERS = [
    { key: 'all',      label: 'Tümü'        },
    { key: 'recent',   label: 'Son Erişilen'},
    { key: 'mine',     label: 'Yazarım'     },
    { key: 'starred',  label: 'Yıldızlı', icon: Star    },
    { key: 'last30',   label: 'Son 30 gün', icon: Calendar },
    { key: 'tagged',   label: 'Etiketler',  icon: Tag     },
];

export default function ToplantılarViewer({ onUploadClick }) {
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading]   = useState(true);
    const [selected, setSelected] = useState(null);
    const [search, setSearch]     = useState('');
    const [filter, setFilter]     = useState('all');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/archive/list');
            if (res.ok) {
                const data = await res.json();
                const items = (data.items || [])
                    .filter(i => i.file_type !== 'folder' && isMeetingFile((i.file_type || '').toLowerCase()))
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                setMeetings(items);
                if (items.length > 0) setSelected(prev => prev || items[0]);
            }
        } catch {}
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = meetings.filter(m => {
        const title = m.filename.replace(/\.[^.]+$/, '').toLowerCase();
        if (search.trim() && !title.includes(search.toLowerCase()) &&
            !(m.meta?.transcription_preview || '').toLowerCase().includes(search.toLowerCase())) {
            return false;
        }
        if (filter === 'last30') {
            return Date.now() - new Date(m.created_at).getTime() < 30 * 864e5;
        }
        if (filter === 'starred') return m.is_starred || m.meta?.starred;
        if (filter === 'tagged')  return (m.etiketler || []).length > 0;
        return true;
    });

    return (
        <div className="flex flex-col h-full w-full bg-stone-50 font-sans overflow-hidden">

            {/* ── TAM GENİŞLİK BAŞLIK ─────────────────────────── */}
            <div className="flex-none bg-white border-b border-stone-200">

                {/* Üst satır: başlık + buton */}
                <div className="flex items-center justify-between gap-4 px-7 pt-6 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#D44B4B]/10 rounded-2xl shrink-0">
                            <Mic size={22} className="text-[#D44B4B]" strokeWidth={2} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-[20px] font-black text-stone-900 tracking-tight">Toplantılar</h1>
                                <span className="text-[11px] font-bold bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full tabular-nums">
                                    {meetings.length}
                                </span>
                            </div>
                            <p className="text-[11px] text-stone-400 font-medium mt-0.5">
                                Kayıtlar, transkriptler ve toplantı notları
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onUploadClick}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#D44B4B] text-white text-[12px] font-bold rounded-xl hover:bg-[#B83A3A] transition-colors shrink-0"
                    >
                        <Plus size={14} /> Yeni Toplantı
                    </button>
                </div>

                {/* Alt satır: arama + filtreler tek satırda */}
                <div className="flex items-center gap-3 px-7 pb-4">
                    <div className="relative w-[340px] shrink-0">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="toplantılar içinde ara — anahtar kelime, etiket, yazar..."
                            className="w-full pl-8 pr-10 py-2 bg-stone-50 border border-stone-200 rounded-lg text-[11px] text-stone-700 placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20 transition-all"
                        />
                        {search ? (
                            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                                <X size={11} />
                            </button>
                        ) : (
                            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-stone-400 bg-stone-100 border border-stone-200 rounded px-1 py-px pointer-events-none select-none">
                                ⌘K
                            </kbd>
                        )}
                    </div>

                    <div className="flex items-center gap-0.5 ml-auto">
                        {FILTERS.map(f => (
                            <React.Fragment key={f.key}>
                                {f.key === 'last30' && (
                                    <div className="w-px h-4 bg-stone-200 mx-1 shrink-0" />
                                )}
                                <button
                                    onClick={() => setFilter(f.key)}
                                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all shrink-0
                                        ${filter === f.key
                                            ? 'bg-[#378ADD]/10 text-[#378ADD]'
                                            : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100'}`}
                                >
                                    {f.icon && <f.icon size={11} strokeWidth={2} />}
                                    {f.label}
                                    {f.key === 'all' && (
                                        <span className={`text-[10px] font-bold tabular-nums ${filter === 'all' ? 'text-[#378ADD]' : 'text-stone-400'}`}>
                                            {meetings.length}
                                        </span>
                                    )}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── İKİ PANEL İÇERİK ─────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">

                {/* SOL LİSTE */}
                <div className="w-[400px] shrink-0 flex flex-col bg-white border-r border-stone-200 h-full">
                    <div className="flex-1 overflow-y-auto minimal-scroll">
                        {loading ? (
                            <div className="flex items-center justify-center h-40 gap-2 text-stone-400">
                                <Loader2 size={16} className="animate-spin text-[#378ADD]" />
                                <span className="text-[11px] font-medium">Yükleniyor...</span>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 gap-2 text-stone-400">
                                <Mic size={32} strokeWidth={1} className="opacity-25" />
                                <p className="text-[11px] font-semibold text-stone-500">
                                    {search ? 'Eşleşen toplantı bulunamadı' : 'Henüz toplantı kaydı yok'}
                                </p>
                            </div>
                        ) : (
                            filtered.map(m => (
                                <MeetingRow
                                    key={m.id}
                                    meeting={m}
                                    isActive={selected?.id === m.id}
                                    onClick={() => setSelected(m)}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* SAĞ DETAY */}
                {selected ? (
                    <MeetingDetail meeting={selected} />
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-stone-50 text-center">
                        <div>
                            <Mic size={40} strokeWidth={1} className="mx-auto mb-3 text-stone-300" />
                            <p className="text-[12px] font-semibold text-stone-400">
                                Detay görüntülemek için bir toplantı seçin
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
