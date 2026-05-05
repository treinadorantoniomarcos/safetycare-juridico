import { eq } from "drizzle-orm";
import type { DatabaseClient } from "../client";
import { legalBriefInputsTable } from "../schema";
import type { LegalBriefInputRecord, NewLegalBriefInputRecord } from "../types";

export class LegalBriefInputRepository {
  constructor(private readonly db: DatabaseClient) {}

  async upsert(input: NewLegalBriefInputRecord): Promise<LegalBriefInputRecord> {
    const [record] = await this.db
      .insert(legalBriefInputsTable)
      .values(input)
      .onConflictDoUpdate({
        target: legalBriefInputsTable.caseId,
        set: {
          sourceWorkflowJobId: input.sourceWorkflowJobId,
          draftScope: input.draftScope,
          patientFullName: input.patientFullName,
          patientCpf: input.patientCpf,
          city: input.city,
          contact: input.contact,
          patientAddress: input.patientAddress,
          patientWhatsapp: input.patientWhatsapp,
          patientEmail: input.patientEmail,
          patientRg: input.patientRg,
          relationToPatient: input.relationToPatient,
          contactFullName: input.contactFullName,
          contactAddress: input.contactAddress,
          contactWhatsapp: input.contactWhatsapp,
          contactEmail: input.contactEmail,
          contactCpf: input.contactCpf,
          contactRg: input.contactRg,
          problemType: input.problemType,
          currentUrgency: input.currentUrgency,
          keyDates: input.keyDates,
          objectiveDescription: input.objectiveDescription,
          materialLosses: input.materialLosses,
          moralImpact: input.moralImpact,
          uploadedDocuments: input.uploadedDocuments,
          documentsAttached: input.documentsAttached,
          witnesses: input.witnesses,
          mainRequest: input.mainRequest,
          subsidiaryRequest: input.subsidiaryRequest,
          updatedAt: new Date()
        }
      })
      .returning();

    return record;
  }

  async findByCaseId(caseId: string): Promise<LegalBriefInputRecord | undefined> {
    const [record] = await this.db
      .select()
      .from(legalBriefInputsTable)
      .where(eq(legalBriefInputsTable.caseId, caseId));

    return record;
  }
}
