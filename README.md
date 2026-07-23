# Pulse v2

Pulse v2 is a structured, verified proof-of-work portfolio product for Pathwisse users. It turns a candidate's Pathwisse activity — Role Readiness Certificates, Skill Cards, Asha interview verdicts, and Skill Sprint completions — into a role-specific, recruiter-scannable public portfolio page, combined with candidate-authored project evidence (GitHub repos, case studies, outcomes).

Pulse v2 is a **standalone product** with its own codebase and public-facing surface, but it is **not a source of truth** — all verified credential data flows in from Pathwisse via a one-way sync. Candidates authenticate with their existing Pathwisse account; there is no separate signup.

## What this is not (v1 scope)
- Not a two-sided recruiter marketplace (no recruiter accounts, no talent feed, no matching engine) — that is a possible future phase, explicitly out of scope for v1.
- Not a general-purpose portfolio builder open to non-Pathwisse users.
- Not a resume builder — self-authored claims are visually and structurally separated from verified Pathwisse credentials at all times.

## Core idea
Three tiers on every portfolio page, in order of trust:
1. **Verified Proof** — pulled from Pathwisse, cannot be edited by the candidate (certificates, skill cards, interview verdict, sprint completions)
2. **Proof of Work** — role-specific project evidence, partly automated (GitHub public repo data), partly candidate-authored (outcome lines, case studies)
3. **Narrative** — short, optional, self-authored bio/context

See `ARCHITECTURE.md`, `SCHEMA.md`, and `TASKS.md` for the build plan.
