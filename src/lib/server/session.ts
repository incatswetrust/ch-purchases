import { createHmac, timingSafeEqual } from 'node:crypto';
import { db } from '$lib/server/db';
import { env, isAllowedTelegramUserId } from '$lib/server/env';
import { users } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { error, type RequestEvent } from '@sveltejs/kit';

const SESSION_COOKIE = 'family_exp_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

type SessionPayload = {
	telegramId: string;
	expiresAt: number;
};

function sessionSecret(): string {
	return createHmac('sha256', env.TELEGRAM_WEBAPP_SECRET).update(env.TELEGRAM_BOT_TOKEN).digest('hex');
}

function sign(payload: string): string {
	return createHmac('sha256', sessionSecret()).update(payload).digest('hex');
}

function encodeSession(data: SessionPayload): string {
	const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
	return `${payload}.${sign(payload)}`;
}

function decodeSession(raw: string | undefined): SessionPayload | null {
	if (!raw) return null;
	const [payload, sig] = raw.split('.');
	if (!payload || !sig) return null;
	const expected = sign(payload);
	const isValid =
		sig.length === expected.length &&
		timingSafeEqual(Buffer.from(sig, 'utf8'), Buffer.from(expected, 'utf8'));
	if (!isValid) return null;
	try {
		const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionPayload;
		if (Date.now() > parsed.expiresAt) return null;
		return parsed;
	} catch {
		return null;
	}
}

export async function createSession(event: RequestEvent, telegramId: bigint): Promise<void> {
	const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
	event.cookies.set(
		SESSION_COOKIE,
		encodeSession({
			telegramId: telegramId.toString(),
			expiresAt
		}),
		{
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: event.url.protocol === 'https:',
			maxAge: SESSION_TTL_SECONDS
		}
	);
}

export function clearSession(event: RequestEvent): void {
	event.cookies.delete(SESSION_COOKIE, { path: '/' });
}

export async function getSessionUser(event: RequestEvent) {
	const session = decodeSession(event.cookies.get(SESSION_COOKIE));
	if (!session) return null;
	const telegramId = BigInt(session.telegramId);
	if (!isAllowedTelegramUserId(telegramId)) return null;
	const user = await db.query.users.findFirst({
		where: eq(users.telegramId, telegramId)
	});
	return user ?? null;
}

export function requireUser(event: RequestEvent) {
	const user = event.locals.user;
	if (!user) {
		throw error(401, 'Authentication required');
	}
	if (!isAllowedTelegramUserId(user.telegramId)) {
		throw error(403, 'User is not in allowlist');
	}
	return user;
}
