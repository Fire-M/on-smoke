<template>
  <view class="page-container" :class="themeClass()">
    <app-navbar title="就抽一根"></app-navbar>
    <!-- 可滚动仪表盘内容 -->
    <scroll-view scroll-y class="main-scroll">
      <!-- 顶部：戒烟天数 + 激励语 -->
      <view class="px-20 pt-20 pb-16">
        <text class="text-sm text-gray-400">戒烟 第 <text class="text-amber font-bold text-base">{{ quitDays }}</text> 天</text>
        <text class="text-2xl font-bold text-gray-100 mt-4 block">嘴又痒了?</text>
      </view>

      <!-- 至今已省卡片 -->
      <view class="mx-20 mb-16 saved-card">
        <view class="flex">
          <view class="saved-bar"></view>
          <view class="flex-1 p-20">
            <text class="text-sm text-gray-400 mb-8 block">至今已省</text>
            <text class="text-4xl font-bold text-amber">¥{{ savedAmount }}</text>
            <text class="text-sm text-gray-500 mt-12 block">约 {{ Math.floor(savedAmount / 5) }} 包辣条 · {{ Math.floor(savedAmount / 15) }} 杯咖啡</text>
          </view>
        </view>
      </view>

      <!-- 今日假抽 + 连续打卡 -->
      <view class="mx-20 mb-16 two-col">
        <view class="card p-16">
          <text class="text-sm text-gray-400 mb-8 block">今日假抽</text>
          <text class="text-2xl font-bold text-gray-100">{{ todaySmoked }} / {{ effectiveQuota }} 根</text>
          <view class="progress-bar">
            <view class="progress-fill" :style="{ width: quotaPercent + '%' }"></view>
          </view>
          <!-- 看广告+1根 -->
          <view class="ad-quota-btn" @click="watchAdForQuota" v-if="adRewardRemain > 0">
            <text class="ad-quota-icon">🎬</text>
            <text class="ad-quota-text">看广告 +1 根</text>
          </view>
        </view>
        <view class="card p-16">
          <text class="text-sm text-gray-400 mb-8 block">连续打卡</text>
          <text class="text-2xl font-bold text-gray-100">{{ quitDays }} 天</text>
          <text class="text-sm text-amber mt-8 block">🔥 别破戒</text>
        </view>
      </view>

      <!-- 身体恢复 + 成就徽章 -->
      <view class="mx-20 mb-16 two-col">
        <view class="card p-16 flex items-center gap-12 recovery-card" @click="goToRecovery">
          <text class="card-icon">🫁</text>
          <view>
            <text class="text-sm text-gray-300 block">身体恢复</text>
            <text class="text-sm text-gray-500 mt-4 block"><text class="text-amber">{{ milestoneLabel }}</text> <text class="text-amber">里程碑</text></text>
          </view>
        </view>
        <view class="card p-16 flex items-center gap-12 achievement-card" @click="goToAchievements">
          <text class="card-icon">🏆</text>
          <view>
            <text class="text-sm text-gray-300 block">成就徽章</text>
            <text class="text-sm text-gray-500 mt-4 block">{{ badgesCount }} / 8 已解锁</text>
          </view>
        </view>
      </view>

      <!-- 烟瘾追踪 -->
      <view class="mx-20 mb-16">
        <view class="card p-16 flex items-center gap-12 craving-card" @click="goToCraving">
          <text class="card-icon">📝</text>
          <view class="flex-1">
            <text class="text-sm text-gray-300 block">烟瘾追踪</text>
            <text class="text-sm text-gray-500 mt-4 block">今天 {{ todayCravings }} 次烟瘾 · 抵抗 {{ resistedCount }} 次</text>
          </view>
        </view>
      </view>

      <!-- 每日挑战 -->
      <view class="mx-20 mb-16">
        <view class="challenge-card" :class="{ completed: challengeCompleted }">
          <view class="challenge-header">
            <text class="challenge-icon">{{ challengeIcon }}</text>
            <view class="flex-1">
              <text class="text-sm text-gray-300 block">今日挑战</text>
              <text class="text-sm text-gray-500 mt-4 block">{{ challengeTitle }}</text>
            </view>
            <text v-if="challengeCompleted" class="challenge-badge">✅ 已完成</text>
            <text v-if="!challengeCompleted && challengeStreak > 0" class="challenge-streak">🔥 {{ challengeStreak }}天</text>
          </view>
          <view class="challenge-progress-bar" v-if="!challengeCompleted">
            <view class="challenge-progress-fill" :style="{ width: challengeProgress + '%' }"></view>
          </view>
        </view>
      </view>

      <!-- 更多功能 -->
      <view class="mx-20 mb-16">
        <view class="feature-grid">
          <view class="feature-item" @click="goToMood">
            <text class="feature-icon">😊</text>
            <text class="feature-name">情绪日记</text>
          </view>
          <view class="feature-item" @click="goToBreathing">
            <text class="feature-icon">🧘</text>
            <text class="feature-name">呼吸引导</text>
          </view>
          <view class="feature-item" @click="goToSavings">
            <text class="feature-icon">💰</text>
            <text class="feature-name">省钱目标</text>
          </view>
          <view class="feature-item" @click="goToTimeCapsule">
            <text class="feature-icon">✍️</text>
            <text class="feature-name">时间胶囊</text>
          </view>
          <view class="feature-item" @click="goToPet">
            <text class="feature-icon">🐱</text>
            <text class="feature-name">我的宠物</text>
          </view>
          <view class="feature-item" @click="goToHealthCalc">
            <text class="feature-icon">❤️</text>
            <text class="feature-name">健康计算</text>
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
          <text class="btn-fire">🚬</text>
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
import AdManager from '@/utils/ad-manager.js'
import CustomTabbar from '@/components/custom-tabbar/custom-tabbar.vue'
import AppNavbar from '@/components/app-navbar/app-navbar.vue'
import { themeClass } from '@/utils/theme.js'

