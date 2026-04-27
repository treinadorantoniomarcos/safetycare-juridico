# Requirements

## Functional

1. FR1: O sistema deve captar leads por WhatsApp, formulario web e site, registrando origem, dados basicos e relato inicial do caso.
2. FR2: O sistema deve solicitar e registrar consentimentos necessarios para tratamento de dados pessoais e dados sensiveis de saude antes de avancar para analises aprofundadas.
3. FR3: O agente de captacao deve resumir o relato inicial do usuario e identificar o tipo de problema informado.
4. FR4: O agente de triagem deve classificar o caso por categoria juridica, prioridade, urgencia, existencia de dano e potencial juridico.
5. FR5: O agente de jornada do paciente deve converter o relato em uma linha do tempo tecnica com eventos, datas aproximadas, decisoes medicas, intervencoes e pontos de risco.
6. FR6: O agente de analise clinica deve identificar sinais de atraso, falha de protocolo, ausencia de intervencao e outros indutores de risco, sem emitir diagnostico medico.
7. FR7: O agente de direitos do paciente deve avaliar possiveis violacoes relativas a informacao clara, consentimento informado, acesso a prontuario, continuidade do cuidado e seguranca do paciente.
8. FR8: O agente de prova deve identificar documentos existentes, documentos faltantes, pontos frageis e oportunidades de reforco probatorio.
9. FR9: O sistema deve gerar checklist documental por caso e classificar o nivel de robustez probatoria.
10. FR10: O agente de score juridico deve estimar chance de exito, valor potencial do caso e nivel de complexidade com base em dano, documentacao, falhas detectadas e parametros juridicos definidos pela operacao.
11. FR11: O sistema deve encaminhar casos de maior risco, alto valor ou baixa confianca para revisao humana obrigatoria antes de qualquer proposta comercial ou juridica.
12. FR12: O agente de conversao deve sugerir narrativa de fechamento, abordagem emocional e tecnica, e proximo passo comercial recomendado.
13. FR13: O sistema deve registrar cada caso em uma base operacional contendo cliente, jornada, documentos, analises, score, status comercial e status juridico.
14. FR14: O modulo de execucao deve apoiar a producao de pecas juridicas, notificacoes e liminares a partir de modelos e dados estruturados do caso, sempre com revisao humana antes do uso externo.
15. FR15: O sistema deve controlar prazos, pendencias documentais, andamento do caso e alertas operacionais.
16. FR16: O agente de cliente deve suportar atualizacoes de status, solicitacoes documentais e comunicacao recorrente com clientes ativos.
17. FR17: O agente de growth deve consolidar metricas de funil, conversao, tipo de caso, ticket medio e ROI por canal.
18. FR18: O dashboard operacional deve exibir em tempo real indicadores de captacao, qualificacao, conversao, financeiro, execucao e inteligencia.
19. FR19: O sistema deve manter trilha de auditoria das entradas recebidas, classificacoes feitas por agentes, intervencoes humanas e artefatos gerados.
20. FR20: O sistema deve permitir override humano em qualquer etapa critica do fluxo, com justificativa registrada.

## Non Functional

1. NFR1: O sistema deve operar em conformidade com a LGPD, com controles de acesso, base legal, consentimento e minimizacao de dados.
2. NFR2: Nenhum agente pode emitir diagnostico medico ou decisao juridica definitiva; o produto deve se posicionar como apoio tecnico-operacional com validacao humana.
3. NFR3: O sistema deve enviar resposta inicial automatica ao lead em ate 2 minutos e concluir triagem preliminar em ate 30 minutos para casos prioritarios.
4. NFR4: O sistema deve garantir rastreabilidade de ponta a ponta, incluindo prompts, entradas, saidas, versoes de modelos e acao humana relevante.
5. NFR5: O sistema deve suportar no minimo 800 leads por mes no horizonte de escala descrito, sem degradacao critica do tempo de resposta.
6. NFR6: O armazenamento de documentos deve usar criptografia em repouso e em transito.
7. NFR7: O produto deve adotar arquitetura observavel, com logs, metricas e alertas suficientes para diagnosticar gargalos operacionais e falhas de automacao.
8. NFR8: O sistema deve registrar niveis de confianca ou criterios de escalonamento quando a analise automatica for inconclusiva.
9. NFR9: A interface operacional deve ser responsiva e utilizavel em desktop e mobile web.
10. NFR10: O sistema deve permitir configuracao evolutiva de novos modulos de caso sem exigir redesenho completo da arquitetura.
11. NFR11: O produto deve seguir modelo de human-in-the-loop para etapas de decisao comercial sensivel, producao juridica externa e acao processual.
12. NFR12: O custo operacional por lead processado deve ser monitoravel para permitir otimizacao de ROI por canal e por modulo.
