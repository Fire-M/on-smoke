<template>
  <view class="page-container" :class="themeClass()">
    <app-navbar title="就抽一根"></app-navbar>
    <!-- 可滚动仪表盘内容 -->
    <scroll-view scroll-y class="main-scroll">
      <!-- Hero：戒烟天数（全页最大字号——这是用户最该看到的成果，
           原来这里用的 text-sm 却把 text-4xl 给了「省钱」，层级是倒的） -->
      <view class="mx-20 mt-16 mb-16 hero-card">
        <text class="text-sm text-gray-400 block">戒烟 第</text>
        <view class="hero-days-row">
          <text class="hero-days" :class="{ bump: heroBump }">{{ quitDays }}</text>
          <text class="hero-unit">天</text>
        </view>
        <!-- 一行塞三个数字在窄屏会断在「包」字，拆成两行各自成句 -->
        <text class="text-sm text-gray-500 mt-8 block">💨 已熬过 <text style="color: var(--primary); font-weight: 600;">{{ quitHours }}</text> 小时 · 连续打卡 <text style="color: var(--primary); font-weight: 600;">{{ streakDays }}</text> 天</text>
        <text class="text-sm text-gray-500 mt-4 block">已抽完 <text style="color: var(--primary); font-weight: 600;">{{ packsCompleted }}</text> 包</text>
        <text class="hero-quote mt-12 block">嘴又痒了?</text>
      </view>

      <!-- 今日已抽 / 今日剩余：两组数字对角对称，同字号同状态色，
           进度条走「已抽 / 配额」，底部补总量，全程不用心算 -->
      <view class="mx-20 mb-16">
        <view class="card p-20">
          <!-- 已抽 / 剩余 对角对称：两组数字共用同一套字号与状态色规则，
               不给剩余单独做小胶囊，只靠左右位置区分主次 -->
          <view class="quota-header">
            <view class="quota-stat">
              <text class="text-sm text-gray-400">今日已抽</text>
              <view class="quota-row">
                <text class="quota-remain" :class="[quotaLevel, { bump: heroBump }]">{{ todaySmoked }}</text>
                <text class="quota-unit">根</text>
              </view>
            </view>
            <view class="quota-stat quota-stat-right">
              <text class="text-sm text-gray-400">今日剩余</text>
              <view class="quota-row">
                <text class="quota-remain" :class="quotaLevel">{{ quotaRemain }}</text>
                <text class="quota-unit">根</text>
              </view>
            </view>
          </view>
          <view class="progress-bar">
            <view class="progress-fill" :class="quotaLevel" :style="{ width: quotaPercent + '%' }"></view>
          </view>
          <!-- 剩余已在右侧同款展示，这里只补总量，避免同一信息重复 -->
          <text class="text-sm text-gray-500 mt-12 block">配额 {{ effectiveQuota }} 根</text>

          <!-- 常驻广告入口：原来只在配额用完时才出现，
               而配额是 5 根/天，多数用户一天都看不到这个按钮，白白浪费广告曝光。
               改成随时可看（只要今天还有次数） -->
          <view class="ad-quota-btn" @click="watchAdForQuota" v-if="adRewardRemain > 0 && adEnabled">
            <text class="ad-quota-icon">🎬</text>
            <text class="ad-quota-text">看广告 +{{ adQuotaPerAd }} 根</text>
            <text class="ad-quota-remain">今日还可 {{ adRewardRemain }} 次</text>
          </view>
          <!-- 配额用完：给个出口而不是让用户干瞪眼 -->
          <view class="quota-empty-tip" v-if="quotaRemain <= 0">
            <text class="quota-empty-text">今天的额度用完了</text>
            <button class="quota-alt-btn" @click.stop="goToBreathing">去做个呼吸练习</button>
          </view>
        </view>
      </view>

      <!-- 至今已花（降级为普通尺寸，视觉重心让给 Hero） -->
      <view class="mx-20 mb-16 saved-card">
        <view class="flex">
          <view class="saved-bar"></view>
          <view class="flex-1 p-20">
            <!-- 两本账对称摆：左边是花掉的，右边是忍住的。
                 同一套字号/字重/垂直对齐，只是颜色语义相反 -->
            <view class="money-pair">
              <view class="money-col">
                <text class="money-label">至今已花</text>
                <text class="money-value text-amber">¥{{ savedAmount }}</text>
              </view>
              <view class="money-divider"></view>
              <!-- 右列贴最右侧，和左列的「已花」形成左右对称 -->
              <view class="money-col money-col-right">
                <text class="money-label">至今已省</text>
                <text class="money-value money-value-saved">¥{{ resistTotalSaved }}</text>
              </view>
            </view>

            <!-- 警示向：已经花掉的钱，折算成被烧掉的零食。
                 金额还不够一个换算单位时不要显示「0 包辣条」。
                 用数值字段判断，避免拿字符串去比大小的隐式转换 -->
            <text class="text-sm text-gray-500 mt-12 block" v-if="savedCups >= 1">
              这些钱够买 {{ savedPackages }} 包辣条 · {{ savedCups }} 杯咖啡，都烧没了 💸
            </text>
            <text class="text-sm text-gray-500 mt-12 block" v-else-if="savedPackages >= 1">
              这些钱够买 {{ savedPackages }} 包辣条，都烧没了 💸
            </text>
            <text class="text-sm text-gray-500 mt-12 block" v-else>
              再抽下去，一包辣条钱就没啦 💸
            </text>

            <!-- 金额已经摆在上面，这里只说次数，避免同一个数字说两遍 -->
            <view class="resist-summary" v-if="resistTotalCount > 0" @click.stop="openPriceEditor">
              <text class="resist-summary-text">
                已经忍住 <text class="resist-summary-num">{{ resistTotalCount }}</text> 次，每次省 ¥{{ resistPrice }}
              </text>
            </view>

            <!-- 省钱目标：原来单独一页，其实只是给「已省」这本账加个名字，
                 放账本下面两行就够 -->
            <view class="goal-row" @tap="openGoalEditor">
              <template v-if="hasGoal">
                <view class="goal-head">
                  <text class="goal-name">{{ goalName || '省钱目标' }}</text>
                  <text class="goal-remain">还差 ¥{{ goalRemain }}</text>
                </view>
                <view class="goal-bar">
                  <view class="goal-fill" :style="{ width: goalProgress + '%' }"></view>
                </view>
              </template>
              <text v-else class="goal-empty">给它定个目标：攒够了去买点什么 ›</text>
            </view>

            <!-- 看广告让「上一根」的金额翻倍。纯正向激励，不阻碍任何流程 -->
            <view class="boost-btn" v-if="canBoost" @click="watchAdBoost">
              <text class="boost-btn-icon">🎬</text>
              <text class="boost-btn-text">看广告，上一根 ×2</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 三列紧凑小卡：原来「烟瘾追踪」单卡 + 两组 two-col 连着排，
           视觉节奏重复且占地，这里压成一个三列，信息密度更高 -->
      <view class="mx-20 mb-16 three-col">
        <view class="mini-card" @click="goToCraving">
          <text class="mini-icon">🧠</text>
          <text class="mini-value text-amber">{{ todayCravings }}</text>
          <text class="mini-label">今日烟瘾</text>
        </view>
        <view class="mini-card" @click="goToAchievements">
          <text class="mini-icon">🏆</text>
          <text class="mini-value text-amber">{{ badgesCount }}<text class="mini-sub">/{{ badgesTotal }}</text></text>
          <text class="mini-label">成就徽章</text>
        </view>
        <view class="mini-card" @click="goToRecovery">
          <text class="mini-icon">🫁</text>
          <text class="mini-value text-amber milestone-val">{{ milestoneLabel }}</text>
          <text class="mini-label">下一里程碑</text>
        </view>
      </view>

      <!-- 每日挑战 -->
      <view class="mx-20 mb-16">
        <view class="challenge-card" :class="{ completed: challengeCompleted }">
          <view class="challenge-header">
            <text class="challenge-icon">{{ challengeIcon }}</text>
            <view class="flex-1">
              <text class="text-sm text-gray-300 block">今日挑战</text>
              <text class="text-sm text-gray-500 mt-4 block">{{ challengeTitle }}</text>
              <text class="challenge-hint" v-if="challengeHint">{{ challengeHint }}</text>
            </view>
            <text v-if="challengeCompleted" class="challenge-badge">✅ 已完成</text>
            <text v-else-if="challengeFailed" class="challenge-failed">❌ 今日未达成</text>
            <text v-if="!challengeCompleted && challengeStreak > 0" class="challenge-streak">🔥 {{ challengeStreak }}天</text>
          </view>
          <view class="challenge-progress-bar" v-if="!challengeCompleted && !challengeFailed">
            <view class="challenge-progress-fill" :style="{ width: challengeProgress + '%' }"></view>
          </view>
        </view>
      </view>

      <!-- 更多功能：只留两条真正服务「忍住」的入口。
           情绪并进「记录」，省钱目标并进上面的账本，时间胶囊撤掉入口 -->
      <view class="mx-20 mb-16">
        <view class="feature-grid">
          <view class="feature-item" @tap="goToBreathing">
            <text class="feature-icon">🧘</text>
            <text class="feature-name">呼吸引导</text>
          </view>
          <view class="feature-item" @tap="goToPet">
            <text class="feature-icon">🐱</text>
            <text class="feature-name">我的宠物</text>
          </view>
        </view>
      </view>

      <!-- 底部占位：底部是「忍住不抽」+「来一根」两个按钮，留够高度 -->
      <view style="height: 560rpx;"></view>
    </scroll-view>

    <!-- 底部固定：两条路
         上：忍住不抽（省钱，亮色轻质感）
         下：来一根（花钱，深色重质感） -->
    <view class="btn-container">
      <view class="resist-wrap">
        <view class="btn-resist" :class="{ 'is-hit': resistHit }" @tap="resistOne">
          <text class="btn-resist-icon">✋</text>
          <view class="btn-resist-body">
            <text class="btn-resist-main">忍住不抽</text>
            <text class="btn-resist-sub" v-if="resistToday > 0">今天忍住 {{ resistToday }} 次，省下 ¥{{ resistTodaySaved }}</text>
            <text class="btn-resist-sub" v-else>点一下，记一次「想抽但没抽」</text>
          </view>
        </view>
        <!-- 金额不放进按钮里：它是独立的一条可点区域，
             否则和「记一次」的点击叠在一起，容易互相抢事件 -->
        <view class="btn-resist-chip" @tap="openPriceEditor">
          <text class="btn-resist-chip-val">+¥{{ resistPrice }}</text>
          <text class="btn-resist-chip-edit">自定义</text>
        </view>
        <text class="resist-float" v-if="resistFloatVisible">{{ resistFloatText }}</text>
      </view>

      <button class="btn-have-one" :disabled="cooldownRemain > 0" @click="haveOne">
        <view class="btn-fire-wrap">
          <text class="btn-fire">🚬</text>
        </view>
        <view class="btn-text-wrap">
          <text class="btn-main-text">{{ cooldownRemain > 0 ? '冷却中' : '来一根' }}</text>
          <text class="btn-sub-text">{{ cooldownRemain > 0 ? cooldownStr : '只是一场模拟 · 不会真的抽烟' }}</text>
        </view>
      </button>
    </view>

    <!-- 自定义 TabBar -->
    <custom-tabbar :current="0"></custom-tabbar>

    <!-- 撒花：忍住成功时的一次性庆祝。
         用 Canvas 2D 跑 canvas-confetti 的物理模型（粒子自带初速度 / 重力 / 寿命），
         比 CSS keyframes 自然；粒子自己消亡，不用 v-for 维护 DOM 节点。
         canvas 常驻但 pointer-events:none，空粒子时是透明的，不挡操作。 -->
    <canvas type="2d" id="confetti-canvas" class="confetti-canvas" :class="{ 'is-active': confettiActive }"></canvas>

    <!-- 改「忍住一根算省多少」：入口就是页面上那个 +¥ 金额，不占设置页的位置 -->
    <view class="modal-mask" v-if="showPriceEditor" @click="closePriceEditor">
      <view class="modal-card" @click.stop>
        <text class="modal-title">忍住一根，算省多少</text>
        <view class="modal-input-wrap" :class="{ 'is-error': priceEditError }">
          <text class="modal-input-prefix">¥</text>
          <input class="modal-input" type="digit" v-model="priceEditValue"
            :placeholder="autoResistPrice" :focus="showPriceEditor"
            @input="priceEditError = ''" />
        </view>
        <!-- 出错时就地贴在金额下面说明，不再弹 toast（toast 在弹窗后面，很容易没看见） -->
        <view class="modal-error" v-if="priceEditError">
          <text class="modal-error-text">{{ priceEditError }}</text>
        </view>
        <text class="modal-hint" v-else>留空或填 0 就按烟价自动算（现在 ¥{{ autoResistPrice }} 一根）。只影响之后记的次数，已记下的金额不变。</text>
        <view class="modal-actions">
          <button class="modal-btn cancel" @click="closePriceEditor">取消</button>
          <button class="modal-btn confirm" @click="saveResistPrice">保存</button>
        </view>
      </view>
    </view>

    <!-- 设省钱目标：从账本里那行「还差 ¥x」点进来 -->
    <view class="modal-mask" v-if="showGoalEditor" @tap="closeGoalEditor">
      <view class="modal-card" @tap.stop>
        <text class="modal-title">攒钱目标</text>
        <view class="modal-input-wrap">
          <input class="modal-input goal-name-input" v-model="goalEdit.name"
            placeholder="买点什么，例如 一双球鞋" maxlength="20" />
        </view>
        <view class="modal-input-wrap modal-input-wrap-gap">
          <text class="modal-input-prefix">¥</text>
          <input class="modal-input" type="digit" v-model="goalEdit.target" placeholder="1000" />
        </view>
        <text class="modal-hint">只统计「忍住不抽」省下的钱，从设好这一秒开始攒。</text>
        <view class="modal-actions">
          <button class="modal-btn cancel" @tap="closeGoalEditor">取消</button>
          <button class="modal-btn confirm" @tap="saveGoal">保存</button>
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
import AdManager from '@/utils/ad-manager.js'
import CustomTabbar from '@/components/custom-tabbar/custom-tabbar.vue'
import AppNavbar from '@/components/app-navbar/app-navbar.vue'
import { themeClass, currentTheme } from '@/utils/theme.js'
import { createConfetti } from '@/utils/confetti.js'
import { guardContent } from '@/utils/content-check.js'

