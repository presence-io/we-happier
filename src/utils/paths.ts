import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

export function resolveWeHappierHome(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const override = env.WE_HAPPIER_HOME?.trim();
  if (override) {
    if (override.startsWith("~")) {
      return join(homedir(), override.slice(1));
    }
    return isAbsolute(override) ? override : resolve(override);
  }
  return join(homedir(), ".we-happier");
}

export function resolveTenantsDir(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return join(resolveWeHappierHome(env), "tenants");
}
