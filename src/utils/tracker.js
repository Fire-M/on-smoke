/**
 * tracker.js - 埋点追踪系统
 * 用于记录用户行为和广告事件
 */

const TRACK_QUEUE_KEY = 'os_track_queue'
const MAX_QUEUE_SIZE = 100

// 生成唯一用户 ID
function getUserId() {
  let uid = uni.getStorageSync('os_user_id')
  if (!uid) {
    uid = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    uni.setStorageSync('os_user_id', uid)
  }
  return uid
}

// 获取应用版本
function getAppVersion() {
  return '1.0.0'
}

/**
 * 通用埋点方法
 * @param {string} event - 事件名称
 * @param {object} data - 附加数据
 */
export function track(event, data = {}) {
  const record = {
    event,
    timestamp: Date.now(),
    userId: getUserId(),
    appVersion: getAppVersion(),
    ...data
  }

  // 本地缓存
  try {
    const queue = JSON.parse(uni.getStorageSync(TRACK_QUEUE_KEY) || '[]')
    queue.push(record)
    // 限制队列大小
    if (queue.length > MAX_QUEUE_SIZE) {
      queue.splice(0, queue.length - MAX_QUEUE_SIZE)
    }
    uni.setStorageSync(TRACK_QUEUE_KEY, JSON.stringify(queue))
  } catch (e) {
    console.warn('[Tracker] 保存埋点数据失败', e)
  }

  // 开发环境打印日志
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Tracker] ${event}`, data)
  }

  // TODO: 接入真实上报接口
  // flushIfNeeded()
}

/**
 * 批量上报（预留接口）
 */
export function flush() {
  try {
    const queue = JSON.parse(uni.getStorageSync(TRACK_QUEUE_KEY) || '[]')
    if (queue.length === 0) return

    // TODO: 发送到服务端
    // await api.post('/api/tracks', { records: queue })

    // 上报成功后清空
    uni.setStorageSync(TRACK_QUEUE_KEY, '[]')
    console.log(`[Tracker] 上报 ${queue.length} 条记录`)
  } catch (e) {
    console.warn('[Tracker] 上报失败', e)
  }
}

// ============ 预定义事件 ============

/** 应用打开 */
export function trackAppOpen(source = 'direct') {
  track('app_open', { source })
}

/** 开始吸烟 */
export function trackSmokingStart(brandId) {
  track('smoking_start', { brandId })
}

/** 完成吸烟 */
export function trackSmokingComplete(brandId, duration) {
  track('smoking_complete', { brandId, duration })
}

/** 取消吸烟 */
export function trackSmokingCancel(brandId) {
  track('smoking_cancel', { brandId })
}

/** 选择品牌 */
export function trackBrandSelect(brandId) {
  track('brand_select', { brandId })
}

/** 记录情绪 */
export function trackMoodRecord(mood) {
  track('mood_record', { mood })
}

/** 使用呼吸引导 */
export function trackBreathingUse() {
  track('breathing_use')
}

/** 查看挑战 */
export function trackChallengeView() {
  track('challenge_view')
}

/** 宠物互动 */
export function trackPetInteract(action) {
  track('pet_interact', { action })
}

// ============ 广告事件 ============

/** 广告展示 */
export function trackAdShow(adType, position) {
  track('ad_show', { adType, position })
}

/** 广告点击 */
export function trackAdClick(adType, position) {
  track('ad_click', { adType, position })
}

/** 广告关闭 */
export function trackAdClose(adType, position) {
  track('ad_close', { adType, position })
}

/** 激励视频完成 */
export function trackAdReward(adType, reward) {
  track('ad_reward', { adType, reward })
}

/** 激励视频跳过 */
export function trackAdSkip(adType) {
  track('ad_skip', { adType })
}

export default {
  track, flush,
  trackAppOpen,
  trackSmokingStart, trackSmokingComplete, trackSmokingCancel,
  trackBrandSelect,
  trackMoodRecord, trackBreathingUse, trackChallengeView,
  trackPetInteract,
  trackAdShow, trackAdClick, trackAdClose, trackAdReward, trackAdSkip
}
