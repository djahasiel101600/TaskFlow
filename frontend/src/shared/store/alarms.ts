/**
 * Alarms for reminder/deadline notifications: repeat sound + browser notification
 * until the user dismisses or snoozes. Snooze re-triggers after the chosen delay.
 */
import { create } from 'zustand'

const ALARM_REPEAT_INTERVAL_MS = 60_000 // 1 minute

interface AlarmsState {
  /** Notification IDs that are currently alarming (will repeat every interval). */
  activeAlarmIds: number[]
  /** Notification ID -> timestamp when snooze ends (ms). */
  snoozedUntil: Record<number, number>
  addAlarm: (id: number) => void
  dismissAlarm: (id: number) => void
  dismissAllAlarms: () => void
  /** Snooze for `minutes`, then re-add to active alarms. */
  snoozeAlarm: (id: number, minutes: number) => void
  /** Check if an id is currently active (alarming and not snoozed). */
  isActive: (id: number) => boolean
  /** Get all active ids that are not snoozed (for the repeat loop). */
  getRingingIds: () => number[]
}

export const ALARM_REPEAT_INTERVAL = ALARM_REPEAT_INTERVAL_MS

export const useAlarmStore = create<AlarmsState>((set, get) => ({
  activeAlarmIds: [],
  snoozedUntil: {},

  addAlarm: (id: number) => {
    set((s) => ({
      activeAlarmIds: s.activeAlarmIds.includes(id) ? s.activeAlarmIds : [...s.activeAlarmIds, id],
    }))
  },

  dismissAlarm: (id: number) => {
    set((s) => {
      const next = { ...s.snoozedUntil }
      delete next[id]
      return {
        activeAlarmIds: s.activeAlarmIds.filter((x) => x !== id),
        snoozedUntil: next,
      }
    })
  },
  dismissAllAlarms: () => set({ activeAlarmIds: [], snoozedUntil: {} }),

  snoozeAlarm: (id: number, minutes: number) => {
    const until = Date.now() + minutes * 60 * 1000
    set((s) => ({
      activeAlarmIds: s.activeAlarmIds.filter((x) => x !== id),
      snoozedUntil: { ...s.snoozedUntil, [id]: until },
    }))
    setTimeout(() => {
      const state = get()
      if (state.snoozedUntil[id] === until) {
        set((s) => {
          const next = { ...s.snoozedUntil }
          delete next[id]
          return {
            activeAlarmIds: [...s.activeAlarmIds, id],
            snoozedUntil: next,
          }
        })
      }
    }, minutes * 60 * 1000)
  },

  isActive: (id: number) => {
    const s = get()
    if (!s.activeAlarmIds.includes(id)) return false
    const until = s.snoozedUntil[id]
    return until == null || Date.now() >= until
  },

  getRingingIds: () => {
    const s = get()
    const now = Date.now()
    return s.activeAlarmIds.filter((id) => {
      const until = s.snoozedUntil[id]
      return until == null || now >= until
    })
  },
}))
