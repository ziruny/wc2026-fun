import { X } from '@phosphor-icons/react'
import { t } from '../lib/i18n'

function GoalItem({ goal, teamSide }) {
  const isPenalty = typeof goal.minute === 'string'
  return (
    <div className={`flex items-center gap-2 py-1 ${teamSide === 'away' ? 'flex-row-reverse' : ''}`}>
      <span className="font-mono text-xs min-w-[36px] text-center" style={{color: isPenalty ? '#94a3b8' : '#f0c040'}}>
        {isPenalty ? goal.minute : `${goal.minute}'`}
      </span>
      <span className="text-sm text-white">{goal.scorer}</span>
      {isPenalty && <span className="text-[10px] text-slate-500">点球</span>}
    </div>
  )
}

export default function MatchDetail({ match, onClose }) {
  if (!match) return null
  const h = match.home
  const a = match.away
  const hWin = match.winner === h.team
  const aWin = match.winner === a.team

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-pitch-light border border-pitch-border rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors z-10 cursor-pointer">
          <X className="w-5 h-5" />
        </button>

        <div className="bg-pitch-surface px-6 py-8 text-center">
          <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase mb-4">{match.round || match.match_id}</p>
          <div className="flex items-center justify-center gap-6">
            <div className="text-right flex-1">
              <p className={`text-lg font-bold ${hWin ? 'text-white' : 'text-slate-400'}`}>{t(h.team)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-4xl font-bold font-mono ${hWin ? 'text-gold' : 'text-slate-400'}`}>{h.score}</span>
              <span className="text-xl text-slate-600">:</span>
              <span className={`text-4xl font-bold font-mono ${aWin ? 'text-gold' : 'text-slate-400'}`}>{a.score}</span>
            </div>
            <div className="text-left flex-1">
              <p className={`text-lg font-bold ${aWin ? 'text-white' : 'text-slate-400'}`}>{t(a.team)}</p>
            </div>
          </div>
          {match.extra_time && <p className="text-xs text-gold-dim font-mono mt-2">加时赛后</p>}
          {match.penalties && (
            <p className="text-xs text-slate-400 font-mono mt-1">点球大战 {h.pen_score} - {a.pen_score}</p>
          )}
        </div>

        {match.all_goals && match.all_goals.length > 0 && (
          <div className="px-6 py-4">
            <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase mb-3">进球时间线</p>
            <div className="space-y-0.5">
              {match.all_goals.map((g, i) => (
                <GoalItem key={i} goal={g} teamSide={g.team === h.team ? 'home' : 'away'} />
              ))}
            </div>
          </div>
        )}

        <div className="px-6 py-3 border-t border-pitch-border bg-pitch-surface/30">
          <p className="text-center text-sm">
            <span className="text-slate-500">获胜方：</span>
            <span className="text-gold font-semibold">{t(match.winner)}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
