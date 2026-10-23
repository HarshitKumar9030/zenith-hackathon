import { randomBytes, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { db } from './db';
const derive = promisify(scrypt);
export const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
export async function passwordHash(password: string, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${(await derive(password, salt, 64) as Buffer).toString('hex')}`;
}
export async function passwordMatches(password: string, stored: string) {
  const [salt] = stored.split(':');
  const computed = await passwordHash(password, salt);
  return computed.length === stored.length && timingSafeEqual(Buffer.from(computed), Buffer.from(stored));
}
export async function currentUser() {
  const token = (await cookies()).get('ww_session')?.value;
  if (!token) return null;
  const database = await db();
  const session = await database.collection('sessions').findOne({_id: hashToken(token) as never, expiresAt: {$gt: new Date()}});
  if (!session) return null;
  return database.collection('users').findOne({_id: session.userId}, {projection: {password: 0}});
}
export async function createSession(userId: unknown) {
  const token = randomBytes(32).toString('hex');
  await (await db()).collection('sessions').insertOne({_id: hashToken(token) as never, userId, expiresAt: new Date(Date.now() + 7 * 86400000)});
  (await cookies()).set('ww_session', token, {httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 7 * 86400});
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new Error('Cross-origin request rejected');
}
