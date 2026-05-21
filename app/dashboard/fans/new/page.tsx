import { redirect } from 'next/navigation'

/** Legacy URL — fans are created when people subscribe on connected platforms; use Sync on Fans. */
export default function LegacyNewFanPage() {
  redirect('/dashboard/fans')
}
