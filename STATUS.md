# YZap Mobile — estado atual

> Última atualização: 2026-10-02 · Branch API: `mobile/api-lojista` · App: `main`

## Repositórios

| Projeto | Local | Repo/branch | Papel |
|---|---|---|---|
| API (Laravel 13, PHP 8.3) | `/home/arthur/acessodesign/yzap` | `mobile/api-lojista` → PR para `develop` | Serve o app; web inalterado |
| App (Ionic 9 + Vue 3.5 + Capacitor 8) | `/home/arthur/acessodesign/yzap-app` | `main` | Lojista no celular; repo próprio |

Ordem de merge: API primeiro (`mobile/api-lojista` → `develop`), depois app (`fase/*` → `main`).

## API — pronta (73 rotas em `https://yzap.com.br/api/mobile/v1`)

- Grupo 1 ✅ Auth/sessão: login, Google (`id_token`), refresh, logout, `/me`, senha — tokens com abilities, sem expiração
- Grupo 2 ✅ Loja: store, settings (+logo/cover S3), horários, equipe, escopo super-admin via `X-Store-Id`
- Grupo 3 ✅ Clientes: CRUD + lookup por telefone
- Grupo 4 ✅ Admin: stores, users, plans (só `mobile:admin`)
- Grupo 5 ✅ Billing: plans, checkout (só `{checkout_url, payment_id}`, browser externo), status — webhook única fonte de verdade
- Grupo 6 ✅ Operacional: orders (+polling), products (+estoque, variantes, imagens), categories, stock, finance, cash
- Grupo 7 ✅ Maps: GET/PUT `/maps` (área de atendimento, gating `delivery_maps` + plano pago)
- Contrato formal: `docs/mobile-api-contrato.md` (grupos 1–7 ✅, base `https://yzap.com.br`)
- Decisões: MP sempre externo; `stock`×`finance` resolvido (mobile usa `stock`); reset de senha revoga tokens do app
- Spike visual (gabarito do app): rota local `/preview/ionic` — 404 em produção

## App — features reais por grupo (zero "em breve")

Nenhuma tela de placeholder existe: sem API, a rota simplesmente não existe
(`ComingSoonPage`/`/em-breve` removidos). Itens sem permissão SOMEM do menu;
403 de plano (`PlanBlockedPage`) × 403 de permissão (`ForbiddenPage`) são telas distintas.

