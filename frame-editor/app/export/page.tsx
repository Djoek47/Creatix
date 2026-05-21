import { Suspense } from 'react'
import { EditorApp } from '@/components/editor-app'

export default function ExportPage() {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground flex min-h-screen items-center justify-center px-4 text-sm">
          Loading export workspace…
        </div>
      }
    >
      <EditorApp initialView="export" />
    </Suspense>
  )
}

