<template>
  <view class="page-container">
    <view class="header">
      <view class="header-row">
        <view class="back-btn" @click="goBack"><text class="back-icon">&lt;</text></view>
        <text class="page-title">我的宠物</text>
        <view class="back-btn-placeholder"></view>
      </view>
    </view>
    <scroll-view scroll-y class="main-scroll">
      <view class="pet-card mx-20 mb-16">
        <text class="pet-emoji">🐱</text>
        <text class="pet-name">{{ pet.name }}</text>
        <text class="pet-level">Lv.{{ pet.level }}</text>
        <view class="stat-row">
          <text class="stat-label">健康</text>
          <view class="stat-bar"><view class="stat-fill health" :style="{ width: pet.health + '%' }"></view></view>
          <text class="stat-value">{{ pet.health }}%</text>
        </view>
        <view class="stat-row">
          <text class="stat-label">快乐</text>
          <view class="stat-bar"><view class="stat-fill happy" :style="{ width: pet.happiness + '%' }"></view></view>
          <text class="stat-value">{{ pet.happiness }}%</text>
        </view>
        <view class="stat-row">
          <text class="stat-label">经验</text>
          <view class="stat-bar"><view class="stat-fill exp" :style="{ width: expPercent + '%' }"></view></view>
          <text class="stat-value">{{ pet.exp }}/{{ pet.level * 100 }}</text>
        </view>
      </view>
      <view class="mx-20 mb-16">
        <text class="tip">💡 不吸烟时宠物会更健康快乐哦！</text>
      </view>
      <view style="height: 80rpx;"></view>
    </scroll-view>
  </view>
</template>

<script>
import Store from '@/utils/store.js'
export default {
  data() { return { pet: { name: '小烟', health: 100, happiness: 100, level: 1, exp: 0 } } },
  computed: { expPercent() { return (this.pet.exp / (this.pet.level * 100)) * 100 } },
  onShow() { this.pet = Store.getPet() },
  methods: {
    goBack() { const pages = getCurrentPages(); if (pages.length > 1) uni.navigateBack(); else uni.switchTab({ url: '/pages/index/index' }) }
  }
}
</script>

<style>
.page-container { height: 100vh; width: 100vw; background-color: #0f0f0f; color: #e5e7eb; display: flex; flex-direction: column; }
.header { padding: 40rpx 28rpx 24rpx; }
.header-row { display: flex; align-items: center; justify-content: space-between; }
.back-btn { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.06); border-radius: 50%; }
.back-btn-placeholder { width: 64rpx; height: 64rpx; }
.back-icon { font-size: 48rpx; color: #f3f4f6; }
.page-title { font-size: 44rpx; font-weight: bold; color: #f3f4f6; }
.main-scroll { flex: 1; height: 100%; }
.mx-20 { margin-left: 40rpx; margin-right: 40rpx; }
.mb-16 { margin-bottom: 32rpx; }
.pet-card { background: linear-gradient(135deg, #1f1f1f 0%, #252525 100%); border: 1px solid #2a2a2a; border-radius: 32rpx; padding: 40rpx; text-align: center; }
.pet-emoji { font-size: 120rpx; display: block; margin-bottom: 16rpx; }
.pet-name { font-size: 40rpx; font-weight: bold; color: #f3f4f6; display: block; margin-bottom: 8rpx; }
.pet-level { font-size: 28rpx; color: #f59e0b; display: block; margin-bottom: 32rpx; }
.stat-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx; }
.stat-label { font-size: 24rpx; color: #9ca3af; width: 60rpx; }
.stat-bar { flex: 1; height: 16rpx; background: rgba(255, 255, 255, 0.06); border-radius: 12rpx; overflow: hidden; }
.stat-fill { height: 100%; border-radius: 12rpx; transition: width 0.3s ease; }
.stat-fill.health { background: linear-gradient(90deg, #10b981 0%, #059669 100%); }
.stat-fill.happy { background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%); }
.stat-fill.exp { background: linear-gradient(90deg, #8b5cf6 0%, #ec4899 100%); }
.stat-value { font-size: 22rpx; color: #6b7280; width: 100rpx; text-align: right; }
.tip { font-size: 24rpx; color: #6b7280; text-align: center; display: block; }
</style>
