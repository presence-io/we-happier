import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SandboxRegistry } from "@/sandbox/registry";
import { formatWhitelistTable } from "@/sandbox/guard";

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

function buildGuardSkill(registry: SandboxRegistry): string {
  const enabled = registry.getEnabledEntries();
  const blocked = registry.getBlockedEntries();

  const tier1 = enabled.filter((e) => e.tier === "env_var");
  const tier2 = enabled.filter((e) => e.tier === "home_wrapper");

  const tier1Text =
    tier1.length > 0 ? tier1.map((e) => e.name).join(", ") : "(none)";
  const tier2Text =
    tier2.length > 0
      ? tier2
          .map((e) => `${e.name} (${e.binaries.join(", ")})`)
          .join(", ")
      : "(none)";

  let blockedSection = "";
  if (blocked.length > 0) {
    const blockedList = blocked
      .map((e) => `- **${e.name}** (${e.binaries.join(", ")})`)
      .join("\n");
    blockedSection = `

## Blocked tools (administrator policy)

The following tools are blocked by administrator policy for this tenant. They will return exit code 126 if invoked:

${blockedList}

Do NOT attempt to bypass blocks by using full paths (e.g. \`/usr/bin/<tool>\`). The restriction is intentional.
`;
  }

  return `---
name: we-happier-sandbox-guard
description: Credential isolation guard for we-happier tenants. Enforces whitelist policy for CLI credential operations.
---

# we-happier Sandbox Guard

This session runs inside a we-happier credential sandbox. All whitelisted CLI tools have their credentials isolated to this tenant only.

## Whitelisted tools (credentials ARE isolated)

**Tier 1 — env var isolation (strongest):**
${tier1Text}

**Tier 2 — HOME wrapper isolation:**
${tier2Text}
${blockedSection}
## CRITICAL RULES — read before running ANY credential command

1. **Whitelisted tools**: You may freely run \`login\`, \`configure\`, \`auth\`, or any credential-setup command. Credentials are automatically stored in this tenant's isolated sandbox — they cannot leak to other tenants or the host system.

2. **Non-whitelisted tools**: STOP before running any credential command (\`login\`, \`configure\`, \`auth\`, \`init\`, \`register\`, etc.) for a tool NOT listed above. Warn the user:

   > "Tool X is NOT in the we-happier sandbox whitelist. Running credential commands will store credentials in the HOST system, shared with all users. This is a security risk in a multi-tenant environment. Should I proceed?"

   If the user says yes, proceed but note the risk. If the user says no, suggest they add the tool to the whitelist config.

3. **Never modify shared shell config**: Do NOT edit \`~/.bashrc\`, \`~/.zshrc\`, \`~/.profile\`, \`~/.bash_profile\`, or any file in the real \`$HOME\` that affects all users.

4. **ssh is partially isolated**: The SSH config can be redirected per-command with \`-F\`, but \`~/.ssh/known_hosts\` and keys in \`~/.ssh/\` are shared. For SSH key operations, warn the user about shared state.

5. **Never use full paths to bypass blocks**: If a tool is blocked or not whitelisted, do not try \`/usr/bin/<tool>\` or similar full-path invocations. The restriction is intentional and enforced by the administrator.

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
}

export async function injectSkills(
  skillsDir: string,
  registry: SandboxRegistry,
): Promise<void> {
  const spawnDir = join(skillsDir, "we-happier-spawn");
  await mkdir(spawnDir, { recursive: true });
  await writeFile(join(spawnDir, "SKILL.md"), SPAWN_SKILL);

  const guardDir = join(skillsDir, "we-happier-sandbox-guard");
  await mkdir(guardDir, { recursive: true });
  await writeFile(join(guardDir, "SKILL.md"), buildGuardSkill(registry));

  const table = formatWhitelistTable(registry);
  await writeFile(join(guardDir, "WHITELIST.md"), `# Current Whitelist\n\n${table}\n`);
}
