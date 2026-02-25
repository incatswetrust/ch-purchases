# Family Expense Tracker

Production-ready MVP for family receipt tracking with Telegram-only authentication.

## Stack

- SvelteKit + TypeScript (strict)
- Drizzle ORM + drizzle-kit
- Neon Postgres
- Telegram bot auth (WebApp initData + login token `/start` flow)

## Environment

Create `.env`:

```env
DATABASE_URL=postgresql://...
TELEGRAM_BOT_TOKEN=123456:ABCDEF
TELEGRAM_WEBAPP_SECRET=some-secret-for-cookie-signing
TELEGRAM_BOT_USERNAME=my_bot_username
TELEGRAM_ALLOWED_USER_IDS=123456789,987654321
APP_BASE_URL=https://your-app.vercel.app
LOGIN_TOKEN_TTL_SECONDS=300
TELEGRAM_WEBHOOK_SECRET_TOKEN=optional-secret-header
```

Notes:
- `TELEGRAM_ALLOWED_USER_IDS` is a comma-separated allowlist.
- Only allowlisted Telegram IDs can authenticate.
- If `TELEGRAM_WEBHOOK_SECRET_TOKEN` is set, webhook requires `X-Telegram-Bot-Api-Secret-Token`.

## Local development

```sh
npm install
npm run db:migrate
npm run dev
```

## Database and migrations

Scripts:

```sh
npm run db:generate
npm run db:migrate
npm run db:studio
```

Schema is in `src/lib/server/schema.ts`.
Initial migration is in `drizzle/0000_initial.sql`.

## Telegram auth flows

### 1) Telegram WebApp auth

Endpoint: `POST /api/auth/telegram-webapp`

Body:

```json
{ "initData": "querystring_from_telegram_webapp" }
```

Server verifies initData hash and auth date, checks allowlist, upserts user, sets secure cookie session.

### 2) Web login token flow

1. `POST /api/auth/web/start` returns:
   - `token`
   - `telegramUrl` like `https://t.me/<bot_username>?start=login_<token>`
2. User opens the bot URL.
3. Bot webhook processes `/start login_<token>`, approves token for allowlisted user.
4. Frontend polls `GET /api/auth/web/poll?token=...` until `ok: true`.

## Telegram webhook setup

Set webhook to:

`https://<your-domain>/api/telegram/webhook`

Example:

```sh
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url":"https://your-app.vercel.app/api/telegram/webhook",
    "secret_token":"your-optional-secret-token"
  }'
```

If you do not use a secret token, remove `secret_token` from request and unset `TELEGRAM_WEBHOOK_SECRET_TOKEN`.

## Vercel deployment

1. Import repo into Vercel.
2. Set all environment variables listed above.
3. Deploy.
4. Run migrations against production DB:
   - from local using production `DATABASE_URL`: `npm run db:migrate`
5. Configure Telegram webhook to the deployed URL.

## Main routes

- `/` landing
- `/login` login token flow
- `/dashboard` receipts list + filters
- `/receipts/new` create receipt
- `/receipts/[id]` edit receipt + add/edit/delete items
- `/analytics` spend by store/category and latest prices

## API highlights

- Auth: `/api/auth/telegram-webapp`, `/api/auth/web/start`, `/api/auth/web/poll`, `/api/auth/logout`
- Telegram: `/api/telegram/webhook`
- CRUD: `/api/stores`, `/api/categories`, `/api/products`, `/api/receipts`, `/api/receipt-items`
- Analytics: `/api/analytics`
- Shopping send: `POST /api/shopping/send`

### Shopping send endpoint

Endpoint:

`POST /api/shopping/send`

Body:

```json
{
  "items": [
    {
      "rawName": "Milk",
      "productId": null,
      "quantity": 1,
      "unit": "pcs"
    }
  ]
}
```

Behavior:
- Resolves cheapest stores when product + price history exist.
- Falls back to `Unknown / New items` when not resolvable.
- Sends formatted message to all IDs in `TELEGRAM_ALLOWED_USER_IDS`.
- Returns message preview and per-recipient delivery results.
