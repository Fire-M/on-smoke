<template>
  <view class="custom-tabbar">
    <view class="tabbar-inner">
      <view
        v-for="(item, index) in tabList"
        :key="index"
        class="tabbar-item"
        :class="{ active: current === index }"
        @click="switchTab(index)"
      >
        <text class="tab-icon">{{ item.icon }}</text>
        <text class="tab-icon-active" v-if="current === index">{{ item.activeIcon }}</text>
        <text class="tab-text">{{ item.text }}</text>
        <view class="tab-indicator" v-if="current === index"></view>
      </view>
    </view>
    <view class="tabbar-safe"></view>
  </view>
</template>

<script>
export default {
  name: 'CustomTabbar',
  props: {
    current: {
      type: Number,
      default: 0
    }
  },
  data() {
    return {
      tabList: [
        { text: '抽烟', icon: '🚬', activeIcon: '🔥', pagePath: '/pages/index/index' },
        { text: '看板', icon: '📊', activeIcon: '📊', pagePath: '/pages/dashboard/dashboard' },
        { text: '历史', icon: '📋', activeIcon: '📋', pagePath: '/pages/history/history' },
        { text: '设置', icon: '⚙️', activeIcon: '⚙️', pagePath: '/pages/settings/settings' }
      ]
    }
  },
  methods: {
    switchTab(index) {
      if (this.current === index) return
      uni.switchTab({
        url: this.tabList[index].pagePath
      })
    }
  }
}
</script>

<style scoped>
.custom-tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  background: linear-gradient(to top, #1a1a1a 85%, rgba(26, 26, 26, 0.95) 100%);
  border-top: 1rpx solid rgba(255, 255, 255, 0.06);
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.custom-tabbar * {
  -webkit-tap-highlight-color: transparent;
  outline: none;
}

.tabbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 100rpx;
  padding: 0 16rpx;
}

.tabbar-safe {
  height: env(safe-area-inset-bottom, 0px);
}

.tabbar-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 100%;
  padding: 8rpx 0;
  transition: all 0.25s ease;
  -webkit-tap-highlight-color: transparent;
  outline: none;
  user-select: none;
}

.tab-icon {
  font-size: 40rpx;
  line-height: 1;
  opacity: 0.5;
  transition: all 0.25s ease;
}

.tab-icon-active {
  display: none;
}

.tab-text {
  font-size: 20rpx;
  color: #6b7280;
  margin-top: 4rpx;
  transition: color 0.25s ease;
}

.tabbar-item.active .tab-icon {
  opacity: 1;
  transform: scale(1.1);
}

.tabbar-item.active .tab-text {
  color: #f59e0b;
  font-weight: 500;
}

.tab-indicator {
  position: absolute;
  top: 4rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 32rpx;
  height: 4rpx;
  border-radius: 4rpx;
  background: #f59e0b;
}
</style>
