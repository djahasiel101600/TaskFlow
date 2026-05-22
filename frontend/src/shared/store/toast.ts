import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
  duration?: number
}

interface ToastState {
  toasts: ToastItem[]
  push: (message: string, variant?: ToastVariant, duration?: number) => void
  dismiss: (id: string) => void
}

let _counter = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, variant = 'info', duration = 4000) => {
    const id = `toast-${++_counter}`
    set((s) => ({ toasts: [...s.toasts, { id, message, variant, duration }] }))
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      }, duration)
    }
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

/** Convenience helpers — use these instead of calling the store directly */
export const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().push(message, 'success', duration),
  error: (message: string, duration?: number) =>
    useToastStore.getState().push(message, 'error', duration),
  info: (message: string, duration?: number) =>
    useToastStore.getState().push(message, 'info', duration),
  warning: (message: string, duration?: number) =>
    useToastStore.getState().push(message, 'warning', duration),
}
