import { useMemo, useState } from 'react'
import { t } from '../lib/i18n'

function BarChart({ data, maxItems = 15, valueLabel = '%' }) {
  const items = data.slice(0, maxItems)
  const maxVal = Math.max(...items.map(d => d.value), 1)

  return (
    <div className="space-y-1.5">
      {items.map((d, i) => (
        <div key={d.name} className="flex items-center gap-3">
          <span className="text-xs text-slate-300 w-28 truncate text-right">{d.name}</span>
          <div className="flex-1 h-6 bg-pitch-surface rounded-md overflow-hidden relative">
            <div
              className="h-full rounded-md transition-all duration-500"
              style={{
                width: `${(d.value / maxVal) * 100}%`,
                background: i === 0
                  ? 'linear-gradient(90deg, #f0c040, #b8941e)'
                  : i < 3
                  ? 'linear-gradient(90deg, #10b981, #059669)'
                  : 'linear-gradient(90deg, #1e3a5f, #162544)',
              }}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono text-white/80">
              {typeof d.value === 'number' ? d.value.toFixed(1) : d.value}{valueLabel}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Probabilities({ tournament, analytics, mc, seed }) {
  const [mode, setMode] = useState('monte_carlo')

  // 当前模拟的射手榜
  const currentScorers = useMemo(() => {
    if (!analytics?.top_scorers) return []
    return Object.entries(analytics.top_scorers)
      .map(([name, goals]) => ({ name, value: goals }))
      .sort((a, b) => b.value - a.value)
  }, [analytics])

  // 当前模拟的小组出线情况
  const currentQualifiers = useMemo(() => {
    if (!tournament?.groups) return []
    const qualifiers = []
    for (const [g, group] of Object.entries(tournament.groups)) {
      for (let i = 0; i < Math.min(3, group.standings.length); i++) {
        qualifiers.push({
          name: `${t(group.standings[i].team)}`,
          value: group.standings[i].points,
          group: g,
          rank: i + 1,
        })
      }
    }
    return qualifiers.sort((a, b) => b.value - a.value)
  }, [tournament])

  // 蒙特卡洛数据（来自 mc prop）
  const mcCharts = useMemo(() => ({
    championship: Object.entries(mc?.championship_odds || {}).map(([name, value]) => ({ name: t(name), value })),
    semifinal: Object.entries(mc?.semifinal_odds || {}).map(([name, value]) => ({ name: t(name), value })),
    qualification: Object.entries(mc?.group_qualification_odds || {}).map(([name, value]) => ({ name: t(name), value })),
    scorers: Object.entries(mc?.top_scorers || {}).map(([name, value]) => ({ name, value })),
  }), [mc])

  return (
    <div>
      {/* 模式切换 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('monte_carlo')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            mode === 'monte_carlo'
              ? 'bg-pitch-border text-white'
              : 'text-slate-400 hover:text-slate-200 hover:bg-pitch-surface/50'
          }`}
        >
          蒙特卡洛概率
          <span className="ml-1.5 text-[10px] text-slate-500 font-mono">1000 次模拟</span>
        </button>
        <button
          onClick={() => setMode('current')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            mode === 'current'
              ? 'bg-pitch-border text-white'
              : 'text-slate-400 hover:text-slate-200 hover:bg-pitch-surface/50'
          }`}
        >
          当前模拟
          <span className="ml-1.5 text-[10px] text-slate-500 font-mono">seed={seed}</span>
        </button>
      </div>

      {mode === 'monte_carlo' && (
        <div>
          <div className="flex items-center gap-4 mb-4 text-xs text-slate-500 font-mono">
            <span>基于 {mc?.n_simulations || 0} 次模拟的统计概率</span>
          </div>

          <div className="space-y-6">
            <section>
              <h3 className="text-sm font-semibold text-white mb-3">夺冠概率</h3>
              <div className="bg-pitch-light rounded-xl border border-pitch-border p-6">
                <BarChart data={mcCharts.championship} maxItems={15} valueLabel="%" />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-white mb-3">四强概率</h3>
              <div className="bg-pitch-light rounded-xl border border-pitch-border p-6">
                <BarChart data={mcCharts.semifinal} maxItems={15} valueLabel="%" />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-white mb-3">小组出线概率</h3>
              <div className="bg-pitch-light rounded-xl border border-pitch-border p-6">
                <BarChart data={mcCharts.qualification} maxItems={24} valueLabel="%" />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-white mb-3">最佳射手（场均）</h3>
              <div className="bg-pitch-light rounded-xl border border-pitch-border p-6">
                <BarChart data={mcCharts.scorers} maxItems={15} valueLabel=" 球" />
              </div>
            </section>
          </div>
        </div>
      )}

      {mode === 'current' && (
        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-white mb-3">当前射手榜</h3>
            <div className="bg-pitch-light rounded-xl border border-pitch-border p-6">
              {currentScorers.length > 0 ? (
                <BarChart data={currentScorers.slice(0, 15)} maxItems={15} valueLabel=" 球" />
              ) : (
                <p className="text-slate-500 text-sm">暂无进球数据</p>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-white mb-3">小组积分排名</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(tournament?.groups || {}).map(([g, group]) => (
                <div key={g} className="bg-pitch-light rounded-xl border border-pitch-border p-4">
                  <p className="text-xs font-bold text-gold mb-2">{g} 组</p>
                  {group.standings.map((s, i) => (
                    <div key={s.team} className="flex items-center justify-between text-xs py-1">
                      <span className={`${i < 2 ? 'text-white font-medium' : 'text-slate-400'}`}>
                        {i + 1}. {t(s.team)}
                      </span>
                      <span className="font-mono text-slate-300">{s.points}分</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
