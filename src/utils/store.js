/**
 * store.js - uni-app 数据层
 * 使用 uni.storage 替代 localStorage，支持 H5/小程序/App
 */

const KEYS = {
  settings: 'os_settings',
  today: 'os_today',
  history: 'os_history',
  stats: 'os_stats',
  badges: 'os_badges',
  cravings: 'os_cravings',
  challenges: 'os_challenges',
  moods: 'os_moods',
  savingsGoals: 'os_savings_goals',
  timeCapsules: 'os_time_capsules',
  pet: 'os_pet',
  adRewards: 'os_ad_rewards',
  stickers: 'os_stickers',
    petAccessories: 'os_pet_accessories',
  backgrounds: 'os_backgrounds',
  smokeStyles: 'os_smoke_styles',
  theme: 'os_theme',
  packRemaining: 'os_pack_remaining',
  savingsSettle: 'os_savings_settle'
}

// 存储键（非 KEYS 内、由其它模块维护，resetAll 一并清理）
const EXTRA_KEYS = [
  'os_ad_records',
  'os_last_open_date',
  'os_sound',
  'os_data_version',
  'os_cloud_uid'
]

// 数据结构版本。改动计算规则时递增，启动时由 migrateIfNeeded() 自动迁移，
// 避免老用户带着错误数据（比如旧版反向的省钱金额）继续用。
const DATA_VERSION = 4

// ---- 品牌单一数据源（页面与剩余计算共用，避免口径分裂）----
export const BRANDS = [
  { id: 'lanhe', cn: '蓝河', en: 'LAN·HE', price: 50, theme: 'blue', tag: '冰凉回甘·空气味', quote: '假装自己很高级', packSize: 20 },
  { id: 'hongta', cn: '太华', en: 'TA·HWA', price: 88, theme: 'red', tag: '浓郁·想象味', quote: '送礼倍有面（的空气）', packSize: 20 },
  { id: 'heiye', cn: '熊猫666', en: 'PANDA', price: 100, theme: 'black', tag: '顶配·都是心理味', quote: '国宝都戒了你还抽？', packSize: 20 },
  { id: 'jinsi', cn: '羊驼', en: 'LLAMA', price: 22, theme: 'gold', tag: '粗犷·沙漠风', quote: '原版是骆驼，这是羊驼', packSize: 20 },
  { id: 'qingyun', cn: '冰河', en: 'ICE·RIVER', price: 35, theme: 'lightblue', tag: '薄荷冰爆·脑瓜疼', quote: '爆珠一捏，感觉良好', packSize: 20 },
  { id: 'zimeng', cn: '紫云', en: 'PURPLE', price: 45, theme: 'purple', tag: '淡雅·朕的味道', quote: '烟盒比烟好看', packSize: 20 }
]

// 取品牌每包支数（未命中时回落到用户设置的 packSize）
export function getBrandPackSize(brandId, fallbackPackSize) {
  const brand = BRANDS.find(b => b.id === brandId)
  return (brand && brand.packSize) || fallbackPackSize || 20
}

// 取品牌每根单价：品牌有价用品牌价，否则用设置价
export function getBrandPricePerCig(brandId) {
  const settings = getSettings()
  const brand = BRANDS.find(b => b.id === brandId)
  const packPrice = (brand && brand.price) || settings.cigarettePrice
  const packSize = getBrandPackSize(brandId, settings.packSize)
  return packPrice / packSize
}

// 默认设置
const DEFAULT_SETTINGS = {
  dailyQuota: 5,
  cooldownMinutes: 30,
  cigarettePrice: 30,
  packSize: 20,
  quitDate: _todayStr(),
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
  longestSmokeFree: 0,
  maxStreak: 0
}

