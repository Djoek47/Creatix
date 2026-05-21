import { Suspense } from 'react'
import { EditorApp } from '@/components/editor-app'

export default function EditorProPage() {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground flex min-h-screen items-center justify-center px-4 text-sm">
          Loading pro editor…
        </div>
      }
    >
      <EditorApp initialView="edit" shellPath="/editor/pro" editorMode="pro" />
    </Suspense>
  )
}
