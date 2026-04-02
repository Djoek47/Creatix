import type { SupabaseClient } from '@supabase/supabase-js'

export interface DMCAClaimData {
  claimantName: string
  claimantEmail: string
  claimantAddress?: string
  claimantPhone?: string
  copyrightOwner: string
  infringingUrl: string
  originalContentUrl?: string
  contentDescription: string
  proofPaths?: string[]
  platform: string
  platformUsername: string
  leakAlertId?: string
}

export function generateDMCANotice(data: DMCAClaimData): string {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return `DMCA TAKEDOWN NOTICE

Date: ${date}

To Whom It May Concern,

I am writing to notify you of copyright infringement occurring on your platform/website.

CLAIMANT INFORMATION:
Name: ${data.claimantName}
Email: ${data.claimantEmail}
${data.claimantAddress ? `Address: ${data.claimantAddress}` : ''}
${data.claimantPhone ? `Phone: ${data.claimantPhone}` : ''}

COPYRIGHT OWNER:
${data.copyrightOwner}
Official Platform: ${data.platform === 'onlyfans' ? 'OnlyFans' : data.platform === 'fansly' ? 'Fansly' : data.platform}
Profile: ${data.platformUsername ? `@${data.platformUsername}` : 'N/A'}
${data.originalContentUrl ? `Original Content URL: ${data.originalContentUrl}` : ''}

INFRINGING MATERIAL:
URL of infringing content: ${data.infringingUrl}

DESCRIPTION OF COPYRIGHTED WORK:
${data.contentDescription}

STATEMENT OF GOOD FAITH:
I have a good faith belief that the use of the copyrighted material described above is not authorized by the copyright owner, its agent, or the law.

STATEMENT OF ACCURACY:
I swear, under penalty of perjury, that the information in this notification is accurate and that I am the copyright owner or am authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.

SIGNATURE:
${data.claimantName}

---
This notice is being sent pursuant to the Digital Millennium Copyright Act (17 U.S.C. § 512).
`
}

export async function insertDraftDmcaClaim(
  supabase: SupabaseClient,
  userId: string,
  claimData: DMCAClaimData,
): Promise<{ claimId: string | null; error: Error | null }> {
  const dmcaNotice = generateDMCANotice(claimData)
  const { data: savedClaim, error: saveError } = await supabase
    .from('dmca_claims')
    .insert({
      user_id: userId,
      leak_alert_id: claimData.leakAlertId || null,
      infringing_url: claimData.infringingUrl,
      platform: claimData.platform,
      platform_username: claimData.platformUsername,
      claimant_name: claimData.claimantName,
      claimant_email: claimData.claimantEmail,
      claimant_phone: claimData.claimantPhone || null,
      claimant_address: claimData.claimantAddress || null,
      proof_urls: claimData.proofPaths || [],
      status: 'draft',
      notice_text: dmcaNotice,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (saveError) {
    return { claimId: null, error: new Error(saveError.message) }
  }
  const id = (savedClaim as { id?: string } | null)?.id ?? null
  return { claimId: id, error: null }
}

/**
 * Build and insert a draft DMCA claim from a leak alert (service or user-scoped client).
 */
export async function createDraftClaimForLeakAlert(
  supabase: SupabaseClient,
  userId: string,
  leakAlertId: string,
): Promise<{ claimId: string | null; error: Error | null }> {
  const [{ data: profile }, { data: connections }, { data: leakAlert }] = await Promise.all([
    supabase.from('profiles').select('full_name, email').eq('id', userId).maybeSingle(),
    supabase
      .from('platform_connections')
      .select('platform, platform_username')
      .eq('user_id', userId)
      .eq('is_connected', true),
    supabase.from('leak_alerts').select('*').eq('id', leakAlertId).eq('user_id', userId).maybeSingle(),
  ])

  if (!leakAlert) {
    return { claimId: null, error: new Error('Leak alert not found') }
  }

  const row = leakAlert as {
    source_url: string
    source_platform?: string | null
    platform?: string | null
  }
  const leakPlatform = (row.source_platform || row.platform || 'unknown') as string

  const claimData: DMCAClaimData = {
    claimantName: (profile as { full_name?: string | null })?.full_name?.trim() || '',
    claimantEmail: (profile as { email?: string | null })?.email?.trim() || '',
    claimantAddress: '',
    claimantPhone: '',
    copyrightOwner:
      connections?.[0]?.platform_username ||
      (profile as { full_name?: string | null })?.full_name ||
      '',
    infringingUrl: row.source_url,
    originalContentUrl: '',
    contentDescription:
      'Original adult content created exclusively for my subscribers on my official platform profile.',
    platform: connections?.[0]?.platform || leakPlatform || 'onlyfans',
    platformUsername: connections?.[0]?.platform_username || '',
    leakAlertId,
    proofPaths: [],
  }

  if (!claimData.claimantName && claimData.claimantEmail) {
    claimData.claimantName = claimData.claimantEmail.split('@')[0] || 'Creator'
  }

  if (!claimData.claimantEmail || !claimData.claimantName) {
    return {
      claimId: null,
      error: new Error('Profile email or name required to create a DMCA draft'),
    }
  }

  return insertDraftDmcaClaim(supabase, userId, claimData)
}
