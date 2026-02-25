import { z } from 'zod';

const envSchema = z.object({
	DATABASE_URL: z.string().min(1),
	TELEGRAM_BOT_TOKEN: z.string().min(1),
	TELEGRAM_WEBAPP_SECRET: z.string().min(1),
	TELEGRAM_BOT_USERNAME: z.string().min(1),
	TELEGRAM_ALLOWED_USER_IDS: z.string().min(1),
	APP_BASE_URL: z.url(),
	LOGIN_TOKEN_TTL_SECONDS: z.coerce.number().int().positive(),
	TELEGRAM_WEBHOOK_SECRET_TOKEN: z.string().min(1).optional()
});

function toBigInt(value: string): bigint {
	try {
		return BigInt(value);
	} catch {
		throw new Error(`Invalid Telegram user id: "${value}"`);
	}
}

export function parseAllowedIds(envString: string): Set<bigint> {
	const ids = envString
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean)
		.map(toBigInt);

	if (ids.length === 0) {
		throw new Error('TELEGRAM_ALLOWED_USER_IDS cannot be empty');
	}

	return new Set(ids);
}

const parsedEnv = envSchema.parse(process.env);
const allowedIds = parseAllowedIds(parsedEnv.TELEGRAM_ALLOWED_USER_IDS);

export const env = {
	...parsedEnv,
	ALLOWED_TELEGRAM_IDS: allowedIds
} as const;

export function isAllowedTelegramUserId(id: bigint | number | string): boolean {
	return env.ALLOWED_TELEGRAM_IDS.has(typeof id === 'bigint' ? id : BigInt(id));
}
