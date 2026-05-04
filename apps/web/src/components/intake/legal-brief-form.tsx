"use client";

import {
  legalBriefProblemTypes,
  type LegalDocumentPack,
  type LegalDraft,
  triageUrgencyLevels,
  type LegalBriefInput,
  type LegalBriefKeyDate,
  type LegalBriefUploadedDocument
} from "@safetycare/ai-contracts";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

type LegalBriefProblemType = (typeof legalBriefProblemTypes)[number];
type LegalBriefUrgencyLevel = (typeof triageUrgencyLevels)[number];
type UploadedDocument = LegalBriefUploadedDocument;

const MAX_UPLOADED_DOCUMENTS = 10;
const MAX_UPLOADED_DOCUMENT_SIZE_BYTES = 12 * 1024 * 1024;

type LegalBriefFormState = Omit<LegalBriefInput, "caseId" | "workflowJobId" | "draftScope">;

type LegalBriefSubmission = Omit<LegalBriefInput, "caseId" | "workflowJobId"> & {
  submittedAt: string;
  updatedAt: string;
};

type LegalBriefResponse =
  | {
      status: "processing";
      message: string;
    }
  | {
      status: "ready";
      submission: LegalBriefSubmission | null;
      draft: LegalDraft | null;
      supportingDocumentPack: LegalDocumentPack | null;
    };

type LegalBriefAcceptedResponse = {
  status: "accepted";
  submission?: LegalBriefSubmission;
  draft?: LegalDraft;
  supportingDocumentPack?: LegalDocumentPack;
};

type LegalBriefFormProps = {
  caseId?: string;
  workflowJobId?: string;
};

function createEmptyState(): LegalBriefFormState {
  return {
    patientFullName: "",
    patientCpf: "",
    city: "",
    contact: "",
    relationToPatient: "",
    problemType: "atendimento",
    currentUrgency: "medium",
    keyDates: [{ label: "", date: "" }],
    objectiveDescription: "",
    materialLosses: "",
    moralImpact: "",
    uploadedDocuments: [],
    documentsAttached: [""],
    witnesses: [""],
    mainRequest: "",
    subsidiaryRequest: ""
  };
}

function buildStateFromSubmission(submission: LegalBriefSubmission | null | undefined) {
  if (!submission) {
    return createEmptyState();
  }

  return {
    patientFullName: submission.patientFullName,
    patientCpf: submission.patientCpf,
    city: submission.city,
    contact: submission.contact,
    relationToPatient: submission.relationToPatient,
    problemType: submission.problemType,
    currentUrgency: submission.currentUrgency,
    keyDates: submission.keyDates.length > 0 ? submission.keyDates : [{ label: "", date: "" }],
    objectiveDescription: submission.objectiveDescription,
    materialLosses: submission.materialLosses,
    moralImpact: submission.moralImpact,
    uploadedDocuments: submission.uploadedDocuments,
    documentsAttached: submission.documentsAttached.length > 0 ? submission.documentsAttached : [""],
    witnesses: submission.witnesses.length > 0 ? submission.witnesses : [""],
    mainRequest: submission.mainRequest,
    subsidiaryRequest: submission.subsidiaryRequest
  };
}

function trimList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

function trimDates(values: LegalBriefKeyDate[]) {
  return values
    .map((value) => ({
      label: value.label.trim(),
      date: value.date.trim()
    }))
    .filter((value) => value.label.length > 0 && value.date.length > 0);
}

function formatFileSize(bytes: number) {
  if (bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function isPreviewableImage(mimeType: string) {
  return mimeType.startsWith("image/");
}

function isPdfDocument(mimeType: string) {
  return mimeType === "application/pdf";
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("file_read_failed"));
    reader.readAsDataURL(file);
  });
}

