/**
 * confetti.js —— 撒花粒子引擎（canvas-confetti 同款物理模型）
 *
 * 参考 https://juejin.cn/post/7150201876066074661 介绍的 canvas-confetti：
 * 一次 fire() 发射一批粒子，粒子自带「初速度 + 扩散角 + 重力 + 生命周期」，
 * 自行衰减消亡，不会常驻循环，所以不需要手动清理。
 *
 * 与原文库的差别只有渲染层：canvas-confetti 依赖 document / window，
 * 小程序没有 DOM，这里改成接收一个 <canvas type="2d"> 节点和它的 ctx，
 * 参数名与语义保持和原文一致：
 *   particleCount / angle / spread / origin{x,y} / gravity / ticks /
 *   startVelocity / colors / shapes / scalar / decay / drift
 */

const DEFAULTS = {
  particleCount: 50,
  angle: 90,          // 90 = 正上方；0 = 右；180 = 左
  spread: 45,         // 以 angle 为中心左右各展开 spread/2
  startVelocity: 45,  // 初速度（px/帧）
  decay: 0.9,         // 速度衰减
  gravity: 1,         // 重力（0 悬浮，负值上飘）
  drift: 0,           // 横向恒定漂移
  ticks: 200,         // 存活帧数，越小消失越快
  scalar: 1,          // 粒子尺寸倍率
  origin: { x: 0.5, y: 0.5 },
  // 只作兜底：默认走中性色，不偏向任何一套主题。
  // 实际调用方（首页 burstConfetti）会把当前主题的 primary / primary-2 / accent 传进来。
  colors: ['#f8fafc', '#cbd5e1', '#94a3b8'],
  shapes: ['square', 'circle']
}

// 数组里重复出现的项 = 更高概率（原文用重复做权重分配）
function pick(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function randomInRange(min, max) {
  return Math.random() * (max - min) + min
}

export function createConfetti(canvas, ctx, width, height, onIdle) {
  let particles = []
  let rafId = null
  let size = { width: width || 0, height: height || 0 }
  let dead = false

  // 起帧和取消必须成对：小程序 Canvas 2D 只有 canvas.requestAnimationFrame
  const useCanvasRaf = !!(canvas && typeof canvas.requestAnimationFrame === 'function')
  const raf = useCanvasRaf
    ? canvas.requestAnimationFrame.bind(canvas)
    : (typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (cb) => setTimeout(() => cb(Date.now()), 16))
  const caf = (useCanvasRaf && typeof canvas.cancelAnimationFrame === 'function')
    ? canvas.cancelAnimationFrame.bind(canvas)
    : (typeof cancelAnimationFrame === 'function'
      ? cancelAnimationFrame
      : (id) => clearTimeout(id))

  function fire(options = {}) {
    if (!ctx || dead) return
    const o = { ...DEFAULTS, ...options }
    const origin = { ...DEFAULTS.origin, ...(options.origin || {}) }

    // 角度换算：屏幕坐标 y 向下，所以取负号让 90° 指向正上方
    const angle2D = (-o.angle * Math.PI) / 180
    const spread2D = (o.spread * Math.PI) / 180
    const baseX = origin.x * size.width
    const baseY = origin.y * size.height

    for (let i = 0; i < o.particleCount; i++) {
      const particleAngle = angle2D + randomInRange(-0.5, 0.5) * spread2D
      const velocity = o.startVelocity * (0.5 + Math.random())
      const scalar = o.scalar * randomInRange(0.7, 1.3)

      particles.push({
        x: baseX,
        y: baseY,
        vx: Math.cos(particleAngle) * velocity,
        vy: Math.sin(particleAngle) * velocity,
        decay: o.decay,
        gravity: o.gravity,
        drift: o.drift,
        ticks: Math.round(o.ticks * randomInRange(0.8, 1.2)),
        totalTicks: o.ticks,
        scalar,
        color: pick(o.colors),
        shape: pick(o.shapes),
        // 纸片翻转：用余弦压缩纵向高度，做出「翻面」的错觉
        tilt: Math.random() * Math.PI * 2,
        tiltSpeed: randomInRange(0.06, 0.16) * (Math.random() > 0.5 ? 1 : -1),
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: randomInRange(-0.25, 0.25)
      })
    }

    if (rafId == null) loop()
  }

  function loop() {
    if (dead) return
    rafId = raf(step)
  }

  function step() {
    rafId = null
    if (dead) return
    if (!ctx) return

    ctx.clearRect(0, 0, size.width, size.height)

    const alive = []
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]

      p.x += p.vx + p.drift
      p.y += p.vy + p.gravity
      p.vx *= p.decay
      p.vy = p.vy * p.decay + p.gravity * 0.06
      p.tilt += p.tiltSpeed
      p.rotation += p.rotationSpeed
      p.ticks--

      if (p.ticks <= 0 || p.y > size.height + 60) continue
      alive.push(p)
      draw(p)
    }
    particles = alive

    if (particles.length) {
      loop()
    } else {
      ctx.clearRect(0, 0, size.width, size.height)
      // 这一炮放完了：通知页面把全屏 canvas 藏起来。
      // 常驻的全屏 canvas 会让滚动时多一层合成，隐藏后就没这块开销了。
      if (onIdle) onIdle()
    }
  }

  function draw(p) {
    // 最后 20% 生命淡出，不要硬消失
    const life = p.ticks / (p.totalTicks || 1)
    ctx.globalAlpha = life < 0.2 ? Math.max(0, life / 0.2) : 1
    ctx.fillStyle = p.color

    const w = 8 * p.scalar
    const h = 12 * p.scalar

    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rotation)

    if (p.shape === 'circle') {
      ctx.beginPath()
      ctx.arc(0, 0, w / 2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // 纵向按 cos 压缩 = 纸片翻转的透视感
      const flip = Math.abs(Math.cos(p.tilt))
      ctx.scale(1, Math.max(0.15, flip))
      ctx.fillRect(-w / 2, -h / 2, w, h)
    }

    ctx.restore()
    ctx.globalAlpha = 1
  }

  function resize(w, h) {
    size = { width: w, height: h }
  }

  function destroy() {
    dead = true
    if (rafId != null) {
      try { caf(rafId) } catch (e) {}
      rafId = null
    }
    particles = []
    if (ctx) ctx.clearRect(0, 0, size.width, size.height)
  }

  return {
    fire,
    resize,
    destroy,
    get count() { return particles.length }
  }
}

export default createConfetti
