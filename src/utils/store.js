/**
 * store.js - uni-app 数据层
 * 使用 uni.storage 替代 localStorage，支持 H5/小程序/App
 */

const KEYS = {
  settings: 'os_settings',
  today: 'os_today',
  history: 'os_history',
  stats: 'os_stats',
  badges: 'os_badges'
}

// 默认设置
const DEFAULT_SETTINGS = {
  dailyQuota: 5,
  cooldownMinutes: 30,
  cigarettePrice: 30,
  packSize: 20,
  quitDate: new Date().toISOString().slice(0, 10),
  dailyOriginal: 20,
  selectedBrand: null
}

// 默认今日状态
const DEFAULT_TODAY = {
  date: _todayStr(),
  smokedCount: 0,
  lastSmokeTime: null
}

// 默认统计
const DEFAULT_STATS = {
  totalSmoked: 0,
  totalSaved: 0,
  longestSmokeFree: 0
}

function _todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function _read(key, fallback) {
  try {
    const raw = uni.getStorageSync(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (e) {
    return fallback
  }
}

function _write(key, data) {
  uni.setStorageSync(key, JSON.stringify(data))
}

// ---- 设置 ----
export function getSettings() {
  return { ...DEFAULT_SETTINGS, ..._read(KEYS.settings, DEFAULT_SETTINGS) }
}

export function saveSettings(s) {
  _write(KEYS.settings, s)
}

// ---- 今日状态 ----
export function getToday() {
  const t = _read(KEYS.today, DEFAULT_TODAY)
  // 跨午夜自动重置
  if (t.date !== _todayStr()) {
    t.date = _todayStr()
    t.smokedCount = 0
    _write(KEYS.today, t)
  }
  return t
}

export function saveToday(t) {
  _write(KEYS.today, t)
}

// ---- 历史记录 ----
export function getHistory() {
  return _read(KEYS.history, [])
}

export function addHistory(record) {
  const list = getHistory()
  list.unshift(record)
  if (list.length > 500) list.length = 500
  _write(KEYS.history, list)
}

// ---- 统计 ----
export function getStats() {
  return { ...DEFAULT_STATS, ..._read(KEYS.stats, DEFAULT_STATS) }
}

export function saveStats(s) {
  _write(KEYS.stats, s)
}

// ---- 核心业务方法 ----
export function canSmoke() {
  const settings = getSettings()
  const today = getToday()

  if (today.smokedCount >= settings.dailyQuota) {
    return { can: false, reason: '今日配额已用完' }
  }

  // 暂时关闭冷却时间
  // if (today.lastSmokeTime) {
  //   const elapsed = Date.now() - today.lastSmokeTime
  //   const cdMs = settings.cooldownMinutes * 60 * 1000
  //   if (elapsed < cdMs) {
  //     const remainSec = Math.ceil((cdMs - elapsed) / 1000)
  //     return { can: false, reason: `冷却中 ${_formatTime(remainSec)}` }
  //   }
  // }

  return { can: true, reason: '' }
}

export function getCooldownRemain() {
  // 暂时关闭冷却时间
  return 0
}

export function recordSmoke(duration) {
  const today = getToday()
  const settings = getSettings()
  const now = Date.now()

  today.smokedCount += 1
  today.lastSmokeTime = now
  saveToday(today)

  addHistory({
    id: now.toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: now,
    duration: duration
  })

  const stats = getStats()
  stats.totalSmoked += 1
  const pricePerCig = settings.cigarettePrice / settings.packSize
  stats.totalSaved = (stats.totalSaved || 0) + pricePerCig
  saveStats(stats)
}

export function getSmokeFreeDuration() {
  const today = getToday()
  if (today.lastSmokeTime) {
    return Math.floor((Date.now() - today.lastSmokeTime) / 1000)
  }
  const settings = getSettings()
  const quitDate = new Date(settings.quitDate)
  return Math.floor((Date.now() - quitDate.getTime()) / 1000)
}

export function getCleanDays() {
  const settings = getSettings()
  const today = getToday()
  let startDate
  if (today.lastSmokeTime) {
    startDate = new Date(today.lastSmokeTime)
  } else {
    startDate = new Date(settings.quitDate)
  }
  const now = new Date()
  startDate.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((now - startDate) / 86400000))
}

export function getSavedMoney() {
  const stats = getStats()
  return Math.round((stats.totalSaved || 0) * 10) / 10
}

export function getLessSmoked() {
  const stats = getStats()
  return stats.totalSmoked || 0
}

// 勋章系统
export function getUnlockedBadges() {
  return _read(KEYS.badges, {})
}

export function saveUnlockedBadges(badges) {
  uni.setStorageSync(KEYS.badges, JSON.stringify(badges))
}

export function unlockBadge(badgeId) {
  const badges = getUnlockedBadges()
  if (!badges[badgeId]) {
    badges[badgeId] = true
    badges[badgeId + '_time'] = Date.now()
    saveUnlockedBadges(badges)
    return true // 新解锁
  }
  return false // 已解锁
}

export function resetAll() {
  Object.values(KEYS).forEach(k => uni.removeStorageSync(k))
}

function _formatTime(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default {
  getSettings, saveSettings,
  getToday, saveToday,
  getHistory, addHistory,
  getStats, saveStats,
  canSmoke, getCooldownRemain,
  recordSmoke,
  getSmokeFreeDuration, getCleanDays,
  getSavedMoney, getLessSmoked,
  getUnlockedBadges, saveUnlockedBadges, unlockBadge,
  resetAll
}
