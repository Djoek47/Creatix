import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function getAdminSession(): Promise<
  | { ok: true; userId: string; email: string | null }
  | { ok: false; reason: 'no_user' | 'not_admin' }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: 'no_user' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role = String((profile as { role?: string } | null)?.role ?? '').toLowerCase()
  if (role !== 'admin') return { ok: false, reason: 'not_admin' }

  return { ok: true, userId: user.id, email: user.email ?? null }
}

export async function requireAdmin(): Promise<{ userId: string; email: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (String((profile as { role?: string } | null)?.role ?? '').toLowerCase() !== 'admin') {
    redirect('/dashboard')
  }
  return { userId: user.id, email: user.email ?? null }
}
