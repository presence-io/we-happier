import { mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  buildTenantEnv,
  buildTenantPath,
  tmuxSessionName,
} from "@/tenant/env.js";
import { createTenant, getRegistry } from "@/tenant/manager.js";

describe("sandbox isolation", () => {
  let tempDir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `we-happier-sandbox-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    env = { WE_HAPPIER_HOME: tempDir };
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("tenant env points all tools to isolated sandbox dirs", async () => {
    const paths = await createTenant("alice", env);
    const registry = getRegistry();
    const session = tmuxSessionName("alice");
    const tenantEnv = buildTenantEnv({
      paths,
      registry,
      username: "alice",
      tmuxSession: session,
    });

    expect(tenantEnv.HAPPIER_HOME_DIR).toBe(paths.happierHome);
    expect(tenantEnv.AWS_CONFIG_FILE).toContain(paths.sandboxDir);
    expect(tenantEnv.GH_CONFIG_DIR).toContain(paths.sandboxDir);
    expect(tenantEnv.DOCKER_CONFIG).toContain(paths.sandboxDir);
    expect(tenantEnv.KUBECONFIG).toContain(paths.sandboxDir);
    expect(tenantEnv.CLOUDSDK_CONFIG).toContain(paths.sandboxDir);
  });

  it("two tenants get completely separate sandbox paths", async () => {
    const paths1 = await createTenant("alice", env);
    const paths2 = await createTenant("bob", env);

    const registry = getRegistry();
    const env1 = buildTenantEnv({
      paths: paths1,
      registry,
      username: "alice",
      tmuxSession: "we-happier-alice",
    });
    const env2 = buildTenantEnv({
      paths: paths2,
      registry,
      username: "bob",
      tmuxSession: "we-happier-bob",
    });

    expect(env1.HAPPIER_HOME_DIR).not.toBe(env2.HAPPIER_HOME_DIR);
    expect(env1.AWS_CONFIG_FILE).not.toBe(env2.AWS_CONFIG_FILE);
    expect(env1.GH_CONFIG_DIR).not.toBe(env2.GH_CONFIG_DIR);
    expect(env1.WE_HAPPIER_TENANT).toBe("alice");
    expect(env2.WE_HAPPIER_TENANT).toBe("bob");
  });

  it("PATH prepends sandbox bin for Tier 2 wrapper resolution", async () => {
    const paths = await createTenant("charlie", env);
    const result = buildTenantPath(paths, "/usr/bin:/usr/local/bin");

    expect(result).toBe(`${paths.sandboxBin}:/usr/bin:/usr/local/bin`);
  });

  it("wrapper scripts strip themselves from PATH and set HOME", async () => {
    const paths = await createTenant("dave", env);
    const wrapperPath = join(paths.sandboxBin, "aliyun");
    const content = await readFile(wrapperPath, "utf-8");

    expect(content).toContain("#!/bin/sh");
    expect(content).toContain("grep -Fxv");
    expect(content).toContain("export HOME=");
    expect(content).toContain("home-overlay");
    expect(content).toContain('exec "$real_bin" "$@"');
  });
});
