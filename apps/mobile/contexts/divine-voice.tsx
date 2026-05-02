import { createContext, useContext, type ReactNode } from 'react'
import { useDivineVoiceSession, type DivineVoiceSession } from '@/hooks/use-divine-voice-session'

const DivineVoiceContext = createContext<DivineVoiceSession | null>(null)

export function DivineVoiceProvider({ children }: { children: ReactNode }) {
  const session = useDivineVoiceSession()
  return <DivineVoiceContext.Provider value={session}>{children}</DivineVoiceContext.Provider>
}

export function useDivineVoice(): DivineVoiceSession {
  const ctx = useContext(DivineVoiceContext)
  if (!ctx) {
    throw new Error('useDivineVoice must be used within DivineVoiceProvider')
  }
  return ctx
}