// 健康恢复里程碑（秒）。注意第 5 项原为 15552000（180 天）却标成「1年」，
// 1 年应为 31536000 秒，与 recovery.vue 保持一致。
const MILESTONES = [
  { seconds: 1200, label: '20分钟' },
  { seconds: 43200, label: '12小时' },
  { seconds: 1209600, label: '2周' },
  { seconds: 7776000, label: '3月' },
  { seconds: 31536000, label: '1年' }
]

export default {
  components: { CustomTabbar, AppNavbar },
  data() {
    return {
      quitDays: 1,
      streakDays: 0,
      packsCompleted: 0,   // 累计抽完几包（跨品牌合计）
      savedAmount: '0.0',
      todaySmoked: 0,
      quotaTotal: 5,
      effectiveQuota: 5,
      adRewardRemain: 10,
      adQuotaPerAd: AdManager.REWARD_QUOTA_PER_AD,   // 看一次广告给几根（广告模块统一定义）
      adEnabled: false,    // 没开通流量主时为 false，广告入口全部隐藏
      navigating: false,   // 跳转锁：防止连点推进多个页面
      resistToday: 0,          // 今天忍住几次
      resistTodaySaved: '0.00',// 今天省下多少
      resistTotalCount: 0,     // 累计忍住次数
      resistTotalSaved: '0.00',// 累计省下
      resistPrice: '0.00',     // 忍住一根能省多少（自定义值生效后的结果）
      autoResistPrice: '0.00', // 不自定义时按烟价算出来的值，弹窗里当占位符
      showPriceEditor: false,  // 改金额的弹窗
      priceEditValue: '',      // 弹窗里的输入值
      priceEditError: '',      // 金额非法时的内联提示（显示在输入框下面）
      // 省钱目标（原独立页面，现在就在账本里）
      hasGoal: false,
      goalName: '',
      goalRemain: '0',
      goalProgress: 0,
      showGoalEditor: false,
      goalEdit: { name: '', target: '' },
      resistHit: false,        // 按下反馈
      confettiActive: false,   // 撒花画布是否显示（无粒子时隐藏，省一层合成）
      resistFloatVisible: false,// 「+¥x」上浮动画
      resistFloatText: '',
      resistLock: false,       // 防连点（400ms）
      resistFloatTimer: null,
      resistToastTimer: null,
      canBoost: false,     // 上一根是否还能通过看广告翻倍
      quotaPercent: 0,
      // 已抽根数的语义色由 computed quotaLevel 实时算（避免 dev HMR 漏赋值）
      // Hero 副标题：已熬过多少小时
      quitHours: 0,
      // 「还能抽 N 根」直接显示给用户，避免心算 quota−smoked
      quotaRemain: 0,
      // 换算单位（用数值字段判断「0 包辣条」文案）
      savedPackages: 0,
      savedCups: 0,
      // 数字变化时的强调动画（抽完一根烟回来能立刻看到反馈）
      heroBump: false,
      lastHeroKey: '',
      milestoneLabel: '20分钟',
      badgesCount: 0,
      badgesTotal: 0,
      cooldownRemain: 0,
      cooldownStr: '',
      showToast: false,
      toastMsg: '',
      todayCravings: 0,
      resistedCount: 0,
      challengeTitle: '',
      challengeIcon: '🎯',
      challengeCompleted: false,
      challengeFailed: false,   // 挑战已失败（limit 超额 / time_range 时段内抽了）
      challengeHint: '',        // 「还剩 X 额度 / 还能抽 N 根」
      challengeStreak: 0,
      challengeProgress: 0,
      cooldownTimer: null,
      midnightTimer: null,
      adWatching: false    // 广告播放中，防止连点重复加配额
    }
  },

  computed: {
    // 已抽根数按进度的语义色：good 绿（< 50%）→ warn 琥珀（50%~100%）→ over 红（用完）
    // 用 computed 而非 data + refreshData：每次渲染都重算，避免任何时序/HMR 漏赋值
    quotaLevel() {
      const smoked = Number(this.todaySmoked) || 0
      const quota = Number(this.effectiveQuota) || 0
      if (quota <= 0) return 'good'   // 未设配额时没"消耗进度"概念，给中性色
      const ratio = smoked / quota
      return ratio < 0.5 ? 'good' : (ratio < 1 ? 'warn' : 'over')
    }
  },

  onLoad() {
    this.refreshData()
    this.checkCooldown()
    this.startPolling()
    
    // 初始化广告
    AdManager.initRewardedAd()
    AdManager.initInterstitialAd()
    // 这里原本有「每日首次打开 3 秒后弹插屏」，已移除：
    // 小程序没有开屏广告这种形态（那是 App 才有的），
    // 而且新用户第一次进来就被广告糊脸，留存和合规都不划算
  },

  // 页面渲染完才能拿到 canvas 节点，撒花引擎在这里初始化
  onReady() {
    this.initConfetti()
  },

  onUnload() {
    this.stopPolling()
    clearInterval(this.cooldownTimer)
    this.destroyConfetti()
  },

  onShow() {
    this.startPolling()
    // onLoad 刚刷过一次，首次 onShow 不必再来一遍
    if (!this._firstShowDone) {
      this._firstShowDone = true
      return
    }
    // 数据没变且没跨天就完全不重算：转场帧里不做 storage 桥、不做整页 setData。
    // 之前试过延后 100ms 刷新反而更卡（正撞上返回后的第一次点击），
    // 所以方向是「能不刷就不刷」，而不是把重活错峰。
    if (!this.shouldRefresh()) return
    this.refreshData()
    this.checkCooldown()
    // 撒花引擎不在这里重建：burstConfetti 发现引擎不在时会自己初始化。
    // 每次返回都重建一遍（同步 query + 新引擎）是纯浪费
  },

  // tabBar 页切走只触发 onHide，不会 unload。
  // 不在这里停掉的话，首页的 30 秒轮询会在后台永久跑下去（每 30 秒一次全量重算 + 写 storage）。
  onHide() {
    this.stopPolling()
    clearInterval(this.cooldownTimer)
    this.destroyConfetti()
  },

  // 横竖屏切换 / 分屏：canvas 尺寸跟着变，否则粒子会被拉伸
  onResize() {
    this.syncConfettiSize()
  },

  methods: {
    // 60 秒轮询：用于跨零点刷新、挑战/里程碑状态跟进。
    // 原来是 30s，但每次 refreshData 都是整页字段重算 + setData，
    // 滚动过程中正好撞上就是一次可感的掉帧；60s 对跨天对齐没有任何影响。
    startPolling() {
      if (this.midnightTimer) return   // 已在跑就别重复起
      this.midnightTimer = setInterval(() => this.refreshData(), 60000)
    },

    stopPolling() {
      if (this.midnightTimer) {
        clearInterval(this.midnightTimer)
        this.midnightTimer = null
      }
      if (this.resistFloatTimer) { clearTimeout(this.resistFloatTimer); this.resistFloatTimer = null }
      if (this.resistToastTimer) { clearTimeout(this.resistToastTimer); this.resistToastTimer = null }
    },

    refreshData() {
      // 一次刷新会调十几个 Store 函数，settings / stats / history 被反复读，
      // 每次都是一次同步 storage 调用 + JSON.parse。整段包进读缓存后，
      // 同一份数据只解析一次，回首页的 onShow 能从 60ms 降到几十毫秒以内。
      const result = Store.withReadCache(() => this._refreshData())
      // 所有刷新入口（onLoad / onShow / 60s 轮询 / 记一根）都从这里过，
      // 在刷新完成后统一记版本号：结算函数可能刚写过盘并自增 rev
      this.markRefreshed()
      return result
    },

    _refreshData() {
      const settings = Store.getSettings()
      const today = Store.getToday()

      // 先把「昨天及之前」的省钱结算掉，并同步勋章/挑战状态
      Store.settleDailySavings()
      Store.syncBadges()

      // 戒烟天数：getCleanDays 是「满 N 天」，展示用「第 N 天」含当天
      this.quitDays = Store.getCleanDays() + 1
      // Hero 副标题：已熬过多少小时
      this.quitHours = Math.floor(Store.getSmokeFreeDuration() / 3600)
      // 连续打卡：history 里连续每天至少 1 根的天数
      this.streakDays = Store.getSmokeStreak()
      // 已抽完几包（所有品牌累计，抽空自动开下一包时 +1）
      this.packsCompleted = Store.getTotalPacksCompleted()

      const savedNum = Store.getSavedMoney()
      this.savedAmount = savedNum.toFixed(1)
      // 渲染防御：强制转数字，避免 boolean/undefined 被 Vue 当字符串渲染成 "true"/"false"
      const savedSafe = Number(savedNum) || 0
      this.savedPackages = Math.max(0, Math.floor(savedSafe / 5))
      this.savedCups = Math.max(0, Math.floor(savedSafe / 15))

      // 省钱账本（忍住不抽）：和上面的「已花」是两本独立的账，互不抵消
      const resistStats = Store.getResistStats()
      this.resistToday = resistStats.todayCount
      this.resistTodaySaved = resistStats.todaySaved.toFixed(2)
      this.resistTotalCount = resistStats.totalCount
      this.resistTotalSaved = resistStats.totalSaved.toFixed(2)
      this.resistPrice = (Number(Store.getResistPrice()) || 0).toFixed(2)
      this.autoResistPrice = (Number(Store.getAutoResistPrice()) || 0).toFixed(2)
      this.loadGoal(resistStats.totalSaved)

      const smokedSafe = Number(today.smokedCount) || 0
      const effectiveSafe = Number(Store.getEffectiveQuota()) || 0
      this.effectiveQuota = effectiveSafe
      this.quotaTotal = Number(settings.dailyQuota) || 0
      this.todaySmoked = smokedSafe
      // 直接给「还能抽几根」，不让用户自己算 quota − smoked
      this.quotaRemain = Math.max(0, effectiveSafe - smokedSafe)
      this.adRewardRemain = AdManager.getRewardRemain()
      this.adEnabled = AdManager.isAdEnabled()
      // 「上一根翻倍」只在有记录、且这根还没翻倍、且今天还有广告次数时才出现
      const lastRecord = Store.getHistory()[0]
      this.canBoost = this.adEnabled && !!lastRecord && !lastRecord.boosted && this.adRewardRemain > 0
      this.quotaPercent = effectiveSafe > 0 ? Math.min(smokedSafe / effectiveSafe, 1) * 100 : 0
      // quotaLevel 改由 computed 算，避免 dev HMR 时 data 字段未及时赋值
      this.badgesCount = Store.getBadgeList().filter(b => b.unlocked).length
      this.badgesTotal = Store.BADGE_LIST.length
      this.updateMilestone()

      // 烟瘾统计（统一用本地日界，与 store 一致）
      const cravingStats = Store.getCravingStats()
      this.todayCravings = cravingStats.today
      const todayStr = Store.todayStr()
      this.resistedCount = Store.getCravings().filter(c => {
        return c.resisted && Store.todayStr(c.timestamp) === todayStr
      }).length

      // 每日挑战：计算进度并回写，否则 completed / streak 永远不会更新
      const challenge = Store.getDailyChallenge()
      this.challengeTitle = challenge.title
      this.challengeIcon = challenge.icon
      // 传给 store 的是「原始值」不是百分比：updateChallengeProgress 要拿它跟 target 比大小。
      // 之前把百分比传进去，导致 limit 一早就判失败、time_range 胜负反转。
      const value = this.calcChallengeValue(challenge, today)
      const updated = Store.updateChallengeProgress(value)
      // 进度条要的是百分比，单独算，别拿原始值当宽度
      this.challengeProgress = this.calcChallengePercent(challenge, value)
      // 用回写后的对象判定，否则读到的是更新前的快照，要再等一次刷新才显示已完成
      this.challengeCompleted = !!(updated && updated.completed)
      // 失败态之前完全没展示，用户超额了还以为自己在挑战中
      this.challengeFailed = !!(updated && updated.failed)
      this.challengeStreak = Store.getChallengeStreak()

      // 明确告诉用户「还剩多少额度/几根」，光看进度条不知道差多少
      if (this.challengeCompleted) {
        this.challengeHint = ''
      } else if (this.challengeFailed) {
        this.challengeHint = challenge.type === 'save' ? '今天已经花超了' : '今天已经超标了'
      } else if (challenge.type === 'save') {
        const remainMoney = Math.max(0, Number(challenge.target) - (Number(value) || 0))
        this.challengeHint = `还剩 ¥${remainMoney.toFixed(1)} 额度`
      } else if (challenge.type === 'limit') {
        const remainCig = Math.max(0, Number(challenge.target) - (Number(value) || 0))
        this.challengeHint = `还能抽 ${remainCig} 根`
      } else {
        this.challengeHint = ''
      }

      // 数字变了就闪一下，让「又扛住一天」有即时反馈
      this.bumpIfChanged()
    },

    // Hero 数字变化时短暂放大 + 提亮（纯 CSS transition，不引动画库）
    bumpIfChanged() {
      // 用 todaySmoked 而不是 quotaRemain：后者被 max(0,…) 夹住，
      // 配额用完后再抽会停在 0，动画就不再触发了
      const key = this.quitDays + '_' + this.todaySmoked
      if (this.lastHeroKey === '') {
        this.lastHeroKey = key
        return
      }
      if (this.lastHeroKey === key) return
      this.lastHeroKey = key
      this.heroBump = false
      this.$nextTick(() => {
        this.heroBump = true
        setTimeout(() => { this.heroBump = false }, 600)
      })
    },

    // 挑战的「原始值」，语义与 store.updateChallengeProgress 的契约一致：
    //   limit → 今日已抽根数 / save → 今日已省金额 / resist → 今日抵抗次数
    //   time_range → 该时段内已抽根数 / delay → 距上次抽烟已过去分钟数
    // 达标判定全交给 store，这里只负责把真实数字算出来。
    calcChallengeValue(challenge, today) {
      if (challenge.type === 'limit') {
        return Number(today.smokedCount) || 0
      }
      if (challenge.type === 'save') {
        return Store.getTodaySaved()
      }
      if (challenge.type === 'resist') {
        // 烟瘾记录里标记「抵抗住」的 + 首页「忍住不抽」按钮点的次数
        return (Number(this.resistedCount) || 0) + (Number(this.resistToday) || 0)
      }
      if (challenge.type === 'time_range') {
        // 只数该时段内的根数。不判断「时段有没有过完」：
        // 过完之前根数天然为 0，过完之后 store 按 completed = (progress === 0) 结算
        const range = challenge.target || { start: 0, end: 12 }
        const todayStr = Store.todayStr()
        return Store.getHistory().filter(r => {
          if (!r || !r.timestamp) return false
          if (Store.todayStr(r.timestamp) !== todayStr) return false
          const h = new Date(r.timestamp).getHours()
          return h >= range.start && h < range.end
        }).length
      }
      if (challenge.type === 'delay') {
        // 「延迟 1 小时」：距上次抽烟已过去多少分钟；今天还没抽过视为已达标
        const last = today.lastSmokeTime
        if (!last) return Number(challenge.target) || 0
        return Math.floor((Date.now() - last) / 60000)
      }
      return 0
    },

    // 进度条要的百分比。limit 是「剩得越多越好」，所以展示剩余占比；
    // 其余类型都是「越接近 target 越好」，展示 value / target。
    calcChallengePercent(challenge, value) {
      const target = Number(challenge.target) || 1
      if (challenge.type === 'limit' || challenge.type === 'save') {
        // 都是「剩余额度」型：limit 是剩几根，save 是剩几块钱，越多越好
        const remain = Math.max(0, target - (Number(value) || 0))
        return Math.round((remain / target) * 100)
      }
      if (challenge.type === 'time_range') {
        // 时段内一根没抽 = 100%，抽了一根就掉到 0
        return (Number(value) || 0) === 0 ? 100 : 0
      }
      return Math.round(Math.min(100, ((Number(value) || 0) / target) * 100))
    },

    updateMilestone() {
      const sec = Store.getSmokeFreeDuration()
      let next = MILESTONES[0]
      for (const m of MILESTONES) {
        if (sec < m.seconds) { next = m; break }
        next = m
      }
      this.milestoneLabel = next.label
    },

    checkCooldown() {
      const remain = Store.getCooldownRemain()
      this.cooldownRemain = remain
      if (remain > 0) {
        const m = Math.floor(remain / 60)
        const s = remain % 60
        this.cooldownStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        if (!this.cooldownTimer) {
          this.cooldownTimer = setInterval(() => this.checkCooldown(), 1000)
        }
      } else {
        if (this.cooldownTimer) {
          clearInterval(this.cooldownTimer)
          this.cooldownTimer = null
        }
      }
    },

    haveOne() {
      const check = Store.canSmoke()
      if (!check.can) {
        this.toastMsg = check.reason
        this.showToast = true
        setTimeout(() => { this.showToast = false }, 2000)
        return
      }
      // 防重入：连点会往页面栈塞多个品牌页，返回时要按好几次才回得来
      if (this.navigating) return
      this.navigating = true
      // 跳转到品牌选择页
      uni.navigateTo({
        url: '/pages/brand/brand',
        complete: () => { this.navigating = false }
      })
    },

    // ---- 撒花 ----
    // 引擎在 utils/confetti.js：canvas-confetti 同款物理模型（初速度 + 扩散角 + 重力 + 寿命），
    // 只是把渲染换成小程序 Canvas 2D。粒子自己消亡，不需要定时清理。
    initConfetti() {
      this._confettiWanted = true
      if (this._confetti || this._confettiPending) return
      // tabBar 切走只是隐藏页面，canvas 节点和 2D 上下文都还在。
      // 直接拿它们重建引擎，省掉重设 canvas.width —— 那一步会重新分配整块像素缓冲，
      // 每次从子页面返回首页都来一遍，反复切换时很伤
      if (this._confettiCanvas && this._confettiCtx && this._confettiW && this._confettiH) {
        this._confetti = createConfetti(
          this._confettiCanvas, this._confettiCtx, this._confettiW, this._confettiH,
          () => { this.confettiActive = false }
        )
        return
      }
      this._confettiPending = true
      let retry = 0
      const run = () => {
        if (!this._confettiWanted) { this._confettiPending = false; return }
        uni.createSelectorQuery().in(this)
          .select('#confetti-canvas').fields({ node: true, size: true })
          .exec((res) => {
            const rect = res && res[0]
            let canvas = rect && rect.node
            let width = rect && rect.width
            let height = rect && rect.height

            // #ifdef H5
            // H5 端不保证 node 字段可用，退回直接取 DOM（只影响本地开发预览）
            if (!canvas && this.$el) {
              const el = this.$el.querySelector('canvas')
              if (el && el.getContext) {
                canvas = el
                width = el.clientWidth
                height = el.clientHeight
              }
            }
            // #endif

            // onShow 早于 onReady 时节点还不存在，退避重试几次
            if (!canvas || !width || !height) {
              if (retry++ < 5) { setTimeout(run, 120); return }
              this._confettiPending = false
              return
            }
            if (!this._confettiWanted) { this._confettiPending = false; return }
            this._confettiPending = false

            const ctx = canvas.getContext('2d')
            const dpr = this.getConfettiDpr()
            canvas.width = width * dpr
            canvas.height = height * dpr
            // 缩放一次，之后引擎里的坐标全部按 CSS px 算，不用管 dpr
            if (ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            else ctx.scale(dpr, dpr)

            this._confettiCanvas = canvas
            this._confettiCtx = ctx
            // 尺寸也记下来：下次 onShow 复用同一块画布，不用再查询、再重分配
            this._confettiW = width
            this._confettiH = height
            // 一炮放完（粒子全部消亡）就把画布藏起来：全屏 canvas 常驻时，
            // 滚动过程中会多合成一层，安卓上尤其明显
            this._confetti = createConfetti(canvas, ctx, width, height, () => {
              this.confettiActive = false
            })
          })
      }
      run()
    },

    getConfettiDpr() {
      let dpr = 2
      try {
        dpr = (uni.getWindowInfo ? uni.getWindowInfo().pixelRatio : uni.getSystemInfoSync().pixelRatio) || 1
      } catch (e) {}
      return Math.min(dpr, 2)   // 撒花是纯装饰，2 倍以上肉眼无差，省一半填充率
    },

    syncConfettiSize() {
      if (!this._confetti) return
      uni.createSelectorQuery().in(this)
        .select('#confetti-canvas').fields({ size: true })
        .exec((res) => {
          const rect = res && res[0]
          if (!rect || !this._confetti || !this._confettiCanvas) return
          const canvas = this._confettiCanvas
          const ctx = this._confettiCtx
          const dpr = this.getConfettiDpr()
          canvas.width = rect.width * dpr
          canvas.height = rect.height * dpr
          if (ctx && ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          this._confetti.resize(rect.width, rect.height)
        })
    },

    destroyConfetti() {
      this._confettiWanted = false
      this._confettiPending = false
      if (this._confettiRetry) {
        clearTimeout(this._confettiRetry)
        this._confettiRetry = null
      }
      if (this._confetti) {
        this._confetti.destroy()
        this._confetti = null
      }
      // 粒子跟着引擎一起没了，标记也要清掉。
      // 否则它在 onHide 后一直是 true，每次都让人以为「还在撒花」而白跑一遍初始化
      this.confettiActive = false
      // 注意：这里故意不清 _confettiCanvas / _confettiCtx。
      // 首页是 tabBar 页，onHide 只是隐藏，画布节点还在，
      // 下次 onShow 直接复用（见 initConfetti），不用重新分配像素缓冲。
      // 真页面销毁时整个实例一起回收，不会泄漏
    },

    // 忍住成功时放一炮：左右两侧对射 + 中间一束（原文的三连发打法）
    burstConfetti() {
      if (!this._confetti) {
        // 极少见：canvas 还没就绪。补一次初始化，就绪后再补放（只补一次，避免反复排期）
        this.initConfetti()
        if (this._confettiRetry) return
        this._confettiRetry = setTimeout(() => {
          this._confettiRetry = null
          if (this._confetti) this.burstConfetti()
        }, 200)
        return
      }
      // canvas 读不到 CSS 变量，颜色从当前主题里取 hex。
      // 主题三色各出现两次 = 出场权重翻倍（引擎按数组随机取色），保证整体仍是这套皮肤的味道；
      // 再掺一组明度更高的节日色负责「花」，在五个主题的深底上都立得住。
      const vars = currentTheme().vars || {}
      const primary = vars['--primary'] || '#f59e0b'
      const primary2 = vars['--primary-2'] || '#f97316'
      const accent = vars['--accent'] || '#34d399'
      const colors = [
        primary, primary2, accent,
        primary, primary2, accent,
        '#fde68a',   // 金
        '#fb7185',   // 珊瑚
        '#60a5fa',   // 天蓝
        '#c4b5fd',   // 紫
        '#a3e635',   // 青柠
        '#f8fafc'    // 纸白
      ]
      // 只放一波：一个炮口、一帧点火。
      // spread 是总张角：55° = 左右各 27.5°，束形收窄成一股，冲得更高
      this.confettiActive = true
      this._confetti.fire({
        colors,
        particleCount: 120,
        angle: 90,
        spread: 55,
        startVelocity: 52,
        decay: 0.9,
        gravity: 1.1,
        ticks: 200,
        origin: { x: 0.5, y: 0.9 }
      })
    },

    // 忍住不抽：记一笔省下的钱，给即时反馈（触感 + 上浮 +¥ + 计数变化）
    resistOne() {
      if (this.resistLock) return
      this.resistLock = true
      setTimeout(() => { this.resistLock = false }, 400)

      const price = Number(Store.getResistPrice()) || 0
      Store.recordResist(price)

      if (uni.vibrateShort) uni.vibrateShort({ type: 'light' })

      // 上浮的 +¥：先关再开，保证连点时动画能重播
      this.resistFloatText = '+¥' + price.toFixed(2)
      this.resistFloatVisible = false
      this.$nextTick(() => { this.resistFloatVisible = true })
      if (this.resistFloatTimer) clearTimeout(this.resistFloatTimer)
      this.resistFloatTimer = setTimeout(() => { this.resistFloatVisible = false }, 900)

      // 按钮按下的轻微回落
      this.resistHit = true
      setTimeout(() => { this.resistHit = false }, 180)

      this.refreshData()
      this.burstConfetti()

      this.toastMsg = `忍住了，省下 ¥${price.toFixed(2)}`
      this.showToast = true
      if (this.resistToastTimer) clearTimeout(this.resistToastTimer)
      this.resistToastTimer = setTimeout(() => { this.showToast = false }, 1800)
    },

    // ---- 自定义「忍住一根算省多少」 ----
    // 从页面上那个 +¥ 金额点进来，改完立刻生效，不必去设置页
    openPriceEditor() {
      // 已经自定义过就预填当前值（多半只想微调）；跟随烟价时留空，让占位符显示自动价
      const custom = Number(Store.getSettings().resistPrice)
      this.priceEditValue = custom > 0 ? String(custom) : ''
      this.priceEditError = ''
      this.showPriceEditor = true
    },

    closePriceEditor() {
      this.showPriceEditor = false
      this.priceEditError = ''
    },

    saveResistPrice() {
      const raw = String(this.priceEditValue == null ? '' : this.priceEditValue).trim()
      let price = 0
      if (raw !== '') {
        // digit 键盘拦不住粘贴和多余的符号，这里逐条给出能看懂的说明，
        // 提示直接显示在输入框下方，不用 toast
        if (raw.startsWith('-')) {
          this.priceEditError = '金额不能是负数'
          return
        }
        if (!/^\d+(\.\d{0,2})?$/.test(raw)) {
          this.priceEditError = '只能填数字，最多两位小数'
          return
        }
        const n = Number(raw)
        if (!isFinite(n)) {
          this.priceEditError = '这是个无效的金额'
          return
        }
        if (n > 999) {
          this.priceEditError = '单根最多 ¥999，是不是多打了一位'
          return
        }
        price = n
      }
      // 用存储里的最新快照打底，只覆盖这一个字段，
      // 避免把 onLoad 时的旧 selectedBrand 写回去
      Store.saveSettings({ ...Store.getSettings(), resistPrice: price })
      this.priceEditError = ''
      this.showPriceEditor = false
      this.refreshData()
      uni.showToast({
        title: price > 0 ? `已设为每根 ¥${price.toFixed(2)}` : '已恢复按烟价自动算',
        icon: 'none'
      })
    },

    // ---- 省钱目标（原来独立一页，现在挂在账本下面）----
    // 进度从目标创建时已省的钱算起，否则累计已省会把新目标一诞生就顶到 100%
    loadGoal(totalSaved) {
      const goals = Store.getSavingsGoals()
      if (!goals.length) {
        this.hasGoal = false
        this.goalProgress = 0
        this.goalRemain = '0'
        return
      }
      const last = goals[goals.length - 1]
      let baseline = Number(last.baseline)
      if (!isFinite(baseline)) {
        // 老目标没有 baseline，就地补一个（从现在起算），否则永远显示 100%
        baseline = totalSaved
        Store.updateSavingsGoal(last.id, { baseline })
      }
      const delta = Math.max(0, totalSaved - baseline)
      const target = Number(last.target) || 0
      this.hasGoal = true
      this.goalName = last.name || ''
      this.goalRemain = Math.max(0, target - delta).toFixed(0)
      this.goalProgress = target > 0 ? Math.min(100, (delta / target) * 100) : 0

      // 达成提示每个目标只弹一次
      if (target > 0 && delta >= target && !last.achievedNotified) {
        Store.updateSavingsGoal(last.id, { achievedNotified: true })
        uni.showToast({ title: '🎉 目标达成', icon: 'none' })
      }
    },

    openGoalEditor() {
      // 预填当前目标：用户多半只是想改金额
      const goals = Store.getSavingsGoals()
      const last = goals.length ? goals[goals.length - 1] : null
      this.goalEdit = {
        name: last ? (last.name || '') : '',
        target: last ? String(last.target) : ''
      }
      this.showGoalEditor = true
    },

    closeGoalEditor() {
      this.showGoalEditor = false
    },

    saveGoal() {
      const target = parseFloat(this.goalEdit.target)
      if (!target || target <= 0) {
        uni.showToast({ title: '请输入目标金额', icon: 'none' })
        return
      }
      if (!guardContent(this.goalEdit.name)) return
      Store.addSavingsGoal({
        name: (this.goalEdit.name || '').trim() || '省钱目标',
        target,
        // 记下创建时已省的钱，进度按「从现在起再省多少」算
        baseline: Store.getResistStats().totalSaved
      })
      this.showGoalEditor = false
      this.refreshData()
      uni.showToast({ title: '目标已保存', icon: 'success' })
    },

    goToAchievements() {
      uni.navigateTo({ url: '/pages/achievements/achievements' })
    },

    goToRecovery() {
      uni.navigateTo({ url: '/pages/recovery/recovery' })
    },

    goToCraving() {
      uni.navigateTo({ url: '/pages/craving/craving' })
    },

    goToBreathing() {
      uni.navigateTo({ url: '/pages/breathing/breathing' })
    },

    goToPet() {
      uni.navigateTo({ url: '/pages/pet/pet' })
    },

    watchAdForQuota() {
      // 防连点：广告回调是异步的，连点会并发多个 Promise，
      // 每个都 resolve 就白拿多份配额
      if (this.adWatching) return
      this.adWatching = true
      AdManager.showRewardedAd('quota').then(success => {
        if (success) {
          this.adWatching = false
          // 一次给几根由广告模块统一定义，避免这里和展示文案写两个数字
          Store.addExtraQuota(AdManager.REWARD_QUOTA_PER_AD)
          this.refreshData()
        } else {
          this.adWatching = false
        }
      }).catch(() => {
        this.adWatching = false
      })
    },

    // 看广告让「上一根」的金额翻倍（同一根只能翻一次）
    watchAdBoost() {
      if (this.adWatching) return
      this.adWatching = true
      AdManager.showRewardedAd('boost').then(success => {
        this.adWatching = false
        if (!success) return
        if (Store.boostLastSmoke()) {
          uni.showToast({ title: '上一根已 ×2', icon: 'none' })
        }
        this.refreshData()
      }).catch(() => {
        this.adWatching = false
      })
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
  /* 原来是写死的 #e5e7eb（等于 amber 主题的 --text），
     在 mono 主题下 --text 是 #f5f5f5，会比这里亮，出现不一致 */
  color: var(--text);
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* 统一滚动容器：flex 列里靠 height:0 + flex:1 拿到确定高度 */
.main-scroll {
  flex: 1;
  height: 0;
  min-height: 0;
}

/* 至今已花卡片 */
.saved-card {
  border-radius: 32rpx;
  overflow: hidden;
  background: linear-gradient(135deg, var(--surface-2) 0%, var(--surface-1) 100%);
  border: 1px solid var(--border);
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.2);
}

.saved-bar {
  width: 12rpx;
  background-color: var(--primary);
  flex-shrink: 0;
}

/* ===== Hero 区：戒烟天数 ===== */
/* 沿用 saved-card 的「左侧主色条」语言，不引入新的视觉元素 */
.hero-card {
  border-radius: 32rpx;
  padding: 32rpx 40rpx;
  background: linear-gradient(135deg, var(--surface-2) 0%, var(--surface-1) 100%);
  border: 1px solid var(--border);
  border-left: 12rpx solid var(--primary);
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.2);
}

.hero-days-row {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin-top: 4rpx;
}

.hero-days {
  font-size: 96rpx;
  font-weight: 800;
  line-height: 1.1;
  color: var(--primary);
  display: inline-block;
  transition: transform 0.35s ease, filter 0.35s ease;
}

.hero-unit {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--text-dim);
}

.hero-quote {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--text);
}

/* 数字变化时的强调（由 bumpIfChanged 触发） */
.hero-days.bump,
.quota-remain.bump {
  transform: scale(1.18);
  filter: brightness(1.25);
}

/* ===== 今天还能抽 ===== */
/* ===== 今日已抽 / 今日剩余：对角对称 ===== */
/* 两组数字共用 .quota-remain / .quota-unit 的同一套字号、字重与状态色，
   不再给剩余单独做小胶囊，左右视觉权重保持一致 */
.quota-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.quota-stat {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}

/* 右侧一组整体靠右，与左侧「今日已抽」形成对角阅读线 */
.quota-stat-right {
  align-items: flex-end;
}

.quota-stat-right .quota-row {
  justify-content: flex-end;
}

.quota-row {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin: 4rpx 0 0;
}

.quota-remain {
  font-size: 80rpx;
  font-weight: 800;
  line-height: 1.15;
  color: var(--text);
  display: inline-block;
  transition: transform 0.35s ease, filter 0.35s ease, color 0.3s ease;
}

/* 已抽根数按进度变色，让数字自己会说话。
   三档全取自主题自身变量，不用 --accent：accent 在各主题里语义不一致
   （mint 主题的 primary 是绿、accent 是琥珀，与 amber 主题正好反过来），
   用它会导致同一套状态在不同主题下意思漂移。
   good 主色（还很宽裕）→ warn 次色（快用完）→ over 危险红（归零） */
.quota-remain.good { color: var(--primary); }
.quota-remain.warn { color: var(--primary-2); }
.quota-remain.over { color: var(--danger-1); }

.quota-unit {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--text-dim);
}

