<template>
  <view class="page-container">
    <!-- 背景火光（由亮渐灭） -->
    <view class="bg-ember-glow" :style="bgGlowStyle"></view>

    <!-- Canvas 烟雾层 -->
    <view class="canvas-wrapper" :style="{ pointerEvents: sceneReady ? 'auto' : 'none' }"
      @touchstart.prevent="onPointerDown" @touchmove.prevent="onPointerMove" @touchend.prevent="onPointerUp"
      @mousedown="onPointerDown" @mousemove="onPointerMove" @mouseup="onPointerUp" @mouseleave="onPointerUp">
      <canvas canvas-id="smoke-canvas" id="smoke-canvas" class="smoke-canvas"></canvas>

      <!-- SVG 滤镜（Chokcoco 风格 DOM 烟雾） -->
      <svg class="smoke-svg-filter" width="0" height="0" style="position:absolute">
        <defs>
          <filter id="smoke-filter">
            <feTurbulence ref="turbulenceEl" type="fractalNoise" baseFrequency="0.03 0.03" numOctaves="20" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="70" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <!-- DOM 烟雾层（SVG 滤镜驱动） -->
      <view class="dom-smoke-layer" :class="{ hidden: !domFilterActive }">
        <view class="dom-smoke-wrap" ref="domSmokeWrap"></view>
      </view>

      <!-- 2D 香烟 -->
      <view class="cigarette-3d" :class="cigClass" :style="cigBurnStyle">
        <view class="cig-flat-ash" :class="{ show: ashGrowth > 0, 'ash-falling': ashFalling }" :style="ashStyle"></view>
        <view class="cig-flat-charring" :class="{ show: ashGrowth > 0 }" :style="{ opacity: ashGrowth > 0 ? (0.4 + Math.min(1, ashGrowth / 80) * 0.6) : 0 }"></view>
        <view class="cig-flat-burn">
          <view class="cig-flat-burn-core"></view>
        </view>
        <view class="cig-flat cig-flat-paper">
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

    <!-- 燃烧进度条 -->
    <view class="burn-progress" v-if="state !== 'ready' && state !== 'burnout' && state !== 'cooldown'">
      <view class="burn-progress-bar" :style="{ width: smokeProgress + '%' }"></view>
      <text class="burn-progress-text">{{ Math.round(smokeProgress) }}%</text>
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
          <text class="st-tool-name">吐烟圈</text>
          <text class="st-tool-val">长按换花样</text>
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
  </view>
</template>

<script>
import Store from '@/utils/store.js'

const SMOKING_DURATION = 50000
const IGNITE_DELAY = 800

