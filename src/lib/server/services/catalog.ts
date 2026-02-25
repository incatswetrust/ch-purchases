import { db } from '$lib/server/db';
import { categories, products, stores } from '$lib/server/schema';
import { normalizeProductName } from '$lib/server/validation';
import { eq, sql } from 'drizzle-orm';

function normalizeStoreName(name: string): string {
	return name.trim().replace(/\s+/g, ' ');
}

export async function getOrCreateStoreByName(name: string): Promise<string> {
	const normalized = normalizeStoreName(name);
	if (!normalized) {
		throw new Error('Store name is required');
	}

	const existing = await db.query.stores.findFirst({
		where: sql`lower(${stores.name}) = ${normalized.toLowerCase()}`
	});
	if (existing) return existing.id;

	const [created] = await db
		.insert(stores)
		.values({
			name: normalized
		})
		.returning();
	return created.id;
}

export async function getOrCreateProductByName(name: string): Promise<string> {
	const normalized = normalizeProductName(name);
	if (!normalized) {
		throw new Error('Product name is required');
	}

	const existing = await db.query.products.findFirst({
		where: eq(products.normalizedName, normalized)
	});
	if (existing) return existing.id;

	const [created] = await db
		.insert(products)
		.values({
			name: name.trim(),
			normalizedName: normalized
		})
		.returning();
	return created.id;
}

export async function getOrCreateCategoryByName(name: string): Promise<string> {
	const normalized = name.trim().toLowerCase().replace(/\s+/g, ' ');
	if (!normalized) {
		throw new Error('Category name is required');
	}

	const existing = await db.query.categories.findFirst({
		where: sql`lower(${categories.name}) = ${normalized}`
	});
	if (existing) return existing.id;

	const [created] = await db
		.insert(categories)
		.values({
			name: name.trim()
		})
		.returning();
	return created.id;
}
