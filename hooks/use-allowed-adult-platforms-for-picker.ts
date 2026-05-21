'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  allowedAdultPlatformsForFocusPicker,
  type SubscriptionFocusFields,
} from '@/lib/billing/platform-variant'

/**
 * For OF/Fansly controls in AI Studio — matches paid Focus vs Unified (one DB read, client-side).
 */
export function useAllowedAdultPlatformsForPicker(): ('onlyfans' | 'fansly')[] | undefined {
  const [allowed, setAllowed] = useState<('onlyfans' | 'fansly')[] | undefined>(undefined)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    void (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user || cancelled) return
        const { data } = await supabase
          .from('subscriptions')
          .select('plan_id,status,billing_variant,billing_focus_platform,billing_focus_platforms')
          .eq('user_id', user.id)
          .maybeSingle()
        if (!cancelled) {
          setAllowed(allowedAdultPlatformsForFocusPicker(data as SubscriptionFocusFields | null))
        }
      } catch {
        if (!cancelled) setAllowed(undefined)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return allowed
}
