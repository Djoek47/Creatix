import type { BrandProfileV1 } from '@/lib/brand/brand-profile-types'

function list(items: string[], emptyLabel = 'None set'): string {
  if (!items.length) return `- ${emptyLabel}`
  return items.map((item) => `- ${item}`).join('\n')
}

export function renderBrandMarkdown(profile: BrandProfileV1): string {
  const logos =
    profile.logos.length > 0
      ? profile.logos
          .map(
            (logo) =>
              `- ${logo.label} (${logo.kind})\n  - URL: ${logo.url}\n  - Min size: ${logo.minSizePx ?? 64}px\n  - Clearspace: ${logo.clearspacePx ?? 16}px`,
          )
          .join('\n')
      : '- No logos uploaded yet.'

  const handles =
    Object.keys(profile.socialHandles).length > 0
      ? Object.entries(profile.socialHandles)
          .map(([platform, handle]) => `- ${platform}: ${handle}`)
          .join('\n')
      : '- No social handles configured.'

  const now = profile.updatedAt || new Date().toISOString()

  return `# Brand Uniformity — design.md

Generated: ${now}
Schema: BrandProfileV1

## 1) Brand identity
- Name: ${profile.brandName || 'Untitled brand'}
- Tagline: ${profile.tagline || 'Not set'}
- Audience: ${profile.audience || 'Not set'}

## 2) Voice and messaging
- Tone tags: ${profile.toneTags.join(', ')}

### Do say
${list(profile.doSay)}

### Do not say
${list(profile.dontSay)}

### Hard banned phrases
${list(profile.bannedPhrases)}

## 3) Visual system
### Palette
- Primary: ${profile.palette.primary}
- Secondary: ${profile.palette.secondary}
- Accent: ${profile.palette.accent}
- Background: ${profile.palette.background}
- Text: ${profile.palette.text}

### Typography
- Heading: ${profile.typography.heading}
- Body: ${profile.typography.body}
- Accent: ${profile.typography.accent || 'Not set'}

### Logos
${logos}

## 4) Social handles
${handles}

## 5) Watermark defaults
- Enabled: ${profile.watermarkDefaults.enabled ? 'Yes' : 'No'}
- Logo asset ID: ${profile.watermarkDefaults.logoAssetId || 'auto'}
- Placement: ${profile.watermarkDefaults.placement}
- Opacity: ${profile.watermarkDefaults.opacityPct}%
- Scale: ${profile.watermarkDefaults.scalePct}%
- Margin: ${profile.watermarkDefaults.marginPx}px
- Trace recipient prefix: ${profile.watermarkDefaults.traceRecipientPrefix}

## 6) Governance (beta)
- Use brand context for AI: ${profile.useBrandContextForAi ? 'On' : 'Off'}
- Enforcement mode: ${profile.governance.enforcementMode}
- Editors: ${(profile.governance.editorUserIds || []).join(', ') || 'Not set'}
- Approvers: ${(profile.governance.approverUserIds || []).join(', ') || 'Not set'}

## 7) Notes
${profile.notes || 'No notes yet.'}
`
}

