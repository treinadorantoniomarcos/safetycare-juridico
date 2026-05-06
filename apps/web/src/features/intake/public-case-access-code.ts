export type PublicCaseAccessCodePayload = {
  caseId: string;
  workflowJobId: string;
  accessCode: string;
};

const PUBLIC_CASE_ACCESS_CODE_PREFIX = "SC1.";

function encodeBase64Url(value: string) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf8").toString("base64url");
  }

  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "base64url").toString("utf8");
  }

  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  const padded = `${normalized}${"=".repeat(paddingLength)}`;
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

export function createPublicCaseAccessCode(caseId: string, workflowJobId: string) {
  return `${PUBLIC_CASE_ACCESS_CODE_PREFIX}${encodeBase64Url(`${caseId}|${workflowJobId}`)}`;
}

export function parsePublicCaseAccessCode(code?: string | null): PublicCaseAccessCodePayload | null {
  if (!code) {
    return null;
  }

  const normalized = code.trim();

  if (!normalized) {
    return null;
  }

  const encoded = normalized.startsWith(PUBLIC_CASE_ACCESS_CODE_PREFIX)
    ? normalized.slice(PUBLIC_CASE_ACCESS_CODE_PREFIX.length)
    : normalized;

  try {
    const decoded = decodeBase64Url(encoded);
    const [caseId, workflowJobId, ...extraParts] = decoded.split("|");

    if (!caseId || !workflowJobId || extraParts.length > 0) {
      return null;
    }

    return {
      caseId,
      workflowJobId,
      accessCode: normalized.startsWith(PUBLIC_CASE_ACCESS_CODE_PREFIX)
        ? normalized
        : `${PUBLIC_CASE_ACCESS_CODE_PREFIX}${encoded}`
    };
  } catch {
    return null;
  }
}

export function buildPublicCaseCompletionHref(accessCode: string) {
  const query = new URLSearchParams({
    accessCode
  });

  return `/completar-caso?${query.toString()}`;
}

export function buildPublicCaseResumeHref(accessCode: string) {
  const query = new URLSearchParams({
    accessCode
  });

  return `/retomar-caso?${query.toString()}`;
}
