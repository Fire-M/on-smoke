<template>
  <view id="pack-detail" class="page-container" :class="'theme-' + brand.theme">
    <!-- 顶栏 -->
    <view class="header">
      <button class="header-btn" @click="changePack">
        <text class="text-xl">‹</text> <text>换一包</text>
      </button>
      <view class="header-center">
        <text class="brand-en">{{ brand.en }}</text>
        <text class="brand-cn">{{ brand.cn }}</text>
      </view>
      <view class="w-64"></view>
    </view>

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
            <view class="box-cigs" :class="{ 'lid-open': lidOpen, 'pulling-others': isPulling }" @click="pullCigarette">
              <view
                v-for="cig in boxCigs"
                :key="cig.index"
                class="box-cig-3d"
                :class="{ 'is-active': cig.active, pulling: cig.active && isPulling }"
                :style="{ '--cig-rot': cig.rot + 'deg' }"
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
          <text>点击香烟抽出</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import Store from '@/utils/store.js'

const BRANDS = {
  lanhe: { id: 'lanhe', cn: '蓝河', en: 'LAN·HE', theme: 'blue', packSize: 10 },
  hongta: { id: 'hongta', cn: '太华', en: 'TA·HWA', theme: 'red', packSize: 10 },
  heiye: { id: 'heiye', cn: '熊猫666', en: 'PANDA', theme: 'black', packSize: 10 },
  jinsi: { id: 'jinsi', cn: '羊驼', en: 'LLAMA', theme: 'gold', packSize: 10 },
  qingyun: { id: 'qingyun', cn: '冰河', en: 'ICE·RIVER', theme: 'lightblue', packSize: 10 },
  zimeng: { id: 'zimeng', cn: '紫云', en: 'PURPLE', theme: 'purple', packSize: 10 }
}

export default {
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
      boxRemainingCigs: 10,
      isPulling: false,
      faceCount: 48
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
      const mid = Math.floor(count / 2)
      return Array.from({ length: count }, (_, index) => ({
        index,
        active: index === mid,
        rot: -6 + index * 2
      }))
    },

    cigFaces() {
      const radius = 11
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
    this.boxRemainingCigs = this.brand.packSize || 20
  },

  methods: {
    openLid() {
      if (this.dragMoved) { this.dragMoved = false; return }
      if (this.lidOpen) return
      if (uni.vibrateShort) uni.vibrateShort({ type: 'light' })
      this.lidOpen = true
      setTimeout(() => {
        if (this.lidOpen) this.showPullHint = true
      }, 550)
    },

    pullCigarette() {
      if (!this.lidOpen || this.dragMoved) return
      this.showPullHint = false
      this.isPulling = true
      if (uni.vibrateShort) uni.vibrateShort({ type: 'light' })
      const remainingAfterPull = Math.max(0, this.boxRemainingCigs - 1)

      // 延迟跳转到抽烟场景（吸烟记录在 smoking.vue 结束时记录）
      setTimeout(() => {
        this.boxRemainingCigs = remainingAfterPull
        uni.redirectTo({
          url: `/pages/smoking/smoking?brandId=${this.brand.id}&remaining=${this.boxRemainingCigs}`
        })
      }, 820)
    },

    changePack() {
      uni.navigateBack()
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
  background-color: #0f0f0f;
  color: #e5e7eb;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 48rpx 40rpx 16rpx;
}

.header-btn {
  font-size: 28rpx;
  color: #d1d5db;
  background: transparent;
  border: none;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.header-center {
  text-align: center;
}

.brand-en {
  display: block;
  font-size: 28rpx;
  letter-spacing: 6rpx;
  color: #9ca3af;
  font-weight: 500;
}

.brand-cn {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #f3f4f6;
  margin-top: 4rpx;
}

.w-64 {
  width: 64rpx;
}

.box-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 64rpx;
}

.text-xl { font-size: 40rpx; }
</style>
