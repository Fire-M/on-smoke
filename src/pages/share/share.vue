<template>
  <view class="page-container" :class="themeClass()">
    <!-- 现在是从成就页推进来的普通页面，用默认的自动返回 -->
    <app-navbar title="晒一张"></app-navbar>
    <scroll-view scroll-y class="main-scroll">
    <view class="result-content">
      <text class="result-title">这些，都是忍住换来的</text>

      <!-- 四宫格：全部是「攒下来」的东西，没有一项是鼓励抽烟的 -->
      <view class="result-grid">
        <view class="result-cell">
          <text class="result-value">¥{{ savedTotal }}</text>
          <text class="result-label">累计已省</text>
        </view>
        <view class="result-cell">
          <text class="result-value">{{ resistCount }}</text>
          <text class="result-label">次忍住不抽</text>
        </view>
        <view class="result-cell">
          <text class="result-value">{{ cleanDays }}</text>
          <text class="result-label">天坚持下来</text>
        </view>
        <view class="result-cell">
          <text class="result-value">{{ badgeCount }}<text class="result-sub">/{{ badgeTotal }}</text></text>
          <text class="result-label">枚成就徽章</text>
        </view>
      </view>

      <text class="result-detail">{{ detailText }}</text>

      <button class="share-btn" @tap="shareToFriend">💬 递给朋友一张</button>
      <button class="again-btn" @tap="backHome">回首页 ›</button>
      <view class="scroll-bottom"></view>
    </view>
    </scroll-view>
  </view>
</template>

<script>
import Store from '@/utils/store.js'
import AppNavbar from '@/components/app-navbar/app-navbar.vue'
import { themeClass } from '@/utils/theme.js'

export default {
  components: { AppNavbar },
  data() {
    return {
      savedTotal: '0.00',
      resistCount: 0,
      cleanDays: 1,
      badgeCount: 0,
      badgeTotal: 0,
      detailText: ''
    }
  },

  onShow() {
    if (!this.shouldRefresh()) return
    this.loadData()
    this.markRefreshed()
  },

  methods: {
    loadData() {
      // 口径全部走 Store，和首页/成就页共用同一份计算
      Store.settleDailySavings()
      Store.syncBadges()

      const resist = Store.getResistStats()
      const badges = Store.getBadgeList()
      const today = Store.getToday()

      this.savedTotal = (Number(resist.totalSaved) || 0).toFixed(2)
      this.resistCount = Number(resist.totalCount) || 0
      this.cleanDays = Store.getCleanDays() + 1
      this.badgeCount = badges.filter(b => b.unlocked).length
      this.badgeTotal = badges.length

      // 今天这一行给的是「今天还在继续」的证据，而不是总数
      const smoked = Number(today.smokedCount) || 0
      const todaySaved = (Number(resist.todaySaved) || 0).toFixed(2)
      this.detailText = `今天：忍住 ${resist.todayCount || 0} 次 · 省下 ¥${todaySaved} · 抽了 ${smoked} 根`
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
          text: `我在「就抽一根」里忍住了 ${this.resistCount} 次，省下 ¥${this.savedTotal}，纯属娱乐～`,
          url: window.location.href
        }).catch(() => {})
      } else {
        uni.showToast({ title: '已复制分享链接', icon: 'none' })
      }
      // #endif
      // 小程序里点这里只是打开系统分享面板，用户可能最后没发出去，
      // 之前无条件弹「分享成功」属于误导
    },

    backHome() {
      uni.switchTab({ url: '/pages/index/index' })
    }
  },

  onShareAppMessage() {
    return {
      title: `我忍住了 ${this.resistCount} 次，省下 ¥${this.savedTotal}`,
      path: '/pages/index/index'
    }
  }
}
</script>

<style>
.page-container {
  height: 100vh;
  height: 100dvh;
  width: 100%;
  background-color: var(--bg);
  color: var(--text);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
  overflow: hidden;
}

/* 统一滚动容器：flex 列里靠 height:0 + flex:1 拿到确定高度 */
.main-scroll {
  flex: 1;
  height: 0;
  min-height: 0;
  width: 100%;
}

.result-content {
  width: 100%;
  max-width: 600rpx;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40rpx;
  padding: 40rpx 32rpx 0;
  box-sizing: border-box;
}

.result-title {
  font-size: 34rpx;
  color: var(--primary);
  letter-spacing: 2rpx;
}

.result-grid {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 24rpx;
  padding: 32rpx;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32rpx 0;
  background: var(--surface-1);
}

.result-cell {
  text-align: center;
  padding: 0 24rpx;
}

.result-value {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: var(--primary);
}

/* 徽章数是「N/M」，分母降一档，别和分子抢 */
.result-sub {
  font-size: 26rpx;
  color: var(--text-dim);
  font-weight: 500;
}

.result-label {
  display: block;
  font-size: 22rpx;
  color: var(--text-dim);
  margin-top: 4rpx;
}

.result-detail {
  font-size: 24rpx;
  color: var(--text-dim);
  text-align: center;
}

.share-btn {
  width: 100%;
  padding: 32rpx;
  border-radius: 24rpx;
  background: linear-gradient(to right, var(--primary), var(--primary-2));
  color: var(--bg);
  font-weight: bold;
  font-size: 32rpx;
  box-shadow: 0 8rpx 24rpx var(--glow);
  border: none;
}

.again-btn {
  font-size: 28rpx;
  color: var(--text-dim);
  background: transparent;
  border: none;
  margin-top: 8rpx;
}
</style>
