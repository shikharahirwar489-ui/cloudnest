import Link from 'next/link';
import { Logo } from '@/components/Logo';

const details: Record<string, string[]> = {
  'Terms of Service': [
    'Who operates CloudNest and how users can contact them',
    'Account rules, permitted use, suspension, and service availability',
    'File retention, deletion, backups, and Telegram storage limitations',
    'Warranty, liability, dispute, and governing-law terms',
  ],
  'Privacy Notice': [
    'Operator identity and privacy contact',
    'Data collected, purposes, legal basis, processors, and retention periods',
    'Telegram and hosting providers, data locations, and international transfers',
    'User rights, account deletion, and complaint process',
  ],
  'Cookie Policy': [
    'Cookie and browser storage inventory',
    'Purposes and lifetimes of each item',
    'How users can change browser or consent settings',
  ],
  'Security Overview': [
    'Hosting and data-location details',
    'Encryption, access controls, backups, and incident process',
    'Known limitations, including no end-to-end encryption',
  ],
  'Acceptable Use': [
    'Prohibited content and activity',
    'Abuse reporting process and contact',
    'Review, enforcement, appeals, and account termination process',
  ],
  Contact: [
    'Support is currently listed as log.om.everyware@gmail.com; confirm that this inbox is monitored',
    'Expected support hours and response time',
    'Abuse, privacy, and security reporting contacts',
  ],
};

export function PolicyDraftPage({ title }: { title: keyof typeof details }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Logo />
      <div
        className="mt-12 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200"
        role="status"
      >
        This page is a launch draft. CloudNest is not ready to accept public
        accounts until the operator completes and reviews this information.
      </div>
      <h1 className="mt-8 text-3xl font-semibold">{title}</h1>
      <p className="mt-4 leading-7 text-muted">
        The operator must supply accurate service-specific information for this
        page. Do not rely on this draft as a legal notice or security
        certification.
      </p>
      {title === 'Contact' && (
        <p className="mt-4 text-sm">
          Contact: <a className="text-brand underline" href="mailto:log.om.everyware@gmail.com">log.om.everyware@gmail.com</a>
        </p>
      )}
      <h2 className="mt-8 text-lg font-medium">Information needed</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
        {details[title].map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <Link className="mt-12 inline-block text-sm text-brand" href="/">
        ← Back to CloudNest
      </Link>
    </main>
  );
}
