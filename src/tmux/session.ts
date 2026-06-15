import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ensureHappierInstalled } from "@/happier/check";
import { exec, spawnInteractive } from "@/utils/exec";

const MAX_WINDOWS_PER_SESSION = 10;
const TMUX_HISTORY_LIMIT = 10000;

export async function tmuxSessionExists(sessionName: string): Promise<boolean> {
  const result = await exec("tmux", ["has-session", "-t", sessionName]);
  return result.exitCode === 0;
}

export async function killTmuxSession(sessionName: string): Promise<void> {
  await exec("tmux", ["kill-session", "-t", sessionName]);
}

export async function countTmuxWindows(sessionName: string): Promise<number> {
  const result = await exec("tmux", ["list-windows", "-t", sessionName]);
  if (result.exitCode !== 0) return 0;
  return result.stdout.trim().split("\n").filter(Boolean).length;
}

function buildLaunchScript(
  env: Record<string, string>,
  happierBin: string,
  happierArgs: readonly string[],
): string {
  const lines = ["#!/bin/sh"];
  for (const [key, value] of Object.entries(env)) {
    const escaped = value.replaceAll("'", "'\\''");
    lines.push(`export ${key}='${escaped}'`);
  }
  const quotedArgs = happierArgs.map((a) => {
    const escaped = a.replaceAll("'", "'\\''");
    return `'${escaped}'`;
  });
  lines.push(`rm -f "$0"`);
  lines.push(`exec '${happierBin}' ${quotedArgs.join(" ")}`);
  return lines.join("\n");
}

async function writeTempLaunchScript(
  env: Record<string, string>,
  happierBin: string,
  happierArgs: readonly string[],
): Promise<string> {
  const script = buildLaunchScript(env, happierBin, happierArgs);
  const scriptPath = join(
    tmpdir(),
    `we-happier-launch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.sh`,
  );
  await writeFile(scriptPath, script, { mode: 0o700 });
  return scriptPath;
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

  const scriptPath = await writeTempLaunchScript(env, happierBin, happierArgs);

  await exec("tmux", [
    "new-session",
    "-d",
    "-s",
    sessionName,
    "-n",
    windowName,
    "-c",
    cwd,
    "sh",
    scriptPath,
  ]);

  await exec("tmux", [
    "set-option",
    "-t",
    sessionName,
    "history-limit",
    String(TMUX_HISTORY_LIMIT),
  ]);
}

export async function createTmuxWindowWithHappier(options: {
  sessionName: string;
  windowName: string;
  happierArgs: readonly string[];
  env: Record<string, string>;
  cwd: string;
}): Promise<void> {
  const { sessionName, windowName, happierArgs, env, cwd } = options;

  const windowCount = await countTmuxWindows(sessionName);
  if (windowCount >= MAX_WINDOWS_PER_SESSION) {
    throw new Error(
      `Session "${sessionName}" already has ${windowCount} windows ` +
        `(limit: ${MAX_WINDOWS_PER_SESSION}). Close unused windows before spawning new ones.`,
    );
  }

  const happierBin = await ensureHappierInstalled();
  const scriptPath = await writeTempLaunchScript(env, happierBin, happierArgs);

  await exec("tmux", [
    "new-window",
    "-t",
    sessionName,
    "-n",
    windowName,
    "-c",
    cwd,
    "sh",
    scriptPath,
  ]);
}

export async function attachTmuxSession(sessionName: string): Promise<number> {
  return spawnInteractive("tmux", ["attach-session", "-t", sessionName]);
}
