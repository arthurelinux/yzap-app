# YZap Mobile — estado atual

> Última atualização: 2026-10-01 · Branch API: `mobile/api-lojista` · App: `main`

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
- Contrato formal: `docs/mobile-api-contrato.md` (grupos 1–6 ✅, base `https://yzap.com.br`)
- Decisões: MP sempre externo; `stock`×`finance` resolvido (mobile usa `stock`); reset de senha revoga tokens do app
- Spike visual (gabarto do app): rota local `/preview/ionic` — 404 em produção

## App — esqueleto + auth wired (fases 1–2 parciais)

- Stack: `@ionic/vue` 9.0.6, Vue 3.5, Pinia 4, Capacitor 8, Vite 8 · `applicationId` fixo: **`br.com.yzap.app`**
- `.env`: `VITE_API_URL=https://yzap.com.br/api/mobile/v1` · `VITE_GOOGLE_CLIENT_ID` vazio (aguardando clients)
- Wired real (zero mock): login senha + Google, `/me`, `/account/status`, `GET /store`; token em Keychain/Keystore; telas 401/403/renovação; resto vai para "em breve"
- Build 275 kB gzip · `vue-tsc` OK · sem segredos no bundle

## Pendências

1. Google Console (mesmo projeto do web): Client ID **Android** p/ `br.com.yzap.app` (SHA-1 debug + release + Play App Signing) e **iOS** (bundle ID); audiência = client web atual; tela de consentimento em produção
2. Telas grupo 2: settings/equipe · depois grupos 3–6, um por vez, após contrato ✅
3. Máquina com Android SDK/Xcode: `cap add android/ios`, build nativo, teste ponta a ponta (Google, 401/403, offline)
4. Ambiente: Node via nvm no WSL (ver `.nvmrc`); nunca usar os shims do Node Windows em `/mnt/c`
