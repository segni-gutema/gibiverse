# Domain modules and composition root

Date: 2026-11-27
Status: Accepted

## Context

The API codebase started with a flat `routes/` directory where each route file imported database tables and built Drizzle queries inline. As the application grew (Q&A, voting, course-materials, search, overview) several problems appeared:

1. **Duplicated query logic** — vote projections (left-joining the `vote` table and aliasing the result field) were copy-pasted across `qa/index.ts`, `search.ts`, and anywhere a student's current vote needed to be included. The alias name was inconsistent (`userVote` vs `studentVote`), causing confusion with GLOSSARY terminology.

2. **Routes as modules** — routes mixed HTTP concerns (request parsing, response serialisation) with domain logic (database queries, business rules), making the logic hard to test in isolation.

3. **Terminology drift** — the codebase used `userVote` in several places while the GLOSSARY defines the actor as **Student**, not **User**.

## Decision

Restructure the API so that:

- **`src/modules/`** contains domain modules (`qa/`, `voting/`, `course-materials/`). Each module exports a factory function (e.g. `createQa(deps)`) and owns its own queries, business rules, and types.
- **`src/app.ts`** is the composition root. It wires dependencies (database, storage) and mounts thin route factories. Routes parse requests and delegate to domain modules; they do not contain query logic.
- **`src/lib/queries.ts`** holds shared query helpers that multiple modules consume. The first such helper is `studentVoteProjection`, which returns the Drizzle `select` field and optional `leftJoin` configuration for joining the student's current vote. It returns the field as `studentVote` (never `userVote`) to match GLOSSARY terminology.
- Shared canonical summary types (`CourseMaterialSummary`, `QuestionSummary`) live in `@gibiverse/shared/types` so both the API and the web can reference the same shape without duplication.

## Consequences

- Easier testing: domain logic can be unit-tested against an in-memory database without constructing HTTP requests.
- Single source of truth: `studentVoteProjection` eliminates vote-join duplication and enforces the `studentVote` field name everywhere.
- Clearer terminology: all code now uses `studentVote`, consistent with the GLOSSARY definition of **Student** and **Vote**.
- Routes stay thin: HTTP binding is separated from query and business logic.
- Canonical summary types in `@gibiverse/shared` allow the web presentation layer to type-check against the same shape the API serialises, reducing `any`-casts.
