"use client";

export type PublicCaseAccess = {
  caseId: string;
  workflowJobId: string;
  savedAt: string;
};

const PUBLIC_CASE_ACCESS_STORAGE_KEY = "safetycare.publicCaseAccess";

export function savePublicCaseAccess(caseId: string, workflowJobId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: PublicCaseAccess = {
    caseId,
    workflowJobId,
    savedAt: new Date().toISOString()
  };

  window.localStorage.setItem(PUBLIC_CASE_ACCESS_STORAGE_KEY, JSON.stringify(payload));
}

export function loadPublicCaseAccess(): PublicCaseAccess | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(PUBLIC_CASE_ACCESS_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PublicCaseAccess>;

    if (
      typeof parsed.caseId !== "string" ||
      typeof parsed.workflowJobId !== "string" ||
      typeof parsed.savedAt !== "string"
    ) {
      return null;
    }

    return {
      caseId: parsed.caseId,
      workflowJobId: parsed.workflowJobId,
      savedAt: parsed.savedAt
    };
  } catch {
    return null;
  }
}

export function clearPublicCaseAccess() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(PUBLIC_CASE_ACCESS_STORAGE_KEY);
}
