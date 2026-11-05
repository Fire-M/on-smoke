import { createSSRApp } from 'vue'
import App from './App.vue'
import Store from './utils/store.js'
import { themeClass, THEMES, themeState, setTheme } from './utils/theme.js'

export function createApp() {
  const app = createSSRApp(App)
  // 将主题助手与「页面刷新脏检查」注入所有组件，使 Options API 模板/钩子可直接使用
  app.mixin({
    methods: {
      themeClass, setTheme,
      // 数据没变、也没跨天时，页面 onShow 直接跳过整页重算。
      // 转场帧里最贵的是 storage 同步桥 + 一次性 setData 几十个字段，
      // 数据没变却每次返回都做一遍，就是「跳转/返回卡顿」的主因。
      shouldRefresh() {
        if (this._revAtShow === undefined) return true
        return this._revAtShow !== Store.getRev() || this._dayAtShow !== Store.todayStr()
      },
      // 必须在刷新完成后调用：结算类函数会在刷新内部写盘并自增 rev，
      // 若提前记录版本号，下次 onShow 会永远误判成「数据变了」。
      markRefreshed() {
        this._revAtShow = Store.getRev()
        this._dayAtShow = Store.todayStr()
      }
    },
    computed: {
      THEMES() { return THEMES },
      themeState() { return themeState }
    }
  })
  return { app }
}
