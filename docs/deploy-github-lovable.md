# Deploy GitHub + Lovable (SAFETYCARE)

## 1) Estado atual do projeto

- Branch atual: `main`
- Ultimo commit: `78b5b26`
- Dashboard em tempo real com SSE: pronto
- Login do painel: pronto
- Endpoints de agentes e dashboard: prontos

## 2) Publicar no GitHub

No diretorio do projeto:

```powershell
git status
git remote -v
```

Se ainda nao existir `origin`:

```powershell
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```

Se `origin` ja existir:

```powershell
git remote set-url origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```

## 3) Conectar no Lovable

1. Abrir Lovable.
2. Escolher **Import from GitHub**.
3. Selecionar este repositorio e a branch `main`.
4. Configurar variaveis de ambiente.

Variaveis minimas obrigatorias:

```env
DATABASE_URL=postgresql://USUARIO:SENHA@HOST:5432/BANCO
DASHBOARD_AUTH_USER=treinadorantoniomarcos@gmail.com
DASHBOARD_AUTH_PASSWORD=Rose#1970
DASHBOARD_AUTH_SECRET=defina_um_segredo_forte
```

Opcional (seguranca adicional para endpoints operacionais):

```env
OPERATIONS_API_KEY=defina_uma_chave_forte
```

## 4) Banco de dados (obrigatorio)

Sem `DATABASE_URL`, o sistema retorna:

- `database_not_configured`
- `Missing required environment variable: DATABASE_URL`

Executar migracoes antes de publicar em producao:

```powershell
$env:DATABASE_URL="SUA_DATABASE_URL"
npm run db:migrate --workspace @safetycare/database
```

## 5) Checklist de validacao apos deploy

- Login do painel: `/painel-executivo/login`
- Dashboard online: `/painel-executivo`
- API dashboard live: `/api/dashboard/operations-live`
- Stream SSE: `/api/dashboard/operations-live/stream`
- Tela de agentes: `/agentes`

## 6) Proximo passo recomendado

Trocar polling por push total (WebSocket/SSE dedicado por canal de agente), mantendo fallback HTTP para resiliencia.
