import { existsSync } from "node:fs";
import { mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SandboxRegistry, type ToolSandboxEntry } from "@/sandbox/registry.js";
import { injectSkills } from "@/skills/injector.js";

const ENTRIES: ToolSandboxEntry[] = [
  {
    id: "aws",
    name: "AWS CLI",
    binaries: ["aws"],
    tier: "env_var",
    envOverrides: { AWS_CONFIG_FILE: "{sandboxDir}/aws/config" },
    enabledByDefault: true,
  },
];

describe("injectSkills", () => {
  let skillsDir: string;

  beforeEach(async () => {
    skillsDir = join(tmpdir(), `we-happier-skills-test-${Date.now()}`);
    await mkdir(skillsDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(skillsDir, { recursive: true, force: true });
  });

  it("creates spawn skill directory with SKILL.md", async () => {
    const registry = new SandboxRegistry(ENTRIES);
    await injectSkills(skillsDir, registry);

    const skillPath = join(skillsDir, "we-happier-spawn", "SKILL.md");
    expect(existsSync(skillPath)).toBe(true);

    const content = await readFile(skillPath, "utf-8");
    expect(content).toContain("name: we-happier-spawn");
    expect(content).toContain("we-happier --");
  });

  it("creates guard skill directory with SKILL.md", async () => {
    const registry = new SandboxRegistry(ENTRIES);
    await injectSkills(skillsDir, registry);

    const skillPath = join(skillsDir, "we-happier-sandbox-guard", "SKILL.md");
    expect(existsSync(skillPath)).toBe(true);

    const content = await readFile(skillPath, "utf-8");
    expect(content).toContain("name: we-happier-sandbox-guard");
    expect(content).toContain("CRITICAL RULES");
  });

  it("generates WHITELIST.md from registry", async () => {
    const registry = new SandboxRegistry(ENTRIES);
    await injectSkills(skillsDir, registry);

    const whitelistPath = join(
      skillsDir,
      "we-happier-sandbox-guard",
      "WHITELIST.md",
    );
    expect(existsSync(whitelistPath)).toBe(true);

    const content = await readFile(whitelistPath, "utf-8");
    expect(content).toContain("AWS CLI");
    expect(content).toContain("aws");
    expect(content).toContain("env_var");
  });

  it("does not depend on filesystem template files", async () => {
    const registry = new SandboxRegistry(ENTRIES);
    await injectSkills(skillsDir, registry);

    const spawnContent = await readFile(
      join(skillsDir, "we-happier-spawn", "SKILL.md"),
      "utf-8",
    );
    expect(spawnContent.length).toBeGreaterThan(100);
  });

  it("guard skill lists tools dynamically from registry", async () => {
    const registry = new SandboxRegistry(ENTRIES);
    await injectSkills(skillsDir, registry);

    const content = await readFile(
      join(skillsDir, "we-happier-sandbox-guard", "SKILL.md"),
      "utf-8",
    );
    expect(content).toContain("AWS CLI");
    expect(content).toContain("Tier 1");
  });

  it("guard skill shows blocked tools when policy is applied", async () => {
    const entries: ToolSandboxEntry[] = [
      ...ENTRIES,
      {
        id: "docker",
        name: "Docker",
        binaries: ["docker"],
        tier: "env_var",
        envOverrides: { DOCKER_CONFIG: "{sandboxDir}/docker" },
        enabledByDefault: true,
      },
    ];
    const registry = new SandboxRegistry(entries).withPolicy(["docker"]);
    await injectSkills(skillsDir, registry);

    const content = await readFile(
      join(skillsDir, "we-happier-sandbox-guard", "SKILL.md"),
      "utf-8",
    );
    expect(content).toContain("Blocked tools");
    expect(content).toContain("Docker");
    expect(content).toContain("administrator policy");
    expect(content).toContain("full paths");
  });

  it("guard skill omits blocked section when no tools are blocked", async () => {
    const registry = new SandboxRegistry(ENTRIES);
    await injectSkills(skillsDir, registry);

    const content = await readFile(
      join(skillsDir, "we-happier-sandbox-guard", "SKILL.md"),
      "utf-8",
    );
    expect(content).not.toContain("Blocked tools");
  });
});