/* 配额用完的替代引导 */
.quota-empty-tip {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.quota-empty-text {
  font-size: 26rpx;
  color: var(--text-dim);
  flex: 1;
}

.quota-alt-btn {
  flex-shrink: 0;
  padding: 14rpx 28rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 600;
  border: 1px solid var(--primary);
  color: var(--primary);
  background: transparent;
  line-height: 1;
}

.quota-alt-btn:active {
  background: var(--primary);
  color: var(--bg);
}

/* ===== 三列紧凑小卡 ===== */
.three-col {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
}

.mini-card {
  background: linear-gradient(135deg, var(--surface-2) 0%, var(--surface-1) 100%);
  border: 1px solid var(--border);
  border-radius: 24rpx;
  padding: 24rpx 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  transition: transform 0.2s ease;
}

.mini-card:active {
  transform: scale(0.96);
}

.mini-icon {
  font-size: 44rpx;
  line-height: 1;
}

.mini-value {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
}

.mini-sub {
  font-size: 24rpx;
  font-weight: 400;
  color: var(--text-dim);
}

.mini-label {
  font-size: 22rpx;
  color: var(--text-dim);
}

/* 里程碑文字较长（如「20分钟」），单独压字号避免撑破三列 */
.milestone-val {
  font-size: 30rpx;
}

/* 进度条 */
.progress-bar {
  margin-top: 16rpx;
  height: 12rpx;
  background-color: var(--border);
  border-radius: 999rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--primary);
  border-radius: 999rpx;
  transition: width 0.3s;
}

