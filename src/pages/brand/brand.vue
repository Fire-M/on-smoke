<template>
  <view class="page-container" :class="themeClass()">
    <app-navbar title="选择香烟"></app-navbar>
    <!-- 品牌网格 -->
    <scroll-view scroll-y class="brand-scroll">
      <view class="brand-header">
        <text class="brand-header-sub">挑一包解解馋 · 全是假的</text>
        <text class="brand-header-count">{{ brands.length }} 款</text>
      </view>

      <view class="brand-grid">
        <view v-for="brand in brands" :key="brand.id"
          class="brand-card" :class="['theme-' + brand.theme, { selected: brand.id === settings.selectedBrand }]"
          @click="selectBrand(brand)">
          <view class="pack-top">
            <view class="pack-price-row">
              <text class="pack-price">¥{{ brand.price }}</text>
              <text class="pack-skin" v-if="brand.id === settings.selectedBrand && activeSkin">{{ activeSkin.icon }}</text>
            </view>
            <text class="pack-stock">{{ brand.remaining }}/{{ brand.packSize }}</text>
          </view>

          <!-- 顶盖折线：真烟盒上盖与盒身的分界，排在价签之下 -->
          <view class="pack-hinge"></view>

          <!-- 剩余量：盒里还剩多少，比数字更快看懂 -->
          <view class="pack-gauge">
            <view class="pack-gauge-fill" :style="{ width: gaugeWidth(brand) }"></view>
          </view>

          <view class="pack-name">
            <text class="pack-name-cn">{{ brand.cn }}</text>
            <text class="pack-name-en">{{ brand.en }}</text>
          </view>

          <!-- 警示条：真烟盒上最占面积的一块，这里换成品牌自己的邪门口味 -->
          <view class="pack-warning">
            <text class="pack-tag">{{ brand.tag }}</text>
            <text class="pack-quote">{{ brand.quote }}</text>
          </view>
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
import AppNavbar from '@/components/app-navbar/app-navbar.vue'
import { themeClass } from '@/utils/theme.js'

export default {
  components: { AppNavbar },
  data() {
    return {
      brands: [],
      settings: { selectedBrand: null },
      activeSkin: null,
      // 上一次列表数据的指纹，用来判断要不要重建数组
      listSignature: ''
    }
  },

  onShow() {
    this.settings = Store.getSettings()
    Store.settleDailySavings()
    this.activeSkin = Store.getActiveSkin()

    // 品牌数据与「每包支数」统一取自 Store.BRANDS，
    // 避免分母用全局设置、分子用品牌口径，出现「剩余 15 / 总数 10」。
    // 包状态一次批量取出：逐品牌各读一次 storage 会在进出页面时明显拖慢。
    const packStates = Store.getAllPackStates()
    const list = Store.BRANDS.map(brand => ({
      ...brand,
      ...(packStates[brand.id] || {})
    }))

    // 只有剩余支数真变了才换数组。以前每次 onShow 都新建一遍，
    // 从详情页返回时 12 张卡会整体重建重绘，切换品牌看着像卡了一下。
    const signature = list.map(b => `${b.id}:${b.packSize}:${b.remaining}`).join('|')
    if (signature !== this.listSignature) {
      this.listSignature = signature
      this.brands = list
    }
  },

  methods: {
    // 剩余量条宽度：按包内剩余支数算，包大小为 0 时不画（避免除零得到 NaN）
    gaugeWidth(brand) {
      const total = Number(brand.packSize) || 0
      const left = Number(brand.remaining) || 0
      if (total <= 0) return '0%'
      return Math.max(0, Math.min(100, (left / total) * 100)) + '%'
    },

    selectBrand(brand) {
      const brandId = brand.id
      // 先跳转、后落存储：setStorageSync 是同步调用，放在跳转前会把转场动画推迟，
      // 手感就是「点下去先顿一下，页面才动」。详情页不依赖 selectedBrand，所以能挪。
      uni.navigateTo({
        url: `/pages/pack-detail/pack-detail?brandId=${brandId}`,
        complete: () => {
          const settings = Store.getSettings()
          settings.selectedBrand = brandId
          Store.saveSettings(settings)
        }
      })
    }
  }
}
</script>

<style>
.page-container {
  height: 100vh;
  width: 100%;
  background-color: var(--bg);
  color: var(--text);
  display: flex;
  flex-direction: column;
  position: relative;
}

/* 统一滚动容器：flex 列里靠 height:0 + flex:1 拿到确定高度 */
.brand-scroll {
  flex: 1;
  height: 0;
  min-height: 0;
  padding: 0 28rpx;
}

.brand-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 44rpx 14rpx 30rpx;
}

.brand-header-sub {
  font-size: 26rpx;
  letter-spacing: 1rpx;
  color: var(--text-dim);
}

.brand-header-count {
  font-size: 22rpx;
  color: var(--border);
}

