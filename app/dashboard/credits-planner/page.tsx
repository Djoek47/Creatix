import Link from 'next/link'
import { CreditAllocationPlanner } from '@/components/billing/credit-allocation-planner'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function CreditsPlannerPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">Credits planner</h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Monthly allocation from your live fan and revenue picture—minimal noise, one clear action.
          </p>
        </div>
      </div>

      <CreditAllocationPlanner />
    </div>
  )
}
