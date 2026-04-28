/** Local opt-out for periodic break reminders (dashboard bell). */
export const WELLBEING_BREAK_NUDGE_DISABLED_KEY = 'creatix:wellbeingBreakNudgeDisabled'

export function readWellbeingBreakNudgeDisabled(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(WELLBEING_BREAK_NUDGE_DISABLED_KEY) === '1'
}

export function writeWellbeingBreakNudgeDisabled(disabled: boolean): void {
  if (typeof window === 'undefined') return
  if (disabled) window.localStorage.setItem(WELLBEING_BREAK_NUDGE_DISABLED_KEY, '1')
  else window.localStorage.removeItem(WELLBEING_BREAK_NUDGE_DISABLED_KEY)
}
