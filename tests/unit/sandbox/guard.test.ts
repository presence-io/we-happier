import { describe, expect, it } from "vitest";

import {
  checkCredentialCommand,
  formatWhitelistTable,
} from "@/sandbox/guard.js";
import { SandboxRegistry, type ToolSandboxEntry } from "@/sandbox/registry.js";

const ENTRIES: ToolSandboxEntry[] = [
  {
    id: "aws",
    name: "AWS CLI",
    binaries: ["aws"],
    tier: "env_var",
    envOverrides: { AWS_CONFIG_FILE: "{sandboxDir}/aws/config" },
    enabledByDefault: true,
  },
  {
    id: "aliyun",
    name: "Aliyun CLI",
    binaries: ["aliyun"],
    tier: "home_wrapper",
    homeConfigPaths: [".aliyun"],
    enabledByDefault: true,
  },
];

describe("checkCredentialCommand", () => {
  const registry = new SandboxRegistry(ENTRIES);

  it("returns allowed for whitelisted binaries", () => {
    const result = checkCredentialCommand(registry, "aws");
    expect(result.allowed).toBe(true);
    expect(result.toolId).toBe("aws");
    expect(result.toolName).toBe("AWS CLI");
    expect(result.tier).toBe("env_var");
  });

  it("returns allowed for Tier 2 binaries", () => {
    const result = checkCredentialCommand(registry, "aliyun");
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe("home_wrapper");
  });

  it("returns blocked for unknown binaries", () => {
    const result = checkCredentialCommand(registry, "curl");
    expect(result.allowed).toBe(false);
    expect(result.toolId).toBeUndefined();
    expect(result.toolName).toBeUndefined();
    expect(result.reason).toContain("NOT in the sandbox whitelist");
  });

  it("includes binary name in blocked reason", () => {
    const result = checkCredentialCommand(registry, "vault");
    expect(result.reason).toContain('"vault"');
  });
});

describe("formatWhitelistTable", () => {
  const registry = new SandboxRegistry(ENTRIES);

  it("produces a markdown table with header", () => {
    const table = formatWhitelistTable(registry);
    const lines = table.split("\n");
    expect(lines[0]).toContain("Tool");
    expect(lines[0]).toContain("Binaries");
    expect(lines[0]).toContain("Isolation");
    expect(lines[1]).toContain("---");
  });

  it("includes all enabled entries", () => {
    const table = formatWhitelistTable(registry);
    expect(table).toContain("AWS CLI");
    expect(table).toContain("Aliyun CLI");
    expect(table).toContain("env_var");
    expect(table).toContain("home_wrapper");
  });

  it("lists binaries for each entry", () => {
    const table = formatWhitelistTable(registry);
    expect(table).toContain("aws");
    expect(table).toContain("aliyun");
  });
});