// 本地日期 YYYY-MM-DD。
// 不能用 toISOString()：它返回 UTC 日期，在 UTC+8 会导致「今天」到早上 8 点才切换，
// 配额/挑战/额外配额的跨天重置会整体错位。
function _todayStr(d) {
  const t = d ? new Date(d) : new Date()
  const y = t.getFullYear()
  const m = String(t.getMonth() + 1).padStart(2, '0')
  const day = String(t.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 把 'YYYY-MM-DD' 解析成「本地时间当天 00:00」。
// new Date('2026-10-18') 会按 UTC 解析，在负时区会少算一天。
// 导出给页面使用（页面里 quitDate 直接参与减法会得到 NaN）。
export function parseLocalDate(str) {
  if (!str) return null
  const parts = String(str).split('-')
  if (parts.length !== 3) return null
  const y = Number(parts[0])
  const m = Number(parts[1])
  const d = Number(parts[2])
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

// 日期字符串加减天数
function _shiftDays(dateStr, delta) {
  const d = parseLocalDate(dateStr)
  if (!d) return _todayStr()
  d.setDate(d.getDate() + delta)
  return _todayStr(d)
}

// 字符串哈希（用于每日挑战取模板，比 parseInt(日期) % N 分布更均匀）
function _hashString(str) {
  let h = 0
  const s = String(str)
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0
  }
  return h
}

// 两个日期字符串相差天数（b - a）
function _diffDays(a, b) {
  const da = parseLocalDate(a)
  const db = parseLocalDate(b)
  if (!da || !db) return 0
  return Math.floor((db.getTime() - da.getTime()) / 86400000)
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

// 回填最后一次抽烟的时长。
// 现在的规则是「点火即记账」，但点火那一刻还不知道会抽多久，
// 所以抽完（或中途返回）时用这个函数补写真实时长。
export function updateLastSmokeDuration(duration) {
  const list = getHistory()
  if (!list.length) return null
  // addHistory 用 unshift，最新一条在开头
  list[0].duration = duration
  _write(KEYS.history, list)
  return list[0]
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
  const effectiveQuota = getEffectiveQuota()

  if (today.smokedCount >= effectiveQuota) {
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

export function recordSmoke(duration, brandId = null) {
  const today = getToday()
  const settings = getSettings()
  const now = Date.now()

  today.smokedCount += 1
  today.lastSmokeTime = now
  
  // 记录品牌吸烟次数
  if (brandId) {
    if (!today.brandCounts) today.brandCounts = {}
    today.brandCounts[brandId] = (today.brandCounts[brandId] || 0) + 1
  }
  
  saveToday(today)

  addHistory({
    id: now.toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: now,
    duration: duration,
    brandId: brandId
  })

  const stats = getStats()
  stats.totalSmoked = (stats.totalSmoked || 0) + 1

  // 时段统计（供成就判定）：深夜 0-5 点 / 清晨 6-8 点
  const hour = new Date(now).getHours()
  if (hour >= 0 && hour < 5) stats.nightSmoked = (stats.nightSmoked || 0) + 1
  if (hour >= 6 && hour < 8) stats.earlySmoked = (stats.earlySmoked || 0) + 1

  // 最长连续打卡天数：基于历史记录真实计算
  const streak = getSmokeStreak()
  if (streak > (stats.maxStreak || 0)) {
    stats.maxStreak = streak
  }
  saveStats(stats)

  // 抽烟会伤害宠物伙伴（掉血/掉心情，不掉经验）
  harmPet(-5, -4)
}

// 连续打卡天数：从今天（或昨天）往前数，历史里每天至少 1 根的连续天数
export function getSmokeStreak() {
  const history = getHistory()
  if (!history.length) return 0

  const daySet = new Set()
  history.forEach(r => {
    if (r && r.timestamp) daySet.add(_todayStr(r.timestamp))
  })

  const today = _todayStr()
  // 今天还没抽不算断签，从昨天开始回溯
  let cursor = daySet.has(today) ? today : _shiftDays(today, -1)

  let streak = 0
  while (daySet.has(cursor)) {
    streak++
    cursor = _shiftDays(cursor, -1)
  }
  return streak
}

// 通用计数器：成就用的 passedCount / ashTapped 等
export function incrementStat(field, delta = 1) {
  const stats = getStats()
  stats[field] = (stats[field] || 0) + delta
  saveStats(stats)
  return stats[field]
}

// 记录使用过的吐烟样式（去重，成就「花样大师」需要 12 种都用过）
export function markStyleUsed(idx) {
  const stats = getStats()
  if (!Array.isArray(stats.usedStyles)) stats.usedStyles = []
  if (!stats.usedStyles.includes(idx)) {
    stats.usedStyles.push(idx)
    stats.stylesUsed = stats.usedStyles.length
    saveStats(stats)
  }
  return stats.stylesUsed
}

// 获取某品牌今日吸烟次数
export function getBrandSmokedCount(brandId) {
  const today = getToday()
  if (!today.brandCounts || !today.brandCounts[brandId]) return 0
  return today.brandCounts[brandId]
}

// ---- 每包烟剩余持久化 ----
// 每包支数取品牌自身 packSize，不再取全局 settings.packSize，
// 避免用户改了设置后出现「剩余 15 / 总数 10」这种分子大于分母的情况。
export function getPackSize(brandId) {
  const settings = getSettings()
  return getBrandPackSize(brandId, settings.packSize)
}

export function getPackRemaining(brandId) {
  const data = _read(KEYS.packRemaining, {})
  if (data[brandId] != null) return Math.max(0, data[brandId])
  return getPackSize(brandId)
}

export function savePackRemaining(brandId, count) {
  const data = _read(KEYS.packRemaining, {})
  data[brandId] = Math.max(0, count)
  _write(KEYS.packRemaining, data)
}

// 开新的一包（抽空后可继续抽）
export function refillPack(brandId) {
  savePackRemaining(brandId, getPackSize(brandId))
  return getPackRemaining(brandId)
}

// 获取某品牌剩余数量（基于持久化的包剩余，跨天不重置）
export function getBrandRemaining(brandId) {
  return getPackRemaining(brandId)
}

// 距上一次抽烟的秒数（真正的「无烟时长」，用于健康里程碑）
export function getSmokeFreeDuration() {
  const today = getToday()
  if (today.lastSmokeTime) {
    return Math.max(0, Math.floor((Date.now() - today.lastSmokeTime) / 1000))
  }
  const settings = getSettings()
  const quitDate = parseLocalDate(settings.quitDate)
  if (!quitDate) return 0
  return Math.max(0, Math.floor((Date.now() - quitDate.getTime()) / 1000))
}

// 戒烟天数：从戒烟开始日算起的自然天数。
// 之前用 lastSmokeTime 起算，导致「今天抽一根虚拟烟 → 戒烟天数归零」，
// 而本产品本就允许每天抽几根虚拟烟，该指标会永远停在 0。
export function getCleanDays() {
  const settings = getSettings()
  const start = parseLocalDate(settings.quitDate)
  if (!start) return 0
  return Math.max(0, _diffDays(settings.quitDate, _todayStr()))
}

// ---- 省钱结算 ----
// 旧版采用「游标结算」：每天结束后把昨天及之前的金额累加到 stats.totalSaved。
// 实测有 3 个硬伤：
//   1. 首次进入游标写 today（应 yesterday）→ 首日永远结算不到
//   2. 整体永远滞后一天结算
//   3. 修改 dailyOriginal / cigarettePrice 后历史不重算，看到旧数字会以为"计算不对"
//
// 新版改为「实时重算」：getSavedMoney 每次基于 history 重算 [首日, 今天]，
// history 是真实数据且根数只增不减（点火即记账），没有来回跳的问题。
// 改烟价/基准量后数字立即生效。函数保留 export 是为了让旧调用点
// （App.vue / savings / dashboard / achievements / share / brand / health-calc）
// 不需要逐个改 —— 这里 noop 一下即可。
export function settleDailySavings() {
  return getSavedMoney()
}

// 今天到目前为止省下的钱（未结算，仅用于展示「今日」）
export function getTodaySaved() {
  const settings = getSettings()
  const today = getToday()
  const pricePerCig = settings.cigarettePrice / (settings.packSize || 20)
  const original = Math.max(0, settings.dailyOriginal || 0)
  const avoided = Math.max(0, original - (today.smokedCount || 0))
  return Math.round(avoided * pricePerCig * 10) / 10
}

// 累计省钱：以「原本每天抽 dailyOriginal 根」为基准，
// 每天省下 (dailyOriginal − 当天实际抽的根数) × 当天实际单根均价。
// 实时：每次调用都基于 history 重算 [首日, 今天]，含今天。
export function getSavedMoney() {
  const settings = getSettings()
  const history = getHistory()
  if (!history.length) return 0

  const defaultPrice = settings.cigarettePrice / (settings.packSize || 20)
  const original = Math.max(0, settings.dailyOriginal || 0)

  // 按天聚合根数与实付单价
  const daily = {}
  let minTs = Infinity
  history.forEach(r => {
    if (!r || !r.timestamp) return
    const day = _todayStr(r.timestamp)
    if (!daily[day]) daily[day] = { count: 0, cost: 0 }
    daily[day].count += 1
    daily[day].cost += getBrandPricePerCig(r.brandId)
    if (r.timestamp < minTs) minTs = r.timestamp
  })

  const startDay = _todayStr(minTs)
  const today = _todayStr()

  let total = 0
  let cursor = startDay
  let guard = 0
  while (cursor <= today && guard < 3651) {   // ≤ 含今天
    const rec = daily[cursor]
    const smoked = rec ? rec.count : 0
    // 当天抽过就用当天的实付均价，没抽（或没记录）才回落到设置价
    const avgPrice = (rec && smoked > 0) ? (rec.cost / smoked) : defaultPrice
    total += Math.max(0, original - smoked) * avgPrice
    cursor = _shiftDays(cursor, 1)
    guard++
  }

  return Math.round(total * 100) / 100
}

// 少抽的根数：基准量 − 实际抽的量（之前直接返回 totalSmoked，名实相反）
export function getLessSmoked() {
  const settings = getSettings()
  const stats = getStats()
  const days = Math.max(1, getCleanDays() + 1)
  const original = Math.max(0, settings.dailyOriginal || 0)
  return Math.max(0, days * original - (stats.totalSmoked || 0))
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

// ---- 勋章定义（首页与成就页共用同一份数据源）----
export const BADGE_LIST = [
  // 戒烟里程碑
  { id: 'first_air_cig', name: '第一根空气烟', icon: '🚬', category: 0, desc: '首次完成吸烟', condition: (s) => s.totalSmoked >= 1 },
  { id: 'one_day', name: '坚持一天', icon: '⭐', category: 0, desc: '累计戒烟满 1 天', condition: (s) => s.cleanDays >= 1 },
  { id: 'three_days', name: '三天小成', icon: '🌟', category: 0, desc: '累计戒烟满 3 天', condition: (s) => s.cleanDays >= 3 },
  { id: 'one_week', name: '一周达人', icon: '🏅', category: 0, desc: '累计戒烟满 7 天', condition: (s) => s.cleanDays >= 7 },
  { id: 'half_month', name: '半月勇士', icon: '🎖️', category: 0, desc: '累计戒烟满 15 天', condition: (s) => s.cleanDays >= 15 },
  { id: 'one_month', name: '月度冠军', icon: '🏆', category: 0, desc: '累计戒烟满 30 天', condition: (s) => s.cleanDays >= 30 },
  { id: 'hundred_days', name: '百日英雄', icon: '👑', category: 0, desc: '累计戒烟满 100 天', condition: (s) => s.cleanDays >= 100 },

  // 省钱达人
  { id: 'save_10', name: '首枚硬币', icon: '💰', category: 1, desc: '累计省下 10 元', condition: (s) => s.totalSaved >= 10 },
  { id: 'save_50', name: '小富即安', icon: '💵', category: 1, desc: '累计省下 50 元', condition: (s) => s.totalSaved >= 50 },
  { id: 'save_100', name: '百元大关', icon: '💴', category: 1, desc: '累计省下 100 元', condition: (s) => s.totalSaved >= 100 },
  { id: 'save_1000', name: '千元户', icon: '💶', category: 1, desc: '累计省下 1000 元', condition: (s) => s.totalSaved >= 1000 },
  { id: 'save_10000', name: '万元户', icon: '💎', category: 1, desc: '累计省下 10000 元', condition: (s) => s.totalSaved >= 10000 },

  // 抽烟次数
  { id: 'smoke_1', name: '初试啼声', icon: '🎯', category: 2, desc: '首次抽完一根', condition: (s) => s.totalSmoked >= 1 },
  { id: 'smoke_10', name: '十根老手', icon: '🎪', category: 2, desc: '累计抽完 10 根', condition: (s) => s.totalSmoked >= 10 },
  { id: 'smoke_100', name: '百根大师', icon: '🎭', category: 2, desc: '累计抽完 100 根', condition: (s) => s.totalSmoked >= 100 },
  { id: 'smoke_1000', name: '千根传奇', icon: '🌠', category: 2, desc: '累计抽完 1000 根', condition: (s) => s.totalSmoked >= 1000 },

  // 特殊成就
  { id: 'night_smoker', name: '深夜烟民', icon: '🌙', category: 3, desc: '凌晨 0-5 点抽烟', condition: (s) => s.nightSmoked >= 1 },
  { id: 'early_bird', name: '早起鸟儿', icon: '🌅', category: 3, desc: '早晨 6-8 点抽烟', condition: (s) => s.earlySmoked >= 1 },
  { id: 'three_days_streak', name: '连续三天', icon: '🔥', category: 3, desc: '连续 3 天每天抽一根', condition: (s) => s.maxStreak >= 3 },
  { id: 'all_styles', name: '花样大师', icon: '🎨', category: 3, desc: '使用过所有 12 种吐烟花样', condition: (s) => s.stylesUsed >= 12 },
  { id: 'pass_10', name: '派烟达人', icon: '🤝', category: 3, desc: '累计派烟 10 次', condition: (s) => s.passedCount >= 10 },
  { id: 'tap_ash_50', name: '弹烟灰专家', icon: '💨', category: 3, desc: '累计弹烟灰 50 次', condition: (s) => s.ashTapped >= 50 },

  // 健康成就：改用「连续无烟时长」而非「累计戒烟天数」。
  // 原来这里和「戒烟里程碑」共用 cleanDays（3/7/30 天各撞一枚），
  // 两枚会同时解锁、条件完全一样，观感就是凑数。
  // 改用 smokeFreeSeconds 后两者语义分离：里程碑看累计（允许偶尔破戒），
  // 健康成就看连续（抽一根就重新计时），也更贴合真实的健康恢复规律。
  { id: 'lungs_breathing', name: '肺在呼吸', icon: '🫁', category: 4, desc: '连续 12 小时不抽烟，血氧恢复', condition: (s) => s.smokeFreeSeconds >= 43200 },
  { id: 'taste_return', name: '味觉回归', icon: '👅', category: 4, desc: '连续 2 天不抽烟，味觉开始恢复', condition: (s) => s.smokeFreeSeconds >= 172800 },
  { id: 'blood_flow', name: '血液循环', icon: '❤️', category: 4, desc: '连续 2 周不抽烟，循环改善', condition: (s) => s.smokeFreeSeconds >= 1209600 },
  { id: 'cancer_risk_down', name: '呼吸顺畅', icon: '🛡️', category: 4, desc: '连续 3 个月不抽烟，咳喘减少', condition: (s) => s.smokeFreeSeconds >= 7776000 }
]

// 构造勋章判定所需的完整 stats（补齐 cleanDays / 时段 / 计数器等派生字段）
export function buildBadgeStats() {
  const s = getStats()
  return {
    totalSmoked: s.totalSmoked || 0,
    totalSaved: getSavedMoney(),
    cleanDays: getCleanDays(),
    maxStreak: Math.max(s.maxStreak || 0, getSmokeStreak()),
    nightSmoked: s.nightSmoked || 0,
    earlySmoked: s.earlySmoked || 0,
    stylesUsed: s.stylesUsed || 0,
    passedCount: s.passedCount || 0,
    ashTapped: s.ashTapped || 0,
    // 健康成就用「连续无烟时长」（抽一根就重新计时）
    smokeFreeSeconds: getSmokeFreeDuration()
  }
}

// 按当前数据自动解锁符合条件的勋章，返回本次新解锁的列表
export function syncBadges() {
  const stats = buildBadgeStats()
  const newly = []
  BADGE_LIST.forEach(b => {
    let ok = false
    try { ok = !!b.condition(stats) } catch (e) { ok = false }
    if (ok && unlockBadge(b.id)) newly.push(b)
  })
  return newly
}

// 带解锁状态的勋章列表
export function getBadgeList() {
  const unlocked = getUnlockedBadges()
  return BADGE_LIST.map(b => ({
    ...b,
    unlocked: !!unlocked[b.id],
    unlockTime: unlocked[b.id + '_time'] || null
  }))
}

/**
 * 旧版用 history 重算 stats.totalSaved。
 * 现在 getSavedMoney() 本身就是实时重算，这个函数已无意义，
 * 保留 export 仅为兼容，直接转发即可。
 */
export function recomputeSavedFromHistory() {
  return getSavedMoney()
}

/**
 * 启动时自动迁移旧数据。返回 null 表示无需迁移，否则返回本次变更摘要
 * （供 App 弹窗告知用户，避免数字突变却不知原因）。
 */
export function migrateIfNeeded() {
  const from = _read('os_data_version', 0)
  if (from >= DATA_VERSION) return null

  const result = { from, to: DATA_VERSION, changed: false }

  // 每日挑战：旧版 updateChallengeProgress 从未被调用，completed 恒为 false，
  // 且 limit / time_range 缺少判定分支，历史记录不可信，清空重来
  const challenges = _read(KEYS.challenges, {})
  if (challenges && Object.keys(challenges).length) {
    _write(KEYS.challenges, {})
    result.challengesReset = true
    result.changed = true
  }

  // 清掉旧版结算游标。getSavedMoney 改为实时重算后不再需要它，
  // 留着反而有害：旧数据里字段名是错的 last，未来若有人恢复游标逻辑会被误导。
  try { uni.removeStorageSync(KEYS.savingsSettle) } catch (e) {}

  // 老用户（有抽烟记录）：省钱改成实时结算后数字会变，必须告知，
  // 否则用户会以为是 App 坏了。新用户无记录，不必打扰。
  if (getHistory().length) {
    result.savedRealtime = true
    result.changed = true
  }

  // 勋章：旧版成就页硬编码解锁前两枚，状态不可信，按新规则重算
  syncBadges()
  result.badgesResynced = true

  _write('os_data_version', DATA_VERSION)
  return result.changed ? result : null
}

export function resetAll() {
  Object.values(KEYS).forEach(k => uni.removeStorageSync(k))
  // 清理由其它模块维护的键（广告记录 / 每日首次打开 / 音效开关）
  EXTRA_KEYS.forEach(k => uni.removeStorageSync(k))
}

function _formatTime(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ---- 烟瘾追踪 ----
export function getCravings() {
  return _read(KEYS.cravings, [])
}

export function addCraving(craving) {
  const list = getCravings()
  list.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: Date.now(),
    ...craving
  })
  if (list.length > 200) list.length = 200
  _write(KEYS.cravings, list)
}

export function getCravingStats() {
  const cravings = getCravings()
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000
  
  // 今天的烟瘾
  const todayCravings = cravings.filter(c => {
    const d = new Date(c.timestamp)
    const today = new Date()
    return d.toDateString() === today.toDateString()
  })
  
  // 本周烟瘾
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const weekCravings = cravings.filter(c => c.timestamp >= weekStart.getTime())
  
  // 烟瘾强度分布
  const intensityDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  cravings.forEach(c => {
    if (c.intensity && intensityDist[c.intensity] !== undefined) {
      intensityDist[c.intensity]++
    }
  })
  
  // 触发因素统计
  const triggers = {}
  cravings.forEach(c => {
    if (c.trigger) {
      triggers[c.trigger] = (triggers[c.trigger] || 0) + 1
    }
  })
  
  return {
    total: cravings.length,
    today: todayCravings.length,
    thisWeek: weekCravings.length,
    intensityDist,
    triggers
  }
}

// ---- 每日挑战 ----
const CHALLENGE_TEMPLATES = [
  { id: 'limit_3', title: '今日不超过3根', desc: '控制吸烟量在3根以内', type: 'limit', target: 3, icon: '🎯' },
  { id: 'limit_2', title: '今日不超过2根', desc: '进一步减少吸烟量', type: 'limit', target: 2, icon: '🎯' },
  { id: 'limit_1', title: '今日只抽1根', desc: '极限挑战，只抽1根', type: 'limit', target: 1, icon: '🎯' },
  { id: 'save_10', title: '省下10块钱', desc: '减少吸烟节省10元', type: 'save', target: 10, icon: '💰' },
  { id: 'save_20', title: '省下20块钱', desc: '减少吸烟节省20元', type: 'save', target: 20, icon: '💰' },
  { id: 'no_smoke_morning', title: '上午不抽烟', desc: '从起床到中午12点不吸烟', type: 'time_range', target: { start: 0, end: 12 }, icon: '☀️' },
  { id: 'no_smoke_afternoon', title: '下午不抽烟', desc: '从中午12点到晚上6点不吸烟', type: 'time_range', target: { start: 12, end: 18 }, icon: '🌤️' },
  { id: 'delay_1h', title: '延迟1小时', desc: '想抽烟时等待1小时再决定', type: 'delay', target: 60, icon: '⏰' },
  { id: 'resist_3', title: '抵抗3次烟瘾', desc: '成功抵抗3次烟瘾来袭', type: 'resist', target: 3, icon: '💪' },
  { id: 'resist_5', title: '抵抗5次烟瘾', desc: '成功抵抗5次烟瘾来袭', type: 'resist', target: 5, icon: '💪' }
]

export function getDailyChallenge() {
  const today = _todayStr()
  const challenges = _read(KEYS.challenges, {})
  
  // 如果今天还没有挑战，生成一个新的
  if (!challenges[today] || challenges[today].date !== today) {
    // 基于日期的哈希取模（原来用 parseInt(日期) % 10，只会按日期尾号循环，
    // 每天结果可预测且分布不均）
    const seed = _hashString(today) % CHALLENGE_TEMPLATES.length
    const template = CHALLENGE_TEMPLATES[seed]
    
    challenges[today] = {
      date: today,
      challengeId: template.id,
      title: template.title,
      desc: template.desc,
      type: template.type,
      target: template.target,
      icon: template.icon,
      completed: false,
      progress: 0
    }
    _write(KEYS.challenges, challenges)
  }
  
  return challenges[today]
}

/**
 * 更新今日挑战进度并判定完成。
 * progress 语义按类型而定：
 *   limit      → 今日已抽根数
 *   save       → 今日已省金额
 *   resist     → 今日成功抵抗次数
 *   time_range → 该时段内抽烟根数
 *   delay      → 已坚持分钟数
 * 注意：limit / time_range 属于「全天达标」型，当天没过完不能提前判定完成，
 * 由 settlePastChallenges() 在次日结算；超限则立即标记 failed。
 */
export function updateChallengeProgress(progress) {
  const today = _todayStr()
  const challenges = _read(KEYS.challenges, {})
  const challenge = challenges[today]
  if (!challenge) return null

  challenge.progress = progress

  if (challenge.type === 'limit') {
    challenge.failed = progress > challenge.target
    challenge.completed = false
  } else if (challenge.type === 'save') {
    challenge.completed = progress >= challenge.target
  } else if (challenge.type === 'resist') {
    challenge.completed = progress >= challenge.target
  } else if (challenge.type === 'time_range') {
    challenge.failed = progress > 0
    challenge.completed = false
  } else if (challenge.type === 'delay') {
    challenge.completed = progress >= challenge.target
  }

  _write(KEYS.challenges, challenges)
  return challenge
}

// 结算已过期日期的挑战（limit / time_range 需等当天结束后才能判定）
export function settlePastChallenges() {
  const today = _todayStr()
  const challenges = _read(KEYS.challenges, {})
  let changed = false

  Object.keys(challenges).forEach(date => {
    const c = challenges[date]
    if (!c || date >= today) return
    if (c.completed || c.failed) return
    const progress = c.progress == null ? 0 : c.progress

    if (c.type === 'limit') {
      c.completed = progress <= c.target
      changed = true
    } else if (c.type === 'time_range') {
      c.completed = progress === 0
      changed = true
    }
  })

  if (changed) _write(KEYS.challenges, challenges)
  return challenges
}

export function getChallengeStreak() {
  settlePastChallenges()
  const challenges = _read(KEYS.challenges, {})
  const today = _todayStr()
  // 只保留日期格式的键，按字典序倒序（YYYY-MM-DD 字典序 = 时间序）
  const dates = Object.keys(challenges)
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .reverse()

  // 今天的挑战如果还没结算（limit / time_range 类要等当天过完），
  // 就跳过今天、从昨天往前数——否则这类挑战当天永远 completed=false，
  // streak 永远显示 0。
  const todayDone = !!(challenges[today] && challenges[today].completed)
  let expectDiff = todayDone ? 0 : 1

  let streak = 0
  for (let i = 0; i < dates.length; i++) {
    const diffDays = _diffDays(dates[i], today)
    if (diffDays < expectDiff) continue // 跳过未结算的今天
    if (diffDays === expectDiff && challenges[dates[i]].completed) {
      streak++
      expectDiff++
    } else {
      break
    }
  }

  return streak
}

// ---- 情绪日记 ----
export function getMoods() {
  return _read(KEYS.moods, [])
}

export function addMood(mood) {
  const list = getMoods()
  list.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: Date.now(),
    ...mood
  })
  if (list.length > 300) list.length = 300
  _write(KEYS.moods, list)
}

export function getMoodStats() {
  const moods = getMoods()
  const moodDist = { happy: 0, calm: 0, anxious: 0, sad: 0, angry: 0, bored: 0 }
  
  moods.forEach(m => {
    if (m.mood && moodDist[m.mood] !== undefined) {
      moodDist[m.mood]++
    }
  })
  
  // 吸烟时的情绪 vs 不吸烟时的情绪
  const smokingMoods = moods.filter(m => m.smoked)
  const nonSmokingMoods = moods.filter(m => !m.smoked)
  
  return {
    total: moods.length,
    moodDist,
    smokingMoods: smokingMoods.length,
    nonSmokingMoods: nonSmokingMoods.length
  }
}

// ---- 省钱目标 ----
export function getSavingsGoals() {
  return _read(KEYS.savingsGoals, [])
}

export function addSavingsGoal(goal) {
  const list = getSavingsGoals()
  list.push({
    id: Date.now().toString(36),
    createdAt: Date.now(),
    ...goal
  })
  _write(KEYS.savingsGoals, list)
}

export function updateSavingsGoal(id, updates) {
  const list = getSavingsGoals()
  const idx = list.findIndex(g => g.id === id)
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...updates }
    _write(KEYS.savingsGoals, list)
  }
}

// ---- 时间胶囊 ----
export function getTimeCapsules() {
  return _read(KEYS.timeCapsules, [])
}

export function addTimeCapsule(capsule) {
  const list = getTimeCapsules()
  list.push({
    id: Date.now().toString(36),
    createdAt: Date.now(),
    ...capsule
  })
  _write(KEYS.timeCapsules, list)
}

// ---- 虚拟宠物 ----
const clamp100 = (v) => Math.max(0, Math.min(100, v))

export function getPet() {
  return _read(KEYS.pet, {
    name: '小烟',
    health: 100,
    happiness: 100,
    level: 1,
    exp: 0,
    lastFed: Date.now()
  })
}

export function savePet(pet) {
  _write(KEYS.pet, pet)
}

// 增加经验并按需连升多级，返回升级次数
function addExp(pet, amount) {
  let levels = 0
  pet.exp += amount
  while (pet.exp >= pet.level * 100) {
    pet.exp -= pet.level * 100
    pet.level++
    levels++
  }
  return levels
}

// 抽烟伤害宠物（不掉经验）：把「伤害自己」具象成「伤害伙伴」
export function harmPet(healthD, happyD) {
  const pet = getPet()
  pet.health = clamp100(pet.health + healthD)
  pet.happiness = clamp100(pet.happiness + happyD)
  savePet(pet)
  return pet
}

// 互动：摸摸宠物，回点血/快乐 + 少量经验
export function petPet() {
  const pet = getPet()
  pet.happiness = clamp100(pet.happiness + 4)
  pet.health = clamp100(pet.health + 2)
  addExp(pet, 5)
  savePet(pet)
  return pet
}

// 每日恢复：昨天一整天没抽烟才回血回快乐并给经验（戒烟的正反馈）。
// 之前只判断「今天抽没抽」且没有日期锁，每次进宠物页都会 +12 经验，可无限刷级；
// 而且今天刚开始抽没抽就判「无烟日」也不合理，改为结算「昨天」。
export function recoverPetDaily() {
  const pet = getPet()
  const today = _todayStr()
  const yesterday = _shiftDays(today, -1)

  // 同一天只结算一次
  if (pet.lastRecoverDate === yesterday) return pet

  const history = getHistory()
  const smokedYesterday = history.some(r => r && r.timestamp && _todayStr(r.timestamp) === yesterday)

  // 第一次进入（还没有历史）时不做补算，直接把游标拨到昨天
  if (!pet.lastRecoverDate && !history.length) {
    pet.lastRecoverDate = yesterday
    savePet(pet)
    return pet
  }

  pet.lastRecoverDate = yesterday

  if (!smokedYesterday) {
    pet.health = clamp100(pet.health + 12)
    pet.happiness = clamp100(pet.happiness + 10)
    addExp(pet, 12)
  }

  pet.lastFed = Date.now()
  savePet(pet)
  return pet
}

// 兼容旧调用：正向经验与升级
export function updatePetHealth(delta) {
  const pet = getPet()
  pet.health = clamp100(pet.health + delta)
  pet.happiness = clamp100(pet.happiness + delta)
  addExp(pet, 10)
  savePet(pet)
  return pet
}

// ---- 广告奖励：额外配额 ----
export function getAdRewards() {
  return _read(KEYS.adRewards, { extraQuota: 0, lastResetDate: _todayStr() })
}

// 获取今日额外配额（看广告获得的 +1）
export function getExtraQuota() {
  const rewards = getAdRewards()
  // 跨天重置
  if (rewards.lastResetDate !== _todayStr()) {
    rewards.extraQuota = 0
    rewards.lastResetDate = _todayStr()
    _write(KEYS.adRewards, rewards)
  }
  return rewards.extraQuota || 0
}

// 看广告获得额外配额 +1
export function addExtraQuota() {
  const rewards = getAdRewards()
  if (rewards.lastResetDate !== _todayStr()) {
    rewards.extraQuota = 0
    rewards.lastResetDate = _todayStr()
  }
  rewards.extraQuota += 1
  _write(KEYS.adRewards, rewards)
  return rewards.extraQuota
}

// 获取含额外配额的有效配额
export function getEffectiveQuota() {
  const settings = getSettings()
  return settings.dailyQuota + getExtraQuota()
}

// ---- 广告奖励：烟盒皮肤 ----
// 烟身贴纸列表
const STICKER_LIST = [
  // 文字系列
  { id: 'text-lucky', name: '幸运', type: 'text', content: '幸运', rarity: 'common', icon: '🍀' },
  { id: 'text-cool', name: '冷酷', type: 'text', content: 'COOL', rarity: 'common', icon: '😎' },
  { id: 'text-love', name: '爱情', type: 'text', content: 'LOVE', rarity: 'rare', icon: '💕' },
  { id: 'text-king', name: '王者', type: 'text', content: 'KING', rarity: 'rare', icon: '👑' },
  { id: 'text-dream', name: '梦想', type: 'text', content: '梦想', rarity: 'epic', icon: '🌟' },
  { id: 'text-free', name: '自由', type: 'text', content: 'FREE', rarity: 'epic', icon: '🕊️' },
  // 图案系列
  { id: 'pattern-stripes', name: '条纹', type: 'pattern', content: 'stripes', rarity: 'common', icon: '📊' },
  { id: 'pattern-grid', name: '格子', type: 'pattern', content: 'grid', rarity: 'common', icon: '🔲' },
  { id: 'pattern-wave', name: '波浪', type: 'pattern', content: 'wave', rarity: 'rare', icon: '🌊' },
  { id: 'pattern-heart', name: '爱心', type: 'pattern', content: 'heart', rarity: 'rare', icon: '💖' },
  { id: 'pattern-star', name: '星空', type: 'pattern', content: 'stars', rarity: 'epic', icon: '✨' },
  // Emoji 系列
  { id: 'emoji-fire', name: '火焰', type: 'emoji', content: '🔥', rarity: 'common', icon: '🔥' },
  { id: 'emoji-star', name: '星星', type: 'emoji', content: '⭐', rarity: 'common', icon: '⭐' },
  { id: 'emoji-dragon', name: '龙', type: 'emoji', content: '🐉', rarity: 'rare', icon: '🐉' },
  { id: 'emoji-phoenix', name: '凤凰', type: 'emoji', content: '🦅', rarity: 'epic', icon: '🦅' },
  { id: 'emoji-rose', name: '玫瑰', type: 'emoji', content: '🌹', rarity: 'rare', icon: '🌹' },
  { id: 'emoji-skull', name: '骷髅', type: 'emoji', content: '💀', rarity: 'legendary', icon: '💀' }
]

// 获取当前选中的贴纸信息
export function getActiveSticker() {
  const stickers = getStickers()
  if (!stickers.selected) return null
  return STICKER_LIST.find(s => s.id === stickers.selected) || null
}

// 兼容旧名称（皮肤 = 贴纸）
export function getActiveSkin() {
  return getActiveSticker()
}

export function getStickers() {
  return _read(KEYS.stickers, { unlocked: ['text-lucky'], selected: 'text-lucky' })
}

export function saveStickers(stickers) {
  _write(KEYS.stickers, stickers)
}

export function getUnlockedStickers() {
  return getStickers().unlocked || []
}

export function getSelectedSticker() {
  return getStickers().selected
}

// 解锁指定贴纸
export function unlockSticker(stickerId) {
  const stickers = getStickers()
  if (stickers.unlocked.includes(stickerId)) return { success: false, msg: '已解锁' }
  const sticker = STICKER_LIST.find(s => s.id === stickerId)
  if (!sticker) return { success: false, msg: '贴纸不存在' }
  stickers.unlocked.push(stickerId)
  saveStickers(stickers)
  return { success: true, sticker }
}

// 随机解锁一个贴纸
export function unlockRandomSticker() {
  const stickers = getStickers()
  const locked = STICKER_LIST.filter(s => !stickers.unlocked.includes(s.id))
  if (locked.length === 0) return { success: false, msg: '已解锁全部贴纸' }
  const sticker = locked[Math.floor(Math.random() * locked.length)]
  stickers.unlocked.push(sticker.id)
  saveStickers(stickers)
  return { success: true, sticker }
}

export function selectSticker(stickerId) {
  const stickers = getStickers()
  if (stickerId === null || stickers.unlocked.includes(stickerId)) {
    stickers.selected = stickerId
    saveStickers(stickers)
    return true
  }
  return false
}

export function getStickerList() {
  const stickers = getStickers()
  return STICKER_LIST.map(s => ({
    ...s,
    unlocked: stickers.unlocked.includes(s.id),
    selected: stickers.selected === s.id
  }))
}

// ---- 广告奖励：宠物加速 ----
export function petAccelerate() {
  const pet = getPet()
  addExp(pet, 50)  // 额外 +50 经验
  pet.happiness = Math.min(100, pet.happiness + 10)
  savePet(pet)
  return pet
}

// ---- 背景解锁系统 ----
const BG_LIST = {
  // 品牌页背景
  brand: [
    { id: 'default', name: '默认黑夜', type: 'brand', css: 'background: #0f0f0f', rarity: 'common' },
    { id: 'city-night', name: '霓虹都市', type: 'brand', css: 'background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', rarity: 'rare' },
    { id: 'sunset', name: '落日余晖', type: 'brand', css: 'background: linear-gradient(135deg, #1a0a0a 0%, #4a1a2e 40%, #2d1b3d 100%)', rarity: 'rare' },
    { id: 'forest', name: '暗夜森林', type: 'brand', css: 'background: linear-gradient(135deg, #0a1a0a 0%, #1a2e1a 50%, #0f1f0f 100%)', rarity: 'common' },
    { id: 'ocean', name: '深海之蓝', type: 'brand', css: 'background: linear-gradient(135deg, #0a0f1a 0%, #0d2137 50%, #0a1628 100%)', rarity: 'rare' },
    { id: 'aurora', name: '极光之夜', type: 'brand', css: 'background: linear-gradient(135deg, #0a0f1a 0%, #1a2e4a 30%, #2d1b4e 60%, #0f1a2e 100%)', rarity: 'epic' },
    { id: 'cyber', name: '赛博朋克', type: 'brand', css: 'background: linear-gradient(135deg, #0a0015 0%, #1a0033 40%, #330044 70%, #0a0015 100%)', rarity: 'epic' },
    { id: 'gold-luxury', name: '金色奢华', type: 'brand', css: 'background: linear-gradient(135deg, #1a1400 0%, #2a2000 50%, #1a1400 100%)', rarity: 'legendary' }
  ],
  // 吸烟页背景
  smoking: [
    { id: 'default', name: '暗夜寂静', type: 'smoking', css: 'background: #0f0f0f', rarity: 'common' },
    { id: 'rainy', name: '雨夜窗边', type: 'smoking', css: 'background: linear-gradient(160deg, #0c1929 0%, #162a43 40%, #0d1a2d 100%)', rarity: 'rare' },
    { id: 'neon', name: '霓虹都市', type: 'smoking', css: 'background: linear-gradient(160deg, #0f0020 0%, #1a0040 30%, #2d0050 60%, #0f0020 100%)', rarity: 'rare' },
    { id: 'bar', name: '威士忌酒吧', type: 'smoking', css: 'background: linear-gradient(160deg, #1a0e00 0%, #2e1a05 40%, #1a0f02 100%)', rarity: 'rare' },
    { id: 'aurora', name: '北极光', type: 'smoking', css: 'background: linear-gradient(160deg, #020818 0%, #0a1e3d 30%, #0d3a2e 60%, #020818 100%)', rarity: 'epic' },
    { id: 'space', name: '星际漫游', type: 'smoking', css: 'background: radial-gradient(ellipse at 30% 20%, #1a0a3e 0%, #0a0a1a 40%, #000005 100%)', rarity: 'epic' },
    { id: 'underwater', name: '深海幻境', type: 'smoking', css: 'background: linear-gradient(160deg, #001830 0%, #003050 35%, #002040 65%, #000e20 100%)', rarity: 'epic' },
    { id: 'volcano', name: '烈焰熔岩', type: 'smoking', css: 'background: linear-gradient(160deg, #1a0000 0%, #300800 35%, #1a0500 70%, #0a0000 100%)', rarity: 'epic' },
    { id: 'sakura', name: '樱花月夜', type: 'smoking', css: 'background: linear-gradient(160deg, #1a0a1e 0%, #2d1030 35%, #1a0820 70%, #0f0515 100%)', rarity: 'legendary' },
    { id: 'zen', name: '禅境枯山水', type: 'smoking', css: 'background: linear-gradient(160deg, #18180f 0%, #252518 40%, #1a1a10 70%, #0e0e08 100%)', rarity: 'legendary' }
  ]
}

export function getBackgrounds() {
  return _read(KEYS.backgrounds, { unlocked: { brand: ['default'], smoking: ['default'] }, selected: { brand: 'default', smoking: 'default' } })
}

export function saveBackgrounds(bgs) {
  _write(KEYS.backgrounds, bgs)
}

export function getBackgroundList(type) {
  const bgs = getBackgrounds()
  const list = BG_LIST[type] || []
  return list.map(bg => ({
    ...bg,
    unlocked: (bgs.unlocked[type] || []).includes(bg.id),
    selected: bgs.selected[type] === bg.id
  }))
}

export function getActiveBackground(type) {
  const bgs = getBackgrounds()
  const selectedId = bgs.selected[type] || 'default'
  const list = BG_LIST[type] || []
  return list.find(bg => bg.id === selectedId) || list[0]
}

// 解锁指定背景
export function unlockBackground(type, bgId) {
  const bgs = getBackgrounds()
  if (!bgs.unlocked[type]) bgs.unlocked[type] = ['default']
  if (bgs.unlocked[type].includes(bgId)) return { success: false, msg: '已解锁' }
  const list = BG_LIST[type] || []
  const bg = list.find(b => b.id === bgId)
  if (!bg) return { success: false, msg: '背景不存在' }
  bgs.unlocked[type].push(bgId)
  saveBackgrounds(bgs)
  return { success: true, bg }
}

// 随机解锁一个背景（保留兼容）
export function unlockRandomBackground(type) {
  const bgs = getBackgrounds()
  if (!bgs.unlocked[type]) bgs.unlocked[type] = ['default']
  const list = BG_LIST[type] || []
  const locked = list.filter(bg => !bgs.unlocked[type].includes(bg.id))
  if (locked.length === 0) return { success: false, msg: '已解锁全部背景' }
  const bg = locked[Math.floor(Math.random() * locked.length)]
  bgs.unlocked[type].push(bg.id)
  saveBackgrounds(bgs)
  return { success: true, bg }
}

export function selectBackground(type, bgId) {
  const bgs = getBackgrounds()
  if (!bgs.unlocked[type] || !bgs.unlocked[type].includes(bgId)) return false
  if (!bgs.selected) bgs.selected = {}
  bgs.selected[type] = bgId
  saveBackgrounds(bgs)
  return true
}

export function getAllBackgrounds() {
  return BG_LIST
}


// ---- 吐烟样式解锁 ----
const SMOKE_STYLE_NAMES = ['烟圈', '爱心形', '龙卷风', '星形', '蘑菇云', '双螺旋', '烟花扩散', '蛇形蜿蜒', '水母状', '文字烟雾', '瀑布流', '分散飘散']
const SMOKE_STYLE_ICONS = ['🌀', '❤️', '🌪️', '⭐', '🍄', '🧬', '🎆', '🐍', '🪼', '✨', '🌊', '💨']

function getSmokeStyles() {
  const fallback = { unlocked: [0], selected: 0 }
  return { ...fallback, ..._read(KEYS.smokeStyles, fallback) }
}

function saveSmokeStyles(data) {
  _write(KEYS.smokeStyles, data)
}

export function unlockSmokeStyle(idx) {
  const styles = getSmokeStyles()
  if (styles.unlocked.includes(idx)) return { success: false, msg: '已解锁' }
  if (idx < 0 || idx >= SMOKE_STYLE_NAMES.length) return { success: false, msg: '样式不存在' }
  styles.unlocked.push(idx)
  saveSmokeStyles(styles)
  return { success: true, name: SMOKE_STYLE_NAMES[idx], icon: SMOKE_STYLE_ICONS[idx] }
}

export function selectSmokeStyle(idx) {
  const styles = getSmokeStyles()
  // 未解锁的样式不能选中（之前缺校验，可以直接选中未解锁项）
  if (!styles.unlocked.includes(idx)) return false
  styles.selected = idx
  saveSmokeStyles(styles)
  return true
}

export function getSmokeStyleList() {
  const styles = getSmokeStyles()
  return SMOKE_STYLE_NAMES.map((name, idx) => ({
    idx,
    name,
    icon: SMOKE_STYLE_ICONS[idx],
    unlocked: styles.unlocked.includes(idx),
    selected: styles.selected === idx
  }))
}

export function getSelectedSmokeStyle() {
  const styles = getSmokeStyles()
  return styles.selected || 0
}

// 供页面复用的日期工具（内部用带下划线版本，这里导出别名）
export const todayStr = _todayStr
export const shiftDays = _shiftDays
export const diffDays = _diffDays


// ---- 主题 ----
export function getTheme() {
  return _read(KEYS.theme, 'amber')
}

export function setTheme(id) {
  _write(KEYS.theme, id)
}

// ---- 宠物装扮系统 ----
const PET_ACCESSORY_LIST = [
  // 头部装扮
  { id: 'crown', name: '皇冠', slot: 'head', type: 'crown', rarity: 'legendary', icon: '👑', unlockLevel: 4 },
  { id: 'top-hat', name: '礼帽', slot: 'head', type: 'tophat', rarity: 'epic', icon: '🎩', unlockLevel: 6 },
  { id: 'bow', name: '蝴蝶结', slot: 'head', type: 'bow', rarity: 'rare', icon: '🎀', unlockLevel: 3 },
  { id: 'flower', name: '花朵', slot: 'head', type: 'flower', rarity: 'common', icon: '🌸' },
  
  // 眼睛装扮
  { id: 'glasses', name: '眼镜', slot: 'eyes', type: 'glasses', rarity: 'common', icon: '👓' },
  { id: 'sunglasses', name: '墨镜', slot: 'eyes', type: 'sunglasses', rarity: 'rare', icon: '🕶️', unlockLevel: 2 },
  { id: 'monocle', name: '单片眼镜', slot: 'eyes', type: 'monocle', rarity: 'epic', icon: '🧐', unlockLevel: 5 },
  
  // 颈部装扮
  { id: 'bowtie', name: '领结', slot: 'neck', type: 'bowtie', rarity: 'common', icon: '🎀' },
  { id: 'necklace', name: '项链', slot: 'neck', type: 'necklace', rarity: 'rare', icon: '📿', unlockLevel: 7 },
  { id: 'scarf', name: '围巾', slot: 'neck', type: 'scarf', rarity: 'epic', icon: '🧣', unlockLevel: 8 },
  { id: 'collar', name: '项圈', slot: 'neck', type: 'collar', rarity: 'common', icon: '⭕', unlockLevel: 9 }
]

export function getPetAccessories() {
  return _read(KEYS.petAccessories, { unlocked: ['flower', 'glasses', 'bowtie'], equipped: {} })
}

export function savePetAccessories(data) {
  _write(KEYS.petAccessories, data)
}

export function getPetAccessoryList() {
  const data = getPetAccessories()
  const pet = getPet()
  return PET_ACCESSORY_LIST.map(item => ({
    ...item,
    unlocked: data.unlocked.includes(item.id) || (item.unlockLevel && pet.level >= item.unlockLevel),
    equipped: data.equipped[item.slot] === item.id
  }))
}

export function unlockPetAccessory(accessoryId) {
  const data = getPetAccessories()
  if (data.unlocked.includes(accessoryId)) return { success: false, msg: '已解锁' }
  const accessory = PET_ACCESSORY_LIST.find(a => a.id === accessoryId)
  if (!accessory) return { success: false, msg: '装扮不存在' }
  data.unlocked.push(accessoryId)
  savePetAccessories(data)
  return { success: true, accessory }
}

export function equipPetAccessory(accessoryId) {
  const data = getPetAccessories()
  const accessory = PET_ACCESSORY_LIST.find(a => a.id === accessoryId)
  if (!accessory) return false
  if (!data.unlocked.includes(accessoryId)) return false
  
  // 装备到对应槽位
  data.equipped[accessory.slot] = accessoryId
  savePetAccessories(data)
  return true
}

export function unequipPetAccessory(slot) {
  const data = getPetAccessories()
  delete data.equipped[slot]
  savePetAccessories(data)
  return true
}

export function getEquippedAccessories() {
  const data = getPetAccessories()
  const equipped = {}
  for (const [slot, id] of Object.entries(data.equipped)) {
    const accessory = PET_ACCESSORY_LIST.find(a => a.id === id)
    if (accessory) {
      equipped[slot] = accessory
    }
  }
  return equipped
}


export default {
  BRANDS,
  todayStr, parseLocalDate, shiftDays, diffDays,
  getSettings, saveSettings,
  getToday, saveToday,
  getHistory, addHistory, updateLastSmokeDuration,
  getStats, saveStats,
  canSmoke, getCooldownRemain,
  recordSmoke, incrementStat, markStyleUsed,
  getSmokeStreak,
  getBrandSmokedCount, getBrandRemaining,
  getBrandPackSize, getBrandPricePerCig,
  getPackSize, getPackRemaining, savePackRemaining, refillPack,
  settleDailySavings, getTodaySaved,
  getSmokeFreeDuration, getCleanDays,
  getSavedMoney, getLessSmoked,
  BADGE_LIST, getBadgeList, syncBadges, buildBadgeStats,
  migrateIfNeeded, recomputeSavedFromHistory,
  getUnlockedBadges, saveUnlockedBadges, unlockBadge,
  getCravings, addCraving, getCravingStats,
  getDailyChallenge, updateChallengeProgress, getChallengeStreak, settlePastChallenges,
  getMoods, addMood, getMoodStats,
  getSavingsGoals, addSavingsGoal, updateSavingsGoal,
  getTimeCapsules, addTimeCapsule,
  getPet, savePet, updatePetHealth, harmPet, recoverPetDaily, petPet,
  getAdRewards, getExtraQuota, addExtraQuota, getEffectiveQuota,
  unlockRandomSticker, unlockSticker, selectSticker, getStickerList, getActiveSticker, getActiveSkin,
  petAccelerate,
  getBackgrounds, saveBackgrounds, getBackgroundList, getActiveBackground,
  unlockRandomBackground, unlockBackground, selectBackground, getAllBackgrounds,
  getSmokeStyles, saveSmokeStyles, unlockSmokeStyle, selectSmokeStyle, getSmokeStyleList, getSelectedSmokeStyle,
  getPetAccessories, savePetAccessories, getPetAccessoryList, unlockPetAccessory, equipPetAccessory, unequipPetAccessory, getEquippedAccessories,
  getTheme, setTheme,
  resetAll
}
