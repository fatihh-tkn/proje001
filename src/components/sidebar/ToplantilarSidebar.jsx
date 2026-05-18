import React, { useState, useMemo } from 'react';
import {
    FolderRow, LeafRow, TreeChildren,
    Tag, StatusDot, MetaLine, Ico, fileIconByExt,
} from './SidebarTreeKit';

const ACCENT = '#3b82f6';

const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'opus', 'wma']);
const VIDEO_EXTS = new Set(['mp4', 'avi', 'mov', 'mkv', 'webm', 'm4v', 'wmv']);
const RECORDING_EXTS = new Set([...AUDIO_EXTS, ...VIDEO_EXTS]);
const DOC_EXTS = new Set(['pdf', 'docx', 'doc', 'md', 'txt', 'xlsx', 'xls']);

const MONTH_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const STATUS_META = {
    done:      { color: '#22c55e', label: 'Tamamlandı' },
    scheduled: { color: '#60a5fa', label: 'Planlandı'  },
    cancelled: { color: '#94a3b8', label: 'İptal'      },
};

const FILE_KIND_META = {
    minutes:   { icon: 'file-text',  color: '#60a5fa', label: 'Tutanak' },
    recording: { icon: 'video',      color: '#a78bfa', label: 'Kayıt'   },
    ai:        { icon: 'sparkles',   color: '#fbbf24', label: 'AI Özet' },
    actions:   { icon: 'list-check', color: '#10b981', label: 'Aksiyon' },
};

function inferStatus(item) {
    const s = item.meta?.meeting_status || item.meta?.status;
    if (s && STATUS_META[s]) return s;
    return 'done';
}

function inferFileKind(filename, ext) {
    if (RECORDING_EXTS.has(ext)) return 'recording';
    const name = (filename || '').toLowerCase();
    if (name.includes('ai') || name.includes('özet') || name.includes('summary')) return 'ai';
    if (name.includes('aksiyon') || name.includes('action')) return 'actions';
    if (DOC_EXTS.has(ext)) return 'minutes';
    return null;
}

function getItemDate(item) {
    return new Date(item.meta?.meeting_date || item.created_at || item.uploaded_at || Date.now());
}

