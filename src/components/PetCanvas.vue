<template>
  <!-- #ifdef H5 -->
  <view class="pet-3d-wrap">
    <view ref="container3d" class="pet-3d-container"></view>
  </view>
  <!-- #endif -->
  <!-- #ifdef MP-WEIXIN -->
  <view class="pet-3d-wrap">
    <view class="pet-fallback">
      <text class="pet-fallback-emoji">🚬</text>
      <text class="pet-fallback-text">香烟小伙伴</text>
    </view>
  </view>
  <!-- #endif -->
</template>

<script>
// #ifdef H5
import { createPetEngine } from '@/utils/pet-engine.js'
// #endif

export default {
  props: {
    accessories: { type: Object, default: () => ({}) },
    mood: { type: String, default: 'normal' }
  },
  data() { return { initTimer: null } },
  mounted() {
    // #ifdef H5
    this.$nextTick(() => {
      this.initTimer = setTimeout(() => {
        const wrap = this.$refs.container3d
        if (!wrap) return
        const el = wrap.$el || wrap
        if (this._engine) this._engine.init(el)
      }, 300)
    })
    // #endif
  },
  created() {
    // #ifdef H5
    this._engine = createPetEngine()
    // #endif
  },
  beforeDestroy() {
    // #ifdef H5
    if (this.initTimer) { clearTimeout(this.initTimer); this.initTimer = null }
    if (this._engine) { this._engine.destroy(); this._engine = null }
    // #endif
  },
  watch: {
    accessories: {
      handler(val) {
        // #ifdef H5
        if (this._engine) this._engine.updateAccessories(val)
        // #endif
      },
      deep: true
    }
  }
}
</script>

<style scoped>
.pet-3d-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 20rpx 0;
}
.pet-3d-container {
  width: 100%;
  height: 340px;
  overflow: hidden;
}
.pet-3d-container canvas {
  display: block;
  margin: 0 auto;
}
.pet-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 340px;
}
.pet-fallback-emoji {
  font-size: 80rpx;
}
.pet-fallback-text {
  font-size: 28rpx;
  color: #999;
  margin-top: 16rpx;
}
</style>
