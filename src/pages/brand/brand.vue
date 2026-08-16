<template>
  <view class="page-container">
    <!-- 品牌网格 -->
    <scroll-view scroll-y class="brand-scroll">
      <view class="brand-header">
        <view class="brand-header-row">
          <view class="brand-back-btn" @click="goBack">
            <text class="brand-back-icon">&lt;</text>
          </view>
          <text class="brand-header-title">选择香烟</text>
          <view class="brand-back-btn-placeholder"></view>
        </view>
        <text class="brand-header-sub">挑一包解解馋 · 全是假的</text>
      </view>

      <view class="brand-grid">
        <view v-for="(brand, index) in brands" :key="brand.id"
          class="brand-card" :class="'theme-' + brand.theme"
          :style="{ animationDelay: index * 0.06 + 's' }"
          @click="selectBrand(brand)">
          <view class="brand-card-top">
            <text class="brand-price">¥{{ brand.price }}</text>
            <view class="brand-seal"></view>
          </view>
          <view class="brand-card-center">
            <text class="brand-name-cn">{{ brand.cn }}</text>
            <text class="brand-name-en">{{ brand.en }}</text>
          </view>
          <view class="brand-card-bottom">
            <text class="brand-tag">{{ brand.tag }}</text>
            <text class="brand-quote">"{{ brand.quote }}"</text>
          </view>
          <!-- 剩余根数 -->
          <view class="brand-remaining">
            <text class="brand-remaining-num">{{ brand.remaining }}/{{ quota }}</text>
          </view>
          <view class="brand-card-shine"></view>
        </view>
      </view>

      <!-- 底部声明 -->
      <view class="disclaimer">
        <text class="disclaimer-icon">🚫</text>
        <text class="disclaimer-text">虚构品牌 · 纯属戏谑 · 真烟请远离</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import Store from '@/utils/store.js'

const BRANDS = [
  { id: 'lanhe', cn: '蓝河', en: 'LAN·HE', price: 50, theme: 'blue', tag: '冰凉回甘·空气味', quote: '假装自己很高级', packSize: 20 },
  { id: 'hongta', cn: '太华', en: 'TA·HWA', price: 88, theme: 'red', tag: '浓郁·想象味', quote: '送礼倍有面（的空气）', packSize: 20 },
  { id: 'heiye', cn: '熊猫666', en: 'PANDA', price: 100, theme: 'black', tag: '顶配·都是心理味', quote: '国宝都戒了你还抽？', packSize: 20 },
  { id: 'jinsi', cn: '羊驼', en: 'LLAMA', price: 22, theme: 'gold', tag: '粗犷·沙漠风', quote: '原版是骆驼，这是羊驼', packSize: 20 },
  { id: 'qingyun', cn: '冰河', en: 'ICE·RIVER', price: 35, theme: 'lightblue', tag: '薄荷冰爆·脑瓜疼', quote: '爆珠一捏，感觉良好', packSize: 20 },
  { id: 'zimeng', cn: '紫云', en: 'PURPLE', price: 45, theme: 'purple', tag: '淡雅·朕的味道', quote: '烟盒比烟好看', packSize: 20 }
]

export default {
  data() {
    return {
      brands: [],
      quota: 20
    }
  },

  onShow() {
    // 加载配额
    const settings = Store.getSettings()
    this.quota = settings.dailyQuota || 20
    
    // 重新加载品牌列表，包含剩余数量
    this.brands = BRANDS.map(brand => ({
      ...brand,
      remaining: Store.getBrandRemaining(brand.id)
    }))
  },

  methods: {
    selectBrand(brand) {
      // 保存品牌选择
      const settings = Store.getSettings()
      settings.selectedBrand = brand.id
      Store.saveSettings(settings)

      // 跳转到烟盒详情页
      uni.navigateTo({
        url: `/pages/pack-detail/pack-detail?brandId=${brand.id}`
      })
    },

    goBack() {
      // 直接返回首页
      uni.switchTab({
        url: '/pages/index/index'
      })
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

.brand-scroll {
  flex: 1;
  padding: 0 28rpx;
}

.brand-header {
  padding: 40rpx 12rpx 28rpx;
}

.brand-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand-back-btn {
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

.brand-back-btn-placeholder {
  width: 64rpx;
  height: 64rpx;
}

.brand-back-btn:active {
  background: rgba(255, 255, 255, 0.12);
  transform: scale(0.92);
}

.brand-back-icon {
  font-size: 48rpx;
  color: #f3f4f6;
}

.brand-header-title {
  font-size: 44rpx;
  font-weight: bold;
  color: #f3f4f6;
}

.brand-header-badge {
  font-size: 22rpx;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.12);
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.brand-header-sub {
  display: block;
  font-size: 24rpx;
  color: #6b7280;
  margin-top: 8rpx;
}

.brand-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

/* 品牌卡片 */
.brand-card {
  position: relative;
  border-radius: 28rpx;
  padding: 28rpx 20rpx 24rpx;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  min-height: 380rpx;
  display: flex;
  flex-direction: column;
  animation: cardFadeIn 0.4s ease-out both;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 
    0 8rpx 24rpx rgba(0, 0, 0, 0.4),
    0 2rpx 8rpx rgba(0, 0, 0, 0.3),
    inset 0 1rpx 0 rgba(255, 255, 255, 0.1);
  transform: perspective(1000px) rotateX(0deg) rotateY(0deg);
}

.brand-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 40%);
  pointer-events: none;
  border-radius: inherit;
}

.brand-card::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40%;
  background: linear-gradient(0deg, rgba(0,0,0,0.3) 0%, transparent 100%);
  pointer-events: none;
  border-radius: inherit;
}

/* 卡片光泽效果 */
.brand-card-shine {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    transparent 40%,
    rgba(255, 255, 255, 0.05) 45%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.05) 55%,
    transparent 60%
  );
  pointer-events: none;
  transform: rotate(0deg);
  transition: all 0.5s ease;
}

