import type { SandboxRegistry } from "./registry.js";

export function buildSandboxEnv(
  registry: SandboxRegistry,
  sandboxDir: string,
): Record<string, string> {
  const env: Record<string, string> = {};

  for (const entry of registry.getEnabledEntries()) {
    if (entry.tier === "env_var" && entry.envOverrides) {
      for (const [key, template] of Object.entries(entry.envOverrides)) {
        env[key] = template.replaceAll("{sandboxDir}", sandboxDir);
      }
    }
  }

  return env;
}

export function resolveSandboxDirs(
  registry: SandboxRegistry,
  sandboxDir: string,
): string[] {
  const dirs = new Set<string>();

  for (const entry of registry.getEnabledEntries()) {
    if (entry.tier === "env_var" && entry.envOverrides) {
      for (const template of Object.values(entry.envOverrides)) {
        const resolved = template.replaceAll("{sandboxDir}", sandboxDir);
        const lastSlash = resolved.lastIndexOf("/");
        if (lastSlash > 0) {
          dirs.add(resolved.slice(0, lastSlash));
        }
      }
    }

    if (entry.tier === "home_wrapper" && entry.homeConfigPaths) {
      for (const configPath of entry.homeConfigPaths) {
        dirs.add(`${sandboxDir}/home-overlay/${configPath}`);
      }
    }
  }

  dirs.add(`${sandboxDir}/bin`);
  dirs.add(`${sandboxDir}/home-overlay`);

  return [...dirs].sort();
}
