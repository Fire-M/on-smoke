<template>
  <view class="page-container" :class="themeClass()">
    <app-navbar title="抽烟" :custom-back="true" @back="goBack"></app-navbar>

    <!-- 背景火光（由亮渐灭） -->
    <view class="bg-ember-glow" :style="bgGlowStyle"></view>

    <!-- Canvas 烟雾层 -->
    <view class="canvas-wrapper" :style="{ pointerEvents: sceneReady ? 'auto' : 'none' }"
      @touchstart.prevent="onPointerDown" @touchmove.prevent="onPointerMove" @touchend.prevent="onPointerUp"
      @mousedown="onPointerDown" @mousemove="onPointerMove" @mouseup="onPointerUp" @mouseleave="onPointerUp">
      <canvas type="2d" id="smoke-canvas" class="smoke-canvas"></canvas>
      <canvas type="2d" id="spriteCanvas" class="sprite-canvas"></canvas>

      <!-- 2D 香烟 -->
      <view class="cigarette-3d" ref="cigarette3d" :class="cigClass" :style="cigBurnStyle">
        <view class="cig-flat-ash" :class="{ show: ashGrowth > 0, 'ash-falling': ashFalling }" :style="ashStyle"></view>
        <!-- 烟灰碎片粒子（数据驱动，小程序兼容） -->
        <view v-for="p in ashParticles" :key="p.id" class="ash-particle"
          :style="p.style"></view>
        <view class="cig-flat-charring" :class="{ show: ashGrowth > 0 }" :style="{ opacity: ashGrowth > 0 ? (0.4 + Math.min(1, ashGrowth / 80) * 0.6) : 0 }"></view>
        <view class="cig-flat-burn">
          <view class="cig-flat-burn-core"></view>
        </view>
        <view class="cig-flat cig-flat-paper" :style="paperStyle">
          <view class="cig-flat-band"></view>
        </view>
        <view class="cig-flat cig-flat-filter"></view>
        <view class="cigarette-ground-shadow"></view>
      </view>
    </view>

    <!-- 顶部状态栏 -->
    <view class="smoke-dashboard" v-if="!sceneReady">
      <view class="sd-row">
        <text class="sd-label">剩余</text>
        <text class="sd-val">{{ remaining }} 根</text>
      </view>
    </view>

    <!-- 抽烟提示 -->
    <view class="smoke-hint" v-if="showHint">
      <text>{{ hintText }}</text>
    </view>

    <!-- 肺部承受力可视化 -->
    <view class="lung-container" v-if="state !== 'ready' && state !== 'burnout' && state !== 'cooldown'">
      <view class="lung-visual">
        <!-- 肺部图标（Canvas 绘制，从底部逐渐填充颜色） -->
        <view class="lung-icon">
          <canvas type="2d" id="lung-canvas" class="lung-canvas"></canvas>
        </view>
        <!-- 数值显示 -->
        <view class="lung-info">
          <text class="lung-label">肺部负荷</text>
          <text class="lung-value" :class="{ 'lung-warning': lungFill > 70 }" :style="{ color: getLungColor(lungFill) }">{{ Math.round(lungFill) }}%</text>
        </view>
      </view>
      <!-- 警告提示 -->
      <view class="lung-alert" v-if="lungFill > 70">
        <text class="lung-alert-text">{{ lungFill >= 100 ? '⚠️ 肺部已满，必须吐烟！' : '⚠️ 肺部压力过大' }}</text>
      </view>
    </view>

    <!-- 功能按钮 -->
    <view class="smoke-tools" :class="{ show: sceneReady }">
      <button class="st-tool" :class="{ active: soundEnabled }" @click="toggleSound">
        <view class="st-tool-ic"><text>🔊</text></view>
        <view class="st-tool-lbl">
          <text class="st-tool-name">音效</text>
          <text class="st-tool-val">{{ soundEnabled ? '开着呢' : '静音' }}</text>
        </view>
      </button>
      <button class="st-tool" @click="tapAsh">
        <view class="st-tool-ic"><text>💨</text></view>
        <view class="st-tool-lbl">
          <text class="st-tool-name">灰</text>
          <text class="st-tool-val">弹烟灰</text>
        </view>
      </button>
      <button class="st-tool" :class="{ active: ringActive }"
        @touchstart.prevent="startRingPress" @touchend.prevent="endRingPress" @touchcancel.prevent="endRingPress"
        @mousedown="startRingPress" @mouseup="endRingPress">
        <view class="st-tool-ic"><text>💫</text></view>
        <view class="st-tool-lbl">
          <text class="st-tool-name">吐烟</text>
          <text class="st-tool-val">{{ smokeStyleNames[ringCurrentStyle] }}</text>
        </view>
      </button>
      <button class="st-tool" @click="passCig">
        <view class="st-tool-ic"><text>🤝</text></view>
        <view class="st-tool-lbl">
          <text class="st-tool-name">派烟</text>
          <text class="st-tool-val">递一根</text>
        </view>
      </button>
    </view>

    <!-- 派烟弹窗 -->
    <view class="pass-modal" :class="{ show: showPassModal }" v-if="showPassModal">
      <view class="pass-card">
        <text class="pass-emoji">🤝</text>
        <text class="pass-title">派烟成功</text>
        <text class="pass-desc">朋友微笑着接过了这根「空气烟」</text>
        <view class="pass-btns">
          <button class="pass-btn pass-undo" @click="showPassModal = false">拿回</button>
          <button class="pass-btn pass-confirm" @click="confirmPass">好嘞</button>
        </view>
      </view>
    </view>

    <!-- Toast -->
    <view class="toast" v-if="showToast">
      <text>{{ toastMsg }}</text>
    </view>

    <!-- 花样选择器 -->
    <view class="style-picker-mask" :class="{ show: showStylePicker }" @click="showStylePicker = false">
      <view class="style-picker" @click.stop>
        <text class="picker-title">选择吐烟花样</text>
        <view class="picker-grid">
          <view v-for="(name, idx) in smokeStyleNames" :key="idx"
            class="picker-item" :class="{ active: ringCurrentStyle === idx }"
            @click="selectSmokeStyle(idx)">
            <text class="picker-icon">{{ smokeStyleIcons[idx] }}</text>
            <text class="picker-name">{{ name }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import Store from '@/utils/store.js'
import AppNavbar from '@/components/app-navbar/app-navbar.vue'
import { themeClass } from '@/utils/theme.js'

const SMOKING_DURATION = 50000
const IGNITE_DELAY = 800
const MAX_PUFF_DURATION = 8000  // 单次吸烟最长时长（8秒）

const raf = typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : (fn) => setTimeout(fn, 16)
const caf = typeof cancelAnimationFrame !== 'undefined' ? cancelAnimationFrame : (id) => clearTimeout(id)

export default {
  components: { AppNavbar },
  data() {
    return {
      brandId: '',
      remaining: 0,
      cancelled: false,  // 标记是否取消抽烟
      // 状态机: ready / igniting / lit / smoking / exhaling / burnout / cooldown
      state: 'ready',
      sceneReady: false,
      showHint: true,
      hintText: '长按点火',
      // 烟灰
      ashGrowth: 0,
      ashFalling: false,
      ashParticles: [],  // 烟灰碎片粒子（数据驱动，跨端兼容）
      ashParticleId: 0,  // 粒子自增 id
      // 吸烟进度
      smokeProgress: 0,
      smokeStartTime: 0,
      sessionStartTs: 0,
      sessionExhaleCount: 0,
      lungFill: 0,  // 肺部填充度 (0-100)
      lungCtx: null,  // 肺部 canvas 上下文
      lungW: 0,       // 肺部 canvas 逻辑宽
      lungH: 0,       // 肺部 canvas 逻辑高
      // 计时器
      smokeTimer: null,
      pressTimer: null,
      puffTimer: null,  // 单次吸烟自动停止计时器
      exhaleTimer: null,  // 吐烟时肺部递减计时器
      exhaleEndTimer: null,  // 吐烟结束延时计时器
      isPressing: false,
      // 拖拽检测
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0,
      cigDragMoved: false,
      // 音效
      soundEnabled: true,
      fireAudio: null,      // 点火音效播放器 (fire.mp3)
      burnAudio: null,      // 吸烟音效播放器 (input.mp3)
      exhaleAudio: null,    // 吐烟音效播放器 (output.mp3)
      audioCtx: null,       // Web Audio 备用
      // 烟圈
      ringActive: false,
      ringPressTimer: null,
      ringCurrentStyle: 0,
      showStylePicker: false,
      smokeStyleNames: ['烟圈', '爱心形', '龙卷风', '星形', '蘑菇云', '双螺旋', '烟花扩散', '蛇形蜿蜒', '水母状', '文字烟雾', '瀑布流', '分散飘散'],
      smokeStyleIcons: ['🌀', '❤️', '🌪️', '⭐', '🍄', '🧬', '🎆', '🐍', '🪼', '✨', '🌊', '💨'],
      // 派烟
      showPassModal: false,
      // Toast
      showToast: false,
      toastMsg: '',
      toastTimer: null,
      // Canvas 烟雾粒子
      canvasCtx: null,
      canvasW: 0,
      canvasH: 0,
      particles: [],
      animFrame: null,
      emitterX: 0,
      emitterY: 0,
      smokeMode: 'off',
      ringTime: 0,
      exhaleRiseStart: 0,
      dpr: 1,
      // DOM 烟雾
      domFilterActive: false,
      domFilterRunning: false,
      domFilterFrames: 1,
      domFilterRaf: null,
      domActivePuffs: 0,
      inhaleTimer: null,
      // 空闲冒烟
      idleSmokeTimer: null,
      // 本次吸入开始时间
      currentPuffStart: 0,
      // 烟灰自动断裂
      ashBreakThreshold: 120
    }
  },

  computed: {
    cigClass() {
      const classes = {}
      if (this.state === 'lit') classes.lit = true
      if (this.state === 'smoking') classes.smoking = true
      if (this.state === 'exhaling') classes.exhaling = true
      if (this.state === 'burnout') classes.burnout = true
      if (this.state === 'cooldown') classes.cooldown = true
      return classes
    },

    ashStyle() {
      if (this.ashGrowth <= 0) return { height: '0px' }
      // 烟灰高度：非线性增长，模拟真实烟灰的堆积感
      const normalizedGrowth = this.ashGrowth / 200  // 0 ~ 1
      const curve = Math.pow(normalizedGrowth, 0.7)  // 更明显的堆积曲线
      const maxH = 90  // 最大烟灰高度增大
      const h = maxH * curve
      return { 
        height: Math.max(3, h) + 'px',
        // 烟灰宽度不超过烟身宽度
        width: `calc(var(--cig-width) * ${1.0 - normalizedGrowth * 0.05})`
      }
    },

    // 香烟燃烧变短：减少容器高度，烟头位置不变
    cigBurnStyle() {
      if (this.smokeProgress <= 0) return {}
      const totalH = 520 // --cig-total-h
      // 最多缩短 60%（保留滤嘴）
      const deltaH = (this.smokeProgress / 100) * totalH * 0.6
      const newH = totalH - deltaH
      // 补偿 translateY：容器变短后要下移，保持烟头位置不变
      const offsetY = deltaH / 2
      return {
        height: newH + 'px',
        transform: `translate(-50%, calc(-50% + ${offsetY}px))`
      }
    },

    // 纸身样式：随吸烟进度缩短
    paperStyle() {
      if (this.smokeProgress <= 0) return {}
      const paperH = 360 // --cig-total-h(520) - --cig-filter-h(160)
      // 纸身最多缩短 80%
      const newPaperH = paperH * (1 - (this.smokeProgress / 100) * 0.8)
      return {
        height: newPaperH + 'px',
        flex: 'none'
      }
    },

    // 背景火光：由亮渐灭，吸烟时更亮
    bgGlowStyle() {
      if (this.state === 'ready' || this.state === 'igniting') return { opacity: 0 }
      // 基础亮度：随进度衰减
      const baseBrightness = Math.max(0, 1 - this.smokeProgress / 100)
      // 吸烟时额外增亮
      const smokingBoost = this.state === 'smoking' ? 0.4 : 0
      const litBoost = (this.state === 'lit' || this.state === 'exhaling') ? 0.1 : 0
      return { opacity: Math.min(1, baseBrightness + smokingBoost + litBoost) }
    }
  },

  watch: {
    state(newVal, oldVal) {
      this.syncSmokeMode(newVal, oldVal)
      // 肺部容器首次显示时初始化 canvas
      if (oldVal === 'ready' && newVal !== 'ready') {
        this.$nextTick(() => { setTimeout(() => this.initLungCanvas(), 80) })
      }
    },
    lungFill() {
      if (this.lungCtx) this.drawLung()
    }
  },

  mounted() {
    this.$nextTick(() => { this.initCanvas() })
  },

  onReady() { this.initCanvas() },

  onLoad(options) {
    this.brandId = options.brandId || ''
    this.remaining = parseInt(options.remaining) || 0
    this.sessionStartTs = Date.now()
    this.sceneReady = true
    this.state = 'ready'
    this.showHint = true
    this.hintText = '长按点火'
    this.lungFill = 0  // 每次进入页面重置肺部填充度

    // 读取音效设置
    try {
      const saved = uni.getStorageSync('os_sound')
      if (saved !== null && saved !== undefined) this.soundEnabled = saved === '1' || saved === 1
    } catch (e) {}

    // 预加载所有音效（减少延迟）
    this.initFireAudio()
    this.initBurnAudio()
    this.initExhaleAudio()
  },

  onUnload() {
    this.cleanup()
  },

  methods: {
    goBack() {
      // 标记为取消，不记录抽烟
      this.cancelled = true
      // 清理资源
      this.cleanup()
      // 返回首页
      uni.navigateBack({
        delta: 1,
        fail: () => {
          uni.switchTab({ url: '/pages/index/index' })
        }
      })
    },

    // 根据肺部填充度返回颜色
    getLungColor(fill) {
      if (fill >= 100) return '#ef4444'
      if (fill >= 80) return '#f97316'
      if (fill >= 60) return '#eab308'
      if (fill >= 40) return '#84cc16'
      if (fill >= 20) return '#22c55e'
      return '#10b981'
    },

    // ---- 肺部 Canvas 绘制 ----
    initLungCanvas() {
      uni.createSelectorQuery().in(this)
        .select('#lung-canvas').fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) return
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          let dpr = 2
          try { dpr = Math.min(uni.getSystemInfoSync().pixelRatio || 1, 2) } catch (e) {}
          const w = res[0].width
          const h = res[0].height
          canvas.width = w * dpr
          canvas.height = h * dpr
          ctx.scale(dpr, dpr)
          this.lungCtx = ctx
          this.lungW = w
          this.lungH = h
          this.drawLung()
        })
    },

    drawLung() {
      const ctx = this.lungCtx
      if (!ctx) return
      const w = this.lungW
      const h = this.lungH
      const fill = this.lungFill
      ctx.clearRect(0, 0, w, h)

      // 构建左右肺叶路径
      const buildLungPaths = () => {
        // 左肺（2叶，有心切迹）
        ctx.beginPath()
        ctx.moveTo(w * 0.44, h * 0.16)
        ctx.bezierCurveTo(w * 0.40, h * 0.10, w * 0.24, h * 0.08, w * 0.16, h * 0.18)
        ctx.bezierCurveTo(w * 0.06, h * 0.30, w * 0.04, h * 0.50, w * 0.06, h * 0.66)
        ctx.bezierCurveTo(w * 0.08, h * 0.78, w * 0.16, h * 0.90, w * 0.28, h * 0.92)
        ctx.bezierCurveTo(w * 0.36, h * 0.93, w * 0.43, h * 0.84, w * 0.45, h * 0.74)
        ctx.bezierCurveTo(w * 0.47, h * 0.64, w * 0.44, h * 0.50, w * 0.43, h * 0.40)
        ctx.bezierCurveTo(w * 0.42, h * 0.30, w * 0.44, h * 0.22, w * 0.44, h * 0.16)
        ctx.closePath()
        // 右肺（3叶，略大）—— 同一 path 的新子路径
        ctx.moveTo(w * 0.56, h * 0.16)
        ctx.bezierCurveTo(w * 0.60, h * 0.10, w * 0.76, h * 0.08, w * 0.84, h * 0.18)
        ctx.bezierCurveTo(w * 0.94, h * 0.30, w * 0.96, h * 0.50, w * 0.94, h * 0.66)
        ctx.bezierCurveTo(w * 0.92, h * 0.78, w * 0.84, h * 0.90, w * 0.72, h * 0.92)
        ctx.bezierCurveTo(w * 0.64, h * 0.93, w * 0.57, h * 0.84, w * 0.55, h * 0.74)
        ctx.bezierCurveTo(w * 0.53, h * 0.64, w * 0.56, h * 0.50, w * 0.57, h * 0.40)
        ctx.bezierCurveTo(w * 0.58, h * 0.30, w * 0.56, h * 0.22, w * 0.56, h * 0.16)
        ctx.closePath()
      }

      // 填充：从底部向上，clip 到肺形
      if (fill > 0) {
        ctx.save()
        buildLungPaths()
        ctx.clip()
        const fillH = h * (fill / 100)
        ctx.fillStyle = this.getLungColor(fill)
        ctx.globalAlpha = 0.65
        ctx.fillRect(0, h - fillH, w, fillH)
        ctx.globalAlpha = 1
        ctx.restore()
      }

      // 肺叶轮廓
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'
      ctx.lineWidth = 1.5
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      buildLungPaths()
      ctx.stroke()

      // 肺叶分界线
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = 0.8
      // 左肺斜裂（2叶）
      ctx.beginPath()
      ctx.moveTo(w * 0.43, h * 0.42)
      ctx.bezierCurveTo(w * 0.34, h * 0.50, w * 0.20, h * 0.62, w * 0.08, h * 0.68)
      ctx.stroke()
      // 右肺斜裂
      ctx.beginPath()
      ctx.moveTo(w * 0.57, h * 0.42)
      ctx.bezierCurveTo(w * 0.66, h * 0.50, w * 0.80, h * 0.62, w * 0.92, h * 0.68)
      ctx.stroke()
      // 右肺水平裂（3叶分界）
      ctx.beginPath()
      ctx.moveTo(w * 0.57, h * 0.36)
      ctx.bezierCurveTo(w * 0.68, h * 0.34, w * 0.82, h * 0.36, w * 0.94, h * 0.40)
      ctx.stroke()

      // 气管（有宽度）
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(w * 0.475, h * 0.02)
      ctx.lineTo(w * 0.475, h * 0.32)
      ctx.moveTo(w * 0.525, h * 0.02)
      ctx.lineTo(w * 0.525, h * 0.32)
      // 气管横纹
      for (let i = 0; i < 4; i++) {
        const y = h * (0.06 + i * 0.065)
        ctx.moveTo(w * 0.475, y)
        ctx.lineTo(w * 0.525, y)
      }
      ctx.stroke()

      // 主支气管分叉
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(w * 0.48, h * 0.32)
      ctx.bezierCurveTo(w * 0.42, h * 0.38, w * 0.34, h * 0.44, w * 0.26, h * 0.48)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(w * 0.52, h * 0.32)
      ctx.bezierCurveTo(w * 0.58, h * 0.38, w * 0.66, h * 0.44, w * 0.74, h * 0.48)
      ctx.stroke()

      // 次级支气管分支
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'
      ctx.lineWidth = 0.8
      // 左侧分支
      ctx.beginPath()
      ctx.moveTo(w * 0.34, h * 0.44)
      ctx.bezierCurveTo(w * 0.28, h * 0.42, w * 0.22, h * 0.38, w * 0.18, h * 0.36)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(w * 0.26, h * 0.48)
      ctx.bezierCurveTo(w * 0.22, h * 0.54, w * 0.16, h * 0.58, w * 0.12, h * 0.56)
      ctx.stroke()
      // 右侧分支
      ctx.beginPath()
      ctx.moveTo(w * 0.66, h * 0.44)
      ctx.bezierCurveTo(w * 0.72, h * 0.42, w * 0.78, h * 0.38, w * 0.82, h * 0.36)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(w * 0.74, h * 0.48)
      ctx.bezierCurveTo(w * 0.78, h * 0.54, w * 0.84, h * 0.58, w * 0.88, h * 0.56)
      ctx.stroke()
    },

    cleanup() {
      if (this.smokeTimer) { clearInterval(this.smokeTimer); this.smokeTimer = null }
      if (this.pressTimer) { clearTimeout(this.pressTimer); this.pressTimer = null }
      if (this.puffTimer) { clearTimeout(this.puffTimer); this.puffTimer = null }
      if (this.exhaleTimer) { clearInterval(this.exhaleTimer); this.exhaleTimer = null }
      if (this.exhaleEndTimer) { clearTimeout(this.exhaleEndTimer); this.exhaleEndTimer = null }
      if (this.ringPressTimer) { clearTimeout(this.ringPressTimer); this.ringPressTimer = null }
      this.stopCanvasLoop()
      this.stopDomFilter()
      this.stopInhale()
      this.stopIdleSmoke()
      this.stopBurnSound()
      // 销毁音频播放器
      if (this.fireAudio) { try { this.fireAudio.destroy() } catch(e) {}; this.fireAudio = null }
      if (this.burnAudio) { try { this.burnAudio.destroy() } catch(e) {}; this.burnAudio = null }
      if (this.exhaleAudio) { try { this.exhaleAudio.destroy() } catch(e) {}; this.exhaleAudio = null }
      this.setSmokeMode('off')
      this.lungCtx = null
      this.ashParticles = []  // 清空烟灰粒子
    },

    // ============ Canvas 烟雾粒子系统（小程序兼容，参考 test-smoke-svg） ============
    findCanvasEl() {
      if (!this.$el) return null
      return this.$el.querySelector('#smoke-canvas') || this.$el.querySelector('canvas') || null
    },

    initCanvas() {
      uni.createSelectorQuery().in(this)
        .select('#smoke-canvas').fields({ node: true, size: true })
        .select('#spriteCanvas').fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[1]) { setTimeout(() => this.initCanvas(), 120); return }
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          let dpr = 2
          try { dpr = Math.min((uni.getWindowInfo ? uni.getWindowInfo().pixelRatio : uni.getSystemInfoSync().pixelRatio) || 1, 2) } catch (e) {}
          this.W = res[0].width
          this.H = res[0].height
          this.canvasW = this.W
          this.canvasH = this.H
          canvas.width = this.W * dpr
          canvas.height = this.H * dpr
          ctx.scale(dpr, dpr)
          this.canvas = canvas
          this.canvasCtx = ctx
          const sc = res[1].node
          sc.width = 128; sc.height = 128
          const sx = sc.getContext('2d')
          const g = sx.createRadialGradient(64, 64, 0, 64, 64, 64)
          g.addColorStop(0.0, 'rgba(255,255,255,1)')
          g.addColorStop(0.35, 'rgba(245,245,248,0.55)')
          g.addColorStop(1.0, 'rgba(255,255,255,0)')
          sx.fillStyle = g
          sx.fillRect(0, 0, 128, 128)
          this.sprite = sc
          this.cfg = {
            dprCap: 2, emitPerSec: 110, ambientPerSec: 5, buoyancy: 78, drag: 0.42,
            turbStrength: 64, noiseScale: 0.0036, timeScale: 0.16, octaves: 3,
            growRate: 34, lifeMin: 3.6, lifeMax: 5.8, rMin: 12, rMax: 24,
            startSpeed: 130, spread: 22, alphaMax: 0.06, alphaVar: 0.02
          }
          this.pool = []
          this.active = []
          this.particles = []
          this.cv = { x: 0, y: 0 }
          this._c = { x: 0, y: 0 }
          this.ambient = false
          this.emitting = false
          this.puffTimer = 0
          this.ambientAcc = 0
          this.last = null
          this.exhaleEnd = 0
          this.exhaleIntensity = 1
          this.updateEmitter()
          this.startCanvasLoop()
        })
    },

    resizeCanvas() {
      try {
        uni.createSelectorQuery().in(this).select('#smoke-canvas').fields({ node: true, size: true })
          .exec((res) => {
            if (!res || !res[0] || !this.canvas) return
            const rect = res[0]
            this.W = rect.width; this.H = rect.height
            this.canvasW = this.W; this.canvasH = this.H
            let dpr = 2
            try { dpr = Math.min((uni.getWindowInfo ? uni.getWindowInfo().pixelRatio : uni.getSystemInfoSync().pixelRatio) || 1, 2) } catch (e) {}
            this.canvas.width = this.W * dpr
            this.canvas.height = this.H * dpr
            this.canvasCtx.setTransform(1, 0, 0, 1, 0, 0)
            this.canvasCtx.scale(dpr, dpr)
            this.updateEmitter()
          })
      } catch (e) {}
    },

    startCanvasLoop() {
      if (this.animFrame) return
      const canvas = this.canvas
      const rafFn = (canvas && canvas.requestAnimationFrame)
        ? canvas.requestAnimationFrame.bind(canvas)
        : (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (cb) => setTimeout(() => cb(Date.now()), 16))
      const loop = (now) => {
        if (this.last == null) this.last = now
        let dt = (now - this.last) / 1000
        this.last = now
        if (dt > 0.05) dt = 0.05
        this.frame(dt, now)
        this.animFrame = rafFn(loop)
      }
      this.animFrame = rafFn(loop)
    },

    stopCanvasLoop() {
      if (this.animFrame) { caf(this.animFrame); this.animFrame = null }
      this.active = []
      if (this.canvasCtx) this.canvasCtx.clearRect(0, 0, this.canvasW, this.canvasH)
    },

    setSmokeMode(m) {
      this.smokeMode = m
      if (m === 'exhale-rise') this.exhaleEnd = Date.now() + 1500
    },

    noise3(x, y, z) {
      const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z)
      const xf = x - xi, yf = y - yi, zf = z - zi
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf)
      const r = (i, j, k) => {
        let n = (i * 374761393 + j * 668265263 + k * 1274126177) | 0
        n = (n ^ (n >> 13)) * 1274126177
        n = n ^ (n >> 16)
        return (n >>> 0) / 4294967295
      }
      const c000 = r(xi, yi, zi), c100 = r(xi + 1, yi, zi)
      const c010 = r(xi, yi + 1, zi), c110 = r(xi + 1, yi + 1, zi)
      const c001 = r(xi, yi, zi + 1), c101 = r(xi + 1, yi, zi + 1)
      const c011 = r(xi, yi + 1, zi + 1), c111 = r(xi + 1, yi + 1, zi + 1)
      const x00 = c000 + (c100 - c000) * u, x10 = c010 + (c110 - c010) * u
      const x01 = c001 + (c101 - c001) * u, x11 = c011 + (c111 - c011) * u
      return (x00 + (x10 - x00) * v) + ((x01 + (x11 - x01) * v) - (x00 + (x10 - x00) * v)) * w
    },

    curl(x, y, t, out) {
      const EPS = 1.0
      const n1 = this.noise3(x, y + EPS, t), n2 = this.noise3(x, y - EPS, t)
      const n3 = this.noise3(x + EPS, y, t), n4 = this.noise3(x - EPS, y, t)
      const dpdx = (n3 - n4) / (2 * EPS)
      const dpdy = (n1 - n2) / (2 * EPS)
      out.x = dpdy; out.y = -dpdx
    },

    fbmCurl(x, y, t, out) {
      const cfg = this.cfg
      let amp = 1, freq = 1, sx = 0, sy = 0
      for (let o = 0; o < cfg.octaves; o++) {
        this.curl(x * freq, y * freq, t * (1 + o * 0.6), this._c)
        sx += this._c.x * amp; sy += this._c.y * amp
        freq *= 2.1; amp *= 0.5
      }
      out.x = sx; out.y = sy
    },

    spawn(x, y, vx, vy, life, r0, phase, alphaMax) {
      const p = this.pool.pop() || {}
      p.x = x; p.y = y; p.vx = vx; p.vy = vy
      p.age = 0; p.life = life; p.r0 = r0
      p.phase = phase; p.alphaMax = alphaMax
      p.seedX = Math.random() * 1000
      p.seedY = Math.random() * 1000
      p.seedT = Math.random() * 50
      p.grow = this.cfg.growRate * (0.45 + Math.random() * 1.2)
      p.depth = Math.random()
      this.active.push(p)
      return p
    },

    emitBottom(dt, intensity) {
      const cfg = this.cfg
      let n = Math.floor(cfg.emitPerSec * (0.5 + intensity * 0.9) * dt + Math.random())
      while (n-- > 0) {
        if (this.active.length >= 460) break
        const ang = -Math.PI / 2 + (Math.random() - 0.5) * 0.9
        const sp = cfg.startSpeed * (0.45 + Math.random() * 1.1) * (0.6 + intensity * 0.6)
        const sx = this.emitX + (Math.random() - 0.5) * cfg.spread * 1.6 * (0.6 + intensity * 0.8)
        const sy = this.emitY + (Math.random() - 0.5) * cfg.spread * 0.8
        const life = cfg.lifeMin + Math.random() * (cfg.lifeMax - cfg.lifeMin)
        const depth = Math.random()
        const r0 = (cfg.rMin + Math.random() * (cfg.rMax - cfg.rMin)) * (0.45 + depth * 0.95) * (0.7 + intensity * 0.5)
        const aMax = (cfg.alphaMax + Math.random() * cfg.alphaVar) * (0.25 + depth * 1.2)
        this.spawn(sx, sy, Math.cos(ang) * sp * 0.3, Math.sin(ang) * sp, life, r0, Math.random() * 6.28, aMax)
      }
    },

    emitAmbient(dt) {
      const cfg = this.cfg
      this.ambientAcc += cfg.ambientPerSec * dt
      while (this.ambientAcc >= 1) {
        this.ambientAcc -= 1
        if (this.active.length < 460) {
          const life = cfg.lifeMin + Math.random() * 2
          const depth = Math.random() * 0.6
          const r0 = cfg.rMin * (0.4 + depth)
          const aMax = cfg.alphaMax * (0.2 + depth)
          this.spawn(this.emitX + (Math.random() - 0.5) * 8, this.emitY + 6,
            (Math.random() - 0.5) * 14, -30 - Math.random() * 30, life, r0, Math.random() * 6.28, aMax)
        }
      }
    },

    frame(dt, now) {
      const cfg = this.cfg, ctx = this.canvasCtx
      if (!ctx) return
      const t = now * 0.001 * cfg.timeScale
      if (this.smokeMode === 'idle' || this.smokeMode === 'inhale') {
        this.emitAmbient(dt)
      } else if (this.smokeMode === 'exhale-rise') {
        if (Date.now() < this.exhaleEnd) this.emitBottom(dt, this.exhaleIntensity || 1)
      }
      ctx.clearRect(0, 0, this.W, this.H)
      ctx.globalCompositeOperation = 'source-over'
      for (let i = this.active.length - 1; i >= 0; i--) {
        const p = this.active[i]
        p.age += dt
        if (p.age >= p.life) { this.active.splice(i, 1); this.pool.push(p); continue }
        this.fbmCurl((p.x + p.seedX) * cfg.noiseScale, (p.y + p.seedY) * cfg.noiseScale, t + p.seedT, this.cv)
        const turb = cfg.turbStrength * (0.6 + (p.depth || 0.5) * 0.8)
        p.vx += this.cv.x * turb * dt
        p.vy += -cfg.buoyancy * dt + this.cv.y * turb * 0.35 * dt
        const d = 1 - Math.min(cfg.drag * dt, 1)
        p.vx *= d; p.vy *= d
        p.x += p.vx * dt; p.y += p.vy * dt
        const r = p.r0 + p.age * p.grow
        const k = p.age / p.life
        let fade
        if (k < 0.15) fade = k / 0.15
        else if (k < 0.6) fade = 0.7
        else fade = 0.7 * (1 - (k - 0.6) / 0.4)
        const a = Math.max(0, fade) * p.alphaMax
        const s = r * 2
        ctx.globalAlpha = a
        ctx.drawImage(this.sprite, p.x - r, p.y - r, s, s)
      }
      ctx.globalAlpha = 1
    },

    updateEmitter() {
      this.emitX = this.W * 0.5
      this.emitY = this.H * 0.92
    },

    emitExhaleBurst(count) {
      this.exhaleByIntensity(1.2)
    },

    // ============ DOM 烟雾 / 花样（小程序不兼容，暂置为空实现；核心烟雾见 Canvas 引擎） ============
    startDomFilter() {},
    stopDomFilter() {},
    animateDomFilter() {},
    spawnDomPuff() {},
    makeDomOpts() { return {} },
    startInhale() {},
    stopInhale() {},
    startIdleSmoke() {},
    stopIdleSmoke() {},
    getBurnPosSync() {
      return { x: this.emitX || (this.canvasW / 2) || 200, y: this.emitY || (this.canvasH * 0.92) || 300 }
    },

    exhaleBurst(cx, cy, count) {
      this.exhaleByIntensity(1.2)
    },

    // 根据强度吐烟：强度越高，烟越多越浓（从屏幕底部吐出）
    exhaleByIntensity(intensity) {
      this.ambient = false
      this.exhaleIntensity = intensity
      this.setSmokeMode('exhale-rise')
      this.exhaleEnd = Date.now() + (intensity > 1.2 ? 1800 : 1300)
    },

    // ============ 烟雾模式同步 ============
    syncSmokeMode(newVal, oldVal) {
      if (newVal === 'ready' || newVal === 'igniting') {
        this.setSmokeMode('off'); this.ambient = false
      } else if (newVal === 'lit') {
        this.setSmokeMode('idle'); this.ambient = true
      } else if (newVal === 'smoking') {
        this.setSmokeMode('inhale'); this.ambient = true
      } else if (newVal === 'exhaling') {
        this.setSmokeMode('exhale-rise'); this.ambient = false
      } else if (newVal === 'burnout') {
        this.setSmokeMode('off'); this.ambient = false
      } else if (newVal === 'cooldown') {
        this.setSmokeMode('off'); this.ambient = false
      }
    },

    // ============ 吐烟流程（共享方法，消除重复） ============
    /**
     * 统一的吐烟流程：停止吸烟 → 进入吐烟状态 → 肺部递减 → 结束后回调
     * @param {Object} opts
     * @param {number} opts.intensity - 吐烟强度（影响烟雾量）
     * @param {number} opts.duration - 吐烟动画时长 ms
     * @param {string} opts.vibrateType - 振动类型 'light' | 'medium' | 'heavy'
     * @param {Function|null} opts.onComplete - 吐烟结束后的回调（不传则根据 progress 自动判断）
     */
    startExhale({ intensity, duration, vibrateType = 'light', onComplete = null }) {
      // 停止吸烟计时
      if (this.smokeTimer) { clearInterval(this.smokeTimer); this.smokeTimer = null }
      this.stopBurnSound()

      // 进入吐烟状态
      this.state = 'exhaling'
      this.sessionExhaleCount++
      if (uni.vibrateShort) uni.vibrateShort({ type: vibrateType })
      this.exhaleByIntensity(intensity)
      this.playExhale(intensity)

      // 肺部填充度平滑递减
      if (this.lungFill > 0) {
        const perTick = this.lungFill / (duration / 50)
        this.exhaleTimer = setInterval(() => {
          this.lungFill = Math.max(0, this.lungFill - perTick)
        }, 50)
      }

      // 吐烟结束后：重置并进入下一阶段
      this.exhaleEndTimer = setTimeout(() => {
        if (this.exhaleTimer) { clearInterval(this.exhaleTimer); this.exhaleTimer = null }
        this.lungFill = 0
        if (onComplete) {
          onComplete()
        } else if (this.smokeProgress >= 100) {
          this.finishSmoking()
        } else {
          this.state = 'lit'
          this.showHint = true
          this.hintText = '长按继续吸'
        }
      }, duration)
    },

    // ---- 手势处理 ----
    onPointerDown(e) {
      const point = e.touches ? e.touches[0] : e
      this.isPressing = true
      this.isDragging = true
      this.cigDragMoved = false
      this.dragStartX = point.clientX
      this.dragStartY = point.clientY

      if (this.state === 'ready') {
        this.state = 'igniting'
        this.hintText = ''
        this.showHint = true
        this.pressTimer = setTimeout(() => {
          // 点火成功，直接进入吸烟状态（跳过无效的 lit 中间态）
          if (uni.vibrateShort) uni.vibrateShort({ type: 'light' })
          this.playFire()  // 点火音效
          this.state = 'smoking'
          this.smokeStartTime = Date.now()
          this.currentPuffStart = Date.now()
          this.startSmokeProgress()
          this.showHint = false
          this.startBurnSound()
          // 单次吸烟最长时长，到时自动吐烟
          this.puffTimer = setTimeout(() => {
            if (this.state === 'smoking') {
              this.isPressing = false
              const progressFactor = 0.4 + (this.smokeProgress / 100) * 0.6
              const puffFactor = Math.min(2.0, 0.5 + MAX_PUFF_DURATION / 3000)
              this.startExhale({
                intensity: progressFactor * puffFactor,
                duration: 2000,
                onComplete: () => {
                  if (this.state === 'exhaling') {
                    this.state = 'lit'
                    this.showHint = true
                    this.hintText = '长按吸烟'
                  }
                }
              })
            }
          }, MAX_PUFF_DURATION)
        }, IGNITE_DELAY)
      } else if (this.state === 'lit' || this.state === 'exhaling') {
        // 肺部已满，禁止吸烟
        if (this.lungFill >= 100) {
          this.showHint = true
          this.hintText = '⚠️ 肺部已满，请先吐烟'
          if (uni.vibrateShort) uni.vibrateShort({ type: 'medium' })
          this.isPressing = false
          return
        }
        
        this.state = 'smoking'
        this.smokeStartTime = Date.now() - (this.smokeProgress / 100) * SMOKING_DURATION
        this.currentPuffStart = Date.now()
        this.startSmokeProgress()
        this.showHint = false
        if (uni.vibrateShort) uni.vibrateShort({ type: 'light' })
        // 开始吸烟音效 (input.mp3)
        this.startBurnSound()
        
        // 设置单次吸烟最长时长限制
        this.puffTimer = setTimeout(() => {
          if (this.state === 'smoking') {
            this.isPressing = false
            const progressFactor = 0.4 + (this.smokeProgress / 100) * 0.6
            const puffFactor = Math.min(2.0, 0.5 + MAX_PUFF_DURATION / 3000)
            this.startExhale({
              intensity: progressFactor * puffFactor,
              duration: 2000,
              onComplete: () => {
                if (this.state === 'exhaling') {
                  this.state = 'lit'
                  this.showHint = true
                  this.hintText = '长按吸烟'
                }
              }
            })
          }
        }, MAX_PUFF_DURATION)
      }
    },

    onPointerMove(e) {
      if (!this.isDragging) return
      const point = e.touches ? e.touches[0] : e
      const dx = point.clientX - this.dragStartX
      const dy = point.clientY - this.dragStartY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.cigDragMoved = true
    },

    onPointerUp() {
      this.isPressing = false
      
      // 无论是否拖动，都要清除吸烟计时器
      if (this.state === 'smoking') {
        clearInterval(this.smokeTimer)
        this.smokeTimer = null
        // 清除自动停止计时器
        if (this.puffTimer) {
          clearTimeout(this.puffTimer)
          this.puffTimer = null
        }
      }
      
      this.cigDragMoved = false
      this.isDragging = false

      if (this.state === 'igniting') {
        clearTimeout(this.pressTimer)
        this.pressTimer = null
        this.state = 'ready'
        this.showHint = true
        this.hintText = '长按点火'
        return
      }

      if (this.state === 'smoking') {
        const puffDuration = this.currentPuffStart ? Date.now() - this.currentPuffStart : 1000
        const progressFactor = 0.4 + (this.smokeProgress / 100) * 0.6
        const puffFactor = Math.min(2.0, 0.5 + puffDuration / 3000)
        this.startExhale({
          intensity: progressFactor * puffFactor,
          duration: 2200
        })
      }
    },

    // ---- 吸烟进度 ----
    startSmokeProgress() {
      let lastAshTick = 0
      this.smokeTimer = setInterval(() => {
        // 安全检查：用户已松手但 onPointerUp 未触发时，作为后备触发吐烟
        if (!this.isPressing) {
          clearInterval(this.smokeTimer)
          this.smokeTimer = null
          if (this.state === 'smoking') {
            const puffDuration = this.currentPuffStart ? Date.now() - this.currentPuffStart : 1000
            const progressFactor = 0.4 + (this.smokeProgress / 100) * 0.6
            const puffFactor = Math.min(2.0, 0.5 + puffDuration / 3000)
            this.startExhale({ intensity: progressFactor * puffFactor, duration: 2200 })
          }
          return
        }
        
        const elapsed = Date.now() - this.smokeStartTime
        this.smokeProgress = Math.min(100, (elapsed / SMOKING_DURATION) * 100)

        // 肺部填充度增加：适中速度（0.5~0.9%/tick，约 5.5~10 秒填满）
        const lungIncrease = 0.5 + (this.smokeProgress / 100) * 0.4
        this.lungFill = Math.min(100, this.lungFill + lungIncrease)

        // 肺部已满，强制停止吸烟
        if (this.lungFill >= 100) {
          this.isPressing = false
          const intensity = 1.5 + (this.smokeProgress / 100) * 0.5
          this.startExhale({
            intensity,
            duration: 2500,
            vibrateType: 'heavy',
            onComplete: () => {
              if (this.state === 'exhaling') {
                this.state = 'lit'
                this.showHint = true
                this.hintText = '长按吸烟'
              }
            }
          })
          return
        }

        // 烟灰堆积：每 600ms 增长一点
        if (elapsed - lastAshTick > 500) {
          lastAshTick = elapsed
          this.growAsh(5)
        }

        if (this.smokeProgress >= 100) {
          clearInterval(this.smokeTimer)
          this.smokeTimer = null
          // 进度满了，先触发吐烟再结束（避免跳过吐烟流程）
          if (this.state === 'smoking') {
            this.isPressing = false
            this.startExhale({
              intensity: 1.2,
              duration: 2000,
              onComplete: () => { this.finishSmoking() }
            })
          } else {
            this.finishSmoking()
          }
        }
      }, 50)
    },

    // ---- 烟灰 ----
    growAsh(amount) {
      if (this.state !== 'lit' && this.state !== 'smoking' && this.state !== 'exhaling') return
      this.ashGrowth = Math.min(250, this.ashGrowth + amount)
      // 烟灰过长自动断裂
      if (this.ashGrowth >= this.ashBreakThreshold && (this.state === 'lit' || this.state === 'exhaling')) {
        this.autoBreakAsh()
      }
    },

    autoBreakAsh() {
      this.ashFalling = true
      this.playAshDrop()
      this.showToastMsg('烟灰太长了，自动掉落')
      // 自动断裂时清零
      this.ashGrowth = 0
      setTimeout(() => {
        this.ashFalling = false
        // 重置断裂阈值
        this.ashBreakThreshold = 100 + Math.random() * 60
      }, 800)
    },

    tapAsh() {
      if (this.ashGrowth > 0) {
        // 创建烟灰碎片粒子效果，烟灰越多碎片越多
        this.createAshParticles(this.ashGrowth)
        this.ashGrowth = 0
        this.playAshDrop()
        this.showToastMsg('弹掉烟灰')
      } else {
        this.showToastMsg('没有烟灰可弹')
      }
    },

    // 创建烟灰掉落粒子，数量与烟灰量成正比（数据驱动，小程序兼容）
    createAshParticles(ashAmount) {
      const particleCount = Math.min(20, 6 + Math.floor(ashAmount / 15))
      for (let i = 0; i < particleCount; i++) {
        const size = 3 + Math.random() * 6
        const side = Math.random() > 0.5 ? 1 : -1
        const startX = side * (5 + Math.random() * 15)
        const startY = Math.random() * 15
        const angle = (side > 0 ? 20 : -20) + (Math.random() - 0.5) * 40
        const velocity = 60 + Math.random() * 50
        const vx = Math.sin(angle * Math.PI / 180) * velocity * side
        const vy = Math.cos(angle * Math.PI / 180) * velocity
        const rotation = (Math.random() - 0.5) * 540 * side
        const id = ++this.ashParticleId
        this.ashParticles.push({
          id,
          style: {
            width: size + 'px',
            height: size * (0.5 + Math.random() * 0.7) + 'px',
            left: `calc(50% + ${startX}px)`,
            top: `-${startY}px`,
            '--vx': vx + 'px',
            '--vy': vy + 'px',
            '--rotation': rotation + 'deg',
            animationDelay: (Math.random() * 0.15) + 's'
          }
        })
        // 动画结束后移除
        setTimeout(() => {
          this.ashParticles = this.ashParticles.filter(p => p.id !== id)
        }, 1300)
      }
    },

    // ---- 完成吸烟 ----
    finishSmoking() {
      if (this.smokeTimer) { clearInterval(this.smokeTimer); this.smokeTimer = null }
      this.smokeProgress = 100
      if (this.state === 'burnout' || this.state === 'cooldown') return
      this.state = 'burnout'
      this.showHint = false

      const duration = Math.round((Date.now() - this.smokeStartTime) / 1000)
      const totalDuration = Math.round((Date.now() - this.sessionStartTs) / 1000)

      // 只有未取消时才记录抽烟
      if (!this.cancelled) {
        Store.recordSmoke(duration, this.brandId)
      }

      if (uni.vibrateShort) uni.vibrateShort({ type: 'heavy' })

      setTimeout(() => {
        this.state = 'cooldown'
        setTimeout(() => {
          // 返回首页（关闭所有页面）
          uni.reLaunch({
            url: '/pages/index/index'
          })
        }, 1500)
      }, 2000)
    },

    // ---- 音效 ----
    ensureAudio() {
      if (!this.audioCtx) {
        try {
          // 尝试多种方式创建音频上下文
          if (uni.createWebAudioContext) {
            this.audioCtx = uni.createWebAudioContext()
          } else if (typeof window !== 'undefined') {
            const AudioCtx = window.AudioContext || window.webkitAudioContext
            if (AudioCtx) {
              this.audioCtx = new AudioCtx()
            }
          }
        } catch (e) { 
          console.warn('Audio context creation failed', e)
          this.audioCtx = null 
        }
      }
      // 确保音频上下文处于运行状态
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {})
      }
      return this.audioCtx
    },

    playClick() {
      if (!this.soundEnabled) return
      // 简化版音效 - 使用系统振动替代
      if (uni.vibrateShort) uni.vibrateShort({ type: 'light' })
    },

    playAshDrop() {
      if (!this.soundEnabled) return
      if (uni.vibrateShort) uni.vibrateShort({ type: 'medium' })
    },

    // 初始化点火音效播放器 (fire.mp3)
    initFireAudio() {
      if (this.fireAudio) return
      try {
        this.fireAudio = uni.createInnerAudioContext()
        this.fireAudio.src = '/static/audio/fire.mp3'
        this.fireAudio.volume = 1.0
      } catch (e) {
        console.warn('Fire audio init failed', e)
      }
    },

    // 点火音效 (fire.mp3)
    playFire() {
      if (!this.soundEnabled) return
      this.initFireAudio()
      if (this.fireAudio) {
        try {
          this.fireAudio.stop()
          this.fireAudio.play()
        } catch (e) {
          console.warn('Fire sound failed', e)
        }
      }
    },

    // 初始化吸烟音效播放器 (input.mp3)
    initBurnAudio() {
      if (this.burnAudio) return
      try {
        this.burnAudio = uni.createInnerAudioContext()
        this.burnAudio.src = '/static/audio/input.mp3'
        this.burnAudio.loop = true
        this.burnAudio.volume = 1.0
      } catch (e) {
        console.warn('Burn audio init failed', e)
      }
    },

    // 开始吸烟音效 (长按时播放 input.mp3)
    startBurnSound() {
      if (!this.soundEnabled) return
      this.initBurnAudio()
      if (this.burnAudio) {
        try {
          this.burnAudio.stop()
          this.burnAudio.play()
        } catch (e) {
          console.warn('Burn sound play failed', e)
        }
      }
    },

    // 停止吸烟音效
    stopBurnSound() {
      if (this.burnAudio) {
        try {
          this.burnAudio.stop()
        } catch (e) {}
      }
    },

    // 吐烟音效 (output.mp3) - 预初始化
    initExhaleAudio() {
      if (this.exhaleAudio) return
      try {
        this.exhaleAudio = uni.createInnerAudioContext()
        this.exhaleAudio.src = '/static/audio/output.mp3'
        this.exhaleAudio.volume = 1.0
      } catch (e) {
        console.warn('Exhale audio init failed', e)
      }
    },

    // 吐烟音效
    playExhale(intensity) {
      if (!this.soundEnabled) return
      this.initExhaleAudio()
      if (this.exhaleAudio) {
        try {
          this.exhaleAudio.stop()
          this.exhaleAudio.play()
        } catch (e) {
          console.warn('Exhale sound failed', e)
        }
      }
    },

    toggleSound() {
      this.soundEnabled = !this.soundEnabled
      try { uni.setStorageSync('os_sound', this.soundEnabled ? '1' : '0') } catch (e) {}
      if (this.soundEnabled) this.playClick()
    },

    // ---- 烟圈 ----
    startRingPress() {
      if (this.state !== 'smoking' && this.state !== 'lit') {
        this.showToastMsg('先点一根再吐圈')
        return
      }
      this.ringActive = true
      this.ringPressTimer = setTimeout(() => {
        this.showStylePicker = true
      }, 800)
    },

    endRingPress() {
      if (this.ringPressTimer) { clearTimeout(this.ringPressTimer); this.ringPressTimer = null }
      this.ringActive = false
      if (!this.showStylePicker) {
        this.emitSmokeStyle()
      }
    },

    selectSmokeStyle(idx) {
      this.ringCurrentStyle = idx
      this.showStylePicker = false
      this.showToastMsg('花样：' + this.smokeStyleNames[idx])
    },

    // ---- 吐烟花样发射 ----
    emitSmokeStyle() {
      const emitters = [
        () => this.emitRingEffect(),
        () => this.emitHeartEffect(),
        () => this.emitTornadoEffect(),
        () => this.emitStarEffect(),
        () => this.emitMushroomEffect(),
        () => this.emitDoubleHelixEffect(),
        () => this.emitFireworkEffect(),
        () => this.emitSnakeEffect(),
        () => this.emitJellyfishEffect(),
        () => this.emitTextEffect(),
        () => this.emitWaterfallEffect(),
        () => this.emitScatterEffect(),
      ]
      const idx = this.ringCurrentStyle
      if (emitters[idx]) emitters[idx]()
    },

    // 获取形状效果上下文
    getShapeCtx() {
      const wrap = this.$refs.domSmokeWrap
      const container = wrap ? (wrap.$el || wrap) : null
      const pos = this.getBurnPosSync()
      return { container, originX: pos.x, W: this.canvasW, H: this.canvasH }
    },

    // 通用形状动画框架
    animateShapeEffect(opts) {
      const ctx = this.getShapeCtx()
      if (!ctx.container) return
      const { getPos, particleCount, puffSize, totalLife, opacityMul } = opts
      const H = ctx.H, originX = ctx.originX
      const startY = H * 0.85, endY = H * 0.10
      const els = []
      const doc = ctx.container.ownerDocument || document
      this.startDomFilter()
      for (let i = 0; i < particleCount; i++) {
        const el = doc.createElement('div')
        el.className = 'dom-smoke-puff'
        const sz = puffSize + Math.random() * 5
        el.style.width = sz + 'px'
        el.style.height = sz + 'px'
        const g = 195 + Math.floor(Math.random() * 45)
        el.style.background = `radial-gradient(circle, rgba(255,255,255,0.75) 0%, rgba(${g},${g},${g},0.35) 40%, transparent 72%)`
        ctx.container.appendChild(el)
        els.push({ el, index: i, size: sz })
      }
      const t0 = performance.now()
      const tick = (now) => {
        const elapsed = now - t0
        const p = Math.min(1, elapsed / totalLife)
        const ease = 1 - Math.pow(1 - p, 2)
        const centerY = startY - ease * (startY - endY)
        const scale = 1 + ease * 2.5
        let alpha = p < 0.05 ? p / 0.05 : 1 - Math.pow((p - 0.05) / 0.95, 1.5)
        const sizeScale = 1 + ease * 2
        for (const particle of els) {
          const pos = getPos(particle.index, particleCount, p, ease, scale, centerY, originX)
          const sz = particle.size * sizeScale
          particle.el.style.left = (pos.x - sz / 2) + 'px'
          particle.el.style.top = (pos.y - sz / 2) + 'px'
          particle.el.style.width = sz + 'px'
          particle.el.style.height = sz + 'px'
          particle.el.style.opacity = alpha * (opacityMul || 0.7)
        }
        if (p < 1) raf(tick)
        else els.forEach(e => e.el.remove())
      }
      raf(tick)
    },

    // 1. 烟圈
    emitRingEffect() {
      const ctx = this.getShapeCtx()
      if (!ctx.container) return
      const doc = ctx.container.ownerDocument || document
      const H = ctx.H, originX = ctx.originX
      const startY = H * 0.85, endY = H * 0.10
      const particleCount = 64, startRadius = 20, endRadius = 180, puffSize = 16
      this.startDomFilter()
      const ringEls = []
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2
        const el = doc.createElement('div')
        el.style.width = puffSize + 'px'; el.style.height = puffSize + 'px'
        el.className = 'dom-smoke-puff'
        const g = 200 + Math.floor(Math.random() * 40)
        el.style.background = `radial-gradient(circle, rgba(255,255,255,0.75) 0%, rgba(${g},${g},${g},0.35) 40%, transparent 72%)`
        ctx.container.appendChild(el)
        ringEls.push({ el, angle, size: puffSize + Math.random() * 6 })
      }
      const innerCount = 32, innerEls = []
      for (let i = 0; i < innerCount; i++) {
        const angle = (i / innerCount) * Math.PI * 2 + Math.PI / innerCount
        const el = doc.createElement('div')
        el.className = 'dom-smoke-puff'
        el.style.width = '11px'; el.style.height = '11px'
        el.style.background = `radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(200,200,200,0.2) 50%, transparent 75%)`
        ctx.container.appendChild(el)
        innerEls.push({ el, angle, size: 11 })
      }
      const t0 = performance.now()
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / 3500)
        const ease = 1 - Math.pow(1 - p, 2)
        const centerY = startY - ease * (startY - endY)
        const currentRadius = startRadius + ease * (endRadius - startRadius)
        const innerRadius = currentRadius * 0.5
        let alpha = p < 0.05 ? p / 0.05 : 1 - Math.pow((p - 0.05) / 0.95, 1.5)
        const sizeScale = 1 + ease * 2.2
        for (const ring of ringEls) {
          const rx = Math.cos(ring.angle) * currentRadius
          const ry = Math.sin(ring.angle) * currentRadius * 0.35
          const cx = originX + rx, cy = centerY + ry, sz = ring.size * sizeScale
          ring.el.style.left = (cx - sz/2) + 'px'; ring.el.style.top = (cy - sz/2) + 'px'
          ring.el.style.width = sz + 'px'; ring.el.style.height = sz + 'px'
          ring.el.style.opacity = alpha * 0.7
        }
        for (const inner of innerEls) {
          const rx = Math.cos(inner.angle) * innerRadius
          const ry = Math.sin(inner.angle) * innerRadius * 0.35
          const cx = originX + rx, cy = centerY + ry, sz = inner.size * sizeScale * 0.7
          inner.el.style.left = (cx - sz/2) + 'px'; inner.el.style.top = (cy - sz/2) + 'px'
          inner.el.style.width = sz + 'px'; inner.el.style.height = sz + 'px'
          inner.el.style.opacity = alpha * 0.4
        }
        if (p < 1) raf(tick)
        else { ringEls.forEach(e => e.el.remove()); innerEls.forEach(e => e.el.remove()) }
      }
      raf(tick)
    },

    // 2. 爱心形
    emitHeartEffect() {
      const ctx = this.getShapeCtx()
      if (!ctx.container) return
      const doc = ctx.container.ownerDocument || document
      const H = ctx.H, originX = ctx.originX
      const startY = H * 0.85, endY = H * 0.10
      const particleCount = 72, scale = 5, puffSize = 16
      this.startDomFilter()
      const heartEls = []
      for (let i = 0; i < particleCount; i++) {
        const t = (i / particleCount) * Math.PI * 2
        const el = doc.createElement('div')
        el.className = 'dom-smoke-puff'
        el.style.width = puffSize + 'px'; el.style.height = puffSize + 'px'
        const g = 200 + Math.floor(Math.random() * 40)
        el.style.background = `radial-gradient(circle, rgba(255,255,255,0.75) 0%, rgba(${g},${g},${g},0.35) 40%, transparent 72%)`
        ctx.container.appendChild(el)
        heartEls.push({ el, t, size: puffSize + Math.random() * 6 })
      }
      const innerCount = 40, innerEls = []
      for (let i = 0; i < innerCount; i++) {
        const t = (i / innerCount) * Math.PI * 2 + Math.PI / innerCount
        const r = 0.3 + Math.random() * 0.4
        const el = doc.createElement('div')
        el.className = 'dom-smoke-puff'
        el.style.width = '11px'; el.style.height = '11px'
        el.style.background = `radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(200,200,200,0.2) 50%, transparent 75%)`
        ctx.container.appendChild(el)
        innerEls.push({ el, t, r, size: 11 })
      }
      const t0 = performance.now()
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / 3500)
        const ease = 1 - Math.pow(1 - p, 2)
        const centerY = startY - ease * (startY - endY)
        const currentScale = scale + ease * scale * 2.5
        let alpha = p < 0.05 ? p / 0.05 : 1 - Math.pow((p - 0.05) / 0.95, 1.5)
        const sizeScale = 1 + ease * 2.2
        for (const h of heartEls) {
          const hx = currentScale * 16 * Math.pow(Math.sin(h.t), 3)
          const hy = -currentScale * (13*Math.cos(h.t) - 5*Math.cos(2*h.t) - 2*Math.cos(3*h.t) - Math.cos(4*h.t))
          const cx = originX + hx, cy = centerY + hy * 0.35, sz = h.size * sizeScale
          h.el.style.left = (cx-sz/2)+'px'; h.el.style.top = (cy-sz/2)+'px'
          h.el.style.width = sz+'px'; h.el.style.height = sz+'px'
          h.el.style.opacity = alpha * 0.7
        }
        for (const inner of innerEls) {
          const hx = currentScale * 16 * Math.pow(Math.sin(inner.t), 3) * inner.r
          const hy = -currentScale * (13*Math.cos(inner.t) - 5*Math.cos(2*inner.t) - 2*Math.cos(3*inner.t) - Math.cos(4*inner.t)) * inner.r
          const cx = originX + hx, cy = centerY + hy * 0.35, sz = inner.size * sizeScale * 0.7
          inner.el.style.left = (cx-sz/2)+'px'; inner.el.style.top = (cy-sz/2)+'px'
          inner.el.style.width = sz+'px'; inner.el.style.height = sz+'px'
          inner.el.style.opacity = alpha * 0.4
        }
        if (p < 1) raf(tick)
        else { heartEls.forEach(e => e.el.remove()); innerEls.forEach(e => e.el.remove()) }
      }
      raf(tick)
    },

    // 3. 龙卷风
    emitTornadoEffect() {
      const ctx = this.getShapeCtx()
      if (!ctx.container) return
      const doc = ctx.container.ownerDocument || document
      const H = ctx.H, originX = ctx.originX
      const startY = H * 0.85, endY = H * 0.10
      const layerCount = 10, particlesPerLayer = 16, puffSize = 14
      const baseRadius = 25, radiusGrowth = 12
      this.startDomFilter()
      const allEls = []
      for (let li = 0; li < layerCount; li++) {
        const layerRadius = baseRadius + li * radiusGrowth
        for (let i = 0; i < particlesPerLayer; i++) {
          const angle = (i / particlesPerLayer) * Math.PI * 2
          const el = doc.createElement('div')
          el.className = 'dom-smoke-puff'
          el.style.width = puffSize + 'px'; el.style.height = puffSize + 'px'
          const g = 190 + Math.floor(Math.random() * 50)
          const a = 0.6 - li * 0.03
          el.style.background = `radial-gradient(circle, rgba(255,255,255,${a+0.15}) 0%, rgba(${g},${g},${g},${a*0.5}) 40%, transparent 72%)`
          ctx.container.appendChild(el)
          allEls.push({ el, layerIdx: li, angle, layerRadius, size: puffSize + Math.random() * 5 })
        }
      }
      const t0 = performance.now()
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / 4000)
        const ease = 1 - Math.pow(1 - p, 2)
        const centerY = startY - ease * (startY - endY)
        const rotation = p * 3 * Math.PI * 2
        const scale = 1 + ease * 2.5
        let alpha = p < 0.05 ? p / 0.05 : 1 - Math.pow((p - 0.05) / 0.95, 1.5)
        const sizeScale = 1 + ease * 2
        const tornadoHeight = 200 * scale
        for (const pt of allEls) {
          const currentAngle = pt.angle + rotation + pt.layerIdx * 0.5
          const rx = Math.cos(currentAngle) * pt.layerRadius * scale
          const ry = -(pt.layerIdx / layerCount) * tornadoHeight * 0.6
          const cx = originX + rx, cy = centerY + ry, sz = pt.size * sizeScale
          pt.el.style.left = (cx-sz/2)+'px'; pt.el.style.top = (cy-sz/2)+'px'
          pt.el.style.width = sz+'px'; pt.el.style.height = sz+'px'
          pt.el.style.opacity = alpha * (0.7 - pt.layerIdx * 0.04)
        }
        if (p < 1) raf(tick)
        else allEls.forEach(e => e.el.remove())
      }
      raf(tick)
    },

    // 4. 星形
    emitStarEffect() {
      this.animateShapeEffect({
        particleCount: 80, puffSize: 14, totalLife: 3500, opacityMul: 0.7,
        getPos: (i, count, p, ease, scale, cy, originX) => {
          const angle = (i / count) * Math.PI * 2 - Math.PI / 2
          const isOuter = i % 2 === 0
          const r = (isOuter ? 80 : 35) * scale
          return { x: originX + Math.cos(angle) * r, y: cy + Math.sin(angle) * r * 0.35 }
        }
      })
    },

    // 5. 蘑菇云
    emitMushroomEffect() {
      const ctx = this.getShapeCtx()
      if (!ctx.container) return
      const doc = ctx.container.ownerDocument || document
      const H = ctx.H, originX = ctx.originX
      const startY = H * 0.85, endY = H * 0.10
      const count = 100
      this.startDomFilter()
      const els = []
      for (let i = 0; i < count; i++) {
        const el = doc.createElement('div')
        el.className = 'dom-smoke-puff'
        const sz = 12 + Math.random() * 8
        el.style.width = sz + 'px'; el.style.height = sz + 'px'
        const g = 195 + Math.floor(Math.random() * 45)
        el.style.background = `radial-gradient(circle, rgba(255,255,255,0.75) 0%, rgba(${g},${g},${g},0.35) 40%, transparent 72%)`
        ctx.container.appendChild(el)
        els.push({ el, i, size: sz })
      }
      const t0 = performance.now()
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / 4000)
        const ease = 1 - Math.pow(1 - p, 2)
        const cy = startY - ease * (startY - endY)
        let alpha = p < 0.05 ? p / 0.05 : 1 - Math.pow((p - 0.05) / 0.95, 1.5)
        const scale = 1 + ease * 2.5
        for (const pt of els) {
          const ratio = pt.i / count
          let rx, ry
          if (ratio < 0.3) {
            const a = (ratio / 0.3) * Math.PI * 2
            rx = Math.cos(a) * 15 * scale
            ry = Math.sin(a) * 15 * scale * 0.3 + ease * 80
          } else {
            const a = ((ratio - 0.3) / 0.7) * Math.PI * 2
            const r = (40 + (ratio - 0.3) * 60) * scale
            rx = Math.cos(a) * r
            ry = Math.sin(a) * r * 0.35 - ease * 30
          }
          const sz = pt.size * (1 + ease * 2)
          pt.el.style.left = (originX+rx-sz/2)+'px'; pt.el.style.top = (cy+ry-sz/2)+'px'
          pt.el.style.width = sz+'px'; pt.el.style.height = sz+'px'
          pt.el.style.opacity = alpha * 0.7
        }
        if (p < 1) raf(tick)
        else els.forEach(e => e.el.remove())
      }
      raf(tick)
    },

    // 6. 双螺旋
    emitDoubleHelixEffect() {
      this.animateShapeEffect({
        particleCount: 100, puffSize: 12, totalLife: 4000, opacityMul: 0.65,
        getPos: (i, count, p, ease, scale, cy, originX) => {
          const t = (i / count) * Math.PI * 6
          const strand = i % 2 === 0 ? 1 : -1
          const r = 35 * scale
          const rx = Math.cos(t + p * Math.PI * 4) * r * strand
          const ry = (i / count - 0.5) * 200 * scale * 0.35
          return { x: originX + rx, y: cy + ry }
        }
      })
    },

    // 7. 烟花扩散
    emitFireworkEffect() {
      const ctx = this.getShapeCtx()
      if (!ctx.container) return
      const doc = ctx.container.ownerDocument || document
      const H = ctx.H, originX = ctx.originX
      const count = 120
      this.startDomFilter()
      const els = []
      for (let i = 0; i < count; i++) {
        const el = doc.createElement('div')
        el.className = 'dom-smoke-puff'
        const sz = 10 + Math.random() * 10
        el.style.width = sz + 'px'; el.style.height = sz + 'px'
        const g = 195 + Math.floor(Math.random() * 45)
        el.style.background = `radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(${g},${g},${g},0.35) 35%, transparent 70%)`
        ctx.container.appendChild(el)
        const angle = Math.random() * Math.PI * 2
        const speed = 50 + Math.random() * 150
        els.push({ el, size: sz, angle, speed, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed })
      }
      const t0 = performance.now()
      const cx = originX, cy = H * 0.45
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / 3000)
        const ease = 1 - Math.pow(1 - p, 3)
        let alpha = p < 0.03 ? p / 0.03 : 1 - Math.pow((p - 0.03) / 0.97, 1.2)
        for (const pt of els) {
          const dist = ease * pt.speed * 2
          const x = cx + pt.vx / pt.speed * dist
          const y = cy + pt.vy / pt.speed * dist + ease * 30
          const sz = pt.size * (1 + ease * 1.5)
          pt.el.style.left = (x-sz/2)+'px'; pt.el.style.top = (y-sz/2)+'px'
          pt.el.style.width = sz+'px'; pt.el.style.height = sz+'px'
          pt.el.style.opacity = alpha * 0.7
        }
        if (p < 1) raf(tick)
        else els.forEach(e => e.el.remove())
      }
      raf(tick)
    },

    // 8. 蛇形蜿蜒
    emitSnakeEffect() {
      this.animateShapeEffect({
        particleCount: 80, puffSize: 13, totalLife: 4000, opacityMul: 0.7,
        getPos: (i, count, p, ease, scale, cy, originX) => {
          const t = i / count
          const waveX = Math.sin(t * Math.PI * 4 + p * Math.PI * 6) * 60 * scale
          const waveY = (t - 0.5) * 180 * scale * 0.35
          return { x: originX + waveX, y: cy + waveY }
        }
      })
    },

    // 9. 水母状
    emitJellyfishEffect() {
      const ctx = this.getShapeCtx()
      if (!ctx.container) return
      const doc = ctx.container.ownerDocument || document
      const H = ctx.H, originX = ctx.originX
      const startY = H * 0.85, endY = H * 0.10
      const count = 90
      this.startDomFilter()
      const els = []
      for (let i = 0; i < count; i++) {
        const el = doc.createElement('div')
        el.className = 'dom-smoke-puff'
        const sz = 12 + Math.random() * 6
        el.style.width = sz + 'px'; el.style.height = sz + 'px'
        const g = 195 + Math.floor(Math.random() * 45)
        el.style.background = `radial-gradient(circle, rgba(255,255,255,0.75) 0%, rgba(${g},${g},${g},0.35) 40%, transparent 72%)`
        ctx.container.appendChild(el)
        els.push({ el, i, size: sz })
      }
      const t0 = performance.now()
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / 4000)
        const ease = 1 - Math.pow(1 - p, 2)
        const cy = startY - ease * (startY - endY)
        let alpha = p < 0.05 ? p / 0.05 : 1 - Math.pow((p - 0.05) / 0.95, 1.5)
        const scale = 1 + ease * 2.5
        for (const pt of els) {
          const ratio = pt.i / count
          let rx, ry
          if (ratio < 0.5) {
            const a = (ratio / 0.5) * Math.PI
            const r = 55 * scale
            rx = Math.cos(a) * r - r
            ry = -Math.sin(a) * r * 0.5
          } else {
            const tentacle = Math.floor((ratio - 0.5) / 0.5 * 6)
            const t = ((ratio - 0.5) / 0.5 * 6 - tentacle)
            const baseX = (tentacle - 2.5) * 18 * scale
            rx = baseX + Math.sin(t * Math.PI * 3 + p * 8) * 10 * scale
            ry = t * 100 * scale * 0.35
          }
          const sz = pt.size * (1 + ease * 2)
          pt.el.style.left = (originX+rx-sz/2)+'px'; pt.el.style.top = (cy+ry-sz/2)+'px'
          pt.el.style.width = sz+'px'; pt.el.style.height = sz+'px'
          pt.el.style.opacity = alpha * 0.65
        }
        if (p < 1) raf(tick)
        else els.forEach(e => e.el.remove())
      }
      raf(tick)
    },

    // 10. 文字烟雾
    emitTextEffect() {
      const textPoints = []
      const canvas = document.createElement('canvas')
      canvas.width = 300; canvas.height = 80
      const tctx = canvas.getContext('2d')
      tctx.fillStyle = '#fff'
      tctx.font = 'bold 60px Arial'
      tctx.textAlign = 'center'
      tctx.fillText('SMOKE', 150, 58)
      const data = tctx.getImageData(0, 0, 300, 80).data
      for (let y = 0; y < 80; y += 3) {
        for (let x = 0; x < 300; x += 3) {
          if (data[(y * 300 + x) * 4 + 3] > 128) {
            textPoints.push({ x: (x - 150) * 0.8, y: (y - 40) * 0.8 })
          }
        }
      }
      this.animateShapeEffect({
        particleCount: textPoints.length, puffSize: 10, totalLife: 4000, opacityMul: 0.7,
        getPos: (i, count, p, ease, scale, cy, originX) => {
          const pt = textPoints[i] || { x: 0, y: 0 }
          return { x: originX + pt.x * scale, y: cy + pt.y * scale * 0.35 }
        }
      })
    },

    // 11. 瀑布流
    emitWaterfallEffect() {
      const ctx = this.getShapeCtx()
      if (!ctx.container) return
      const doc = ctx.container.ownerDocument || document
      const H = ctx.H, originX = ctx.originX
      const count = 100
      this.startDomFilter()
      const els = []
      for (let i = 0; i < count; i++) {
        const el = doc.createElement('div')
        el.className = 'dom-smoke-puff'
        const sz = 12 + Math.random() * 8
        el.style.width = sz + 'px'; el.style.height = sz + 'px'
        const g = 195 + Math.floor(Math.random() * 45)
        el.style.background = `radial-gradient(circle, rgba(255,255,255,0.75) 0%, rgba(${g},${g},${g},0.35) 40%, transparent 72%)`
        ctx.container.appendChild(el)
        els.push({ el, i, size: sz, xOff: (Math.random()-0.5)*120, speed: 0.5+Math.random()*0.5 })
      }
      const t0 = performance.now()
      const topY = H * 0.1, bottomY = H * 0.85
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / 4000)
        let alpha = p < 0.05 ? p / 0.05 : 1 - Math.pow((p - 0.05) / 0.95, 1.5)
        const scale = 1 + p * 1.5
        for (const pt of els) {
          const fallP = Math.min(1, p * pt.speed * 1.5)
          const y = topY + fallP * (bottomY - topY)
          const x = originX + pt.xOff * scale + Math.sin(fallP * 4 + pt.i) * 15
          const sz = pt.size * scale
          pt.el.style.left = (x-sz/2)+'px'; pt.el.style.top = (y-sz/2)+'px'
          pt.el.style.width = sz+'px'; pt.el.style.height = sz+'px'
          pt.el.style.opacity = alpha * 0.65
        }
        if (p < 1) raf(tick)
        else els.forEach(e => e.el.remove())
      }
      raf(tick)
    },

    // 12. 分散飘散
    emitScatterEffect() {
      const ctx = this.getShapeCtx()
      if (!ctx.container) return
      const doc = ctx.container.ownerDocument || document
      const H = ctx.H, originX = ctx.originX
      const count = 80
      this.startDomFilter()
      const els = []
      for (let i = 0; i < count; i++) {
        const el = doc.createElement('div')
        el.className = 'dom-smoke-puff'
        const sz = 14 + Math.random() * 10
        el.style.width = sz + 'px'; el.style.height = sz + 'px'
        const g = 195 + Math.floor(Math.random() * 45)
        el.style.background = `radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(${g},${g},${g},0.35) 35%, transparent 70%)`
        ctx.container.appendChild(el)
        const angle = Math.random() * Math.PI * 2
        const dist = 80 + Math.random() * 200
        els.push({ el, size: sz, angle, dist, drift: (Math.random()-0.5)*60 })
      }
      const t0 = performance.now()
      const cx = originX, cy = H * 0.5
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / 4500)
        const ease = 1 - Math.pow(1 - p, 2)
        let alpha = p < 0.05 ? p / 0.05 : 1 - Math.pow((p - 0.05) / 0.95, 1.3)
        for (const pt of els) {
          const d = ease * pt.dist
          const x = cx + Math.cos(pt.angle) * d + pt.drift * ease
          const y = cy + Math.sin(pt.angle) * d * 0.6 - ease * 50
          const sz = pt.size * (1 + ease * 2)
          pt.el.style.left = (x-sz/2)+'px'; pt.el.style.top = (y-sz/2)+'px'
          pt.el.style.width = sz+'px'; pt.el.style.height = sz+'px'
          pt.el.style.opacity = alpha * 0.7
        }
        if (p < 1) raf(tick)
        else els.forEach(e => e.el.remove())
      }
      raf(tick)
    },

    // ---- 派烟 ----
    passCig() {
      this.showPassModal = true
      this.playClick()
    },

    confirmPass() {
      this.showPassModal = false
    },

    // ---- Toast ----
    showToastMsg(msg) {
      this.toastMsg = msg
      this.showToast = true
      if (this.toastTimer) clearTimeout(this.toastTimer)
      this.toastTimer = setTimeout(() => { this.showToast = false }, 2000)
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
  position: relative;
  overflow: hidden;
}