function createUploadedDocument(file: File, dataUrl: string): UploadedDocument {
  return {
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    dataUrl,
    uploadedAt: new Date().toISOString()
  };
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function urgencyLabel(value: LegalBriefUrgencyLevel) {
  switch (value) {
    case "critical":
      return "Crítica";
    case "high":
      return "Alta";
    case "medium":
      return "Média";
    default:
      return "Baixa";
  }
}

function renderDraftPreview(draft: LegalDraft) {
  return (
    <section className="form-section-card draft-preview-card">
      <div className="form-section-head">
        <p className="section-eyebrow">Minuta preliminar</p>
        <h3>{draft.title}</h3>
        <p className="section-note">{draft.subtitle}</p>
      </div>

      <p className="draft-preview-summary">{draft.summary}</p>

      <div className="draft-preview-sections">
        {draft.sections.map((section) => (
          <article key={section.key} className="draft-preview-section">
            <h4>{section.title}</h4>
            <p>{section.body}</p>
          </article>
        ))}
      </div>

      <div className="draft-preview-recommendations">
        <h4>Recomendações de revisão</h4>
        <ul>
          {draft.keyRecommendations.map((recommendation, index) => (
            <li key={`${recommendation}-${index}`}>{recommendation}</li>
          ))}
        </ul>
      </div>

      <details className="draft-preview-markdown">
        <summary>Ver texto integral em Markdown</summary>
        <pre>{draft.markdown}</pre>
      </details>
    </section>
  );
}

function renderSupportingDocumentPack(pack: LegalDocumentPack) {
  return (
    <section className="form-section-card supporting-documents-card">
      <div className="form-section-head">
        <p className="section-eyebrow">Modelos complementares</p>
        <h3>{pack.title}</h3>
        <p className="section-note">{pack.subtitle}</p>
      </div>

      <p className="draft-preview-summary">{pack.summary}</p>

      <div className="supporting-documents-grid">
        {pack.documents.map((document) => (
          <article key={document.key} className="supporting-document-item">
            <div className="supporting-document-head">
              <p className="section-eyebrow">
                {document.type === "power_of_attorney" ? "Procuração" : "Contrato"}
              </p>
              <h4>{document.title}</h4>
              <p className="section-note">{document.subtitle}</p>
            </div>

            <p className="supporting-document-summary">{document.summary}</p>

            <div className="supporting-document-placeholders">
              <h5>Campos ainda para preencher</h5>
              <ul>
                {document.placeholders.map((placeholder) => (
                  <li key={`${document.key}-${placeholder}`}>{placeholder}</li>
                ))}
              </ul>
            </div>

            <div className="draft-preview-recommendations supporting-document-notes">
              <h5>Notas de revisão</h5>
              <ul>
                {document.reviewNotes.map((note, index) => (
                  <li key={`${document.key}-${index}`}>{note}</li>
                ))}
              </ul>
            </div>

            <details className="draft-preview-markdown supporting-document-markdown">
              <summary>Ver minuta completa</summary>
              <pre>{document.markdown}</pre>
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}

function renderUploadedDocumentCard(document: UploadedDocument, onRemove: () => void) {
  return (
    <article className="uploaded-document-card" key={`${document.name}-${document.uploadedAt}`}>
      <div className="uploaded-document-card__head">
        <div>
          <p className="section-eyebrow">Arquivo enviado</p>
          <h4>{document.name}</h4>
          <p className="section-note">
            {document.mimeType} | {formatFileSize(document.size)}
          </p>
        </div>
        <button type="button" className="button-ghost inline-action inline-action--danger" onClick={onRemove}>
          Remover
        </button>
      </div>

      <div className="uploaded-document-preview">
        {isPreviewableImage(document.mimeType) ? (
          <img src={document.dataUrl} alt={document.name} />
        ) : isPdfDocument(document.mimeType) ? (
          <iframe title={document.name} src={document.dataUrl} />
        ) : (
          <div className="uploaded-document-preview__fallback">
            <p>Pré-visualização não disponível para este formato.</p>
            <a className="button-ghost inline-action" href={document.dataUrl} download={document.name}>
              Baixar arquivo
            </a>
          </div>
        )}
      </div>
    </article>
  );
}

export function LegalBriefForm({ caseId, workflowJobId }: LegalBriefFormProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<LegalBriefResponse | null>(null);
  const [formState, setFormState] = useState<LegalBriefFormState>(() => createEmptyState());
  const [draftPreview, setDraftPreview] = useState<LegalDraft | null>(null);
  const [supportingDocumentPack, setSupportingDocumentPack] = useState<LegalDocumentPack | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!caseId || !workflowJobId) {
      setLoading(false);
      setDraftPreview(null);
      setSupportingDocumentPack(null);
      setError("Não foi possível validar o caso para liberar esta etapa.");
      return;
    }

    const controller = new AbortController();

    async function loadBriefForm() {
      setDraftPreview(null);
      setSupportingDocumentPack(null);
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/intake/public/cases/${caseId}/brief?workflowJobId=${workflowJobId}`,
          {
            method: "GET",
            signal: controller.signal
          }
        );

        const payload = (await response.json()) as
          | LegalBriefResponse
          | {
              error?: string;
              detail?: string;
            };

        if (!response.ok && response.status !== 202) {
          if (response.status === 409) {
            setError("Este caso já não está disponível para a segunda etapa.");
          } else if (response.status === 403) {
            setError("Não foi possível validar o acesso deste caso.");
          } else {
            setError("Não foi possível carregar o formulário neste momento.");
          }
          return;
        }

        if (!("status" in payload)) {
          setError("Não foi possível carregar o formulário neste momento.");
          return;
        }

        setStatus(payload);

        if (payload.status === "ready") {
          setFormState(buildStateFromSubmission(payload.submission));
          setDraftPreview(payload.draft);
          setSupportingDocumentPack(payload.supportingDocumentPack);
        }
      } catch {
        if (!controller.signal.aborted) {
          setError("Falha de conexão ao carregar o formulário.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadBriefForm();

    return () => {
      controller.abort();
    };
  }, [caseId, workflowJobId]);

  function updateKeyDate(index: number, patch: Partial<LegalBriefKeyDate>) {
    setFormState((prev) => ({
      ...prev,
      keyDates: prev.keyDates.map((item, currentIndex) =>
        currentIndex === index
          ? {
              ...item,
              ...patch
            }
          : item
      )
    }));
  }

  function addKeyDate() {
    setFormState((prev) => ({
      ...prev,
      keyDates: [...prev.keyDates, { label: "", date: "" }]
    }));
  }

  function removeKeyDate(index: number) {
    setFormState((prev) => ({
      ...prev,
      keyDates:
        prev.keyDates.length === 1
          ? prev.keyDates
          : prev.keyDates.filter((_, currentIndex) => currentIndex !== index)
    }));
  }

  function updateStringList(field: "documentsAttached" | "witnesses", index: number, value: string) {
    setFormState((prev) => ({
      ...prev,
      [field]: prev[field].map((item, currentIndex) => (currentIndex === index ? value : item))
    }));
  }

  function addStringListItem(field: "documentsAttached" | "witnesses") {
    setFormState((prev) => ({
      ...prev,
      [field]: [...prev[field], ""]
    }));
  }

  function removeStringListItem(field: "documentsAttached" | "witnesses", index: number) {
    setFormState((prev) => ({
      ...prev,
      [field]:
        prev[field].length === 1
          ? prev[field]
          : prev[field].filter((_, currentIndex) => currentIndex !== index)
    }));
  }

  function removeUploadedDocument(index: number) {
    setFormState((prev) => ({
      ...prev,
      uploadedDocuments:
        prev.uploadedDocuments.length === 0
          ? prev.uploadedDocuments
          : prev.uploadedDocuments.filter((_, currentIndex) => currentIndex !== index)
    }));
  }

  async function handleUploadedDocumentsChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    input.value = "";

    if (files.length === 0) {
      return;
    }

    if (formState.uploadedDocuments.length + files.length > MAX_UPLOADED_DOCUMENTS) {
      setError(`Você pode anexar no máximo ${MAX_UPLOADED_DOCUMENTS} arquivos nesta etapa.`);
      return;
    }

    for (const file of files) {
      if (file.size > MAX_UPLOADED_DOCUMENT_SIZE_BYTES) {
        setError(
          `O arquivo ${file.name} excede o limite de ${formatFileSize(MAX_UPLOADED_DOCUMENT_SIZE_BYTES)}.`
        );
        return;
      }
    }

    try {
      const uploaded = await Promise.all(
        files.map(async (file) => {
          const dataUrl = await fileToDataUrl(file);
          return createUploadedDocument(file, dataUrl);
        })
      );

      setFormState((prev) => ({
        ...prev,
        uploadedDocuments: [...prev.uploadedDocuments, ...uploaded]
      }));
      setError(null);
    } catch {
      setError("Não foi possível ler um dos arquivos selecionados.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!caseId || !workflowJobId) {
      setError("Não foi possível validar o caso para envio.");
      return;
    }

    const requiredValues = [
      formState.patientFullName,
      formState.patientCpf,
      formState.city,
      formState.contact,
      formState.relationToPatient,
      formState.objectiveDescription,
      formState.materialLosses,
      formState.moralImpact,
      formState.mainRequest,
      formState.subsidiaryRequest
    ];

    if (requiredValues.some((value) => value.trim().length === 0)) {
      setError("Preencha todos os campos obrigatórios antes de enviar.");
      return;
    }

    const keyDates = trimDates(formState.keyDates);

    if (keyDates.length === 0) {
      setError("Informe ao menos uma data-chave.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/intake/public/cases/${caseId}/brief`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          caseId,
          workflowJobId,
          draftScope: "civil_health",
          patientFullName: formState.patientFullName.trim(),
          patientCpf: formState.patientCpf.trim(),
          city: formState.city.trim(),
          contact: formState.contact.trim(),
          relationToPatient: formState.relationToPatient.trim(),
          problemType: formState.problemType,
          currentUrgency: formState.currentUrgency,
          keyDates,
          objectiveDescription: formState.objectiveDescription.trim(),
          materialLosses: formState.materialLosses.trim(),
          moralImpact: formState.moralImpact.trim(),
          uploadedDocuments: formState.uploadedDocuments,
          documentsAttached: trimList(formState.documentsAttached),
          witnesses: trimList(formState.witnesses),
          mainRequest: formState.mainRequest.trim(),
          subsidiaryRequest: formState.subsidiaryRequest.trim()
        })
      });

      const payload = (await response.json()) as
        | {
            error?: string;
          }
        | LegalBriefAcceptedResponse;

      if (!response.ok) {
        if (response.status === 409) {
          setError("Este caso ainda não foi liberado para a segunda etapa.");
        } else if (response.status === 403) {
          setError("Não foi possível validar o acesso deste caso.");
        } else {
          setError("Não foi possível registrar os parâmetros agora. Tente novamente.");
        }
        return;
      }

      if ("submission" in payload && payload.submission) {
        setFormState(buildStateFromSubmission(payload.submission));
      }

      if ("draft" in payload) {
        setDraftPreview(payload.draft ?? null);
      }

      if ("supportingDocumentPack" in payload) {
        setSupportingDocumentPack(payload.supportingDocumentPack ?? null);
      }

      setSubmitted(true);
    } catch {
      setError("Falha de conexão ao enviar os parâmetros.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return <p className="completion-status">Carregando o formulário da segunda etapa...</p>;
  }

  if (error) {
    return <p className="form-error">{error}</p>;
  }

  if (submitted) {
    return (
      <section className="completion-success completion-success--draft">
        <p className="completion-success-message">
          Parâmetros recebidos. A equipe humana vai revisar a história, os documentos e os pedidos
          antes de protocolar a minuta.
        </p>

        {draftPreview ? renderDraftPreview(draftPreview) : null}
        {supportingDocumentPack ? renderSupportingDocumentPack(supportingDocumentPack) : null}
      </section>
    );
  }

  if (status?.status === "processing") {
    return (
      <p className="completion-status">
        {status.message} Você pode retornar mais tarde pelo mesmo link para continuar.
      </p>
    );
  }

  return (
    <form className="completion-form legal-brief-form" onSubmit={handleSubmit}>
      {status?.status === "ready" && status.submission ? (
        <div className="completion-meta">
          <p>Já existe uma versão salva para este caso.</p>
          <p>Última atualização: {formatDateTime(status.submission.updatedAt)}</p>
        </div>
      ) : null}

      {draftPreview ? renderDraftPreview(draftPreview) : null}
      {supportingDocumentPack ? renderSupportingDocumentPack(supportingDocumentPack) : null}

      <section className="form-section-card">
        <div className="form-section-head">
          <p className="section-eyebrow">Dados principais</p>
          <h3>Identificação do paciente e do solicitante</h3>
          <p className="section-note">
            Informe os dados que serão usados como base para a adaptação da peça. O contato pode
            ser telefone, WhatsApp ou e-mail.
          </p>
        </div>

        <div className="field-grid">
          <label className="field">
            <span>Nome completo do paciente</span>
            <input
              type="text"
              name="patientFullName"
              autoComplete="name"
              placeholder="Nome completo"
              value={formState.patientFullName}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, patientFullName: event.target.value }))
              }
            />
          </label>

          <label className="field">
            <span>CPF do paciente</span>
            <input
              type="text"
              name="patientCpf"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={formState.patientCpf}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, patientCpf: event.target.value }))
              }
            />
          </label>
        </div>

        <div className="field-grid">
          <label className="field">
            <span>Cidade</span>
            <input
              type="text"
              name="city"
              placeholder="Cidade e UF"
              value={formState.city}
              onChange={(event) => setFormState((prev) => ({ ...prev, city: event.target.value }))}
            />
          </label>

          <label className="field">
            <span>Contato</span>
            <input
              type="text"
              name="contact"
              placeholder="Telefone, WhatsApp ou e-mail"
              value={formState.contact}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, contact: event.target.value }))
              }
            />
          </label>
        </div>

        <label className="field">
          <span>Relação entre autor e paciente</span>
          <input
            type="text"
            name="relationToPatient"
            placeholder="Ex.: paciente, filho, cônjuge, responsável, representante"
            value={formState.relationToPatient}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, relationToPatient: event.target.value }))
            }
          />
        </label>
      </section>

      <section className="form-section-card">
        <div className="form-section-head">
          <p className="section-eyebrow">Enquadramento</p>
          <h3>Tipo de problema e urgência</h3>
          <p className="section-note">
            Escolha a categoria que melhor descreve o problema e o nível atual de urgência.
          </p>
        </div>

        <div className="field-grid">
          <label className="field">
            <span>Tipo de problema</span>
            <select
              name="problemType"
              value={formState.problemType}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  problemType: event.target.value as LegalBriefProblemType
                }))
              }
            >
              {legalBriefProblemTypes.map((problemType) => (
                <option key={problemType} value={problemType}>
                  {{
                    atendimento: "Atendimento",
                    plano: "Plano de saúde",
                    hospital: "Hospital",
                    medico: "Médico",
                    clinica: "Clínica",
                    medicamento: "Medicamento",
                    cirurgia: "Cirurgia",
                    uti: "UTI",
                    reembolso: "Reembolso",
                    outro: "Outro"
                  }[problemType]}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Urgência atual</span>
            <select
              name="currentUrgency"
              value={formState.currentUrgency}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  currentUrgency: event.target.value as LegalBriefUrgencyLevel
                }))
              }
            >
              {triageUrgencyLevels.map((urgencyLevel) => (
                <option key={urgencyLevel} value={urgencyLevel}>
                  {urgencyLabel(urgencyLevel)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="form-section-card">
        <div className="form-section-head">
          <p className="section-eyebrow">Linha do tempo</p>
          <h3>Datas-chave</h3>
          <p className="section-note">
            Liste os marcos mais importantes da história: sintomas, atendimentos, negativas,
            internações, pedidos administrativos, altas ou piora clínica.
          </p>
        </div>

        <div className="repeatable-list">
          {formState.keyDates.map((item, index) => (
            <div key={`${item.label}-${index}`} className="repeatable-grid repeatable-grid--date">
              <label className="field">
                <span>Descrição da data</span>
                <input
                  type="text"
                  placeholder="Ex.: negativa do plano, internação, cirurgia, alta"
                  value={item.label}
                  onChange={(event) =>
                    updateKeyDate(index, {
                      label: event.target.value
                    })
                  }
                />
              </label>

              <label className="field">
                <span>Data</span>
                <input
                  type="date"
                  value={item.date}
                  onChange={(event) =>
                    updateKeyDate(index, {
                      date: event.target.value
                    })
                  }
                />
              </label>

              <button
                type="button"
                className="button-ghost inline-action inline-action--danger"
                onClick={() => removeKeyDate(index)}
              >
                Remover
              </button>
            </div>
          ))}
        </div>

        <div className="repeatable-toolbar">
          <button type="button" className="button-ghost inline-action" onClick={addKeyDate}>
            Adicionar data-chave
          </button>
        </div>
      </section>

      <section className="form-section-card">
        <div className="form-section-head">
          <p className="section-eyebrow">História do caso</p>
          <h3>Descrição objetiva, impactos e prejuízos</h3>
          <p className="section-note">
            Seja objetivo. Conte o que aconteceu, o que foi negado ou atrasado, os prejuízos
            materiais e o impacto moral e assistencial.
          </p>
        </div>

        <label className="field">
          <span>Descrição objetiva da conduta</span>
          <textarea
            name="objectiveDescription"
            rows={6}
            maxLength={5000}
            placeholder="Explique de forma cronológica e objetiva o que ocorreu."
            value={formState.objectiveDescription}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                objectiveDescription: event.target.value
              }))
            }
          />
        </label>

        <label className="field">
          <span>Prejuízos materiais</span>
          <textarea
            name="materialLosses"
            rows={4}
            maxLength={4000}
            placeholder="Descreva gastos, perdas, reembolsos negados, tratamentos custeados e outros danos financeiros."
            value={formState.materialLosses}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, materialLosses: event.target.value }))
            }
          />
        </label>

        <label className="field">
          <span>Impacto moral e assistencial</span>
          <textarea
            name="moralImpact"
            rows={4}
            maxLength={4000}
            placeholder="Descreva sofrimento, angústia, risco, insegurança, piora clínica ou demais repercussões."
            value={formState.moralImpact}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, moralImpact: event.target.value }))
            }
          />
        </label>
      </section>

      <section className="form-section-card">
        <div className="form-section-head">
          <p className="section-eyebrow">Provas</p>
          <h3>Documentos anexos e testemunhas</h3>
          <p className="section-note">
            Liste os documentos já existentes e as pessoas que podem confirmar a narrativa. Se não
            houver algo para informar neste momento, mantenha o campo em branco.
          </p>
        </div>

        <div className="repeatable-list">
          {formState.documentsAttached.map((document, index) => (
            <div key={`document-${index}`} className="repeatable-grid repeatable-grid--single">
              <label className="field">
                <span>Documento anexo</span>
                <input
                  type="text"
                  placeholder="Ex.: laudo, receita, negativa, foto, orçamento"
                  value={document}
                  onChange={(event) =>
                    updateStringList("documentsAttached", index, event.target.value)
                  }
                />
              </label>

              <button
                type="button"
                className="button-ghost inline-action inline-action--danger"
                onClick={() => removeStringListItem("documentsAttached", index)}
              >
                Remover
              </button>
            </div>
          ))}
        </div>

        <div className="repeatable-toolbar">
          <button
            type="button"
            className="button-ghost inline-action"
            onClick={() => addStringListItem("documentsAttached")}
          >
            Adicionar documento
          </button>
        </div>

        <div className="uploaded-documents-section">
          <div className="form-section-head form-section-head--compact">
            <h4>Arquivos enviados</h4>
            <p className="section-note">
              Anexe PDF, imagens ou documentos do caso. Estes arquivos serão vistos pelo humano na
              tela de revisão antes da liberação para os agentes.
            </p>
          </div>

          <label className="field">
            <span>Selecionar arquivos</span>
            <input
              type="file"
              accept="application/pdf,image/*,.doc,.docx"
              multiple
              onChange={handleUploadedDocumentsChange}
            />
          </label>

          {formState.uploadedDocuments.length > 0 ? (
            <div className="uploaded-documents-grid">
              {formState.uploadedDocuments.map((document, index) =>
                renderUploadedDocumentCard(document, () => removeUploadedDocument(index))
              )}
            </div>
          ) : (
            <p className="review-empty-state">
              Nenhum arquivo enviado ainda. Você pode continuar apenas com os documentos textuais.
            </p>
          )}
        </div>

        <div className="repeatable-list">
          {formState.witnesses.map((witness, index) => (
            <div key={`witness-${index}`} className="repeatable-grid repeatable-grid--single">
              <label className="field">
                <span>Testemunha</span>
                <input
                  type="text"
                  placeholder="Nome e contato"
                  value={witness}
                  onChange={(event) => updateStringList("witnesses", index, event.target.value)}
                />
              </label>

              <button
                type="button"
                className="button-ghost inline-action inline-action--danger"
                onClick={() => removeStringListItem("witnesses", index)}
              >
                Remover
              </button>
            </div>
          ))}
        </div>

        <div className="repeatable-toolbar">
          <button
            type="button"
            className="button-ghost inline-action"
            onClick={() => addStringListItem("witnesses")}
          >
            Adicionar testemunha
          </button>
        </div>
      </section>

      <section className="form-section-card">
        <div className="form-section-head">
          <p className="section-eyebrow">Pedidos</p>
          <h3>Pedido principal e pedido subsidiário</h3>
          <p className="section-note">
            Explique o que deve ser pedido primeiro e, se necessário, qual é o pedido alternativo.
          </p>
        </div>

        <label className="field">
          <span>Pedido principal</span>
          <textarea
            name="mainRequest"
            rows={5}
            maxLength={4000}
            placeholder="Ex.: tutela de urgência, custeio integral, reembolso, obrigação de fazer, internação, medicamento, cirurgia."
            value={formState.mainRequest}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, mainRequest: event.target.value }))
            }
          />
        </label>

        <label className="field">
          <span>Pedido subsidiário</span>
          <textarea
            name="subsidiaryRequest"
            rows={5}
            maxLength={4000}
            placeholder="Ex.: pedido alternativo caso o principal seja indeferido."
            value={formState.subsidiaryRequest}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, subsidiaryRequest: event.target.value }))
            }
          />
        </label>
      </section>

      <button type="submit" className="button-primary form-submit" disabled={isSubmitting}>
        {isSubmitting ? "Enviando parâmetros..." : "Enviar parâmetros para revisão humana"}
      </button>
    </form>
  );
}
