import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";

export const TenantStatus = z.enum(["pending_auth", "active", "disabled"]);
export type TenantStatus = z.infer<typeof TenantStatus>;

export const TenantConfig = z.object({
  username: z.string(),
  status: TenantStatus,
  createdAt: z.string(),
  lastUsedAt: z.string().optional(),
  disabledTools: z.array(z.string()).optional(),
});
export type TenantConfig = z.infer<typeof TenantConfig>;

export async function readTenantConfig(
  path: string,
): Promise<TenantConfig | null> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw new Error(
      `Cannot read tenant config at ${path}: ${(err as Error).message}`,
    );
  }

  try {
    return TenantConfig.parse(JSON.parse(raw));
  } catch (err) {
    throw new Error(
      `Corrupt tenant config at ${path}: ${(err as Error).message}`,
    );
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
