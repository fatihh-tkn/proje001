import React from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useErrorStore } from '../../store/errorStore';

const ICONS = {
  error: <AlertCircle size={15} className="text-red-400 shrink-0" />,
  success: <CheckCircle size={15} className="text-emerald-400 shrink-0" />,
  info: <Info size={15} className="text-blue-400 shrink-0" />,
};

const BG = {
  error: 'bg-red-950/90 border-red-700/50',
  success: 'bg-emerald-950/90 border-emerald-700/50',
  info: 'bg-blue-950/90 border-blue-700/50',
};

function Toast({ id, type = 'error', message }) {
  const remove = useErrorStore((s) => s.removeToast);
  return (
    <div
      className={`flex items-start gap-2 px-3 py-2.5 rounded-lg border text-sm text-slate-200 shadow-xl backdrop-blur max-w-sm w-full animate-slide-in ${BG[type] || BG.error}`}
    >
      {ICONS[type] || ICONS.error}
      <span className="flex-1 leading-snug">{message}</span>
      <button
        onClick={() => remove(id)}
        className="ml-1 text-slate-400 hover:text-slate-200 transition-colors shrink-0"
      >
        <X size={13} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useErrorStore((s) => s.toasts);
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast {...t} />
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
