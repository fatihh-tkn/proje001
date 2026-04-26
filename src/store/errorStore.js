import { create } from 'zustand';

let _nextId = 1;

export const useErrorStore = create((set) => ({
  toasts: [],

  addToast: ({ type = 'error', message, duration = 4000 }) => {
    const id = _nextId++;
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
