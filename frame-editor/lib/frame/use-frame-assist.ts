'use client'

import { useCallback, useRef, useState } from 'react'
import type { UIMessage } from 'ai'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
}

type UseFrameAssistInput = {
  canUseAi: boolean
  vaultExportToken: string
}

export function useFrameAssist(input: UseFrameAssistInput) {
  const { canUseAi, vaultExportToken } = input
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const chatMessagesRef = useRef(chatMessages)

  const runAssist = useCallback(
    async (userText: string) => {
      if (!canUseAi || aiBusy) return
      const userMsg = { id: crypto.randomUUID(), role: 'user' as const, text: userText }
      const next = [...chatMessagesRef.current, userMsg]
      setChatMessages(next)
      chatMessagesRef.current = next
      setAiBusy(true)
      setAiError(null)
      try {
        const ui: UIMessage[] = next.map((m) => ({
          id: m.id,
          role: m.role,
          parts: [{ type: 'text', text: m.text }],
        }))
        const res = await fetch('/api/ai-assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ messages: ui, vaultExportToken: vaultExportToken || undefined }),
        })
        const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string }
        if (!res.ok) {
          setAiError(data.error || res.statusText)
          return
        }
        const reply = typeof data.text === 'string' ? data.text : ''
        const withAssistant = [
          ...next,
          { id: crypto.randomUUID(), role: 'assistant' as const, text: reply || '(empty response)' },
        ]
        setChatMessages(withAssistant)
        chatMessagesRef.current = withAssistant
      } catch (error) {
        setAiError(error instanceof Error ? error.message : 'Request failed')
      } finally {
        setAiBusy(false)
      }
    },
    [aiBusy, canUseAi, vaultExportToken],
  )

  const submitChat = useCallback(async () => {
    const text = chatInput.trim()
    if (!text || !canUseAi) return
    await runAssist(text)
    setChatInput('')
  }, [canUseAi, chatInput, runAssist])

  return {
    chatInput,
    setChatInput,
    chatMessages,
    aiBusy,
    aiError,
    runAssist,
    submitChat,
  }
}

