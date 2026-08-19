<template>
  <view class="page-container">
    <app-navbar title="我的宠物"></app-navbar>
    <scroll-view scroll-y class="main-scroll">
      <view class="pet-card mx-20 mb-16">
        <!-- Canvas 宠物 -->
        <pet-canvas :accessories="equippedAccessories" :mood="petMood"></pet-canvas>
        
        <text class="pet-name">{{ pet.name }}</text>
        <text class="pet-level">Lv.{{ pet.level }}</text>
        <view class="stat-row">
          <text class="stat-label">健康</text>
          <view class="stat-bar"><view class="stat-fill health" :style="{ width: pet.health + '%' }"></view></view>
          <text class="stat-value">{{ pet.health }}%</text>
        </view>
        <view class="stat-row">
          <text class="stat-label">快乐</text>
          <view class="stat-bar"><view class="stat-fill happy" :style="{ width: pet.happiness + '%' }"></view></view>
          <text class="stat-value">{{ pet.happiness }}%</text>
        </view>
        <view class="stat-row">
          <text class="stat-label">经验</text>
          <view class="stat-bar"><view class="stat-fill exp" :style="{ width: expPercent + '%' }"></view></view>
          <text class="stat-value">{{ pet.exp }}/{{ pet.level * 100 }}</text>
        </view>
        
        <!-- 装扮按钮 -->
        <view class="dress-btn" @click="showAccessoryPanel = true">
          <text class="dress-btn-icon">👗</text>
          <text class="dress-btn-text">装扮</text>
        </view>
      </view>
      
      <view class="mx-20 mb-16">
        <text class="tip">💡 不吸烟时宠物会更健康快乐哦！</text>
      </view>
      
      <!-- 看广告加速 -->
      <view class="mx-20 mb-16">
        <view class="ad-action-btn" @click="watchAdForPet">
          <text class="ad-action-icon">🎬</text>
          <view class="ad-action-text">
            <text class="ad-action-title">看广告加速升级</text>
            <text class="ad-action-desc">获得 +50 经验 + 10 快乐值</text>
          </view>
        </view>
      </view>
      
      <view style="height: 80rpx;"></view>
    </scroll-view>
    
    <!-- 装扮面板 -->
    <view class="custom-mask" :class="{ show: showAccessoryPanel }" v-if="showAccessoryPanel" @click="showAccessoryPanel = false">
      <view class="custom-panel" :class="{ show: showAccessoryPanel }" @click.stop>
        <view class="custom-header">
          <text class="custom-title">🐱 宠物装扮</text>
          <view class="custom-close" @click="showAccessoryPanel = false"><text>✕</text></view>
        </view>
        <view class="custom-tabs">
          <view class="custom-tab" :class="{ active: accessoryTab === 'head' }" @click="accessoryTab = 'head'">
            <text>👑 头部</text>
          </view>
          <view class="custom-tab" :class="{ active: accessoryTab === 'eyes' }" @click="accessoryTab = 'eyes'">
            <text>👓 眼睛</text>
          </view>
          <view class="custom-tab" :class="{ active: accessoryTab === 'neck' }" @click="accessoryTab = 'neck'">
            <text>🎀 颈部</text>
          </view>
        </view>
        <scroll-view scroll-y class="custom-body">
          <view class="custom-grid">
            <view class="custom-item" v-for="item in currentAccessoryList" :key="item.id"
              :class="{ locked: !item.unlocked, selected: item.equipped }"
              @click="onAccessoryTap(item)">
              <text class="custom-item-emoji">{{ item.unlocked ? item.icon : '🔒' }}</text>
              <text class="custom-item-name">{{ item.name }}</text>
              <view class="custom-item-ad" v-if="!item.unlocked">
                <text>🎬 看广告解锁</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
    
    <!-- 广告解锁弹窗 -->
    <view class="ad-modal-mask" :class="{ show: showAdModal }" v-if="showAdModal" @click="showAdModal = false">
      <view class="ad-modal-card" @click.stop>
        <view class="ad-modal-icon-wrap">
          <text class="ad-modal-emoji">{{ adModalIcon }}</text>
        </view>
        <text class="ad-modal-title">{{ adModalTitle }}</text>
        <text class="ad-modal-desc">观看广告即可解锁「{{ adModalName }}」</text>
        <view class="ad-modal-btns">
          <view class="ad-btn-confirm" @click="confirmAdUnlock">
            <text class="ad-btn-confirm-text">🎬 看广告解锁</text>
          </view>
          <view class="ad-btn-cancel" @click="showAdModal = false">
            <text class="ad-btn-cancel-text">取消</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import Store from '@/utils/store.js'
