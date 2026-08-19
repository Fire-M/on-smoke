<template>
  <view class="page-container">
    <app-navbar title="分享" :show-back="false"></app-navbar>
    <view class="result-content">
      <text class="result-title">恭喜，你抽了一根寂寞</text>

      <!-- 四宫格数据卡片 -->
      <view class="result-grid">
        <view class="result-cell">
          <text class="result-value">¥{{ resultSaved }}</text>
          <text class="result-label">这根省下</text>
        </view>
        <view class="result-cell">
          <text class="result-value">{{ resultTar }}</text>
          <text class="result-label">焦油挡在门外</text>
        </view>
        <view class="result-cell">
          <text class="result-value">{{ resultLifespan }}</text>
          <text class="result-label">续命</text>
        </view>
        <view class="result-cell">
          <text class="result-value">第 {{ resultCount }} 次</text>
          <text class="result-label">骗过烟瘾</text>
        </view>
      </view>

      <!-- 细节行 -->
      <text class="result-detail">{{ resultDetail }}</text>

      <!-- 解锁进度提示 -->
      <button class="unlock-btn" v-if="unlockMsg" @click="onUnlockTap">
        {{ unlockMsg }}
      </button>

      <!-- 分享按钮 -->
      <button class="share-btn" @click="shareToFriend">💬 给朋友也递根寂寞</button>

      <!-- 再抽一根 -->
      <button class="again-btn" @click="smokeAgain">再抽一根 ›</button>
    </view>
  </view>
</template>

<script>
import Store from '@/utils/store.js'
import AppNavbar from '@/components/app-navbar/app-navbar.vue'

export default {
  components: { AppNavbar },
  data() {
    return {
      brandId: '',
      remaining: 0,
      duration: 0,
      resultSaved: '0.0',
      resultTar: '-',
      resultLifespan: '+0',
      resultCount: 0,
      resultDetail: '',
      unlockMsg: ''
    }
  },

  onLoad(options) {
    this.brandId = options.brandId || ''
    this.remaining = parseInt(options.remaining) || 0
    this.duration = parseInt(options.duration) || 0

    const settings = Store.getSettings()
    const pricePerCig = settings.cigarettePrice / settings.packSize

    this.resultSaved = pricePerCig.toFixed(1)
    this.resultTar = '8mg'
    this.resultLifespan = '+11min'
    this.resultCount = Store.getStats().totalSmoked

    const m = Math.floor(this.duration / 60)
    const s = this.duration % 60
    this.resultDetail = `吐了 0 口 · 耗时 ${m} 分 ${s} 秒 · 这包剩 ${this.remaining} 根`

    // 检查解锁
    this.checkUnlock()
  },

  methods: {
    checkUnlock() {
      const sec = Store.getSmokeFreeDuration()
      const badges = this.calcBadges()
      if (badges > 0) {
        this.unlockMsg = `已解锁 ${badges}/8 枚成就徽章`
      }
    },

    calcBadges() {
      const sec = Store.getSmokeFreeDuration()
      let c = 0
      if (sec >= 1200) c++
      if (sec >= 43200) c++
      if (sec >= 1209600) c++
      if (sec >= 7776000) c++
      if (sec >= 15552000) c++
      if (Store.getLessSmoked() >= 10) c++
      if (Store.getLessSmoked() >= 50) c++
      if (Store.getSavedMoney() >= 100) c++
      return Math.min(c, 8)
    },

    onUnlockTap() {
      uni.switchTab({ url: '/pages/index/index' })
    },

    shareToFriend() {
      // 小程序分享
      // #ifdef MP-WEIXIN
      uni.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline']
      })
      // #endif

      // H5 分享
      // #ifdef H5
      if (navigator.share) {
        navigator.share({
          title: '就抽一根',
          text: `我刚抽了一根寂寞，省了 ¥${this.resultSaved}！`,
          url: window.location.href
        }).catch(() => {})
      } else {
        uni.showToast({ title: '已复制分享链接', icon: 'none' })
      }
      // #endif

      uni.showToast({ title: '分享成功', icon: 'none' })
    },

    smokeAgain() {
      uni.switchTab({ url: '/pages/index/index' })
    }
  },

  onShareAppMessage() {
    return {
      title: '就抽一根 - 假装点一根，不伤肺不花钱',
      path: '/pages/index/index'
    }
  }
}
</script>

<style>
.page-container {
  min-height: 100vh;
  width: 100vw;
  background-color: #0f0f0f;
  color: #e5e7eb;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
}

.result-content {
  width: 100%;
  max-width: 600rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40rpx;
  padding: 40rpx 32rpx 0;
  box-sizing: border-box;
}

.result-title {
  font-size: 36rpx;
  color: rgba(245, 158, 11, 0.9);
  letter-spacing: 4rpx;
}

.result-grid {
  width: 100%;
  border: 1px solid rgba(55, 65, 81, 0.6);
  border-radius: 24rpx;
  padding: 32rpx;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32rpx 0;
}

.result-cell {
  text-align: center;
  padding: 0 24rpx;
}

.result-value {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: #f59e0b;
}

.result-label {
  display: block;
  font-size: 22rpx;
  color: #6b7280;
  margin-top: 4rpx;
}

.result-detail {
  font-size: 24rpx;
  color: #6b7280;
  text-align: center;
}

.unlock-btn {
  width: 100%;
  padding: 28rpx;
  border-radius: 24rpx;
  border: 1px solid rgba(245, 158, 11, 0.4);
  background: rgba(245, 158, 11, 0.1);
  color: rgba(245, 158, 11, 0.8);
  font-size: 28rpx;
  font-weight: 500;
}

.share-btn {
  width: 100%;
  padding: 32rpx;
  border-radius: 24rpx;
  background: linear-gradient(to right, #f59e0b, #f97316);
  color: #0f0f0f;
  font-weight: bold;
  font-size: 32rpx;
  box-shadow: 0 8rpx 24rpx rgba(245, 158, 11, 0.2);
  border: none;
}

.again-btn {
  font-size: 28rpx;
  color: #9ca3af;
  background: transparent;
  border: none;
  margin-top: 8rpx;
}
</style>
