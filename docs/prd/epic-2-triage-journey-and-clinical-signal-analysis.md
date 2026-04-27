# Epic 2 Triage, Journey and Clinical Signal Analysis

Objetivo: Transformar relatos desorganizados em informacao operacionalmente util. Ao final deste epic, a operacao deve conseguir classificar o tipo de caso, montar a jornada do paciente e destacar sinais clinicos relevantes sem extrapolar para diagnostico medico.

## Story 2.1 Automated Case Triage

As a analista de triagem,
I want receber classificacao inicial de tipo de caso, urgencia e prioridade,
so that eu consiga focar primeiro nos casos mais promissores ou criticos.

### Acceptance Criteria

1. O agente de triagem retorna categoria, urgencia, dano e potencial juridico em formato estruturado.
2. Casos criticos ou de alta prioridade sao destacados para resposta acelerada.
3. O resultado da triagem pode ser revisado manualmente.
4. O sistema registra confianca ou justificativa da classificacao.

## Story 2.2 Patient Journey Timeline Builder

As a advogado ou analista,
I want ver a jornada do paciente em timeline tecnica,
so that eu entenda rapidamente a narrativa e os pontos de risco.

### Acceptance Criteria

1. O agente de jornada extrai eventos, datas aproximadas, decisoes medicas e intervencoes.
2. Eventos criticos podem ser marcados com risco.
3. A timeline fica persistida e editavel por humano.
4. O sistema preserva referencia ao relato original usado para montar a timeline.

## Story 2.3 Clinical Signal Analysis Without Diagnosis

As a equipe juridica,
I want identificar sinais de falha clinica sem emitir diagnostico,
so that a analise avance com seguranca e foco juridico-operacional.

### Acceptance Criteria

1. O agente aponta possiveis atrasos, falhas de protocolo e ausencias de intervencao.
2. A saida deixa explicito que nao se trata de diagnostico medico.
3. Casos inconclusivos sao marcados para revisao humana.
4. Os sinais detectados ficam vinculados a eventos especificos da jornada.
