import { createClient } from '@/lib/supabase/server'
import { IncomePredictorDashboard } from '@/components/analytics/income-predictor-dashboard'

export const dynamic = 'force-dynamic'

export default async function IncomePredictorPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  return (
    <div className="space-y-6 p-4 md:p-6">
      <IncomePredictorDashboard />
    </div>
  )
}
