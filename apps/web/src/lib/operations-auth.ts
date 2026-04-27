import { getOperationsApiKey } from "../config/env";

export function hasOperationsAccess(request: Request) {
  const configuredApiKey = getOperationsApiKey();

  if (!configuredApiKey) {
    return process.env.NODE_ENV === "test";
  }

  const providedApiKey = request.headers.get("x-ops-api-key");
  return providedApiKey === configuredApiKey;
}
