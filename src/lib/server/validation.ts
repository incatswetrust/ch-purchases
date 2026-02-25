import { z } from 'zod';

export const idParamSchema = z.object({
	id: z.uuid()
});

export const storeCreateSchema = z.object({
	name: z.string().trim().min(1).max(120)
});

export const storeUpdateSchema = storeCreateSchema;

export const categoryCreateSchema = z.object({
	name: z.string().trim().min(1).max(120)
});

export const categoryUpdateSchema = categoryCreateSchema;

export function normalizeProductName(name: string): string {
	return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export const productCreateSchema = z.object({
	name: z.string().trim().min(1).max(200)
});

export const productUpdateSchema = productCreateSchema;

export const productsQuerySchema = z.object({
	q: z.string().trim().max(200).optional(),
	query: z.string().trim().max(200).optional()
});

export const receiptCreateSchema = z.object({
	storeId: z.uuid().optional(),
	storeName: z.string().trim().min(1).max(120).optional(),
	purchasedAt: z.coerce.date(),
	note: z.string().trim().max(2000).nullable().optional(),
	items: z
		.array(
			z.object({
				productName: z.string().trim().min(1).max(200),
				quantity: z.coerce.number().positive(),
				unit: z.string().trim().max(24).nullable().optional(),
				totalPrice: z.coerce.number().min(0)
			})
		)
		.optional()
});

export const receiptUpdateSchema = z.object({
	storeId: z.uuid(),
	purchasedAt: z.coerce.date(),
	note: z.string().trim().max(2000).nullable().optional()
});

export const receiptsQuerySchema = z.object({
	storeId: z.uuid().optional(),
	from: z.coerce.date().optional(),
	to: z.coerce.date().optional()
});

export const receiptItemCreateSchema = z.object({
	productId: z.uuid(),
	categoryId: z.uuid().nullable().optional(),
	quantity: z.coerce.number().positive(),
	unit: z.string().trim().max(24).nullable().optional(),
	totalPrice: z.coerce.number().min(0)
});

export const receiptItemUpdateSchema = receiptItemCreateSchema;

export const loginPollQuerySchema = z.object({
	token: z.uuid()
});

export const shoppingListCreateSchema = z.object({
	title: z.string().trim().min(1).max(200),
	items: z.array(
		z.object({
			productId: z.uuid().nullable().optional(),
			rawName: z.string().trim().min(1).max(200),
			quantity: z.coerce.number().positive().nullable().optional(),
			unit: z.string().trim().max(24).nullable().optional()
		})
	)
});
