# 🚀 GBP Manager — Gestão Automatizada do Google Meu Negócio

Plataforma inteligente multi-tenant para agências e profissionais gerenciarem múltiplos perfis do **Google Meu Negócio (Google Business Profile)** de forma automatizada, utilizando **Inteligência Artificial (Google Gemini)** para geração de postagens, respostas automáticas a avaliações e agendamento contínuo.

---

## ✨ Funcionalidades Principais

| Módulo | Descrição |
|---|---|
| **👥 Multi-Cliente** | Conecte e gerencie múltiplos perfis/locais do Google Meu Negócio em uma única conta. |
| **🔐 OAuth Google** | Conexão segura via fluxo OAuth 2.0 oficial com armazenamento e renovação automática de refresh tokens. |
| **🤖 Posts com IA (Gemini)** | Criação de postagens temáticas (novidades, ofertas, eventos) com tom de voz e CTA configuráveis. |
| **📅 Agendador de Posts** | Planejamento de publicações com execução automática periódica via cron job. |
| **⭐ Gestão de Reviews com IA** | Sugestões inteligentes e contextualizadas de respostas para avaliações positivas, neutras e negativas. |
| **📸 Galeria de Fotos** | Gestão de fotos por categorias (fachada, interior, produtos, equipe) com dicas de SEO local. |
| **🛍️ Catálogo de Produtos** | Vitrine de produtos no Google Meu Negócio com fotos, promoções, descrições até 1.000 chars e CTA direto para WhatsApp. |
| **📊 Analytics & Métricas** | Painel visual com visualizações de busca, cliques para ligação, rotas solicitadas e acessos ao site. |
| **📖 Documentação Interativa** | Portal vivo em `/dashboard/docs` com validador de caracteres em tempo real, catálogo de APIs e arquitetura. |

---

