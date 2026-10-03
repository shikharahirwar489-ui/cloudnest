import { logout, getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
export async function POST() { const current = await getSession(); if (current) await prisma.auditLog.create({ data: { userId: current.user.id, action: 'logout' } }); await logout(); return Response.json({ ok: true }); }
