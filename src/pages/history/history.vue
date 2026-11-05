<template>
  <view class="page-container" :class="themeClass()">
    <app-navbar title="吸烟记录"></app-navbar>
    <scroll-view scroll-y class="main-scroll" @scrolltolower="loadMore">
      <view class="p-20 pb-100">

        <!-- 统计切换 -->
        <view class="tab-row">
          <button class="history-tab" :class="{ active: tabRange === 'day' }" @click="setTab('day')">今日</button>
          <button class="history-tab" :class="{ active: tabRange === 'week' }" @click="setTab('week')">本周</button>
          <button class="history-tab" :class="{ active: tabRange === 'month' }" @click="setTab('month')">本月</button>
        </view>

        <!-- 统计摘要 -->
        <view class="summary-card" v-if="summaryCount > 0">
          <view class="summary-row">
            <view class="summary-item">
              <text class="summary-num text-amber">{{ summaryCount }}</text>
              <text class="summary-label">抽烟次数</text>
            </view>
            <view class="summary-divider"></view>
            <view class="summary-item">
              <text class="summary-num text-gray-200">{{ totalDuration }}</text>
              <text class="summary-label">总时长(分)</text>
            </view>
            <view class="summary-divider"></view>
            <view class="summary-item">
              <text class="summary-num text-gray-200">{{ avgDuration }}</text>
              <text class="summary-label">平均(秒)</text>
            </view>
          </view>
        </view>

        <!-- 记录列表 -->
        <view class="record-list">
          <view v-for="(record, index) in visibleRecords" :key="record.id" class="record-item card">
            <view class="record-index">{{ filteredRecords.length - index }}</view>
            <view class="record-left">
              <text class="record-icon">🚬</text>
            </view>
            <view class="record-info">
              <text class="text-sm text-gray-200">{{ formatTime(record.timestamp) }}</text>
              <view class="record-meta">
                <text class="record-brand" :class="{ 'record-brand-plain': !record.brandId }">{{ formatBrand(record.brandId) }}</text>
                <text class="text-xs text-gray-500">持续 {{ formatDuration(record.duration) }}</text>
              </view>
            </view>
            <view class="record-right">
              <text class="record-price">¥{{ formatPrice(record) }}</text>
              <text class="text-xs text-gray-600">{{ formatRelativeTime(record.timestamp) }}</text>
            </view>
          </view>
        </view>

        <!-- 分页：记录多时先渲染一屏，滚到底再追加 -->
        <view class="list-more" v-if="hasMore">
          <text class="list-more-text">已显示 {{ visibleRecords.length }} / {{ filteredRecords.length }} 条 · 上滑加载更多</text>
        </view>

        <!-- 空状态 -->
        <view class="empty-state" v-if="filteredRecords.length === 0">
          <text class="empty-icon">🚭</text>
          <text class="text-gray-500 text-sm">暂无记录</text>
          <text class="text-gray-700 text-xs mt-8 block">去抽一根吧</text>
        </view>
      </view>
    </scroll-view>
    <custom-tabbar :current="2"></custom-tabbar>
  </view>
</template>

<script>
import Store from '@/utils/store.js'
import CustomTabbar from '@/components/custom-tabbar/custom-tabbar.vue'
import AppNavbar from '@/components/app-navbar/app-navbar.vue'
import { themeClass } from '@/utils/theme.js'

// 每次多渲染多少条记录
const PAGE_SIZE = 40

