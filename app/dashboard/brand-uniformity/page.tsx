import { redirect } from 'next/navigation'

/** Branding / brand-uniformity UI is temporarily removed; `/api/brand/*` remains for a future rework. */
export default function BrandUniformityPage() {
  redirect('/dashboard/ai-studio?tab=library')
}
