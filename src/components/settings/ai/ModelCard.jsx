import React, { useState, useEffect } from 'react';
import { Key, RefreshCw, X, Box, Check, Cpu } from 'lucide-react';
import { API_BASE, fetchWithTimeout } from './utils';
import { SlideDeleteBar } from './DeleteSlider';

function ModelCard({ model, index, alias, onAliasChange, onDelete }) {
    const [status, setStatus] = useState('checking');
    const defaultAlias = `Kaynak_${index + 1}`;
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
        <div className="group relative bg-white rounded-md ring-1 ring-black/[0.06] hover:ring-black/[0.12] transition-colors duration-200 overflow-hidden shadow-sm">
            <SlideDeleteBar onDelete={() => onDelete(model.id)} label="Sil">
                <div className="flex flex-col h-full bg-white p-4 relative z-10">

                    {/* Header: Icon & Status */}
                    <div className="flex items-start justify-between mb-3">
                        <div className="w-8 h-8 shrink-0 flex items-center justify-center rounded-sm bg-gray-50 ring-1 ring-black/[0.04] text-[var(--sidebar-text-muted)] group-hover:text-[var(--accent)] transition-colors">
                            <Cpu size={16} />
                        </div>

                        <div className="flex shrink-0 mt-1">
                            {status === 'checking' && (
                                <span className="flex items-center gap-1.5 text-[9px] font-bold tracking-widest px-2 py-0.5 rounded-sm text-slate-500 bg-slate-50 border border-slate-200">
                                    <RefreshCw size={10} className="animate-spin" /> BAĞLANIYOR
                                </span>
                            )}
                            {status === 'active' && (
                                <span className="flex items-center gap-1.5 text-[9px] font-bold tracking-widest px-2 py-0.5 rounded-sm text-emerald-600 bg-emerald-50 border border-emerald-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" /> AKTİF
                                </span>
                            )}
                            {status === 'inactive' && (
                                <span className="flex items-center gap-1.5 text-[9px] font-bold tracking-widest px-2 py-0.5 rounded-sm text-rose-600 bg-rose-50 border border-rose-100">
                                    <X size={10} className="text-rose-500" /> PASİF
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Body: Name & Key Info */}
                    <div className="min-w-0 flex flex-col flex-1">
                        {editing ? (
                            <div className="relative flex items-center mb-1">
                                <input
                                    autoFocus
                                    className="w-full text-sm font-medium bg-[var(--window-bg)] border border-[var(--accent)] rounded-sm pl-2 pr-6 py-1 text-[var(--workspace-text)] focus:outline-none"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    onBlur={commitEdit}
                                    onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false); }}
                                />
                                <Check size={12} className="absolute right-2 text-[var(--accent)]" />
                            </div>
                        ) : (
                            <h3
                                onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); setEditName(displayName); }}
                                className="font-medium text-[var(--workspace-text)] text-sm truncate cursor-pointer hover:text-[var(--accent)] transition-colors mb-1"
                                title="Yeniden adlandırmak için çift tıklayın"
                            >
                                {displayName}
                            </h3>
                        )}

                        <div className="flex flex-col gap-1 mt-2">
                            <p className="text-[11px] text-[var(--sidebar-text-muted)] flex items-center gap-2 font-mono">
                                <span className="truncate max-w-[150px] font-medium" title={model.name}>{model.name}</span>
                            </p>
                            <p className="text-[11px] text-[var(--sidebar-text-muted)] flex items-center gap-2 font-mono">
                                <Key size={12} className="opacity-60" />
                                <span>{model.masked_key}</span>
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-center pt-3 mt-4 border-t border-black/[0.04]">
                        <span className="text-[10px] font-medium text-[var(--sidebar-text-muted)]">
                            ID: {model.id.substring(0, 8)}
                        </span>
                        <span className="text-[10px] font-medium text-[var(--sidebar-text-muted)]">
                            {new Date(model.created_at).toLocaleDateString('tr-TR')}
                        </span>
                    </div>
                </div>
            </SlideDeleteBar>
        </div>
    );
}

export default ModelCard;
