# Documentação das Atualizações Recentes — GBP Manager

> **Data:** 31 de Outubro de 2026  
> **Status:** Deploy em Produção (GitHub `master` e `main`)  
> **Último Commit:** `a03a1c3`

---

## 1. Visão Geral das Demandas Atendidas

Neste ciclo de desenvolvimento, foram solucionados problemas críticos de publicação e upload de vídeos, refinada a geração de posts via inteligência artificial conforme as diretrizes do Google Meu Negócio, e adicionado um seletor visual com mapa interativo para otimização de geolocalização (GPS) em fotos.

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

## 3. Histórico de Commits Recentes

| Commit | Mensagem | Resumo |
| :--- | :--- | :--- |
| `a03a1c3` | `feat(media): add interactive Leaflet map picker with draggable pin for photo GPS optimization` | Novo componente de mapa Leaflet, busca de endereço, arrasto de pino e card GBP |
| `4897d29` | `fix(upload): upload direto de videos e midias para Supabase Storage via signed URL` | Solução definitiva para erro 413 da Vercel com vídeos grandes |
| `7048f6b` | `fix: alinhamento da geracao de posts com diretrizes Google e fidelidade ao tema/titulo` | Correção dos prompts de IA sem telefones/links e com foco no título |
| `66e4557` | `fix: agendamento de posts com video, sync de descricao no Google e otimizacao GPS em fotos` | Ajustes de agendamento de posts e sincronização da descrição da ficha |

---

## 4. Sugestões de Próximos Passos para Continuidade

1. **Testes em Produção:**
   - Realizar o agendamento de um post com vídeo pesado (> 5 MB) e verificar a publicação.
   - Editar uma foto no painel de Mídias, arrastar o pino no mapa para um ponto exato e baixar a imagem processada para inspecionar os metadados EXIF via leitor de metadados.
2. **Geocodificação Reversa Automática:**
   - Opcionalmente, ao soltar o pino no mapa, disparar automaticamente uma consulta reversa no Nominatim para sugerir o nome do Bairro e Rua nos campos de metadados.
3. **Múltiplas Fotos em Lote (Batch Geotag):**
   - Permitir aplicar as mesmas coordenadas selecionadas no mapa para um conjunto de várias fotos de uma só vez.