/* 进度条跟上数字的颜色，保持「数字=进度」是同一件事的观感。
   App.vue 的 .progress-fill 已去掉 !important，双类选择器优先级更高，
   这里不必再反向加 !important 抢回来。 */
.progress-fill.good { background-color: var(--primary); }
.progress-fill.warn { background-color: var(--primary-2); }
.progress-fill.over { background-color: var(--danger-1); }

/* 底部按钮 */
.btn-container {
  position: fixed;
  left: 0;
  right: 0;
  /* 底边正好贴住 tabBar 顶部（100rpx + 安全区），
     原来留 140rpx 会空出一条缝，滚动内容会从缝里露一行字 */
  bottom: calc(100rpx + env(safe-area-inset-bottom, 0px));
  z-index: var(--z-sticky, 30);
  padding: 16rpx 40rpx 0;
  /* 底部渐隐要跟着主题背景走，否则薄荷/极光主题下会露出一条灰边。
     实色区放大到 65%，滚动内容从下方穿出时不会半透明地糊在按钮后面 */
  background: linear-gradient(to top, var(--bg) 65%, transparent);
}

/* 省钱这条路：亮、轻、细边框，和下面沉重的主色渐变按钮区分开 */
.btn-resist {
  position: relative;
  display: flex;
  align-items: center;
  gap: 18rpx;
  /* 右侧留出金额徽标的位置：徽标是独立浮层，不参与这行 flex。
     徽标现在是「金额 + 自定义」两行，比原来宽一点，留 170rpx 免得压到副标题 */
  padding: 20rpx 170rpx 20rpx 24rpx;
  margin-bottom: 16rpx;
  border-radius: 26rpx;
  background: linear-gradient(135deg, var(--surface-1) 0%, var(--surface-2) 100%);
  border: 1px solid var(--accent);
  transition: transform 0.12s ease;
}

