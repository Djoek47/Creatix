import { Suspense } from 'react'
import { EditorApp } from '@/components/editor-app'

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground flex min-h-screen items-center justify-center px-4 text-sm">
          Loading editor…
        </div>
      }
    >
      <EditorApp initialView="edit" editorMode="pro" />
    </Suspense>
  )
}

