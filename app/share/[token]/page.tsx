import { prisma } from '@/lib/prisma';
import { Download, FileText, LockKeyhole } from 'lucide-react';
export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }> | { token: string };
}) {
  const { token } = await params;
  const row = await prisma.shareLink.findUnique({
    where: { token },
    include: { file: true },
  });
  if (
    !row ||
    row.revokedAt ||
    row.file.deletedAt ||
    (row.expiresAt && row.expiresAt < new Date())
  )
    return (
      <main className="mx-auto max-w-lg px-6 py-32 text-center">
        <h1 className="text-2xl font-semibold">This link is unavailable</h1>
        <p className="mt-3 text-muted">
          The link may have expired or been revoked.
        </p>
      </main>
    );
  return (
    <main className="mx-auto max-w-lg px-6 py-32">
      <div className="surface rounded-2xl p-8 text-center">
        {row.passwordHash ? (
          <LockKeyhole className="mx-auto text-brand" />
        ) : (
          <FileText className="mx-auto text-brand" />
        )}
        <h1 className="mt-5 text-xl font-semibold">{row.file.name}</h1>
        <p className="mt-2 text-sm text-muted">Shared from CloudNest</p>
        {!row.allowDownload ? (
          <p className="mt-6 text-sm text-muted">
            Downloads are disabled for this link.
          </p>
        ) : row.passwordHash ? (
          <form
            action={`/api/share/${token}/download`}
            method="post"
            className="mt-6 space-y-3"
          >
            <input
              name="password"
              type="password"
              required
              placeholder="Enter link password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-line bg-ink px-3 py-3"
            />
            <button className="w-full rounded-lg bg-indigo-500 px-4 py-3">
              Download file
            </button>
          </form>
        ) : (
          <a
            href={`/api/share/${token}/download`}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-3"
          >
            <Download size={17} />
            Download file
          </a>
        )}
      </div>
    </main>
  );
}
