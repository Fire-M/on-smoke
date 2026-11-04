<template>
  <view class="page-container" :class="themeClass()">
    <app-navbar title="记录"></app-navbar>

    <!-- 烟瘾和心情原本是两个页面，但它们回答的是同一个问题：
         「此刻我在什么状态」。合成一页，用一条切换条分开 -->
    <view class="tab-bar">
      <view class="tab-item" :class="{ active: tab === 'craving' }" @tap="switchTab('craving')">
        <text class="tab-text">烟瘾</text>
      </view>
      <view class="tab-item" :class="{ active: tab === 'mood' }" @tap="switchTab('mood')">
        <text class="tab-text">心情</text>
      </view>
    </view>

    <scroll-view scroll-y class="main-scroll">
      <!-- ==================== 烟瘾 ==================== -->
      <block v-if="tab === 'craving'">
        <!-- 今日统计 -->
        <view class="stats-card mx-20 mb-16">
          <text class="card-title">今日烟瘾</text>
          <view class="stats-row">
            <view class="stat-item">
              <text class="stat-value">{{ todayCount }}</text>
              <text class="stat-label">次</text>
            </view>
            <view class="stat-item">
              <text class="stat-value">{{ avgIntensity }}</text>
              <text class="stat-label">平均强度</text>
            </view>
            <view class="stat-item">
              <text class="stat-value">{{ resistedCount }}</text>
              <text class="stat-label">次成功抵抗</text>
            </view>
          </view>
        </view>

        <!-- 记录烟瘾按钮 -->
        <view class="mx-20 mb-16">
          <button class="record-btn" @tap="showCravingModal = true">
            <text class="record-btn-icon">🧠</text>
            <text class="record-btn-text">记录烟瘾</text>
          </button>
        </view>

        <!-- 烟瘾模式分析 -->
        <view class="card mx-20 mb-16 p-20">
          <text class="card-title mb-16 block">烟瘾模式</text>
          <view class="pattern-list">
            <view v-for="(item, idx) in topTriggers" :key="idx" class="pattern-item">
              <view class="pattern-info">
                <text class="pattern-icon">{{ item.icon }}</text>
                <text class="pattern-name">{{ item.name }}</text>
              </view>
              <view class="pattern-bar-wrap">
                <view class="pattern-bar" :style="{ width: item.percent + '%' }"></view>
              </view>
              <text class="pattern-count">{{ item.count }}次</text>
            </view>
            <view v-if="topTriggers.length === 0" class="empty-hint">
              <text>暂无数据，记录几次烟瘾后分析</text>
            </view>
          </view>
        </view>

        <!-- 强度分布 -->
        <view class="card mx-20 mb-16 p-20">
          <text class="card-title mb-16 block">强度分布</text>
          <view class="intensity-chart">
            <view v-for="i in 5" :key="i" class="intensity-bar-wrap">
              <view class="intensity-bar" :style="{ height: intensityPercent(i) + '%' }"
                :class="'level-' + i">
                <text class="intensity-value" v-if="intensityDist[i] > 0">{{ intensityDist[i] }}</text>
              </view>
              <text class="intensity-label">{{ i }}级</text>
            </view>
          </view>
        </view>

        <!-- 历史记录 -->
        <view class="card mx-20 mb-16 p-20">
          <text class="card-title mb-16 block">最近记录</text>
          <view class="history-list">
            <view v-for="(item, idx) in recentCravings" :key="idx" class="history-item">
              <view class="history-time">
                <text class="history-date">{{ formatDate(item.timestamp) }}</text>
                <text class="history-hour">{{ formatTime(item.timestamp) }}</text>
              </view>
              <view class="history-content">
                <view class="history-tags">
                  <text class="history-tag intensity">{{ item.intensity }}级</text>
                  <text class="history-tag trigger">{{ getTriggerName(item.trigger) }}</text>
                  <text v-if="item.resisted" class="history-tag resisted">已抵抗</text>
                </view>
                <text v-if="item.note" class="history-note">{{ item.note }}</text>
              </view>
            </view>
            <view v-if="recentCravings.length === 0" class="empty-hint">
              <text>还没有记录</text>
            </view>
          </view>
        </view>
      </block>

      <!-- ==================== 心情 ==================== -->
      <block v-else>
        <!-- 情绪分布 -->
        <view class="stats-card mx-20 mb-16">
          <text class="card-title">情绪分布</text>
          <!-- 空态：新用户看到一排「😀 0」很困惑 -->
          <view v-if="!totalMoods" class="mood-empty">
            <text class="mood-empty-icon">🌤️</text>
            <text class="mood-empty-text">还没有记录，写下此刻的心情试试</text>
          </view>
          <view v-else class="mood-stats">
            <view v-for="(count, mood) in moodDist" :key="mood" class="mood-stat">
              <text class="mood-emoji">{{ getMoodEmoji(mood) }}</text>
              <text class="mood-count">{{ count }}</text>
              <text class="mood-name">{{ getMoodName(mood) }}</text>
            </view>
          </view>
        </view>

        <!-- 记录情绪按钮 -->
        <view class="mx-20 mb-16">
          <button class="record-btn" @tap="showMoodModal = true">
            <text class="record-btn-icon">😊</text>
            <text class="record-btn-text">记录此刻心情</text>
          </button>
        </view>

        <!-- 情绪洞察 -->
        <view class="card mx-20 mb-16 p-20">
          <text class="card-title mb-16 block">情绪洞察</text>
          <view class="insight-item">
            <text class="insight-icon">💭</text>
            <view class="insight-content">
              <text class="insight-text">总共记录了 <text class="highlight">{{ totalMoods }}</text> 次情绪</text>
            </view>
          </view>
          <view class="insight-item">
            <text class="insight-icon">🚬</text>
            <view class="insight-content">
              <text class="insight-text">吸烟时记录 <text class="highlight">{{ smokingMoods }}</text> 次</text>
            </view>
          </view>
          <view class="insight-item">
            <text class="insight-icon">🌿</text>
            <view class="insight-content">
              <text class="insight-text">不吸烟时记录 <text class="highlight">{{ nonSmokingMoods }}</text> 次</text>
            </view>
          </view>
        </view>

        <!-- 历史记录 -->
        <view class="card mx-20 mb-16 p-20">
          <text class="card-title mb-16 block">最近记录</text>
          <view class="history-list">
            <view v-for="(item, idx) in recentMoods" :key="idx" class="history-item">
              <view class="history-emoji">{{ getMoodEmoji(item.mood) }}</view>
              <view class="history-content">
                <view class="history-header">
                  <text class="history-mood">{{ getMoodName(item.mood) }}</text>
                  <text v-if="item.smoked" class="mood-tag smoking">吸烟时</text>
                  <text v-else class="mood-tag clean">无烟时</text>
                </view>
                <text v-if="item.note" class="history-note">{{ item.note }}</text>
                <text class="mood-time">{{ formatDateTime(item.timestamp) }}</text>
              </view>
            </view>
            <view v-if="recentMoods.length === 0" class="empty-hint">
              <text>还没有记录</text>
            </view>
          </view>
        </view>
      </block>

      <view class="scroll-bottom"></view>
    </scroll-view>

    <!-- 记录烟瘾弹窗 -->
    <view class="modal-mask" v-if="showCravingModal" @tap="closeCravingModal">
      <view class="modal-card" @tap.stop>
        <text class="modal-title">记录烟瘾</text>

        <!-- 强度选择 -->
        <view class="form-section">
          <text class="form-label">烟瘾强度</text>
          <view class="intensity-picker">
            <view v-for="i in 5" :key="i" class="intensity-option"
              :class="[newCraving.intensity === i ? 'active' : '', 'level-' + i]"
              @tap="newCraving.intensity = i">
              <text>{{ i }}</text>
            </view>
          </view>
        </view>

        <!-- 触发因素 -->
        <view class="form-section">
          <text class="form-label">触发因素</text>
          <view class="trigger-grid">
            <view v-for="t in triggerOptions" :key="t.id"
              class="trigger-option" :class="{ active: newCraving.trigger === t.id }"
              @tap="newCraving.trigger = t.id">
              <text class="trigger-icon">{{ t.icon }}</text>
              <text class="trigger-name">{{ t.name }}</text>
            </view>
          </view>
        </view>

        <!-- 是否抵抗 -->
        <view class="form-section">
          <text class="form-label">是否抵抗</text>
          <view class="resist-toggle">
            <view class="resist-option" :class="{ active: newCraving.resisted }"
              @tap="newCraving.resisted = true">
              <text>✅ 成功抵抗</text>
            </view>
            <view class="resist-option" :class="{ active: !newCraving.resisted }"
              @tap="newCraving.resisted = false">
              <text>❌ 没忍住</text>
            </view>
          </view>
        </view>

        <!-- 备注 -->
        <view class="form-section">
          <text class="form-label">备注（可选）</text>
          <textarea class="form-textarea" v-model="newCraving.note"
            placeholder="记录当时的想法..." maxlength="100"></textarea>
          <text class="local-only-tip">仅保存在本机，不会上传或公开</text>
        </view>

        <view class="modal-actions">
          <button class="modal-btn cancel" @tap="closeCravingModal">取消</button>
          <button class="modal-btn confirm" @tap="saveCraving">保存</button>
        </view>
      </view>
    </view>

    <!-- 记录心情弹窗 -->
    <view class="modal-mask" v-if="showMoodModal" @tap="closeMoodModal">
      <view class="modal-card" @tap.stop>
        <text class="modal-title">记录心情</text>

        <!-- 情绪选择 -->
        <view class="form-section">
          <text class="form-label">现在感觉如何？</text>
          <view class="mood-picker">
            <view v-for="m in moodOptions" :key="m.id"
              class="mood-option" :class="{ active: newMood.mood === m.id }"
              @tap="newMood.mood = m.id">
              <text class="mood-option-emoji">{{ m.emoji }}</text>
              <text class="mood-option-name">{{ m.name }}</text>
            </view>
          </view>
        </view>

        <!-- 是否吸烟 -->
        <view class="form-section">
          <text class="form-label">现在吸烟了吗？</text>
          <view class="smoke-toggle">
            <view class="smoke-option" :class="{ active: newMood.smoked }"
              @tap="newMood.smoked = true">
              <text>🚬 正在吸烟</text>
            </view>
            <view class="smoke-option" :class="{ active: !newMood.smoked }"
              @tap="newMood.smoked = false">
              <text>🌿 没有吸烟</text>
            </view>
          </view>
        </view>

        <!-- 备注 -->
        <view class="form-section">
          <text class="form-label">想说什么？（可选）</text>
          <textarea class="form-textarea" v-model="newMood.note"
            placeholder="记录此刻的想法..." maxlength="200"></textarea>
          <text class="local-only-tip">仅保存在本机，不会上传或公开</text>
        </view>

        <view class="modal-actions">
          <button class="modal-btn cancel" @tap="closeMoodModal">取消</button>
          <button class="modal-btn confirm" @tap="saveMood">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import Store from '@/utils/store.js'
