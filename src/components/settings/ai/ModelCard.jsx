import React, { useState, useEffect } from 'react';
import { Key, RefreshCw, X, Box } from 'lucide-react';
import { API_BASE, fetchWithTimeout } from './utils';
import { SlideDeleteBar } from './DeleteSlider';

function ModelCard({ model, index, alias, onAliasChange, onDelete }) {
    const [status, setStatus] = useState('checking');
    const defaultAlias = `Model_${index + 1}`;
    const displayName = alias || defaultAlias;
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState('');

    const commitEdit = (e) => {
        if (e) e.stopPropagation();
        const trimmed = editName.trim();
        if (trimmed && trimmed !== displayName) {
            onAliasChange(model.id, trimmed);
        }
        setEditing(false);
    };

    useEffect(() => {
        let isMounted = true;
        const checkStatus = async () => {
            try {
                const res = await fetchWithTimeout(`${API_BASE}/custom-models/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ api_key: model.api_key, model_name: model.name }),
                }, 10000);
                const data = await res.json();
                if (isMounted) setStatus(data.ok && data.models ? 'active' : 'inactive');
            } catch {
                if (isMounted) setStatus('inactive');
            }
        };
        checkStatus();
        return () => { isMounted = false; };
    }, [model.api_key]);

    return (
        <div className="group relative bg-white rounded-sm ring-1 ring-black/[0.06] hover:ring-black/[0.12] transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md ease-out">
            <SlideDeleteBar onDelete={() => onDelete(model.id)} label="Modeli Sil">
                <div className="flex flex-col h-full p-4 relative z-10 bg-white">
                    <div className="flex items-start gap-3 flex-1">
                        <div className="w-9 h-9 shrink-0 flex items-center justify-center rounded-[3px] bg-gray-50 ring-1 ring-black/[0.04]">
                            <Box size={18} className="text-gray-400" />
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col pt-0.5">
                            <div className="flex items-center justify-between gap-2 max-w-full">
                                {editing ? (
                                    <input
                                        autoFocus
                                        className="w-full text-sm font-medium bg-[var(--window-bg)] border border-[var(--accent)] rounded px-1.5 py-0.5 text-[var(--workspace-text)] focus:outline-none"
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        onBlur={commitEdit}
                                        onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false); }}
                                    />
                                ) : (
                                    <h3
                                        onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); setEditName(displayName); }}
                                        className="font-medium text-[var(--workspace-text)] text-sm truncate flex-1 cursor-pointer hover:text-[var(--accent)] transition-colors"
                                        title="Çift tıklayarak yeniden adlandır"
                                    >
                                        {displayName}
                                    </h3>
                                )}
                                <div className="flex shrink-0">
                                    {status === 'checking' && <span className="flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full text-slate-400 bg-slate-500/10 border border-slate-500/30"><RefreshCw size={8} className="animate-spin" /> BAĞLANIYOR</span>}
                                    {status === 'active' && <span className="flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full text-emerald-500 bg-emerald-500/10 border border-emerald-500/30"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" /> AKTİF</span>}
                                    {status === 'inactive' && <span className="flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full text-red-500 bg-red-500/10 border border-red-500/30"><X size={10} className="text-red-500" /> PASİF</span>}
                                </div>
                            </div>
                            <p className="text-[10px] font-mono tracking-wider truncate text-[var(--sidebar-text-muted)] mt-1.5 flex items-center gap-1.5">
                                <span className="font-medium text-[var(--workspace-text)] opacity-80" title={model.name}>{model.name}</span>
                                <span className="opacity-30">|</span>
                                <Key size={10} className="opacity-70" /> {model.masked_key}
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-3 mt-auto border-t border-white/[0.06]">
                        <span className="text-[10px] text-[var(--sidebar-text-muted)]">
                            Oluşturulma: {new Date(model.created_at).toLocaleDateString('tr-TR')}
                        </span>
                    </div>
                </div>
            </SlideDeleteBar>
        </div>
    );
}

export default ModelCard;
