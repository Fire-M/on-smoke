<template>
  <view class="custom-tabbar" :class="themeClass()">
    <view class="tabbar-inner">
      <view
        v-for="(item, index) in tabList"
        :key="index"
        class="tabbar-item"
        :class="{ active: current === index }"
        @click="switchTab(index)"
      >
        <!-- CSS 绘制的单色图标：颜色走 currentColor，激活时跟随主题主色 -->
        <view class="ticon" v-if="item.icon === 'smoke'">
          <view class="cig"></view><view class="ember"></view>
          <view class="puff puff-1"></view><view class="puff puff-2"></view>
        </view>
        <view class="ticon ticon-chart" v-else-if="item.icon === 'chart'">
          <view class="bar b1"></view><view class="bar b2"></view><view class="bar b3"></view>
        </view>
        <view class="ticon" v-else-if="item.icon === 'clock'">
          <view class="face"></view><view class="hand hh"></view><view class="hand mm"></view>
        </view>
        <view class="ticon" v-else>
          <view class="line l1"><view class="knob"></view></view>
          <view class="line l2"><view class="knob"></view></view>
          <view class="line l3"><view class="knob"></view></view>
        </view>
        <text class="tab-text">{{ item.text }}</text>
        <view class="tab-indicator" v-if="current === index"></view>
      </view>
    </view>
    <view class="tabbar-safe"></view>
  </view>
</template>

<script>
import { themeClass } from '@/utils/theme.js'

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
        { text: '抽烟', icon: 'smoke', pagePath: '/pages/index/index' },
        { text: '看板', icon: 'chart', pagePath: '/pages/dashboard/dashboard' },
        { text: '历史', icon: 'clock', pagePath: '/pages/history/history' },
        { text: '设置', icon: 'gear', pagePath: '/pages/settings/settings' }
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

.custom-tabbar view,
.custom-tabbar text,
.custom-tabbar image {
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

/* ===== 单色线性图标（纯 CSS，颜色随主题） ===== */
/* 48rpx 大容器 + 4rpx 粗线条，视觉分量足 */
.ticon {
  position: relative;
  width: 48rpx;
  height: 48rpx;
  color: #6b7280;                /* 与原 emoji 的灰一致 */
  transition: color 0.25s ease, transform 0.25s ease;
}

.tabbar-item.active .ticon {
  color: var(--primary);
  transform: scale(1.08);
}

/* 抽烟：烟身 + 点燃端 + 两点上升的烟雾 */
.ticon .cig {
  position: absolute; left: 3rpx; bottom: 8rpx;
  width: 32rpx; height: 8rpx;
  background: currentColor; border-radius: 4rpx;
}
.ticon .ember {
  position: absolute; left: 37rpx; bottom: 8rpx;
  width: 9rpx; height: 8rpx;
  background: currentColor; border-radius: 4rpx;
}
.ticon .puff {
  position: absolute;
  width: 6rpx; height: 6rpx;
  border-radius: 50%; background: currentColor;
}
.ticon .puff-1 { left: 34rpx; bottom: 22rpx; opacity: 0.85; }
.ticon .puff-2 { left: 40rpx; bottom: 32rpx; opacity: 0.55; }

/* 看板：三根高矮不一的柱状条 */
.ticon-chart {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 5rpx;
  padding-bottom: 8rpx;
  box-sizing: border-box;
}
.ticon .bar {
  width: 9rpx;
  background: currentColor; border-radius: 4rpx;
}
.ticon .b1 { height: 16rpx; }
.ticon .b2 { height: 30rpx; }
.ticon .b3 { height: 23rpx; }

/* 历史：圆形时钟 + 两根指针（三点整方向） */
.ticon .face {
  position: absolute; left: 6rpx; top: 6rpx;
  width: 36rpx; height: 36rpx;
  border: 4rpx solid currentColor;
  border-radius: 50%;
  box-sizing: border-box;
}
.ticon .hand {
  position: absolute;
  background: currentColor; border-radius: 2rpx;
}
.ticon .hh { left: 22rpx; top: 14rpx; width: 4rpx; height: 10rpx; }
.ticon .mm { left: 24rpx; top: 22rpx; width: 10rpx; height: 4rpx; }

/* 设置：三条滑杆（滑块交错排布） */
.ticon .line {
  position: absolute; left: 5rpx;
  width: 38rpx; height: 4rpx;
  background: currentColor; border-radius: 2rpx;
}
.ticon .l1 { top: 10rpx; }
.ticon .l2 { top: 22rpx; }
.ticon .l3 { top: 34rpx; }
.ticon .knob {
  position: absolute; top: -3rpx;
  width: 11rpx; height: 11rpx;
  background: currentColor; border-radius: 50%;
}
.ticon .l1 .knob { left: 6rpx; }
.ticon .l2 .knob { left: 20rpx; }
.ticon .l3 .knob { left: 11rpx; }

.tab-text {
  font-size: 20rpx;
  color: #6b7280;
  margin-top: 4rpx;
  transition: color 0.25s ease;
}

.tabbar-item.active .tab-text {
  color: var(--primary);
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
  background: var(--primary);
}
</style>
