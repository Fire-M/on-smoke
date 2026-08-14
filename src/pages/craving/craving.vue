<template>
  <view class="page-container">
    <!-- 顶部标题 -->
    <view class="header">
      <view class="header-row">
        <view class="back-btn" @click="goBack">
          <text class="back-icon">&lt;</text>
        </view>
        <text class="page-title">烟瘾追踪</text>
        <view class="back-btn-placeholder"></view>
      </view>
    </view>

    <scroll-view scroll-y class="main-scroll">
      <!-- 今日统计 -->
      <view class="stats-card mx-20 mb-16">
        <text class="card-title">今日烟瘾</text>
        <view class="stats-row">
          <view class="stat-item">
            <text class="stat-value">{{ todayCount }}</text>
            <text class="stat-label">次</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ avgIntensity }}</text>
            <text class="stat-label">平均强度</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ resistedCount }}</text>
            <text class="stat-label">次成功抵抗</text>
          </view>
        </view>
      </view>

      <!-- 记录烟瘾按钮 -->
      <view class="mx-20 mb-16">
        <button class="record-btn" @click="showRecordModal = true">
          <text class="record-btn-icon">📝</text>
          <text class="record-btn-text">记录烟瘾</text>
        </button>
      </view>

      <!-- 烟瘾模式分析 -->
      <view class="card mx-20 mb-16 p-20">
        <text class="card-title mb-16 block">烟瘾模式</text>
        <view class="pattern-list">
          <view v-for="(item, idx) in topTriggers" :key="idx" class="pattern-item">
            <view class="pattern-info">
              <text class="pattern-icon">{{ item.icon }}</text>
              <text class="pattern-name">{{ item.name }}</text>
            </view>
            <view class="pattern-bar-wrap">
              <view class="pattern-bar" :style="{ width: item.percent + '%' }"></view>
            </view>
            <text class="pattern-count">{{ item.count }}次</text>
          </view>
          <view v-if="topTriggers.length === 0" class="empty-hint">
            <text>暂无数据，记录几次烟瘾后分析</text>
          </view>
        </view>
      </view>

      <!-- 强度分布 -->
      <view class="card mx-20 mb-16 p-20">
        <text class="card-title mb-16 block">强度分布</text>
        <view class="intensity-chart">
          <view v-for="i in 5" :key="i" class="intensity-bar-wrap">
            <view class="intensity-bar" :style="{ height: intensityPercent(i) + '%' }"
              :class="'level-' + i">
              <text class="intensity-value" v-if="intensityDist[i] > 0">{{ intensityDist[i] }}</text>
            </view>
            <text class="intensity-label">{{ i }}级</text>
          </view>
        </view>
      </view>

      <!-- 历史记录 -->
      <view class="card mx-20 mb-16 p-20">
        <text class="card-title mb-16 block">最近记录</text>
        <view class="history-list">
          <view v-for="(item, idx) in recentCravings" :key="idx" class="history-item">
            <view class="history-time">
              <text class="history-date">{{ formatDate(item.timestamp) }}</text>
              <text class="history-hour">{{ formatTime(item.timestamp) }}</text>
            </view>
            <view class="history-content">
              <view class="history-tags">
                <text class="history-tag intensity">{{ item.intensity }}级</text>
                <text class="history-tag trigger">{{ getTriggerName(item.trigger) }}</text>
                <text v-if="item.resisted" class="history-tag resisted">已抵抗</text>
              </view>
              <text v-if="item.note" class="history-note">{{ item.note }}</text>
            </view>
          </view>
          <view v-if="recentCravings.length === 0" class="empty-hint">
            <text>还没有记录</text>
          </view>
        </view>
      </view>

      <view style="height: 80rpx;"></view>
    </scroll-view>

    <!-- 记录烟瘾弹窗 -->
    <view class="modal-mask" v-if="showRecordModal" @click="showRecordModal = false">
      <view class="modal-card" @click.stop>
        <text class="modal-title">记录烟瘾</text>
        
        <!-- 强度选择 -->
        <view class="form-section">
          <text class="form-label">烟瘾强度</text>
          <view class="intensity-picker">
            <view v-for="i in 5" :key="i" class="intensity-option"
              :class="[newCraving.intensity === i ? 'active' : '', 'level-' + i]"
              @click="newCraving.intensity = i">
              <text>{{ i }}</text>
            </view>
          </view>
        </view>

        <!-- 触发因素 -->
        <view class="form-section">
          <text class="form-label">触发因素</text>
          <view class="trigger-grid">
            <view v-for="t in triggerOptions" :key="t.id"
              class="trigger-option" :class="{ active: newCraving.trigger === t.id }"
              @click="newCraving.trigger = t.id">
              <text class="trigger-icon">{{ t.icon }}</text>
              <text class="trigger-name">{{ t.name }}</text>
            </view>
          </view>
        </view>

        <!-- 是否抵抗 -->
        <view class="form-section">
          <text class="form-label">是否抵抗</text>
          <view class="resist-toggle">
            <view class="resist-option" :class="{ active: newCraving.resisted }"
              @click="newCraving.resisted = true">
              <text>✅ 成功抵抗</text>
            </view>
            <view class="resist-option" :class="{ active: !newCraving.resisted }"
              @click="newCraving.resisted = false">
              <text>❌ 没忍住</text>
            </view>
          </view>
        </view>

        <!-- 备注 -->
        <view class="form-section">
          <text class="form-label">备注（可选）</text>
          <textarea class="form-textarea" v-model="newCraving.note"
            placeholder="记录当时的想法..." maxlength="100"></textarea>
        </view>

        <view class="modal-actions">
          <button class="modal-btn cancel" @click="showRecordModal = false">取消</button>
          <button class="modal-btn confirm" @click="saveCraving">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import Store from '@/utils/store.js'

