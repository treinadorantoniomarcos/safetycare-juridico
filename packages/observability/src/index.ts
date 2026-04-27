type LogLevel = "info" | "warn" | "error";

type LogRecord = {
  scope: string;
  level: LogLevel;
  message: string;
};

export function createLogger(scope: string) {
  return {
    info(message: string) {
      writeLog({ scope, level: "info", message });
    },
    warn(message: string) {
      writeLog({ scope, level: "warn", message });
    },
    error(message: string) {
      writeLog({ scope, level: "error", message });
    }
  };
}

function writeLog(record: LogRecord) {
  const line = JSON.stringify(record);
  process.stdout.write(`${line}\n`);
}
