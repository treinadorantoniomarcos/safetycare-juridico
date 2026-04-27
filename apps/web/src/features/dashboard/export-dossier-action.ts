"use server";

import { getDatabaseClient } from "../../lib/database";
import { legalAlertsTable } from "@safetycare/database";

export async function exportDossierAction(caseId: string) {
  // Simula o processamento pesado de geração de PDF pelo Agente
  console.log(`[AIOX] Gerando Dossiê PDF para o caso: ${caseId}`);
  
  // Registra que um dossiê foi exportado para fins de auditoria
  const { db } = getDatabaseClient();
  await db.insert(legalAlertsTable).values({
    caseId,
    severity: 'Info',
    message: `Dossiê de Defesa exportado pelo usuário em ${new Date().toLocaleString()}`,
  });

  // Retorna um link simulado (em um sistema real aqui geraria o PDF no S3/Supabase Storage)
  return {
    success: true,
    downloadUrl: `/api/docs/dossier-${caseId}.pdf`,
    message: "Dossiê gerado com sucesso pelo Squad de Defesa."
  };
}

export async function notifyMedicalTeamAction(caseId: string, alertMessage: string) {
    console.log(`[AIOX] Notificando Equipe Médica: ${alertMessage}`);
    
    const { db } = getDatabaseClient();
    await db.insert(legalAlertsTable).values({
      caseId,
      severity: 'High',
      message: `ALERTA ENVIADO À EQUIPE: ${alertMessage}`,
    });
  
    return { success: true };
}