/* 包住按钮 + 金额徽标，让徽标独立于按钮的点击区域 */
.resist-wrap {
  position: relative;
}

.btn-resist.is-hit {
  transform: scale(0.97);
}

.btn-resist-icon {
  font-size: 38rpx;
  line-height: 1;
}

.btn-resist-body {
  flex: 1;
  min-width: 0;
}

.btn-resist-main {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 1rpx;
}

.btn-resist-sub {
  display: block;
  margin-top: 4rpx;
  font-size: 20rpx;
  color: var(--text-dim);
}

/* 这个金额可以点开改：盖在按钮右侧，独立于「记一次」的点击区。
   金额下面带一行「自定义」，光看 +¥1.50 没人知道它可点、可以改 */
.btn-resist-chip {
  position: absolute;
  right: 24rpx;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
  padding: 9rpx 18rpx 8rpx;
  border-radius: 20rpx;
  border: 1px solid var(--accent);
  background: var(--surface-2);
  color: var(--accent);
}

.btn-resist-chip-val {
  font-size: 24rpx;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: 0.5rpx;
}

.btn-resist-chip-edit {
  font-size: 18rpx;
  line-height: 1.15;
  letter-spacing: 1rpx;
  opacity: 0.62;
}

/* 按下给点反馈，暗示这里能点 */
.btn-resist-chip:active {
  background: var(--accent);
  color: var(--bg);
}

