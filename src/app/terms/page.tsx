import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { PoweredBy } from "@/components/PoweredBy";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions | Crew Dispatch",
  description:
    "Terms and Conditions for Crew Dispatch crew and admin services.",
};

const updated = "August 19, 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <header className="border-b border-border-default bg-bg-raised">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="inline-flex">
            <BrandMark className="text-xl" />
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/privacy"
              className="text-text-muted hover:text-text-primary hover:underline"
            >
              Privacy
            </Link>
            <Link
              href="/crew/login"
              className="font-medium text-amber-700 hover:underline dark:text-amber-400"
            >
              Crew login
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400">
          Crew Dispatch
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Terms and Conditions
        </h1>
        <p className="mt-3 text-sm text-text-muted">Last updated: {updated}</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-text-secondary">
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-text-primary">
              1. Agreement to these terms
            </h2>
            <p>
              These Terms and Conditions (“Terms”) govern your access to and use
              of websites, applications, and services operated by{" "}
              <strong>Crew Dispatch</strong> (“we,” “us,” or “our”), including
              our crew and admin dispatch tools, login, messaging, and scheduling
              features (collectively, the “Services”).
            </p>
            <p>
              By accessing or using the Services, creating or using an account,
              accepting a job assignment, or continuing to use Crew Dispatch after
              notice of these Terms, you agree to be bound by these Terms and
              our{" "}
              <Link href="/privacy" className="font-medium text-amber-700 underline dark:text-amber-400">
                Privacy Policy
              </Link>
              . If you do not agree, do not use the Services.
            </p>
            <p>
              If you use the Services on behalf of a company or other entity, you
              represent that you have authority to bind that entity, and “you”
              includes that entity.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-text-primary">
              2. What Crew Dispatch is
            </h2>
            <p>
              Crew Dispatch is an operational tool used by Crew Dispatch and authorized
              crew, subcontractors, and staff to view schedules, receive job
              assignments, respond to work (for example, accept or decline),
              exchange related messages, and manage contact preferences. It is
              provided for business and workforce coordination purposes.
            </p>
            <p>
              The Services may include email and SMS features such as sign-in
              links and job alerts. Use of messaging features is also subject to
              our Privacy Policy and any applicable carrier rules.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-text-primary">
              3. Eligibility and authorized use
            </h2>
            <p>
              The Services are intended for authorized adult workers, crew
              members, subcontractors, and Crew Dispatch staff. Access is limited to
              people who are invited, rostered, or otherwise authorized by
              Crew Dispatch. You may not use the Services if you are not authorized.
            </p>
            <p>You agree to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Provide accurate information and keep it reasonably current</li>
              <li>Use the Services only for lawful, authorized work purposes</li>
              <li>
                Keep sign-in links, codes, and devices secure and not share
                access credentials improperly
              </li>
              <li>
                Not attempt to access another user’s account, data, or jobs
                without authorization
              </li>
              <li>
                Not reverse engineer, scrape, disrupt, overload, or interfere
                with the Services
              </li>
              <li>
                Not use the Services to send spam, unlawful content, or harassing
                communications
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-text-primary">
              4. Accounts and security
            </h2>
            <p>
              You are responsible for activity under your account and for
              safeguarding devices used to access Crew Dispatch. Notify Crew Dispatch
              promptly if you believe your account, phone number, email, or
              sign-in link has been compromised. We may suspend or revoke access
              at any time to protect the Services, users, or Crew Dispatch’s
              operations.
            </p>
          </section>

          <section className="space-y-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-5">
            <h2 className="font-display text-xl font-bold text-text-primary">
              5. SMS, email, and communications
            </h2>
            <p>
              By providing a mobile number or email—or by having that contact
              information placed on the crew roster for dispatch—you acknowledge
              that Crew Dispatch may send transactional communications related to the
              Services, including sign-in links and job assignment notices.
            </p>
            <p>
              <strong>Message frequency varies</strong> based on login activity
              and job assignments.{" "}
              <strong>Message and data rates may apply</strong> for SMS.
            </p>
            <p>
              You can opt out of SMS by replying <strong>STOP</strong>, and may
              request help by replying <strong>HELP</strong>, or by updating
              contact details in Settings / asking a supervisor. Opting out of
              SMS may limit text-based login or alert features.
            </p>
            <p>
              Additional details about how we handle contact information are in
              our Privacy Policy. We do not sell mobile numbers or share them
              with third parties for their marketing.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-text-primary">
              6. Job assignments and responses
            </h2>
            <p>
              Job details shown in Crew Dispatch (addresses, dates, work type,
              notes, and assignments) are provided for operational coordination.
              Accepting, declining, or otherwise responding to a job in the
              Services may be used by Crew Dispatch for scheduling and workforce
              management. These Terms do not replace any separate subcontract,
              employment, or work agreement you may have with Crew Dispatch or another
              party.
            </p>
            <p>
              You are responsible for confirming schedule details through the
              normal channels Crew Dispatch provides and for complying with job-site
              rules, safety requirements, and applicable law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-text-primary">
              7. Intellectual property
            </h2>
            <p>
              The Services, including software, design, branding, logos, text,
              and other content (excluding content you lawfully provide), are
              owned by Crew Dispatch or its licensors and are protected by intellectual
              property laws. We grant you a limited, non-exclusive,
              non-transferable, revocable license to use the Services solely as
              authorized for your role. You may not copy, modify, distribute, or
              create derivative works from the Services except as expressly
              allowed by us in writing.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-text-primary">
              8. Third-party services
            </h2>
            <p>
              The Services may rely on third-party providers (for example,
              hosting, databases, authentication, email, and SMS delivery). Your
              use of those providers’ networks or apps may also be subject to
              their terms. Crew Dispatch is not responsible for third-party outages,
              carrier delays, or failures outside our reasonable control.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-text-primary">
              9. Disclaimer of warranties
            </h2>
            <p>
              THE SERVICES ARE PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE
              MAXIMUM EXTENT PERMITTED BY LAW, LANTANA DISCLAIMS ALL WARRANTIES,
              WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED
              WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
              TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICES
              WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF HARMFUL
              COMPONENTS, OR THAT JOB, SCHEDULE, OR MESSAGE DATA WILL ALWAYS BE
              COMPLETE, CURRENT, OR ACCURATE.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-text-primary">
              10. Limitation of liability
            </h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, LANTANA AND ITS OFFICERS,
              DIRECTORS, EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR
              PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, GOODWILL,
              OR BUSINESS INTERRUPTION, ARISING OUT OF OR RELATED TO YOUR USE OF
              (OR INABILITY TO USE) THE SERVICES, EVEN IF ADVISED OF THE
              POSSIBILITY OF SUCH DAMAGES.
            </p>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR TOTAL LIABILITY FOR ANY
              CLAIM ARISING OUT OF OR RELATING TO THE SERVICES OR THESE TERMS
              WILL NOT EXCEED ONE HUNDRED U.S. DOLLARS (US $100) OR THE AMOUNT
              YOU PAID US (IF ANY) SPECIFICALLY FOR SUB-DISPATCH ACCESS IN THE
              TWELVE MONTHS BEFORE THE CLAIM, WHICHEVER IS GREATER.
            </p>
            <p>
              Some jurisdictions do not allow certain limitations; in those
              cases, our liability is limited to the fullest extent permitted by
              law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-text-primary">
              11. Indemnification
            </h2>
            <p>
              You agree to defend, indemnify, and hold harmless Crew Dispatch and its
              officers, directors, employees, and agents from and against claims,
              damages, losses, liabilities, and expenses (including reasonable
              attorneys’ fees) arising out of or related to your misuse of the
              Services, your violation of these Terms, or your violation of any
              law or third-party right.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-text-primary">
              12. Suspension and termination
            </h2>
            <p>
              We may suspend, limit, or terminate access to the Services at any
              time, with or without notice, including for security reasons,
              inactivity, roster changes, misuse, or operational needs. You may
              stop using the Services at any time. Provisions that by their
              nature should survive (including intellectual property,
              disclaimers, limitations of liability, and indemnity) will survive
              termination.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-text-primary">
              13. Changes to the Services or Terms
            </h2>
            <p>
              We may modify the Services and these Terms from time to time. When
              we update these Terms, we will revise the “Last updated” date. Your
              continued use after changes become effective constitutes acceptance
              of the updated Terms, except where applicable law requires a
              different process.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-text-primary">
              14. Governing law
            </h2>
            <p>
              These Terms are governed by the laws of the State of Texas,
              excluding conflict-of-law rules. Courts located in Texas will have
              exclusive jurisdiction over disputes arising out of or relating to
              these Terms or the Services, unless applicable law requires
              otherwise.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-text-primary">
              15. General
            </h2>
            <p>
              These Terms, together with the Privacy Policy and any additional
              terms presented for specific features, are the entire agreement
              between you and Crew Dispatch regarding the Services and supersede prior
              agreements on that subject. If any provision is found
              unenforceable, the remaining provisions remain in effect. Our
              failure to enforce a provision is not a waiver. You may not assign
              these Terms without our consent; we may assign them in connection
              with a reorganization or transfer of assets.
            </p>
            <p>
              These Terms do not create an employment, partnership, or joint
              venture relationship by themselves, and do not override separate
              written agreements governing your work relationship with Crew Dispatch.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-text-primary">
              16. Contact
            </h2>
            <p>
              <strong>Crew Dispatch</strong>
              <br />
              Email:{" "}
              <a
                className="font-medium text-amber-700 underline dark:text-amber-400"
                href="mailto:support@crew-dispatch.com"
              >
                support@crew-dispatch.com
              </a>
              <br />
              Product: Crew Dispatch
            </p>
            <p className="text-sm text-text-muted">
              This page is provided for operational and compliance purposes and
              is not legal advice. Have counsel review if you need a
              lawyer-approved agreement.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border-subtle px-4 py-8">
        <PoweredBy />
        <p className="mt-3 text-center text-xs text-text-muted">
          <Link href="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
          {" · "}
          <Link href="/terms" className="hover:underline">
            Terms and Conditions
          </Link>
        </p>
      </footer>
    </div>
  );
}
