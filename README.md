# CRM de Leads e Vendas para Infoprodutos

Sistema completo para controle de leads e vendas de cursos digitais e físicos, com sistema de pontuação inteligente para entender a "temperatura" do relacionamento com cada cliente.

## 🚀 Stack Tecnológica

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript
- **Banco de Dados:** Supabase (PostgreSQL)
- **Autenticação:** Supabase Auth
- **WhatsApp:** Evolution API
- **Deploy:** Docker (EasyPanel-ready)

## 📦 Instalação

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta Supabase (https://supabase.com)

### 1. Clone e instale dependências

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

### 2. Configure as variáveis de ambiente

**Frontend** (`frontend/.env`):
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
VITE_API_URL=http://localhost:3001/api
```

**Backend** (`backend/.env`):
```env
PORT=3001
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua-service-role-key

# Evolution API (opcional)
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua-api-key
EVOLUTION_INSTANCE=nome-da-instancia
```

### 3. Configure o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Execute o SQL de criação das tabelas (ver dashboard SQL)
3. Configure as RLS policies para as tabelas
4. Copie a URL e as chaves para os arquivos `.env`

### 4. Crie o primeiro usuário

1. Use a página de login para criar um novo usuário
2. No painel do Supabase, atualize o campo `role` do usuário para `master`

### 5. Execute o projeto

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Acesse: http://localhost:5173

## 🐳 Deploy com Docker

```bash
# Build e execução
docker-compose up --build

# Acesse em http://localhost
```

## 📋 Funcionalidades

- ✅ Autenticação com níveis Master/Viewer
- ✅ Dashboard com métricas e gráficos
- ✅ Gestão de Leads com timeline
- ✅ Gestão de Produtos
- ✅ Histórico de Vendas
- ✅ Sistema de Pontuação e Temperatura
- ✅ Importação de CSV (Hotmart/Kiwify/WordPress)
- ✅ Oportunidades de Recuperação
- ✅ Webhook para conversões
- ✅ Sistema de Notificações
- ✅ Mensagens em Massa via WhatsApp (Evolution API)

## 📊 Sistema de Pontuação

| Faixa de Preço | Pontos | Com Bônus Recorrente |
|----------------|--------|----------------------|
| Até R$97 | 10 pts | 15 pts |
| R$98 - R$297 | 25 pts | 37 pts |
| R$298 - R$497 | 50 pts | 75 pts |
| R$498 - R$997 | 100 pts | 150 pts |
| Acima de R$997 | 200 pts | 300 pts |

## 🌡️ Temperatura

- 🔥 **Quente:** comprou nos últimos 30 dias OU pontos > 200
- 🟡 **Morno:** comprou nos últimos 90 dias OU pontos 50-200
- 🔵 **Frio:** comprou nos últimos 180 dias OU pontos 10-49
- ❄️ **Inativo:** +180 dias sem compra OU pontos < 10

## 📝 Licença

MIT
