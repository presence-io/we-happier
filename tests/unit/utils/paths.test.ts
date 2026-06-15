import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { resolveTenantsDir, resolveWeHappierHome } from "@/utils/paths.js";

describe("resolveWeHappierHome", () => {
  it("defaults to ~/.we-happier with no env override", () => {
    const result = resolveWeHappierHome({});
    expect(result).toBe(join(homedir(), ".we-happier"));
  });

  it("respects WE_HAPPIER_HOME absolute path", () => {
    const result = resolveWeHappierHome({ WE_HAPPIER_HOME: "/custom/path" });
    expect(result).toBe("/custom/path");
  });

  it("expands ~ in WE_HAPPIER_HOME", () => {
    const result = resolveWeHappierHome({ WE_HAPPIER_HOME: "~/my-we-happier" });
    expect(result).toBe(join(homedir(), "my-we-happier"));
  });

  it("resolves relative WE_HAPPIER_HOME against cwd", () => {
    const result = resolveWeHappierHome({ WE_HAPPIER_HOME: "relative/dir" });
    expect(result).toBe(resolve("relative/dir"));
  });

  it("trims whitespace from WE_HAPPIER_HOME", () => {
    const result = resolveWeHappierHome({ WE_HAPPIER_HOME: "  /trimmed  " });
    expect(result).toBe("/trimmed");
  });

  it("ignores empty string override", () => {
    const result = resolveWeHappierHome({ WE_HAPPIER_HOME: "   " });
    expect(result).toBe(join(homedir(), ".we-happier"));
  });
});

describe("resolveTenantsDir", () => {
  it("appends /tenants to the home dir", () => {
    const result = resolveTenantsDir({ WE_HAPPIER_HOME: "/base" });
    expect(result).toBe("/base/tenants");
  });
});