export default {
  components: { CustomTabbar, AppNavbar },
  data() {
    return {
      tabRange: 'day',
      allRecords: [],
      filteredRecords: [],
      summaryCount: 0,
      totalDuration: 0,
      avgDuration: 0,
      // 已渲染条数：记录可能上百条，全量渲染时滚动会明显掉帧
      visibleCount: PAGE_SIZE
    }
  },

  computed: {
    visibleRecords() {
      return this.filteredRecords.slice(0, this.visibleCount)
    },

    hasMore() {
      return this.filteredRecords.length > this.visibleCount
    }
  },

  onShow() {
    // 数据没变、也没跨天时直接跳过：返回历史页不该重读整表 + 重新过滤
    if (!this.shouldRefresh()) return
    this.allRecords = Store.getHistory()
    this.filterRecords()
    this.markRefreshed()
  },

  methods: {
    setTab(range) {
      this.tabRange = range
      this.filterRecords()
    },

    // 滚动到底部时追加一屏
    loadMore() {
      if (!this.hasMore) return
      this.visibleCount += PAGE_SIZE
    },

    filterRecords() {
      // 换筛选条件后回到第一屏
      this.visibleCount = PAGE_SIZE
      const now = Date.now()
      let start = 0
      if (this.tabRange === 'day') {
        // 今日从凌昨0点开始
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        start = today.getTime()
      } else if (this.tabRange === 'week') {
        // 与数据中心保持一致：自然周（周日为起点），不用「滚动 7 天」，
        // 否则同一周两个页面显示的根数/省钱对不上
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())
        start = weekStart.getTime()
      } else {
        // 自然月：本月 1 号 0 点起（原来取 30 天窗口，跨月数据会串）
        const today = new Date()
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        start = monthStart.getTime()
      }

      this.filteredRecords = this.allRecords.filter(r => r.timestamp >= start)
      this.summaryCount = this.filteredRecords.length
      
      // 计算总时长和平均时长
      const totalSec = this.filteredRecords.reduce((sum, r) => sum + (r.duration || 0), 0)
      this.totalDuration = Math.round(totalSec / 60 * 10) / 10
      this.avgDuration = this.summaryCount > 0 ? Math.round(totalSec / this.summaryCount) : 0
    },

    // 抽的什么烟：取自记录里的 brandId，与省钱按品牌单价计算是同一份数据。
    // 没选品牌时显示「普通烟」，不让它看起来像漏记
    formatBrand(brandId) {
      if (!brandId) return '普通烟'
      const brand = Store.BRANDS.find(b => b.id === brandId)
      return brand ? brand.cn : '普通烟'
    },

    // 这根烟的单根价格：优先读记录里的 pricePerCig 快照（点烟时锁定），
    // 与省钱计算共用 getRecordPrice —— 页面上写的数就是这根帮你省下的钱
    formatPrice(record) {
      // 必须用 getRecordSaved：看过「上一根翻倍」广告的记录是 2 倍，
      // 用 getRecordPrice 会和累计省钱对不上
      return Math.round(Store.getRecordSaved(record) * 100) / 100
    },

    formatTime(ts) {
      const d = new Date(ts)
      const month = d.getMonth() + 1
      const day = d.getDate()
      const h = String(d.getHours()).padStart(2, '0')
      const m = String(d.getMinutes()).padStart(2, '0')
      return `${month}/${day} ${h}:${m}`
    },

    formatDuration(sec) {
      if (!sec) return '0秒'
      const m = Math.floor(sec / 60)
      const s = sec % 60
      if (m > 0) return `${m}分${s}秒`
      return `${s}秒`
    },

    formatRelativeTime(ts) {
      const now = Date.now()
      const diff = now - ts
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)
      
      if (minutes < 1) return '刚刚'
      if (minutes < 60) return `${minutes}分钟前`
      if (hours < 24) return `${hours}小时前`
      if (days < 7) return `${days}天前`
      return ''
    }
  }
}
</script>

<style>
.page-container {
  height: 100vh;
  height: 100dvh;
  width: 100%;
  background-color: var(--bg);
  color: var(--text);
  display: flex;
  flex-direction: column;
}

/* 统一滚动容器：flex 列里靠 height:0 + flex:1 拿到确定高度 */
.main-scroll {
  flex: 1;
  height: 0;
  min-height: 0;
}

.tab-row {
  display: flex;
  justify-content: center;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.history-tab {
  padding: 12rpx 32rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: var(--text-dim);
  background-color: var(--surface-1);
  border: 1px solid var(--border);
  transition: all 0.2s;
}

.history-tab.active {
  background-color: var(--primary);
  color: var(--bg);
  border-color: var(--primary);
  font-weight: bold;
}

/* 统计摘要卡片 */
.summary-card {
  background: linear-gradient(135deg, var(--surface-1) 0%, var(--surface-2) 100%);
  border: 1px solid var(--border);
  border-radius: 32rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.15);
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.summary-num {
  font-size: 44rpx;
  font-weight: bold;
  line-height: 1;
}

.summary-label {
  font-size: 20rpx;
  color: var(--text-dim);
}

.summary-divider {
  width: 1px;
  height: 60rpx;
  background-color: var(--border);
}

/* 记录列表 */
.record-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.record-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx;
}

.record-index {
  font-size: 22rpx;
  color: #4b5563;
  width: 40rpx;
  text-align: center;
  flex-shrink: 0;
}

.record-left {
  flex-shrink: 0;
}

.record-icon {
  font-size: 40rpx;
}

.record-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

/* 品牌名与时长同一行，不让记录项被多撑一行 */
.record-meta {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

/* 品牌名用主色，和摘要里「抽烟次数」的强调是同一套配色 */
.record-brand {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--primary);
}

/* 没选品牌的记录用中性色，避免看起来像真品牌 */
.record-brand-plain {
  color: var(--text-dim);
  font-weight: 400;
}

/* 右侧竖排：价格在上、时间在下面，右侧整体右对齐 */
.record-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4rpx;
  flex-shrink: 0;
}

/* 单价用主色，和品牌名、摘要强调数字同色系 */
.record-price {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--primary);
  line-height: 1;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 128rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.p-20 { padding: 40rpx; }
/* 底部要留出自定义 tabBar（100rpx）+ 安全区，否则最后一条记录会被挡住 */
.pb-100 { padding-bottom: calc(220rpx + env(safe-area-inset-bottom, 0px)); }
.mt-8 { margin-top: 16rpx; }
.text-xs { font-size: 24rpx; }
.text-sm { font-size: 28rpx; }
.font-bold { font-weight: bold; }
.block { display: block; }
.text-gray-200 { color: var(--text); }
.text-gray-500 { color: var(--text-dim); }
.text-gray-600 { color: var(--text-dim); }
.text-gray-700 { color: var(--border); }
.text-amber { color: var(--primary); }
.card { 
  background: linear-gradient(135deg, var(--surface-1) 0%, var(--surface-2) 100%);
  border: 1px solid var(--border); 
  border-radius: 24rpx;
}

/* 分页提示 */
.list-more {
  display: flex;
  justify-content: center;
  padding: 32rpx 0 8rpx;
}

.list-more-text {
  font-size: 22rpx;
  color: var(--border);
}
</style>
