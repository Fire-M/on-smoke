<template>
  <view class="page-container">
    <!-- 顶部标题 -->
    <view class="ach-header">
      <view class="ach-header-row">
        <view class="ach-back-btn" @click="goBack">
          <text class="ach-back-icon">‹</text>
        </view>
        <text class="ach-title">成就勋章</text>
        <view class="ach-back-btn-placeholder"></view>
      </view>
      <view class="ach-progress-bar">
        <view class="ach-progress-fill" :style="{ width: progressPercent + '%' }"></view>
      </view>
      <text class="ach-progress-text">已解锁 {{ unlockedCount }}/{{ totalBadges }}</text>
    </view>

    <!-- 分类标签 -->
    <scroll-view scroll-x class="category-scroll">
      <view class="category-tabs">
        <view v-for="(cat, idx) in categories" :key="idx"
          class="category-tab" :class="{ active: currentCategory === idx }"
          @click="currentCategory = idx">
          <text>{{ cat.name }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 勋章网格 -->
    <scroll-view scroll-y class="badge-scroll">
      <view class="badge-grid">
        <view v-for="(badge, idx) in currentBadges" :key="idx"
          class="badge-card" :class="{ unlocked: badge.unlocked }"
          @click="showBadgeDetail(badge)">
          <view class="badge-icon-wrap">
            <text class="badge-icon">{{ badge.icon }}</text>
            <view v-if="!badge.unlocked" class="badge-lock">
              <text>🔒</text>
            </view>
          </view>
          <text class="badge-name">{{ badge.name }}</text>
          <text class="badge-desc">{{ badge.unlocked ? badge.desc : '未解锁' }}</text>
          <text v-if="badge.unlocked && badge.unlockTime" class="badge-time">
            {{ formatTime(badge.unlockTime) }}
          </text>
        </view>
      </view>

      <!-- 底部留白 -->
      <view style="height: 80rpx;"></view>
    </scroll-view>

    <!-- 勋章详情弹窗 -->
    <view class="badge-modal" v-if="showModal" @click="showModal = false">
      <view class="badge-modal-card" @click.stop>
        <text class="modal-icon">{{ selectedBadge.icon }}</text>
        <text class="modal-name">{{ selectedBadge.name }}</text>
        <text class="modal-desc">{{ selectedBadge.desc }}</text>
        <text v-if="selectedBadge.unlocked" class="modal-status unlocked">✅ 已解锁</text>
        <text v-else class="modal-status locked">🔒 未解锁</text>
        <text v-if="selectedBadge.unlocked && selectedBadge.unlockTime" class="modal-time">
          解锁时间：{{ formatTime(selectedBadge.unlockTime) }}
        </text>
        <button class="modal-close-btn" @click="showModal = false">关闭</button>
      </view>
    </view>
  </view>
</template>

<script>
import Store from '@/utils/store.js'

const BADGES = [
  // 戒烟里程碑
  { id: 'first_air_cig', name: '第一根空气烟', icon: '🚬', category: 0, desc: '首次完成吸烟', condition: (stats) => stats.totalSmoked >= 1 },
  { id: 'one_day', name: '坚持一天', icon: '⭐', category: 0, desc: '累计戒烟满 1 天', condition: (stats) => stats.cleanDays >= 1 },
  { id: 'three_days', name: '三天小成', icon: '🌟', category: 0, desc: '累计戒烟满 3 天', condition: (stats) => stats.cleanDays >= 3 },
  { id: 'one_week', name: '一周达人', icon: '🏅', category: 0, desc: '累计戒烟满 7 天', condition: (stats) => stats.cleanDays >= 7 },
  { id: 'half_month', name: '半月勇士', icon: '🎖️', category: 0, desc: '累计戒烟满 15 天', condition: (stats) => stats.cleanDays >= 15 },
  { id: 'one_month', name: '月度冠军', icon: '🏆', category: 0, desc: '累计戒烟满 30 天', condition: (stats) => stats.cleanDays >= 30 },
  { id: 'hundred_days', name: '百日英雄', icon: '👑', category: 0, desc: '累计戒烟满 100 天', condition: (stats) => stats.cleanDays >= 100 },

  // 省钱达人
  { id: 'save_10', name: '首枚硬币', icon: '💰', category: 1, desc: '累计省下 10 元', condition: (stats) => stats.totalSaved >= 10 },
  { id: 'save_50', name: '小富即安', icon: '💵', category: 2, desc: '累计省下 50 元', condition: (stats) => stats.totalSaved >= 50 },
  { id: 'save_100', name: '百元大关', icon: '💴', category: 1, desc: '累计省下 100 元', condition: (stats) => stats.totalSaved >= 100 },
  { id: 'save_1000', name: '千元户', icon: '💶', category: 1, desc: '累计省下 1000 元', condition: (stats) => stats.totalSaved >= 1000 },
  { id: 'save_10000', name: '万元户', icon: '💎', category: 1, desc: '累计省下 10000 元', condition: (stats) => stats.totalSaved >= 10000 },

  // 抽烟次数
  { id: 'smoke_1', name: '初试啼声', icon: '🎯', category: 2, desc: '首次抽完一根', condition: (stats) => stats.totalSmoked >= 1 },
  { id: 'smoke_10', name: '十根老手', icon: '🎪', category: 2, desc: '累计抽完 10 根', condition: (stats) => stats.totalSmoked >= 10 },
  { id: 'smoke_100', name: '百根大师', icon: '🎭', category: 2, desc: '累计抽完 100 根', condition: (stats) => stats.totalSmoked >= 100 },
  { id: 'smoke_1000', name: '千根传奇', icon: '🌠', category: 2, desc: '累计抽完 1000 根', condition: (stats) => stats.totalSmoked >= 1000 },

  // 特殊成就
  { id: 'night_smoker', name: '深夜烟民', icon: '🌙', category: 3, desc: '凌晨 0-5 点抽烟', condition: (stats) => stats.nightSmoked >= 1 },
  { id: 'early_bird', name: '早起鸟儿', icon: '🌅', category: 3, desc: '早晨 6-8 点抽烟', condition: (stats) => stats.earlySmoked >= 1 },
  { id: 'three_days_streak', name: '连续三天', icon: '🔥', category: 3, desc: '连续 3 天每天抽一根', condition: (stats) => stats.maxStreak >= 3 },
  { id: 'all_styles', name: '花样大师', icon: '🎨', category: 3, desc: '使用过所有 12 种吐烟花样', condition: (stats) => stats.stylesUsed >= 12 },
  { id: 'pass_10', name: '派烟达人', icon: '🤝', category: 3, desc: '累计派烟 10 次', condition: (stats) => stats.passedCount >= 10 },
  { id: 'tap_ash_50', name: '弹烟灰专家', icon: '💨', category: 3, desc: '累计弹烟灰 50 次', condition: (stats) => stats.ashTapped >= 50 },

  // 健康成就
  { id: 'lungs_breathing', name: '肺在呼吸', icon: '🫁', category: 4, desc: '累计戒烟满 3 天', condition: (stats) => stats.cleanDays >= 3 },
  { id: 'taste_return', name: '味觉回归', icon: '👅', category: 4, desc: '累计戒烟满 7 天', condition: (stats) => stats.cleanDays >= 7 },
  { id: 'blood_flow', name: '血液循环', icon: '❤️', category: 4, desc: '累计戒烟满 30 天', condition: (stats) => stats.cleanDays >= 30 },
  { id: 'cancer_risk_down', name: '癌症风险降', icon: '🛡️', category: 4, desc: '累计戒烟满 90 天', condition: (stats) => stats.cleanDays >= 90 },
]

const CATEGORIES = [
  { name: '全部', filter: () => true },
  { name: '戒烟里程碑', filter: (b) => b.category === 0 },
  { name: '省钱达人', filter: (b) => b.category === 1 },
  { name: '抽烟次数', filter: (b) => b.category === 2 },
  { name: '特殊成就', filter: (b) => b.category === 3 },
  { name: '健康成就', filter: (b) => b.category === 4 },
]

export default {
  data() {
    return {
      badges: [],
      categories: CATEGORIES,
      currentCategory: 0,
      showModal: false,
      selectedBadge: {},
    }
  },

  computed: {
    currentBadges() {
      if (this.currentCategory === 0) return this.badges
      return this.badges.filter(b => b.category === this.currentCategory)
    },
    unlockedCount() {
      return this.badges.filter(b => b.unlocked).length
    },
    totalBadges() {
      return this.badges.length
    },
    progressPercent() {
      if (this.totalBadges === 0) return 0
      return (this.unlockedCount / this.totalBadges) * 100
    }
  },

  onLoad() {
    this.loadBadges()
  },

  onShow() {
    this.loadBadges()
  },

  methods: {
    loadBadges() {
      const stats = Store.getStats()
      const unlockedBadges = Store.getUnlockedBadges() || {}
      
      // 测试：解锁前两个勋章
      const testUnlocked = { ...unlockedBadges }
      testUnlocked['first_air_cig'] = true
      testUnlocked['first_air_cig_time'] = Date.now() - 86400000 // 昨天
      testUnlocked['one_day'] = true
      testUnlocked['one_day_time'] = Date.now()
      
      this.badges = BADGES.map(badge => {
        const isUnlocked = testUnlocked[badge.id] || false
        return {
          ...badge,
          unlocked: isUnlocked,
          unlockTime: testUnlocked[badge.id + '_time'] || null
        }
      })
    },

    showBadgeDetail(badge) {
      this.selectedBadge = badge
      this.showModal = true
    },

    formatTime(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      const month = date.getMonth() + 1
      const day = date.getDate()
      return `${month}月${day}日`
    },

    goBack() {
      // 尝试返回上一页，如果没有上一页则跳转到首页
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack()
      } else {
        uni.switchTab({ url: '/pages/index/index' })
      }
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
  display: flex;
  flex-direction: column;
}

/* 顶部标题 */
.ach-header {
  padding: 40rpx 28rpx 24rpx;
}

.ach-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.ach-back-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.ach-back-btn-placeholder {
  width: 64rpx;
  height: 64rpx;
}

.ach-back-btn:active {
  background: rgba(255, 255, 255, 0.12);
  transform: scale(0.92);
}

.ach-back-icon {
  font-size: 48rpx;
  color: #f3f4f6;
}

.ach-title {
  font-size: 44rpx;
  font-weight: bold;
  color: #f3f4f6;
}

.ach-progress-bar {
  height: 12rpx;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8rpx;
  overflow: hidden;
  margin-bottom: 12rpx;
}

.ach-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b 0%, #ef4444 100%);
  border-radius: 8rpx;
  transition: width 0.3s ease;
}

.ach-progress-text {
  font-size: 24rpx;
  color: #9ca3af;
}

/* 分类标签 */
.category-scroll {
  padding: 0 28rpx;
  margin-bottom: 28rpx;
}

.category-tabs {
  display: flex;
  gap: 12rpx;
  flex-wrap: nowrap;
  overflow-x: auto;
  padding-bottom: 8rpx;
}

.category-tabs::-webkit-scrollbar {
  display: none;
}

.category-tab {
  padding: 14rpx 24rpx;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 16rpx;
  font-size: 24rpx;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.25s ease;
  border: 1px solid rgba(255, 255, 255, 0.06);
  white-space: nowrap;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.category-tab:active {
  transform: scale(0.95);
}

.category-tab.active {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(239, 68, 68, 0.1) 100%);
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.3);
  box-shadow: 0 2rpx 12rpx rgba(245, 158, 11, 0.15);
  font-weight: 600;
}

