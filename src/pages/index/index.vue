<template>
  <view class="page-container">
    <!-- 可滚动仪表盘内容 -->
    <scroll-view scroll-y class="main-scroll">
      <!-- 顶部：戒烟天数 + 激励语 -->
      <view class="px-20 pt-40 pb-16">
        <text class="text-sm text-gray-500">戒烟 第 <text class="text-amber font-bold text-base">{{ quitDays }}</text> 天</text>
        <text class="text-2xl font-bold text-gray-100 mt-4 block">嘴又痒了?</text>
      </view>

      <!-- 至今已省卡片 -->
      <view class="mx-20 mb-16 saved-card">
        <view class="flex">
          <view class="saved-bar"></view>
          <view class="flex-1 p-20">
            <text class="text-xs text-gray-500 mb-8 block">至今已省</text>
            <text class="text-4xl font-bold text-amber">¥{{ savedAmount }}</text>
            <text class="text-xs text-gray-600 mt-8 block">够买 {{ Math.floor(savedAmount / 5) }} 包辣条 · 或 {{ Math.floor(savedAmount / 15) }} 杯咖啡</text>
          </view>
        </view>
      </view>

      <!-- 今日假抽 + 连续打卡 -->
      <view class="mx-20 mb-16 two-col">
        <view class="card p-16">
          <text class="text-xs text-gray-500 mb-8 block">今日假抽</text>
          <text class="text-2xl font-bold text-gray-100">{{ todaySmoked }} / {{ quotaTotal }} 根</text>
          <view class="progress-bar">
            <view class="progress-fill" :style="{ width: quotaPercent + '%' }"></view>
          </view>
        </view>
        <view class="card p-16">
          <text class="text-xs text-gray-500 mb-8 block">连续打卡</text>
          <text class="text-2xl font-bold text-gray-100">{{ quitDays }} 天</text>
          <text class="text-xs text-amber mt-8 block">🔥 别破戒</text>
        </view>
      </view>

      <!-- 广告位 -->
      <view class="mx-20 mb-16 card p-12 flex items-center gap-12">
        <text class="ad-badge">广告</text>
        <view class="flex-1">
          <text class="text-xs text-gray-300 block truncate">物资短缺、寒夜逼近，快来安排你的末日...</text>
          <text class="text-[10px] text-gray-600 mt-2 block">无尽冬日-3亿玩家推荐</text>
        </view>
        <view class="ad-icon">
          <text class="text-lg">🎮</text>
        </view>
      </view>

      <!-- 身体恢复 + 成就徽章 -->
      <view class="mx-20 mb-16 two-col">
        <view class="card p-16 flex items-center gap-12">
          <text class="text-2xl">🫁</text>
          <view>
            <text class="text-sm text-gray-300 block">身体恢复</text>
            <text class="text-xs text-gray-600 mt-4 block"><text class="text-amber">{{ milestoneLabel }}</text> <text class="text-amber">里程碑</text></text>
          </view>
        </view>
        <view class="card p-16 flex items-center gap-12">
          <text class="text-2xl">🏆</text>
          <view>
            <text class="text-sm text-gray-300 block">成就徽章</text>
            <text class="text-xs text-gray-600 mt-4 block">{{ badgesCount }} / 8 已解锁</text>
          </view>
        </view>
      </view>

      <!-- 底部占位 -->
      <view style="height: 480rpx;"></view>
    </scroll-view>

    <!-- 底部固定：来一根按钮 -->
    <view class="btn-container">
      <button class="btn-have-one" :disabled="cooldownRemain > 0" @click="haveOne">
        <view class="btn-fire-wrap">
          <text class="btn-fire">🔥</text>
        </view>
        <view class="btn-text-wrap">
          <text class="btn-main-text">{{ cooldownRemain > 0 ? '冷却中' : '来一根' }}</text>
          <text class="btn-sub-text">{{ cooldownRemain > 0 ? cooldownStr : '假装点一根 · 不伤肺不花钱' }}</text>
        </view>
      </button>
    </view>

    <!-- 自定义 TabBar -->
    <custom-tabbar :current="0"></custom-tabbar>

    <!-- Toast -->
    <view class="toast" v-if="showToast">
      <text>{{ toastMsg }}</text>
    </view>
  </view>
