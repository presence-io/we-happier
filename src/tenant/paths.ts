import { join } from "node:path";

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_-]{0,30}[a-z0-9]$/;

export function validateUsername(name: string): string | null {
  if (name.length < 2) return "Username must be at least 2 characters.";
  if (name.length > 32) return "Username must be at most 32 characters.";
  if (!USERNAME_PATTERN.test(name))
    return "Username must be lowercase alphanumeric, hyphens, and underscores. Must start and end with alphanumeric.";
  return null;
}

export interface TenantPaths {
  root: string;
  configFile: string;
  happierHome: string;
  sandboxDir: string;
  sandboxBin: string;
  homeOverlay: string;
  skillsDir: string;
}

export function resolveTenantPaths(
  tenantsDir: string,
  username: string,
): TenantPaths {
  const root = join(tenantsDir, username);
  const sandboxDir = join(root, "sandbox");
  return {
    root,
    configFile: join(root, "tenant.json"),
    happierHome: join(root, "happier"),
    sandboxDir,
    sandboxBin: join(sandboxDir, "bin"),
    homeOverlay: join(sandboxDir, "home-overlay"),
    skillsDir: join(root, "skills"),
  };
}
