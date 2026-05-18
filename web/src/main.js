import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'vant/lib/index.css'
import './styles/theme.css'
import './styles/themes/soft-color.css'
import './styles/themes/candy-gradient.css'
import './styles/themes/airy-tint.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
