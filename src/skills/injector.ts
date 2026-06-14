import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SandboxRegistry } from "../sandbox/registry.js";
import { formatWhitelistTable } from "../sandbox/guard.js";

const SPAWN_SKILL = `---
name: we-happier-spawn
description: Open new happier coding sessions in specific directories via tmux. Use when you need to work on multiple projects simultaneously or delegate tasks to parallel sessions.
---

# we-happier Spawn

Spawn a new happier session in a new tmux window for the current tenant.

## Usage

To spawn a new happier session:

\`\`\`bash
we-happier --
\`\`\`

To spawn with additional happier flags:

\`\`\`bash
we-happier -- --yolo --prompt "your task here"
\`\`\`

## Environment

This session runs inside a we-happier tenant sandbox.
- Tenant name: check \`$WE_HAPPIER_TENANT\`
- Tmux session: check \`$WE_HAPPIER_TMUX_SESSION\`
- All CLI credential isolation is automatic

## When to spawn

- You need to work on a separate repository or directory
- You want to delegate a sub-task to run in parallel
- The current task would benefit from a focused session in a different context

## Switching between sessions

Use standard tmux shortcuts:
- \`Ctrl+B n\` — next window
- \`Ctrl+B p\` — previous window
- \`Ctrl+B w\` — window list
- \`Ctrl+B <number>\` — jump to window by number
`;

const GUARD_SKILL = `---
name: we-happier-sandbox-guard
description: Credential isolation guard for we-happier tenants. Enforces whitelist policy for CLI credential operations.
---

# we-happier Sandbox Guard

This session runs inside a we-happier credential sandbox. All whitelisted CLI tools have their credentials isolated to this tenant only.

## Whitelisted tools (credentials ARE isolated)

**Tier 1 — env var isolation (strongest):**
AWS CLI, Google Cloud (gcloud/gsutil/bq), Azure CLI, Docker, kubectl, GitHub CLI (gh), Helm, Terraform, npm, pip, Gradle, Cargo, GPG, pnpm, Claude Code, Pulumi, Vercel, Fly.io, Supabase, Railway, Netlify

**Tier 2 — HOME wrapper isolation:**
Aliyun CLI (aliyun), Feishu CLI (lark-cli), ossutil, Ansible, Vagrant

## CRITICAL RULES — read before running ANY credential command

1. **Whitelisted tools**: You may freely run \`login\`, \`configure\`, \`auth\`, or any credential-setup command. Credentials are automatically stored in this tenant's isolated sandbox — they cannot leak to other tenants or the host system.

2. **Non-whitelisted tools**: STOP before running any credential command (\`login\`, \`configure\`, \`auth\`, \`init\`, \`register\`, etc.) for a tool NOT listed above. Warn the user:

   > "Tool X is NOT in the we-happier sandbox whitelist. Running credential commands will store credentials in the HOST system, shared with all users. This is a security risk in a multi-tenant environment. Should I proceed?"

   If the user says yes, proceed but note the risk. If the user says no, suggest they add the tool to the whitelist config.

3. **Never modify shared shell config**: Do NOT edit \`~/.bashrc\`, \`~/.zshrc\`, \`~/.profile\`, \`~/.bash_profile\`, or any file in the real \`$HOME\` that affects all users.

4. **ssh is partially isolated**: The SSH config can be redirected per-command with \`-F\`, but \`~/.ssh/known_hosts\` and keys in \`~/.ssh/\` are shared. For SSH key operations, warn the user about shared state.

## How isolation works

- **Tier 1 tools**: Environment variables redirect their config directories to \`$HAPPIER_HOME_DIR/../sandbox/<tool>/\`. This is invisible and automatic.
- **Tier 2 tools**: A wrapper script in \`PATH\` intercepts the command and runs it with \`HOME\` pointing to an isolated overlay directory.

## Checking sandbox status

\`\`\`bash
echo $WE_HAPPIER_TENANT     # current tenant name
echo $HAPPIER_HOME_DIR       # isolated happier home
echo $AWS_CONFIG_FILE        # example: shows sandbox path
\`\`\`
`;

const SKILLS: Record<string, string> = {
  "we-happier-spawn": SPAWN_SKILL,
  "we-happier-sandbox-guard": GUARD_SKILL,
};

export async function injectSkills(
  skillsDir: string,
  registry: SandboxRegistry,
): Promise<void> {
  for (const [name, content] of Object.entries(SKILLS)) {
    const dest = join(skillsDir, name);
    await mkdir(dest, { recursive: true });
    await writeFile(join(dest, "SKILL.md"), content);
  }

  const guardSkillPath = join(
    skillsDir,
    "we-happier-sandbox-guard",
    "WHITELIST.md",
  );
  const table = formatWhitelistTable(registry);
  await writeFile(guardSkillPath, `# Current Whitelist\n\n${table}\n`);
}
