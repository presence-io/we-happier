import { exec, spawnInteractive } from "@/utils/exec";
import { log } from "@/utils/logger";

const MIN_HAPPIER_VERSION = "0.1.0";

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

function parseVersion(output: string): string | null {
  const match = output.match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}

function isVersionSatisfied(actual: string, minimum: string): boolean {
  const [aMaj, aMin, aPat] = actual.split(".").map(Number);
  const [mMaj, mMin, mPat] = minimum.split(".").map(Number);
  if (aMaj !== mMaj) return aMaj > mMaj;
  if (aMin !== mMin) return aMin > mMin;
  return aPat >= mPat;
}

export async function getHappierVersion(
  happierBin: string,
): Promise<string | null> {
  const result = await exec(happierBin, ["--version"]);
  if (result.exitCode !== 0) return null;
  return parseVersion(result.stdout) ?? parseVersion(result.stderr);
}

export async function checkVersionCompatibility(
  happierBin: string,
): Promise<void> {
  const version = await getHappierVersion(happierBin);
  if (!version) return;
  if (!isVersionSatisfied(version, MIN_HAPPIER_VERSION)) {
    log.warn(
      `happier ${version} is below minimum ${MIN_HAPPIER_VERSION}. ` +
        `Some features may not work. Consider updating happier.`,
    );
  }
}

export async function checkHappierAuth(
  happierBin: string,
  tenantEnv: Record<string, string>,
): Promise<"ok" | "expired" | "unknown"> {
  const result = await exec(happierBin, ["auth", "whoami"], {
    env: { ...process.env, ...tenantEnv },
  });
  if (result.exitCode === 0) return "ok";
  const output = `${result.stdout} ${result.stderr}`.toLowerCase();
  if (
    output.includes("not authenticated") ||
    output.includes("not logged in") ||
    output.includes("expired") ||
    output.includes("no auth")
  ) {
    return "expired";
  }
  return "unknown";
}

export async function ensureHappierInstalled(): Promise<string> {
  const existing = await findHappierBinary();
  if (existing) {
    await checkVersionCompatibility(existing);
    return existing;
  }

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
