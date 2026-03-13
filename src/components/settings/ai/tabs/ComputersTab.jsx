import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, RefreshCw, Activity, Monitor, Trash2 } from 'lucide-react';
import { API_BASE, fetchWithTimeout, getModelColor, fmtCost, fmt, formatDate } from '../utils';

export const ComputersTab = React.memo(() => {
    const [computers, setComputers] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [aliases, setAliases] = useState({}); // key -> custom name

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
        <div className="flex h-[calc(100vh-220px)] min-h-[500px] bg-[var(--window-bg)] border border-[var(--window-border)] rounded-sm overflow-hidden shadow-md">
            {/* ── Sol Panel: Cihaz Listesi ── */}
            <div className="w-[260px] shrink-0 border-r border-[var(--window-border)] flex flex-col bg-[var(--sidebar-hover)]">
                {/* Başlık + Yenile */}
                <div className="px-4 py-3 border-b border-[var(--window-border)] flex justify-between items-center">
                    <span className="text-[11px] font-black text-[var(--workspace-text)] uppercase tracking-widest">
                        Aktif Cihazlar
                        {computers.length > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 bg-[var(--accent)] text-white rounded-full text-[9px]">{computers.length}</span>
                        )}
                    </span>
                    <button onClick={fetchComputers} className="p-1.5 rounded-sm hover:bg-[var(--window-bg)] text-[var(--sidebar-text-muted)] transition-all hover:text-[var(--accent)]">
                        <RefreshCw size={13} />
                    </button>
                </div>

                {/* Arama */}
                <div className="px-3 py-2.5 border-b border-[var(--window-border)]">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--sidebar-text-muted)]" size={12} />
                        <input
                            className="w-full pl-8 pr-3 py-1.5 bg-[var(--window-bg)] border border-[var(--window-border)] rounded-sm text-[11px] text-[var(--workspace-text)] placeholder:text-[var(--sidebar-text-muted)] focus:outline-none focus:border-[var(--accent)]"
                            placeholder="Ara (IP, MAC, isim...)"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Cihaz Listesi */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 mac-horizontal-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-32 gap-2 opacity-40">
                            <Activity className="animate-spin text-[var(--accent)]" size={18} />
                            <span className="text-[9px] font-bold uppercase">Aranıyor...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-10 text-[var(--sidebar-text-muted)] text-[11px] font-bold px-4 opacity-60">
                            {search ? 'Eşleşen cihaz yok' : 'Henüz kayıtlı cihaz yok'}
                        </div>
                    ) : (
                        filtered.map(c => {
                            const isSelected = selectedId === c.id;
                            const displayName = getDisplayName(c);
                            return (
                                <div
                                    key={c.id}
                                    onClick={() => setSelectedId(c.id)}
                                    className={`p-3 rounded-sm border cursor-pointer transition-all relative group ${isSelected
                                        ? 'bg-[var(--accent-light,_#eff6ff)] border-[var(--accent)] shadow-sm'
                                        : 'bg-[var(--window-bg)] border-transparent hover:border-[var(--window-border)] hover:bg-[var(--window-bg)]'}`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className={`p-1.5 rounded-sm flex-shrink-0 ${isSelected ? 'bg-[var(--accent)] text-white' : 'bg-[var(--sidebar-hover)] text-[var(--sidebar-text-muted)]'}`}>
                                            <Monitor size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {/* Çift tıkla düzenle */}
                                            {editingId === c.id ? (
                                                <input
                                                    autoFocus
                                                    className="w-full text-[11px] font-medium bg-[var(--window-bg)] border border-[var(--accent)] rounded px-1 py-0.5 text-[var(--workspace-text)] focus:outline-none"
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    onBlur={() => commitEdit(c)}
                                                    onKeyDown={e => { if (e.key === 'Enter') commitEdit(c); if (e.key === 'Escape') setEditingId(null); }}
                                                    onClick={e => e.stopPropagation()}
                                                />
                                            ) : (
                                                <h4
                                                    className={`text-[11px] font-medium truncate ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--workspace-text)]'}`}
                                                    onDoubleClick={e => startEdit(e, c)}
                                                    title="Çift tıklayarak yeniden adlandır"
                                                    style={{ cursor: 'default' }}
                                                >
                                                    {displayName}
                                                </h4>
                                            )}
                                            <p className="text-[9px] font-mono text-[var(--sidebar-text-muted)] truncate mt-0.5">{c.ip}</p>
                                        </div>
                                        {/* Silme butonu */}
                                        <button
                                            onClick={e => handleDelete(e, c)}
                                            className="p-1 rounded-sm opacity-0 group-hover:opacity-100 text-[var(--sidebar-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all flex-shrink-0"
                                            title="Cihazı Sil"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                    {isSelected && <div className="absolute right-0 top-2 bottom-2 w-0.5 bg-[var(--accent)] rounded-full" />}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ── Sağ Panel: Detay ── */}
            <div className="flex-1 flex flex-col bg-[var(--window-bg)] overflow-hidden">
                {selected ? (
                    <div className="flex flex-col h-full">
                        {/* Detay Header */}
                        <div className="px-6 py-5 border-b border-[var(--window-border)] bg-[var(--sidebar-hover)] flex items-center justify-between">
                            <div className="flex gap-4 items-center">
                                <div className="p-3 bg-[var(--accent-light,_#eff6ff)] border border-[var(--accent)] rounded-sm text-[var(--accent)] shadow-sm">
                                    <Monitor size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-[var(--workspace-text)] tracking-tight leading-none">{getDisplayName(selected)}</h2>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <span className="flex items-center gap-1 text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Çevrimiçi
                                        </span>
                                        <span className="text-[9px] text-[var(--sidebar-text-muted)]">Son: {formatDate(selected.lastActive)}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={e => handleDelete(e, selected)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-red-500 border border-red-200 hover:bg-red-500 hover:text-white text-[10px] font-black transition-all"
                            >
                                <Trash2 size={12} /> SİL
                            </button>
                        </div>

                        {/* Detay İçerik */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 mac-horizontal-scrollbar">
                            {/* Teknik Bilgiler + İstatistikler */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-[var(--sidebar-hover)] rounded-sm border border-[var(--window-border)] space-y-3">
                                    <span className="text-[9px] font-black text-[var(--sidebar-text-muted)] uppercase tracking-widest opacity-60">Ağ Bilgileri</span>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-[var(--sidebar-text-muted)]">IP</span>
                                            <span className="text-[10px] font-mono font-black text-[var(--workspace-text)] px-2 py-0.5 bg-[var(--window-bg)] rounded border border-[var(--window-border)]">{selected.ip}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-[var(--sidebar-text-muted)]">MAC</span>
                                            <span className="text-[10px] font-mono font-black text-[var(--workspace-text)] px-2 py-0.5 bg-[var(--window-bg)] rounded border border-[var(--window-border)]">{selected.mac}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-[var(--sidebar-text-muted)]">İlk Görülme</span>
                                            <span className="text-[10px] font-mono font-bold text-[var(--sidebar-text-muted)]">{formatDate(selected.firstSeen)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-[var(--sidebar-hover)] border border-[var(--window-border)] rounded-sm flex flex-col items-center justify-center">
                                        <span className="text-lg font-black text-[var(--accent)] font-mono">{fmtCost(selected.totalCost)}</span>
                                        <span className="text-[8px] font-black text-[var(--sidebar-text-muted)] mt-1 uppercase tracking-wider">Toplam Maliyet</span>
                                    </div>
                                    <div className="p-3 bg-[var(--sidebar-hover)] border border-[var(--window-border)] rounded-sm flex flex-col items-center justify-center">
                                        <span className="text-lg font-black text-[var(--workspace-text)] font-mono">{selected.totalRequests}</span>
                                        <span className="text-[8px] font-black text-[var(--sidebar-text-muted)] mt-1 uppercase tracking-wider">İstek Sayısı</span>
                                    </div>
                                    <div className="p-3 bg-[var(--sidebar-hover)] border border-[var(--window-border)] rounded-sm flex flex-col items-center justify-center col-span-2">
                                        <span className="text-lg font-black text-[var(--workspace-text)] font-mono">{fmt(selected.totalTokens)}</span>
                                        <span className="text-[8px] font-black text-[var(--sidebar-text-muted)] mt-1 uppercase tracking-wider">Toplam Token</span>
                                    </div>
                                </div>
                            </div>

                            {/* Kullanılan Modeller */}
                            <div>
                                <span className="text-[9px] font-black text-[var(--sidebar-text-muted)] uppercase tracking-widest opacity-60 block mb-3">Kullanılan Modeller</span>
                                <div className="flex flex-wrap gap-2">
                                    {selected.models.map((m, idx) => (
                                        <div key={idx} className="px-3 py-1.5 bg-[var(--sidebar-hover)] border border-[var(--window-border)] rounded-sm flex items-center gap-2 hover:border-[var(--accent)] transition-all">
                                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getModelColor(m) }} />
                                            <span className="text-[10px] font-black text-[var(--workspace-text)]">{m}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Son İşlemler */}
                            <div>
                                <span className="text-[9px] font-black text-[var(--sidebar-text-muted)] uppercase tracking-widest opacity-60 block mb-3">Son İşlemler</span>
                                <div className="space-y-1.5">
                                    {selected.logs.slice(0, 8).map((log, idx) => (
                                        <div key={idx} className="px-4 py-2.5 bg-[var(--sidebar-hover)] hover:bg-[var(--window-bg)] border border-transparent hover:border-[var(--window-border)] rounded-sm flex justify-between items-center transition-all group cursor-default">
                                            <div className="flex items-center gap-3">
                                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${log.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                <span className="text-[9px] font-mono text-[var(--sidebar-text-muted)] w-20 shrink-0">{formatDate(log.timestamp)}</span>
                                                <span className="text-[11px] font-bold text-[var(--workspace-text)] group-hover:text-[var(--accent)] transition-colors truncate max-w-[120px]">{log.model}</span>
                                            </div>
                                            <div className="flex items-center gap-4 shrink-0">
                                                <span className="text-[9px] font-mono text-[var(--sidebar-text-muted)]">{fmt(log.totalTokens)} tk</span>
                                                <span className="text-[10px] font-black text-[var(--accent)] font-mono">{fmtCost(log.cost)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-[var(--sidebar-text-muted)]">
                        <div className="p-6 border-2 border-dashed border-[var(--window-border)] rounded-full opacity-30">
                            <Monitor size={40} strokeWidth={1} />
                        </div>
                        <p className="text-[11px] font-bold opacity-30 uppercase tracking-widest">Detayları görmek için cihaz seçin</p>
                    </div>
                )}
            </div>
        </div>
    );
});


// ── Models Tab ──