const MILESTONES = [
  { seconds: 1200, label: '20分钟' },
  { seconds: 43200, label: '12小时' },
  { seconds: 1209600, label: '2周' },
  { seconds: 7776000, label: '3月' },
  { seconds: 15552000, label: '1年' }
]

export default {
  components: { CustomTabbar, AppNavbar },
  data() {
    return {
      quitDays: 1,
      savedAmount: '0.0',
      todaySmoked: 0,
      quotaTotal: 5,
      effectiveQuota: 5,
      adRewardRemain: 10,
      quotaPercent: 0,
      milestoneLabel: '20分钟',
      badgesCount: 0,
      cooldownRemain: 0,
      cooldownStr: '',
      showToast: false,
      toastMsg: '',
      todayCravings: 0,
      resistedCount: 0,
      challengeTitle: '',
      challengeIcon: '🎯',
      challengeCompleted: false,
      challengeStreak: 0,
      challengeProgress: 0,
      cooldownTimer: null,
      midnightTimer: null
    }
  },

  onLoad() {
    this.refreshData()
    this.checkCooldown()
    this.midnightTimer = setInterval(() => this.refreshData(), 30000)
    
    // 初始化广告
    AdManager.initRewardedAd()
    AdManager.initInterstitialAd()
    
    // 每日首次打开插屏广告
    if (AdManager.checkDailyFirstOpen()) {
      setTimeout(() => {
        AdManager.showInterstitialAd('app_open')
      }, 3000)
    }
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
      this.effectiveQuota = Store.getEffectiveQuota()
      this.adRewardRemain = AdManager.getRewardRemain()
      this.quotaPercent = this.effectiveQuota > 0 ? Math.min(today.smokedCount / this.effectiveQuota, 1) * 100 : 0
      this.badgesCount = this.calcBadges()
      this.updateMilestone()
      
      // 烟瘾统计
      const cravingStats = Store.getCravingStats()
      this.todayCravings = cravingStats.today
      // 统计今天抵抗的次数
      const todayDate = new Date()
      this.resistedCount = Store.getCravings().filter(c => {
        const d = new Date(c.timestamp)
        return d.toDateString() === todayDate.toDateString() && c.resisted
      }).length
      
      // 每日挑战
      const challenge = Store.getDailyChallenge()
      this.challengeTitle = challenge.title
      this.challengeIcon = challenge.icon
      this.challengeCompleted = challenge.completed
      this.challengeStreak = Store.getChallengeStreak()
      
      // 计算挑战进度
      if (challenge.type === 'limit') {
        // 限制类挑战：已吸烟数越少，进度越高
        if (today.smokedCount === 0) {
          this.challengeProgress = 50
        } else if (today.smokedCount >= challenge.target) {
          this.challengeProgress = 0
        } else if (challenge.target === 1) {
          // 目标是 1 根时，抽了 0 根就是 100%
          this.challengeProgress = 100
        } else {
          // 已抽 target-1 根时，进度为 100%
          this.challengeProgress = Math.max(0, Math.min(100, (1 - (today.smokedCount - 1) / (challenge.target - 1)) * 100))
        }
      } else if (challenge.type === 'save') {
        const saved = Store.getSavedMoney()
        this.challengeProgress = Math.min(100, (saved / challenge.target) * 100)
      } else if (challenge.type === 'resist') {
        this.challengeProgress = Math.min(100, (this.resistedCount / challenge.target) * 100)
      }
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
    },

    goToAchievements() {
      uni.navigateTo({ url: '/pages/achievements/achievements' })
    },

    goToRecovery() {
      uni.navigateTo({ url: '/pages/recovery/recovery' })
    },

    goToCraving() {
      uni.navigateTo({ url: '/pages/craving/craving' })
    },

    goToMood() {
      uni.navigateTo({ url: '/pages/mood/mood' })
    },

    goToBreathing() {
      uni.navigateTo({ url: '/pages/breathing/breathing' })
    },

    goToSavings() {
      uni.navigateTo({ url: '/pages/savings/savings' })
    },

    goToTimeCapsule() {
      uni.navigateTo({ url: '/pages/time-capsule/time-capsule' })
    },

    goToPet() {
      uni.navigateTo({ url: '/pages/pet/pet' })
    },

    goToHealthCalc() {
      uni.navigateTo({ url: '/pages/health-calc/health-calc' })
    },

    watchAdForQuota() {
      AdManager.showRewardedAd('quota').then(success => {
        if (success) {
          Store.addExtraQuota()
          this.refreshData()
        }
      })
    }
  }
}
</script>

