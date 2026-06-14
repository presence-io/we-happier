import { Command } from "commander";
import { handleCreate } from "./commands/create.js";
import { handleDelete } from "./commands/delete.js";
import { handleRun } from "./commands/run.js";
import { handleSpawn } from "./commands/spawn.js";
import { handleList } from "./commands/list.js";
import { handleStatus } from "./commands/status.js";
import { log } from "../utils/logger.js";

type ActionFn = (...args: string[]) => Promise<void>;

function wrapHandler(fn: ActionFn): ActionFn {
  return async (...args: string[]) => {
    try {
      await fn(...args);
    } catch (err) {
      log.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
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
    .action(wrapHandler((username) => handleCreate(username)));

  program
    .command("delete")
    .argument("<username>", "Tenant username to delete")
    .description("Delete a tenant and all its data")
    .action(wrapHandler((username) => handleDelete(username)));

  program
    .command("run")
    .argument("<username>", "Tenant username")
    .argument("[happier-args...]", "Arguments to pass to happier")
    .description("Launch happier in an isolated tmux session for a tenant")
    .action(wrapHandler((username, ...rest) => handleRun(username, rest)));

  program
    .command("spawn")
    .argument("[happier-args...]", "Arguments to pass to happier")
    .description("Spawn a new happier window in the current tenant tmux session")
    .action(wrapHandler((...args) => handleSpawn(args)));

  program
    .command("list")
    .description("List all tenants")
    .action(wrapHandler(() => handleList()));

  program
    .command("status")
    .argument("<username>", "Tenant username")
    .description("Show detailed status for a tenant")
    .action(wrapHandler((username) => handleStatus(username)));

  return program;
}
