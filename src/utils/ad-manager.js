/**
 * ad-manager.js - 广告管理系统
 * 管理激励视频广告和插屏广告
 */

import { track } from './tracker.js'

// ============ 广告实例管理 ============

let rewardedAd = null
let interstitialAd = null

// 广告单元 ID（实际项目中替换为真实 ID）
const AD_UNIT_IDS = {
  rewarded: 'ad-unit-reward-001',
  interstitial: 'ad-unit-interstitial-001'
}

// 每日广告限制
const DAILY_REWARD_LIMIT = 100  // 临时调高用于测试
const DAILY_INTERSTITIAL_LIMIT = 5

// ============ 存储键 ============
const AD_RECORDS_KEY = 'os_ad_records'

function _getAdRecords() {
  try {
    return JSON.parse(uni.getStorageSync(AD_RECORDS_KEY) || '{}')
  } catch (e) {
    return {}
  }
}

function _saveAdRecords(records) {
  uni.setStorageSync(AD_RECORDS_KEY, JSON.stringify(records))
}

function _todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// 获取今日某类广告展示次数
function _getTodayAdCount(adType) {
  const records = _getAdRecords()
  const today = _todayStr()
  if (!records[today] || !records[today][adType]) return 0
  return records[today][adType]
}

// 增加今日广告展示计数
function _incrementAdCount(adType) {
  const records = _getAdRecords()
  const today = _todayStr()
  if (!records[today]) records[today] = {}
  records[today][adType] = (records[today][adType] || 0) + 1
  _saveAdRecords(records)
}

// ============ 激励视频广告 ============

/**
 * 初始化激励视频广告
 */
export function initRewardedAd() {
  // #ifdef APP-PLUS
  if (uni.createRewardedVideoAd) {
    rewardedAd = uni.createRewardedVideoAd({
      adUnitId: AD_UNIT_IDS.rewarded
    })
    rewardedAd.onError((err) => {
      console.warn('[AdManager] 激励视频加载失败', err)
      track('ad_error', { adType: 'rewarded', error: err.errMsg })
    })
  }
  // #endif
}

/**
 * 显示激励视频广告
 * @param {string} purpose - 目的：'quota' | 'skin' | 'pet_accel'
 * @returns {Promise<boolean>} 是否完成观看
 */
export function showRewardedAd(purpose = 'quota') {
  return new Promise((resolve) => {
    const todayCount = _getTodayAdCount('rewarded')
    if (todayCount >= DAILY_REWARD_LIMIT) {
      uni.showToast({ title: '今日广告次数已达上限', icon: 'none' })
      track('ad_limit_reached', { adType: 'rewarded' })
      resolve(false)
      return
    }

    track('ad_show', { adType: 'rewarded', purpose })

    // H5 模拟广告（开发环境）
    _simulateRewardedAd(purpose).then(resolve)

    // #ifdef APP-PLUS
    // 真实环境使用 uni-app 广告
    /*
    if (rewardedAd) {
      rewardedAd.show().catch(() => {
        rewardedAd.load().then(() => rewardedAd.show())
      })
      rewardedAd.onClose((res) => {
        const isComplete = res && res.isEnded
        if (isComplete) {
          _incrementAdCount('rewarded')
          track('ad_reward', { adType: 'rewarded', purpose })
          resolve(true)
        } else {
          track('ad_skip', { adType: 'rewarded', purpose })
          resolve(false)
        }
      })
    } else {
      _simulateRewardedAd(purpose).then(resolve)
    }
    */
    // #endif
  })
}

/**
 * 模拟激励视频广告（H5 开发用）
 * 直接播放，不再弹确认框（确认已由调用方处理）
 */
function _simulateRewardedAd(purpose) {
  return new Promise((resolve) => {
    uni.showLoading({ title: '广告播放中...' })
    setTimeout(() => {
      uni.hideLoading()
      _incrementAdCount('rewarded')
      track('ad_reward', { adType: 'rewarded', purpose })
      uni.showToast({ title: '🎉 广告完成！', icon: 'none' })
      resolve(true)
    }, 2000) // 开发环境模拟 2 秒
  })
}

// ============ 插屏广告 ============

/**
 * 初始化插屏广告
 */
export function initInterstitialAd() {
  // #ifdef APP-PLUS
  if (uni.createInterstitialAd) {
    interstitialAd = uni.createInterstitialAd({
      adUnitId: AD_UNIT_IDS.interstitial
    })
    interstitialAd.onError((err) => {
      console.warn('[AdManager] 插屏广告加载失败', err)
    })
  }
  // #endif
}

/**
 * 显示插屏广告
 * @param {string} position - 位置：'after_smoking' | 'app_open'
 */
export function showInterstitialAd(position = 'after_smoking') {
  const todayCount = _getTodayAdCount('interstitial')
  if (todayCount >= DAILY_INTERSTITIAL_LIMIT) return

  track('ad_show', { adType: 'interstitial', position })

  // H5 模拟（开发环境不显示插屏，避免打扰）
  // 真实环境取消注释下方代码

  // #ifdef APP-PLUS
  /*
  if (interstitialAd) {
    interstitialAd.show().catch(() => {
      interstitialAd.load().then(() => interstitialAd.show())
    })
  }
  */
  // #endif

  _incrementAdCount('interstitial')
}

// ============ 每日首次打开检测 ============

const LAST_OPEN_KEY = 'os_last_open_date'

/**
 * 检查是否是今日首次打开应用
 */
export function checkDailyFirstOpen() {
  const today = _todayStr()
  const lastOpen = uni.getStorageSync(LAST_OPEN_KEY)
  
  if (lastOpen !== today) {
    uni.setStorageSync(LAST_OPEN_KEY, today)
    return true
  }
  return false
}

// ============ 今日广告剩余次数查询 ============

export function getTodayRewardCount() {
  return _getTodayAdCount('rewarded')
}

export function getTodayInterstitialCount() {
  return _getTodayAdCount('interstitial')
}

export function getRewardRemain() {
  return Math.max(0, DAILY_REWARD_LIMIT - _getTodayAdCount('rewarded'))
}

export default {
  initRewardedAd,
  initInterstitialAd,
  showRewardedAd,
  showInterstitialAd,
  checkDailyFirstOpen,
  getTodayRewardCount,
  getTodayInterstitialCount,
  getRewardRemain
}
