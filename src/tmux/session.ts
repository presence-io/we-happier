import { exec, spawnInteractive } from "../utils/exec.js";
import { ensureHappierInstalled } from "../happier/check.js";

export async function tmuxSessionExists(sessionName: string): Promise<boolean> {
  const result = await exec("tmux", ["has-session", "-t", sessionName]);
  return result.exitCode === 0;
}

export async function killTmuxSession(sessionName: string): Promise<void> {
  await exec("tmux", ["kill-session", "-t", sessionName]);
}

function buildEnvFlags(env: Record<string, string>): string[] {
  const flags: string[] = [];
  for (const [key, value] of Object.entries(env)) {
    flags.push("-e", `${key}=${value}`);
  }
  return flags;
}

export async function createTmuxSessionWithHappier(options: {
  sessionName: string;
  windowName: string;
  happierArgs: readonly string[];
  env: Record<string, string>;
  cwd: string;
}): Promise<void> {
  const happierBin = await ensureHappierInstalled();
  const { sessionName, windowName, happierArgs, env, cwd } = options;

  const envFlags = buildEnvFlags(env);

  await exec("tmux", [
    "new-session",
    "-d",
    "-s",
    sessionName,
    "-n",
    windowName,
    "-c",
    cwd,
    ...envFlags,
    happierBin,
    ...happierArgs,
  ]);
}

export async function createTmuxWindowWithHappier(options: {
  sessionName: string;
  windowName: string;
  happierArgs: readonly string[];
  env: Record<string, string>;
  cwd: string;
}): Promise<void> {
  const happierBin = await ensureHappierInstalled();
  const { sessionName, windowName, happierArgs, env, cwd } = options;

  const envFlags = buildEnvFlags(env);

  await exec("tmux", [
    "new-window",
    "-t",
    sessionName,
    "-n",
    windowName,
    "-c",
    cwd,
    ...envFlags,
    happierBin,
    ...happierArgs,
  ]);
}

export async function attachTmuxSession(
  sessionName: string,
): Promise<number> {
  return spawnInteractive("tmux", ["attach-session", "-t", sessionName]);
}
