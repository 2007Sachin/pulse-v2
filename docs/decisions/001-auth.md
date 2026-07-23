# ADR 001: Shared auth mechanism with Pathwisse

## Status

Accepted

## Context

- Pulse v2 has no independent signup — a Pathwisse account _is_ a Pulse v2 account (`README.md`, `ARCHITECTURE.md` §2).
- `ARCHITECTURE.md` §2 deliberately leaves the exact mechanism open: "Exact mechanism (shared Supabase Auth session, or federated via Cognito if/when AWS migration happens) to be decided at implementation time — architecture should not hard-code assumptions that block either path."
- `SCHEMA.md` explicitly defers Postgres RLS design "until auth mechanism (shared Supabase session vs. Cognito-federated) is locked, since the RLS approach differs significantly between the two."
- `ARCHITECTURE.md` §8 (infra notes): ship fastest on whatever works now (Supabase acceptable for v1 MVP); AWS/Cognito migration is a separate, later initiative that must not block v1.
- T0.1/T0.2 already built `apps/api` as a plain Express service talking directly to Postgres via `pg` — there is no Supabase client SDK, Supabase Auth, or Supabase-specific session handling anywhere in the codebase yet.

## Options considered

### A. Shared Supabase Auth session

Pulse and Pathwisse would sit in the same Supabase project (or share a JWT signing secret across two Supabase projects). Pulse verifies the Supabase-issued access token directly on incoming requests (from Supabase's cookie or `Authorization` header).

- Fastest path _if_ Pathwisse's own auth is already on Supabase Auth.
- Hard-codes an assumption `ARCHITECTURE.md` explicitly says not to hard-code: that Pathwisse's identity provider is (and stays) Supabase. If Pathwisse is on something else, or the AWS/Cognito migration mentioned in the architecture doc happens, Pulse's entire session-verification layer has to be rewritten.
- Pulls Supabase Auth (and typically Supabase-flavored RLS access patterns) into a service that was deliberately scaffolded as a plain Node/Postgres API — an infra dependency Pulse doesn't otherwise need for v1.

### B. Token federation (chosen)

Pathwisse mints a short-lived, signed handoff token (JWT) containing minimal identity claims (`sub` = `pathwisse_user_id`, `name`, `iat`, `exp`) and hands it to Pulse (e.g. via redirect). Pulse verifies the token's signature against a secret shared out-of-band with Pathwisse, and on success issues its **own** short-lived, `httpOnly` session cookie scoped to Pulse. Pulse never talks to Pathwisse's identity provider directly and does not need to know whether the other side is Supabase Auth, Cognito, or anything else — only that it can verify a signature.

- Satisfies "no independent signup" — identity still originates 100% from Pathwisse — while keeping Pulse decoupled from Pathwisse's specific auth backend, which is exactly the constraint `ARCHITECTURE.md` calls out.
- Keeps Pulse's session stateless (signed cookie, no server-side session store), consistent with the lean "start as one deployable service" guidance in `ARCHITECTURE.md` §3.
- The only coordination required with Pathwisse is a shared secret and a token shape — not a shared auth infrastructure.
- If Pathwisse (or Pulse) later moves to Cognito or anything else, only the token-minting side and `verifyPathwisseToken` need to change; Pulse's session layer and every downstream consumer of `req.auth` are unaffected.

## Decision

Go with **B — token federation**. Concretely, for v1:

- HMAC (HS256) verification of the Pathwisse-issued handoff token using a shared secret (`PATHWISSE_AUTH_SHARED_SECRET`, already scaffolded as a placeholder in T0.1's `.env.example`).
- On successful verification, Pulse issues its own signed JWT in an `httpOnly`, `SameSite=Lax`, `Secure`-in-production cookie (`SESSION_COOKIE_SECRET`) as its session — no server-side session store.
- No Postgres RLS decision is made here. Pulse's data access continues through the plain `pg`-based API layer from T0.2, with authorization enforced in the Express middleware layer. This keeps `SCHEMA.md`'s deferred RLS question genuinely open rather than implicitly resolving it by adopting Supabase's client libraries.
- `users` row creation/lookup stays out of scope for this task — it's owned by T1.2 (event ingestion) / T2.1 (portfolio auto-creation). A candidate can hold a valid Pulse session before any local `users` row exists for them; this task's middleware only exposes the authenticated Pathwisse identity, it does not create or require a `users` row.

## Consequences

- Pathwisse's team needs to implement the minting side (sign a JWT with the shared secret, hand it to Pulse) — that half of the contract lives outside this repo; see below.
- Upgrading from a shared HMAC secret to asymmetric signing (Pathwisse signs with a private key, Pulse verifies against a published public key / JWKS) is a contained change to `verifyPathwisseToken` — nothing else in Pulse's auth layer changes.
- Because Pulse mints its own session cookie after the initial handoff, Pulse's session lifetime and renewal policy are fully Pulse's own to tune, independent of Pathwisse's token lifetime.

## Integration contract (Pathwisse's side)

- `PATHWISSE_AUTH_SHARED_SECRET` — secret shared out-of-band (never committed), used to sign/verify the handoff token.
- Token claims: `sub` (Pathwisse user id, matches `users.pathwisse_user_id`), `name`, `iat`, `exp`. Short-lived (e.g. 60s) — this is a one-time handoff token, not Pulse's session.
- Algorithm: HS256 for v1.
- Handoff shape: Pathwisse redirects the candidate to a Pulse URL with the token (exact route TBD with Pathwisse's team); Pulse's frontend exchanges it for a Pulse session cookie by calling `POST /auth/session` on the `api` service.
