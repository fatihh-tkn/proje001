import React, { useState, useMemo } from 'react';
import {
    FolderRow, LeafRow, TreeChildren,
    Tag, StatusDot, Pill, MetaLine, fileIconByExt,
} from './SidebarTreeKit';

const ACCENT = '#f06e57';

const WF_EXTS = new Set(['bpmn', 'json', 'py', 'js', 'ts', 'jsx', 'tsx', 'html', 'xml']);

const TRIGGER_META = {
    webhook:  { icon: 'zap',   color: '#fbbf24', label: 'Webhook'     },
    schedule: { icon: 'clock', color: '#60a5fa', label: 'Zamanlanmış' },
    manual:   { icon: 'play',  color: '#a3a3a3', label: 'Manuel'      },
};

const STATUS_META = {
    active:  { color: '#22c55e', label: 'Aktif',       glow: true  },
    paused:  { color: '#94a3b8', label: 'Durduruldu',  glow: false },
    error:   { color: '#ef4444', label: 'Hata',        glow: true  },
};

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

// Groups sibling workflow files with version suffixes (e.g. report_v1.bpmn, report_v2.bpmn)
// into a virtual node with version children. Singles pass through unchanged.
function groupVersionedFiles(items) {
    const versionBuckets = {};
    const others = [];

    for (const item of items) {
        if (item.file_type === 'folder') { others.push(item); continue; }
        const name = item.filename || '';
        const m = name.match(/^(.+?)[-_]v(\d+)(\.\w+)?$/i);
        if (m) {
            const key = m[1] + (m[3] || '');
            if (!versionBuckets[key]) versionBuckets[key] = [];
            versionBuckets[key].push({ ...item, _versionNum: parseInt(m[2]) });
        } else {
            others.push(item);
        }
    }

    const grouped = [];
    for (const [, versions] of Object.entries(versionBuckets)) {
        if (versions.length < 2) { others.push(...versions); continue; }
        versions.sort((a, b) => b._versionNum - a._versionNum);
        const latest = versions[0];
        grouped.push({
            _isVersionGroup: true,
            id: `_vg_${latest.id}`,
            title: (latest.filename || '').replace(/[-_]v\d+/i, ''),
            meta: latest.meta,
            file_type: latest.file_type,
            _sourceItem: latest,
            _children: versions.map((v, i) => ({ ...v, isCurrent: i === 0 })),
        });
    }

    return [...others, ...grouped];
}

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

    // Apply version grouping at each level
    const applyGrouping = (nodes) => {
        const grouped = groupVersionedFiles(nodes);
        grouped.forEach(n => {
            if (n._children && !n._isVersionGroup) {
                n._children = applyGrouping(n._children);
            }
        });
        return grouped;
    };

    return applyGrouping(roots);
}

function VersionNode({ version, level, active, setActive, onOpenFile }) {
    const { icon, color } = fileIconByExt(version.file_type);
    const isActive = active === version.id;
    return (
        <LeafRow
            level={level}
            accent={ACCENT}
            active={isActive}
            icon="activity"
            iconColor={version.isCurrent ? '#5eead4' : '#475569'}
            content={
                <span className={`font-mono text-[10.5px] truncate ${
                    version.isCurrent ? 'text-slate-100' : 'text-slate-500'
                }`}>
                    {version.filename}
                </span>
            }
            right={
                <span className="flex items-center gap-1.5">
                    {version.isCurrent && <Pill text="GÜNCEL" color="#5eead4" />}
                    {version.meta?.version_date && (
                        <span className="text-[9.5px] font-mono text-slate-600">
                            {version.meta.version_date}
                        </span>
                    )}
                </span>
            }
            onClick={() => {
                setActive(version.id);
                onOpenFile?.({
                    id: `archive_${version.id}`,
                    name: version.filename,
                    type: 'file',
                    extension: version.file_type,
                    url: `/api/archive/file/${version.id}`,
                });
            }}
        />
    );
}

