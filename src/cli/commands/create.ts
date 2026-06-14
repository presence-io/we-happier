import { createTenant, activateTenant, getRegistry } from "../../tenant/manager.js";
import { buildTenantEnv, buildTenantPath, tmuxSessionName } from "../../tenant/env.js";
import { runHappierInteractive } from "../../happier/runner.js";
import { log } from "../../utils/logger.js";

export async function handleCreate(username: string): Promise<void> {
  const paths = await createTenant(username);

  log.info("Starting happier auth login...");

  const registry = getRegistry();
  const session = tmuxSessionName(username);
  const tenantEnv = buildTenantEnv({ paths, registry, username, tmuxSession: session });
  tenantEnv.PATH = buildTenantPath(paths, process.env.PATH ?? "");

  const exitCode = await runHappierInteractive(
    ["auth", "login", "--force"],
    tenantEnv,
  );

  if (exitCode !== 0) {
    log.warn(
      `Auth exited with code ${exitCode}. Tenant created but status remains "pending_auth".`,
    );
    log.dim(`Run "we-happier create ${username}" again or manually auth.`);
    return;
  }

  await activateTenant(username);
  log.success(`Tenant "${username}" is active and ready.`);
  log.dim(`Run: we-happier run ${username}`);
}
