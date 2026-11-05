<template>
  <view class="page-container" :class="themeClass()">
    <app-navbar title="选择香烟"></app-navbar>
    <!-- 品牌网格 -->
    <scroll-view scroll-y class="brand-scroll">
      <view class="brand-header">
        <text class="brand-header-sub">挑一包解解馋 · 全是假的</text>
        <text class="brand-header-count">{{ brands.length }} 款</text>
      </view>

      <!-- 今日心情推荐：把静态的 tag/quote 激活成「今天该抽这根」，点一下直接试 -->
      <view class="rec-bar" v-if="todayRec" :style="{ borderColor: todayRec.accent }" @click="selectBrand(todayRec)">
        <text class="rec-icon">✨</text>
        <view class="rec-body">
          <text class="rec-label">今日推荐</text>
          <text class="rec-text">{{ todayRec.cn }} · {{ todayRec.tag }}</text>
        </view>
        <text class="rec-go">抽一根 ›</text>
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
            <view class="pack-meta">
              <text class="pack-meta-item">解压 {{ brand.relax }}</text>
              <text class="pack-meta-item">焦油 {{ brand.tar }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 品牌图鉴：抽完一包某品牌即点亮，把「尝试各品牌」变成收集游戏 -->
      <view class="codex">
        <view class="codex-head">
          <text class="codex-title">品牌图鉴</text>
          <text class="codex-count">{{ codex.filter(c => c.unlocked).length }}/{{ codex.length }}</text>
        </view>
        <view class="codex-grid">
          <view v-for="c in codex" :key="c.id"
            class="codex-cell" :class="{ locked: !c.unlocked }"
            :style="c.unlocked ? { background: c.accent } : {}">
            <text class="codex-cn">{{ c.unlocked ? c.cn : '🔒' }}</text>
          </view>
        </view>
        <text class="codex-hint">抽完一包某品牌即点亮</text>
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
import Store, { BRANDS, recommendBrand, getUnlockedBrands } from '@/utils/store.js'
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
      listSignature: '',
      // 今日心情推荐 + 图鉴（抽完一包点亮）
      todayRec: null,
      codex: []
    }
  },

  onShow() {
    if (!this.shouldRefresh()) return
    this.settings = Store.getSettings()
    Store.settleDailySavings()
    this.activeSkin = Store.getActiveSkin()

    // 品牌数据与「每包支数」统一取自 Store.BRANDS，
    // 避免分母用全局设置、分子用品牌口径，出现「剩余 15 / 总数 10」。
    // 包状态一次批量取出：逐品牌各读一次 storage 会在进出页面时明显拖慢。
    const packStates = Store.getAllPackStates()
    const list = BRANDS.map(brand => ({
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
    // 今日心情推荐 + 图鉴点亮状态：把静态的 tag/quote 激活成「今天该抽这根」
    this.todayRec = recommendBrand()
    const unlocked = getUnlockedBrands()
    this.codex = BRANDS.map(b => ({ ...b, unlocked: unlocked.includes(b.id) }))
    this.markRefreshed()
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
      // 选品牌时给一声按主色色相映射的提示音（H5 端生效；小程序无 WebAudio 自动降级静默）
      this.playBrandChime(brand.accent)
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
    },

    // 选品牌提示音：用主色色相映射音高，让每个牌子「听感」也不同。
    // 纯 WebAudio 振荡器生成，不依赖音频文件；小程序无 window.AudioContext 时静默。
    playBrandChime(hex) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext
        if (!AC) return
        const ctx = new AC()
        const freq = 200 + (this._hue(hex) / 360) * 520
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.0001, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4)
        osc.connect(gain).connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.42)
        setTimeout(() => { try { ctx.close() } catch (e) {} }, 500)
      } catch (e) {}
    },

    _hue(hex) {
      const h = (hex || '#94a3b8').replace('#', '')
      const r = parseInt(h.substr(0, 2), 16) / 255
      const g = parseInt(h.substr(2, 2), 16) / 255
      const b = parseInt(h.substr(4, 2), 16) / 255
      const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
      if (!d) return 0
      let hue = 0
      if (max === r) hue = ((g - b) / d) % 6
      else if (max === g) hue = (b - r) / d + 2
      else hue = (r - g) / d + 4
      hue *= 60
      return hue < 0 ? hue + 360 : hue
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

/* 今日推荐条：一条细边框用品牌主色，不抢烟盒卡片的视觉重心 */
.rec-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin: 0 14rpx 28rpx;
  padding: 20rpx 24rpx;
  border-radius: 18rpx;
  border: 1rpx solid var(--border);
  background: var(--surface-1);
}
.rec-icon { font-size: 30rpx; }
.rec-body { flex: 1; display: flex; flex-direction: column; }
.rec-label {
  font-size: 20rpx;
  letter-spacing: 2rpx;
  color: var(--text-dim);
}
.rec-text {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--text);
  margin-top: 2rpx;
}
.rec-go {
  font-size: 24rpx;
  color: var(--primary);
  flex-shrink: 0;
}

/* 卡片底部数值：解压指数 / 焦油感，给「选哪包」一点策略性 */
.pack-meta {
  display: flex;
  gap: 16rpx;
  margin-top: 14rpx;
}
.pack-meta-item {
  font-size: 18rpx;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  color: rgba(240, 230, 210, 0.78);
  background: rgba(240, 230, 210, 0.10);
}

/* 品牌图鉴：网格亮块用各品牌主色，未解锁灰 + 锁 */
.codex {
  margin: 8rpx 14rpx 0;
  padding: 28rpx 24rpx 32rpx;
  border-radius: 24rpx;
  background: var(--surface-1);
  border: 1rpx solid var(--border);
}
.codex-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.codex-title {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--text);
}
.codex-count {
  font-size: 22rpx;
  color: var(--text-dim);
}
.codex-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12rpx;
}
.codex-cell {
  aspect-ratio: 1 / 1;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.codex-cell.locked {
  background: var(--surface-2);
  border: 1rpx solid var(--border);
}
.codex-cn {
  font-size: 18rpx;
  color: #0c0d11;
  font-weight: 700;
  text-align: center;
}
.codex-cell.locked .codex-cn {
  font-size: 24rpx;
  color: var(--text-dim);
}
.codex-hint {
  display: block;
  margin-top: 18rpx;
  font-size: 20rpx;
  color: var(--text-dim);
  text-align: center;
}
</style>
