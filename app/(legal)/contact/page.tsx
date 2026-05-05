import { loadContactSupportContext } from '@/lib/support/contact-support-eligibility'
import { ContactMemberClient } from './contact-member-client'

export default async function ContactPage() {
  const context = await loadContactSupportContext()
  return <ContactMemberClient context={context} />
}
