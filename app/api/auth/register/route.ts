import { rateLimit, requestKey } from '@/lib/rate-limit';
import argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { emailSchema, jsonError, passwordSchema } from '@/lib/validation';
import { assertEmailConfigured, sendVerificationEmail } from '@/lib/email';
import { z } from 'zod';
const schema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1).max(80).optional(),
});
export async function POST(req: Request) {
  if (
    !rateLimit(
      'auth:app/api/auth/register/route.ts:' + requestKey(req),
      5,
      900000,
    )
  )
    return jsonError('Too many requests. Try again later.', 429);
  try {
    const input = schema.parse(await req.json());
    if (process.env.NODE_ENV === 'production') assertEmailConfigured();
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing)
      return jsonError('Unable to create account with those details', 409);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash: await argon2.hash(input.password),
        name: input.name,
      },
    });
    const token = randomBytes(32).toString('base64url');
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    await prisma.auditLog.create({
      data: { userId: user.id, action: 'register' },
    });

    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin}/verify-email?token=${token}`;
    if (
      process.env.NODE_ENV !== 'production' &&
      !process.env.EMAIL_SERVER_HOST
    ) {
      return Response.json({ verificationUrl }, { status: 201 });
    }
    try {
      await sendVerificationEmail(user.email, verificationUrl);
      return Response.json({ verificationRequired: true }, { status: 201 });
    } catch (error) {
      console.error('Verification email delivery failed:', error);
      await prisma.emailVerificationToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      return Response.json(
        { verificationRequired: true, emailDeliveryFailed: true },
        { status: 201 },
      );
    }
  } catch (error) {
    console.error('Registration failed:', error);
    return jsonError(
      'Unable to create your account right now. Check your details and try again.',
      400,
    );
  }
}
