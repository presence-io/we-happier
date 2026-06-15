import { existsSync } from "node:fs";
import { mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildSandboxEnv } from "@/sandbox/env-builder.js";
import { readTenantConfig, writeTenantConfig } from "@/tenant/config.js";
import {
  createTenant,
  getRegistryForTenant,
  regenerateSandbox,
} from "@/tenant/manager.js";

describe("policy lifecycle", () => {
  let tempDir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `we-happier-policy-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    env = { WE_HAPPIER_HOME: tempDir };
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("new tenant has no blocked tools", async () => {
    await createTenant("alice", env);
    const registry = await getRegistryForTenant("alice", env);
    expect(registry.getBlockedEntries()).toHaveLength(0);
    expect(registry.getEnabledEntries().length).toBeGreaterThan(0);
  });

  it("blocking a tool excludes it from enabled entries", async () => {
    const paths = await createTenant("bob", env);
    const config = await readTenantConfig(paths.configFile);
    if (!config) throw new Error("expected config to exist");
    config.disabledTools = ["docker", "aws"];
    await writeTenantConfig(paths.configFile, config);

    const registry = await getRegistryForTenant("bob", env);
    const enabledIds = registry.getEnabledEntries().map((e) => e.id);
    expect(enabledIds).not.toContain("docker");
    expect(enabledIds).not.toContain("aws");
    expect(enabledIds).toContain("gh");
  });

  it("blocked tool env vars are excluded from sandbox env", async () => {
    const paths = await createTenant("charlie", env);
    const config = await readTenantConfig(paths.configFile);
    if (!config) throw new Error("expected config to exist");
    config.disabledTools = ["aws"];
    await writeTenantConfig(paths.configFile, config);

    const registry = await getRegistryForTenant("charlie", env);
    const sandboxEnv = buildSandboxEnv(registry, paths.sandboxDir);
    expect(sandboxEnv.AWS_CONFIG_FILE).toBeUndefined();
    expect(sandboxEnv.GH_CONFIG_DIR).toBeDefined();
  });

  it("regenerateSandbox creates deny wrappers for blocked tools", async () => {
    const paths = await createTenant("dave", env);
    const config = await readTenantConfig(paths.configFile);
    if (!config) throw new Error("expected config to exist");
    config.disabledTools = ["aliyun"];
    await writeTenantConfig(paths.configFile, config);

    await regenerateSandbox("dave", env);

    const wrapperPath = join(paths.sandboxBin, "aliyun");
    expect(existsSync(wrapperPath)).toBe(true);

    const content = await readFile(wrapperPath, "utf-8");
    expect(content).toContain("blocked by administrator policy");
    expect(content).toContain("exit 126");
  });

  it("regenerateSandbox creates deny wrappers for Tier 1 blocked tools too", async () => {
    const paths = await createTenant("eve", env);
    const config = await readTenantConfig(paths.configFile);
    if (!config) throw new Error("expected config to exist");
    config.disabledTools = ["docker"];
    await writeTenantConfig(paths.configFile, config);

    await regenerateSandbox("eve", env);

    const wrapperPath = join(paths.sandboxBin, "docker");
    expect(existsSync(wrapperPath)).toBe(true);

    const content = await readFile(wrapperPath, "utf-8");
    expect(content).toContain("blocked by administrator policy");
    expect(content).toContain("Docker");
  });

  it("unblocking a tool restores normal wrappers", async () => {
    const paths = await createTenant("frank", env);
    const config = await readTenantConfig(paths.configFile);
    if (!config) throw new Error("expected config to exist");

    config.disabledTools = ["aliyun"];
    await writeTenantConfig(paths.configFile, config);
    await regenerateSandbox("frank", env);

    let content = await readFile(join(paths.sandboxBin, "aliyun"), "utf-8");
    expect(content).toContain("blocked by administrator policy");

    config.disabledTools = undefined;
    await writeTenantConfig(paths.configFile, config);
    await regenerateSandbox("frank", env);

    content = await readFile(join(paths.sandboxBin, "aliyun"), "utf-8");
    expect(content).toContain("HOME isolation");
    expect(content).not.toContain("blocked");
  });
});
