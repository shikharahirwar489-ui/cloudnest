import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { jsonError } from '@/lib/validation';
const schema = z.object({ name: z.string().trim().min(1).max(100), parentId: z.string().nullable().optional() });
export async function GET(req: Request) { const s = await getSession(); if (!s) return jsonError('Unauthorized', 401); const parentId = new URL(req.url).searchParams.get('parentId'); const folders = await prisma.folder.findMany({ where: { ownerId: s.user.id, deletedAt: null, parentId: parentId || null }, orderBy: { name: 'asc' }, take: 100 }); return Response.json(folders); }
export async function POST(req: Request) { const s = await getSession(); if (!s) return jsonError('Unauthorized', 401); try { const v = schema.parse(await req.json()); if (v.parentId && !(await prisma.folder.findFirst({ where: { id: v.parentId, ownerId: s.user.id, deletedAt: null } }))) return jsonError('Parent folder not found', 404); return Response.json(await prisma.folder.create({ data: { ownerId: s.user.id, name: v.name, parentId: v.parentId } }), { status: 201 }); } catch { return jsonError('Invalid folder details'); } }
