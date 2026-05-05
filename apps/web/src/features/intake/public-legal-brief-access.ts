import { workflowJobTypes } from "@safetycare/ai-contracts";
import {
  CaseRepository,
  WorkflowJobRepository,
  type CaseRecord,
  type WorkflowJobRecord
} from "@safetycare/database";
import { unstable_noStore as noStore } from "next/cache";
import { getDatabaseClient } from "../../lib/database";

export type PublicLegalBriefAccessState =
  | {
      status: "ready";
    }
  | {
      status: "processing";
      message: string;
    }
  | {
      status: "missing_params";
      message: string;
    }
  | {
      status: "invalid_case_access";
      message: string;
    }
  | {
      status: "case_not_found";
      message: string;
    }
  | {
      status: "case_closed";
      message: string;
    }
  | {
      status: "database_unavailable";
      message: string;
    };

function isValidPublicCaseAccessToken(
  caseId: string,
  workflowJob: Pick<WorkflowJobRecord, "caseId" | "jobType">
) {
  return workflowJob.caseId === caseId && workflowJob.jobType === workflowJobTypes[0];
}

function isBriefLocked(legalStatus: string) {
  return legalStatus === "human_triage_pending" || legalStatus === "awaiting_consent";
}

function isBriefClosed(caseRecord: Pick<CaseRecord, "commercialStatus" | "legalStatus">) {
  return caseRecord.commercialStatus === "closed_lost" || caseRecord.legalStatus === "closed_lost";
}

export async function resolvePublicLegalBriefAccess(
  caseId?: string,
  workflowJobId?: string
): Promise<PublicLegalBriefAccessState> {
  noStore();

  if (!caseId || !workflowJobId) {
    return {
      status: "missing_params",
      message: "A próxima etapa será liberada após a validação humana."
    };
  }

  try {
    const { db } = getDatabaseClient();
    const cases = new CaseRepository(db);
    const workflowJobs = new WorkflowJobRepository(db);

    const caseRecord = await cases.findById(caseId);

    if (!caseRecord) {
      return {
        status: "case_not_found",
        message: "Nao foi possivel localizar este caso."
      };
    }

    const workflowJob = await workflowJobs.findById(workflowJobId);

    if (!workflowJob || !isValidPublicCaseAccessToken(caseId, workflowJob)) {
      return {
        status: "invalid_case_access",
        message: "Nao foi possivel validar este acesso."
      };
    }

    if (isBriefClosed(caseRecord)) {
      return {
        status: "case_closed",
        message: "Este caso nao esta mais disponivel para a segunda etapa."
      };
    }

    if (isBriefLocked(caseRecord.legalStatus)) {
      return {
        status: "processing",
        message: "A próxima etapa será liberada após a validação humana."
      };
    }

    return {
      status: "ready"
    };
  } catch {
    return {
      status: "database_unavailable",
      message: "Nao foi possivel verificar a liberacao neste momento."
    };
  }
}

export { isBriefClosed, isBriefLocked, isValidPublicCaseAccessToken };