/* 返回按钮 */
.smoke-back-btn {
  position: absolute;
  top: 80rpx;
  left: 40rpx;
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 100;
}

.smoke-back-btn:active {
  background: rgba(255, 255, 255, 0.12);
  transform: scale(0.92);
}

.smoke-back-icon {
  font-size: 48rpx;
  color: #f3f4f6;
}

/* 肺部承受力可视化 */
.lung-container {
  position: absolute;
  top: 160rpx;
  left: 30rpx;
  width: 290rpx;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 24rpx;
  padding: 24rpx;
  backdrop-filter: blur(10rpx);
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 10;
}

.lung-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.lung-icon {
  position: relative;
  width: 240rpx;
  height: 200rpx;
}

.lung-canvas {
  width: 240rpx;
  height: 200rpx;
}

.lung-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.lung-label {
  font-size: 22rpx;
  color: var(--text-dim);
}

.lung-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #10b981;
  transition: color 0.3s ease;
}

.lung-value.lung-warning {
  color: var(--primary-2);
  animation: textPulse 1.5s ease-in-out infinite;
}

.lung-alert {
  margin-top: 12rpx;
  padding: 8rpx 12rpx;
  background: rgba(239, 68, 68, 0.2);
  border-radius: 12rpx;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.lung-alert-text {
  font-size: 20rpx;
  color: #ef4444;
  text-align: center;
}

@keyframes textPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
}

