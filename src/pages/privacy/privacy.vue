<template>
  <view class="page-container" :class="themeClass()">
    <app-navbar title="隐私政策与用户协议"></app-navbar>
    <scroll-view scroll-y class="main-scroll">
      <view class="p-20 pb-100">
        <text class="section-title block">一、我们收集什么</text>
        <text class="para">
          本应用是一款本地化的模拟戒烟记录工具。你在应用内填写的所有内容（抽烟记录、情绪日记、时间胶囊、烟瘾记录、省钱目标、宠物与设置等）
          <text class="strong">仅保存在你本机设备的本地存储中</text>
          ，我们不会上传、不会同步到服务器，也没有后台账号体系。
        </text>

        <text class="section-title block mt">二、我们不收集什么</text>
        <text class="para">
          我们不会获取你的手机号、微信号、通讯录、相册、位置等任何个人敏感信息，也不会向第三方共享你的记录数据。
          应用内会生成一个随机的本地设备标识，仅用于区分本机记录，同样不上传。
        </text>

        <text class="section-title block mt">三、广告说明</text>
        <text class="para">
          应用内的「看广告」入口使用微信官方提供的广告组件。广告由微信平台投放与结算，
          我们只会在你主动点击并完整观看后发放虚拟奖励，不会强制你观看广告。
        </text>

        <text class="section-title block mt">四、内容规范</text>
        <text class="para">
          你在情绪日记、时间胶囊、烟瘾记录中填写的文字仅保存在本机，不对外公开、不展示给其他用户。
          请勿输入违反法律法规或平台规范的内容；如你开启了分享功能，请自行确认分享内容合规。
        </text>

        <text class="section-title block mt">五、数据清除</text>
        <text class="para">
          卸载小程序或清除本地缓存会一并删除全部记录，数据无法恢复，请知悉。
        </text>

        <text class="section-title block mt">六、免责声明</text>
        <text class="para">
          本应用所有吸烟行为均为<text class="strong">虚拟模拟</text>，不涉及任何真实烟草的销售、推广与广告。
          应用内的健康、寿命、省钱等数字均为粗略估算，仅供娱乐与自我记录参考，
          <text class="strong">不构成医学建议</text>，也不能替代专业医疗意见。
        </text>

        <text class="section-title block mt">七、协议更新</text>
        <text class="para">
          若本政策有更新，我们会在应用内更新本页内容。继续使用即视为同意更新后的条款。
          如你不同意，请停止使用并卸载应用。
        </text>

        <view class="about-section">
          <text class="text-xs text-gray-600 text-center block">就抽一根 · 虚构香烟 · 纯属娱乐</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import AppNavbar from '@/components/app-navbar/app-navbar.vue'
import { themeClass } from '@/utils/theme.js'

export default {
  components: { AppNavbar }
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
.main-scroll { flex: 1; height: 0; min-height: 0; }
.p-20 { padding: 40rpx; }
.pb-100 { padding-bottom: 200rpx; }
.block { display: block; }
.mt { margin-top: 40rpx; }
.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--primary);
  margin-bottom: 16rpx;
}
.para {
  font-size: 26rpx;
  color: var(--text-dim);
  line-height: 1.9;
  display: block;
}
.strong { color: var(--text); font-weight: 600; }
.about-section { margin-top: 64rpx; }
.text-xs { font-size: 24rpx; }
.text-gray-600 { color: var(--text-dim); }
.text-center { text-align: center; }
</style>
