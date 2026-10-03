import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getStorageProvider } from '@/lib/storage';
import { jsonError } from '@/lib/validation';
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const s = await getSession();
  if (!s) return jsonError('Unauthorized', 401);
  const f = await prisma.file.findFirst({
    where: { id: (await ctx.params).id, ownerId: s.user.id, deletedAt: null },
  });
  if (!f) return jsonError('File not found', 404);
  const stream = await getStorageProvider().download(f.storageObjectId);
  return new Response(stream as BodyInit, {
    headers: {
      'Content-Type': f.mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(f.name)}"`,
      'Cache-Control': 'private, no-store',
      'Content-Security-Policy': "sandbox; default-src 'none';",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
const body = z.object({
  name: z.string().trim().min(1).max(240).optional(),
  folderId: z.string().nullable().optional(),
  starred: z.boolean().optional(),
  action: z.enum(['trash', 'restore', 'delete']).optional(),
});
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const s = await getSession();
  if (!s) return jsonError('Unauthorized', 401);
  try {
    const v = body.parse(await req.json());
    const f = await prisma.file.findFirst({
      where: { id: (await ctx.params).id, ownerId: s.user.id },
    });
    if (!f) return jsonError('File not found', 404);
    if (
      v.folderId &&
      !(await prisma.folder.findFirst({
        where: { id: v.folderId, ownerId: s.user.id },
      }))
    )
      return jsonError('Folder not found', 404);
    const updated = await prisma.file.update({
      where: { id: f.id },
      data: {
        name: v.name,
        folderId: v.folderId,
        starred: v.starred,
        ...(v.action === 'trash' ? { deletedAt: new Date() } : {}),
        ...(v.action === 'restore' ? { deletedAt: null } : {}),
      },
    });
    if (v.action)
      await prisma.auditLog.create({
        data: {
          userId: s.user.id,
          action: v.action,
          targetType: 'file',
          targetId: f.id,
        },
      });
    return Response.json({ ...updated, size: Number(updated.size) });
  } catch {
    return jsonError('Invalid request');
  }
}
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const s = await getSession();
  if (!s) return jsonError('Unauthorized', 401);
  const f = await prisma.file.findFirst({
    where: {
      id: (await ctx.params).id,
      ownerId: s.user.id,
      deletedAt: { not: null },
    },
  });
  if (!f) return jsonError('File not found in trash', 404);
  await getStorageProvider().delete(f.storageObjectId, {
    messageId: f.telegramMessageId,
  });
  await prisma.file.delete({ where: { id: f.id } });
  await prisma.auditLog.create({
    data: {
      userId: s.user.id,
      action: 'delete',
      targetType: 'file',
      targetId: f.id,
    },
  });
  return Response.json({ ok: true });
}
