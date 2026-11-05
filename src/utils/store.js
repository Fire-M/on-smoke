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
  packsCompleted: 'os_packs_completed',
  savingsSettle: 'os_savings_settle',
  resists: 'os_resists'
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
const DATA_VERSION = 5

// ---- 品牌单一数据源（页面与剩余计算共用，避免口径分裂）----
// 品牌全部为虚构，命名刻意避开任何真实烟草品牌（含谐音、近似字），
// 否则容易被认定为变相烟草广告 —— 广告法明令禁止烟草广告。
// id 保持不变：老用户已存的抽烟记录是按 id 记的，改 id 会导致历史对不上。
export const BRANDS = [
  { id: 'lanhe', cn: '蓝汐', en: 'LAN·XI', price: 50, theme: 'blue', tag: '冰凉回甘·空气味', quote: '假装自己很高级', packSize: 20 },
  { id: 'hongta', cn: '丹霞', en: 'DAN·XIA', price: 88, theme: 'red', tag: '浓郁·想象味', quote: '送礼倍有面（的空气）', packSize: 20 },
  { id: 'heiye', cn: '胖达666', en: 'PANDA666', price: 100, theme: 'black', tag: '顶配·都是心理味', quote: '国宝都戒了你还抽？', packSize: 20 },
  { id: 'jinsi', cn: '羊驼', en: 'LLAMA', price: 22, theme: 'gold', tag: '粗犷·沙漠风', quote: '沙漠来的，跟任何真品牌都没关系', packSize: 20 },
  { id: 'qingyun', cn: '冰河', en: 'ICE·RIVER', price: 35, theme: 'lightblue', tag: '薄荷冰爆·脑瓜疼', quote: '爆珠一捏，感觉良好', packSize: 20 },
  { id: 'zimeng', cn: '紫雾', en: 'PURPLE', price: 45, theme: 'purple', tag: '淡雅·朕的味道', quote: '烟盒比烟好看', packSize: 20 },
  // 后续品牌按价格从低到高排，方便在列表里一眼看出「便宜的解馋，贵的装腔」
  { id: 'qingping', cn: '青萍', en: 'QING·PING', price: 26, theme: 'green', tag: '雨后青草·纯想象', quote: '闻着像公园，抽着像后悔', packSize: 20 },
  { id: 'naitang', cn: '奶糖', en: 'NAI·TANG', price: 30, theme: 'pink', tag: '甜腻·童年味', quote: '小时候偷抽的那根，原来是甜的', packSize: 20 },
  { id: 'jiuxiang', cn: '旧巷', en: 'JIU·XIANG', price: 36, theme: 'brown', tag: '潮湿·回忆味', quote: '巷子口的那根烟，早熄了', packSize: 20 },
  { id: 'nihong', cn: '霓虹', en: 'NI·HONG', price: 48, theme: 'magenta', tag: '深夜·电子味', quote: '闪一整晚，天亮就空', packSize: 20 },
  { id: 'baige', cn: '白鸽', en: 'BAI·GE', price: 58, theme: 'silver', tag: '轻盈·广场味', quote: '放它走吧，也放自己一马', packSize: 20 },
  { id: 'shenhai', cn: '深海', en: 'SHEN·HAI', price: 78, theme: 'navy', tag: '幽暗·压力味', quote: '越深越贵，越贵越深', packSize: 20 }
]

