import { existsSync } from "node:fs";
import { mkdir, readdir, rm, stat } from "node:fs/promises";

import { DEFAULT_TOOL_REGISTRY } from "@/sandbox/defaults";
import { resolveSandboxDirs } from "@/sandbox/env-builder";
import { SandboxRegistry } from "@/sandbox/registry";
import { generateWrappers } from "@/sandbox/wrapper-generator";
import { injectSkills } from "@/skills/injector";
import {
  type TenantConfig,
  readTenantConfig,
  writeTenantConfig,
} from "@/tenant/config";
import {
  type TenantPaths,
  resolveTenantPaths,
  validateUsername,
} from "@/tenant/paths";
import { log } from "@/utils/logger";
import { resolveTenantsDir } from "@/utils/paths";

function getRegistry(): SandboxRegistry {
  return new SandboxRegistry(DEFAULT_TOOL_REGISTRY);
}

export async function getRegistryForTenant(
  username: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<SandboxRegistry> {
  const registry = getRegistry();
  const paths = resolveTenantPaths(resolveTenantsDir(env), username);
  const config = await readTenantConfig(paths.configFile);
  if (!config?.disabledTools?.length) return registry;
  return registry.withPolicy(config.disabledTools);
}

export async function createTenant(
  username: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<TenantPaths> {
  const validationError = validateUsername(username);
  if (validationError) throw new Error(validationError);

  const tenantsDir = resolveTenantsDir(env);
  const paths = resolveTenantPaths(tenantsDir, username);

  if (existsSync(paths.root)) {
    throw new Error(`Tenant "${username}" already exists.`);
  }

  const registry = getRegistry();
  const sandboxDirs = resolveSandboxDirs(registry, paths.sandboxDir);

  const allDirs = [
    paths.root,
    paths.happierHome,
    paths.sandboxBin,
    paths.homeOverlay,
    paths.skillsDir,
    ...sandboxDirs,
  ];

  const oldUmask = process.umask(0o077);
  try {
    for (const dir of allDirs) {
      await mkdir(dir, { recursive: true });
    }
  } finally {
    process.umask(oldUmask);
  }

  await generateWrappers(DEFAULT_TOOL_REGISTRY, paths.sandboxDir);
  log.success("Generated sandbox wrapper scripts.");

  await injectSkills(paths.skillsDir, registry);
  log.success("Injected tenant skills.");

  const config: TenantConfig = {
    username,
    status: "pending_auth",
    createdAt: new Date().toISOString(),
  };
  await writeTenantConfig(paths.configFile, config);
  log.success(`Tenant "${username}" created (pending auth).`);

  return paths;
}

export async function regenerateSandbox(
  username: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const paths = resolveTenantPaths(resolveTenantsDir(env), username);
  if (!existsSync(paths.root)) {
    throw new Error(`Tenant "${username}" does not exist.`);
  }

  const config = await readTenantConfig(paths.configFile);
  if (!config) throw new Error(`Tenant "${username}" config not found.`);

  const registry = getRegistry();
  const blocked = new Set(config.disabledTools ?? []);
  const projected =
    blocked.size > 0 ? registry.withPolicy([...blocked]) : registry;

  await generateWrappers(DEFAULT_TOOL_REGISTRY, paths.sandboxDir, blocked);
  await injectSkills(paths.skillsDir, projected);
}

export async function activateTenant(
  username: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const paths = resolveTenantPaths(resolveTenantsDir(env), username);
  const config = await readTenantConfig(paths.configFile);
  if (!config) throw new Error(`Tenant "${username}" not found.`);

  config.status = "active";
  config.lastUsedAt = new Date().toISOString();
  await writeTenantConfig(paths.configFile, config);
}

export async function deleteTenant(
  username: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const paths = resolveTenantPaths(resolveTenantsDir(env), username);
  if (!existsSync(paths.root)) {
    throw new Error(`Tenant "${username}" does not exist.`);
  }
  await rm(paths.root, { recursive: true, force: true });
  log.success(`Tenant "${username}" deleted.`);
}

export interface TenantListEntry {
  username: string;
  config: TenantConfig | null;
}

export async function listTenants(
  env: NodeJS.ProcessEnv = process.env,
): Promise<TenantListEntry[]> {
  const tenantsDir = resolveTenantsDir(env);
  if (!existsSync(tenantsDir)) return [];

  const entries = await readdir(tenantsDir);
  const result: TenantListEntry[] = [];

  for (const name of entries) {
    const paths = resolveTenantPaths(tenantsDir, name);
    try {
      const s = await stat(paths.root);
      if (!s.isDirectory()) continue;
    } catch {
      continue;
    }
    const config = await readTenantConfig(paths.configFile);
    result.push({ username: name, config });
  }

  return result;
}

export function getTenantPaths(
  username: string,
  env: NodeJS.ProcessEnv = process.env,
): TenantPaths {
  return resolveTenantPaths(resolveTenantsDir(env), username);
}

export { getRegistry };
