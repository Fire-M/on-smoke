<template>
  <view class="smoke-root">
    <view class="stage">
      <canvas type="2d" id="smokeCanvas" class="smoke-canvas" @tap="puff"></canvas>
      <canvas type="2d" id="spriteCanvas" class="sprite-canvas"></canvas>
      <view class="tip">点击画面吐烟</view>
    </view>

    <view class="panel" :class="{ collapsed: collapsed }">
      <view class="panel-head" @tap="collapsed = !collapsed">
        <text>参数调节</text><text>{{ collapsed ? '▸' : '▾' }}</text>
      </view>
      <view class="panel-body" v-if="!collapsed">
        <view class="style-block">
          <view class="style-title" @tap="styleOpen = !styleOpen">
            <text>烟的样式</text><text>{{ styleOpen ? '▾' : '▸' }}</text>
          </view>
          <view class="style-list" v-if="styleOpen">
            <view v-for="m in modes" :key="m.k" class="style-item" :class="{ on: mode === m.k }" @tap="mode = m.k">{{ m.t }}</view>
          </view>
        </view>
        <view class="row" v-for="s in sliders" :key="s.k">
          <view class="lab"><text>{{ s.t }}</text><text>{{ fmt(s) }}</text></view>
          <slider
            :min="s.min" :max="s.max" :step="s.step" :value="values[s.k]"
            block-size="14" activeColor="#4fd1a5"
            @changing="onSlide(s, $event)" @change="onSlide(s, $event)"></slider>
        </view>
        <button class="reset" @tap="reset">重置默认</button>
      </view>
    </view>
  </view>
</template>

<script>
const DEFAULTS = {
  dprCap: 2,
  emitPerSec: 120,
  ambientPerSec: 6,
  buoyancy: 78,
  drag: 0.42,
  turbStrength: 64,
  noiseScale: 0.0036,
  timeScale: 0.16,
  octaves: 3,
  growRate: 34,
  lifeMin: 3.6,
  lifeMax: 5.8,
  rMin: 12,
  rMax: 24,
  startSpeed: 130,
  spread: 22,
  alphaMax: 0.06,
  alphaVar: 0.02,
};
const SLIDERS = [
  { k: 'emitPerSec',   t: '发射率(浓度)', min: 0,   max: 300, step: 5,     f: 0 },
  { k: 'alphaMax',     t: '单粒浓度',     min: 0,   max: 0.2, step: 0.005, f: 3 },
  { k: 'buoyancy',     t: '浮力(上冲)',   min: 0,   max: 150, step: 1,     f: 0 },
  { k: 'startSpeed',   t: '初速度',       min: 0,   max: 250, step: 5,     f: 0 },
  { k: 'turbStrength', t: '涡旋强度',     min: 0,   max: 120, step: 1,     f: 0 },
  { k: 'noiseScale',   t: '卷曲尺度(小=大卷)', min: 0.001, max: 0.012, step: 0.0002, f: 4 },
  { k: 'timeScale',    t: '演化速度',     min: 0,   max: 0.4, step: 0.005, f: 3 },
  { k: 'growRate',     t: '扩散速率',     min: 5,   max: 60,  step: 1,     f: 0 },
  { k: 'drag',         t: '阻力',         min: 0.1, max: 0.9, step: 0.02,  f: 2 },
  { k: 'lifeMax',      t: '寿命',         min: 2,   max: 10,  step: 0.2,   f: 1 },
  { k: 'spread',       t: '出口散布',     min: 0,   max: 60,  step: 1,     f: 0 },
  { k: 'rMin',         t: '最小粒径',     min: 6,   max: 30,  step: 1,     f: 0 },
  { k: 'rMax',         t: '最大粒径',     min: 10,  max: 50,  step: 1,     f: 0 },
  { k: 'octaves',      t: '湍流层数',     min: 1,   max: 5,   step: 1,     f: 0 },
];
const SP = 128;

function rand3(i, j, k) {
  let n = (i * 374761393 + j * 668265263 + k * 1274126177) | 0;
  n = (n ^ (n >> 13)) * 1274126177;
  n = n ^ (n >> 16);
  return (n >>> 0) / 4294967295;
}
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = smooth(xf), v = smooth(yf), w = smooth(zf);
  const c000 = rand3(xi, yi, zi),     c100 = rand3(xi + 1, yi, zi);
  const c010 = rand3(xi, yi + 1, zi), c110 = rand3(xi + 1, yi + 1, zi);
  const c001 = rand3(xi, yi, zi + 1), c101 = rand3(xi + 1, yi, zi + 1);
  const c011 = rand3(xi, yi + 1, zi + 1), c111 = rand3(xi + 1, yi + 1, zi + 1);
  const x00 = lerp(c000, c100, u), x10 = lerp(c010, c110, u);
  const x01 = lerp(c001, c101, u), x11 = lerp(c011, c111, u);
  return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w);
}

