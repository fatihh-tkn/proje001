import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, RefreshCw, Activity, Monitor, Trash2, Wifi, Cpu, Clock, Hash, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { API_BASE, fetchWithTimeout, getModelColor, fmtCost, fmt, formatDate } from '../utils';
import { SlideDeleteBar } from '../DeleteSlider';

/* ─── Stat Card ─────────────────────────────────────────────────── */
function StatCard({ label, value, sub, accent }) {
    return (
        <div className="flex flex-col gap-1.5 p-5">
            <span className={`text-[16px] lg:text-xl font-black font-mono ${accent ? 'text-[#378ADD]' : 'text-stone-700'}`}>{value}</span>
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{label}</span>
            {sub && <span className="text-[10px] font-bold text-stone-400 opacity-60">{sub}</span>}
        </div>
    );
}

/* ─── Info Row ───────────────────────────────────────────────────── */
function InfoRow({ icon: Icon, label, value, mono }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/50 transition-colors px-1">
            <div className="flex items-center gap-2.5 text-stone-400">
                <Icon size={14} className="opacity-80" />
                <span className="text-[11px] font-bold">{label}</span>
            </div>
            <span className={`text-[11px] font-bold text-stone-700 ${mono ? 'font-mono tracking-widest' : ''}`}>{value}</span>
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
        <div className="flex bg-stone-50 select-none w-full h-full overflow-hidden animate-in fade-in duration-300 p-6 md:p-8 max-w-6xl mx-auto gap-6">
            {/* SOL SAIDBAR: Liste */}
            <div className="w-1/3 min-w-[300px] max-w-sm flex flex-col bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">

                {/* Başlık */}
                <div className="px-5 py-4 flex items-center justify-between border-b border-stone-100 bg-white">
                    <div className="flex items-center gap-2.5">
                        <Monitor size={14} className="text-[#378ADD]" />
                        <span className="text-[12px] font-medium text-stone-600 uppercase tracking-wide">Cihazlar</span>
                        {computers.length > 0 && (
                            <span className="px-1.5 py-0.5 bg-[#378ADD]/10 text-[#378ADD] rounded-md text-[10px] font-bold">{computers.length}</span>
                        )}
                    </div>
                    <button
                        onClick={fetchComputers}
                        className="p-1.5 rounded-md text-stone-400 hover:text-[#378ADD] hover:bg-stone-50 transition-colors cursor-pointer"
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>

                {/* Arama */}
                <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={13} />
                        <input
                            className="w-full pl-8 pr-3 py-2 bg-white border border-stone-200 rounded-md text-[11px] font-bold text-stone-700 shadow-sm placeholder:text-stone-400/70 focus:outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD] transition-all"
                            placeholder="IP, MAC veya isim..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Liste */}
                <div className="flex-1 overflow-y-auto bg-stone-50/30">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-4 opacity-70">
                            <Activity className="animate-spin text-stone-400" size={24} />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Yükleniyor</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-3 opacity-70 px-6 text-center">
                            <Monitor size={28} strokeWidth={1} className="text-stone-400" />
                            <span className="text-[11px] font-bold uppercase tracking-widest text-stone-500">
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
                                    className={`group relative cursor-pointer transition-all duration-200 overflow-hidden mx-3 my-2 rounded-lg ${isSelected
                                        ? 'bg-white shadow-sm border border-[#378ADD]/30 ring-1 ring-[#378ADD]/10'
                                        : 'bg-white border border-transparent hover:border-stone-200 hover:shadow-sm'}`}
                                >

                                    <SlideDeleteBar
                                        onDelete={() => handleDelete({ stopPropagation: () => { } }, c)}
                                        label="Cihazı Sil"
                                        iconSize={14}
                                    >
                                        <div className="flex items-center gap-3.5 px-4 py-3.5">
                                            {/* Online dot */}
                                            <div className="relative shrink-0">
                                                <div className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors duration-200
                                                    ${isSelected ? 'bg-[#378ADD]/10 text-[#378ADD]' : 'bg-stone-100 text-stone-400'}`}>
                                                    <Monitor size={16} />
                                                </div>
                                                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#1D9E75] border-2 border-white" />
                                            </div>

                                            {/* İsim & MAC */}
                                            <div className="flex-1 min-w-0">
                                                {editingId === c.id ? (
                                                    <input
                                                        autoFocus
                                                        className="w-full text-[12px] font-bold bg-white border border-[#378ADD] rounded px-2 py-1 text-stone-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-[#378ADD]/30"
                                                        value={editName}
                                                        onChange={e => setEditName(e.target.value)}
                                                        onBlur={() => commitEdit(c)}
                                                        onKeyDown={e => { if (e.key === 'Enter') commitEdit(c); if (e.key === 'Escape') setEditingId(null); }}
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                ) : (
                                                    <p
                                                        className={`text-[12px] font-bold truncate transition-colors duration-200 ${isSelected ? 'text-[#378ADD]' : 'text-stone-700 group-hover:text-[#378ADD]'}`}
                                                        onDoubleClick={e => startEdit(e, c)}
                                                        title="Çift tıklayarak yeniden adlandır"
                                                    >
                                                        {displayName}
                                                    </p>
                                                )}
                                                <p className={`text-[10px] font-mono font-bold truncate mt-1 transition-colors duration-200 ${isSelected ? 'text-[#378ADD]/70' : 'text-stone-400'}`}>{c.mac}</p>
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
            <div className="flex-1 flex flex-col bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden relative">
                {selected ? (
                    <div className="flex flex-col h-full">

                        {/* Header */}
                        <div className="border-b border-stone-100 overflow-hidden bg-stone-50">
                            <SlideDeleteBar onDelete={() => handleDelete({ stopPropagation: () => { } }, selected)} label="Cihazı Sil">
                                <div className="flex items-center gap-4 min-w-0 px-8 py-6">
                                    <div className="relative shrink-0">
                                        <div className="w-12 h-12 rounded-lg bg-[#378ADD]/10 border border-[#378ADD]/20 flex items-center justify-center text-[#378ADD]">
                                            <Monitor size={24} strokeWidth={2} />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#1D9E75] border-[2.5px] border-stone-50" />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-[18px] tracking-tight font-black text-stone-700 truncate">{getDisplayName(selected)}</h2>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#3B6D11] uppercase tracking-widest bg-[#EAF3DE] px-2 py-0.5 rounded-md">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#3B6D11] animate-pulse inline-block" />
                                                Çevrimiçi
                                            </span>
                                            <span className="text-stone-200">·</span>
                                            <span className="text-[11px] font-mono font-bold text-stone-500">{selected.ip}</span>
                                        </div>
                                    </div>
                                </div>
                            </SlideDeleteBar>
                        </div>

                        {/* İçerik */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 mac-horizontal-scrollbar bg-white">

                            {/* İstatistik Bar */}
                            <div className="grid grid-cols-3 divide-x divide-stone-100 border border-stone-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                <StatCard label="Toplam Maliyet" value={fmtCost(selected.totalCost)} accent />
                                <StatCard label="İstek Sayısı" value={selected.totalRequests} />
                                <StatCard label="Toplam Token" value={fmt(selected.totalTokens)} />
                            </div>

                            {/* Ağ Bilgileri */}
                            <div>
                                <p className="text-[12px] font-medium text-stone-600 uppercase tracking-wide mb-3 pl-1 flex items-center gap-2">
                                    <Wifi size={14} className="text-stone-400" /> Ağ Bilgileri
                                </p>
                                <div className="border border-stone-200 shadow-sm rounded-xl px-5 py-1 bg-stone-50/50">
                                    <InfoRow icon={Wifi} label="IP Adresi" value={selected.ip} mono />
                                    <InfoRow icon={Hash} label="MAC Adresi" value={selected.mac} mono />
                                    <InfoRow icon={Clock} label="İlk Görülme" value={formatDate(selected.firstSeen)} />
                                    <InfoRow icon={TrendingUp} label="Son Aktivite" value={formatDate(selected.lastActive)} />
                                </div>
                            </div>

                            {/* Kullanılan Modeller */}
                            {selected.models.length > 0 && (
                                <div>
                                    <p className="text-[12px] font-medium text-stone-600 uppercase tracking-wide mb-3 pl-1 flex items-center gap-2">
                                        <Cpu size={14} className="text-stone-400" /> Kullanılan Modeller
                                    </p>
                                    <div className="flex flex-wrap gap-2 px-1">
                                        {selected.models.map((m, idx) => (
                                            <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-200 rounded-md shadow-sm hover:border-[#378ADD]/40 transition-colors">
                                                <div className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: getModelColor(m) }} />
                                                <span className="text-[11px] font-bold text-stone-700 font-mono tracking-tight">{m}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Son İşlemler */}
                            <div>
                                <p className="text-[12px] font-medium text-stone-600 uppercase tracking-wide mb-3 pl-1 flex items-center gap-2">
                                    <Activity size={14} className="text-stone-400" /> Son İşlemler
                                </p>
                                <div className="border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100 shadow-sm bg-white">
                                    {selected.logs.slice(0, 10).map((log, idx) => (
                                        <div key={idx} className="flex items-center gap-4 px-5 py-3 hover:bg-stone-50 transition-colors group">
                                            {log.status === 'success'
                                                ? <CheckCircle2 size={14} className="text-[#3B6D11] bg-[#EAF3DE] rounded-full shrink-0" />
                                                : <AlertCircle size={14} className="text-[#791F1F] bg-[#FCEBEB] rounded-full shrink-0" />
                                            }
                                            <span className="text-[11px] font-bold text-stone-600 font-mono truncate flex-1 group-hover:text-[#378ADD] transition-colors">{log.model}</span>
                                            <span className="text-[10px] font-bold font-mono text-stone-400 shrink-0">{formatDate(log.timestamp)}</span>
                                            <span className="text-[11px] font-bold font-mono text-stone-500 shrink-0 w-16 text-right">{fmt(log.totalTokens)}<span className="text-[8px] text-stone-400 uppercase ml-0.5">tk</span></span>
                                            <span className="text-[11px] font-black text-[#378ADD] font-mono shrink-0 w-16 text-right">{fmtCost(log.cost)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-stone-400 opacity-60 bg-stone-50/50">
                        <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-stone-200 flex items-center justify-center mb-2">
                            <Monitor size={36} strokeWidth={1.5} className="text-stone-400" />
                        </div>
                        <p className="text-[12px] font-bold uppercase tracking-widest text-stone-500">Detay için cihaz seçin</p>
                    </div>
                )}
            </div>
        </div>
    );
});