// 每个 theme 当前唯一对应一个品牌。把视觉/数值属性按 theme 映射注入，
// 比在 12 行里各加 4 个字段好维护，也避免改到历史记录依赖的 id。
// smoke  —— 抽烟页 canvas 烟雾粒子的基色（让「你抽的牌子决定烟啥颜色」）
// accent —— 首页「今日口粮」强调色、图鉴亮块的填充色
// relax  —— 纯虚构的「解压指数」1~5，给「今天抽哪包」一点策略性
// tar    —— 纯虚构的「焦油感」低/中/高
// emoji  —— 各品牌专属符号（图鉴亮块角标 + 小传弹层）
// series —— 所属系列（冷/暖/甜/暗夜），集齐一套给收集中段目标
// bio    —— 图鉴解锁后的虚构小传，靠叙事而非数值驱动「试遍」
// smokePreset —— 烟雾「性格」参数：浮力/湍流/粒径/浓度/寿命，让不同牌子吐的烟真不一样
// defStyle —— 默认吐烟形态（匹配 smoking.vue 的 smokeStyleNames），开抽自动是这个形状
// openLine —— 进入抽烟页的开盒毒舌；endLine —— 抽完一根的收尾毒舌（维持自嘲调性）
const BRAND_VISUAL = {
  blue:      { smoke: '#9ecbff', accent: '#3b82f6', relax: 3, tar: '中', emoji: '❄️',  series: 'cold',  bio: '据说产自北纬40°的一阵风，喝起来像把冰箱门焊脸上。主打「假装自己很高级」。', smokePreset: { buoyancy: 96, turbStrength: 40, rMin: 10, rMax: 20, alphaMax: 0.05, growRate: 30 }, defStyle: '分散飘散', openLine: '开盒即降温，钱包也凉了', endLine: '又一根，假装高级续上了' },
  red:       { smoke: '#ffb4a8', accent: '#ef4444', relax: 2, tar: '高', emoji: '🔥',  series: 'warm',  bio: '包装红得像要发红包，实际只是空气。送人倍有面，自己抽倍心虚。', smokePreset: { buoyancy: 70, turbStrength: 70, rMin: 14, rMax: 26, alphaMax: 0.08, growRate: 38 }, defStyle: '烟花扩散', openLine: '这盒红得，像要给你发红包', endLine: '面子里子都没了，就剩空气' },
  black:     { smoke: '#cbd5e1', accent: '#6b7280', relax: 2, tar: '高', emoji: '🐼',  series: 'night', bio: '国宝同款心理价位。抽它的时候，请先确认自己不是被保护的物种。', smokePreset: { buoyancy: 52, turbStrength: 30, rMin: 16, rMax: 30, alphaMax: 0.09, growRate: 40, lifeMin: 4.2, lifeMax: 6.4 }, defStyle: '蘑菇云', openLine: '国宝同款，但你不是国宝', endLine: '国宝看了都摇头' },
  gold:      { smoke: '#f0d68a', accent: '#d4a017', relax: 4, tar: '中', emoji: '🦙',  series: 'warm',  bio: '从沙漠一路吐口水过来的牌子。和任何真牌子没关系，和任何一种骆驼也没关系。', smokePreset: { buoyancy: 80, turbStrength: 96, rMin: 12, rMax: 22, alphaMax: 0.06 }, defStyle: '龙卷风', openLine: '沙漠风味，纯属想象', endLine: '骆驼表示不背这锅' },
  lightblue: { smoke: '#bae6fd', accent: '#38bdf8', relax: 5, tar: '低', emoji: '🧊',  series: 'cold',  bio: '捏爆珠的瞬间，你以为自己穿越到了南极。脑瓜疼免费，凉感全靠想象。', smokePreset: { buoyancy: 110, turbStrength: 36, rMin: 8, rMax: 16, alphaMax: 0.04, growRate: 26 }, defStyle: '双螺旋', openLine: '捏爆珠前先护好脑瓜', endLine: '脑瓜又疼了一下' },
  purple:    { smoke: '#e9c8ff', accent: '#a855f7', relax: 3, tar: '中', emoji: '👑',  series: 'warm',  bio: '朕的味道。烟盒比烟好看，建议直接供起来别抽。', smokePreset: { buoyancy: 64, turbStrength: 50, rMin: 13, rMax: 24, alphaMax: 0.07 }, defStyle: '星形', openLine: '朕的烟，供着别抽', endLine: '朕的肺，朕自己疼' },
  green:     { smoke: '#b6f0c8', accent: '#22c55e', relax: 4, tar: '低', emoji: '🌿',  series: 'sweet', bio: '雨后公园的味道，抽着像后悔。蚊子免费送，不谢。', smokePreset: { buoyancy: 90, turbStrength: 44, rMin: 10, rMax: 18, alphaMax: 0.05 }, defStyle: '水母状', openLine: '雨后公园味，蚊子免费送', endLine: '公园白逛，后悔照旧' },
  pink:      { smoke: '#ffc7df', accent: '#ec4899', relax: 5, tar: '低', emoji: '🍬',  series: 'sweet', bio: '小时候偷抽的那根，原来真的是甜的。长大后发现甜的是糖，后悔的是你。', smokePreset: { buoyancy: 60, turbStrength: 28, rMin: 14, rMax: 28, alphaMax: 0.09, growRate: 46, lifeMax: 6.6 }, defStyle: '爱心形', openLine: '甜的是糖，后悔的是你', endLine: '童年的糖，成年人的债' },
  brown:     { smoke: '#d8bd9c', accent: '#b07b4f', relax: 3, tar: '中', emoji: '🏚️',  series: 'warm',  bio: '巷子口那根早熄了，这包是你自己点的火。潮湿，且充满回忆的霉味。', smokePreset: { buoyancy: 56, turbStrength: 34, rMin: 14, rMax: 26, alphaMax: 0.08 }, defStyle: '蛇形蜿蜒', openLine: '这包是你自己点的火', endLine: '巷子更深了，回忆更霉了' },
  magenta:   { smoke: '#ff9ed8', accent: '#e11d8f', relax: 3, tar: '中', emoji: '💡',  series: 'night', bio: '深夜限定电子味，闪一整晚，天亮就空。适合凌晨三点还不舍得睡的你。', smokePreset: { buoyancy: 74, turbStrength: 120, rMin: 9, rMax: 20, alphaMax: 0.06, spread: 34 }, defStyle: '烟花扩散', openLine: '凌晨三点限定，天亮就空', endLine: '闪完了，天还没亮' },
  silver:    { smoke: '#ffffff', accent: '#cbd5e1', relax: 4, tar: '低', emoji: '🕊️',  series: 'cold',  bio: '放它走吧，也放自己一马。轻盈得像根本没抽，主打一个心理安慰。', smokePreset: { buoyancy: 104, turbStrength: 38, rMin: 9, rMax: 17, alphaMax: 0.04 }, defStyle: '烟圈', openLine: '放它走，也放自己一马', endLine: '飞走了，自由没来' },
  navy:      { smoke: '#9db4e8', accent: '#1e3a8a', relax: 2, tar: '高', emoji: '🌊',  series: 'cold',  bio: '越深越贵，越贵越深。抽完感觉自己沉到了马里亚纳，钱包也沉了。', smokePreset: { buoyancy: 46, turbStrength: 26, rMin: 16, rMax: 30, alphaMax: 0.1, growRate: 36, lifeMin: 4.4, lifeMax: 6.8 }, defStyle: '瀑布流', openLine: '越深越贵，钱包先沉', endLine: '又沉下去一截' }
}
BRANDS.forEach(b => {
  Object.assign(b, BRAND_VISUAL[b.theme] || {
    smoke: '#dfe6f2', accent: '#94a3b8', relax: 3, tar: '中', emoji: '🚬', series: 'cold', bio: '', smokePreset: {}
  })
})

