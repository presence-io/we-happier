# we-happier

Multi-tenant [happier](https://happier.dev) CLI wrapper with per-user credential isolation, tmux session management, per-tenant tool policy, and AI-aware security guardrails.

Run multiple happier instances on the same machine — each person gets their own happier account, their own sandboxed credentials for cloud CLIs, and their own tmux workspace. Administrators can block specific tools per tenant.

## Quick start

```bash
npm install -g we-happier

we-happier create alice          # Create tenant, authenticate with happier
we-happier run alice             # Launch isolated happier in tmux
we-happier run alice --yolo      # Pass args through to happier
we-happier run alice -d          # Start detached (headless/remote)
we-happier policy alice deny docker  # Block Docker for this tenant
```

## How it works

Each tenant gets a fully isolated directory tree:

```text
~/.we-happier/tenants/alice/
├── tenant.json              # Metadata (status, timestamps, disabledTools)
├── happier/                 # HAPPIER_HOME_DIR (account, settings, logs)
├── sandbox/
│   ├── bin/                 # Wrapper scripts (prepended to PATH)
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

Three layers of defense ensure credentials never leak between tenants:

### Layer 1 — Environment variable isolation (Tier 1, 21 tools)

Tools that respect config env vars get pointed to the tenant's sandbox directory automatically. The AI agent inside happier inherits these env vars, so `aws configure`, `gcloud auth login`, `gh auth login`, etc. all write to the tenant sandbox.

| Tool | Env vars |
| ------ | ---------- |
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

### Layer 2 — HOME wrapper isolation (Tier 2, 5 tools)

Tools that hardcode `$HOME/.config-dir/` get shell wrapper scripts placed in `sandbox/bin/`. Each wrapper strips itself from PATH, finds the real binary, sets `HOME` to the overlay directory, then `exec`s.

| Tool | Config path |
| ------ | ------------- |
| Aliyun CLI | `~/.aliyun/` |
| Lark CLI | `~/.lark-cli/` |
| ossutil | `~/.ossutilconfig` |
| Ansible | `~/.ansible/` |
| Vagrant | `~/.vagrant.d/` |

### Layer 3 — Per-tenant tool policy

Administrators can block specific tools per tenant via `we-happier policy`. Blocked tools get a deny wrapper script in `sandbox/bin/` that:

- Returns exit code 126
- Tells the AI the tool is blocked by administrator policy
- Instructs the AI not to attempt bypass

The injected `we-happier-sandbox-guard` skill dynamically reflects which tools are enabled and which are blocked, including a rule against full-path bypass (e.g. `/usr/bin/docker`).

## Commands

### `we-happier create <username>`

Create a new tenant and authenticate with happier.

- Validates username (`^[a-z0-9][a-z0-9_-]{0,30}[a-z0-9]$`)
- Creates directory tree, sandbox wrappers, and skill files
- Runs interactive `happier auth login`
- Sets tenant status to `active` on success
- If tenant exists in `pending_auth` status, retries authentication

### `we-happier run <username> [happier-args...]`

Launch happier in an isolated tmux session.

- Checks happier version compatibility and auth health before launch
- Builds the full sandboxed environment with policy applied
- Sets `HAPPIER_DISABLE_AUTO_UPDATE=1` to suppress interactive update prompts
- Creates or reuses tmux session `we-happier-<username>`
- If session exists, opens a new tmux window (max 10 windows per session)
- Attaches to the tmux session

Options:

| Flag | Description |
| ------ | ------------- |
| `-d, --detach` | Start session without attaching. Useful for remote/headless use via SSH. Attach later with `tmux attach -t we-happier-<username>`. |

### `we-happier -- [happier-args...]`

Spawn a new happier window from inside a tenant session. Can be used directly or by the AI agent via the injected `we-happier-spawn` skill to run parallel happier instances.

Rebuilds the tenant environment from current config, so policy changes made after session start take effect in new windows.

### `we-happier policy <username> deny <tool-id>`

Block a tool for a tenant. Regenerates sandbox wrappers so the deny wrapper takes effect immediately.

```bash
we-happier policy alice deny docker
we-happier policy alice deny aws
```

### `we-happier policy <username> allow <tool-id>`

Unblock a previously blocked tool. Restores the normal isolation wrapper.

```bash
we-happier policy alice allow docker
```

### `we-happier policy <username> list`

Show all tools with their current status (allowed / BLOCKED) for a tenant.

### `we-happier list`

Show all tenants with status, timestamps, and tmux activity.

### `we-happier status <username>`

Show detailed info for a tenant: paths, config, installed tools, and blocked tools.

### `we-happier delete <username>`

Kill tmux session (if running) and remove all tenant data. Prompts for confirmation before deleting.

| Flag | Description |
| ------ | ------------- |
| `-f, --force` | Skip the confirmation prompt. |

## AI skills

Two skills are injected into each tenant's happier:

- **we-happier-spawn** — Teaches the AI how to open new happier windows via `we-happier --` for parallel tasks. Includes tmux navigation shortcuts.
- **we-happier-sandbox-guard** — Security guardrail with dynamically generated tool lists. Tells the AI which tools are isolated (safe to configure), which are blocked (do not use), and warns before credential commands on non-whitelisted tools. Also prohibits modifying shared shell config (`~/.bashrc`, etc.) and warns about partially-isolated SSH state.

The guard skill content updates automatically when tools are blocked/unblocked via `policy` commands or when the sandbox is regenerated.

## tmux resource management

- Each tenant gets one tmux session (`we-happier-<username>`)
- New `run` invocations create new windows within the existing session
- Maximum 10 concurrent windows per session to prevent resource exhaustion
- Scrollback history is set to 10,000 lines per window
- Launch scripts self-delete after execution to avoid temp file accumulation
- `--detach` mode allows starting sessions without attaching (for remote SSH use)

## Installation

```bash
npm install -g we-happier
```

Requires:

- Node.js >= 22.13
- [tmux](https://github.com/tmux/tmux) (for session management)
- [happier](https://happier.dev) (auto-installed if missing; version compatibility checked at launch)

## Configuration

| Env var | Description | Default |
| --------- | ------------- | --------- |
| `WE_HAPPIER_HOME` | Base directory for all tenant data | `~/.we-happier` |

Per-tenant tool policy is stored in each tenant's `tenant.json` as `disabledTools: string[]` and managed via `we-happier policy` commands.

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
pnpm test             # Unit tests (64 tests)
pnpm test:integration # Integration tests (21 tests)
```

## License

MIT
