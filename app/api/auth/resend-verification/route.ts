import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { emailSchema, jsonError } from '@/lib/validation';
import { assertEmailConfigured, sendVerificationEmail } from '@/lib/email';
import { rateLimit, requestKey } from '@/lib/rate-limit';

export async function POST(req: Request) {
  if (!rateLimit('auth:resend-verification:' + requestKey(req), 5, 900000))
    return jsonError('Too many requests. Try again later.', 429);
  try {
    const { email } = z.object({ email: emailSchema }).parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.emailVerifiedAt) {
      if (process.env.NODE_ENV === 'production') assertEmailConfigured();
      const token = randomBytes(32).toString('base64url');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const now = new Date();
      await prisma.$transaction([
        prisma.emailVerificationToken.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: now },
        }),
        prisma.emailVerificationToken.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt: new Date(Date.now() + 86400000),
          },
        }),
      ]);
      const url = `${process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin}/verify-email?token=${token}`;
      if (
        process.env.NODE_ENV !== 'production' &&
        !process.env.EMAIL_SERVER_HOST
      )
        return Response.json({ ok: true, verificationUrl: url });
      try {
        await sendVerificationEmail(user.email, url);
      } catch (error) {
        await prisma.emailVerificationToken.updateMany({
          where: { tokenHash, usedAt: null },
          data: { usedAt: now },
        });
        throw error;
      }
    }
    return Response.json({
      ok: true,
      message: 'If the account needs verification, an email will be sent.',
    });
  } catch (error) {
    console.error('Verification email request failed:', error);
    return jsonError(
      'Unable to send the verification email right now. Try again later.',
      503,
    );
  }
}
