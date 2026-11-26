# Coding Standards

Project conventions and environment boundaries for implementation and `code-review`. Tooling (`eslint`, `prettier`, `tsc`, `check-glossary`) enforces formatting, types, and glossary vocabulary; this guide covers judgement calls and repo-specific gotchas.

## UI Components: Base UI, not Radix

`@gibiverse/ui` uses shadcn `base-nova` backed by `@base-ui/react`, not Radix UI.

- Compose elements with Base UI's `render` prop (e.g., `<Button render={<Link href="/courses" />} />`), never Radix's `asChild`.
- Import primitives from `@base-ui/react/*` or `@gibiverse/ui/components/*`; do not add `@radix-ui/*` dependencies.

## Testing: `node --import tsx --test`

Workspace test suites (`@gibiverse/web`, `@gibiverse/api`, `@gibiverse/shared`) run on Node's built-in test runner via `tsx` (`node --import tsx --test`).

- Write tests using `node:test` (`describe`, `it`) and `node:assert/strict`.
- Run single files with `node --import tsx --test <path>` or workspace suites via `pnpm --filter <pkg> test`; do not introduce Vitest, Jest, or Playwright.

## UI Visual Verification

When changing UI layout, styling, or components, verify the rendered views in a headless browser via `browser_eval` (`next-devtools` MCP) before requesting human review. Check layout, responsive rendering, and browser console errors.

## Execution Boundaries: Sandbox vs Host

- Run local builds, typechecks, lints, and tests inside the default sandbox.
- Run `gh` CLI commands and git writes (`git commit`, `git push`, `git fetch`/`pull`, or `.git/` lockfile operations) outside the sandbox (bypassing sandbox restrictions) when the sandbox blocks network, host auth, or `.git` writes, keeping them separate from local build/test commands.

## Async & Waiting: No Timer-Polling Loops

- Use reactive wakeups (`NotificationTimeoutSeconds` on `run_command`, subagent completion messages, or `schedule` with `TimerCondition`) instead of `sleep` or `while` polling loops.
- In application and test code, await events, promises, or explicit hooks rather than `setTimeout` polling loops.
