import React, { useState, useMemo } from 'react';
import {
    FolderRow, LeafRow, TreeChildren,
    Tag, StatusDot, Pill, MetaLine, fileIconByExt,
} from './SidebarTreeKit';

const ACCENT = '#3b82f6';

const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'opus', 'wma']);
const VIDEO_EXTS = new Set(['mp4', 'avi', 'mov', 'mkv', 'webm', 'm4v', 'wmv']);
const MEETING_EXTS = new Set([...AUDIO_EXTS, ...VIDEO_EXTS]);

const MONTH_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const STATUS_META = {
    done:      { color: '#22c55e', label: 'Tamamlandı', glow: false },
    scheduled: { color: '#60a5fa', label: 'Planlandı',  glow: false },
    cancelled: { color: '#94a3b8', label: 'İptal',      glow: false },
};

function groupByMonth(items) {
    const map = {};
    items.forEach(item => {
        const d = new Date(item.created_at || item.uploaded_at || Date.now());
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!map[key]) map[key] = { key, year: d.getFullYear(), month: d.getMonth(), items: [] };
        map[key].items.push(item);
    });
    return Object.values(map).sort((a, b) => b.key.localeCompare(a.key));
}

function inferStatus(item) {
    const s = item.meta?.meeting_status || item.meta?.status;
    if (s && STATUS_META[s]) return s;
    return 'done';
}

export default function ToplantilarSidebar({ archiveData, onOpenFile }) {
    const filtered = useMemo(
        () => archiveData.filter(i => MEETING_EXTS.has((i.file_type || '').toLowerCase())),
        [archiveData],
    );

    const groups = useMemo(() => groupByMonth(filtered), [filtered]);

    const [openMap, setOpenMap] = useState(() => {
        const init = {};
        if (groups.length > 0) init[groups[0].key] = true;
        return init;
    });
    const [active, setActive] = useState(null);

    const toggle = id => setOpenMap(p => ({ ...p, [id]: !p[id] }));

    const handleOpen = (item) => {
        setActive(item.id);
        onOpenFile?.({
            id: `archive_${item.id}`,
            name: item.filename,
            type: 'file',
            extension: item.file_type,
            url: `/api/archive/file/${item.id}`,
        });
    };

    if (!filtered.length) {
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
                const label = `${MONTH_TR[group.month]} ${group.year}`;

                return (
                    <div key={group.key}>
                        <FolderRow
                            level={0}
                            open={isOpen}
                            hasChildren={group.items.length > 0}
                            icon="calendar"
                            iconColor={ACCENT}
                            label={<span className="font-semibold">{label}</span>}
                            right={<Tag text={group.items.length} />}
                            onClick={() => toggle(group.key)}
                        />

                        {isOpen && (
                            <TreeChildren>
                                {group.items.map(item => {
                                    const { icon, color } = fileIconByExt(item.file_type);
                                    const status = inferStatus(item);
                                    const st = STATUS_META[status];
                                    const isActive = active === item.id;
                                    const dur = item.meta?.duration_minutes;
                                    const participants = item.meta?.participants;
                                    const d = new Date(item.created_at || item.uploaded_at || Date.now());
                                    const dateStr = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;

                                    return (
                                        <div key={item.id}>
                                            <LeafRow
                                                level={1}
                                                accent={ACCENT}
                                                active={isActive}
                                                icon="mic"
                                                iconColor={isActive ? ACCENT : color}
                                                content={
                                                    <span className={`text-[11px] truncate ${isActive ? 'text-slate-200' : 'text-slate-400'}`}>
                                                        {item.filename}
                                                    </span>
                                                }
                                                right={<StatusDot color={st.color} glow={st.glow} />}
                                                onClick={() => handleOpen(item)}
                                            />
                                            <MetaLine level={1}>
                                                <span>{dateStr}</span>
                                                {dur && <><span>·</span><span>{dur}dk</span></>}
                                                {participants && <><span>·</span><span>{participants} kişi</span></>}
                                                <span style={{ color: st.color }}>·</span>
                                                <span style={{ color: st.color }}>{st.label}</span>
                                            </MetaLine>
                                        </div>
                                    );
                                })}
                            </TreeChildren>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
