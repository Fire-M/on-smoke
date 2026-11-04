<script>
import Store from '@/utils/store.js'
import tracker from '@/utils/tracker.js'

export default {
  onLaunch() {
    try {
      // 先迁移旧数据：早期版本存在省钱方向算反、挑战永不完成等问题，
      // 老用户设备里的数据是错的，需要先修正再展示，否则数字会莫名突变。
      const migrated = Store.migrateIfNeeded()
      if (migrated) this.showMigrationNotice(migrated)

      // 省钱已改为实时结算（getSavedMoney 基于 history 现算），无需每日结算。
      Store.settlePastChallenges()
      Store.syncBadges()
    } catch (e) {}
  },
  onShow() {
    // 回到前台时让宠物每日恢复（无烟日回血回快乐+经验）
    try { Store.recoverPetDaily() } catch (e) {}
  },
  onHide() {
    // 埋点改成了内存队列 + 延迟落盘，切后台时补一次，别让那 1 秒的窗口被杀掉
    try { tracker.flushToStorage() } catch (e) {}
  },

  methods: {
    // 数字突变却不说原因，用户会以为 App 坏了，所以必须告知
    showMigrationNotice(m) {
      const parts = []
      if (m.savedLogic) {
        parts.push('· 省钱改为「假抽一根 = 省一根烟的钱」')
      }
      if (m.challengesReset) {
        parts.push('· 每日挑战数据已重置')
      }
      if (!parts.length) return

      // 延后一点，等首页渲染完再弹，避免和启动流程抢
      setTimeout(() => {
        if (uni.showModal) {
          uni.showModal({
            title: '数据已校准',
            content: '我们修复了部分统计的计算规则：\n' + parts.join('\n') + '\n\n你的抽烟记录完整保留。',
            showCancel: false,
            confirmText: '知道了'
          })
        }
      }, 1200)
    }
  }
}
</script>

<style>
@import '@/static/custom.css';

/* ============ 主题 CSS 变量（默认=经典琥珀） ============
   配色原则：底色、卡片、描边、文字这些「中性层」五个主题共用同一套近黑中性色，
   主题差异只由 primary / primary-2 / glow / accent 承担。
   原来的做法是把 --bg / --surface / --border / --text 全都染上主题色相，
   于是切到薄荷就是整屏绿（连白字都发绿），看起来像蒙了一层色罩。 */
