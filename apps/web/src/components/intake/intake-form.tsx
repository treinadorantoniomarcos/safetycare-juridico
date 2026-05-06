"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { savePublicCaseAccess } from "../../features/intake/public-case-access-storage";

type LeadSource = "site" | "form" | "whatsapp" | "referral";
type LandingSource = "landing_home" | "landing_method" | "landing_faq" | "unknown";

type IntakeFormState = {
  source: LeadSource;
  name: string;
  email: string;
  phone: string;
  message: string;
  consentAccepted: boolean;
};

const initialState: IntakeFormState = {
  source: "site",
  name: "",
  email: "",
  phone: "",
  message: "",
  consentAccepted: false
};

type IntakeFormProps = {
  landingSource?: LandingSource;
};

function getQueryValue(searchParams: URLSearchParams, key: string) {
  const value = searchParams.get(key);
  return value ? value.trim() : undefined;
}

export function IntakeForm({ landingSource = "unknown" }: IntakeFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<IntakeFormState>(initialState);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!state.consentAccepted) {
      setError("Para avançar, confirme o consentimento de tratamento de dados.");
      return;
    }

    if (state.message.trim().length < 10) {
      setError("Descreva a jornada com pelo menos 10 caracteres.");
      return;
    }

    setIsSubmitting(true);

    try {
      const utmSource = getQueryValue(searchParams, "utm_source");
      const utmMedium = getQueryValue(searchParams, "utm_medium");
      const utmCampaign = getQueryValue(searchParams, "utm_campaign");
      const utmContent = getQueryValue(searchParams, "utm_content");
      const utmTerm = getQueryValue(searchParams, "utm_term");
      const referrer = typeof document !== "undefined" ? document.referrer || undefined : undefined;

      const response = await fetch("/api/intake/lead", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          source: state.source,
          name: state.name.trim() || undefined,
          email: state.email.trim() || undefined,
          phone: state.phone.trim() || undefined,
          message: state.message.trim(),
          consent: {
            status: "granted",
            version: "safetycare-consent-v1",
            acceptedAt: new Date().toISOString(),
            captureMethod: "checkbox"
          },
          metadata: {
            landing: landingSource,
            channel: "organic_front",
            utm: {
              source: utmSource,
              medium: utmMedium,
              campaign: utmCampaign,
              content: utmContent,
              term: utmTerm
            },
            referrer
          }
        })
      });

      const payload = (await response.json()) as {
        error?: string;
        caseId?: string;
        workflowJobId?: string;
        accessCode?: string;
      };

      if (!response.ok || !payload.caseId || !payload.workflowJobId) {
        setError("Não foi possível iniciar a análise técnica agora. Tente novamente.");
        return;
      }

      const caseId = payload.caseId;
      const workflowJobId = payload.workflowJobId;

      savePublicCaseAccess(caseId, workflowJobId);

      void fetch("/api/intake/conversion-event", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          caseId,
          workflowJobId,
          eventName: "lead_submitted",
          source: landingSource,
          utmSource,
          utmMedium,
          utmCampaign,
          utmContent,
          utmTerm,
          referrer
        })
      });

      startTransition(() => {
        const query = new URLSearchParams();
        query.set("caseId", caseId);
        query.set("workflowJobId", workflowJobId);
        query.set("source", landingSource);

        if (payload.accessCode) query.set("accessCode", payload.accessCode);
        if (utmSource) query.set("utm_source", utmSource);
        if (utmMedium) query.set("utm_medium", utmMedium);
        if (utmCampaign) query.set("utm_campaign", utmCampaign);
        if (utmContent) query.set("utm_content", utmContent);
        if (utmTerm) query.set("utm_term", utmTerm);

        router.push(`/obrigado?${query.toString()}`);
      });
    } catch {
      setError("Falha de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="intake-form" onSubmit={handleSubmit}>
      <div className="field-grid">
        <label className="field">
          <span>Nome</span>
          <input
            type="text"
            name="name"
            autoComplete="name"
            placeholder="Seu nome completo"
            value={state.name}
            onChange={(event) => setState((prev) => ({ ...prev, name: event.target.value }))}
          />
        </label>

        <label className="field">
          <span>E-mail</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="seuemail@dominio.com"
            value={state.email}
            onChange={(event) => setState((prev) => ({ ...prev, email: event.target.value }))}
          />
        </label>
      </div>

      <div className="field-grid">
        <label className="field">
          <span>Telefone</span>
          <input
            type="tel"
            name="phone"
            autoComplete="tel"
            placeholder="(11) 99999-9999"
            value={state.phone}
            onChange={(event) => setState((prev) => ({ ...prev, phone: event.target.value }))}
          />
        </label>
      </div>

      <label className="field">
        <span>Origem</span>
        <select
          name="source"
          value={state.source}
          onChange={(event) =>
            setState((prev) => ({ ...prev, source: event.target.value as LeadSource }))
          }
        >
          <option value="site">Site</option>
          <option value="form">Formulário</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="referral">Indicação</option>
        </select>
      </label>

      <label className="field">
        <span>Descreva o que aconteceu</span>
        <textarea
          name="message"
          minLength={10}
          maxLength={10000}
          rows={6}
          placeholder="Conte sua jornada: atendimento, condutas, piora clínica, alta e impactos."
          value={state.message}
          onChange={(event) => setState((prev) => ({ ...prev, message: event.target.value }))}
        />
      </label>

      <label className="consent-row">
        <input
          type="checkbox"
          name="consent"
          checked={state.consentAccepted}
          onChange={(event) =>
            setState((prev) => ({ ...prev, consentAccepted: event.target.checked }))
          }
        />
        <span>Autorizo o tratamento dos dados para análise técnica inicial do caso.</span>
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <button type="submit" className="button-primary form-submit" disabled={isSubmitting || isPending}>
        {isSubmitting || isPending ? "Enviando..." : "Enviar para análise técnica"}
      </button>
    </form>
  );
}
