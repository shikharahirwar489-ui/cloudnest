import { rateLimit, requestKey } from '@/lib/rate-limit';
import { randomBytes, createHash } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { emailSchema, jsonError } from '@/lib/validation';
import { assertEmailConfigured, sendPasswordResetEmail } from '@/lib/email';
export async function POST(req: Request) {
  if (
    !rateLimit(
      'auth:app/api/auth/forgot-password/route.ts:' + requestKey(req),
      5,
      900000,
    )
  )
    return jsonError('Too many requests. Try again later.', 429);
  try {
    const { email } = z.object({ email: emailSchema }).parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      if (process.env.NODE_ENV === 'production') assertEmailConfigured();
      const token = randomBytes(32).toString('base64url');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const now = new Date();
      await prisma.$transaction([
        prisma.passwordResetToken.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: now },
        }),
        prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt: new Date(Date.now() + 3600000),
          },
        }),
      ]);
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin}/reset-password?token=${token}`;
      if (
        process.env.NODE_ENV !== 'production' &&
        !process.env.EMAIL_SERVER_HOST
      ) {
        console.info('CloudNest password reset link:', resetUrl);
      } else {
        await sendPasswordResetEmail(user.email, resetUrl);
      }
    }
    return Response.json({
      ok: true,
      message: 'If an account exists, reset instructions will be sent.',
    });
  } catch (error) {
    console.error('Password reset request failed:', error);
    return Response.json({
      ok: true,
      message: 'If an account exists, reset instructions will be sent.',
    });
  }
}
