import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, RefreshCw, Activity, Monitor, Trash2, Wifi, Cpu, Clock, Hash, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { API_BASE, fetchWithTimeout, getModelColor, fmtCost, fmt, formatDate } from '../utils';
import { SlideDeleteBar } from '../DeleteSlider';

/* ─── Stat Card ─────────────────────────────────────────────────── */
function StatCard({ label, value, sub, accent }) {
    return (
        <div className="flex flex-col gap-1 p-4">
            <span className={`text-xl font-medium font-mono ${accent ? 'text-[var(--accent)]' : 'text-[var(--workspace-text)]'}`}>{value}</span>
            <span className="text-[9px] font-medium text-[var(--sidebar-text-muted)] uppercase tracking-widest">{label}</span>
            {sub && <span className="text-[9px] text-[var(--sidebar-text-muted)] opacity-60">{sub}</span>}
        </div>
    );
}

/* ─── Info Row ───────────────────────────────────────────────────── */
function InfoRow({ icon: Icon, label, value, mono }) {
    return (
        <div className="flex items-center justify-between py-2.5 border-b border-black/[0.04] last:border-0">
            <div className="flex items-center gap-2 text-[var(--sidebar-text-muted)]">
                <Icon size={12} />
                <span className="text-[10px] font-medium">{label}</span>
            </div>
            <span className={`text-[10px] font-medium text-[var(--workspace-text)] ${mono ? 'font-mono tracking-widest' : ''}`}>{value}</span>
        </div>
    );
}

