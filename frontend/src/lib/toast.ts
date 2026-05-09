import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  text: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: Toast[];
  push: (text: string, variant?: ToastVariant) => void;
  dismiss: (id: string) => void;
}

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],
  push: (text, variant = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set({ toasts: [...get().toasts, { id, text, variant }] });
    setTimeout(() => get().dismiss(id), 4000);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = {
  success: (text: string) => useToast.getState().push(text, 'success'),
  error: (text: string) => useToast.getState().push(text, 'error'),
  info: (text: string) => useToast.getState().push(text, 'info'),
};
