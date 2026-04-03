import { redirect } from 'next/navigation'

/** Legacy URL — arrangements live on the Fans page. */
export default function SmartClassifyRedirectPage() {
  redirect('/dashboard/fans#arrangements')
}
