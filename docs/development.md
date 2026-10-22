# Development and testing

## Requirements

- Node.js `^20.19.0` or `>=22.12.0` and npm. The Vite 7 dependency declares
  this range; Mongoose 9 declares Node.js `>=20.19.0`.
- MongoDB connection for API-backed flows.
- Optional provider credentials for Google OAuth, Groq AI, Stripe billing, and
  SMTP mail.

The client and server are independent npm projects. Install from their
lockfiles using `npm ci`.

## Local configuration

1. Copy `server/.env.example` to `server/.env`.
2. Set `MONGO_URI`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET`. Replace
   every sample placeholder before enabling the associated integration.
3. Copy `client/.env.example` to `client/.env` if overriding the API base URL.
   The client reads `VITE_API_URL`; its fallback is `http://localhost:5000`.
4. Start the API and client in separate terminals:

   ```text
   cd server
   npm ci
   npm run dev
   ```

   ```text
   cd client
   npm ci
   npm run dev
   ```

Optional provider variables are listed in the sample files. Keep real values
only in ignored local files or a deployment secret manager. Do not put private
keys in the `client` environment or any `VITE_*` variable.

## Available scripts

| Project | Command | Purpose |
| --- | --- | --- |
| Client | `npm run dev` | Vite development server |
| Client | `npm run build` | Production static bundle |
| Client | `npm run preview` | Preview the built client |
| Client | `npm run lint` | ESLint checks |
| Server | `npm run dev` | Nodemon server |
| Server | `npm start` | Start server |
| Server | `npm test` | Declared as `jest --coverage`; see testing note below |

## Testing

The client package provides lint and build scripts but no test script. The
server package declares a Jest test command, but Jest is not listed in its
current dependencies and no `*.test.*` or `*.spec.*` test suite was found in
the source tree inspected. A standalone `server/testSanitize.js` file exists,
but it is not wired to the server package's declared test script.

Before relying on automated coverage, add a pinned test runner, test discovery
configuration, and executable unit/integration tests. In particular, cover:

- JWT issuance, refresh, logout, and protected routes.
- User ownership checks for transaction, goal, asset, report, and chat records.
- Transaction validation, CSV size/type/row limits, and plan quotas.
- Dashboard calculations, budget persistence, date boundaries, and preferred
  currency formatting.
- Pro access gates, subscription webhook signature/idempotency behavior, and
  provider failure handling.
- AI prompt data minimization and client-side rendering of provider output.

The project was not changed to add or install a test framework as part of this
documentation work.

## Change workflow

1. Make the smallest change consistent with existing module boundaries.
2. Update the relevant docs when routes, schemas, environment variables,
   integrations, or user-visible behavior change.
3. Run `npm run lint` and `npm run build` from `client/` for frontend changes.
4. Run the configured server tests when the test setup has been made
   reproducible; otherwise record the missing test infrastructure explicitly.
5. Check `git status` and `git diff` before sharing a patch. Never stage or
   publish `.env`, local credentials, dependency directories, build output, or
   user data.

No repository-specific branch naming, pull-request template, review-approval
rule, or automated CI gate was found; teams should establish those before
using this project as a production delivery process.
