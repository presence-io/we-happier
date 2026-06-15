import { exec } from "@/utils/exec";

export async function ensureTmuxInstalled(): Promise<void> {
  const result = await exec("tmux", ["-V"]);
  if (result.exitCode === 0) return;

  const hint =
    process.platform === "darwin"
      ? "brew install tmux"
      : "sudo apt-get install tmux  # or: sudo yum install tmux";

  throw new Error(
    `tmux is required but not installed.\nInstall it with: ${hint}`,
  );
}
