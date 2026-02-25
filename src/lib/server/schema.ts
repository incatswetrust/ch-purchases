import { sql } from 'drizzle-orm';
import {
	bigint,
	index,
	numeric,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';

export const loginTokenStatusEnum = pgEnum('login_token_status', [
	'pending',
	'approved',
	'used',
	'expired'
]);

export const users = pgTable('users', {
	id: uuid('id').defaultRandom().primaryKey(),
	telegramId: bigint('telegram_id', { mode: 'bigint' }).notNull().unique(),
	username: text('username'),
	firstName: text('first_name'),
	lastName: text('last_name'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const stores = pgTable(
	'stores',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		name: text('name').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [uniqueIndex('stores_name_lower_uniq').on(sql`lower(${table.name})`)]
);

export const categories = pgTable('categories', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: text('name').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const products = pgTable('products', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: text('name').notNull(),
	normalizedName: text('normalized_name').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const receipts = pgTable(
	'receipts',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		storeId: uuid('store_id')
			.notNull()
			.references(() => stores.id, { onDelete: 'restrict' }),
		purchasedAt: timestamp('purchased_at', { withTimezone: true }).notNull(),
		note: text('note'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [index('receipts_store_id_purchased_at_idx').on(table.storeId, table.purchasedAt)]
);

export const receiptItems = pgTable(
	'receipt_items',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		receiptId: uuid('receipt_id')
			.notNull()
			.references(() => receipts.id, { onDelete: 'cascade' }),
		productId: uuid('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'restrict' }),
		categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
		quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull(),
		unit: text('unit'),
		totalPrice: numeric('total_price', { precision: 14, scale: 2 }).notNull(),
		unitPrice: numeric('unit_price', { precision: 14, scale: 4 }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [index('receipt_items_receipt_id_idx').on(table.receiptId)]
);

export const storeProductPrices = pgTable(
	'store_product_prices',
	{
		storeId: uuid('store_id')
			.notNull()
			.references(() => stores.id, { onDelete: 'cascade' }),
		productId: uuid('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'cascade' }),
		lastUnitPrice: numeric('last_unit_price', { precision: 14, scale: 4 }).notNull(),
		lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		primaryKey({ columns: [table.storeId, table.productId] }),
		index('store_product_prices_product_id_idx').on(table.productId),
		index('store_product_prices_store_id_idx').on(table.storeId)
	]
);

export const loginTokens = pgTable('login_tokens', {
	token: uuid('token').primaryKey(),
	status: loginTokenStatusEnum('status').notNull().default('pending'),
	telegramId: bigint('telegram_id', { mode: 'bigint' }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
});

export const shoppingLists = pgTable('shopping_lists', {
	id: uuid('id').defaultRandom().primaryKey(),
	title: text('title').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const shoppingListItems = pgTable(
	'shopping_list_items',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		listId: uuid('list_id')
			.notNull()
			.references(() => shoppingLists.id, { onDelete: 'cascade' }),
		productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
		rawName: text('raw_name').notNull(),
		quantity: numeric('quantity', { precision: 14, scale: 3 }),
		unit: text('unit'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [index('shopping_list_items_list_id_idx').on(table.listId)]
);
