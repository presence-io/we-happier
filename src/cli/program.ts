import { Command } from "commander";
import { handleCreate } from "./commands/create.js";
import { handleDelete } from "./commands/delete.js";
import { handleRun } from "./commands/run.js";
import { handleSpawn } from "./commands/spawn.js";
import { handleList } from "./commands/list.js";
import { handleStatus } from "./commands/status.js";
import { handlePolicyDeny, handlePolicyAllow, handlePolicyList } from "./commands/policy.js";
import { log } from "../utils/logger.js";

function wrap<T extends unknown[]>(fn: (...args: T) => Promise<void>) {
  return (...args: T): void => {
    fn(...args).catch((err: unknown) => {
      log.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
  };
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name("we-happier")
    .description("Multi-tenant happier CLI with credential isolation")
    .version("0.1.0");

  program
    .command("create")
    .argument("<username>", "Tenant username (lowercase alphanumeric, 2-32 chars)")
    .description("Create a new tenant and authenticate with happier")
    .action(wrap((username: string) => handleCreate(username)));

  program
    .command("delete")
    .argument("<username>", "Tenant username to delete")
    .option("-f, --force", "Skip confirmation prompt")
    .description("Delete a tenant and all its data")
    .action(
      wrap((username: string, options: { force?: boolean }) =>
        handleDelete(username, options),
      ),
    );

  program
    .command("run")
    .argument("<username>", "Tenant username")
    .argument("[happier-args...]", "Arguments to pass to happier")
    .description("Launch happier in an isolated tmux session for a tenant")
    .action(
      wrap((username: string, happierArgs: string[]) =>
        handleRun(username, happierArgs),
      ),
    );

  program
    .command("spawn")
    .argument("[happier-args...]", "Arguments to pass to happier")
    .description("Spawn a new happier window in the current tenant tmux session")
    .action(wrap((happierArgs: string[]) => handleSpawn(happierArgs)));

  program
    .command("list")
    .description("List all tenants")
    .action(wrap(() => handleList()));

  program
    .command("status")
    .argument("<username>", "Tenant username")
    .description("Show detailed status for a tenant")
    .action(wrap((username: string) => handleStatus(username)));

  const policy = program
    .command("policy")
    .argument("<username>", "Tenant username")
    .description("Manage per-tenant tool access policy");

  policy
    .command("deny")
    .argument("<tool-id>", "Tool id to block (e.g. aws, docker, gh)")
    .description("Block a tool for a tenant")
    .action(
      wrap((toolId: string, _opts: unknown, cmd: Command) => {
        const username = cmd.parent?.args[0];
        if (!username) throw new Error("Missing username");
        return handlePolicyDeny(username, toolId);
      }),
    );

  policy
    .command("allow")
    .argument("<tool-id>", "Tool id to unblock")
    .description("Unblock a previously blocked tool for a tenant")
    .action(
      wrap((toolId: string, _opts: unknown, cmd: Command) => {
        const username = cmd.parent?.args[0];
        if (!username) throw new Error("Missing username");
        return handlePolicyAllow(username, toolId);
      }),
    );

  policy
    .command("list")
    .description("Show current policy for a tenant")
    .action(
      wrap((_opts: unknown, cmd: Command) => {
        const username = cmd.parent?.args[0];
        if (!username) throw new Error("Missing username");
        return handlePolicyList(username);
      }),
    );

  return program;
}
