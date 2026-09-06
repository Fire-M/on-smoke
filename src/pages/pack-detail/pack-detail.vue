<template>
  <view id="pack-detail" class="page-container" :class="['theme-' + brand.theme, themeClass()]">
    <app-navbar :title="brand.cn"></app-navbar>

    <!-- 烟盒展示区 -->
    <view class="box-area">
      <view class="box-scene">
        <view class="box-wrapper" :style="wrapperStyle"
          @touchstart="onDragStart" @touchmove.prevent="onDragMove" @touchend="onDragEnd">
          <view class="box-ground-shadow"></view>
          <view class="box-3d" :class="{ 'lid-open': lidOpen }">
            <!-- 背面 -->
            <view class="box-face box-back">
              <view class="box-back-inner">
                <view class="box-back-warning">
                  <text>假装吸烟有害想象\n本产品为虚构</text>
                </view>
                <view class="box-back-brand">
                  <text>{{ brand.en }}</text>
                </view>
              </view>
            </view>
            <view class="box-face box-left"></view>
            <view class="box-face box-right"></view>
            <view class="box-face box-bottom"></view>
            <view class="box-face box-top"></view>
            <!-- 正面 -->
            <view class="box-face box-front" @click="openLid">
              <view class="box-warning"><text>假装吸烟有害想象</text></view>
              <view class="box-brand">
                <text class="box-brand-cn-lg">{{ brand.cn }}</text>
                <text class="box-brand-en-lg">{{ brand.en }}</text>
              </view>
              <view class="box-seal"><text>{{ brand.cn[0] }}</text></view>
              <view class="box-specs"><text>焦油8mg · {{ brand.packSize }}支装</text></view>
            </view>
            <!-- 盖子 -->
            <view class="box-face box-lid" :class="{ open: lidOpen }" @click="openLid">
              <view class="box-lid-under">
                <view class="box-lid-under-foil"></view>
              </view>
              <view class="box-lid-inner">
                <text class="box-brand-cn">{{ brand.cn }}</text>
                <text class="box-brand-en">{{ brand.en }}</text>
              </view>
            </view>
            <!-- 内壁 -->
            <view class="box-interior">
              <view class="box-interior-face box-interior-back"></view>
              <view class="box-interior-face box-interior-left"></view>
              <view class="box-interior-face box-interior-right"></view>
              <view class="box-interior-face box-interior-bottom"></view>
              <view class="box-interior-face box-interior-front"></view>
              <view class="box-interior-face box-interior-top"></view>
            </view>
            <!-- 香烟排 -->
            <view class="box-cigs" :class="{ 'lid-open': lidOpen }">
              <view
                v-for="(row, ri) in boxCigs"
                :key="ri"
                class="box-cig-row"
                :class="{ 'is-back': ri === 1 }"
              >
                <view
                  v-for="cig in row"
                  :key="cig.index"
                  class="box-cig-3d"
                  :class="{ 'is-active': cig.index === activeIndex, pulling: cig.index === activeIndex && isPulling }"
                  :style="{ '--cig-rot': cig.rot + 'deg' }"
                  @click="pullCig(cig.index)"
                >
                  <view
                    v-for="face in cigFaces"
                    :key="face.index"
                    class="box-cig-face"
                    :style="face.style"
                  >
                    <view class="bcf-filter"></view>
                    <view class="bcf-paper"></view>
                    <view class="bcf-ring"></view>
                  </view>
                  <view class="box-cig-cap-top"></view>
                  <view class="box-cig-cap-bottom"></view>
                </view>
              </view>
            </view>
            <!-- 提示 -->
            <view class="box-click-hint" v-if="!lidOpen">
              <text>拖拽旋转 · 点击开盖</text>
            </view>
            <view class="box-dots">
              <text class="dot active"></text>
              <text class="dot"></text>
            </view>
          </view>
        </view>
        <view class="box-pull-hint" :class="{ show: showPullHint }">
          <text>点击任意一支抽出</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import Store from '@/utils/store.js'
import AppNavbar from '@/components/app-navbar/app-navbar.vue'
import { themeClass } from '@/utils/theme.js'

