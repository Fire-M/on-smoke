<template>
  <view class="page-container" :class="themeClass()">
    <app-navbar title="省钱目标"></app-navbar>
    <scroll-view scroll-y class="main-scroll">
      <view class="mx-20 mb-16">
        <view class="card p-20">
          <text class="card-title">当前已省</text>
          <text class="saved-amount">¥{{ savedMoney }}</text>
          <!-- 没设过目标就不画进度条，别用一个凭空的 ¥1000 假装存在目标 -->
          <template v-if="hasGoal">
            <view class="progress-bar"><view class="progress-fill" :style="{ width: progress + '%' }"></view></view>
            <text class="progress-text">目标{{ goalName ? '：' + goalName : '' }} ¥{{ goalAmount }} · 还差 ¥{{ goalRemain }}</text>
          </template>
          <text class="progress-text" v-else>还没设目标，点下面的按钮定一个</text>
        </view>
      </view>
      <view class="mx-20 mb-16">
        <button class="set-goal-btn" @click="showSetGoal = true">设置新目标</button>
      </view>

      <!-- 历史目标 -->
      <view class="mx-20 mb-16" v-if="goals.length > 1">
        <view class="card p-20">
          <text class="card-title">历史目标</text>
          <view v-for="(g, idx) in goals.slice(0, -1).reverse()" :key="idx" class="goal-item">
            <text class="goal-name">{{ g.name || '未命名目标' }}</text>
            <text class="goal-amount">¥{{ g.target }}</text>
          </view>
        </view>
      </view>

      <view style="height: 80rpx;"></view>
    </scroll-view>

    <!-- 设置目标弹窗 -->
    <view class="modal-mask" v-if="showSetGoal" @click="showSetGoal = false">
      <view class="modal-card" @click.stop>
        <text class="modal-title">设置省钱目标</text>
        <view class="form-section">
          <text class="form-label">目标名称</text>
          <input class="modal-input" v-model="newGoal.name" placeholder="例如：买一双球鞋" maxlength="20" />
        </view>
        <view class="form-section">
          <text class="form-label">目标金额（元）</text>
          <input class="modal-input" type="digit" v-model="newGoal.target" placeholder="1000" />
        </view>
        <view class="modal-actions">
          <button class="modal-btn cancel" @click="showSetGoal = false">取消</button>
          <button class="modal-btn confirm" @click="saveGoal">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import Store from '@/utils/store.js'
import AppNavbar from '@/components/app-navbar/app-navbar.vue'
import { themeClass } from '@/utils/theme.js'
export default {
  components: { AppNavbar },
  data() {
    return {
      savedMoney: '0',
      goalAmount: 1000,
      goalName: '',
      goalRemain: 0,
      hasGoal: false,     // 是否真的设过目标（无目标时不显示进度条）
      progress: 0,
      goals: [],
      showSetGoal: false,
      newGoal: { name: '', target: '1000' }
    }
  },
  onShow() {
    Store.settleDailySavings()
    const saved = Store.getSavedMoney()
    this.savedMoney = saved.toFixed(1)
    this.goals = Store.getSavingsGoals()
    if (this.goals.length > 0) {
      const last = this.goals[this.goals.length - 1]
      this.hasGoal = true
      this.goalAmount = last.target
      this.goalName = last.name || ''
      // 进度从「目标创建时已省的钱」算起，否则累计已省的钱会让新目标一诞生就 100%。
      // 老目标没有 baseline 字段，按 0 处理（即原来的算法），无法追溯。
      const baseline = Number(last.baseline) || 0
      const delta = Math.max(0, saved - baseline)
      this.goalRemain = Math.max(0, this.goalAmount - delta)
      this.progress = this.goalAmount > 0 ? Math.min(100, (delta / this.goalAmount) * 100) : 0
    } else {
      this.hasGoal = false
      this.progress = 0
      this.goalRemain = 0
    }
  },
  methods: {
    saveGoal() {
      const target = parseFloat(this.newGoal.target)
      if (!target || target <= 0) {
        uni.showToast({ title: '请输入有效金额', icon: 'none' })
        return
      }
      Store.addSavingsGoal({
        name: (this.newGoal.name || '').trim() || '省钱目标',
        target: target,
        // 记下创建时已省的钱，进度按「从现在起再省多少」算
        baseline: Store.getSavedMoney()
      })
      this.showSetGoal = false
      this.newGoal = { name: '', target: '1000' }
      // 重新加载
      this.onShow()
      uni.showToast({ title: '目标已保存', icon: 'success' })
    }
  }
}
</script>

<style>
.page-container { height: 100vh; width: 100vw; background-color: var(--bg); color: var(--text); display: flex; flex-direction: column; }
.header { padding: 40rpx 28rpx 24rpx; }
.header-row { display: flex; align-items: center; justify-content: space-between; }
.back-btn { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.06); border-radius: 50%; }
.back-btn-placeholder { width: 64rpx; height: 64rpx; }
.back-icon { font-size: 48rpx; color: #f3f4f6; }
.page-title { font-size: 44rpx; font-weight: bold; color: #f3f4f6; }
.main-scroll { flex: 1; height: 100%; }
.card { background: linear-gradient(135deg, var(--surface-1) 0%, var(--surface-2) 100%); border: 1px solid var(--border); border-radius: 32rpx; }
.p-20 { padding: 40rpx; }
.mx-20 { margin-left: 40rpx; margin-right: 40rpx; }
.mb-16 { margin-bottom: 32rpx; }
.card-title { font-size: 28rpx; color: var(--text-dim); display: block; margin-bottom: 16rpx; }
.saved-amount { font-size: 72rpx; font-weight: bold; color: #10b981; display: block; margin-bottom: 24rpx; }
.progress-bar { height: 16rpx; background: rgba(255, 255, 255, 0.06); border-radius: 12rpx; overflow: hidden; margin-bottom: 12rpx; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #10b981 0%, #059669 100%); border-radius: 12rpx; transition: width 0.3s ease; }
.progress-text { font-size: 24rpx; color: var(--text-dim); }
.set-goal-btn { width: 100%; padding: 28rpx; border-radius: 24rpx; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; font-size: 32rpx; font-weight: 600; border: none; }

/* 历史目标 */
.goal-item { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
.goal-item:last-child { border-bottom: none; }
.goal-name { font-size: 26rpx; color: var(--text); }
.goal-amount { font-size: 26rpx; color: var(--text-dim); }

/* 弹窗 */
.modal-mask { position: fixed; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 40rpx; }
.modal-card { width: 100%; background-color: var(--surface-2); border: 1px solid var(--border); border-radius: 32rpx; padding: 40rpx; }
.modal-title { font-size: 32rpx; font-weight: 700; color: var(--text); display: block; margin-bottom: 32rpx; text-align: center; }
.form-section { margin-bottom: 28rpx; }
.form-label { font-size: 26rpx; color: var(--text-dim); display: block; margin-bottom: 12rpx; }
.modal-input { width: 100%; background-color: var(--surface-1); border: 1px solid var(--border); border-radius: 12rpx; padding: 16rpx 20rpx; color: var(--text); font-size: 28rpx; }
.modal-actions { display: flex; gap: 20rpx; margin-top: 32rpx; }
.modal-btn { flex: 1; padding: 24rpx; border-radius: 16rpx; font-size: 28rpx; font-weight: 600; border: none; }
.modal-btn.cancel { background-color: var(--surface-1); color: var(--text-dim); }
.modal-btn.confirm { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; }
</style>
