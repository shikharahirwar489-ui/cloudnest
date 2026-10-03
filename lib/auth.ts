import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from './prisma';
const COOKIE = 'cloudnest_session';
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
export async function createSession(userId: string) { const raw = randomBytes(32).toString('base64url'); const h = await headers(); await prisma.session.create({ data: { userId, tokenHash: hash(raw), userAgent: h.get('user-agent'), ip: h.get('x-forwarded-for')?.split(',')[0]?.trim(), expiresAt: new Date(Date.now() + 30 * 86400000) } }); (await cookies()).set(COOKIE, raw, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires: new Date(Date.now() + 30 * 86400000) }); }
export async function getSession() { const raw = (await cookies()).get(COOKIE)?.value; if (!raw) return null; const session = await prisma.session.findUnique({ where: { tokenHash: hash(raw) }, include: { user: true } }); if (!session || session.revokedAt || session.expiresAt < new Date()) return null; return { user: session.user, session }; }
export async function requireUser() { const value = await getSession(); if (!value) redirect('/login'); return value.user; }
export async function logout() { const raw = (await cookies()).get(COOKIE)?.value; if (raw) await prisma.session.updateMany({ where: { tokenHash: hash(raw), revokedAt: null }, data: { revokedAt: new Date() } }); (await cookies()).delete(COOKIE); }
