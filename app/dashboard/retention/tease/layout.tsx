import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'User retention by tease',
}

export default function RetentionTeaseLayout({ children }: { children: React.ReactNode }) {
  return children
}