/* 背景火光（由亮渐灭，吸烟时更亮） */
.bg-ember-glow {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0;
  transition: opacity 0.8s ease;
  background: radial-gradient(
    ellipse 80% 60% at 50% 42%,
    rgba(255, 140, 30, 0.25) 0%,
    rgba(255, 90, 15, 0.15) 25%,
    rgba(220, 60, 10, 0.08) 45%,
    rgba(180, 40, 0, 0.03) 65%,
    transparent 85%
  );
}

/* 燃烧进度条 */
.burn-progress {
  position: absolute;
  bottom: 200rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 320rpx;
  height: 8rpx;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8rpx;
  z-index: 30;
  overflow: visible;
}

.burn-progress-bar {
  height: 100%;
  border-radius: 8rpx;
  background: linear-gradient(90deg, var(--primary) 0%, #ef4444 100%);
  transition: width 0.3s ease;
  box-shadow: 0 0 8rpx rgba(245, 158, 11, 0.5);
}

.burn-progress-text {
  position: absolute;
  top: -36rpx;
  right: 0;
  font-size: 20rpx;
  color: var(--text-dim);
  white-space: nowrap;
}

.canvas-wrapper {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
}

.smoke-canvas {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
}
    .sprite-canvas { position: absolute; left: -9999px; top: 0; width: 128px; height: 128px; }

/* ---- SVG 滤镜 ---- */
.smoke-svg-filter {
  position: absolute;
  width: 0; height: 0;
  overflow: hidden;
}

/* ---- DOM 烟雾层 ---- */
.dom-smoke-layer {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  overflow: hidden;
  filter: url('#smoke-filter');
  z-index: 8;
}

.dom-smoke-layer.hidden {
  display: none;
}

.dom-smoke-wrap {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
}

.dom-smoke-puff {
  position: absolute;
  border-radius: 50%;
  will-change: transform, opacity;
  pointer-events: none;
}

.dom-smoke-puff.anim {
  animation-name: domSmokeRise;
  animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
  animation-fill-mode: forwards;
}

@keyframes domSmokeRise {
  0% {
    transform: translate3d(0, 0, 0) scale(var(--ds, 0.15));
    opacity: 0;
  }
  12% {
    opacity: var(--do, 0.8);
  }
  45% {
    transform: translate3d(calc(var(--dd, 0px) * 0.5), calc(var(--dr, -50vh) * 0.5), 0) scale(calc(var(--ds, 0.15) * 8));
    opacity: calc(var(--do, 0.8) * 0.9);
  }
  80% {
    transform: translate3d(calc(var(--dd, 0px) * 0.85), calc(var(--dr, -50vh) * 0.85), 0) scale(calc(var(--ds, 0.15) * 14));
    opacity: calc(var(--do, 0.8) * 0.5);
  }
  100% {
    transform: translate3d(var(--dd, 0px), var(--dr, -50vh), 0) scale(calc(var(--ds, 0.15) * 18));
    opacity: 0;
    filter: blur(16px) contrast(160%);
  }
}



/* ---- 提示 ---- */
.smoke-hint {
  position: absolute;
  bottom: 320rpx; left: 0; right: 0;
  text-align: center;
  z-index: 30;
}

.smoke-hint text {
  font-size: 28rpx;
  color: var(--text-dim);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ---- 顶部状态栏 ---- */
.smoke-dashboard {
  position: absolute;
  top: 0; left: 0; right: 0;
  z-index: 30;
  padding: 80rpx 40rpx 24rpx;
  background: linear-gradient(to bottom, rgba(15,15,15,0.9) 0%, transparent 100%);
}

.sd-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.sd-label {
  font-size: 24rpx;
  color: var(--text-dim);
}

.sd-val {
  font-size: 28rpx;
  color: var(--primary);
  font-weight: bold;
}

/* ---- 工具栏 ---- */
.smoke-tools {
  position: absolute;
  right: 16rpx;
  top: 50%;
  transform: translateY(-50%);
  z-index: 40;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
}

.smoke-tools.show {
  opacity: 1;
  pointer-events: auto;
}

.st-tool {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  background: transparent;
  border: none;
  color: #d4d4d4;
  padding: 8rpx 12rpx;
  cursor: pointer;
  transition: transform 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.st-tool:active {
  transform: scale(0.92);
}

.st-tool-ic {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: rgba(40, 40, 40, 0.85);
  border: 1px solid #3a3a3a;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c0c0c0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  transition: all 0.2s ease;
  font-size: 40rpx;
}

.st-tool.active .st-tool-ic {
  background: rgba(245, 158, 11, 0.15);
  border-color: var(--primary);
  color: var(--primary);
  box-shadow: 0 0 14px rgba(245, 158, 11, 0.35);
}

.st-tool:active .st-tool-ic {
  background: rgba(245, 158, 11, 0.25);
}

.st-tool-lbl {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 136rpx;
}

.st-tool-name {
  font-size: 22rpx;
  color: #d4d4d4;
  line-height: 1.1;
  font-weight: 500;
}

.st-tool-val {
  font-size: 20rpx;
  color: #8a8a8a;
  line-height: 1.1;
}

.st-tool.active .st-tool-val {
  color: var(--primary);
}

/* ---- 派烟弹窗 ---- */
.pass-modal {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  padding: 0 48rpx;
}

.pass-card {
  background-color: var(--surface-1);
  border: 1px solid var(--border);
  border-radius: 32rpx;
  padding: 48rpx;
  width: 100%;
  text-align: center;
}

.pass-emoji {
  font-size: 96rpx;
  display: block;
  margin-bottom: 24rpx;
}

.pass-title {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #f3f4f6;
  margin-bottom: 8rpx;
}

.pass-desc {
  display: block;
  font-size: 28rpx;
  color: var(--text-dim);
  margin-bottom: 32rpx;
}

.pass-btns {
  display: flex;
  gap: 16rpx;
}

.pass-btn {
  flex: 1;
  padding: 16rpx;
  border-radius: 16rpx;
  font-size: 28rpx;
  border: none;
}

.pass-undo {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
}

.pass-confirm {
  background: var(--primary);
  color: var(--bg);
  font-weight: bold;
}

/* ---- Toast ---- */
.toast {
  position: fixed;
  top: 160rpx; left: 50%;
  transform: translateX(-50%);
  background-color: var(--border);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 28rpx;
  padding: 16rpx 32rpx;
  border-radius: 24rpx;
  z-index: 200;
}

/* ---- 花样选择器 ---- */
.style-picker-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
}

.style-picker-mask.show {
  opacity: 1;
  pointer-events: auto;
}

.style-picker {
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 24rpx;
  padding: 32rpx;
  width: 620rpx;
  max-height: 80vh;
  overflow-y: auto;
}

.picker-title {
  display: block;
  text-align: center;
  font-size: 32rpx;
  color: var(--primary);
  font-weight: bold;
  margin-bottom: 24rpx;
}

.picker-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  justify-content: center;
}

.picker-item {
  width: 130rpx;
  height: 130rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--surface-2);
  border: 2px solid #333;
  border-radius: 16rpx;
  cursor: pointer;
  transition: all 0.2s;
}

