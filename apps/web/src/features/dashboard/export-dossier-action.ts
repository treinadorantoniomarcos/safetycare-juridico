"use server";

import { legalAlertsTable } from "@safetycare/database";
import { getDatabaseClient } from "../../lib/database";

export async function exportDossierAction(caseId: string) {
  console.log(`[AIOX] Gerando pacote juridico para o caso: ${caseId}`);

  const { db } = getDatabaseClient();
  await db.insert(legalAlertsTable).values({
    caseId,
    severity: "Info",
    message: `Pacote juridico exportado pelo usuario em ${new Date().toLocaleString()}`
  });

  return {
    success: true,
    downloadUrl: `/api/dashboard/protect/cases/${caseId}/legal-artifacts?format=pdf`,
    docxDownloadUrl: `/api/dashboard/protect/cases/${caseId}/legal-artifacts?format=docx`,
    docDownloadUrl: `/api/dashboard/protect/cases/${caseId}/legal-artifacts?format=doc`,
    message: "Pacote juridico gerado com sucesso pelo Squad de Defesa."
  };
}

export async function notifyMedicalTeamAction(caseId: string, alertMessage: string) {
  console.log(`[AIOX] Notificando Equipe Medica: ${alertMessage}`);

  const { db } = getDatabaseClient();
  await db.insert(legalAlertsTable).values({
    caseId,
    severity: "High",
    message: `ALERTA ENVIADO A EQUIPE: ${alertMessage}`
  });

  return { success: true };
}
