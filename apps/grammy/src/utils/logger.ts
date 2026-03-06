import pino from "pino";
import type { DestinationStream } from "pino";

export type Logger = pino.Logger;

/**
 * Create a structured logger using pino.
 * JSON output in production, pino-pretty in development.
 *
 * @param level   - Minimum log level for stdout (e.g. "debug", "info")
 * @param extras  - Optional additional pino destination streams (e.g. DB transport).
 *                  Each stream receives ALL levels >= its own threshold;
 *                  the DB transport self-filters at INFO.
 */
export function createLogger(level: string, extras: DestinationStream[] = []): Logger {
  const isProduction = process.env["NODE_ENV"] === "production";

  const stdoutStream: pino.StreamEntry = {
    stream: isProduction
      ? process.stdout
      : pino.transport({
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        }),
    level: level as pino.Level,
  };

  if (extras.length === 0) {
    // Fast path — no multistream overhead when there are no extra destinations
    return pino({ level }, stdoutStream.stream);
  }

  const streams: pino.StreamEntry[] = [
    stdoutStream,
    ...extras.map((s) => ({ stream: s, level: "info" as const })),
  ];

  return pino({ level }, pino.multistream(streams));
}
