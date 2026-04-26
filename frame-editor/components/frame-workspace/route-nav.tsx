import Link from 'next/link'
import type { EditorView } from '@/components/frame-workspace/types'

export function viewTitle(view: EditorView): string {
  if (view === 'setup') return 'Bridge setup'
  if (view === 'edit') return 'Editor workspace'
  if (view === 'export') return 'Export workspace'
  return 'Leak detect workspace'
}

type RouteNavProps = {
  activeView: EditorView
  routeWithBridge: (view: EditorView) => string
  views?: EditorView[]
}

export function RouteNav({ activeView, routeWithBridge, views }: RouteNavProps) {
  const navViews =
    views && views.length > 0 ? views : (['setup', 'edit', 'export', 'detect'] as EditorView[])

  return (
    <nav className="flex flex-wrap gap-2 text-xs sm:text-sm">
      {(navViews.map((viewId) => [viewId, viewId.charAt(0).toUpperCase() + viewId.slice(1)] as const)).map(
        ([viewId, label]) => (
        <Link
          key={viewId}
          href={routeWithBridge(viewId)}
          className={`rounded-full border px-3 py-1.5 ${
            activeView === viewId ? 'bg-primary text-primary-foreground border-transparent' : 'text-muted-foreground'
          }`}
          style={{ borderColor: activeView === viewId ? 'transparent' : 'var(--border)' }}
        >
          {label}
        </Link>
        ),
      )}
    </nav>
  )
}

