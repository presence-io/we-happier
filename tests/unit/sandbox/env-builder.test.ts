import { describe, it, expect } from "vitest";
import { buildSandboxEnv, resolveSandboxDirs } from "@/sandbox/env-builder.js";
import { SandboxRegistry, type ToolSandboxEntry } from "@/sandbox/registry.js";

const ENTRIES: ToolSandboxEntry[] = [
  {
    id: "aws",
    name: "AWS CLI",
    binaries: ["aws"],
    tier: "env_var",
    envOverrides: {
      AWS_CONFIG_FILE: "{sandboxDir}/aws/config",
      AWS_SHARED_CREDENTIALS_FILE: "{sandboxDir}/aws/credentials",
    },
    enabledByDefault: true,
  },
  {
    id: "gh",
    name: "GitHub CLI",
    binaries: ["gh"],
    tier: "env_var",
    envOverrides: {
      GH_CONFIG_DIR: "{sandboxDir}/gh",
    },
    enabledByDefault: true,
  },
  {
    id: "aliyun",
    name: "Aliyun CLI",
    binaries: ["aliyun"],
    tier: "home_wrapper",
    homeConfigPaths: [".aliyun/"],
    enabledByDefault: true,
  },
  {
    id: "disabled",
    name: "Disabled",
    binaries: ["dtool"],
    tier: "env_var",
    envOverrides: { DTOOL_DIR: "{sandboxDir}/dtool" },
    enabledByDefault: false,
  },
];

describe("buildSandboxEnv", () => {
  const registry = new SandboxRegistry(ENTRIES);

  it("resolves template placeholders for Tier 1 entries", () => {
    const env = buildSandboxEnv(registry, "/sandbox");

    expect(env.AWS_CONFIG_FILE).toBe("/sandbox/aws/config");
    expect(env.AWS_SHARED_CREDENTIALS_FILE).toBe("/sandbox/aws/credentials");
    expect(env.GH_CONFIG_DIR).toBe("/sandbox/gh");
  });

  it("does not include Tier 2 entries in env", () => {
    const env = buildSandboxEnv(registry, "/sandbox");
    expect(Object.keys(env)).not.toContain("HOME");
  });

  it("does not include disabled entries", () => {
    const env = buildSandboxEnv(registry, "/sandbox");
    expect(env.DTOOL_DIR).toBeUndefined();
  });
});

describe("resolveSandboxDirs", () => {
  const registry = new SandboxRegistry(ENTRIES);

  it("returns parent directories for Tier 1 env var paths", () => {
    const dirs = resolveSandboxDirs(registry, "/sandbox");
    expect(dirs).toContain("/sandbox/aws");
    expect(dirs).toContain("/sandbox");
  });

  it("returns home-overlay directories for Tier 2 entries", () => {
    const dirs = resolveSandboxDirs(registry, "/sandbox");
    expect(dirs).toContain("/sandbox/home-overlay/.aliyun/");
  });

  it("always includes bin and home-overlay dirs", () => {
    const dirs = resolveSandboxDirs(registry, "/sandbox");
    expect(dirs).toContain("/sandbox/bin");
    expect(dirs).toContain("/sandbox/home-overlay");
  });

  it("does not include disabled entry dirs", () => {
    const dirs = resolveSandboxDirs(registry, "/sandbox");
    expect(dirs).not.toContain("/sandbox/dtool");
  });

  it("returns sorted directories", () => {
    const dirs = resolveSandboxDirs(registry, "/sandbox");
    const sorted = [...dirs].sort();
    expect(dirs).toEqual(sorted);
  });
});
