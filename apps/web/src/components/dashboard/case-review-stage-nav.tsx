import Link from "next/link";

type CaseReviewStage = "triage" | "score" | "legal";

type CaseReviewStageNavProps = {
  activeStage: CaseReviewStage;
  caseId: string;
};

function stageClassName(isActive: boolean) {
  return isActive ? "button-primary inline-action" : "button-ghost inline-action";
}

export function CaseReviewStageNav({ activeStage, caseId }: CaseReviewStageNavProps) {
  const stages: Array<{ key: CaseReviewStage; href: string; label: string }> = [
    {
      key: "triage",
      href: `/painel-executivo/cases/${caseId}/triage`,
      label: "Triagem inicial"
    },
    {
      key: "score",
      href: `/painel-executivo/cases/${caseId}/score`,
      label: "Score jurídico"
    },
    {
      key: "legal",
      href: `/painel-executivo/cases/${caseId}`,
      label: "Etapa 2"
    }
  ];

  return (
    <nav className="review-download-row" aria-label="Navegação da revisão humana">
      {stages.map((stage) => (
        <Link
          key={stage.key}
          className={stageClassName(stage.key === activeStage)}
          href={stage.href}
          aria-current={stage.key === activeStage ? "page" : undefined}
        >
          {stage.label}
        </Link>
      ))}
    </nav>
  );
}
