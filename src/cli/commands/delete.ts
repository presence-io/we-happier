import { deleteTenant } from "../../tenant/manager.js";
import { tmuxSessionName } from "../../tenant/env.js";
import { killTmuxSession, tmuxSessionExists } from "../../tmux/session.js";
import { confirm } from "../../utils/confirm.js";
import { log } from "../../utils/logger.js";

export async function handleDelete(
  username: string,
  options: { force?: boolean },
): Promise<void> {
  if (!options.force) {
    const yes = await confirm(
      `Delete tenant "${username}" and ALL its data (credentials, config, sandbox)?`,
    );
    if (!yes) {
      log.dim("Aborted.");
      return;
    }
  }

  const session = tmuxSessionName(username);

  if (await tmuxSessionExists(session)) {
    log.info(`Killing tmux session "${session}"...`);
    await killTmuxSession(session);
  }

  await deleteTenant(username);
}
