import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { getDivineVoice } from '@/lib/divine-manager'
import { getOpenAIRealtimeModel } from '@/lib/openai/realtime-model'

export const maxDuration = 30

/**
 * POST: WebRTC SDP answer for Safe Photo Touch-up voice session (OpenAI Realtime).
 * Body: { sdp: string } — same as mimic-test-realtime.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const baseUrl = process.env.OPENAI_BASE_URL?.replace(/\/$/, '') || 'https://api.openai.com'
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || !apiKey.startsWith('sk-')) {
      return NextResponse.json(
        {
          error: 'Realtime requires OPENAI_API_KEY (OpenAI key starting with sk-).',
        },
        { status: 503 },
      )
    }

    let sdp: string | undefined
    const contentType = req.headers.get('content-type') || ''
    if (contentType.startsWith('application/json')) {
      const body = (await req.json().catch(() => ({}))) as { sdp?: string }
      sdp = body.sdp
    } else {
      sdp = await req.text()
    }
    if (!sdp?.trim()) {
      return NextResponse.json({ error: 'Missing SDP body' }, { status: 400 })
    }

    const { data: settings } = await supabase
      .from('divine_manager_settings')
      .select('notification_settings')
      .eq('user_id', user.id)
      .maybeSingle()

    const voice = getDivineVoice(
      (settings as { notification_settings?: { voice?: string } } | null)?.notification_settings?.voice,
    )

    const instructions = `You are the Safe Photo Touch-up voice copilot for an adult content creator.

Context: the creator has already uploaded a photo in the app. They are speaking to you in real time. You cannot see the image yourself; when they describe what they want, you MUST call the tool photo_apply_edit with a single clear "instruction" string that captures their request in plain English (e.g. "stronger blur for privacy", "a bit brighter", "small heart emoji in the top right corner").

Rules:
- Only safe edits exist in the pipeline: Gaussian blur, brightness tweak, or emoji overlay. No beautify, inpaint, face swap, background removal, or body changes.
- If they ask for something unsafe or impossible in that set, explain kindly and suggest blur, lighting, or emoji instead.
- After each successful edit, confirm briefly what was applied in natural speech.
- Keep replies short; one question at a time if you need clarification.
- Never discuss minors or illegal content.

Tools:
- photo_apply_edit: pass { "instruction": "<string>" } — required whenever they want a change applied.
- voice_allow_user_hangup: call when you have asked if they need anything else and they might want to end (unlocks End in strict hangup mode).
- end_call: only after they confirm they are done.`

    const tools = [
      {
        type: 'function' as const,
        name: 'photo_apply_edit',
        description:
          'Apply one safe photo touch-up based on the creator spoken request. Use a clear instruction string.',
        parameters: {
          type: 'object',
          properties: {
            instruction: {
              type: 'string',
              description:
                'What to do to the image in plain English, e.g. blur more, brighten slightly, fire emoji bottom left.',
            },
          },
          required: ['instruction'],
        },
      },
      {
        type: 'function' as const,
        name: 'voice_allow_user_hangup',
        description:
          'Call after asking if the user wants anything else so End button can unlock in strict mode.',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      {
        type: 'function' as const,
        name: 'end_call',
        description: 'End the voice call only after the user confirms they are done.',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
    ]

    const sessionConfig = {
      type: 'realtime',
      model: getOpenAIRealtimeModel(),
      instructions,
      audio: { output: { voice } },
      tools,
    }

    const formData = new FormData()
    formData.set('sdp', sdp)
    formData.set('session', JSON.stringify(sessionConfig))

    const res = await fetch(`${baseUrl}/v1/realtime/calls`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json(
        { error: 'Realtime session failed', details: errText.slice(0, 200) },
        { status: res.status === 401 ? 503 : res.status },
      )
    }

    const answerSdp = await res.text()
    return new NextResponse(answerSdp, {
      headers: { 'Content-Type': 'application/sdp' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Realtime session failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
