import { cn } from '@/lib/utils'

type AuthStarfieldDecorProps = {
  className?: string
  /** Lower for dense UIs (e.g. dashboard glass shell). */
  intensity?: 'full' | 'soft'
  /** Extra clusters, constellations, polar stars; constellations visible on small screens too. */
  density?: 'default' | 'rich'
}

const POLAR_BASE = [
  { top: '8%', left: '14%', rotate: '-rotate-12', dur: 12.2, delay: -1.2 },
  { top: '22%', left: '62%', rotate: 'rotate-9', dur: 9.1, delay: -3.1 },
  { top: '38%', left: '7%', rotate: 'rotate-6', dur: 11.4, delay: -0.4 },
  { top: '44%', left: '78%', rotate: '-rotate-3', dur: 14.0, delay: -4.2 },
  { top: '58%', left: '35%', rotate: 'rotate-15', dur: 9.6, delay: -2.0 },
  { top: '72%', left: '18%', rotate: '-rotate-8', dur: 10.2, delay: -5.5 },
  { top: '16%', left: '42%', rotate: 'rotate-3', dur: 12.5, delay: -0.8 },
  { top: '66%', left: '58%', rotate: '-rotate-14', dur: 8.0, delay: -1.7 },
] as const

const POLAR_RICH_EXTRA = [
  { top: '6%', left: '48%', rotate: 'rotate-6', dur: 11.7, delay: -2.1 },
  { top: '12%', left: '88%', rotate: '-rotate-10', dur: 10.3, delay: -0.5 },
  { top: '31%', left: '28%', rotate: 'rotate-12', dur: 9.4, delay: -3.8 },
  { top: '52%', left: '92%', rotate: '-rotate-6', dur: 13.1, delay: -1.1 },
  { top: '78%', left: '8%', rotate: 'rotate-8', dur: 10.8, delay: -4.4 },
  { top: '84%', left: '44%', rotate: '-rotate-4', dur: 11.0, delay: -0.9 },
  { top: '48%', left: '52%', rotate: 'rotate-5', dur: 9.9, delay: -2.7 },
  { top: '24%', left: '76%', rotate: '-rotate-11', dur: 12.8, delay: -5.1 },
  { top: '62%', left: '72%', rotate: 'rotate-7', dur: 8.6, delay: -1.4 },
  { top: '91%', left: '22%', rotate: '-rotate-9', dur: 10.5, delay: -3.2 },
  { top: '18%', left: '30%', rotate: 'rotate-11', dur: 11.2, delay: -0.3 },
  { top: '41%', left: '18%', rotate: '-rotate-5', dur: 9.2, delay: -4.9 },
] as const

/**
 * Twinkling star layers, SVG constellations, and polar stars — same system as login/sign-up,
 * without scenic background images.
 */