import AppNavbar from '@/components/app-navbar/app-navbar.vue'
import { themeClass } from '@/utils/theme.js'
import { guardContent } from '@/utils/content-check.js'

const TRIGGER_OPTIONS = [
  { id: 'stress', name: '压力大', icon: '😰' },
  { id: 'bored', name: '无聊', icon: '😐' },
  { id: 'social', name: '社交场合', icon: '🎉' },
  { id: 'afterMeal', name: '饭后', icon: '🍽️' },
  { id: 'wakeup', name: '起床', icon: '☀️' },
  { id: 'drinking', name: '喝酒', icon: '🍺' },
  { id: 'work', name: '工作疲劳', icon: '💼' },
  { id: 'emotion', name: '情绪波动', icon: '😔' }
]

const MOOD_OPTIONS = [
  { id: 'happy', name: '开心', emoji: '😊' },
  { id: 'calm', name: '平静', emoji: '😌' },
  { id: 'anxious', name: '焦虑', emoji: '😰' },
  { id: 'sad', name: '难过', emoji: '😢' },
  { id: 'angry', name: '生气', emoji: '😠' },
  { id: 'bored', name: '无聊', emoji: '😐' }
]

export default {
  components: { AppNavbar },
  data() {
    return {
      tab: 'craving',            // craving | mood

      // ---- 烟瘾 ----
      showCravingModal: false,
      todayCount: 0,
      avgIntensity: '0',
      resistedCount: 0,
      intensityDist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      topTriggers: [],
      recentCravings: [],
      triggerOptions: TRIGGER_OPTIONS,
      newCraving: {
        intensity: 3,
        trigger: '',
        resisted: true,
        note: ''
      },

      // ---- 心情 ----
      showMoodModal: false,
      moodDist: {},
      totalMoods: 0,
      smokingMoods: 0,
      nonSmokingMoods: 0,
      recentMoods: [],
      moodOptions: MOOD_OPTIONS,
      newMood: {
        mood: 'happy',
        smoked: false,
        note: ''
      }
    }
  },

  onShow() {
    // 两个 loader 各自读一遍 cravings / moods（同步 storage + JSON.parse），
    // 包进读缓存后同一份数据只解析一次
    Store.withReadCache(() => {
      this.loadCravingData()
      this.loadMoodData()
    })
  },

  methods: {
    switchTab(t) {
      this.tab = t
    },

    // ---------------- 烟瘾 ----------------
    loadCravingData() {
      const stats = Store.getCravingStats()
      const cravings = Store.getCravings()

      // 今日统计
      this.todayCount = stats.today

      // 平均强度
      const todayCravings = cravings.filter(c => {
        const d = new Date(c.timestamp)
        const today = new Date()
        return d.toDateString() === today.toDateString()
      })
      if (todayCravings.length > 0) {
        const totalIntensity = todayCravings.reduce((sum, c) => sum + (c.intensity || 0), 0)
        this.avgIntensity = (totalIntensity / todayCravings.length).toFixed(1)
      } else {
        this.avgIntensity = '0'
      }

      // 成功抵抗次数：这张卡片其它两项都是「今日」，这里原来却统计的是全部历史，
      // 口径不一致，改为今日（统一用本地日界）
      const todayStr = Store.todayStr()
      this.resistedCount = cravings.filter(c => {
        return c.resisted && Store.todayStr(c.timestamp) === todayStr
      }).length

      // 强度分布
      this.intensityDist = stats.intensityDist

      // 触发因素排名
      const triggerEntries = Object.entries(stats.triggers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
      const maxTrigger = triggerEntries.length > 0 ? triggerEntries[0][1] : 1
      this.topTriggers = triggerEntries.map(([id, count]) => {
        const trigger = TRIGGER_OPTIONS.find(t => t.id === id) || { name: id, icon: '📌' }
        return {
          id,
          name: trigger.name,
          icon: trigger.icon,
          count,
          percent: (count / maxTrigger) * 100
        }
      })

      // 最近记录
      this.recentCravings = cravings.slice(0, 10)
    },

    intensityPercent(level) {
      const max = Math.max(...Object.values(this.intensityDist), 1)
      return (this.intensityDist[level] / max) * 100
    },

    getTriggerName(id) {
      const trigger = TRIGGER_OPTIONS.find(t => t.id === id)
      return trigger ? trigger.name : id
    },

    formatDate(timestamp) {
      const d = new Date(timestamp)
      return `${d.getMonth() + 1}/${d.getDate()}`
    },

    formatTime(timestamp) {
      const d = new Date(timestamp)
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    },

    // 关弹窗复位表单，避免下次打开还留着上次填的内容
    closeCravingModal() {
      this.showCravingModal = false
      this.newCraving = { intensity: 3, trigger: '', resisted: true, note: '' }
    },

    saveCraving() {
      if (!this.newCraving.trigger) {
        uni.showToast({ title: '请选择触发因素', icon: 'none' })
        return
      }

      if (!guardContent(this.newCraving.note)) return

      Store.addCraving({
        intensity: this.newCraving.intensity,
        trigger: this.newCraving.trigger,
        resisted: this.newCraving.resisted,
        note: this.newCraving.note
      })

      // 重置表单
      this.newCraving = {
        intensity: 3,
        trigger: '',
        resisted: true,
        note: ''
      }
      this.showCravingModal = false

      uni.showToast({ title: '已记录', icon: 'success' })
      this.loadCravingData()
    },

    // ---------------- 心情 ----------------
    loadMoodData() {
      const stats = Store.getMoodStats()
      const moods = Store.getMoods()

      this.moodDist = stats.moodDist
      this.totalMoods = stats.total
      this.smokingMoods = stats.smokingMoods
      this.nonSmokingMoods = stats.nonSmokingMoods
      this.recentMoods = moods.slice(0, 15)
    },

    getMoodEmoji(moodId) {
      const mood = MOOD_OPTIONS.find(m => m.id === moodId)
      return mood ? mood.emoji : '😊'
    },

    getMoodName(moodId) {
      const mood = MOOD_OPTIONS.find(m => m.id === moodId)
      return mood ? mood.name : moodId
    },

    formatDateTime(timestamp) {
      const d = new Date(timestamp)
      const month = d.getMonth() + 1
      const day = d.getDate()
      const hour = String(d.getHours()).padStart(2, '0')
      const min = String(d.getMinutes()).padStart(2, '0')
      return `${month}月${day}日 ${hour}:${min}`
    },

    // 关闭弹窗时复位表单：原来只把开关置 false，
    // 下次打开还是上次的情绪和文字，容易误存重复记录
    closeMoodModal() {
      this.showMoodModal = false
      this.newMood = { mood: 'happy', smoked: false, note: '' }
    },

    saveMood() {
      // 用户自由输入的备注要过一遍合规检查
      if (!guardContent(this.newMood.note)) return
      Store.addMood({
        mood: this.newMood.mood,
        smoked: this.newMood.smoked,
        note: this.newMood.note
      })

      this.newMood = {
        mood: 'happy',
        smoked: false,
        note: ''
      }
      this.showMoodModal = false

      uni.showToast({ title: '已记录', icon: 'success' })
      this.loadMoodData()
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
  display: flex;
  flex-direction: column;
}

/* 统一滚动容器：flex 列里靠 height:0 + flex:1 拿到确定高度 */
.main-scroll {
  flex: 1;
  height: 0;
  min-height: 0;
}

/* 烟瘾 / 心情 切换 */
.tab-bar {
  display: flex;
  margin: 8rpx 40rpx 24rpx;
  padding: 6rpx;
  background: var(--surface-1);
  border: 1px solid var(--border);
  border-radius: 999rpx;
}

.tab-item {
  flex: 1;
  padding: 14rpx 0;
  text-align: center;
  border-radius: 999rpx;
  transition: background 0.2s ease;
}

.tab-text {
  font-size: 26rpx;
  color: var(--text-dim);
}

.tab-item.active {
  background: var(--primary);
}

.tab-item.active .tab-text {
  color: var(--bg);
  font-weight: 600;
}

/* 统计卡片 */
.stats-card {
  background: linear-gradient(135deg, var(--surface-1) 0%, var(--surface-2) 100%);
  border: 1px solid var(--border);
  border-radius: 32rpx;
  padding: 32rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 24rpx;
  display: block;
}

.stats-row {
  display: flex;
  justify-content: space-around;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: var(--primary);
}

.stat-label {
  display: block;
  font-size: 22rpx;
  color: var(--text-dim);
  margin-top: 8rpx;
}

/* 记录按钮 */
.record-btn {
  width: 100%;
  padding: 28rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-2) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  border: none;
  color: var(--bg);
}

.record-btn:active {
  transform: scale(0.97);
}

.record-btn-icon {
  font-size: 36rpx;
}

.record-btn-text {
  font-size: 32rpx;
  font-weight: 600;
}

/* 卡片 */
.card {
  background: linear-gradient(135deg, var(--surface-1) 0%, var(--surface-2) 100%);
  border: 1px solid var(--border);
  border-radius: 32rpx;
}

.p-20 { padding: 40rpx; }
.mx-20 { margin-left: 40rpx; margin-right: 40rpx; }
.mb-16 { margin-bottom: 32rpx; }
.block { display: block; }

/* 烟瘾模式 */
.pattern-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.pattern-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.pattern-info {
  display: flex;
  align-items: center;
  gap: 8rpx;
  width: 140rpx;
}

.pattern-icon {
  font-size: 28rpx;
}

.pattern-name {
  font-size: 24rpx;
  color: var(--text);
}

.pattern-bar-wrap {
  flex: 1;
  height: 20rpx;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 10rpx;
  overflow: hidden;
}

.pattern-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--primary) 0%, var(--danger-1) 100%);
  border-radius: 10rpx;
  transition: width 0.3s ease;
}