.picker-item.active {
  border-color: var(--primary);
  background: rgba(245, 158, 11, 0.1);
  box-shadow: 0 0 12rpx rgba(245, 158, 11, 0.3);
}

.picker-item:active {
  transform: scale(0.95);
}

.picker-icon {
  font-size: 40rpx;
  line-height: 1.2;
}

.picker-name {
  font-size: 20rpx;
  color: var(--text-dim);
  margin-top: 4rpx;
}

.picker-item.active .picker-name {
  color: var(--primary);
}

/* ======== 2D 香烟样式（抽烟场景专用） ======== */

:root,
page {
  --cig-width: 46px;
  --cig-total-h: 520px;
  --cig-filter-h: 160px;
  --cig-paper-h: 360px;
}

/* 香烟容器：垂直居中，flex列排列 */
.cigarette-3d {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: var(--cig-width);
  height: var(--cig-total-h);
  z-index: 5;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cigarette-3d.hidden {
  display: none;
}

/* 地面投影 */
.cigarette-ground-shadow {
  position: absolute;
  bottom: -28px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(var(--cig-width) * 1.6);
  height: 16px;
  background: radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.12) 50%, transparent 80%);
  filter: blur(3px);
  pointer-events: none;
}

/* 纸身 + 过滤嘴 通用容器 */
.cig-flat {
  position: relative;
  width: var(--cig-width);
}

