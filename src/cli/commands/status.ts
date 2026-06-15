import chalk from "chalk";
import { existsSync } from "node:fs";

import { readTenantConfig } from "@/tenant/config";
import { tmuxSessionName } from "@/tenant/env";
import { getRegistryForTenant, getTenantPaths } from "@/tenant/manager";
import { tmuxSessionExists } from "@/tmux/session";
import { exec } from "@/utils/exec";

async function isBinaryInPath(binaryName: string): Promise<boolean> {
  const result = await exec("which", [binaryName]);
  return result.exitCode === 0;
}

export async function handleStatus(username: string): Promise<void> {
  const paths = getTenantPaths(username);

  if (!existsSync(paths.root)) {
    throw new Error(`Tenant "${username}" does not exist.`);
  }

  const config = await readTenantConfig(paths.configFile);
  const session = tmuxSessionName(username);
  let tmuxActive = false;
  try {
    tmuxActive = await tmuxSessionExists(session);
  } catch {
    // tmux not available
  }

  console.log(chalk.bold(`Tenant: ${username}`));
  console.log(`  Status:       ${config?.status ?? "unknown"}`);
  console.log(`  Created:      ${config?.createdAt ?? "-"}`);
  console.log(`  Last used:    ${config?.lastUsedAt ?? "-"}`);
  console.log(
    `  tmux session: ${tmuxActive ? chalk.green("active") : chalk.dim("inactive")} (${session})`,
  );
  console.log();
  console.log(chalk.bold("Paths:"));
  console.log(`  Root:         ${paths.root}`);
  console.log(`  Happier home: ${paths.happierHome}`);
  console.log(`  Sandbox:      ${paths.sandboxDir}`);
  console.log(`  Skills:       ${paths.skillsDir}`);
  console.log();

  const registry = await getRegistryForTenant(username);
  const enabled = registry.getEnabledEntries();
  const blocked = registry.getBlockedEntries();

  console.log(
    chalk.bold(
      `Sandboxed tools (${enabled.length} enabled, ${blocked.length} blocked):`,
    ),
  );
  for (const entry of enabled) {
    let installed = false;
    for (const b of entry.binaries) {
      if (await isBinaryInPath(b)) {
        installed = true;
        break;
      }
    }
    const marker = installed
      ? chalk.green("installed")
      : chalk.dim("not found");
    console.log(`  ${entry.name.padEnd(20)} [${entry.tier}] ${marker}`);
  }

  if (blocked.length > 0) {
    console.log();
    console.log(chalk.bold("Blocked tools:"));
    for (const entry of blocked) {
      console.log(
        `  ${chalk.red(entry.name.padEnd(20))} [${entry.id}] blocked by policy`,
      );
    }
  }
}
