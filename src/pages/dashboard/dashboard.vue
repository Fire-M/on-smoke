<template>
  <view class="page-container">
    <app-navbar title="数据中心"></app-navbar>
    <scroll-view scroll-y class="main-scroll">
      <view class="p-20 pb-100">

        <!-- 本周概览 -->
        <view class="card p-20 mb-16">
          <view class="section-header">
            <text class="section-title">本周概览</text>
            <text class="section-subtitle">{{ weekRange }}</text>
          </view>
          <view class="week-stats">
            <view class="week-stat">
              <text class="week-stat-value">{{ weekSmoked }}</text>
              <text class="week-stat-label">总根数</text>
            </view>
            <view class="week-stat">
              <text class="week-stat-value">{{ weekSaved }}</text>
              <text class="week-stat-label">省钱(元)</text>
            </view>
            <view class="week-stat">
              <text class="week-stat-value">{{ weekAvg }}</text>
              <text class="week-stat-label">日均</text>
            </view>
          </view>
          <!-- 7天柱状图 -->
          <view class="chart-container">
            <view class="chart-bars">
              <view v-for="(day, idx) in weekData" :key="idx" class="chart-bar-wrap">
                <view class="chart-bar" :style="{ height: day.percent + '%' }" :class="{ today: day.isToday }">
                  <text class="chart-bar-value" v-if="day.count > 0">{{ day.count }}</text>
                </view>
                <text class="chart-label">{{ day.label }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 个人记录 -->
        <view class="card p-20 mb-16">
          <text class="section-title mb-16 block">个人记录</text>
          <view class="records-grid">
            <view class="record-item">
              <text class="record-icon">🔥</text>
              <text class="record-value">{{ bestStreak }}</text>
              <text class="record-label">最长连续(天)</text>
            </view>
            <view class="record-item">
              <text class="record-icon">💰</text>
              <text class="record-value">¥{{ totalSaved }}</text>
              <text class="record-label">累计省钱</text>
            </view>
            <view class="record-item">
              <text class="record-icon">📉</text>
              <text class="record-value">{{ leastDay }}</text>
              <text class="record-label">最少一天(根)</text>
            </view>
            <view class="record-item">
              <text class="record-icon">📊</text>
              <text class="record-value">{{ totalSmoked }}</text>
              <text class="record-label">总吸烟(根)</text>
            </view>
          </view>
        </view>

        <!-- 月度对比 -->
        <view class="card p-20 mb-16">
          <text class="section-title mb-16 block">月度趋势</text>
          <view class="month-compare">
            <view class="month-item">
              <text class="month-label">上月</text>
              <view class="month-bar-wrap">
                <view class="month-bar" :style="{ width: lastMonthPercent + '%' }"></view>
              </view>
              <text class="month-value">{{ lastMonthCount }}根</text>
            </view>
            <view class="month-item">
              <text class="month-label">本月</text>
              <view class="month-bar-wrap">
                <view class="month-bar current" :style="{ width: thisMonthPercent + '%' }"></view>
              </view>
              <text class="month-value">{{ thisMonthCount }}根</text>
            </view>
          </view>
          <view class="trend-indicator" v-if="monthTrend !== 0">
            <text :class="monthTrend < 0 ? 'trend-good' : 'trend-bad'">
              {{ monthTrend < 0 ? '↓' : '↑' }} {{ Math.abs(monthTrendPercent) }}%
            </text>
            <text class="trend-desc" v-if="monthTrend < 0">比上月减少，继续保持！</text>
            <text class="trend-desc" v-else>比上月增加，注意控制</text>
          </view>
        </view>

        <!-- 吸烟日历 -->
        <view class="card p-20">
          <view class="section-header mb-16">
            <text class="section-title">本月日历</text>
            <text class="section-subtitle">{{ calendarMonth }}</text>
          </view>
          <view class="calendar-grid">
            <view v-for="(day, idx) in calendarDays" :key="idx" 
              class="calendar-day" :class="{ 
                'has-smoke': day.count > 0, 
                'no-smoke': day.count === 0 && day.isPast,
                'today': day.isToday,
                'future': day.isFuture
              }">
              <text class="calendar-day-num">{{ day.day }}</text>
              <text class="calendar-day-count" v-if="day.count > 0">{{ day.count }}根</text>
              <text class="calendar-day-icon" v-else-if="day.isPast">✓</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
    <custom-tabbar :current="1"></custom-tabbar>
  </view>
</template>

<script>
import Store from '@/utils/store.js'
import CustomTabbar from '@/components/custom-tabbar/custom-tabbar.vue'
import AppNavbar from '@/components/app-navbar/app-navbar.vue'