/* 纸身（上部，约4/5） */
.cig-flat-paper {
  flex: 1;
  width: var(--cig-width);
  background:
    repeating-linear-gradient(
      0deg,
      transparent 0px,
      transparent 2px,
      rgba(160, 150, 135, 0.05) 2px,
      rgba(160, 150, 135, 0.05) 3px
    ),
    linear-gradient(90deg,
      #c8c0b4 0%,
      #ddd5c8 15%,
      #ede6da 35%,
      #f2ece2 50%,
      #ede6da 65%,
      #ddd5c8 85%,
      #c8c0b4 100%
    );
  border-radius: 2px 2px 0 0;
  box-shadow:
    inset -2px 0 3px rgba(0,0,0,0.08),
    inset 2px 0 3px rgba(255,255,255,0.5);
  overflow: hidden;
}

/* 过滤嘴（下部，约1/5） */
.cig-flat-filter {
  width: var(--cig-width);
  height: var(--cig-filter-h);
  background:
    repeating-linear-gradient(
      50deg,
      transparent 0px,
      transparent 3px,
      rgba(80, 58, 28, 0.22) 3px,
      rgba(80, 58, 28, 0.22) 4px
    ),
    linear-gradient(90deg,
      #7a5e30 0%,
      #967640 12%,
      #b89455 30%,
      #c9a56a 45%,
      #d4b078 50%,
      #c9a56a 55%,
      #b89455 70%,
      #967640 88%,
      #7a5e30 100%
    );
  border-radius: 0 0 3px 3px;
  box-shadow:
    inset -2px 0 4px rgba(0,0,0,0.22),
    inset 2px 0 4px rgba(255,255,255,0.35);
  overflow: hidden;
}

