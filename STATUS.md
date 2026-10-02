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

- Stack: `@ionic/vue` 9.0.6, Vue 3.5, Pinia 4, Capacitor 8, Vite 8 · `applicationId` fixo: **`br.com.yzap.app`**
- `.env`: `VITE_API_URL=https://yzap.com.br/api/mobile/v1` · `VITE_GOOGLE_CLIENT_ID` vazio (aguardando clients)
- Sessão: token em Keychain/Keystore (nunca `localStorage`); `401` derruba a sessão
- `vue-tsc --noEmit` verde após cada grupo · sem segredos no bundle · builds (`npm run build`/`cap sync`) ficam para a fase de release

## Pendências

1. **Backend (para o agente `mobile-api`)**: o PHP (≤8.3) **não parseia `multipart/form-data` em `PUT`** — validado em `PUT /store/settings`. O app contorna enviando escalares em JSON e imagens por multipart só quando o método é POST (produtos: imagem nova vai por `POST /products/{id}/images`). Registrar defeito/possível correção no servidor (ex.: ler `php://input` ou exigir POST + `_method`).
2. Google Console (mesmo projeto do web): Client ID **Android** p/ `br.com.yzap.app` (SHA-1 debug + release + Play App Signing) e **iOS** (bundle ID); audiência = client web atual; tela de consentimento em produção
3. Máquina com Android SDK/Xcode: `cap add android/ios`, build nativo, teste ponta a ponta (Google, 401/403, offline, deeplink do MP)
4. Fases futuras (não implementar por conta própria): Push (FCM/APNs), Maps nativo, fila de escrita offline (hoje só cache de leitura com aviso de dado desatualizado)
5. Ambiente: Node via nvm no WSL (ver `.nvmrc`); nunca usar os shims do Node Windows em `/mnt/c`
