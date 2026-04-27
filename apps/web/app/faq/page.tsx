import { SiteHeader } from "../../src/components/brand/site-header";
import { IntakeForm } from "../../src/components/intake/intake-form";

const faqItems = [
  {
    question: "Quando devo procurar análise jurídica em saúde?",
    answer:
      "Quando houver piora clínica inesperada, alta sem estabilidade, negativa de cobertura, demora relevante ou falha de informação."
  },
  {
    question: "Sem prontuário completo ainda vale iniciar?",
    answer:
      "Sim. A etapa inicial organiza a jornada e define o plano de prova, incluindo documentos faltantes prioritários."
  },
  {
    question: "A SAFETYCARE promete resultado judicial?",
    answer:
      "Não. A atuação é técnica e responsável. O foco é estruturar prova e estratégia para maximizar consistência do caso."
  },
  {
    question: "Que documentos ajudam na primeira análise?",
    answer:
      "Relatórios médicos, exames, laudos, prescrições, termos de alta, mensagens e qualquer registro cronológico do atendimento."
  },
  {
    question: "Plano de saúde e alta hospitalar entram no escopo?",
    answer:
      "Sim. Negativa de cobertura e alta sem critério clínico são eixos recorrentes de avaliação."
  },
  {
    question: "Quanto tempo leva a triagem inicial?",
    answer:
      "A abertura é imediata. O tempo de retorno depende da complexidade e da disponibilidade documental."
  }
];

export default function FaqPage() {
  return (
    <main className="brand-shell">
      <SiteHeader current="faq" />

      <section className="panel-section">
        <div className="section-heading">
          <p className="section-eyebrow">FAQ jurídico</p>
          <h1>Perguntas frequentes sobre jornada do paciente e prova.</h1>
          <p className="hero-lede">
            Conteúdo educativo, direto e sem juridiquês para orientar decisão com clareza.
          </p>
        </div>

        <div className="faq-grid">
          {faqItems.map((item) => (
            <article className="faq-card" key={item.question}>
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="contact-section">
        <p className="section-eyebrow">Não encontrou sua dúvida?</p>
        <h2>Descreva seu caso e nossa equipe inicia a análise técnica.</h2>
        <IntakeForm landingSource="landing_faq" />
      </section>
    </main>
  );
}
