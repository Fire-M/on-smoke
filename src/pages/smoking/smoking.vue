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
        <!-- 肺部图标 -->
        <view class="lung-icon">
          <svg viewBox="0 0 100 100" class="lung-svg">
            <!-- 左肺 -->
            <path class="lung-path lung-left" :class="{ 'lung-full': lungFill >= 100 }"
              d="M 30 20 Q 20 25 18 35 Q 15 50 20 65 Q 25 75 35 75 Q 40 75 42 70 Q 45 60 43 45 Q 42 30 38 22 Z"
              :style="{ fill: getLungColor(lungFill) }" />
            <!-- 右肺 -->
            <path class="lung-path lung-right" :class="{ 'lung-full': lungFill >= 100 }"
              d="M 70 20 Q 80 25 82 35 Q 85 50 80 65 Q 75 75 65 75 Q 60 75 58 70 Q 55 60 57 45 Q 58 30 62 22 Z"
              :style="{ fill: getLungColor(lungFill) }" />
            <!-- 气管 -->
            <path class="lung-trachea" d="M 50 15 L 50 35 M 50 35 Q 45 40 40 45 M 50 35 Q 55 40 60 45"
              stroke="var(--text-dim)" stroke-width="2" fill="none" />
          </svg>
          <!-- 填充动画层 -->
          <view class="lung-fill-overlay" :style="{ height: lungFill + '%', background: getLungGradient(lungFill) }"></view>
        </view>
        <!-- 数值显示 -->
        <view class="lung-info">
          <text class="lung-label">🫁 肺部负荷</text>
          <text class="lung-value" :class="{ 'lung-warning': lungFill > 70 }">{{ Math.round(lungFill) }}%</text>
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
      // 吸烟进度
      smokeProgress: 0,
      smokeStartTime: 0,
      sessionStartTs: 0,
      sessionExhaleCount: 0,
      lungFill: 0,  // 肺部填充度 (0-100)
      // 计时器
      smokeTimer: null,
      pressTimer: null,
      puffTimer: null,  // 单次吸烟自动停止计时器
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
      if (fill >= 100) return '#ef4444'  // 红色 - 已满
      if (fill >= 80) return 'var(--primary-2)'   // 橙色 - 接近满
      if (fill >= 60) return '#eab308'   // 黄色 - 中等
      if (fill >= 40) return '#84cc16'   // 黄绿色 - 较轻
      if (fill >= 20) return '#22c55e'   // 绿色 - 正常
      return '#10b981'                    // 深绿色 - 健康
    },

    // 根据肺部填充度返回渐变
    getLungGradient(fill) {
      const color = this.getLungColor(fill)
      return `linear-gradient(to top, ${color} 0%, ${color}80 100%)`
    },

    cleanup() {
      if (this.smokeTimer) { clearInterval(this.smokeTimer); this.smokeTimer = null }
      if (this.pressTimer) { clearTimeout(this.pressTimer); this.pressTimer = null }
      if (this.puffTimer) { clearTimeout(this.puffTimer); this.puffTimer = null }
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
          this.state = 'lit'
          this.showHint = true
          this.hintText = '长按吸烟'
          if (uni.vibrateShort) uni.vibrateShort({ type: 'light' })
          this.playFire()  // 点火音效
          // 仍在按住：点火后自动进入吸烟，使单次长按即可「点燃→吸烟」
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
              clearInterval(this.smokeTimer)
              this.smokeTimer = null
              this.stopBurnSound()
              const puffDuration = MAX_PUFF_DURATION
              const progressFactor = 0.4 + (this.smokeProgress / 100) * 0.6
              const puffFactor = Math.min(2.0, 0.5 + puffDuration / 3000)
              const intensity = progressFactor * puffFactor
              this.state = 'exhaling'
              this.sessionExhaleCount++
              if (uni.vibrateShort) uni.vibrateShort({ type: 'light' })
              this.exhaleByIntensity(intensity)
              this.playExhale(intensity)
              const exhaleDuration = 2000
              const lungDecreasePerTick = this.lungFill / (exhaleDuration / 50)
              const exhaleTimer = setInterval(() => {
                this.lungFill = Math.max(0, this.lungFill - lungDecreasePerTick)
              }, 50)
              setTimeout(() => {
                clearInterval(exhaleTimer)
                this.lungFill = 0
                if (this.state === 'exhaling') {
                  this.state = 'lit'
                  this.showHint = true
                  this.hintText = '长按吸烟'
                }
              }, exhaleDuration)
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
            // 自动停止吸烟
            this.isPressing = false
            clearInterval(this.smokeTimer)
            this.smokeTimer = null
            this.stopBurnSound()
            
            // 计算吸入时长
            const puffDuration = MAX_PUFF_DURATION
            const progressFactor = 0.4 + (this.smokeProgress / 100) * 0.6
            const puffFactor = Math.min(2.0, 0.5 + puffDuration / 3000)
            const intensity = progressFactor * puffFactor
            
            this.state = 'exhaling'
            this.sessionExhaleCount++
            if (uni.vibrateShort) uni.vibrateShort({ type: 'light' })
            
            // 触发吐烟
            this.exhaleByIntensity(intensity)
            this.playExhale(intensity)
            
            // 吐烟过程中平滑减少肺部填充度
            const exhaleDuration = 2000
            const lungDecreasePerTick = this.lungFill / (exhaleDuration / 50)
            const exhaleTimer = setInterval(() => {
              this.lungFill = Math.max(0, this.lungFill - lungDecreasePerTick)
            }, 50)
            
            setTimeout(() => {
              clearInterval(exhaleTimer)
              this.lungFill = 0  // 确保完全重置
              if (this.state === 'exhaling') {
                this.state = 'lit'
                this.showHint = true
                this.hintText = '长按吸烟'
              }
            }, exhaleDuration)
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
        
        // 吐烟过程中平滑减少肺部填充度
        const exhaleDuration = 2200  // 吐烟动画时长
        const lungDecreasePerTick = this.lungFill / (exhaleDuration / 50)  // 每 50ms 减少的量
        const exhaleTimer = setInterval(() => {
          this.lungFill = Math.max(0, this.lungFill - lungDecreasePerTick)
        }, 50)
        
        setTimeout(() => {
          clearInterval(exhaleTimer)
          this.lungFill = 0  // 确保完全重置
          if (this.smokeProgress >= 100) {
            this.finishSmoking()
          } else {
            this.state = 'lit'
            this.showHint = true
            this.hintText = '长按继续吸'
          }
        }, exhaleDuration)
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

        // 肺部填充度增加：适中速度
        // 吸烟越久，增加越多
        const lungIncrease = 0.8 + (this.smokeProgress / 100) * 0.7  // 0.8 ~ 1.5% per tick
        this.lungFill = Math.min(100, this.lungFill + lungIncrease)

        // 肺部已满，强制停止吸烟
        if (this.lungFill >= 100) {
          clearInterval(this.smokeTimer)
          this.smokeTimer = null
          this.isPressing = false
          this.stopBurnSound()
          
          // 强制进入吐烟状态
          const intensity = 1.5 + (this.smokeProgress / 100) * 0.5
          this.state = 'exhaling'
          this.sessionExhaleCount++
          if (uni.vibrateShort) uni.vibrateShort({ type: 'heavy' })
          
          this.exhaleByIntensity(intensity)
          this.playExhale(intensity)
          
          // 吐烟过程中平滑减少肺部填充度
          const exhaleDuration = 2500
          const lungDecreasePerTick = this.lungFill / (exhaleDuration / 50)
          const exhaleTimer = setInterval(() => {
            this.lungFill = Math.max(0, this.lungFill - lungDecreasePerTick)
          }, 50)
          
          setTimeout(() => {
            clearInterval(exhaleTimer)
            this.lungFill = 0  // 确保完全重置
            if (this.state === 'exhaling') {
              this.state = 'lit'
              this.showHint = true
              this.hintText = '长按吸烟'
            }
          }, exhaleDuration)
          return
        }

        // 烟灰堆积：每 600ms 增长一点
        if (elapsed - lastAshTick > 500) {
          lastAshTick = elapsed
          this.growAsh(5)
        }

        if (this.smokeProgress >= 100) {
          this.finishSmoking()
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

    // 创建烟灰掉落粒子，数量与烟灰量成正比
    createAshParticles(ashAmount) {
      const container = this.$refs.cigarette3d?.$el || this.$refs.cigarette3d
      if (!container) return
      
      // 烟灰越多，碎片越多（基础 6 个，最多 20 个）
      const particleCount2 = Math.min(20, 6 + Math.floor(ashAmount / 15))
      
      for (let i = 0; i < particleCount2; i++) {
        const particle = document.createElement('div')
        particle.className = 'ash-particle'
        
        // 随机碎片大小
        const size = 3 + Math.random() * 6
        particle.style.width = size + 'px'
        particle.style.height = size * (0.5 + Math.random() * 0.7) + 'px'
        
        // 从烟灰两侧不规则落下
        // 左侧或右侧随机
        const side = Math.random() > 0.5 ? 1 : -1
        // 水平偏移：从烟身中心向两侧散开
        const startX = side * (5 + Math.random() * 15)
        // 垂直位置：烟灰顶部区域
        const startY = Math.random() * 15
        
        particle.style.left = `calc(50% + ${startX}px)`
        particle.style.top = `-${startY}px`
        
        // 运动方向：向下并向两侧散开
        const angle = (side > 0 ? 20 : -20) + (Math.random() - 0.5) * 40
        const velocity = 60 + Math.random() * 50
        const vx = Math.sin(angle * Math.PI / 180) * velocity * side
        const vy = Math.cos(angle * Math.PI / 180) * velocity
        
        // 随机旋转
        const rotation = (Math.random() - 0.5) * 540 * side
        
        // 设置动画变量
        particle.style.setProperty('--vx', vx + 'px')
        particle.style.setProperty('--vy', vy + 'px')
        particle.style.setProperty('--rotation', rotation + 'deg')
        
        // 随机延迟，让掉落更自然
        particle.style.animationDelay = (Math.random() * 0.15) + 's'
        
        container.appendChild(particle)
        
        // 动画结束后移除
        setTimeout(() => {
          if (particle.parentNode) {
            particle.parentNode.removeChild(particle)
          }
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
  left: 40rpx;
  width: 220rpx;
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
  width: 150rpx;
  height: 150rpx;
  overflow: hidden;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.05);
}

.lung-svg {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 2;
}

.lung-path {
  transition: fill 0.3s ease;
  stroke: rgba(255, 255, 255, 0.3);
  stroke-width: 1;
}

.lung-path.lung-full {
  animation: lungPulse 1s ease-in-out infinite;
}

.lung-trachea {
  opacity: 0.6;
}

.lung-fill-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  transition: height 0.3s ease;
  opacity: 0.6;
  z-index: 1;
  border-radius: 16rpx;
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

@keyframes lungPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
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
</style>
