import {rateLimit,requestKey} from '@/lib/rate-limit';
import argon2 from 'argon2';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/auth';
import { emailSchema, jsonError } from '@/lib/validation';
const schema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });
export async function POST(req: Request) { if(!rateLimit('auth:app/api/auth/login/route.ts:'+requestKey(req),10,900000))return jsonError('Too many requests. Try again later.',429); try { const v = schema.parse(await req.json()); const user = await prisma.user.findUnique({ where: { email: v.email } }); if (!user || !(await argon2.verify(user.passwordHash, v.password))) return jsonError('Email or password is incorrect', 401); if(!user.emailVerifiedAt)return jsonError('Verify your email before logging in',403); await createSession(user.id); await prisma.auditLog.create({ data: { userId: user.id, action: 'login' } }); return Response.json({ user: { id: user.id, email: user.email, name: user.name } }); } catch { return jsonError('Invalid request'); } }
