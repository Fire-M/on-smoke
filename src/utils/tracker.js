/**
 * tracker.js - 埋点追踪系统
 * 用于记录用户行为和广告事件
 */

const TRACK_QUEUE_KEY = 'os_track_queue'
const MAX_QUEUE_SIZE = 100
// 埋点合并写入的间隔：期间所有埋点只进内存队列
const PERSIST_DELAY = 1000

// getStorageSync / setStorageSync 是同步调用，会直接占住 JS 线程。
// 原来每埋一个点都要 JSON.parse 整个队列 + JSON.stringify + 写一遍 storage，
// 一次跳转里连着几条埋点就排在主线程上，看起来就是「点了没反应」。
// 现在改成内存队列 + 延迟合并写，单次埋点不碰 storage。
let memQueue = null
let persistTimer = null
let cachedUid = ''

function loadQueue() {
  if (memQueue) return memQueue
  try {
    const raw = uni.getStorageSync(TRACK_QUEUE_KEY)
    memQueue = raw ? JSON.parse(raw) : []
  } catch (e) {
    memQueue = []
  }
  if (!Array.isArray(memQueue)) memQueue = []
  return memQueue
}

function persistQueue() {
  try {
    uni.setStorageSync(TRACK_QUEUE_KEY, JSON.stringify(loadQueue()))
  } catch (e) {
    console.warn('[Tracker] 保存埋点数据失败', e)
  }
}

function schedulePersist() {
  if (persistTimer) return
  persistTimer = setTimeout(() => {
    persistTimer = null
    persistQueue()
  }, PERSIST_DELAY)
}

// 生成唯一用户 ID（内存缓存，避免每次埋点都同步读 storage）
function getUserId() {
  if (cachedUid) return cachedUid
  let uid = ''
  try { uid = uni.getStorageSync('os_user_id') } catch (e) {}
  if (!uid) {
    uid = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    try { uni.setStorageSync('os_user_id', uid) } catch (e) {}
  }
  cachedUid = uid
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

  // 本地缓存：只进内存，稍后合并落盘
  try {
    const queue = loadQueue()
    queue.push(record)
    // 限制队列大小
    if (queue.length > MAX_QUEUE_SIZE) {
      queue.splice(0, queue.length - MAX_QUEUE_SIZE)
    }
    schedulePersist()
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
 * 立刻把内存队列落盘。App onHide 时调一次，
 * 避免「延迟合并写」的那 1 秒窗口里被系统杀掉而丢埋点
 */
export function flushToStorage() {
  if (persistTimer) { clearTimeout(persistTimer); persistTimer = null }
  persistQueue()
}

/**
 * 批量上报（预留接口）
 */
export function flush() {
  try {
    const queue = loadQueue()
    if (queue.length === 0) return

    // TODO: 发送到服务端
    // await api.post('/api/tracks', { records: queue })

    // 上报成功后清空（内存 + 落盘一起清）
    memQueue = []
    if (persistTimer) { clearTimeout(persistTimer); persistTimer = null }
    persistQueue()
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
  track, flush, flushToStorage,
  trackAppOpen,
  trackSmokingStart, trackSmokingComplete, trackSmokingCancel,
  trackBrandSelect,
  trackMoodRecord, trackBreathingUse, trackChallengeView,
  trackPetInteract,
  trackAdShow, trackAdClick, trackAdClose, trackAdReward, trackAdSkip
}
