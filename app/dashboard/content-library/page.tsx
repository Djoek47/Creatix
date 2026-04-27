import Link from 'next/link'
import { MediaVaultHub } from '@/components/ai/media-vault-hub'
import { Calendar } from 'lucide-react'

export default function ContentLibraryPage() {
  return (
    <div className="mx-auto max-w-2xl pb-16 sm:pb-20">
      <div className="mb-8 flex justify-end sm:mb-10">
        <Link
          href="/dashboard/content"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground"
        >
          <Calendar className="h-4 w-4 opacity-70" aria-hidden />
          Schedule
        </Link>
      </div>
      <MediaVaultHub />
    </div>
  )
}
