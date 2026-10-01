import type { CapacitorConfig } from '@capacitor/cli'

// applicationId / appId DEFINITIVO — NÃO alterar após publicar nas lojas.
// O Google Console (OAuth Android) e a Play Store dependem dele.
// Reportado: br.com.yzap.app
const config: CapacitorConfig = {
  appId: 'br.com.yzap.app',
  appName: 'YZap Lojista',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    // Deeplink de retorno (ex.: volta do checkout Mercado Pago no browser externo).
    // Universal link principal: https://yzap.com.br/app/* (configurar assetlinks na web).
    // Scheme custom como fallback: yzap://billing/return
    App: {},
    // Chave exigida pelos tipos do plugin; clientId é passado em runtime via
    // GoogleAuth.initialize() (VITE_GOOGLE_CLIENT_ID), nunca hardcoded aqui.
    GoogleAuth: {
      scopes: ['profile', 'email'],
    },
  },
}

export default config
