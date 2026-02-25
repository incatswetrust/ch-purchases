import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { loginTokens, users } from '$lib/server/schema';
import { parseQuery } from '$lib/server/utils';
import { createSession } from '$lib/server/session';
import { isAllowedTelegramUserId } from '$lib/server/env';
import { json } from '@sveltejs/kit';
import { loginPollQuerySchema } from '$lib/server/validation';

export async function GET(event) {
	const { token } = parseQuery(event, loginPollQuerySchema);
	const record = await db.query.loginTokens.findFirst({
		where: eq(loginTokens.token, token)
	});

	if (!record) {
		return json({ error: { code: 'NOT_FOUND', message: 'Token not found' } }, { status: 404 });
	}

	if (record.expiresAt < new Date() && record.status === 'pending') {
		await db
			.update(loginTokens)
			.set({ status: 'expired' })
			.where(eq(loginTokens.token, token));
		return json({ ok: false, status: 'expired' });
	}

	if (record.status === 'pending') {
		return json({ ok: false, status: 'pending' });
	}

	if (record.status !== 'approved' || !record.telegramId) {
		return json({ ok: false, status: record.status });
	}
	if (!isAllowedTelegramUserId(record.telegramId)) {
		return json({ error: { code: 'FORBIDDEN', message: 'User is not allowed' } }, { status: 403 });
	}

	const existing = await db.query.users.findFirst({ where: eq(users.telegramId, record.telegramId) });
	if (!existing) {
		await db.insert(users).values({
			telegramId: record.telegramId
		});
	}

	await createSession(event, record.telegramId);
	await db
		.update(loginTokens)
		.set({ status: 'used' })
		.where(eq(loginTokens.token, token));

	return json({ ok: true });
}
