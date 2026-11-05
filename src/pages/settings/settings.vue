<template>
  <view class="page-container" :class="themeClass()">
    <app-navbar title="设置"></app-navbar>
    <scroll-view scroll-y class="main-scroll">
      <view class="p-20 pb-100">

        <!-- 外观：五个主题横向排开。原来各占一整行，首屏一半都花在挑颜色上 -->
        <view class="group">
          <text class="group-title">外观</text>
          <view class="theme-row">
            <view
              v-for="t in THEMES"
              :key="t.id"
              class="theme-chip"
              :class="{ 'is-on': themeState.current === t.id }"
              @click="setTheme(t.id)"
            >
              <view class="theme-dot" :style="{ background: t.swatch }"></view>
              <text class="theme-name">{{ t.name }}</text>
            </view>
          </view>
        </view>

        <!-- 计量：四项放进同一张卡，行间用细线分隔 -->
        <view class="group">
          <text class="group-title">计量</text>
          <view class="card">
            <view class="row">
              <text class="row-label">每包价格</text>
              <view class="row-value">
                <text class="unit">¥</text>
                <input class="row-input" type="digit" :value="settings.cigarettePrice"
                  @input="onPriceInput" placeholder="25.0" />
              </view>
            </view>
            <view class="row">
              <text class="row-label">每包支数</text>
              <view class="row-value">
                <input class="row-input" type="number" :value="settings.packSize"
                  @input="onPackSizeInput" placeholder="20" />
                <text class="unit">支</text>
              </view>
            </view>
            <view class="row">
              <text class="row-label">戒烟前每天抽</text>
              <view class="row-value">
                <input class="row-input" type="number" :value="settings.dailyOriginal"
                  @input="onOriginalInput" placeholder="20" />
                <text class="unit">根</text>
              </view>
            </view>
            <view class="row">
              <text class="row-label">每日假抽配额</text>
              <view class="quota">
                <button class="quota-btn" @click="decreaseQuota">−</button>
                <text class="quota-value">{{ settings.dailyQuota }}</text>
                <button class="quota-btn" @click="increaseQuota">+</button>
              </view>
            </view>
          </view>
          <!-- 说明这几项的作用范围，避免以为改了品牌价也跟着变 -->
          <text class="group-hint">
            选过品牌时按该品牌的价格和支数计算；上面几项只对首页「来一根」的快速记录生效。
          </text>
        </view>

        <!-- 时间 -->
        <view class="group">
          <text class="group-title">时间</text>
          <view class="card">
            <picker mode="date" :value="startDateStr" @change="onDateChange">
              <view class="row">
                <text class="row-label">戒烟开始日期</text>
                <view class="row-value">
                  <text class="row-text">{{ startDateStr }}</text>
                  <text class="chev">›</text>
                </view>
              </view>
            </picker>
          </view>
        </view>

        <!-- 保存：有改动才点亮，避免「到底存没存」的疑问 -->
        <view class="save-bar">
          <!-- 用 visibility 而不是 v-if：留出位置，按钮不会因为提示出现/消失上下跳 -->
          <text class="save-hint" :class="{ 'is-off': !isDirty }">有修改还没保存</text>
          <button class="save-btn" :class="{ 'is-dirty': isDirty }" @click="saveSettings">保存设置</button>
        </view>

        <!-- 关于：协议入口是小程序审核要求，和烟雾测试并进一张卡 -->
        <view class="group">
          <text class="group-title">关于</text>
          <view class="card">
            <view class="row" @click="goToPrivacy">
              <text class="row-label">隐私政策与用户协议</text>
              <text class="chev">›</text>
            </view>
            <view class="row" @click="goToTestSmoke">
              <text class="row-label">烟雾测试</text>
              <text class="chev">›</text>
            </view>
          </view>
          <text class="version">就抽一根 v1.0</text>
          <text class="version">虚构香烟 · 假装戒烟 · 纯属娱乐</text>
        </view>
      </view>
    </scroll-view>
    <custom-tabbar :current="3"></custom-tabbar>
  </view>
</template>

<script>
import Store from '@/utils/store.js'
import CustomTabbar from '@/components/custom-tabbar/custom-tabbar.vue'
import AppNavbar from '@/components/app-navbar/app-navbar.vue'
import { THEMES, themeState, setTheme, themeClass } from '@/utils/theme.js'

