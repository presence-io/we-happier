import type { SandboxRegistry } from "@/sandbox/registry";

export interface GuardCheckResult {
  allowed: boolean;
  toolId: string | undefined;
  toolName: string | undefined;
  tier: string | undefined;
  reason: string;
}

export function checkCredentialCommand(
  registry: SandboxRegistry,
  binaryName: string,
): GuardCheckResult {
  const entry = registry.getEntryForBinary(binaryName);

  if (entry) {
    return {
      allowed: true,
      toolId: entry.id,
      toolName: entry.name,
      tier: entry.tier,
      reason: `${entry.name} is in the sandbox whitelist (${entry.tier}). Credentials are isolated.`,
    };
  }

  return {
    allowed: false,
    toolId: undefined,
    toolName: undefined,
    tier: undefined,
    reason:
      `"${binaryName}" is NOT in the sandbox whitelist. ` +
      `Running credential commands (login/configure/auth) will store credentials in the HOST system, not the tenant sandbox.`,
  };
}

export function formatWhitelistTable(registry: SandboxRegistry): string {
  const lines: string[] = ["Tool | Binaries | Isolation"];
  lines.push("-----|----------|----------");

  for (const entry of registry.getEnabledEntries()) {
    lines.push(
      `${entry.name} | ${entry.binaries.join(", ")} | ${entry.tier}`,
    );
  }

  return lines.join("\n");
}
