import { rateLimit, requestKey } from '@/lib/rate-limit';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getStorageProvider } from '@/lib/storage';
import { cleanFileName, inferMime, jsonError } from '@/lib/validation';
export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return jsonError('Unauthorized', 401);
  const u = new URL(req.url);
  const page = Math.max(1, Number(u.searchParams.get('page') || 1));
  const folderId = u.searchParams.get('folderId');
  const view = u.searchParams.get('view');
  const where = {
    ownerId: s.user.id,
    deletedAt: view === 'trash' ? { not: null } : null,
    ...(view === 'starred' ? { starred: true } : {}),
    ...(view === 'recent'
      ? { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } }
      : {}),
    ...(folderId ? { folderId } : {}),
  };
  const items = await prisma.file.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * 50,
    take: 50,
  });
  return Response.json(items.map((f) => ({ ...f, size: Number(f.size) })));
}
export async function POST(req: Request) {
  if (!rateLimit('upload:' + requestKey(req), 20, 60000))
    return jsonError('Too many uploads. Try again shortly.', 429);
  const session = await getSession();
  if (!session) return jsonError('Unauthorized', 401);
  try {
    const form = await req.formData();
    const file = form.get('file');
    const folderId = form.get('folderId');
    if (!(file instanceof File)) return jsonError('Choose a file to upload.');

    const provider = process.env.STORAGE_PROVIDER || 'local';
    const configuredMax = Number(process.env.UPLOAD_MAX_BYTES || 52428800);
    const standardTelegramApi =
      (process.env.TELEGRAM_API_BASE_URL || 'https://api.telegram.org').replace(
        /\/+$/,
        '',
      ) === 'https://api.telegram.org';
    const max =
      provider === 'telegram' && standardTelegramApi
        ? Math.min(configuredMax, 20 * 1024 * 1024)
        : configuredMax;
    if (!Number.isFinite(max) || max <= 0)
      return jsonError('The upload limit is not configured correctly.', 500);
    if (file.size > max)
      return jsonError(
        `This file exceeds the ${Math.floor(max / 1024 / 1024)} MB upload limit.`,
        413,
      );

    if (
      folderId &&
      typeof folderId === 'string' &&
      !(await prisma.folder.findFirst({
        where: { id: folderId, ownerId: session.user.id, deletedAt: null },
      }))
    )
      return jsonError('Folder not found', 404);
    const bytes = Buffer.from(await file.arrayBuffer());
    let mime: string;
    try {
      mime = inferMime(file.name, bytes);
    } catch {
      return jsonError('This file type does not match its contents.', 415);
    }

    const total = await prisma.file.aggregate({
      where: { ownerId: session.user.id, deletedAt: null },
      _sum: { size: true },
    });
    const quota = Number(process.env.STORAGE_QUOTA_BYTES || 10737418240);
    if (Number(total._sum.size || 0) + file.size > quota)
      return jsonError(
        'Your storage quota is full. Delete files or contact support.',
        413,
      );

    const stored = await getStorageProvider().upload({
      data: bytes,
      name: cleanFileName(file.name),
      mime,
    });
    try {
      const record = await prisma.file.create({
        data: {
          ownerId: session.user.id,
          folderId: typeof folderId === 'string' ? folderId : null,
          name: cleanFileName(file.name),
          originalName: file.name,
          size: stored.size,
          mimeType: mime,
          storageProvider: provider,
          storageObjectId: stored.storageObjectId,
          telegramFileId:
            provider === 'telegram' ? stored.storageObjectId : null,
          telegramMessageId: stored.meta?.messageId
            ? String(stored.meta.messageId)
            : null,
        },
      });
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'upload',
          targetType: 'file',
          targetId: record.id,
        },
      });
      return Response.json(
        { ...record, size: Number(record.size) },
        { status: 201 },
      );
    } catch (error) {
      await getStorageProvider()
        .delete(stored.storageObjectId, stored.meta)
        .catch(() => undefined);
      throw error;
    }
  } catch (error) {
    console.error('File upload failed:', error);
    return jsonError(
      'Upload failed. Check your connection and try again.',
      500,
    );
  }
}