| Commit | Grupo | O que ficou REAL |
|---|---|---|
| `457779b` | ui | Shell/sidebar fiel ao spike (232px, itens 1 linha), dark/light persistido (`yz-theme`), tokens/`app.css`, AppBar/PageHead, dashboard com dados reais (`/categories`, `/products`, `/orders/notifications`), perfil (troca de senha + logout-all), cliente HTTP + `useList`/`errors` |
| `3e01ecf` | 2 | Configurações da loja (JSON PUT escalares + multipart só p/ logo/capa com verificação, link-suggestions, horários 7 dias) + equipe (CRUD, permissões, toggle `is_active` sempre enviado) |
| `1272b4e` | 3 | Clientes: lista paginada + busca + infinite scroll, lookup por telefone (404 → cadastro pré-preenchido), detalhe com stats/pedidos, CRUD com 422 por campo |
| `5b78fc2` | 5 | Planos/assinatura: preços/períodos/limites/benefícios, checkout → `Browser.open(checkout_url)` + polling 5s de `/billing/status/{payment}` + retomada via deeplink (`/billing/return` só navega; ativação é do webhook) |
| `1f09540` | 4 | Admin (`mobile:admin`): lojas (lista/detalhe PATCH multipart), usuários (ativar, grant-access com plano/período), planos (CRUD, `free` sem preços) |
| `2789c5c` | 6 | Operacional: **pedidos** (scopes abertos/concluídos/cancelados/todos, status, busca, polling `/orders/notifications` com aviso de pedido novo, 7 status via PATCH + `Idempotency-Key`, confirmação em cancelar), **produtos** (lista/filtros, cadastro multipart POST, edição JSON PUT, imagens com principal/remoção, estoque rápido, variantes somente leitura), **categorias** (CRUD + reorder), **estoque** (saldos, filtros baixos/zerados com contadores do meta, ajuste com `Idempotency-Key` → movimento imutável), **financeiro** (fluxo por período, receita com summary, despesas CRUD + cancel com idempotência, 10 categorias do painel), **caixa** (abrir/lançar movimento/fechar com idempotência, breakdown) |
| `e8157f7` | ui-fixes | Bugs confirmados corrigidos: (1) sidebar 232px + `nowrap/ellipsis` sem badges "em breve" (sem permissão some, sem placeholder); (2) tab-bar fixa no bottom com safe-area + aba ativa destacada (sem `ion-tabs` o `slot="bottom"` não fixava); (3) auditoria de contraste light/dark (`--ion-text-color`/`--yz-muted`/`--yz-bg` por tema, `--yz-card` como alias de `--ion-card-background`, logo do login invertido no dark); (4) fidelidade ao spike (`--background` do toolbar por tema, títulos com cor do tema, 48px Copiar/Abrir, QR/Abrir via `public_url` real `https://yzap.com.br/loja/<slug>`) |
| `b667af0` | login | Wordmark `horizontal.png` centralizada acima do form + título/sub centralizados (inversão dark segue a mesma regra do sidebar via `.login-logo` em `app.css`) |
| `16c3312` | ui | Ações `secondary`/`tertiary` viram verde da marca (`primary` #087f6f): dashboard (categorias, pedidos); badge "gratuito" vira `medium` (igual ao chip "Grátis" da assinatura). Roxo MANTIDO com semântica própria: badges de status `preparing`/`ready` (7 status pedem 7 cores distintas; demais cores Ionic já ocupadas) e `chip-violet` do ticket médio (azul/verde ocupados, âmbar/vermelho têm semântica de alarme) — light/dark via cores Ionic + override dark existente |
| `b56e8a8` | 7 | Configurações em abas (`ion-segment` + `?tab=`): **Identidade** (dados/imagens/horários, como antes), **Atendimento** (`MapsPanel`: toggles retirada/entrega/limite-por-raio, raio slider+numero 0,1–100, origem + "usar endereço da loja" que salva sem coords p/ geocodificar no servidor, badge derivada, aviso limpo sem Maps, `geocode_warning`, círculo do raio em CSS + texto — mapa nativo segue fase futura; 403 plano vira upgrade inline, 403 sem plan vira "sem permissão"; após salvar endereço em Identidade, a aba recarrega), **Equipe** (só titular; `TeamPanel` extraído de `TeamPage` e reutilizado na rota `/equipe`) |
| `64dd18d` | ui | Pedidos: abas de scope legíveis — `ion-segment` (truncava `ABERT...`/`CONC...`/`CANC...`) virado em `tablist` com rolagem horizontal no mobile e distribuição total no desktop; rótulos completos **Aberto, Concluído, Cancelado, Todos** (scopes exatos de `GET /orders`; API sem contadores por scope); `role=tab` + `aria-selected` + foco visível + alvo 44px; contraste auditado light/dark |
| `54858b6` | ui | Uploads padronizados: **`FileUploader.vue`** em todos os pontos existentes (logo/capa nas settings, imagem no form de produto, galeria no detalhe, logo no admin da loja, comprovante na despesa) — dropzone desktop + toque mobile, preview atual/nova, trocar/remover, progresso real (`api.upload` + `onProgress` via XHR), validação igual ao painel (logo 3 MB, produto 4 MB, capa 5 MB, comprovante JPG/PNG/PDF 5 MB), recorte opcional **CropperJS 1.6.2** (mesma lib/versão do web via npm; logo 800px, produto 1200px, JPEG 0.9, "manter original"; capa/comprovante sem recorte como no painel), 422 por campo, light/dark |
| `41078b3` | 8–10 | Settings espelhando o painel (`settings-tabs.blade.php`): abas **Configurações, Temas, WhatsApp, Banners, Capa, Atendimento** (+ Equipe do titular) em `ion-segment` rolável com `?tab=` — `src/api/{appearance,notifications,whatsapp}.ts` (grupos 8–10, zero mock). **Temas**: catálogo + aplicar (422 `food` fora do segmento), custom HTML/CSS 256 KB com mesma validação + checagem de integridade. **Banners**: CRUD + hero via `FileUploader` (5 MB, sem recorte); PUT envia sempre `is_active` (backend booleaniza ausente). **Capa**: upload S3 com checagem de integridade (logo ficou em Configurações — sem duplicar envio). **WhatsApp**: status + `sync-qr` com polling 5s igual ao `whatsapp.js` do painel (pausa oculta, para ao conectar, esconde QR; token nunca exibido) + mensagens automáticas (toggles por status + tags com inserção no cursor). Gating: `store_theme`/`notifications`/`delivery_maps` escondem a aba; 403 de plano vira upgrade inline |
| `c2562fa` | editor | **Editor rico nos produtos**: `RichTextEditor.vue` (**TipTap 3** MIT: StarterKit H1–H2 + Underline + Link http(s) + Placeholder) no lugar do textarea de `ProductFormPage` (payload inalterado — HTML vai em `description`; demais textareas seguem plain-text como no web). Paridade com a toolbar do CKEditor 4 (`products/form.js` ~l.242: Bold/Italic/Underline/RemoveFormat, listas, títulos, Link/Unlink); barra de link inline (sem `prompt`), botões ≥40px com rolagem, `aria-pressed`, light/dark por vars. Detalhe renderiza via `.rich-text` global (`app.css`); sanitização final no servidor |
| `destinos-1:1` | nav | **Destinos 1:1 com o web (auditoria `rocker.blade.php` + `settings-tabs.blade.php`):** **Conexão WhatsApp** (`?tab=whatsapp`, `WhatsappPanel` só conexão/QR) × **Notificações** (`?tab=notificacoes`, `NotificationsPanel` standalone com `denied` emitido p/ esconder a aba em 403 de permissão) — antes fundidos no mesmo painel; links cruzados entre as abas + watcher de `route.query.tab` (navega sem reload). Rótulos iguais ao web ("Conexão WhatsApp", "Área de atendimento"). Sino do dashboard vira **"Pedidos recentes" + "Ver todos"** (igual ao dropdown do web), sem confundir com a configuração de notificações. Banners × Capa já eram abas próprias (sem mudança). Sem API → sem destino (justificativas): Mercado Pago da loja, Afiliados, Guia, WooCommerce, WhatsApp-e-API/tokens, QR dedicado (QR derivado da `public_url` no dashboard), Blog/Super-admin extras |
| `contraste-dark` | ui | **Roxo legível no dark (auditoria total):** `preparing`/`ready` saem de `secondary`/`tertiary` (sólido+branco falha AA no dark) p/ badges suaves próprios (`.yz-status-preparing` violeta `#6d28d9/#ede9fe` → dark `#c4b5fd`; `.yz-status-ready` magenta `#be185d/#fce7f3` → dark `#f9a8d4`) — 7 status seguem com 7 cores distintas; lógica única em `src/composables/orderStatus.ts` (`statusColor`+`statusClass`, usado por `OrdersPage`+`OrderDetailPage`). `chip-violet` (ticket médio) e demais `icon-chip` ganham texto pastel no dark (`#c4b5fd/#93c5fd/#4ade80/#fcd34d/#fca5a5`). `.price`, links de texto (`.rich-text a`, `ion-card a`, `.fu-pdf-link`) e ícone de PDF clareiam p/ `#5eead4` no dark. Mantidos (Ionic sólido+contraste, AA): badges/chips `warning/primary/success/medium/danger`, branco sobre verde sólido (toolbar do editor, tag "principal") |
| `afiliados` | 11 | **Indicar e ganhar (`GET /affiliates`, só auth — sem `active`, sem permissão):** `src/api/affiliates.ts` + `AffiliatesPage` (`/afiliados`, conta inativa acompanha sem cair em `/renovar`); link + código com copiar/compartilhar (share nativo via `navigator.share` com fallback clipboard — `@capacitor/share` não instalado de propósito), stats (indicados, em teste, aptas, a receber, recebido, total ganho), regras `how_it_works` da API, indicações paginadas com infinite scroll (só nome+assinatura/comissão, como a visão não-admin). Botão share do topo do dashboard vira atalho p/ `/afiliados` + item "Indicar e ganhar" na seção CONTA (ícone `gift-outline`) |
| `fab-tabbar` | ui | **FAB acima da tab-bar (fix global):** `#main-content ion-fab[slot='fixed'][vertical='bottom']` com `bottom: calc(72px + safe-area)` no mobile (≤991px, todos os temas) — auditadas Customers, Products, Categories, AdminPlans e Orders; nenhuma define offset próprio. No desktop (≥ lg) sem tab-bar vale o offset padrão do Ionic |
| `pedido-avulso` | 6 | **Pedido avulso (`POST /orders` + `PATCH items`, fluxo 2 passos do painel):** `ordersApi.createDraft` (identificação, draft, `Idempotency-Key`) + `OrderFormPage` (`/pedidos/novo`, antes de `/pedidos/:id`): 1. cliente via busca em cadastrados (lookup/CRUD existentes) ou só nome + endereço opcional (CEP só dígitos, UF maiúscula, 422 por campo) → 2. itens do catálogo (busca, qtd, variantes somente leitura via `GET /products/{id}/variants`) → 3. revisar/enviar (PATCH items vira `received`; Confirmar vira `confirmed` com baixa/WhatsApp, ou Ver pedido). Atalho: FAB + botão no empty-state da lista de pedidos |

- Stack: `@ionic/vue` 9.0.6, Vue 3.5, Pinia 4, Capacitor 8, Vite 8 · `applicationId` fixo: **`br.com.yzap.app`**
  + `cropperjs` **1.6.2** (exato, mesma versão do painel web) p/ recorte no `FileUploader`
  + `@tiptap/{vue-3,starter-kit,extension-underline,extension-link,extension-placeholder}` **^3.31.4** (versão real do registry) p/ o `RichTextEditor` — **pendente `npm install`** (lockfile ainda sem as entradas; typecheck/build na fase de release). Orçamento de bundle: TipTap 3 soma ~150–200 KB ao bundle web (a medir no 1º build da release; sem segredo no bundle — regra mantida)
- `.env`: `VITE_API_URL=https://yzap.com.br/api/mobile/v1` · `VITE_GOOGLE_CLIENT_ID` vazio (aguardando clients)
- Sessão: token em Keychain/Keystore (nunca `localStorage`); `401` derruba a sessão
- `vue-tsc --noEmit` verde após cada grupo · sem segredos no bundle · builds (`npm run build`/`cap sync`) ficam para a fase de release

## Pendências

1. **Backend (para o agente `mobile-api`)**: o PHP (≤8.3) **não parseia `multipart/form-data` em `PUT`** — validado em `PUT /store/settings`. O app contorna enviando escalares em JSON e imagens por multipart só quando o método é POST (produtos: imagem nova vai por `POST /products/{id}/images`). Registrar defeito/possível correção no servidor (ex.: ler `php://input` ou exigir POST + `_method`). **Extensão do problema (entregas `41078b3`/`c2562fa`)**: `PUT /appearance/custom` e `PUT /appearance/cover` também são multipart-PUT no contrato — os painéis conferem a resposta (flags `has_html/has_css`, URL da capa) e avisam quando nada mudou, em vez de fingir sucesso.
2. Google Console (mesmo projeto do web): Client ID **Android** p/ `br.com.yzap.app` (SHA-1 debug + release + Play App Signing) e **iOS** (bundle ID); audiência = client web atual; tela de consentimento em produção
3. Máquina com Android SDK/Xcode: `cap add android/ios`, build nativo, teste ponta a ponta (Google, 401/403, offline, deeplink do MP)
4. Fases futuras (não implementar por conta própria): Push (FCM/APNs), Maps nativo, fila de escrita offline (hoje só cache de leitura com aviso de dado desatualizado), **câmera nativa via SDK Capacitor** (o `FileUploader` usa input de arquivo; captura direta fica para fase com SDK)
5. Ambiente: Node via nvm no WSL (ver `.nvmrc`); nunca usar os shims do Node Windows em `/mnt/c`

## Retomada da próxima sessão — prioridade imediata

> Registrado em 2026-10-02. Os itens abaixo foram pedidos, mas **ainda não foram
> implementados**. Não confundir com as entregas da tabela acima.

1. ✅ **Uploads padronizados (entregue em `54858b6`):** `FileUploader.vue` reutilizável
   (logo, capa, fotos de produto, logo no admin, comprovante) com dropzone/touch,
   preview, trocar/remover, progresso real, validação igual ao painel e recorte
   CropperJS 1.6.2. Câmera nativa fica para fase com SDK. Banners usam o mesmo
   componente quando as telas de aparência existirem (gap de API, item 3).
2. ✅ **Configurações iguais ao painel web (entregue em `41078b3`):** `/configurar-loja`
   nas abas de `settings-tabs.blade.php` (Configurações, Temas, WhatsApp, Banners,
   Capa, Atendimento + Equipe do titular) sobre os grupos 8–10 do contrato
   (temas, custom, banners/hero, capa, notificações, WhatsApp/QR). Gating por
   permissão (aba some) + upgrade inline no 403 de plano.
3. ~~Gap de API antes do item 2~~ Resolvido: grupos 8–10 documentados no contrato
   (o agente `mobile-api` entregou `MobileAppearanceController`,
   `MobileNotificationController` e `MobileWhatsappController`).
4. ✅ **Editor rico de produto (entregue em `c2562fa`):** `RichTextEditor.vue`
   (TipTap 3) no lugar do textarea de `ProductFormPage`, com paridade ao CKEditor 4
   do web e renderização em `ProductDetailPage` (`.rich-text`). Sanitização no
   servidor; pendente `npm install` + validação light/dark e mobile/desktop na
   fumaça visual.
5. ✅ **Tabs de Pedidos legíveis (entregue em `64dd18d`):** `tablist` com rolagem
   horizontal — Aberto, Concluído, Cancelado, Todos — sem truncar, com indicador
   ativo e acessibilidade. Sem contadores (a API não devolve contagem por scope).
6. **Fumaça visual obrigatória:** validar em 375px e desktop: tab-bar sempre no rodapé,
   sidebar 232px sem quebra vertical, login legível/centralizado, settings e editor nos dois
   temas. Não fazer build nativo antes dessas correções; o foco da próxima sessão é feature
   e UI.

### Estado do Maps

- API real pronta: `GET/PUT /maps`, commit backend `16217ae`.
- App atual configura retirada, entrega, limite por raio, raio em km e origem; servidor usa
  `DeliveryRadiusService`, igual às regras do web.
- Visualização atual é um círculo/fallback CSS. Mapa nativo interativo ainda depende de
  chave Google restrita a `br.com.yzap.app`, SDK/plugin e teste em dispositivo.
