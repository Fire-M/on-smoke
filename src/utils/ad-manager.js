/**
 * ad-manager.js - 广告管理系统（微信小程序）
 *
 * 策略：激励视频做主力（eCPM 最高、用户主动观看、合规风险最低），插屏克制使用。
 * 小程序没有「开屏广告」这种形态，开屏是 App 才有的，不要照搬。
 *
 * 上线前必做：开通小程序流量主 → 创建广告位 → 把真实 adUnitId 填到 AD_UNIT_IDS。
 */

import { track } from './tracker.js'

// ============ 广告实例管理 ============

let rewardedAd = null
let interstitialAd = null

// 激励视频的回调是一次性注册的，这里暂存当前这次观看的 resolve / purpose
let pendingResolve = null
let pendingPurpose = ''

// 广告单元 ID（占位值，开通流量主后替换为真实 ID）
const AD_UNIT_IDS = {
  rewarded: 'ad-unit-reward-001',
  interstitial: 'ad-unit-interstitial-001'
}

// 还在用占位 ID = 没开通流量主，这时候广告入口必须藏起来：
// 用户点进去拉不到广告、也拿不到奖励，只会觉得 App 坏了。
const PLACEHOLDER_IDS = [
  'ad-unit-reward-001',
  'ad-unit-interstitial-001'
]

/**
 * 广告是否真的可用（各页面用它决定要不要显示广告入口）
 */
export function isAdEnabled() {
  // #ifdef H5
  // 开发用模拟广告，入口照常显示方便自测
  return true
  // #endif

  // #ifdef MP-WEIXIN
  return !!AD_UNIT_IDS.rewarded && PLACEHOLDER_IDS.indexOf(AD_UNIT_IDS.rewarded) === -1
  // #endif
}

// 每日广告上限
const DAILY_REWARD_LIMIT = 5
const DAILY_INTERSTITIAL_LIMIT = 5

// 看一次广告给几根配额。
// 原来给 1 根：同样消耗一次广告次数，用户的点击意愿很低。
export const REWARD_QUOTA_PER_AD = 3

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

