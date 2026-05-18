import React from 'react';
import { WifiOff } from 'lucide-react';

/* ─── Durum rozeti ────────────────────────────────────────────── */
export function UserStatusBadge({ status }) {
    const isActive = status === 'Aktif';
    return isActive ? (
        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#EAF3DE] text-[#3B6D11]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3B6D11] animate-pulse inline-block" />Aktif
        </span>
    ) : (
        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-stone-100 text-stone-400">
            <WifiOff size={9} />Pasif
        </span>
    );
}