import { showRewardedAd } from '@/utils/ad-manager.js'
import PetCanvas from '@/components/PetCanvas.vue'
import AppNavbar from '@/components/app-navbar/app-navbar.vue'

export default {
  components: { PetCanvas, AppNavbar },
  data() { 
    return { 
      pet: { name: '小烟', health: 100, happiness: 100, level: 1, exp: 0 },
      showAccessoryPanel: false,
      accessoryTab: 'head',
      accessoryList: [],
      equippedAccessories: {},
      showAdModal: false,
      adModalTarget: null,
      adModalIcon: '',
      adModalTitle: '',
      adModalName: ''
    } 
  },
  computed: { 
    expPercent() { return (this.pet.exp / (this.pet.level * 100)) * 100 },
    petMood() {
      if (this.pet.happiness >= 80) return 'happy'
      if (this.pet.happiness < 30) return 'sad'
      return 'normal'
    },
    currentAccessoryList() {
      return this.accessoryList.filter(item => item.slot === this.accessoryTab)
    }
  },
  onShow() { 
    this.pet = Store.getPet()
    this.accessoryList = Store.getPetAccessoryList()
    this.equippedAccessories = Store.getEquippedAccessories()
  },
  methods: {
    watchAdForPet() {
      showRewardedAd('pet_accel').then(success => {
        if (success) {
          this.pet = Store.petAccelerate()
          uni.showToast({ title: '🎉 宠物获得加速！', icon: 'none' })
        }
      })
    },
    onAccessoryTap(item) {
      if (!item.unlocked) {
        // 看广告解锁
        this.adModalTarget = item
        this.adModalIcon = item.icon
        this.adModalTitle = '🎁 解锁装扮'
        this.adModalName = item.name
        this.showAdModal = true
        return
      }
      
      // 装备/卸下
      if (item.equipped) {
        Store.unequipPetAccessory(item.slot)
        uni.showToast({ title: '已卸下', icon: 'none' })
      } else {
        Store.equipPetAccessory(item.id)
        uni.showToast({ title: '已装备', icon: 'none' })
      }
      
      this.accessoryList = Store.getPetAccessoryList()
      this.equippedAccessories = Store.getEquippedAccessories()
    },
    confirmAdUnlock() {
      const target = this.adModalTarget
      this.showAdModal = false
      
      showRewardedAd('pet_accessory').then(ok => {
        if (ok) {
          const result = Store.unlockPetAccessory(target.id)
          if (result.success) {
            uni.showToast({ title: `解锁成功！${target.icon}`, icon: 'none' })
            this.accessoryList = Store.getPetAccessoryList()
          }
        }
      })
    }
  }
}
</script>

