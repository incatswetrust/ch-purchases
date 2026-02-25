import { createHmac, timingSafeEqual } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { env, isAllowedTelegramUserId } from '$lib/server/env';
import { users } from '$lib/server/schema';

const MAX_AUTH_AGE_SECONDS = 60 * 60 * 24;

export type TelegramInitUser = {
	id: number;
	username?: string;
	first_name?: string;
	last_name?: string;
};

function hmacSha256(key: Buffer | string, message: string): Buffer {
	return createHmac('sha256', key).update(message).digest();
}

export function validateTelegramInitData(initData: string): { user: TelegramInitUser } {
	const params = new URLSearchParams(initData);
	const hash = params.get('hash');
	if (!hash) {
		throw new Error('Missing hash');
	}
	params.delete('hash');

	const lines = [...params.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, value]) => `${key}=${value}`);
	const dataCheckString = lines.join('\n');
	const secretKey = hmacSha256('WebAppData', env.TELEGRAM_BOT_TOKEN);
	const computedHashHex = hmacSha256(secretKey, dataCheckString).toString('hex');

	const ok =
		hash.length === computedHashHex.length &&
		timingSafeEqual(Buffer.from(hash, 'utf8'), Buffer.from(computedHashHex, 'utf8'));
	if (!ok) {
		throw new Error('Invalid hash');
	}

	const authDate = Number(params.get('auth_date') ?? '0');
	if (!Number.isFinite(authDate) || Date.now() / 1000 - authDate > MAX_AUTH_AGE_SECONDS) {
		throw new Error('Auth data is stale');
	}

	const userRaw = params.get('user');
	if (!userRaw) {
		throw new Error('Missing user payload');
	}
	const user = JSON.parse(userRaw) as TelegramInitUser;
	if (!user?.id) {
		throw new Error('Invalid user payload');
	}
	return { user };
}

export async function upsertTelegramUser(telegramUser: TelegramInitUser) {
	const telegramId = BigInt(telegramUser.id);
	if (!isAllowedTelegramUserId(telegramId)) {
		throw new Error('Forbidden');
	}
	const existing = await db.query.users.findFirst({
		where: eq(users.telegramId, telegramId)
	});
	if (existing) {
		const [updated] = await db
			.update(users)
			.set({
				username: telegramUser.username ?? null,
				firstName: telegramUser.first_name ?? null,
				lastName: telegramUser.last_name ?? null
			})
			.where(eq(users.id, existing.id))
			.returning();
		return updated;
	}

	const [created] = await db
		.insert(users)
		.values({
			telegramId,
			username: telegramUser.username ?? null,
			firstName: telegramUser.first_name ?? null,
			lastName: telegramUser.last_name ?? null
		})
		.returning();
	return created;
}
