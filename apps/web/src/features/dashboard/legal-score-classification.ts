type LegalScoreSummary = {
  viabilityScore: number;
  reviewRequired: boolean;
};

export type LegalScoreTrafficLight = "green" | "yellow" | "red";

export type LegalScoreClassification = {
  key: LegalScoreTrafficLight;
  label: string;
  description: string;
};

export function normalizeScoreReviewDecision(
  decision?: string | null
): LegalScoreTrafficLight | null {
  if (decision === "green" || decision === "yellow" || decision === "red") {
    return decision;
  }

  if (decision === "approve") {
    return "green";
  }

  if (decision === "request_changes") {
    return "yellow";
  }

  if (decision === "reject") {
    return "red";
  }

  return null;
}

export function getLegalScoreClassification(
  score?: LegalScoreSummary | null
): LegalScoreClassification {
  if (!score) {
    return {
      key: "yellow",
      label: "Precisa de revisao",
      description: "O score ainda nao foi consolidado para orientar a proxima etapa."
    };
  }

  if (score.viabilityScore < 45) {
    return {
      key: "red",
      label: "Nao cabe acao juridica",
      description: "O caso nao apresenta base suficiente para seguir adiante neste momento."
    };
  }

  if (score.reviewRequired || score.viabilityScore < 75) {
    return {
      key: "yellow",
      label: "Precisa complementar",
      description: "O caso pode seguir, mas ainda exige informacoes ou documentos adicionais."
    };
  }

  return {
    key: "green",
    label: "Pode continuar",
    description: "O caso pode seguir para a proxima etapa sem bloqueios relevantes."
  };
}

export function getHumanScoreClassification(
  decision?: string | null
): LegalScoreClassification | null {
  const normalizedDecision = normalizeScoreReviewDecision(decision);

  if (!normalizedDecision) {
    return null;
  }

  if (normalizedDecision === "green") {
    return {
      key: "green",
      label: "Pode continuar",
      description: "A equipe liberou a etapa 2 sem bloqueios relevantes."
    };
  }

  if (normalizedDecision === "yellow") {
    return {
      key: "yellow",
      label: "Precisa complementar",
      description: "A equipe liberou a etapa 2, mas ainda podem ser solicitadas complementacoes."
    };
  }

  return {
    key: "red",
    label: "Nao cabe acao juridica",
    description: "A equipe bloqueou a continuidade deste caso nesta fase."
  };
}
