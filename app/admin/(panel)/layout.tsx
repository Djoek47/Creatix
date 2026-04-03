import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/require-admin'
import { AdminNav } from '@/components/admin/admin-nav'
import { Button } from '@/components/ui/button'

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex justify-end">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">Back to app</Link>
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}
