import { useState } from 'react'
import { Trophy, Crown, Medal, MapPin, ArrowRight, Clock, SoccerBall } from '@phosphor-icons/react'
import { t } from '../lib/i18n'

// 冠军之路时间线
function JourneyTimeline({ journey, onMatchClick }) {
  if (!journey?.length) return null

  return (
    <div className="relative">
      {/* 连接线 */}
      <div className="absolute left-4 md:left-6 top-8 bottom-8 w-px bg-gradient-to-b from-gold/60 via-gold/30 to-transparent" />

      <div className="space-y-3">
        {journey.map((step, i) => {
          const isFinal = step.round === 'Final'
          return (
            <div key={i} className="relative flex items-start gap-3 md:gap-4 group">
              {/* 节点 */}
              <div className={`relative z-10 w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 transition-all ${
                isFinal
                  ? 'bg-gold/30 border-2 border-gold shadow-lg shadow-gold/20'
                  : 'bg-pitch-surface border border-pitch-border group-hover:border-gold/40'
              }`}>
                {isFinal ? (
                  <Crown className="w-4 h-4 md:w-6 md:h-6 text-gold" weight="fill" />
                ) : (
                  <span className="text-[10px] md:text-xs font-mono font-bold text-slate-400">{i + 1}</span>
                )}
              </div>

              {/* 内容 */}
              <button
                onClick={() => step.match && onMatchClick(step.match)}
                className={`flex-1 text-left p-3 md:p-4 rounded-xl border transition-all cursor-pointer active:scale-[0.99] ${
                  isFinal
                    ? 'bg-gradient-to-r from-gold/10 to-transparent border-gold/30 hover:border-gold/50'
                    : 'bg-pitch-light border-pitch-border/60 hover:border-pitch-border hover:bg-pitch-surface/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] md:text-xs font-mono tracking-wider uppercase ${isFinal ? 'text-gold' : 'text-slate-500'}`}>
                    {step.round}
                  </span>
                  {step.match?.extra_time && (
                    <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 加时
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm md:text-base font-semibold text-white">{t(step.opponent)}</span>
                  </div>
                  <span className={`font-mono text-lg md:text-xl font-bold ${isFinal ? 'text-gold' : 'text-white'}`}>
                    {step.score}
                  </span>
                </div>
                {step.match?.all_goals?.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {step.match.all_goals.slice(0, 5).map((g, j) => (
                      <span key={j} className="text-[10px] text-slate-400 font-mono">
                        {typeof g.minute === 'number' ? `${g.minute}'` : ''} {g.scorer}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// 四强卡片
function FinalFour({ tournament }) {
  if (!tournament?.champion) return null
  const teams = [
    { label: '冠军', team: tournament.champion, icon: Crown, color: 'text-gold', bg: 'bg-gold/15 border-gold/30' },
    { label: '亚军', team: tournament.runner_up, icon: Medal, color: 'text-slate-300', bg: 'bg-slate-500/10 border-slate-500/30' },
    { label: '季军', team: tournament.third, icon: Medal, color: 'text-amber-600', bg: 'bg-amber-900/10 border-amber-700/30' },
    { label: '殿军', team: tournament.fourth, icon: Trophy, color: 'text-slate-400', bg: 'bg-pitch-surface border-pitch-border' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
      {teams.map((item, i) => {
        const Icon = item.icon
        return (
          <div key={i} className={`${item.bg} border rounded-xl p-3 md:p-4 text-center transition-all hover:scale-[1.02]`}>
            <Icon className={`w-5 h-5 md:w-6 md:h-6 mx-auto mb-1.5 ${item.color}`} weight="fill" />
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">{item.label}</p>
            <p className={`text-sm md:text-base font-bold mt-0.5 ${item.color}`}>{t(item.team)}</p>
          </div>
        )
      })}
    </div>
  )
}

// 赛事数据概览
function StatsOverview({ analytics }) {
  const ts = analytics?.tournament_summary
  if (!ts) return null

  const stats = [
    { label: '总进球', value: ts.total_goals, sub: '球' },
    { label: '场均进球', value: ts.avg_goals, sub: '球/场' },
    { label: '加时赛', value: ts.extra_time_matches, sub: '场' },
    { label: '点球大战', value: ts.penalty_matches, sub: '场' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {stats.map((s, i) => (
        <div key={i} className="bg-pitch-light border border-pitch-border/60 rounded-xl p-3 text-center">
          <p className="text-xl md:text-2xl font-bold text-white font-mono">{s.value}</p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  )
}

export default function ChampionHero({ tournament, analytics, mc, onMatchClick }) {
  const [showJourney, setShowJourney] = useState(false)

  // 构建冠军之路数据
  const buildJourney = () => {
    const ko = tournament.knockout
    const champion = tournament.champion
    if (!ko || !champion) return []
    const journey = []

    for (const rnd of ['R32', 'R16', 'QF', 'SF']) {
      for (const m of (ko[rnd] || [])) {
        if (!m?.home?.team || !m?.away?.team) continue
        if (m.home.team === champion || m.away.team === champion) {
          const opponent = m.home.team === champion ? m.away.team : m.home.team
          const hScore = m.home.score ?? 0
          const aScore = m.away.score ?? 0
          const et = m.extra_time ? ' (AET)' : ''
          const pen = m.penalties ? ` (Pens ${m.home.pen_score}-${m.away.pen_score})` : ''
          journey.push({
            round: rnd === 'R32' ? '1/16 决赛' : rnd === 'R16' ? '1/8 决赛' : rnd === 'QF' ? '1/4 决赛' : '半决赛',
            opponent,
            score: `${hScore}-${aScore}${et}${pen}`,
            match: m,
          })
          break
        }
      }
    }

    const final = ko.FINAL
    if (final?.home?.team && final?.away?.team) {
      const opponent = final.home.team === champion ? final.away.team : final.home.team
      journey.push({
        round: '决赛',
        opponent,
        score: `${final.home.score ?? 0}-${final.away.score ?? 0}${final.extra_time ? ' (AET)' : ''}${final.penalties ? ` (Pens ${final.home.pen_score}-${final.away.pen_score})` : ''}`,
        match: final,
      })
    }

    return journey
  }

  const journey = buildJourney()

  return (
    <div className="space-y-4 md:space-y-6">
      {/* 冠军主视觉 */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gold/8 via-pitch-light to-pitch-light border border-gold/20 rounded-2xl p-4 md:p-8">
        {/* 背景装饰 */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gold/3 rounded-full blur-2xl translate-y-1/2" />

        <div className="relative">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-8">
            {/* 奖杯 */}
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 flex items-center justify-center shrink-0">
              <Trophy className="w-12 h-12 md:w-16 md:h-16 text-gold" weight="fill" />
            </div>

            {/* 信息 */}
            <div className="text-center md:text-left flex-1">
              <p className="text-[11px] text-gold-dim font-mono tracking-widest uppercase mb-1">2026 冠军</p>
              <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-2">{t(tournament.champion)}</h2>
              <p className="text-sm md:text-base text-slate-400 mb-4">
                决赛击败 {t(tournament.runner_up)}，{tournament.third && `${t(tournament.third)} 获得季军`}
              </p>

              {/* 展开冠军之路按钮 */}
              <button
                onClick={() => setShowJourney(!showJourney)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gold/15 border border-gold/30 rounded-lg text-sm font-medium text-gold hover:bg-gold/25 transition-all cursor-pointer active:scale-[0.98]"
              >
                <MapPin className="w-4 h-4" />
                {showJourney ? '收起夺冠之路' : '查看夺冠之路'}
                <ArrowRight className={`w-4 h-4 transition-transform ${showJourney ? 'rotate-90' : ''}`} />
              </button>
            </div>
          </div>

          {/* 冠军之路时间线（展开） */}
          {showJourney && (
            <div className="mt-6 pt-6 border-t border-gold/20">
              <h3 className="text-sm font-semibold text-gold mb-4 font-mono tracking-wider">夺冠之路</h3>
              <JourneyTimeline journey={journey} onMatchClick={onMatchClick} />
            </div>
          )}
        </div>
      </section>

      {/* 四强 */}
      <FinalFour tournament={tournament} />

      {/* 赛事数据 */}
      <StatsOverview analytics={analytics} />

      {/* 关键爆冷 */}
      {analytics?.upsets?.length > 0 && (
        <section className="bg-pitch-light border border-pitch-border/60 rounded-xl p-4 md:p-6">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <SoccerBall className="w-4 h-4 text-amber-400" />
            本届爆冷
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {analytics.upsets.slice(0, 4).map((u, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-pitch-surface rounded-lg border border-pitch-border/40">
                <div>
                  <span className="text-sm font-medium text-white">{t(u.winner)}</span>
                  <span className="text-xs text-slate-500 ml-1">胜 {t(u.loser)}</span>
                </div>
                <span className="font-mono text-sm text-amber-400 font-bold">{u.score}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 蒙特卡洛概率速览 */}
      {mc?.championship_odds && (
        <section className="bg-pitch-light border border-pitch-border/60 rounded-xl p-4 md:p-6">
          <h3 className="text-sm font-semibold text-white mb-3">夺冠概率 Top 8</h3>
          <div className="space-y-1.5">
            {Object.entries(mc.championship_odds).slice(0, 8).map(([team, pct], i) => (
              <div key={team} className="flex items-center gap-2">
                <span className="text-xs text-slate-300 w-20 md:w-24 truncate text-right">{t(team)}</span>
                <div className="flex-1 h-5 bg-pitch-surface rounded-md overflow-hidden relative">
                  <div
                    className="h-full rounded-md transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (pct / Object.values(mc.championship_odds)[0]) * 100)}%`,
                      background: i === 0
                        ? 'linear-gradient(90deg, #f0c040, #b8941e)'
                        : i < 3
                        ? 'linear-gradient(90deg, #10b981, #059669)'
                        : 'linear-gradient(90deg, #1e3a5f, #162544)',
                    }}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-white/80">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
