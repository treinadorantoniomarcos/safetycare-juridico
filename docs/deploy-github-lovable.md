# Deploy GitHub + Lovable (SAFETYCARE)

## 1) Publicar no GitHub

No diretório do projeto:

```powershell
git add .
git commit -m "feat: dashboard operacional em tempo real + agentes + intake com email"
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```

Se o `origin` já existir:

```powershell
git remote set-url origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```

## 2) Conectar no Lovable

1. No Lovable, escolha **Import from GitHub**.
2. Selecione este repositório e a branch `main`.
3. Configure as variáveis de ambiente.

Variáveis mínimas obrigatórias:

```env
DATABASE_URL=postgresql://USUARIO:SENHA@HOST:5432/BANCO
DASHBOARD_AUTH_USER=treinadorantoniomarcos@gmail.com
DASHBOARD_AUTH_PASSWORD=Rose#1970
DASHBOARD_AUTH_SECRET=defina_um_segredo_forte
```

Opcional (proteção de rotas operacionais):

```env
OPERATIONS_API_KEY=defina_uma_chave_forte
```

## 3) Migrações de banco

Antes de subir em produção, rode:

```powershell
$env:DATABASE_URL="SUA_DATABASE_URL"
npm run db:migrate --workspace @safetycare/database
```

## 4) Verificações pós-deploy

- Login: `/painel-executivo/login`
- Dashboard online: `/painel-executivo`
- API live (sessão ativa): `/api/dashboard/operations-live`
- Stream SSE: `/api/dashboard/operations-live/stream`
- Tela de agentes: `/agentes`

## 5) Observações

- Sem `DATABASE_URL`, as rotas retornam `database_not_configured`.
- O dashboard usa SSE para atualização push em tempo real.
- Não versionar `.env` nem segredos.