.btn-resist-chip:active .btn-resist-chip-edit {
  opacity: 0.8;
}

/* 点一下的钱数上浮，回答的是「我刚才做了什么」 */
.resist-float {
  position: absolute;
  right: 28rpx;
  top: 6rpx;
  font-size: 26rpx;
  font-weight: 700;
  color: var(--accent);
  pointer-events: none;
  animation: resistFloat 0.9s ease-out forwards;
}

@keyframes resistFloat {
  0% { opacity: 0; transform: translateY(8rpx); }
  20% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-36rpx); }
}

/* 已花 / 已省 对称双列：同字号同字重，只有颜色语义相反 */
.money-pair {
  display: flex;
  align-items: flex-end;
  gap: 24rpx;
}

.money-col {
  flex: 1;
  min-width: 0;
}

.money-col-right {
  text-align: right;
}

.money-divider {
  width: 1px;
  height: 56rpx;
  background: var(--border);
  flex-shrink: 0;
  margin-bottom: 6rpx;
}

.money-label {
  display: block;
  font-size: 24rpx;
  color: var(--text-dim);
  margin-bottom: 8rpx;
}

.money-value {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  line-height: 1.1;
}

.money-value-saved {
  color: var(--accent);
}

/* 已花卡片里的「省钱账」一行 */
.resist-summary {
  margin-top: 18rpx;
  padding-top: 18rpx;
  border-top: 1px dashed var(--border);
}

