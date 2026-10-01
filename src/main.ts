import { createApp } from 'vue'
import { IonicVue } from '@ionic/vue'
import { createPinia } from 'pinia'
import { addIcons } from 'ionicons'
import {
  calendarOutline,
  cardOutline,
  cashOutline,
  checkmarkCircleOutline,
  cloudOfflineOutline,
  contrastOutline,
  cubeOutline,
  diamondOutline,
  gridOutline,
  hammerOutline,
  helpCircleOutline,
  homeOutline,
  lockClosedOutline,
  logOutOutline,
  logoGoogle,
  logoWhatsapp,
  menuOutline,
  moonOutline,
  notificationsOutline,
  openOutline,
  peopleOutline,
  personAddOutline,
  receiptOutline,
  settingsOutline,
  shareSocialOutline,
  storefrontOutline,
  sunnyOutline,
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
/* Dark mode via classe `ion-palette-dark` */
import '@ionic/vue/css/palettes/dark.class.css'

import App from './App.vue'
import router from './router'

addIcons({
  'calendar-outline': calendarOutline,
  'card-outline': cardOutline,
  'cash-outline': cashOutline,
  'checkmark-circle-outline': checkmarkCircleOutline,
  'cloud-offline-outline': cloudOfflineOutline,
  'contrast-outline': contrastOutline,
  'cube-outline': cubeOutline,
  'diamond-outline': diamondOutline,
  'grid-outline': gridOutline,
  'hammer-outline': hammerOutline,
  'help-circle-outline': helpCircleOutline,
  'home-outline': homeOutline,
  'lock-closed-outline': lockClosedOutline,
  'log-out-outline': logOutOutline,
  'logo-google': logoGoogle,
  'logo-whatsapp': logoWhatsapp,
  'menu-outline': menuOutline,
  'moon-outline': moonOutline,
  'notifications-outline': notificationsOutline,
  'open-outline': openOutline,
  'people-outline': peopleOutline,
  'person-add-outline': personAddOutline,
  'receipt-outline': receiptOutline,
  'settings-outline': settingsOutline,
  'share-social-outline': shareSocialOutline,
  'storefront-outline': storefrontOutline,
  'sunny-outline': sunnyOutline,
  'wallet-outline': walletOutline,
})

const app = createApp(App).use(IonicVue).use(createPinia()).use(router)

router.isReady().then(() => {
  app.mount('#app')
})
