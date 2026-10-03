import { rateLimit, requestKey } from '@/lib/rate-limit';
import argon2 from 'argon2';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { jsonError, passwordSchema } from '@/lib/validation';
const schema = z.object({
  token: z.string().min(20),
  password: passwordSchema,
});
export async function POST(req: Request) {
  if (!rateLimit('auth:reset-password:' + requestKey(req), 5, 900000))
    return jsonError('Too many requests. Try again later.', 429);
  try {
    const { token, password } = schema.parse(await req.json());
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const row = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    if (!row || row.usedAt || row.expiresAt < new Date())
      return jsonError('Reset link is invalid or expired', 400);
    const passwordHash = await argon2.hash(password);
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: row.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) throw new Error('Reset link already used');
      await tx.user.update({
        where: { id: row.userId },
        data: { passwordHash },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: row.userId, usedAt: null },
        data: { usedAt: now },
      });
      await tx.session.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: { revokedAt: now },
      });
    });
    return Response.json({ ok: true });
  } catch {
    return jsonError('Invalid or expired reset link. Request a new one.');
  }
}
