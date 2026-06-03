/**
 * 2026 FIFA World Cup Simulation Engine (JavaScript)
 * 完整移植自 simulate.py，浏览器端运行，无需后端。
 */

// ============================================================
// 配置
// ============================================================

export const GROUPS = {
  A: ['Mexico', 'South Africa', 'South Korea', 'Czechia'],
  B: ['Canada', 'Bosnia and Herzegovina', 'Qatar', 'Switzerland'],
  C: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
  D: ['USA', 'Paraguay', 'Australia', 'Turkey'],
  E: ['Germany', 'Curaçao', 'Ivory Coast', 'Ecuador'],
  F: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'],
  G: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
  H: ['Spain', 'Cabo Verde', 'Saudi Arabia', 'Uruguay'],
  I: ['France', 'Senegal', 'Iraq', 'Norway'],
  J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  K: ['Portugal', 'DR Congo', 'Uzbekistan', 'Colombia'],
  L: ['England', 'Croatia', 'Ghana', 'Panama'],
}

const HOST_COUNTRIES = new Set(['Mexico', 'Canada', 'USA'])
const ATTRS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physic']

const POSITION_WEIGHTS = {
  GK:  { pace: 0.05, shooting: 0.00, passing: 0.10, dribbling: 0.05, defending: 0.40, physic: 0.40 },
  DEF: { pace: 0.15, shooting: 0.05, passing: 0.15, dribbling: 0.10, defending: 0.40, physic: 0.15 },
  MID: { pace: 0.10, shooting: 0.15, passing: 0.30, dribbling: 0.25, defending: 0.10, physic: 0.10 },
  FWD: { pace: 0.20, shooting: 0.30, passing: 0.15, dribbling: 0.20, defending: 0.05, physic: 0.10 },
}

const TOURNAMENT_DNA = {
  Croatia:    { consistency: 0.08 },
  Morocco:    { defense: 0.05 },
  Germany:    { consistency: 0.05 },
  Brazil:     { attack: 0.03 },
  Argentina:  { consistency: 0.04 },
  France:     { attack: 0.03 },
}

const R32_SLOTS = [
  [['1','A'], ['3RD',['C','E','F','H','I']]],
  [['2','A'], ['2','B']],
  [['1','E'], ['3RD',['A','B','C','D','F']]],
  [['2','E'], ['2','I']],
  [['1','C'], ['2','F']],
  [['1','F'], ['2','C']],
  [['1','I'], ['3RD',['C','D','F','G','H']]],
  [['1','D'], ['3RD',['B','E','F','I','J']]],
  [['1','G'], ['3RD',['A','E','H','I','J']]],
  [['1','B'], ['3RD',['E','F','G','I','J']]],
  [['1','H'], ['2','J']],
  [['2','D'], ['2','G']],
  [['1','J'], ['2','H']],
  [['1','K'], ['3RD',['D','E','I','J','L']]],
  [['1','L'], ['3RD',['E','H','I','J','K']]],
  [['2','K'], ['2','L']],
]

const MINUTE_WEIGHTS = [
  { range: [1,15], w: 0.12 },
  { range: [16,30], w: 0.14 },
  { range: [31,45], w: 0.16 },
  { range: [46,60], w: 0.14 },
  { range: [61,75], w: 0.16 },
  { range: [76,90], w: 0.18 },
  { range: [91,105], w: 0.06 },
  { range: [106,120], w: 0.04 },
]

const POS_GOAL_WEIGHT = { FWD: 50, MID: 30, DEF: 15, GK: 5 }

// ============================================================
// 随机数（可播种）
// ============================================================

