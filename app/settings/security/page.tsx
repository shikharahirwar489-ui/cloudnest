import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Logo } from '@/components/Logo';
import { SessionsList } from '@/components/SessionsList';
import { ChangePasswordForm } from '@/components/ChangePasswordForm';
export default async function Page() {
  const user = await requireUser();
  const sessions = await prisma.session.findMany({
    where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Logo />
      <h1 className="mt-10 text-3xl font-semibold">Security</h1>
      <section className="surface mt-7 rounded-xl p-5">
        <h2 className="font-medium">Active sessions</h2>
        <SessionsList
          initial={sessions.map((s) => ({
            ...s,
            createdAt: s.createdAt.toISOString(),
            expiresAt: s.expiresAt.toISOString(),
          }))}
        />
      </section>
      <section className="surface mt-7 rounded-xl p-5">
        <h2 className="font-medium">Change password</h2>
        <p className="mt-2 text-sm text-muted">
          Changing your password signs out your other active sessions.
        </p>
        <ChangePasswordForm />
      </section>
    </main>
  );
}
