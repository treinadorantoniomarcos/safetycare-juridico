# External APIs

## WhatsApp Cloud API

- **Purpose:** receber e enviar mensagens do canal principal de captacao.
- **Documentation:** https://developers.facebook.com/docs/whatsapp
- **Base URL(s):** `https://graph.facebook.com`
- **Authentication:** bearer token de app/system user
- **Rate Limits:** conforme limites da Meta por numero e tier de negocio

**Key Endpoints Used:**
- `POST /v20.0/{phone-number-id}/messages` - envio de mensagens
- `GET /v20.0/{phone-number-id}` - metadados do numero
- `POST /webhook` - recebimento de eventos via endpoint proprio

**Integration Notes:** validar assinatura do webhook, normalizar mensagens e armazenar payload bruto para auditoria.

## Supabase Platform API

- **Purpose:** dados, autenticacao interna e armazenamento documental.
- **Documentation:** https://supabase.com/docs
- **Base URL(s):** projeto Supabase
- **Authentication:** anon key, service role key e JWT do auth interno
- **Rate Limits:** gerenciados pelo plano contratado

**Key Endpoints Used:**
- `POST /rest/v1/*` - operacoes de dados quando aplicavel
- `POST /storage/v1/object/*` - upload e acesso a arquivos
- `POST /auth/v1/*` - autenticacao de usuarios internos

**Integration Notes:** service role apenas no worker/backend; app web usa sessao autenticada com RLS.

## n8n / Make

- **Purpose:** automacoes auxiliares, roteamentos externos e notificacoes operacionais.
- **Documentation:** ambiente interno do projeto
- **Base URL(s):** instancia configurada
- **Authentication:** webhook signing + API key quando aplicavel
- **Rate Limits:** dependem do plano/infra

**Key Endpoints Used:**
- `POST /webhook/safetycare/lead-received` - automacao de intake
- `POST /webhook/safetycare/case-updated` - sincronizacao de eventos

**Integration Notes:** n8n/Make nao substituem o orquestrador central; atuam como camada de integracao e notificacao.
