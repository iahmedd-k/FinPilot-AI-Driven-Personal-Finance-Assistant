# API reference

All application routes below are mounted under `/api`. Unless marked public,
routes require `Authorization: Bearer <access-token>`. Request bodies and
responses are JSON except for the CSV upload and Stripe webhook. The route
definitions are the source of truth for exact schemas and response shapes.

## Health

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/health` | No | API liveness response |
| `GET` | `/` | No | Root wake-up response (not under `/api`) |

## Authentication and account

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | No | Registration; validated |
| `POST` | `/api/auth/login` | No | Login; validated |
| `GET` | `/api/auth/google` | No | Begin Google OAuth |
| `GET` | `/api/auth/google/callback` | No | OAuth callback |
| `POST` | `/api/auth/refresh` | Refresh cookie | Issue a new access token |
| `POST` | `/api/auth/forgot-password` | No | Validated password reset request |
| `PATCH` | `/api/auth/reset-password/:token` | No | Validated password reset |
| `POST` | `/api/auth/logout` | Yes | End session |
| `GET` | `/api/auth/me` | Yes | Current account |
| `GET` | `/api/auth/currency-options` | Yes | Available currencies |
| `PUT` | `/api/auth/currency` | Yes | Update preferred currency |
| `PUT` | `/api/auth/profile` | Yes | Update profile |
| `PUT` | `/api/auth/password` | Yes | Update password |
| `PUT` | `/api/auth/financial-profile` | Yes | Update financial profile |
| `DELETE` | `/api/auth/account` | Yes | Delete account |

## Dashboard and spending

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/dashboard` | Yes | Summary, charts, goals, settings, budget |
| `GET` | `/api/dashboard/summary` | Yes | Current-month totals |
| `GET` | `/api/dashboard/forecast` | Yes + Pro | Forecast |
| `GET` | `/api/dashboard/budget` | Yes | Read budget |
| `POST` | `/api/dashboard/budget` | Yes | Set/update budget |
| `GET` | `/api/dashboard/spending-settings` | Yes | Read spending preferences and rules |
| `POST` | `/api/dashboard/spending-settings` | Yes | Save settings; may apply rules to existing transactions |
| `POST` | `/api/dashboard/export` | Yes + Pro | Export dashboard data |
| `GET` | `/api/dashboard/forecast/customizations` | Yes | Read forecast customizations |
| `POST` | `/api/dashboard/forecast/customizations` | Yes | Save forecast customizations |
| `POST` | `/api/dashboard/forecast/customizations/reset` | Yes | Reset forecast customizations |
| `GET` | `/api/dashboard/reports` | Yes | List saved reports |
| `POST` | `/api/dashboard/reports` | Yes | Save a report |
| `DELETE` | `/api/dashboard/reports/:id` | Yes | Delete a saved report |

## Transactions and categories

All transaction routes require auth. CSV upload is a multipart request with a
`file` field; the server accepts CSV MIME types or `.csv` filenames and limits
the in-memory upload to 2 MiB.

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/transactions` | Yes | List/filter/page transactions |
| `POST` | `/api/transactions` | Yes | Create; request validated |
| `POST` | `/api/transactions/csv` | Yes | Import CSV |
| `DELETE` | `/api/transactions/bulk` | Yes | Bulk delete |
| `GET` | `/api/transactions/:id` | Yes | Read one |
| `PATCH` | `/api/transactions/:id` | Yes | Update; request validated |
| `DELETE` | `/api/transactions/:id` | Yes | Delete one |
| `GET` | `/api/transaction-categories` | Yes | List categories |
| `POST` | `/api/transaction-categories` | Yes | Create category |
| `PATCH` | `/api/transaction-categories/:id` | Yes | Update category |
| `DELETE` | `/api/transaction-categories/:id` | Yes | Delete category |

## Goals and AI

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/goals` | Yes | List goals |
| `POST` | `/api/goals` | Yes | Create; request validated |
| `GET` | `/api/goals/:id` | Yes | Read one |
| `PATCH` | `/api/goals/:id` | Yes | Update; request validated |
| `DELETE` | `/api/goals/:id` | Yes | Delete |
| `POST` | `/api/goals/:id/contribute` | Yes | Contribute; request validated |
| `GET` | `/api/goals/:id/optimize` | Yes | AI-assisted goal optimization |
| `POST` | `/api/ai/chat` | Yes | AI chat; limit 10 requests/minute |
| `GET` | `/api/ai/quick-prompts` | Yes | Quick prompts |
| `POST` | `/api/chat/sessions` | Yes | Create chat session |
| `GET` | `/api/chat/sessions` | Yes | List sessions |
| `GET` | `/api/chat/sessions/:id/messages` | Yes | Read messages |
| `POST` | `/api/chat/sessions/:id/messages` | Yes | Add message |
| `PATCH` | `/api/chat/sessions/:id` | Yes | Rename session |
| `DELETE` | `/api/chat/sessions/:id` | Yes | Delete session |

## Assets and billing

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/crypto` | Yes | List assets |
| `POST` | `/api/crypto` | Yes | Create asset |
| `PATCH` / `PUT` | `/api/crypto/:id` | Yes | Update asset |
| `DELETE` | `/api/crypto/:id` | Yes | Delete asset |
| `GET` | `/api/subscription/status` | Yes | Billing status |
| `POST` | `/api/subscription/create-checkout-session` | Yes | Create Stripe checkout session |
| `POST` | `/api/subscription/create-portal-session` | Yes | Create Stripe portal session |
| `POST` | `/api/subscription/sync-checkout-session` | Yes | Sync checkout result |
| `POST` | `/api/subscription/webhook` | Stripe signature | Raw-body webhook registered before JSON parsing |

## Cross-cutting behavior

- Global API rate limit: 900 requests per 15 minutes per client address.
- Login and registration rate limit: 20 attempts per 15 minutes.
- AI chat route rate limit: 10 requests per minute.
- JSON body parser limit: 10 KiB.
- Validation is applied to selected auth, transaction, and goal writes; do not
  infer that every endpoint uses the same validator.
- Authenticated feature controllers should scope database queries to the
  authenticated user's ID. Check each controller when adding or changing a
  route.

For authentication implementation and security caveats, see [Security](security.md).
