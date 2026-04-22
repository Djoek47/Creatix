'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, Cookie } from 'lucide-react'
import { FooterSupportSocial } from '@/components/marketing/footer-support-social'
import { ThemedLogo } from '@/components/themed-logo'
import { Button } from '@/components/ui/button'

const SITE = 'https://circeetvenus.com'

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

export default function CookiePolicyPage() {
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
          <Cookie className="h-8 w-8 text-primary" />
          <h1 className="font-serif text-2xl font-bold sm:text-3xl">Cookie Policy</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Last updated: <strong className="font-medium text-foreground">April 21, 2026</strong>
        </p>

        <article className="prose prose-invert mt-8 max-w-full space-y-8 text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground">
          <p className="leading-relaxed">
            This Cookie Policy explains how <strong>Circe et Venus</strong> (“<strong>Company</strong>,” “
            <strong>we</strong>,” “<strong>us</strong>,” and “<strong>our</strong>”) uses cookies and similar
            technologies to recognize you when you visit our website at{' '}
            <PolicyLink href={SITE}>{SITE}</PolicyLink> (“<strong>Website</strong>”). It explains what these
            technologies are and why we use them, as well as your rights to control our use of them.
          </p>
          <p className="leading-relaxed">
            In some cases we may use cookies to collect personal information, or that becomes personal
            information if we combine it with other information.
          </p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">What are cookies?</h2>
            <p className="leading-relaxed">
              Cookies are small data files that are placed on your computer or mobile device when you visit a
              website. Cookies are widely used by website owners in order to make their websites work, or to work
              more efficiently, as well as to provide reporting information.
            </p>
            <p className="leading-relaxed">
              Cookies set by the website owner (in this case, <strong>Circe et Venus</strong>) are called
              “first-party cookies.” Cookies set by parties other than the website owner are called “third-party
              cookies.” Third-party cookies enable third-party features or functionality to be provided on or
              through the website (e.g., advertising, interactive content, and analytics). The parties that set
              these third-party cookies can recognize your computer both when it visits the website in question
              and also when it visits certain other websites.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Why do we use cookies?</h2>
            <p className="leading-relaxed">
              We use first- and third-party cookies for several reasons. Some cookies are required for technical
              reasons in order for our Website to operate, and we refer to these as “essential” or “strictly
              necessary” cookies. Other cookies also enable us to track and target the interests of our users to
              enhance the experience on our Online Properties. Third parties serve cookies through our Website for
              advertising, analytics, and other purposes. This is described in more detail below.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">How can I control cookies?</h2>
            <p className="leading-relaxed">
              You have the right to decide whether to accept or reject cookies. You can exercise your cookie
              rights by setting your preferences in the Cookie Preference Center. The Cookie Preference Center
              allows you to select which categories of cookies you accept or reject. Essential cookies cannot be
              rejected as they are strictly necessary to provide you with services.
            </p>
            <p className="leading-relaxed">
              The Cookie Preference Center can be found in the notification banner and on our Website. If you
              choose to reject cookies, you may still use our Website though your access to some functionality and
              areas of our Website may be restricted. You may also set or amend your web browser controls to
              accept or refuse cookies.
            </p>
            <p className="leading-relaxed">
              The specific types of first- and third-party cookies served through our Website and the purposes they
              perform may vary depending on the specific Online Properties you visit; details are available in
              your cookie preferences UI when shown.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">How can I control cookies on my browser?</h2>
            <p className="leading-relaxed">
              As the means by which you can refuse cookies through your web browser controls vary from browser to
              browser, you should visit your browser&apos;s help menu for more information. The following is
              information about how to manage cookies on the most popular browsers:
            </p>
            <ul className="list-square space-y-1 pl-5">
              <li>
                <PolicyLink href="https://support.google.com/chrome/answer/95647#zippy=%2Callow-or-block-cookies">
                  Chrome
                </PolicyLink>
              </li>
              <li>
                <PolicyLink href="https://support.microsoft.com/en-us/windows/delete-and-manage-cookies-168dab11-0753-043d-7c16-ede5947fc64d">
                  Internet Explorer
                </PolicyLink>
              </li>
              <li>
                <PolicyLink href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop?redirectslug=enable-and-disable-cookies-website-preferences&redirectlocale=en-US">
                  Firefox
                </PolicyLink>
              </li>
              <li>
                <PolicyLink href="https://support.apple.com/en-ie/guide/safari/sfri11471/mac">Safari</PolicyLink>
              </li>
              <li>
                <PolicyLink href="https://support.microsoft.com/en-us/windows/microsoft-edge-browsing-data-and-privacy-bb8174ba-9d73-dcf2-9b4a-c582b4e640dd">
                  Edge
                </PolicyLink>
              </li>
              <li>
                <PolicyLink href="https://help.opera.com/en/latest/web-preferences/">Opera</PolicyLink>
              </li>
            </ul>
            <p className="leading-relaxed">
              In addition, most advertising networks offer you a way to opt out of targeted advertising. If you
              would like to find out more information, please visit:
            </p>
            <ul className="list-square space-y-1 pl-5">
              <li>
                <PolicyLink href="http://www.aboutads.info/choices/">Digital Advertising Alliance</PolicyLink>
              </li>
              <li>
                <PolicyLink href="https://youradchoices.ca/">
                  Digital Advertising Alliance of Canada
                </PolicyLink>
              </li>
              <li>
                <PolicyLink href="http://www.youronlinechoices.com/">
                  European Interactive Digital Advertising Alliance
                </PolicyLink>
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">
              What about other tracking technologies, like web beacons?
            </h2>
            <p className="leading-relaxed">
              Cookies are not the only way to recognize or track visitors to a website. We may use other, similar
              technologies from time to time, like web beacons (sometimes called “tracking pixels” or “clear
              gifs”). These are tiny graphics files that contain a unique identifier that enables us to recognize
              when someone has visited our Website or opened an email including them. This allows us, for example,
              to monitor the traffic patterns of users from one page within a website to another, to deliver or
              communicate with cookies, to understand whether you have come to the website from an online
              advertisement displayed on a third-party website, to improve site performance, and to measure the
              success of email marketing campaigns. In many instances, these technologies are reliant on cookies
              to function properly, and so declining cookies will impair their functioning.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Do you use Flash cookies or Local Shared Objects?</h2>
            <p className="leading-relaxed">
              Websites may also use so-called “Flash Cookies” (also known as Local Shared Objects or “LSOs”) to,
              among other things, collect and store information about your use of our services, fraud prevention,
              and for other site operations.
            </p>
            <p className="leading-relaxed">
              If you do not want Flash Cookies stored on your computer, you can adjust the settings of your Flash
              player to block Flash Cookies storage using the tools contained in the{' '}
              <PolicyLink href="http://www.macromedia.com/support/documentation/en/flashplayer/help/settings_manager07.html">
                Website Storage Settings Panel
              </PolicyLink>
              . You can also control Flash Cookies by going to the{' '}
              <PolicyLink href="http://www.macromedia.com/support/documentation/en/flashplayer/help/settings_manager03.html">
                Global Storage Settings Panel
              </PolicyLink>{' '}
              and following the instructions (which may include instructions that explain, for example, how to
              delete existing Flash Cookies (referred to “information” on the Macromedia site), how to prevent
              Flash LSOs from being placed on your computer without your being asked, and (for Flash Player 8 and
              later) how to block Flash Cookies that are not being delivered by the operator of the page you are on
              at the time).
            </p>
            <p className="leading-relaxed">
              Please note that setting the Flash Player to restrict or limit acceptance of Flash Cookies may
              reduce or impede the functionality of some Flash applications, including, potentially, Flash
              applications used in connection with our services or online content.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Do you serve targeted advertising?</h2>
            <p className="leading-relaxed">
              Third parties may serve cookies on your computer or mobile device to serve advertising through our
              Website. These companies may use information about your visits to this and other websites in order
              to provide relevant advertisements about goods and services that you may be interested in. They may
              also employ technology that is used to measure the effectiveness of advertisements. They can
              accomplish this by using cookies or web beacons to collect information about your visits to this
              and other sites in order to provide relevant advertisements about goods and services of potential
              interest to you. The information collected through this process does not enable us or them to
              identify your name, contact details, or other details that directly identify you unless you choose to
              provide these.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">How often will you update this Cookie Policy?</h2>
            <p className="leading-relaxed">
              We may update this Cookie Policy from time to time in order to reflect, for example, changes to the
              cookies we use or for other operational, legal, or regulatory reasons. Please therefore revisit this
              Cookie Policy regularly to stay informed about our use of cookies and related technologies.
            </p>
            <p className="leading-relaxed">
              The date at the top of this Cookie Policy indicates when it was last updated.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Where can I get further information?</h2>
            <p className="leading-relaxed">
              If you have any questions about our use of cookies or other technologies, please contact us at{' '}
              <a
                href="mailto:privacy@circeetvenus.com"
                className="font-medium text-primary underline underline-offset-2 hover:no-underline"
              >
                privacy@circeetvenus.com
              </a>
              .
            </p>
          </section>

          <section className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <h2 className="text-lg font-semibold text-foreground">Technologies on this Website</h2>
            <p className="text-sm leading-relaxed">
              In addition to the categories above, our Website may use providers such as{' '}
              <strong>Supabase</strong> (authentication and data), <strong>Stripe</strong> (payments on billing
              pages), and <strong>Vercel</strong> (hosting and privacy-focused analytics). Those services may set
              their own cookies or similar storage subject to their policies and your choices.
            </p>
          </section>

          <p className="text-sm text-muted-foreground">
            This Cookie Policy was created using Termly&apos;s{' '}
            <PolicyLink href="https://termly.io/products/cookie-consent-manager/">Cookie Consent Manager</PolicyLink>
            .
          </p>
        </article>

        {/* Termly DSAR hook — keep for consent platform integration */}
        <div className="sr-only" aria-hidden="true">
          <a href="https://app.termly.io/dsar/0f17a2cf-72de-4d50-864b-367b437417a4">DSAR</a>
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-primary">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-primary">
              Privacy Policy
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