<style>
.page-container {
  height: 100vh;
  width: 100vw;
  background-color: var(--bg);
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
  background: linear-gradient(135deg, var(--surface-2) 0%, var(--surface-1) 100%);
  border: 1px solid var(--border);
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.2);
}

.saved-bar {
  width: 12rpx;
  background-color: var(--primary);
  flex-shrink: 0;
}

/* 卡片图标 */
.card-icon {
  font-size: 56rpx;
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
  background-color: var(--border);
  border-radius: 999rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--primary);
  border-radius: 999rpx;
  transition: width 0.3s;
}

/* 底部按钮 */
.btn-container {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(140rpx + env(safe-area-inset-bottom, 0px));
  z-index: 30;
  padding: 16rpx 40rpx 0;
  background: linear-gradient(to top, #0f0f0f 40%, transparent);
}

.btn-have-one {
  width: 100%;
  padding: 36rpx 32rpx;
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

/* 闪烁动画 */
@keyframes btnFlash {
  0%, 100% { 
    box-shadow: 0 12rpx 40rpx rgba(238, 90, 36, 0.35);
    filter: brightness(1);
    transform: scale(1);
  }
  50% { 
    box-shadow: 0 16rpx 50rpx rgba(238, 90, 36, 0.6), 0 0 30rpx rgba(255, 200, 100, 0.4);
    filter: brightness(1.15);
    transform: scale(1.02);
  }
}

.btn-have-one:not([disabled]) {
  animation: btnFlash 1.5s ease-in-out infinite;
}

.btn-fire-wrap {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.btn-fire {
  font-size: 80rpx;
  line-height: 1;
}

.btn-text-wrap {
  flex: 1;
  text-align: center;
}

.btn-main-text {
  display: block;
  font-size: 42rpx;
  font-weight: bold;
  line-height: 1.2;
}

.btn-sub-text {
  display: block;
  font-size: 24rpx;
  opacity: 0.75;
  margin-top: 6rpx;
  line-height: 1.3;
}

/* Toast */
.toast {
  position: fixed;
  top: 160rpx;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text);
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
.text-amber { color: var(--primary); }
.bg-amber { background-color: var(--primary); }
.card { 
  background: linear-gradient(135deg, var(--surface-2) 0%, var(--surface-1) 100%);
  border: 1px solid var(--border); 
  border-radius: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.15);
}

.achievement-card {
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.achievement-card:active {
  transform: scale(0.97);
  background: linear-gradient(135deg, var(--surface-1) 0%, var(--surface-2) 100%);
}

.achievement-card::after {
  content: '›';
  position: absolute;
  right: 16rpx;
  top: 50%;
  transform: translateY(-50%);
  font-size: 32rpx;
  color: #6b7280;
}

.recovery-card {
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.recovery-card:active {
  transform: scale(0.97);
  background: linear-gradient(135deg, var(--surface-1) 0%, var(--surface-2) 100%);
}

.recovery-card::after {
  content: '›';
  position: absolute;
  right: 16rpx;
  top: 50%;
  transform: translateY(-50%);
  font-size: 32rpx;
  color: #6b7280;
}

.craving-card {
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.craving-card:active {
  transform: scale(0.97);
  background: linear-gradient(135deg, var(--surface-1) 0%, var(--surface-2) 100%);
}

.craving-card::after {
  content: '›';
  position: absolute;
  right: 16rpx;
  top: 50%;
  transform: translateY(-50%);
  font-size: 32rpx;
  color: #6b7280;
}

/* 每日挑战卡片 */
.challenge-card {
  background: linear-gradient(135deg, var(--surface-2) 0%, var(--surface-1) 100%);
  border: 1px solid var(--border);
  border-radius: 32rpx;
  padding: 32rpx;
  position: relative;
  overflow: hidden;
}

.challenge-card.completed {
  border-color: rgba(16, 185, 129, 0.3);
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0.02) 100%);
}

.challenge-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.challenge-icon {
  font-size: 56rpx;
}

.challenge-badge {
  font-size: 22rpx;
  color: #10b981;
  font-weight: 600;
}

.challenge-streak {
  font-size: 22rpx;
  color: #f59e0b;
  font-weight: 600;
}

.challenge-progress-bar {
  height: 12rpx;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 8rpx;
  overflow: hidden;
}

.challenge-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary) 0%, #10b981 100%);
  border-radius: 8rpx;
  transition: width 0.3s ease;
}

/* 更多功能网格 */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.feature-item {
  background: linear-gradient(135deg, var(--surface-2) 0%, var(--surface-1) 100%);
  border: 1px solid var(--border);
  border-radius: 20rpx;
  padding: 24rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  cursor: pointer;
  transition: all 0.2s;
}

.feature-item:active {
  transform: scale(0.95);
  background: linear-gradient(135deg, var(--surface-1) 0%, var(--surface-2) 100%);
}

.feature-icon {
  font-size: 64rpx;
}

.feature-name {
  font-size: 24rpx;
  color: #d1d5db;
}

/* 看广告+1根按钮 */
.ad-quota-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  margin-top: 16rpx;
  padding: 10rpx 16rpx;
  background: var(--glow);
  border: 1px solid var(--glow);
  border-radius: 16rpx;
}

.ad-quota-btn:active {
  opacity: 0.7;
  transform: scale(0.97);
}

.ad-quota-icon {
  font-size: 28rpx;
}

.ad-quota-text {
  font-size: 22rpx;
  color: var(--primary);
  font-weight: 600;
}
</style>