const BRANDS = {
  lanhe: { id: 'lanhe', cn: '蓝河', en: 'LAN·HE', theme: 'blue', packSize: 20 },
  hongta: { id: 'hongta', cn: '太华', en: 'TA·HWA', theme: 'red', packSize: 20 },
  heiye: { id: 'heiye', cn: '熊猫666', en: 'PANDA', theme: 'black', packSize: 20 },
  jinsi: { id: 'jinsi', cn: '羊驼', en: 'LLAMA', theme: 'gold', packSize: 20 },
  qingyun: { id: 'qingyun', cn: '冰河', en: 'ICE·RIVER', theme: 'lightblue', packSize: 20 },
  zimeng: { id: 'zimeng', cn: '紫云', en: 'PURPLE', theme: 'purple', packSize: 20 }
}

export default {
  components: { AppNavbar },
  data() {
    return {
      brand: BRANDS.lanhe,
      lidOpen: false,
      showPullHint: false,
      boxRotY: -14,
      boxRotX: 6,
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0,
      dragStartRotY: 0,
      dragStartRotX: 0,
      dragMoved: false,
      boxRemainingCigs: 20,
      isPulling: false,
      activeIndex: null,
      faceCount: 24
    }
  },

  computed: {
    wrapperStyle() {
      return {
        transform: `rotateY(${this.boxRotY}deg) rotateX(${this.boxRotX}deg)`
      }
    },

    boxCigs() {
      if (!this.lidOpen) return []
      const count = Math.max(this.boxRemainingCigs, 0)
      const cigs = Array.from({ length: count }, (_, index) => {
        const colIndex = index % 10
        return {
          index,
          rot: -4 + colIndex * (8 / Math.max(9, 1))
        }
      })
      const rows = []
      for (let i = 0; i < cigs.length; i += 10) rows.push(cigs.slice(i, i + 10))
      return rows
    },

    cigFaces() {
      const radius = 13
      return Array.from({ length: this.faceCount }, (_, index) => {
        const angle = (360 / this.faceCount) * index
        const faceW = (2 * Math.PI * radius / this.faceCount + 2.5)
        return {
          index,
          style: {
            width: faceW + 'px',
            marginLeft: -faceW / 2 + 'px',
            transform: `rotateY(${angle}deg) translateZ(${radius}px)`
          }
        }
      })
    }
  },

  onLoad(options) {
    const brandId = options.brandId || 'lanhe'
    this.brand = BRANDS[brandId] || BRANDS.lanhe
    // 从持久化存储读取包剩余（跨天不重置）
    this.boxRemainingCigs = Store.getPackRemaining(this.brand.id)
  },

  onShow() {
    // 从抽烟页 navigateBack 回来时复位，避免 isPulling 卡死导致抽不出
    this.isPulling = false
    this.activeIndex = null
    // 从存储重新读取包剩余（抽完会扣减，没抽完则不变）
    this.boxRemainingCigs = Store.getPackRemaining(this.brand.id)
  },

  methods: {
    openLid() {
      if (this.dragMoved) { this.dragMoved = false; return }
      if (this.lidOpen) return
      if (uni.vibrateShort) uni.vibrateShort({ type: 'light' })
      this.lidOpen = true
      setTimeout(() => {
        if (this.lidOpen) this.showPullHint = true
      }, 650)
    },

    pullCig(index) {
      if (!this.lidOpen || this.dragMoved) return
      if (this.isPulling) return
      this.showPullHint = false
      this.activeIndex = index
      this.isPulling = true
      if (uni.vibrateShort) uni.vibrateShort({ type: 'light' })
      const remainingAfterPull = Math.max(0, this.boxRemainingCigs - 1)

      // 延迟跳转到抽烟场景（吸烟记录在 smoking.vue 结束时记录）
      // 时长需不小于抽出动画(cigPullOut 0.85s)，确保飞出动画完整播完再跳转
      setTimeout(() => {
        this.boxRemainingCigs = remainingAfterPull
        // 不在此处持久化，等 smoking.vue 真正抽完才扣减；中途返回则恢复
        uni.navigateTo({
          url: `/pages/smoking/smoking?brandId=${this.brand.id}&remaining=${this.boxRemainingCigs}`
        })
      }, 900)
    },

    // 拖拽旋转
    onDragStart(e) {
      const point = e.touches[0]
      this.isDragging = true
      this.dragMoved = false
      this.dragStartX = point.clientX
      this.dragStartY = point.clientY
      this.dragStartRotY = this.boxRotY
      this.dragStartRotX = this.boxRotX
    },

    onDragMove(e) {
      if (!this.isDragging) return
      const point = e.touches[0]
      const dx = point.clientX - this.dragStartX
      const dy = point.clientY - this.dragStartY
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) this.dragMoved = true
      this.boxRotY = this.dragStartRotY + dx * 0.5
      this.boxRotX = Math.max(-60, Math.min(60, this.dragStartRotX - dy * 0.5))
    },

    onDragEnd() {
      this.isDragging = false
    }
  }
}
</script>

