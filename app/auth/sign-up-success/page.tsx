import { createClient } from '@/lib/supabase/server'
import { hasTrialBillingAttached } from '@/lib/billing/trial-checkout-attached'
import { SignUpSuccessClient } from './sign-up-success-client'

export default async function SignUpSuccessPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let trialBillingAttachedFromServer = false
  if (user?.id) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id,plan_id,status')
      .eq('user_id', user.id)
      .maybeSingle()
    trialBillingAttachedFromServer = hasTrialBillingAttached(sub)
  }

  return <SignUpSuccessClient trialBillingAttachedFromServer={trialBillingAttachedFromServer} />
}
