import { createApp } from 'vue'
import { IonicVue } from '@ionic/vue'
import { createPinia } from 'pinia'
import { addIcons } from 'ionicons'
import {
  addCircleOutline,
  addOutline,
  alertCircleOutline,
  arrowDownCircleOutline,
  arrowUpCircleOutline,
  calendarOutline,
  callOutline,
  cardOutline,
  cashOutline,
  checkmarkCircleOutline,
  checkmarkOutline,
  chevronDownOutline,
  chevronForwardOutline,
  closeCircleOutline,
  closeOutline,
  cloudOfflineOutline,
  cloudUploadOutline,
  colorPaletteOutline,
  contrastOutline,
  copyOutline,
  createOutline,
  cubeOutline,
  diamondOutline,
  documentTextOutline,
  downloadOutline,
  funnelOutline,
  giftOutline,
  globeOutline,
  gridOutline,
  helpCircleOutline,
  homeOutline,
  imageOutline,
  informationCircleOutline,
  keyOutline,
  layersOutline,
  linkOutline,
  locationOutline,
  lockClosedOutline,
  lockOpenOutline,
  logOutOutline,
  logoGoogle,
  logoWhatsapp,
  mailOutline,
  menuOutline,
  moonOutline,
  notificationsOutline,
  openOutline,
  peopleOutline,
  personAddOutline,
  personOutline,
  pricetagsOutline,
  receiptOutline,
  refreshOutline,
  removeCircleOutline,
  saveOutline,
  searchOutline,
  settingsOutline,
  shareSocialOutline,
  shieldCheckmarkOutline,
  storefrontOutline,
  sunnyOutline,
  timeOutline,
  trashOutline,
  trendingDownOutline,
  trendingUpOutline,
  walletOutline,
} from 'ionicons/icons'

/* Ionic CSS base */
import '@ionic/vue/css/core.css'
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'
import '@ionic/vue/css/padding.css'
import '@ionic/vue/css/float-elements.css'
import '@ionic/vue/css/text-alignment.css'
import '@ionic/vue/css/text-transformation.css'
import '@ionic/vue/css/flex-utils.css'
import '@ionic/vue/css/display.css'
/* Dark mode via classe `ion-palette-dark` (mesmo caminho do spike:
 * @ionic/core/css/palettes/dark.class.css). */
import '@ionic/vue/css/palettes/dark.class.css'
/* Tokens + layout compartilhado (porta do gabarito) — após o dark para que
 * as regras de tema específico (html.ion-palette-dark) vençam por cascata. */
import '@/theme/tokens.css'
import '@/theme/app.css'

import App from './App.vue'
import router from './router'
import { initTheme } from '@/composables/theme'

/**
 * Ícones registrados globalmente (ionicons v8, chaves kebab-case).
 * Página que precisar de um ícone fora desta lista pode importar localmente:
 *   import { addIcons } from 'ionicons'; import { trashOutline } from 'ionicons/icons'
 *   addIcons({ 'trash-outline': trashOutline })
 */
addIcons({
  'add-circle-outline': addCircleOutline,
  'add-outline': addOutline,
  'alert-circle-outline': alertCircleOutline,
  'arrow-down-circle-outline': arrowDownCircleOutline,
  'arrow-up-circle-outline': arrowUpCircleOutline,
  'calendar-outline': calendarOutline,
  'call-outline': callOutline,
  'card-outline': cardOutline,
  'cash-outline': cashOutline,
  'checkmark-circle-outline': checkmarkCircleOutline,
  'checkmark-outline': checkmarkOutline,
  'chevron-down-outline': chevronDownOutline,
  'chevron-forward-outline': chevronForwardOutline,
  'close-circle-outline': closeCircleOutline,
  'close-outline': closeOutline,
  'cloud-offline-outline': cloudOfflineOutline,
  'cloud-upload-outline': cloudUploadOutline,
  'color-palette-outline': colorPaletteOutline,
  'contrast-outline': contrastOutline,
  'copy-outline': copyOutline,
  'create-outline': createOutline,
  'cube-outline': cubeOutline,
  'diamond-outline': diamondOutline,
  'document-text-outline': documentTextOutline,
  'download-outline': downloadOutline,
  'funnel-outline': funnelOutline,
  'gift-outline': giftOutline,
  'globe-outline': globeOutline,
  'grid-outline': gridOutline,
  'help-circle-outline': helpCircleOutline,
  'home-outline': homeOutline,
  'image-outline': imageOutline,
  'information-circle-outline': informationCircleOutline,
  'key-outline': keyOutline,
  'layers-outline': layersOutline,
  'link-outline': linkOutline,
  'location-outline': locationOutline,
  'lock-closed-outline': lockClosedOutline,
  'lock-open-outline': lockOpenOutline,
  'log-out-outline': logOutOutline,
  'logo-google': logoGoogle,
  'logo-whatsapp': logoWhatsapp,
  'mail-outline': mailOutline,
  'menu-outline': menuOutline,
  'moon-outline': moonOutline,
  'notifications-outline': notificationsOutline,
  'open-outline': openOutline,
  'people-outline': peopleOutline,
  'person-add-outline': personAddOutline,
  'person-outline': personOutline,
  'pricetags-outline': pricetagsOutline,
  'receipt-outline': receiptOutline,
  'refresh-outline': refreshOutline,
  'remove-circle-outline': removeCircleOutline,
  'save-outline': saveOutline,
  'search-outline': searchOutline,
  'settings-outline': settingsOutline,
  'share-social-outline': shareSocialOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline,
  'storefront-outline': storefrontOutline,
  'sunny-outline': sunnyOutline,
  'time-outline': timeOutline,
  'trash-outline': trashOutline,
  'trending-down-outline': trendingDownOutline,
  'trending-up-outline': trendingUpOutline,
  'wallet-outline': walletOutline,
})

/* Tema: restaura preferência salva (yz-theme) ou segue o sistema. */
initTheme()

const app = createApp(App).use(IonicVue).use(createPinia()).use(router)

router.isReady().then(() => {
  app.mount('#app')
})
