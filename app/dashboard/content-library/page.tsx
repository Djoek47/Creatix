import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MediaVaultHub } from '@/components/ai/media-vault-hub'
import { Calendar } from 'lucide-react'

export default function ContentLibraryPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-12 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button variant="outline" size="sm" asChild className="gap-2 self-start sm:self-center">
          <Link href="/dashboard/content">
            <Calendar className="h-4 w-4" />
            Content schedule
          </Link>
        </Button>
      </div>
      <MediaVaultHub />
    </div>
  )
}
