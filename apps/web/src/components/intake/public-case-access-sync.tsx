"use client";

import { useEffect } from "react";
import { savePublicCaseAccess } from "../../features/intake/public-case-access-storage";

type PublicCaseAccessSyncProps = {
  caseId?: string;
  workflowJobId?: string;
};

export function PublicCaseAccessSync({ caseId, workflowJobId }: PublicCaseAccessSyncProps) {
  useEffect(() => {
    if (!caseId || !workflowJobId) {
      return;
    }

    savePublicCaseAccess(caseId, workflowJobId);
  }, [caseId, workflowJobId]);

  return null;
}