> 📘 **Acesse o Guia Completo:** Consulte [`docs/PROJECT_GUIDE.md`](docs/PROJECT_GUIDE.md) ou acesse diretamente pelo dashboard na rota [`/dashboard/docs`](http://localhost:3000/dashboard/docs).

## 🛠️ Stack Tecnológica

- **Framework**: [Next.js 16 (App Router + Turbopack)](https://nextjs.org/)
- **Linguagem**: JavaScript (ES6+) / React 19
- **Estilização**: CSS Modules / Vanilla CSS com Glassmorphism & Dark Mode
- **Banco de Dados & Auth**: [Supabase](https://supabase.com/) (PostgreSQL + Auth + RLS)
- **APIs do Google**: `googleapis` (My Business Account Management, Business Information, Business Quality)
- **IA**: `@google/generative-ai` (Google Gemini 1.5 Pro / Flash)
- **Ícones**: `lucide-react`

---

## 📁 Estrutura do Projeto

```
gbp-manager/
├── app/
│   ├── api/
│   │   ├── auth/google/          # Início do fluxo OAuth Google
│   │   ├── auth/google/callback/ # Callback OAuth e troca de tokens
│   │   ├── clients/              # CRUD de clientes e listagem de locais
│   │   ├── cron/                 # Endpoint de execução de tarefas agendadas
│   │   ├── metrics/              # Obtenção de métricas dos clientes
│   │   ├── posts/                # CRUD de posts e publicação imediata
│   │   ├── posts/generate/       # Geração de conteúdo com Gemini
│   │   ├── reviews/              # Listagem e resposta a avaliações
│   │   └── reviews/suggest-reply/# Sugestão de resposta com Gemini
│   ├── dashboard/
│   │   ├── analytics/            # Painel analítico com gráficos e KPIs
│   │   ├── clients/              # Listagem e gestão de clientes
│   │   ├── clients/[id]/         # Detalhe do cliente (overview, posts, serviços, produtos, fotos)
│   │   ├── products/             # Gestão global de produtos e vitrine do Google
│   │   ├── photos/               # Gestão e envio de fotos
│   │   ├── posts/                # Editor e agendador de posts com IA
│   │   ├── reviews/              # Central de avaliações e respostas com IA
│   │   ├── layout.js             # Layout com sidebar e header do dashboard
│   │   └── page.js               # Visão geral do painel principal
│   ├── globals.css               # Design system e tokens de estilo
│   ├── layout.js                 # Layout raiz da aplicação
│   └── page.js                   # Página de Login / Boas-vindas
├── lib/
│   ├── google/
│   │   ├── auth.js               # Cliente OAuth2 e gerenciamento de tokens
│   │   └── gbp-service.js        # Chamadas à Google Business Profile API
│   ├── ai/
│   │   └── gemini-service.js     # Integração com Gemini (posts e reviews)
│   ├── scheduler/
│   │   └── cron-service.js       # Processamento de posts e reviews agendados
│   └── supabase/
│       ├── client.js             # Supabase Browser Client
│       └── server.js             # Supabase Server Client
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql # Schema do banco com tabelas, RLS e índices
└── .env.example                  # Modelo de variáveis de ambiente
```

---

## 🚀 Como Configurar e Executar

### 1. Pré-requisitos

- Node.js 18+ instalado
- Projeto criado no [Supabase](https://supabase.com/)
- Chave de API do [Google AI Studio](https://aistudio.google.com/)
- Projeto no [Google Cloud Console](https://console.cloud.google.com/)

---

### 2. Configurando o Banco de Dados (Supabase)

1. Acesse o **SQL Editor** no painel do seu projeto Supabase.
2. Copie o conteúdo do arquivo `supabase/migrations/001_initial_schema.sql`.
3. Cole e execute o script SQL para criar as tabelas (`clients`, `posts`, `reviews`, `metrics`, `cron_jobs`) com as devidas políticas de segurança (RLS).

---

### 3. Configurando a API do Google Cloud

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie ou selecione um projeto.
3. Ative as seguintes APIs:
   - **Google My Business API**
   - **My Business Account Management API**
   - **My Business Business Information API**
4. Configure a **Tela de Consentimento OAuth (OAuth Consent Screen)**:
   - Adicione os escopos:
     - `https://www.googleapis.com/auth/business.manage`
     - `openid`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
5. Crie credenciais do tipo **ID do cliente OAuth**:
   - Tipo de aplicativo: **Aplicativo da Web**
   - URIs de redirecionamento autorizados: `http://localhost:3000/api/auth/google/callback` (em produção: `https://seudominio.com/api/auth/google/callback`)
6. Copie o `Client ID` e o `Client Secret`.

---

### 4. Configuração das Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto baseado no `.env.example`:

```bash
cp .env.example .env.local
```

Preencha com seus dados:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui

# Google OAuth (Google Cloud Console)
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Google Gemini AI
GEMINI_API_KEY=sua-gemini-api-key

# Cron Job Secret
CRON_SECRET=um-token-secreto-para-proteger-o-endpoint-cron
```

---

### 5. Instalação e Execução

```bash
# Instalar dependências (caso ainda não tenha feito)
npm install

# Iniciar o servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## ⏰ Automação & Cron Jobs

Para processar posts agendados e sincronizar reviews/métricas periodicamente, acione o endpoint `/api/cron` via requisição `GET` com o header de autorização:

```bash
curl -X GET http://localhost:3000/api/cron \
  -H "Authorization: Bearer SEU_CRON_SECRET"
```

### Configurando no Vercel (opcional):
Crie um arquivo `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 * * * *"
    }
  ]
}
```

---

## 🛡️ Segurança

- As chaves de acesso e refresh tokens do Google são armazenados de forma isolada no banco de dados.
- O acesso a cada cliente e post é restrito ao respectivo usuário via **Row Level Security (RLS)** do PostgreSQL.
- O endpoint de cron é protegido por token secreto de autenticação Bearer.
