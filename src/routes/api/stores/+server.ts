import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { stores } from '$lib/server/schema';
import { requireUser } from '$lib/server/session';
import { parseJson } from '$lib/server/utils';
import { storeCreateSchema } from '$lib/server/validation';
import { json } from '@sveltejs/kit';

export async function GET(event) {
	requireUser(event);
	const rows = await db.select().from(stores).orderBy(asc(stores.name));
	return json({ data: rows });
}

export async function POST(event) {
	requireUser(event);
	const payload = await parseJson(event, storeCreateSchema);
	try {
		const [created] = await db.insert(stores).values({ name: payload.name }).returning();
		return json({ data: created }, { status: 201 });
	} catch {
		return json(
			{ error: { code: 'CONFLICT', message: 'Store with this name already exists' } },
			{ status: 409 }
		);
	}
}