.pattern-count {
  font-size: 22rpx;
  color: var(--text-dim);
  width: 60rpx;
  text-align: right;
}

/* 强度分布 */
.intensity-chart {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 200rpx;
  padding: 0 16rpx;
}

.intensity-bar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  flex: 1;
}

.intensity-bar {
  width: 48rpx;
  min-height: 16rpx;
  border-radius: 8rpx 8rpx 0 0;
  position: relative;
  transition: height 0.3s ease;
}

.intensity-bar.level-1 { background: var(--primary); }
.intensity-bar.level-2 { background: #84cc16; }
.intensity-bar.level-3 { background: var(--primary); }
.intensity-bar.level-4 { background: var(--primary-2); }
.intensity-bar.level-5 { background: var(--danger-1); }

.intensity-value {
  position: absolute;
  top: -28rpx;
  left: 50%;
  transform: translateX(-50%);
  font-size: 20rpx;
  color: var(--text-dim);
}

.intensity-label {
  font-size: 22rpx;
  color: var(--text-dim);
}

/* 历史记录（两种记录共用列表骨架，标签各自命名避免打架） */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.history-item {
  display: flex;
  gap: 20rpx;
  padding: 16rpx;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16rpx;
}

.history-time {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 80rpx;
}

.history-date {
  font-size: 22rpx;
  color: var(--text-dim);
}

.history-hour {
  font-size: 24rpx;
  color: var(--primary);
  font-weight: 600;
}

.history-content {
  flex: 1;
}

.history-tags {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
  margin-bottom: 8rpx;
}

.history-tag {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-dim);
}

