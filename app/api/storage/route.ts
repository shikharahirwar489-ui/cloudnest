import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { jsonError } from '@/lib/validation';
export async function GET() {
  const s = await getSession();
  if (!s) return jsonError('Unauthorized', 401);
  const rows = await prisma.file.groupBy({
    by: ['mimeType'],
    where: { ownerId: s.user.id, deletedAt: null },
    _sum: { size: true },
  });
  const used = rows.reduce((n, r) => n + Number(r._sum.size || 0), 0);
  const quota = Number(process.env.STORAGE_QUOTA_BYTES || 10737418240);
  const configuredMax = Number(process.env.UPLOAD_MAX_BYTES || 52428800);
  const standardTelegramApi =
    (process.env.TELEGRAM_API_BASE_URL || 'https://api.telegram.org').replace(
      /\/+$/,
      '',
    ) === 'https://api.telegram.org';
  const maxUploadBytes =
    process.env.STORAGE_PROVIDER === 'telegram' && standardTelegramApi
      ? Math.min(configuredMax, 20 * 1024 * 1024)
      : configuredMax;
  return Response.json({
    used,
    quota,
    maxUploadBytes,
    storageProvider: process.env.STORAGE_PROVIDER || 'local',
    categories: rows.map((r) => ({
      mimeType: r.mimeType,
      size: Number(r._sum.size || 0),
    })),
  });
}
