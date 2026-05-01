import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { LOCALE_COOKIE } from '@/lib/i18n/constants'
import { PHASE1_LOCALES } from '@/lib/i18n/routing'
import type { UiPreferences } from '@/lib/types'

const localeEnum = z.enum(PHASE1_LOCALES)

const patchSchema = z.object({
  locale: localeEnum.optional(),
  dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']).optional(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD']).optional(),
  autoSave: z.boolean().optional(),
  soundEffects: z.boolean().optional(),
  cosmicGuidance: z.boolean().optional(),
})

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('ui_preferences')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('[ui-preferences GET]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ui_preferences: (data?.ui_preferences as UiPreferences | null) ?? {} })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let parsed: z.infer<typeof patchSchema>
  try {
    const json = await request.json()
    parsed = patchSchema.parse(json)
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { data: row, error: readErr } = await supabase
    .from('profiles')
    .select('ui_preferences')
    .eq('id', user.id)
    .maybeSingle()
  if (readErr) {
    console.error('[ui-preferences PATCH read]', readErr.message)
    return NextResponse.json({ error: readErr.message }, { status: 500 })
  }

  const prev = (row?.ui_preferences as UiPreferences | null) ?? {}
  const next: UiPreferences = { ...prev, ...parsed }

  const { error: writeErr } = await supabase
    .from('profiles')
    .update({ ui_preferences: next, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (writeErr) {
    console.error('[ui-preferences PATCH]', writeErr.message)
    return NextResponse.json({ error: writeErr.message }, { status: 500 })
  }

  const res = NextResponse.json({ ok: true, ui_preferences: next })
  if (parsed.locale) {
    res.cookies.set(LOCALE_COOKIE, parsed.locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
  }

  return res
}
