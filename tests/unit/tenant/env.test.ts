import { describe, it, expect } from "vitest";
import { buildTenantEnv, buildTenantPath, tmuxSessionName } from "@/tenant/env.js";
import { SandboxRegistry } from "@/sandbox/registry.js";
import type { TenantPaths } from "@/tenant/paths.js";

function makePaths(root: string): TenantPaths {
  return {
    root,
    configFile: `${root}/tenant.json`,
    happierHome: `${root}/happier`,
    sandboxDir: `${root}/sandbox`,
    sandboxBin: `${root}/sandbox/bin`,
    homeOverlay: `${root}/sandbox/home-overlay`,
    skillsDir: `${root}/skills`,
  };
}

describe("buildTenantEnv", () => {
  it("sets HAPPIER_HOME_DIR and tenant markers", () => {
    const registry = new SandboxRegistry([]);
    const paths = makePaths("/tmp/tenants/alice");

    const env = buildTenantEnv({
      paths,
      registry,
      username: "alice",
      tmuxSession: "we-happier-alice",
    });

    expect(env.HAPPIER_HOME_DIR).toBe("/tmp/tenants/alice/happier");
    expect(env.WE_HAPPIER_TENANT).toBe("alice");
    expect(env.WE_HAPPIER_TMUX_SESSION).toBe("we-happier-alice");
  });

  it("includes sandbox env overrides from Tier 1 entries", () => {
    const registry = new SandboxRegistry([
      {
        id: "aws",
        name: "AWS CLI",
        binaries: ["aws"],
        tier: "env_var",
        envOverrides: {
          AWS_CONFIG_FILE: "{sandboxDir}/aws/config",
        },
        enabledByDefault: true,
      },
    ]);
    const paths = makePaths("/tmp/tenants/bob");

    const env = buildTenantEnv({
      paths,
      registry,
      username: "bob",
      tmuxSession: "we-happier-bob",
    });

    expect(env.AWS_CONFIG_FILE).toBe("/tmp/tenants/bob/sandbox/aws/config");
  });

  it("excludes disabled entries", () => {
    const registry = new SandboxRegistry([
      {
        id: "aws",
        name: "AWS CLI",
        binaries: ["aws"],
        tier: "env_var",
        envOverrides: { AWS_CONFIG_FILE: "{sandboxDir}/aws/config" },
        enabledByDefault: false,
      },
    ]);
    const paths = makePaths("/tmp/tenants/bob");

    const env = buildTenantEnv({
      paths,
      registry,
      username: "bob",
      tmuxSession: "we-happier-bob",
    });

    expect(env.AWS_CONFIG_FILE).toBeUndefined();
  });
});

describe("buildTenantPath", () => {
  it("prepends sandbox bin to existing PATH", () => {
    const paths = makePaths("/tmp/tenants/alice");
    const result = buildTenantPath(paths, "/usr/bin:/usr/local/bin");
    expect(result).toBe("/tmp/tenants/alice/sandbox/bin:/usr/bin:/usr/local/bin");
  });
});

describe("tmuxSessionName", () => {
  it("returns we-happier-<username>", () => {
    expect(tmuxSessionName("alice")).toBe("we-happier-alice");
    expect(tmuxSessionName("bob-dev")).toBe("we-happier-bob-dev");
  });
});
