import { tmuxSessionName } from "@/tenant/env";
import { deleteTenant } from "@/tenant/manager";
import { killTmuxSession, tmuxSessionExists } from "@/tmux/session";
import { confirm } from "@/utils/confirm";
import { log } from "@/utils/logger";

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
