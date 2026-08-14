<template>
  <view class="page-container">
    <view class="header">
      <view class="header-row">
        <view class="back-btn" @click="goBack"><text class="back-icon">←</text></view>
        <text class="page-title">省钱目标</text>
      </view>
    </view>
    <scroll-view scroll-y class="main-scroll">
      <view class="mx-20 mb-16">
        <view class="card p-20">
          <text class="card-title">当前已省</text>
          <text class="saved-amount">¥{{ savedMoney }}</text>
          <view class="progress-bar"><view class="progress-fill" :style="{ width: progress + '%' }"></view></view>
          <text class="progress-text">目标：¥{{ goalAmount }}</text>
        </view>
      </view>
      <view class="mx-20 mb-16">
        <button class="set-goal-btn" @click="showSetGoal = true">设置新目标</button>
      </view>
      <view style="height: 80rpx;"></view>
    </scroll-view>
  </view>
</template>

<script>
import Store from '@/utils/store.js'
export default {
  data() {
    return { savedMoney: '0', goalAmount: 1000, progress: 0, showSetGoal: false }
  },
  onShow() {
    this.savedMoney = Store.getSavedMoney().toFixed(1)
    const goals = Store.getSavingsGoals()
    if (goals.length > 0) this.goalAmount = goals[goals.length - 1].target
    this.progress = Math.min(100, (this.savedMoney / this.goalAmount) * 100)
  },
  methods: {
    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) uni.navigateBack()
      else uni.switchTab({ url: '/pages/index/index' })
    }
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
.card { background: linear-gradient(135deg, #1f1f1f 0%, #252525 100%); border: 1px solid #2a2a2a; border-radius: 32rpx; }
.p-20 { padding: 40rpx; }
.mx-20 { margin-left: 40rpx; margin-right: 40rpx; }
.mb-16 { margin-bottom: 32rpx; }
.card-title { font-size: 28rpx; color: #6b7280; display: block; margin-bottom: 16rpx; }
.saved-amount { font-size: 72rpx; font-weight: bold; color: #10b981; display: block; margin-bottom: 24rpx; }
.progress-bar { height: 16rpx; background: rgba(255, 255, 255, 0.06); border-radius: 12rpx; overflow: hidden; margin-bottom: 12rpx; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #10b981 0%, #059669 100%); border-radius: 12rpx; transition: width 0.3s ease; }
.progress-text { font-size: 24rpx; color: #6b7280; }
.set-goal-btn { width: 100%; padding: 28rpx; border-radius: 24rpx; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; font-size: 32rpx; font-weight: 600; border: none; }
</style>
