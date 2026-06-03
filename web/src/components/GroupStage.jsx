import { useState } from 'react'
import { t as tr } from '../lib/i18n'

const GROUP_ORDER = 'ABCDEFGHIJKL'.split('')

function StandingRow({ t, rank }) {
  const bg = rank <= 2 ? 'bg-emerald-glow/5' : rank === 3 ? 'bg-gold/5' : ''
  return (
    <tr className={`${bg} border-b border-pitch-border/50 hover:bg-pitch-surface/50 transition-colors`}>
      <td className="py-2 px-2 text-center font-mono text-xs text-slate-500 w-8">{rank}</td>
      <td className="py-2 px-2 font-medium text-sm text-white">{tr(t.team)}</td>
      <td className="py-2 px-2 text-center font-mono text-xs">{t.played}</td>
      <td className="py-2 px-2 text-center font-mono text-xs text-emerald-glow">{t.won}</td>
      <td className="py-2 px-2 text-center font-mono text-xs text-slate-400">{t.drawn}</td>
      <td className="py-2 px-2 text-center font-mono text-xs text-red-400">{t.lost}</td>
      <td className="py-2 px-2 text-center font-mono text-xs">{t.gf}</td>
      <td className="py-2 px-2 text-center font-mono text-xs">{t.ga}</td>
      <td className="py-2 px-2 text-center font-mono text-xs font-semibold" style={{color: t.gd > 0 ? '#10b981' : t.gd < 0 ? '#f87171' : '#94a3b8'}}>{t.gd > 0 ? '+' : ''}{t.gd}</td>
      <td className="py-2 px-2 text-center font-mono text-sm font-bold text-white">{t.points}</td>
    </tr>
  )
}

function GoalTimeline({ goals }) {
  if (!goals || goals.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {goals.map((g, i) => (
        <span key={i} className="text-[10px] text-gold-dim font-mono">
          {typeof g.minute === 'number' ? `${g.minute}'` : g.minute} {g.scorer}
          {i < goals.length - 1 ? ',' : ''}
        </span>
      ))}
    </div>
  )
}

function MatchRow({ m, onClick }) {
  const h = m.home
  const a = m.away
  const hWin = m.winner === h.team
  const aWin = m.winner === a.team
  return (
    <button
      onClick={() => onClick(m)}
      className="w-full text-left py-2 px-3 border-b border-pitch-border/30 hover:bg-pitch-surface/60 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-2 text-sm">
        <span className={`flex-1 truncate ${hWin ? 'text-white font-semibold' : 'text-slate-400'}`}>{tr(h.team)}</span>
        <span className="font-mono font-bold text-white text-base min-w-[48px] text-center">
          {h.score} - {a.score}
        </span>
        <span className={`flex-1 truncate text-right ${aWin ? 'text-white font-semibold' : 'text-slate-400'}`}>{tr(a.team)}</span>
      </div>
      {(h.goals.length > 0 || a.goals.length > 0) && (
        <div className="flex justify-between mt-0.5">
          <GoalTimeline goals={h.goals.filter(g => g.scorer !== '(点球)')} />
          <div className="w-4" />
          <GoalTimeline goals={a.goals.filter(g => g.scorer !== '(点球)')} />
        </div>
      )}
      {m.extra_time && <span className="text-[10px] text-gold-dim font-mono">加时</span>}
    </button>
  )
}

export default function GroupStage({ groups, onMatchClick }) {
  const [expanded, setExpanded] = useState(null)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {GROUP_ORDER.map(g => {
        const group = groups[g]
        if (!group) return null
        const isOpen = expanded === g
        return (
          <div key={g} className="bg-pitch-light rounded-xl border border-pitch-border overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : g)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-pitch-surface/50 transition-colors cursor-pointer"
            >
              <span className="text-sm font-bold text-gold tracking-wider">{g} 组</span>
              <span className="text-xs text-slate-500 font-mono">{group.matches.length} 场比赛</span>
            </button>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-pitch-border">
                    <th className="py-1.5 px-2 text-center w-8">#</th>
                    <th className="py-1.5 px-2 text-left">Team</th>
                    <th className="py-1.5 px-2 text-center">P</th>
                    <th className="py-1.5 px-2 text-center">W</th>
                    <th className="py-1.5 px-2 text-center">D</th>
                    <th className="py-1.5 px-2 text-center">L</th>
                    <th className="py-1.5 px-2 text-center">GF</th>
                    <th className="py-1.5 px-2 text-center">GA</th>
                    <th className="py-1.5 px-2 text-center">GD</th>
                    <th className="py-1.5 px-2 text-center">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {group.standings.map((t, i) => (
                    <StandingRow key={t.team} t={t} rank={i + 1} />
                  ))}
                </tbody>
              </table>
            </div>

            {isOpen && (
              <div className="border-t border-pitch-border">
                {group.matches.map((m, i) => (
                  <MatchRow key={i} m={m} onClick={onMatchClick} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