function formatDate(date) {
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

// Builds meeting sessions from archive data.
// Folders that contain at least one recording become sessions.
// Loose recording files (not in such folders) become single-file sessions.
function buildSessions(archiveData) {
    const idMap = {};
    archiveData.forEach(i => { idMap[i.id] = i; });

    // Find folders that have at least one recording child
    const meetingFolderIds = new Set();
    archiveData.forEach(item => {
        if (RECORDING_EXTS.has((item.file_type || '').toLowerCase()) && item.folder_id && idMap[item.folder_id]) {
            meetingFolderIds.add(item.folder_id);
        }
    });

    const sessions = [];
    const usedIds = new Set();

    meetingFolderIds.forEach(folderId => {
        const folder = idMap[folderId];
        if (!folder) return;

        const children = archiveData.filter(
            i => i.folder_id === folderId && i.file_type !== 'folder'
        );
        children.forEach(c => usedIds.add(c.id));
        usedIds.add(folderId);

        const recording = children.find(c => RECORDING_EXTS.has((c.file_type || '').toLowerCase()));
        const dateRef = folder.meta?.meeting_date ? folder : (recording || folder);

        sessions.push({
            id:           folder.id,
            title:        folder.meta?.meeting_title || folder.filename,
            date:         getItemDate(dateRef),
            duration:     folder.meta?.duration_minutes || recording?.meta?.duration_minutes || null,
            participants: folder.meta?.participants     || recording?.meta?.participants     || null,
            status:       inferStatus(folder.meta?.meeting_status ? folder : (recording || folder)),
            files:        children.map(c => ({
                ...c,
                _kind: inferFileKind(c.filename, (c.file_type || '').toLowerCase()),
            })),
        });
    });

    // Loose recording files not already inside a meeting folder
    archiveData.forEach(item => {
        if (!RECORDING_EXTS.has((item.file_type || '').toLowerCase())) return;
        if (usedIds.has(item.id)) return;
        sessions.push({
            id:           item.id,
            title:        item.meta?.meeting_title || item.filename,
            date:         getItemDate(item),
            duration:     item.meta?.duration_minutes || null,
            participants: item.meta?.participants     || null,
            status:       inferStatus(item),
            files:        [{ ...item, _kind: 'recording' }],
            _looseFile:   item,
        });
    });

    sessions.sort((a, b) => b.date - a.date);

    // Group into months
    const monthMap = {};
    sessions.forEach(session => {
        const key = `${session.date.getFullYear()}-${String(session.date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap[key]) {
            monthMap[key] = { key, year: session.date.getFullYear(), month: session.date.getMonth(), sessions: [] };
        }
        monthMap[key].sessions.push(session);
    });

    return Object.values(monthMap).sort((a, b) => b.key.localeCompare(a.key));
}

function MeetingItem({ session, level, openMap, toggle, active, setActive, onOpenFile }) {
    const isOpen    = !!openMap[session.id];
    const st        = STATUS_META[session.status] || STATUS_META.done;
    const hasFiles  = !session._looseFile && session.files.length > 0;
    const iconColor = session.status === 'done' ? ACCENT : st.color;

    const handleClick = () => {
        if (session._looseFile) {
            const f = session._looseFile;
            setActive(session.id);
            onOpenFile?.({ id: `archive_${f.id}`, name: f.filename, type: 'file', extension: f.file_type, url: `/api/archive/file/${f.id}` });
        } else if (hasFiles) {
            toggle(session.id);
        } else {
            setActive(session.id);
        }
    };

    return (
        <div>
            <FolderRow
                level={level}
                open={isOpen}
                hasChildren={hasFiles}
                icon="mic"
                iconColor={iconColor}
                label={<span className="text-[12px] truncate">{session.title}</span>}
                right={<StatusDot color={st.color} />}
                onClick={handleClick}
            />
            <MetaLine level={level}>
                <span>{formatDate(session.date)}</span>
                {session.duration     && <><span>·</span><span>{session.duration}dk</span></>}
                {session.participants && (
                    <><span>·</span>
                    <span className="inline-flex items-center gap-0.5">
                        <Ico name="users" size={9} color="#64748b" />
                        {session.participants}
                    </span></>
                )}
            </MetaLine>
            {isOpen && hasFiles && (
                <TreeChildren>
                    {session.files.map(f => {
                        const fm = f._kind ? FILE_KIND_META[f._kind] : null;
                        const { icon, color } = fm || fileIconByExt(f.file_type);
                        const label = fm?.label;
                        return (
                            <LeafRow
                                key={f.id}
                                level={level + 1}
                                accent={ACCENT}
                                active={active === f.id}
                                icon={icon}
                                iconColor={color}
                                content={
                                    <span className="inline-flex items-baseline gap-1.5 min-w-0 truncate">
                                        {label && (
                                            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono shrink-0">
                                                {label}
                                            </span>
                                        )}
                                        <span className="text-[11px] text-slate-400 truncate">{f.filename}</span>
                                    </span>
                                }
                                onClick={() => {
                                    setActive(f.id);
                                    onOpenFile?.({ id: `archive_${f.id}`, name: f.filename, type: 'file', extension: f.file_type, url: `/api/archive/file/${f.id}` });
                                }}
                            />
                        );
                    })}
                </TreeChildren>
            )}
        </div>
    );
}

export default function ToplantilarSidebar({ archiveData, onOpenFile }) {
    const groups = useMemo(() => buildSessions(archiveData), [archiveData]);

    const [openMap, setOpenMap] = useState(() => {
        const init = {};
        if (groups.length > 0) init[groups[0].key] = true;
        return init;
    });
    const [active, setActive] = useState(null);

    const toggle = id => setOpenMap(p => ({ ...p, [id]: !p[id] }));

    if (!groups.length) {
        return (
            <div className="text-[10px] text-slate-600 text-center py-8 px-3">
                Toplantı kaydı bulunamadı.
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            {groups.map(group => {
                const isOpen = !!openMap[group.key];
                const label  = `${MONTH_TR[group.month]} ${group.year}`;
                return (
                    <div key={group.key}>
                        <FolderRow
                            level={0}
                            open={isOpen}
                            hasChildren={group.sessions.length > 0}
                            icon="calendar"
                            iconColor={ACCENT}
                            label={<span className="font-semibold">{label}</span>}
                            right={<Tag text={group.sessions.length} />}
                            onClick={() => toggle(group.key)}
                        />
                        {isOpen && (
                            <TreeChildren>
                                {group.sessions.map(session => (
                                    <MeetingItem
                                        key={session.id}
                                        session={session}
                                        level={1}
                                        openMap={openMap}
                                        toggle={toggle}
                                        active={active}
                                        setActive={setActive}
                                        onOpenFile={onOpenFile}
                                    />
                                ))}
                                {group.sessions.length === 0 && (
                                    <div className="text-[10.5px] text-slate-500 italic py-1"
                                         style={{ paddingLeft: '27px' }}>
                                        Bu ayda kayıt yok
                                    </div>
                                )}
                            </TreeChildren>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
