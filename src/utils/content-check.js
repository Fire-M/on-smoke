/**
 * content-check.js - 用户输入内容的合规检查（UGC）
 *
 * 背景：小程序含用户自由输入（情绪日记、时间胶囊、烟瘾记录、省钱目标名）时，
 * 平台要求具备内容审核机制，否则容易被审核驳回。
 *
 * 这里做的是**本地基础过滤**：垃圾广告、违规交易、涉黄涉赌涉毒等明显违规词。
 * 本地词库只能拦常见词，真正的强合规需要服务端调用微信
 * `security.msgSecCheck`（需要服务器 + 合法域名），上线后把 checkContent
 * 换成「先本地过滤 → 再请求服务端」即可，调用方不用改。
 */

// 明显违规/垃圾广告类关键词（命中即拦截）
const BLOCK_WORDS = [
  // 垃圾广告 / 引流
  '加微信', '加vx', '加wx', '加qq', '私聊我', '扫码领', '免费领', '点击领取',
  '兼职日结', '日赚', '躺赚', '刷单', '代购', '代理加盟', '公众号引流',
  // 违规交易
  '贷款', '套现', '洗钱', '办证', '代开发票', '出售账号', '买卖账号',
  // 涉赌涉毒涉枪涉黄
  '赌博', '博彩', '六合彩', '网赌', '毒品', '冰毒', '大麻', '枪支', '弹药',
  '色情', '裸聊', '约炮', '一夜情',
  // 常见诈骗话术
  '中奖', '返利', '刷信誉', '高额回报', '稳赚不赔'
]

/**
 * 检查一段文本是否合规（本地基础过滤）
 * @param {string} text
 * @returns {{ok: boolean, word: string}} ok=false 时 word 为命中的关键词
 */
export function checkContent(text) {
  if (!text) return { ok: true, word: '' }
  const s = String(text).toLowerCase().replace(/\s+/g, '')
  for (let i = 0; i < BLOCK_WORDS.length; i++) {
    const w = BLOCK_WORDS[i]
    if (s.indexOf(w.toLowerCase()) !== -1) return { ok: false, word: w }
  }
  return { ok: true, word: '' }
}

/**
 * 保存前调用：不合规会自动提示用户，返回是否通过
 * @param {string} text
 * @returns {boolean}
 */
export function guardContent(text) {
  const result = checkContent(text)
  if (!result.ok) {
    uni.showToast({ title: '内容包含违规词，请修改后再保存', icon: 'none' })
    return false
  }
  return true
}

export default { checkContent, guardContent }
