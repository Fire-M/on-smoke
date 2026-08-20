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
  theme: 'os_theme'
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
  stats.totalSmoked += 1
  const pricePerCig = settings.cigarettePrice / settings.packSize
  stats.totalSaved = (stats.totalSaved || 0) + pricePerCig
  saveStats(stats)

  // 抽烟会伤害宠物伙伴
  harmPet(-8, -6)
}

// 获取某品牌今日吸烟次数
export function getBrandSmokedCount(brandId) {
  const today = getToday()
  if (!today.brandCounts || !today.brandCounts[brandId]) return 0
  return today.brandCounts[brandId]
}

// 获取某品牌今日剩余数量（按一包支数计算）
export function getBrandRemaining(brandId) {
  const settings = getSettings()
  const quota = settings.packSize || 20
  const smoked = getBrandSmokedCount(brandId)
  return Math.max(0, quota - smoked)
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
    // 基于日期生成伪随机索引
    const dateNum = today.split('-').join('')
    const seed = parseInt(dateNum) % CHALLENGE_TEMPLATES.length
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

export function updateChallengeProgress(progress) {
  const today = _todayStr()
  const challenges = _read(KEYS.challenges, {})
  
  if (challenges[today]) {
    challenges[today].progress = progress
    
    // 检查是否完成
    const challenge = challenges[today]
    if (challenge.type === 'limit' && progress <= challenge.target) {
      challenge.completed = true
    } else if (challenge.type === 'save' && progress >= challenge.target) {
      challenge.completed = true
    } else if (challenge.type === 'resist' && progress >= challenge.target) {
      challenge.completed = true
    }
    
    _write(KEYS.challenges, challenges)
  }
}

export function getChallengeStreak() {
  const challenges = _read(KEYS.challenges, {})
  const dates = Object.keys(challenges).sort().reverse()
  
  let streak = 0
  const today = new Date()
  
  for (let i = 0; i < dates.length; i++) {
    const date = new Date(dates[i])
    const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24))
    
    if (diffDays === i && challenges[dates[i]].completed) {
      streak++
    } else if (diffDays > i) {
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

// 每日恢复：今天没抽烟则缓慢回血回快乐并获取经验（戒烟的正反馈）
export function recoverPetDaily() {
  const pet = getPet()
  const today = getToday()
  if (today.smokedCount === 0) {
    pet.health = clamp100(pet.health + 4)
    pet.happiness = clamp100(pet.happiness + 4)
    addExp(pet, 12)
    pet.lastFed = Date.now()
    savePet(pet)
  }
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
  styles.selected = idx
  saveSmokeStyles(styles)
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
  getSettings, saveSettings,
  getToday, saveToday,
  getHistory, addHistory,
  getStats, saveStats,
  canSmoke, getCooldownRemain,
  recordSmoke,
  getBrandSmokedCount, getBrandRemaining,
  getSmokeFreeDuration, getCleanDays,
  getSavedMoney, getLessSmoked,
  getUnlockedBadges, saveUnlockedBadges, unlockBadge,
  getCravings, addCraving, getCravingStats,
  getDailyChallenge, updateChallengeProgress, getChallengeStreak,
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
