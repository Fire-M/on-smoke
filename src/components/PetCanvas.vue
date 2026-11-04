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
    mood: { type: String, default: 'normal' },
    // 页面不可见时置 true：canvas 循环在后台仍按 60fps 重绘，白烧 CPU
    paused: { type: Boolean, default: false }
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
    // 原来是固定等 200ms 再查节点，宠物必然晚 200ms 才出现。
    // 改成渲染后立刻查，查不到再重试（见 initMpCanvas），正常情况一帧内就初始化完
    this.$nextTick(() => { this.initMpCanvas() })
    // #endif
  },
  created() {
    // #ifdef H5
    this._engine = createPetEngine()
    // #endif
  },
  // Vue 3 里 beforeDestroy 已经废弃（不会触发），组件销毁时引擎和定时器都不会清理，
  // 反复进出宠物页会累积动画循环。
  beforeUnmount() {
    // 定时器清掉了，但 createSelectorQuery 的回调还在途中：
    // 它回来后会在已销毁的组件上新建引擎并 start()，那条循环再没人停。
    // 这里立个墓碑，回调进去先看它
    this._unmounted = true
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
      // 已经建好，或者组件已经销毁，都别再查
      if (this._engine2d || this._unmounted) return
      uni.createSelectorQuery().in(this).select('#pet-canvas').fields({ node: true, size: true })
        .exec((res) => {
          if (this._unmounted) return
          if (!res || !res[0] || !res[0].node) {
            // 节点还没渲染出来：40ms 后重试，最多 8 次。
            // 比"一次性死等 200ms"快得多 —— 正常页面一帧内就能查到
            this._initTries = (this._initTries || 0) + 1
            if (this._initTries <= 8) {
              this.initTimer = setTimeout(() => { this.initTimer = null; this.initMpCanvas() }, 40)
            }
            return
          }
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
          // 初始化期间页面可能已经切走了，这时先别起循环
          if (!this.paused) this._engine2d.start()
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
    },
    paused(val) {
      if (!this._engine2d) return
      if (val) this._engine2d.stop()
      else this._engine2d.start()
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
/* #ifdef H5 */
/* three.js 生成的 canvas 是运行时插入的，只能靠标签选择器命中；
   小程序组件 wxss 不允许标签选择器，所以只在 H5 编译这段 */
.pet-3d-container canvas {
  display: block;
  margin: 0 auto;
}
/* #endif */
.pet-2d-canvas {
  width: 100%;
  height: 320px;
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
