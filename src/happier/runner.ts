import { ensureHappierInstalled } from "@/happier/check";
import { spawnInteractive } from "@/utils/exec";

export async function runHappierInteractive(
  args: readonly string[],
  env: Record<string, string>,
  cwd?: string,
): Promise<number> {
  const happierBin = await ensureHappierInstalled();

  return spawnInteractive(happierBin, args, {
    env: { ...process.env, ...env },
    cwd,
  });
}
