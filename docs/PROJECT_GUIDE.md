# 📖 Guia Completo & Documentação Técnica — GBP Manager

Documentação técnica viva e guia de arquitetura da plataforma **GBP Manager**.

> 💡 **Dica:** Você também pode acessar a **Documentação Interativa** com validador de caracteres em tempo real e explorador de APIs diretamente pelo painel: [`http://localhost:3000/dashboard/docs`](http://localhost:3000/dashboard/docs).

---

## 🏛️ Arquitetura do Sistema

```
[ Frontend (Next.js 16 + Turbopack) ]
                 │
                 ├───> [ API Routes (/app/api/*) ]
                 │             │
                 │             ├───> [ Supabase (PostgreSQL + RLS) ]
                 │             │
                 │             ├───> [ Google Gemini Multi-Model AI ]
                 │             │
                 │             └───> [ Google Business Profile APIs ]
                 │                     ├── My Business API v4 (Posts, Fotos, Reviews)
                 │                     ├── Business Information v1 (Serviços, Atributos)
                 │                     └── Performance v1 (Métricas de Pesquisa)
                 │
[ Background Cron Worker ] ─────┘ (Agendador de Posts e Sincronização)
```

---

## 📏 Matriz de Regras de IA e Limites de Caracteres

O sistema adota limites de conformidade rigorosos para garantir que nenhuma requisição seja rejeitada pelas APIs do Google Meu Negócio:

| Tipo de Conteúdo | Limite Google (Hard) | Alvo Recomendado | Estrutura Exigida |
| :--- | :--- | :--- | :--- |
| **Postagens (Posts / Novidades)** | **1.500 caracteres** | **700 a 1.300 chars** (máx. 1.400) | Gancho inicial + Alerta de riscos caseiros + Procedimento detalhado com **3 termos técnicos** + Benefício + CTA direta. *Sem hashtags.* |
| **Itens de Serviços (Catálogo GBP)** | **300 caracteres** *(rejeita se passar)* | **200 a 280 chars** (máx. 295) | Resumo de alta conversão: Benefício direto + 2 a 3 termos técnicos + Contexto local + CTA curta (ex: "Agende sua avaliação!"). |
| **Produtos do Catálogo GBP** | **1.000 caracteres** | **400 a 800 chars** | Nome curto (máx. 58 chars), foto, preço regular e promocional comparativo, descrição persuasiva e botão CTA direto para WhatsApp ou site. |
| **Descrição da Empresa (Perfil)** | **750 caracteres** | **500 a 740 chars** | Nicho e cidade nos primeiros 250 chars. *Proibido URLs e telefones com DDD no texto.* |
| **Respostas a Avaliações (Reviews)** | 4.096 caracteres | **50 a 200 chars** | Agradecimento, personalização com nome do cliente, tom ajustado por nota (1 a 5 estrelas). |

---

## ⚡ Catálogo de APIs Principais

### Posts
- `POST /api/posts/generate`: Gera post individual ou lote temático com IA.
- `GET /api/posts`: Lista publicações e rascunhos.
- `POST /api/posts`: Cria, agenda ou publica post no Google Meu Negócio.

### Serviços
- `POST /api/clients/[id]/services/generate-ai`: Gera descrições de serviços individuais, em massa, por sugestão de nicho ou extraindo de lista de texto colada (`mode: 'single' | 'bulk' | 'suggest' | 'parse-raw'`).
- `PUT /api/clients/[id]/services`: Atualiza o catálogo completo de serviços na Google Business Information API.

### Produtos
- `GET /api/clients/[id]/products`: Lista produtos cadastrados no perfil da empresa.
- `PUT /api/clients/[id]/products`: Salva/atualiza produtos com fotos, preços e links de ação.
- `POST /api/clients/[id]/products/generate-ai`: Gera descrições de produtos até 1.000 chars, sugere mix de produtos para o nicho ou importa em lote de textos colados (`mode: 'single' | 'suggest' | 'parse-raw'`).

### SEO Local & Concorrentes
- `POST /api/clients/[id]/seo-audit`: Executa diagnóstico SEO completo com pontuação e plano de ação.
- `POST /api/clients/[id]/apply-seo`: Aplica descrição otimizada diretamente no Google e no Supabase.
- `GET /api/clients/[id]/competitors`: Analisa os principais concorrentes do Google Maps no nicho e região.

### Configurações & Documentação
- `GET /api/settings`: Retorna modelos Gemini suportados e status de conexão.
- `POST /api/settings`: Salva modelo ativo ou chave de API própria.
- `GET /api/docs`: Retorna metadados ao vivo, métricas do banco e estrutura do sistema.

---

## 🔄 Como Manter a Documentação Atualizada

A documentação interativa é alimentada por uma **Fonte Única da Verdade**:
- Arquivo central: [`lib/docs/project-docs.js`](file:///e:/LocalSend/Agentes/GBP/gbp-manager/lib/docs/project-docs.js)

Sempre que você ou um agente adicionar um novo endpoint, tabela ou regra de IA:
1. Adicione o item no array correspondente (`API_CATALOG`, `DATABASE_SCHEMA`, `AI_PROMPT_RULES` ou `LIVING_CHANGELOG`) em `lib/docs/project-docs.js`.
2. A tela do dashboard (`/dashboard/docs`), o endpoint `/api/docs` e os simuladores serão atualizados instantaneamente sem necessidade de retrabalho!
