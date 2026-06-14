import { cp, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { SandboxRegistry } from "../sandbox/registry.js";
import { formatWhitelistTable } from "../sandbox/guard.js";
import { writeFile } from "node:fs/promises";

const TEMPLATES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "templates",
);

const SKILL_NAMES = ["we-happier-spawn", "we-happier-sandbox-guard"] as const;

export async function injectSkills(
  skillsDir: string,
  registry: SandboxRegistry,
): Promise<void> {
  for (const skillName of SKILL_NAMES) {
    const src = join(TEMPLATES_DIR, skillName);
    const dest = join(skillsDir, skillName);
    await mkdir(dest, { recursive: true });
    await cp(src, dest, { recursive: true });
  }

  const guardSkillPath = join(
    skillsDir,
    "we-happier-sandbox-guard",
    "WHITELIST.md",
  );
  const table = formatWhitelistTable(registry);
  await writeFile(guardSkillPath, `# Current Whitelist\n\n${table}\n`);
}
