import { ensureTmuxInstalled } from "../../tmux/check.js";
import { createTmuxWindowWithHappier } from "../../tmux/session.js";
import { ensureHappierInstalled } from "../../happier/check.js";
import { log } from "../../utils/logger.js";

export async function handleSpawn(
  happierArgs: readonly string[],
): Promise<void> {
  const tenant = process.env.WE_HAPPIER_TENANT?.trim();
  const session = process.env.WE_HAPPIER_TMUX_SESSION?.trim();

  if (!tenant || !session) {
    throw new Error(
      "Not inside a we-happier tenant session. Use: we-happier run <user>",
    );
  }

  await ensureTmuxInstalled();
  await ensureHappierInstalled();

  const windowName = `task-${Date.now()}`;
  const cwd = process.cwd();

  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }

  await createTmuxWindowWithHappier({
    sessionName: session,
    windowName,
    happierArgs,
    env,
    cwd,
  });

  log.success(`Spawned new window "${windowName}" in session "${session}".`);
}
