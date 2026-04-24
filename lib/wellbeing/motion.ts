export const sereneEase: [number, number, number, number] = [0.22, 1, 0.36, 1]

export const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: sereneEase },
}

export const slowAmbientTransition = {
  duration: 8,
  ease: 'linear' as const,
  repeat: Infinity,
  repeatType: 'reverse' as const,
}