page {
  /* page 自己没设背景色时，webview 的默认白底会在首帧之前透出来，
     跳转时就先白一下。这一行让每个页面从被创建那一刻起就是深色，
     白闪直接变成"深色→深色"，观感上基本察觉不到 */
  background-color: var(--bg, #0f0f0f);
  --bg: #0f0f0f;
  --surface-1: #1f1f1f;
  --surface-2: #252525;
  --border: #2a2a2a;
  --primary: #f59e0b;
  --primary-2: #f97316;
  /* 主色的加深版（只深一档）：大按钮等大面积色块用它，避免亮主色铺满屏幕刺眼 */
  --primary-deep: #d97706;
  --primary-2-deep: #ea580c;
  --glow: rgba(245, 158, 11, 0.35);
  --accent: #34d399;
  --text: #e5e7eb;
  --text-dim: #9ca3af;
  --danger-1: #ff6b6b;
  --danger-2: #c0392b;
}
.theme-amber {
  --bg: #0f0f0f; --surface-1: #1f1f1f; --surface-2: #252525; --border: #2a2a2a;
  --primary: #f59e0b; --primary-2: #f97316; --glow: rgba(245, 158, 11, 0.35);
  --primary-deep: #d97706; --primary-2-deep: #ea580c;
  --accent: #34d399; --text: #e5e7eb; --text-dim: #9ca3af;
  --danger-1: #ff6b6b; --danger-2: #c0392b;
}
.theme-aurora {
  /* 中性层只留一丝冷调（蓝味），不能再重 —— 原来 #0a0e16 已经明显发蓝 */
  --bg: #0c0d11; --surface-1: #17181d; --surface-2: #1e1f25; --border: #2b2d35;
  --primary: #a78bfa; --primary-2: #22d3ee; --glow: rgba(124, 139, 250, 0.35);
  --primary-deep: #8b5cf6; --primary-2-deep: #06b6d4;
  --accent: #22d3ee; --text: #e7e9ee; --text-dim: #9aa0ac;
  --danger-1: #ff6b6b; --danger-2: #c0392b;
}
.theme-mint {
  --bg: #0c0e0d; --surface-1: #171917; --surface-2: #1e211f; --border: #2b302d;
  --primary: #34d399; --primary-2: #10b981; --glow: rgba(52, 211, 153, 0.30);
  --primary-deep: #10b981; --primary-2-deep: #059669;
  --accent: #f59e0b; --text: #e7eae9; --text-dim: #99a29e;
  --danger-1: #ff7a7a; --danger-2: #c0392b;
}
.theme-sunset {
  --bg: #100e0d; --surface-1: #1b1918; --surface-2: #23201e; --border: #322e2b;
  --primary: #ff7a18; --primary-2: #ff4d6d; --glow: rgba(255, 122, 24, 0.32);
  --primary-deep: #ea580c; --primary-2-deep: #e11d48;
  --accent: #ffd166; --text: #eae7e4; --text-dim: #a8a09a;
  --danger-1: #ff6b6b; --danger-2: #b03030;
}
.theme-mono {
  --bg: #000000; --surface-1: #141414; --surface-2: #1c1c1c; --border: #2a2a2a;
  --primary: #e5e7eb; --primary-2: #9ca3af; --glow: rgba(255, 255, 255, 0.15);
  --primary-deep: #9ca3af; --primary-2-deep: #6b7280;
  --accent: #9ca3af; --text: #f5f5f5; --text-dim: #a3a3a3;
  --danger-1: #ff6b6b; --danger-2: #c0392b;
}

/* 让页面根容器背景跟随主题（覆盖各页写死的 #0f0f0f） */
.page-container, .smoke-root {
  background-color: var(--bg) !important;
}

/* 滚动区底部统一留白：子页面滚到底时的间距，带上 iPhone 的底部安全区。
   页面里不要再手写 style="height: 80rpx"。 */
.scroll-bottom {
  height: calc(80rpx + env(safe-area-inset-bottom, 0px));
}

/* 琥珀强调色类跟随主题主色 */
.text-amber { color: var(--primary) !important; }
.bg-amber { background-color: var(--primary) !important; }

/* 隐藏原生 tabBar（使用自定义 TabBar） */
.uni-tabbar,
.uni-tabbar__content,
.uni-tabbar__label,
.uni-tabbar__icon,
.uni-tabbar__badge {
  display: none !important;
}

/* 全局基础样式 */
page {
  background-color: #0f0f0f;
  color: #e5e7eb;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  height: 100%;
  overflow: hidden;
}

view, text, scroll-view, swiper {
  box-sizing: border-box;
}

button {
  margin: 0;
  padding: 0;
  background: transparent;
  border: none;
  color: inherit;
  font-size: inherit;
  line-height: inherit;
}

button::after {
  display: none;
}

/* 卡片基础样式（!important 覆盖各页 scoped 写死的卡片背景） */
.card {
  background-color: var(--surface-2) !important;
  border: 1px solid var(--border) !important;
  border-radius: 16rpx;
}

/* 设置输入框 */
.setting-input {
  width: 100%;
  background-color: var(--surface-1) !important;
  border: 1px solid var(--border) !important;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  color: var(--text) !important;
  font-size: 28rpx;
}

/* 进度条（覆盖各页写死的轨道/填充色） */
.progress-bar {
  background-color: var(--border) !important;
}
.progress-fill {
  background-color: var(--primary) !important;
}

/* Tab 按钮 */
.tab-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 16rpx 32rpx;
  color: var(--text-dim) !important;
  font-size: 20rpx;
  background: transparent;
  border: none;
  line-height: 1;
}

.tab-btn.active {
  color: var(--primary) !important;
}

.tab-btn text {
  font-size: 20rpx;
}

/* 历史 Tab */
.history-tab {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: var(--text-dim) !important;
  background-color: var(--surface-1) !important;
  border: none;
}

.history-tab.active {
  background-color: var(--primary) !important;
  color: var(--bg) !important;
}

</style>
