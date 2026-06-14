import { existsSync } from "node:fs";
import { readTenantConfig, writeTenantConfig } from "../../tenant/config.js";
import { getTenantPaths, getRegistry } from "../../tenant/manager.js";
import { buildTenantEnv, buildTenantPath, tmuxSessionName } from "../../tenant/env.js";
import { ensureTmuxInstalled } from "../../tmux/check.js";
import {
  tmuxSessionExists,
  createTmuxSessionWithHappier,
  createTmuxWindowWithHappier,
  attachTmuxSession,
} from "../../tmux/session.js";
import { log } from "../../utils/logger.js";

export async function handleRun(
  username: string,
  happierArgs: readonly string[],
): Promise<void> {
  await ensureTmuxInstalled();

  const paths = getTenantPaths(username);

  if (!existsSync(paths.root)) {
    throw new Error(
      `Tenant "${username}" does not exist. Run: we-happier create ${username}`,
    );
  }

  const config = await readTenantConfig(paths.configFile);
  if (config?.status !== "active") {
    throw new Error(
      `Tenant "${username}" is not active (status: ${config?.status ?? "unknown"}). Complete auth first.`,
    );
  }

  config.lastUsedAt = new Date().toISOString();
  await writeTenantConfig(paths.configFile, config);

  const registry = getRegistry();
  const session = tmuxSessionName(username);
  const tenantEnv = buildTenantEnv({ paths, registry, username, tmuxSession: session });
  tenantEnv.PATH = buildTenantPath(paths, process.env.PATH ?? "");

  const cwd = process.cwd();
  const exists = await tmuxSessionExists(session);

  if (exists) {
    const windowName = `task-${Date.now()}`;
    log.info(`Creating new window in session "${session}"...`);
    await createTmuxWindowWithHappier({
      sessionName: session,
      windowName,
      happierArgs,
      env: tenantEnv,
      cwd,
    });
  } else {
    log.info(`Creating tmux session "${session}"...`);
    await createTmuxSessionWithHappier({
      sessionName: session,
      windowName: "main",
      happierArgs,
      env: tenantEnv,
      cwd,
    });
  }

  log.info("Attaching to tmux session...");
  await attachTmuxSession(session);
}