export function AuthStarfieldDecor({
  className,
  intensity = 'full',
  density = 'default',
}: AuthStarfieldDecorProps) {
  const soft = intensity === 'soft'
  const rich = density === 'rich'
  const polarSlots = rich ? [...POLAR_BASE, ...POLAR_RICH_EXTRA] : [...POLAR_BASE]

  const c1Frame = cn(
    'absolute left-[4%] top-[24%] min-h-[9rem] min-w-[9rem] max-h-[40vh] max-w-[40vw] motion-safe:animate-[marketing-float-soft_7s_ease-in-out_infinite]',
    rich
      ? 'block h-44 w-44 opacity-90 sm:h-64 sm:w-64 md:h-72 md:w-72'
      : 'hidden h-72 w-72 opacity-95 sm:block',
    soft && 'opacity-80',
  )
  const c2Frame = cn(
    'absolute right-[4%] top-[14%] min-h-[9rem] min-w-[9rem] max-h-[44vh] max-w-[44vw] motion-safe:animate-[marketing-float-soft_8s_ease-in-out_infinite]',
    rich ? 'block h-48 w-48 opacity-88 sm:h-72 sm:w-80' : 'hidden h-80 w-80 opacity-90 sm:block',
    soft && 'opacity-80',
  )
  const c3Frame = cn(
    'absolute bottom-[10%] left-[2%] min-h-[9rem] min-w-[9rem] max-h-[32vh] max-w-[36vw] motion-safe:animate-[marketing-float-soft_9s_ease-in-out_infinite]',
    rich ? 'block h-40 w-40 opacity-85 sm:h-56 sm:w-56' : 'hidden h-56 w-56 opacity-88 sm:block',
    soft && 'opacity-75',
  )

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      <div
        className={cn(
          'absolute left-[4%] top-[12%] h-[48vh] w-[28vw] min-w-56 [background-image:radial-gradient(circle_at_12%_18%,rgba(168,85,247,1)_1.8px,transparent_2px),radial-gradient(circle_at_30%_12%,rgba(255,255,255,0.98)_1.4px,transparent_1.6px),radial-gradient(circle_at_52%_30%,rgba(192,132,252,0.95)_1.5px,transparent_1.7px),radial-gradient(circle_at_72%_16%,rgba(168,85,247,0.98)_1.6px,transparent_1.8px),radial-gradient(circle_at_86%_34%,rgba(255,255,255,0.92)_1.4px,transparent_1.6px),radial-gradient(circle_at_18%_58%,rgba(192,132,252,0.96)_1.5px,transparent_1.7px),radial-gradient(circle_at_36%_78%,rgba(255,255,255,0.86)_1.2px,transparent_1.4px),radial-gradient(circle_at_64%_54%,rgba(168,85,247,0.9)_1.3px,transparent_1.5px),radial-gradient(circle_at_80%_66%,rgba(168,85,247,0.92)_1.5px,transparent_1.7px),radial-gradient(circle_at_48%_90%,rgba(255,255,255,0.86)_1.2px,transparent_1.4px),radial-gradient(circle_at_92%_82%,rgba(192,132,252,0.88)_1.2px,transparent_1.4px),radial-gradient(circle_at_6%_8%,rgba(196,181,253,0.95)_1.3px,transparent_1.5px),radial-gradient(circle_at_24%_4%,rgba(255,255,255,0.9)_1.2px,transparent_1.4px),radial-gradient(circle_at_44%_20%,rgba(168,85,247,0.9)_1.4px,transparent_1.6px),radial-gradient(circle_at_60%_8%,rgba(255,255,255,0.88)_1.1px,transparent_1.3px),radial-gradient(circle_at_78%_44%,rgba(192,132,252,0.98)_1.5px,transparent_1.7px),radial-gradient(circle_at_95%_48%,rgba(168,85,247,0.88)_1.2px,transparent_1.4px)] motion-safe:animate-[login-fairy-stars-a_6.2s_ease-in-out_infinite] dark:[background-image:radial-gradient(circle_at_12%_18%,rgba(251,191,36,1)_1.8px,transparent_2px),radial-gradient(circle_at_30%_12%,rgba(255,255,255,0.98)_1.4px,transparent_1.6px),radial-gradient(circle_at_52%_30%,rgba(251,191,36,0.95)_1.5px,transparent_1.7px),radial-gradient(circle_at_72%_16%,rgba(251,191,36,0.98)_1.6px,transparent_1.8px),radial-gradient(circle_at_86%_34%,rgba(255,255,255,0.92)_1.4px,transparent_1.6px),radial-gradient(circle_at_18%_58%,rgba(251,191,36,0.96)_1.5px,transparent_1.7px),radial-gradient(circle_at_36%_78%,rgba(255,255,255,0.86)_1.2px,transparent_1.4px),radial-gradient(circle_at_64%_54%,rgba(251,191,36,0.9)_1.3px,transparent_1.5px),radial-gradient(circle_at_80%_66%,rgba(251,191,36,0.92)_1.5px,transparent_1.7px),radial-gradient(circle_at_48%_90%,rgba(255,255,255,0.86)_1.2px,transparent_1.4px),radial-gradient(circle_at_92%_82%,rgba(251,191,36,0.88)_1.2px,transparent_1.4px),radial-gradient(circle_at_6%_8%,rgba(252,211,77,0.95)_1.3px,transparent_1.5px),radial-gradient(circle_at_24%_4%,rgba(255,255,255,0.9)_1.2px,transparent_1.4px),radial-gradient(circle_at_44%_20%,rgba(251,191,36,0.9)_1.4px,transparent_1.6px),radial-gradient(circle_at_60%_8%,rgba(255,255,255,0.88)_1.1px,transparent_1.3px),radial-gradient(circle_at_78%_44%,rgba(251,191,36,0.98)_1.5px,transparent_1.7px),radial-gradient(circle_at_95%_48%,rgba(245,200,100,0.9)_1.2px,transparent_1.4px)]',
          soft && 'opacity-70',
        )}
      />
      <div
        className={cn(
          'absolute right-[4%] top-[10%] h-[50vh] w-[30vw] min-w-60 [background-image:radial-gradient(circle_at_14%_28%,rgba(168,85,247,1)_1.7px,transparent_1.9px),radial-gradient(circle_at_38%_10%,rgba(255,255,255,0.98)_1.4px,transparent_1.6px),radial-gradient(circle_at_58%_34%,rgba(255,255,255,0.9)_1.2px,transparent_1.4px),radial-gradient(circle_at_78%_20%,rgba(192,132,252,0.98)_1.6px,transparent_1.8px),radial-gradient(circle_at_90%_56%,rgba(255,255,255,0.94)_1.4px,transparent_1.6px),radial-gradient(circle_at_30%_74%,rgba(168,85,247,0.95)_1.5px,transparent_1.7px),radial-gradient(circle_at_50%_88%,rgba(255,255,255,0.84)_1.2px,transparent_1.4px),radial-gradient(circle_at_18%_88%,rgba(192,132,252,0.85)_1.2px,transparent_1.4px),radial-gradient(circle_at_68%_82%,rgba(168,85,247,0.92)_1.5px,transparent_1.7px),radial-gradient(circle_at_94%_18%,rgba(255,255,255,0.82)_1.1px,transparent_1.3px),radial-gradient(circle_at_4%_50%,rgba(196,181,253,0.9)_1.2px,transparent_1.4px),radial-gradient(circle_at_22%_40%,rgba(255,255,255,0.88)_1.1px,transparent_1.3px),radial-gradient(circle_at_46%_62%,rgba(168,85,247,0.88)_1.3px,transparent_1.5px),radial-gradient(circle_at_72%_6%,rgba(255,255,255,0.9)_1.2px,transparent_1.4px),radial-gradient(circle_at_88%_70%,rgba(192,132,252,0.95)_1.4px,transparent_1.6px)] motion-safe:animate-[login-fairy-stars-b_7.4s_ease-in-out_infinite] dark:[background-image:radial-gradient(circle_at_14%_28%,rgba(251,191,36,1)_1.7px,transparent_1.9px),radial-gradient(circle_at_38%_10%,rgba(255,255,255,0.98)_1.4px,transparent_1.6px),radial-gradient(circle_at_58%_34%,rgba(255,255,255,0.9)_1.2px,transparent_1.4px),radial-gradient(circle_at_78%_20%,rgba(251,191,36,0.98)_1.6px,transparent_1.8px),radial-gradient(circle_at_90%_56%,rgba(255,255,255,0.94)_1.4px,transparent_1.6px),radial-gradient(circle_at_30%_74%,rgba(251,191,36,0.95)_1.5px,transparent_1.7px),radial-gradient(circle_at_50%_88%,rgba(255,255,255,0.84)_1.2px,transparent_1.4px),radial-gradient(circle_at_18%_88%,rgba(251,191,36,0.85)_1.2px,transparent_1.4px),radial-gradient(circle_at_68%_82%,rgba(251,191,36,0.92)_1.5px,transparent_1.7px),radial-gradient(circle_at_94%_18%,rgba(255,255,255,0.82)_1.1px,transparent_1.3px),radial-gradient(circle_at_4%_50%,rgba(252,211,77,0.9)_1.2px,transparent_1.4px),radial-gradient(circle_at_22%_40%,rgba(255,255,255,0.88)_1.1px,transparent_1.3px),radial-gradient(circle_at_46%_62%,rgba(251,191,36,0.88)_1.3px,transparent_1.5px),radial-gradient(circle_at_72%_6%,rgba(255,255,255,0.9)_1.2px,transparent_1.4px),radial-gradient(circle_at_88%_70%,rgba(245,200,100,0.95)_1.4px,transparent_1.6px)]',
          soft && 'opacity-70',
        )}
      />
      <div
        className={cn(
          'absolute inset-x-[16%] top-[6%] h-32 [background-image:radial-gradient(circle_at_8%_46%,rgba(168,85,247,0.98)_1.4px,transparent_1.6px),radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.88)_1.2px,transparent_1.4px),radial-gradient(circle_at_44%_54%,rgba(192,132,252,0.82)_1.1px,transparent_1.3px),radial-gradient(circle_at_68%_34%,rgba(168,85,247,0.9)_1.3px,transparent_1.5px),radial-gradient(circle_at_88%_66%,rgba(255,255,255,0.9)_1.2px,transparent_1.4px),radial-gradient(circle_at_12%_70%,rgba(196,181,253,0.9)_1.1px,transparent_1.3px),radial-gradient(circle_at_55%_22%,rgba(255,255,255,0.85)_1.1px,transparent_1.3px),radial-gradient(circle_at_96%_40%,rgba(168,85,247,0.88)_1.2px,transparent_1.4px)] motion-safe:animate-[login-fairy-stars-a_8s_ease-in-out_infinite] dark:[background-image:radial-gradient(circle_at_8%_46%,rgba(251,191,36,0.98)_1.4px,transparent_1.6px),radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.88)_1.2px,transparent_1.4px),radial-gradient(circle_at_44%_54%,rgba(251,191,36,0.82)_1.1px,transparent_1.3px),radial-gradient(circle_at_68%_34%,rgba(251,191,36,0.9)_1.3px,transparent_1.5px),radial-gradient(circle_at_88%_66%,rgba(255,255,255,0.9)_1.2px,transparent_1.4px),radial-gradient(circle_at_12%_70%,rgba(245,200,100,0.9)_1.1px,transparent_1.3px),radial-gradient(circle_at_55%_22%,rgba(255,255,255,0.85)_1.1px,transparent_1.3px),radial-gradient(circle_at_96%_40%,rgba(251,191,36,0.88)_1.2px,transparent_1.4px)]',
          soft && 'opacity-75',
        )}
      />
      <div
        className={cn(
          'absolute inset-0 [background-image:radial-gradient(circle_at_3%_12%,rgba(196,181,253,0.95)_1.1px,transparent_1.3px),radial-gradient(circle_at_11%_36%,rgba(255,255,255,0.9)_1px,transparent_1.2px),radial-gradient(circle_at_19%_64%,rgba(168,85,247,0.9)_1.1px,transparent_1.3px),radial-gradient(circle_at_27%_8%,rgba(255,255,255,0.88)_0.9px,transparent_1.1px),radial-gradient(circle_at_35%_48%,rgba(192,132,252,0.95)_1.2px,transparent_1.4px),radial-gradient(circle_at_43%_22%,rgba(168,85,247,0.88)_1px,transparent_1.2px),radial-gradient(circle_at_51%_62%,rgba(255,255,255,0.86)_1.1px,transparent_1.3px),radial-gradient(circle_at_59%_14%,rgba(196,181,253,0.9)_1.1px,transparent_1.3px),radial-gradient(circle_at_67%_78%,rgba(168,85,247,0.9)_1.1px,transparent_1.3px),radial-gradient(circle_at_75%_32%,rgba(255,255,255,0.9)_1px,transparent_1.2px),radial-gradient(circle_at_83%_6%,rgba(192,132,252,0.88)_1px,transparent_1.2px),radial-gradient(circle_at_91%_44%,rgba(196,181,253,0.95)_1.2px,transparent_1.4px),radial-gradient(circle_at_7%_88%,rgba(255,255,255,0.85)_0.9px,transparent_1.1px),radial-gradient(circle_at_31%_92%,rgba(168,85,247,0.9)_1.1px,transparent_1.3px),radial-gradient(circle_at_55%_96%,rgba(196,181,253,0.86)_1px,transparent_1.2px),radial-gradient(circle_at_78%_88%,rgba(255,255,255,0.88)_1.1px,transparent_1.3px),radial-gradient(circle_at_95%_72%,rgba(192,132,252,0.9)_1.1px,transparent_1.3px)] motion-safe:animate-[login-fairy-stars-c_4.8s_ease-in-out_infinite] motion-reduce:animate-none motion-reduce:opacity-35 dark:[background-image:radial-gradient(circle_at_3%_12%,rgba(252,211,77,0.95)_1.1px,transparent_1.3px),radial-gradient(circle_at_11%_36%,rgba(255,255,255,0.9)_1px,transparent_1.2px),radial-gradient(circle_at_19%_64%,rgba(251,191,36,0.9)_1.1px,transparent_1.3px),radial-gradient(circle_at_27%_8%,rgba(255,255,255,0.88)_0.9px,transparent_1.1px),radial-gradient(circle_at_35%_48%,rgba(245,200,100,0.95)_1.2px,transparent_1.4px),radial-gradient(circle_at_43%_22%,rgba(251,191,36,0.88)_1px,transparent_1.2px),radial-gradient(circle_at_51%_62%,rgba(255,255,255,0.86)_1.1px,transparent_1.3px),radial-gradient(circle_at_59%_14%,rgba(245,200,100,0.9)_1.1px,transparent_1.3px),radial-gradient(circle_at_67%_78%,rgba(251,191,36,0.9)_1.1px,transparent_1.3px),radial-gradient(circle_at_75%_32%,rgba(255,255,255,0.9)_1px,transparent_1.2px),radial-gradient(circle_at_83%_6%,rgba(245,200,100,0.88)_1px,transparent_1.2px),radial-gradient(circle_at_91%_44%,rgba(252,211,77,0.95)_1.2px,transparent_1.4px),radial-gradient(circle_at_7%_88%,rgba(255,255,255,0.85)_0.9px,transparent_1.1px),radial-gradient(circle_at_31%_92%,rgba(251,191,36,0.9)_1.1px,transparent_1.3px),radial-gradient(circle_at_55%_96%,rgba(245,200,100,0.86)_1px,transparent_1.2px),radial-gradient(circle_at_78%_88%,rgba(255,255,255,0.88)_1.1px,transparent_1.3px),radial-gradient(circle_at_95%_72%,rgba(251,191,36,0.9)_1.1px,transparent_1.3px)]',
          soft && 'opacity-80',
        )}
      />
      {rich ? (
        <>
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.48] motion-safe:animate-[login-fairy-stars-b_5.4s_ease-in-out_infinite] motion-reduce:animate-none motion-reduce:opacity-25 dark:opacity-[0.4] [background-image:radial-gradient(circle_at_8%_18%,rgba(196,181,253,0.88)_1px,transparent_1.2px),radial-gradient(circle_at_22%_44%,rgba(255,255,255,0.82)_0.9px,transparent_1.1px),radial-gradient(circle_at_41%_12%,rgba(168,85,247,0.86)_1px,transparent_1.2px),radial-gradient(circle_at_58%_36%,rgba(255,255,255,0.78)_0.85px,transparent_1.05px),radial-gradient(circle_at_74%_8%,rgba(192,132,252,0.9)_1.05px,transparent_1.25px),radial-gradient(circle_at_88%_52%,rgba(168,85,247,0.84)_1px,transparent_1.2px),radial-gradient(circle_at_14%_72%,rgba(255,255,255,0.76)_0.85px,transparent_1.05px),radial-gradient(circle_at_33%_88%,rgba(196,181,253,0.86)_1px,transparent_1.2px),radial-gradient(circle_at_52%_64%,rgba(168,85,247,0.88)_1px,transparent_1.2px),radial-gradient(circle_at_69%_82%,rgba(255,255,255,0.82)_0.9px,transparent_1.1px),radial-gradient(circle_at_91%_76%,rgba(192,132,252,0.85)_1px,transparent_1.2px),radial-gradient(circle_at_6%_54%,rgba(168,85,247,0.82)_0.95px,transparent_1.15px),radial-gradient(circle_at_96%_28%,rgba(255,255,255,0.84)_0.9px,transparent_1.1px)] dark:[background-image:radial-gradient(circle_at_8%_18%,rgba(252,211,77,0.86)_1px,transparent_1.2px),radial-gradient(circle_at_22%_44%,rgba(255,255,255,0.82)_0.9px,transparent_1.1px),radial-gradient(circle_at_41%_12%,rgba(251,191,36,0.84)_1px,transparent_1.2px),radial-gradient(circle_at_58%_36%,rgba(255,255,255,0.76)_0.85px,transparent_1.05px),radial-gradient(circle_at_74%_8%,rgba(245,200,100,0.88)_1.05px,transparent_1.25px),radial-gradient(circle_at_88%_52%,rgba(251,191,36,0.82)_1px,transparent_1.2px),radial-gradient(circle_at_14%_72%,rgba(255,255,255,0.74)_0.85px,transparent_1.05px),radial-gradient(circle_at_33%_88%,rgba(252,211,77,0.84)_1px,transparent_1.2px),radial-gradient(circle_at_52%_64%,rgba(251,191,36,0.86)_1px,transparent_1.2px),radial-gradient(circle_at_69%_82%,rgba(255,255,255,0.8)_0.9px,transparent_1.1px),radial-gradient(circle_at_91%_76%,rgba(245,200,100,0.83)_1px,transparent_1.2px),radial-gradient(circle_at_6%_54%,rgba(251,191,36,0.8)_0.95px,transparent_1.15px),radial-gradient(circle_at_96%_28%,rgba(255,255,255,0.82)_0.9px,transparent_1.1px)]"
            aria-hidden
          />
          <div
            className="absolute bottom-[4%] right-[2%] h-[min(46vh,28rem)] w-[min(36vw,24rem)] min-w-52 opacity-95 motion-safe:animate-[login-fairy-stars-a_6.9s_ease-in-out_infinite] [background-image:radial-gradient(circle_at_18%_22%,rgba(168,85,247,0.96)_1.5px,transparent_1.7px),radial-gradient(circle_at_42%_12%,rgba(255,255,255,0.92)_1.2px,transparent_1.4px),radial-gradient(circle_at_68%_28%,rgba(192,132,252,0.94)_1.4px,transparent_1.6px),radial-gradient(circle_at_88%_18%,rgba(168,85,247,0.9)_1.3px,transparent_1.5px),radial-gradient(circle_at_12%_58%,rgba(255,255,255,0.86)_1.1px,transparent_1.3px),radial-gradient(circle_at_38%_72%,rgba(196,181,253,0.92)_1.2px,transparent_1.4px),radial-gradient(circle_at_58%_88%,rgba(168,85,247,0.88)_1.2px,transparent_1.4px),radial-gradient(circle_at_82%_62%,rgba(255,255,255,0.84)_1.1px,transparent_1.3px),radial-gradient(circle_at_6%_88%,rgba(192,132,252,0.9)_1.2px,transparent_1.4px),radial-gradient(circle_at_94%_44%,rgba(168,85,247,0.87)_1.1px,transparent_1.3px)] dark:[background-image:radial-gradient(circle_at_18%_22%,rgba(251,191,36,0.95)_1.5px,transparent_1.7px),radial-gradient(circle_at_42%_12%,rgba(255,255,255,0.92)_1.2px,transparent_1.4px),radial-gradient(circle_at_68%_28%,rgba(245,200,100,0.93)_1.4px,transparent_1.6px),radial-gradient(circle_at_88%_18%,rgba(251,191,36,0.9)_1.3px,transparent_1.5px),radial-gradient(circle_at_12%_58%,rgba(255,255,255,0.86)_1.1px,transparent_1.3px),radial-gradient(circle_at_38%_72%,rgba(252,211,77,0.91)_1.2px,transparent_1.4px),radial-gradient(circle_at_58%_88%,rgba(251,191,36,0.88)_1.2px,transparent_1.4px),radial-gradient(circle_at_82%_62%,rgba(255,255,255,0.84)_1.1px,transparent_1.3px),radial-gradient(circle_at_6%_88%,rgba(245,200,100,0.89)_1.2px,transparent_1.4px),radial-gradient(circle_at_94%_44%,rgba(251,191,36,0.86)_1.1px,transparent_1.3px)]"
            aria-hidden
          />
          <div
            className="absolute left-[2%] top-[40%] h-[min(40vh,22rem)] w-[min(26vw,16rem)] min-w-44 opacity-90 motion-safe:animate-[login-fairy-stars-b_7.8s_ease-in-out_infinite] [background-image:radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.9)_1.1px,transparent_1.3px),radial-gradient(circle_at_48%_32%,rgba(168,85,247,0.92)_1.2px,transparent_1.4px),radial-gradient(circle_at_72%_12%,rgba(192,132,252,0.9)_1.15px,transparent_1.35px),radial-gradient(circle_at_12%_62%,rgba(168,85,247,0.88)_1.1px,transparent_1.3px),radial-gradient(circle_at_58%_72%,rgba(255,255,255,0.82)_1px,transparent_1.2px),radial-gradient(circle_at_86%_58%,rgba(196,181,253,0.9)_1.1px,transparent_1.3px),radial-gradient(circle_at_38%_88%,rgba(168,85,247,0.86)_1.05px,transparent_1.25px),radial-gradient(circle_at_8%_42%,rgba(192,132,252,0.88)_1.1px,transparent_1.3px)] dark:[background-image:radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.9)_1.1px,transparent_1.3px),radial-gradient(circle_at_48%_32%,rgba(251,191,36,0.91)_1.2px,transparent_1.4px),radial-gradient(circle_at_72%_12%,rgba(245,200,100,0.89)_1.15px,transparent_1.35px),radial-gradient(circle_at_12%_62%,rgba(251,191,36,0.87)_1.1px,transparent_1.3px),radial-gradient(circle_at_58%_72%,rgba(255,255,255,0.82)_1px,transparent_1.2px),radial-gradient(circle_at_86%_58%,rgba(252,211,77,0.89)_1.1px,transparent_1.3px),radial-gradient(circle_at_38%_88%,rgba(251,191,36,0.85)_1.05px,transparent_1.25px),radial-gradient(circle_at_8%_42%,rgba(245,200,100,0.87)_1.1px,transparent_1.3px)]"
            aria-hidden
          />
        </>
      ) : null}
      <div className={c1Frame}>
        <svg
          viewBox="0 0 220 220"
          className="h-full w-full text-violet-500/90 drop-shadow-[0_0_20px_rgba(168,85,247,0.78)] motion-safe:animate-[login-constellation-fade_4.2s_ease-in-out_infinite] dark:text-amber-300/95 dark:drop-shadow-[0_0_24px_rgba(251,191,36,0.8)]"
        >
          <path
            d="M30 150 70 92 118 116 164 58 192 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
            className="motion-safe:animate-[login-constellation-stroke_3.2s_ease-in-out_infinite] motion-reduce:opacity-60"
          />
          <circle cx="30" cy="150" r="3" fill="currentColor" />
          <circle cx="70" cy="92" r="2.5" fill="currentColor" />
          <circle cx="118" cy="116" r="2.5" fill="currentColor" />
          <circle cx="164" cy="58" r="3" fill="currentColor" />
          <circle cx="192" cy="100" r="2.5" fill="currentColor" />
        </svg>
      </div>
      <div className={c2Frame} style={{ animationDelay: '0.4s' }}>
        <svg
          viewBox="0 0 240 240"
          className="h-full w-full text-violet-500/88 drop-shadow-[0_0_22px_rgba(168,85,247,0.75)] motion-safe:animate-[login-constellation-fade_4.6s_ease-in-out_infinite] dark:text-amber-300/92 dark:drop-shadow-[0_0_24px_rgba(251,191,36,0.75)]"
        >
          <path
            d="M46 68 92 44 138 76 178 42 204 96 166 148 112 130 78 178"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
            className="motion-safe:animate-[login-constellation-stroke_3.6s_ease-in-out_infinite] [animation-delay:200ms] motion-reduce:animate-none motion-reduce:opacity-55"
          />
          <circle cx="46" cy="68" r="2.5" fill="currentColor" />
          <circle cx="92" cy="44" r="3" fill="currentColor" />
          <circle cx="138" cy="76" r="2.5" fill="currentColor" />
          <circle cx="178" cy="42" r="3" fill="currentColor" />
          <circle cx="204" cy="96" r="2.5" fill="currentColor" />
          <circle cx="166" cy="148" r="2.5" fill="currentColor" />
          <circle cx="112" cy="130" r="3" fill="currentColor" />
          <circle cx="78" cy="178" r="2.5" fill="currentColor" />
        </svg>
      </div>
      <div className={c3Frame}>
        <svg
          viewBox="0 0 200 200"
          className="h-full w-full text-fuchsia-400/85 drop-shadow-[0_0_18px_rgba(192,132,252,0.7)] motion-safe:animate-[login-constellation-fade_3.8s_ease-in-out_infinite] dark:text-amber-200/90 dark:drop-shadow-[0_0_20px_rgba(251,191,36,0.72)]"
        >
          <path
            d="M20 120 64 80 100 100 150 50 180 90 140 150 88 130 42 170"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            className="motion-safe:animate-[login-constellation-stroke_2.8s_ease-in-out_infinite] [animation-delay:120ms] motion-reduce:animate-none motion-reduce:opacity-50"
          />
          <circle cx="20" cy="120" r="2.5" fill="currentColor" />
          <circle cx="64" cy="80" r="2" fill="currentColor" />
          <circle cx="100" cy="100" r="2.5" fill="currentColor" />
          <circle cx="150" cy="50" r="2.5" fill="currentColor" />
          <circle cx="180" cy="90" r="2" fill="currentColor" />
          <circle cx="140" cy="150" r="2.5" fill="currentColor" />
          <circle cx="88" cy="130" r="2" fill="currentColor" />
        </svg>
      </div>

      {rich ? (
        <>
          <div
            className="absolute left-[34%] top-[1%] z-0 block h-36 w-36 opacity-88 motion-safe:animate-[marketing-float-soft_6.5s_ease-in-out_infinite] sm:h-44 sm:w-44 md:left-[40%]"
            style={{ animationDelay: '0.2s' }}
          >
            <svg
              viewBox="0 0 200 200"
              className="h-full w-full text-violet-500/82 drop-shadow-[0_0_16px_rgba(168,85,247,0.65)] motion-safe:animate-[login-constellation-fade_3.6s_ease-in-out_infinite] dark:text-amber-300/88 dark:drop-shadow-[0_0_18px_rgba(251,191,36,0.68)]"
            >
              <path
                d="M100 28 132 88 196 96 148 140 158 196 100 168 42 196 52 140 4 96 68 88 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
                className="motion-safe:animate-[login-constellation-stroke_3s_ease-in-out_infinite] motion-reduce:opacity-55"
              />
              <circle cx="100" cy="28" r="2.5" fill="currentColor" />
              <circle cx="132" cy="88" r="2" fill="currentColor" />
              <circle cx="196" cy="96" r="2.5" fill="currentColor" />
              <circle cx="148" cy="140" r="2" fill="currentColor" />
              <circle cx="158" cy="196" r="2.5" fill="currentColor" />
              <circle cx="100" cy="168" r="2" fill="currentColor" />
              <circle cx="42" cy="196" r="2.5" fill="currentColor" />
              <circle cx="52" cy="140" r="2" fill="currentColor" />
              <circle cx="4" cy="96" r="2" fill="currentColor" />
              <circle cx="68" cy="88" r="2.5" fill="currentColor" />
            </svg>
          </div>
          <div
            className="absolute bottom-[8%] right-[5%] z-0 block h-40 w-40 opacity-86 motion-safe:animate-[marketing-float-soft_8.2s_ease-in-out_infinite] sm:h-52 sm:w-52 md:h-60 md:w-60"
            style={{ animationDelay: '0.55s' }}
          >
            <svg
              viewBox="0 0 220 220"
              className="h-full w-full text-fuchsia-400/80 drop-shadow-[0_0_18px_rgba(192,132,252,0.62)] motion-safe:animate-[login-constellation-fade_4s_ease-in-out_infinite] dark:text-amber-200/88 dark:drop-shadow-[0_0_20px_rgba(251,191,36,0.65)]"
            >
              <path
                d="M40 170 88 120 54 70 120 48 176 78 188 134 140 180 96 158 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                className="motion-safe:animate-[login-constellation-stroke_3.4s_ease-in-out_infinite] [animation-delay:100ms] motion-reduce:opacity-50"
              />
              <circle cx="40" cy="170" r="2.5" fill="currentColor" />
              <circle cx="88" cy="120" r="2" fill="currentColor" />
              <circle cx="54" cy="70" r="2.5" fill="currentColor" />
              <circle cx="120" cy="48" r="3" fill="currentColor" />
              <circle cx="176" cy="78" r="2.5" fill="currentColor" />
              <circle cx="188" cy="134" r="2" fill="currentColor" />
              <circle cx="140" cy="180" r="2.5" fill="currentColor" />
              <circle cx="96" cy="158" r="2" fill="currentColor" />
            </svg>
          </div>
          <div
            className="absolute left-[6%] top-[48%] z-0 hidden h-44 w-44 opacity-84 motion-safe:animate-[marketing-float-soft_7.6s_ease-in-out_infinite] md:block"
            style={{ animationDelay: '0.3s' }}
          >
            <svg
              viewBox="0 0 180 180"
              className="h-full w-full text-violet-500/78 drop-shadow-[0_0_14px_rgba(168,85,247,0.55)] motion-safe:animate-[login-constellation-fade_4.4s_ease-in-out_infinite] dark:text-amber-300/85 dark:drop-shadow-[0_0_16px_rgba(251,191,36,0.6)]"
            >
              <path
                d="M24 96 56 36 120 52 148 112 96 156 40 132 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                className="motion-safe:animate-[login-constellation-stroke_2.9s_ease-in-out_infinite] motion-reduce:opacity-48"
              />
              <circle cx="24" cy="96" r="2.5" fill="currentColor" />
              <circle cx="56" cy="36" r="2.5" fill="currentColor" />
              <circle cx="120" cy="52" r="2" fill="currentColor" />
              <circle cx="148" cy="112" r="2.5" fill="currentColor" />
              <circle cx="96" cy="156" r="2" fill="currentColor" />
              <circle cx="40" cy="132" r="2.5" fill="currentColor" />
            </svg>
          </div>
          <div
            className="absolute bottom-[22%] right-[28%] z-0 hidden h-40 w-40 opacity-80 motion-safe:animate-[marketing-float-soft_9s_ease-in-out_infinite] lg:block"
            style={{ animationDelay: '0.15s' }}
          >
            <svg
              viewBox="0 0 160 160"
              className="h-full w-full text-violet-400/75 drop-shadow-[0_0_12px_rgba(167,139,250,0.5)] motion-safe:animate-[login-constellation-fade_3.5s_ease-in-out_infinite] dark:text-amber-200/82 dark:drop-shadow-[0_0_14px_rgba(251,191,36,0.55)]"
            >
              <path
                d="M80 16 120 56 104 112 56 124 24 80 48 40 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.15"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="motion-safe:animate-[login-constellation-stroke_3.1s_ease-in-out_infinite] [animation-delay:180ms] motion-reduce:opacity-45"
              />
              <circle cx="80" cy="16" r="2.5" fill="currentColor" />
              <circle cx="120" cy="56" r="2" fill="currentColor" />
              <circle cx="104" cy="112" r="2.5" fill="currentColor" />
              <circle cx="56" cy="124" r="2" fill="currentColor" />
              <circle cx="24" cy="80" r="2.5" fill="currentColor" />
              <circle cx="48" cy="40" r="2" fill="currentColor" />
            </svg>
          </div>
        </>
      ) : null}

      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {polarSlots.map((slot, i) => (
          <div
            key={`${slot.top}-${slot.left}-${i}`}
            className={cn(
              'login-polar-star absolute h-[min(0.609375rem,2.25vw)] w-[min(0.609375rem,2.25vw)] min-h-1.5 min-w-1.5 max-h-3 max-w-3',
              'text-violet-50/98 drop-shadow-[0_0_1px_rgba(255,255,255,0.95),0_0_8px_rgba(255,255,255,0.55),0_0_18px_rgba(196,181,253,0.99),0_0_36px_rgba(124,58,237,0.6)]',
              'dark:text-amber-50/98 dark:drop-shadow-[0_0_1px_rgba(255,250,235,0.95),0_0_10px_rgba(255,255,255,0.5),0_0_20px_rgba(253,230,138,0.98),0_0_40px_rgba(245,158,11,0.55)]',
              'will-change-[opacity] motion-reduce:opacity-45',
              slot.rotate,
              soft && 'scale-90 opacity-90',
            )}
            style={{
              top: slot.top,
              left: slot.left,
              animation: `login-polar-random ${slot.dur}s ease-in-out infinite`,
              animationDelay: `${slot.delay}s`,
            }}
          >
            <svg viewBox="0 0 100 100" className="h-full w-full" fill="currentColor">
              <path d="M50 0 L60 45 L100 50 L60 55 L50 100 L40 55 L0 50 L40 45 Z" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  )
}
