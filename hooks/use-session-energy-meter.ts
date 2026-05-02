'use client'

import { useSyncExternalStore } from 'react'
import {
  SESSION_ENERGY_STORAGE_KEY,
  applySessionEnergyTick,
  fatigueToEnergyPercent,
  parseSessionEnergyStorage,
  sessionEnergyLocalDayKey,
} from '@/lib/wellbeing/session-energy-meter'

const TICK_MS = 1000

let snapshotEnergy = 100
const listeners = new Set<() => void>()
let intervalId: ReturnType<typeof setInterval> | null = null
let storageBound = false
let subs = 0

function readPersisted() {
  if (typeof window === 'undefined') {
    const t = Date.now()
    return { fatigue: 0, lastTs: t, lastLocalDay: sessionEnergyLocalDayKey(new Date(t)), visibleStreakMs: 0 }
  }
  const raw = localStorage.getItem(SESSION_ENERGY_STORAGE_KEY)
  const p = parseSessionEnergyStorage(raw)
  const now = Date.now()
  if (p) return p
  const day = sessionEnergyLocalDayKey(new Date(now))
  return { fatigue: 0, lastTs: now, lastLocalDay: day, visibleStreakMs: 0 }
}

function writePersisted(p: ReturnType<typeof readPersisted>) {
  try {
    localStorage.setItem(SESSION_ENERGY_STORAGE_KEY, JSON.stringify(p))
  } catch {
    /* private mode / quota */
  }
}

function emit() {
  listeners.forEach((l) => l())
}

function applySnapshotFromPersisted(p: ReturnType<typeof readPersisted>) {
  const next = fatigueToEnergyPercent(p.fatigue)
  if (next !== snapshotEnergy) {
    snapshotEnergy = next
    emit()
  }
}

function bumpFromDomClock() {
  if (typeof document === 'undefined') return
  const now = Date.now()
  const base = readPersisted()
  const visible = document.visibilityState === 'visible'
  const next = applySessionEnergyTick(base, now, visible)
  writePersisted(next)
  applySnapshotFromPersisted(next)
}

function onStorage(e: StorageEvent) {
  if (e.key !== SESSION_ENERGY_STORAGE_KEY || e.newValue == null) return
  const p = parseSessionEnergyStorage(e.newValue)
  if (p) applySnapshotFromPersisted(p)
}

let visibilityBound = false

function ensureEngine() {
  if (typeof window === 'undefined') return
  bumpFromDomClock()
  if (intervalId == null) {
    intervalId = setInterval(bumpFromDomClock, TICK_MS)
  }
  if (!storageBound) {
    window.addEventListener('storage', onStorage)
    storageBound = true
  }
  if (!visibilityBound) {
    document.addEventListener('visibilitychange', bumpFromDomClock)
    visibilityBound = true
  }
}

function stopEngine() {
  if (typeof window === 'undefined') return
  if (visibilityBound) {
    document.removeEventListener('visibilitychange', bumpFromDomClock)
    visibilityBound = false
  }
  if (intervalId != null) {
    clearInterval(intervalId)
    intervalId = null
  }
  if (storageBound) {
    window.removeEventListener('storage', onStorage)
    storageBound = false
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return snapshotEnergy
}

function getServerSnapshot() {
  return 100
}

export function ensureWellbeingSessionClock() {
  ensureEngine()
}

export function useSessionEnergyPercent(): number {
  return useSyncExternalStore(
    (onStoreChange) => {
      subs += 1
      ensureEngine()
      const unsub = subscribe(onStoreChange)
      return () => {
        unsub()
        subs -= 1
        if (subs <= 0) {
          subs = 0
          stopEngine()
        }
      }
    },
    getSnapshot,
    getServerSnapshot,
  )
}