/* 勋章网格 */
.badge-scroll {
  flex: 1;
  padding: 0 28rpx;
}

.badge-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
}

.badge-card {
  position: relative;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20rpx;
  padding: 24rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  cursor: pointer;
  transition: all 0.25s ease;
  min-height: 280rpx;
}

.badge-card.unlocked {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.3);
  box-shadow: 0 0 20rpx rgba(245, 158, 11, 0.15);
}

.badge-card:active {
  transform: scale(0.95);
}

.badge-icon-wrap {
  position: relative;
  width: 96rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}

.badge-icon {
  font-size: 64rpx;
  filter: grayscale(100%);
  opacity: 0.4;
}

.badge-card.unlocked .badge-icon {
  filter: grayscale(0%);
  opacity: 1;
}

.badge-lock {
  position: absolute;
  bottom: -8rpx;
  right: -8rpx;
  width: 40rpx;
  height: 40rpx;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
}

.badge-name {
  font-size: 24rpx;
  font-weight: 600;
  color: #9ca3af;
  margin-bottom: 8rpx;
  line-height: 1.3;
}

.badge-card.unlocked .badge-name {
  color: #f59e0b;
}

.badge-desc {
  font-size: 20rpx;
  color: #6b7280;
  line-height: 1.3;
}

.badge-card.unlocked .badge-desc {
  color: #9ca3af;
}

