# we-happier

Multi-tenant [happier](https://happier.dev) CLI wrapper with per-user credential isolation, tmux session management, and AI-aware security guardrails.

Run multiple happier instances on the same machine — each person gets their own happier account, their own sandboxed credentials for cloud CLIs, and their own tmux workspace.

## How it works

```
we-happier create alice    # Create tenant, authenticate with happier
we-happier run alice       # Launch isolated happier in tmux
we-happier run alice --yolo  # Pass args through to happier
```

Each tenant gets a fully isolated directory tree:

```
~/.we-happier/tenants/alice/
├── tenant.json              # Metadata (status, timestamps)
├── happier/                 # HAPPIER_HOME_DIR (account, settings, logs)
├── sandbox/
│   ├── bin/                 # Tier 2 wrapper scripts (prepended to PATH)
│   ├── aws/                 # AWS_CONFIG_FILE, AWS_SHARED_CREDENTIALS_FILE
│   ├── gcloud/              # CLOUDSDK_CONFIG
│   ├── docker/              # DOCKER_CONFIG
│   ├── gh/                  # GH_CONFIG_DIR
│   ├── kube/                # KUBECONFIG
│   ├── ...                  # 21 tools with env-var isolation
│   └── home-overlay/        # Fake HOME for tools that read ~/.toolrc
│       ├── .aliyun/
│       ├── .lark-cli/
│       └── ...
└── skills/                  # Injected happier skills
    ├── we-happier-spawn/
    └── we-happier-sandbox-guard/
```

## Credential isolation

Two-tier sandbox ensures credentials never leak between tenants:

**Tier 1 — Environment variable isolation (21 tools)**

Tools that respect config env vars get pointed to the tenant's sandbox directory automatically. The AI agent inside happier inherits these env vars, so `aws configure`, `gcloud auth login`, `gh auth login`, etc. all write to the tenant sandbox.

| Tool | Env vars |
|------|----------|
| AWS CLI | `AWS_CONFIG_FILE`, `AWS_SHARED_CREDENTIALS_FILE` |
| Google Cloud | `CLOUDSDK_CONFIG` |
| Azure CLI | `AZURE_CONFIG_DIR` |
| Docker | `DOCKER_CONFIG` |
| kubectl | `KUBECONFIG` |
| GitHub CLI | `GH_CONFIG_DIR` |
| Helm | `HELM_CONFIG_HOME`, `HELM_DATA_HOME`, `HELM_CACHE_HOME` |
| Terraform | `TF_CLI_CONFIG_FILE` |
| npm | `NPM_CONFIG_USERCONFIG` |
| pip | `PIP_CONFIG_FILE` |
| Cargo | `CARGO_HOME` |
| GPG | `GNUPGHOME` |
| pnpm | `PNPM_HOME` |
| Claude Code | `CLAUDE_CONFIG_DIR` |
| Pulumi | `PULUMI_HOME` |
| Vercel | `VERCEL_CONFIG` |
| Fly.io | `FLY_CONFIG_DIR` |
| Supabase | `SUPABASE_CONFIG_DIR` |
| Railway | `RAILWAY_CONFIG_DIR` |
| Netlify | `NETLIFY_CONFIG_DIR` |
| Gradle | `GRADLE_USER_HOME` |

**Tier 2 — HOME wrapper isolation (5 tools)**

Tools that hardcode `$HOME/.config-dir/` get shell wrapper scripts placed in `sandbox/bin/`. Each wrapper strips itself from PATH, finds the real binary, sets `HOME` to the overlay directory, then `exec`s.

| Tool | Config path |
|------|-------------|
| Aliyun CLI | `~/.aliyun/` |
| Lark CLI | `~/.lark-cli/` |
| ossutil | `~/.ossutilconfig` |
| Ansible | `~/.ansible/` |
| Vagrant | `~/.vagrant.d/` |

## Commands

### `we-happier create <username>`

Create a new tenant and authenticate with happier.

- Validates username (`^[a-z0-9][a-z0-9_-]{0,30}[a-z0-9]$`)
- Creates directory tree, sandbox wrappers, and skill files
- Runs interactive `happier auth login`
- Sets tenant status to `active` on success

### `we-happier run <username> [happier-args...]`

Launch happier in an isolated tmux session.

- Builds the full sandboxed environment
- Creates or reuses tmux session `we-happier-<username>`
- If session exists, opens a new tmux window
- Attaches to the tmux session

### `we-happier -- [happier-args...]`

Spawn a new happier window from inside a tenant session. The AI agent can use this (via the injected `we-happier-spawn` skill) to run parallel happier instances.

### `we-happier list`

Show all tenants with status, timestamps, and tmux activity.

### `we-happier status <username>`

Show detailed info for a tenant: paths, config, and which sandboxed tools are installed.

### `we-happier delete <username>`

Kill tmux session (if running) and remove all tenant data.

## AI skills

Two skills are injected into each tenant's happier:

- **we-happier-spawn** — Teaches the AI how to open new happier windows via `we-happier --` for parallel tasks.
- **we-happier-sandbox-guard** — Security guardrail that tells the AI to check the whitelist before running credential commands for non-sandboxed tools, and to never modify shared shell config files.

## Installation

```bash
npm install -g we-happier
```

Requires:
- Node.js >= 20
- [tmux](https://github.com/tmux/tmux) (for session management)
- [happier](https://happier.dev) (auto-installed if missing)

## Configuration

Set `WE_HAPPIER_HOME` to change the base directory (default: `~/.we-happier`).

## Development

```bash
git clone https://github.com/presence-io/we-happier.git
cd we-happier
corepack enable
pnpm install

pnpm dev              # Run with tsx
pnpm build            # Build with tsup
pnpm typecheck        # TypeScript strict check
pnpm lint             # ESLint (strictTypeChecked)
pnpm test             # Unit tests
pnpm test:integration # Integration tests
```

## License

MIT
