import { execFile, spawn, type SpawnOptions } from "node:child_process";

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export function exec(
  command: string,
  args: readonly string[],
): Promise<ExecResult> {
  return new Promise((resolve) => {
    execFile(command, args, { encoding: "utf8" }, (error, stdout, stderr) => {
      const errWithStatus = error as (NodeJS.ErrnoException & { status?: number }) | null;
      resolve({
        stdout: stdout,
        stderr: stderr,
        exitCode: errWithStatus?.code === "ENOENT" ? 127 : errWithStatus?.status ?? 0,
      });
    });
  });
}

export function spawnInteractive(
  command: string,
  args: readonly string[],
  options?: SpawnOptions,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      ...options,
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}
