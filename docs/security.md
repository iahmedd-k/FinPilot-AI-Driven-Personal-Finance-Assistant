# Security and privacy engineering

This document records security-relevant behavior visible in the code. It is
not a penetration test, vulnerability assessment, privacy notice, or compliance
attestation.

## Implemented controls

- Access JWTs are verified by auth middleware. Feature routes generally use
  `protect`; controllers should query records using the authenticated user ID.
- The client sends an access token in the authorization header and sends
  credentials for the refresh-cookie flow. The refresh cookie is configured
  `HttpOnly`; production cookie settings use `Secure` and `SameSite=None`.
- Passwords are hashed with bcryptjs in the User model.
- Express configures Helmet, Mongo operator sanitization, HPP protection,
  request-size limits, a global API rate limit, and stricter login/register
  limits. AI chat has its own route limit.
- Auth, transaction-create/update, and goal-create/update/contribute requests
  use Zod-backed validation middleware.
- CSV uploads are held in memory, restricted to CSV-like MIME/name values, and
  limited to 2 MiB.
- The Stripe webhook is registered with a raw-body parser before the JSON body
  parser; signature construction is handled by the subscription controller.
- Secrets are read from environment variables. The repository includes
  `.env.example` templates; real `.env` files are ignored by Git rules.

## Sensitive-data flows

- MongoDB stores user profiles and user-scoped financial records.
- The AI chat service composes prompts with financial summaries, categories,
  active goals, selected recent transactions, trends, forecast and score
  information, plus asset/equity summaries, then sends the prompt to Groq.
- Billing operations exchange customer/subscription and checkout information
  with Stripe.
- Google OAuth exchanges identity data with Google. Password-reset code is
  intended to use SMTP, but `emailService.js` exports an undeclared
  `sendResetEmail` symbol. Requiring that module therefore fails when the
  reset-email path is invoked. The password is updated before the module is
  required, so this failure can leave the account password changed without
  delivering the new password. Do not rely on this recovery path until it is
  corrected and tested.
- Client-side access tokens are read from browser `localStorage`; review this
  storage choice together with the application's XSS defenses and threat
  model.

## Production review items

Resolve and document these before handling real customer financial data:

1. **CORS policy:** `server/app.js` currently uses `origin: true` with
   credentials. Replace this with an explicit trusted-origin policy for each
   deployment. `ADDITIONAL_CORS_ORIGINS` appears in the sample environment
   file, but no use of that variable was found in the server code inspected.
2. **Proxy trust:** the server trusts one proxy hop. Confirm the actual
   production ingress topology and prevent clients from controlling forwarded
   address headers.
3. **Password recovery:** the current reset path changes the password before
   requiring an email service whose export references an undeclared symbol.
   Correct and test this before production; reassess reset links/tokens,
   delivery channel, expiry, auditing, and response behavior.
4. **Credential handling:** generate unique, high-entropy JWT secrets per
   environment; use a managed secret store in deployment; rotate/revoke
   exposed secrets; never put production secrets in client variables, issues,
   logs, or docs.
5. **Data lifecycle:** define encryption, access review, retention, account
   deletion, backup access, recovery, and AI-provider data-processing controls.
6. **Validation and abuse limits:** review all write routes, upload parsing,
   user-level quotas, and route-specific rate limits against the threat model.
7. **Operational verification:** test dependency updates, static analysis,
   security scanning, incident escalation, and restore procedures; these
   workflows are not defined by the checked-in manifests.

Do not claim PCI, SOC 2, GDPR, or other regulatory compliance based solely on
the controls listed above.
