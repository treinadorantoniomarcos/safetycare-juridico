import { SiteHeader } from "../../src/components/brand/site-header";
import { IntakeForm } from "../../src/components/intake/intake-form";

const methodSteps = [
  {
    title: "1. Captação estruturada",
    text: "Registramos o relato inicial com dados clínicos e contexto assistencial relevante."
  },
  {
    title: "2. Triagem e classificação",
    text: "Classificamos tipo de caso, prioridade, urgência e potencial jurídico."
  },
  {
    title: "3. Reconstrução da jornada",
    text: "Organizamos a linha do tempo técnica para identificar eventos críticos e riscos."
  },
  {
    title: "4. Análise de direitos e prova",
    text: "Mapeamos possíveis violações e consolidamos checklist probatório com lacunas."
  },
  {
    title: "5. Score jurídico + revisão",
    text: "Geramos score de viabilidade e aplicamos gate de revisão humana para decisão."
  },
  {
    title: "6. Execução orientada",
    text: "Com evidência validada, a estratégia jurídica segue para execução controlada."
  }
];

export default function MetodoPage() {
  return (
    <main className="brand-shell">
      <SiteHeader current="metodo" />

      <section className="panel-section">
        <div className="section-heading">
          <p className="section-eyebrow">Método Safetycare</p>
          <h1>Estruturamos fatos para produzir prova jurídica.</h1>
          <p className="hero-lede">
            Nossa operação combina saúde, jurídico e tecnologia para reduzir improviso e aumentar
            previsibilidade de decisão.
          </p>
        </div>

        <div className="method-grid">
          {methodSteps.map((step) => (
            <article className="method-card" key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="contact-section">
        <p className="section-eyebrow">Abrir análise</p>
        <h2>Se houver falha assistencial, o tempo importa.</h2>
        <p>Inicie a análise técnica para preservar contexto, documentos e estratégia.</p>
        <IntakeForm landingSource="landing_method" />
      </section>
    </main>
  );
}
