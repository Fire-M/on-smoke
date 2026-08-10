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

/* 卡片基础样式 */
.card {
  background-color: #1f1f1f;
  border: 1px solid #2a2a2a;
  border-radius: 16rpx;
}

/* 设置输入框 */
.setting-input {
  width: 100%;
  background-color: #2a2a2a;
  border: 1px solid #374151;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  color: #e5e7eb;
  font-size: 28rpx;
}

/* Tab 按钮 */
.tab-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 16rpx 32rpx;
  color: #6b7280;
  font-size: 20rpx;
  background: transparent;
  border: none;
  line-height: 1;
}

.tab-btn.active {
  color: #f59e0b;
}

.tab-btn text {
  font-size: 20rpx;
}

/* 历史 Tab */
.history-tab {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: #6b7280;
  background-color: #1f1f1f;
  border: none;
}

.history-tab.active {
  background-color: #f59e0b;
  color: #0f0f0f;
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
