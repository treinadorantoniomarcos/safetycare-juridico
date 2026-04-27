function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getDatabaseUrl() {
  return requireEnv("DATABASE_URL");
}

function readOptionalEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function getOperationsApiKey() {
  return readOptionalEnv("OPERATIONS_API_KEY");
}

export function getOperationsNotifyWebhookUrl() {
  return readOptionalEnv("OPERATIONS_NOTIFY_WEBHOOK_URL");
}
