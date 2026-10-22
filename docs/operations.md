# Operations and deployment

## Current run model

The application is split into a Vite frontend and a Node/Express API. Start
them as separate processes. The API loads `server/.env`, connects to MongoDB,
and only starts listening after the database connection resolves. The default
API port is `5000`; the client defaults to a development API base at
`http://localhost:5000`.

Useful endpoints:

- `GET /` — simple server wake-up response.
- `GET /api/health` — simple API liveness response.

These endpoints do not establish database readiness after startup, dependency
health, or end-to-end user availability.

## Deployment assumptions to verify

- Terminate TLS at a trusted reverse proxy/load balancer and configure the
  actual proxy hop count before enabling `trust proxy`.
- Set production client/API origins and cookies consistently; see
  [Security](security.md) for the current CORS behavior and production cookie
  settings.
- Keep server-only credentials out of the browser bundle. Vite-exposed
  variables are public by design.
- Configure a persistent MongoDB deployment, least-privilege credentials,
  network access controls, encryption, backup schedule, retention, and a
  tested restore procedure.
- Configure Stripe webhook endpoint/secret and verify signature handling in
  the deployment environment.
- Configure Groq, Google OAuth, and SMTP only where those features are enabled.
- Password recovery is not operationally verified: `server/services/emailService.js`
  exports an undeclared `sendResetEmail` symbol. The reset controller changes
  the password before it requires that module, so a module-load failure may
  leave the user without the emailed replacement password.
- Provide process supervision, graceful shutdown, resource limits, log
  retention/redaction, alerting, and an incident contact path.
- Build and serve the client as static assets using the hosting platform's
  supported SPA fallback behavior.

No Docker/Compose, Kubernetes, infrastructure-as-code, deployment workflow,
CI pipeline, backup configuration, or production monitoring definition was
found in the inspected repository. This is a code-repository observation, not
a claim that no external hosting setup exists.

## Operational readiness checklist

- [ ] Name an owner for each environment and document deployment access.
- [ ] Restrict and test database and provider credentials; document rotation.
- [ ] Enforce an explicit CORS allowlist and validate proxy/cookie behavior.
- [ ] Define backup frequency, retention, RPO/RTO, restore runbook, and conduct
  a restore test.
- [ ] Define health/readiness probes, logs/metrics, alert thresholds, and
  incident escalation.
- [ ] Define deployment approval, rollback, and database compatibility rules.
- [ ] Verify provider quotas, webhook retries/idempotency, and dependency
  failure behavior.
- [ ] Publish privacy, retention, account-deletion, and AI-provider notices
  after appropriate legal review.
- [ ] Set and test performance and availability objectives before publishing
  any SLA.
