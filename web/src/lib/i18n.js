/**
 * 英文队名 → 中文队名 映射
 * 所有组件通过 t('Germany') 调用
 */
const TEAM_NAMES = {
  // A 组
  'Mexico': '墨西哥',
  'South Africa': '南非',
  'South Korea': '韩国',
  'Czechia': '捷克',
  // B 组
  'Canada': '加拿大',
  'Bosnia and Herzegovina': '波黑',
  'Qatar': '卡塔尔',
  'Switzerland': '瑞士',
  // C 组
  'Brazil': '巴西',
  'Morocco': '摩洛哥',
  'Haiti': '海地',
  'Scotland': '苏格兰',
  // D 组
  'USA': '美国',
  'Paraguay': '巴拉圭',
  'Australia': '澳大利亚',
  'Turkey': '土耳其',
  // E 组
  'Germany': '德国',
  'Curaçao': '库拉索',
  'Ivory Coast': '科特迪瓦',
  'Ecuador': '厄瓜多尔',
  // F 组
  'Netherlands': '荷兰',
  'Japan': '日本',
  'Sweden': '瑞典',
  'Tunisia': '突尼斯',
  // G 组
  'Belgium': '比利时',
  'Egypt': '埃及',
  'Iran': '伊朗',
  'New Zealand': '新西兰',
  // H 组
  'Spain': '西班牙',
  'Cabo Verde': '佛得角',
  'Saudi Arabia': '沙特阿拉伯',
  'Uruguay': '乌拉圭',
  // I 组
  'France': '法国',
  'Senegal': '塞内加尔',
  'Iraq': '伊拉克',
  'Norway': '挪威',
  // J 组
  'Argentina': '阿根廷',
  'Algeria': '阿尔及利亚',
  'Austria': '奥地利',
  'Jordan': '约旦',
  // K 组
  'Portugal': '葡萄牙',
  'DR Congo': '刚果(金)',
  'Uzbekistan': '乌兹别克斯坦',
  'Colombia': '哥伦比亚',
  // L 组
  'England': '英格兰',
  'Croatia': '克罗地亚',
  'Ghana': '加纳',
  'Panama': '巴拿马',
}

/**
 * 翻译队名。未找到映射时返回原名。
 */
export function t(name) {
  return TEAM_NAMES[name] || name
}

/**
 * 替换文本中的英文队名为中文。用于 narrative 段落等长文本。
 * 匹配规则：按长度倒序匹配，避免短名误替换（如 "Iran" 匹配到 "Iraq" 内部）。
 */
const SORTED_NAMES = Object.keys(TEAM_NAMES).sort((a, b) => b.length - a.length)
const NAME_RE = new RegExp(SORTED_NAMES.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g')

export function translateText(text) {
  if (!text || typeof text !== 'string') return text
  return text.replace(NAME_RE, match => TEAM_NAMES[match] || match)
}
