<template>
  <view class="page-container">
    <scroll-view scroll-y class="main-scroll">
      <view class="p-20 pb-100">
        <text class="page-title">健康看板</text>

        <!-- 无烟时长 -->
        <view class="card p-20 text-center mb-16">
          <text class="text-xs text-gray-500 mb-8 block">当前无烟时长</text>
          <text class="stat-mono">{{ smokeFreeTime }}</text>
          <text class="text-xs text-gray-600 mt-4 block">坚持就是胜利</text>
        </view>

        <!-- 今日配额环 -->
        <view class="card p-20 flex justify-around items-center mb-16">
          <view class="text-center">
            <view class="quota-ring-wrapper">
              <view class="quota-ring-bg">
                <view class="quota-ring-fill" :style="{ transform: 'rotate(' + quotaAngle + 'deg)' }"></view>
              </view>
              <text class="quota-ring-text">{{ todaySmoked }}/{{ quotaTotal }}</text>
            </view>
            <text class="text-xs text-gray-500 mt-8 block">今日配额</text>
          </view>
          <view>
            <view class="mb-12">
              <text class="stat-money">¥{{ savedMoney }}</text>
              <text class="text-xs text-gray-500 block">已省烟钱</text>
            </view>
            <view>
              <text class="stat-less">{{ lessSmoked }}</text>
              <text class="text-xs text-gray-500 block">少抽根数</text>
            </view>
          </view>
        </view>

        <!-- 健康恢复进度 -->
        <view class="card p-20 mb-16">
          <text class="text-xs text-gray-500 mb-12 block">健康恢复进度</text>
          <view class="milestones">
            <view v-for="(m, idx) in milestones" :key="idx" class="milestone-item">
              <view class="milestone-dot" :class="{ done: m.done }"></view>
              <view class="milestone-info">
                <text class="text-sm" :class="m.done ? 'text-amber' : 'text-gray-300'">{{ m.label }}</text>
                <text class="text-xs text-gray-600">{{ m.desc }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 连续无烟天数 -->
        <view class="card p-20 text-center">
          <text class="text-xs text-gray-500 mb-8 block">连续无烟天数</text>
          <text class="text-4xl font-bold text-amber">{{ cleanDays }}</text>
          <text class="text-xs text-gray-600 mt-4 block">天</text>
        </view>
      </view>
    </scroll-view>
    <custom-tabbar :current="1"></custom-tabbar>
  </view>
</template>

<script>
import Store from '@/utils/store.js'
import CustomTabbar from '@/components/custom-tabbar/custom-tabbar.vue'

const HEALTH_MILESTONES = [
  { seconds: 1200, label: '20分钟', desc: '心率恢复正常' },
  { seconds: 28800, label: '8小时', desc: '血氧水平恢复' },
  { seconds: 86400, label: '1天', desc: '心脏病风险降低' },
  { seconds: 172800, label: '2天', desc: '味觉开始恢复' },
  { seconds: 604800, label: '1周', desc: '肺部开始修复' },
  { seconds: 1209600, label: '2周', desc: '循环系统改善' },
  { seconds: 7776000, label: '3月', desc: '肺功能提升30%' },
  { seconds: 15552000, label: '1年', desc: '冠心病风险减半' }
]

export default {
  components: { CustomTabbar },
  data() {
    return {
      smokeFreeTime: '00:00:00',
      todaySmoked: 0,
      quotaTotal: 5,
      quotaAngle: 0,
      savedMoney: '0.0',
      lessSmoked: 0,
      cleanDays: 0,
      milestones: [],
      timer: null
    }
  },

  onShow() {
    this.refreshData()
    this.timer = setInterval(() => this.updateTime(), 1000)
  },

  onHide() {
    clearInterval(this.timer)
  },

  methods: {
    refreshData() {
      const settings = Store.getSettings()
      const today = Store.getToday()
      this.todaySmoked = today.smokedCount
      this.quotaTotal = settings.dailyQuota
      const ratio = settings.dailyQuota > 0 ? Math.min(today.smokedCount / settings.dailyQuota, 1) : 0
      this.quotaAngle = ratio * 360
      this.savedMoney = Store.getSavedMoney().toFixed(1)
      this.lessSmoked = Store.getLessSmoked()
      this.cleanDays = Store.getCleanDays()
      this.updateTime()
      this.updateMilestones()
    },

    updateTime() {
      const sec = Store.getSmokeFreeDuration()
      const h = Math.floor(sec / 3600)
      const m = Math.floor((sec % 3600) / 60)
      const s = sec % 60
      this.smokeFreeTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    },

    updateMilestones() {
      const sec = Store.getSmokeFreeDuration()
      this.milestones = HEALTH_MILESTONES.map(m => ({
        ...m,
        done: sec >= m.seconds
      }))
    }
  }
}
</script>

<style>
.page-container {
  height: 100vh;
  width: 100vw;
  background-color: #0f0f0f;
  color: #e5e7eb;
}

.main-scroll {
  height: 100%;
}

.page-title {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  text-align: center;
  color: #f3f4f6;
  margin-bottom: 48rpx;
}

.text-center { text-align: center; }
.stat-mono {
  display: block;
  font-size: 56rpx;
  font-family: monospace;
  font-weight: bold;
  color: #f59e0b;
}

.quota-ring-wrapper {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  margin: 0 auto;
}

.quota-ring-bg {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 12rpx solid #2a2a2a;
  position: relative;
  overflow: hidden;
}

.quota-ring-fill {
  position: absolute;
  top: -12rpx;
  left: -12rpx;
  width: calc(100% + 24rpx);
  height: calc(100% + 24rpx);
  border-radius: 50%;
  border: 12rpx solid #f59e0b;
  clip-path: polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%, 50% 50%);
  transform-origin: center center;
}

.quota-ring-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 28rpx;
  font-weight: bold;
  color: #e5e7eb;
}

.stat-money {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #4ade80;
}

.stat-less {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #60a5fa;
}

.milestones {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.milestone-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.milestone-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background-color: #2a2a2a;
  flex-shrink: 0;
}

.milestone-dot.done {
  background-color: #f59e0b;
}

.milestone-info {
  display: flex;
  flex-direction: column;
}

.p-20 { padding: 40rpx; }
.pb-100 { padding-bottom: 200rpx; }
.mb-12 { margin-bottom: 24rpx; }
.mb-16 { margin-bottom: 32rpx; }
.mt-4 { margin-top: 8rpx; }
.mt-8 { margin-top: 16rpx; }
.text-xs { font-size: 24rpx; }
.text-sm { font-size: 28rpx; }
.text-4xl { font-size: 72rpx; }
.font-bold { font-weight: bold; }
.block { display: block; }
.flex { display: flex; }
.justify-around { justify-content: space-around; }
.items-center { align-items: center; }
.text-gray-300 { color: #d1d5db; }
.text-gray-500 { color: #6b7280; }
.text-gray-600 { color: #4b5563; }
.text-amber { color: #f59e0b; }
.card { background-color: #1f1f1f; border: 1px solid #2a2a2a; border-radius: 32rpx; }
</style>
