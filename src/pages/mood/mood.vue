<template>
  <view class="page-container">
    <view class="header">
      <view class="header-row">
        <view class="back-btn" @click="goBack">
          <text class="back-icon">‹</text>
        </view>
        <text class="page-title">情绪日记</text>
        <view class="back-btn-placeholder"></view>
      </view>
    </view>

    <scroll-view scroll-y class="main-scroll">
      <!-- 情绪统计 -->
      <view class="stats-card mx-20 mb-16">
        <text class="card-title">情绪分布</text>
        <view class="mood-stats">
          <view v-for="(count, mood) in moodDist" :key="mood" class="mood-stat">
            <text class="mood-emoji">{{ getMoodEmoji(mood) }}</text>
            <text class="mood-count">{{ count }}</text>
            <text class="mood-name">{{ getMoodName(mood) }}</text>
          </view>
        </view>
      </view>

      <!-- 记录情绪按钮 -->
      <view class="mx-20 mb-16">
        <button class="record-btn" @click="showRecordModal = true">
          <text class="record-btn-icon">😊</text>
          <text class="record-btn-text">记录此刻心情</text>
        </button>
      </view>

      <!-- 情绪洞察 -->
      <view class="card mx-20 mb-16 p-20">
        <text class="card-title mb-16 block">情绪洞察</text>
        <view class="insight-item">
          <text class="insight-icon">📊</text>
          <view class="insight-content">
            <text class="insight-text">总共记录了 <text class="highlight">{{ totalMoods }}</text> 次情绪</text>
          </view>
        </view>
        <view class="insight-item">
          <text class="insight-icon">🚬</text>
          <view class="insight-content">
            <text class="insight-text">吸烟时记录 <text class="highlight">{{ smokingMoods }}</text> 次</text>
          </view>
        </view>
        <view class="insight-item">
          <text class="insight-icon">✨</text>
          <view class="insight-content">
            <text class="insight-text">不吸烟时记录 <text class="highlight">{{ nonSmokingMoods }}</text> 次</text>
          </view>
        </view>
      </view>

      <!-- 历史记录 -->
      <view class="card mx-20 mb-16 p-20">
        <text class="card-title mb-16 block">最近记录</text>
        <view class="history-list">
          <view v-for="(item, idx) in recentMoods" :key="idx" class="history-item">
            <view class="history-emoji">{{ getMoodEmoji(item.mood) }}</view>
            <view class="history-content">
              <view class="history-header">
                <text class="history-mood">{{ getMoodName(item.mood) }}</text>
                <text v-if="item.smoked" class="history-tag">吸烟时</text>
                <text v-else class="history-tag clean">无烟时</text>
              </view>
              <text v-if="item.note" class="history-note">{{ item.note }}</text>
              <text class="history-time">{{ formatDateTime(item.timestamp) }}</text>
            </view>
          </view>
          <view v-if="recentMoods.length === 0" class="empty-hint">
            <text>还没有记录</text>
          </view>
        </view>
      </view>

      <view style="height: 80rpx;"></view>
    </scroll-view>

    <!-- 记录情绪弹窗 -->
    <view class="modal-mask" v-if="showRecordModal" @click="showRecordModal = false">
      <view class="modal-card" @click.stop>
        <text class="modal-title">记录心情</text>
        
        <!-- 情绪选择 -->
        <view class="form-section">
          <text class="form-label">现在感觉如何？</text>
          <view class="mood-picker">
            <view v-for="m in moodOptions" :key="m.id"
              class="mood-option" :class="{ active: newMood.mood === m.id }"
              @click="newMood.mood = m.id">
              <text class="mood-option-emoji">{{ m.emoji }}</text>
              <text class="mood-option-name">{{ m.name }}</text>
            </view>
          </view>
        </view>

        <!-- 是否吸烟 -->
        <view class="form-section">
          <text class="form-label">现在吸烟了吗？</text>
          <view class="smoke-toggle">
            <view class="smoke-option" :class="{ active: newMood.smoked }"
              @click="newMood.smoked = true">
              <text>🚬 正在吸烟</text>
            </view>
            <view class="smoke-option" :class="{ active: !newMood.smoked }"
              @click="newMood.smoked = false">
              <text>✨ 没有吸烟</text>
            </view>
          </view>
        </view>

        <!-- 备注 -->
        <view class="form-section">
          <text class="form-label">想说什么？（可选）</text>
          <textarea class="form-textarea" v-model="newMood.note"
            placeholder="记录此刻的想法..." maxlength="200"></textarea>
        </view>

        <view class="modal-actions">
          <button class="modal-btn cancel" @click="showRecordModal = false">取消</button>
          <button class="modal-btn confirm" @click="saveMood">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import Store from '@/utils/store.js'

