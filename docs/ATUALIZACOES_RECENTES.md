# Documentação das Atualizações Recentes — GBP Manager

> **Data:** 31 de Outubro de 2026  
> **Status:** Deploy em Produção (GitHub `master` e `main`)  
> **Último Commit:** `f9b3c3d`

---

## 1. Visão Geral das Demandas Atendidas

Neste ciclo de desenvolvimento, foram solucionados problemas críticos de publicação e upload de vídeos, refinada a geração de posts via inteligência artificial conforme as diretrizes do Google Meu Negócio, e adicionado um seletor visual com mapa interativo para otimização de geolocalização (GPS) em fotos.

Além disso, foi realizada a auditoria, renomeação para SEO e o agendamento integral de todo o acervo de vídeos e fotos de dois clientes-chave:
1. **Leveza do Pé | Podologia Sudoeste Brasília** (19 postagens agendadas até 16/12/2026).
2. **Podóloga em Votorantim | Claudia Rangel** (17 postagens agendadas até 09/12/2026).

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

## 3. Cronograma de Agendamento — Leveza do Pé (19 Posts)

Total de 19 postagens cobrindo de **03/11 a 16/12/2026** (segundas, quartas e sextas às 10h BRT), com foco em procedimentos podológicos, vídeos institucionais e carrosséis temáticos no Sudoeste de Brasília.

---

## 4. Cronograma de Agendamento — Claudia Rangel Podóloga (17 Posts)

Todos os 45 arquivos da pasta foram auditados, **renomeados no disco com palavras-chave de SEO Local** (*Votorantim, Sorocaba, Parque Bela Vista*), transferidos para o Supabase Storage e agendados:

| # | Data / Hora (BRT) | Formato | Tema do Post | Botão de Ação (CTA) |
| :-: | :--- | :---: | :--- | :--- |
| 1 | **02/11/2026 10h** | IMAGEM | Tratamento de Onicomicose | Saiba mais (WhatsApp) |
| 2 | **04/11/2026 10h** | VÍDEO | Alívio Imediato de Unha Encravada | Saiba mais (WhatsApp) |
| 3 | **06/11/2026 10h** | CARROSSEL | Tratamento de Onicomicose e Fungos *(4 fotos)* | Saiba mais (WhatsApp) |
| 4 | **09/11/2026 10h** | VÍDEO | Cuidados com Pés Diabéticos | Saiba mais (WhatsApp) |
| 5 | **11/11/2026 10h** | CARROSSEL | Conforto e Alívio da Pisada *(4 fotos)* | Saiba mais (WhatsApp) |
| 6 | **13/11/2026 10h** | VÍDEO | Tratamento de Calosidades e Fissuras | Saiba mais (WhatsApp) |
| 7 | **16/11/2026 10h** | CARROSSEL | Recuperação de Calcanhar Ressecado *(4 fotos)* | Saiba mais (WhatsApp) |
| 8 | **18/11/2026 10h** | VÍDEO | Biossegurança e Esterilização em Autoclave | Saiba mais (WhatsApp) |
| 9 | **20/11/2026 10h** | CARROSSEL | Regeneração e Correção de Unhas *(4 fotos)* | Saiba mais (WhatsApp) |
| 10 | **23/11/2026 10h** | VÍDEO | Estrutura e Acolhimento no Parque Bela Vista | Saiba mais (WhatsApp) |
| 11 | **25/11/2026 10h** | CARROSSEL | Autocuidado e Relaxamento Podal *(4 fotos)* | Saiba mais (WhatsApp) |
| 12 | **27/11/2026 10h** | CARROSSEL | Podologia Preventiva para Toda a Família *(4 fotos)* | Saiba mais (WhatsApp) |
| 13 | **30/11/2026 10h** | CARROSSEL | Saúde e Firmeza nos Passos *(3 fotos)* | Saiba mais (WhatsApp) |
| 14 | **02/12/2026 10h** | CARROSSEL | Técnicas Avançadas de Tratamento Podal *(4 fotos)* | Saiba mais (WhatsApp) |
| 15 | **04/12/2026 10h** | CARROSSEL | Alívio de Tensões e Dores nos Pés *(4 fotos)* | Saiba mais (WhatsApp) |
| 16 | **07/12/2026 10h** | CARROSSEL | Resultados e Recuperação da Saúde das Unhas *(2 fotos)* | Saiba mais (WhatsApp) |
| 17 | **09/12/2026 10h** | CARROSSEL | Pés Impecáveis para as Festas de Fim de Ano *(3 fotos)* | Saiba mais (WhatsApp) |

Todas as postagens estão estritamente alinhadas às políticas do Google Meu Negócio (textos de 350 a 600 caracteres, zero links/telefones soltos no texto e CTA direto para o WhatsApp `(15) 99186-7581`).
