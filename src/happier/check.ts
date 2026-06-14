import { exec, spawnInteractive } from "../utils/exec.js";
import { log } from "../utils/logger.js";

export async function findHappierBinary(): Promise<string | null> {
  const result = await exec("which", ["happier"]);
  if (result.exitCode === 0 && result.stdout.trim()) {
    return result.stdout.trim();
  }

  const homeBin = `${process.env.HOME ?? ""}/.local/bin/happier`;
  const homeResult = await exec(homeBin, ["--version"]);
  if (homeResult.exitCode === 0) return homeBin;

  const happierManaged = `${process.env.HOME ?? ""}/.happier/cli/current/happier`;
  const managedResult = await exec(happierManaged, ["--version"]);
  if (managedResult.exitCode === 0) return happierManaged;

  return null;
}

export async function ensureHappierInstalled(): Promise<string> {
  const existing = await findHappierBinary();
  if (existing) return existing;

  log.warn("happier CLI not found. Installing...");
  log.info("Running: curl -fsSL https://happier.dev/install | bash");

  const exitCode = await spawnInteractive("bash", [
    "-c",
    "curl -fsSL https://happier.dev/install | bash",
  ]);

  if (exitCode !== 0) {
    throw new Error(`happier installation failed (exit code ${exitCode}).`);
  }

  const installed = await findHappierBinary();
  if (!installed) {
    throw new Error("happier installed but binary not found in PATH.");
  }

  log.success("happier installed successfully.");
  return installed;
}
