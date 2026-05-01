# GestãoPro — Sistema de Gerenciamento Empresarial

Sistema estilo Notion com design minimalista e tons de azul.

## Stack
- **Frontend**: React 18 + Vite + TypeScript + Material-UI
- **Backend**: Node.js + Express + TypeScript
- **Banco de dados**: Supabase (PostgreSQL gratuito)
- **Auth**: Supabase Auth (Email/Senha)

## Módulos
- Dashboard com gráficos e KPIs
- CRM (Contatos)
- Finanças (Receitas e Despesas)
- Gerenciamento de Tarefas (Kanban)
- Metas (Curto/Médio/Longo prazo + Missão/Visão/Valores)
- Serviços, Calendário, Métricas (em desenvolvimento)

## Setup

### 1. Criar projeto no Supabase
1. Acesse supabase.com e crie um projeto gratuito
2. Copie a **Project URL** e as chaves de API (Settings > API)

### 2. Configurar Frontend
```bash
cd frontend
cp .env.example .env
# Edite .env com suas chaves do Supabase
npm install
npm run dev
```

### 3. Configurar Backend
```bash
cd backend
cp .env.example .env
# Edite .env com suas credenciais
npm install
npm run db:generate
npm run dev
```

### Variáveis de ambiente obrigatórias

**frontend/.env**
```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
VITE_API_URL=http://localhost:3001
```

**backend/.env**
```
DATABASE_URL=postgresql://postgres:[senha]@db.[projeto].supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[senha]@db.[projeto].supabase.co:5432/postgres
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
FRONTEND_URL=http://localhost:5173
```

## Scripts

```bash
# Frontend (porta 5173)
cd frontend && npm run dev

# Backend (porta 3001)
cd backend && npm run dev

# Sincronizar banco com schema Prisma
cd backend && npm run db:push

# Visualizar banco no browser
cd backend && npm run db:studio
```
