## Agent skills

### Issue tracker

GitHub Issues on `segni-gutema/gibiverse` (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default roles: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md` + `docs/adr/`. See `docs/agents/domain.md`.

### Coding standards

Base UI (`render` prop, not Radix `asChild`), `node --import tsx --test`, `gh`/git sandbox boundaries, and async waiting rules: see `CODING_STANDARDS.md`.

### UI visual verification

Verify rendered UI and prototype views in a headless browser via `browser_eval` (`next-devtools` MCP) before requesting human review. See `.agents/skills/prototype/UI.md` for UI prototypes.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:turborepo-agent-rules -->

## This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": true` in the root `turbo.json` or `turbo.jsonc` to opt in; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->


<!-- BEGIN:hono-agent-rules -->
## hono
### Hono CLI

Run `npx hono --help` first, and use the CLI instead of a dev server.

### Hono Documentation for Agents
When looking up Hono documentation or API reference:
- Start with `https://hono.dev/llms.txt` for an index of all documentation pages with descriptions.
- Use `https://hono.dev/llms-full.txt` for the complete documentation set in a single file.
- Fetch any specific doc page as raw Markdown using the `Accept: text/markdown` header:
  ```bash
  curl -H 'Accept: text/markdown' https://hono.dev/docs/<path>
  ```
<!-- END:hono-agent-rules -->

<!-- BEGIN:database-and-migration-agent-rules -->

## Database & Migrations
Always use the `drizzle` skill when modifying database schemas, writing queries, or generating migrations.

Rules for database changes:
### 1. Rapid Local Prototyping Phase -> Use `push`
- Use `pnpm drizzle-kit push` when iteratively creating new feature branches, adding test tables, or prototyping local schema changes.
- Do NOT generate migration files for temporary local adjustments or minor type tweaks.

### 2. Feature Completion / Team Shared Phase -> Use `generate` + `migrate`
- Once a schema change is finalized or ready to commit to git, use the `drizzle` skill to run `pnpm drizzle-kit generate` to generate version-controlled SQL migration files.
- Always inspect and display the generated SQL migration file to the user before running or committing it.

### 3. Data Safety & Renames
- When renaming columns or changing column types, use the interactive decision guide in the `drizzle` skill to prevent dropping existing columns and losing local data.
- NEVER run `push` against staging or production environments.
<!-- END:database-and-migration-agent-agent-rules -->
