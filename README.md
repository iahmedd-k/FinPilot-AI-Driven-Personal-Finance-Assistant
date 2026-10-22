# FinPilot AI

FinPilot AI is a full-stack personal-finance application for recording
transactions, reviewing spending, managing financial goals, and viewing
AI-assisted financial insights.

## Project structure

- `client/` — React 19 single-page application built with Vite.
- `server/` — Node.js and Express API; MongoDB persistence through Mongoose.
- `docs/` — implementation-based architecture, API, data, security, operations,
  development, and feature documentation.

The client and server are separate npm projects. There is no root npm
workspace.

## Run locally

Use Node.js `^20.19.0` or `>=22.12.0` (required by Vite 7) and npm. The server's
Mongoose 9 dependency requires Node.js `>=20.19.0`. Start MongoDB and configure
the server before starting the API:

1. In `server/`, copy `.env.example` to `.env` and set the required values.
   At minimum, provide `MONGO_URI`, `JWT_ACCESS_SECRET`, and
   `JWT_REFRESH_SECRET`. Keep real credentials in the ignored `.env` file; do
   not commit them.
2. In a terminal:

   ```text
   cd server
   npm ci
   npm run dev
   ```

3. In a second terminal, copy `client/.env.example` to `client/.env` if the API
   is not at its default local URL, then run:

   ```text
   cd client
   npm ci
   npm run dev
   ```

The Vite development server normally runs at `http://localhost:5173`; the API
defaults to port `5000`. See [Local development](docs/development.md) for
configuration details and [Operations](docs/operations.md) for deployment
readiness.

## Documentation

Start at the [documentation index](docs/README.md). The architecture and
feature documents describe observed implementation behavior; they are not a
security certification, legal/privacy policy, or production-readiness
attestation.

## Available checks

From `client/`, run `npm run lint` and `npm run build`. The server package
declares `npm test`, but its current test script depends on Jest, which is not
listed in `server/package.json`; see [Testing](docs/development.md#testing).