// 系列中文名（图鉴系列进度条用）
export const BRAND_SERIES = { cold: '冷系列', warm: '暖系列', sweet: '甜系列', night: '暗夜系列' }

// 图鉴：抽完过一包的品牌会点亮。靠 _write 走数据版本号，
// 解锁后回首页/成就页能感知到变化。
const BRAND_CODEX_KEY = 'os_brand_codex'
export function getUnlockedBrands() {
  return _read(BRAND_CODEX_KEY, []) || []
}
export function isBrandUnlocked(id) {
  return getUnlockedBrands().includes(id)
}
export function unlockBrand(id) {
  if (!id) return
  const list = getUnlockedBrands()
  if (list.includes(id)) return
  list.push(id)
  _write(BRAND_CODEX_KEY, list)
}

// 今日心情推荐：优先按用户近期情绪挑系列（焦虑/烦躁→暗夜、低落→暖、无聊→暖、平和→冷/甜），
// 系列内优先推「还没解锁过」的牌子给探索动机；无情绪数据时回落到按时段。
export function recommendBrand() {
  const moods = getMoods()
  const recent = (moods || []).slice(-10)
  const dist = {}
  recent.forEach(m => { if (m && m.mood) dist[m.mood] = (dist[m.mood] || 0) + 1 })
  const top = Object.keys(dist).sort((a, b) => dist[b] - dist[a])[0]
  const moodSeries = { anxious: 'night', angry: 'night', sad: 'warm', bored: 'warm', happy: 'sweet', calm: 'cold' }
  let pool = BRANDS
  if (top && moodSeries[top]) {
    const inSeries = BRANDS.filter(b => b.series === moodSeries[top])
    if (inSeries.length) pool = inSeries
  }
  const unlocked = getUnlockedBrands()
  const fresh = pool.filter(b => !unlocked.includes(b.id))
  if (fresh.length) return fresh[Math.floor(Math.random() * fresh.length)]
  // 系列已集齐则按当前时段挑一个应景的
  const hour = new Date().getHours()
  let theme
  if (hour >= 0 && hour < 5) theme = 'magenta'   // 深夜电子味
  else if (hour < 8) theme = 'lightblue'          // 清晨薄荷冰爆
  else if (hour < 12) theme = 'blue'              // 上午清爽
  else if (hour < 18) theme = 'gold'              // 午后解馋
  else if (hour < 22) theme = 'navy'              // 傍晚深沉
  else theme = 'purple'                           // 夜晚淡雅
  return pool.find(b => b.theme === theme) || pool[0] || BRANDS[0]
}

