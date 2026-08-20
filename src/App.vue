<script>
export default {
  onLaunch() {
    console.log('App Launch')
  },
  onShow() {
    console.log('App Show')
  },
  onHide() {
    console.log('App Hide')
  }
}
</script>

<style>
@import '@/static/custom.css';

/* ============ 主题 CSS 变量（默认=经典琥珀） ============ */
page {
  --bg: #0f0f0f;
  --surface-1: #1f1f1f;
  --surface-2: #252525;
  --border: #2a2a2a;
  --primary: #f59e0b;
  --primary-2: #f97316;
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
  --accent: #34d399; --text: #e5e7eb; --text-dim: #9ca3af;
  --danger-1: #ff6b6b; --danger-2: #c0392b;
}
.theme-aurora {
  --bg: #0a0e16; --surface-1: #121826; --surface-2: #182032; --border: #25304a;
  --primary: #a78bfa; --primary-2: #22d3ee; --glow: rgba(124, 139, 250, 0.35);
  --accent: #22d3ee; --text: #e8ecf6; --text-dim: #93a0bd;
  --danger-1: #ff6b6b; --danger-2: #c0392b;
}
.theme-mint {
  --bg: #08120e; --surface-1: #0f1f18; --surface-2: #142a20; --border: #1f3a2c;
  --primary: #34d399; --primary-2: #10b981; --glow: rgba(52, 211, 153, 0.30);
  --accent: #f59e0b; --text: #e6f4ec; --text-dim: #8fb3a2;
  --danger-1: #ff7a7a; --danger-2: #c0392b;
}
.theme-sunset {
  --bg: #140a0a; --surface-1: #211212; --surface-2: #2c1717; --border: #3a2020;
  --primary: #ff7a18; --primary-2: #ff4d6d; --glow: rgba(255, 122, 24, 0.32);
  --accent: #ffd166; --text: #f6e9e6; --text-dim: #c79b94;
  --danger-1: #ff6b6b; --danger-2: #b03030;
}
.theme-mono {
  --bg: #000000; --surface-1: #141414; --surface-2: #1c1c1c; --border: #2a2a2a;
  --primary: #e5e7eb; --primary-2: #9ca3af; --glow: rgba(255, 255, 255, 0.15);
  --accent: #9ca3af; --text: #f5f5f5; --text-dim: #a3a3a3;
  --danger-1: #ff6b6b; --danger-2: #c0392b;
}

/* 让页面根容器背景跟随主题（覆盖各页写死的 #0f0f0f） */
.page-container, .smoke-root {
  background-color: var(--bg) !important;
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

/* 工具按钮 */
.st-tool {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx;
  background: transparent;
  border: none;
  color: #9ca3af;
}

.st-tool-ic {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background-color: rgba(31, 31, 31, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
}

.st-tool-lbl {
  display: flex;
  flex-direction: column;
}

.st-tool-name {
  font-size: 22rpx;
  color: #9ca3af;
}

.st-tool-val {
  font-size: 18rpx;
  color: #6b7280;
}
</style>
