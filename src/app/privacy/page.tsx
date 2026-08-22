import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { PoweredBy } from "@/components/PoweredBy";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crew Dispatch Privacy Policy",
  description:
    "Privacy Policy for the Crew Dispatch brand and SMS program, including how we collect mobile numbers and send transactional texts.",
};

const updated = "August 19, 2026";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <header className="border-b border-border-default bg-bg-raised">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="inline-flex">
            <BrandMark className="text-xl" />
          </Link>
          <Link
            href="/crew/login"
            className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
          >
            Crew login
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400">
          Crew Dispatch
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Crew Dispatch Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-text-muted">Last updated: {updated}</p>
        <p className="mt-4 space-y-2 rounded-lg border border-border-default bg-bg-raised px-4 py-3 text-sm text-text-secondary">
          <span className="block">
            <strong className="text-text-primary">
              Registered brand / legal business name:
            </strong>{" "}
            Lantana Electric LLC
          </span>
          <span className="block">
            <strong className="text-text-primary">Product / SMS name:</strong>{" "}
            Crew Dispatch
          </span>
          <span className="block">
            This Privacy Policy belongs to{" "}
            <strong className="text-text-primary">Lantana Electric LLC</strong>{" "}
            (also referred to as Lantana Electric), operating{" "}
            <strong className="text-text-primary">Crew Dispatch</strong> at{" "}
            <a
              href="https://crew-dispatch.com"
              className="text-amber-700 underline dark:text-amber-400"
            >
              https://crew-dispatch.com
            </a>
            .
          </span>
        </p>

        <div className="prose-policy mt-10 space-y-8 text-[15px] leading-relaxed text-text-secondary">
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-text-primary">
              1. Who we are
            </h2>
            <p>
              This Privacy Policy describes how{" "}
              <strong>Lantana Electric LLC</strong> (“we,” “us,” or “our”),
              doing business as <strong>Crew Dispatch</strong>, collects, uses,
              shares, and protects information in connection with our websites,
              applications, and services — including our crew and admin dispatch
              tools, related login and messaging features, and any other online
              services that link to this policy (collectively, the “Services”).
              Texts from this messaging program are sent under the brand name{" "}
              <strong>Crew Dispatch</strong>.
            </p>
            <p>
              By using the Services, providing contact information to us, or
              continuing to work with us as a crew member, subcontractor, staff
              user, or site visitor, you acknowledge this Privacy Policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-text-primary">
              2. Information we collect
            </h2>
            <p>Depending on how you interact with us, we may collect:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Identity and roster information</strong> — name, company
                or crew affiliation, role, and related profile details.
              </li>
              <li>
                <strong>Contact information</strong> — email address, phone /
                mobile number, and similar contact details used for login,
                dispatch, and support.
              </li>
              <li>
                <strong>Account and authentication data</strong> — sign-in
                records, session information, and security-related events (for
                example, magic-link or code-based sign-in activity).
              </li>
              <li>
                <strong>Job and operational data</strong> — assignments,
                schedules, job addresses or site references, accept/decline
                responses, messages about work, and related dispatch history.
              </li>
              <li>
                <strong>Device and usage data</strong> — IP address, browser or
                device type, approximate location derived from network data,
                pages or screens viewed, app/service events, and diagnostic
                logs.
              </li>
              <li>
                <strong>Communications</strong> — emails, texts, in-app
                messages, and support correspondence you send or receive through
                the Services.
              </li>
              <li>
                <strong>Preferences</strong> — language preference, notification
                settings, and similar choices you make in the product.
              </li>
            </ul>
            <p>
              We may collect information directly from you, from supervisors or
              administrators who manage the crew roster, from our business
              systems and integrations (for example, scheduling sources), and
              automatically through the Services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-text-primary">
              3. How we use information
            </h2>
            <p>We use information to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Operate, maintain, and improve the Services</li>
              <li>Authenticate users and protect accounts</li>
              <li>
                Coordinate dispatch, schedules, job assignments, and crew
                communications
              </li>
              <li>
                Send transactional notices, including sign-in links and job
                alerts by email or SMS where a contact method is on file
              </li>
              <li>Provide customer/crew support and respond to requests</li>
              <li>Monitor security, prevent fraud or misuse, and meet legal
                obligations</li>
              <li>
                Analyze aggregated or de-identified usage to improve reliability
                and usability
              </li>
            </ul>
            <p>
              We do <strong>not</strong> sell personal information. We do{" "}
              <strong>not</strong> use Crew Dispatch SMS for advertising or
              unrelated marketing campaigns.
            </p>
          </section>

          <section className="space-y-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-5">
            <h2 className="font-display text-xl font-bold text-text-primary">
              4. SMS / text messaging (important disclosures)
            </h2>
            <p>
              Texts from this program are sent under the brand name{" "}
              <strong>Crew Dispatch</strong>.
            </p>
            <p>
              <strong>How you opt in / consent:</strong> end users consent to
              receive Crew Dispatch SMS in one of these ways:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Web checkbox (self-serve):</strong> in Crew Dispatch
                Settings, a user enters their mobile number and checks a consent
                box before saving. The on-screen consent wording is: “I agree to
                receive SMS messages from Crew Dispatch for account sign-in and
                job alerts. Message frequency varies. Message and data rates may
                apply. Reply STOP to opt out, HELP for help. Consent is not a
                condition of employment. See our Privacy Policy.”
              </li>
              <li>
                <strong>Verbal / roster enrollment:</strong> a supervisor may
                collect a worker’s mobile number for the Crew Dispatch roster
                after obtaining the worker’s verbal consent to receive the same
                Crew Dispatch SMS types described above, and confirms that consent
                when saving the number in the admin Crew tools.
              </li>
            </ul>
            <p>
              Providing a mobile number and completing opt-in is how consumers
              agree to receive texts from Crew Dispatch. We do not buy lists or
              text numbers without that consent process.
            </p>
            <p>
              <strong>Message types:</strong> secure sign-in / magic links,
              job assignment alerts, and other operational dispatch notices.
            </p>
            <p>
              <strong>Message frequency:</strong> message frequency varies.
              You may receive messages when you request a sign-in link, when you
              are assigned or updated on a job, and for related operational
              notices. Frequency depends on your work schedule and activity in
              Crew Dispatch and is typically a small number of messages per week
              for active crew, but may be more or less as needed for login and
              dispatch.
            </p>
            <p>
              <strong>Message and data rates may apply.</strong> Your mobile
              carrier’s standard messaging and data rates may apply to any SMS
              you send or receive. Crew Dispatch is not responsible for
              carrier charges.
            </p>
            <p>
              <strong>Non-sharing of mobile numbers:</strong> We do{" "}
              <strong>not</strong> sell, rent, trade, or otherwise share mobile
              phone numbers with third parties or affiliates for their marketing
              or promotional purposes. Mobile numbers collected for Crew Dispatch
              are used to deliver our own transactional service messages and to
              operate the Services.
            </p>
            <p>
              <strong>Again, regarding mobile numbers:</strong> your mobile
              number is not shared with unaffiliated companies for those
              companies’ own marketing lists or campaigns. We do not provide
              mobile opt-in data or consent to third parties so they can text
              you for unrelated purposes.
            </p>
            <p>
              <strong>Service providers:</strong> we may use vendors (such as
              SMS delivery providers) solely to transmit messages and operate
              the Services on our behalf. Those providers are not authorized to
              use your mobile number for their own marketing.
            </p>
            <p>
              <strong>Opt-out:</strong> you can reply <strong>STOP</strong> to
              cancel SMS from that program. You may also update or remove your
              phone number in Crew Dispatch Settings (or ask a supervisor to
              update the roster). After opting out, you may still receive a
              final confirmation message. Reply <strong>HELP</strong> for help,
              or contact us using the details below.
            </p>
            <p>
              Consent to receive SMS is not a condition of employment or of
              purchasing any property, goods, or services where applicable law
              prohibits such a condition; however, certain Crew Dispatch features
              (such as text sign-in or text job alerts) require a valid mobile
              number to function.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-text-primary">
              5. Email and other notifications
            </h2>
            <p>
              We may also send transactional emails (for example, sign-in links
              and job alerts) to addresses on the roster or in your profile.
              You can update your email in Settings where available. Marketing
              email, if ever used by Crew Dispatch outside Crew Dispatch transactional
              notices, will include unsubscribe options as required by law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-text-primary">
              6. How we share information
            </h2>
            <p>We may share information with:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Service providers / processors</strong> who help us host
                the Services, store data, authenticate users, send email or SMS,
                monitor performance, or provide support (for example, cloud
                hosting, database, email, and messaging providers). These
                parties process data under our instructions and for our business
                purposes.
              </li>
              <li>
                <strong>Authorized internal users</strong> such as supervisors
                and administrators who need access to operate dispatch.
              </li>
              <li>
                <strong>Professional advisors</strong> (legal, accounting,
                insurance) when reasonably necessary.
              </li>
              <li>
                <strong>Legal and safety</strong> disclosures when required by
                law, regulation, legal process, or to protect rights, safety,
                and security.
              </li>
              <li>
                <strong>Business transfers</strong> in connection with a merger,
                acquisition, financing, or sale of assets, subject to appropriate
                protections.
              </li>
            </ul>
            <p>
              Except as described in this policy, we do not sell personal
              information, and we do not share mobile numbers for third-party
              marketing. We do not share personal information for
              cross-context behavioral advertising as those terms are commonly
              used under U.S. state privacy laws, and we do not use Crew Dispatch
              SMS data for that purpose.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-text-primary">
              7. Cookies and similar technologies
            </h2>
            <p>
              We and our providers may use cookies, local storage, and similar
              technologies for sign-in sessions, security, preferences, and
              basic analytics needed to run the Services. You can control
              cookies through your browser settings; some features may not work
              if cookies are disabled.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-text-primary">
              8. Data retention
            </h2>
            <p>
              We retain information for as long as needed to provide the
              Services, maintain business and dispatch records, resolve
              disputes, enforce agreements, and comply with legal, tax, and
              accounting requirements. Retention periods vary by record type.
              When we no longer need information, we delete or de-identify it
              when reasonably practicable.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-text-primary">
              9. Security
            </h2>
            <p>
              We use administrative, technical, and organizational measures
              designed to protect personal information. No method of
              transmission or storage is completely secure, and we cannot
              guarantee absolute security. Please protect your devices and
              sign-in links, and notify us promptly of any suspected
              unauthorized access.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-text-primary">
              10. Your choices and rights
            </h2>
            <p>Depending on your location and applicable law, you may have
              rights to access, correct, delete, or obtain a copy of certain
              personal information, or to object to or restrict certain
              processing. You can often update contact details and notification
              preferences in Crew Dispatch Settings, or by contacting a
              supervisor or us directly.</p>
            <p>
              For SMS opt-out, reply <strong>STOP</strong>. For help, reply{" "}
              <strong>HELP</strong> or contact us below. Message and data rates
              may apply to opt-out and help requests.
            </p>
            <p>
              If you are a California resident or resident of another state with
              consumer privacy rights, you may have additional rights regarding
              personal information. To exercise available rights, contact us
              using the information in Section 13. We will not discriminate
              against you for exercising privacy rights protected by law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-text-primary">
              11. Children
            </h2>
            <p>
              The Services are intended for authorized adult workers and staff.
              We do not knowingly collect personal information from children
              under 13 (or under 16 where required). If you believe we have
              collected such information, contact us and we will take
              appropriate steps to delete it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-text-primary">
              12. Changes to this policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. The “Last
              updated” date at the top will change when we do. Continued use of
              the Services after an update means you acknowledge the revised
              policy. For material changes, we may provide additional notice
              through the Services or other reasonable means.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold text-text-primary">
              13. Contact us
            </h2>
              <p>
                Questions about this Privacy Policy, SMS messaging, or personal
                information requests:
              </p>
              <p>
                <strong>Lantana Electric LLC</strong> d/b/a{" "}
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
                Website: https://crew-dispatch.com
                <br />
                SMS brand: Crew Dispatch
              </p>
            <p className="text-sm text-text-muted">
              This page is provided for transparency and carrier / messaging
              compliance. It is not legal advice. If you need a lawyer-reviewed
              policy for additional jurisdictions or contracts, have counsel
              review this text.
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