.history-tag.intensity {
  background: var(--glow);
  color: var(--primary);
}

.history-tag.trigger {
  background: rgba(96, 165, 250, 0.2);
  color: #60a5fa;
}

.history-tag.resisted {
  background: rgba(16, 185, 129, 0.2);
  color: var(--primary);
}

.history-note {
  font-size: 22rpx;
  color: var(--text-dim);
}

.empty-hint {
  text-align: center;
  padding: 32rpx;
  color: var(--text-dim);
  font-size: 24rpx;
}

/* ===== 心情 ===== */
.mood-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
}

.mood-stat {
  text-align: center;
  padding: 16rpx;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16rpx;
}

.mood-emoji {
  font-size: 64rpx;
  display: block;
  margin-bottom: 8rpx;
}

.mood-count {
  font-size: 32rpx;
  font-weight: bold;
  color: var(--primary);
  display: block;
}

.mood-name {
  font-size: 22rpx;
  color: var(--text-dim);
  display: block;
  margin-top: 4rpx;
}

.mood-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 40rpx 0;
}

.mood-empty-icon {
  font-size: 48rpx;
}

.mood-empty-text {
  font-size: 24rpx;
  color: var(--text-dim);
}

.insight-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.insight-item:last-child {
  margin-bottom: 0;
}

