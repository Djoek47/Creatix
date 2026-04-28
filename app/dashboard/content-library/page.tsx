import { redirect } from 'next/navigation'

/** @deprecated Use `/dashboard/content?view=vault`. Kept for bookmarks and external links. */
export default function ContentLibraryPage() {
  redirect('/dashboard/content?view=vault')
}
