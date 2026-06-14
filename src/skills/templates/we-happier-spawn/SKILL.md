---
name: we-happier-spawn
description: Open new happier coding sessions in specific directories via tmux. Use when you need to work on multiple projects simultaneously or delegate tasks to parallel sessions.
---

# we-happier Spawn

Spawn a new happier session in a new tmux window for the current tenant.

## Usage

To spawn a new happier session in a different directory:

```bash
we-happier -- --cwd /path/to/project
```

To spawn in the current directory:

```bash
we-happier --
```

To spawn with additional happier flags:

```bash
we-happier -- --yolo --prompt "your task here"
```

## Environment

This session runs inside a we-happier tenant sandbox.
- Tenant name: check `$WE_HAPPIER_TENANT`
- Tmux session: check `$WE_HAPPIER_TMUX_SESSION`
- All CLI credential isolation is automatic

## When to spawn

- You need to work on a separate repository or directory
- You want to delegate a sub-task to run in parallel
- The current task would benefit from a focused session in a different context

## Switching between sessions

Use standard tmux shortcuts:
- `Ctrl+B n` — next window
- `Ctrl+B p` — previous window
- `Ctrl+B w` — window list
- `Ctrl+B <number>` — jump to window by number
