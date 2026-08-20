import { createSSRApp } from 'vue'
import App from './App.vue'
import { themeClass, THEMES, themeState, setTheme } from './utils/theme.js'

export function createApp() {
  const app = createSSRApp(App)
  // 将主题助手注入所有组件，使 Options API 模板可直接使用
  app.mixin({
    methods: { themeClass, setTheme },
    computed: {
      THEMES() { return THEMES },
      themeState() { return themeState }
    }
  })
  return { app }
}