export default {
  name: 'Smoke',
  props: {
    autoStart: { type: Boolean, default: true },
  },
  data() {
    return {
      collapsed: true,
      styleOpen: false,
      mode: 'normal',
      modes: [
        { k: 'normal', t: '普通呼出' },
        { k: 'ring', t: '烟圈' },
        { k: 'burst', t: '爆发' },
      ],
      values: Object.assign({}, DEFAULTS),
      sliders: SLIDERS,
    };
  },
  onReady() {
    this.cfg = Object.assign({}, DEFAULTS);
    this.pool = [];
    this.active = [];
    this.cv = { x: 0, y: 0 };
    this._c = { x: 0, y: 0 };
    this.emitting = false;
    this.puffTimer = 0;
    this.ambientAcc = 0;
    this.last = null;
    this.initCanvas();
  },
  onUnload() {
    this.stopLoop();
  },
  methods: {
    initCanvas() {
      uni.createSelectorQuery().in(this)
        .select('#smokeCanvas').fields({ node: true, size: true })
        .select('#spriteCanvas').fields({ node: true, size: true })
        .exec(res => {
          if (!res || !res[0] || !res[1]) return;
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          const dpr = Math.min(uni.getSystemInfoSync().pixelRatio || 1, this.cfg.dprCap);
          this.W = res[0].width;
          this.H = res[0].height;
          canvas.width = this.W * dpr;
          canvas.height = this.H * dpr;
          ctx.scale(dpr, dpr);
          this.canvas = canvas;
          this.ctx = ctx;

          const sc = res[1].node;
          sc.width = SP; sc.height = SP;
          const sx = sc.getContext('2d');
          const g = sx.createRadialGradient(SP / 2, SP / 2, 0, SP / 2, SP / 2, SP / 2);
          g.addColorStop(0.0, 'rgba(255,255,255,1)');
          g.addColorStop(0.35, 'rgba(245,245,248,0.55)');
          g.addColorStop(1.0, 'rgba(255,255,255,0)');
          sx.fillStyle = g;
          sx.fillRect(0, 0, SP, SP);
          this.sprite = sc;

          this.updateEmitter();
          this.startLoop();
        });
    },
    updateEmitter() {
      this.emitX = this.W * 0.5;
      this.emitY = this.H * 0.76;
    },
    startLoop() {
      const canvas = this.canvas;
      this.raf = (canvas.requestAnimationFrame)
        ? canvas.requestAnimationFrame.bind(canvas)
        : (typeof requestAnimationFrame === 'function'
            ? requestAnimationFrame
            : (cb) => setTimeout(() => cb(Date.now()), 16));
      const loop = (now) => {
        if (this.last == null) this.last = now;
        let dt = (now - this.last) / 1000;
        this.last = now;
        if (dt > 0.05) dt = 0.05;
        this.frame(dt, now);
        this.rafId = this.raf(loop);
      };
      this.rafId = this.raf(loop);
    },
    stopLoop() {
      if (this.rafId == null) return;
      if (this.canvas && this.canvas.cancelAnimationFrame) this.canvas.cancelAnimationFrame(this.rafId);
      else if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.rafId);
    },
    spawn(x, y, vx, vy, life, r0, phase, alphaMax) {
      const p = this.pool.pop() || {};
      p.x = x; p.y = y; p.vx = vx; p.vy = vy;
      p.age = 0; p.life = life; p.r0 = r0;
      p.phase = phase; p.alphaMax = alphaMax;
      p.seedX = Math.random() * 1000;
      p.seedY = Math.random() * 1000;
      p.seedT = Math.random() * 50;
      p.grow = this.cfg.growRate * (0.45 + Math.random() * 1.2);
      this.active.push(p);
      return p;
    },
    puff() {
      this.collapsed = true;
      if (this.mode === 'ring') {
        this.emitRing();
        this.emitting = false;
      } else if (this.mode === 'burst') {
        this.emitting = true;
        this.puffTimer = 0.28;
      } else {
        this.emitting = true;
        this.puffTimer = 0.95;
      }
    },
    emitBurst(dt) {
      if (!this.emitting) return;
      this.puffTimer -= dt;
      if (this.puffTimer <= 0) this.emitting = false;
      if (this.mode === 'burst') this.emitBurstMode(dt);
      else this.emitNormal(dt);
    },
    emitNormal(dt) {
      const cfg = this.cfg;
      let n = Math.floor(cfg.emitPerSec * dt + Math.random());
      while (n-- > 0) {
        if (this.active.length >= 460) break;
        const ang = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
        const sp = cfg.startSpeed * (0.45 + Math.random() * 1.1);
        const sx = this.emitX + (Math.random() - 0.5) * cfg.spread * 1.6;
        const sy = this.emitY + (Math.random() - 0.5) * cfg.spread * 0.8;
        const life = cfg.lifeMin + Math.random() * (cfg.lifeMax - cfg.lifeMin);
        const depth = Math.random();
        const r0 = (cfg.rMin + Math.random() * (cfg.rMax - cfg.rMin)) * (0.45 + depth * 0.95);
        const aMax = (cfg.alphaMax + Math.random() * cfg.alphaVar) * (0.25 + depth * 1.2);
        const p = this.spawn(sx, sy, Math.cos(ang) * sp * 0.3, Math.sin(ang) * sp, life, r0, Math.random() * 6.28, aMax);
        p.depth = depth;
      }
      this.ambientAcc += cfg.ambientPerSec * dt;
      while (this.ambientAcc >= 1) {
        this.ambientAcc -= 1;
        if (this.active.length < 460) {
          const life = cfg.lifeMin + Math.random() * 2;
          const depth = Math.random() * 0.6;
          const r0 = cfg.rMin * (0.4 + depth);
          const aMax = cfg.alphaMax * (0.2 + depth);
          const p = this.spawn(this.emitX + (Math.random() - 0.5) * 8, this.emitY + 6,
            (Math.random() - 0.5) * 14, -30 - Math.random() * 30, life, r0, Math.random() * 6.28, aMax);
          p.depth = depth;
        }
      }
    },
    emitRing() {
      const cfg = this.cfg;
      const count = 46;
      for (let i = 0; i < count; i++) {
        const th = (i / count) * Math.PI * 2;
        const r0 = cfg.rMin * 0.7 + Math.random() * (cfg.rMax - cfg.rMin) * 0.6;
        const aMax = (cfg.alphaMax + Math.random() * cfg.alphaVar) * (0.4 + Math.random() * 1.0);
        const p = this.spawn(this.emitX, this.emitY, 0, 0, cfg.lifeMin + Math.random() * (cfg.lifeMax - cfg.lifeMin), r0, th, aMax);
        p.depth = Math.random();
        p.kind = 'ring';
        p.angle = th;
        p.baseR = 42 + Math.random() * 8;
        p.rgrow = 16 + Math.random() * 10;
        p.rise = cfg.startSpeed * 0.7;
        p.squash = 0.5 + Math.random() * 0.12;
        p.swirl = 0.25 + Math.random() * 0.2;
        p.cx = this.emitX;
        p.cy = this.emitY;
      }
    },
    emitBurstMode(dt) {
      const cfg = this.cfg;
      let n = Math.floor(cfg.emitPerSec * 1.6 * dt + Math.random());
      while (n-- > 0) {
        if (this.active.length >= 460) break;
        const dir = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
        const sp = cfg.startSpeed * (0.6 + Math.random() * 1.3);
        const sx = this.emitX + (Math.random() - 0.5) * 10;
        const sy = this.emitY + (Math.random() - 0.5) * 10;
        const depth = Math.random();
        const r0 = (cfg.rMin + Math.random() * (cfg.rMax - cfg.rMin)) * (0.5 + depth * 0.8);
        const aMax = (cfg.alphaMax + Math.random() * cfg.alphaVar) * (0.3 + depth * 1.1);
        const p = this.spawn(sx, sy, Math.cos(dir) * sp * 0.5, -Math.abs(Math.sin(dir)) * sp,
          cfg.lifeMin + Math.random() * (cfg.lifeMax - cfg.lifeMin), r0, Math.random() * 6.28, aMax);
        p.depth = depth;
      }
    },
    curl(x, y, t, out) {
      const EPS = 1.0;
      const n1 = noise3(x, y + EPS, t), n2 = noise3(x, y - EPS, t);
      const n3 = noise3(x + EPS, y, t), n4 = noise3(x - EPS, y, t);
      const dpdx = (n3 - n4) / (2 * EPS);
      const dpdy = (n1 - n2) / (2 * EPS);
      out.x = dpdy; out.y = -dpdx;
    },
    fbmCurl(x, y, t, out) {
      const cfg = this.cfg;
      let amp = 1, freq = 1, sx = 0, sy = 0;
      for (let o = 0; o < cfg.octaves; o++) {
        this.curl(x * freq, y * freq, t * (1 + o * 0.6), this._c);
        sx += this._c.x * amp; sy += this._c.y * amp;
        freq *= 2.1; amp *= 0.5;
      }
      out.x = sx; out.y = sy;
    },
    frame(dt, now) {
      const cfg = this.cfg, ctx = this.ctx;
      const t = now * 0.001 * cfg.timeScale;
      this.emitBurst(dt);

      ctx.clearRect(0, 0, this.W, this.H);
      const bg = ctx.createRadialGradient(this.W / 2, this.H * 0.8, 0, this.W / 2, this.H * 0.8, Math.max(this.W, this.H) * 0.7);
      bg.addColorStop(0, '#0c0e12');
      bg.addColorStop(1, '#050608');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, this.W, this.H);

      const em = ctx.createRadialGradient(this.emitX, this.emitY, 0, this.emitX, this.emitY, 16);
      em.addColorStop(0, 'rgba(255,150,60,0.32)');
      em.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = em;
      ctx.beginPath(); ctx.arc(this.emitX, this.emitY, 16, 0, 7); ctx.fill();

      ctx.globalCompositeOperation = 'source-over';
      for (let i = this.active.length - 1; i >= 0; i--) {
        const p = this.active[i];
        p.age += dt;
        if (p.age >= p.life) { this.active.splice(i, 1); this.pool.push(p); continue; }

        let r;
        if (p.kind === 'ring') {
          const age = p.age;
          const rr = p.baseR + p.rgrow * age;
          const cy = p.cy - p.rise * age;
          const ang = p.angle + p.swirl * age;
          const wob = (noise3(p.seedX + age * 0.6, p.seedY, 1.3) - 0.5) * 0.22;
          p.x = p.cx + Math.cos(ang) * rr * (1 + wob);
          p.y = cy + Math.sin(ang) * rr * p.squash * (1 + wob);
          r = p.r0 + age * p.grow;
        } else {
          this.fbmCurl((p.x + p.seedX) * cfg.noiseScale, (p.y + p.seedY) * cfg.noiseScale, t + p.seedT, this.cv);
          const turb = cfg.turbStrength * (0.6 + (p.depth || 0.5) * 0.8);
          p.vx += this.cv.x * turb * dt;
          p.vy += -cfg.buoyancy * dt + this.cv.y * turb * 0.35 * dt;
          const d = 1 - Math.min(cfg.drag * dt, 1);
          p.vx *= d; p.vy *= d;
          p.x += p.vx * dt; p.y += p.vy * dt;
          r = p.r0 + p.age * p.grow;
        }

        const k = p.age / p.life;
        let fade;
        if (k < 0.15) fade = k / 0.15;
        else if (k < 0.6) fade = 0.7;
        else fade = 0.7 * (1 - (k - 0.6) / 0.4);
        const a = Math.max(0, fade) * p.alphaMax;
        const s = r * 2;
        ctx.globalAlpha = a;
        ctx.drawImage(this.sprite, p.x - r, p.y - r, s, s);
      }
      ctx.globalAlpha = 1;
    },
    onSlide(s, e) {
      const v = e.detail.value;
      this.values[s.k] = v;
      if (s.k === 'lifeMax') { this.cfg.lifeMax = v; this.cfg.lifeMin = v * 0.7; }
      else this.cfg[s.k] = v;
    },
    fmt(s) {
      const v = this.values[s.k];
      return (typeof v === 'number') ? v.toFixed(s.f) : v;
    },
    reset() {
      Object.keys(DEFAULTS).forEach(k => {
        this.cfg[k] = DEFAULTS[k];
        this.values[k] = DEFAULTS[k];
      });
      this.cfg.lifeMin = DEFAULTS.lifeMax * 0.7;
    },
  },
};
</script>