// 数字收敛：非法值回落默认值，合法值夹到 [min, max]。
// 原来写的是 parseX || 默认值 —— 0 会被当成 falsy 吞掉（用户根本输不进 0），
// 而 -10 是真值反而能穿透，存下来的负单价会让省钱金额跟着变负。
// 空字符串要按「没填」处理：Number('') === 0 是有限数，
// 会一路穿过 clamp 变成最小值（烟价 0.1 元、包支数 1 支、配额 1 根）
function clampNum(v, min, max, fallback) {
  if (v === '' || v === null || v === undefined) return fallback
  const n = Number(v)
  if (!isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function clampInt(v, min, max, fallback) {
  if (v === '' || v === null || v === undefined) return fallback
  const n = Number(v)
  if (!isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

export default {
  components: { CustomTabbar, AppNavbar },
  data() {
    return {
      settings: {
        cigarettePrice: 25,
        packSize: 20,
        dailyQuota: 5,
        cooldownMinutes: 5,
        quitDate: new Date().toISOString().split('T')[0]
      },
      // 上次保存时的字段指纹：和当前值不一致就说明有未保存的改动
      savedSign: ''
    }
  },

  computed: {
    startDateStr() {
      return this.settings.quitDate || new Date().toISOString().split('T')[0]
    },
    // 主题是点了立即生效，不参与这里的脏检查
    isDirty() {
      return this.signSettings() !== this.savedSign
    }
  },

  onLoad() {
    this.settings = Store.getSettings()
    this.savedSign = this.signSettings()
  },

  methods: {
    // 只取本页真正会保存的五个字段
    signSettings() {
      const s = this.settings || {}
      return [s.cigarettePrice, s.packSize, s.dailyOriginal, s.dailyQuota, s.quitDate]
        .map(v => String(v == null ? '' : v))
        .join('|')
    },

    // 输入过程保留原始值（清空重输、0 都允许），范围收敛统一放到 saveSettings。
    // 一边输一边改写数据会把输入内容顶掉，光标乱跳。
    onPriceInput(e) {
      this.settings.cigarettePrice = e.detail.value
    },

    onPackSizeInput(e) {
      this.settings.packSize = e.detail.value
    },

    // 戒烟前每天抽多少。只用于恢复时间轴页里的「少吸的根数」，
    // 不参与省钱计算（省钱是「假抽一根省一根」的逐根累加）
    onOriginalInput(e) {
      this.settings.dailyOriginal = e.detail.value
    },

    increaseQuota() {
      this.settings.dailyQuota = Math.min(20, this.settings.dailyQuota + 1)
    },

    decreaseQuota() {
      this.settings.dailyQuota = Math.max(1, this.settings.dailyQuota - 1)
    },

    onDateChange(e) {
      this.settings.quitDate = e.detail.value
    },

    saveSettings() {
      // 输入时允许中间态，保存时才收敛到合法范围。
      // 负的烟价/包数会让单价变负，进而把首页、看板、省钱页的金额全带成负数
      const s = this.settings
      s.cigarettePrice = clampNum(s.cigarettePrice, 0.1, 999, 30)
      s.packSize = clampInt(s.packSize, 1, 100, 20)
      s.dailyOriginal = clampInt(s.dailyOriginal, 0, 999, 20)
      // 与加减按钮的上下限保持一致（1~20）
      s.dailyQuota = clampInt(s.dailyQuota, 1, 20, 5)
      // 用存储里的最新快照打底，只覆盖本页真正编辑的字段。
      // 直接写整个 this.settings 会把 onLoad 时的旧 selectedBrand 等一起写回去，
      // 覆盖掉用户在品牌页刚选的品牌（回到首页选中角标就没了）
      const latest = Store.getSettings()
      Store.saveSettings({
        ...latest,
        cigarettePrice: s.cigarettePrice,
        packSize: s.packSize,
        dailyOriginal: s.dailyOriginal,
        dailyQuota: s.dailyQuota,
        quitDate: s.quitDate
      })
      this.settings = Store.getSettings()
      this.savedSign = this.signSettings()
      uni.showToast({ title: '已保存', icon: 'success' })
    },

    goToTestSmoke() {
      uni.navigateTo({ url: '/pages/test-smoke-svg/test-smoke-svg' })
    },

    goToPrivacy() {
      uni.navigateTo({ url: '/pages/privacy/privacy' })
    }
  }
}
</script>

<style>
.page-container {
  height: 100vh;
  height: 100dvh;
  width: 100%;
  background-color: var(--bg);
  color: var(--text);
  display: flex;
  flex-direction: column;
}

/* 统一滚动容器：flex 列里靠 height:0 + flex:1 拿到确定高度 */
.main-scroll {
  flex: 1;
  height: 0;
  min-height: 0;
}

/* ---- 分组 ---- */
.group {
  margin-bottom: 44rpx;
}

/* 分组标题就是普通小标题：不加字距、不降透明度，
   否则在深色底上会变成一条几乎看不清的「eyebrow」。 */
.group-title {
  display: block;
  padding: 0 8rpx 14rpx;
  font-size: var(--fs-xs, 22rpx);
  color: var(--text-dim);
}

.group-hint {
  display: block;
  padding: 16rpx 8rpx 0;
  font-size: var(--fs-xs, 22rpx);
  line-height: 1.7;
  color: var(--text-dim);
}

/* ---- 卡片：一组共用一张卡，行间用细线分隔。
   比原来「每项一张独立圆角卡」短一半，也更容易扫读 ---- */
.card {
  background: var(--surface-1);
  border: 1rpx solid var(--border);
  border-radius: var(--r-lg, 32rpx);
  overflow: hidden;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  /* 一组四项是列表不是四张独立卡，行距收紧后才像同一张表 */
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid var(--border);
}

.row:last-child {
  border-bottom: none;
}

.row-label {
  font-size: 28rpx;
  color: var(--text);
}

.row-value {
  display: flex;
  align-items: center;
  gap: 6rpx;
  min-width: 0;
}

.row-text {
  font-size: 28rpx;
  color: var(--text-dim);
}

.unit {
  font-size: 24rpx;
  color: var(--text-dim);
}

/* 值下面一条虚线：一眼看出这里能改，又不用给每项套一个输入框 */
.row-input {
  width: 168rpx;
  padding: 0 0 6rpx;
  text-align: right;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text);
  background: transparent;
  border: none;
  border-bottom: 1rpx dashed var(--border);
  border-radius: 0;
}

.chev {
  font-size: 30rpx;
  color: var(--text-dim);
  opacity: 0.55;
}

/* ---- 外观：五个主题横排，选中给色点套一圈主色环 ---- */
.theme-row {
  display: flex;
  gap: 8rpx;
}

.theme-chip {
  flex: 1;
  /* 不加 min-width:0 时四字主题名会撑住 flex 子项，
     窄屏 / 大字体下第五个色卡会被挤出屏幕 */
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  padding: 18rpx 0 16rpx;
  border-radius: var(--r-md, 20rpx);
  border: 1rpx solid var(--border);
  background: var(--surface-1);
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.15s ease;
}

.theme-chip:active {
  transform: scale(0.96);
}

.theme-dot {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
}

.theme-name {
  font-size: 20rpx;
  letter-spacing: 1rpx;
  color: var(--text-dim);
}

.theme-chip.is-on {
  border-color: var(--primary);
  background: var(--surface-2);
}

.theme-chip.is-on .theme-name {
  color: var(--primary);
}

/* 中间垫一层底色把两环分开，否则色点和主色环连成一片 */
.theme-chip.is-on .theme-dot {
  box-shadow: 0 0 0 3rpx var(--surface-2), 0 0 0 5rpx var(--primary);
}

/* ---- 配额加减 ---- */
.quota {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.quota-btn {
  width: 56rpx;
  height: 56rpx;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1rpx solid var(--border);
  background: var(--surface-2);
  /* 加减号和中间的数字同一套主色，看起来是一个控件组 */
  color: var(--primary);
  font-size: 32rpx;
  line-height: 1;
}

.quota-btn::after {
  border: none;
}

.quota-btn:active {
  background: var(--border);
}

.quota-value {
  min-width: 56rpx;
  text-align: center;
  font-size: 34rpx;
  font-weight: 700;
  color: var(--primary);
}

/* ---- 保存 ---- */
.save-bar {
  margin: 8rpx 0 48rpx;
}

.save-hint {
  display: block;
  text-align: center;
  margin-bottom: 14rpx;
  font-size: 22rpx;
  letter-spacing: 2rpx;
  color: var(--primary);
  transition: opacity 0.2s ease;
}

.save-hint.is-off {
  visibility: hidden;
  opacity: 0;
}

.save-btn {
  width: 100%;
  padding: 30rpx;
  border-radius: var(--r-lg, 32rpx);
  border: none;
  /* 纯主色打底，不做任何压暗：叠黑色或降透明度都会把琥珀变成土黄。
     立体感只靠顶部一层极淡的白色高光，主体亮度不变 */
  background-color: var(--primary);
  background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 58%);
  color: var(--bg);
  font-size: 32rpx;
  font-weight: 700;
  letter-spacing: 4rpx;
  box-shadow: 0 10rpx 26rpx rgba(0, 0, 0, 0.35);
  transition: box-shadow 0.2s ease;
}

/* 有改动时点亮一圈主色辉光，代替原来靠变暗表达「未就绪」 */
.save-btn.is-dirty {
  box-shadow: 0 0 0 2rpx var(--glow), 0 10rpx 26rpx var(--glow);
}

.save-btn::after {
  border: none;
}

/* ---- 页脚 ---- */
.version {
  display: block;
  padding-top: 10rpx;
  text-align: center;
  font-size: var(--fs-xs, 22rpx);
  line-height: 1.8;
  color: var(--text-dim);
  opacity: 0.75;
}

.p-20 { padding: 40rpx; }
/* 底部要留出自定义 tabBar（100rpx）+ 安全区，否则最后一项设置会被挡住 */
.pb-100 { padding-bottom: calc(220rpx + env(safe-area-inset-bottom, 0px)); }
</style>