export const ComputersTab = React.memo(() => {
    const [computers, setComputers] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [aliases, setAliases] = useState({});

    const fetchComputers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchWithTimeout(`${API_BASE}/computers`);
            const data = await res.json();
            const list = data.computers || [];
            setComputers(list);
            if (list.length > 0 && !selectedId) setSelectedId(list[0].id);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [selectedId]);

    useEffect(() => { fetchComputers(); }, [fetchComputers]);

    const getKey = (c) => `${c.mac}_${c.ip}`;
    const getDisplayName = (c) => aliases[getKey(c)] || c.ip;

    const handleDelete = async (e, c) => {
        e.stopPropagation();
        if (!window.confirm(`"${getDisplayName(c)}" silinsin mi? Bu cihaza ait tüm loglar kalıcı olarak silinir.`)) return;
        const encodedMac = encodeURIComponent(c.mac);
        const encodedIp = encodeURIComponent(c.ip);
        await fetch(`${API_BASE}/computers/${encodedMac}/${encodedIp}`, { method: 'DELETE' });
        if (selectedId === c.id) setSelectedId(null);
        fetchComputers();
    };

    const startEdit = (e, c) => {
        e.stopPropagation();
        setEditingId(c.id);
        setEditName(getDisplayName(c));
    };

    const commitEdit = async (c) => {
        if (editName.trim() && editName !== getDisplayName(c)) {
            await fetch(`${API_BASE}/computers/rename`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mac: c.mac, ip: c.ip, name: editName.trim() })
            });
            setAliases(prev => ({ ...prev, [getKey(c)]: editName.trim() }));
        }
        setEditingId(null);
    };

    const filtered = useMemo(() => {
        if (!search.trim()) return computers;
        const q = search.toLowerCase();
        return computers.filter(c =>
            (c.id || '').toLowerCase().includes(q) ||
            (aliases[getKey(c)] || '').toLowerCase().includes(q) ||
            (c.ip || '').toLowerCase().includes(q) ||
            (c.mac || '').toLowerCase().includes(q)
        );
    }, [computers, search, aliases]);

    const selected = useMemo(() => computers.find(c => c.id === selectedId), [computers, selectedId]);

    return (
        <div className="flex bg-white select-none w-full h-full overflow-hidden animate-in fade-in duration-300">
            {/* SOL SAIDBAR: Liste */}
            <div className="w-1/3 min-w-[280px] max-w-sm flex flex-col bg-gray-50 border-r border-black/[0.05]">

                {/* Başlık */}
                <div className="px-4 py-3 flex items-center justify-between border-b border-black/[0.04]">
                    <div className="flex items-center gap-2">
                        <Monitor size={13} className="text-[var(--accent)]" />
                        <span className="text-[10px] font-medium text-[var(--workspace-text)] uppercase tracking-widest">Cihazlar</span>
                        {computers.length > 0 && (
                            <span className="px-1.5 py-0.5 bg-[var(--accent)]/20 text-[var(--accent)] rounded text-[9px] font-medium">{computers.length}</span>
                        )}
                    </div>
                    <button
                        onClick={fetchComputers}
                        className="p-1 rounded-sm text-[var(--sidebar-text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                    >
                        <RefreshCw size={12} />
                    </button>
                </div>

                {/* Arama */}
                <div className="px-3 py-3 border-b border-black/[0.05]">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--sidebar-text-muted)] pointer-events-none" size={11} />
                        <input
                            className="w-full pl-7 pr-3 py-1.5 bg-white border border-black/[0.08] rounded-[3px] text-[11px] text-[var(--workspace-text)] shadow-sm placeholder:text-[var(--sidebar-text-muted)]/50 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                            placeholder="IP, MAC veya isim..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Liste */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-3 opacity-40">
                            <Activity className="animate-spin text-[var(--accent)]" size={20} />
                            <span className="text-[9px] font-medium uppercase tracking-widest">Yükleniyor</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-2 opacity-40 px-6 text-center">
                            <Monitor size={24} strokeWidth={1} />
                            <span className="text-[10px] font-medium text-[var(--sidebar-text-muted)]">
                                {search ? 'Eşleşen cihaz yok' : 'Henüz cihaz yok'}
                            </span>
                        </div>
                    ) : (
                        filtered.map(c => {
                            const isSelected = selectedId === c.id;
                            const displayName = getDisplayName(c);
                            return (
                                <div
                                    key={c.id}
                                    onClick={() => setSelectedId(c.id)}
                                    className={`group relative cursor-pointer transition-all duration-200 overflow-hidden mx-2 my-1 rounded-[3px] ${isSelected
                                        ? 'bg-white shadow-sm ring-1 ring-black/[0.04]'
                                        : 'hover:bg-white/60'}`}
                                >

                                    <SlideDeleteBar
                                        onDelete={() => handleDelete({ stopPropagation: () => { } }, c)}
                                        label="Cihazı Sil"
                                        iconSize={13}
                                    >
                                        <div className="flex items-center gap-3 px-4 py-3">
                                            {/* Online dot */}
                                            <div className="relative shrink-0">
                                                <div className={`w-7 h-7 rounded-sm flex items-center justify-center transition-colors duration-200
                                                    ${isSelected ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-gray-100 text-[var(--sidebar-text-muted)]'}`}>
                                                    <Monitor size={14} />
                                                </div>
                                                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-[var(--sidebar-hover)]" />
                                            </div>

                                            {/* İsim & MAC */}
                                            <div className="flex-1 min-w-0">
                                                {editingId === c.id ? (
                                                    <input
                                                        autoFocus
                                                        className="w-full text-[11px] font-medium bg-[var(--window-bg)] border border-[var(--accent)] rounded px-1.5 py-0.5 text-[var(--workspace-text)] focus:outline-none"
                                                        value={editName}
                                                        onChange={e => setEditName(e.target.value)}
                                                        onBlur={() => commitEdit(c)}
                                                        onKeyDown={e => { if (e.key === 'Enter') commitEdit(c); if (e.key === 'Escape') setEditingId(null); }}
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                ) : (
                                                    <p
                                                        className={`text-[11px] font-medium truncate transition-colors duration-200 ${isSelected ? 'text-[var(--workspace-text)]' : 'text-[var(--sidebar-text-muted)] group-hover:text-[var(--workspace-text)]'}`}
                                                        onDoubleClick={e => startEdit(e, c)}
                                                        title="Çift tıklayarak yeniden adlandır"
                                                    >
                                                        {displayName}
                                                    </p>
                                                )}
                                                <p className={`text-[9px] font-mono truncate mt-0.5 transition-colors duration-200 ${isSelected ? 'text-[var(--accent)]/70' : 'text-[var(--sidebar-text-muted)]/50'}`}>{c.mac}</p>
                                            </div>
                                        </div>
                                    </SlideDeleteBar>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ── Sağ Panel ── */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
                {selected ? (
                    <div className="flex flex-col h-full">

                        {/* Header */}
                        <div className="border-b border-black/[0.05] overflow-hidden bg-white/50">
                            <SlideDeleteBar onDelete={() => handleDelete({ stopPropagation: () => { } }, selected)} label="Cihazı Sil">
                                <div className="flex items-center gap-3 min-w-0 px-6 py-4">
                                    <div className="relative shrink-0">
                                        <div className="w-10 h-10 rounded-sm bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)]">
                                            <Monitor size={20} />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--window-bg)]" />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-sm font-medium text-[var(--workspace-text)] truncate">{getDisplayName(selected)}</h2>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="flex items-center gap-1 text-[9px] font-medium text-emerald-400 uppercase">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                                                Çevrimiçi
                                            </span>
                                            <span className="text-gray-300">·</span>
                                            <span className="text-[9px] font-mono text-[var(--sidebar-text-muted)]">{selected.ip}</span>
                                        </div>
                                    </div>
                                </div>
                            </SlideDeleteBar>
                        </div>

                        {/* İçerik */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-5 mac-horizontal-scrollbar">

                            {/* İstatistik Bar */}
                            <div className="grid grid-cols-3 divide-x divide-black/[0.05] ring-1 ring-black/[0.06] rounded-sm overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] bg-white">
                                <StatCard label="Toplam Maliyet" value={fmtCost(selected.totalCost)} accent />
                                <StatCard label="İstek Sayısı" value={selected.totalRequests} />
                                <StatCard label="Toplam Token" value={fmt(selected.totalTokens)} />
                            </div>

                            {/* Ağ Bilgileri */}
                            <div>
                                <p className="text-[9px] font-medium text-gray-400 uppercase tracking-widest mb-2 px-1">Ağ Bilgileri</p>
                                <div className="ring-1 ring-black/[0.06] shadow-sm rounded-sm px-4 bg-gray-50/50">
                                    <InfoRow icon={Wifi} label="IP Adresi" value={selected.ip} mono />
                                    <InfoRow icon={Hash} label="MAC Adresi" value={selected.mac} mono />
                                    <InfoRow icon={Clock} label="İlk Görülme" value={formatDate(selected.firstSeen)} />
                                    <InfoRow icon={TrendingUp} label="Son Aktivite" value={formatDate(selected.lastActive)} />
                                </div>
                            </div>

                            {/* Kullanılan Modeller */}
                            {selected.models.length > 0 && (
                                <div>
                                    <p className="text-[9px] font-medium text-[var(--sidebar-text-muted)] uppercase tracking-widest mb-2">Kullanılan Modeller</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selected.models.map((m, idx) => (
                                            <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-black/[0.05] rounded-[3px] shadow-sm hover:border-[var(--accent)]/40 transition-colors">
                                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getModelColor(m) }} />
                                                <span className="text-[10px] font-medium text-[var(--workspace-text)]">{m}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Son İşlemler */}
                            <div>
                                <p className="text-[9px] font-medium text-gray-400 uppercase tracking-widest mb-2 px-1">Son İşlemler</p>
                                <div className="ring-1 ring-black/[0.06] rounded-sm overflow-hidden divide-y divide-black/[0.03] shadow-sm bg-white">
                                    {selected.logs.slice(0, 10).map((log, idx) => (
                                        <div key={idx} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group">
                                            {log.status === 'success'
                                                ? <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                                : <AlertCircle size={12} className="text-red-400 shrink-0" />
                                            }
                                            <span className="text-[10px] font-medium text-[var(--workspace-text)] truncate flex-1 group-hover:text-[var(--accent)] transition-colors">{log.model}</span>
                                            <span className="text-[9px] font-mono text-[var(--sidebar-text-muted)] shrink-0">{formatDate(log.timestamp)}</span>
                                            <span className="text-[9px] font-mono text-[var(--sidebar-text-muted)] shrink-0 w-10 text-right">{fmt(log.totalTokens)}tk</span>
                                            <span className="text-[9px] font-medium text-[var(--accent)] font-mono shrink-0 w-14 text-right">{fmtCost(log.cost)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[var(--sidebar-text-muted)] opacity-30">
                        <Monitor size={36} strokeWidth={1} />
                        <p className="text-[10px] font-medium uppercase tracking-widest">Detay için cihaz seçin</p>
                    </div>
                )}
            </div>
        </div>
    );
});
