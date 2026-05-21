import { NextRequest, NextResponse } from 'next/server'
import { generateTextWithOpenAI } from '@/lib/divine-openai'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { getDivineVoice } from '@/lib/divine-manager'
import { hasDivineVoicePremium, type SubscriptionRowForPremiumDivine } from '@/lib/billing/premium-divine'
import { buildVoiceBriefPrompts, type VoiceBriefMode } from '@/lib/divine/divine-manager-voice-brief-prompt'
import { createOpenAiBackgroundJob } from '@/lib/openai/background-jobs'

export const maxDuration = 60

async function synthOpenAiTts(script: string, apiKey: string, voiceChoice: ReturnType<typeof getDivineVoice>): Promise<{
  ok: boolean
  audioBase64?: string
  error?: string
}> {
  const ttsInput = script.slice(0, 4096)
  const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: voiceChoice,
      input: ttsInput,
    }),
  })
  if (!ttsRes.ok) {
    const errText = await ttsRes.text()
    console.error('[divine-manager-voice] TTS error:', ttsRes.status, errText)
    return { ok: false, error: errText.slice(0, 200) }
  }
  const audioBuffer = await ttsRes.arrayBuffer()
  return { ok: true, audioBase64: Buffer.from(audioBuffer).toString('base64') }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const jobId = typeof searchParams.get('jobId') === 'string' ? searchParams.get('jobId')!.trim() : ''
    const includeTts = searchParams.get('includeTts') === '1' || searchParams.get('tts') === '1'

    if (!jobId) {
      return NextResponse.json({ error: 'jobId required' }, { status: 400 })
    }

    const { data: job, error } = await supabase
      .from('openai_jobs')
      .select('id,user_id,status,feature,result_summary,error_message')
      .eq('id', jobId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const row = job as {
      user_id?: string
      status?: string
      feature?: string
      result_summary?: { script?: unknown; mode?: unknown } | null
      error_message?: string | null
    } | null
    if (!row || row.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (!['completed', 'failed', 'cancelled'].includes(String(row.status))) {
      return NextResponse.json({
        status: row.status ?? 'queued',
        pending: true,
      })
    }

    if (String(row.feature) !== 'briefing_script') {
      return NextResponse.json({
        status: row.status,
        pending: false,
        error: `job is ${row.feature}, not briefing_script`,
      })
    }

    const script =
      typeof row.result_summary?.script === 'string' ? row.result_summary.script.trim() : ''
    if (String(row.status) !== 'completed' || !script) {
      return NextResponse.json({
        status: row.status,
        pending: false,
        script: '',
        error: row.error_message || 'empty_script',
      })
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim()

    let audioBase64: string | undefined

    const { data: settings } = await supabase
      .from('divine_manager_settings')
      .select('notification_settings')
      .eq('user_id', user.id)
      .maybeSingle()

    const voiceChoice = getDivineVoice(
      (settings as { notification_settings?: { voice?: string } } | null)?.notification_settings?.voice,
    )

    if (includeTts && apiKey) {
      const synth = await synthOpenAiTts(script, apiKey, voiceChoice)
      if (synth.ok && synth.audioBase64) audioBase64 = synth.audioBase64
    }

    return NextResponse.json({
      status: row.status,
      pending: false,
      script,
      audio: audioBase64 ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Briefing lookup failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: subVoice } = await supabase
      .from('subscriptions')
      .select('plan_id,status,divine_voice_premium')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!hasDivineVoicePremium(subVoice as SubscriptionRowForPremiumDivine | null)) {
      return NextResponse.json(
        { error: 'Divine voice requires Premium.', code: 'divine_voice_premium_required' },
        { status: 403 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const mode: VoiceBriefMode = ['intro', 'ongoing', 'what_next'].includes(body.mode)
      ? body.mode
      : 'intro'

    const { data: settings } = await supabase
      .from('divine_manager_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!settings || settings.mode === 'off') {
      return NextResponse.json({
        script:
          'Divine Manager is currently turned off. Switch it to suggest-only or semi-automatic mode to receive guidance.',
      })
    }

    const voiceChoice = getDivineVoice(settings?.notification_settings?.voice)

    const { data: tasks } = await supabase
      .from('divine_manager_tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    const { data: analytics } = await supabase
      .from('analytics_snapshots')
      .select('platform,date,fans,revenue')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(7)



    const { system, userPrompt } = buildVoiceBriefPrompts({
      settings: settings as unknown as Record<string, unknown>,
      tasks: tasks as unknown as Parameters<typeof buildVoiceBriefPrompts>[0]['tasks'],
      analytics: analytics ?? undefined,
      mode,
    })

    const webhookConfigured = Boolean(process.env.OPENAI_WEBHOOK_SECRET?.trim())

    if (!webhookConfigured) {
      const { text } = await generateTextWithOpenAI({
        system,
        prompt: userPrompt,
        maxTokens: 400,
        temperature: 0.6,
      })

      const scriptSync = text.trim()
      if (!scriptSync)
        return NextResponse.json({ script: '', error: 'Empty script' }, { status: 500 })

      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey)
        return NextResponse.json({ script: scriptSync, error: 'TTS not configured' }, { status: 200 })

      const synthSync = await synthOpenAiTts(scriptSync, apiKey, voiceChoice)
      if (!synthSync.ok || !synthSync.audioBase64) {
        console.error('[divine-manager-voice] TTS error', synthSync.error)
        return NextResponse.json({ script: scriptSync, error: 'TTS failed' }, { status: 200 })
      }
      return NextResponse.json({ script: scriptSync, audio: synthSync.audioBase64 })
    }

    const q = await createOpenAiBackgroundJob({
      userId: user.id,
      feature: 'briefing_script',
      instructions: system,
      input: userPrompt,
      requestMetadata: { mode, voice_preset: typeof voiceChoice === 'string' ? voiceChoice : 'default' },
    })
    if (!q.ok || !q.jobId) {
      return NextResponse.json({ error: q.error || 'failed to enqueue briefing' }, { status: 502 })
    }
    return NextResponse.json({
      pending: true,
      jobId: q.jobId,
      hint: `GET /api/ai/divine-manager-voice?jobId=${q.jobId}&includeTts=1 until status completes.`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Divine Manager voice failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
