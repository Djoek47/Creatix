'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useDivinePanel, type FocusedFan } from '@/components/divine/divine-panel-context'
import { getOrCreateDivineSessionId } from '@/lib/divine/divine-client-session-id'
import type { DivineUiAction } from '@/lib/divine/divine-ui-actions'
import { formatFanLookupHint } from '@/lib/divine/divine-lookup-meta'
import type { DivineLookupMeta } from '@/lib/divine/divine-lookup-meta'
import type { DivineVoiceDisconnectReason } from '@/lib/divine/voice-memory-types'
import type { DivineVoicePresence } from '@/lib/divine/voice-memory-types'
import type { DivineVoicePersonalityStored, VoiceHangupPolicy } from '@/lib/divine-manager'
import {
  DIVINE_VOICE_SILENCE_PROTOCOL_RAINBOW_LAST_MS,
  DIVINE_VOICE_SILENCE_PROMPT_FINAL,
  DIVINE_VOICE_SILENCE_PROMPT_FIRST,
  buildVoiceSilenceConfig,
  isRealtimeUserSpeechEvent,
  voiceSilenceProtocolTotalMs,
  type VoiceSilenceTimingConfig,
} from '@/lib/divine/voice-silence-prompts'
import { getMicThreshold } from '@/lib/divine/voice-personality'
import { orderRealtimeToolCalls, realtimeWorkingLabel } from '@/lib/divine/realtime-agent-harness'
import {
  buildPostNavigationPrompt,
  buildVoiceStartupPrompt,
  nextVoicePresenceAfterGreeting,
  nextVoicePresenceAfterUserSpeech,
  nextVoicePresenceOnStart,
} from '@/lib/divine/voice-presence'

/** Must stay below `voice-tool` route `maxDuration` so the client fails first with a clear message, not a generic hang. */
const VOICE_TOOL_FETCH_TIMEOUT_MS = 115_000
const VOICE_INPUT_DEVICE_LS_KEY = 'divine_voice_input_device_v1'
const VOICE_OUTPUT_DEVICE_LS_KEY = 'divine_voice_output_device_v1'

function summarizeVoiceToolArgs(args: Record<string, unknown>): string {
  try {
    const s = JSON.stringify(args)
    return s.length > 220 ? `${s.slice(0, 220)}…` : s
  } catch {
    return '(args)'
  }
}

/** Realtime API uses `call_id` on function_call items to pair with function_call_output; `id` is the item id. */
function extractRealtimeFunctionCallId(item: {
  call_id?: string
  id?: string
  name?: string
  arguments?: unknown
}): string | undefined {
  const cid = item.call_id ?? item.id
  return typeof cid === 'string' && cid.length > 0 ? cid : undefined
}

function parseRealtimeToolArgs(raw: unknown): Record<string, unknown> {
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {}
    } catch {
      return {}
    }
  }
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
}

/** When no call_id is available, inject the tool text as a user message so the model still sees the result. */
function injectToolResultFallback(dc: RTCDataChannel, toolName: string, summary: string) {
  const text = `[${toolName} tool result]\n${summary}`.slice(0, 12_000)
  dc.send(
    JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    }),
  )
  dc.send(
    JSON.stringify({
      type: 'response.create',
      response: { modalities: ['audio'] },
    }),
  )
}

/** After `function_call_output` items are added, Realtime does not auto-speak — must request a new response. */
function triggerRealtimeAssistantResponse(dc: RTCDataChannel) {
  dc.send(
    JSON.stringify({
      type: 'response.create',
      response: { modalities: ['audio'] },
    }),
  )
}

type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'error'

/** Purple = tool/model work; gold = assistant speaking; idle = neither. */
export type VoiceSurfaceState = 'idle' | 'working' | 'speaking'

export type DivineVoiceTranscriptTurn = {
  id: string
  text: string
  final: boolean
  at: number
}

export type VoiceSessionContextValue = {
  status: VoiceStatus
  /** Derived from remote audio (speaking) vs in-flight tools (working). */
  voiceSurfaceState: VoiceSurfaceState
  /** Friendly current batch label, e.g. "checking inbox", while voice tools are running. */
  voiceWorkLabel: string | null
  /** True while waiting to hang up after `end_call` (assistant audio + silence gate). */
  closingPending: boolean
  error: string | null
  startVoiceCall: (opts?: {
    realtimePath?: string
    toolPath?: string
    /** Merged into every voice-tool POST (e.g. current photo data URL for photo touch-up). */
    getToolBodyExtras?: () => Record<string, unknown>
    /** Merged into Realtime session POST JSON (e.g. notification secretary mode). */
    realtimeBodyExtras?: Record<string, unknown>
  }) => Promise<void>
  endVoiceCall: () => void
  /**
   * Inject a text "user message" into the live Realtime conversation, then request
   * an assistant response. Used for the Divine Manager briefing buttons.
   */
  sendBriefingQuestion: (text: string, opts?: { allowHangupAfterMs?: number }) => Promise<void>
  remoteVoiceStream: MediaStream | null
  localVoiceStream: MediaStream | null
  voiceVizRef: React.RefObject<HTMLCanvasElement | null>
  userVoiceVizRef: React.RefObject<HTMLCanvasElement | null>
  remoteVoiceLevel: number
  localVoiceLevel: number
  audioInputDevices: MediaDeviceInfo[]
  audioOutputDevices: MediaDeviceInfo[]
  selectedAudioInputId: string
  selectedAudioOutputId: string
  setAudioInputDevice: (deviceId: string) => Promise<void>
  setAudioOutputDevice: (deviceId: string) => Promise<void>
  refreshAudioDevices: () => Promise<void>
  outputDeviceSelectionSupported: boolean
  voiceTranscript: DivineVoiceTranscriptTurn[]
  clearVoiceTranscript: () => void
  focusedFanForVoice: FocusedFan | null
  setFocusedFanForVoice: (fan: FocusedFan | null) => void
  /** From Divine Manager settings; when after_closing_prompt, End is gated until voice_allow_user_hangup runs. */
  voiceHangupPolicy: VoiceHangupPolicy
  /** Model called voice_allow_user_hangup (after asking "anything else?"). */
  userHangupAllowed: boolean
  /** Whether the manual End button should be enabled (not gated). */
  canManualHangup: boolean
  /** End call even when canManualHangup is false (e.g. stuck session). */
  forceEndVoiceCall: () => void
  /** Last ~30s of the staged silence protocol (47s + 60s) — crown shows rainbow. */
  silenceProtocolRainbowActive: boolean
  /** OpenAI Realtime + TTS; paid add-on, Divine trial, paid Stripe `trialing`, or env grant. */
  divineVoicePremium: boolean
  /** Re-read subscription from the server (e.g. after billing) so the launcher updates without a full reload. */
  refreshDivineVoiceEntitlement: () => Promise<void>
}

