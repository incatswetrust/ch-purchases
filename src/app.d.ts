// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Error {
			error?: {
				code: string;
				message: string;
				details?: unknown;
			};
		}
		interface Locals {
			user: import('$lib/server/schema').users.$inferSelect | null;
		}
		interface PageData {
			user: import('$lib/server/schema').users.$inferSelect | null;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