<style>
.page-container {
  height: 100vh;
  width: 100vw;
  background-color: var(--bg);
  color: var(--text);
  display: flex;
  flex-direction: column;
}

.box-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 64rpx;
}

/* ======== 烟盒详情页 - 3D 立体 ======== */

:root,
page {
  --box-w: 280px;
  --box-h: 340px;
  --box-d: 70px;
  --lid-h: 95px;
}

/* 场景容器 - 透视：绝对居中于页面 */
.box-scene {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  perspective: 900px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.box-wrapper {
  position: relative;
  width: var(--box-w);
  transform-style: preserve-3d;
  transform: rotateY(-14deg) rotateX(6deg);
  transition: transform 0.4s ease-out;
  touch-action: none;
  cursor: grab;
}

.box-wrapper.dragging {
  transition: none;
  cursor: grabbing;
}

/* 3D 容器 */
.box-3d {
  position: relative;
  width: var(--box-w);
  height: calc(var(--box-h) + var(--lid-h));
  transform-style: preserve-3d;
}

/* 所有面通用 */
.box-face {
  position: absolute;
  backface-visibility: hidden;
}

/* 正面 */
.box-front {
  -webkit-tap-highlight-color: transparent;
  width: var(--box-w);
  height: var(--box-h);
  top: var(--lid-h);
  left: 0;
  transform: translateZ(calc(var(--box-d) / 2));
  background: linear-gradient(180deg, #1e3a5f 0%, #132944 50%, #0d2240 100%);
  border: 1px solid rgba(240, 230, 210, 0.12);
  border-radius: 4px 4px 8px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 20px 28px;
  overflow: hidden;
}

.box-front::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(240,230,210,0.07) 0%, transparent 100%);
  pointer-events: none;
}

.box-front::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, rgba(0,0,0,0.25) 0%, transparent 8%, transparent 92%, rgba(0,0,0,0.2) 100%);
  pointer-events: none;
}