<style>
.page-container { height: 100vh; width: 100vw; background-color: #0f0f0f; color: #e5e7eb; display: flex; flex-direction: column; }
.header { padding: 40rpx 28rpx 24rpx; }
.header-row { display: flex; align-items: center; justify-content: space-between; }
.back-btn { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.06); border-radius: 50%; }
.back-btn-placeholder { width: 64rpx; height: 64rpx; }
.back-icon { font-size: 48rpx; color: #f3f4f6; }
.page-title { font-size: 44rpx; font-weight: bold; color: #f3f4f6; }
.main-scroll { flex: 1; height: 100%; }
.mx-20 { margin-left: 40rpx; margin-right: 40rpx; }
.mb-16 { margin-bottom: 32rpx; }
.pet-card { background: linear-gradient(135deg, #1f1f1f 0%, #252525 100%); border: 1px solid #2a2a2a; border-radius: 32rpx; padding: 40rpx; text-align: center; }
.pet-name { font-size: 40rpx; font-weight: bold; color: #f3f4f6; display: block; margin-bottom: 8rpx; }
.pet-level { font-size: 28rpx; color: #f59e0b; display: block; margin-bottom: 32rpx; }
.stat-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx; }
.stat-label { font-size: 24rpx; color: #9ca3af; width: 60rpx; }
.stat-bar { flex: 1; height: 16rpx; background: rgba(255, 255, 255, 0.06); border-radius: 12rpx; overflow: hidden; }
.stat-fill { height: 100%; border-radius: 12rpx; transition: width 0.3s ease; }
.stat-fill.health { background: linear-gradient(90deg, #10b981 0%, #059669 100%); }
.stat-fill.happy { background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%); }
.stat-fill.exp { background: linear-gradient(90deg, #8b5cf6 0%, #ec4899 100%); }
.stat-value { font-size: 22rpx; color: #6b7280; width: 100rpx; text-align: right; }
.tip { font-size: 24rpx; color: #6b7280; text-align: center; display: block; }

/* 装扮按钮 */
.dress-btn {
  margin-top: 32rpx;
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 40rpx;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(249, 115, 22, 0.1) 100%);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 40rpx;
}
.dress-btn:active {
  opacity: 0.7;
  transform: scale(0.95);
}
.dress-btn-icon {
  font-size: 36rpx;
}
.dress-btn-text {
  font-size: 28rpx;
  color: #f59e0b;
  font-weight: 600;
}

/* 看广告加速按钮 */
.ad-action-btn {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 28rpx 32rpx;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(236, 72, 153, 0.08) 100%);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 24rpx;
}
.ad-action-btn:active {
  opacity: 0.7;
  transform: scale(0.97);
}
.ad-action-icon {
  font-size: 48rpx;
}
.ad-action-text {
  flex: 1;
}
.ad-action-title {
  display: block;
  font-size: 28rpx;
  color: #a78bfa;
  font-weight: 600;
}
.ad-action-desc {
  display: block;
  font-size: 22rpx;
  color: #6b7280;
  margin-top: 4rpx;
}

/* 装扮面板样式 */
.custom-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
}
.custom-mask.show {
  opacity: 1;
  pointer-events: auto;
}
.custom-panel {
  width: 100%;
  max-height: 70vh;
  background: #1a1a1a;
  border-radius: 32rpx 32rpx 0 0;
  transform: translateY(100%);
  transition: transform 0.3s;
  display: flex;
  flex-direction: column;
}
.custom-panel.show {
  transform: translateY(0);
}
.custom-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 1px solid #2a2a2a;
}
.custom-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #f3f4f6;
}
.custom-close {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 50%;
  font-size: 32rpx;
  color: #9ca3af;
}
.custom-tabs {
  display: flex;
  padding: 16rpx 32rpx;
  gap: 16rpx;
  border-bottom: 1px solid #2a2a2a;
}
.custom-tab {
  flex: 1;
  padding: 16rpx;
  text-align: center;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.04);
  font-size: 26rpx;
  color: #9ca3af;
}
.custom-tab.active {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}
.custom-body {
  flex: 1;
  padding: 24rpx;
  max-height: 50vh;
}
.custom-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}
.custom-item {
  background: #252525;
  border: 1px solid #2a2a2a;
  border-radius: 16rpx;
  padding: 20rpx;
  text-align: center;
  position: relative;
}
.custom-item.selected {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
}
.custom-item.locked {
  opacity: 0.6;
}
.custom-item-emoji {
  font-size: 48rpx;
  display: block;
  margin-bottom: 8rpx;
}
.custom-item-name {
  font-size: 22rpx;
  color: #d1d5db;
  display: block;
}
.custom-item-ad {
  margin-top: 8rpx;
  font-size: 18rpx;
  color: #f59e0b;
}

/* 广告弹窗 */
.ad-modal-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.65);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s;
}
.ad-modal-mask.show {
  opacity: 1;
  pointer-events: auto;
}
.ad-modal-card {
  width: 560rpx;
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 28rpx;
  padding: 48rpx 36rpx 36rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: scale(0.9);
  transition: transform 0.25s;
}
.ad-modal-mask.show .ad-modal-card {
  transform: scale(1);
}
.ad-modal-icon-wrap {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
}
.ad-modal-emoji {
  font-size: 64rpx;
}
.ad-modal-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #f3f4f6;
  margin-bottom: 10rpx;
}
.ad-modal-desc {
  font-size: 24rpx;
  color: #9ca3af;
  text-align: center;
  margin-bottom: 40rpx;
}
.ad-modal-btns {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.ad-btn-confirm {
  width: 100%;
  height: 84rpx;
  border-radius: 42rpx;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ad-btn-confirm:active {
  opacity: 0.85;
  transform: scale(0.98);
}
.ad-btn-confirm-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
}
.ad-btn-cancel {
  width: 100%;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ad-btn-cancel:active {
  opacity: 0.6;
}
.ad-btn-cancel-text {
  font-size: 26rpx;
  color: #6b7280;
}
</style>
