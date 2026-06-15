import { existsSync } from "node:fs";

import { checkHappierAuth, findHappierBinary } from "@/happier/check";
import { readTenantConfig, writeTenantConfig } from "@/tenant/config";
import { buildTenantEnv, buildTenantPath, tmuxSessionName } from "@/tenant/env";
import { getRegistryForTenant, getTenantPaths } from "@/tenant/manager";
import { ensureTmuxInstalled } from "@/tmux/check";
import {
  attachTmuxSession,
  createTmuxSessionWithHappier,
  createTmuxWindowWithHappier,
  tmuxSessionExists,
} from "@/tmux/session";
import { log } from "@/utils/logger";

export async function handleRun(
  username: string,
  happierArgs: readonly string[],
  options: { detach?: boolean } = {},
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

  const registry = await getRegistryForTenant(username);
  const session = tmuxSessionName(username);
  const tenantEnv = buildTenantEnv({
    paths,
    registry,
    username,
    tmuxSession: session,
  });
  tenantEnv.PATH = buildTenantPath(paths, process.env.PATH ?? "");

  const happierBin = await findHappierBinary();
  if (happierBin) {
    const authStatus = await checkHappierAuth(happierBin, tenantEnv);
    if (authStatus === "expired") {
      log.warn(
        `Auth may be expired for "${username}". Consider: we-happier create ${username}`,
      );
    }
  }

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

  if (options.detach || !process.stdin.isTTY) {
    log.success(
      `Session "${session}" started in detached mode. Attach with: tmux attach -t ${session}`,
    );
    return;
  }

  log.info("Attaching to tmux session...");
  const attachCode = await attachTmuxSession(session);
  if (attachCode !== 0) {
    log.warn(
      `tmux attach exited with code ${attachCode}. The session is still running.`,
    );
    log.dim(`Attach manually with: tmux attach -t ${session}`);
  }
}
