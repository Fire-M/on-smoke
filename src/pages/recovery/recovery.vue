<template>
  <view class="page-container">
    <!-- 顶部标题 -->
    <view class="recovery-header">
      <view class="recovery-header-row">
        <view class="recovery-back-btn" @click="goBack">
          <text class="recovery-back-icon">‹</text>
        </view>
        <text class="recovery-title">身体恢复</text>
        <view class="recovery-back-btn-placeholder"></view>
      </view>
      <view class="recovery-subtitle">
        <text class="recovery-days">已戒烟 {{ quitDays }} 天</text>
        <text class="recovery-time">{{ quitTimeStr }}</text>
      </view>
    </view>

    <!-- 当前进度卡片 -->
    <view class="current-progress-card mx-20 mb-20">
      <view class="progress-header">
        <text class="progress-icon">🫁</text>
        <text class="progress-label">当前阶段</text>
      </view>
      <text class="progress-title">{{ currentMilestone.title }}</text>
      <text class="progress-desc">{{ currentMilestone.desc }}</text>
      <view class="progress-bar-wrap">
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: currentProgress + '%' }"></view>
        </view>
        <view class="progress-info">
          <text class="progress-current">{{ currentMilestone.label }}</text>
          <text class="progress-next" v-if="nextMilestone">下一里程碑：{{ nextMilestone.label }}</text>
        </view>
      </view>
    </view>

    <!-- 时间线 -->
    <scroll-view scroll-y class="timeline-scroll">
      <view class="timeline">
        <view v-for="(item, idx) in milestones" :key="idx"
          class="timeline-item" :class="{ achieved: item.achieved, current: item.isCurrent }">
          <view class="timeline-dot">
            <text v-if="item.achieved">✓</text>
            <text v-else-if="item.isCurrent">●</text>
            <text v-else>○</text>
          </view>
          <view class="timeline-content">
            <view class="timeline-header">
              <text class="timeline-time">{{ item.label }}</text>
              <text v-if="item.achieved" class="timeline-badge achieved">已达成</text>
              <text v-else-if="item.isCurrent" class="timeline-badge current">进行中</text>
            </view>
            <text class="timeline-title">{{ item.title }}</text>
            <text class="timeline-desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>

      <!-- 底部提示 -->
      <view class="timeline-footer">
        <text class="footer-text">💪 坚持下去，身体会越来越好</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import Store from '@/utils/store.js'

const MILESTONES_DATA = [
  { seconds: 1200, label: '20分钟', title: '心率恢复正常', desc: '你的心跳和血压开始恢复到正常水平，手脚温度回升' },
  { seconds: 43200, label: '12小时', title: '一氧化碳排出', desc: '血液中的一氧化碳浓度降至正常，氧气水平恢复' },
  { seconds: 172800, label: '2天', title: '嗅觉味觉改善', desc: '受损的神经末梢开始再生，嗅觉和味觉变得更敏锐' },
  { seconds: 1209600, label: '2周', title: '循环改善', desc: '血液循环改善，走路变得更加轻松，肺功能开始提升' },
  { seconds: 2592000, label: '1个月', title: '肺部清洁', desc: '肺部纤毛开始恢复，咳嗽和气短明显减少' },
  { seconds: 7776000, label: '3个月', title: '呼吸顺畅', desc: '肺功能提升30%，呼吸道感染风险降低' },
  { seconds: 15552000, label: '6个月', title: '炎症减少', desc: '呼吸道炎症明显减少，哮喘症状改善' },
  { seconds: 31536000, label: '1年', title: '心脏风险减半', desc: '冠心病风险降至吸烟者的一半' },
  { seconds: 63072000, label: '2年', title: '中风风险降低', desc: '中风风险降至非吸烟者水平' },
  { seconds: 157680000, label: '5年', title: '癌症风险下降', desc: '肺癌、口腔癌、食道癌风险显著降低' },
  { seconds: 315360000, label: '10年', title: '肺癌风险减半', desc: '肺癌死亡率降至继续吸烟者的一半' },
  { seconds: 473040000, label: '15年', title: '心脏恢复', desc: '冠心病风险与从未吸烟者相同' }
]

