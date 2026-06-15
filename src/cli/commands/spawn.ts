import { buildTenantEnv, buildTenantPath } from "@/tenant/env";
import { getRegistryForTenant, getTenantPaths } from "@/tenant/manager";
import { ensureTmuxInstalled } from "@/tmux/check";
import { createTmuxWindowWithHappier } from "@/tmux/session";
import { log } from "@/utils/logger";

export async function handleSpawn(
  happierArgs: readonly string[],
): Promise<void> {
  const tenant = process.env.WE_HAPPIER_TENANT?.trim();
  const session = process.env.WE_HAPPIER_TMUX_SESSION?.trim();

  if (!tenant || !session) {
    throw new Error(
      "Not inside a we-happier tenant session. Use: we-happier run <user>",
    );
  }

  await ensureTmuxInstalled();

  const paths = getTenantPaths(tenant);
  const registry = await getRegistryForTenant(tenant);
  const tenantEnv = buildTenantEnv({
    paths,
    registry,
    username: tenant,
    tmuxSession: session,
  });
  tenantEnv.PATH = buildTenantPath(paths, process.env.PATH ?? "");

  const windowName = `task-${Date.now()}`;
  const cwd = process.cwd();

  await createTmuxWindowWithHappier({
    sessionName: session,
    windowName,
    happierArgs,
    env: tenantEnv,
    cwd,
  });

  log.success(`Spawned new window "${windowName}" in session "${session}".`);
}