.insight-icon {
  font-size: 32rpx;
}

.insight-content {
  flex: 1;
}

.insight-text {
  font-size: 26rpx;
  color: var(--text);
}

.highlight {
  color: var(--primary);
  font-weight: bold;
}

.history-emoji {
  font-size: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 60rpx;
}

.history-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.history-mood {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--text);
}

.mood-tag {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  /* --danger-1 各主题都是 #ff6b6b，底色用同色系半透明保持一致 */
  background: rgba(255, 107, 107, 0.2);
  color: var(--danger-1);
}

.mood-tag.clean {
  background: var(--glow);
  color: var(--primary);
}

.mood-time {
  font-size: 22rpx;
  color: var(--text-dim);
}

/* 心情选择 */
.mood-picker {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
}

.mood-option {
  padding: 20rpx 8rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.04);
  border: 2rpx solid transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  transition: all 0.2s;
}

.mood-option.active {
  background: var(--glow);
  border-color: var(--primary);
}

.mood-option-emoji {
  font-size: 56rpx;
}

.mood-option-name {
  font-size: 22rpx;
  color: var(--text-dim);
}

.mood-option.active .mood-option-name {
  color: var(--primary);
}

.smoke-toggle {
  display: flex;
  gap: 16rpx;
}

.smoke-option {
  flex: 1;
  padding: 20rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.04);
  border: 2rpx solid transparent;
  text-align: center;
  transition: all 0.2s;
  font-size: 26rpx;
  color: var(--text-dim);
}

