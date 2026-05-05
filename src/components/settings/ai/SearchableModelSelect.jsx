import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Check } from 'lucide-react';

/**
 * Aranabilir model seçici. OpenRouter gibi 300+ model döndüren
 * sağlayıcılarda native <select> kullanışsız kalır.
 *
 * Props:
 *   models      string[]  — seçilebilir model id'leri
 *   value       string    — şu anda seçili model id'si
 *   onChange    (id) => void
 *   placeholder string
 */
export default function SearchableModelSelect({
    models = [],
    value = '',
    onChange,
    placeholder = 'Model ara veya seç...',
}) {
    const [query, setQuery] = useState(value || '');
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(0);
    const wrapperRef = useRef(null);
    const listRef = useRef(null);

    // Dış state'ten gelen value değişince input metnini de senkronla
    useEffect(() => { setQuery(value || ''); }, [value]);

    // Outside click → kapan + query'yi seçili modele geri çek
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
                setQuery(value || '');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open, value]);

    // Query (case-insensitive substring) ile filtrele.
    // Query tam olarak mevcut value'ya eşitse filtre uygulamayalım — kullanıcı
    // dropdown'u açıp başkasını seçmek isteyebilir, tüm liste görünsün.
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q || q === (value || '').toLowerCase()) return models;
        return models.filter(m => (m || '').toLowerCase().includes(q));
    }, [models, query, value]);

    // Highlight'ı filtrenin içinde güvende tut
    useEffect(() => {
        setHighlight(h => Math.min(h, Math.max(0, filtered.length - 1)));
    }, [filtered.length]);

    const commit = (id) => {
        if (!id) return;
        onChange?.(id);
        setQuery(id);
        setOpen(false);
    };

    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!open) setOpen(true);
            setHighlight(h => Math.min(h + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight(h => Math.max(h - 1, 0));
        } else if (e.key === 'Enter') {
            if (open && filtered[highlight]) {
                e.preventDefault();
                commit(filtered[highlight]);
            }
        } else if (e.key === 'Escape') {
            setOpen(false);
            setQuery(value || '');
        }
    };

    // Highlight'lı item'ı görünür alanda tut
    useEffect(() => {
        if (!open || !listRef.current) return;
        const node = listRef.current.querySelector(`[data-idx="${highlight}"]`);
        if (node) node.scrollIntoView({ block: 'nearest' });
    }, [highlight, open]);

    return (
        <div ref={wrapperRef} className="relative">
            <input
                type="text"
                value={query}
                onFocus={() => setOpen(true)}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlight(0); }}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                className="w-full bg-white border border-stone-200 rounded-md pl-4 pr-10 py-3 text-[12px] font-bold font-mono text-stone-700 shadow-sm placeholder:text-stone-400 focus:bg-white focus:border-[#378ADD] focus:outline-none focus:ring-1 focus:ring-[#378ADD]/30 transition-all"
                autoComplete="off"
                spellCheck={false}
            />
            <Search size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />

            {open && (
                <div
                    ref={listRef}
                    className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto bg-white border border-stone-200 rounded-md shadow-lg"
                >
                    <div className="px-4 py-2 text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-100 bg-white sticky top-0">
                        {filtered.length === 0
                            ? 'Eşleşme yok'
                            : filtered.length === models.length
                                ? `${models.length} model`
                                : `${filtered.length} eşleşme · toplam ${models.length}`}
                    </div>

                    {filtered.length === 0 ? (
                        <div className="px-4 py-3 text-[11px] text-stone-400 font-mono">
                            "{query}" için eşleşme bulunamadı
                        </div>
                    ) : (
                        filtered.map((m, idx) => {
                            const isSelected = m === value;
                            const isHighlighted = idx === highlight;
                            return (
                                <button
                                    key={m}
                                    type="button"
                                    data-idx={idx}
                                    onMouseEnter={() => setHighlight(idx)}
                                    onMouseDown={(e) => {
                                        // mousedown: input blur'undan önce çalışır → liste kapanmaz
                                        e.preventDefault();
                                        commit(m);
                                    }}
                                    className={`w-full text-left px-4 py-2 text-[12px] font-mono transition-colors flex items-center justify-between gap-2 ${
                                        isHighlighted ? 'bg-stone-100' : ''
                                    } ${isSelected ? 'text-[#378ADD] font-bold' : 'text-stone-700'}`}
                                >
                                    <span className="truncate">{m}</span>
                                    {isSelected && <Check size={13} className="shrink-0 text-[#378ADD]" strokeWidth={3} />}
                                </button>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