export default {
  data() {
    return {
      quitDays: 0,
      quitSeconds: 0,
      quitTimeStr: '',
      milestones: [],
      currentMilestone: { title: '加载中...', desc: '', label: '' },
      nextMilestone: null,
      currentProgress: 0
    }
  },

  onShow() {
    this.loadData()
  },

  methods: {
    loadData() {
      const settings = Store.getSettings()
      const quitDate = settings.quitDate || Date.now()
      const now = Date.now()
      const diffMs = now - quitDate
      const diffSeconds = Math.floor(diffMs / 1000)
      const diffDays = Math.floor(diffSeconds / 86400)

      this.quitDays = Math.max(1, diffDays)
      this.quitSeconds = diffSeconds

      // 计算戒烟时间字符串
      if (diffDays < 1) {
        const hours = Math.floor(diffSeconds / 3600)
        const mins = Math.floor((diffSeconds % 3600) / 60)
        this.quitTimeStr = `${hours}小时${mins}分钟`
      } else if (diffDays < 30) {
        this.quitTimeStr = `${diffDays}天`
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30)
        const days = diffDays % 30
        this.quitTimeStr = `${months}个月${days}天`
      } else {
        const years = Math.floor(diffDays / 365)
        const days = diffDays % 365
        this.quitTimeStr = `${years}年${days}天`
      }

      // 处理里程碑数据
      let currentIdx = -1
      this.milestones = MILESTONES_DATA.map((m, idx) => {
        const achieved = diffSeconds >= m.seconds
        const isCurrent = !achieved && (idx === 0 || diffSeconds < MILESTONES_DATA[idx].seconds)
        
        if (isCurrent && currentIdx === -1) {
          currentIdx = idx
        }

        return {
          ...m,
          achieved,
          isCurrent: currentIdx === idx
        }
      })

      // 设置当前里程碑
      if (currentIdx >= 0) {
        this.currentMilestone = this.milestones[currentIdx]
        this.nextMilestone = currentIdx < this.milestones.length - 1 ? this.milestones[currentIdx + 1] : null
        
        // 计算进度
        const prevSeconds = currentIdx > 0 ? MILESTONES_DATA[currentIdx - 1].seconds : 0
        const targetSeconds = this.currentMilestone.seconds
        const progress = (diffSeconds - prevSeconds) / (targetSeconds - prevSeconds)
        this.currentProgress = Math.min(Math.max(progress * 100, 0), 100)
      } else {
        // 所有里程碑都已达成
        const last = this.milestones[this.milestones.length - 1]
        this.currentMilestone = {
          title: '所有里程碑已达成！',
          desc: '你的身体已经恢复到非吸烟者水平，继续保持健康的生活方式',
          label: '已完成'
        }
        this.nextMilestone = null
        this.currentProgress = 100
      }
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

/* 顶部标题 */
.recovery-header {
  padding: 40rpx 28rpx 24rpx;
}

.recovery-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.recovery-back-btn {
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

.recovery-back-btn-placeholder {
  width: 64rpx;
  height: 64rpx;
}

.recovery-back-btn:active {
  background: rgba(255, 255, 255, 0.12);
  transform: scale(0.92);
}

.recovery-back-icon {
  font-size: 48rpx;
  color: #f3f4f6;
}

.recovery-title {
  font-size: 44rpx;
  font-weight: bold;
  color: #f3f4f6;
}

.recovery-subtitle {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.recovery-days {
  font-size: 28rpx;
  color: #f59e0b;
  font-weight: 600;
}

.recovery-time {
  font-size: 24rpx;
  color: #6b7280;
}

/* 当前进度卡片 */
.current-progress-card {
  background: linear-gradient(135deg, #1f1f1f 0%, #252525 100%);
  border: 1px solid #2a2a2a;
  border-radius: 32rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.2);
}

.progress-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.progress-icon {
  font-size: 40rpx;
}

.progress-label {
  font-size: 24rpx;
  color: #6b7280;
}

.progress-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #f59e0b;
  display: block;
  margin-bottom: 12rpx;
}

.progress-desc {
  font-size: 26rpx;
  color: #9ca3af;
  display: block;
  margin-bottom: 24rpx;
  line-height: 1.5;
}

.progress-bar-wrap {
  margin-top: 8rpx;
}

.progress-bar {
  height: 16rpx;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12rpx;
  overflow: hidden;
  margin-bottom: 12rpx;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b 0%, #10b981 100%);
  border-radius: 12rpx;
  transition: width 0.5s ease;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-current {
  font-size: 24rpx;
  color: #f59e0b;
  font-weight: 600;
}

.progress-next {
  font-size: 22rpx;
  color: #6b7280;
}

/* 时间线 */
.timeline-scroll {
  flex: 1;
  padding: 0 28rpx;
}

.timeline {
  position: relative;
  padding-left: 40rpx;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 18rpx;
  top: 0;
  bottom: 0;
  width: 2rpx;
  background: linear-gradient(to bottom, rgba(245, 158, 11, 0.3) 0%, rgba(16, 185, 129, 0.3) 100%);
}

.timeline-item {
  position: relative;
  padding-bottom: 40rpx;
  display: flex;
  gap: 24rpx;
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-dot {
  position: absolute;
  left: -40rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #1f1f1f;
  border: 2rpx solid #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  color: #6b7280;
  z-index: 1;
}

.timeline-item.achieved .timeline-dot {
  background: #10b981;
  border-color: #10b981;
  color: #0f0f0f;
  box-shadow: 0 0 12rpx rgba(16, 185, 129, 0.4);
}

.timeline-item.current .timeline-dot {
  background: #f59e0b;
  border-color: #f59e0b;
  color: #0f0f0f;
  box-shadow: 0 0 16rpx rgba(245, 158, 11, 0.5);
  animation: dotPulse 2s ease-in-out infinite;
}

@keyframes dotPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

.timeline-content {
  flex: 1;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20rpx;
  padding: 24rpx;
}

.timeline-item.achieved .timeline-content {
  background: rgba(16, 185, 129, 0.05);
  border-color: rgba(16, 185, 129, 0.2);
}

.timeline-item.current .timeline-content {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.3);
  box-shadow: 0 2rpx 12rpx rgba(245, 158, 11, 0.1);
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.timeline-time {
  font-size: 24rpx;
  color: #9ca3af;
  font-weight: 600;
}

.timeline-item.achieved .timeline-time {
  color: #10b981;
}

.timeline-item.current .timeline-time {
  color: #f59e0b;
}

.timeline-badge {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  background: rgba(107, 114, 128, 0.2);
  color: #6b7280;
}

.timeline-badge.achieved {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.timeline-badge.current {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}

.timeline-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #f3f4f6;
  display: block;
  margin-bottom: 8rpx;
}

.timeline-desc {
  font-size: 24rpx;
  color: #9ca3af;
  display: block;
  line-height: 1.5;
}

.timeline-footer {
  padding: 40rpx 0 80rpx;
  text-align: center;
}

.footer-text {
  font-size: 26rpx;
  color: #6b7280;
}

/* 工具类 */
.mx-20 { margin-left: 40rpx; margin-right: 40rpx; }
.mb-20 { margin-bottom: 40rpx; }
</style>
