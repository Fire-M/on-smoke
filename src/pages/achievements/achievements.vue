<template>
  <view class="page-container" :class="themeClass()">
    <app-navbar title="成就勋章"></app-navbar>
    <!-- 顶部标题 -->
    <view class="ach-header">
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
import AppNavbar from '@/components/app-navbar/app-navbar.vue'
import { themeClass } from '@/utils/theme.js'

// 勋章定义统一放在 store.js（Store.BADGE_LIST），首页与本页面共用同一份数据，
// 避免出现「首页算一套 / 成就页算一套」的不一致。
const CATEGORIES = [
  { name: '全部', filter: () => true },
  { name: '戒烟里程碑', filter: (b) => b.category === 0 },
  { name: '省钱达人', filter: (b) => b.category === 1 },
  { name: '抽烟次数', filter: (b) => b.category === 2 },
  { name: '特殊成就', filter: (b) => b.category === 3 },
  { name: '健康成就', filter: (b) => b.category === 4 },
]

export default {
  components: { AppNavbar },
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
      // 直接用 CATEGORIES 里定义的 filter：分类项索引(1~5)和徽章的 category(0~4)
      // 是两套编号，拿索引去比字段值会整体错位一格，且「健康成就」永远空白
      const cat = CATEGORIES[this.currentCategory]
      if (!cat) return this.badges
      return this.badges.filter(cat.filter)
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
      // 先按当前真实数据结算一次（省钱 / 挑战），再自动解锁符合条件的勋章。
      // 之前这里硬编码解锁前两枚，且 badge.condition 从未被调用，页面永远显示 2/23。
      Store.settleDailySavings()
      Store.syncBadges()
      this.badges = Store.getBadgeList()
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
    }
  }
}
</script>

<style>
.page-container {
  height: 100vh;
  width: 100vw;
  background-color: var(--bg);
  color: var(--text);
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
  background: linear-gradient(90deg, var(--primary) 0%, #ef4444 100%);
  border-radius: 8rpx;
  transition: width 0.3s ease;
}

.ach-progress-text {
  font-size: 24rpx;
  color: var(--text-dim);
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
  color: var(--text-dim);
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
  color: var(--primary);
  border-color: rgba(245, 158, 11, 0.3);
  box-shadow: 0 2rpx 12rpx rgba(245, 158, 11, 0.15);
  font-weight: 600;
}

/* 勋章网格 */
.badge-scroll {
  flex: 1;
  height: 100%;
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
  color: var(--text-dim);
  margin-bottom: 8rpx;
  line-height: 1.3;
}

.badge-card.unlocked .badge-name {
  color: var(--primary);
}

.badge-desc {
  font-size: 20rpx;
  color: var(--text-dim);
  line-height: 1.3;
}

.badge-card.unlocked .badge-desc {
  color: var(--text-dim);
}

.badge-time {
  font-size: 18rpx;
  color: var(--text-dim);
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
  background: var(--surface-1);
  border: 1px solid var(--border);
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
  color: var(--text-dim);
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
  color: var(--text-dim);
}

.modal-time {
  display: block;
  font-size: 24rpx;
  color: var(--text-dim);
  margin-bottom: 32rpx;
}

.modal-close-btn {
  background: var(--primary);
  color: var(--bg);
  font-weight: bold;
  border: none;
  padding: 16rpx;
  border-radius: 16rpx;
  font-size: 28rpx;
  width: 100%;
}
</style>
