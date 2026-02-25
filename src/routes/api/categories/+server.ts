import { asc, ilike } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { categories } from '$lib/server/schema';
import { requireUser } from '$lib/server/session';
import { parseJson, parseQuery } from '$lib/server/utils';
import { categoriesQuerySchema, categoryCreateSchema } from '$lib/server/validation';
import { json } from '@sveltejs/kit';

export async function GET(event) {
	requireUser(event);
	const { query } = parseQuery(event, categoriesQuerySchema);
	const rows = await db
		.select()
		.from(categories)
		.where(query ? ilike(categories.name, `%${query}%`) : undefined)
		.orderBy(asc(categories.name))
		.limit(query ? 10 : 100);
	return json({ data: rows });
}

export async function POST(event) {
	requireUser(event);
	const payload = await parseJson(event, categoryCreateSchema);
	const [created] = await db.insert(categories).values({ name: payload.name }).returning();
	return json({ data: created }, { status: 201 });
}