const VoiceSessionContext = createContext<VoiceSessionContextValue | null>(null)

export function useVoiceSession(): VoiceSessionContextValue | null {
  return useContext(VoiceSessionContext)
}

export function VoiceSessionProvider({
  children,
  divineVoicePremium = false,
}: {
  children: ReactNode
  /** Set from server; when false, voice calls are disabled (Premium add-on + paid plan). */
  divineVoicePremium?: boolean
}) {
  const divinePanel = useDivinePanel()
  /** When non-null, overrides server prop (after client entitlement fetch). Cleared when the prop changes. */
  const [premiumFetched, setPremiumFetched] = useState<boolean | null>(null)
  const divineVoicePremiumLive = premiumFetched !== null ? premiumFetched : divineVoicePremium

  useEffect(() => {
    setPremiumFetched(null)
  }, [divineVoicePremium])

  const refreshDivineVoiceEntitlement = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/divine-voice-entitlement', { credentials: 'include' })
      if (!res.ok) return
      const j = (await res.json().catch(() => ({}))) as { divineVoicePremium?: unknown }
      if (typeof j.divineVoicePremium === 'boolean') {
        setPremiumFetched(j.divineVoicePremium)
      }
    } catch {
      /* best-effort */
    }
  }, [])

  useEffect(() => {
    try {
      const input = window.localStorage.getItem(VOICE_INPUT_DEVICE_LS_KEY)
      const output = window.localStorage.getItem(VOICE_OUTPUT_DEVICE_LS_KEY)
      if (input) setSelectedAudioInputId(input)
      if (output) setSelectedAudioOutputId(output)
    } catch {
      /* ignore */
    }
  }, [])

  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [remoteVoiceStream, setRemoteVoiceStream] = useState<MediaStream | null>(null)
  const [localVoiceStream, setLocalVoiceStream] = useState<MediaStream | null>(null)
  const voiceVizRef = useRef<HTMLCanvasElement | null>(null)
  const userVoiceVizRef = useRef<HTMLCanvasElement | null>(null)
  const [remoteVoiceLevel, setRemoteVoiceLevel] = useState(0)
  const [localVoiceLevel, setLocalVoiceLevel] = useState(0)
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([])
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedAudioInputId, setSelectedAudioInputId] = useState('default')
  const [selectedAudioOutputId, setSelectedAudioOutputId] = useState('default')
  const [voiceTranscript, setVoiceTranscript] = useState<DivineVoiceTranscriptTurn[]>([])
  const outputDeviceSelectionSupported =
    typeof HTMLMediaElement !== 'undefined' &&
    'setSinkId' in HTMLMediaElement.prototype
  const [focusedFanForVoice, setFocusedFanForVoice] = useState<FocusedFan | null>(null)
  const [closingPending, setClosingPending] = useState(false)
  const [voiceHangupPolicy, setVoiceHangupPolicy] = useState<VoiceHangupPolicy>('always')
  const [userHangupAllowed, setUserHangupAllowed] = useState(false)
  const realtimePathRef = useRef('/api/ai/divine-manager-realtime')
  const toolPathRef = useRef('/api/divine/voice-tool')
  const getToolBodyExtrasRef = useRef<() => Record<string, unknown>>(() => ({}))
  const realtimeBodyExtrasRef = useRef<Record<string, unknown>>({})

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const oaiDataChannelRef = useRef<RTCDataChannel | null>(null)
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const endCallTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const endCallRafRef = useRef<number | null>(null)
  /** Shared with the remote waveform analyser for silence detection after `end_call`. */
  const remoteAnalyserRef = useRef<AnalyserNode | null>(null)
  const localAnalyserRef = useRef<AnalyserNode | null>(null)
  const toolInFlightRef = useRef(false)
  /** True while assistant TTS/audio energy is above threshold (pauses idle disconnect). */
  const assistantSpeakingRef = useRef(false)
  const prevRemoteLoudRef = useRef(false)
  const idleMsRef = useRef<number | null>(null)
  /** Silence ladder timing from Divine Manager patience slider (default = legacy 47s/60s). */
  const silenceTimingRef = useRef<VoiceSilenceTimingConfig>(buildVoiceSilenceConfig(50))
  const micEnergyThresholdRef = useRef(getMicThreshold(50))
  const voicePersonalityRef = useRef<DivineVoicePersonalityStored | null>(null)
  const voicePresenceRef = useRef<DivineVoicePresence>({})
  const lastPresenceSpeechPatchRef = useRef(0)
  const lastPendingConfirmationsRef = useRef<
    Array<{ type: string; intent_id: string; summary?: string }>
  >([])
  const scheduleIdleDisconnectRef = useRef<() => void>(() => {})
  const resumeBriefingSentRef = useRef(false)
  const [voiceSurfaceState, setVoiceSurfaceState] = useState<VoiceSurfaceState>('idle')
  const [voiceWorkLabel, setVoiceWorkLabel] = useState<string | null>(null)
  const voiceSurfaceStateRef = useRef<VoiceSurfaceState>('idle')
  const telemetryPendingRef = useRef({ idle: 0, working: 0, speaking: 0 })
  const telemetryTickRef = useRef(0)

  const scheduleGracefulEndCallRef = useRef<(() => void) | null>(null)
  const sendBriefingQuestionRef = useRef<(text: string, opts?: { allowHangupAfterMs?: number }) => Promise<void>>(
    async () => {},
  )
  const statusRef = useRef(status)
  const silenceGenRef = useRef(0)
  const silenceFirstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const silenceSecondTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const silenceFailsafeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Start of current user-silence streak (for crown rainbow in final protocol segment). */
  const silenceWatchdogEpochRef = useRef<number | null>(null)
  const [silenceProtocolTick, setSilenceProtocolTick] = useState(0)
  const speechEventSeenRef = useRef(false)
  const markUserSpeechRef = useRef<() => void>(() => {})
  const startSilenceWatchdogRef = useRef<() => void>(() => {})

  const refreshAudioDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      setAudioInputDevices(devices.filter((device) => device.kind === 'audioinput'))
      setAudioOutputDevices(devices.filter((device) => device.kind === 'audiooutput'))
    } catch {
      /* Permission may not be granted yet; retry after getUserMedia succeeds. */
    }
  }, [])

  useEffect(() => {
    void refreshAudioDevices()
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.addEventListener) return
    const onDeviceChange = () => {
      void refreshAudioDevices()
    }
    navigator.mediaDevices.addEventListener('devicechange', onDeviceChange)
    return () => navigator.mediaDevices.removeEventListener('devicechange', onDeviceChange)
  }, [refreshAudioDevices])

  const setAudioOutputDevice = useCallback(
    async (deviceId: string) => {
      const next = deviceId || 'default'
      setSelectedAudioOutputId(next)
      try {
        window.localStorage.setItem(VOICE_OUTPUT_DEVICE_LS_KEY, next)
      } catch {
        /* ignore */
      }
      const audio = audioRef.current as (HTMLAudioElement & {
        setSinkId?: (sinkId: string) => Promise<void>
      }) | null
      if (!audio?.setSinkId) return
      await audio.setSinkId(next)
    },
    [],
  )

  const setAudioInputDevice = useCallback(
    async (deviceId: string) => {
      const next = deviceId || 'default'
      setSelectedAudioInputId(next)
      try {
        window.localStorage.setItem(VOICE_INPUT_DEVICE_LS_KEY, next)
      } catch {
        /* ignore */
      }
      if (statusRef.current !== 'connected' && statusRef.current !== 'connecting') return
      if (typeof navigator === 'undefined') return
      const nextStream = await navigator.mediaDevices.getUserMedia({
        audio: next === 'default' ? true : { deviceId: { exact: next } },
      })
      const nextTrack = nextStream.getAudioTracks()[0]
      if (!nextTrack) {
        nextStream.getTracks().forEach((track) => track.stop())
        throw new Error('Selected microphone did not provide an audio track.')
      }
      const pc = pcRef.current
      const sender = pc?.getSenders().find((s) => s.track?.kind === 'audio')
      if (sender) {
        await sender.replaceTrack(nextTrack)
      }
      const previous = streamRef.current
      previous?.getTracks().forEach((track) => track.stop())
      streamRef.current = nextStream
      setLocalVoiceStream(nextStream)
      await refreshAudioDevices()
    },
    [refreshAudioDevices],
  )

  const clearVoiceTranscript = useCallback(() => {
    setVoiceTranscript([])
  }, [])

  const patchVoicePresence = useCallback((presence: DivineVoicePresence) => {
    voicePresenceRef.current = {
      ...voicePresenceRef.current,
      ...presence,
    }
    void fetch('/api/divine/voice-memory', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voice_presence: voicePresenceRef.current }),
    }).catch(() => undefined)
  }, [])

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    voiceSurfaceStateRef.current = voiceSurfaceState
  }, [voiceSurfaceState])

  useEffect(() => {
    const raw = process.env.NEXT_PUBLIC_DIVINE_VOICE_IDLE_MS
    if (raw === undefined || raw === '') {
      idleMsRef.current = null
      return
    }
    const n = parseInt(raw, 10)
    idleMsRef.current = Number.isNaN(n) || n <= 0 ? null : n
  }, [])

  const playCue = useCallback((kind: 'done' | 'error') => {
    if (typeof window === 'undefined') return
    try {
      const AnyWindow = window as unknown as {
        AudioContext?: typeof AudioContext
        webkitAudioContext?: typeof AudioContext
      }
      const AudioCtx = AnyWindow.AudioContext || AnyWindow.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const isError = kind === 'error'
      osc.type = 'sine'
      osc.frequency.value = isError ? 440 : 880
      gain.gain.value = 0.05
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.15)
      osc.onended = () => {
        gain.disconnect()
        ctx.close().catch(() => undefined)
      }
    } catch {
      // ignore audio failures
    }
  }, [])

  const cancelIdleTimer = useCallback(() => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current)
      idleTimeoutRef.current = null
    }
  }, [])

  const endVoiceCall = useCallback(
    (reason: DivineVoiceDisconnectReason = 'user_hangup') => {
      const hadToolInFlight = toolInFlightRef.current
      const pendingSnap = [...lastPendingConfirmationsRef.current]
      cancelIdleTimer()
      silenceGenRef.current += 1
      if (silenceFirstTimerRef.current) {
        clearTimeout(silenceFirstTimerRef.current)
        silenceFirstTimerRef.current = null
      }
      if (silenceSecondTimerRef.current) {
        clearTimeout(silenceSecondTimerRef.current)
        silenceSecondTimerRef.current = null
      }
      if (silenceFailsafeTimerRef.current) {
        clearTimeout(silenceFailsafeTimerRef.current)
        silenceFailsafeTimerRef.current = null
      }
      scheduleGracefulEndCallRef.current = null
      speechEventSeenRef.current = false
      if (endCallTimeoutRef.current) {
        clearTimeout(endCallTimeoutRef.current)
        endCallTimeoutRef.current = null
      }
      if (endCallRafRef.current != null) {
        cancelAnimationFrame(endCallRafRef.current)
        endCallRafRef.current = null
      }
      setClosingPending(false)
      toolInFlightRef.current = false
      lastPendingConfirmationsRef.current = []
      setVoiceWorkLabel(null)
      setVoiceSurfaceState('idle')
      assistantSpeakingRef.current = false
      prevRemoteLoudRef.current = false
      const pc = pcRef.current
      if (pc) {
        pc.close()
        pcRef.current = null
      }
      const stream = streamRef.current
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      audioRef.current = null
      setRemoteVoiceStream(null)
      setLocalVoiceStream(null)
      setRemoteVoiceLevel(0)
      setLocalVoiceLevel(0)
      oaiDataChannelRef.current = null
      setStatus('idle')
      setError(null)
      setUserHangupAllowed(false)
      getToolBodyExtrasRef.current = () => ({})
      realtimeBodyExtrasRef.current = {}

      void fetch('/api/divine/voice-memory', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          reason === 'end_call'
            ? { clear: true }
            : {
                disconnect_reason: reason,
                status:
                  hadToolInFlight || pendingSnap.length > 0
                    ? 'in_progress'
                    : 'completed',
                resume_hint:
                  hadToolInFlight || pendingSnap.length > 0
                    ? `Session ended (${reason}). ${pendingSnap.length ? 'Confirmation pending in app.' : 'Task may have been incomplete.'}`
                    : null,
              },
        ),
      }).catch(() => undefined)
    },
    [cancelIdleTimer],
  )

  const scheduleIdleDisconnect = useCallback(() => {
    const ms = idleMsRef.current
    if (ms == null || ms <= 0) return
    cancelIdleTimer()
    if (toolInFlightRef.current || assistantSpeakingRef.current) return
    idleTimeoutRef.current = setTimeout(() => {
      idleTimeoutRef.current = null
      endVoiceCall('idle_timeout')
    }, ms)
  }, [cancelIdleTimer, endVoiceCall])

  useEffect(() => {
    scheduleIdleDisconnectRef.current = scheduleIdleDisconnect
  }, [scheduleIdleDisconnect])

  const cancelIdleTimerRef = useRef<() => void>(() => {})
  useEffect(() => {
    cancelIdleTimerRef.current = cancelIdleTimer
  }, [cancelIdleTimer])

  const sendBriefingQuestion = useCallback(async (text: string, opts?: { allowHangupAfterMs?: number }) => {
    const dc = oaiDataChannelRef.current
    if (!dc) {
      throw new Error('Voice session is not connected')
    }

    // Inject a user text message into the conversation and ask the model to respond.
    // The session already has the correct instructions/tools configured server-side.
    dc.send(
      JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text }],
        },
      }),
    )

    dc.send(
      JSON.stringify({
        type: 'response.create',
        response: { modalities: ['audio'] },
      }),
    )
    scheduleIdleDisconnectRef.current()

    const ms = opts?.allowHangupAfterMs
    if (typeof ms === 'number' && ms > 0) {
      window.setTimeout(() => setUserHangupAllowed(true), ms)
    }
  }, [])

  useEffect(() => {
    sendBriefingQuestionRef.current = sendBriefingQuestion
  }, [sendBriefingQuestion])

  const runFinalSilenceClose = useCallback(async (genAtStart: number) => {
    if (silenceGenRef.current !== genAtStart) return
    try {
      await sendBriefingQuestionRef.current(DIVINE_VOICE_SILENCE_PROMPT_FINAL)
    } catch {
      return
    }
    if (silenceGenRef.current !== genAtStart) return
    silenceFailsafeTimerRef.current = setTimeout(() => {
      silenceFailsafeTimerRef.current = null
      if (silenceGenRef.current !== genAtStart) return
      scheduleGracefulEndCallRef.current?.()
    }, silenceTimingRef.current.endCallFailsafe)
  }, [])

  const startSilenceWatchdog = useCallback(() => {
    if (silenceFirstTimerRef.current) clearTimeout(silenceFirstTimerRef.current)
    if (silenceSecondTimerRef.current) clearTimeout(silenceSecondTimerRef.current)
    if (silenceFailsafeTimerRef.current) clearTimeout(silenceFailsafeTimerRef.current)
    silenceFirstTimerRef.current = null
    silenceSecondTimerRef.current = null
    silenceFailsafeTimerRef.current = null

    const cfg = silenceTimingRef.current
    const gen = silenceGenRef.current
    silenceWatchdogEpochRef.current = Date.now()
    silenceFirstTimerRef.current = setTimeout(() => {
      silenceFirstTimerRef.current = null
      if (silenceGenRef.current !== gen) return
      if (statusRef.current !== 'connected') return
      void (async () => {
        try {
          await sendBriefingQuestionRef.current(DIVINE_VOICE_SILENCE_PROMPT_FIRST)
        } catch {
          return
        }
        if (silenceGenRef.current !== gen) return
        silenceSecondTimerRef.current = setTimeout(() => {
          silenceSecondTimerRef.current = null
          if (silenceGenRef.current !== gen) return
          if (statusRef.current !== 'connected') return
          void runFinalSilenceClose(gen)
        }, cfg.afterFirst)
      })()
    }, cfg.first)
  }, [runFinalSilenceClose])

  const markUserSpeech = useCallback(() => {
    silenceGenRef.current += 1
    if (silenceFirstTimerRef.current) clearTimeout(silenceFirstTimerRef.current)
    if (silenceSecondTimerRef.current) clearTimeout(silenceSecondTimerRef.current)
    if (silenceFailsafeTimerRef.current) clearTimeout(silenceFailsafeTimerRef.current)
    silenceFirstTimerRef.current = null
    silenceSecondTimerRef.current = null
    silenceFailsafeTimerRef.current = null
    scheduleIdleDisconnectRef.current()
    startSilenceWatchdog()
    const now = Date.now()
    if (now - lastPresenceSpeechPatchRef.current > 10_000) {
      lastPresenceSpeechPatchRef.current = now
      patchVoicePresence(nextVoicePresenceAfterUserSpeech(voicePresenceRef.current, new Date(now)))
    }
  }, [patchVoicePresence, startSilenceWatchdog])

  useEffect(() => {
    markUserSpeechRef.current = markUserSpeech
  }, [markUserSpeech])

  useEffect(() => {
    startSilenceWatchdogRef.current = startSilenceWatchdog
  }, [startSilenceWatchdog])

  const refreshVoiceManagerClientSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/divine/manager-settings', { credentials: 'include' })
      const json = (await res.json().catch(() => ({}))) as {
        voice_hangup_policy?: VoiceHangupPolicy
        voice_personality?: DivineVoicePersonalityStored
      }
      if (json.voice_hangup_policy === 'after_closing_prompt') {
        setVoiceHangupPolicy('after_closing_prompt')
      } else {
        setVoiceHangupPolicy('always')
      }
      if (json.voice_personality && typeof json.voice_personality === 'object') {
        const vp = json.voice_personality
        voicePersonalityRef.current = vp
        silenceTimingRef.current = buildVoiceSilenceConfig(
          typeof vp.silence_patience === 'number' ? vp.silence_patience : 50,
        )
        micEnergyThresholdRef.current = getMicThreshold(
          typeof vp.mic_pickup === 'number' ? vp.mic_pickup : 50,
        )
      } else {
        voicePersonalityRef.current = null
        silenceTimingRef.current = buildVoiceSilenceConfig(50)
        micEnergyThresholdRef.current = getMicThreshold(50)
      }
    } catch {
      voicePersonalityRef.current = null
      setVoiceHangupPolicy('always')
      silenceTimingRef.current = buildVoiceSilenceConfig(50)
      micEnergyThresholdRef.current = getMicThreshold(50)
    }
  }, [])

  useEffect(() => {
    void refreshVoiceManagerClientSettings()
  }, [refreshVoiceManagerClientSettings])

  const startVoiceCall = useCallback(async (opts?: {
    realtimePath?: string
    toolPath?: string
    getToolBodyExtras?: () => Record<string, unknown>
    /** Merged into POST /api/ai/divine-manager-realtime JSON (e.g. notification secretary mode). */
    realtimeBodyExtras?: Record<string, unknown>
  }) => {
    if (status === 'connecting' || status === 'connected') return
    if (!divineVoicePremiumLive) {
      setError('Divine voice is Premium — realtime audio, tools, and dashboard handoff.')
      setStatus('idle')
      return
    }
    realtimePathRef.current = opts?.realtimePath || '/api/ai/divine-manager-realtime'
    toolPathRef.current = opts?.toolPath || '/api/divine/voice-tool'
    getToolBodyExtrasRef.current = typeof opts?.getToolBodyExtras === 'function' ? opts.getToolBodyExtras : () => ({})
    realtimeBodyExtrasRef.current =
      opts?.realtimeBodyExtras && typeof opts.realtimeBodyExtras === 'object' ? opts.realtimeBodyExtras : {}
    setError(null)
    setVoiceWorkLabel(null)
    setVoiceTranscript([])
    setUserHangupAllowed(false)
    speechEventSeenRef.current = false
    await refreshVoiceManagerClientSettings()
    setStatus('connecting')
    try {
      if (typeof navigator === 'undefined') {
        throw new Error('Navigator not available')
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedAudioInputId === 'default' ? true : { deviceId: { exact: selectedAudioInputId } },
      })
      streamRef.current = stream
      setLocalVoiceStream(stream)
      await refreshAudioDevices()
      const pc = new RTCPeerConnection()
      pcRef.current = pc

      const audioEl = document.createElement('audio')
      audioEl.autoplay = true
      audioEl.setAttribute('playsinline', 'true')
      if (selectedAudioOutputId !== 'default' && 'setSinkId' in audioEl) {
        await (audioEl as HTMLAudioElement & { setSinkId: (sinkId: string) => Promise<void> }).setSinkId(
          selectedAudioOutputId,
        )
      }
      audioRef.current = audioEl
      pc.ontrack = (e) => {
        if (e.streams[0]) {
          audioEl.srcObject = e.streams[0]
          setRemoteVoiceStream(e.streams[0])
        }
      }

      stream.getTracks().forEach((track) => pc.addTrack(track, stream))
      const dc = pc.createDataChannel('oai-events')
      oaiDataChannelRef.current = dc

      /** After `end_call`, wait for assistant audio to finish (min delay + remote silence). */
      const scheduleGracefulEndCall = () => {
        if (endCallTimeoutRef.current) {
          clearTimeout(endCallTimeoutRef.current)
          endCallTimeoutRef.current = null
        }
        if (endCallRafRef.current != null) {
          cancelAnimationFrame(endCallRafRef.current)
          endCallRafRef.current = null
        }
        setClosingPending(true)

        const start = Date.now()
        let lastLoudAt = Date.now()
        const minMs = 1600
        const silenceMs = 550
        const maxMs = 14000
        const loudThreshold = 10

        const runTick = () => {
          const elapsed = Date.now() - start
          const analyser = remoteAnalyserRef.current
          if (analyser) {
            const buf = new Uint8Array(analyser.frequencyBinCount)
            analyser.getByteFrequencyData(buf)
            let sum = 0
            for (let i = 0; i < buf.length; i++) sum += buf[i]
            const avg = sum / buf.length
            if (avg > loudThreshold) {
              lastLoudAt = Date.now()
            }
          }

          const minDone = elapsed >= minMs
          const quietAfterSpeech = Date.now() - lastLoudAt >= silenceMs
          if ((minDone && quietAfterSpeech) || elapsed >= maxMs) {
            setClosingPending(false)
            endVoiceCall('end_call')
            endCallRafRef.current = null
            return
          }
          endCallRafRef.current = requestAnimationFrame(runTick)
        }

        if (!remoteAnalyserRef.current) {
          endCallTimeoutRef.current = setTimeout(() => {
            endCallTimeoutRef.current = null
            setClosingPending(false)
            endVoiceCall('end_call')
          }, 2500)
          return
        }

        endCallTimeoutRef.current = setTimeout(() => {
          endCallTimeoutRef.current = null
          endCallRafRef.current = requestAnimationFrame(runTick)
        }, 50)
      }

      scheduleGracefulEndCallRef.current = scheduleGracefulEndCall

      dc.onmessage = async (event) => {
        try {
          const payload = JSON.parse(event.data as string) as {
            type?: string
            item_id?: string
            delta?: string
            transcript?: string
            tool_calls?: Array<{
              id?: string
              call_id?: string
              name?: string
              arguments?: string
            }>
            response?: {
              output?: Array<{ id?: string; type?: string; name?: string; arguments?: string }>
            }
          }

          if (isRealtimeUserSpeechEvent(payload)) {
            speechEventSeenRef.current = true
            markUserSpeechRef.current()
          }

          if (
            payload.type === 'conversation.item.input_audio_transcription.delta' &&
            typeof payload.item_id === 'string' &&
            typeof payload.delta === 'string'
          ) {
            const delta = payload.delta
            setVoiceTranscript((turns) => {
              const idx = turns.findIndex((turn) => turn.id === payload.item_id)
              if (idx === -1) {
                return [
                  ...turns.slice(-5),
                  { id: payload.item_id!, text: delta, final: false, at: Date.now() },
                ]
              }
              const next = [...turns]
              next[idx] = {
                ...next[idx],
                text: `${next[idx].text}${delta}`,
                final: false,
                at: Date.now(),
              }
              return next.slice(-6)
            })
          }

          if (
            payload.type === 'conversation.item.input_audio_transcription.completed' &&
            typeof payload.item_id === 'string' &&
            typeof payload.transcript === 'string'
          ) {
            const transcript = payload.transcript.trim()
            if (transcript) {
              setVoiceTranscript((turns) => {
                const idx = turns.findIndex((turn) => turn.id === payload.item_id)
                if (idx === -1) {
                  return [
                    ...turns.slice(-5),
                    { id: payload.item_id!, text: transcript, final: true, at: Date.now() },
                  ]
                }
                const next = [...turns]
                next[idx] = {
                  ...next[idx],
                  text: transcript,
                  final: true,
                  at: Date.now(),
                }
                return next.slice(-6)
              })
            }
          }

          /**
           * Shared path: cue + Realtime function_call_output so the model receives tool results.
           * Returns whether the caller should run `triggerRealtimeAssistantResponse` after the batch:
           * `paired` = sent function_call_output (needs response.create); `fallback` = already sent response.create inside inject.
           */
          const finalizeRealtimeToolOutput = (
            callId: string | undefined,
            summary: string | null,
            toolName?: string,
          ): 'paired' | 'fallback' | 'none' => {
            if (summary == null || summary === '') return 'none'
            const lowerSummary = summary.toLowerCase()
            const isErrorSummary =
              lowerSummary.startsWith('error ') ||
              lowerSummary.startsWith('failed ') ||
              lowerSummary.includes('failed to ')
            playCue(isErrorSummary ? 'error' : 'done')
            if (callId) {
              dc.send(
                JSON.stringify({
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: callId,
                    output: summary,
                  },
                }),
              )
              return 'paired'
            }
            if (toolName) {
              // OpenAI Realtime must pair output to call_id; if the event shape omitted it, still deliver text.
              injectToolResultFallback(dc, toolName, summary)
              return 'fallback'
            }
            return 'none'
          }

          const runTool = async (
            name: string,
            args: Record<string, unknown>,
          ): Promise<string | null> => {
            if (!name) return null
            if (name === 'end_call') {
              scheduleGracefulEndCall()
              return 'Call ended.'
            }
            toolInFlightRef.current = true
            const abort = new AbortController()
            const abortTimer = setTimeout(() => abort.abort(), VOICE_TOOL_FETCH_TIMEOUT_MS)
            try {
              const toolExtras = (() => {
                try {
                  return getToolBodyExtrasRef.current()
                } catch {
                  return {}
                }
              })()
              const res = await fetch(toolPathRef.current, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name, arguments: args, ...toolExtras }),
                signal: abort.signal,
              })
              const data = (await res.json().catch(() => ({}))) as {
                error?: string
                content?: string
                photo_touchup?: {
                  imageBase64: string
                  operation: string
                  explanation?: string
                  creditsUsed?: number
                }
                ui_actions?: { type: string; path?: string; fanId?: string }[]
                pending_confirmations?: { type: string; intent_id: string; summary?: string }[]
                /** voice-tool returns a single meta object; some clients use an array */
                lookup_meta?: DivineLookupMeta | DivineLookupMeta[]
              }
              if (!res.ok) {
                const detail = data.error?.trim() || `HTTP ${res.status}`
                return `Error: Tool failed (${detail}). Say this to the creator and suggest Divine text chat if it keeps happening.`
              }
              if (
                data.photo_touchup &&
                typeof data.photo_touchup === 'object' &&
                typeof data.photo_touchup.imageBase64 === 'string' &&
                typeof window !== 'undefined'
              ) {
                window.dispatchEvent(
                  new CustomEvent('creatix-photo-touchup-voice', { detail: data.photo_touchup }),
                )
              }
              if (Array.isArray(data.ui_actions) && data.ui_actions.length) {
                const raw = data.ui_actions as DivineUiAction[]
                for (const a of raw) {
                  if (a.type === 'voice_set_hangup' && 'allowed' in a && a.allowed) {
                    setUserHangupAllowed(true)
                  }
                }
                const rest = raw.filter((a) => a.type !== 'voice_set_hangup')
                if (rest.length) {
                  divinePanel?.applyUiActionsFromTools?.(rest)
                }
              }
              const rawLm = data.lookup_meta
              const firstLm = Array.isArray(rawLm) ? rawLm[0] : rawLm
              if (firstLm && typeof firstLm === 'object') {
                const hint = formatFanLookupHint(firstLm)
                if (hint) divinePanel?.setFanLookupHint?.(hint)
              }
              let out = typeof data.content === 'string' ? data.content.trim() : ''
              if (Array.isArray(data.pending_confirmations) && data.pending_confirmations.length) {
                lastPendingConfirmationsRef.current = data.pending_confirmations
                const note = data.pending_confirmations
                  .map((p) => `${p.type}${p.summary ? `: ${p.summary}` : ''}`)
                  .join('; ')
                out = out ? `${out}\n\n(Confirmation required in app: ${note})` : `Confirmation required in app: ${note}`
              } else {
                lastPendingConfirmationsRef.current = []
              }
              void fetch('/api/divine/voice-memory', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: {
                    tool: name,
                    summary: `${name}: ${summarizeVoiceToolArgs(args)}`,
                  },
                  status: 'in_progress' as const,
                  pending_confirmations:
                    data.pending_confirmations && data.pending_confirmations.length > 0
                      ? data.pending_confirmations
                      : undefined,
                }),
              }).catch(() => undefined)
              if (!out) {
                return `Error: Tool returned no text (empty response). Tell the creator the server may have timed out or Divine Manager blocked the action; suggest trying Divine text chat.`
              }
              return out
            } catch (e) {
              const aborted =
                (typeof DOMException !== 'undefined' && e instanceof DOMException && e.name === 'AbortError') ||
                (e instanceof Error && e.name === 'AbortError')
              if (aborted) {
                return `Error: Tool timed out after ${Math.round(VOICE_TOOL_FETCH_TIMEOUT_MS / 1000)}s (OnlyFans or AI was too slow). Tell the creator to try again or use Divine text chat.`
              }
              const msg = e instanceof Error ? e.message : 'network error'
              return `Error: Tool request failed (${msg}). Tell the creator and suggest Divine text chat if it persists.`
            } finally {
              clearTimeout(abortTimer)
              toolInFlightRef.current = false
              scheduleIdleDisconnectRef.current()
            }
          }
          const toolCalls =
            payload?.tool_calls ??
            (payload as { tool_calls?: Array<{ name?: string; arguments?: string }> })?.tool_calls
          const runToolBatch = async (
            calls: Array<{ id?: string; call_id?: string; name?: string; arguments?: unknown }>,
          ) => {
            const ordered = orderRealtimeToolCalls(calls)
            let needAssistantResponse = false

            const runOne = async (tc: { id?: string; call_id?: string; name?: string; arguments?: unknown }) => {
              if (!tc.name) return 'fallback' as const
              const summary = await runTool(tc.name, parseRealtimeToolArgs(tc.arguments))
              return finalizeRealtimeToolOutput(extractRealtimeFunctionCallId(tc), summary, tc.name)
            }

            if (ordered.parallel.length > 0) {
              setVoiceWorkLabel(realtimeWorkingLabel(ordered.parallel.map((tc) => tc.name ?? '')))
              const results = await Promise.all(ordered.parallel.map(runOne))
              if (results.some((r) => r === 'paired')) needAssistantResponse = true
            }

            for (const tc of ordered.serial) {
              setVoiceWorkLabel(realtimeWorkingLabel(tc.name ? [tc.name] : []))
              if ((await runOne(tc)) === 'paired') needAssistantResponse = true
            }

            for (const tc of ordered.endCall) {
              setVoiceWorkLabel(realtimeWorkingLabel(tc.name ? [tc.name] : []))
              if ((await runOne(tc)) === 'paired') needAssistantResponse = true
            }

            setVoiceWorkLabel(null)
            return needAssistantResponse
          }
          if (Array.isArray(toolCalls) && toolCalls.length > 0) {
            const needAssistantResponse = await runToolBatch(
              toolCalls as Array<{ id?: string; call_id?: string; name?: string; arguments?: unknown }>,
            )
            if (needAssistantResponse) {
              triggerRealtimeAssistantResponse(dc)
              scheduleIdleDisconnectRef.current()
            }
            return
          }
          if (payload?.type === 'response.done' && Array.isArray(payload.response?.output)) {
            // Batch safe reads in parallel, then run state-changing or confirmation-gated calls serially.
            const fnItems = payload.response.output.filter(
              (item) => item?.type === 'function_call' && item.name,
            ) as Array<{ id?: string; call_id?: string; name: string; arguments?: unknown }>

            if (await runToolBatch(fnItems)) {
              triggerRealtimeAssistantResponse(dc)
              scheduleIdleDisconnectRef.current()
            }
          }
        } catch {
          // ignore non-JSON or unexpected format
        }
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const res = await fetch(realtimePathRef.current, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sdp: offer.sdp ?? '',
          focusedFan: focusedFanForVoice,
          divine_session_id: getOrCreateDivineSessionId(),
          ...realtimeBodyExtrasRef.current,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || `Session failed ${res.status}`)
      }
      const answerSdp = await res.text()
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerSdp }))
      setStatus('connected')
      resumeBriefingSentRef.current = false
      scheduleIdleDisconnectRef.current()
      void (async () => {
        try {
          const memRes = await fetch('/api/divine/voice-memory', { credentials: 'include' })
          const memJson = (await memRes.json().catch(() => ({}))) as {
            memory?: {
              status?: string
              resume_hint?: string
              action_log?: Array<{ tool: string }>
              voice_presence?: DivineVoicePresence
            }
          }
          const m = memJson.memory
          const presenceOnStart = nextVoicePresenceOnStart(m?.voice_presence ?? voicePresenceRef.current)
          patchVoicePresence(presenceOnStart)
          const hasResumeContext =
            m?.resume_hint ||
            (Array.isArray(m?.action_log) && m.action_log.length > 0)
          if (m?.status === 'in_progress' && hasResumeContext && !resumeBriefingSentRef.current) {
            resumeBriefingSentRef.current = true
            await sendBriefingQuestion(
              `The last voice session ended before everything finished. Resume hint: ${m.resume_hint}. Ask briefly if they want to continue that or start fresh; if they decline, move on.`,
              { allowHangupAfterMs: 10_000 },
            )
            patchVoicePresence(nextVoicePresenceAfterGreeting(voicePresenceRef.current))
            return
          }
          const initiative = voicePersonalityRef.current?.initiative ?? 'manager_led'
          const startup = buildVoiceStartupPrompt(voicePresenceRef.current, initiative)
          if (startup.shouldSpeak && startup.prompt && !resumeBriefingSentRef.current) {
            resumeBriefingSentRef.current = true
            await sendBriefingQuestion(startup.prompt, { allowHangupAfterMs: 10_000 })
            patchVoicePresence(nextVoicePresenceAfterGreeting(voicePresenceRef.current))
          }
        } catch {
          // ignore resume prompt failures
        }
      })()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start voice call'
      endVoiceCall('error')
      setError(msg)
      setStatus('error')
      playCue('error')
    }
  }, [
    endVoiceCall,
    playCue,
    status,
    divinePanel,
    sendBriefingQuestion,
    refreshVoiceManagerClientSettings,
    divineVoicePremiumLive,
    selectedAudioInputId,
    selectedAudioOutputId,
    refreshAudioDevices,
    patchVoicePresence,
  ])

  /** Arm optional idle disconnect + staged silence watchdog when connected. */
  useEffect(() => {
    if (status !== 'connected') return
    scheduleIdleDisconnectRef.current()
    startSilenceWatchdogRef.current()
  }, [status, scheduleIdleDisconnect])

  useEffect(() => {
    if (status !== 'connected') {
      silenceWatchdogEpochRef.current = null
    }
  }, [status])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onGuideFocus = (event: Event) => {
      const detail = (event as CustomEvent<{ elementId?: string | null; label?: string | null }>).detail
      const elementId = typeof detail?.elementId === 'string' ? detail.elementId.trim() : ''
      if (!elementId || !/^[a-z0-9_-]{1,80}$/i.test(elementId)) return
      window.setTimeout(() => {
        const el = document.getElementById(elementId)
        if (!el) return
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        const previousOutline = el.style.outline
        const previousOutlineOffset = el.style.outlineOffset
        const previousBoxShadow = el.style.boxShadow
        el.style.outline = '2px solid rgba(168, 85, 247, 0.82)'
        el.style.outlineOffset = '6px'
        el.style.boxShadow = '0 0 0 10px rgba(168, 85, 247, 0.10)'
        window.setTimeout(() => {
          el.style.outline = previousOutline
          el.style.outlineOffset = previousOutlineOffset
          el.style.boxShadow = previousBoxShadow
        }, 4200)
      }, 450)
    }

    const onGuidedNavigation = (event: Event) => {
      if (statusRef.current !== 'connected') return
      if (voicePersonalityRef.current?.initiative !== 'manager_led') return
      const detail = (event as CustomEvent<{ path?: string | null }>).detail
      const path = typeof detail?.path === 'string' ? detail.path : '/dashboard'
      window.setTimeout(() => {
        void sendBriefingQuestionRef.current(buildPostNavigationPrompt(path), { allowHangupAfterMs: 10_000 }).then(() => {
          patchVoicePresence(nextVoicePresenceAfterGreeting(voicePresenceRef.current))
        })
      }, 900)
    }

    window.addEventListener('creatix:divine-guide-focus', onGuideFocus)
    window.addEventListener('creatix:divine-guided-navigation', onGuidedNavigation)
    return () => {
      window.removeEventListener('creatix:divine-guide-focus', onGuideFocus)
      window.removeEventListener('creatix:divine-guided-navigation', onGuidedNavigation)
    }
  }, [patchVoicePresence])

  useEffect(() => {
    if (status !== 'connected') return
    const id = setInterval(() => setSilenceProtocolTick((n) => n + 1), 250)
    return () => clearInterval(id)
  }, [status])

  /**
   * If Realtime never emits speech VAD events, fall back to louder mic energy (steady TV noise
   * often stays below threshold). Does not run once server speech events were seen.
   */
  useEffect(() => {
    if (status !== 'connected') return
    const id = setInterval(() => {
      if (speechEventSeenRef.current) return
      const a = localAnalyserRef.current
      if (!a) return
      const buf = new Uint8Array(a.frequencyBinCount)
      a.getByteFrequencyData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) sum += buf[i]
      if (sum / buf.length > micEnergyThresholdRef.current) {
        markUserSpeechRef.current()
      }
    }, 220)
    return () => clearInterval(id)
  }, [status])

  /** Purple (working) vs gold (speaking) vs idle. */
  useEffect(() => {
    if (status !== 'connected') {
      setVoiceSurfaceState('idle')
      return
    }
    const id = setInterval(() => {
      const remote = remoteAnalyserRef.current
      let remoteLoud = false
      if (remote) {
        const buf = new Uint8Array(remote.frequencyBinCount)
        remote.getByteFrequencyData(buf)
        let sum = 0
        for (let i = 0; i < buf.length; i++) sum += buf[i]
        remoteLoud = sum / buf.length > 9
      }
      assistantSpeakingRef.current = remoteLoud
      const prev = prevRemoteLoudRef.current
      prevRemoteLoudRef.current = remoteLoud
      if (!prev && remoteLoud) {
        cancelIdleTimerRef.current()
      }
      if (prev && !remoteLoud) {
        scheduleIdleDisconnectRef.current()
      }
      if (remoteLoud) setVoiceSurfaceState('speaking')
      else if (toolInFlightRef.current) setVoiceSurfaceState('working')
      else setVoiceSurfaceState('idle')
    }, 140)
    return () => clearInterval(id)
  }, [status])

  /** Accumulate WebRTC time per voice surface state; POST to /api/divine/voice-telemetry every 10s. */
  useEffect(() => {
    if (status !== 'connected') return

    const flush = async () => {
      const p = telemetryPendingRef.current
      const idle = p.idle
      const working = p.working
      const speaking = p.speaking
      if (idle + working + speaking < 1) return
      telemetryPendingRef.current = { idle: 0, working: 0, speaking: 0 }
      try {
        const telemetry_flush_id =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`
        await fetch('/api/divine/voice-telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            idle_ms: Math.round(idle),
            working_ms: Math.round(working),
            speaking_ms: Math.round(speaking),
            telemetry_flush_id,
          }),
        })
      } catch {
        // ignore network errors
      }
    }

    telemetryTickRef.current = Date.now()
    const acc = setInterval(() => {
      const now = Date.now()
      const d = now - telemetryTickRef.current
      telemetryTickRef.current = now
      const surf = voiceSurfaceStateRef.current
      if (surf === 'idle') telemetryPendingRef.current.idle += d
      else if (surf === 'working') telemetryPendingRef.current.working += d
      else if (surf === 'speaking') telemetryPendingRef.current.speaking += d
    }, 1000)
    const post = setInterval(() => {
      void flush()
    }, 10_000)

    return () => {
      clearInterval(acc)
      clearInterval(post)
      void flush()
    }
  }, [status])

  useEffect(() => {
    return () => {
      endVoiceCall('user_hangup')
    }
  }, [endVoiceCall])

  // Divine (remote) waveform: react to sound with lower smoothing so it fluctuates visibly
  useEffect(() => {
    if (!remoteVoiceStream) return
    const canvas = voiceVizRef.current
    const ctx = canvas?.getContext('2d') ?? null
    try {
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(remoteVoiceStream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 128
      analyser.smoothingTimeConstant = 0.35
      remoteAnalyserRef.current = analyser
      source.connect(analyser)
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      let rafId: number
      const draw = () => {
        rafId = requestAnimationFrame(draw)
        analyser.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
        setRemoteVoiceLevel(Math.min(1, (sum / dataArray.length) / 96))
        if (!canvas || !ctx) return
        const w = canvas.width
        const h = canvas.height
        ctx.clearRect(0, 0, w, h)
        const barCount = 24
        const barW = w / barCount
        const gap = 2
        for (let i = 0; i < barCount; i++) {
          const v = dataArray[Math.floor((i / barCount) * dataArray.length)] ?? 0
          const barH = Math.max(6, (v / 255) * h * 0.85)
          const x = i * barW + gap / 2
          const y = (h - barH) / 2
          ctx.fillStyle = `rgba(168, 85, 247, ${0.5 + (v / 255) * 0.5})`
          ctx.beginPath()
          if (typeof (ctx as unknown as { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect === 'function') {
            (ctx as unknown as { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(x, y, barW - gap, barH, 4)
            ctx.fill()
          } else {
            ctx.fillRect(x, y, barW - gap, barH)
          }
        }
      }
      draw()
      return () => {
        cancelAnimationFrame(rafId)
        remoteAnalyserRef.current = null
        setRemoteVoiceLevel(0)
        audioContext.close().catch(() => undefined)
      }
    } catch {
      return undefined
    }
  }, [remoteVoiceStream])

  // User (local mic) waveform: same style, amber color, fluctuates with your voice
  useEffect(() => {
    if (!localVoiceStream) return
    const canvas = userVoiceVizRef.current
    const ctx = canvas?.getContext('2d') ?? null
    try {
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(localVoiceStream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 128
      analyser.smoothingTimeConstant = 0.35
      source.connect(analyser)
      localAnalyserRef.current = analyser
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      let rafId: number
      const draw = () => {
        rafId = requestAnimationFrame(draw)
        analyser.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
        setLocalVoiceLevel(Math.min(1, (sum / dataArray.length) / 90))
        if (!canvas || !ctx) return
        const w = canvas.width
        const h = canvas.height
        ctx.clearRect(0, 0, w, h)
        const barCount = 24
        const barW = w / barCount
        const gap = 2
        for (let i = 0; i < barCount; i++) {
          const v = dataArray[Math.floor((i / barCount) * dataArray.length)] ?? 0
          const barH = Math.max(6, (v / 255) * h * 0.85)
          const x = i * barW + gap / 2
          const y = (h - barH) / 2
          ctx.fillStyle = `rgba(245, 158, 11, ${0.5 + (v / 255) * 0.5})`
          ctx.beginPath()
          if (typeof (ctx as unknown as { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect === 'function') {
            (ctx as unknown as { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(x, y, barW - gap, barH, 4)
            ctx.fill()
          } else {
            ctx.fillRect(x, y, barW - gap, barH)
          }
        }
      }
      draw()
      return () => {
        cancelAnimationFrame(rafId)
        localAnalyserRef.current = null
        setLocalVoiceLevel(0)
        audioContext.close().catch(() => undefined)
      }
    } catch {
      return undefined
    }
  }, [localVoiceStream])

  const canManualHangup = voiceHangupPolicy === 'always' || userHangupAllowed

  const forceEndVoiceCall = useCallback(() => {
    endVoiceCall('user_hangup')
  }, [endVoiceCall])

  const silenceProtocolRainbowActive = useMemo(() => {
    if (status !== 'connected') return false
    const epoch = silenceWatchdogEpochRef.current
    if (epoch == null) return false
    const elapsed = Date.now() - epoch
    const protocolTotal = voiceSilenceProtocolTotalMs(silenceTimingRef.current)
    return (
      elapsed >= protocolTotal - DIVINE_VOICE_SILENCE_PROTOCOL_RAINBOW_LAST_MS &&
      elapsed < protocolTotal
    )
  }, [status, silenceProtocolTick])

  const value: VoiceSessionContextValue = {
    status,
    voiceSurfaceState,
    voiceWorkLabel,
    closingPending,
    error,
    startVoiceCall,
    endVoiceCall,
    sendBriefingQuestion,
    remoteVoiceStream,
    localVoiceStream,
    voiceVizRef,
    userVoiceVizRef,
    remoteVoiceLevel,
    localVoiceLevel,
    audioInputDevices,
    audioOutputDevices,
    selectedAudioInputId,
    selectedAudioOutputId,
    setAudioInputDevice,
    setAudioOutputDevice,
    refreshAudioDevices,
    outputDeviceSelectionSupported,
    voiceTranscript,
    clearVoiceTranscript,
    focusedFanForVoice,
    setFocusedFanForVoice,
    voiceHangupPolicy,
    userHangupAllowed,
    canManualHangup,
    forceEndVoiceCall,
    silenceProtocolRainbowActive,
    divineVoicePremium: divineVoicePremiumLive,
    refreshDivineVoiceEntitlement,
  }

  return (
    <VoiceSessionContext.Provider value={value}>
      {children}
    </VoiceSessionContext.Provider>
  )
}