.brand-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
}

/* 烟盒卡片：照真烟盒的版式排 —— 顶盖折线、价签、盒面正中品牌名、底部警示条 */
.brand-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 404rpx;
  padding: 32rpx 26rpx 28rpx;
  border-radius: 24rpx;
  border: 1rpx solid rgba(240, 230, 210, 0.10);
  /* 阴影收窄一档：12 张卡同时带大范围模糊阴影，滚动时会一直重绘 */
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.38);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease;
}

.brand-card:active {
  transform: scale(0.97);
}

/* 顶盖折线：烟盒上盖和盒身的那道缝。
   跟着文档流走（负边距撑满卡宽），不再用固定 top，
   否则字号一变就会压到下面的量条上 */
.pack-hinge {
  height: 1rpx;
  margin: 14rpx -26rpx 0;
  background: rgba(240, 230, 210, 0.10);
  box-shadow: 0 1rpx 0 rgba(0, 0, 0, 0.28);
  pointer-events: none;
}

/* 顶部一排：价签 + 剩余支数 */
.pack-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.pack-price-row {
  display: flex;
  align-items: baseline;
  gap: 6rpx;
}

.pack-price {
  font-size: 30rpx;
  font-weight: 700;
  color: #f0e6d2;
  letter-spacing: 1rpx;
}

/* 选中那包挂着的皮肤 */
.pack-skin {
  font-size: 20rpx;
  line-height: 1;
}

.pack-stock {
  font-size: 20rpx;
  color: rgba(240, 230, 210, 0.55);
}

/* 剩余量条 */
.pack-gauge {
  height: 4rpx;
  margin-top: 12rpx;
  border-radius: 999rpx;
  background: rgba(240, 230, 210, 0.12);
  overflow: hidden;
}

.pack-gauge-fill {
  height: 100%;
  border-radius: inherit;
  background: rgba(240, 230, 210, 0.6);
  transition: width 0.3s ease;
}

/* 盒面正中 */
.pack-name {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28rpx 0 32rpx;
}

.pack-name-cn {
  font-size: 56rpx;
  font-weight: 800;
  color: #f0e6d2;
  letter-spacing: 8rpx;
  line-height: 1.2;
  /* 名字一律单行：胖达666 这种 5 个字符的名字再大就会挤出卡片 */
  white-space: nowrap;
}

.pack-name-en {
  margin-top: 10rpx;
  font-size: 19rpx;
  font-weight: 500;
  letter-spacing: 5rpx;
  color: rgba(240, 230, 210, 0.5);
}

/* 警示条：一道墨线把盒面和底部印字分开 */
.pack-warning {
  padding-top: 18rpx;
  border-top: 1rpx solid rgba(240, 230, 210, 0.12);
  text-align: center;
}

.pack-tag {
  display: block;
  font-size: 23rpx;
  font-weight: 600;
  letter-spacing: 1rpx;
  color: rgba(240, 230, 210, 0.88);
}

.pack-quote {
  display: block;
  margin-top: 8rpx;
  font-size: 19rpx;
  line-height: 1.4;
  color: rgba(240, 230, 210, 0.52);
  font-style: italic;
}

/* 已选：只留边框变色 + 左侧一道琥珀边条，不再叠两个徽章 */
.brand-card.selected {
  border-color: var(--primary);
}

.brand-card.selected::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5rpx;
  background: var(--primary);
  pointer-events: none;
}

/* 卡片主题渐变 */
.brand-card.theme-blue   { background: linear-gradient(155deg, #1e3a5f 0%, #0d2240 100%); }
.brand-card.theme-red    { background: linear-gradient(155deg, #7a1f2b 0%, #4a0f18 100%); }
.brand-card.theme-black  { background: linear-gradient(155deg, var(--border) 0%, #141414 100%); }
.brand-card.theme-gold   { background: linear-gradient(155deg, #8b6914 0%, #5a4510 100%); }
.brand-card.theme-lightblue { background: linear-gradient(155deg, #2d5a6e 0%, #1a3d4f 100%); }
.brand-card.theme-purple { background: linear-gradient(155deg, #4a2d6e 0%, #2d1a45 100%); }
.brand-card.theme-green  { background: linear-gradient(155deg, #264f36 0%, #10261a 100%); }
.brand-card.theme-pink   { background: linear-gradient(155deg, #7d3554 0%, #401727 100%); }
.brand-card.theme-brown  { background: linear-gradient(155deg, #6d4b2b 0%, #3b2716 100%); }
.brand-card.theme-magenta { background: linear-gradient(155deg, #711f60 0%, #3b1032 100%); }
.brand-card.theme-silver { background: linear-gradient(155deg, #5f646a 0%, #34393e 100%); }
.brand-card.theme-navy   { background: linear-gradient(155deg, #24345f 0%, #121b3a 100%); }

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
  color: var(--border);
}
</style>