function WorkflowNode({ node, level, openMap, toggle, active, setActive, onOpenFile }) {
    const isOpen = !!openMap[node.id];

    // Folder
    if (node.file_type === 'folder') {
        return (
            <div>
                <FolderRow
                    level={level}
                    open={isOpen}
                    hasChildren={node._children.length > 0}
                    icon="folder"
                    iconColor={ACCENT}
                    label={<span className="font-medium truncate">{node.filename}</span>}
                    right={<Tag text={node._children.length} />}
                    onClick={() => toggle(node.id)}
                />
                {isOpen && (
                    <TreeChildren>
                        {node._children.map(c => (
                            <WorkflowNode
                                key={c.id} node={c} level={level + 1}
                                openMap={openMap} toggle={toggle}
                                active={active} setActive={setActive}
                                onOpenFile={onOpenFile}
                            />
                        ))}
                    </TreeChildren>
                )}
            </div>
        );
    }

    // Version group (virtual node grouping same-base-name files)
    if (node._isVersionGroup) {
        const trigger = inferTrigger(node._sourceItem);
        const status  = inferStatus(node._sourceItem);
        const tr = TRIGGER_META[trigger];
        const st = STATUS_META[status];
        const lastRun  = node.meta?.last_run || null;
        const schedule = node.meta?.schedule || null;

        return (
            <div>
                <FolderRow
                    level={level}
                    open={isOpen}
                    hasChildren
                    icon={tr.icon}
                    iconColor={tr.color}
                    label={<span className="text-[12px] truncate">{node.title}</span>}
                    right={<StatusDot color={st.color} glow={st.glow} />}
                    onClick={() => toggle(node.id)}
                    title={`${tr.label} · ${st.label}${lastRun ? ` · ${lastRun}` : ''}`}
                />
                <MetaLine level={level}>
                    <span style={{ color: st.color }}>{st.label}</span>
                    <span>·</span>
                    <span style={{ color: tr.color }}>{tr.label}</span>
                    {(schedule || lastRun) && (
                        <><span>·</span><span>{schedule || lastRun}</span></>
                    )}
                </MetaLine>
                {isOpen && (
                    <TreeChildren>
                        {node._children.map(v => (
                            <VersionNode
                                key={v.id} version={v} level={level + 1}
                                active={active} setActive={setActive}
                                onOpenFile={onOpenFile}
                            />
                        ))}
                    </TreeChildren>
                )}
            </div>
        );
    }

    // Plain workflow file
    const trigger = inferTrigger(node);
    const status  = inferStatus(node);
    const tr = TRIGGER_META[trigger];
    const st = STATUS_META[status];
    const isActive = active === node.id;
    const lastRun  = node.meta?.last_run || null;
    const schedule = node.meta?.schedule || null;

    return (
        <div>
            <LeafRow
                level={level}
                accent={ACCENT}
                active={isActive}
                icon={tr.icon}
                iconColor={isActive ? ACCENT : tr.color}
                content={
                    <span className={`text-[11px] truncate ${
                        isActive ? 'text-slate-200' : 'text-slate-400'
                    }`}>
                        {node.filename}
                    </span>
                }
                right={<StatusDot color={st.color} glow={st.glow} />}
                onClick={() => {
                    setActive(node.id);
                    onOpenFile?.({
                        id: `archive_${node.id}`,
                        name: node.filename,
                        type: 'file',
                        extension: node.file_type,
                        url: `/api/archive/file/${node.id}`,
                    });
                }}
            />
            <MetaLine level={level}>
                <span style={{ color: st.color }}>{st.label}</span>
                <span>·</span>
                <span style={{ color: tr.color }}>{tr.label}</span>
                {(schedule || lastRun) && (
                    <><span>·</span><span>{schedule || lastRun}</span></>
                )}
            </MetaLine>
        </div>
    );
}

export default function IsAkislariSidebar({ archiveData, onOpenFile }) {
    const tree = useMemo(() => buildTree(archiveData), [archiveData]);

    const [openMap, setOpenMap] = useState({});
    const [active, setActive] = useState(null);

    const toggle = id => setOpenMap(p => ({ ...p, [id]: !p[id] }));

    if (!tree.length) {
        return (
            <div className="text-[10px] text-slate-600 text-center py-8 px-3">
                İş akışı dosyası bulunamadı.
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            {tree.map(node => (
                <WorkflowNode
                    key={node.id} node={node} level={0}
                    openMap={openMap} toggle={toggle}
                    active={active} setActive={setActive}
                    onOpenFile={onOpenFile}
                />
            ))}
        </div>
    );
}