.smoke-option.active {
  background: var(--glow);
  border-color: var(--primary);
  color: var(--primary);
}

/* 弹窗 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-card {
  width: 85%;
  max-height: 80vh;
  background: var(--surface-1);
  border-radius: 32rpx;
  padding: 40rpx;
  overflow-y: auto;
}

.modal-title {
  font-size: 36rpx;
  font-weight: bold;
  color: var(--text);
  display: block;
  text-align: center;
  margin-bottom: 32rpx;
}

.form-section {
  margin-bottom: 28rpx;
}

.form-label {
  font-size: 26rpx;
  color: var(--text-dim);
  display: block;
  margin-bottom: 16rpx;
}

/* 强度选择 */
.intensity-picker {
  display: flex;
  gap: 12rpx;
  justify-content: center;
}

.intensity-option {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 2rpx solid transparent;
  font-size: 28rpx;
  font-weight: bold;
  color: var(--text-dim);
  transition: all 0.2s;
}

.intensity-option.active {
  transform: scale(1.1);
}

.intensity-option.level-1.active { background: rgba(16, 185, 129, 0.2); border-color: var(--primary); color: var(--primary); }
.intensity-option.level-2.active { background: rgba(132, 204, 22, 0.2); border-color: #84cc16; color: #84cc16; }
.intensity-option.level-3.active { background: var(--glow); border-color: var(--primary); color: var(--primary); }
.intensity-option.level-4.active { background: rgba(249, 115, 22, 0.2); border-color: var(--primary-2); color: var(--primary-2); }
.intensity-option.level-5.active { background: rgba(239, 68, 68, 0.2); border-color: var(--danger-1); color: var(--danger-1); }

/* 触发因素 */
.trigger-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
}

