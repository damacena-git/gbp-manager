# Documentação das Atualizações Recentes — GBP Manager

> **Data:** 31 de Outubro de 2026  
> **Status:** Deploy em Produção (GitHub `master` e `main`)  
> **Último Commit:** `a03a1c3`

---

## 1. Visão Geral das Demandas Atendidas

Neste ciclo de desenvolvimento, foram solucionados problemas críticos de publicação e upload de vídeos, refinada a geração de posts via inteligência artificial conforme as diretrizes do Google Meu Negócio, e adicionado um seletor visual com mapa interativo para otimização de geolocalização (GPS) em fotos.

Além disso, foi realizada a auditoria e o agendamento integral de todo o acervo de vídeos e fotos da pasta do cliente **Leveza do Pé | Podologia Sudoeste Brasília**.

---

## 2. Detalhamento Técnico das Atualizações

### 2.1. Upload Direto de Mídias (Bypass do Erro 413 da Vercel)
* **Problema Original:** Ao enviar vídeos para agendamento de post, a API retornava o erro:  
  `Unexpected token 'R', "Request En"... is not valid JSON` (`413 Request Entity Too Large`).  
  As funções serverless da Vercel possuem um limite rígido de **4.5 MB** para o payload de requisições `POST`.
* **Solução Implementada:**
  - Criação da rota `/api/upload` no modo de emissão de **Signed Upload URL** do Supabase Storage.
  - Implementação de `lib/supabase/client-upload.js`: a mídia é enviada diretamente do navegador do usuário para o bucket do Supabase Storage via `PUT` binário (streaming), sem passar pelo corpo da requisição do servidor Next.js.
  - Suporte a fallback seguro quando a emissão de URLs assinadas não for suportada.
* **Arquivos Modificados:**
  - `app/api/upload/route.js`
  - `lib/supabase/storage.js`
  - `lib/supabase/client-upload.js`
  - `components/posts/PostModal.jsx`

---

### 2.2. Geração de Posts por IA Alinhada às Políticas do Google
* **Problema Original:** O conteúdo gerado por IA para postagens às vezes desviava do tema/título digitado pelo usuário e incluía elementos penalizados pelo algoritmo do Google.
* **Ajustes Realizados:**
  - **Fidelidade Temática:** O prompt agora trata a ideia/título fornecido pelo usuário como o tema central inegociável da postagem.
  - **Conformidade com Diretrizes do Google Meu Negócio:**
    - Proibição estrita de inclusão de números de telefone e URLs no corpo do texto (o Google exige o uso dos botões de ação nativos de CTA).
    - Redução/eliminação de excesso de hashtags genéricas (que poluem e reduzem engajamento no perfil).
    - Tom de voz profissional, local e persuasivo, com tamanho otimizado entre 350 e 700 caracteres.
* **Arquivos Modificados:**
  - `app/api/posts/generate/route.js`
  - `lib/ai/post-generator.js`

---

### 2.3. Seletor de Mapa Interativo para Geolocalização (GPS em Fotos)
* **Objetivo:** Permitir definir e ajustar as coordenadas GPS exatas do negócio clicando e arrastando um pino em um mapa interativo antes de salvar e subir as fotos.
* **Novo Componente:** `components/media/GpsMapPicker.jsx`
  - **Integração com Leaflet e OpenStreetMap:** Inicialização segura *client-side* compatível com SSR do Next.js sem quebra de compilação.
  - **Barra de Pesquisa de Endereço:** Consulta direta à API Nominatim com fallback para base de dados de cidades brasileiras (`BRAZIL_CITIES_COORDS`).
  - **Campos de Latitude e Longitude:** Editáveis manualmente ou atualizados instantaneamente ao arrastar o pino.
  - **Botão "Usar minha localização atual":** Captura instantânea via GPS do navegador.
  - **Pino SVG Personalizado:** Marcador azul de alta resolução com precisão na ponta (`iconAnchor: [17, 44]`).
  - **Card de Orientação GBP:** Quadro educativo exibindo os 5 passos para impulsionar o SEO Local da ficha através de dados EXIF.
