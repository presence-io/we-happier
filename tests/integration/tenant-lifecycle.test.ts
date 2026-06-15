import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readTenantConfig } from "@/tenant/config.js";
import {
  activateTenant,
  createTenant,
  deleteTenant,
  listTenants,
} from "@/tenant/manager.js";

describe("tenant lifecycle", () => {
  let tempDir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `we-happier-lifecycle-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    env = { WE_HAPPIER_HOME: tempDir };
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("creates a tenant with expected directory structure", async () => {
    const paths = await createTenant("alice", env);

    expect(existsSync(paths.root)).toBe(true);
    expect(existsSync(paths.happierHome)).toBe(true);
    expect(existsSync(paths.sandboxDir)).toBe(true);
    expect(existsSync(paths.sandboxBin)).toBe(true);
    expect(existsSync(paths.homeOverlay)).toBe(true);
    expect(existsSync(paths.skillsDir)).toBe(true);
  });

  it("writes tenant.json with pending_auth status", async () => {
    const paths = await createTenant("bob", env);
    const config = await readTenantConfig(paths.configFile);

    expect(config).not.toBeNull();
    expect(config?.username).toBe("bob");
    expect(config?.status).toBe("pending_auth");
    expect(config?.createdAt).toBeDefined();
  });

  it("rejects duplicate tenant creation", async () => {
    await createTenant("alice", env);
    await expect(createTenant("alice", env)).rejects.toThrow("already exists");
  });

  it("rejects invalid usernames", async () => {
    await expect(createTenant("A", env)).rejects.toThrow();
    await expect(createTenant("-bad", env)).rejects.toThrow();
  });

  it("activates a tenant", async () => {
    const paths = await createTenant("charlie", env);
    await activateTenant("charlie", env);

    const config = await readTenantConfig(paths.configFile);
    expect(config?.status).toBe("active");
    expect(config?.lastUsedAt).toBeDefined();
  });

  it("deletes a tenant and removes all files", async () => {
    const paths = await createTenant("dave", env);
    expect(existsSync(paths.root)).toBe(true);

    await deleteTenant("dave", env);
    expect(existsSync(paths.root)).toBe(false);
  });

  it("rejects deleting nonexistent tenant", async () => {
    await expect(deleteTenant("ghost", env)).rejects.toThrow("does not exist");
  });

  it("lists all tenants", async () => {
    await createTenant("alice", env);
    await createTenant("bob", env);

    const tenants = await listTenants(env);
    const usernames = tenants.map((t) => t.username).sort();
    expect(usernames).toEqual(["alice", "bob"]);
  });

  it("returns empty list when no tenants exist", async () => {
    const tenants = await listTenants(env);
    expect(tenants).toEqual([]);
  });

  it("generates wrapper scripts in sandbox/bin", async () => {
    const paths = await createTenant("eve", env);
    expect(existsSync(join(paths.sandboxBin, "aliyun"))).toBe(true);
  });

  it("injects skill files", async () => {
    const paths = await createTenant("frank", env);
    const spawnSkill = join(paths.skillsDir, "we-happier-spawn", "SKILL.md");
    const guardSkill = join(
      paths.skillsDir,
      "we-happier-sandbox-guard",
      "SKILL.md",
    );
    expect(existsSync(spawnSkill)).toBe(true);
    expect(existsSync(guardSkill)).toBe(true);
  });
});