.badge-time {
  font-size: 18rpx;
  color: #6b7280;
  margin-top: 8rpx;
}

/* 勋章详情弹窗 */
.badge-modal {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 48rpx;
}

.badge-modal-card {
  background: #1f1f1f;
  border: 1px solid #2a2a2a;
  border-radius: 32rpx;
  padding: 48rpx;
  width: 100%;
  text-align: center;
}

.modal-icon {
  font-size: 120rpx;
  display: block;
  margin-bottom: 24rpx;
}

.modal-name {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #f3f4f6;
  margin-bottom: 12rpx;
}

.modal-desc {
  display: block;
  font-size: 28rpx;
  color: #9ca3af;
  margin-bottom: 24rpx;
  line-height: 1.5;
}

.modal-status {
  display: block;
  font-size: 28rpx;
  margin-bottom: 16rpx;
}

.modal-status.unlocked {
  color: #10b981;
}

.modal-status.locked {
  color: #6b7280;
}

.modal-time {
  display: block;
  font-size: 24rpx;
  color: #6b7280;
  margin-bottom: 32rpx;
}

.modal-close-btn {
  background: #f59e0b;
  color: #0f0f0f;
  font-weight: bold;
  border: none;
  padding: 16rpx;
  border-radius: 16rpx;
  font-size: 28rpx;
  width: 100%;
}
</style>
