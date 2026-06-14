import { describe, it, expect } from "vitest";
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
    id: "docker",
    name: "Docker",
    binaries: ["docker"],
    tier: "env_var",
    envOverrides: { DOCKER_CONFIG: "{sandboxDir}/docker" },
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

describe("SandboxRegistry.withPolicy", () => {
  const base = new SandboxRegistry(ENTRIES);

  it("returns a new registry with blocked tools excluded from enabled", () => {
    const projected = base.withPolicy(["docker"]);
    const enabled = projected.getEnabledEntries();
    expect(enabled.map((e) => e.id)).toEqual(["aws", "aliyun"]);
  });

  it("reports blocked tools via getBlockedEntries", () => {
    const projected = base.withPolicy(["docker", "aws"]);
    const blocked = projected.getBlockedEntries();
    expect(blocked.map((e) => e.id).sort()).toEqual(["aws", "docker"]);
  });

  it("isBlocked returns true for blocked binary", () => {
    const projected = base.withPolicy(["docker"]);
    expect(projected.isBlocked("docker")).toBe(true);
    expect(projected.isBlocked("aws")).toBe(false);
  });

  it("isToolBlocked works by tool id", () => {
    const projected = base.withPolicy(["aws"]);
    expect(projected.isToolBlocked("aws")).toBe(true);
    expect(projected.isToolBlocked("docker")).toBe(false);
  });

  it("does not affect base registry", () => {
    base.withPolicy(["docker", "aws", "aliyun"]);
    expect(base.getEnabledEntries()).toHaveLength(3);
    expect(base.getBlockedEntries()).toHaveLength(0);
  });

  it("getAllEntries still returns everything", () => {
    const projected = base.withPolicy(["docker"]);
    expect(projected.getAllEntries()).toHaveLength(3);
  });

  it("ignores unknown tool ids in policy", () => {
    const projected = base.withPolicy(["nonexistent"]);
    expect(projected.getEnabledEntries()).toHaveLength(3);
    expect(projected.getBlockedEntries()).toHaveLength(0);
  });

  it("getBlockedIds returns the blocked set", () => {
    const projected = base.withPolicy(["aws", "docker"]);
    expect([...projected.getBlockedIds()].sort()).toEqual(["aws", "docker"]);
  });
});
