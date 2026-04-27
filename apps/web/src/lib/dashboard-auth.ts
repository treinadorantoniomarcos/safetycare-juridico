import { createHmac, timingSafeEqual } from "node:crypto";

export const dashboardSessionCookieName = "safetycare_dashboard_session";
export const dashboardSessionTtlSeconds = 60 * 60 * 8;

type CookieReader = {
  get: (name: string) => { value?: string } | undefined;
};

function readOptionalEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function getDashboardAuthUser() {
  return readOptionalEnv("DASHBOARD_AUTH_USER");
}

function getDashboardAuthPassword() {
  return readOptionalEnv("DASHBOARD_AUTH_PASSWORD");
}

function getDashboardAuthSecret() {
  return readOptionalEnv("DASHBOARD_AUTH_SECRET") ?? readOptionalEnv("OPERATIONS_API_KEY");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function signDashboardPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function readCookieValue(cookieHeader: string | null, cookieName: string) {
  if (!cookieHeader) {
    return undefined;
  }

  const entries = cookieHeader.split(";");

  for (const entry of entries) {
    const [name, ...valueParts] = entry.trim().split("=");

    if (name !== cookieName) {
      continue;
    }

    return valueParts.join("=");
  }

  return undefined;
}

export function isDashboardAuthConfigured() {
  return Boolean(getDashboardAuthUser() && getDashboardAuthPassword() && getDashboardAuthSecret());
}

export function validateDashboardCredentials(username: string, password: string) {
  const configuredUser = getDashboardAuthUser();
  const configuredPassword = getDashboardAuthPassword();

  if (!configuredUser || !configuredPassword) {
    return false;
  }

  return safeEqual(username, configuredUser) && safeEqual(password, configuredPassword);
}

export function createDashboardSessionToken(now: number = Date.now()) {
  const secret = getDashboardAuthSecret();

  if (!secret) {
    return undefined;
  }

  const payload = Buffer.from(
    JSON.stringify({
      exp: now + dashboardSessionTtlSeconds * 1000
    }),
    "utf8"
  ).toString("base64url");
  const signature = signDashboardPayload(payload, secret);

  return `${payload}.${signature}`;
}

export function verifyDashboardSessionToken(token: string | undefined, now: number = Date.now()) {
  if (!token) {
    return false;
  }

  const secret = getDashboardAuthSecret();

  if (!secret) {
    return false;
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    return false;
  }

  const [payload, providedSignature] = parts;
  const expectedSignature = signDashboardPayload(payload, secret);

  if (!safeEqual(providedSignature, expectedSignature)) {
    return false;
  }

  try {
    const decoded = Buffer.from(payload, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as { exp?: number };

    if (typeof parsed.exp !== "number") {
      return false;
    }

    return parsed.exp > now;
  } catch {
    return false;
  }
}

export function hasDashboardSessionFromRequest(request: Request) {
  const token = readCookieValue(request.headers.get("cookie"), dashboardSessionCookieName);
  return verifyDashboardSessionToken(token);
}

export function hasDashboardSessionFromCookieStore(cookieStore: CookieReader) {
  const token = cookieStore.get(dashboardSessionCookieName)?.value;
  return verifyDashboardSessionToken(token);
}

