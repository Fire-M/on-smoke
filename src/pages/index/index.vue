<template>
  <view class="page-container" :class="themeClass()">
    <app-navbar title="就抽一根"></app-navbar>
    <!-- 可滚动仪表盘内容 -->
    <scroll-view scroll-y class="main-scroll">
      <!-- Hero：戒烟天数（全页最大字号——这是用户最该看到的成果，
           原来这里用的 text-sm 却把 text-4xl 给了「省钱」，层级是倒的） -->
      <view class="mx-20 mt-16 mb-16 hero-card">
        <text class="text-sm text-gray-400 block">戒烟 第</text>
        <view class="hero-days-row">
          <text class="hero-days" :class="{ bump: heroBump }">{{ quitDays }}</text>
          <text class="hero-unit">天</text>
        </view>
        <text class="text-sm text-gray-500 mt-8 block">💨 已熬过 <text style="color: var(--primary); font-weight: 600;">{{ quitHours }}</text> 小时 · 连续打卡 <text style="color: var(--primary); font-weight: 600;">{{ streakDays }}</text> 天</text>
        <text class="hero-quote mt-12 block">嘴又痒了?</text>
      </view>

      <!-- 今日已抽 / 今日剩余：两组数字对角对称，同字号同状态色，
           进度条走「已抽 / 配额」，底部补总量，全程不用心算 -->
      <view class="mx-20 mb-16">
        <view class="card p-20">
          <!-- 已抽 / 剩余 对角对称：两组数字共用同一套字号与状态色规则，
               不给剩余单独做小胶囊，只靠左右位置区分主次 -->
          <view class="quota-header">
            <view class="quota-stat">
              <text class="text-sm text-gray-400">今日已抽</text>
              <view class="quota-row">
                <text class="quota-remain" :class="[quotaLevel, { bump: heroBump }]">{{ todaySmoked }}</text>
                <text class="quota-unit">根</text>
              </view>
            </view>
            <view class="quota-stat quota-stat-right">
              <text class="text-sm text-gray-400">今日剩余</text>
              <view class="quota-row">
                <text class="quota-remain" :class="quotaLevel">{{ quotaRemain }}</text>
                <text class="quota-unit">根</text>
              </view>
            </view>
          </view>
          <view class="progress-bar">
            <view class="progress-fill" :class="quotaLevel" :style="{ width: quotaPercent + '%' }"></view>
          </view>
          <!-- 剩余已在右侧同款展示，这里只补总量，避免同一信息重复 -->
          <text class="text-sm text-gray-500 mt-12 block">配额 {{ effectiveQuota }} 根</text>

          <!-- 还有额度：看广告加一根 -->
          <view class="ad-quota-btn" @click="watchAdForQuota" v-if="quotaRemain <= 0 && adRewardRemain > 0">
            <text class="ad-quota-icon">🎬</text>
            <text class="ad-quota-text">看广告 +1 根</text>
          </view>
          <!-- 配额用完：给个出口而不是让用户干瞪眼 -->
          <view class="quota-empty-tip" v-if="quotaRemain <= 0">
            <text class="quota-empty-text">今天的额度用完了</text>
            <button class="quota-alt-btn" @click.stop="goToBreathing">去做个呼吸练习</button>
          </view>
        </view>
      </view>

      <!-- 至今已省（降级为普通尺寸，视觉重心让给 Hero） -->
      <view class="mx-20 mb-16 saved-card">
        <view class="flex">
          <view class="saved-bar"></view>
          <view class="flex-1 p-20">
            <text class="text-sm text-gray-400 mb-8 block">至今已省</text>
            <text class="text-2xl font-bold text-amber">¥{{ savedAmount }}</text>
            <!-- 金额还不够一个换算单位时不要显示「0 包辣条」。
                 用数值字段判断，避免拿字符串去比大小的隐式转换 -->
            <text class="text-sm text-gray-500 mt-12 block" v-if="savedCups >= 1">
              约 {{ savedPackages }} 包辣条 · {{ savedCups }} 杯咖啡
            </text>
            <text class="text-sm text-gray-500 mt-12 block" v-else-if="savedPackages >= 1">
              约 {{ savedPackages }} 包辣条
            </text>
            <text class="text-sm text-gray-500 mt-12 block" v-else>
              再忍忍，第一包辣条快到手了 💪
            </text>
          </view>
        </view>
      </view>

      <!-- 三列紧凑小卡：原来「烟瘾追踪」单卡 + 两组 two-col 连着排，
           视觉节奏重复且占地，这里压成一个三列，信息密度更高 -->
      <view class="mx-20 mb-16 three-col">
        <view class="mini-card" @click="goToCraving">
          <text class="mini-icon">📝</text>
          <text class="mini-value text-amber">{{ todayCravings }}</text>
          <text class="mini-label">今日烟瘾</text>
        </view>
        <view class="mini-card" @click="goToAchievements">
          <text class="mini-icon">🏆</text>
          <text class="mini-value text-amber">{{ badgesCount }}<text class="mini-sub">/{{ badgesTotal }}</text></text>
          <text class="mini-label">成就徽章</text>
        </view>
        <view class="mini-card" @click="goToRecovery">
          <text class="mini-icon">🫁</text>
          <text class="mini-value text-amber milestone-val">{{ milestoneLabel }}</text>
          <text class="mini-label">下一里程碑</text>
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

