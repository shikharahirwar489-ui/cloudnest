import argon2 from 'argon2';
import { rateLimit, requestKey } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { getStorageProvider } from '@/lib/storage';
import { jsonError } from '@/lib/validation';

async function download(token: string, password?: string) {
  const link = await prisma.shareLink.findUnique({
    where: { token },
    include: { file: true },
  });
  if (
    !link ||
    link.revokedAt ||
    link.file.deletedAt ||
    (link.expiresAt && link.expiresAt < new Date())
  )
    return jsonError('Link unavailable', 404);
  if (
    link.passwordHash &&
    (!password || !(await argon2.verify(link.passwordHash, password)))
  )
    return jsonError('Password required or incorrect', 401);
  if (!link.allowDownload)
    return jsonError('Downloads are disabled for this share', 403);
  try {
    const body = await getStorageProvider().download(link.file.storageObjectId);
    return new Response(body as BodyInit, {
      headers: {
        'Content-Type': link.file.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(link.file.name)}"`,
        'Cache-Control': 'private, no-store',
        'Content-Security-Policy': "sandbox; default-src 'none';",
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return jsonError('File unavailable', 404);
  }
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  if (!rateLimit('share-download:' + requestKey(req), 30, 60000))
    return jsonError('Too many download requests. Try again shortly.', 429);
  const { token } = await ctx.params;
  return download(token);
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  if (!rateLimit('share-download:' + requestKey(req), 30, 60000))
    return jsonError('Too many download requests. Try again shortly.', 429);
  try {
    const form = await req.formData();
    const password = form.get('password');
    if (typeof password !== 'string' || password.length > 100)
      return jsonError('Password required or incorrect', 401);
    const { token } = await ctx.params;
    return download(token, password);
  } catch {
    return jsonError('Invalid request');
  }
}
