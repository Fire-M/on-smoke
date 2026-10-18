<template>
    <view class="page-container" :class="themeClass()">
    <app-navbar title="时间胶囊"></app-navbar>
    <scroll-view scroll-y class="main-scroll">
      <view class="mx-20 mb-16">
        <button class="write-btn" @click="showWrite = true">✍️ 写信给未来的自己</button>
      </view>
      <view class="card mx-20 p-20">
        <text class="card-title">我的时间胶囊</text>
        <view v-if="capsules.length === 0" class="empty">还没有时间胶囊</view>
        <view v-for="(c, idx) in capsules" :key="idx" class="capsule-item">
          <text class="capsule-date">{{ formatDate(c.createdAt) }}</text>
          <text class="capsule-content">{{ c.content }}</text>
        </view>
      </view>
      <view style="height: 80rpx;"></view>
    </scroll-view>

    <!-- 写信弹窗 -->
    <view class="modal-mask" v-if="showWrite" @click="showWrite = false">
      <view class="modal-card" @click.stop>
        <text class="modal-title">✍️ 写给未来的自己</text>
        <textarea class="modal-textarea" v-model="newContent"
          placeholder="想对未来的自己说点什么..." maxlength="300" />
        <text class="modal-counter">{{ newContent.length }}/300</text>
        <view class="modal-actions">
          <button class="modal-btn cancel" @click="showWrite = false">取消</button>
          <button class="modal-btn confirm" @click="saveCapsule">封存</button>
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
  data() { return { capsules: [], showWrite: false, newContent: '' } },
  onShow() { this.capsules = Store.getTimeCapsules() },
  methods: {
    saveCapsule() {
      const content = (this.newContent || '').trim()
      if (!content) {
        uni.showToast({ title: '写点什么再封存吧', icon: 'none' })
        return
      }
      Store.addTimeCapsule({ content: content })
      this.newContent = ''
      this.showWrite = false
      this.capsules = Store.getTimeCapsules()
      uni.showToast({ title: '已封存 🎉', icon: 'success' })
    },
    formatDate(ts) { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}` }
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
.mx-20 { margin-left: 40rpx; margin-right: 40rpx; }
.mb-16 { margin-bottom: 32rpx; }
.write-btn { width: 100%; padding: 28rpx; border-radius: 24rpx; background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); color: white; font-size: 32rpx; font-weight: 600; border: none; }
.card { background: linear-gradient(135deg, var(--surface-1) 0%, var(--surface-2) 100%); border: 1px solid var(--border); border-radius: 32rpx; }
.p-20 { padding: 40rpx; }
.card-title { font-size: 30rpx; font-weight: 600; color: #f3f4f6; display: block; margin-bottom: 24rpx; }
.empty { text-align: center; padding: 40rpx; color: var(--text-dim); font-size: 26rpx; }
.capsule-item { padding: 20rpx; background: rgba(255, 255, 255, 0.03); border-radius: 16rpx; margin-bottom: 16rpx; }
.capsule-date { font-size: 22rpx; color: var(--text-dim); display: block; margin-bottom: 8rpx; }
.capsule-content { font-size: 26rpx; color: var(--text); }

/* 写信弹窗 */
.modal-mask { position: fixed; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 40rpx; }
.modal-card { width: 100%; background-color: var(--surface-2); border: 1px solid var(--border); border-radius: 32rpx; padding: 40rpx; }
.modal-title { font-size: 32rpx; font-weight: 700; color: var(--text); display: block; margin-bottom: 28rpx; text-align: center; }
.modal-textarea { width: 100%; height: 240rpx; background-color: var(--surface-1); border: 1px solid var(--border); border-radius: 16rpx; padding: 20rpx; color: var(--text); font-size: 28rpx; }
.modal-counter { font-size: 22rpx; color: var(--text-dim); display: block; text-align: right; margin-top: 8rpx; }
.modal-actions { display: flex; gap: 20rpx; margin-top: 28rpx; }
.modal-btn { flex: 1; padding: 24rpx; border-radius: 16rpx; font-size: 28rpx; font-weight: 600; border: none; }
.modal-btn.cancel { background-color: var(--surface-1); color: var(--text-dim); }
.modal-btn.confirm { background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); color: white; }
</style>
