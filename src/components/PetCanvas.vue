<template>
  <!-- #ifdef H5 -->
  <view class="pet-3d-wrap">
    <view ref="container3d" class="pet-3d-container"></view>
  </view>
  <!-- #endif -->
  <!-- #ifdef MP-WEIXIN -->
  <view class="pet-3d-wrap">
    <canvas type="2d" id="pet-canvas" class="pet-2d-canvas"></canvas>
  </view>
  <!-- #endif -->
</template>

<script>
// #ifdef H5
import { createPetEngine } from '@/utils/pet-engine.js'
// #endif
// #ifdef MP-WEIXIN
import { createPetCanvas2D } from '@/utils/pet-engine-2d.js'
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
    // #ifdef MP-WEIXIN
    this.$nextTick(() => {
      this.initTimer = setTimeout(() => { this.initMpCanvas() }, 200)
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
    // #ifdef MP-WEIXIN
    if (this.initTimer) { clearTimeout(this.initTimer); this.initTimer = null }
    if (this._engine2d) { this._engine2d.destroy(); this._engine2d = null }
    // #endif
  },
  methods: {
    // #ifdef MP-WEIXIN
    initMpCanvas() {
      uni.createSelectorQuery().in(this).select('#pet-canvas').fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) return
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          let dpr = 2
          try {
            dpr = Math.min((uni.getWindowInfo ? uni.getWindowInfo().pixelRatio : uni.getSystemInfoSync().pixelRatio) || 1, 2)
          } catch (e) {}
          canvas.width = res[0].width * dpr
          canvas.height = res[0].height * dpr
          ctx.scale(dpr, dpr)
          this._engine2d = createPetCanvas2D()
          this._engine2d.attach(canvas, ctx, res[0].width, res[0].height)
          this._engine2d.updateAccessories(this.accessories || {})
          this._engine2d.setMood(this.mood)
          this._engine2d.start()
        })
    }
    // #endif
  },
  watch: {
    accessories: {
      handler(val) {
        // #ifdef H5
        if (this._engine) this._engine.updateAccessories(val)
        // #endif
        // #ifdef MP-WEIXIN
        if (this._engine2d) this._engine2d.updateAccessories(val)
        // #endif
      },
      deep: true
    },
    // #ifdef MP-WEIXIN
    mood(val) {
      if (this._engine2d) this._engine2d.setMood(val)
    }
    // #endif
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
.pet-2d-canvas {
  width: 100%;
  height: 540px;
  display: block;
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