<style scoped>
.smoke-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #050608;
  overflow: hidden;
}
.stage {
  position: relative;
  flex: 1;
  width: 100%;
}
.smoke-canvas {
  width: 100%;
  height: 100%;
}
.tip {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 18px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
  pointer-events: none;
}
.sprite-canvas {
  position: absolute;
  left: -9999px;
  top: 0;
  width: 128px;
  height: 128px;
}
.panel {
  background: rgba(16, 18, 22, 0.92);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: #cfd3da;
  font-size: 12px;
  max-height: 46%;
  display: flex;
  flex-direction: column;
}
.panel-head {
  padding: 9px 12px;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #9fe7c8;
}
.panel-body {
  padding: 4px 12px 12px;
  overflow-y: auto;
}
.row {
  margin: 7px 0;
}
.lab {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2px;
}
.lab text:last-child {
  color: #8a9099;
}
.style-block {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 6px;
}
.style-title {
  display: flex;
  justify-content: space-between;
  padding: 6px 2px;
  color: #9fe7c8;
}
.style-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 2px 0 8px;
}
.style-item {
  padding: 4px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  color: #cfd3da;
  font-size: 12px;
}
.style-item.on {
  background: rgba(79, 209, 165, 0.25);
  color: #9fe7c8;
}
.reset {
  margin-top: 8px;
  width: 100%;
  font-size: 12px;
  background: rgba(79, 209, 165, 0.18);
  color: #9fe7c8;
}
.reset::after { border: none; }
</style>
