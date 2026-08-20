/**
 * theme.js - 主题管理（跨端，小程序兼容）
 * 通过根节点 class 切换 CSS 变量实现换肤；
 * 各页面在根容器上绑定 :class="themeClass" 即可跟随。
 */
import { reactive } from 'vue'
import Store from './store.js'

// 主题配色：每套定义一组 CSS 变量
export const THEMES = [
  {
    id: 'amber',
    name: '经典琥珀',
    swatch: 'linear-gradient(135deg,#f59e0b,#f97316)',
    vars: {
      '--bg': '#0f0f0f',
      '--surface-1': '#1f1f1f',
      '--surface-2': '#252525',
      '--border': '#2a2a2a',
      '--primary': '#f59e0b',
      '--primary-2': '#f97316',
      '--glow': 'rgba(245,158,11,0.35)',
      '--accent': '#34d399',
      '--text': '#e5e7eb',
      '--text-dim': '#9ca3af',
      '--danger-1': '#ff6b6b',
      '--danger-2': '#c0392b'
    }
  },
  {
    id: 'aurora',
    name: '极光暗夜',
    swatch: 'linear-gradient(135deg,#a78bfa,#22d3ee)',
    vars: {
      '--bg': '#0a0e16',
      '--surface-1': '#121826',
      '--surface-2': '#182032',
      '--border': '#25304a',
      '--primary': '#a78bfa',
      '--primary-2': '#22d3ee',
      '--glow': 'rgba(124,139,250,0.35)',
      '--accent': '#22d3ee',
      '--text': '#e8ecf6',
      '--text-dim': '#93a0bd',
      '--danger-1': '#ff6b6b',
      '--danger-2': '#c0392b'
    }
  },
  {
    id: 'mint',
    name: '薄荷清新',
    swatch: 'linear-gradient(135deg,#34d399,#10b981)',
    vars: {
      '--bg': '#08120e',
      '--surface-1': '#0f1f18',
      '--surface-2': '#142a20',
      '--border': '#1f3a2c',
      '--primary': '#34d399',
      '--primary-2': '#10b981',
      '--glow': 'rgba(52,211,153,0.30)',
      '--accent': '#f59e0b',
      '--text': '#e6f4ec',
      '--text-dim': '#8fb3a2',
      '--danger-1': '#ff7a7a',
      '--danger-2': '#c0392b'
    }
  },
  {
    id: 'sunset',
    name: '日落橙红',
    swatch: 'linear-gradient(135deg,#ff7a18,#ff4d6d)',
    vars: {
      '--bg': '#140a0a',
      '--surface-1': '#211212',
      '--surface-2': '#2c1717',
      '--border': '#3a2020',
      '--primary': '#ff7a18',
      '--primary-2': '#ff4d6d',
      '--glow': 'rgba(255,122,24,0.32)',
      '--accent': '#ffd166',
      '--text': '#f6e9e6',
      '--text-dim': '#c79b94',
      '--danger-1': '#ff6b6b',
      '--danger-2': '#b03030'
    }
  },
  {
    id: 'mono',
    name: '纯黑极简',
    swatch: 'linear-gradient(135deg,#e5e7eb,#9ca3af)',
    vars: {
      '--bg': '#000000',
      '--surface-1': '#141414',
      '--surface-2': '#1c1c1c',
      '--border': '#2a2a2a',
      '--primary': '#e5e7eb',
      '--primary-2': '#9ca3af',
      '--glow': 'rgba(255,255,255,0.15)',
      '--accent': '#9ca3af',
      '--text': '#f5f5f5',
      '--text-dim': '#a3a3a3',
      '--danger-1': '#ff6b6b',
      '--danger-2': '#c0392b'
    }
  }
]

export const themeState = reactive({
  current: Store.getTheme() || 'amber'
})

export function setTheme(id) {
  if (!THEMES.find(t => t.id === id)) return
  themeState.current = id
  Store.setTheme(id)
}

export function themeClass() {
  return 'theme-' + themeState.current
}

export function currentTheme() {
  return THEMES.find(t => t.id === themeState.current) || THEMES[0]
}