// 健康恢复里程碑（秒）。注意第 5 项原为 15552000（180 天）却标成「1年」，
// 1 年应为 31536000 秒，与 recovery.vue / health-calc.vue 保持一致。
const MILESTONES = [
  { seconds: 1200, label: '20分钟' },
  { seconds: 43200, label: '12小时' },
  { seconds: 1209600, label: '2周' },
  { seconds: 7776000, label: '3月' },
  { seconds: 31536000, label: '1年' }
]

export default {
  components: { CustomTabbar, AppNavbar },
  data() {
    return {
      quitDays: 1,
      streakDays: 0,
      savedAmount: '0.0',
      todaySmoked: 0,
      quotaTotal: 5,
      effectiveQuota: 5,
      adRewardRemain: 10,
      quotaPercent: 0,
      // 已抽根数的语义色由 computed quotaLevel 实时算（避免 dev HMR 漏赋值）
      // Hero 副标题：已熬过多少小时
      quitHours: 0,
      // 「还能抽 N 根」直接显示给用户，避免心算 quota−smoked
      quotaRemain: 0,
      // 换算单位（用数值字段判断「0 包辣条」文案）
      savedPackages: 0,
      savedCups: 0,
      // 数字变化时的强调动画（抽完一根烟回来能立刻看到反馈）
      heroBump: false,
      lastHeroKey: '',
      milestoneLabel: '20分钟',
      badgesCount: 0,
      badgesTotal: 0,
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

  computed: {
    // 已抽根数按进度的语义色：good 绿（< 50%）→ warn 琥珀（50%~100%）→ over 红（用完）
    // 用 computed 而非 data + refreshData：每次渲染都重算，避免任何时序/HMR 漏赋值
    quotaLevel() {
      const smoked = Number(this.todaySmoked) || 0
      const quota = Number(this.effectiveQuota) || 0
      if (quota <= 0) return 'good'   // 未设配额时没"消耗进度"概念，给中性色
      const ratio = smoked / quota
      return ratio < 0.5 ? 'good' : (ratio < 1 ? 'warn' : 'over')
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

      // 先把「昨天及之前」的省钱结算掉，并同步勋章/挑战状态
      Store.settleDailySavings()
      Store.syncBadges()

      // 戒烟天数：getCleanDays 是「满 N 天」，展示用「第 N 天」含当天
      this.quitDays = Store.getCleanDays() + 1
      // Hero 副标题：已熬过多少小时
      this.quitHours = Math.floor(Store.getSmokeFreeDuration() / 3600)
      // 连续打卡：history 里连续每天至少 1 根的天数
      this.streakDays = Store.getSmokeStreak()

      const savedNum = Store.getSavedMoney()
      this.savedAmount = savedNum.toFixed(1)
      // 渲染防御：强制转数字，避免 boolean/undefined 被 Vue 当字符串渲染成 "true"/"false"
      const savedSafe = Number(savedNum) || 0
      this.savedPackages = Math.max(0, Math.floor(savedSafe / 5))
      this.savedCups = Math.max(0, Math.floor(savedSafe / 15))

      const smokedSafe = Number(today.smokedCount) || 0
      const effectiveSafe = Number(Store.getEffectiveQuota()) || 0
      this.effectiveQuota = effectiveSafe
      this.quotaTotal = Number(settings.dailyQuota) || 0
      this.todaySmoked = smokedSafe
      // 直接给「还能抽几根」，不让用户自己算 quota − smoked
      this.quotaRemain = Math.max(0, effectiveSafe - smokedSafe)
      this.adRewardRemain = AdManager.getRewardRemain()
      this.quotaPercent = effectiveSafe > 0 ? Math.min(smokedSafe / effectiveSafe, 1) * 100 : 0
      // quotaLevel 改由 computed 算，避免 dev HMR 时 data 字段未及时赋值
      this.badgesCount = Store.getBadgeList().filter(b => b.unlocked).length
      this.badgesTotal = Store.BADGE_LIST.length
      this.updateMilestone()

      // 烟瘾统计（统一用本地日界，与 store 一致）
      const cravingStats = Store.getCravingStats()
      this.todayCravings = cravingStats.today
      const todayStr = Store.todayStr()
      this.resistedCount = Store.getCravings().filter(c => {
        return c.resisted && Store.todayStr(c.timestamp) === todayStr
      }).length

      // 每日挑战：计算进度并回写，否则 completed / streak 永远不会更新
      const challenge = Store.getDailyChallenge()
      this.challengeTitle = challenge.title
      this.challengeIcon = challenge.icon
      this.challengeProgress = this.calcChallengeProgress(challenge, today)
      Store.updateChallengeProgress(this.challengeProgress)
      this.challengeCompleted = !!challenge.completed
      this.challengeStreak = Store.getChallengeStreak()

      // 数字变了就闪一下，让「又扛住一天」有即时反馈
      this.bumpIfChanged()
    },

    // Hero 数字变化时短暂放大 + 提亮（纯 CSS transition，不引动画库）
    bumpIfChanged() {
      // 用 todaySmoked 而不是 quotaRemain：后者被 max(0,…) 夹住，
      // 配额用完后再抽会停在 0，动画就不再触发了
      const key = this.quitDays + '_' + this.todaySmoked
      if (this.lastHeroKey === '') {
        this.lastHeroKey = key
        return
      }
      if (this.lastHeroKey === key) return
      this.lastHeroKey = key
      this.heroBump = false
      this.$nextTick(() => {
        this.heroBump = true
        setTimeout(() => { this.heroBump = false }, 600)
      })
    },

    // 按挑战类型计算进度，并把「达标判定」交给 store
    calcChallengeProgress(challenge, today) {
      if (challenge.type === 'limit') {
        // 「不超过 N 根」：配额用掉的越少越好，进度 = 剩余额度占比
        const target = challenge.target || 1
        const remain = Math.max(0, target - (today.smokedCount || 0))
        return Math.round(Math.min(100, (remain / target) * 100))
      }
      if (challenge.type === 'save') {
        const saved = Store.getTodaySaved()
        return Math.round(Math.min(100, (saved / challenge.target) * 100))
      }
      if (challenge.type === 'resist') {
        return Math.round(Math.min(100, (this.resistedCount / challenge.target) * 100))
      }
      if (challenge.type === 'time_range') {
        // 该时段内一根没抽才算达标；时段没过完先按当前结果展示
        const range = challenge.target || { start: 0, end: 12 }
        const hour = new Date().getHours()
        if (hour < range.end) return 0
        const inRange = Store.getHistory().filter(r => {
          const d = new Date(r.timestamp)
          return Store.todayStr(r.timestamp) === Store.todayStr()
            && d.getHours() >= range.start && d.getHours() < range.end
        }).length
        return inRange === 0 ? 100 : 0
      }
      if (challenge.type === 'delay') {
        // 「延迟 1 小时」：距上次抽烟已过去多少分钟
        const last = today.lastSmokeTime
        if (!last) return 100
        const minutes = Math.floor((Date.now() - last) / 60000)
        return Math.round(Math.min(100, (minutes / challenge.target) * 100))
      }
      return 0
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

/* ===== Hero 区：戒烟天数 ===== */
/* 沿用 saved-card 的「左侧主色条」语言，不引入新的视觉元素 */
.hero-card {
  border-radius: 32rpx;
  padding: 32rpx 40rpx;
  background: linear-gradient(135deg, var(--surface-2) 0%, var(--surface-1) 100%);
  border: 1px solid var(--border);
  border-left: 12rpx solid var(--primary);
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.2);
}

.hero-days-row {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin-top: 4rpx;
}

.hero-days {
  font-size: 96rpx;
  font-weight: 800;
  line-height: 1.1;
  color: var(--primary);
  display: inline-block;
  transition: transform 0.35s ease, filter 0.35s ease;
}

.hero-unit {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--text-dim);
}

.hero-quote {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--text);
}

/* 数字变化时的强调（由 bumpIfChanged 触发） */
.hero-days.bump,
.quota-remain.bump {
  transform: scale(1.18);
  filter: brightness(1.25);
}

/* ===== 今天还能抽 ===== */
/* ===== 今日已抽 / 今日剩余：对角对称 ===== */
/* 两组数字共用 .quota-remain / .quota-unit 的同一套字号、字重与状态色，
   不再给剩余单独做小胶囊，左右视觉权重保持一致 */
.quota-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.quota-stat {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}

/* 右侧一组整体靠右，与左侧「今日已抽」形成对角阅读线 */
.quota-stat-right {
  align-items: flex-end;
}

.quota-stat-right .quota-row {
  justify-content: flex-end;
}

.quota-row {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin: 4rpx 0 0;
}

.quota-remain {
  font-size: 80rpx;
  font-weight: 800;
  line-height: 1.15;
  color: var(--text);
  display: inline-block;
  transition: transform 0.35s ease, filter 0.35s ease, color 0.3s ease;
}

/* 已抽根数按进度变色，让数字自己会说话。
   三档全取自主题自身变量，不用 --accent：accent 在各主题里语义不一致
   （mint 主题的 primary 是绿、accent 是琥珀，与 amber 主题正好反过来），
   用它会导致同一套状态在不同主题下意思漂移。
   good 主色（还很宽裕）→ warn 次色（快用完）→ over 危险红（归零） */
.quota-remain.good { color: var(--primary) !important; }
.quota-remain.warn { color: var(--primary-2) !important; }
.quota-remain.over { color: var(--danger-1) !important; }

.quota-unit {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--text-dim);
}

/* 配额用完的替代引导 */
.quota-empty-tip {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.quota-empty-text {
  font-size: 26rpx;
  color: var(--text-dim);
  flex: 1;
}

.quota-alt-btn {
  flex-shrink: 0;
  padding: 14rpx 28rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 600;
  border: 1px solid var(--primary);
  color: var(--primary);
  background: transparent;
  line-height: 1;
}

.quota-alt-btn:active {
  background: var(--primary);
  color: var(--bg);
}

/* ===== 三列紧凑小卡 ===== */
.three-col {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
}

.mini-card {
  background: linear-gradient(135deg, var(--surface-2) 0%, var(--surface-1) 100%);
  border: 1px solid var(--border);
  border-radius: 24rpx;
  padding: 24rpx 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  transition: transform 0.2s ease;
}

.mini-card:active {
  transform: scale(0.96);
}

.mini-icon {
  font-size: 44rpx;
  line-height: 1;
}

.mini-value {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
}

.mini-sub {
  font-size: 24rpx;
  font-weight: 400;
  color: var(--text-dim);
}

.mini-label {
  font-size: 22rpx;
  color: var(--text-dim);
}

/* 里程碑文字较长（如「20分钟」），单独压字号避免撑破三列 */
.milestone-val {
  font-size: 30rpx;
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

/* 进度条跟上数字的颜色，保持「数字=进度」是同一件事的观感。
   App.vue 的 .progress-fill 带 !important，这里必须同样加才能覆盖 */
.progress-fill.good { background-color: var(--primary) !important; }
.progress-fill.warn { background-color: var(--primary-2) !important; }
.progress-fill.over { background-color: var(--danger-1) !important; }

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
