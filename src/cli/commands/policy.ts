import chalk from "chalk";
import { existsSync } from "node:fs";

import { readTenantConfig, writeTenantConfig } from "@/tenant/config";
import {
  getRegistry,
  getTenantPaths,
  regenerateSandbox,
} from "@/tenant/manager";
import { log } from "@/utils/logger";

async function loadConfig(username: string) {
  const paths = getTenantPaths(username);
  if (!existsSync(paths.root)) {
    throw new Error(`Tenant "${username}" does not exist.`);
  }
  const config = await readTenantConfig(paths.configFile);
  if (!config) throw new Error(`Tenant "${username}" config not found.`);
  return { paths, config };
}

export async function handlePolicyDeny(
  username: string,
  toolId: string,
): Promise<void> {
  const registry = getRegistry();
  const entry = registry.getById(toolId);
  if (!entry) {
    const all = registry.getAllEntries().map((e) => e.id);
    throw new Error(
      `Unknown tool id "${toolId}". Available: ${all.join(", ")}`,
    );
  }

  const { paths, config } = await loadConfig(username);
  const disabled = new Set(config.disabledTools ?? []);

  if (disabled.has(toolId)) {
    log.info(`"${entry.name}" is already blocked for tenant "${username}".`);
    return;
  }

  disabled.add(toolId);
  config.disabledTools = [...disabled].sort();
  await writeTenantConfig(paths.configFile, config);

  await regenerateSandbox(username);
  log.success(
    `Blocked "${entry.name}" (${entry.binaries.join(", ")}) for tenant "${username}".`,
  );
}

export async function handlePolicyAllow(
  username: string,
  toolId: string,
): Promise<void> {
  const registry = getRegistry();
  const entry = registry.getById(toolId);
  if (!entry) {
    const all = registry.getAllEntries().map((e) => e.id);
    throw new Error(
      `Unknown tool id "${toolId}". Available: ${all.join(", ")}`,
    );
  }

  const { paths, config } = await loadConfig(username);
  const disabled = new Set(config.disabledTools ?? []);

  if (!disabled.has(toolId)) {
    log.info(`"${entry.name}" is already allowed for tenant "${username}".`);
    return;
  }

  disabled.delete(toolId);
  config.disabledTools = disabled.size > 0 ? [...disabled].sort() : undefined;
  await writeTenantConfig(paths.configFile, config);

  await regenerateSandbox(username);
  log.success(
    `Unblocked "${entry.name}" (${entry.binaries.join(", ")}) for tenant "${username}".`,
  );
}

export async function handlePolicyList(username: string): Promise<void> {
  const { config } = await loadConfig(username);
  const registry = getRegistry();
  const disabled = new Set(config.disabledTools ?? []);

  console.log(chalk.bold(`Policy for tenant "${username}":`));
  console.log();

  const header = ["Tool ID".padEnd(18), "Name".padEnd(22), "Status"].join("  ");
  console.log(chalk.bold(header));
  console.log("-".repeat(header.length));

  for (const entry of registry.getAllEntries()) {
    if (!entry.enabledByDefault) continue;

    const status = disabled.has(entry.id)
      ? chalk.red("BLOCKED")
      : chalk.green("allowed");

    console.log(
      [entry.id.padEnd(18), entry.name.padEnd(22), status].join("  "),
    );
  }

  if (disabled.size > 0) {
    console.log();
    console.log(chalk.dim(`${disabled.size} tool(s) blocked.`));
  }
}
