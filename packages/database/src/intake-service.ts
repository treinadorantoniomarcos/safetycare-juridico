import { workflowJobTypes, type LeadIntakeInput } from "@safetycare/ai-contracts";
import type { DatabaseClient } from "./client";
import { auditLogsTable, casesTable, clientsTable, leadsTable, workflowJobsTable } from "./schema";

type IntakeCreationResult = {
  leadId: string;
  clientId: string;
  caseId: string;
  workflowJobId: string;
};

export async function createIntakeCase(
  db: DatabaseClient,
  input: LeadIntakeInput,
  correlationId: string
): Promise<IntakeCreationResult> {
  return db.transaction(async (tx) => {
    const [lead] = await tx
      .insert(leadsTable)
      .values({
        source: input.source,
        name: input.name,
        phone: input.phone,
        rawMessage: input.message,
        metadata: input.metadata,
        status: "new"
      })
      .returning();

    const [client] = await tx
      .insert(clientsTable)
      .values({
        leadId: lead.id,
        fullName: input.name ?? "Nao informado",
        email: input.email,
        phone: input.phone,
        consentStatus: input.consent?.status ?? "pending",
        consentPayload: input.consent ?? {}
      })
      .returning();

    const [caseRecord] = await tx
      .insert(casesTable)
      .values({
        clientId: client.id,
        priority: "medium",
        urgency: "medium",
        legalStatus: "human_triage_pending",
        commercialStatus: "screening_pending"
      })
      .returning();

    const [workflowJob] = await tx
      .insert(workflowJobsTable)
      .values({
        caseId: caseRecord.id,
        jobType: workflowJobTypes[0],
        status: "blocked",
        correlationId,
        payload: {
          stage: "awaiting_human_triage",
          source: input.source,
          consentStatus: client.consentStatus
        }
      })
      .onConflictDoNothing({
        target: [workflowJobsTable.correlationId, workflowJobsTable.jobType]
      })
      .returning();

    await tx.insert(auditLogsTable).values({
      caseId: caseRecord.id,
      actorType: "system",
      actorId: "web-intake",
      action: "intake.case_created",
      correlationId,
      afterPayload: {
        leadId: lead.id,
        clientId: client.id,
        caseId: caseRecord.id,
        source: input.source
      }
    });

    await tx.insert(auditLogsTable).values({
      caseId: caseRecord.id,
      actorType: "system",
      actorId: "intake-queue",
      action: "intake.human_triage_required",
      correlationId,
      afterPayload: {
        workflowJobId: workflowJob?.id ?? null,
        jobType: workflowJobTypes[0],
        consentStatus: client.consentStatus,
        stage: "awaiting_human_triage"
      }
    });

    if (!workflowJob) {
      throw new Error("workflow_job_not_created");
    }

    return {
      leadId: lead.id,
      clientId: client.id,
      caseId: caseRecord.id,
      workflowJobId: workflowJob.id
    };
  });
}
