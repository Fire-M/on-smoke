/**
 * 小程序兼容的 2D 香烟小人引擎
 * 与 H5 的 three.js 版本（pet-engine.js）观感一致：白色烟身、米色滤嘴、金色环带、
 * 顶部红色燃烧端 + 灰烬、脸部（眼睛/眨眼/腮红/微笑）、小手小腿、上升烟雾，
 * 以及头部/眼睛/颈部三类装扮。纯 Canvas 2D，无任何 WebGL / DOM 依赖。
 */
export function createPetCanvas2D() {
  let canvas = null, ctx = null, W = 0, H = 0
  let scale = 1, baseY = 0, topCharY = 0, sx = 1, mood = 'normal'
  let animId = null, startTime = 0
  let raf = null
  let acc = { head: null, eyes: null, neck: null }
  let smoke = []

  // 世界坐标(以 foot 底部为 y=-0.2) → 画布像素
  const PX = (wx) => W / 2 + wx * sx
  const PY = (wy) => baseY - (wy + 0.2) * scale

  function rr(x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + rad, y)
    ctx.arcTo(x + w, y, x + w, y + h, rad)
    ctx.arcTo(x + w, y + h, x, y + h, rad)
    ctx.arcTo(x, y + h, x, y, rad)
    ctx.arcTo(x, y, x + w, y, rad)
    ctx.closePath()
  }
  function ellipseFill(x, y, rx, ry) {
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  function triangle(ax, ay, bx, by, cx, cy) {
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.lineTo(cx, cy)
    ctx.closePath()
    ctx.fill()
  }
  function softCircle(x, y, r, rgb, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, 'rgba(' + rgb + ',' + alpha + ')')
    g.addColorStop(1, 'rgba(' + rgb + ',0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // ---- 身体部件 ----
  function drawLegs() {
    ctx.fillStyle = '#FFDBAC'
    ellipseFill(PX(-0.12), PY(-0.1), scale * 0.06, scale * 0.05)
    ellipseFill(PX(0.12), PY(-0.1), scale * 0.06, scale * 0.05)
    ellipseFill(PX(-0.12), PY(-0.2), scale * 0.07, scale * 0.04)
    ellipseFill(PX(0.12), PY(-0.2), scale * 0.07, scale * 0.04)
  }

  function drawFilter() {
    const x = PX(-0.32)
    const w = sx * 0.64
    const yTop = PY(0.7)
    const h = PY(0.0) - PY(0.7)
    const g = ctx.createLinearGradient(x, 0, x + w, 0)
    g.addColorStop(0, '#b87f3e')
    g.addColorStop(0.5, '#d4944a')
    g.addColorStop(1, '#a9742f')
    ctx.fillStyle = g
    rr(x, yTop, w, h, scale * 0.18)
    ctx.fill()
    ctx.strokeStyle = '#BF7F30'
    ctx.lineWidth = scale * 0.02
    for (let i = 0; i < 3; i++) {
      const yy = PY(0.15 + i * 0.2)
      ctx.beginPath()
      ctx.moveTo(x, yy)
      ctx.lineTo(x + w, yy)
      ctx.stroke()
    }
  }

  function drawBody() {
    const x = PX(-0.32)
    const w = sx * 0.64
    const yTop = PY(2.76)
    const h = PY(0.73) - PY(2.76)
    const g = ctx.createLinearGradient(x, 0, x + w, 0)
    g.addColorStop(0, '#e7dfd0')
    g.addColorStop(0.45, '#fdfaf3')
    g.addColorStop(0.55, '#fdfaf3')
    g.addColorStop(1, '#d6ccb9')
    ctx.fillStyle = g
    rr(x, yTop, w, h, scale * 0.26)
    ctx.fill()
    ctx.fillStyle = '#C8A84E'
    rr(PX(-0.33), PY(0.76), sx * 0.66, scale * 0.06, scale * 0.02)
    ctx.fill()
  }

  function drawArms() {
    ctx.strokeStyle = '#FFDBAC'
    ctx.lineWidth = scale * 0.06
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(PX(-0.30), PY(1.5))
    ctx.lineTo(PX(-0.48), PY(1.38))
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(PX(0.30), PY(1.5))
    ctx.lineTo(PX(0.48), PY(1.38))
    ctx.stroke()
    ctx.fillStyle = '#FFDBAC'
    ellipseFill(PX(-0.48), PY(1.38), scale * 0.05, scale * 0.05)
    ellipseFill(PX(0.48), PY(1.38), scale * 0.05, scale * 0.05)
  }

  function drawEye(x, y, blinking) {
    if (blinking) {
      ctx.strokeStyle = '#FAF5EE'
      ctx.lineWidth = scale * 0.03
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(x - scale * 0.06, y)
      ctx.lineTo(x + scale * 0.06, y)
      ctx.stroke()
      return
    }
    ctx.fillStyle = '#ffffff'
    ellipseFill(x, y, scale * 0.06, scale * 0.07)
    ctx.fillStyle = '#4BA8BF'
    ellipseFill(x, y + scale * 0.01, scale * 0.045, scale * 0.05)
    ctx.fillStyle = '#1a1a1a'
    ellipseFill(x, y + scale * 0.01, scale * 0.022, scale * 0.025)
    ctx.fillStyle = '#ffffff'
    ellipseFill(x + scale * 0.015, y - scale * 0.01, scale * 0.012, scale * 0.012)
  }

  function drawFace(t) {
    const bob = Math.sin(t * 0.9) * scale * 0.02
    const lx = PX(-0.14), rx = PX(0.14)
    const eyY = PY(2.2) + bob
    if (mood !== 'sad') {
      ctx.fillStyle = 'rgba(255,182,193,0.45)'
      ellipseFill(PX(-0.22), PY(2.1) + bob, scale * 0.05, scale * 0.035)
      ellipseFill(PX(0.22), PY(2.1) + bob, scale * 0.05, scale * 0.035)
    }
    const blinking = (t % 4) > 3.6
    drawEye(lx, eyY, blinking)
    drawEye(rx, eyY, blinking)
    // 嘴部表情随心情变化
    ctx.strokeStyle = '#5B4335'
    ctx.lineWidth = scale * 0.025
    ctx.lineCap = 'round'
    const mY = eyY + scale * 0.12
    if (mood === 'sad') {
      ctx.beginPath()
      ctx.moveTo(lx + scale * 0.05, mY)
      ctx.quadraticCurveTo(PX(0), mY - scale * 0.06, rx - scale * 0.05, mY)
      ctx.stroke()
    } else {
      const depth = mood === 'happy' ? scale * 0.18 : scale * 0.13
      ctx.beginPath()
      ctx.moveTo(lx + scale * 0.04, mY)
      ctx.quadraticCurveTo(PX(0), mY + depth, rx - scale * 0.04, mY)
      ctx.stroke()
    }
  }

  function drawCherry(t) {
    const x = W / 2
    const y = PY(2.81)
    const pulse = 0.4 + Math.sin(t * 3) * 0.3
    softCircle(x, y, scale * 0.22, '255,69,0', 0.2 + pulse * 0.4)
    ctx.fillStyle = '#FF4500'
    ellipseFill(x, y, scale * 0.10, scale * 0.05)
  }

  function drawAsh() {
    ctx.fillStyle = '#888888'
    ellipseFill(W / 2, PY(2.92), scale * 0.09, scale * 0.045)
  }

  // ---- 装扮 ----
  function drawHeadAcc(type, x, y) {
    if (type === 'crown') {
      ctx.fillStyle = '#FFD700'
      ctx.beginPath()
      ctx.ellipse(x, y, scale * 0.20, scale * 0.05, 0, 0, Math.PI * 2)
      ctx.fill()
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2
        const sx = x + Math.cos(a) * scale * 0.20
        const sy = y + Math.sin(a) * scale * 0.05
        triangle(sx - scale * 0.03, sy, sx, sy - scale * 0.16, sx + scale * 0.03, sy)
      }
      ctx.fillStyle = '#FF0000'
      ellipseFill(x, y - scale * 0.02, scale * 0.03, scale * 0.03)
    } else if (type === 'tophat') {
      ctx.fillStyle = '#1a1a1a'
      ctx.beginPath()
      ctx.ellipse(x, y, scale * 0.28, scale * 0.06, 0, 0, Math.PI * 2)
      ctx.fill()
      rr(x - scale * 0.17, y - scale * 0.30, scale * 0.34, scale * 0.30, scale * 0.02)
      ctx.fill()
      ctx.fillStyle = '#8B0000'
      rr(x - scale * 0.17, y - scale * 0.10, scale * 0.34, scale * 0.05, 0)
      ctx.fill()
    } else if (type === 'bow') {
      ctx.fillStyle = '#FF69B4'
      triangle(x - scale * 0.02, y, x - scale * 0.16, y - scale * 0.08, x - scale * 0.16, y + scale * 0.08)
      triangle(x + scale * 0.02, y, x + scale * 0.16, y - scale * 0.08, x + scale * 0.16, y + scale * 0.08)
      ctx.fillStyle = '#FF1493'
      ellipseFill(x, y, scale * 0.04, scale * 0.04)
    } else if (type === 'flower') {
      ctx.fillStyle = '#FFB7C5'
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2
        ellipseFill(x + Math.cos(a) * scale * 0.10, y + Math.sin(a) * scale * 0.10, scale * 0.05, scale * 0.05)
      }
      ctx.fillStyle = '#FFD700'
      ellipseFill(x, y, scale * 0.04, scale * 0.04)
    }
  }

  function drawEyesAcc(type, lx, rx, y) {
    if (type === 'glasses') {
      ctx.strokeStyle = '#333333'
      ctx.lineWidth = scale * 0.02
      ctx.beginPath(); ctx.arc(lx, y, scale * 0.10, 0, Math.PI * 2); ctx.stroke()
      ctx.beginPath(); ctx.arc(rx, y, scale * 0.10, 0, Math.PI * 2); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(lx + scale * 0.10, y); ctx.lineTo(rx - scale * 0.10, y); ctx.stroke()
    } else if (type === 'sunglasses') {
      ctx.fillStyle = '#111111'
      ellipseFill(lx, y, scale * 0.11, scale * 0.085)
      ellipseFill(rx, y, scale * 0.11, scale * 0.085)
      ctx.strokeStyle = '#222222'
      ctx.lineWidth = scale * 0.02
      ctx.beginPath(); ctx.moveTo(lx + scale * 0.10, y); ctx.lineTo(rx - scale * 0.10, y); ctx.stroke()
    } else if (type === 'monocle') {
      ctx.strokeStyle = '#DAA520'
      ctx.lineWidth = scale * 0.02
      ctx.beginPath(); ctx.arc(rx, y, scale * 0.10, 0, Math.PI * 2); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(rx, y + scale * 0.10); ctx.lineTo(rx + scale * 0.02, y + scale * 0.28); ctx.lineTo(rx - scale * 0.03, y + scale * 0.40); ctx.stroke()
    }
  }

  function drawNeckAcc(type, x, y) {
    if (type === 'bowtie') {
      ctx.fillStyle = '#DC143C'
      triangle(x - scale * 0.02, y, x - scale * 0.16, y - scale * 0.08, x - scale * 0.16, y + scale * 0.08)
      triangle(x + scale * 0.02, y, x + scale * 0.16, y - scale * 0.08, x + scale * 0.16, y + scale * 0.08)
      ctx.fillStyle = '#B22222'
      ellipseFill(x, y, scale * 0.03, scale * 0.03)
    } else if (type === 'necklace') {
      ctx.strokeStyle = '#DAA520'
      ctx.lineWidth = scale * 0.02
      ctx.beginPath(); ctx.ellipse(x, y, scale * 0.22, scale * 0.07, 0, 0, Math.PI); ctx.stroke()
      ctx.fillStyle = '#FF4500'
      ellipseFill(x, y + scale * 0.10, scale * 0.035, scale * 0.035)
    } else if (type === 'scarf') {
      ctx.fillStyle = '#4169E1'
      ctx.beginPath(); ctx.ellipse(x, y, scale * 0.25, scale * 0.07, 0, 0, Math.PI * 2); ctx.fill()
      rr(x + scale * 0.10, y, scale * 0.06, scale * 0.20, scale * 0.02); ctx.fill()
    } else if (type === 'collar') {
      ctx.strokeStyle = '#DC143C'
      ctx.lineWidth = scale * 0.02
      ctx.beginPath(); ctx.ellipse(x, y, scale * 0.23, scale * 0.06, 0, 0, Math.PI * 2); ctx.stroke()
      ctx.fillStyle = '#FFD700'
      ellipseFill(x, y + scale * 0.06, scale * 0.035, scale * 0.035)
    }
  }

  function drawAccessories(t) {
    const bob = Math.sin(t * 0.9) * scale * 0.02
    const lx = PX(-0.14), rx = PX(0.14)
    const eyY = PY(2.2) + bob
    if (acc.head && acc.head.type) drawHeadAcc(acc.head.type, W / 2, PY(3.05))
    if (acc.eyes && acc.eyes.type) drawEyesAcc(acc.eyes.type, lx, rx, eyY)
    if (acc.neck && acc.neck.type) drawNeckAcc(acc.neck.type, W / 2, PY(0.73))
  }

  function drawSmoke(t) {
    if (smoke.length < 18 && Math.random() < 0.5) {
      smoke.push({
        x: W / 2 + (Math.random() - 0.5) * scale * 0.10,
        y: PY(2.95),
        r: scale * 0.05 * (0.6 + Math.random() * 0.8),
        life: 0,
        max: 2.2 + Math.random() * 1.5,
        seed: Math.random() * 6.28
      })
    }
    for (let i = smoke.length - 1; i >= 0; i--) {
      const p = smoke[i]
      p.life += 1 / 60
      if (p.life >= p.max) { smoke.splice(i, 1); continue }
      const k = p.life / p.max
      const yy = p.y - k * (scale * 1.6)
      const xx = p.x + Math.sin((p.life + p.seed) * 2) * scale * 0.08
      const a = 0.35 * (1 - k)
      const r = p.r * (1 + k * 1.2)
      softCircle(xx, yy, r, '200,200,200', a)
    }
  }

  function draw(now) {
    const t = (now - startTime) / 1000
    ctx.clearRect(0, 0, W, H)

    // 正面呼吸浮动（不可旋转）
    const bobY = Math.sin(t * 0.8) * (scale * 0.02)
    ctx.save()
    ctx.translate(0, bobY)

    // 地面阴影
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.beginPath()
    ctx.ellipse(W / 2, baseY + scale * 0.02, sx * 0.5, scale * 0.08, 0, 0, Math.PI * 2)
    ctx.fill()

    drawLegs()
    drawFilter()
    drawBody()
    drawArms()
    drawFace(t)
    drawCherry(t)
    drawAsh()
    drawAccessories(t)

    ctx.restore()

    // 烟雾（最上层，不随身体倾斜）
    drawSmoke(t)

    animId = raf(draw)
  }

  function attach(c, context, w, h) {
    canvas = c
    ctx = context
    W = w
    H = h
    baseY = H * 0.83
    topCharY = H * 0.15
    scale = (baseY - topCharY) / 3.12
    sx = scale * 1.3
  }

  function updateAccessories(a) {
    acc = {
      head: a && a.head ? { type: a.head.type } : null,
      eyes: a && a.eyes ? { type: a.eyes.type } : null,
      neck: a && a.neck ? { type: a.neck.type } : null
    }
  }

  function setMood(m) { mood = m || 'normal' }

  function start() {
    if (animId || !canvas || !ctx) return
    startTime = Date.now()
    raf = canvas.requestAnimationFrame
      ? canvas.requestAnimationFrame.bind(canvas)
      : (cb) => setTimeout(() => cb(Date.now()), 16)
    animId = raf(draw)
  }

  function stop() {
    if (animId && canvas && canvas.cancelAnimationFrame) canvas.cancelAnimationFrame(animId)
    animId = null
  }

  function destroy() {
    stop()
    smoke = []
    canvas = null
    ctx = null
  }

  return { attach, start, stop, destroy, updateAccessories, setMood }
}
