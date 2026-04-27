import { cn } from '@/lib/utils'

/**
 * Shared day/night scenic art + twinkling star layers + constellations (login / sign-up).
 */
export function AuthScenicBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <div
        className="login-scenic-bg absolute inset-0 bg-stone-100 dark:hidden"
        style={{ backgroundImage: "url('/publiclogin-bg-day.png.png')" }}
      />
      <div
        className="login-scenic-bg login-scenic-bg-night absolute inset-0 hidden bg-slate-950 dark:block"
        style={{ backgroundImage: "url('/publiclogin-bg-night.png.png')" }}
      />
      <div className="absolute left-[4%] top-[12%] h-[48vh] w-[28vw] min-w-56 [background-image:radial-gradient(circle_at_12%_18%,rgba(168,85,247,1)_1.8px,transparent_2px),radial-gradient(circle_at_30%_12%,rgba(255,255,255,0.98)_1.4px,transparent_1.6px),radial-gradient(circle_at_52%_30%,rgba(192,132,252,0.95)_1.5px,transparent_1.7px),radial-gradient(circle_at_72%_16%,rgba(168,85,247,0.98)_1.6px,transparent_1.8px),radial-gradient(circle_at_86%_34%,rgba(255,255,255,0.92)_1.4px,transparent_1.6px),radial-gradient(circle_at_18%_58%,rgba(192,132,252,0.96)_1.5px,transparent_1.7px),radial-gradient(circle_at_36%_78%,rgba(255,255,255,0.86)_1.2px,transparent_1.4px),radial-gradient(circle_at_64%_54%,rgba(168,85,247,0.9)_1.3px,transparent_1.5px),radial-gradient(circle_at_80%_66%,rgba(168,85,247,0.92)_1.5px,transparent_1.7px),radial-gradient(circle_at_48%_90%,rgba(255,255,255,0.86)_1.2px,transparent_1.4px),radial-gradient(circle_at_92%_82%,rgba(192,132,252,0.88)_1.2px,transparent_1.4px),radial-gradient(circle_at_6%_8%,rgba(196,181,253,0.95)_1.3px,transparent_1.5px),radial-gradient(circle_at_24%_4%,rgba(255,255,255,0.9)_1.2px,transparent_1.4px),radial-gradient(circle_at_44%_20%,rgba(168,85,247,0.9)_1.4px,transparent_1.6px),radial-gradient(circle_at_60%_8%,rgba(255,255,255,0.88)_1.1px,transparent_1.3px),radial-gradient(circle_at_78%_44%,rgba(192,132,252,0.98)_1.5px,transparent_1.7px),radial-gradient(circle_at_95%_48%,rgba(168,85,247,0.88)_1.2px,transparent_1.4px)] motion-safe:animate-[login-fairy-stars-a_6.2s_ease-in-out_infinite] dark:[background-image:radial-gradient(circle_at_12%_18%,rgba(251,191,36,1)_1.8px,transparent_2px),radial-gradient(circle_at_30%_12%,rgba(255,255,255,0.98)_1.4px,transparent_1.6px),radial-gradient(circle_at_52%_30%,rgba(251,191,36,0.95)_1.5px,transparent_1.7px),radial-gradient(circle_at_72%_16%,rgba(251,191,36,0.98)_1.6px,transparent_1.8px),radial-gradient(circle_at_86%_34%,rgba(255,255,255,0.92)_1.4px,transparent_1.6px),radial-gradient(circle_at_18%_58%,rgba(251,191,36,0.96)_1.5px,transparent_1.7px),radial-gradient(circle_at_36%_78%,rgba(255,255,255,0.86)_1.2px,transparent_1.4px),radial-gradient(circle_at_64%_54%,rgba(251,191,36,0.9)_1.3px,transparent_1.5px),radial-gradient(circle_at_80%_66%,rgba(251,191,36,0.92)_1.5px,transparent_1.7px),radial-gradient(circle_at_48%_90%,rgba(255,255,255,0.86)_1.2px,transparent_1.4px),radial-gradient(circle_at_92%_82%,rgba(251,191,36,0.88)_1.2px,transparent_1.4px),radial-gradient(circle_at_6%_8%,rgba(252,211,77,0.95)_1.3px,transparent_1.5px),radial-gradient(circle_at_24%_4%,rgba(255,255,255,0.9)_1.2px,transparent_1.4px),radial-gradient(circle_at_44%_20%,rgba(251,191,36,0.9)_1.4px,transparent_1.6px),radial-gradient(circle_at_60%_8%,rgba(255,255,255,0.88)_1.1px,transparent_1.3px),radial-gradient(circle_at_78%_44%,rgba(251,191,36,0.98)_1.5px,transparent_1.7px),radial-gradient(circle_at_95%_48%,rgba(245,200,100,0.9)_1.2px,transparent_1.4px)]" />
      <div className="absolute right-[4%] top-[10%] h-[50vh] w-[30vw] min-w-60 [background-image:radial-gradient(circle_at_14%_28%,rgba(168,85,247,1)_1.7px,transparent_1.9px),radial-gradient(circle_at_38%_10%,rgba(255,255,255,0.98)_1.4px,transparent_1.6px),radial-gradient(circle_at_58%_34%,rgba(255,255,255,0.9)_1.2px,transparent_1.4px),radial-gradient(circle_at_78%_20%,rgba(192,132,252,0.98)_1.6px,transparent_1.8px),radial-gradient(circle_at_90%_56%,rgba(255,255,255,0.94)_1.4px,transparent_1.6px),radial-gradient(circle_at_30%_74%,rgba(168,85,247,0.95)_1.5px,transparent_1.7px),radial-gradient(circle_at_50%_88%,rgba(255,255,255,0.84)_1.2px,transparent_1.4px),radial-gradient(circle_at_18%_88%,rgba(192,132,252,0.85)_1.2px,transparent_1.4px),radial-gradient(circle_at_68%_82%,rgba(168,85,247,0.92)_1.5px,transparent_1.7px),radial-gradient(circle_at_94%_18%,rgba(255,255,255,0.82)_1.1px,transparent_1.3px),radial-gradient(circle_at_4%_50%,rgba(196,181,253,0.9)_1.2px,transparent_1.4px),radial-gradient(circle_at_22%_40%,rgba(255,255,255,0.88)_1.1px,transparent_1.3px),radial-gradient(circle_at_46%_62%,rgba(168,85,247,0.88)_1.3px,transparent_1.5px),radial-gradient(circle_at_72%_6%,rgba(255,255,255,0.9)_1.2px,transparent_1.4px),radial-gradient(circle_at_88%_70%,rgba(192,132,252,0.95)_1.4px,transparent_1.6px)] motion-safe:animate-[login-fairy-stars-b_7.4s_ease-in-out_infinite] dark:[background-image:radial-gradient(circle_at_14%_28%,rgba(251,191,36,1)_1.7px,transparent_1.9px),radial-gradient(circle_at_38%_10%,rgba(255,255,255,0.98)_1.4px,transparent_1.6px),radial-gradient(circle_at_58%_34%,rgba(255,255,255,0.9)_1.2px,transparent_1.4px),radial-gradient(circle_at_78%_20%,rgba(251,191,36,0.98)_1.6px,transparent_1.8px),radial-gradient(circle_at_90%_56%,rgba(255,255,255,0.94)_1.4px,transparent_1.6px),radial-gradient(circle_at_30%_74%,rgba(251,191,36,0.95)_1.5px,transparent_1.7px),radial-gradient(circle_at_50%_88%,rgba(255,255,255,0.84)_1.2px,transparent_1.4px),radial-gradient(circle_at_18%_88%,rgba(251,191,36,0.85)_1.2px,transparent_1.4px),radial-gradient(circle_at_68%_82%,rgba(251,191,36,0.92)_1.5px,transparent_1.7px),radial-gradient(circle_at_94%_18%,rgba(255,255,255,0.82)_1.1px,transparent_1.3px),radial-gradient(circle_at_4%_50%,rgba(252,211,77,0.9)_1.2px,transparent_1.4px),radial-gradient(circle_at_22%_40%,rgba(255,255,255,0.88)_1.1px,transparent_1.3px),radial-gradient(circle_at_46%_62%,rgba(251,191,36,0.88)_1.3px,transparent_1.5px),radial-gradient(circle_at_72%_6%,rgba(255,255,255,0.9)_1.2px,transparent_1.4px),radial-gradient(circle_at_88%_70%,rgba(245,200,100,0.95)_1.4px,transparent_1.6px)]" />
      <div className="absolute inset-x-[16%] top-[6%] h-32 [background-image:radial-gradient(circle_at_8%_46%,rgba(168,85,247,0.98)_1.4px,transparent_1.6px),radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.88)_1.2px,transparent_1.4px),radial-gradient(circle_at_44%_54%,rgba(192,132,252,0.82)_1.1px,transparent_1.3px),radial-gradient(circle_at_68%_34%,rgba(168,85,247,0.9)_1.3px,transparent_1.5px),radial-gradient(circle_at_88%_66%,rgba(255,255,255,0.9)_1.2px,transparent_1.4px),radial-gradient(circle_at_12%_70%,rgba(196,181,253,0.9)_1.1px,transparent_1.3px),radial-gradient(circle_at_55%_22%,rgba(255,255,255,0.85)_1.1px,transparent_1.3px),radial-gradient(circle_at_96%_40%,rgba(168,85,247,0.88)_1.2px,transparent_1.4px)] motion-safe:animate-[login-fairy-stars-a_8s_ease-in-out_infinite] dark:[background-image:radial-gradient(circle_at_8%_46%,rgba(251,191,36,0.98)_1.4px,transparent_1.6px),radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.88)_1.2px,transparent_1.4px),radial-gradient(circle_at_44%_54%,rgba(251,191,36,0.82)_1.1px,transparent_1.3px),radial-gradient(circle_at_68%_34%,rgba(251,191,36,0.9)_1.3px,transparent_1.5px),radial-gradient(circle_at_88%_66%,rgba(255,255,255,0.9)_1.2px,transparent_1.4px),radial-gradient(circle_at_12%_70%,rgba(245,200,100,0.9)_1.1px,transparent_1.3px),radial-gradient(circle_at_55%_22%,rgba(255,255,255,0.85)_1.1px,transparent_1.3px),radial-gradient(circle_at_96%_40%,rgba(251,191,36,0.88)_1.2px,transparent_1.4px)]" />
      {/* ~50% extra field stars + quick twinkle (day & night) */}
      <div
        className="absolute inset-0 [background-image:radial-gradient(circle_at_3%_12%,rgba(196,181,253,0.95)_1.1px,transparent_1.3px),radial-gradient(circle_at_11%_36%,rgba(255,255,255,0.9)_1px,transparent_1.2px),radial-gradient(circle_at_19%_64%,rgba(168,85,247,0.9)_1.1px,transparent_1.3px),radial-gradient(circle_at_27%_8%,rgba(255,255,255,0.88)_0.9px,transparent_1.1px),radial-gradient(circle_at_35%_48%,rgba(192,132,252,0.95)_1.2px,transparent_1.4px),radial-gradient(circle_at_43%_22%,rgba(168,85,247,0.88)_1px,transparent_1.2px),radial-gradient(circle_at_51%_62%,rgba(255,255,255,0.86)_1.1px,transparent_1.3px),radial-gradient(circle_at_59%_14%,rgba(196,181,253,0.9)_1.1px,transparent_1.3px),radial-gradient(circle_at_67%_78%,rgba(168,85,247,0.9)_1.1px,transparent_1.3px),radial-gradient(circle_at_75%_32%,rgba(255,255,255,0.9)_1px,transparent_1.2px),radial-gradient(circle_at_83%_6%,rgba(192,132,252,0.88)_1px,transparent_1.2px),radial-gradient(circle_at_91%_44%,rgba(196,181,253,0.95)_1.2px,transparent_1.4px),radial-gradient(circle_at_7%_88%,rgba(255,255,255,0.85)_0.9px,transparent_1.1px),radial-gradient(circle_at_31%_92%,rgba(168,85,247,0.9)_1.1px,transparent_1.3px),radial-gradient(circle_at_55%_96%,rgba(196,181,253,0.86)_1px,transparent_1.2px),radial-gradient(circle_at_78%_88%,rgba(255,255,255,0.88)_1.1px,transparent_1.3px),radial-gradient(circle_at_95%_72%,rgba(192,132,252,0.9)_1.1px,transparent_1.3px)] motion-safe:animate-[login-fairy-stars-c_4.8s_ease-in-out_infinite] motion-reduce:animate-none motion-reduce:opacity-35 dark:[background-image:radial-gradient(circle_at_3%_12%,rgba(252,211,77,0.95)_1.1px,transparent_1.3px),radial-gradient(circle_at_11%_36%,rgba(255,255,255,0.9)_1px,transparent_1.2px),radial-gradient(circle_at_19%_64%,rgba(251,191,36,0.9)_1.1px,transparent_1.3px),radial-gradient(circle_at_27%_8%,rgba(255,255,255,0.88)_0.9px,transparent_1.1px),radial-gradient(circle_at_35%_48%,rgba(245,200,100,0.95)_1.2px,transparent_1.4px),radial-gradient(circle_at_43%_22%,rgba(251,191,36,0.88)_1px,transparent_1.2px),radial-gradient(circle_at_51%_62%,rgba(255,255,255,0.86)_1.1px,transparent_1.3px),radial-gradient(circle_at_59%_14%,rgba(245,200,100,0.9)_1.1px,transparent_1.3px),radial-gradient(circle_at_67%_78%,rgba(251,191,36,0.9)_1.1px,transparent_1.3px),radial-gradient(circle_at_75%_32%,rgba(255,255,255,0.9)_1px,transparent_1.2px),radial-gradient(circle_at_83%_6%,rgba(245,200,100,0.88)_1px,transparent_1.2px),radial-gradient(circle_at_91%_44%,rgba(252,211,77,0.95)_1.2px,transparent_1.4px),radial-gradient(circle_at_7%_88%,rgba(255,255,255,0.85)_0.9px,transparent_1.1px),radial-gradient(circle_at_31%_92%,rgba(251,191,36,0.9)_1.1px,transparent_1.3px),radial-gradient(circle_at_55%_96%,rgba(245,200,100,0.86)_1px,transparent_1.2px),radial-gradient(circle_at_78%_88%,rgba(255,255,255,0.88)_1.1px,transparent_1.3px),radial-gradient(circle_at_95%_72%,rgba(251,191,36,0.9)_1.1px,transparent_1.3px)]"
        aria-hidden
      />
      <div className="absolute left-[4%] top-[24%] hidden h-72 w-72 min-h-[10rem] min-w-[10rem] max-h-[40vh] max-w-[40vw] opacity-95 motion-safe:animate-[marketing-float-soft_7s_ease-in-out_infinite] sm:block">
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
      <div
        className="absolute right-[4%] top-[14%] hidden h-80 w-80 min-h-[11rem] min-w-[11rem] max-h-[44vh] max-w-[44vw] opacity-90 motion-safe:animate-[marketing-float-soft_8s_ease-in-out_infinite] sm:block"
        style={{ animationDelay: '0.4s' }}
      >
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
      <div className="absolute bottom-[10%] left-[2%] hidden h-56 w-56 min-h-[9rem] min-w-[9rem] max-h-[32vh] max-w-[36vw] opacity-88 motion-safe:animate-[marketing-float-soft_9s_ease-in-out_infinite] sm:block">
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

      {/* 4-point polar stars — random-ish placement; come/go via login-polar-random + varied duration/delay */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {(
          [
            { top: '8%', left: '14%', rotate: '-rotate-12', dur: 12.2, delay: -1.2 },
            { top: '22%', left: '62%', rotate: 'rotate-9', dur: 9.1, delay: -3.1 },
            { top: '38%', left: '7%', rotate: 'rotate-6', dur: 11.4, delay: -0.4 },
            { top: '44%', left: '78%', rotate: '-rotate-3', dur: 14.0, delay: -4.2 },
            { top: '58%', left: '35%', rotate: 'rotate-15', dur: 9.6, delay: -2.0 },
            { top: '72%', left: '18%', rotate: '-rotate-8', dur: 10.2, delay: -5.5 },
            { top: '16%', left: '42%', rotate: 'rotate-3', dur: 12.5, delay: -0.8 },
            { top: '66%', left: '58%', rotate: '-rotate-14', dur: 8.0, delay: -1.7 },
          ] as const
        ).map((slot, i) => (
          <div
            key={i}
            className={cn(
              'login-polar-star absolute h-[min(0.609375rem,2.25vw)] w-[min(0.609375rem,2.25vw)] min-h-1.5 min-w-1.5 max-h-3 max-w-3',
              'text-violet-50/98 drop-shadow-[0_0_1px_rgba(255,255,255,0.95),0_0_8px_rgba(255,255,255,0.55),0_0_18px_rgba(196,181,253,0.99),0_0_36px_rgba(124,58,237,0.6)]',
              'dark:text-amber-50/98 dark:drop-shadow-[0_0_1px_rgba(255,250,235,0.95),0_0_10px_rgba(255,255,255,0.5),0_0_20px_rgba(253,230,138,0.98),0_0_40px_rgba(245,158,11,0.55)]',
              'will-change-[opacity] motion-reduce:opacity-45',
              slot.rotate,
            )}
            style={{
              top: slot.top,
              left: slot.left,
              animation: `login-polar-random ${slot.dur}s ease-in-out infinite`,
              animationDelay: `${slot.delay}s`,
            }}
          >
            <svg viewBox="0 0 100 100" className="h-full w-full" fill="currentColor">
              {/* Four long points: inner shoulders pulled toward center so rays read longer & sharper */}
              <path d="M50 0 L60 45 L100 50 L60 55 L50 100 L40 55 L0 50 L40 45 Z" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  )
}
