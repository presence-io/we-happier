import { deleteTenant } from "../../tenant/manager.js";
import { tmuxSessionName } from "../../tenant/env.js";
import { killTmuxSession, tmuxSessionExists } from "../../tmux/session.js";
import { log } from "../../utils/logger.js";

export async function handleDelete(username: string): Promise<void> {
  const session = tmuxSessionName(username);

  if (await tmuxSessionExists(session)) {
    log.info(`Killing tmux session "${session}"...`);
    await killTmuxSession(session);
  }

  await deleteTenant(username);
}
