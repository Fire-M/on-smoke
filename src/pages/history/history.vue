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
          <text class="text-xs text-gray-500">本周期抽烟 <text class="text-amber font-bold">{{ summaryCount }}</text> 根</text>
        </view>

        <!-- 记录列表 -->
        <view class="record-list">
          <view v-for="record in filteredRecords" :key="record.id" class="record-item card">
            <view class="record-left">
              <text class="text-2xl">🚬</text>
            </view>
            <view class="record-info">
              <text class="text-sm text-gray-200">{{ formatTime(record.timestamp) }}</text>
              <text class="text-xs text-gray-500">持续 {{ formatDuration(record.duration) }}</text>
            </view>
          </view>
        </view>

        <!-- 空状态 -->
        <view class="empty-state" v-if="filteredRecords.length === 0">
          <text class="text-gray-600 text-sm">暂无记录</text>
          <text class="text-gray-700 text-xs mt-4 block">去抽一根吧</text>
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
      summaryCount: 0
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
        start = now - 86400000
      } else if (this.tabRange === 'week') {
        start = now - 7 * 86400000
      } else {
        start = now - 30 * 86400000
      }

      this.filteredRecords = this.allRecords.filter(r => r.timestamp >= start)
      this.summaryCount = this.filteredRecords.length
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
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: #6b7280;
  background-color: #1f1f1f;
  border: none;
}

.history-tab.active {
  background-color: #f59e0b;
  color: #0f0f0f;
}

.summary-card {
  background-color: #1f1f1f;
  border: 1px solid #2a2a2a;
  border-radius: 32rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
  text-align: center;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.record-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
}

.record-info {
  display: flex;
  flex-direction: column;
}

.empty-state {
  text-align: center;
  padding: 128rpx 0;
}

.p-20 { padding: 40rpx; }
.pb-100 { padding-bottom: 200rpx; }
.mb-4 { margin-bottom: 32rpx; }
.mt-4 { margin-top: 8rpx; }
.text-xs { font-size: 24rpx; }
.text-sm { font-size: 28rpx; }
.text-2xl { font-size: 48rpx; }
.font-bold { font-weight: bold; }
.block { display: block; }
.text-gray-200 { color: #e5e7eb; }
.text-gray-500 { color: #6b7280; }
.text-gray-600 { color: #4b5563; }
.text-gray-700 { color: #374151; }
.text-amber { color: #f59e0b; }
.card { background-color: #1f1f1f; border: 1px solid #2a2a2a; border-radius: 32rpx; }
</style>