.resist-summary-text {
  font-size: 26rpx;
  color: var(--text-dim);
  line-height: 1.5;
}

.resist-summary-num {
  font-size: 28rpx;
  color: var(--accent);
  font-weight: 700;
}

/* 省钱目标：账本密下的一行进度，不抢上面两个大金额的注意力 */
.goal-row {
  margin-top: 18rpx;
  padding-top: 18rpx;
  border-top: 1px dashed var(--border);
}

.goal-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 12rpx;
}

.goal-name {
  font-size: 26rpx;
  color: var(--text);
}

.goal-remain {
  font-size: 24rpx;
  color: var(--text-dim);
}

.goal-bar {
  height: 10rpx;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999rpx;
  overflow: hidden;
}

.goal-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%);
  border-radius: 999rpx;
  transition: width 0.35s ease;
}

.goal-empty {
  font-size: 24rpx;
  color: var(--text-dim);
}

.btn-have-one {
  width: 100%;
  padding: 36rpx 32rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  /* 底色只是比主色深一档（偏中亮），所以文字用深色的主题背景色，对比度才够 */
  color: var(--bg);
  /* 用主题主色的加深版：换主题会跟着变，但比亮主色沉一档，不抢眼 */
  background: linear-gradient(135deg, var(--primary-deep) 0%, var(--primary-2-deep) 55%, var(--primary-deep) 100%);
  box-shadow: 0 12rpx 40rpx var(--glow);
  border: none;
  position: relative;
  overflow: hidden;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.btn-have-one:active {
  transform: scale(0.97);
  box-shadow: 0 6rpx 20rpx var(--glow);
}

.btn-have-one[disabled] {
  opacity: 0.5;
}

/* 呼吸动画：只动 transform，走合成层，不产生重绘。
   原来每帧都在改 box-shadow 和 filter: brightness —— 阴影是两层大范围模糊，
   等于首页始终有一块区域在持续重绘，滚动时就会周期性掉帧 */
@keyframes btnBreath {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.015); }
}

.btn-have-one:not([disabled]) {
  animation: btnBreath 2.4s ease-in-out infinite;
}

