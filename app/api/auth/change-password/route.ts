import argon2 from 'argon2';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { jsonError, passwordSchema } from '@/lib/validation';
import { rateLimit, requestKey } from '@/lib/rate-limit';

const schema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

export async function POST(req: Request) {
  if (!rateLimit('auth:change-password:' + requestKey(req), 5, 900000))
    return jsonError('Too many requests. Try again later.', 429);
  const current = await getSession();
  if (!current) return jsonError('Unauthorized', 401);
  try {
    const { currentPassword, newPassword } = schema.parse(await req.json());
    if (!(await argon2.verify(current.user.passwordHash, currentPassword)))
      return jsonError('Current password is incorrect.', 403);
    const passwordHash = await argon2.hash(newPassword);
    const now = new Date();
    await prisma.$transaction([
      prisma.user.update({
        where: { id: current.user.id },
        data: { passwordHash },
      }),
      prisma.session.updateMany({
        where: {
          userId: current.user.id,
          id: { not: current.session.id },
          revokedAt: null,
        },
        data: { revokedAt: now },
      }),
    ]);
    return Response.json({
      ok: true,
      message: 'Password changed. Other sessions were signed out.',
    });
  } catch {
    return jsonError(
      'Unable to change the password. Check the details and try again.',
    );
  }
}
