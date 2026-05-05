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
                    body: JSON.stringify({
                        api_key: model.api_key,
                        model_name: model.name,
                        provider: model.provider || undefined,
                        base_url: model.base_url || undefined,
                    }),
                }, 10000);
                const data = await res.json();
                if (isMounted) setStatus(data.ok && data.models ? 'active' : 'inactive');
            } catch {
                if (isMounted) setStatus('inactive');
            }
        };
        checkStatus();
        return () => { isMounted = false; };
    }, [model.api_key, model.name, model.provider, model.base_url]);

    return (
        <div className="group relative bg-white rounded-xl border border-stone-200 hover:border-[#378ADD]/30 hover:shadow-md transition-all duration-200 overflow-hidden shadow-sm">
            <SlideDeleteBar onDelete={() => onDelete(model.id)} label="Sil">
                <div className="flex flex-col h-full bg-white p-5 relative z-10">

                    {/* Header: Icon & Status */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg bg-stone-50 border border-stone-200 text-stone-400 group-hover:text-[#378ADD] group-hover:bg-[#378ADD]/5 transition-colors">
                            <Cpu size={18} strokeWidth={2} />
                        </div>

                        <div className="flex shrink-0 mt-1.5">
                            {status === 'checking' && (
                                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md text-stone-500 bg-stone-100 border border-stone-200">
                                    <RefreshCw size={12} className="animate-spin" /> BAĞLANIYOR
                                </span>
                            )}
                            {status === 'active' && (
                                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md text-[#3B6D11] bg-[#EAF3DE] border border-[#EAF3DE]/60">
                                    <span className="w-2 h-2 rounded-full bg-[#3B6D11] animate-pulse inline-block" /> AKTİF
                                </span>
                            )}
                            {status === 'inactive' && (
                                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md text-[#991B1B] bg-[#FEF2F2] border border-[#FEF2F2]/60">
                                    <X size={12} strokeWidth={2.5} /> PASİF
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
                                    className="w-full text-sm font-bold bg-white border border-[#378ADD] rounded-md pl-2.5 pr-8 py-1.5 text-stone-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-[#378ADD]/30"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    onBlur={commitEdit}
                                    onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false); }}
                                />
                                <Check size={14} className="absolute right-3 text-[#378ADD]" strokeWidth={3} />
                            </div>
                        ) : (
                            <h3
                                onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); setEditName(displayName); }}
                                className="font-black tracking-tight text-stone-700 text-[16px] truncate cursor-pointer hover:text-[#378ADD] transition-colors mb-1.5"
                                title="Yeniden adlandırmak için çift tıklayın"
                            >
                                {displayName}
                            </h3>
                        )}

                        <div className="flex flex-col gap-1.5 mt-2.5">
                            <p className="text-[11px] font-bold text-stone-500 flex items-center gap-2 font-mono tracking-tight">
                                <span className="truncate max-w-[200px]" title={model.name}>{model.name}</span>
                            </p>
                            {(model.provider_label || model.provider) && (
                                <p className="text-[10px] font-bold text-stone-500 flex items-center gap-2 tracking-widest uppercase">
                                    <Box size={11} className="opacity-80" />
                                    <span className="truncate" title={model.base_url || ''}>
                                        {model.provider_label || model.provider}
                                    </span>
                                </p>
                            )}
                            <p className="text-[11px] font-bold text-stone-400 flex items-center gap-2 font-mono tracking-widest">
                                <Key size={12} className="opacity-80" />
                                <span>{model.masked_key}</span>
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-center pt-4 mt-5 border-t border-stone-100">
                        <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase">
                            ID: {model.id.substring(0, 8)}
                        </span>
                        <span className="text-[10px] font-bold tracking-widest text-stone-400 font-mono">
                            {new Date(model.created_at).toLocaleDateString('tr-TR')}
                        </span>
                    </div>
                </div>
            </SlideDeleteBar>
        </div>
    );
}

export default ModelCard;