const TRIGGER_OPTIONS = [
  { id: 'stress', name: '压力大', icon: '😰' },
  { id: 'bored', name: '无聊', icon: '😐' },
  { id: 'social', name: '社交场合', icon: '🎉' },
  { id: 'afterMeal', name: '饭后', icon: '🍽️' },
  { id: 'wakeup', name: '起床', icon: '☀️' },
  { id: 'drinking', name: '喝酒', icon: '🍺' },
  { id: 'work', name: '工作疲劳', icon: '💼' },
  { id: 'emotion', name: '情绪波动', icon: '😔' }
]

export default {
  data() {
    return {
      showRecordModal: false,
      todayCount: 0,
      avgIntensity: '0',
      resistedCount: 0,
      intensityDist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      topTriggers: [],
      recentCravings: [],
      triggerOptions: TRIGGER_OPTIONS,
      newCraving: {
        intensity: 3,
        trigger: '',
        resisted: true,
        note: ''
      }
    }
  },

  onShow() {
    this.loadData()
  },

  methods: {
    loadData() {
      const stats = Store.getCravingStats()
      const cravings = Store.getCravings()

      // 今日统计
      this.todayCount = stats.today

      // 平均强度
      const todayCravings = cravings.filter(c => {
        const d = new Date(c.timestamp)
        const today = new Date()
        return d.toDateString() === today.toDateString()
      })
      if (todayCravings.length > 0) {
        const totalIntensity = todayCravings.reduce((sum, c) => sum + (c.intensity || 0), 0)
        this.avgIntensity = (totalIntensity / todayCravings.length).toFixed(1)
      } else {
        this.avgIntensity = '0'
      }

      // 成功抵抗次数
      this.resistedCount = cravings.filter(c => c.resisted).length

      // 强度分布
      this.intensityDist = stats.intensityDist

      // 触发因素排名
      const triggerEntries = Object.entries(stats.triggers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
      const maxTrigger = triggerEntries.length > 0 ? triggerEntries[0][1] : 1
      this.topTriggers = triggerEntries.map(([id, count]) => {
        const trigger = TRIGGER_OPTIONS.find(t => t.id === id) || { name: id, icon: '📌' }
        return {
          id,
          name: trigger.name,
          icon: trigger.icon,
          count,
          percent: (count / maxTrigger) * 100
        }
      })

      // 最近记录
      this.recentCravings = cravings.slice(0, 10)
    },

    intensityPercent(level) {
      const max = Math.max(...Object.values(this.intensityDist), 1)
      return (this.intensityDist[level] / max) * 100
    },

    getTriggerName(id) {
      const trigger = TRIGGER_OPTIONS.find(t => t.id === id)
      return trigger ? trigger.name : id
    },

    formatDate(timestamp) {
      const d = new Date(timestamp)
      return `${d.getMonth() + 1}/${d.getDate()}`
    },

    formatTime(timestamp) {
      const d = new Date(timestamp)
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    },

    saveCraving() {
      if (!this.newCraving.trigger) {
        uni.showToast({ title: '请选择触发因素', icon: 'none' })
        return
      }

      Store.addCraving({
        intensity: this.newCraving.intensity,
        trigger: this.newCraving.trigger,
        resisted: this.newCraving.resisted,
        note: this.newCraving.note
      })

      // 重置表单
      this.newCraving = {
        intensity: 3,
        trigger: '',
        resisted: true,
        note: ''
      }
      this.showRecordModal = false

      uni.showToast({ title: '已记录', icon: 'success' })
      this.loadData()
    },

    goBack() {
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

.header {
  padding: 40rpx 28rpx 24rpx;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.back-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 50%;
  cursor: pointer;
}

.back-btn-placeholder {
  width: 64rpx;
  height: 64rpx;
}

.back-btn:active {
  background: rgba(255, 255, 255, 0.12);
  transform: scale(0.92);
}

.back-icon {
  font-size: 48rpx;
  color: #f3f4f6;
}

.page-title {
  font-size: 44rpx;
  font-weight: bold;
  color: #f3f4f6;
}

.main-scroll {
  flex: 1;
  height: 100%;
}

/* 统计卡片 */
.stats-card {
  background: linear-gradient(135deg, #1f1f1f 0%, #252525 100%);
  border: 1px solid #2a2a2a;
  border-radius: 32rpx;
  padding: 32rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #f3f4f6;
  margin-bottom: 24rpx;
  display: block;
}

.stats-row {
  display: flex;
  justify-content: space-around;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: #f59e0b;
}

.stat-label {
  display: block;
  font-size: 22rpx;
  color: #6b7280;
  margin-top: 8rpx;
}

/* 记录按钮 */
.record-btn {
  width: 100%;
  padding: 28rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #ef4444 0%, #f59e0b 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  border: none;
  color: white;
}

.record-btn:active {
  transform: scale(0.97);
}

.record-btn-icon {
  font-size: 36rpx;
}

.record-btn-text {
  font-size: 32rpx;
  font-weight: 600;
}

/* 卡片 */
.card {
  background: linear-gradient(135deg, #1f1f1f 0%, #252525 100%);
  border: 1px solid #2a2a2a;
  border-radius: 32rpx;
}

.p-20 { padding: 40rpx; }
.mx-20 { margin-left: 40rpx; margin-right: 40rpx; }
.mb-16 { margin-bottom: 32rpx; }
.block { display: block; }

/* 烟瘾模式 */
.pattern-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.pattern-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.pattern-info {
  display: flex;
  align-items: center;
  gap: 8rpx;
  width: 140rpx;
}

.pattern-icon {
  font-size: 28rpx;
}

.pattern-name {
  font-size: 24rpx;
  color: #d1d5db;
}

.pattern-bar-wrap {
  flex: 1;
  height: 20rpx;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 10rpx;
  overflow: hidden;
}

.pattern-bar {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b 0%, #ef4444 100%);
  border-radius: 10rpx;
  transition: width 0.3s ease;
}

.pattern-count {
  font-size: 22rpx;
  color: #9ca3af;
  width: 60rpx;
  text-align: right;
}

/* 强度分布 */
.intensity-chart {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 200rpx;
  padding: 0 16rpx;
}

.intensity-bar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  flex: 1;
}

.intensity-bar {
  width: 48rpx;
  min-height: 16rpx;
  border-radius: 8rpx 8rpx 0 0;
  position: relative;
  transition: height 0.3s ease;
}

.intensity-bar.level-1 { background: #10b981; }
.intensity-bar.level-2 { background: #84cc16; }
.intensity-bar.level-3 { background: #f59e0b; }
.intensity-bar.level-4 { background: #f97316; }
.intensity-bar.level-5 { background: #ef4444; }

.intensity-value {
  position: absolute;
  top: -28rpx;
  left: 50%;
  transform: translateX(-50%);
  font-size: 20rpx;
  color: #9ca3af;
}

.intensity-label {
  font-size: 22rpx;
  color: #6b7280;
}

/* 历史记录 */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.history-item {
  display: flex;
  gap: 20rpx;
  padding: 16rpx;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16rpx;
}

.history-time {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 80rpx;
}

.history-date {
  font-size: 22rpx;
  color: #9ca3af;
}

.history-hour {
  font-size: 24rpx;
  color: #f59e0b;
  font-weight: 600;
}

.history-content {
  flex: 1;
}

.history-tags {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
  margin-bottom: 8rpx;
}

.history-tag {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  background: rgba(255, 255, 255, 0.06);
  color: #9ca3af;
}

.history-tag.intensity {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}

.history-tag.trigger {
  background: rgba(96, 165, 250, 0.2);
  color: #60a5fa;
}

.history-tag.resisted {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.history-note {
  font-size: 22rpx;
  color: #6b7280;
}

.empty-hint {
  text-align: center;
  padding: 32rpx;
  color: #6b7280;
  font-size: 24rpx;
}

/* 弹窗 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-card {
  width: 85%;
  max-height: 80vh;
  background: #1f1f1f;
  border-radius: 32rpx;
  padding: 40rpx;
  overflow-y: auto;
}

.modal-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #f3f4f6;
  display: block;
  text-align: center;
  margin-bottom: 32rpx;
}

.form-section {
  margin-bottom: 28rpx;
}

.form-label {
  font-size: 26rpx;
  color: #9ca3af;
  display: block;
  margin-bottom: 16rpx;
}

/* 强度选择 */
.intensity-picker {
  display: flex;
  gap: 12rpx;
  justify-content: center;
}

.intensity-option {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 2rpx solid transparent;
  font-size: 28rpx;
  font-weight: bold;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.2s;
}

.intensity-option.active {
  transform: scale(1.1);
}

.intensity-option.level-1.active { background: rgba(16, 185, 129, 0.2); border-color: #10b981; color: #10b981; }
.intensity-option.level-2.active { background: rgba(132, 204, 22, 0.2); border-color: #84cc16; color: #84cc16; }
.intensity-option.level-3.active { background: rgba(245, 158, 11, 0.2); border-color: #f59e0b; color: #f59e0b; }
.intensity-option.level-4.active { background: rgba(249, 115, 22, 0.2); border-color: #f97316; color: #f97316; }
.intensity-option.level-5.active { background: rgba(239, 68, 68, 0.2); border-color: #ef4444; color: #ef4444; }

/* 触发因素 */
.trigger-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
}

.trigger-option {
  padding: 16rpx 8rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.04);
  border: 2rpx solid transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  cursor: pointer;
  transition: all 0.2s;
}

.trigger-option.active {
  background: rgba(96, 165, 250, 0.15);
  border-color: rgba(96, 165, 250, 0.4);
}

.trigger-icon {
  font-size: 32rpx;
}

.trigger-name {
  font-size: 20rpx;
  color: #9ca3af;
  text-align: center;
}

.trigger-option.active .trigger-name {
  color: #60a5fa;
}

/* 抵抗切换 */
.resist-toggle {
  display: flex;
  gap: 16rpx;
}

.resist-option {
  flex: 1;
  padding: 20rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.04);
  border: 2rpx solid transparent;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 26rpx;
  color: #9ca3af;
}

.resist-option.active {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.4);
  color: #10b981;
}

/* 备注 */
.form-textarea {
  width: 100%;
  height: 120rpx;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16rpx;
  padding: 16rpx;
  color: #e5e7eb;
  font-size: 26rpx;
  resize: none;
}

/* 弹窗按钮 */
.modal-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 32rpx;
}

.modal-btn {
  flex: 1;
  padding: 24rpx;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
}

.modal-btn.cancel {
  background: rgba(255, 255, 255, 0.06);
  color: #9ca3af;
}

.modal-btn.confirm {
  background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
  color: white;
}

.modal-btn:active {
  transform: scale(0.97);
}
</style>
