<template>
  <view class="page-container">
    <view class="header">
      <view class="header-row">
        <view class="back-btn" @click="goBack"><text class="back-icon">←</text></view>
        <text class="page-title">健康计算器</text>
      </view>
    </view>
    <scroll-view scroll-y class="main-scroll">
      <view class="card mx-20 mb-16 p-20">
        <text class="card-title">戒烟收益</text>
        <view class="result-item">
          <text class="result-label">已延长寿命</text>
          <text class="result-value highlight">+{{ lifeGained }} 天</text>
        </view>
        <view class="result-item">
          <text class="result-label">已节省金钱</text>
          <text class="result-value">¥{{ savedMoney }}</text>
        </view>
        <view class="result-item">
          <text class="result-label">少吸香烟</text>
          <text class="result-value">{{ cigarettesAvoided }} 根</text>
        </view>
      </view>
      <view class="card mx-20 mb-16 p-20">
        <text class="card-title">健康恢复</text>
        <view v-for="(m, idx) in milestones" :key="idx" class="milestone-item">
          <text class="milestone-icon" :class="{ done: m.done }">{{ m.done ? '✓' : '○' }}</text>
          <view class="milestone-content">
            <text class="milestone-title">{{ m.label }}</text>
            <text class="milestone-desc">{{ m.desc }}</text>
          </view>
        </view>
      </view>
      <view style="height: 80rpx;"></view>
    </scroll-view>
  </view>
</template>

<script>
import Store from '@/utils/store.js'
export default {
  data() {
    return {
      lifeGained: 0, savedMoney: '0', cigarettesAvoided: 0,
      milestones: [
        { label: '20分钟', desc: '心率恢复正常', done: false },
        { label: '12小时', desc: '血氧水平恢复', done: false },
        { label: '2周', desc: '循环改善', done: false },
        { label: '3个月', desc: '肺功能提升30%', done: false },
        { label: '1年', desc: '冠心病风险减半', done: false }
      ]
    }
  },
  onShow() {
    const settings = Store.getSettings()
    const stats = Store.getStats()
    const smokeFreeSec = Store.getSmokeFreeDuration()
    
    // 假设每根烟减少11分钟寿命
    const totalSmoked = stats.totalSmoked || 0
    const originalDaily = settings.dailyOriginal || 20
    const daysSinceQuit = Store.getCleanDays()
    const cigarettesAvoided = daysSinceQuit * originalDaily
    this.cigarettesAvoided = cigarettesAvoided
    this.lifeGained = Math.floor((cigarettesAvoided * 11) / 60 / 24) // 天
    this.savedMoney = Store.getSavedMoney().toFixed(1)
    
    // 更新里程碑
    this.milestones.forEach(m => { m.done = false })
    if (smokeFreeSec >= 1200) this.milestones[0].done = true
    if (smokeFreeSec >= 43200) this.milestones[1].done = true
    if (smokeFreeSec >= 1209600) this.milestones[2].done = true
    if (smokeFreeSec >= 7776000) this.milestones[3].done = true
    if (smokeFreeSec >= 31536000) this.milestones[4].done = true
  },
  methods: {
    goBack() { const pages = getCurrentPages(); if (pages.length > 1) uni.navigateBack(); else uni.switchTab({ url: '/pages/index/index' }) }
  }
}
</script>

<style>
.page-container { height: 100vh; width: 100vw; background-color: #0f0f0f; color: #e5e7eb; display: flex; flex-direction: column; }
.header { padding: 40rpx 28rpx 24rpx; }
.header-row { display: flex; align-items: center; gap: 16rpx; }
.back-btn { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.06); border-radius: 50%; }
.back-icon { font-size: 36rpx; color: #f3f4f6; }
.page-title { font-size: 44rpx; font-weight: bold; color: #f3f4f6; }
.main-scroll { flex: 1; height: 100%; }
.mx-20 { margin-left: 40rpx; margin-right: 40rpx; }
.mb-16 { margin-bottom: 32rpx; }
.card { background: linear-gradient(135deg, #1f1f1f 0%, #252525 100%); border: 1px solid #2a2a2a; border-radius: 32rpx; }
.p-20 { padding: 40rpx; }
.card-title { font-size: 30rpx; font-weight: 600; color: #f3f4f6; display: block; margin-bottom: 24rpx; }
.result-item { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
.result-item:last-child { border-bottom: none; }
.result-label { font-size: 26rpx; color: #9ca3af; }
.result-value { font-size: 28rpx; color: #f3f4f6; font-weight: 600; }
.result-value.highlight { color: #10b981; }
.milestone-item { display: flex; gap: 16rpx; margin-bottom: 20rpx; }
.milestone-icon { font-size: 28rpx; color: #6b7280; min-width: 40rpx; }
.milestone-icon.done { color: #10b981; }
.milestone-content { flex: 1; }
.milestone-title { font-size: 26rpx; color: #f3f4f6; display: block; margin-bottom: 4rpx; }
.milestone-desc { font-size: 22rpx; color: #6b7280; }
</style>