/* 金环：纸身与过滤嘴交界处 */
.cig-flat-band {
  position: absolute;
  bottom: 0;
  left: -1px;
  width: calc(100% + 2px);
  height: 3px;
  background: linear-gradient(90deg,
    #5a4820 0%,
    #8a7030 12%,
    #c0a050 30%,
    #e8d478 50%,
    #c0a050 70%,
    #8a7030 88%,
    #5a4820 100%);
  z-index: 4;
}

/* 烟头截面（未点火时显示烟丝） */
.cig-flat-burn {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%) translateY(-50%);
  width: var(--cig-width);
  height: calc(var(--cig-width) * 0.48);
  border-radius: 50%;
  background:
    repeating-linear-gradient(
      35deg,
      transparent 0px,
      transparent 1.5px,
      rgba(139, 90, 43, 0.4) 1.5px,
      rgba(139, 90, 43, 0.4) 2px
    ),
    repeating-linear-gradient(
      -25deg,
      transparent 0px,
      transparent 2px,
      rgba(160, 100, 50, 0.3) 2px,
      rgba(160, 100, 50, 0.3) 2.5px
    ),
    repeating-linear-gradient(
      75deg,
      transparent 0px,
      transparent 1px,
      rgba(180, 120, 60, 0.25) 1px,
      rgba(180, 120, 60, 0.25) 1.5px
    ),
    radial-gradient(ellipse at 48% 45%,
      #d4a55a 0%,
      #c49545 25%,
      #a87832 50%,
      #8b6020 75%,
      #6b4815 100%
    );
  z-index: 3;
  box-shadow:
    inset 0 -2px 3px rgba(0,0,0,0.35),
    inset 0 1px 2px rgba(255,255,255,0.2);
}