// 系列收集进度：把「试遍 12 款」拆成 4 个中段目标，集齐一套更有成就感。
// 返回 [{ series, name, total, unlocked, done }]
export function getSeriesProgress() {
  const unlocked = getUnlockedBrands()
  const groups = {}
  BRANDS.forEach(b => {
    if (!groups[b.series]) groups[b.series] = { series: b.series, total: 0, unlocked: 0 }
    groups[b.series].total++
    if (unlocked.includes(b.id)) groups[b.series].unlocked++
  })
  return Object.keys(groups).map(s => ({
    series: s, name: BRAND_SERIES[s] || s,
    total: groups[s].total, unlocked: groups[s].unlocked,
    done: groups[s].unlocked === groups[s].total
  }))
}

// 反套路「今日最不推荐」：挑最贵的非选中品牌，用它的 quote 当毒舌理由，
// 维持这个 app「不劝你、陪你自嘲」的调性。返回品牌对象。
export function getWorstBrand() {
  const sel = (getSettings().selectedBrand) || null
  const candidates = BRANDS.filter(b => b.id !== sel)
  candidates.sort((a, b) => b.price - a.price)
  return candidates[0] || BRANDS[0]
}

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
  selectedBrand: null,
  // 「忍住一根」省下的钱（元）。0 = 不自定义，跟随烟价自动算；
  // 用户在设置页填了就固定用这个数，方便把省下的钱按自己的心理价位记
  resistPrice: 0
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

// 数据版本号：所有持久化写入都经 _write，写一次自增一次。
// 页面 onShow 拿它做脏检查 —— 数据没变就完全跳过整页重算，
// 转场帧里最贵的那一段同步工作（storage 桥 + setData）就消失了。
let _rev = 0

export function getRev() {
  return _rev
}

// 给绕过 Store 直接写盘的模块用（如广告次数记录）：写完调一次，
// 让依赖那份数据的页面知道「该刷新了」。埋点队列、音效开关这类
// 与页面数据无关的写入不要调，否则会制造无谓的整页刷新。
export function touch() {
  _rev++
}

// 读缓存：只在 withReadCache() 的同步执行期间生效。
// 一次刷新里 settings / stats / history 会被七八个函数各读一遍，
// 每次都是一次同步 storage 调用 + JSON.parse，缓存能把这一批压成一次。
let _readCache = null

function _read(key, fallback) {
  if (_readCache && Object.prototype.hasOwnProperty.call(_readCache, key)) {
    const cached = _readCache[key]
    const value = cached === undefined ? fallback : cached
    // 复制一层容器再返回：调用方拿到的数组/对象仍是自己的，
    // 避免某处就地修改后影响同一次刷新里的其它读取
    if (Array.isArray(value)) return value.slice()
    if (value && typeof value === 'object') return { ...value }
    return value
  }
  let value = fallback
  try {
    const raw = uni.getStorageSync(key)
    value = raw ? JSON.parse(raw) : fallback
  } catch (e) {
    value = fallback
  }
  if (_readCache) _readCache[key] = value
  return value
}

function _write(key, data) {
  // 写之前先失效，避免同一次刷新里读到写之前的旧值
  if (_readCache) delete _readCache[key]
  uni.setStorageSync(key, JSON.stringify(data))
  _rev++
}

/**
 * 在给定的同步函数内复用 storage 读取结果。
 * 只应该包「读多写少」的整段逻辑（例如首页 refreshData），
 * 不要包住用户操作，否则写之后又读的场景容易拿到旧值。
 */
