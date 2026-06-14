import { writeFile, chmod } from "node:fs/promises";
import { join } from "node:path";
import type { ToolSandboxEntry } from "./registry.js";

function buildHomeWrapperScript(
  binaryName: string,
  homeOverlayDir: string,
): string {
  return [
    "#!/bin/sh",
    `# we-happier sandbox wrapper for ${binaryName} (HOME isolation)`,
    `sandbox_bin_dir="$(cd "$(dirname "$0")" && pwd)"`,
    `clean_path="$(printf '%s' "$PATH" | tr ':' '\\n' | grep -Fxv "$sandbox_bin_dir" | tr '\\n' ':')"`,
    `real_bin="$(PATH="$clean_path" command -v "${binaryName}" 2>/dev/null || true)"`,
    `if [ -z "$real_bin" ]; then`,
    `  echo "we-happier: ${binaryName} not found in PATH (outside sandbox)" >&2`,
    `  exit 127`,
    `fi`,
    `export HOME="${homeOverlayDir}"`,
    `exec "$real_bin" "$@"`,
    "",
  ].join("\n");
}

export async function generateWrappers(
  entries: readonly ToolSandboxEntry[],
  sandboxDir: string,
): Promise<string[]> {
  const binDir = join(sandboxDir, "bin");
  const homeOverlayDir = join(sandboxDir, "home-overlay");
  const generated: string[] = [];

  for (const entry of entries) {
    if (entry.tier !== "home_wrapper" || !entry.enabledByDefault) continue;

    for (const binaryName of entry.binaries) {
      const wrapperPath = join(binDir, binaryName);
      const script = buildHomeWrapperScript(binaryName, homeOverlayDir);
      await writeFile(wrapperPath, script, { mode: 0o755 });
      await chmod(wrapperPath, 0o755);
      generated.push(wrapperPath);
    }
  }

  return generated;
}
