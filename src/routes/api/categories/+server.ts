import { asc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { categories } from '$lib/server/schema';
import { requireUser } from '$lib/server/session';
import { parseJson } from '$lib/server/utils';
import { categoryCreateSchema } from '$lib/server/validation';
import { json } from '@sveltejs/kit';

export async function GET(event) {
	requireUser(event);
	const rows = await db.select().from(categories).orderBy(asc(categories.name));
	return json({ data: rows });
}

export async function POST(event) {
	requireUser(event);
	const payload = await parseJson(event, categoryCreateSchema);
	const [created] = await db.insert(categories).values({ name: payload.name }).returning();
	return json({ data: created }, { status: 201 });
}