export default {
  components: { CustomTabbar, AppNavbar },
  data() {
    return {
      weekRange: '',
      weekSmoked: 0,
      weekSaved: '0',
      weekAvg: '0',
      weekData: [],
      bestStreak: 0,
      totalSaved: '0',
      leastDay: 0,
      totalSmoked: 0,
      lastMonthCount: 0,
      thisMonthCount: 0,
      lastMonthPercent: 0,
      thisMonthPercent: 0,
      monthTrend: 0,
      monthTrendPercent: 0,
      calendarMonth: '',
      calendarDays: []
    }
  },

  onShow() {
    this.loadData()
  },

  methods: {
    loadData() {
      this.loadWeekData()
      this.loadRecords()
      this.loadMonthData()
      this.loadCalendar()
    },

    loadWeekData() {
      const history = Store.getHistory()
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      
      // 本周范围
      const startStr = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`
      const endStr = `${now.getMonth() + 1}/${now.getDate()}`
      this.weekRange = `${startStr} - ${endStr}`

      // 计算本周数据
      const weekDays = []
      let weekTotal = 0
      const dayNames = ['日', '一', '二', '三', '四', '五', '六']
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart)
        date.setDate(weekStart.getDate() + i)
        const dateStr = this.formatDate(date)
        const dayRecords = history.filter(r => this.formatDate(new Date(r.timestamp)) === dateStr)
        const count = dayRecords.length
        weekTotal += count
        
        weekDays.push({
          label: dayNames[i],
          count: count,
          isToday: date.getTime() === today.getTime(),
          percent: 0
        })
      }

      this.weekSmoked = weekTotal
      const settings = Store.getSettings()
      const pricePerCig = settings.cigarettePrice / settings.packSize
      this.weekSaved = (weekTotal * pricePerCig).toFixed(1)
      this.weekAvg = (weekTotal / 7).toFixed(1)

      // 计算柱状图高度
      const maxCount = Math.max(...weekDays.map(d => d.count), 1)
      weekDays.forEach(d => {
        d.percent = (d.count / maxCount) * 100
      })
      this.weekData = weekDays
    },

    loadRecords() {
      const history = Store.getHistory()
      const settings = Store.getSettings()
      const pricePerCig = settings.cigarettePrice / settings.packSize
      
      // 总吸烟数
      this.totalSmoked = history.length
      
      // 累计省钱
      this.totalSaved = (history.length * pricePerCig).toFixed(1)
      
      // 最长连续天数
      this.bestStreak = this.calcBestStreak(history)
      
      // 最少一天
      const dailyCounts = {}
      history.forEach(r => {
        const dateStr = this.formatDate(new Date(r.timestamp))
        dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1
      })
      const counts = Object.values(dailyCounts)
      this.leastDay = counts.length > 0 ? Math.min(...counts) : 0
    },

    loadMonthData() {
      const history = Store.getHistory()
      const now = new Date()
      const thisMonth = now.getMonth()
      const thisYear = now.getFullYear()
      
      // 本月数据
      const thisMonthRecords = history.filter(r => {
        const d = new Date(r.timestamp)
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear
      })
      this.thisMonthCount = thisMonthRecords.length

      // 上月数据
      const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
      const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear
      const lastMonthRecords = history.filter(r => {
        const d = new Date(r.timestamp)
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear
      })
      this.lastMonthCount = lastMonthRecords.length

      // 计算百分比
      const maxCount = Math.max(this.thisMonthCount, this.lastMonthCount, 1)
      this.thisMonthPercent = (this.thisMonthCount / maxCount) * 100
      this.lastMonthPercent = (this.lastMonthCount / maxCount) * 100

      // 计算趋势
      if (this.lastMonthCount > 0) {
        this.monthTrend = this.thisMonthCount - this.lastMonthCount
        this.monthTrendPercent = Math.abs(Math.round((this.monthTrend / this.lastMonthCount) * 100))
      } else {
        this.monthTrend = 0
        this.monthTrendPercent = 0
      }
    },

    loadCalendar() {
      const history = Store.getHistory()
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth()
      
      this.calendarMonth = `${year}年${month + 1}月`
      
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      const daysInMonth = lastDay.getDate()
      const startDayOfWeek = firstDay.getDay()
      
      const days = []
      
      // 添加空白占位
      for (let i = 0; i < startDayOfWeek; i++) {
        days.push({ day: '', count: 0, isEmpty: true })
      }
      
      // 添加日期
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d)
        const dateStr = this.formatDate(date)
        const count = history.filter(r => this.formatDate(new Date(r.timestamp)) === dateStr).length
        const isToday = date.getTime() === new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
        const isFuture = date > now
        const isPast = date < new Date(now.getFullYear(), now.getMonth(), now.getDate())
        
        days.push({
          day: d,
          count: count,
          isToday: isToday,
          isFuture: isFuture,
          isPast: isPast
        })
      }
      
      this.calendarDays = days
    },

    calcBestStreak(history) {
      if (history.length === 0) return 0
      
      const dates = [...new Set(history.map(r => this.formatDate(new Date(r.timestamp))))].sort()
      let maxStreak = 1
      let currentStreak = 1
      
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1])
        const curr = new Date(dates[i])
        const diffDays = (curr - prev) / (1000 * 60 * 60 * 24)
        
        if (diffDays === 1) {
          currentStreak++
          maxStreak = Math.max(maxStreak, currentStreak)
        } else {
          currentStreak = 1
        }
      }
      
      return maxStreak
    },

    formatDate(date) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
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

.main-scroll {
  flex: 1;
  height: 100%;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #f3f4f6;
}

.section-subtitle {
  font-size: 26rpx;
  color: #9ca3af;
}

/* 本周统计 */
.week-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 32rpx;
}

.week-stat {
  text-align: center;
}

.week-stat-value {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #f59e0b;
}

.week-stat-label {
  display: block;
  font-size: 24rpx;
  color: #9ca3af;
  margin-top: 4rpx;
}

/* 柱状图 */
.chart-container {
  margin-top: 16rpx;
}

.chart-bars {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 200rpx;
  padding: 0 8rpx;
}

.chart-bar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  flex: 1;
}

.chart-bar {
  width: 40rpx;
  min-height: 8rpx;
  background: linear-gradient(to top, #4b5563 0%, #6b7280 100%);
  border-radius: 8rpx 8rpx 0 0;
  position: relative;
  transition: height 0.3s ease;
}

.chart-bar.today {
  background: linear-gradient(to top, #f59e0b 0%, #fbbf24 100%);
}

.chart-bar-value {
  position: absolute;
  top: -28rpx;
  left: 50%;
  transform: translateX(-50%);
  font-size: 18rpx;
  color: #9ca3af;
  white-space: nowrap;
}

.chart-label {
  font-size: 24rpx;
  color: #9ca3af;
}

/* 个人记录 */
.records-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
}

.record-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16rpx;
  padding: 20rpx;
  text-align: center;
}

.record-icon {
  font-size: 56rpx;
  display: block;
  margin-bottom: 8rpx;
}

.record-value {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #f59e0b;
  margin-bottom: 4rpx;
}

.record-label {
  display: block;
  font-size: 24rpx;
  color: #9ca3af;
}

/* 月度对比 */
.month-compare {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.month-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.month-label {
  font-size: 24rpx;
  color: #9ca3af;
  width: 60rpx;
}

.month-bar-wrap {
  flex: 1;
  height: 24rpx;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12rpx;
  overflow: hidden;
}

.month-bar {
  height: 100%;
  background: linear-gradient(90deg, #6b7280 0%, #9ca3af 100%);
  border-radius: 12rpx;
  transition: width 0.5s ease;
}

.month-bar.current {
  background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%);
}

.month-value {
  font-size: 24rpx;
  color: #d1d5db;
  width: 80rpx;
  text-align: right;
}

.trend-indicator {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12rpx;
}

.trend-good {
  font-size: 28rpx;
  font-weight: bold;
  color: #10b981;
}

.trend-bad {
  font-size: 28rpx;
  font-weight: bold;
  color: #ef4444;
}

.trend-desc {
  font-size: 22rpx;
  color: #9ca3af;
}

/* 日历 */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8rpx;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8rpx;
  position: relative;
}

.calendar-day.has-smoke {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.calendar-day.no-smoke {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.calendar-day.today {
  border: 2px solid #f59e0b;
}

.calendar-day.future {
  opacity: 0.3;
}

.calendar-day.isEmpty {
  background: transparent;
}

.calendar-day-num {
  font-size: 22rpx;
  color: #d1d5db;
}

.calendar-day-count {
  font-size: 16rpx;
  color: #f59e0b;
  margin-top: 2rpx;
}

.calendar-day-icon {
  font-size: 18rpx;
  color: #10b981;
  margin-top: 2rpx;
}

/* 工具类 */
.card { 
  background: linear-gradient(135deg, #1f1f1f 0%, #252525 100%);
  border: 1px solid #2a2a2a; 
  border-radius: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.15);
}
.p-20 { padding: 40rpx; }
.pb-100 { padding-bottom: 200rpx; }
.mb-16 { margin-bottom: 32rpx; }
.mb-12 { margin-bottom: 24rpx; }
.block { display: block; }
</style>