export function withReadCache(fn) {
  const prev = _readCache
  _readCache = {}
  try {
    return fn()
  } finally {
    _readCache = prev
  }
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
  // 跨午夜自动重置。
  // brandCounts 不清：它是「当前这包烟各品牌已抽几根」的累计，跨天保留；
  // 一包抽完才归零开下一包。lastSmokeTime 同理保留（算距上次抽烟）。
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
  // 超出上限要截断，但省钱是「history 逐根累加」的，直接丢会让累计省钱缩水。
  // 先把被丢弃记录的金额沉淀到 stats.savedLegacy，getSavedMoney 再把它加回来。
  if (list.length > 500) {
    const dropped = list.splice(500)
    let legacy = 0
    // 翻倍过的记录要按 2 倍沉淀，否则截断后省钱会莫名缩水
    dropped.forEach(r => { legacy += getRecordSaved(r) })
    if (legacy > 0) {
      const stats = getStats()
      stats.savedLegacy = Math.round(((stats.savedLegacy || 0) + legacy) * 100) / 100
      saveStats(stats)
    }
  }
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

  // 单根价格快照：点烟那一刻的价格写死进记录，
  // 以后改设置里的烟价/包数都不会改变这根已经省下的钱
  addHistory({
    id: now.toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: now,
    duration: duration,
    brandId: brandId,
    pricePerCig: getBrandPricePerCig(brandId)
  })

  const stats = getStats()
  stats.totalSmoked = (stats.totalSmoked || 0) + 1

  // 时段统计（供成就判定）：深夜 0-5 点 / 清晨 6-8 点
  const hour = new Date(now).getHours()
  if (hour >= 0 && hour < 5) stats.nightSmoked = (stats.nightSmoked || 0) + 1
  if (hour >= 6 && hour < 8) stats.earlySmoked = (stats.earlySmoked || 0) + 1

  // 连续打卡天数：改为增量维护，不再依赖 history。
  // history 上限 500 条，抽得多的人一旦触发截断，连续天数会凭空变小。
  const todayStr = _todayStr()
  const lastStreakDate = stats.streakLastDate || ''
  if (lastStreakDate === todayStr) {
    // 今天已经记过，天数不变
  } else if (lastStreakDate && _shiftDays(todayStr, -1) === lastStreakDate) {
    stats.streakDays = (stats.streakDays || 0) + 1
  } else {
    stats.streakDays = 1
  }
  stats.streakLastDate = todayStr
  if ((stats.streakDays || 0) > (stats.maxStreak || 0)) {
    stats.maxStreak = stats.streakDays
  }
  saveStats(stats)

  // 抽烟会伤害宠物伙伴（掉血/掉心情，不掉经验）
  harmPet(-5, -4)

  // 抽完一包某品牌即点亮图鉴：让「尝试各品牌」变成收集游戏
  if (brandId) unlockBrand(brandId)
}