/* 烟丝上的深色碎点（烟草颗粒） */
.cig-flat-burn::after {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 40%, rgba(80, 45, 15, 0.7) 0.8px, transparent 1.5px),
    radial-gradient(circle at 65% 35%, rgba(90, 55, 20, 0.6) 0.6px, transparent 1.2px),
    radial-gradient(circle at 45% 60%, rgba(70, 40, 10, 0.5) 0.7px, transparent 1.3px),
    radial-gradient(circle at 75% 55%, rgba(85, 50, 18, 0.6) 0.5px, transparent 1px),
    radial-gradient(circle at 20% 65%, rgba(75, 42, 12, 0.5) 0.6px, transparent 1.1px),
    radial-gradient(circle at 55% 30%, rgba(95, 58, 22, 0.4) 0.8px, transparent 1.4px),
    radial-gradient(circle at 80% 70%, rgba(65, 38, 8, 0.5) 0.5px, transparent 1px);
  pointer-events: none;
}

/* 燃烧核心（椭圆火光，与烟身同宽） */
.cig-flat-burn-core {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(ellipse 55% 70% at 50% 55%,
    #fff8dc 0%,
    #ffdd66 10%,
    #ff8c1a 26%,
    #d04000 50%,
    #8b2000 72%,
    transparent 100%);
  opacity: 0;
  transition: opacity 0.25s;
  filter: blur(0.5px);
}

/* 点燃时火光：自然闪烁 */
.cigarette-3d.lit .cig-flat-burn-core,
.cigarette-3d.smoking .cig-flat-burn-core {
  opacity: 1;
  animation: emberFlicker 0.4s ease-in-out infinite;
}

/* 吸烟时火星更亮更强烈 */
.cigarette-3d.smoking .cig-flat-burn-core {
  animation: emberFlickerIntense 0.3s ease-in-out infinite;
  background: radial-gradient(ellipse at 50% 50%,
    rgba(255, 255, 200, 1) 0%,
    rgba(255, 200, 80, 0.95) 25%,
    rgba(255, 120, 20, 0.85) 50%,
    rgba(200, 50, 0, 0.6) 80%,
    rgba(100, 20, 0, 0.3) 100%);
}

/* 自然火光闪烁：不规则亮度变化 */
@keyframes emberFlicker {
  0% { filter: blur(0.3px) brightness(0.9); }
  15% { filter: blur(0.5px) brightness(1.2); }
  30% { filter: blur(0.2px) brightness(0.85); }
  50% { filter: blur(0.8px) brightness(1.4); }
  65% { filter: blur(0.4px) brightness(1.0); }
  80% { filter: blur(0.6px) brightness(1.3); }
  100% { filter: blur(0.3px) brightness(0.95); }
}

/* 吸烟时火光：更强烈更不规则 */
@keyframes emberFlickerIntense {
  0% { filter: blur(0.2px) brightness(1.1); }
  20% { filter: blur(0.8px) brightness(1.6); }
  35% { filter: blur(0.3px) brightness(1.0); }
  55% { filter: blur(1.2px) brightness(2.0); }
  70% { filter: blur(0.5px) brightness(1.3); }
  85% { filter: blur(0.9px) brightness(1.8); }
  100% { filter: blur(0.3px) brightness(1.15); }
}

/* 点燃时内光晕：自然呼吸 */
.cigarette-3d.lit .cig-flat-burn::after,
.cigarette-3d.smoking .cig-flat-burn::after {
  content: '';
  position: absolute;
  inset: -8px -14px -8px -14px;
  border-radius: 50%;
  background: radial-gradient(ellipse 60% 70% at 50% 50%,
    rgba(255, 220, 100, 0.5) 0%,
    rgba(255, 140, 30, 0.38) 28%,
    rgba(255, 60, 0, 0.18) 52%,
    transparent 72%);
  animation: emberPulse 0.6s ease-in-out infinite;
  pointer-events: none;
}

/* 吸烟时内光晕更强更大 */
.cigarette-3d.smoking .cig-flat-burn::after {
  inset: -12px -20px -12px -20px;
  background: radial-gradient(ellipse 65% 75% at 50% 50%,
    rgba(255, 240, 140, 0.7) 0%,
    rgba(255, 180, 50, 0.55) 25%,
    rgba(255, 100, 20, 0.35) 48%,
    rgba(255, 40, 0, 0.15) 65%,
    transparent 80%);
  animation: emberPulseIntense 0.4s ease-in-out infinite;
}

/* 自然光晕呼吸 */
@keyframes emberPulse {
  0% { opacity: 0.6; transform: scale(0.9); }
  25% { opacity: 0.85; transform: scale(1.05); }
  50% { opacity: 0.7; transform: scale(0.95); }
  75% { opacity: 1; transform: scale(1.1); }
  100% { opacity: 0.65; transform: scale(0.92); }
}

/* 吸烟时强烈光晕脉动 */
@keyframes emberPulseIntense {
  0% { opacity: 0.75; transform: scale(0.92); }
  30% { opacity: 1; transform: scale(1.15); }
  60% { opacity: 0.85; transform: scale(1.0); }
  100% { opacity: 1; transform: scale(1.2); }
}

/* 整体火光晕（外层，扁椭圆向外扩散） */
.cigarette-3d.lit::before,
.cigarette-3d.smoking::before {
  content: '';
  position: absolute;
  top: -32px;
  left: 50%;
  transform: translateX(-50%);
  width: 90px;
  height: 56px;
  background: radial-gradient(ellipse 50% 50% at 50% 50%,
    rgba(255, 200, 60, 0.45) 0%,
    rgba(255, 120, 20, 0.3) 32%,
    rgba(255, 60, 0, 0.12) 55%,
    transparent 75%);
  pointer-events: none;
  animation: emberGlow 0.8s ease-in-out infinite;
  z-index: 4;
}

/* 吸烟时外层光晕更大更亮 */
.cigarette-3d.smoking::before {
  width: 120px;
  height: 72px;
  top: -40px;
  background: radial-gradient(ellipse 55% 55% at 50% 50%,
    rgba(255, 220, 80, 0.65) 0%,
    rgba(255, 150, 30, 0.45) 30%,
    rgba(255, 80, 10, 0.22) 52%,
    transparent 72%);
  animation: emberGlowIntense 0.5s ease-in-out infinite;
}

/* 外层光晕自然扩散 */
@keyframes emberGlow {
  0% { opacity: 0.6; transform: translateX(-50%) scale(0.92); }
  30% { opacity: 0.85; transform: translateX(-50%) scale(1.08); }
  60% { opacity: 0.7; transform: translateX(-50%) scale(0.98); }
  100% { opacity: 0.95; transform: translateX(-50%) scale(1.15); }
}

/* 吸烟时外层强烈光晕 */
@keyframes emberGlowIntense {
  0% { opacity: 0.7; transform: translateX(-50%) scale(0.95); }
  25% { opacity: 1; transform: translateX(-50%) scale(1.2); }
  55% { opacity: 0.8; transform: translateX(-50%) scale(1.05); }
  100% { opacity: 1; transform: translateX(-50%) scale(1.25); }
}

