import Image from "next/image";
import { SiteHeader } from "../src/components/brand/site-header";
import { IntakeForm } from "../src/components/intake/intake-form";

const pillars = [
  {
    title: "Defesa do Paciente",
    text: "A operação existe para proteger quem está vulnerável dentro do sistema de saúde."
  },
  {
    title: "Prova e Poder",
    text: "Sem prova, não existe direito. Nossa estrutura transforma fatos em evidência técnica."
  },
  {
    title: "Inteligência e Estratégia",
    text: "Cada decisão combina dados, análise jurídica e leitura clínica estruturada."
  },
  {
    title: "Justiça com Propósito",
    text: "Não é apenas litigar. É corrigir falhas assistenciais com direção e método."
  },
  {
    title: "Tecnologia e Resultado",
    text: "IA e operação padronizada para escalar atendimento sem perder qualidade jurídica."
  }
];

const statements = [
  "Sem prova, não existe direito.",
  "Nós estruturamos a prova.",
  "Sua jornada precisa ser analisada.",
  "Alta não é decisão administrativa."
];

export default function HomePage() {
  return (
    <main className="brand-shell">
      <SiteHeader current="home" />

      <section className="hero-section">
        <div className="hero-copy">
          <p className="hero-kicker">
            A primeira empresa jurídica do Brasil estruturada sob o Estatuto do Paciente
          </p>
          <h1>
            Você pode ter sido prejudicado e não sabe.
            <br />
            Nós transformamos sua jornada em prova jurídica.
          </h1>
          <p className="hero-lede">
            A SAFETYCARE reconstrói tecnicamente a linha do cuidado, identifica falhas
            assistenciais e organiza evidências para viabilizar acesso à justiça com clareza,
            segurança e estratégia.
          </p>
          <div className="hero-cta">
            <a href="#contato" className="button-primary">
              Iniciar análise técnica
            </a>
            <a href="#metodo" className="button-ghost">
              Entender método
            </a>
          </div>
        </div>

        <div className="hero-logo-wrap" aria-hidden>
          <Image
            src="/brand/safetycare-logo.png"
            alt="Logomarca Safetycare"
            width={600}
            height={600}
            className="hero-logo"
            priority
          />
        </div>
      </section>

      <section id="metodo" className="panel-section">
        <div className="section-heading">
          <p className="section-eyebrow">Pilares da marca</p>
          <h2>Estrutura institucional para decisão jurídica em saúde</h2>
        </div>
        <div className="pillars-grid">
          {pillars.map((pillar) => (
            <article key={pillar.title} className="pillar-card">
              <h3>{pillar.title}</h3>
              <p>{pillar.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="split-section">
        <article className="position-card">
          <p className="section-eyebrow">Posicionamento</p>
          <h2>Health + Law + IA</h2>
          <p>
            O mercado tradicional atua de forma reativa e manual. A SAFETYCARE opera de forma
            analítica, estruturada e orientada à prova.
          </p>
          <p className="slogan">Transformamos sua jornada em prova.</p>
        </article>

        <article className="statement-card">
          <p className="section-eyebrow">Frases institucionais</p>
          <ul>
            {statements.map((statement) => (
              <li key={statement}>{statement}</li>
            ))}
          </ul>
        </article>
      </section>

      <section id="contato" className="contact-section">
        <p className="section-eyebrow">Próximo passo</p>
        <h2>Sua história precisa de direção técnica.</h2>
        <p>
          Se houve dano, demora, omissão ou conduta sem clareza, o primeiro passo é organizar os
          fatos com método para preservar prova e estratégia jurídica.
        </p>

        <IntakeForm landingSource="landing_home" />
      </section>
    </main>
  );
}