.trigger-option {
  padding: 16rpx 8rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.04);
  border: 2rpx solid transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  transition: all 0.2s;
}

.trigger-option.active {
  background: rgba(96, 165, 250, 0.15);
  border-color: rgba(96, 165, 250, 0.4);
}

.trigger-icon {
  font-size: 32rpx;
}

.trigger-name {
  font-size: 20rpx;
  color: var(--text-dim);
  text-align: center;
}

.trigger-option.active .trigger-name {
  color: #60a5fa;
}

/* 抵抗切换 */
.resist-toggle {
  display: flex;
  gap: 16rpx;
}

.resist-option {
  flex: 1;
  padding: 20rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.04);
  border: 2rpx solid transparent;
  text-align: center;
  transition: all 0.2s;
  font-size: 26rpx;
  color: var(--text-dim);
}

.resist-option.active {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.4);
  color: var(--primary);
}

/* 备注 */
.form-textarea {
  width: 100%;
  height: 120rpx;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16rpx;
  padding: 16rpx;
  color: var(--text);
  font-size: 26rpx;
  resize: none;
}

/* 弹窗按钮 */
.modal-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 32rpx;
}

.modal-btn {
  flex: 1;
  padding: 24rpx;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
}

.modal-btn.cancel {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-dim);
}

.modal-btn.confirm {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-2) 100%);
  color: var(--bg);
}

.modal-btn:active {
  transform: scale(0.97);
}

.local-only-tip {
  font-size: 20rpx;
  color: var(--text-dim);
  opacity: 0.7;
  display: block;
  margin-top: 12rpx;
}
</style>
