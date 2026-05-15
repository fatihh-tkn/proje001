import React, { useState, useMemo } from 'react';
import {
    FolderRow, LeafRow, TreeChildren,
    Tag, StatusDot, Pill, MetaLine, fileIconByExt,
} from './SidebarTreeKit';

const ACCENT = '#f06e57';

const WF_EXTS = new Set(['bpmn', 'json', 'py', 'js', 'ts', 'jsx', 'tsx', 'html', 'xml']);

const TRIGGER_META = {
    webhook:  { icon: 'zap',      color: '#fbbf24', label: 'Webhook'      },
    schedule: { icon: 'clock',    color: '#60a5fa', label: 'Zamanlanmış'  },
    manual:   { icon: 'play',     color: '#a3a3a3', label: 'Manuel'       },
};

const STATUS_META = {
    active:  { color: '#22c55e', label: 'Aktif',        glow: true  },
    paused:  { color: '#94a3b8', label: 'Durduruldu',   glow: false },
    error:   { color: '#ef4444', label: 'Hata',         glow: true  },
};

function buildTree(archiveData) {
    const wfFileIds = new Set(
        archiveData.filter(i => WF_EXTS.has((i.file_type || '').toLowerCase())).map(i => i.id)
    );
    const idMap = {};
    archiveData.forEach(i => { idMap[i.id] = i; });

    const includedFolders = new Set();
    archiveData.forEach(item => {
        if (!wfFileIds.has(item.id)) return;
        let cur = item;
        while (cur.folder_id && idMap[cur.folder_id]) {
            includedFolders.add(cur.folder_id);
            cur = idMap[cur.folder_id];
        }
    });

    const nodeMap = {};
    archiveData.forEach(item => {
        if (item.file_type === 'folder' && !includedFolders.has(item.id)) return;
        if (item.file_type !== 'folder' && !wfFileIds.has(item.id)) return;
        nodeMap[item.id] = { ...item, _children: [] };
    });

    const roots = [];
    archiveData.forEach(item => {
        if (!nodeMap[item.id]) return;
        if (item.folder_id && nodeMap[item.folder_id]) {
            nodeMap[item.folder_id]._children.push(nodeMap[item.id]);
        } else if (!item.folder_id) {
            roots.push(nodeMap[item.id]);
        }
    });
    return roots;
}

function inferTrigger(item) {
    const t = item.meta?.trigger || item.meta?.workflow_trigger;
    if (t && TRIGGER_META[t]) return t;
    const ext = (item.file_type || '').toLowerCase();
    if (ext === 'bpmn') return 'webhook';
    return 'manual';
}

function inferStatus(item) {
    const s = item.meta?.status || item.meta?.workflow_status;
    if (s && STATUS_META[s]) return s;
    return 'active';
}

export default function IsAkislariSidebar({ archiveData, onOpenFile }) {
    const tree = useMemo(() => buildTree(archiveData), [archiveData]);

    const [openMap, setOpenMap] = useState({});
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

    const renderNode = (item, level) => {
        const isFolder = item.file_type === 'folder';

        if (isFolder) {
            const isOpen = !!openMap[item.id];
            return (
                <div key={item.id}>
                    <FolderRow
                        level={level}
                        open={isOpen}
                        hasChildren={item._children.length > 0}
                        icon="folder"
                        iconColor={ACCENT}
                        label={<span className="font-medium">{item.filename}</span>}
                        right={<Tag text={item._children.length} />}
                        onClick={() => toggle(item.id)}
                    />
                    {isOpen && (
                        <TreeChildren>
                            {item._children.map(c => renderNode(c, level + 1))}
                        </TreeChildren>
                    )}
                </div>
            );
        }

        const { icon, color } = fileIconByExt(item.file_type);
        const trigger = inferTrigger(item);
        const status = inferStatus(item);
        const tr = TRIGGER_META[trigger];
        const st = STATUS_META[status];
        const isActive = active === item.id;
        const lastRun = item.meta?.last_run || null;
        const schedule = item.meta?.schedule || null;

        return (
            <div key={item.id}>
                <LeafRow
                    level={level}
                    accent={ACCENT}
                    active={isActive}
                    icon={tr.icon}
                    iconColor={isActive ? ACCENT : tr.color}
                    content={
                        <span className={`text-[11px] truncate ${isActive ? 'text-slate-200' : 'text-slate-400'}`}>
                            {item.filename}
                        </span>
                    }
                    right={<StatusDot color={st.color} glow={st.glow} />}
                    onClick={() => handleOpen(item)}
                />
                <MetaLine level={level}>
                    <span style={{ color: st.color }}>{st.label}</span>
                    <span>·</span>
                    <span style={{ color: tr.color }}>{tr.label}</span>
                    {(schedule || lastRun) && <><span>·</span><span>{schedule || lastRun}</span></>}
                </MetaLine>
            </div>
        );
    };

    if (!tree.length) {
        return (
            <div className="text-[10px] text-slate-600 text-center py-8 px-3">
                İş akışı dosyası bulunamadı.
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            {tree.map(node => renderNode(node, 0))}
        </div>
    );
}
