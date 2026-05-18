import React from 'react';

/* ── Spreadsheet bileşenleri ─────────────────────────────────────── */
export function SheetBlock({ title, icon: Icon, color = 'stone', children }) {
    const hdr = {
        blue:   'bg-[#378ADD]/8 text-[#378ADD] border-[#378ADD]/20',
        violet: 'bg-violet-50 text-violet-600 border-violet-200',
        orange: 'bg-orange-50 text-orange-500 border-orange-200',
        emerald:'bg-emerald-50 text-emerald-600 border-emerald-200',
        stone:  'bg-stone-50 text-stone-500 border-stone-200',
    };
    return (
        <div className="rounded-xl border border-stone-200 overflow-hidden">
            <div className={`flex items-center gap-2 px-4 py-2 border-b ${hdr[color]}`}>
                {Icon && <Icon size={12} />}
                <span className="text-[10px] font-black tracking-widest uppercase">{title}</span>
            </div>
            <div className="bg-white">{children}</div>
        </div>
    );
}

export function SheetKVTable({ rows, highlightKeys = [] }) {
    return (
        <table className="w-full text-[12px]">
            <tbody>
                {rows.map(([k, v], i) => {
                    const hi = highlightKeys.includes(k);
                    return (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-stone-50/60'}>
                            <td className="px-4 py-2 w-36 font-semibold text-stone-400 border-r border-stone-100 whitespace-nowrap">{k}</td>
                            <td className={`px-4 py-2 font-medium ${hi ? 'text-emerald-600 font-bold' : 'text-stone-700'}`}>{v}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

export function SheetDataTable({ cols, rows }) {
    return (
        <table className="w-full text-[12px]">
            <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                    {cols.map(c => (
                        <th key={c.key} className="px-4 py-2 text-left text-[10px] font-black text-stone-400 uppercase tracking-wider" style={{ width: c.w }}>
                            {c.label}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((r, i) => (
                    <tr key={i} className={`border-b border-stone-50 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-stone-50/40'}`}>
                        {cols.map(c => (
                            <td key={c.key} className="px-4 py-2 text-stone-700 font-medium">{r[c.key] || '—'}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export function SheetTagTable({ items }) {
    const toStr = it => {
        if (!it) return '';
        if (typeof it === 'string') return it;
        if (typeof it === 'object') {
            return it.islem || it.aciklama || it.text || it.ad || it.tanim || it.name ||
                Object.values(it).filter(v => typeof v === 'string' && v).join(' — ') || '';
        }
        return String(it);
    };
    return (
        <table className="w-full text-[12px]">
            <tbody>
                {items.map((it, i) => (
                    <tr key={i} className={`border-b border-stone-50 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-stone-50/40'}`}>
                        <td className="px-4 py-2 w-10 text-stone-300 font-mono font-bold text-[10px]">{i + 1}</td>
                        <td className="px-4 py-2 text-stone-700 font-medium">{toStr(it)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

/* ── Excel benzeri spreadsheet ───────────────────────────────────── */
export function ExcelSheet({ rows, cols }) {
    /* rows: dizi-of-dizi [[label,val],...] veya dizi-of-obje [{key:val},...] */
    if (!rows || rows.length === 0) return (
        <div className="flex items-center justify-center h-24 text-stone-400 text-[12px]">Veri yok</div>
    );

    const isKV = Array.isArray(rows[0]);

    if (isKV) {
        return (
            <table className="w-full border-collapse text-[12px]">
                <thead>
                    <tr className="bg-[#217346]/10">
                        <th className="w-8 border border-stone-200 bg-stone-100 text-stone-400 text-[10px] font-normal px-2 py-1.5 text-center" />
                        <th className="border border-stone-200 bg-[#217346]/10 text-[#217346] font-bold px-3 py-1.5 text-left text-[11px]">Alan</th>
                        <th className="border border-stone-200 bg-[#217346]/10 text-[#217346] font-bold px-3 py-1.5 text-left text-[11px]">Değer</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(([label, val], i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-stone-50/60'}>
                            <td className="border border-stone-200 bg-stone-100 text-stone-400 text-[10px] px-2 py-1.5 text-center w-8">{i + 1}</td>
                            <td className="border border-stone-200 px-3 py-1.5 text-stone-500 font-medium">{label}</td>
                            <td className="border border-stone-200 px-3 py-1.5 text-stone-800">{val}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }

    /* Obje dizisi → columns */
    const headers = cols || Object.keys(rows[0]);
    return (
        <table className="w-full border-collapse text-[12px]">
            <thead>
                <tr>
                    <th className="w-8 border border-stone-200 bg-stone-100 text-stone-400 text-[10px] font-normal px-2 py-1.5 text-center" />
                    {headers.map(h => (
                        <th key={h} className="border border-stone-200 bg-[#217346]/10 text-[#217346] font-bold px-3 py-1.5 text-left text-[11px]">{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-stone-50/60'}>
                        <td className="border border-stone-200 bg-stone-100 text-stone-400 text-[10px] px-2 py-1.5 text-center">{i + 1}</td>
                        {headers.map(h => (
                            <td key={h} className="border border-stone-200 px-3 py-1.5 text-stone-800">{row[h] ?? ''}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
