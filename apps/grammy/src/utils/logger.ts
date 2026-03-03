import pino from "pino";

export type Logger = pino.Logger;

/**
 * Create a structured logger using pino.
 * JSON output in production, pino-pretty in development.
 */
export function createLogger(level: string): Logger {
  const isProduction = process.env.NODE_ENV === "production";

  return pino({
    level,
    ...(isProduction
      ? {}
      : {
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss",
              ignore: "pid,hostname",
            },
          },
        }),
  });
}
