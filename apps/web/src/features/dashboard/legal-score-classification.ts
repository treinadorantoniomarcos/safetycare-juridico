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
