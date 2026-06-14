# we-happier Agent Constitution

## Project overview

`we-happier` is a multi-tenant wrapper for the `happier` CLI. It isolates per-user happier accounts and third-party CLI credentials via environment variables and tmux sessions.

## Code standards

- TypeScript strict mode, ESM only.
- No `@ts-ignore`. `@ts-expect-error` only with a rationale.
- No `as any` unless at a narrow boundary with a one-line justification.
- No TODO/FIXME in production code.
- No stray `console.log`; use the project logger.
- Run `pnpm lint && pnpm typecheck` before handoff.

## Testing

- Use vitest. Tests live in `tests/unit/` and `tests/integration/`.
- Behavior changes require a failing test first (TDD).
- Mock only system boundaries (child_process, fs). Never mock domain logic.
- Integration tests may use real filesystem in temp dirs.

## Architecture layers

Dependency flows downward only:

1. `utils/` — zero internal deps (logger, paths, exec)
2. `sandbox/` — registry, env builder, wrapper generator, guard
3. `tenant/` — paths, config, env, manager (depends on sandbox)
4. `happier/`, `tmux/`, `skills/` — external integrations
5. `cli/` — thin command handlers (depends on all above)

## File organization

- Small focused files, one responsibility each.
- Domain folders (`tenant/`, `sandbox/`, `tmux/`) own their concerns.
- No `utils.ts`, `helpers.ts`, or `common.ts` grab-bags.
- Keep filenames short; folder context provides the domain.

## Git discipline

- Never switch branches, force-push, or run destructive git commands.
- Conventional commit messages.