* **Integração no Modal de Edição (`components/media/ImageEditorModal.jsx`):**
  - **Aba GPS Renovada:** Sincronização automática com dados da empresa, atalhos de cidades rápidas e injeção nos campos EXIF `Artist` e `Copyright`.
  - **Modo Expandido:** Botão para maximizar o mapa na área principal de visualização da foto para posicionamento de altíssima precisão.
  - **Selo Visual de EXIF:** Indicador na foto com as coordenadas que serão gravadas no momento da exportação.

---

## 3. Cronograma Completo de Agendamento — Leveza do Pé (19 Posts)

Todo o acervo de materiais foi auditado, carregado no Supabase Storage e programado:

| # | Data / Hora (BRT) | Tipo | Tema | CTA |
| :-: | :--- | :---: | :--- | :--- |
| 1 | **03/11/2026 10h** | VÍDEO | Psoríase na Unha | Saiba mais (WhatsApp) |
| 2 | **05/11/2026 10h** | VÍDEO | Unha Encravada & Alívio da Dor | Saiba mais (WhatsApp) |
| 3 | **09/11/2026 10h** | VÍDEO | Atendimento Podológico Humanizado | Saiba mais (WhatsApp) |
| 4 | **11/11/2026 10h** | VÍDEO | Regeneração da Lâmina / Descolamento | Saiba mais (WhatsApp) |
| 5 | **13/11/2026 10h** | VÍDEO | Estrutura & Tecnologia da Clínica | Saiba mais (WhatsApp) |
| 6 | **16/11/2026 10h** | VÍDEO | Cauterização de Verruga Plantar (HPV) | Saiba mais (WhatsApp) |
| 7 | **18/11/2026 10h** | CARROSSEL | Laserterapia na Podologia (5 fotos) | Saiba mais (WhatsApp) |
| 8 | **20/11/2026 10h** | VÍDEO | Cuidados Preventivos com os Pés | Saiba mais (WhatsApp) |
| 9 | **23/11/2026 10h** | VÍDEO | Higiene e Hidratação Podal | Saiba mais (WhatsApp) |
| 10 | **25/11/2026 10h** | CARROSSEL | Espaço & Acolhimento no Sudoeste (5 fotos) | Saiba mais (WhatsApp) |
| 11 | **27/11/2026 10h** | VÍDEO | Avaliação Podológica & Biossegurança | Saiba mais (WhatsApp) |
| 12 | **30/11/2026 10h** | VÍDEO | Tratamento de Calosidades & Sobrecarga | Saiba mais (WhatsApp) |
| 13 | **02/12/2026 10h** | VÍDEO | Fissuras & Calcanhares Rachados | Saiba mais (WhatsApp) |
| 14 | **04/12/2026 10h** | VÍDEO | Cuidados com Pés Diabéticos | Saiba mais (WhatsApp) |
| 15 | **07/12/2026 10h** | CARROSSEL | Procedimentos no Sudoeste (4 fotos) | Saiba mais (WhatsApp) |
| 16 | **09/12/2026 10h** | VÍDEO | Corte Correto das Unhas dos Pés | Saiba mais (WhatsApp) |
| 17 | **11/12/2026 10h** | VÍDEO | Calçados Confortáveis & Prevenção | Saiba mais (WhatsApp) |
| 18 | **14/12/2026 10h** | CARROSSEL | Pés Renovados para Festas de Fim de Ano (6 fotos) | Saiba mais (WhatsApp) |
| 19 | **16/12/2026 10h** | VÍDEO | Bastidores & Atendimento Dedicado | Saiba mais (WhatsApp) |

Todas as postagens contêm textos profissionais de 350 a 600 caracteres, menção geográfica estratégica (*Sudoeste, Edifício Lincoln Center, Brasília - DF*) e nenhum número de telefone ou link no corpo do texto, em estrita conformidade com as diretrizes do Google Business Profile.
