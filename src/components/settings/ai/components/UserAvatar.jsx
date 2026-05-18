import React from 'react';

/* ─── Avatar ─────────────────────────────────────────────────── */
export function UserAvatar({ name, size = 36 }) {
    const initials = name
        ? name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : '?';
    const colors = [
        ['#1e40af', '#dbeafe'], ['#065f46', '#d1fae5'], ['#7c2d12', '#fee2e2'],
        ['#4c1d95', '#ede9fe'], ['#0c4a6e', '#e0f2fe'], ['#713f12', '#fef3c7'],
        ['#881337', '#ffe4e6'], ['#134e4a', '#ccfbf1'],
    ];
    const [fg, bg] = colors[(name?.charCodeAt(0) || 0) % colors.length];
    return (
        <div
            style={{ width: size, height: size, backgroundColor: bg, color: fg, borderRadius: size * 0.3, fontSize: size * 0.38 }}
            className="flex items-center justify-center font-black shrink-0 select-none"
        >
            {initials}
        </div>
    );
}
