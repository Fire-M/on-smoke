<template>
  <view class="page-container" :class="themeClass()">
    <app-navbar title="呼吸引导" :custom-back="true" @back="goBack"></app-navbar>

    <view class="main-content">
      <!-- 呼吸圆圈 -->
      <view class="breath-circle-wrap">
        <view class="breath-circle" :class="breathState">
          <text class="breath-text">{{ breathText }}</text>
          <text class="breath-timer">{{ breathTimer }}s</text>
        </view>
      </view>

      <!-- 控制按钮 -->
      <view class="controls">
        <button v-if="!isRunning" class="start-btn" @click="startBreathing">
          <text>开始呼吸练习</text>
        </button>
        <button v-else class="stop-btn" @click="stopBreathing">
          <text>停止</text>
        </button>
      </view>

      <!-- 说明 -->
      <view class="info-card mx-20">
        <text class="info-title">4-7-8 呼吸法</text>
        <view class="info-steps">
          <view class="info-step">
            <text class="step-num">1</text>
            <text class="step-text">吸气 4 秒</text>
          </view>
          <view class="info-step">
            <text class="step-num">2</text>
            <text class="step-text">屏息 7 秒</text>
          </view>
          <view class="info-step">
            <text class="step-num">3</text>
            <text class="step-text">呼气 8 秒</text>
          </view>
        </view>
        <text class="info-desc">这种方法能帮助缓解烟瘾和焦虑，建议每天练习2-3次</text>
      </view>
    </view>
  </view>
</template>

<script>
import AppNavbar from '@/components/app-navbar/app-navbar.vue'
import { themeClass } from '@/utils/theme.js'

export default {
  components: { AppNavbar },
  data() {
    return {
      isRunning: false,
      breathState: 'idle',
      breathText: '准备开始',
      breathTimer: 0,
      timer: null,
      phase: 0
    }
  },

  methods: {
    startBreathing() {
      this.isRunning = true
      this.phase = 0
      this.runPhase()
    },

    stopBreathing() {
      this.isRunning = false
      this.breathState = 'idle'
      this.breathText = '准备开始'
      this.breathTimer = 0
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    },

    runPhase() {
      if (!this.isRunning) return

      const phases = [
        { state: 'inhale', text: '吸气', duration: 4 },
        { state: 'hold', text: '屏息', duration: 7 },
        { state: 'exhale', text: '呼气', duration: 8 }
      ]

      const currentPhase = phases[this.phase]
      this.breathState = currentPhase.state
      this.breathText = currentPhase.text
      this.breathTimer = currentPhase.duration

      this.timer = setInterval(() => {
        this.breathTimer--
        
        if (this.breathTimer <= 0) {
          clearInterval(this.timer)
          this.phase = (this.phase + 1) % 3
          this.runPhase()
        }
      }, 1000)
    },

    goBack() {
      this.stopBreathing()
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack()
      } else {
        uni.switchTab({ url: '/pages/index/index' })
      }
    }
  },

  onUnload() {
    this.stopBreathing()
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

.header {
  padding: 40rpx 28rpx 24rpx;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.back-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 50%;
  cursor: pointer;
}

.back-btn-placeholder {
  width: 64rpx;
  height: 64rpx;
}

.back-icon {
  font-size: 48rpx;
  color: #f3f4f6;
}

.page-title {
  font-size: 44rpx;
  font-weight: bold;
  color: #f3f4f6;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx 0;
}

.breath-circle-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 80rpx;
}

.breath-circle {
  width: 400rpx;
  height: 400rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.05) 100%);
  border: 4rpx solid rgba(139, 92, 246, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 1s ease;
}

.breath-circle.inhale {
  transform: scale(1.3);
  background: radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, rgba(16, 185, 129, 0.1) 100%);
  border-color: rgba(16, 185, 129, 0.5);
}

.breath-circle.hold {
  transform: scale(1.3);
  background: radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, rgba(245, 158, 11, 0.1) 100%);
  border-color: rgba(245, 158, 11, 0.5);
}

.breath-circle.exhale {
  transform: scale(1);
  background: radial-gradient(circle, rgba(96, 165, 250, 0.3) 0%, rgba(96, 165, 250, 0.1) 100%);
  border-color: rgba(96, 165, 250, 0.5);
}

.breath-text {
  font-size: 40rpx;
  font-weight: bold;
  color: #f3f4f6;
  margin-bottom: 16rpx;
}

.breath-timer {
  font-size: 64rpx;
  font-weight: bold;
  color: #8b5cf6;
}

.controls {
  margin-bottom: 80rpx;
}

.start-btn, .stop-btn {
  padding: 28rpx 64rpx;
  border-radius: 24rpx;
  font-size: 32rpx;
  font-weight: 600;
  border: none;
  color: white;
}

.start-btn {
  background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
}

.stop-btn {
  background: linear-gradient(135deg, #ef4444 0%, var(--primary-2) 100%);
}

.start-btn:active, .stop-btn:active {
  transform: scale(0.97);
}

.info-card {
  background: linear-gradient(135deg, var(--surface-1) 0%, var(--surface-2) 100%);
  border: 1px solid var(--border);
  border-radius: 32rpx;
  padding: 32rpx;
  width: calc(100% - 80rpx);
}

.info-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #f3f4f6;
  display: block;
  margin-bottom: 24rpx;
}

.info-steps {
  display: flex;
  justify-content: space-around;
  margin-bottom: 24rpx;
}

.info-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.step-num {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: rgba(139, 92, 246, 0.2);
  color: #8b5cf6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: bold;
}

.step-text {
  font-size: 24rpx;
  color: var(--text);
}

.info-desc {
  font-size: 24rpx;
  color: var(--text-dim);
  line-height: 1.6;
}

.mx-20 {
  margin-left: 40rpx;
  margin-right: 40rpx;
}
</style>
