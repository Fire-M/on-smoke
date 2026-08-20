<template>
  <view class="app-navbar" :style="navStyle">
    <view class="app-navbar__row" :style="rowStyle">
      <view class="app-navbar__back" v-if="back" @click="onBack">
        <text class="app-navbar__back-icon">‹</text>
      </view>
      <view class="app-navbar__title" :style="titleStyle">
        <text class="app-navbar__title-text">{{ title }}</text>
      </view>
      <view class="app-navbar__right" :style="rightStyle"></view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'AppNavbar',
  props: {
    title: { type: String, default: '' },
    // 'auto' 按页面栈自动判断是否显示返回；也可直接传 true / false
    showBack: { type: [Boolean, String], default: 'auto' },
    // 为 true 时，点击返回只触发 back 事件，由页面自行处理（用于需要附带清理逻辑的页面）
    customBack: { type: Boolean, default: false }
  },
  data() {
    return {
      statusBarHeight: 20,
      navBarHeight: 44,
      capsuleWidth: 87,
      capsuleLeft: 0
    }
  },
  computed: {
    back() {
      if (this.showBack === 'auto') {
        const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
        return pages.length > 1
      }
      return !!this.showBack
    },
    navStyle() {
      return {
        paddingTop: this.statusBarHeight + 'px',
        height: (this.statusBarHeight + this.navBarHeight) + 'px'
      }
    },
    rowStyle() {
      return { height: this.navBarHeight + 'px' }
    },
    titleStyle() {
      // 标题在「返回按钮」与右侧占位（胶囊宽度）之间居中，避免与胶囊重叠
      return {}
    },
    rightStyle() {
      return { width: this.capsuleWidth + 'px' }
    }
  },
  methods: {
    onBack() {
      if (this.customBack) {
        this.$emit('back')
        return
      }
      const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
      if (pages.length > 1) {
        uni.navigateBack()
      } else {
        uni.switchTab({ url: '/pages/index/index' })
      }
    },
    initMetrics() {
      let statusBar = 20
      let menu = null
      try {
        const sys = uni.getSystemInfoSync()
        statusBar = sys.statusBarHeight || 20
        // 仅微信小程序有胶囊按钮，可获取精确位置用于对齐
        // #ifdef MP-WEIXIN
        menu = uni.getMenuButtonBoundingClientRect()
        // #endif
      } catch (e) {}
      if (menu && menu.height) {
        const gap = menu.top - statusBar
        this.statusBarHeight = statusBar
        this.navBarHeight = gap * 2 + menu.height
        this.capsuleWidth = menu.width
        this.capsuleLeft = menu.left
        this.screenRight = sysSafeRight()
      } else {
        // H5 / App / 非微信：无胶囊，使用默认导航高度
        this.statusBarHeight = statusBar || 20
        this.navBarHeight = 44
        this.capsuleWidth = 0
        this.capsuleLeft = 0
      }
    }
  },
  created() {
    this.screenRight = 0
    this.initMetrics()
  }
}

function sysSafeRight() {
  try {
    const sys = uni.getSystemInfoSync()
    return sys.windowWidth || 375
  } catch (e) {
    return 375
  }
}
</script>

<style scoped>
.app-navbar {
  width: 100%;
  background-color: var(--bg);
  box-sizing: border-box;
  flex-shrink: 0;
  position: relative;
  z-index: 100;
}
.app-navbar__row {
  display: flex;
  align-items: center;
  position: relative;
  padding: 0 16rpx;
  box-sizing: border-box;
}
.app-navbar__back {
  width: 64rpx;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
}
.app-navbar__back-icon {
  font-size: 56rpx;
  color: #e5e7eb;
  line-height: 1;
}
.app-navbar__title {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 90rpx;
  box-sizing: border-box;
  overflow: hidden;
  pointer-events: none;
  z-index: 1;
}
.app-navbar__title-text {
  font-size: 34rpx;
  font-weight: 600;
  color: #f3f4f6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.app-navbar__right {
  flex-shrink: 0;
}
</style>
