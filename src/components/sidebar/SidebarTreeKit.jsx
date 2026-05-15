import React from 'react';
import {
    ChevronDown, ChevronRight,
    Folder, Zap, Clock, Play, Activity, FileText, Video,
    Sparkles, Calendar, Mic, Users, ListChecks, Music,
    Code2, FileCode2, Image,
} from 'lucide-react';

const ICON_MAP = {
    folder:       Folder,
    zap:          Zap,
    clock:        Clock,
    play:         Play,
    activity:     Activity,
    'file-text':  FileText,
    video:        Video,
    sparkles:     Sparkles,
    calendar:     Calendar,
    mic:          Mic,
    users:        Users,
    'list-check': ListChecks,
    music:        Music,
    code:         Code2,
    'file-code':  FileCode2,
    image:        Image,
};

export function Ico({ name, size = 12, color }) {
    const Icon = ICON_MAP[name] || FileText;
    return <Icon size={size} color={color} />;
}

export function Tag({ text }) {
    return (
        <span className="text-[9px] font-mono px-1.5 py-px rounded-sm bg-zinc-700 text-slate-500 shrink-0">
            {text}
        </span>
    );
}

export function StatusDot({ color, glow }) {
    return (
        <span
            className="w-1.5 h-1.5 rounded-full shrink-0 inline-block"
            style={{ backgroundColor: color, boxShadow: glow ? `0 0 5px 1px ${color}80` : 'none' }}
        />
    );
}

export function Pill({ text, color }) {
    return (
        <span
            className="text-[8px] font-black uppercase tracking-wide px-1.5 py-px rounded shrink-0"
            style={{ color, backgroundColor: `${color}22` }}
        >
            {text}
        </span>
    );
}

export function TreeChildren({ children }) {
    return <div>{children}</div>;
}

export function FolderRow({ level, open, hasChildren, icon, iconColor, label, right, onClick, title }) {
    return (
        <button
            onClick={onClick}
            title={title}
            className="w-full flex items-center gap-1.5 py-[5px] hover:bg-white/[0.04] transition-colors text-left"
            style={{ paddingLeft: `${level * 13 + 8}px`, paddingRight: 8 }}
        >
            <span className="w-[10px] flex items-center justify-center shrink-0">
                {hasChildren
                    ? open
                        ? <ChevronDown size={9} className="text-slate-600" />
                        : <ChevronRight size={9} className="text-slate-600" />
                    : null}
            </span>
            <Ico name={icon} size={11} color={iconColor} />
            <span className="flex-1 text-[11px] text-slate-300 truncate">{label}</span>
            {right && <span className="shrink-0 ml-1 flex items-center">{right}</span>}
        </button>
    );
}

export function LeafRow({ level, accent, active, icon, iconColor, content, right, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-1.5 py-[5px] transition-colors text-left relative
                ${active ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'}`}
            style={{ paddingLeft: `${level * 13 + 8}px`, paddingRight: 8 }}
        >
            {active && (
                <span className="absolute left-0 top-1 bottom-1 w-[2px] rounded-r" style={{ background: accent }} />
            )}
            <span className="w-[10px] shrink-0" />
            <Ico name={icon} size={11} color={active ? accent : iconColor} />
            <span className="flex-1 min-w-0 flex items-center gap-1.5">{content}</span>
            {right && <span className="shrink-0 ml-1 flex items-center gap-1">{right}</span>}
        </button>
    );
}

export function MetaLine({ level, children }) {
    return (
        <div
            className="flex items-center gap-2 text-[9.5px] font-mono text-slate-600 pb-0.5"
            style={{ paddingLeft: `${level * 13 + 8 + 21}px` }}
        >
            {children}
        </div>
    );
}

export function fileIconByExt(ext) {
    const e = (ext || '').toLowerCase();
    if (['mp4', 'avi', 'mov', 'mkv', 'webm', 'm4v', 'wmv'].includes(e)) return { icon: 'video',     color: '#a78bfa' };
    if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'opus'].includes(e)) return { icon: 'music',     color: '#f59e0b' };
    if (['bpmn'].includes(e))                                              return { icon: 'zap',       color: '#fbbf24' };
    if (['py', 'js', 'ts', 'jsx', 'tsx'].includes(e))                     return { icon: 'code',      color: '#60a5fa' };
    if (['xml', 'html', 'json'].includes(e))                               return { icon: 'file-code', color: '#34d399' };
    if (['pdf'].includes(e))                                               return { icon: 'file-text', color: '#ef4444' };
    if (['docx', 'doc'].includes(e))                                       return { icon: 'file-text', color: '#3b82f6' };
    if (['xlsx', 'xls'].includes(e))                                       return { icon: 'file-text', color: '#22c55e' };
    if (['md'].includes(e))                                                return { icon: 'file-text', color: '#64748b' };
    if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'].includes(e))         return { icon: 'image',     color: '#f472b6' };
    return { icon: 'file-text', color: '#94a3b8' };
}
