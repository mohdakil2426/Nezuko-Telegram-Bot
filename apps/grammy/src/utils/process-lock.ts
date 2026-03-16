import { mkdir, open, readFile, rm } from "node:fs/promises";
import { unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Logger } from "./logger.js";

export interface ProcessLockHandle {
  release(): Promise<void>;
}

function sanitizeLockName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isPidRunning(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function acquireProcessLock(
  name: string,
  logger?: Logger
): Promise<ProcessLockHandle> {
  const lockDir = join(tmpdir(), "nezuko-grammy-locks");
  await mkdir(lockDir, { recursive: true });

  const lockPath = join(lockDir, `${sanitizeLockName(name)}.lock`);

  for (;;) {
    try {
      const handle = await open(lockPath, "wx");
      const payload = JSON.stringify(
        {
          pid: process.pid,
          startedAt: new Date().toISOString(),
          cwd: process.cwd(),
        },
        null,
        2
      );
      await handle.writeFile(payload, "utf8");
      await handle.close();

      let released = false;
      const cleanupSync = () => {
        if (released) return;
        released = true;
        try {
          unlinkSync(lockPath);
        } catch {
          // ignore
        }
      };

      process.once("exit", cleanupSync);

      return {
        async release() {
          if (released) return;
          released = true;
          process.off("exit", cleanupSync);
          await rm(lockPath, { force: true }).catch(() => {});
        },
      };
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException | undefined)?.code;
      if (code !== "EEXIST") {
        throw err;
      }

      let existingPid: number | null;
      try {
        const raw = await readFile(lockPath, "utf8");
        const parsed = JSON.parse(raw) as { pid?: unknown };
        existingPid =
          typeof parsed.pid === "number" && Number.isInteger(parsed.pid) ? parsed.pid : null;
      } catch {
        existingPid = null;
      }

      if (existingPid !== null && !isPidRunning(existingPid)) {
        logger?.warn({ lockPath, pid: existingPid }, "Removing stale process lock");
        await rm(lockPath, { force: true }).catch(() => {});
        continue;
      }

      throw new Error(
        `Another Nezuko bot process is already running for "${name}"` +
          (existingPid ? ` (pid ${existingPid})` : ""),
        { cause: err }
      );
    }
  }
}
