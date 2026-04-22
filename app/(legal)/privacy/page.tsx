'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'
import { FooterSupportSocial } from '@/components/marketing/footer-support-social'
import { ThemedLogo } from '@/components/themed-logo'
import { Button } from '@/components/ui/button'

const SITE = 'https://circeetvenus.com'
const DSAR_URL = 'https://app.termly.io/dsar/bd7d9347-c6ed-4b95-a926-07a8d7025739'

function PolicyLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-primary underline underline-offset-2 hover:no-underline"
    >
      {children}
    </a>
  )
}

function InternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="font-medium text-primary underline underline-offset-2 hover:no-underline"
    >
      {children}
    </a>
  )
}

const US_CATEGORY_ROWS: { cat: string; examples: string; collected: string }[] = [
  {
    cat: 'A. Identifiers',
    examples:
      'Contact details, such as real name, alias, postal address, telephone or mobile contact number, unique personal identifier, online identifier, Internet Protocol address, email address, and account name',
    collected: 'YES',
  },
  {
    cat: 'B. Personal information as defined in the California Customer Records statute',
    examples: 'Name, contact information, education, employment, employment history, and financial information',
    collected: 'NO',
  },
  {
    cat: 'C. Protected classification characteristics under state or federal law',
    examples: 'Gender, age, date of birth, race and ethnicity, national origin, marital status, and other demographic data',
    collected: 'NO',
  },
  {
    cat: 'D. Commercial information',
    examples: 'Transaction information, purchase history, financial details, and payment information',
    collected: 'NO',
  },
  {
    cat: 'E. Biometric information',
    examples: 'Fingerprints and voiceprints',
    collected: 'NO',
  },
  {
    cat: 'F. Internet or other similar network activity',
    examples:
      'Browsing history, search history, online behavior, interest data, and interactions with our and other websites, applications, systems, and advertisements',
    collected: 'NO',
  },
  {
    cat: 'G. Geolocation data',
    examples: 'Device location',
    collected: 'NO',
  },
  {
    cat: 'H. Audio, electronic, sensory, or similar information',
    examples: 'Images and audio, video or call recordings created in connection with our business activities',
    collected: 'NO',
  },
  {
    cat: 'I. Professional or employment-related information',
    examples:
      'Business contact details in order to provide you our Services at a business level or job title, work history, and professional qualifications if you apply for a job with us',
    collected: 'NO',
  },
  {
    cat: 'J. Education Information',
    examples: 'Student records and directory information',
    collected: 'NO',
  },
  {
    cat: 'K. Inferences drawn from collected personal information',
    examples:
      'Inferences drawn from any of the collected personal information listed above to create a profile or summary about, for example, an individual’s preferences and characteristics',
    collected: 'NO',
  },
  {
    cat: 'L. Sensitive personal Information',
    examples: '—',
    collected: 'NO',
  },
]

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <ThemedLogo width={32} height={32} className="rounded-full" priority />
            <span className="font-serif text-lg font-semibold text-primary">CIRCE ET VENUS</span>
          </Link>
          <Button variant="ghost" asChild>
            <Link href="/" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="font-serif text-2xl font-bold sm:text-3xl">Privacy Policy</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Last updated: <strong className="font-medium text-foreground">April 26, 2026</strong>
        </p>

        <article className="prose prose-invert mt-8 max-w-full space-y-8 text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground">
          <p className="leading-relaxed">
            This Privacy Notice for <strong>Circe et Venus</strong> (doing business as <strong>CETV</strong>) (
            <strong>we</strong>, <strong>us</strong>, or <strong>our</strong>), describes how and why we might
            access, collect, store, use, and/or share (<strong>process</strong>) your personal information when you
            use our services (<strong>Services</strong>), including when you:
          </p>
          <ul className="list-square space-y-2 pl-5">
            <li>
              Visit our website at <PolicyLink href={SITE}>circeetvenus.com</PolicyLink> or any website of ours
              that links to this Privacy Notice
            </li>
            <li>
              Download and use our mobile application (<strong>Circe et Venus</strong>), or any other application of
              ours that links to this Privacy Notice
            </li>
            <li>
              Use <strong>Circe et Venus</strong>. Circe et Venus is a SaaS platform for adult content creators and
              their management agencies, providing a unified dashboard across OnlyFans, Fansly, and ManyVids. The
              platform includes AI-powered retention and growth analytics (Circe AI and Venus AI), DMCA and leak
              protection (Aegis), stalker and doxxing protection (Shadow Guard), a Content Calendar, and an
              Audience Data Ownership Vault.
            </li>
            <li>Engage with us in other related ways, including any marketing or events</li>
          </ul>
          <p className="leading-relaxed">
            <strong>Questions or concerns?</strong> Reading this Privacy Notice will help you understand your
            privacy rights and choices. We are responsible for making decisions about how your personal information
            is processed. If you do not agree with our policies and practices, please do not use our Services. If
            you still have any questions or concerns, please contact us at{' '}
            <a
              href="mailto:admin@circeetvenus.com"
              className="font-medium text-primary underline underline-offset-2 hover:no-underline"
            >
              admin@circeetvenus.com
            </a>
            .
          </p>

          <section className="space-y-4" id="summary">
            <h2 className="text-xl font-semibold text-foreground">Summary of key points</h2>
            <p className="leading-relaxed">
              <strong>
                <em>
                  This summary provides key points from our Privacy Notice, but you can find out more details about
                  any of these topics by clicking the link following each key point or by using our{' '}
                </em>
              </strong>
              <InternalLink href="#toc">
                <strong>
                  <em>table of contents</em>
                </strong>
              </InternalLink>
              <strong>
                <em> below to find the section you are looking for.</em>
              </strong>
            </p>
            <p className="leading-relaxed">
              <strong>What personal information do we process?</strong> When you visit, use, or navigate our
              Services, we may process personal information depending on how you interact with us and the Services,
              the choices you make, and the products and features you use. Learn more about{' '}
              <InternalLink href="#personalinfo">personal information you disclose to us</InternalLink>.
            </p>
            <p className="leading-relaxed">
              <strong>Do we process any sensitive personal information?</strong> Some of the information may be
              considered &quot;special&quot; or &quot;sensitive&quot; in certain jurisdictions, for example your
              racial or ethnic origins, sexual orientation, and religious beliefs. We do not process sensitive
              personal information.
            </p>
            <p className="leading-relaxed">
              <strong>Do we collect any information from third parties?</strong> We may collect information from
              public databases, marketing partners, social media platforms, and other outside sources. Learn more
              about <InternalLink href="#othersources">information collected from other sources</InternalLink>.
            </p>
            <p className="leading-relaxed">
              <strong>How do we process your information?</strong> We process your information to provide, improve,
              and administer our Services, communicate with you, for security and fraud prevention, and to comply
              with law. We may also process your information for other purposes with your consent. We process your
              information only when we have a valid legal reason to do so. Learn more about{' '}
              <InternalLink href="#infouse">how we process your information</InternalLink>.
            </p>
            <p className="leading-relaxed">
              <strong>In what situations and with which parties do we share personal information?</strong> We may
              share information in specific situations and with specific third parties. Learn more about{' '}
              <InternalLink href="#whoshare">when and with whom we share your personal information</InternalLink>.
            </p>
            <p className="leading-relaxed">
              <strong>How do we keep your information safe?</strong> We have adequate organizational and technical
              processes and procedures in place to protect your personal information. However, no electronic
              transmission over the internet or information storage technology can be guaranteed to be 100% secure,
              so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties
              will not be able to defeat our security and improperly collect, access, steal, or modify your
              information. Learn more about <InternalLink href="#infosafe">how we keep your information safe</InternalLink>.
            </p>
            <p className="leading-relaxed">
              <strong>What are your rights?</strong> Depending on where you are located geographically, the
              applicable privacy law may mean you have certain rights regarding your personal information. Learn
              more about <InternalLink href="#privacyrights">your privacy rights</InternalLink>.
            </p>
            <p className="leading-relaxed">
              <strong>How do you exercise your rights?</strong> The easiest way to exercise your rights is by
              submitting a <PolicyLink href={DSAR_URL}>data subject access request</PolicyLink>, or by contacting us.
              We will consider and act upon any request in accordance with applicable data protection laws.
            </p>
            <p className="leading-relaxed">
              Want to learn more about what we do with any information we collect?{' '}
              <InternalLink href="#toc">Review the Privacy Notice in full</InternalLink>.
            </p>
          </section>

          <nav className="space-y-2 rounded-lg border border-border bg-muted/20 p-4" aria-label="Table of contents">
            <h2 className="!mt-0 text-xl font-semibold text-foreground" id="toc">
              Table of contents
            </h2>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm sm:text-base">
              <li>
                <InternalLink href="#infocollect">What information do we collect?</InternalLink>
              </li>
              <li>
                <InternalLink href="#infouse">How do we process your information?</InternalLink>
              </li>
              <li>
                <InternalLink href="#legalbases">
                  What legal bases do we rely on to process your personal information?
                </InternalLink>
              </li>
              <li>
                <InternalLink href="#whoshare">When and with whom do we share your personal information?</InternalLink>
              </li>
              <li>
                <InternalLink href="#cookies">Do we use cookies and other tracking technologies?</InternalLink>
              </li>
              <li>
                <InternalLink href="#ai">Do we offer artificial intelligence-based products?</InternalLink>
              </li>
              <li>
                <InternalLink href="#sociallogins">How do we handle your social logins?</InternalLink>
              </li>
              <li>
                <InternalLink href="#inforetain">How long do we keep your information?</InternalLink>
              </li>
              <li>
                <InternalLink href="#infosafe">How do we keep your information safe?</InternalLink>
              </li>
              <li>
                <InternalLink href="#infominors">Do we collect information from minors?</InternalLink>
              </li>
              <li>
                <InternalLink href="#privacyrights">What are your privacy rights?</InternalLink>
              </li>
              <li>
                <InternalLink href="#DNT">Controls for Do-Not-Track features</InternalLink>
              </li>
              <li>
                <InternalLink href="#uslaws">Do United States residents have specific privacy rights?</InternalLink>
              </li>
              <li>
                <InternalLink href="#otherlaws">Do other regions have specific privacy rights?</InternalLink>
              </li>
              <li>
                <InternalLink href="#policyupdates">Do we make updates to this notice?</InternalLink>
              </li>
              <li>
                <InternalLink href="#contact">How can you contact us about this notice?</InternalLink>
              </li>
              <li>
                <InternalLink href="#request">
                  How can you review, update, or delete the data we collect from you?
                </InternalLink>
              </li>
            </ol>
          </nav>

          <section className="space-y-4" id="infocollect">
            <h2 className="text-xl font-semibold text-foreground">1. What information do we collect?</h2>
            <h3 className="text-lg font-semibold text-foreground" id="personalinfo">
              Personal information you disclose to us
            </h3>
            <p className="leading-relaxed">
              <strong>
                <em>In short:</em>
              </strong>{' '}
              <em>We collect personal information that you provide to us.</em>
            </p>
            <p className="leading-relaxed">
              We collect personal information that you voluntarily provide to us when you register on the Services,
              express an interest in obtaining information about us or our products and Services, when you
              participate in activities on the Services, or otherwise when you contact us.
            </p>
            <p className="leading-relaxed">
              <strong>Personal information provided by you.</strong> The personal information that we collect depends
              on the context of your interactions with us and the Services, the choices you make, and the products
              and features you use. The personal information we collect may include the following:
            </p>
            <ul className="list-square space-y-1 pl-5">
              <li>Names</li>
              <li>Phone numbers</li>
              <li>Email addresses</li>
              <li>Usernames</li>
              <li>Passwords</li>
              <li>Contact preferences</li>
              <li>Contact or authentication data</li>
              <li>Billing addresses</li>
              <li>Debit/credit card numbers</li>
            </ul>
            <p className="leading-relaxed" id="sensitiveinfo">
              <strong>Sensitive information.</strong> We do not process sensitive information.
            </p>
            <p className="leading-relaxed">
              <strong>Payment data.</strong> We may collect data necessary to process your payment if you choose to
              make purchases, such as your payment instrument number, and the security code associated with your
              payment instrument. All payment data is handled and stored by <strong>Stripe</strong>. You may find
              their privacy notice here:{' '}
              <PolicyLink href="https://stripe.com/en-ca/privacy">https://stripe.com/en-ca/privacy</PolicyLink>.
            </p>
            <p className="leading-relaxed">
              <strong>Social media login data.</strong> We may provide you with the option to register with us using
              your existing social media account details, like your Facebook, X, or other social media account. If
              you choose to register in this way, we will collect certain profile information about you from the
              social media provider, as described in the section called{' '}
              <InternalLink href="#sociallogins">How do we handle your social logins?</InternalLink> below.
            </p>
            <p className="leading-relaxed">
              <strong>Application data.</strong> If you use our application(s), we also may collect the following
              information if you choose to provide us with access or permission:
            </p>
            <ul className="list-square space-y-2 pl-5">
              <li>
                <em>Mobile device access.</em> We may request access or permission to certain features from your
                mobile device, including your mobile device&apos;s calendar, camera, microphone, storage, social
                media accounts, reminders, and other features. If you wish to change our access or permissions,
                you may do so in your device&apos;s settings.
              </li>
              <li>
                <em>Push notifications.</em> We may request to send you push notifications regarding your account or
                certain features of the application(s). If you wish to opt out from receiving these types of
                communications, you may turn them off in your device&apos;s settings.
              </li>
            </ul>
            <p className="leading-relaxed">
              This information is primarily needed to maintain the security and operation of our application(s), for
              troubleshooting, and for our internal analytics and reporting purposes.
            </p>
            <p className="leading-relaxed">
              All personal information that you provide to us must be true, complete, and accurate, and you must
              notify us of any changes to such personal information.
            </p>

            <h3 className="text-lg font-semibold text-foreground">Information automatically collected</h3>
            <p className="leading-relaxed">
              <strong>
                <em>In short:</em>
              </strong>{' '}
              <em>
                Some information — such as your Internet Protocol (IP) address and/or browser and device
                characteristics — is collected automatically when you visit our Services.
              </em>
            </p>
            <p className="leading-relaxed">
              We automatically collect certain information when you visit, use, or navigate the Services. This
              information does not reveal your specific identity (like your name or contact information) but may
              include device and usage information, such as your IP address, browser and device characteristics,
              operating system, language preferences, referring URLs, device name, country, location, information
              about how and when you use our Services, and other technical information. This information is
              primarily needed to maintain the security and operation of our Services, and for our internal
              analytics and reporting purposes.
            </p>
            <p className="leading-relaxed">
              Like many businesses, we also collect information through cookies and similar technologies.
            </p>
            <p className="leading-relaxed">The information we collect includes:</p>
            <ul className="list-square space-y-2 pl-5">
              <li>
                <em>Log and usage data.</em> Log and usage data is service-related, diagnostic, usage, and
                performance information our servers automatically collect when you access or use our Services and
                which we record in log files. Depending on how you interact with us, this log data may include your
                IP address, device information, browser type, and settings and information about your activity in
                the Services (such as the date/time stamps associated with your usage, pages and files viewed,
                searches, and other actions you take such as which features you use), device event information (such
                as system activity, error reports (sometimes called &quot;crash dumps&quot;), and hardware settings).
              </li>
              <li>
                <em>Device data.</em> We collect device data such as information about your computer, phone, tablet,
                or other device you use to access the Services. Depending on the device used, this device data may
                include information such as your IP address (or proxy server), device and application identification
                numbers, location, browser type, hardware model, Internet service provider and/or mobile carrier,
                operating system, and system configuration information.
              </li>
              <li>
                <em>Location data.</em> We collect location data such as information about your device&apos;s
                location, which can be either precise or imprecise. How much information we collect depends on the type
                and settings of the device you use to access the Services. For example, we may use GPS and other
                technologies to collect geolocation data that tells us your current location (based on your IP
                address). You can opt out of allowing us to collect this information either by refusing access to the
                information or by disabling your Location setting on your device. However, if you choose to opt out,
                you may not be able to use certain aspects of the Services.
              </li>
            </ul>

            <h3 className="text-lg font-semibold text-foreground">Google API</h3>
            <p className="leading-relaxed">
              Our use of information received from Google APIs will adhere to{' '}
              <PolicyLink href="https://developers.google.com/terms/api-services-user-data-policy">
                Google API Services User Data Policy
              </PolicyLink>
              , including the{' '}
              <PolicyLink href="https://developers.google.com/terms/api-services-user-data-policy#limited-use">
                Limited Use requirements
              </PolicyLink>
              .
            </p>

            <h3 className="text-lg font-semibold text-foreground" id="othersources">
              Information collected from other sources
            </h3>
            <p className="leading-relaxed">
              <strong>
                <em>In short:</em>
              </strong>{' '}
              <em>
                We may collect limited data from public databases, marketing partners, social media platforms, and
                other outside sources.
              </em>
            </p>
            <p className="leading-relaxed">
              In order to enhance our ability to provide relevant marketing, offers, and services to you and update
              our records, we may obtain information about you from other sources, such as public databases, joint
              marketing partners, affiliate programs, data providers, social media platforms, and from other third
              parties. This information includes mailing addresses, job titles, email addresses, phone numbers,
              intent data (or user behavior data), Internet Protocol (IP) addresses, social media profiles, social
              media URLs, and custom profiles, for purposes of targeted advertising and event promotion.
            </p>
            <p className="leading-relaxed">
              If you interact with us on a social media platform using your social media account (e.g. Facebook or
              X), we receive personal information about you from such platforms such as your name, email address,
              and gender. You may have the right to withdraw your consent to processing your personal information.
              Learn more about <InternalLink href="#withdrawconsent">withdrawing your consent</InternalLink>. Any
              personal information that we collect from your social media account depends on your social media
              account&apos;s privacy settings. Please note that their own use of your information is not governed by
              this Privacy Notice.
            </p>
          </section>

          <section className="space-y-4" id="infouse">
            <h2 className="text-xl font-semibold text-foreground">2. How do we process your information?</h2>
            <p className="leading-relaxed">
              <strong>
                <em>In short:</em>
              </strong>{' '}
              <em>
                We process your information to provide, improve, and administer our Services, communicate with you,
                for security and fraud prevention, and to comply with law. We process the personal information for
                the purposes listed below. We may also process your information for other purposes only with your
                prior explicit consent.
              </em>
            </p>
            <p className="leading-relaxed">
              <strong>We process your personal information for a variety of reasons, depending on how you interact with our Services, including:</strong>
            </p>
            <ul className="list-square space-y-2 pl-5">
              <li>
                <strong>To facilitate account creation and authentication and otherwise manage user accounts.</strong>{' '}
                We may process your information so you can create and log in to your account, as well as keep your
                account in working order.
              </li>
              <li>
                <strong>To deliver and facilitate delivery of services to the user.</strong> We may process your
                information to provide you with the requested service.
              </li>
              <li>
                <strong>To respond to user inquiries/offer support to users.</strong> We may process your information
                to respond to your inquiries and solve any potential issues you might have with the requested service.
              </li>
              <li>
                <strong>To enable user-to-user communications.</strong> We may process your information if you choose
                to use any of our offerings that allow for communication with another user.
              </li>
              <li>
                <strong>To request feedback.</strong> We may process your information when necessary to request
                feedback and to contact you about your use of our Services.
              </li>
              <li>
                <strong>To protect our Services.</strong> We may process your information as part of our efforts to
                keep our Services safe and secure, including fraud monitoring and prevention.
              </li>
              <li>
                <strong>To save or protect an individual&apos;s vital interest.</strong> We may process your
                information when necessary to save or protect an individual&apos;s vital interest, such as to prevent
                harm.
              </li>
            </ul>
          </section>

          <section className="space-y-4" id="legalbases">
            <h2 className="text-xl font-semibold text-foreground">
              3. What legal bases do we rely on to process your information?
            </h2>
            <p className="leading-relaxed italic">
              <strong>In short:</strong> We only process your personal information when we believe it is necessary
              and we have a valid legal reason (i.e. legal basis) to do so under applicable law, like with your
              consent, to comply with laws, to provide you with services to enter into or fulfill our contractual
              obligations, to protect your rights, or to fulfill our legitimate business interests.
            </p>
            <p className="leading-relaxed">
              <strong>
                <u>If you are located in the EU or UK, this section applies to you.</u>
              </strong>
            </p>
            <p className="leading-relaxed">
              The General Data Protection Regulation (GDPR) and UK GDPR require us to explain the valid legal bases
              we rely on in order to process your personal information. As such, we may rely on the following legal
              bases to process your personal information:
            </p>
            <ul className="list-square space-y-2 pl-5">
              <li>
                <strong>Consent.</strong> We may process your information if you have given us permission (i.e.
                consent) to use your personal information for a specific purpose. You can withdraw your consent at
                any time. Learn more about <InternalLink href="#withdrawconsent">withdrawing your consent</InternalLink>.
              </li>
              <li>
                <strong>Performance of a contract.</strong> We may process your personal information when we believe
                it is necessary to fulfill our contractual obligations to you, including providing our Services or at
                your request prior to entering into a contract with you.
              </li>
              <li>
                <strong>Legitimate interests.</strong> We may process your information when we believe it is
                reasonably necessary to achieve our legitimate business interests and those interests do not outweigh
                your interests and fundamental rights and freedoms. For example, we may process your personal
                information for some of the purposes described in order to:
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Diagnose problems and/or prevent fraudulent activities</li>
                  <li>
                    Understand how our users use our products and services so we can improve user experience
                  </li>
                </ul>
              </li>
              <li>
                <strong>Legal obligations.</strong> We may process your information where we believe it is necessary
                for compliance with our legal obligations, such as to cooperate with a law enforcement body or
                regulatory agency, exercise or defend our legal rights, or disclose your information as evidence in
                litigation in which we are involved.
              </li>
              <li>
                <strong>Vital interests.</strong> We may process your information where we believe it is necessary to
                protect your vital interests or the vital interests of a third party, such as situations involving
                potential threats to the safety of any person.
              </li>
            </ul>
            <p className="leading-relaxed">
              <strong>
                <u>If you are located in Canada, this section applies to you.</u>
              </strong>
            </p>
            <p className="leading-relaxed">
              We may process your information if you have given us specific permission (i.e. express consent) to use
              your personal information for a specific purpose, or in situations where your permission can be inferred
              (i.e. implied consent). You can <InternalLink href="#withdrawconsent">withdraw your consent</InternalLink>{' '}
              at any time.
            </p>
            <p className="leading-relaxed">
              In some exceptional cases, we may be legally permitted under applicable law to process your information
              without your consent, including, for example:
            </p>
            <ul className="list-square space-y-1 pl-5">
              <li>If collection is clearly in the interests of an individual and consent cannot be obtained in a timely way</li>
              <li>For investigations and fraud detection and prevention</li>
              <li>For business transactions provided certain conditions are met</li>
              <li>
                If it is contained in a witness statement and the collection is necessary to assess, process, or
                settle an insurance claim
              </li>
              <li>
                For identifying injured, ill, or deceased persons and communicating with next of kin
              </li>
              <li>
                If we have reasonable grounds to believe an individual has been, is, or may be victim of financial abuse
              </li>
              <li>
                If it is reasonable to expect collection and use with consent would compromise the availability or the
                accuracy of the information and the collection is reasonable for purposes related to investigating a
                breach of an agreement or a contravention of the laws of Canada or a province
              </li>
              <li>
                If disclosure is required to comply with a subpoena, warrant, court order, or rules of the court
                relating to the production of records
              </li>
              <li>
                If it was produced by an individual in the course of their employment, business, or profession and the
                collection is consistent with the purposes for which the information was produced
              </li>
              <li>If the collection is solely for journalistic, artistic, or literary purposes</li>
              <li>If the information is publicly available and is specified by the regulations</li>
              <li>
                We may disclose de-identified information for approved research or statistics projects, subject to
                ethics oversight and confidentiality commitments
              </li>
            </ul>
          </section>

          <section className="space-y-4" id="whoshare">
            <h2 className="text-xl font-semibold text-foreground">
              4. When and with whom do we share your personal information?
            </h2>
            <p className="leading-relaxed">
              <strong>
                <em>In short:</em>
              </strong>{' '}
              <em>
                We may share information in specific situations described in this section and/or with the following
                third parties.
              </em>
            </p>
            <p className="leading-relaxed">We may need to share your personal information in the following situations:</p>
            <ul className="list-square space-y-2 pl-5">
              <li>
                <strong>Business transfers.</strong> We may share or transfer your information in connection with, or
                during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a
                portion of our business to another company.
              </li>
            </ul>
          </section>

          <section className="space-y-4" id="cookies">
            <h2 className="text-xl font-semibold text-foreground">
              5. Do we use cookies and other tracking technologies?
            </h2>
            <p className="leading-relaxed">
              <strong>
                <em>In short:</em>
              </strong>{' '}
              <em>We may use cookies and other tracking technologies to collect and store your information.</em>
            </p>
            <p className="leading-relaxed">
              We may use cookies and similar tracking technologies (like web beacons and pixels) to gather information
              when you interact with our Services. Some online tracking technologies help us maintain the security of
              our Services and your account, prevent crashes, fix bugs, save your preferences, and assist with basic
              site functions.
            </p>
            <p className="leading-relaxed">
              We also permit third parties and service providers to use online tracking technologies on our Services
              for analytics and advertising, including to help manage and display advertisements, to tailor
              advertisements to your interests, or to send abandoned shopping cart reminders (depending on your
              communication preferences). The third parties and service providers use their technology to provide
              advertising about products and services tailored to your interests which may appear either on our
              Services or on other websites.
            </p>
            <p className="leading-relaxed">
              To the extent these online tracking technologies are deemed to be a &quot;sale&quot;/&quot;sharing&quot;
              (which includes targeted advertising, as defined under the applicable laws) under applicable US state
              laws, you can opt out of these online tracking technologies by submitting a request as described below
              under section{' '}
              <InternalLink href="#uslaws">Do United States residents have specific privacy rights?</InternalLink>.
            </p>
            <p className="leading-relaxed">
              Specific information about how we use such technologies and how you can refuse certain cookies is set
              out in our{' '}
              <Link
                href="/cookies"
                className="font-medium text-primary underline underline-offset-2 hover:no-underline"
              >
                Cookie Notice
              </Link>
              .
            </p>
            <h3 className="text-lg font-semibold text-foreground">Google Analytics</h3>
            <p className="leading-relaxed">
              We may share your information with Google Analytics to track and analyze the use of the Services. The
              Google Analytics Advertising Features that we may use include: <strong>Remarketing with Google Analytics</strong>.
              To opt out of being tracked by Google Analytics across the Services, visit{' '}
              <PolicyLink href="https://tools.google.com/dlpage/gaoptout">https://tools.google.com/dlpage/gaoptout</PolicyLink>.
              You can opt out of Google Analytics Advertising Features through{' '}
              <PolicyLink href="https://adssettings.google.com/">Ads Settings</PolicyLink> and Ad Settings for mobile
              apps. Other opt out means include{' '}
              <PolicyLink href="https://optout.networkadvertising.org/">https://optout.networkadvertising.org/</PolicyLink>{' '}
              and{' '}
              <PolicyLink href="https://www.networkadvertising.org/mobile-choice">
                https://www.networkadvertising.org/mobile-choice
              </PolicyLink>
              . For more information on the privacy practices of Google, please visit the{' '}
              <PolicyLink href="https://policies.google.com/privacy">Google Privacy &amp; Terms page</PolicyLink>.
            </p>
          </section>

          <section className="space-y-4" id="ai">
            <h2 className="text-xl font-semibold text-foreground">
              6. Do we offer artificial intelligence-based products?
            </h2>
            <p className="leading-relaxed">
              <strong>
                <em>In short:</em>
              </strong>{' '}
              <em>
                We offer products, features, or tools powered by artificial intelligence, machine learning, or similar
                technologies.
              </em>
            </p>
            <p className="leading-relaxed">
              As part of our Services, we offer products, features, or tools powered by artificial intelligence,
              machine learning, or similar technologies (collectively, <strong>AI Products</strong>). These tools are
              designed to enhance your experience and provide you with innovative solutions. The terms in this Privacy
              Notice govern your use of the AI Products within our Services.
            </p>
            <h3 className="text-lg font-semibold text-foreground">Use of AI technologies</h3>
            <p className="leading-relaxed">
              We provide the AI Products through third-party service providers (<strong>AI Service Providers</strong>),
              including <strong>Groq</strong>, <strong>Anthropic</strong>, and <strong>OpenAI</strong>. As outlined
              in this Privacy Notice, your input, output, and personal information will be shared with and processed
              by these AI Service Providers to enable your use of our AI Products for purposes outlined in{' '}
              <InternalLink href="#legalbases">
                What legal bases do we rely on to process your personal information?
              </InternalLink>
              . You must not use the AI Products in any way that violates the terms or policies of any AI Service
              Provider.
            </p>
            <h3 className="text-lg font-semibold text-foreground">Our AI products</h3>
            <p className="leading-relaxed">Our AI Products are designed for the following functions:</p>
            <ul className="list-square space-y-1 pl-5">
              <li>AI automation</li>
              <li>AI insights</li>
              <li>AI predictive analytics</li>
              <li>Image generation</li>
              <li>Video analysis</li>
              <li>Machine learning models</li>
              <li>AI bots</li>
            </ul>
            <h3 className="text-lg font-semibold text-foreground">How we process your data using AI</h3>
            <p className="leading-relaxed">
              All personal information processed using our AI Products is handled in line with our Privacy Notice and
              our agreement with third parties. This ensures high security and safeguards your personal information
              throughout the process, giving you peace of mind about your data&apos;s safety.
            </p>
            <h3 className="text-lg font-semibold text-foreground">How to opt out</h3>
            <p className="leading-relaxed">We believe in giving you the power to decide how your data is used. To opt out, you can:</p>
            <ul className="list-square pl-5">
              <li>Log in to your account settings and update your user account</li>
            </ul>
          </section>

          <section className="space-y-4" id="sociallogins">
            <h2 className="text-xl font-semibold text-foreground">7. How do we handle your social logins?</h2>
            <p className="leading-relaxed">
              <strong>
                <em>In short:</em>
              </strong>{' '}
              <em>
                If you choose to register or log in to our Services using a social media account, we may have access
                to certain information about you.
              </em>
            </p>
            <p className="leading-relaxed">
              Our Services offer you the ability to register and log in using your third-party social media account
              details (like your Facebook or X logins). Where you choose to do this, we will receive certain profile
              information about you from your social media provider. The profile information we receive may vary
              depending on the social media provider concerned, but will often include your name, email address,
              friends list, and profile picture, as well as other information you choose to make public on such a
              social media platform.
            </p>
            <p className="leading-relaxed">
              We will use the information we receive only for the purposes that are described in this Privacy Notice
              or that are otherwise made clear to you on the relevant Services. Please note that we do not control,
              and are not responsible for, other uses of your personal information by your third-party social media
              provider. We recommend that you review their privacy notice to understand how they collect, use, and
              share your personal information, and how you can set your privacy preferences on their sites and apps.
            </p>
          </section>

          <section className="space-y-4" id="inforetain">
            <h2 className="text-xl font-semibold text-foreground">8. How long do we keep your information?</h2>
            <p className="leading-relaxed">
              <strong>
                <em>In short:</em>
              </strong>{' '}
              <em>
                We keep your information for as long as necessary to fulfill the purposes outlined in this Privacy
                Notice unless otherwise required by law.
              </em>
            </p>
            <p className="leading-relaxed">
              We will only keep your personal information for as long as it is necessary for the purposes set out in
              this Privacy Notice, unless a longer retention period is required or permitted by law (such as tax,
              accounting, or other legal requirements). No purpose in this notice will require us keeping your
              personal information for longer than <strong>twenty four (24) months</strong> past the termination of
              the user&apos;s account.
            </p>
            <p className="leading-relaxed">
              When we have no ongoing legitimate business need to process your personal information, we will either
              delete or anonymize such information, or, if this is not possible (for example, because your personal
              information has been stored in backup archives), then we will securely store your personal information
              and isolate it from any further processing until deletion is possible.
            </p>
          </section>

          <section className="space-y-4" id="infosafe">
            <h2 className="text-xl font-semibold text-foreground">9. How do we keep your information safe?</h2>
            <p className="leading-relaxed">
              <strong>
                <em>In short:</em>
              </strong>{' '}
              <em>
                We aim to protect your personal information through a system of organizational and technical security
                measures.
              </em>
            </p>
            <p className="leading-relaxed">
              We have implemented appropriate and reasonable technical and organizational security measures designed to
              protect the security of any personal information we process. However, despite our safeguards and efforts
              to secure your information, no electronic transmission over the Internet or information storage
              technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers,
              cybercriminals, or other unauthorized third parties will not be able to defeat our security and
              improperly collect, access, steal, or modify your information. Although we will do our best to protect
              your personal information, transmission of personal information to and from our Services is at your
              own risk. You should only access the Services within a secure environment.
            </p>
          </section>

          <section className="space-y-4" id="infominors">
            <h2 className="text-xl font-semibold text-foreground">10. Do we collect information from minors?</h2>
            <p className="leading-relaxed">
              <strong>
                <em>In short:</em>
              </strong>{' '}
              <em>
                We do not knowingly collect data from or market to children under 18 years of age or the equivalent
                age as specified by law in your jurisdiction.
              </em>
            </p>
            <p className="leading-relaxed">
              We do not knowingly collect, solicit data from, or market to children under 18 years of age or the
              equivalent age as specified by law in your jurisdiction, nor do we knowingly sell such personal
              information. By using the Services, you represent that you are at least 18 or the equivalent age as
              specified by law in your jurisdiction or that you are the parent or guardian of such a minor and
              consent to such minor dependent&apos;s use of the Services. If we learn that personal information from
              users less than 18 years of age or the equivalent age as specified by law in your jurisdiction has been
              collected, we will deactivate the account and take reasonable measures to promptly delete such data from
              our records. If you become aware of any data we may have collected from children under age 18 or the
              equivalent age as specified by law in your jurisdiction, please contact us at{' '}
              <a
                href="mailto:admin@circeetvenus.com"
                className="font-medium text-primary underline underline-offset-2 hover:no-underline"
              >
                admin@circeetvenus.com
              </a>
              .
            </p>
          </section>

          <section className="space-y-4" id="privacyrights">
            <h2 className="text-xl font-semibold text-foreground">11. What are your privacy rights?</h2>
            <p className="leading-relaxed">
              <strong>
                <em>In short:</em>
              </strong>{' '}
              <em>
                Depending on your state of residence in the US or in some regions, such as the European Economic Area
                (EEA), United Kingdom (UK), Switzerland, and Canada, you have rights that allow you greater access to
                and control over your personal information. You may review, change, or terminate your account at any
                time, depending on your country, province, or state of residence.
              </em>
            </p>
            <p className="leading-relaxed">
              In some regions (like the EEA, UK, Switzerland, and Canada), you have certain rights under applicable data
              protection laws. These may include the right (i) to request access and obtain a copy of your personal
              information, (ii) to request rectification or erasure; (iii) to restrict the processing of your
              personal information; (iv) if applicable, to data portability; and (v) not to be subject to automated
              decision-making. If a decision that produces legal or similarly significant effects is made solely by
              automated means, we will inform you, explain the main factors, and offer a simple way to request human
              review. In certain circumstances, you may also have the right to object to the processing of your
              personal information. You can make such a request by contacting us by using the contact details
              provided in the section{' '}
              <InternalLink href="#contact">How can you contact us about this notice?</InternalLink> below.
            </p>
            <p className="leading-relaxed">
              We will consider and act upon any request in accordance with applicable data protection laws.
            </p>
            <p className="leading-relaxed">
              If you are located in the EEA or UK and you believe we are unlawfully processing your personal
              information, you also have the right to complain to your{' '}
              <PolicyLink href="https://ec.europa.eu/justice/data-protection/bodies/authorities/index_en.htm">
                Member State data protection authority
              </PolicyLink>{' '}
              or{' '}
              <PolicyLink href="https://ico.org.uk/make-a-complaint/data-protection-complaints/data-protection-complaints/">
                UK data protection authority
              </PolicyLink>
              .
            </p>
            <p className="leading-relaxed">
              If you are located in Switzerland, you may contact the{' '}
              <PolicyLink href="https://www.edoeb.admin.ch/edoeb/en/home.html">
                Federal Data Protection and Information Commissioner
              </PolicyLink>
              .
            </p>
            <p className="leading-relaxed" id="withdrawconsent">
              <strong>
                <u>Withdrawing your consent:</u>
              </strong>{' '}
              If we are relying on your consent to process your personal information, which may be express and/or
              implied consent depending on the applicable law, you have the right to withdraw your consent at any
              time. You can withdraw your consent at any time by contacting us by using the contact details provided
              in the section <InternalLink href="#contact">How can you contact us about this notice?</InternalLink>{' '}
              below or updating your preferences.
            </p>
            <p className="leading-relaxed">
              However, please note that this will not affect the lawfulness of the processing before its withdrawal
              nor, when applicable law allows, will it affect the processing of your personal information conducted in
              reliance on lawful processing grounds other than consent.
            </p>
            <p className="leading-relaxed">
              <strong>
                <u>Opting out of marketing and promotional communications:</u>
              </strong>{' '}
              You can unsubscribe from our marketing and promotional communications at any time by clicking on the
              unsubscribe link in the emails that we send, or by contacting us using the details provided in the
              section <InternalLink href="#contact">How can you contact us about this notice?</InternalLink> below. You
              will then be removed from the marketing lists. However, we may still communicate with you — for example,
              to send you service-related messages that are necessary for the administration and use of your account,
              to respond to service requests, or for other non-marketing purposes.
            </p>
            <h3 className="text-lg font-semibold text-foreground">Account information</h3>
            <p className="leading-relaxed">
              If you would at any time like to review or change the information in your account or terminate your
              account, you can:
            </p>
            <ul className="list-square pl-5">
              <li>Log in to your account settings and update your user account.</li>
            </ul>
            <p className="leading-relaxed">
              Upon your request to terminate your account, we will deactivate or delete your account and information
              from our active databases. However, we may retain some information in our files to prevent fraud,
              troubleshoot problems, assist with any investigations, enforce our legal terms and/or comply with
              applicable legal requirements.
            </p>
            <p className="leading-relaxed">
              <strong>
                <u>Cookies and similar technologies:</u>
              </strong>{' '}
              Most Web browsers are set to accept cookies by default. If you prefer, you can usually choose to set
              your browser to remove cookies and to reject cookies. If you choose to remove cookies or reject cookies,
              this could affect certain features or services of our Services.
            </p>
            <p className="leading-relaxed">
              If you have questions or comments about your privacy rights, you may email us at{' '}
              <a
                href="mailto:admin@circeetvenus.com"
                className="font-medium text-primary underline underline-offset-2 hover:no-underline"
              >
                admin@circeetvenus.com
              </a>
              .
            </p>
          </section>

          <section className="space-y-4" id="DNT">
            <h2 className="text-xl font-semibold text-foreground">12. Controls for Do-Not-Track features</h2>
            <p className="leading-relaxed">
              Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track (
              <strong>DNT</strong>) feature or setting you can activate to signal your privacy preference not to have
              data about your online browsing activities monitored and collected. At this stage, no uniform technology
              standard for recognizing and implementing DNT signals has been finalized. As such, we do not currently
              respond to DNT browser signals or any other mechanism that automatically communicates your choice not to
              be tracked online. If a standard for online tracking is adopted that we must follow in the future, we
              will inform you about that practice in a revised version of this Privacy Notice.
            </p>
            <p className="leading-relaxed">
              California law requires us to let you know how we respond to web browser DNT signals. Because there
              currently is not an industry or legal standard for recognizing or honoring DNT signals, we do not
              respond to them at this time.
            </p>
          </section>

          <section className="space-y-4" id="uslaws">
            <h2 className="text-xl font-semibold text-foreground">
              13. Do United States residents have specific privacy rights?
            </h2>
            <p className="leading-relaxed">
              <strong>
                <em>In short:</em>
              </strong>{' '}
              <em>
                If you are a resident of California, Colorado, Connecticut, Delaware, Florida, Indiana, Iowa, Kentucky,
                Maryland, Minnesota, Montana, Nebraska, New Hampshire, New Jersey, Oregon, Rhode Island, Tennessee,
                Texas, Utah, or Virginia, you may have the right to request access to and receive details about the
                personal information we maintain about you and how we have processed it, correct inaccuracies, get a
                copy of, or delete your personal information. You may also have the right to withdraw your consent to
                our processing of your personal information. These rights may be limited in some circumstances by
                applicable law. More information is provided below.
              </em>
            </p>
            <h3 className="text-lg font-semibold text-foreground">Categories of personal information we collect</h3>
            <p className="leading-relaxed">
              The table below shows the categories of personal information we have collected in the past twelve (12)
              months. The table includes illustrative examples of each category and does not reflect the personal
              information we collect from you. For a comprehensive inventory of all personal information we process,
              please refer to the section{' '}
              <InternalLink href="#infocollect">What information do we collect?</InternalLink>.
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="border-r border-border p-3 font-semibold text-foreground">Category</th>
                    <th className="border-r border-border p-3 font-semibold text-foreground">Examples</th>
                    <th className="p-3 font-semibold text-foreground">Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {US_CATEGORY_ROWS.map((row) => (
                    <tr key={row.cat} className="border-b border-border last:border-b-0">
                      <td className="border-r border-border p-3 align-top">{row.cat}</td>
                      <td className="border-r border-border p-3 align-top">{row.examples}</td>
                      <td className="p-3 align-middle text-center">{row.collected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="leading-relaxed">
              We may also collect other personal information outside of these categories through instances where you
              interact with us in person, online, or by phone or mail in the context of:
            </p>
            <ul className="list-square space-y-1 pl-5">
              <li>Receiving help through our customer support channels;</li>
              <li>Participation in customer surveys or contests; and</li>
              <li>Facilitation in the delivery of our Services and to respond to your inquiries.</li>
            </ul>
            <p className="leading-relaxed">
              We will use and retain the collected personal information as needed to provide the Services or for:
            </p>
            <ul className="list-square pl-5">
              <li>
                Category A — <strong>As long as the user has an account with us</strong>
              </li>
            </ul>
            <h3 className="text-lg font-semibold text-foreground">Sources of personal information</h3>
            <p className="leading-relaxed">
              Learn more about the sources of personal information we collect in{' '}
              <InternalLink href="#infocollect">What information do we collect?</InternalLink>.
            </p>
            <h3 className="text-lg font-semibold text-foreground">How we use and share personal information</h3>
            <p className="leading-relaxed">
              Learn more about how we use your personal information in the section{' '}
              <InternalLink href="#infouse">How do we process your information?</InternalLink>.
            </p>
            <p className="leading-relaxed">
              <strong>Will your information be shared with anyone else?</strong>
            </p>
            <p className="leading-relaxed">
              We may disclose your personal information with our service providers pursuant to a written contract
              between us and each service provider. Learn more about how we disclose personal information in the
              section{' '}
              <InternalLink href="#whoshare">When and with whom do we share your personal information?</InternalLink>.
            </p>
            <p className="leading-relaxed">
              We may use your personal information for our own business purposes, such as for undertaking internal
              research for technological development and demonstration. This is not considered to be &quot;selling&quot;
              of your personal information.
            </p>
            <p className="leading-relaxed">
              We have not disclosed, sold, or shared any personal information to third parties for a business or
              commercial purpose in the preceding twelve (12) months. We will not sell or share personal information
              in the future belonging to website visitors, users, and other consumers.
            </p>
            <h3 className="text-lg font-semibold text-foreground">Your rights</h3>
            <p className="leading-relaxed">
              You have rights under certain US state data protection laws. However, these rights are not absolute, and
              in certain cases, we may decline your request as permitted by law. These rights include:
            </p>
            <ul className="list-square space-y-1 pl-5">
              <li>
                <strong>Right to know</strong> whether or not we are processing your personal data
              </li>
              <li>
                <strong>Right to access</strong> your personal data
              </li>
              <li>
                <strong>Right to correct</strong> inaccuracies in your personal data
              </li>
              <li>
                <strong>Right to request</strong> the deletion of your personal data
              </li>
              <li>
                <strong>Right to obtain a copy</strong> of the personal data you previously shared with us
              </li>
              <li>
                <strong>Right to non-discrimination</strong> for exercising your rights
              </li>
              <li>
                <strong>Right to opt out</strong> of the processing of your personal data if it is used for targeted
                advertising (or sharing as defined under California&apos;s privacy law), the sale of personal data,
                or profiling in furtherance of decisions that produce legal or similarly significant effects (
                <strong>profiling</strong>)
              </li>
            </ul>
            <p className="leading-relaxed">Depending upon the state where you live, you may also have the following rights:</p>
            <ul className="list-square space-y-1 pl-5">
              <li>
                Right to access the categories of personal data being processed (as permitted by applicable law,
                including the privacy law in Minnesota)
              </li>
              <li>
                Right to obtain a list of the categories of third parties to which we have disclosed personal data (as
                permitted by applicable law, including the privacy law in California, Delaware, and Maryland)
              </li>
              <li>
                Right to obtain a list of specific third parties to which we have disclosed personal data (as permitted
                by applicable law, including the privacy law in Minnesota and Oregon)
              </li>
              <li>
                Right to obtain a list of third parties to which we have sold personal data (as permitted by applicable
                law, including the privacy law in Connecticut)
              </li>
              <li>
                Right to review, understand, question, and depending on where you live, correct how personal data has
                been profiled (as permitted by applicable law, including the privacy law in Connecticut and Minnesota)
              </li>
              <li>
                Right to limit use and disclosure of sensitive personal data (as permitted by applicable law, including
                the privacy law in California)
              </li>
              <li>
                Right to opt out of the collection of sensitive data and personal data collected through the operation
                of a voice or facial recognition feature (as permitted by applicable law, including the privacy law in
                Florida)
              </li>
            </ul>
            <h3 className="text-lg font-semibold text-foreground">How to exercise your rights</h3>
            <p className="leading-relaxed">
              To exercise these rights, you can contact us by submitting a{' '}
              <PolicyLink href={DSAR_URL}>data subject access request</PolicyLink>, by emailing us at{' '}
              <a
                href="mailto:support@circeetvenus.com"
                className="font-medium text-primary underline underline-offset-2 hover:no-underline"
              >
                support@circeetvenus.com
              </a>
              , or by referring to the contact details at the bottom of this document.
            </p>
            <p className="leading-relaxed">
              Under certain US state data protection laws, you can designate an authorized agent to make a request on
              your behalf. We may deny a request from an authorized agent that does not submit proof that they have
              been validly authorized to act on your behalf in accordance with applicable laws.
            </p>
            <h3 className="text-lg font-semibold text-foreground">Request verification</h3>
            <p className="leading-relaxed">
              Upon receiving your request, we will need to verify your identity to determine you are the same person
              about whom we have the information in our system. We will only use personal information provided in your
              request to verify your identity or authority to make the request. However, if we cannot verify your
              identity from the information already maintained by us, we may request that you provide additional
              information for the purposes of verifying your identity and for security or fraud-prevention purposes.
            </p>
            <p className="leading-relaxed">
              If you submit the request through an authorized agent, we may need to collect additional information to
              verify your identity before processing your request and the agent will need to provide a written and
              signed permission from you to submit such request on your behalf.
            </p>
            <h3 className="text-lg font-semibold text-foreground">Appeals</h3>
            <p className="leading-relaxed">
              Under certain US state data protection laws, if we decline to take action regarding your request, you
              may appeal our decision by emailing us at{' '}
              <a
                href="mailto:admin@circeetvenus.com"
                className="font-medium text-primary underline underline-offset-2 hover:no-underline"
              >
                admin@circeetvenus.com
              </a>
              . We will inform you in writing of any action taken or not taken in response to the appeal, including a
              written explanation of the reasons for the decisions. If your appeal is denied, you may submit a
              complaint to your state attorney general.
            </p>
            <h3 className="text-lg font-semibold text-foreground">California &quot;Shine The Light&quot; law</h3>
            <p className="leading-relaxed">
              California Civil Code Section 1798.83, also known as the &quot;Shine The Light&quot; law, permits our
              users who are California residents to request and obtain from us, once a year and free of charge,
              information about categories of personal information (if any) we disclosed to third parties for direct
              marketing purposes and the names and addresses of all third parties with which we shared personal
              information in the immediately preceding calendar year. If you are a California resident and would like
              to make such a request, please submit your request in writing to us by using the contact details
              provided in the section{' '}
              <InternalLink href="#contact">How can you contact us about this notice?</InternalLink>.
            </p>
          </section>

          <section className="space-y-4" id="otherlaws">
            <h2 className="text-xl font-semibold text-foreground">14. Do other regions have specific privacy rights?</h2>
            <p className="leading-relaxed">
              <strong>
                <em>In short:</em>
              </strong>{' '}
              <em>You may have additional rights based on the country you reside in.</em>
            </p>
            <h3 className="text-lg font-semibold text-foreground">Australia and New Zealand</h3>
            <p className="leading-relaxed">
              We collect and process your personal information under the obligations and conditions set by
              Australia&apos;s Privacy Act 1988 and New Zealand&apos;s Privacy Act 2020 (Privacy Act).
            </p>
            <p className="leading-relaxed">
              This Privacy Notice satisfies the notice requirements defined in both Privacy Acts, in particular: what
              personal information we collect from you, from which sources, for which purposes, and other recipients
              of your personal information.
            </p>
            <p className="leading-relaxed">
              If you do not wish to provide the personal information necessary to fulfill their applicable purpose, it
              may affect our ability to provide our services, in particular:
            </p>
            <ul className="list-square space-y-1 pl-5">
              <li>Offer you the products or services that you want</li>
              <li>Respond to or help with your requests</li>
              <li>Manage your account with us</li>
              <li>Confirm your identity and protect your account</li>
            </ul>
            <p className="leading-relaxed">
              At any time, you have the right to request access to or correction of your personal information. You can
              make such a request by contacting us by using the contact details provided in the section{' '}
              <InternalLink href="#request">
                How can you review, update, or delete the data we collect from you?
              </InternalLink>
              .
            </p>
            <p className="leading-relaxed">
              If you believe we are unlawfully processing your personal information, you have the right to submit a
              complaint about a breach of the Australian Privacy Principles to the{' '}
              <PolicyLink href="https://www.oaic.gov.au/privacy/privacy-complaints/lodge-a-privacy-complaint-with-us">
                Office of the Australian Information Commissioner
              </PolicyLink>{' '}
              and a breach of New Zealand&apos;s Privacy Principles to the{' '}
              <PolicyLink href="https://www.privacy.org.nz/your-rights/making-a-complaint/">
                Office of New Zealand Privacy Commissioner
              </PolicyLink>
              .
            </p>
            <h3 className="text-lg font-semibold text-foreground">Republic of South Africa</h3>
            <p className="leading-relaxed">
              At any time, you have the right to request access to or correction of your personal information. You can
              make such a request by contacting us by using the contact details provided in the section{' '}
              <InternalLink href="#request">
                How can you review, update, or delete the data we collect from you?
              </InternalLink>
              .
            </p>
            <p className="leading-relaxed">
              If you are unsatisfied with the manner in which we address any complaint with regard to our processing of
              personal information, you can contact the office of the regulator, the details of which are:
            </p>
            <p className="leading-relaxed">
              <PolicyLink href="https://inforegulator.org.za/">The Information Regulator (South Africa)</PolicyLink>
            </p>
            <p className="leading-relaxed">
              General enquiries:{' '}
              <PolicyLink href="mailto:enquiries@inforegulator.org.za">enquiries@inforegulator.org.za</PolicyLink>
            </p>
            <p className="leading-relaxed">
              Complaints (complete POPIA/PAIA form 5):{' '}
              <PolicyLink href="mailto:PAIAComplaints@inforegulator.org.za">PAIAComplaints@inforegulator.org.za</PolicyLink>{' '}
              &amp;{' '}
              <PolicyLink href="mailto:POPIAComplaints@inforegulator.org.za">POPIAComplaints@inforegulator.org.za</PolicyLink>
            </p>
          </section>

          <section className="space-y-4" id="policyupdates">
            <h2 className="text-xl font-semibold text-foreground">15. Do we make updates to this notice?</h2>
            <p className="leading-relaxed">
              <strong>
                <em>In short:</em>
              </strong>{' '}
              <em>Yes, we will update this notice as necessary to stay compliant with relevant laws.</em>
            </p>
            <p className="leading-relaxed">
              We may update this Privacy Notice from time to time. The updated version will be indicated by an updated
              &quot;Revised&quot; date at the top of this Privacy Notice. If we make material changes to this Privacy
              Notice, we may notify you either by prominently posting a notice of such changes or by directly sending
              you a notification. We encourage you to review this Privacy Notice frequently to be informed of how we
              are protecting your information.
            </p>
          </section>

          <section className="space-y-4" id="contact">
            <h2 className="text-xl font-semibold text-foreground">16. How can you contact us about this notice?</h2>
            <p className="leading-relaxed">
              If you have questions or comments about this notice, you may email us at{' '}
              <a
                href="mailto:admin@circeetvenus.com"
                className="font-medium text-primary underline underline-offset-2 hover:no-underline"
              >
                admin@circeetvenus.com
              </a>{' '}
              or contact us by post at:
            </p>
            <address className="not-italic leading-relaxed">
              <strong>Circe et Venus</strong>
              <br />
              9721 Gessner Drive
              <br />
              Fort Worth, TX 76244
              <br />
              United States
            </address>
          </section>

          <section className="space-y-4" id="request">
            <h2 className="text-xl font-semibold text-foreground">
              17. How can you review, update, or delete the data we collect from you?
            </h2>
            <p className="leading-relaxed">
              Based on the applicable laws of your country or state of residence in the US, you may have the right to
              request access to the personal information we collect from you, details about how we have processed it,
              correct inaccuracies, or delete your personal information. You may also have the right to withdraw your
              consent to our processing of your personal information. These rights may be limited in some
              circumstances by applicable law. To request to review, update, or delete your personal information,
              please fill out and submit a{' '}
              <PolicyLink href={DSAR_URL}>data subject access request</PolicyLink>.
            </p>
          </section>

          <p className="text-sm text-muted-foreground">
            This Privacy Policy was created using Termly&apos;s{' '}
            <PolicyLink href="https://termly.io/products/privacy-policy-generator/">Privacy Policy Generator</PolicyLink>.
          </p>
        </article>

        <div className="sr-only" aria-hidden="true">
          <a href={DSAR_URL}>DSAR</a>
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-primary">
              Terms of Service
            </Link>
            <Link href="/cookies" className="hover:text-primary">
              Cookie Policy
            </Link>
            <Link href="/contact" className="hover:text-primary">
              Contact Us
            </Link>
            <Link href="/about" className="hover:text-primary">
              About Us
            </Link>
          </div>
          <FooterSupportSocial className="mt-4" />
        </div>
      </footer>
    </div>
  )
}
