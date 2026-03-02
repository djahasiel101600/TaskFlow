let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  if (!audioContext) audioContext = new Ctx()
  return audioContext
}

/** Show a browser/OS notification when tab is in background (e.g. reminder/deadline like an alarm). */
export function showBrowserNotification(title: string, options?: { body?: string; tag?: string }) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, { body: options?.body, tag: options?.tag ?? 'taskflow' })
    } catch {
      // ignore
    }
    return
  }
  if (Notification.permission === 'default') {
    Notification.requestPermission().then((p) => {
      if (p === 'granted') showBrowserNotification(title, options)
    })
  }
}
/** Call once after a user gesture (e.g. first click) so browsers allow sound later */
export function unlockNotificationSound() {
  const ctx = getAudioContext()
  if (ctx?.state === 'suspended') ctx.resume()
}

export function playNotificationSound(alarmLike = false) {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => playOnce(ctx, alarmLike)).catch(() => {})
      return
    }
    playOnce(ctx, alarmLike)
  } catch {
    // ignore
  }
}

function playOnce(ctx: AudioContext, alarmLike = false) {
  try {
    const t = ctx.currentTime
    const osc1 = ctx.createOscillator()
    const g1 = ctx.createGain()
    osc1.connect(g1)
    g1.connect(ctx.destination)
    osc1.frequency.value = alarmLike ? 880 : 800
    osc1.type = 'sine'
    const d = alarmLike ? 0.3 : 0.2
    g1.gain.setValueAtTime(alarmLike ? 0.22 : 0.2, t)
    g1.gain.exponentialRampToValueAtTime(0.01, t + d)
    osc1.start(t)
    osc1.stop(t + d)
    if (alarmLike) {
      const osc2 = ctx.createOscillator()
      const g2 = ctx.createGain()
      osc2.connect(g2)
      g2.connect(ctx.destination)
      osc2.frequency.value = 880
      osc2.type = 'sine'
      g2.gain.setValueAtTime(0.22, t + 0.4)
      g2.gain.exponentialRampToValueAtTime(0.01, t + 0.4 + d)
      osc2.start(t + 0.4)
      osc2.stop(t + 0.4 + d)
    }
  } catch {
    // ignore
  }
}