const MOOD_OPTIONS = [
  { id: 'happy', name: '开心', emoji: '😊' },
  { id: 'calm', name: '平静', emoji: '😌' },
  { id: 'anxious', name: '焦虑', emoji: '😰' },
  { id: 'sad', name: '难过', emoji: '😢' },
  { id: 'angry', name: '生气', emoji: '😠' },
  { id: 'bored', name: '无聊', emoji: '😐' }
]

export default {
  data() {
    return {
      showRecordModal: false,
      moodDist: {},
      totalMoods: 0,
      smokingMoods: 0,
      nonSmokingMoods: 0,
      recentMoods: [],
      moodOptions: MOOD_OPTIONS,
      newMood: {
        mood: 'happy',
        smoked: false,
        note: ''
      }
    }
  },

  onShow() {
    this.loadData()
  },

  methods: {
    loadData() {
      const stats = Store.getMoodStats()
      const moods = Store.getMoods()

      this.moodDist = stats.moodDist
      this.totalMoods = stats.total
      this.smokingMoods = stats.smokingMoods
      this.nonSmokingMoods = stats.nonSmokingMoods
      this.recentMoods = moods.slice(0, 15)
    },

    getMoodEmoji(moodId) {
      const mood = MOOD_OPTIONS.find(m => m.id === moodId)
      return mood ? mood.emoji : '😊'
    },

    getMoodName(moodId) {
      const mood = MOOD_OPTIONS.find(m => m.id === moodId)
      return mood ? mood.name : moodId
    },

    formatDateTime(timestamp) {
      const d = new Date(timestamp)
      const month = d.getMonth() + 1
      const day = d.getDate()
      const hour = String(d.getHours()).padStart(2, '0')
      const min = String(d.getMinutes()).padStart(2, '0')
      return `${month}月${day}日 ${hour}:${min}`
    },

    saveMood() {
      Store.addMood({
        mood: this.newMood.mood,
        smoked: this.newMood.smoked,
        note: this.newMood.note
      })

      this.newMood = {
        mood: 'happy',
        smoked: false,
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

.mood-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
}

.mood-stat {
  text-align: center;
  padding: 16rpx;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16rpx;
}

.mood-emoji {
  font-size: 64rpx;
  display: block;
  margin-bottom: 8rpx;
}

.mood-count {
  font-size: 32rpx;
  font-weight: bold;
  color: #f59e0b;
  display: block;
}

.mood-name {
  font-size: 22rpx;
  color: #6b7280;
  display: block;
  margin-top: 4rpx;
}

.record-btn {
  width: 100%;
  padding: 28rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
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

.card {
  background: linear-gradient(135deg, #1f1f1f 0%, #252525 100%);
  border: 1px solid #2a2a2a;
  border-radius: 32rpx;
}

.p-20 { padding: 40rpx; }
.mx-20 { margin-left: 40rpx; margin-right: 40rpx; }
.mb-16 { margin-bottom: 32rpx; }
.block { display: block; }

.insight-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.insight-item:last-child {
  margin-bottom: 0;
}

.insight-icon {
  font-size: 32rpx;
}

.insight-content {
  flex: 1;
}

.insight-text {
  font-size: 26rpx;
  color: #d1d5db;
}

.highlight {
  color: #f59e0b;
  font-weight: bold;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.history-item {
  display: flex;
  gap: 16rpx;
  padding: 16rpx;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16rpx;
}

.history-emoji {
  font-size: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 60rpx;
}

.history-content {
  flex: 1;
}

.history-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.history-mood {
  font-size: 28rpx;
  font-weight: 600;
  color: #f3f4f6;
}

.history-tag {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.history-tag.clean {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.history-note {
  font-size: 24rpx;
  color: #9ca3af;
  display: block;
  margin-bottom: 8rpx;
}

.history-time {
  font-size: 22rpx;
  color: #6b7280;
}

.empty-hint {
  text-align: center;
  padding: 32rpx;
  color: #6b7280;
  font-size: 24rpx;
}

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

.mood-picker {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
}

.mood-option {
  padding: 20rpx 8rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.04);
  border: 2rpx solid transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  cursor: pointer;
  transition: all 0.2s;
}

.mood-option.active {
  background: rgba(139, 92, 246, 0.15);
  border-color: rgba(139, 92, 246, 0.4);
}

.mood-option-emoji {
  font-size: 56rpx;
}

.mood-option-name {
  font-size: 22rpx;
  color: #9ca3af;
}

.mood-option.active .mood-option-name {
  color: #8b5cf6;
}

.smoke-toggle {
  display: flex;
  gap: 16rpx;
}

.smoke-option {
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

.smoke-option.active {
  background: rgba(139, 92, 246, 0.15);
  border-color: rgba(139, 92, 246, 0.4);
  color: #8b5cf6;
}

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
  background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
  color: white;
}

.modal-btn:active {
  transform: scale(0.97);
}
</style>
