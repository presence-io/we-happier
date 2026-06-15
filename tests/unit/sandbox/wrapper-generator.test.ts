import { mkdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { ToolSandboxEntry } from "@/sandbox/registry.js";
import { generateWrappers } from "@/sandbox/wrapper-generator.js";

const ENTRIES: ToolSandboxEntry[] = [
  {
    id: "aliyun",
    name: "Aliyun CLI",
    binaries: ["aliyun"],
    tier: "home_wrapper",
    homeConfigPaths: [".aliyun/"],
    enabledByDefault: true,
  },
  {
    id: "lark",
    name: "Lark CLI",
    binaries: ["lark-cli"],
    tier: "home_wrapper",
    homeConfigPaths: [".lark-cli/"],
    enabledByDefault: true,
  },
  {
    id: "aws",
    name: "AWS CLI",
    binaries: ["aws"],
    tier: "env_var",
    envOverrides: { AWS_CONFIG_FILE: "{sandboxDir}/aws/config" },
    enabledByDefault: true,
  },
  {
    id: "disabled-wrapper",
    name: "Disabled Wrapper",
    binaries: ["dw"],
    tier: "home_wrapper",
    homeConfigPaths: [".dw/"],
    enabledByDefault: false,
  },
];

describe("generateWrappers", () => {
  let sandboxDir: string;

  beforeEach(async () => {
    sandboxDir = join(tmpdir(), `we-happier-test-wrappers-${Date.now()}`);
    await mkdir(join(sandboxDir, "bin"), { recursive: true });
    await mkdir(join(sandboxDir, "home-overlay"), { recursive: true });
  });

  afterEach(async () => {
    await rm(sandboxDir, { recursive: true, force: true });
  });

  it("generates wrapper scripts for home_wrapper entries only", async () => {
    const generated = await generateWrappers(ENTRIES, sandboxDir);
    const names = generated.map((p) => p.split("/").pop());
    expect(names).toContain("aliyun");
    expect(names).toContain("lark-cli");
    expect(names).not.toContain("aws");
  });

  it("skips disabled entries", async () => {
    const generated = await generateWrappers(ENTRIES, sandboxDir);
    const names = generated.map((p) => p.split("/").pop());
    expect(names).not.toContain("dw");
  });

  it("sets the wrapper as executable", async () => {
    await generateWrappers(ENTRIES, sandboxDir);
    const wrapperPath = join(sandboxDir, "bin", "aliyun");
    const s = await stat(wrapperPath);
    expect(s.mode & 0o111).toBeGreaterThan(0);
  });

  it("generates correct shell script content", async () => {
    await generateWrappers(ENTRIES, sandboxDir);
    const content = await readFile(join(sandboxDir, "bin", "aliyun"), "utf-8");
    expect(content).toContain("#!/bin/sh");
    expect(content).toContain('command -v "aliyun"');
    expect(content).toContain(
      `export HOME="${join(sandboxDir, "home-overlay")}"`,
    );
    expect(content).toContain('exec "$real_bin" "$@"');
  });
});
