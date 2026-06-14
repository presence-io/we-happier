import { writeFile, chmod } from "node:fs/promises";
import { join } from "node:path";
import type { ToolSandboxEntry } from "@/sandbox/registry";

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

function buildDenyWrapperScript(binaryName: string, toolName: string): string {
  return [
    "#!/bin/sh",
    `# we-happier deny wrapper for ${binaryName} (blocked by policy)`,
    `echo "we-happier: ${binaryName} (${toolName}) is blocked by administrator policy for this tenant." >&2`,
    `echo "This restriction is enforced by we-happier. Do not attempt to bypass it." >&2`,
    "exit 126",
    "",
  ].join("\n");
}

export async function generateWrappers(
  entries: readonly ToolSandboxEntry[],
  sandboxDir: string,
  blockedIds?: ReadonlySet<string>,
): Promise<string[]> {
  const binDir = join(sandboxDir, "bin");
  const homeOverlayDir = join(sandboxDir, "home-overlay");
  const generated: string[] = [];
  const blocked = blockedIds ?? new Set<string>();

  for (const entry of entries) {
    if (!entry.enabledByDefault) continue;

    if (blocked.has(entry.id)) {
      for (const binaryName of entry.binaries) {
        const wrapperPath = join(binDir, binaryName);
        const script = buildDenyWrapperScript(binaryName, entry.name);
        await writeFile(wrapperPath, script, { mode: 0o755 });
        await chmod(wrapperPath, 0o755);
        generated.push(wrapperPath);
      }
      continue;
    }

    if (entry.tier !== "home_wrapper") continue;

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
