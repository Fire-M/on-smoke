<template>
  <view class="page-container">
    <scroll-view scroll-y class="main-scroll">
      <view class="p-20 pb-100">
        <text class="page-title">吸烟记录</text>

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
          <view v-for="(record, index) in filteredRecords" :key="record.id" class="record-item card">
            <view class="record-index">{{ filteredRecords.length - index }}</view>
            <view class="record-left">
              <text class="record-icon">🚬</text>
            </view>
            <view class="record-info">
              <text class="text-sm text-gray-200">{{ formatTime(record.timestamp) }}</text>
              <text class="text-xs text-gray-500">持续 {{ formatDuration(record.duration) }}</text>
            </view>
            <view class="record-right">
              <text class="text-xs text-gray-600">{{ formatRelativeTime(record.timestamp) }}</text>
            </view>
          </view>
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

export default {
  components: { CustomTabbar },
  data() {
    return {
      tabRange: 'day',
      allRecords: [],
      filteredRecords: [],
      summaryCount: 0,
      totalDuration: 0,
      avgDuration: 0
    }
  },

  onShow() {
    this.allRecords = Store.getHistory()
    this.filterRecords()
  },

  methods: {
    setTab(range) {
      this.tabRange = range
      this.filterRecords()
    },

    filterRecords() {
      const now = Date.now()
      let start = 0
      if (this.tabRange === 'day') {
        // 今日从凌昨0点开始
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        start = today.getTime()
      } else if (this.tabRange === 'week') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        weekAgo.setHours(0, 0, 0, 0)
        start = weekAgo.getTime()
      } else {
        const monthAgo = new Date()
        monthAgo.setDate(monthAgo.getDate() - 30)
        monthAgo.setHours(0, 0, 0, 0)
        start = monthAgo.getTime()
      }

      this.filteredRecords = this.allRecords.filter(r => r.timestamp >= start)
      this.summaryCount = this.filteredRecords.length
      
      // 计算总时长和平均时长
      const totalSec = this.filteredRecords.reduce((sum, r) => sum + (r.duration || 0), 0)
      this.totalDuration = Math.round(totalSec / 60 * 10) / 10
      this.avgDuration = this.summaryCount > 0 ? Math.round(totalSec / this.summaryCount) : 0
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
  margin-bottom: 32rpx;
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
  color: #6b7280;
  background-color: #1f1f1f;
  border: 1px solid #2a2a2a;
  transition: all 0.2s;
}

.history-tab.active {
  background-color: #f59e0b;
  color: #0f0f0f;
  border-color: #f59e0b;
  font-weight: bold;
}

/* 统计摘要卡片 */
.summary-card {
  background: linear-gradient(135deg, #1f1f1f 0%, #252525 100%);
  border: 1px solid #2a2a2a;
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
  color: #6b7280;
}

.summary-divider {
  width: 1px;
  height: 60rpx;
  background-color: #2a2a2a;
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

.record-right {
  flex-shrink: 0;
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
.pb-100 { padding-bottom: 200rpx; }
.mt-8 { margin-top: 16rpx; }
.text-xs { font-size: 24rpx; }
.text-sm { font-size: 28rpx; }
.font-bold { font-weight: bold; }
.block { display: block; }
.text-gray-200 { color: #e5e7eb; }
.text-gray-500 { color: #6b7280; }
.text-gray-600 { color: #4b5563; }
.text-gray-700 { color: #374151; }
.text-amber { color: #f59e0b; }
.card { 
  background: linear-gradient(135deg, #1f1f1f 0%, #252525 100%);
  border: 1px solid #2a2a2a; 
  border-radius: 24rpx;
}
</style>
