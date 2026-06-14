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
    id: "aliyun",
    name: "Aliyun CLI",
    binaries: ["aliyun"],
    tier: "home_wrapper",
    homeConfigPaths: [".aliyun/"],
    enabledByDefault: true,
  },
  {
    id: "disabled-tool",
    name: "Disabled",
    binaries: ["dtool"],
    tier: "env_var",
    enabledByDefault: false,
  },
];

describe("SandboxRegistry", () => {
  const registry = new SandboxRegistry(ENTRIES);

  describe("isWhitelisted", () => {
    it("returns true for known binaries", () => {
      expect(registry.isWhitelisted("aws")).toBe(true);
      expect(registry.isWhitelisted("aliyun")).toBe(true);
      expect(registry.isWhitelisted("dtool")).toBe(true);
    });

    it("returns false for unknown binaries", () => {
      expect(registry.isWhitelisted("curl")).toBe(false);
      expect(registry.isWhitelisted("")).toBe(false);
    });
  });

  describe("getEntryForBinary", () => {
    it("returns the correct entry", () => {
      const entry = registry.getEntryForBinary("aws");
      expect(entry?.id).toBe("aws");
      expect(entry?.name).toBe("AWS CLI");
    });

    it("returns undefined for unknown binary", () => {
      expect(registry.getEntryForBinary("unknown")).toBeUndefined();
    });
  });

  describe("getById", () => {
    it("returns entry by id", () => {
      expect(registry.getById("aliyun")?.name).toBe("Aliyun CLI");
    });

    it("returns undefined for unknown id", () => {
      expect(registry.getById("nope")).toBeUndefined();
    });
  });

  describe("getEnabledEntries", () => {
    it("returns only enabled entries", () => {
      const enabled = registry.getEnabledEntries();
      expect(enabled).toHaveLength(2);
      expect(enabled.map((e) => e.id)).toEqual(["aws", "aliyun"]);
    });
  });

  describe("getAllEntries", () => {
    it("returns all entries including disabled", () => {
      expect(registry.getAllEntries()).toHaveLength(3);
    });
  });
});