/* 背面 */
.box-back {
  width: var(--box-w);
  height: var(--box-h);
  top: var(--lid-h);
  left: 0;
  transform: translateZ(calc(var(--box-d) / -2)) rotateY(180deg);
  transform-style: preserve-3d;
  background: linear-gradient(180deg, #0d2240 0%, #081726 100%);
  border: 1px solid rgba(240, 230, 210, 0.08);
  border-radius: 4px 4px 8px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
  overflow: hidden;
}

/* 背面内容容器 - 抵消外层旋转，使文字正常阅读 */
.box-back-inner {
  transform: rotateY(180deg);
  transform-style: preserve-3d;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.box-back::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    linear-gradient(90deg, rgba(0,0,0,0.2) 0%, transparent 10%, transparent 90%, rgba(0,0,0,0.15) 100%),
    radial-gradient(ellipse at 50% 30%, rgba(240,230,210,0.04) 0%, transparent 60%);
  pointer-events: none;
}

.box-back::after {
  content: '';
  position: absolute;
  inset: 12% 10%;
  border: 1px solid rgba(240, 230, 210, 0.06);
  border-radius: 4px;
  pointer-events: none;
}

.box-back-warning {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 8px 12px;
  border: 1px solid rgba(240, 230, 210, 0.12);
  border-radius: 4px;
  background: rgba(240, 230, 210, 0.05);
}

.box-back-warning p,
.box-back-warning uni-text {
  font-size: 10px;
  color: rgba(240, 230, 210, 0.6);
  letter-spacing: 2px;
  line-height: 1.6;
  margin: 0;
}

.box-back-brand {
  position: relative;
  z-index: 1;
  margin-top: 14px;
  text-align: center;
}

.box-back-brand p,
.box-back-brand uni-text {
  font-size: 11px;
  color: rgba(240, 230, 210, 0.35);
  letter-spacing: 6px;
  margin: 0;
}

/* 左侧面 */
.box-left {
  width: var(--box-d);
  height: var(--box-h);
  top: var(--lid-h);
  left: calc(-1 * var(--box-d) / 2);
  transform: rotateY(-90deg);
  background: linear-gradient(90deg, #0a1a2d 0%, #122644 100%);
  border-radius: 2px;
}

/* 右侧面 */
.box-right {
  width: var(--box-d);
  height: var(--box-h);
  top: var(--lid-h);
  left: calc(var(--box-w) - var(--box-d) / 2);
  transform: rotateY(90deg);
  background: linear-gradient(270deg, #0a1a2d 0%, #122644 100%);
  border-radius: 2px;
}

/* 底部面 */
.box-bottom {
  width: var(--box-w);
  height: var(--box-d);
  top: calc(var(--lid-h) + var(--box-h) - var(--box-d) / 2);
  left: 0;
  transform: rotateX(-90deg);
  background: linear-gradient(180deg, #0a1a2d 0%, #050d18 100%);
  border-radius: 4px;
}

/* 顶面 */
.box-top {
  width: var(--box-w);
  height: var(--box-d);
  top: calc(var(--lid-h) - var(--box-d) / 2);
  left: 0;
  transform: rotateX(90deg);
  background: linear-gradient(180deg, #050d18 0%, #0a1a2d 100%);
  border-radius: 4px;
  overflow: hidden;
}

.box-top::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 12%;
  right: 12%;
  height: 1px;
  transform: translateY(-50%);
  background: rgba(240, 230, 210, 0.18);
  box-shadow: 0 -1px 0 rgba(0,0,0,0.4), 0 1px 0 rgba(240,230,210,0.06);
}

.box-top::after {
  content: '';
  position: absolute;
  inset: 20% 14% 20% 14%;
  background: linear-gradient(180deg, rgba(180,180,180,0.12) 0%, rgba(80,80,80,0.05) 100%);
  border: 1px dashed rgba(240, 230, 210, 0.1);
  border-radius: 2px;
}

/* 盖子 */
.box-lid {
  -webkit-tap-highlight-color: transparent;
  width: var(--box-w);
  height: var(--box-d);
  top: var(--lid-h);
  left: 0;
  transform: translateZ(calc(var(--box-d) / -2)) rotateX(90deg);
  transform-style: preserve-3d;
  background: linear-gradient(180deg, #1e3a5f 0%, #142c47 100%);
  border: 1px solid rgba(240, 230, 210, 0.12);
  border-radius: 8px 8px 2px 2px;
  transform-origin: top center;
  transition: transform 0.85s cubic-bezier(0.34, 1.56, 0.64, 1);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backface-visibility: visible;
}

.box-lid.open {
  transform: translateZ(calc(var(--box-d) / -2)) rotateX(-30deg);
}

.box-lid-under {
  position: absolute;
  inset: 0;
  border-radius: 8px 8px 2px 2px;
  background: linear-gradient(180deg, #142c47 0%, #0a1a2d 100%);
  transform: rotateX(180deg) translateZ(0.5px);
  backface-visibility: visible;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid rgba(240, 230, 210, 0.06);
}

.box-lid-under-foil {
  position: absolute;
  inset: 6%;
  border-radius: 2px;
  background:
    repeating-linear-gradient(45deg, rgba(240,230,210,0.04) 0 2px, transparent 2px 4px),
    repeating-linear-gradient(-45deg, rgba(240,230,210,0.03) 0 2px, transparent 2px 4px),
    linear-gradient(180deg, rgba(240,230,210,0.08) 0%, rgba(0,0,0,0.3) 100%);
  border: 1px solid rgba(240, 230, 210, 0.1);
}

.box-lid-inner {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-bottom: 8px;
  background: linear-gradient(180deg, rgba(240,230,210,0.08) 0%, transparent 60%);
  border-radius: 8px 8px 2px 2px;
}

.box-lid .box-brand-cn {
  font-size: 20px;
  font-weight: 800;
  color: #f0e6d2;
  letter-spacing: 4px;
}

.box-lid .box-brand-en {
  font-size: 8px;
  font-weight: 500;
  color: rgba(240, 230, 210, 0.6);
  letter-spacing: 4px;
  margin-top: 3px;
}

/* 警示条 */
.box-warning {
  width: 100%;
  background: rgba(240, 230, 210, 0.08);
  border: 1px solid rgba(240, 230, 210, 0.12);
  border-radius: 4px;
  padding: 4px 0;
  text-align: center;
  margin-bottom: 12px;
  position: relative;
  z-index: 1;
}

.box-warning span,
.box-warning uni-text {
  font-size: 9px;
  color: rgba(240, 230, 210, 0.7);
  letter-spacing: 1px;
}

/* 品牌名 */
.box-brand {
  text-align: center;
  margin-bottom: 14px;
  position: relative;
  z-index: 1;
}

.box-brand-cn-lg {
  font-size: 38px;
  font-weight: 800;
  color: #f0e6d2;
  letter-spacing: 8px;
  line-height: 1.1;
  text-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.box-brand-en-lg {
  font-size: 10px;
  font-weight: 500;
  color: rgba(240, 230, 210, 0.7);
  letter-spacing: 6px;
  margin-top: 4px;
}

/* 印章 */
.box-seal {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  border: 2px solid rgba(240, 230, 210, 0.4);
  margin: 8px 0 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.2);
  position: relative;
  z-index: 1;
}

.box-seal::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 1px dashed rgba(240, 230, 210, 0.15);
}

.box-seal span,
.box-seal uni-text {
  font-size: 22px;
  font-weight: 700;
  color: rgba(240, 230, 210, 0.85);
}

/* 底部规格 */
.box-specs {
  margin-top: auto;
  text-align: center;
  position: relative;
  z-index: 1;
}

.box-specs span,
.box-specs uni-text {
  font-size: 10px;
  color: rgba(240, 230, 210, 0.55);
  letter-spacing: 1px;
}

/* 点击提示 */
.box-click-hint {
  text-align: center;
  margin-top: 24px;
  transition: opacity 0.3s;
}

.box-click-hint p,
.box-click-hint uni-text {
  font-size: 13px;
  color: rgba(240, 230, 210, 0.5);
  letter-spacing: 2px;
}

/* 分页点 */
.box-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 12px;
}

.box-dots .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(240, 230, 210, 0.25);
  transition: background 0.3s;
}

.box-dots .dot.active {
  background: rgba(240, 230, 210, 0.8);
  width: 16px;
  border-radius: 3px;
}

/* 地面阴影 */
.box-ground-shadow {
  position: absolute;
  bottom: -24px;
  left: 50%;
  transform: translateX(-50%);
  width: 240px;
  height: 30px;
  background: radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 40%, transparent 70%);
  filter: blur(12px);
  z-index: -1;
}

/* 不同品牌主题色 */
#pack-detail.theme-blue .box-front,
#pack-detail.theme-blue .box-back,
#pack-detail.theme-blue .box-lid,
#pack-detail.theme-blue .box-left,
#pack-detail.theme-blue .box-right,
#pack-detail.theme-blue .box-bottom {
  background: linear-gradient(180deg, #1e3a5f 0%, #0d2240 100%);
}
#pack-detail.theme-blue .box-left { background: linear-gradient(90deg, #0a1a2d 0%, #122644 100%); }
#pack-detail.theme-blue .box-right { background: linear-gradient(270deg, #0a1a2d 0%, #122644 100%); }
#pack-detail.theme-blue .box-top,
#pack-detail.theme-blue .box-bottom { background: linear-gradient(180deg, #050d18 0%, #0a1a2d 100%); }
#pack-detail.theme-blue .box-lid-under { background: linear-gradient(180deg, #0d2240 0%, #050d18 100%); }

#pack-detail.theme-red .box-front,
#pack-detail.theme-red .box-back,
#pack-detail.theme-red .box-lid {
  background: linear-gradient(180deg, #7a1f2b 0%, #3a0a12 100%);
}
#pack-detail.theme-red .box-left { background: linear-gradient(90deg, #3a0a12 0%, #5a1520 100%); }
#pack-detail.theme-red .box-right { background: linear-gradient(270deg, #3a0a12 0%, #5a1520 100%); }
#pack-detail.theme-red .box-bottom,
#pack-detail.theme-red .box-top { background: linear-gradient(180deg, #180408 0%, #2a080e 100%); }
#pack-detail.theme-red .box-lid-under { background: linear-gradient(180deg, #3a0a12 0%, #180408 100%); }

#pack-detail.theme-black .box-front,
#pack-detail.theme-black .box-back,
#pack-detail.theme-black .box-lid {
  background: linear-gradient(180deg, #333 0%, #1a1a1a 100%);
}
#pack-detail.theme-black .box-left,
#pack-detail.theme-black .box-right { background: linear-gradient(90deg, #0a0a0a 0%, #222 100%); }
#pack-detail.theme-black .box-top,
#pack-detail.theme-black .box-bottom { background: linear-gradient(180deg, #050505 0%, #0f0f0f 100%); }
#pack-detail.theme-black .box-lid-under { background: linear-gradient(180deg, #1a1a1a 0%, #050505 100%); }

#pack-detail.theme-gold .box-front,
#pack-detail.theme-gold .box-back,
#pack-detail.theme-gold .box-lid {
  background: linear-gradient(180deg, #8b6914 0%, #3a2c08 100%);
}
#pack-detail.theme-gold .box-left { background: linear-gradient(90deg, #2a2006 0%, #5a4210 100%); }
#pack-detail.theme-gold .box-right { background: linear-gradient(270deg, #2a2006 0%, #5a4210 100%); }
#pack-detail.theme-gold .box-top,
#pack-detail.theme-gold .box-bottom { background: linear-gradient(180deg, #150f02 0%, #2a2006 100%); }
#pack-detail.theme-gold .box-lid-under { background: linear-gradient(180deg, #3a2c08 0%, #150f02 100%); }

#pack-detail.theme-lightblue .box-front,
#pack-detail.theme-lightblue .box-back,
#pack-detail.theme-lightblue .box-lid {
  background: linear-gradient(180deg, #2d5a6e 0%, #1a3d4f 100%);
}
#pack-detail.theme-lightblue .box-left { background: linear-gradient(90deg, #0d232e 0%, #1f4558 100%); }
#pack-detail.theme-lightblue .box-right { background: linear-gradient(270deg, #0d232e 0%, #1f4558 100%); }
#pack-detail.theme-lightblue .box-top,
#pack-detail.theme-lightblue .box-bottom { background: linear-gradient(180deg, #061519 0%, #0d232e 100%); }
#pack-detail.theme-lightblue .box-lid-under { background: linear-gradient(180deg, #1a3d4f 0%, #061519 100%); }

#pack-detail.theme-purple .box-front,
#pack-detail.theme-purple .box-back,
#pack-detail.theme-purple .box-lid {
  background: linear-gradient(180deg, #4a2d6e 0%, #2d1a45 100%);
}
#pack-detail.theme-purple .box-left { background: linear-gradient(90deg, #1a0e28 0%, #3a2055 100%); }
#pack-detail.theme-purple .box-right { background: linear-gradient(270deg, #1a0e28 0%, #3a2055 100%); }
#pack-detail.theme-purple .box-top,
#pack-detail.theme-purple .box-bottom { background: linear-gradient(180deg, #0d0614 0%, #1a0e28 100%); }
#pack-detail.theme-purple .box-lid-under { background: linear-gradient(180deg, #2d1a45 0%, #0d0614 100%); }

/* 内壁容器 */
.box-interior {
  position: absolute;
  top: var(--lid-h);
  left: 0;
  width: var(--box-w);
  height: var(--box-h);
  transform-style: preserve-3d;
  pointer-events: none;
}

.box-interior-face {
  position: absolute;
  backface-visibility: visible;
  background:
    repeating-linear-gradient(45deg, rgba(0,0,0,0.06) 0 2px, transparent 2px 5px),
    linear-gradient(180deg, #c9b894 0%, #8d7548 100%);
}

.box-interior-front {
  width: var(--box-w);
  height: var(--box-h);
  top: 0;
  left: 0;
  transform: translateZ(calc(var(--box-d) / 2 - 1px)) rotateY(180deg);
}

.box-interior-back {
  width: var(--box-w);
  height: var(--box-h);
  top: 0;
  left: 0;
  transform: translateZ(calc(var(--box-d) / -2 + 1px));
}

.box-interior-left {
  width: var(--box-d);
  height: var(--box-h);
  top: 0;
  left: calc(-1 * var(--box-d) / 2);
  transform: translateX(1px) rotateY(90deg);
}

.box-interior-right {
  width: var(--box-d);
  height: var(--box-h);
  top: 0;
  left: calc(var(--box-w) - var(--box-d) / 2);
  transform: translateX(-1px) rotateY(-90deg);
}

.box-interior-bottom {
  width: var(--box-w);
  height: var(--box-d);
  top: calc(var(--box-h) - var(--box-d) / 2);
  left: 0;
  transform: translateY(-1px) rotateX(-90deg);
}

.box-interior-top {
  width: var(--box-w);
  height: var(--box-d);
  top: calc(-1 * var(--box-d) / 2);
  left: 0;
  transform: translateY(1px) rotateX(90deg);
}

/* ======== 烟盒内的香烟排 ======== */

.box-cigs {
  -webkit-tap-highlight-color: transparent;
  --cig-expose: 10px;
  --cig-w: 18px;
  --box-cig-d: 24px;
  --box-cig-total-h: calc(var(--box-h) + var(--cig-expose));
  --box-cig-filter-ratio: 0.22;
  position: absolute;
  bottom: 0;
  left: 0;
  width: var(--box-w);
  height: calc(var(--box-h) + var(--cig-expose));
  transform-style: preserve-3d;
  pointer-events: none;
  z-index: 1;
  transform: translateZ(8px);
  transition: transform 0.5s ease-out 0.1s;
}

.box-cig-row {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 3px;
  transform-style: preserve-3d;
}

.box-cig-row:not(.is-back) {
  transform: translateY(-38px) translateZ(0);
}

.box-cig-row.is-back {
  transform: translateZ(-20px);
}

.box-3d:not(.lid-open) .box-cig-row:not(.is-back) {
  transform: translateY(calc(var(--cig-expose) + 32px)) translateZ(0);
}
.box-3d:not(.lid-open) .box-cig-row.is-back {
  transform: translateY(calc(var(--cig-expose) + 32px)) translateZ(-20px);
}

.box-3d.lid-open .box-cigs {
  pointer-events: auto;
  cursor: pointer;
}

.box-3d.lid-open > .box-top,
.box-3d.lid-open .box-interior-top {
  display: none;
}

/* ==== 3D 盒内香烟：多面圆柱结构 ==== */
.box-cig-3d {
  --cig-rot: 0deg;
  position: relative;
  width: var(--box-cig-d);
  height: var(--box-cig-total-h);
  transform-style: preserve-3d;
  transform: rotateY(var(--cig-rot));
  transition: transform 0.2s ease-out;
}

.box-cig-3d::before {
  content: '';
  position: absolute;
  top: -3px;
  left: -2px;
  right: -2px;
  height: 6px;
  border-radius: 50% / 50%;
  background: linear-gradient(180deg, #6e4e20 0%, #a07840 50%, #5a3a12 100%);
  box-shadow: 0 1px 2px rgba(0,0,0,0.4), inset 0 -1px 0 rgba(255,255,255,0.15);
  z-index: 10;
}

.box-cig-3d::after {
  content: '';
  position: absolute;
  bottom: -3px;
  left: -2px;
  right: -2px;
  height: 6px;
  border-radius: 50% / 50%;
  background: linear-gradient(180deg, #b8ad9c 0%, #d8d0c4 50%, #8a8275 100%);
  box-shadow: 0 1px 2px rgba(0,0,0,0.3);
  z-index: 10;
}

.box-cig-face {
  position: absolute;
  top: 0;
  left: 50%;
  height: 100%;
  transform-origin: center center;
  backface-visibility: hidden;
}

.box-cig-face .bcf-filter {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: calc(var(--box-h) * var(--box-cig-filter-ratio));
  background: linear-gradient(90deg,
    #a07840 0%, #b88850 15%, #d2a86c 35%, #e0b878 50%,
    #d2a86c 65%, #b88850 85%, #a07840 100%);
}

.box-cig-face .bcf-paper {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: calc(var(--box-cig-total-h) - var(--box-h) * var(--box-cig-filter-ratio));
  background: linear-gradient(90deg,
    #b8b0a0 0%, #d8d0c0 15%, #efe9df 35%, #f5f0e8 50%,
    #efe9df 65%, #d8d0c0 85%, #b8b0a0 100%);
}

.box-cig-face .bcf-ring {
  position: absolute;
  left: 0;
  width: 100%;
  height: 2px;
  top: calc(var(--box-h) * var(--box-cig-filter-ratio));
  background: linear-gradient(180deg, #b8884a 0%, #d4a86a 50%, #8a6430 100%);
}

.box-cig-cap-top {
  position: absolute;
  left: 50%;
  top: 50%;
  width: var(--box-cig-d);
  height: var(--box-cig-d);
  margin-left: calc(var(--box-cig-d) / -2);
  margin-top: calc(var(--box-cig-d) / -2);
  border-radius: 50%;
  background: radial-gradient(ellipse at 40% 40%, #e8c088 0%, #c89a58 50%, #9a6e30 85%, #5a3a12 100%);
  transform: translate3d(0, calc(var(--box-cig-total-h) / -2), 0) rotateX(90deg);
  box-shadow: 0 0 0 1px rgba(0,0,0,0.3), inset 0 0 6px rgba(0,0,0,0.2);
  backface-visibility: hidden;
}

.box-cig-cap-bottom {
  position: absolute;
  left: 50%;
  top: 50%;
  width: var(--box-cig-d);
  height: var(--box-cig-d);
  margin-left: calc(var(--box-cig-d) / -2);
  margin-top: calc(var(--box-cig-d) / -2);
  border-radius: 50%;
  background: radial-gradient(ellipse at 40% 40%, #f5f0e8 0%, #d8d0c4 65%, #b8ad9c 100%);
  transform: translate3d(0, calc(var(--box-cig-total-h) / 2), 0) rotateX(90deg);
  box-shadow: 0 0 0 1px rgba(0,0,0,0.15);
  backface-visibility: hidden;
}

.box-cig-3d.is-active .box-cig-cap-top {
  background: radial-gradient(ellipse at 40% 40%, #ffe6b0 0%, #e8b86a 50%, #c8902f 85%, #7a4f18 100%);
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.55), inset 0 0 8px rgba(0, 0, 0, 0.25);
}

.box-cig-3d.pulling {
  animation: cigPullOut 0.85s cubic-bezier(0.4, 0.1, 0.3, 1) forwards;
}

@keyframes cigPullOut {
  0%   { transform: rotateY(var(--cig-rot)) translateY(0) scale(1); }
  25%  { transform: rotateY(var(--cig-rot)) translateY(-80px) scale(1.05); }
  100% { transform: rotateY(var(--cig-rot)) rotateZ(6deg) translateY(-360px) scale(0); }
}

.box-pull-hint {
  position: absolute;
  left: 50%;
  bottom: 12%;
  transform: translateX(-50%);
  color: rgba(240, 230, 210, 0.7);
  font-size: 13px;
  letter-spacing: 0.1em;
  z-index: 5;
  opacity: 0;
  transition: opacity 0.4s ease-out;
  pointer-events: none;
  white-space: nowrap;
}

.box-pull-hint.show {
  opacity: 0.85;
  animation: pullHintBounce 1.6s ease-in-out infinite;
}

@keyframes pullHintBounce {
  0%, 100% { transform: translate(-50%, 0); }
  50%      { transform: translate(-50%, -8px); }
}

@keyframes btnPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(238,90,36,0.5); }
  50% { box-shadow: 0 0 0 16px rgba(238,90,36,0); }
}
#btn-have-one {
  animation: btnPulse 2.5s ease-in-out infinite;
}
</style>