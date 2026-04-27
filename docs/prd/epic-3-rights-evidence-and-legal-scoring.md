# Epic 3 Rights, Evidence and Legal Scoring

Objetivo: Converter a narrativa estruturada em capacidade de decisao. Ao final deste epic, a operacao deve conseguir avaliar direitos do paciente, robustez probatoria e viabilidade juridica inicial, separando melhor os bons casos dos casos ruins.

## Story 3.1 Patient Rights Assessment

As a operador juridico,
I want receber uma avaliacao estruturada dos direitos do paciente possivelmente violados,
so that eu consiga orientar a tese inicial do caso.

### Acceptance Criteria

1. O agente analisa os cinco eixos prioritarios de direitos definidos no PRD.
2. Cada eixo retorna status e justificativa tecnica.
3. O resultado pode ser ajustado manualmente antes do score final.
4. A avaliacao integra a visao consolidada do caso.

## Story 3.2 Evidence Builder and Documentary Gap Mapping

As a equipe de prova,
I want uma checklist documental e mapa de lacunas,
so that eu saiba o que falta para fortalecer o caso.

### Acceptance Criteria

1. O sistema lista documentos existentes e faltantes por caso.
2. O agente identifica pontos frageis e oportunidades de reforco probatorio.
3. O caso recebe um nivel de robustez probatoria.
4. A checklist pode ser enviada ao cliente para coleta complementar.

## Story 3.3 Legal Viability Score and Human Review Gate

As a responsavel comercial ou juridico,
I want um score inicial de viabilidade, valor e complexidade,
so that eu saiba se vale avancar, revisar ou descartar.

### Acceptance Criteria

1. O score retorna chance de exito, valor estimado e complexidade.
2. O motor considera dano, documentacao e sinais de falha.
3. Casos acima de limiares definidos ou de baixa confianca exigem revisao humana.
4. O racional minimo do score fica disponivel para auditoria.
