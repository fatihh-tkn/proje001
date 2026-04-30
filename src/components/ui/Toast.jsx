import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle, Info, Loader2, Copy, Check } from 'lucide-react';
import { useErrorStore } from '../../store/errorStore';
import { useWorkspaceStore } from '../../store/workspaceStore';

const ICONS = {
    error:   <AlertCircle  size={15} className="text-red-400 shrink-0" />,
    success: <CheckCircle  size={15} className="text-emerald-400 shrink-0" />,
    info:    <Info         size={15} className="text-blue-400 shrink-0" />,
    loading: <Loader2      size={15} className="text-slate-300 shrink-0 animate-spin" />,
};

const BG = {
    error:   'bg-red-950/90 border-red-700/50',
    success: 'bg-emerald-950/90 border-emerald-700/50',
    info:    'bg-blue-950/90 border-blue-700/50',
    loading: 'bg-slate-900/90 border-slate-600/50',
};

function Toast({ id, type = 'error', message, count = 1, copyable = false }) {
    const remove = useErrorStore((s) => s.removeToast);
    const [copied, setCopied] = useState(false);

    const handleCopy = (e) => {
        e.stopPropagation();
        try {
            navigator.clipboard?.writeText(message);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
        } catch (_) { /* yok say */ }
    };

    return (
        <div
            className={`flex items-start gap-2 px-3 py-2.5 rounded-lg border text-sm text-slate-200 shadow-xl backdrop-blur max-w-sm w-full animate-slide-in ${BG[type] || BG.error}`}
        >
            {ICONS[type] || ICONS.error}
            <span className="flex-1 leading-snug min-w-0 [overflow-wrap:anywhere]">
                {message}
                {count > 1 && (
                    <span className="ml-1.5 inline-flex items-center justify-center text-[10px] font-bold text-slate-300 bg-white/[0.08] border border-white/10 rounded-full px-1.5 py-0.5">
                        ×{count}
                    </span>
                )}
            </span>
            {copyable && (
                <button
                    onClick={handleCopy}
                    className="text-slate-400 hover:text-slate-200 transition-colors shrink-0 mt-0.5"
                    title={copied ? 'Kopyalandı' : 'Mesajı kopyala'}
                >
                    {copied ? <Check size={13} className="text-emerald-300" /> : <Copy size={13} />}
                </button>
            )}
            {type !== 'loading' && (
                <button
                    onClick={() => remove(id)}
                    className="ml-1 text-slate-400 hover:text-slate-200 transition-colors shrink-0"
                    title="Kapat"
                >
                    <X size={13} />
                </button>
            )}
        </div>
    );
}

export function ToastContainer() {
    const toasts = useErrorStore((s) => s.toasts);
    const isRightOpen = useWorkspaceStore((s) => s.isRightOpen);

    if (!toasts.length) return null;

    // Chatbar açıkken toast sola kayar, kapalıyken tam sağda kalır.
    const rightOffset = isRightOpen ? 'calc(27rem + 12px)' : '20px';

    return (
        <div
            className="fixed bottom-5 z-[9999] flex flex-col gap-2 pointer-events-none"
            style={{
                right: rightOffset,
                transition: 'right 500ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
        >
            {toasts.map((t) => (
                <div key={t.id} className="pointer-events-auto">
                    <Toast {...t} />
                </div>
            ))}
        </div>
    );
}

export default ToastContainer;
