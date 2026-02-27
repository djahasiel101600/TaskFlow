/**
 * Single source of truth for WebSocket base URL.
 * In the browser we use the current origin so connections go through the Vite proxy in dev
 * (same host as the page → no cross-origin; proxy forwards /ws to backend).
 * For SSR or when window is missing, fall back to VITE_API_URL or default.
 */
export function getWebSocketBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}`
  }
  const apiUrl = import.meta.env.VITE_API_URL || ''
  const origin = apiUrl ? new URL(apiUrl).origin : ''
  return origin ? origin.replace(/^http/, 'ws') : 'ws://127.0.0.1:8000'
}

/** Build full WebSocket URL for a path (and optional query string). */
export function buildWebSocketUrl(path: string, params?: Record<string, string>): string {
  const base = getWebSocketBaseUrl().replace(/\/$/, '')
  const pathWithLeading = path.startsWith('/') ? path : `/${path}`
  const search = params
    ? '?' + new URLSearchParams(params).toString()
    : ''
  return `${base}${pathWithLeading}${search}`
}
