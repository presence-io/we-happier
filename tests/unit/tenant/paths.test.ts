import { describe, it, expect } from "vitest";
import { validateUsername, resolveTenantPaths } from "@/tenant/paths.js";

describe("validateUsername", () => {
  it("accepts valid lowercase usernames", () => {
    expect(validateUsername("alice")).toBeNull();
    expect(validateUsername("bob-dev")).toBeNull();
    expect(validateUsername("user_01")).toBeNull();
    expect(validateUsername("ab")).toBeNull();
  });

  it("rejects single-character names", () => {
    expect(validateUsername("a")).not.toBeNull();
  });

  it("rejects names longer than 32 characters", () => {
    expect(validateUsername("a".repeat(33))).not.toBeNull();
  });

  it("accepts names exactly 32 characters", () => {
    expect(validateUsername("a".repeat(32))).toBeNull();
  });

  it("rejects names starting with hyphen or underscore", () => {
    expect(validateUsername("-alice")).not.toBeNull();
    expect(validateUsername("_alice")).not.toBeNull();
  });

  it("rejects names ending with hyphen or underscore", () => {
    expect(validateUsername("alice-")).not.toBeNull();
    expect(validateUsername("alice_")).not.toBeNull();
  });

  it("rejects uppercase characters", () => {
    expect(validateUsername("Alice")).not.toBeNull();
  });

  it("rejects special characters", () => {
    expect(validateUsername("ali.ce")).not.toBeNull();
    expect(validateUsername("ali ce")).not.toBeNull();
    expect(validateUsername("ali@ce")).not.toBeNull();
  });
});

describe("resolveTenantPaths", () => {
  it("resolves all paths under the tenant root", () => {
    const paths = resolveTenantPaths("/home/.we-happier/tenants", "alice");

    expect(paths.root).toBe("/home/.we-happier/tenants/alice");
    expect(paths.configFile).toBe("/home/.we-happier/tenants/alice/tenant.json");
    expect(paths.happierHome).toBe("/home/.we-happier/tenants/alice/happier");
    expect(paths.sandboxDir).toBe("/home/.we-happier/tenants/alice/sandbox");
    expect(paths.sandboxBin).toBe("/home/.we-happier/tenants/alice/sandbox/bin");
    expect(paths.homeOverlay).toBe("/home/.we-happier/tenants/alice/sandbox/home-overlay");
    expect(paths.skillsDir).toBe("/home/.we-happier/tenants/alice/skills");
  });
});
