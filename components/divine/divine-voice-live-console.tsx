'use client'

import { Headphones, Mic2, Radio, Sparkles, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useVoiceSession } from '@/components/divine/voice-session-context'
import { cn } from '@/lib/utils'

const DEFAULT_DEVICE_ID = 'default'

function deviceLabel(device: MediaDeviceInfo, fallback: string): string {
  return device.label?.trim() || fallback
}

function VoiceMeter({
  label,
  level,
  tone,
}: {
  label: string
  level: number
  tone: 'user' | 'divine'
}) {
  const bars = Array.from({ length: 18 }, (_, index) => index)
  const active = Math.max(1, Math.round(Math.min(1, Math.max(0, level)) * bars.length))
  return (
    <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/[0.18] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:bg-white/[0.035]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            tone === 'user' ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.65)]' : 'bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.65)]',
          )}
        />
      </div>
      <div className="flex h-8 items-center gap-1">
        {bars.map((bar) => {
          const height = 18 + ((bar % 6) * 9)
          const on = bar < active
          return (
            <span
              key={bar}
              className={cn(
                'w-full rounded-full transition-all duration-100',
                tone === 'user'
                  ? on ? 'bg-gradient-to-t from-amber-500 to-yellow-200' : 'bg-amber-500/12'
                  : on ? 'bg-gradient-to-t from-violet-500 to-fuchsia-200' : 'bg-violet-500/12',
              )}
              style={{ height: `${on ? height : 8}px`, opacity: on ? 0.96 : 0.55 }}
            />
          )
        })}
      </div>
    </div>
  )
}

export function DivineVoiceLiveConsole({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  const voice = useVoiceSession()
  if (!voice) return null

  const latestTranscript = [...voice.voiceTranscript].reverse().find((turn) => turn.text.trim())
  const audioInputs = voice.audioInputDevices.filter((device) => device.deviceId && device.deviceId !== DEFAULT_DEVICE_ID)
  const audioOutputs = voice.audioOutputDevices.filter((device) => device.deviceId && device.deviceId !== DEFAULT_DEVICE_ID)
  const canPickOutput = voice.outputDeviceSelectionSupported && voice.audioOutputDevices.length > 0

  return (
    <section
      className={cn(
        'overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.18),transparent_34%),linear-gradient(145deg,rgba(15,10,25,0.86),rgba(7,8,14,0.82))] p-3 text-white shadow-[0_22px_70px_-38px_rgba(0,0,0,0.75)] backdrop-blur-2xl',
        compact ? 'space-y-3' : 'space-y-4',
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/10 text-amber-200">
            <Radio className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-[-0.02em]">Live voice console</p>
            <p className="truncate text-xs text-white/[0.58]">
              {voice.status === 'connected' ? 'Listening, routing, and transcribing in realtime.' : 'Choose devices before starting voice.'}
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 shrink-0 rounded-full border border-white/10 bg-white/[0.08] px-3 text-xs text-white hover:bg-white/[0.14] hover:text-white"
          onClick={() => void voice.refreshAudioDevices()}
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Refresh
        </Button>
      </div>

      <div className={cn('grid gap-2', compact ? 'grid-cols-1' : 'sm:grid-cols-2')}>
        <label className="min-w-0 space-y-1.5">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/[0.52]">
            <Mic2 className="h-3 w-3" aria-hidden />
            Microphone
          </span>
          <Select
            value={voice.selectedAudioInputId || DEFAULT_DEVICE_ID}
            onValueChange={(value) => void voice.setAudioInputDevice(value)}
          >
            <SelectTrigger className="h-10 w-full border-white/10 bg-white/[0.08] text-white shadow-none [&_svg]:text-white/[0.55]">
              <SelectValue placeholder="System microphone" />
            </SelectTrigger>
            <SelectContent className="z-[130]">
              <SelectItem value={DEFAULT_DEVICE_ID}>System microphone</SelectItem>
              {audioInputs.map((device, index) => (
                <SelectItem key={device.deviceId || `mic-${index}`} value={device.deviceId || DEFAULT_DEVICE_ID}>
                  {deviceLabel(device, `Microphone ${index + 1}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="min-w-0 space-y-1.5">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/[0.52]">
            <Headphones className="h-3 w-3" aria-hidden />
            Headphones
          </span>
          <Select
            value={voice.selectedAudioOutputId || DEFAULT_DEVICE_ID}
            onValueChange={(value) => void voice.setAudioOutputDevice(value)}
            disabled={!canPickOutput}
          >
            <SelectTrigger className="h-10 w-full border-white/10 bg-white/[0.08] text-white shadow-none disabled:opacity-70 [&_svg]:text-white/[0.55]">
              <SelectValue placeholder="System output" />
            </SelectTrigger>
            <SelectContent className="z-[130]">
              <SelectItem value={DEFAULT_DEVICE_ID}>System output</SelectItem>
              {audioOutputs.map((device, index) => (
                <SelectItem key={device.deviceId || `speaker-${index}`} value={device.deviceId || DEFAULT_DEVICE_ID}>
                  {deviceLabel(device, `Output ${index + 1}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!canPickOutput ? (
            <p className="text-[10px] leading-snug text-white/[0.42]">
              Output switching depends on browser support.
            </p>
          ) : null}
        </label>
      </div>

      <div className={cn('grid gap-2', compact ? 'grid-cols-1' : 'sm:grid-cols-2')}>
        <VoiceMeter label="You" level={voice.localVoiceLevel} tone="user" />
        <VoiceMeter label="Divine" level={voice.remoteVoiceLevel} tone="divine" />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/[0.52]">
            <Volume2 className="h-3 w-3" aria-hidden />
            Heard from you
          </span>
          {voice.voiceTranscript.length > 0 ? (
            <button
              type="button"
              className="text-[10px] font-medium text-white/50 underline-offset-2 hover:text-white hover:underline"
              onClick={voice.clearVoiceTranscript}
            >
              Clear
            </button>
          ) : null}
        </div>
        <p className="min-h-[2.75rem] text-sm leading-relaxed text-white/[0.82]">
          {latestTranscript ? (
            <>
              {latestTranscript.text}
              {!latestTranscript.final ? <span className="ml-1 animate-pulse text-amber-200">...</span> : null}
            </>
          ) : (
            <span className="text-white/[0.42]">Transcript appears here once Divine hears your microphone.</span>
          )}
        </p>
      </div>
    </section>
  )
}
