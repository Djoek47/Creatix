import { redirect } from 'next/navigation'

export default function AdminCostsRedirectPage() {
  redirect('/admin/settings')
}
