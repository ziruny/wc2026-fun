import { Trophy } from '@phosphor-icons/react'
import { t } from '../lib/i18n'

const ROUNDS = [
  { key: 'R32', label: '1/16 决赛' },
  { key: 'R16', label: '1/8 决赛' },
  { key: 'QF', label: '1/4 决赛' },
  { key: 'SF', label: '半决赛' },
]

function MatchCard({ match, compact, onClick }) {
  if (!match) return <div className="h-16" />
  const h = match.home
  const a = match.away
  const hWin = match.winner === h.team
  const aWin = match.winner === a.team

  return (
    <button
      onClick={() => onClick(match)}
      className={`w-full text-left rounded-lg border border-pitch-border/60 overflow-hidden hover:border-pitch-border hover:bg-pitch-surface/30 transition-all cursor-pointer ${compact ? 'text-xs' : 'text-sm'}`}
    >
      <div className={`flex items-center justify-between px-3 ${compact ? 'py-1.5' : 'py-2'} ${hWin ? 'bg-emerald-glow/8' : ''}`}>
        <span className={`truncate ${hWin ? 'text-white font-semibold' : 'text-slate-400'}`}>{t(h.team)}</span>
        <span className="font-mono font-bold ml-2" style={{color: hWin ? '#f0c040' : '#64748b'}}>{h.score}</span>
      </div>
      <div className="h-px bg-pitch-border/40" />
      <div className={`flex items-center justify-between px-3 ${compact ? 'py-1.5' : 'py-2'} ${aWin ? 'bg-emerald-glow/8' : ''}`}>
        <span className={`truncate ${aWin ? 'text-white font-semibold' : 'text-slate-400'}`}>{t(a.team)}</span>
        <span className="font-mono font-bold ml-2" style={{color: aWin ? '#f0c040' : '#64748b'}}>{a.score}</span>
      </div>
      {(match.extra_time || match.penalties) && (
        <div className="px-3 py-1 bg-pitch-surface/30 border-t border-pitch-border/30">
          {match.extra_time && <span className="text-[10px] text-gold-dim font-mono">加时</span>}
          {match.penalties && <span className="text-[10px] text-slate-500 font-mono ml-2">点球 {h.pen_score}-{a.pen_score}</span>}
        </div>
      )}
    </button>
  )
}

function RoundColumn({ label, matches, onClick }) {
  return (
    <div className="flex flex-col gap-3 min-w-[180px]">
      <div className="text-center mb-2">
        <p className="text-xs font-semibold text-gold tracking-wider">{label}</p>
      </div>
      <div className="flex flex-col gap-2">
        {matches.map((m, i) => (
          <MatchCard key={m.match_id || i} match={m} compact onClick={onClick} />
        ))}
      </div>
    </div>
  )
}

export default function Bracket({ knockout, onMatchClick }) {
  const finalMatch = knockout.FINAL
  const thirdPlace = knockout.THIRD_PLACE

  return (
    <div>
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-[1200px] items-start">
          {ROUNDS.map(r => (
            <RoundColumn
              key={r.key}
              label={r.label}
              matches={knockout[r.key] || []}
              onClick={onMatchClick}
            />
          ))}

          <div className="flex flex-col gap-4 min-w-[200px]">
            <div className="text-center mb-2">
              <p className="text-xs font-semibold text-gold tracking-wider">决赛</p>
            </div>
            <MatchCard match={finalMatch} onClick={onMatchClick} />

            <div className="mt-6">
              <div className="text-center mb-2">
                <p className="text-xs font-semibold text-bronze tracking-wider">三四名决赛</p>
              </div>
              <MatchCard match={thirdPlace} onClick={onMatchClick} />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center min-w-[160px] pt-16">
            <div className="w-20 h-20 rounded-full bg-gold/15 border-2 border-gold/40 flex items-center justify-center mb-3">
              <Trophy className="w-10 h-10 text-gold" weight="fill" />
            </div>
            <p className="text-lg font-bold text-gold">{t(finalMatch?.winner)}</p>
            <p className="text-[10px] text-slate-500 font-mono tracking-wider mt-1">冠军</p>
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-pitch-border pt-4">
        <p className="text-xs text-slate-500 font-mono mb-3">1/16 决赛对阵</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(knockout.R32 || []).map((m, i) => (
            <button
              key={i}
              onClick={() => onMatchClick(m)}
              className="text-left px-3 py-2 rounded-lg border border-pitch-border/40 hover:border-pitch-border hover:bg-pitch-surface/30 transition-all text-xs cursor-pointer"
            >
              <span className="font-mono text-slate-500 text-[10px]">{m.match_id}</span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={m.winner === m.home.team ? 'text-white font-semibold' : 'text-slate-400'}>{t(m.home.team)}</span>
                <span className="font-mono text-slate-500 mx-1">{m.home.score}-{m.away.score}</span>
                <span className={m.winner === m.away.team ? 'text-white font-semibold' : 'text-slate-400'}>{t(m.away.team)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
