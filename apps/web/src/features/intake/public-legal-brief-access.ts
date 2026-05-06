import { workflowJobTypes } from "@safetycare/ai-contracts";
import {
  CaseRepository,
  LegalScoreRepository,
  type CaseRecord,
  type LegalScoreRecord,
  type WorkflowJobRecord,
  WorkflowJobRepository
} from "@safetycare/database";
import { unstable_noStore as noStore } from "next/cache";
import {
  getHumanScoreClassification,
  type LegalScoreClassification
} from "../dashboard/legal-score-classification";
import { getDatabaseClient } from "../../lib/database";

export type PublicLegalBriefAccessState =
  | {
      status: "ready";
      classification: LegalScoreClassification;
      message: string;
    }
  | {
      status: "processing";
      message: string;
    }
  | {
      status: "awaiting_human_score";
      message: string;
    }
  | {
      status: "blocked";
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

function isBriefClosed(caseRecord: Pick<CaseRecord, "commercialStatus" | "legalStatus">) {
  return caseRecord.commercialStatus === "closed_lost" || caseRecord.legalStatus === "closed_lost";
}

export function evaluatePublicLegalBriefGate(
  caseRecord: Pick<CaseRecord, "commercialStatus" | "legalStatus">,
  score?: Pick<LegalScoreRecord, "viabilityScore" | "reviewRequired" | "decision"> | null
): PublicLegalBriefAccessState {
  if (isBriefClosed(caseRecord)) {
    return {
      status: "blocked",
      message: "Este caso nao esta mais disponivel para a segunda etapa."
    };
  }

  if (!score) {
    return {
      status: "processing",
      message: "A primeira analise automatica ainda nao concluiu o score juridico."
    };
  }

  const humanClassification = getHumanScoreClassification(score.decision);

  if (!humanClassification) {
    return {
      status: "awaiting_human_score",
      message: "O score juridico ainda precisa ser classificado manualmente pela equipe."
    };
  }

  if (humanClassification.key === "red") {
    return {
      status: "blocked",
      message: humanClassification.description
    };
  }

  return {
    status: "ready",
    classification: humanClassification,
    message: humanClassification.description
  };
}

export async function resolvePublicLegalBriefAccess(
  caseId?: string,
  workflowJobId?: string
): Promise<PublicLegalBriefAccessState> {
  noStore();

  if (!caseId || !workflowJobId) {
    return {
      status: "missing_params",
      message: "A proxima etapa sera liberada apos a validacao dos agentes."
    };
  }

  try {
    const { db } = getDatabaseClient();
    const cases = new CaseRepository(db);
    const legalScores = new LegalScoreRepository(db);
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

    const score = await legalScores.findByCaseId(caseId);

    if (!score) {
      return {
        status: "processing",
        message: "A primeira analise automatica ainda nao concluiu o score juridico."
      };
    }

    return evaluatePublicLegalBriefGate(caseRecord, score);
  } catch {
    return {
      status: "database_unavailable",
      message: "Nao foi possivel verificar a liberacao neste momento."
    };
  }
}

export function isBriefLocked(
  caseRecord: Pick<CaseRecord, "commercialStatus" | "legalStatus">,
  score?: Pick<LegalScoreRecord, "viabilityScore" | "reviewRequired" | "decision"> | null
) {
  const gate = evaluatePublicLegalBriefGate(caseRecord, score);
  return gate.status !== "ready";
}

export { isBriefClosed, isValidPublicCaseAccessToken };