/* 按下时停掉呼吸动画，否则 animation 的 transform 会盖掉 :active 的缩小反馈 */
.btn-have-one:active {
  animation: none;
}

.btn-fire-wrap {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.btn-fire {
  font-size: 80rpx;
  line-height: 1;
}

.btn-text-wrap {
  flex: 1;
  text-align: center;
}

.btn-main-text {
  display: block;
  font-size: 42rpx;
  font-weight: bold;
  line-height: 1.2;
}

.btn-sub-text {
  display: block;
  font-size: 24rpx;
  opacity: 0.75;
  margin-top: 6rpx;
  line-height: 1.3;
}

/* ---- 改「忍住一根算省多少」弹窗 ---- */
.modal-mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.62);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
  z-index: var(--z-modal, 300);   /* 高于 tabBar（200）、撒花层（180）和 Toast（200） */
}

.modal-card {
  width: 100%;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 32rpx;
  padding: 40rpx;
}

.modal-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: var(--text);
  text-align: center;
}

/* 金额一行：¥ 小、数字大，输错一眼能看见 */
.modal-input-wrap {
  display: flex;
  align-items: center;
  margin-top: 32rpx;
  padding: 8rpx 24rpx;
  background: var(--surface-1);
  border: 1px solid var(--border);
  border-radius: 20rpx;
}

/* 两个输入框叠在同一个弹窗里时的间距 */
.modal-input-wrap-gap {
  margin-top: 16rpx;
}

/* 金额填错：输入框描边转红，说明就贴在框下面（不再靠 toast，弹窗后面看不见） */
.modal-input-wrap.is-error {
  border-color: var(--danger-1);
  box-shadow: 0 0 0 3rpx rgba(255, 107, 107, 0.12);
}

.modal-error {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  margin-top: 12rpx;
}

.modal-error::before {
  content: '';
  flex-shrink: 0;
  width: 8rpx;
  height: 8rpx;
  margin-top: 12rpx;
  border-radius: 50%;
  background: var(--danger-1);
}

.modal-error-text {
  font-size: 22rpx;
  line-height: 1.5;
  color: var(--danger-1);
}

/* 目标名称是文字不是数字，字号跟着降一档 */
.goal-name-input {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--text);
}

.modal-input-prefix {
  font-size: 32rpx;
  color: var(--text-dim);
  margin-right: 8rpx;
}

.modal-input {
  flex: 1;
  height: 88rpx;
  font-size: 44rpx;
  font-weight: 700;
  color: var(--primary);
}

.modal-hint {
  display: block;
  margin-top: 16rpx;
  font-size: 22rpx;
  line-height: 1.6;
  color: var(--text-dim);
}

.modal-actions {
  display: flex;
  margin-top: 36rpx;
}

.modal-btn {
  flex: 1;
  padding: 24rpx 0;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 1.2;
  border: none;
}

.modal-btn.cancel {
  margin-right: 20rpx;
  background: var(--surface-1);
  color: var(--text-dim);
}

.modal-btn.confirm {
  background: var(--primary);
  color: var(--bg);
}

/* Toast */
.toast {
  position: fixed;
  top: 160rpx;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 28rpx;
  padding: 16rpx 32rpx;
  border-radius: 24rpx;
  z-index: 200;
}

/* ---- 撒花层：全屏 Canvas（粒子由 utils/confetti.js 驱动） ---- */
.confetti-canvas {
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: 180;
  /* 没有粒子时整层不参与合成（visibility 不影响布局，选择器查询仍能拿到尺寸） */
  visibility: hidden;
  /* 纯装饰层，绝不能吃掉下面的点击/滚动 */
  pointer-events: none;
}

/* 只在放花期间显示 */
.confetti-canvas.is-active {
  visibility: visible;
}

/* 工具类 */
.flex { display: flex; }
.flex-1 { flex: 1; }
.items-center { align-items: center; }
.gap-12 { gap: 24rpx; }
.text-left { text-align: left; }
.text-xs { font-size: 24rpx; }
.text-sm { font-size: 28rpx; }
.text-base { font-size: 32rpx; }
.text-lg { font-size: 36rpx; }
.text-2xl { font-size: 48rpx; }
.text-4xl { font-size: 72rpx; }
.font-bold { font-weight: bold; }
.font-normal { font-weight: normal; }
.leading-none { line-height: 1; }
.block { display: block; }
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.overflow-hidden { overflow: hidden; }
.p-12 { padding: 24rpx; }
.p-16 { padding: 32rpx; }
.p-20 { padding: 40rpx; }
.px-20 { padding-left: 40rpx; padding-right: 40rpx; }
.pt-40 { padding-top: 80rpx; }
.pb-16 { padding-bottom: 32rpx; }
.mx-20 { margin-left: 40rpx; margin-right: 40rpx; }
.mb-16 { margin-bottom: 32rpx; }
.mt-4 { margin-top: 8rpx; }
.mt-8 { margin-top: 16rpx; }
.opacity-80 { opacity: 0.8; }
.text-gray-100 { color: var(--text); }
.text-gray-300 { color: var(--text); }
.text-gray-500 { color: var(--text-dim); }
.text-gray-600 { color: var(--text-dim); }
.text-amber { color: var(--primary); }
.bg-amber { background-color: var(--primary); }
.card { 
  background: linear-gradient(135deg, var(--surface-2) 0%, var(--surface-1) 100%);
  border: 1px solid var(--border); 
  border-radius: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.15);
}

/* 每日挑战卡片 */
.challenge-card {
  background: linear-gradient(135deg, var(--surface-2) 0%, var(--surface-1) 100%);
  border: 1px solid var(--border);
  border-radius: 32rpx;
  padding: 32rpx;
  position: relative;
  overflow: hidden;
}

.challenge-card.completed {
  border-color: rgba(16, 185, 129, 0.3);
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0.02) 100%);
}

.challenge-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.challenge-icon {
  font-size: 56rpx;
}

.challenge-badge {
  font-size: 22rpx;
  color: var(--primary);
  font-weight: 600;
}

.challenge-failed {
  font-size: 22rpx;
  color: var(--danger-1);
  font-weight: 600;
}

.challenge-hint {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  color: var(--text-dim);
}

.challenge-streak {
  font-size: 22rpx;
  color: var(--primary);
  font-weight: 600;
}

.challenge-progress-bar {
  height: 12rpx;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 8rpx;
  overflow: hidden;
}

.challenge-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary) 0%, var(--primary) 100%);
  border-radius: 8rpx;
  transition: width 0.3s ease;
}

/* 更多功能网格：只剩两条入口，两列各占一半，别再空一格 */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.feature-item {
  background: linear-gradient(135deg, var(--surface-2) 0%, var(--surface-1) 100%);
  border: 1px solid var(--border);
  border-radius: 20rpx;
  padding: 24rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  cursor: pointer;
  transition: all 0.2s;
}

.feature-item:active {
  transform: scale(0.95);
  background: linear-gradient(135deg, var(--surface-1) 0%, var(--surface-2) 100%);
}

.feature-icon {
  font-size: 64rpx;
}

.feature-name {
  font-size: 24rpx;
  color: #d1d5db;
}

/* 看广告+1根按钮 */
.ad-quota-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  margin-top: 16rpx;
  padding: 10rpx 16rpx;
  background: var(--glow);
  border: 1px solid var(--glow);
  border-radius: 16rpx;
}

.ad-quota-btn:active {
  opacity: 0.7;
  transform: scale(0.97);
}

.ad-quota-icon {
  font-size: 28rpx;
}

.ad-quota-text {
  font-size: 22rpx;
  color: var(--primary);
  font-weight: 600;
}

/* 今日还剩几次：让用户知道这是个有限资源，也能预期点了还有没有 */
.ad-quota-remain {
  font-size: 20rpx;
  color: var(--text-dim);
}

/* 上一根翻倍 */
.boost-btn {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 16rpx;
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  background: var(--glow);
  border: 1px solid var(--glow);
}

.boost-btn-icon {
  font-size: 24rpx;
}

.boost-btn-text {
  font-size: 22rpx;
  color: var(--primary);
  font-weight: 600;
}
</style>