</template>

<script>
import Store from '@/utils/store.js'
import CustomTabbar from '@/components/custom-tabbar/custom-tabbar.vue'

const MILESTONES = [
  { seconds: 1200, label: '20分钟' },
  { seconds: 43200, label: '12小时' },
  { seconds: 1209600, label: '2周' },
  { seconds: 7776000, label: '3月' },
  { seconds: 15552000, label: '1年' }
]

export default {
  components: { CustomTabbar },
  data() {
    return {
      quitDays: 1,
      savedAmount: '0.0',
      todaySmoked: 0,
      quotaTotal: 5,
      quotaPercent: 0,
      milestoneLabel: '20分钟',
      badgesCount: 0,
      cooldownRemain: 0,
      cooldownStr: '',
      showToast: false,
      toastMsg: '',
      cooldownTimer: null,
      midnightTimer: null
    }
  },

  onLoad() {
    this.refreshData()
    this.checkCooldown()
    this.midnightTimer = setInterval(() => this.refreshData(), 30000)
  },

  onUnload() {
    clearInterval(this.midnightTimer)
    clearInterval(this.cooldownTimer)
  },

  onShow() {
    this.refreshData()
    this.checkCooldown()
  },

  methods: {
    refreshData() {
      const settings = Store.getSettings()
      const today = Store.getToday()
      this.quitDays = Math.max(1, Store.getCleanDays())
      this.savedAmount = Store.getSavedMoney().toFixed(1)
      this.todaySmoked = today.smokedCount
      this.quotaTotal = settings.dailyQuota
      this.quotaPercent = settings.dailyQuota > 0 ? Math.min(today.smokedCount / settings.dailyQuota, 1) * 100 : 0
      this.badgesCount = this.calcBadges()
      this.updateMilestone()
    },

    calcBadges() {
      const sec = Store.getSmokeFreeDuration()
      let c = 0
      if (sec >= 1200) c++
      if (sec >= 43200) c++
      if (sec >= 1209600) c++
      if (sec >= 7776000) c++
      if (sec >= 15552000) c++
      const less = Store.getLessSmoked()
      if (less >= 10) c++
      if (less >= 50) c++
      if (Store.getSavedMoney() >= 100) c++
      return Math.min(c, 8)
    },

    updateMilestone() {
      const sec = Store.getSmokeFreeDuration()
      let next = MILESTONES[0]
      for (const m of MILESTONES) {
        if (sec < m.seconds) { next = m; break }
        next = m
      }
      this.milestoneLabel = next.label
    },

    checkCooldown() {
      const remain = Store.getCooldownRemain()
      this.cooldownRemain = remain
      if (remain > 0) {
        const m = Math.floor(remain / 60)
        const s = remain % 60
        this.cooldownStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        if (!this.cooldownTimer) {
          this.cooldownTimer = setInterval(() => this.checkCooldown(), 1000)
        }
      } else {
        if (this.cooldownTimer) {
          clearInterval(this.cooldownTimer)
          this.cooldownTimer = null
        }
      }
    },

    haveOne() {
      const check = Store.canSmoke()
      if (!check.can) {
        this.toastMsg = check.reason
        this.showToast = true
        setTimeout(() => { this.showToast = false }, 2000)
        return
      }
      // 跳转到品牌选择页
      uni.navigateTo({ url: '/pages/brand/brand' })
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
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

.main-scroll {
  flex: 1;
  height: 100%;
}

/* 至今已省卡片 */
.saved-card {
  border-radius: 32rpx;
  overflow: hidden;
  background-color: #1f1f1f;
  border: 1px solid #2a2a2a;
}

.saved-bar {
  width: 12rpx;
  background-color: #f59e0b;
  flex-shrink: 0;
}

/* 两列布局 */
.two-col {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12rpx;
}

/* 进度条 */
.progress-bar {
  margin-top: 16rpx;
  height: 12rpx;
  background-color: #2a2a2a;
  border-radius: 999rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #f59e0b;
  border-radius: 999rpx;
  transition: width 0.3s;
}

/* 广告 */
.ad-badge {
  font-size: 20rpx;
  color: #4b5563;
  background-color: #1f2937;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}

.ad-icon {
  width: 128rpx;
  height: 96rpx;
  border-radius: 16rpx;
  background: linear-gradient(135deg, #334155, #0f172a);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 底部按钮 */
.btn-container {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(100rpx + env(safe-area-inset-bottom, 0px));
  z-index: 30;
  padding: 16rpx 40rpx 0;
  background: linear-gradient(to top, #0f0f0f 40%, transparent);
}

.btn-have-one {
  width: 100%;
  padding: 24rpx 32rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  color: white;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 50%, #c0392b 100%);
  box-shadow: 0 12rpx 40rpx rgba(238, 90, 36, 0.35);
  border: none;
  position: relative;
  overflow: hidden;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.btn-have-one:active {
  transform: scale(0.97);
  box-shadow: 0 6rpx 20rpx rgba(238, 90, 36, 0.25);
}

.btn-have-one[disabled] {
  opacity: 0.5;
}

/* 脉冲动画 */
@keyframes btnPulse {
  0%, 100% { box-shadow: 0 12rpx 40rpx rgba(238, 90, 36, 0.35), 0 0 0 0 rgba(238, 90, 36, 0.4); }
  50% { box-shadow: 0 12rpx 40rpx rgba(238, 90, 36, 0.35), 0 0 0 16rpx rgba(238, 90, 36, 0); }
}

.btn-have-one:not([disabled]) {
  animation: btnPulse 2.8s ease-in-out infinite;
}

.btn-fire-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.btn-fire {
  font-size: 40rpx;
  line-height: 1;
}

.btn-text-wrap {
  flex: 1;
  text-align: left;
}

.btn-main-text {
  display: block;
  font-size: 34rpx;
  font-weight: bold;
  line-height: 1.2;
}

.btn-sub-text {
  display: block;
  font-size: 22rpx;
  opacity: 0.75;
  margin-top: 4rpx;
  line-height: 1.3;
}

/* Toast */
.toast {
  position: fixed;
  top: 160rpx;
  left: 50%;
  transform: translateX(-50%);
  background-color: #2a2a2a;
  border: 1px solid #374151;
  color: #e5e7eb;
  font-size: 28rpx;
  padding: 16rpx 32rpx;
  border-radius: 24rpx;
  z-index: 200;
}

/* 工具类 */
.flex { display: flex; }
.flex-1 { flex: 1; }
.items-center { align-items: center; }
.gap-12 { gap: 24rpx; }
.text-left { text-align: left; }
.text-xs { font-size: 24rpx; }
.text-sm { font-size: 28rpx; }
.text-base { font-size: 32rpx; }
.text-lg { font-size: 36rpx; }
.text-2xl { font-size: 48rpx; }
.text-4xl { font-size: 72rpx; }
.font-bold { font-weight: bold; }
.font-normal { font-weight: normal; }
.leading-none { line-height: 1; }
.block { display: block; }
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.overflow-hidden { overflow: hidden; }
.p-12 { padding: 24rpx; }
.p-16 { padding: 32rpx; }
.p-20 { padding: 40rpx; }
.px-20 { padding-left: 40rpx; padding-right: 40rpx; }
.pt-40 { padding-top: 80rpx; }
.pb-16 { padding-bottom: 32rpx; }
.mx-20 { margin-left: 40rpx; margin-right: 40rpx; }
.mb-16 { margin-bottom: 32rpx; }
.mt-4 { margin-top: 8rpx; }
.mt-8 { margin-top: 16rpx; }
.opacity-80 { opacity: 0.8; }
.text-gray-100 { color: #f3f4f6; }
.text-gray-300 { color: #d1d5db; }
.text-gray-500 { color: #6b7280; }
.text-gray-600 { color: #4b5563; }
.text-amber { color: #f59e0b; }
.bg-amber { background-color: #f59e0b; }
.card { background-color: #1f1f1f; border: 1px solid #2a2a2a; border-radius: 32rpx; }
</style>
