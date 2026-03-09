import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,oklch(0.78_0.14_85_/_.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_80%_80%,oklch(0.55_0.25_305_/_.1),transparent_45%)]" />
      </div>

      {/* Back to home — all auth pages */}
      <Link
        href="/"
        className="absolute left-6 top-6 z-10 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>

      {/* Logo — all auth pages */}
      <div className="flex flex-col flex-1 items-center justify-center px-4 pt-16 pb-8">
        <Link href="/" className="mb-6 flex items-center gap-2 shrink-0 animate-fade-up opacity-0 [animation-fill-mode:forwards]">
          <Image src="/logo.png" alt="Circe and Venus" width={40} height={40} className="h-10 w-10 rounded-xl object-contain" />
          <span className="text-2xl font-bold tracking-tight">Circe and Venus</span>
        </Link>
        <div className="w-full flex flex-col items-center animate-scale-in opacity-0 [animation-fill-mode:forwards] [animation-delay:0.08s]">
          {children}
        </div>
      </div>
    </div>
  )
}
