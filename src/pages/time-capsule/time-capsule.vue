<template>
    <view class="page-container" :class="themeClass()">
    <app-navbar title="时间胶囊"></app-navbar>
    <scroll-view scroll-y class="main-scroll">
      <view class="mx-20 mb-16">
        <button class="write-btn" @click="showWrite = true">✍️ 写信给未来的自己</button>
      </view>
      <view class="card mx-20 p-20">
        <text class="card-title">我的时间胶囊</text>
        <view v-if="capsules.length === 0" class="empty">还没有时间胶囊</view>
        <view v-for="(c, idx) in capsules" :key="idx" class="capsule-item">
          <text class="capsule-date">{{ formatDate(c.createdAt) }}</text>
          <text class="capsule-content">{{ c.content }}</text>
        </view>
      </view>
      <view style="height: 80rpx;"></view>
    </scroll-view>
  </view>
</template>

<script>
import Store from '@/utils/store.js'
import AppNavbar from '@/components/app-navbar/app-navbar.vue'
import { themeClass } from '@/utils/theme.js'
export default {
  components: { AppNavbar },
  data() { return { capsules: [], showWrite: false } },
  onShow() { this.capsules = Store.getTimeCapsules() },
  methods: {
    formatDate(ts) { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}` }
  }
}
</script>

<style>
.page-container { height: 100vh; width: 100vw; background-color: var(--bg); color: var(--text); display: flex; flex-direction: column; }
.header { padding: 40rpx 28rpx 24rpx; }
.header-row { display: flex; align-items: center; justify-content: space-between; }
.back-btn { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.06); border-radius: 50%; }
.back-btn-placeholder { width: 64rpx; height: 64rpx; }
.back-icon { font-size: 48rpx; color: #f3f4f6; }
.page-title { font-size: 44rpx; font-weight: bold; color: #f3f4f6; }
.main-scroll { flex: 1; height: 100%; }
.mx-20 { margin-left: 40rpx; margin-right: 40rpx; }
.mb-16 { margin-bottom: 32rpx; }
.write-btn { width: 100%; padding: 28rpx; border-radius: 24rpx; background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); color: white; font-size: 32rpx; font-weight: 600; border: none; }
.card { background: linear-gradient(135deg, var(--surface-1) 0%, var(--surface-2) 100%); border: 1px solid var(--border); border-radius: 32rpx; }
.p-20 { padding: 40rpx; }
.card-title { font-size: 30rpx; font-weight: 600; color: #f3f4f6; display: block; margin-bottom: 24rpx; }
.empty { text-align: center; padding: 40rpx; color: var(--text-dim); font-size: 26rpx; }
.capsule-item { padding: 20rpx; background: rgba(255, 255, 255, 0.03); border-radius: 16rpx; margin-bottom: 16rpx; }
.capsule-date { font-size: 22rpx; color: var(--text-dim); display: block; margin-bottom: 8rpx; }
.capsule-content { font-size: 26rpx; color: var(--text); }
</style>
