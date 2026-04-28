/**
 * Clip / fan-market storefronts surfaced on the ManyVids Focus add-on row (billing estimate).
 * Logos live in `/public` (except ManyVids — UI uses a monogram until a brand asset ships).
 */
export const CLIP_FOCUS_ADDON_CAROUSEL = [
  { id: 'manyvids', label: 'ManyVids', logoSrc: null },
  { id: 'clips4sale', label: 'Clips4Sale', logoSrc: '/clips4sale-logo.png' },
  { id: 'fanvue', label: 'Fanvue', logoSrc: '/fanvue-logo.png' },
  { id: 'loyalfans', label: 'Loyalfans', logoSrc: '/loyalfans-logo.svg' },
  { id: 'mym', label: 'MYM', logoSrc: '/mym-logo.png' },
] as const

export type ClipFocusAddonCarouselItem = (typeof CLIP_FOCUS_ADDON_CAROUSEL)[number]
