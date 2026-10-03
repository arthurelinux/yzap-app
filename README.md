# Yzap

App de gestão da loja pelo celular (Ionic 9 + Vue 3.5 + Capacitor 8).
**Não implementa backend**: consome SOMENTE o que está documentado em
`docs/mobile-api-contrato.md` do repositório Laravel irmão.

## Vínculo entre repositórios

| Repo | Caminho | Papel |
|---|---|---|
| `yzap` (Laravel) | `/home/arthur/acessodesign/yzap` branch `mobile/api-lojista` | API mobile (`/api/mobile/v1`), contrato em `docs/mobile-api-contrato.md` |
| `yzap-app` (este) | `/home/arthur/acessodesign/yzap-app` branch `main` | App Ionic/Capacitor, `appId` `br.com.yzap.app` |

**Ordem de merge**: primeiro a API (`mobile/api-lojista` → `develop` no Laravel),
depois o app (`fase/*` → `main` aqui). O app só consome grupos com status
✅ Documentado no contrato.

## Configuração

```bash
npm install
cp .env.example .env   # VITE_GOOGLE_CLIENT_ID como placeholder vazio
npm run dev            # web preview (http://localhost:8100)
npm run build          # build web (saída em dist/)
npm run typecheck      # vue-tsc --noEmit
npx cap sync           # após build, sincroniza android/ios
```

`VITE_API_URL=https://yzap.com.br/api/mobile/v1`. Nenhum segredo de servidor no
bundle (`APP_KEY`, `MERCADO_PAGO_*`, `EVOLUTION_*`, `GOOGLE_CLIENT_SECRET`, AWS).

## Identidade visual

- `src/assets/horizontal.png` — wordmark do cabeçalho/menu, copiada de
  `public/images/horizontal.png` do repo Laravel.
- `src/assets/yz-mark-source.png` — marca de origem, copiada de
  `public/images/yz-mark-source.png` do repo Laravel (mantida como arte
  auxiliar; **não** é o ícone do app).
- Ícone do app (favicon oficial, copiado de
  `public/images/favicon/` do repo Laravel em 2026-10-03):
  `src/assets/favicon-32x32.png` (32×32), `src/assets/favicon-16x16.png`
  (16×16), `src/assets/apple-touch-icon.png` (180×180 — no repo Laravel o
  arquivo chama-se `apple-touch-icon.png`, sem a dimensão no nome),
  `src/assets/android-chrome-192x192.png` (192×192),
  `src/assets/android-chrome-512x512.png` (512×512). Referenciados em
  `index.html` (`rel="icon"` 16/32 + `apple-touch-icon`).
  Gap registrado: o set oficial vai até 512×512 — falta master de alta
  resolução para gerar ícone adaptativo/splash das plataformas
  (ex.: 1024px p/ `@capacitor/assets`, splash 2732px); gerar nativo
  (`cap add android/ios` + assets) fica para a fase com máquina/SDK, sem
  improvisar com outra arte.
- `src/theme/tokens.css` — tokens YZap (`#087f6f`, `#075e54`, `#10221f`,
  `#58706b`, `#dcf8ef`, `#dbe9e5`, `#f7fbfa`; Manrope 400–800; raios 10/13/18/99px).
  `accent_color` da loja aplicado em runtime.

## Estado da fase 1 (escopo fechado)

Wired na API real: `POST /auth/login`, `POST /auth/google` (id_token),
`GET /me`, `GET /account/status`, `POST /auth/refresh|logout|logout-all`,
`GET /store`. Token em Keychain/Keystore (plugin Capacitor), nunca em
localStorage. 401 limpa sessão; 403 plano × 403 permissão são telas distintas;
conta inativa → tela de renovação. Offline: só cache de leitura com aviso.

Próximo passo: telas do grupo 2 completo (settings/equipe).
