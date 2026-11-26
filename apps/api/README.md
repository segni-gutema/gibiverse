# `@gibiverse/api`

Backend API workspace for Gibiverse (Hono + Drizzle ORM + PostgreSQL + Better Auth).

## Development

```bash
pnpm --filter @gibiverse/api dev
```

The API server listens on `http://localhost:8787` by default.

## Local Test Database & API Test Suite

The API tests require a PostgreSQL database matching CI (`.github/workflows/ci.yml`), configured in `apps/api/.env.test`:

- `DATABASE_URL=postgresql://postgres:test@localhost:5432/gibiverse`
- User / password / database: `postgres` / `test` / `gibiverse`
- Host / port: `localhost:5432`

### Run Everything in One Command

Initialize and start an unprivileged local PostgreSQL instance (no `sudo` or system service required), build `@gibiverse/shared`, apply Drizzle migrations, and run the full API test suite:

```bash
pnpm --filter @gibiverse/api test:local
```

This works inside sandboxed environments as well as local developer machines, and overrides any dev `DATABASE_URL` in `apps/api/.env` with `apps/api/.env.test` for the test run.

### Managing the Local Test Database Separately

```bash
# Initialize (if needed) and start the local PostgreSQL test instance
pnpm --filter @gibiverse/api db:test:start

# Check whether the local PostgreSQL test instance is accepting connections
pnpm --filter @gibiverse/api db:test:status

# Stop the local PostgreSQL test instance
pnpm --filter @gibiverse/api db:test:stop
```

Data and logs for the unprivileged test cluster are stored in `apps/api/.pg-test/` (gitignored), with the Unix socket placed in `/tmp/gibiverse-pg-test`.
