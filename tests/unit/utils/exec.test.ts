import { describe, expect, it } from "vitest";

import { exec } from "@/utils/exec";

describe("exec", () => {
  it("returns exitCode 0 for successful commands", async () => {
    const result = await exec("true", []);
    expect(result.exitCode).toBe(0);
  });

  it("returns non-zero exitCode for failed commands", async () => {
    const result = await exec("false", []);
    expect(result.exitCode).toBe(1);
  });

  it("returns the exact exit code", async () => {
    const result = await exec("sh", ["-c", "exit 42"]);
    expect(result.exitCode).toBe(42);
  });

  it("returns 127 for commands that do not exist", async () => {
    const result = await exec("nonexistent-command-xyz", []);
    expect(result.exitCode).toBe(127);
  });

  it("captures stdout", async () => {
    const result = await exec("echo", ["hello"]);
    expect(result.stdout.trim()).toBe("hello");
    expect(result.exitCode).toBe(0);
  });

  it("captures stderr", async () => {
    const result = await exec("sh", ["-c", "echo oops >&2; exit 1"]);
    expect(result.stderr.trim()).toBe("oops");
    expect(result.exitCode).toBe(1);
  });
});
