import { db } from '$lib/server/db';
import { env } from '$lib/server/env';
import { loginTokens } from '$lib/server/schema';
import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';

export async function POST() {
	const token = randomUUID();
	const expiresAt = new Date(Date.now() + env.LOGIN_TOKEN_TTL_SECONDS * 1000);
	await db.insert(loginTokens).values({
		token,
		status: 'pending',
		expiresAt
	});
	return json({
		token,
		telegramUrl: `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=login_${token}`
	});
}