.brand-card:active {
  transform: perspective(1000px) scale(0.95) rotateX(5deg);
  box-shadow: 
    0 4rpx 12rpx rgba(0, 0, 0, 0.5),
    0 1rpx 4rpx rgba(0, 0, 0, 0.4),
    inset 0 1rpx 0 rgba(255, 255, 255, 0.15);
  filter: brightness(1.2);
}

.brand-card:active .brand-card-shine {
  transform: rotate(15deg) translate(10%, 10%);
}

/* 悬浮效果 */
.brand-card:hover {
  transform: perspective(1000px) translateY(-12rpx) rotateX(2deg);
  box-shadow: 
    0 16rpx 40rpx rgba(0, 0, 0, 0.5),
    0 6rpx 16rpx rgba(0, 0, 0, 0.4),
    inset 0 1rpx 0 rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.15);
}

.brand-card:hover .brand-card-shine {
  transform: rotate(-5deg) translate(5%, 5%);
  opacity: 1.5;
}

/* 卡片主题渐变 */
.brand-card.theme-blue   { background: linear-gradient(155deg, #1e3a5f 0%, #0d2240 100%); }
.brand-card.theme-red    { background: linear-gradient(155deg, #7a1f2b 0%, #4a0f18 100%); }
.brand-card.theme-black  { background: linear-gradient(155deg, #2a2a2a 0%, #141414 100%); }
.brand-card.theme-gold   { background: linear-gradient(155deg, #8b6914 0%, #5a4510 100%); }
.brand-card.theme-lightblue { background: linear-gradient(155deg, #2d5a6e 0%, #1a3d4f 100%); }
.brand-card.theme-purple { background: linear-gradient(155deg, #4a2d6e 0%, #2d1a45 100%); }

/* 卡片顶部：价格 + 印章 */
.brand-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16rpx;
}

.brand-price {
  font-size: 26rpx;
  color: rgba(240, 230, 210, 0.6);
  font-weight: 600;
}

/* 圆形印章 */
.brand-seal {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  border: 3rpx solid rgba(240, 230, 210, 0.3);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.15);
}

.brand-seal::after {
  content: '';
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(240,230,210,0.45) 0%, rgba(240,230,210,0.08) 100%);
}

/* 卡片中心：品牌名 */
.brand-card-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12rpx 0;
}

.brand-name-cn {
  font-size: 52rpx;
  font-weight: 800;
  color: #f0e6d2;
  letter-spacing: 6rpx;
  text-align: center;
  line-height: 1.2;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
}

.brand-name-en {
  font-size: 20rpx;
  font-weight: 500;
  color: rgba(240, 230, 210, 0.55);
  letter-spacing: 4rpx;
  text-align: center;
  margin-top: 6rpx;
}

/* 卡片底部：描述 */
.brand-card-bottom {
  padding-top: 16rpx;
  text-align: center;
  border-top: 1px solid rgba(240, 230, 210, 0.08);
}

.brand-tag {
  display: block;
  font-size: 22rpx;
  font-weight: 600;
  color: rgba(240, 230, 210, 0.85);
  letter-spacing: 1rpx;
}

.brand-quote {
  display: block;
  font-size: 18rpx;
  color: rgba(240, 230, 210, 0.4);
  margin-top: 6rpx;
  font-style: italic;
  line-height: 1.3;
}

/* 剩余根数 */
.brand-remaining {
  position: absolute;
  top: 16rpx;
  left: 16rpx;
  z-index: 10;
}

.brand-remaining-num {
  font-size: 24rpx;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.9);
}

/* 卡片入场动画 */
@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(30rpx) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 底部声明 */
.disclaimer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 48rpx 0 140rpx;
}

.disclaimer-icon {
  font-size: 40rpx;
}

.disclaimer-text {
  font-size: 22rpx;
  color: #374151;
}
</style>
