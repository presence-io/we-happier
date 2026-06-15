import { existsSync } from "node:fs";

import { runHappierInteractive } from "@/happier/runner";
import { readTenantConfig } from "@/tenant/config";
import { buildTenantEnv, buildTenantPath, tmuxSessionName } from "@/tenant/env";
import {
  activateTenant,
  createTenant,
  getRegistry,
  getTenantPaths,
} from "@/tenant/manager";
import type { TenantPaths } from "@/tenant/paths";
import { log } from "@/utils/logger";

export async function handleCreate(username: string): Promise<void> {
  let paths: TenantPaths;

  const existing = getTenantPaths(username);
  if (existsSync(existing.root)) {
    const config = await readTenantConfig(existing.configFile);
    if (config?.status === "active") {
      throw new Error(
        `Tenant "${username}" already exists and is active. Use: we-happier run ${username}`,
      );
    }
    if (config?.status === "disabled") {
      throw new Error(
        `Tenant "${username}" is disabled. Delete it first: we-happier delete ${username}`,
      );
    }
    log.info(
      `Tenant "${username}" exists with status "${config?.status ?? "unknown"}". Retrying auth...`,
    );
    paths = existing;
  } else {
    paths = await createTenant(username);
  }

  log.info("Starting happier auth login...");

  const registry = getRegistry();
  const session = tmuxSessionName(username);
  const tenantEnv = buildTenantEnv({
    paths,
    registry,
    username,
    tmuxSession: session,
  });
  tenantEnv.PATH = buildTenantPath(paths, process.env.PATH ?? "");

  const exitCode = await runHappierInteractive(
    ["auth", "login", "--force"],
    tenantEnv,
  );

  if (exitCode !== 0) {
    log.warn(
      `Auth exited with code ${exitCode}. Tenant created but status remains "pending_auth".`,
    );
    log.dim(`Run "we-happier create ${username}" again to retry auth.`);
    return;
  }

  await activateTenant(username);
  log.success(`Tenant "${username}" is active and ready.`);
  log.dim(`Run: we-happier run ${username}`);
}