// 连续打卡天数：从今天（或昨天）往前数，历史里每天至少 1 根的连续天数
export function getSmokeStreak() {
  const stats = getStats()
  const today = _todayStr()

  // 新版：recordSmoke 时增量维护，不受 history 截断影响
  if (stats.streakLastDate) {
    // 今天还没抽不算断签，所以「昨天」也算连续中
    if (stats.streakLastDate === today || stats.streakLastDate === _shiftDays(today, -1)) {
      return stats.streakDays || 0
    }
    return 0
  }

  // 老数据没有增量字段，退回按 history 回溯
  const history = getHistory()
  if (!history.length) return 0

  const daySet = new Set()
  history.forEach(r => {
    if (r && r.timestamp) daySet.add(_todayStr(r.timestamp))
  })

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

// 一次性取出所有品牌的「每包支数 / 剩余支数」。
// 列表页原来对每个品牌各调一次 getPackSize + getPackRemaining，
// 12 个品牌就是 24 次同步 storage 读取，进出页面时会有可感的停顿。
export function getAllPackStates() {
  const settings = getSettings()
  const remainMap = _read(KEYS.packRemaining, {})
  const states = {}
  BRANDS.forEach(brand => {
    const size = brand.packSize || settings.packSize || 20
    const left = remainMap[brand.id] != null ? Math.max(0, remainMap[brand.id]) : size
    states[brand.id] = { packSize: size, remaining: left }
  })
  return states
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

// ---- 抽完的包数 ----
// 抽完一包自动开下一包，包数累加，跨天不清（抽了几包是累计事实）。
// 手动「开新的一包」不计入 —— 那是换包，不是抽完。
export function getPacksCompleted(brandId) {
  const data = _read(KEYS.packsCompleted, {})
  return brandId ? (data[brandId] || 0) : data
}

// 所有品牌累计抽完的包数（首页展示用）
export function getTotalPacksCompleted() {
  const data = _read(KEYS.packsCompleted, {})
  let total = 0
  Object.keys(data).forEach(k => { total += Number(data[k]) || 0 })
  return total
}

// 这包抽完了：包数 +1 并自动开下一包，返回新包的剩余支数
export function completePackAndRefill(brandId) {
  const data = _read(KEYS.packsCompleted, {})
  data[brandId] = (data[brandId] || 0) + 1
  _write(KEYS.packsCompleted, data)
  return refillPack(brandId)
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

// 取某条记录当时的单根价格：
// 优先用记录里的 pricePerCig 快照（新记录）；
// 老记录没有快照，回落到按 brandId + 当前设置推算，保证旧数据照常可用。
export function getRecordPrice(record) {
  if (record && typeof record.pricePerCig === 'number' && record.pricePerCig > 0) {
    return record.pricePerCig
  }
  return getBrandPricePerCig(record ? record.brandId : null)
}

// 单根记录贡献的省钱额：看过广告翻倍的那根按 2 倍计。
// 所有累加省钱的地方都走这里，避免某个入口漏掉翻倍导致口径不一致。
export function getRecordSaved(r) {
  return getRecordPrice(r) * (r && r.boosted ? 2 : 1)
}

// 看广告把「最后一根」的省钱翻倍。
// 只针对最后一根，且同一根不能重复翻倍（否则可以无限刷）
export function boostLastSmoke() {
  const list = getHistory()
  if (!list.length) return false
  if (list[0].boosted) return false
  list[0].boosted = true
  _write(KEYS.history, list)
  return true
}

// 今天到目前为止省下的钱（未结算，仅用于展示「今日」）
export function getTodaySaved() {
  const history = getHistory()
  const today = _todayStr()

  let total = 0
  history.forEach(r => {
    if (!r || !r.timestamp) return
    if (_todayStr(r.timestamp) !== today) return
    total += getRecordSaved(r)
  })

  return Math.round(total * 100) / 100
}

// 累计省钱：每假抽一根，就少烧一根真烟，省下这一根的钱。
// 单价用记录里的 pricePerCig 快照（点烟时锁定）；
// 没有快照的老记录按 brandId + 当前设置价推算。
// 注意：不按天摊、也没有「每天原本该抽多少」的基线 —— 抽几根算几根。
export function getSavedMoney() {
  const history = getHistory()
  // 被截断掉的老记录，金额已沉淀在 stats.savedLegacy，必须加回来，
  // 否则抽满 500 根之后累计省钱会越用越少
  let total = getStats().savedLegacy || 0

  history.forEach(r => {
    if (!r) return
    total += getRecordSaved(r)
  })

  return Math.round(total * 100) / 100
}

// 少抽的根数：戒烟开始后「按原习惯本该抽的量」− 「戒烟后实际抽的量」。
// 原来减的是 stats.totalSmoked（全部历史，含戒烟前的记录），
// 只要历史累计够多，这个值就恒为 0，等于永远显示 0。
export function getLessSmoked() {
  const settings = getSettings()
  const start = parseLocalDate(settings.quitDate)
  if (!start) return 0
  const startTs = start.getTime()
  const days = Math.max(1, getCleanDays() + 1)
  const original = Math.max(0, Number(settings.dailyOriginal) || 0)
  const smokedSinceQuit = getHistory().filter(r => r.timestamp >= startTs).length
  return Math.max(0, days * original - smokedSinceQuit)
}

// 勋章系统
export function getUnlockedBadges() {
  return _read(KEYS.badges, {})
}

export function saveUnlockedBadges(badges) {
  // 走 _write：原来直接 setStorageSync 会绕过数据版本号，
  // 解锁勋章后返回首页就可能不刷新
  _write(KEYS.badges, badges)
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
  // 最高档就到 1000 元：省钱是「假抽一根省一根」的逐根累加（默认 1.5 元/根），
  // 原来的「万元户」要假抽 6667 根才够，按 5 根/天要三年多，实质不可达。
  { id: 'save_1000', name: '千元户', icon: '💶', category: 1, desc: '累计省下 1000 元', condition: (s) => s.totalSaved >= 1000 },

  // 抽烟次数。原来这里的 smoke_1 与「戒烟里程碑」的 first_air_cig 条件完全相同
  // （都是 totalSmoked >= 1），抽第一根时两枚一起亮，属于凑数，已移除。
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
  const smokeFree = getSmokeFreeDuration()
  // 健康类成就（12小时/3天/2周…）以前只看瞬时值：抽一根就归零，
  // 用户明明坚持过那么久，一旦超过就再也拿不到。这里记录历史峰值再判定。
  if (smokeFree > (s.maxSmokeFreeSec || 0)) {
    s.maxSmokeFreeSec = smokeFree
    saveStats(s)
  }
  return {
    totalSmoked: s.totalSmoked || 0,
    // 「省下 N 元」类成就必须看「忍住不抽」省下的钱。
    // 之前用的是抽烟累计金额，抽得越多越容易解锁，方向是反的。
    totalSaved: getResistStats().totalSaved,
    cleanDays: getCleanDays(),
    maxStreak: Math.max(s.maxStreak || 0, getSmokeStreak()),
    nightSmoked: s.nightSmoked || 0,
    earlySmoked: s.earlySmoked || 0,
    stylesUsed: s.stylesUsed || 0,
    passedCount: s.passedCount || 0,
    ashTapped: s.ashTapped || 0,
    // 健康成就用「历史最长的无烟时长」，避免达成瞬间没打开页面就永久错过
    smokeFreeSeconds: Math.max(smokeFree, s.maxSmokeFreeSec || 0)
  }
}

// 按当前数据自动解锁符合条件的勋章，返回本次新解锁的列表
export function syncBadges() {
  const stats = buildBadgeStats()
  // 一次读出全部解锁状态再统一判定：
  // 原来对每个勋章都调 unlockBadge()，而它每次都 getStorageSync + JSON.parse，
  // 23 枚勋章就是 23 次同步存储读取，每次进成就页都要白付这笔开销
  const unlocked = getUnlockedBadges()
  const newly = []
  let changed = false
  BADGE_LIST.forEach(b => {
    let ok = false
    try { ok = !!b.condition(stats) } catch (e) { ok = false }
    if (ok && !unlocked[b.id]) {
      unlocked[b.id] = true
      unlocked[b.id + '_time'] = Date.now()
      newly.push(b)
      changed = true
    }
  })
  // 只有真的解锁了新勋章才写一次
  if (changed) saveUnlockedBadges(unlocked)
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

  // 老用户（有抽烟记录）：省钱口径从「少抽才省」改成「假抽一根省一根」，
  // 数字会明显变小，必须告知，否则用户会以为钱被吞了。新用户无记录，不必打扰。
  if (getHistory().length) {
    result.savedLogic = true
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

// ---- 忍住不抽（省钱账本）----
// 和「抽烟花费」(history) 完全分开记两本账：
//   抽一根 → history +1，记「已花」
//   忍住一次 → resists +1，记「已省」
// 两本账互不抵消，用户能同时看到「今天烧掉多少」和「忍住省下多少」。

export function getResists() {
  return _read(KEYS.resists, [])
}

// 当前这一根如果忍住，能省多少钱。
// 优先用设置里的自定义单价（>0 才生效），否则按已选品牌单价 / 设置里的烟价自动算
export function getResistPrice() {
  const settings = getSettings()
  const custom = Number(settings.resistPrice)
  if (isFinite(custom) && custom > 0) return custom
  return getBrandPricePerCig(settings.selectedBrand)
}

// 自动推算的单价（忽略自定义值）：设置页拿它做占位/说明文字，
// 让用户知道「留空」时实际会记多少钱
export function getAutoResistPrice() {
  const settings = getSettings()
  return getBrandPricePerCig(settings.selectedBrand)
}

// 记一次「忍住」：价格在点击瞬间快照，后面改烟价不影响历史省下的钱
export function recordResist(pricePerCig) {
  const list = getResists()
  const price = Number(pricePerCig)
  const record = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: Date.now(),
    pricePerCig: isFinite(price) && price > 0 ? price : 0
  }
  list.unshift(record)
  if (list.length > 2000) list.splice(2000)
  _write(KEYS.resists, list)

  const stats = getStats()
  stats.totalResisted = (stats.totalResisted || 0) + 1
  saveStats(stats)
  return record
}

export function getResistStats() {
  const list = getResists()
  const today = _todayStr()
  let todayCount = 0
  let todaySaved = 0
  let totalSaved = 0
  list.forEach(r => {
    const price = Number(r.pricePerCig) || 0
    totalSaved += price
    if (_todayStr(r.timestamp) === today) {
      todayCount++
      todaySaved += price
    }
  })
  return {
    todayCount,
    todaySaved: Math.round(todaySaved * 100) / 100,
    totalCount: list.length,
    totalSaved: Math.round(totalSaved * 100) / 100
  }
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
  // 「花费预算」型：抽一根是花钱，所以挑战是「别超预算」，
  // 而不是「省下多少钱」——后者抽得越多反而越容易完成，等于奖励抽烟
  { id: 'save_10', title: '今日花费不超过10元', desc: '把今天烧掉的钱控制在10元以内', type: 'save', target: 10, icon: '💰' },
  { id: 'save_20', title: '今日花费不超过20元', desc: '把今天烧掉的钱控制在20元以内', type: 'save', target: 20, icon: '💰' },
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
  
  // 文案以模板为准：当天已生成的旧挑战（比如改版前的「省下10块钱」）
  // 不会自动更新，这里按 challengeId 同步一次标题/描述/口径
  const stored = challenges[today]
  const tpl = CHALLENGE_TEMPLATES.find(t => t.id === stored.challengeId)
  if (tpl && stored.title !== tpl.title) {
    stored.title = tpl.title
    stored.desc = tpl.desc
    stored.type = tpl.type
    stored.target = tpl.target
    _write(KEYS.challenges, challenges)
  }

  return stored
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

  // 首页 onShow 和 60 秒轮询都会调这里，而下面原来是无条件 _write。
  // setStorageSync 是同步 IO，返回首页那一下正好压在转场手势上。
  // 记下改动前的状态，真的变了才落盘
  const before = `${challenge.progress}|${challenge.completed}|${challenge.failed}`

  challenge.progress = progress

  if (challenge.type === 'limit') {
    challenge.failed = progress > challenge.target
    challenge.completed = false
  } else if (challenge.type === 'save') {
    // progress = 今日已花金额。超额立刻判失败，没超额要等当天过完才能算达成
    challenge.failed = progress > challenge.target
    challenge.completed = false
  } else if (challenge.type === 'resist') {
    challenge.completed = progress >= challenge.target
  } else if (challenge.type === 'time_range') {
    challenge.failed = progress > 0
    challenge.completed = false
  } else if (challenge.type === 'delay') {
    challenge.completed = progress >= challenge.target
  }

  // 没变化就不写：这一条能省掉「每次返回首页 / 每 60 秒轮询」时的一次同步存储写
  if (`${challenge.progress}|${challenge.completed}|${challenge.failed}` !== before) {
    _write(KEYS.challenges, challenges)
  }
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
    } else if (c.type === 'save') {
      // 花费预算：昨天没超额才算达成
      c.completed = progress <= c.target
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
  const now = Date.now()
  // 摸头经验加冷却：原来连点就能无限 +5 经验，等级门槛等于不存在
  const canGainExp = !pet.lastPetTime || now - pet.lastPetTime > 60000
  pet.happiness = clamp100(pet.happiness + 4)
  if (canGainExp) {
    pet.health = clamp100(pet.health + 2)
    addExp(pet, 5)
    pet.lastPetTime = now
  }
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

  // 第一次进入（还没有历史）时不做补算，直接把游标拨到昨天
  if (!pet.lastRecoverDate && !history.length) {
    pet.lastRecoverDate = yesterday
    savePet(pet)
    return pet
  }

  // 逐日结算：之前只结算「昨天」一天，隔三天没开 App，中间两天就永久漏发。
  // 最多补 7 天，避免长期未登录一次性刷爆等级。
  const smokedDays = new Set()
  history.forEach(r => { if (r && r.timestamp) smokedDays.add(_todayStr(r.timestamp)) })

  let cursor = pet.lastRecoverDate ? _shiftDays(pet.lastRecoverDate, 1) : yesterday
  let guard = 0
  while (cursor <= yesterday && guard < 7) {
    if (!smokedDays.has(cursor)) {
      pet.health = clamp100(pet.health + 12)
      pet.happiness = clamp100(pet.happiness + 10)
      addExp(pet, 12)
    }
    cursor = _shiftDays(cursor, 1)
    guard++
  }

  pet.lastRecoverDate = yesterday
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

// 看广告获得额外配额。数量由调用方传入（一次给几根在广告模块统一定义），
// 这里不写死，避免两处各写一个数字对不上
export function addExtraQuota(count = 1) {
  const rewards = getAdRewards()
  if (rewards.lastResetDate !== _todayStr()) {
    rewards.extraQuota = 0
    rewards.lastResetDate = _todayStr()
  }
  rewards.extraQuota += Math.max(0, Number(count) || 0)
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
  // 解锁条件有两个来源：花金币解锁，或宠物等级达标（等级解锁的之前装不上，
  // 列表显示「已解锁」但点装备返回 false，pet.vue 还照样提示「已装备」）
  const pet = getPet()
  const unlockedByLevel = !!accessory.unlockLevel && pet.level >= accessory.unlockLevel
  if (!data.unlocked.includes(accessoryId) && !unlockedByLevel) return false

  // 等级解锁的顺手补进 unlocked，保证后续判断一致
  if (!data.unlocked.includes(accessoryId)) data.unlocked.push(accessoryId)

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
  getBrandPackSize, getBrandPricePerCig, getRecordPrice, getRecordSaved,
  getUnlockedBrands, isBrandUnlocked, unlockBrand, recommendBrand,
  BRAND_SERIES, getSeriesProgress, getWorstBrand,
  boostLastSmoke,
  getPackSize, getPackRemaining, getAllPackStates, savePackRemaining, refillPack,
  getPacksCompleted, getTotalPacksCompleted, completePackAndRefill,
  settleDailySavings, getTodaySaved,
  getSmokeFreeDuration, getCleanDays,
  getSavedMoney, getLessSmoked,
  BADGE_LIST, getBadgeList, syncBadges, buildBadgeStats,
  migrateIfNeeded, recomputeSavedFromHistory, withReadCache, getRev, touch,
  getUnlockedBadges, saveUnlockedBadges, unlockBadge,
  getCravings, addCraving, getCravingStats,
  getResists, recordResist, getResistStats, getResistPrice, getAutoResistPrice,
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