// 本地日期（与 store.js 保持一致；toISOString 是 UTC 日期，会让每日限额在
// UTC+8 到早上 8 点才重置）
function _todayStr() {
  const t = new Date()
  const y = t.getFullYear()
  const m = String(t.getMonth() + 1).padStart(2, '0')
  const d = String(t.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
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
  // #ifdef MP-WEIXIN
  if (rewardedAd) return rewardedAd
  // 基础库太旧 / 开发者工具版本不匹配 / 未开通流量主时，
  // createRewardedVideoAd 可能不存在、抛错，或返回 undefined。
  // 这里必须层层判空，否则 rewardedAd.onClose 会直接把页面 onLoad 打崩。
  if (typeof uni.createRewardedVideoAd !== 'function') return null
  try {
    rewardedAd = uni.createRewardedVideoAd({ adUnitId: AD_UNIT_IDS.rewarded })
  } catch (e) {
    console.warn('[AdManager] 激励视频创建失败（基础库过旧或未开通流量主）', e)
    rewardedAd = null
    return null
  }
  if (!rewardedAd || typeof rewardedAd.onClose !== 'function') {
    console.warn('[AdManager] 激励视频实例不可用，广告功能降级为不可用')
    rewardedAd = null
    return null
  }

  // onClose 只能注册一次：重复注册会让回调叠加，
  // 一次观看触发多次计数 / 多次 resolve，奖励会被重复发放
  rewardedAd.onClose((res) => {
    const fn = pendingResolve
    pendingResolve = null
    const isComplete = !!(res && res.isEnded)
    if (isComplete) {
      _incrementAdCount('rewarded')
      track('ad_reward', { adType: 'rewarded', purpose: pendingPurpose })
    } else {
      track('ad_skip', { adType: 'rewarded', purpose: pendingPurpose })
    }
    if (fn) fn(isComplete)
  })

  if (typeof rewardedAd.onError === 'function') {
    rewardedAd.onError((err) => {
      console.warn('[AdManager] 激励视频错误', err)
      track('ad_error', { adType: 'rewarded', error: err && err.errMsg })
      const fn = pendingResolve
      pendingResolve = null
      if (fn) fn(false)
    })
  }

  if (typeof rewardedAd.load === 'function') {
    try { rewardedAd.load().catch(() => {}) } catch (e) {}
  }
  return rewardedAd
  // #endif
}

// 首次 show 失败（未加载完成）时，重新 load 后再试一次。
// 注意：任何失败分支都必须把 pendingResolve 结算掉。之前第二次 show 的 catch 是空的，
// Promise 永远不 resolve → 页面 adWatching 卡在 true，该页广告入口此后点了没反应。
function _reloadAndShow(resolve) {
  const fail = () => { pendingResolve = null; resolve(false) }
  if (!rewardedAd || typeof rewardedAd.load !== 'function') { fail(); return }
  try {
    rewardedAd.load().then(() => {
      if (!rewardedAd || typeof rewardedAd.show !== 'function') { fail(); return }
      const p = rewardedAd.show()
      if (p && typeof p.catch === 'function') p.catch(fail)
    }).catch(fail)
  } catch (e) {
    fail()
  }
}

/**
 * 显示激励视频广告
 * @param {string} purpose - 目的：'quota' | 'refill' | 'boost' | 'skin' | 'pet_accel'
 * @returns {Promise<boolean>} 是否完整观看
 */
export function showRewardedAd(purpose = 'quota') {
  return new Promise((resolve) => {
    if (_getTodayAdCount('rewarded') >= DAILY_REWARD_LIMIT) {
      uni.showToast({ title: '今日广告次数已达上限', icon: 'none' })
      track('ad_limit_reached', { adType: 'rewarded' })
      resolve(false)
      return
    }

    track('ad_show', { adType: 'rewarded', purpose })
    pendingPurpose = purpose

    // #ifdef H5
    // 开发环境没有真实广告，走模拟流程（这段不会编译进小程序）
    _simulateRewardedAd(purpose).then(resolve)
    return
    // #endif

    // #ifdef MP-WEIXIN
    // 上一次还在播：直接拒绝。pendingResolve 是单槽，后一次会覆盖前一次，
    // 前一次的 Promise 就永远不结算了（表现为连点后广告入口全废）
    if (pendingResolve) {
      resolve(false)
      return
    }
    if (!rewardedAd) initRewardedAd()
    if (!rewardedAd || typeof rewardedAd.show !== 'function') {
      // 广告拉不到时不发奖励、也不占用每日次数
      uni.showToast({ title: '广告暂不可用', icon: 'none' })
      resolve(false)
      return
    }
    pendingResolve = resolve
    try {
      const p = rewardedAd.show()
      if (p && typeof p.catch === 'function') {
        p.catch(() => { _reloadAndShow(resolve) })
      }
    } catch (e) {
      _reloadAndShow(resolve)
    }
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
  // #ifdef MP-WEIXIN
  if (interstitialAd) return interstitialAd
  if (typeof uni.createInterstitialAd !== 'function') return null
  try {
    interstitialAd = uni.createInterstitialAd({ adUnitId: AD_UNIT_IDS.interstitial })
  } catch (e) {
    console.warn('[AdManager] 插屏广告创建失败（基础库过旧或未开通流量主）', e)
    interstitialAd = null
    return null
  }
  if (!interstitialAd) return null
  if (typeof interstitialAd.onError === 'function') {
    interstitialAd.onError((err) => {
      console.warn('[AdManager] 插屏广告错误', err)
    })
  }
  return interstitialAd
  // #endif
}

/**
 * 显示插屏广告
 * @param {string} position - 位置：'after_smoking' 等具体操作节点
 */
export function showInterstitialAd(position = 'after_smoking') {
  if (_getTodayAdCount('interstitial') >= DAILY_INTERSTITIAL_LIMIT) return

  // #ifdef H5
  // 开发环境既不展示也不计数。
  // 之前这里「没展示却在计数」，会把每日额度白白耗光，
  // 真接上广告后插屏在前几次就被假计数耗尽，等于永久失效。
  return
  // #endif

  // #ifdef MP-WEIXIN
  if (!interstitialAd) initInterstitialAd()
  if (!interstitialAd || typeof interstitialAd.show !== 'function') return

  // 只有真正展示成功才计数，避免额度被空耗
  try {
    const p = interstitialAd.show()
    if (p && typeof p.then === 'function') {
      p.then(() => {
        _incrementAdCount('interstitial')
        track('ad_show', { adType: 'interstitial', position })
      }).catch(() => {})
    }
  } catch (e) {}
  // #endif
}

// ============ 每日首次打开检测 ============
// 注意：小程序没有「开屏广告」形态，不要用这个来弹开屏插屏。
const LAST_OPEN_KEY = 'os_last_open_date'

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
  REWARD_QUOTA_PER_AD,
  isAdEnabled,
  initRewardedAd,
  initInterstitialAd,
  showRewardedAd,
  showInterstitialAd,
  checkDailyFirstOpen,
  getTodayRewardCount,
  getTodayInterstitialCount,
  getRewardRemain
}
