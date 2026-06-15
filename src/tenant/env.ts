import { buildSandboxEnv } from "@/sandbox/env-builder";
import type { SandboxRegistry } from "@/sandbox/registry";
import type { TenantPaths } from "@/tenant/paths";

export interface TenantEnvOptions {
  paths: TenantPaths;
  registry: SandboxRegistry;
  username: string;
  tmuxSession: string;
}

export function buildTenantEnv(
  options: TenantEnvOptions,
): Record<string, string> {
  const { paths, registry, username, tmuxSession } = options;
  const sandboxEnv = buildSandboxEnv(registry, paths.sandboxDir);

  return {
    ...sandboxEnv,
    HAPPIER_HOME_DIR: paths.happierHome,
    HAPPIER_DISABLE_AUTO_UPDATE: "1",
    WE_HAPPIER_TENANT: username,
    WE_HAPPIER_TMUX_SESSION: tmuxSession,
  };
}

export function buildTenantPath(
  paths: TenantPaths,
  currentPath: string,
): string {
  return `${paths.sandboxBin}:${currentPath}`;
}

export function tmuxSessionName(username: string): string {
  return `we-happier-${username}`;
}