// Mulberry32 PRNG
function createRng(seed) {
  let s = seed | 0
  return function() {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let _rand = Math.random

function poissonSample(lam) {
  const L = Math.exp(-lam)
  let k = 0, p = 1
  do { k++; p *= _rand() } while (p >= L)
  return k - 1
}

// ============================================================
// 球员评分
// ============================================================

function effectiveRating(player) {
  const pos = player.position || 'MID'
  const w = POSITION_WEIGHTS[pos] || POSITION_WEIGHTS.MID
  let score = 0
  for (const attr of ATTRS) {
    score += (w[attr] || 0) * (player[attr] ?? 60)
  }
  return score
}

// ============================================================
// 球队实力
// ============================================================

const _strengthCache = new Map()

function calculateTeamStrength(teamName, playerData) {
  if (_strengthCache.has(teamName)) return _strengthCache.get(teamName)

  const players = playerData[teamName] || []
  if (!players.length) {
    const d = { attack: 60, midfield: 60, defense: 60, gk: 60, overall: 60, depth: 60 }
    _strengthCache.set(teamName, d)
    return d
  }

  // 混合评分：overall 为主（保留实力差距），effectiveRating 为辅（体现位置特质）
  const rated = players.map(p => {
    const er = effectiveRating(p)
    const ovr = p.overall ?? 60
    // 70% overall + 30% effectiveRating，保持原始差距范围
    const mixed = ovr * 0.7 + er * 0.3
    return { mixed, er, ovr, p }
  }).sort((a, b) => b.mixed - a.mixed)

  const gks = rated.filter(r => r.p.position === 'GK')
  const defs = rated.filter(r => r.p.position === 'DEF')
  const mids = rated.filter(r => r.p.position === 'MID')
  const fwds = rated.filter(r => r.p.position === 'FWD')

  const avgOvr = (arr, n) => {
    const top = arr.slice(0, n)
    return top.length ? top.reduce((s, r) => s + r.ovr, 0) / top.length : 60
  }
  const avgMixed = (arr, n) => {
    const top = arr.slice(0, n)
    return top.length ? top.reduce((s, r) => s + r.mixed, 0) / top.length : 60
  }
  const avgAttr = (arr, attr, n) => {
    const top = arr.slice(0, n)
    return top.length ? top.reduce((s, r) => s + (r.p[attr] ?? 60), 0) / top.length : 60
  }

  const gkOvr = avgOvr(gks, 1)
  const defOvr = avgOvr(defs, 4)
  const midOvr = avgOvr(mids, 3)
  const fwdOvr = avgOvr(fwds, 3)

  const bestXi = rated.slice(0, 11)
  const bestXiAvg = bestXi.reduce((s, r) => s + r.ovr, 0) / Math.max(bestXi.length, 1)

  const top3 = rated.slice(0, 3)
  const starAvg = top3.reduce((s, r) => s + r.ovr, 0) / Math.max(top3.length, 1)
  const starBonus = Math.max(0, (starAvg - 80) * 0.5)

  const defPace = avgAttr(defs, 'pace', 4)
  const midDef = avgAttr(mids, 'defending', 3)
  const defPass = avgAttr(defs, 'passing', 4)
  const fwdDrib = avgAttr(fwds, 'dribbling', 3)

  const result = {
    attack: fwdOvr * 0.50 + midOvr * 0.30 + defPace * 0.20 + starBonus,
    midfield: midOvr * 0.60 + defPass * 0.20 + fwdDrib * 0.20,
    defense: defOvr * 0.50 + gkOvr * 0.30 + midDef * 0.20,
    gk: gkOvr,
    overall: bestXiAvg + starBonus * 0.5,
    depth: rated.slice(0, 18).reduce((s, r) => s + r.ovr, 0) / Math.min(18, rated.length),
  }
  _strengthCache.set(teamName, result)
  return result
}

// ============================================================
// 战术风格（数据推导）
// ============================================================

const _styleCache = new Map()

function deriveTacticalStyle(teamName, playerData) {
  if (_styleCache.has(teamName)) return _styleCache.get(teamName)

  const players = playerData[teamName] || []
  if (!players.length) return { attack: 0.5, defense: 0.5, consistency: 0.6 }

  const fwds = players.filter(p => p.position === 'FWD')
  const defs = players.filter(p => p.position === 'DEF')
  const mids = players.filter(p => p.position === 'MID')

  const avg = (arr, attr) => arr.length ? arr.reduce((s, p) => s + (p[attr] ?? 60), 0) / arr.length : 60

  const attackRaw = fwds.length ? (avg(fwds, 'shooting') + avg(fwds, 'pace')) / 200 : 0.5
  const defRaw = defs.length ? (avg(defs, 'defending') * 0.6 + avg(defs, 'physic') * 0.2 + avg(mids, 'defending') * 0.2) / 100 : 0.5

  const xiRatings = players.map(p => effectiveRating(p)).sort((a, b) => b - a).slice(0, 11)
  let consistencyRaw = 0.6
  if (xiRatings.length >= 2) {
    const mean = xiRatings.reduce((s, r) => s + r, 0) / xiRatings.length
    const variance = xiRatings.reduce((s, r) => s + (r - mean) ** 2, 0) / xiRatings.length
    consistencyRaw = 1.0 - Math.sqrt(variance) / 25
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
  let attack = clamp(attackRaw * 1.1 + 0.05, 0.4, 0.9)
  let defense = clamp(defRaw * 1.1, 0.4, 0.9)
  let consistency = clamp(consistencyRaw, 0.4, 0.95)

  const dna = TOURNAMENT_DNA[teamName] || {}
  attack = Math.min(0.95, attack + (dna.attack || 0))
  defense = Math.min(0.95, defense + (dna.defense || 0))
  consistency = Math.min(0.95, consistency + (dna.consistency || 0))

  // 战术原型分类
  let archetype = 'balanced'
  if (fwds.length) {
    const avgPace = avg(fwds, 'pace')
    const avgShoot = avg(fwds, 'shooting')
    const avgPass = avg(mids, 'passing')
    const avgDefDef = avg(defs, 'defending')

    if (avgPace > 78 && avgShoot > 70) archetype = 'high-press counter'
    else if (avgPass > 72 && avgPace < 75) archetype = 'possession tiki-taka'
    else if (avgDefDef > 70 && avgPace < 73) archetype = 'low-block defensive'
    else if (avgShoot > 75) archetype = 'direct attacking'
  }

  const result = { attack, defense, consistency, archetype }
  _styleCache.set(teamName, result)
  return result
}

// ============================================================
// 综合评分
// ============================================================

function getTeamRating(teamName, playerData, fatigueLevel = 0) {
  const strength = calculateTeamStrength(teamName, playerData)
  const style = deriveTacticalStyle(teamName, playerData)

  let attackRating = strength.attack * 0.8 + style.attack * 100 * 0.2
  let defenseRating = strength.defense * 0.8 + style.defense * 100 * 0.2

  if (fatigueLevel > 0) {
    const reduction = fatigueLevel * 15
    attackRating -= reduction
    defenseRating -= reduction * 0.8
  }

  return {
    attack: attackRating,
    defense: defenseRating,
    consistency: style.consistency,
    overall: strength.overall,
    depth: strength.depth,
  }
}

// ============================================================
// 动机
// ============================================================

function calcMotivation(teamOvr, opponentOvr, ctx = {}) {
  let boost = 0
  const deficit = opponentOvr - teamOvr
  if (deficit > 10) boost += Math.min(0.20, (deficit - 10) * 0.005)
  if (ctx.isFirstMatch) boost += 0.10
  if (ctx.mustWin) boost += 0.08
  return boost
}

// ============================================================
// 进球时间线
// ============================================================

function pickGoalscorer(teamName, playerData) {
  const players = playerData[teamName] || []
  if (!players.length) return 'Unknown'
  const weights = players.map(p => {
    const posW = POS_GOAL_WEIGHT[p.position] || 20
    return posW * (0.5 + (p.shooting ?? 50) / 100)
  })
  const total = weights.reduce((s, w) => s + w, 0)
  let r = _rand() * total
  for (let i = 0; i < players.length; i++) {
    r -= weights[i]
    if (r <= 0) return players[i].name
  }
  return players[players.length - 1].name
}

function assignGoalMinute(isExtraTime = false) {
  let entries = MINUTE_WEIGHTS
  if (!isExtraTime) {
    entries = MINUTE_WEIGHTS.filter(e => e.range[1] <= 90)
    const etW = 0.06 + 0.04
    entries = entries.map(e => ({ ...e, w: e.w + etW / entries.length }))
  }
  const totalW = entries.reduce((s, e) => s + e.w, 0)
  let r = _rand() * totalW
  for (const e of entries) {
    r -= e.w
    if (r <= 0) return Math.floor(e.range[0] + _rand() * (e.range[1] - e.range[0] + 1))
  }
  return 45
}

// ============================================================
// 比赛模拟
// ============================================================

function simulateMatch(home, away, playerData, opts = {}) {
  const { isKnockout = false, matchContext = {}, fatigue = {} } = opts

  const hFatigue = fatigue[home] || 0
  const aFatigue = fatigue[away] || 0
  const h = getTeamRating(home, playerData, hFatigue)
  const a = getTeamRating(away, playerData, aFatigue)

  let homeBoost = HOST_COUNTRIES.has(home) ? 7 : (HOST_COUNTRIES.has(away) ? -2 : 3)

  const hMotivation = calcMotivation(h.overall, a.overall, {
    isFirstMatch: matchContext.isFirstMatchHome,
    mustWin: matchContext.mustWinHome,
  })
  const aMotivation = calcMotivation(a.overall, h.overall, {
    isFirstMatch: matchContext.isFirstMatchAway,
    mustWin: matchContext.mustWinAway,
  })

  const scale = 0.06
  const base = 1.3
  let hExpected = Math.max(0.2, Math.min(4.0, base + (h.attack - a.defense) * scale + homeBoost * 0.04 + hMotivation))
  let aExpected = Math.max(0.2, Math.min(4.0, base + (a.attack - h.defense) * scale - homeBoost * 0.02 + aMotivation))

  let hGoals = poissonSample(hExpected)
  let aGoals = poissonSample(aExpected)

  // 爆冷
  const diff = h.overall - a.overall
  const upsetFactor = Math.max(0, 1.0 - Math.abs(diff) / 20)
  if (upsetFactor > 0.4 && _rand() < upsetFactor * 0.06) {
    if (h.overall < a.overall) hGoals++; else aGoals++
  }

  // 进球详情
  let isEt = false, isPen = false, hPen = 0, aPen = 0
  const homeGoals = Array.from({ length: hGoals }, () => ({ scorer: pickGoalscorer(home, playerData), minute: assignGoalMinute() }))
  const awayGoals = Array.from({ length: aGoals }, () => ({ scorer: pickGoalscorer(away, playerData), minute: assignGoalMinute() }))

  if (isKnockout && hGoals === aGoals) {
    isEt = true
    const etH = poissonSample(0.35)
    const etA = poissonSample(0.30)
    hGoals += etH; aGoals += etA
    for (let i = 0; i < etH; i++) homeGoals.push({ scorer: pickGoalscorer(home, playerData), minute: assignGoalMinute(true) })
    for (let i = 0; i < etA; i++) awayGoals.push({ scorer: pickGoalscorer(away, playerData), minute: assignGoalMinute(true) })

    if (hGoals === aGoals) {
      isPen = true
      const result = simulatePenalties(h, a)
      hPen = result[0]; aPen = result[1]
      for (let i = 0; i < hPen; i++) homeGoals.push({ scorer: '(点球)', minute: `P${i + 1}` })
      for (let i = 0; i < aPen; i++) awayGoals.push({ scorer: '(点球)', minute: `P${i + 1}` })
    }
  }

  const allGoals = [...homeGoals.map(g => ({ ...g, team: home })), ...awayGoals.map(g => ({ ...g, team: away }))]
    .sort((a, b) => (typeof a.minute === 'number' ? a.minute : 999) - (typeof b.minute === 'number' ? b.minute : 999))

  let winner = null
  if (isPen) winner = hPen > aPen ? home : away
  else if (hGoals > aGoals) winner = home
  else if (aGoals > hGoals) winner = away

  return {
    home: { team: home, score: hGoals, pen_score: isPen ? hPen : null, goals: homeGoals },
    away: { team: away, score: aGoals, pen_score: isPen ? aPen : null, goals: awayGoals },
    all_goals: allGoals,
    extra_time: isEt,
    penalties: isPen,
    winner,
  }
}

function simulatePenalties(h, a) {
  const hSkill = h.overall / 100
  const aSkill = a.overall / 100
  let hG = 0, aG = 0
  for (let i = 0; i < 5; i++) {
    if (_rand() < 0.72 + (hSkill - 0.7) * 0.3) hG++
    if (_rand() < 0.72 + (aSkill - 0.7) * 0.3) aG++
    const rem = 4 - i
    if (hG - aG > rem || aG - hG > rem) break
  }
  let rounds = 0
  while (hG === aG && rounds < 10) {
    rounds++
    if (_rand() < 0.72 + (hSkill - 0.7) * 0.2) hG++
    if (_rand() < 0.72 + (aSkill - 0.7) * 0.2) aG++
    if (hG !== aG) break
  }
  return [hG, aG]
}

// ============================================================
// 小组赛
// ============================================================

function simulateGroupStage(playerData) {
  const groupResults = {}
  const allMatches = []
  const matchdays = { 1: [[0,1],[2,3]], 2: [[0,2],[1,3]], 3: [[0,3],[1,2]] }

  for (const [g, teams] of Object.entries(GROUPS)) {
    const standings = {}
    for (const t of teams) standings[t] = { team: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 }
    const groupMatches = []

    for (const [md, pairings] of Object.entries(matchdays)) {
      for (const [i, j] of pairings) {
        const home = teams[i], away = teams[j]
        const ctx = {
          isFirstMatchHome: standings[home].played === 0,
          isFirstMatchAway: standings[away].played === 0,
          mustWinHome: +md === 3 && standings[home].points <= 3,
          mustWinAway: +md === 3 && standings[away].points <= 3,
        }
        const result = simulateMatch(home, away, playerData, { matchContext: ctx })
        result.match_id = `G${g}_${md}_${home}_vs_${away}`
        result.round = `Group ${g} MD${md}`
        groupMatches.push(result)
        allMatches.push(result)

        const { home: h, away: a } = result
        standings[home].played++; standings[away].played++
        standings[home].gf += h.score; standings[home].ga += a.score
        standings[away].gf += a.score; standings[away].ga += h.score
        if (h.score > a.score) { standings[home].won++; standings[home].points += 3; standings[away].lost++ }
        else if (h.score < a.score) { standings[away].won++; standings[away].points += 3; standings[home].lost++ }
        else { standings[home].drawn++; standings[away].drawn++; standings[home].points++; standings[away].points++ }
      }
    }

    for (const t of Object.values(standings)) t.gd = t.gf - t.ga
    const sorted = Object.values(standings).sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf)
    groupResults[g] = { standings: sorted, matches: groupMatches }
  }

  return { groupResults, allMatches }
}

// ============================================================
// 淘汰赛资格
// ============================================================

function determineQualifiers(groupResults) {
  const qualified = [], groupWinners = {}, groupRunners = {}, thirdPlaced = []

  for (const g of Object.keys(GROUPS).sort()) {
    const s = groupResults[g].standings
    groupWinners[g] = s[0].team
    groupRunners[g] = s[1].team
    qualified.push(s[0].team, s[1].team)
    if (s.length >= 3) thirdPlaced.push({ team: s[2].team, group: g, points: s[2].points, gd: s[2].gd, gf: s[2].gf })
  }

  thirdPlaced.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf)
  const bestThird = thirdPlaced.slice(0, 8)
  for (const t of bestThird) qualified.push(t.team)

  return { qualified, groupWinners, groupRunners, bestThird, thirdPlaced }
}

// ============================================================
// 对阵表
// ============================================================

function buildR32Bracket(groupWinners, groupRunners, bestThird) {
  const thirdTeams = {}
  for (const t of bestThird) thirdTeams[t.group] = t.team
  const thirdGroups = new Set(Object.keys(thirdTeams))
  const usedGroups = new Set()
  const matches = []

  for (const [homeSlot, awaySlot] of R32_SLOTS) {
    const home = homeSlot[0] === '1' ? groupWinners[homeSlot[1]] : groupRunners[homeSlot[1]]
    let away

    if (awaySlot[0] === '3RD') {
      const eligible = awaySlot[1]
      away = null
      for (const g of eligible) {
        if (thirdGroups.has(g) && !usedGroups.has(g)) {
          away = thirdTeams[g]; usedGroups.add(g); break
        }
      }
      if (!away) {
        for (const g of thirdGroups) {
          if (!usedGroups.has(g)) { away = thirdTeams[g]; usedGroups.add(g); break }
        }
      }
      if (!away) away = 'TBD'
    } else {
      away = groupRunners[awaySlot[1]]
    }

    matches.push([home, away])
  }

  return matches
}

// ============================================================
// 淘汰赛
// ============================================================

function simulateKnockoutStage(groupResults, playerData) {
  const { qualified, groupWinners, groupRunners, bestThird, thirdPlaced } = determineQualifiers(groupResults)
  const r32Slots = buildR32Bracket(groupWinners, groupRunners, bestThird)
  const fatigue = {}

  const updateFatigue = (result) => {
    for (const team of [result.home.team, result.away.team]) {
      let inc = 0.05
      if (result.extra_time) inc += 0.08
      if (result.penalties) inc += 0.03
      fatigue[team] = (fatigue[team] || 0) + inc
    }
  }

  const playRound = (matches, roundName) => {
    const results = []
    for (const [home, away] of matches) {
      const result = simulateMatch(home, away, playerData, { isKnockout: true, fatigue })
      result.round = roundName
      results.push(result)
      updateFatigue(result)
    }
    return results
  }

  // R32
  const r32Results = r32Slots.map(([h, a], i) => {
    const r = simulateMatch(h, a, playerData, { isKnockout: true, fatigue })
    r.match_id = `M${49 + i}`; r.round = 'R32'
    updateFatigue(r)
    return r
  })

  // R16
  const r16Pairs = []
  for (let i = 0; i < 16; i += 2) r16Pairs.push([r32Results[i].winner, r32Results[i + 1].winner])
  const r16Results = playRound(r16Pairs, 'R16')

  // QF
  const qfPairs = []
  for (let i = 0; i < 8; i += 2) qfPairs.push([r16Results[i].winner, r16Results[i + 1].winner])
  const qfResults = playRound(qfPairs, 'QF')

  // SF
  const sfPairs = []
  for (let i = 0; i < 4; i += 2) sfPairs.push([qfResults[i].winner, qfResults[i + 1].winner])
  const sfResults = playRound(sfPairs, 'SF')
  const sfWinners = sfResults.map(r => r.winner)
  const sfLosers = sfResults.map((r, i) => sfPairs[i][0] === r.winner ? sfPairs[i][1] : sfPairs[i][0])

  // 三四名
  const thirdResult = simulateMatch(sfLosers[0], sfLosers[1], playerData, { isKnockout: true, fatigue })
  thirdResult.round = 'Third Place'; thirdResult.match_id = 'M79'

  // 决赛
  const finalResult = simulateMatch(sfWinners[0], sfWinners[1], playerData, { isKnockout: true, fatigue })
  finalResult.round = 'Final'; finalResult.match_id = 'M80'

  return {
    champion: finalResult.winner,
    runner_up: sfWinners[0] === finalResult.winner ? sfWinners[1] : sfWinners[0],
    third: thirdResult.winner,
    fourth: sfLosers[0] === thirdResult.winner ? sfLosers[1] : sfLosers[0],
    knockout: {
      R32: r32Results,
      R16: r16Results,
      QF: qfResults,
      SF: sfResults,
      THIRD_PLACE: thirdResult,
      FINAL: finalResult,
    },
    qualified,
  }
}

// ============================================================
// 完整锦标赛
// ============================================================

export function simulateTournament(playerData, seed = 42) {
  _rand = createRng(seed)
  _strengthCache.clear()
  _styleCache.clear()

  const { groupResults, allMatches } = simulateGroupStage(playerData)
  const knockout = simulateKnockoutStage(groupResults, playerData)

  // 构建返回数据
  const tournament = { groups: {}, knockout: knockout.knockout, champion: knockout.champion, runner_up: knockout.runner_up, third: knockout.third, fourth: knockout.fourth }
  for (const [g, res] of Object.entries(groupResults)) {
    tournament.groups[g] = {
      standings: res.standings,
      matches: res.matches.map(m => ({
        match_id: m.match_id, home: m.home, away: m.away,
        extra_time: m.extra_time, penalties: m.penalties, winner: m.winner, all_goals: m.all_goals,
      })),
    }
  }

  // analytics
  const allTeams = Object.values(GROUPS).flat()
  const teamStars = {}
  for (const team of allTeams) {
    const players = (playerData[team] || []).slice().sort((a, b) => (b.overall || 0) - (a.overall || 0)).slice(0, 3)
    teamStars[team] = players.map(p => ({ name: p.name, position: p.position, overall: p.overall, potential: p.potential || p.overall, age: p.age || 0, club: p.club || '' }))
  }

  const teamStyles = {}
  for (const team of allTeams) {
    const s = deriveTacticalStyle(team, playerData)
    if (s) teamStyles[team] = s
  }

  // group_of_death
  const groupScores = {}
  for (const [g, res] of Object.entries(groupResults)) {
    const pts = res.standings.map(s => s.points)
    groupScores[g] = { top2_sum: pts.sort((a, b) => b - a).slice(0, 2).reduce((s, v) => s + v, 0), min_qual: Math.min(...pts), max_qual: Math.max(...pts) }
  }
  const god = Object.entries(groupScores).sort((a, b) => b[1].top2_sum - a[1].top2_sum)
  const easiest = Object.entries(groupScores).sort((a, b) => a[1].top2_sum - b[1].top2_sum)

  // tournament summary
  let totalGoals = 0, totalMatches = 0, etMatches = 0, penMatches = 0
  for (const [, m] of Object.entries(knockout.knockout)) {
    const matches = Array.isArray(m) ? m : [m]
    totalMatches += matches.length
    for (const match of matches) {
      totalGoals += match.home.score + match.away.score
      if (match.extra_time) etMatches++
      if (match.penalties) penMatches++
    }
  }
  for (const g of Object.values(tournament.groups)) {
    totalMatches += g.matches.length
    for (const m of g.matches) totalGoals += m.home.score + m.away.score
  }

  // upsets
  const upsets = []
  for (const rnd of ['R32', 'R16', 'QF']) {
    for (const m of (knockout.knockout[rnd] || [])) {
      const hOvr = teamStars[m.home.team]?.[0]?.overall || 70
      const aOvr = teamStars[m.away.team]?.[0]?.overall || 70
      const winner = m.winner
      const wOvr = winner === m.home.team ? hOvr : aOvr
      const lOvr = winner === m.home.team ? aOvr : hOvr
      const loser = winner === m.home.team ? m.away.team : m.home.team
      if (lOvr > wOvr && lOvr - wOvr > 3) {
        // 比分始终按 赢方-输方 存储
        const winScore = winner === m.home.team ? m.home.score : m.away.score
        const loseScore = winner === m.home.team ? m.away.score : m.home.score
        upsets.push({ round: rnd, winner, loser, score: `${winScore}-${loseScore}`, win_odds: wOvr, lose_odds: lOvr, gap: lOvr - wOvr })
      }
    }
  }
  upsets.sort((a, b) => b.gap - a.gap)

  // 统计射手榜
  const scorerGoals = {}
  const countGoals = (matches) => {
    const list = Array.isArray(matches) ? matches : [matches]
    for (const m of list) {
      for (const g of (m.all_goals || [])) {
        if (g.scorer && g.scorer !== '(点球)') {
          scorerGoals[g.scorer] = (scorerGoals[g.scorer] || 0) + 1
        }
      }
    }
  }
  for (const g of Object.values(tournament.groups)) countGoals(g.matches)
  for (const rnd of ['R32', 'R16', 'QF', 'SF', 'THIRD_PLACE', 'FINAL']) {
    countGoals(knockout.knockout[rnd])
  }
  const topScorers = Object.entries(scorerGoals).sort((a, b) => b[1] - a[1]).slice(0, 20)
    .reduce((o, [name, goals]) => { o[name] = goals; return o }, {})

  const analytics = {
    group_of_death: {
      groups: god.slice(0, 3).map(([g, info]) => ({ letter: g, teams: tournament.groups[g].standings.map(s => s.team), ...info })),
      easiest: easiest.slice(0, 3).map(([g, info]) => ({ letter: g, teams: tournament.groups[g].standings.map(s => s.team), ...info })),
    },
    upsets: upsets.slice(0, 8),
    team_stars: teamStars,
    team_styles: teamStyles,
    top_scorers: topScorers,
    tournament_summary: { total_goals: totalGoals, total_matches: totalMatches, avg_goals: totalMatches ? +(totalGoals / totalMatches).toFixed(2) : 0, extra_time_matches: etMatches, penalty_matches: penMatches },
  }

  return { tournament, analytics, seed }
}

// ============================================================
// 蒙特卡洛聚合
// ============================================================

export function runMonteCarlo(playerData, baseSeed = 42, iterations = 1000) {
  const champions = {}
  const semifinalists = {}
  const quarterfinalists = {}
  const qualified = {}
  const groupWinners = {}
  const allScorers = {}

  for (let i = 0; i < iterations; i++) {
    const seed = baseSeed + i * 137
    const { tournament } = simulateTournament(playerData, seed)

    champions[tournament.champion] = (champions[tournament.champion] || 0) + 1
    for (const t of [tournament.runner_up, tournament.third, tournament.fourth]) {
      semifinalists[t] = (semifinalists[t] || 0) + 1
    }

    // 出线统计
    for (const [g, group] of Object.entries(tournament.groups)) {
      for (let j = 0; j < 2; j++) {
        const t = group.standings[j]?.team
        if (t) qualified[t] = (qualified[t] || 0) + 1
      }
      const gw = group.standings[0]?.team
      if (gw) groupWinners[gw] = (groupWinners[gw] || 0) + 1
    }

    // 射手统计
    const countGoals = (matches) => {
      const list = Array.isArray(matches) ? matches : [matches]
      for (const m of list) {
        for (const goal of (m.all_goals || [])) {
          if (goal.scorer && goal.scorer !== '(点球)') {
            allScorers[goal.scorer] = (allScorers[goal.scorer] || 0) + 1
          }
        }
      }
    }
    for (const g of Object.values(tournament.groups)) countGoals(g.matches)
    for (const rnd of ['R32', 'R16', 'QF', 'SF', 'THIRD_PLACE', 'FINAL']) {
      countGoals(tournament.knockout[rnd])
    }
  }

  const toPercent = (obj) => {
    const sorted = Object.entries(obj).sort((a, b) => b[1] - a[1])
    return Object.fromEntries(sorted.map(([k, v]) => [k, +(v / iterations * 100).toFixed(1)]))
  }

  const avgGoals = (obj) => {
    const sorted = Object.entries(obj).sort((a, b) => b[1] - a[1])
    return Object.fromEntries(sorted.map(([k, v]) => [k, +(v / iterations).toFixed(2)]))
  }

  return {
    n_simulations: iterations,
    championship_odds: toPercent(champions),
    semifinal_odds: toPercent(semifinalists),
    group_qualification_odds: toPercent(qualified),
    group_winner_odds: toPercent(groupWinners),
    top_scorers: avgGoals(allScorers),
  }
}
