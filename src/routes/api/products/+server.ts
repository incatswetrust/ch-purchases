import { asc, ilike, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { products } from '$lib/server/schema';
import { requireUser } from '$lib/server/session';
import { parseJson, parseQuery } from '$lib/server/utils';
import { normalizeProductName, productCreateSchema, productsQuerySchema } from '$lib/server/validation';
import { json } from '@sveltejs/kit';

export async function GET(event) {
	requireUser(event);
	const query = parseQuery(event, productsQuerySchema);
	const rows = await db
		.select()
		.from(products)
		.where(query.q ? ilike(products.name, `%${query.q}%`) : undefined)
		.orderBy(asc(products.name))
		.limit(100);
	return json({ data: rows });
}

export async function POST(event) {
	requireUser(event);
	const payload = await parseJson(event, productCreateSchema);
	const normalizedName = normalizeProductName(payload.name);
	const existing = await db.query.products.findFirst({
		where: sql`${products.normalizedName} = ${normalizedName}`
	});
	if (existing) return json({ data: existing }, { status: 200 });
	const [created] = await db
		.insert(products)
		.values({
			name: payload.name.trim(),
			normalizedName
		})
		.returning();
	return json({ data: created }, { status: 201 });
}