/* 烟灰柱：从燃烧端顶部向上延伸，蘑菇状 */
.cig-flat-ash {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translateX(-50%) translateY(-100%);
  width: var(--cig-width);
  transform-origin: bottom center;
  background:
    linear-gradient(88deg,
      transparent 0%,
      transparent 35%,
      rgba(40, 35, 30, 0.15) 35.5%,
      rgba(40, 35, 30, 0.15) 36%,
      transparent 36.5%,
      transparent 62%,
      rgba(35, 30, 25, 0.12) 62.3%,
      rgba(35, 30, 25, 0.12) 62.8%,
      transparent 63.3%,
      transparent 100%),
    repeating-linear-gradient(to top,
      transparent 0px,
      transparent 4px,
      rgba(45, 40, 35, 0.22) 4px,
      rgba(45, 40, 35, 0.22) 5px,
      rgba(65, 60, 55, 0.12) 5px,
      rgba(65, 60, 55, 0.12) 6px,
      transparent 6px,
      transparent 11px),
    repeating-linear-gradient(78deg,
      transparent 0px,
      transparent 3px,
      rgba(40, 35, 30, 0.08) 3px,
      rgba(40, 35, 30, 0.08) 3.5px,
      transparent 3.5px,
      transparent 7px),
    linear-gradient(to top,
      #2a2520 0%,
      #3a3530 6%,
      #4a4540 14%,
      #5a5550 24%,
      #6a6560 36%,
      #7a7570 48%,
      #8a8580 60%,
      #9a9590 74%,
      #a8a3a0 86%,
      #b5b0ab 100%);
  opacity: 0;
  transition: opacity 0.35s ease, height 0.4s ease-out;
  pointer-events: none;
  z-index: 6;
  border-radius: 2px 2px 0 0;
  clip-path: polygon(
    0% 100%, 100% 100%,
    100% 96%, 98% 92%, 101% 86%, 97% 80%, 99% 74%,
    96% 68%, 98% 62%, 95% 56%, 97% 50%, 94% 44%,
    96% 38%, 93% 32%, 95% 26%, 91% 20%, 88% 14%,
    84% 9%, 78% 5%, 70% 2%, 60% 0%,
    52% 3%, 46% 1%, 40% 4%, 34% 2%, 28% 5%,
    22% 9%, 16% 14%, 12% 20%, 8% 26%, 6% 32%,
    4% 38%, 5% 44%, 3% 50%, 5% 56%, 2% 62%,
    4% 68%, 1% 74%, 3% 80%, 0% 86%, 2% 92%,
    0% 96%, 0% 100%
  );
  filter: blur(0.2px);
  box-shadow: 
    inset 0 -3px 5px rgba(0, 0, 0, 0.35),
    inset 0 1px 2px rgba(255, 255, 255, 0.08),
    inset 2px 0 4px rgba(0, 0, 0, 0.12),
    inset -2px 0 4px rgba(0, 0, 0, 0.12);
}

/* 烟灰堆积层：不规则裂纹 + 颗粒感 + 微小火光 */
.cig-flat-ash::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 70% 18% at 50% 96%,
      rgba(255, 130, 35, 0.55) 0%,
      rgba(220, 95, 18, 0.35) 25%,
      rgba(180, 65, 12, 0.2) 45%,
      rgba(120, 45, 8, 0.1) 65%,
      transparent 90%),
    linear-gradient(115deg,
      transparent 0%,
      transparent 28%,
      rgba(35, 30, 25, 0.18) 28.5%,
      rgba(35, 30, 25, 0.18) 29%,
      transparent 29.5%,
      transparent 55%,
      rgba(40, 35, 30, 0.15) 55.3%,
      rgba(40, 35, 30, 0.15) 55.8%,
      transparent 56.3%,
      transparent 78%,
      rgba(35, 30, 25, 0.12) 78.2%,
      rgba(35, 30, 25, 0.12) 78.6%,
      transparent 79%,
      transparent 100%),
    radial-gradient(circle at 22% 10%, rgba(55,50,45,0.5) 1px, transparent 2px),
    radial-gradient(circle at 72% 22%, rgba(65,60,55,0.45) 1.2px, transparent 2.5px),
    radial-gradient(circle at 35% 35%, rgba(50,45,40,0.55) 1px, transparent 2px),
    radial-gradient(circle at 80% 48%, rgba(60,55,50,0.4) 1px, transparent 2px),
    radial-gradient(circle at 15% 62%, rgba(45,40,35,0.5) 1px, transparent 2px),
    radial-gradient(circle at 55% 75%, rgba(70,65,60,0.35) 1px, transparent 2px),
    radial-gradient(circle at 88% 15%, rgba(50,45,40,0.45) 1px, transparent 2px),
    radial-gradient(circle at 42% 88%, rgba(55,50,45,0.4) 1px, transparent 2px),
    radial-gradient(circle at 28% 52%, rgba(60,55,50,0.3) 0.8px, transparent 1.5px),
    radial-gradient(circle at 68% 68%, rgba(45,40,35,0.35) 0.8px, transparent 1.5px),
    radial-gradient(circle at 12% 30%, rgba(50,45,40,0.4) 0.8px, transparent 1.5px),
    radial-gradient(circle at 85% 55%, rgba(55,50,45,0.35) 0.8px, transparent 1.5px),
    radial-gradient(circle at 45% 15%, rgba(60,55,50,0.3) 0.8px, transparent 1.5px);
  pointer-events: none;
  mix-blend-mode: multiply;
}

/* 烟灰内芯：不规则暗灰白主体，增加结块感 + 裂纹 */
.cig-flat-ash::after {
  content: '';
  position: absolute;
  inset: 2% 6% 1% 8%;
  background: 
    radial-gradient(ellipse 30% 22% at 25% 18%, rgba(60,55,50,0.35) 0%, transparent 70%),
    radial-gradient(ellipse 25% 28% at 75% 42%, rgba(55,50,45,0.3) 0%, transparent 65%),
    radial-gradient(ellipse 35% 18% at 40% 68%, rgba(50,45,40,0.25) 0%, transparent 60%),
    radial-gradient(ellipse 20% 15% at 60% 85%, rgba(45,40,35,0.2) 0%, transparent 55%),
    linear-gradient(105deg,
      transparent 0%,
      transparent 40%,
      rgba(40,35,30,0.1) 40.3%,
      rgba(40,35,30,0.1) 40.6%,
      transparent 41%,
      transparent 100%),
    linear-gradient(to top,
      rgba(30, 25, 20, 0.55) 0%,
      rgba(50, 45, 40, 0.4) 10%,
      rgba(75, 70, 65, 0.25) 25%,
      rgba(100, 95, 90, 0.12) 45%,
      rgba(130, 125, 120, 0.05) 65%,
      rgba(150, 145, 140, 0) 100%);
  pointer-events: none;
}

.cig-flat-ash.show {
  opacity: 1;
}

.cig-flat-ash.ash-falling {
  animation: ashFallScatter 0.6s ease-out forwards;
}

/* 烟灰散落动画：主体分裂成多块向不同方向掉落 */
@keyframes ashFallScatter {
  0% { 
    opacity: 1;
    clip-path: polygon(
      0% 100%, 100% 100%,
      100% 96%, 98% 92%, 101% 86%, 97% 80%, 99% 74%,
      96% 68%, 98% 62%, 95% 56%, 97% 50%, 94% 44%,
      96% 38%, 93% 32%, 95% 26%, 91% 20%, 88% 14%,
      84% 9%, 78% 5%, 70% 2%, 60% 0%,
      52% 3%, 46% 1%, 40% 4%, 34% 2%, 28% 5%,
      22% 9%, 16% 14%, 12% 20%, 8% 26%, 6% 32%,
      4% 38%, 5% 44%, 3% 50%, 5% 56%, 2% 62%,
      4% 68%, 1% 74%, 3% 80%, 0% 86%, 2% 92%,
      0% 96%, 0% 100%
    );
  }
  30% {
    opacity: 1;
    transform: translateX(-50%) translateY(-100%) rotate(-5deg);
    clip-path: polygon(
      0% 100%, 45% 100%, 42% 80%, 38% 60%, 35% 40%, 30% 20%, 25% 0%,
      20% 5%, 15% 15%, 10% 30%, 5% 50%, 2% 70%, 0% 90%, 0% 100%
    );
  }
  60% {
    opacity: 0.8;
    transform: translateX(-60%) translateY(-60%) rotate(-15deg);
  }
  100% { 
    opacity: 0;
    transform: translateX(-75%) translateY(-20%) rotate(-25deg);
  }
}

/* 烟灰碎片粒子效果 */
.ash-particle {
  position: absolute;
  background: linear-gradient(to bottom, 
    #4a4540 0%, 
    #6a6560 30%, 
    #8a8580 60%, 
    #a8a3a0 100%);
  border-radius: 30% 40% 35% 45% / 40% 35% 45% 30%;
  opacity: 1;
  pointer-events: none;
  z-index: 10;
  animation: ashParticleFall 1s ease-out forwards;
  box-shadow: 
    inset 0 1px 2px rgba(0, 0, 0, 0.3),
    0 1px 3px rgba(0, 0, 0, 0.2);
}

/* 烟灰碎片掉落动画 */
@keyframes ashParticleFall {
  0% {
    opacity: 1;
    transform: translate(0, 0) rotate(0deg) scale(1);
  }
  20% {
    opacity: 1;
    transform: translate(calc(var(--vx) * 0.2), calc(var(--vy) * 0.2)) rotate(calc(var(--rotation) * 0.2)) scale(0.95);
  }
  50% {
    opacity: 0.9;
    transform: translate(calc(var(--vx) * 0.5), calc(var(--vy) * 0.6)) rotate(calc(var(--rotation) * 0.5)) scale(0.85);
  }
  80% {
    opacity: 0.5;
    transform: translate(calc(var(--vx) * 0.8), calc(var(--vy) * 0.9)) rotate(calc(var(--rotation) * 0.8)) scale(0.7);
  }
  100% {
    opacity: 0;
    transform: translate(var(--vx), calc(var(--vy) * 1.2)) rotate(var(--rotation)) scale(0.5);
  }
}

/* 烟灰底部焦黑环 */
.cig-flat-charring {
  position: absolute;
  left: 50%;
  bottom: 100%;
  transform: translateX(-50%) translateY(50%);
  width: var(--cig-width);
  height: 12px;
  background:
    radial-gradient(ellipse 100% 100% at 50% 50%,
      rgba(20, 15, 10, 0.92) 0%,
      rgba(30, 22, 15, 0.82) 25%,
      rgba(45, 32, 22, 0.62) 50%,
      rgba(60, 45, 30, 0.38) 75%,
      transparent 100%);
  border-radius: 42% 55% 48% 50% / 52% 48% 50% 46%;
  pointer-events: none;
  z-index: 5;
  filter: blur(1.2px);
  opacity: 0;
  transition: opacity 0.3s ease;
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.45),
    0 0 8px rgba(80, 40, 10, 0.25),
    inset 0 1px 2px rgba(0, 0, 0, 0.3);
}

.cig-flat-charring.show {
  opacity: 1;
}

/* 冷却状态整体蒙灰 */
.cigarette-3d.cooldown .cig-flat-paper,
.cigarette-3d.cooldown .cig-flat-filter {
  filter: grayscale(0.7) brightness(0.5);
}

/* ======== 吸烟状态视觉增强 ======== */

/* 焦黑纸边：点燃/吸烟时，纸身顶部被烤黑 */
.cigarette-3d.lit .cig-flat-paper::before,
.cigarette-3d.smoking .cig-flat-paper::before,
.cigarette-3d.exhaling .cig-flat-paper::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 18%;
  background: linear-gradient(
    to bottom,
    rgba(30, 22, 18, 0.92) 0%,
    rgba(45, 34, 26, 0.85) 15%,
    rgba(65, 48, 38, 0.6) 38%,
    rgba(85, 64, 50, 0.38) 62%,
    transparent 100%
  );
  pointer-events: none;
}

/* 焦黑边缘不规则噪点 */
.cigarette-3d.lit .cig-flat-paper::after,
.cigarette-3d.smoking .cig-flat-paper::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 10%;
  background:
    radial-gradient(circle at 20% 55%, rgba(25,18,12,0.8) 1px, transparent 2px),
    radial-gradient(circle at 50% 35%, rgba(40,28,20,0.7) 1.2px, transparent 2.5px),
    radial-gradient(circle at 78% 58%, rgba(30,22,16,0.85) 1px, transparent 2px),
    radial-gradient(circle at 10% 80%, rgba(38,26,18,0.65) 1px, transparent 2px),
    radial-gradient(circle at 65% 75%, rgba(35,24,16,0.7) 1px, transparent 2px);
  pointer-events: none;
}

/* 过滤嘴手指阴影 */
.cigarette-3d.lit .cig-flat-filter::before,
.cigarette-3d.smoking .cig-flat-filter::before,
.cigarette-3d.exhaling .cig-flat-filter::before {
  content: '';
  position: absolute;
  top: 15%;
  left: -12%;
  width: 124%;
  height: 12%;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(0, 0, 0, 0.1) 30%,
    rgba(0, 0, 0, 0.18) 50%,
    rgba(0, 0, 0, 0.12) 70%,
    transparent 100%
  );
  filter: blur(2px);
  pointer-events: none;
  z-index: 5;
}

/* 工具按钮角标 */
.st-tool-ic .st-badge {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f59e0b;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.8);
}

/* 吐烟圈长按指示 */
.st-tool-ic.ring-pulse {
  animation: ringPulse 0.5s ease-in-out infinite alternate;
}
@keyframes ringPulse {
  0% { box-shadow: 0 0 6px rgba(245, 158, 11, 0.4); }
  100% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.9); }
}
</style>
