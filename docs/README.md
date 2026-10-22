# FinPilot AI documentation

This documentation describes the application implementation and repository
configuration inspected on 2026-10-23. Check the linked source when making
changes; documents are not a substitute for code review or runtime
configuration.

> **Scope:** These engineering documents do not establish regulatory
> compliance, legal/privacy terms, a security certification, or a production
> service-level commitment.

## Start here

| Document | Purpose |
| --- | --- |
| [System architecture](architecture/system-overview.md) | Runtime boundaries, component map, and request/data flows |
| [Spending overview](features/spending-overview.md) | Dashboard inputs, charts, calendar, category drill-down, and budget updates |
| [API reference](api-reference.md) | Route inventory, authentication, and request limits |
| [Data model](data-model.md) | MongoDB/Mongoose entities and ownership relationships |
| [Security](security.md) | Implemented controls, sensitive-data flows, and launch review items |
| [Operations](operations.md) | Local run model, deployment assumptions, and operational readiness |
| [Development and testing](development.md) | Setup, environment configuration, scripts, and contribution checks |
| [Architecture decision records](decisions/README.md) | Decision-record policy and template |

## Diagrams

- [Interactive platform architecture](architecture/.archify/architecture-finpilot-platform-20261023-0038/finpilot-platform.html) — generated from the editable [Archify source](architecture/.archify/architecture-finpilot-platform-20261023-0038/candidate.json).
- The architecture and data-model documents also include editable Mermaid
  diagrams for request flow and entity ownership.

## Documentation conventions

- Statements about current behavior are based on repository code or checked-in
  configuration, not marketing copy.
- “Not configured” means no supporting repository configuration was found in
  the inspected project; it does not rule out external infrastructure.
- Do not put credentials, user data, production URLs, or provider account
  identifiers in documentation.
- Update the relevant document in the same change as a corresponding API,
  schema, deployment, or security behavior change.
