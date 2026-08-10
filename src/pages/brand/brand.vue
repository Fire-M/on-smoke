<template>
  <view class="page-container">
    <!-- 品牌网格 -->
    <scroll-view scroll-y class="brand-scroll">
      <view class="brand-header">
        <text class="brand-header-title">选择香烟</text>
        <text class="brand-header-sub">挑一包解解馋</text>
      </view>

      <view class="brand-grid">
        <view v-for="(brand, index) in brands" :key="brand.id"
          class="brand-card" :class="'theme-' + brand.theme"
          :style="{ animationDelay: index * 0.08 + 's' }"
          @click="selectBrand(brand)">
          <text class="brand-price">¥{{ brand.price }}</text>
          <text class="brand-name-cn">{{ brand.cn }}</text>
          <text class="brand-name-en">{{ brand.en }}</text>
          <view class="brand-seal"></view>
          <view class="brand-desc">
            <text class="brand-tag">{{ brand.tag }}</text>
            <text class="brand-quote">“{{ brand.quote }}”</text>
          </view>
        </view>
      </view>

      <!-- 底部声明 -->
      <view class="disclaimer">
        <text>虚构品牌 · 纯属戏谑 · 真烟请远离</text>
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
      brands: BRANDS
    }
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
      uni.navigateBack()
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
  padding: 0 32rpx;
}

.brand-header {
  padding: 48rpx 8rpx 32rpx;
}

.brand-header-title {
  display: block;
  font-size: 44rpx;
  font-weight: bold;
  color: #f3f4f6;
}

.brand-header-sub {
  display: block;
  font-size: 26rpx;
  color: #6b7280;
  margin-top: 8rpx;
}

.brand-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
}

/* 品牌卡片 - 还原原始 3D 渐变风格 */
.brand-card {
  position: relative;
  border-radius: 32rpx;
  padding: 40rpx 24rpx 28rpx;
  cursor: pointer;
  transition: all 0.25s ease;
  overflow: hidden;
  min-height: 400rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: cardFadeIn 0.4s ease-out both;
}

.brand-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 40%);
  pointer-events: none;
  border-radius: inherit;
}

.brand-card:active {
  transform: scale(0.96);
  filter: brightness(1.2);
}

/* 卡片主题渐变 */
.brand-card.theme-blue   { background: linear-gradient(160deg, #1e3a5f 0%, #0d2240 100%); }
.brand-card.theme-red    { background: linear-gradient(160deg, #7a1f2b 0%, #4a0f18 100%); }
.brand-card.theme-black  { background: linear-gradient(160deg, #2a2a2a 0%, #141414 100%); }
.brand-card.theme-gold   { background: linear-gradient(160deg, #8b6914 0%, #5a4510 100%); }
.brand-card.theme-lightblue { background: linear-gradient(160deg, #2d5a6e 0%, #1a3d4f 100%); }
.brand-card.theme-purple { background: linear-gradient(160deg, #4a2d6e 0%, #2d1a45 100%); }

/* 价格 */
.brand-price {
  position: absolute;
  top: 24rpx;
  right: 28rpx;
  font-size: 24rpx;
  color: rgba(240, 230, 210, 0.5);
  font-weight: 500;
}

/* 品牌中文名 */
.brand-name-cn {
  font-size: 48rpx;
  font-weight: 800;
  color: #f0e6d2;
  letter-spacing: 8rpx;
  text-align: center;
  line-height: 1.3;
}

/* 品牌英文名 */
.brand-name-en {
  font-size: 22rpx;
  font-weight: 500;
  color: rgba(240, 230, 210, 0.65);
  letter-spacing: 6rpx;
  text-align: center;
  margin-top: 4rpx;
}

/* 圆形印章 */
.brand-seal {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(240, 230, 210, 0.35);
  margin: 20rpx auto 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.2);
}

.brand-seal::after {
  content: '';
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(240,230,210,0.5) 0%, rgba(240,230,210,0.1) 100%);
}

/* 品牌描述 */
.brand-desc {
  margin-top: auto;
  padding-top: 24rpx;
  text-align: center;
}

.brand-tag {
  display: block;
  font-size: 24rpx;
  font-weight: 700;
  color: rgba(240, 230, 210, 0.9);
  letter-spacing: 2rpx;
}

.brand-quote {
  display: block;
  font-size: 20rpx;
  color: rgba(240, 230, 210, 0.5);
  margin-top: 8rpx;
  font-style: italic;
  line-height: 1.4;
}

/* 卡片入场动画 */
@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(40rpx) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.disclaimer {
  text-align: center;
  font-size: 24rpx;
  color: #374151;
  margin-top: 48rpx;
  margin-bottom: 120rpx;
}
</style>
