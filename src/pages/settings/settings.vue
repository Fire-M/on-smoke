<template>
  <view class="page-container">
    <scroll-view scroll-y class="main-scroll">
      <view class="p-20 pb-100">
        <text class="page-title">设置</text>

        <!-- 每包价格 -->
        <view class="setting-row">
          <text class="text-sm text-gray-300">每包价格（元）</text>
          <input class="setting-input" type="digit" :value="settings.cigarettePrice"
            @input="onPriceInput" placeholder="25.0" />
        </view>

        <!-- 每包支数 -->
        <view class="setting-row">
          <text class="text-sm text-gray-300">每包支数</text>
          <input class="setting-input" type="number" :value="settings.packSize"
            @input="onPackSizeInput" placeholder="20" />
        </view>

        <!-- 每日配额 -->
        <view class="setting-row">
          <text class="text-sm text-gray-300">每日假抽配额</text>
          <view class="quota-control">
            <button class="quota-btn" @click="decreaseQuota">-</button>
            <text class="quota-value">{{ settings.dailyQuota }}</text>
            <button class="quota-btn" @click="increaseQuota">+</button>
          </view>
        </view>

        <!-- 冷却时间 -->
        <view class="setting-row">
          <text class="text-sm text-gray-300">冷却时间（分钟）</text>
          <input class="setting-input" type="number" :value="settings.cooldownMinutes"
            @input="onCooldownInput" placeholder="5" />
        </view>

        <!-- 开始日期 -->
        <view class="setting-row">
          <text class="text-sm text-gray-300">戒烟开始日期</text>
          <picker mode="date" :value="startDateStr" @change="onDateChange">
            <view class="setting-input date-picker">
              <text class="text-gray-300">{{ startDateStr }}</text>
              <text class="text-gray-600">›</text>
            </view>
          </picker>
        </view>

        <!-- 保存按钮 -->
        <button class="save-btn" @click="saveSettings">保存设置</button>

        <!-- 关于 -->
        <view class="about-section">
          <text class="text-xs text-gray-600 text-center block">就抽一根 v1.0</text>
          <text class="text-xs text-gray-700 text-center block mt-4">虚构香烟 · 假装戒烟 · 纯属娱乐</text>
        </view>
      </view>
    </scroll-view>
    <custom-tabbar :current="3"></custom-tabbar>
  </view>
</template>

<script>
import Store from '@/utils/store.js'
import CustomTabbar from '@/components/custom-tabbar/custom-tabbar.vue'

export default {
  components: { CustomTabbar },
  data() {
    return {
      settings: {
        cigarettePrice: 25,
        packSize: 20,
        dailyQuota: 5,
        cooldownMinutes: 5,
        quitDate: new Date().toISOString().split('T')[0]
      }
    }
  },

  computed: {
    startDateStr() {
      return this.settings.quitDate || new Date().toISOString().split('T')[0]
    }
  },

  onLoad() {
    this.settings = Store.getSettings()
  },

  methods: {
    onPriceInput(e) {
      this.settings.cigarettePrice = parseFloat(e.detail.value) || 25
    },

    onPackSizeInput(e) {
      this.settings.packSize = parseInt(e.detail.value) || 20
    },

    onCooldownInput(e) {
      this.settings.cooldownMinutes = parseInt(e.detail.value) || 5
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
      Store.saveSettings(this.settings)
      uni.showToast({ title: '已保存', icon: 'success' })
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
}

.main-scroll {
  height: 100%;
}

.page-title {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  text-align: center;
  color: #f3f4f6;
  margin-bottom: 48rpx;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background-color: #1f1f1f;
  border: 1px solid #2a2a2a;
  border-radius: 24rpx;
  margin-bottom: 16rpx;
}

.setting-input {
  width: 200rpx;
  padding: 12rpx 16rpx;
  background-color: #0f0f0f;
  border: 1px solid #2a2a2a;
  border-radius: 16rpx;
  color: #e5e7eb;
  font-size: 28rpx;
  text-align: right;
}

.date-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8rpx;
}

.quota-control {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.quota-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background-color: #2a2a2a;
  color: #e5e7eb;
  font-size: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  padding: 0;
}

.quota-value {
  font-size: 32rpx;
  font-weight: bold;
  color: #f59e0b;
  min-width: 48rpx;
  text-align: center;
}

.save-btn {
  width: 100%;
  padding: 28rpx;
  border-radius: 24rpx;
  background: linear-gradient(to right, #f59e0b, #f97316);
  color: #0f0f0f;
  font-weight: bold;
  font-size: 32rpx;
  margin-top: 48rpx;
  border: none;
}

.about-section {
  margin-top: 64rpx;
}

.p-20 { padding: 40rpx; }
.pb-100 { padding-bottom: 200rpx; }
.mb-4 { margin-bottom: 32rpx; }
.mt-4 { margin-top: 8rpx; }
.text-xs { font-size: 24rpx; }
.text-sm { font-size: 28rpx; }
.font-bold { font-weight: bold; }
.block { display: block; }
.text-center { text-align: center; }
.text-gray-300 { color: #d1d5db; }
.text-gray-600 { color: #4b5563; }
.text-gray-700 { color: #374151; }
</style>
