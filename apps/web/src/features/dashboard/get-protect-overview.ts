import { getDatabaseClient } from "../../lib/database";
import { 
  patientsTable, 
  hospitalCasesTable, 
  patientJourneyTable, 
  evidenceDocsTable, 
  agentIntelligenceTable 
} from "@safetycare/database";
import { eq, desc } from "drizzle-orm";

export async function getProtectOverview(caseId?: string) {
  const { db } = getDatabaseClient();

  // Se não passar caseId, pegamos o caso crítico mais recente (ex: João Silva do nosso Seed)
  const [latestCase] = await db
    .select()
    .from(hospitalCasesTable)
    .orderBy(desc(hospitalCasesTable.createdAt))
    .limit(1);

  if (!latestCase) {
    throw new Error("Nenhum caso encontrado no sistema Protect.");
  }

  // Busca dados do paciente
  const [patient] = await db
    .select()
    .from(patientsTable)
    .where(eq(patientsTable.id, latestCase.patientId))
    .limit(1);

  // Busca a jornada (Timeline)
  const timeline = await db
    .select()
    .from(patientJourneyTable)
    .where(eq(patientJourneyTable.caseId, latestCase.id))
    .orderBy(patientJourneyTable.eventDate);

  // Busca os documentos e lacunas
  const documents = await db
    .select()
    .from(evidenceDocsTable)
    .where(eq(evidenceDocsTable.caseId, latestCase.id));

  // Busca a inteligência do Agente de Defesa (Dossiê)
  const intelligence = await db
    .select()
    .from(agentIntelligenceTable)
    .where(eq(agentIntelligenceTable.caseId, latestCase.id))
    .limit(1);

  return {
    caseInfo: {
      id: latestCase.id,
      patientName: patient?.name || "Desconhecido",
      department: latestCase.department,
      riskScore: latestCase.currentRiskScore,
      status: latestCase.status,
    },
    timeline: timeline.map(event => ({
      time: new Date(event.eventDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      event: event.description,
      status: event.riskLevel === 'critical' ? 'critical' : event.riskLevel === 'high' ? 'warning' : 'success',
      icon: event.riskLevel === 'critical' ? '🚨' : event.riskLevel === 'high' ? '⚠️' : '✅',
      risk: event.riskLevel
    })),
    checklist: documents.map(doc => ({
      label: doc.docType,
      status: doc.validationStatus === 'valid' ? 'ok' : doc.validationStatus === 'pending' ? 'warning' : 'error'
    })),
    dossier: intelligence[0]?.findings || {
      legal_thesis: "Aguardando processamento do Squad Jurídico...",
      defense_strength: "Pendente",
      causal_nexus: "Em análise..."
    }
  };
}
