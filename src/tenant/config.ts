import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";

export const TenantStatus = z.enum(["pending_auth", "active", "disabled"]);
export type TenantStatus = z.infer<typeof TenantStatus>;

export const TenantConfig = z.object({
  username: z.string(),
  status: TenantStatus,
  createdAt: z.string(),
  lastUsedAt: z.string().optional(),
});
export type TenantConfig = z.infer<typeof TenantConfig>;

export async function readTenantConfig(
  path: string,
): Promise<TenantConfig | null> {
  try {
    const raw = await readFile(path, "utf8");
    return TenantConfig.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function writeTenantConfig(
  path: string,
  config: TenantConfig,
): Promise<void> {
  await writeFile(path, JSON.stringify(config, null, 2) + "\n", {
    mode: 0o600,
  });
}
