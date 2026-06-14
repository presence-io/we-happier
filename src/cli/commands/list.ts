import { listTenants } from "../../tenant/manager.js";
import { tmuxSessionName } from "../../tenant/env.js";
import { tmuxSessionExists } from "../../tmux/session.js";
import chalk from "chalk";

export async function handleList(): Promise<void> {
  const tenants = await listTenants();

  if (tenants.length === 0) {
    console.log("No tenants found. Run: we-happier create <username>");
    return;
  }

  const header = [
    "Username".padEnd(20),
    "Status".padEnd(14),
    "Created".padEnd(12),
    "Last Used".padEnd(12),
    "tmux",
  ].join("  ");

  console.log(chalk.bold(header));
  console.log("-".repeat(header.length));

  for (const { username, config } of tenants) {
    const session = tmuxSessionName(username);
    let tmuxActive = false;
    try {
      tmuxActive = await tmuxSessionExists(session);
    } catch {
      // tmux not installed or session check failed
    }

    const status = config?.status ?? "unknown";
    const created = config?.createdAt
      ? new Date(config.createdAt).toLocaleDateString()
      : "-";
    const lastUsed = config?.lastUsedAt
      ? new Date(config.lastUsedAt).toLocaleDateString()
      : "-";
    const tmuxLabel = tmuxActive ? chalk.green("active") : chalk.dim("--");

    const statusLabel =
      status === "active"
        ? chalk.green(status)
        : status === "pending_auth"
          ? chalk.yellow(status)
          : chalk.dim(status);

    console.log(
      [
        username.padEnd(20),
        statusLabel.padEnd(14 + (statusLabel.length - status.length)),
        created.padEnd(12),
        lastUsed.padEnd(12),
        tmuxLabel,
      ].join("  "),
    );
  }
}