export default {
  data() {
    return {
      brandId: '',
      remaining: 0,
      // 状态机: ready / igniting / lit / smoking / exhaling / burnout / cooldown
      state: 'ready',
      sceneReady: false,
      showHint: true,
      hintText: '长按点火',
      // 烟灰
      ashGrowth: 0,
      ashFalling: false,
      // 吸烟进度
      smokeProgress: 0,
      smokeStartTime: 0,
      sessionStartTs: 0,
      sessionExhaleCount: 0,
      // 计时器
      smokeTimer: null,
      pressTimer: null,
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
      const h = 52 * 0.9 * (this.ashGrowth / 100)
      return { height: Math.max(3, h) + 'px' }
    },

    // 香烟燃烧变短：减少容器高度，烟头位置不变
    cigBurnStyle() {
      if (this.smokeProgress <= 0) return {}
      const totalH = 560 // --cig-total-h
      // 最多缩短 70%（保留滤嘴）
      const deltaH = (this.smokeProgress / 100) * totalH * 0.7
      const newH = totalH - deltaH
      // 补偿 translateY：容器变短后要下移，保持烟头位置不变
      const offsetY = deltaH / 2
      return {
        height: newH + 'px',
        transform: `translate(-50%, calc(-50% + ${offsetY}px))`
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
    }
  },

  mounted() {
    this.$nextTick(() => { this.initCanvas() })
  },

  onLoad(options) {
    this.brandId = options.brandId || ''
    this.remaining = parseInt(options.remaining) || 0
    this.sessionStartTs = Date.now()
    this.sceneReady = true
    this.state = 'ready'
    this.showHint = true
    this.hintText = '长按点火'

    // 读取音效设置
    try {
      const saved = uni.getStorageSync('os_sound')
      if (saved !== null && saved !== undefined) this.soundEnabled = saved === '1' || saved === 1
    } catch (e) {}

    // 预加载点火音效（减少延迟）
    this.initFireAudio()
  },

  onUnload() {
    this.cleanup()
  },

  methods: {
    cleanup() {
      if (this.smokeTimer) { clearInterval(this.smokeTimer); this.smokeTimer = null }
      if (this.pressTimer) { clearTimeout(this.pressTimer); this.pressTimer = null }
      if (this.ringPressTimer) { clearTimeout(this.ringPressTimer); this.ringPressTimer = null }
      this.stopCanvasLoop()
      this.stopDomFilter()
      this.stopInhale()
      this.stopIdleSmoke()
      this.stopBurnSound()
      // 销毁音频播放器
      if (this.fireAudio) { try { this.fireAudio.destroy() } catch(e) {}; this.fireAudio = null }
      if (this.burnAudio) { try { this.burnAudio.destroy() } catch(e) {}; this.burnAudio = null }
      this.setSmokeMode('off')
    },

    // ============ Canvas 粒子系统 ============
    findCanvasEl() {
      if (!this.$el) return null
      // uni-app H5 中 canvas 可能嵌套在 uni-canvas 组件内
      return this.$el.querySelector('#smoke-canvas') || this.$el.querySelector('canvas') || null
    },

    initCanvas() {
      try {
        const canvasEl = this.findCanvasEl()
        if (!canvasEl) {
          // 延迟重试一次（DOM 可能还未渲染完成）
          setTimeout(() => this.initCanvas(), 100)
          return
        }
        this.dpr = window.devicePixelRatio || 1
        const rect = canvasEl.getBoundingClientRect()
        this.canvasW = rect.width
        this.canvasH = rect.height
        canvasEl.width = rect.width * this.dpr
        canvasEl.height = rect.height * this.dpr
        const ctx = canvasEl.getContext('2d')
        ctx.scale(this.dpr, this.dpr)
        this.canvasCtx = ctx
        this.emitterX = rect.width / 2
        this.emitterY = rect.height * 0.45
        this.startCanvasLoop()
      } catch (e) { console.warn('Canvas init failed', e) }
    },

    resizeCanvas() {
      try {
        const canvasEl = this.findCanvasEl()
        if (!canvasEl) return
        const rect = canvasEl.getBoundingClientRect()
        this.canvasW = rect.width
        this.canvasH = rect.height
        canvasEl.width = rect.width * this.dpr
        canvasEl.height = rect.height * this.dpr
        if (this.canvasCtx) {
          this.canvasCtx.setTransform(1, 0, 0, 1, 0, 0)
          this.canvasCtx.scale(this.dpr, this.dpr)
        }
        this.emitterX = rect.width / 2
        this.emitterY = rect.height * 0.45
      } catch (e) {}
    },

    startCanvasLoop() {
      if (this.animFrame) return
      const loop = () => {
        this.ringTime += 0.1
        const ctx = this.canvasCtx
        if (!ctx) { this.animFrame = requestAnimationFrame(loop); return }
        ctx.clearRect(0, 0, this.canvasW, this.canvasH)
        this.emitParticles()
        ctx.globalCompositeOperation = 'lighter'
        this.particles = this.particles.filter(p => {
          const alive = this.updateParticle(p)
          if (alive) this.drawParticle(ctx, p)
          return alive
        })
        ctx.globalCompositeOperation = 'source-over'
        this.animFrame = requestAnimationFrame(loop)
      }
      this.animFrame = requestAnimationFrame(loop)
    },

    stopCanvasLoop() {
      if (this.animFrame) { cancelAnimationFrame(this.animFrame); this.animFrame = null }
      this.particles = []
      if (this.canvasCtx) this.canvasCtx.clearRect(0, 0, this.canvasW, this.canvasH)
    },

    setSmokeMode(m) { this.smokeMode = m; if (m === 'exhale-rise') this.exhaleRiseStart = Date.now() },

    createParticle(x, y, type, extras) {
      extras = extras || {}
      const p = { x, y, type, life: 0, maxLife: 0, vx: 0, vy: 0, size: 0, maxSize: 0, r: 0, g: 0, b: 0 }
      if (type === 'spark') {
        // 火星：更自然的速度和生命周期
        p.vx = (Math.random() - 0.5) * 2.5
        p.vy = -Math.random() * 3 - 1.5
        p.size = Math.random() * 2.5 + 0.8
        p.life = Math.random() * 40 + 25
        p.maxLife = p.life
        // 火星颜色：橙红到金黄
        p.r = 255
        p.g = Math.floor(Math.random() * 120 + 100)
        p.b = Math.random() < 0.3 ? Math.floor(Math.random() * 30) : 0
      } else if (type === 'ring') {
        const angle = Math.random() * Math.PI * 2, speed = 1.2 + Math.random() * 0.8, rs = this.ringCurrentStyle
        if (rs === 0) { p.vx = Math.cos(angle) * speed * 0.6; p.vy = -speed * 0.5 + Math.sin(angle) * 0.8 }
        else if (rs === 1) { const t = angle; p.vx = 16 * Math.pow(Math.sin(t), 3) * 0.08; p.vy = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) * 0.08 }
        else if (rs === 2) { const r = Math.random() < 0.5 ? 0.4 : 0.9; p.vx = Math.cos(angle) * speed * r; p.vy = -speed * 0.4 * r + Math.sin(angle) * 0.6 }
        else { p.vx = Math.cos(angle + this.ringTime * 0.2) * speed * 0.8; p.vy = -speed * 0.9 }
        p.size = 3 + Math.random() * 4; p.maxSize = p.size + Math.random() * 20 + 15
        p.life = 90 + Math.random() * 40; p.maxLife = p.life
        const gray = Math.floor(Math.random() * 50 + 170); p.r = gray; p.g = gray; p.b = gray + Math.floor(Math.random() * 15)
      } else if (type === 'exhale') {
        const a2 = (Math.random() - 0.5) * Math.PI * 0.3, sp = Math.random() * 1.5 + 0.8
        p.vx = Math.sin(a2) * sp + (Math.random() - 0.5) * 0.6; p.vy = -Math.random() * 1.5 - 0.8
        p.size = Math.random() * 14 + 8; p.maxSize = p.size + Math.random() * 30 + 25
        p.life = Math.random() * 100 + 80; p.maxLife = p.life
        const gray = Math.floor(Math.random() * 50 + 170); p.r = gray; p.g = gray; p.b = gray + Math.floor(Math.random() * 15)
      } else if (type === 'exhale-rise') {
        const spread = extras.spread || 280, power = extras.power || 1
        p.x = extras.originX !== undefined ? extras.originX : this.emitterX + (Math.random() - 0.5) * spread
        p.y = extras.originY !== undefined ? extras.originY : this.canvasH + 10
        // 先沉后升：初始 vy 可能为正（下沉），之后减速再反向上升
        p.vx = (Math.random() - 0.5) * 0.8; p.vy = (Math.random() * 1.2 + 0.3) * power
        p.size = Math.random() * 10 + 6; p.maxSize = p.size + Math.random() * 70 + 50
        p.life = Math.random() * 180 + 160; p.maxLife = p.life
        const g = Math.floor(Math.random() * 30 + 200); p.r = g; p.g = g; p.b = g + Math.floor(Math.random() * 12)
        p.wobblePhase = Math.random() * Math.PI * 2; p.wobbleAmp = Math.random() * 1.5 + 0.6
        p.wobbleSpeed = 0.04 + Math.random() * 0.05; p.decel = 0.985 + Math.random() * 0.01
        // 分层：前 30% 粒子更浓更大
        p.layer = extras.layer || 1
      } else if (type === 'idle-wisp') {
        // 空闲时烟头自然冒出的细烟丝
        p.vx = (Math.random() - 0.5) * 0.15
        p.vy = -(Math.random() * 0.6 + 0.3)
        p.size = Math.random() * 3 + 1.5; p.maxSize = p.size + Math.random() * 8 + 5
        p.life = Math.random() * 60 + 40; p.maxLife = p.life
        const g = Math.floor(Math.random() * 20 + 190); p.r = g; p.g = g; p.b = g + Math.floor(Math.random() * 8)
        p.wobblePhase = Math.random() * Math.PI * 2; p.wobbleAmp = Math.random() * 0.4 + 0.1
        p.wobbleSpeed = 0.03 + Math.random() * 0.03
      } else {
        const a2 = (Math.random() - 0.5) * Math.PI * 0.4, sp = Math.random() * 2 + 1
        p.vx = Math.sin(a2) * sp; p.vy = -Math.random() * 3 - 2
        p.size = Math.random() * 8 + 4; p.maxSize = p.size + Math.random() * 30 + 20
        p.life = Math.random() * 80 + 60; p.maxLife = p.life
        const gray = Math.floor(Math.random() * 60 + 160); p.r = gray; p.g = gray; p.b = gray + Math.floor(Math.random() * 20)
      }
      return p
    },

    updateParticle(p) {
      p.life--
      const progress = 1 - p.life / p.maxLife
      if (p.type === 'spark') { p.x += p.vx; p.y += p.vy; p.vy -= 0.02; p.size *= 0.98 }
      else if (p.type === 'ring') { p.x += p.vx; p.y += p.vy; p.vx += Math.cos(this.ringTime * 0.1 + progress * 2) * 0.05; p.vx = Math.max(-2, Math.min(2, p.vx)); p.vy += (Math.random() - 0.5) * 0.1; p.size = p.size + (p.maxSize - p.size) * 0.015 }
      else if (p.type === 'exhale') { p.x += p.vx + (Math.random() - 0.5) * 0.8; p.y += p.vy; p.vy += 0.02; p.vx *= 0.99; p.size = p.size + (p.maxSize - p.size) * 0.025 }
      else if (p.type === 'exhale-rise') {
        // 先沉后升：vy 先正（下沉）再减速到 0 再变负（上升）
        p.vy -= 0.06 * (p.layer || 1)
        p.x += p.vx + Math.sin(p.wobblePhase) * p.wobbleAmp * 0.7; p.y += p.vy
        p.wobblePhase += p.wobbleSpeed; p.wobbleAmp *= 0.998
        p.vx += (Math.random() - 0.5) * 0.05; p.vx *= 0.995
        p.size = p.size + (p.maxSize - p.size) * 0.022
      }
      else if (p.type === 'idle-wisp') {
        p.x += p.vx + Math.sin(p.wobblePhase) * p.wobbleAmp
        p.y += p.vy
        p.wobblePhase += p.wobbleSpeed
        p.vy *= 0.995
        p.size = p.size + (p.maxSize - p.size) * 0.015
      }
      else { p.x += p.vx + (Math.random() - 0.5) * 0.5; p.y += p.vy; p.vy *= 0.99; p.vx += (Math.random() - 0.5) * 0.1; p.size = p.size + (p.maxSize - p.size) * 0.02 }
      return p.life > 0
    },

    drawParticle(ctx, p) {
      const alpha = Math.max(0, p.life / p.maxLife)
      if (p.type === 'spark') {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`; ctx.fill()
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha * 0.3})`; ctx.fill()
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        let a = alpha * 0.15
        if (p.type === 'ring') a = alpha * 0.22
        else if (p.type === 'exhale') a = alpha * 0.18
        else if (p.type === 'exhale-rise') a = alpha * 0.14 * (p.layer || 1)
        else if (p.type === 'idle-wisp') a = alpha * 0.08
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${a})`; ctx.fill()
      }
    },

    emitParticles() {
      const m = this.smokeMode, ex = this.emitterX, ey = this.emitterY
      if (m === 'off') return
      if (m === 'idle') {
        if (Math.random() < 0.3) this.particles.push(this.createParticle(ex, ey, 'spark'))
        // 空闲时烟头自然冒细烟丝
        if (Math.random() < 0.25) this.particles.push(this.createParticle(ex + (Math.random() - 0.5) * 4, ey, 'idle-wisp'))
      }
      else if (m === 'inhale') {
        // 吸烟时火星飘出：更频繁、更多样
        if (Math.random() < 0.6) {
          const sparkCount = Math.random() < 0.3 ? 2 : 1
          for (let i = 0; i < sparkCount; i++) {
            this.particles.push(this.createParticle(
              ex + (Math.random() - 0.5) * 8,
              ey + (Math.random() - 0.5) * 4,
              'spark'
            ))
          }
        }
      }
      else if (m === 'burnout') { if (Math.random() < 0.2) this.particles.push(this.createParticle(ex, ey, 'smoke')) }
      else if (m === 'ring') { for (let i = 0; i < 6; i++) this.particles.push(this.createParticle(ex, ey, 'ring')) }
      else if (m === 'exhale') { for (let i = 0; i < 5; i++) this.particles.push(this.createParticle(ex, ey, 'exhale')) }
      else if (m === 'exhale-rise') {
        const elapsed = Date.now() - this.exhaleRiseStart
        if (elapsed > 1500) return
        const phase = Math.min(1, elapsed / 1200)
        const burstCount = phase < 0.3 ? 10 : (phase < 0.7 ? 6 : 3)
        const power = phase < 0.3 ? 1.2 : (phase < 0.7 ? 1.0 : 0.7)
        const spread = this.canvasW * (phase < 0.5 ? 0.25 : 0.5)
        // 分层：前 30% 粒子更浓更大（先浓后淡）
        const layer = phase < 0.3 ? 1.5 : (phase < 0.7 ? 1.0 : 0.6)
        for (let i = 0; i < burstCount; i++) {
          const r1 = Math.random() * 2 - 1, r2 = Math.random() * 2 - 1
          const offsetNorm = (r1 + r2) * 0.5
          const originX = Math.max(20, Math.min(this.canvasW - 20, ex + offsetNorm * spread * 0.5))
          this.particles.push(this.createParticle(0, 0, 'exhale-rise', { originX, originY: this.canvasH + 10 + Math.random() * 15, spread, power, layer }))
        }
      }
    },

    emitExhaleBurst(count) {
      const n = count || 8
      for (let i = 0; i < n; i++) this.particles.push(this.createParticle(this.emitterX + (Math.random() - 0.5) * 10, this.emitterY + (Math.random() - 0.5) * 6, 'exhale'))
    },

    // ============ DOM 烟雾系统 ============
    startDomFilter() {
      this.domFilterActive = true; this.domFilterRunning = true
      this.animateDomFilter()
    },
    stopDomFilter() {
      this.domFilterRunning = false
      if (this.domFilterRaf) { cancelAnimationFrame(this.domFilterRaf); this.domFilterRaf = null }
      setTimeout(() => { if (this.domActivePuffs <= 0) this.domFilterActive = false }, 1500)
    },
    animateDomFilter() {
      this.domFilterFrames += 0.2
      const rad = Math.PI / 180
      let bfx = 0.03 + 0.005 * Math.cos(this.domFilterFrames * rad)
      let bfy = 0.03 + 0.005 * Math.sin(this.domFilterFrames * rad)
      // 更新 SVG feTurbulence
      try {
        const turb = this.$refs.turbulenceEl
        if (turb && turb.setAttributeNS) turb.setAttributeNS(null, 'baseFrequency', bfx + ' ' + bfy)
      } catch (e) {}
      if (this.domFilterRunning) this.domFilterRaf = requestAnimationFrame(() => this.animateDomFilter())
    },

    spawnDomPuff(x, y, opts) {
      const wrap = this.$refs.domSmokeWrap
      if (!wrap) return
      const container = wrap.$el || wrap
      const doc = container.ownerDocument || document
      const div = doc.createElement('div')
      const size = opts.size, life = opts.life
      div.className = 'dom-smoke-puff'
      div.style.width = size + 'px'
      div.style.height = size + 'px'
      div.style.left = (x - size / 2) + 'px'
      div.style.top = (y - size / 2) + 'px'
      const g1 = 200 + Math.floor(Math.random() * 30), g2 = g1 - 40, g3 = g2 - 20
      div.style.background = `radial-gradient(ellipse at 50% 40%,rgba(${g1},${g1},${g1},${opts.opacity}) 0%,rgba(${g2},${g2},${g2},${opts.opacity*0.7}) 30%,rgba(${g3},${g3},${g3},${opts.opacity*0.3}) 60%,transparent 100%)`
      div.style.setProperty('--ds', opts.scale.toFixed(3))
      div.style.setProperty('--do', opts.opacity.toFixed(2))
      div.style.setProperty('--dd', opts.drift.toFixed(1) + 'px')
      div.style.setProperty('--dr', (-opts.rise).toFixed(1) + 'vh')
      div.style.animationDuration = life + 'ms'
      div.classList.add('anim')
      container.appendChild(div)
      this.domActivePuffs++
      setTimeout(() => { div.remove(); this.domActivePuffs--; if (this.domActivePuffs <= 0 && !this.domFilterRunning) this.domFilterActive = false }, life + 200)
    },

    makeDomOpts(preset) {
      const p = preset || { sizeMin:80,sizeMax:140,lifeMin:5000,lifeMax:7500,opacityMin:0.2,opacityMax:0.45,scaleMin:0.12,scaleMax:0.2,driftBase:90,driftVar:110,riseMin:60,riseMax:95 }
      return { size: p.sizeMin + Math.random()*(p.sizeMax-p.sizeMin), life: p.lifeMin + Math.random()*(p.lifeMax-p.lifeMin), opacity: p.opacityMin + Math.random()*(p.opacityMax-p.opacityMin), scale: p.scaleMin + Math.random()*(p.scaleMax-p.scaleMin), drift: (Math.random()-0.5)*(p.driftBase+p.driftVar*Math.random()), rise: p.riseMin + Math.random()*(p.riseMax-p.riseMin) }
    },

    startInhale(cx, cy) {
      this.startDomFilter()
      if (this.inhaleTimer) clearInterval(this.inhaleTimer)
      const ip = { sizeMin:40,sizeMax:65,lifeMin:2000,lifeMax:3000,opacityMin:0.2,opacityMax:0.4,scaleMin:0.1,scaleMax:0.16,driftBase:25,driftVar:35,riseMin:30,riseMax:50 }
      this.inhaleTimer = setInterval(() => {
        if (Math.random() < 0.5) this.spawnDomPuff(cx + (Math.random()-0.5)*10, cy + (Math.random()-0.5)*6, this.makeDomOpts(ip))
      }, 130)
    },
    stopInhale() { if (this.inhaleTimer) { clearInterval(this.inhaleTimer); this.inhaleTimer = null } },

    // ---- 空闲冒烟（lit 状态下烟头持续冒细烟） ----
    startIdleSmoke() {
      this.stopIdleSmoke()
      const pos = this.getBurnPosSync()
      this.idleSmokeTimer = setInterval(() => {
        if (this.state !== 'lit') return
        if (Math.random() < 0.4) {
          this.spawnDomPuff(
            pos.x + (Math.random() - 0.5) * 6,
            pos.y - 5 - Math.random() * 8,
            this.makeDomOpts({ sizeMin: 15, sizeMax: 30, lifeMin: 2500, lifeMax: 4000, opacityMin: 0.06, opacityMax: 0.12, scaleMin: 0.05, scaleMax: 0.08, driftBase: 8, driftVar: 12, riseMin: 15, riseMax: 30 })
          )
        }
      }, 350)
    },
    stopIdleSmoke() {
      if (this.idleSmokeTimer) { clearInterval(this.idleSmokeTimer); this.idleSmokeTimer = null }
    },
    getBurnPosSync() {
      try {
        const burnEl = this.$el ? this.$el.querySelector('.cig-flat-burn') : null
        if (burnEl) {
          const r = burnEl.getBoundingClientRect()
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
        }
      } catch (e) {}
      return { x: this.emitterX || 200, y: this.emitterY || 300 }
    },

    exhaleBurst(cx, cy, count) {
      this.startDomFilter()
      const n = count || 22, spread = 100
      for (let i = 0; i < n; i++) {
        setTimeout(() => {
          const r1 = Math.random()*2-1, r2 = Math.random()*2-1, ox = (r1+r2)*0.5*spread
          // 分层：前面的 puff 更浓更大，后面的更淡更小（先浓后淡）
          const progress = i / n
          let preset
          if (progress < 0.3) {
            // 前 30%：浓密大团
            preset = { sizeMin:100,sizeMax:160,lifeMin:5500,lifeMax:8000,opacityMin:0.3,opacityMax:0.5,scaleMin:0.14,scaleMax:0.22,driftBase:80,driftVar:100,riseMin:50,riseMax:80 }
          } else if (progress < 0.7) {
            // 中间：中等
            preset = { sizeMin:70,sizeMax:120,lifeMin:4500,lifeMax:6500,opacityMin:0.2,opacityMax:0.38,scaleMin:0.1,scaleMax:0.18,driftBase:90,driftVar:110,riseMin:60,riseMax:90 }
          } else {
            // 后面：稀薄小团
            preset = { sizeMin:40,sizeMax:80,lifeMin:3500,lifeMax:5000,opacityMin:0.1,opacityMax:0.25,scaleMin:0.06,scaleMax:0.12,driftBase:100,driftVar:120,riseMin:70,riseMax:100 }
          }
          const opts = this.makeDomOpts(preset); opts.drift = ox + (Math.random()-0.5)*60
          this.spawnDomPuff(cx + ox, cy + (Math.random()-0.5)*15, opts)
        }, i * 10)
      }
      setTimeout(() => { if (!this.inhaleTimer) this.stopDomFilter() }, 3500)
    },

    // 根据强度吐烟：强度越高，烟越多越浓
    exhaleByIntensity(intensity) {
      // intensity: ~0.2 (轻吸) ~ 2.0 (深吸+后期)
      const pos = this.getBurnPosSync()
      // Canvas 粒子数：4 ~ 20
      const canvasCount = Math.round(4 + intensity * 8)
      // DOM puff 数：8 ~ 40
      const domCount = Math.round(8 + intensity * 16)
      // 扩散范围：80 ~ 160
      const spread = 80 + intensity * 40

      // Canvas 粒子爆发
      for (let i = 0; i < canvasCount; i++) {
        this.particles.push(this.createParticle(
          this.emitterX + (Math.random() - 0.5) * 12,
          this.emitterY + (Math.random() - 0.5) * 8,
          'exhale'
        ))
      }

      // DOM 烟雾爆发
      this.startDomFilter()
      for (let i = 0; i < domCount; i++) {
        setTimeout(() => {
          const r1 = Math.random()*2-1, r2 = Math.random()*2-1
          const ox = (r1+r2)*0.5*spread
          const progress = i / domCount
          let preset
          if (progress < 0.3) {
            // 前 30%：浓密大团，强度越高越大
            const sizeBoost = intensity * 30
            preset = {
              sizeMin: 100 + sizeBoost, sizeMax: 160 + sizeBoost,
              lifeMin: 5500, lifeMax: 8000,
              opacityMin: 0.25 + intensity * 0.08, opacityMax: 0.4 + intensity * 0.1,
              scaleMin: 0.14, scaleMax: 0.22,
              driftBase: 80, driftVar: 100, riseMin: 50, riseMax: 80
            }
          } else if (progress < 0.7) {
            preset = {
              sizeMin: 70 + intensity * 15, sizeMax: 120 + intensity * 20,
              lifeMin: 4500, lifeMax: 6500,
              opacityMin: 0.18 + intensity * 0.05, opacityMax: 0.32 + intensity * 0.06,
              scaleMin: 0.1, scaleMax: 0.18,
              driftBase: 90, driftVar: 110, riseMin: 60, riseMax: 90
            }
          } else {
            preset = {
              sizeMin: 40 + intensity * 8, sizeMax: 80 + intensity * 10,
              lifeMin: 3500, lifeMax: 5000,
              opacityMin: 0.08 + intensity * 0.03, opacityMax: 0.2 + intensity * 0.05,
              scaleMin: 0.06, scaleMax: 0.12,
              driftBase: 100, driftVar: 120, riseMin: 70, riseMax: 100
            }
          }
          const opts = this.makeDomOpts(preset)
          opts.drift = ox + (Math.random()-0.5)*60
          this.spawnDomPuff(pos.x + ox, this.canvasH * 0.88 + (Math.random()-0.5)*15, opts)
        }, i * 10)
      }
      setTimeout(() => { if (!this.inhaleTimer) this.stopDomFilter() }, 3500)
    },

    // ============ 烟雾模式同步 ============
    syncSmokeMode(newVal, oldVal) {
      // 同步获取烟头位置（使用原生 DOM 查询）
      const getBurnPos = () => {
        try {
          const burnEl = this.$el ? this.$el.querySelector('.cig-flat-burn') : null
          if (burnEl) {
            const r = burnEl.getBoundingClientRect()
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
          }
        } catch (e) {}
        return { x: this.emitterX || 200, y: this.emitterY || 300 }
      }

      if (newVal === 'ready' || newVal === 'igniting') {
        this.setSmokeMode('off')
        this.stopDomFilter(); this.stopInhale()
      } else if (newVal === 'lit') {
        this.setSmokeMode('idle')
        this.stopDomFilter(); this.stopInhale()
        this.startIdleSmoke()
      } else if (newVal === 'smoking') {
        this.setSmokeMode('inhale')
        this.stopIdleSmoke()
        const pos = getBurnPos()
        this.emitterX = pos.x; this.emitterY = pos.y
        this.startInhale(pos.x, pos.y)
      } else if (newVal === 'exhaling') {
        this.stopInhale()
        this.setSmokeMode('exhale-rise')
        // 吐烟已由 onPointerUp 中的 exhaleByIntensity 触发
        setTimeout(() => {
          if (this.state === 'exhaling') this.setSmokeMode('idle')
        }, 2200)
      } else if (newVal === 'burnout') {
        this.setSmokeMode('burnout')
        this.stopDomFilter(); this.stopInhale(); this.stopIdleSmoke()
        this.domActivePuffs = 0; this.domFilterActive = false
      } else if (newVal === 'cooldown') {
        this.setSmokeMode('off')
        this.stopDomFilter(); this.stopInhale(); this.stopIdleSmoke()
      }
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
          if (this.cigDragMoved) {
            this.state = 'ready'
            this.hintText = '长按点火'
            this.isPressing = false
            return
          }
          this.state = 'lit'
          this.showHint = true
          this.hintText = '长按吸烟'
          if (uni.vibrateShort) uni.vibrateShort({ type: 'light' })
          this.playFire()  // 点火音效
        }, IGNITE_DELAY)
      } else if (this.state === 'lit' || this.state === 'exhaling') {
        this.state = 'smoking'
        this.smokeStartTime = Date.now() - (this.smokeProgress / 100) * SMOKING_DURATION
        this.currentPuffStart = Date.now()
        this.startSmokeProgress()
        this.showHint = false
        if (uni.vibrateShort) uni.vibrateShort({ type: 'light' })
        // 开始吸烟音效 (input.mp3)
        this.startBurnSound()
      }
    },

    onPointerMove(e) {
      if (!this.isDragging) return
      const point = e.touches ? e.touches[0] : e
      const dx = point.clientX - this.dragStartX
      const dy = point.clientY - this.dragStartY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.cigDragMoved = true

      if (this.cigDragMoved && this.state === 'igniting') {
        clearTimeout(this.pressTimer)
        this.pressTimer = null
        this.state = 'ready'
        this.showHint = true
        this.hintText = '长按点火'
      }
    },

    onPointerUp() {
      this.isPressing = false
      
      // 无论是否拖动，都要清除吸烟计时器
      if (this.state === 'smoking') {
        clearInterval(this.smokeTimer)
        this.smokeTimer = null
      }
      
      if (this.cigDragMoved) { this.cigDragMoved = false; this.isDragging = false; return }
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
        // 停止燃烧音效
        this.stopBurnSound()
        // 计算本次吸入时长，越久吐烟越多
        const puffDuration = this.currentPuffStart ? Date.now() - this.currentPuffStart : 1000
        // 综合因素：进度越后烟越浓，吸入越久烟越多
        const progressFactor = 0.4 + (this.smokeProgress / 100) * 0.6  // 0.4 ~ 1.0
        const puffFactor = Math.min(2.0, 0.5 + puffDuration / 3000)     // 0.5 ~ 2.0
        const intensity = progressFactor * puffFactor                     // ~0.2 ~ 2.0
        this.state = 'exhaling'
        this.sessionExhaleCount++
        if (uni.vibrateShort) uni.vibrateShort({ type: 'light' })

        // 根据强度触发吐烟
        this.exhaleByIntensity(intensity)
        // 吐烟音效
        this.playExhale(intensity)

        setTimeout(() => {
          if (this.smokeProgress >= 100) {
            this.finishSmoking()
          } else {
            this.state = 'lit'
            this.showHint = true
            this.hintText = '长按继续吸'
          }
        }, 2200)
      }
    },

    // ---- 吸烟进度 ----
    startSmokeProgress() {
      let lastAshTick = 0
      this.smokeTimer = setInterval(() => {
        // 安全检查：只有用户正在按压时才推进进度
        if (!this.isPressing) {
          clearInterval(this.smokeTimer)
          this.smokeTimer = null
          return
        }
        
        const elapsed = Date.now() - this.smokeStartTime
        this.smokeProgress = Math.min(100, (elapsed / SMOKING_DURATION) * 100)

        // 烟灰堆积：每 600ms 增长一点
        if (elapsed - lastAshTick > 600) {
          lastAshTick = elapsed
          this.growAsh(3)
        }

        if (this.smokeProgress >= 100) {
          this.finishSmoking()
        }
      }, 50)
    },

    // ---- 烟灰 ----
    growAsh(amount) {
      if (this.state !== 'lit' && this.state !== 'smoking' && this.state !== 'exhaling') return
      this.ashGrowth = Math.min(200, this.ashGrowth + amount)
      // 烟灰过长自动断裂
      if (this.ashGrowth >= this.ashBreakThreshold && (this.state === 'lit' || this.state === 'exhaling')) {
        this.autoBreakAsh()
      }
    },

    autoBreakAsh() {
      this.ashFalling = true
      this.playAshDrop()
      this.showToastMsg('烟灰太长了，自动掉落')
      setTimeout(() => {
        this.ashFalling = false
        this.ashGrowth = Math.max(0, this.ashGrowth - 60 - Math.random() * 40)
        this.ashBreakThreshold = this.ashGrowth + 100 + Math.random() * 60
      }, 800)
    },

    tapAsh() {
      if (this.ashGrowth > 0) {
        this.ashFalling = true
        setTimeout(() => {
          this.ashFalling = false
          this.ashGrowth = Math.max(0, this.ashGrowth - 80)
        }, 700)
        this.playAshDrop()
      }
      this.showToastMsg(this.ashGrowth > 0 ? '弹掉一部分烟灰' : '没有烟灰可弹')
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

      Store.recordSmoke(duration)

      if (uni.vibrateShort) uni.vibrateShort({ type: 'heavy' })

      setTimeout(() => {
        this.state = 'cooldown'
        setTimeout(() => {
          uni.redirectTo({
            url: `/pages/share/share?brandId=${this.brandId}&remaining=${this.remaining}&duration=${totalDuration}`
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
        this.fireAudio.volume = 0.6
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
        this.burnAudio.volume = 0.5
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

    // 吐烟音效 (output.mp3)
    playExhale(intensity) {
      if (!this.soundEnabled) return
      try {
        const audio = uni.createInnerAudioContext()
        audio.src = '/static/audio/output.mp3'
        audio.volume = Math.min(1, 0.5 + intensity * 0.2)
        audio.play()
        // 播放完后销毁
        audio.onEnded(() => { audio.destroy() })
        audio.onError(() => { audio.destroy() })
      } catch (e) {
        console.warn('Exhale sound failed', e)
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
        this.ringCurrentStyle = (this.ringCurrentStyle + 1) % 4
        this.showToastMsg('花样：' + ['标准圆环', '花式心形', '双环交叠', '龙卷风'][this.ringCurrentStyle])
      }, 1000)
    },

    endRingPress() {
      if (this.ringPressTimer) { clearTimeout(this.ringPressTimer); this.ringPressTimer = null }
      this.ringActive = false
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
  background-color: #0f0f0f;
  color: #e5e7eb;
  position: relative;
  overflow: hidden;
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
  background: linear-gradient(90deg, #f59e0b 0%, #ef4444 100%);
  transition: width 0.3s ease;
  box-shadow: 0 0 8rpx rgba(245, 158, 11, 0.5);
}

.burn-progress-text {
  position: absolute;
  top: -36rpx;
  right: 0;
  font-size: 20rpx;
  color: #9ca3af;
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
  color: #9ca3af;
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
  color: #6b7280;
}

.sd-val {
  font-size: 28rpx;
  color: #f59e0b;
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
  border-color: #f59e0b;
  color: #f59e0b;
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
  color: #f59e0b;
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
  background-color: #1f1f1f;
  border: 1px solid #2a2a2a;
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
  color: #9ca3af;
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
  border: 1px solid #2a2a2a;
  color: #d1d5db;
}

.pass-confirm {
  background: #f59e0b;
  color: #0f0f0f;
  font-weight: bold;
}

/* ---- Toast ---- */
.toast {
  position: fixed;
  top: 160rpx; left: 50%;
  transform: translateX(-50%);
  background-color: #2a2a2a;
  border: 1px solid #374151;
  color: #e5e7eb;
  font-size: 28rpx;
  padding: 16rpx 32rpx;
  border-radius: 24rpx;
  z-index: 200;
}
</style>
