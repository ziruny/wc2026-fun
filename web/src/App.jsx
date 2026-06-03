import { useState, useCallback } from 'react'
import { Trophy, Users, ChartLineUp, Play, DiceFive, CaretDown, Crown } from '@phosphor-icons/react'
import GroupStage from './components/GroupStage'
import Bracket from './components/Bracket'
import MatchDetail from './components/MatchDetail'
import Probabilities from './components/Probabilities'
import ChampionHero from './components/ChampionHero'
import ErrorBoundary from './components/ErrorBoundary'
import { simulateTournament, runMonteCarlo } from './lib/simulation'
import { t } from './lib/i18n'
import playerData from './data/players_fc26.json'

const TABS = [
  { key: 'hero', label: '冠军之路', icon: Crown },
  { key: 'bracket', label: '对阵', icon: Trophy },
  { key: 'groups', label: '分组', icon: Users },
  { key: 'odds', label: '概率', icon: ChartLineUp },
]

// 饥荒风格进度消息
const PROGRESS_STAGES = [
  { key: 'init', msgs: ['正在加载球员数据…', '正在初始化模拟引擎…', '准备就绪…'] },
  { key: 'group', msgs: ['正在抽签分组…', '正在模拟小组赛第1轮…', '正在模拟小组赛第2轮…', '正在模拟小组赛第3轮…', '小组赛积分计算完成…'] },
  { key: 'knockout', msgs: ['正在确定32强对阵…', '正在模拟1/16决赛…', '正在模拟1/8决赛…', '正在模拟1/4决赛…', '正在模拟半决赛…', '正在模拟决赛…', '淘汰赛模拟完成…'] },
  { key: 'monte_carlo', msgs: ['正在启动蒙特卡洛引擎…', '正在进行第 {n} 次模拟…', '正在统计数据…', '蒙特卡洛聚合完成…'] },
]

function ProgressDisplay({ stage, detail }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* 进度图标 */}
        <div className="relative w-20 h-20 mx-auto mb-8">
          <div className="absolute inset-0 border-2 border-gold/20 rounded-full" />
          <div className="absolute inset-0 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-2 bg-pitch-light rounded-full flex items-center justify-center">
            <Trophy className="w-8 h-8 text-gold animate-pulse" weight="fill" />
          </div>
        </div>

        {/* 阶段标题 */}
        <h2 className="text-lg font-bold text-white mb-2">{detail || '准备中…'}</h2>

        {/* 阶段指示器 */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {['init', 'group', 'knockout', 'monte_carlo'].map((s, i) => {
            const stageIdx = ['init', 'group', 'knockout', 'monte_carlo'].indexOf(stage)
            const isActive = i === stageIdx
            const isDone = i < stageIdx
            return (
              <div
                key={s}
                className={`h-1 rounded-full transition-all duration-500 ${
                  isDone ? 'w-8 bg-gold' : isActive ? 'w-8 bg-gold/50 animate-pulse' : 'w-4 bg-pitch-border'
                }`}
              />
            )
          })}
        </div>

        {/* 底部趣味提示 */}
        <p className="text-[11px] text-slate-500 font-mono">
          {stage === 'group' && '🏟️ 每支球队都在奋力拼搏…'}
          {stage === 'knockout' && '⚔️ 淘汰赛没有退路…'}
          {stage === 'monte_carlo' && '🎲 概率的世界里没有偶然…'}
        </p>
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('hero')
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [seed, setSeed] = useState(666)
  const [mcIterations, setMcIterations] = useState(6666)
  const [seedInput, setSeedInput] = useState('666')
  const [mcInput, setMcInput] = useState('6666')
  const [showConfig, setShowConfig] = useState(false)

  // 生成状态
  const [generating, setGenerating] = useState(false)
  const [progressStage, setProgressStage] = useState('')
  const [progressDetail, setProgressDetail] = useState('')

  // 数据
  const [tournament, setTournament] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [mc, setMc] = useState(null)

  // 模拟 + 蒙特卡洛 + LLM 全流程（带自动重试）
  const handleGenerate = useCallback(async (newSeed, iterations, retryCount = 0) => {
    setGenerating(true)
    setProgressStage('init')
    setProgressDetail('正在加载球员数据…')

    const delay = (ms) => new Promise(r => setTimeout(r, ms))
    const show = (stage, detail) => { setProgressStage(stage); setProgressDetail(detail) }

    try {
      await delay(300)

      show('group', '正在抽签分组…')
      await delay(200)
      const simResult = simulateTournament(playerData, newSeed)
      show('group', '小组赛模拟完成…')
      await delay(200)

      show('knockout', '正在确定32强对阵…')
      await delay(200)

      // 验证数据完整性
      const ko = simResult.tournament.knockout
      if (!ko.R32 || ko.R32.length !== 16 || !ko.FINAL?.home?.team) {
        throw new Error('模拟数据不完整')
      }

      setTournament(simResult.tournament)
      setAnalytics(simResult.analytics)
      setSeed(newSeed)
      show('knockout', '淘汰赛模拟完成…')
      await delay(300)

      show('monte_carlo', '正在启动蒙特卡洛引擎…')
      await delay(200)
      const mcResult = runMonteCarlo(playerData, newSeed, iterations)
      show('monte_carlo', `蒙特卡洛 ${iterations} 次模拟完成…`)
      setMc(mcResult)
      setMcIterations(iterations)
      await delay(500)

    } catch (e) {
      console.error(`生成失败 (seed=${newSeed}, retry=${retryCount}):`, e)
      // 自动重试，最多 3 次
      if (retryCount < 3) {
        const nextSeed = newSeed + 1
        setSeedInput(String(nextSeed))
        setGenerating(false)
        await delay(100)
        handleGenerate(nextSeed, iterations, retryCount + 1)
        return
      }
      // 重试用完，静默降级
      console.warn('重试次数用完，使用当前数据')
    } finally {
      if (retryCount >= 3 || !generating) {
        setGenerating(false)
        setTab('hero')
      }
    }
  }, [])

  // 随机按钮：只改种子值，不触发生成
  const [diceSpinning, setDiceSpinning] = useState(false)
  const handleRandomSeed = () => {
    setDiceSpinning(true)
    setSeedInput(String(Math.floor(Math.random() * 100000)))
    setTimeout(() => setDiceSpinning(false), 600)
  }

  // 开始模拟按钮
  const handleSubmit = () => {
    const s = parseInt(seedInput, 10)
    const n = parseInt(mcInput, 10)
    if (!isNaN(s) && !isNaN(n) && n > 0 && n <= 50000) {
      handleGenerate(s, n)
    }
  }

  // 生成中：显示进度
  if (generating) {
    return <ProgressDisplay stage={progressStage} detail={progressDetail} />
  }

  // 空状态：未生成
  if (!tournament) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-10 h-10 text-gold" weight="fill" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">2026 世界杯模拟器</h1>
          <p className="text-slate-400 text-sm mb-8">基于 FC26 球员数据 + Poisson 模型 + 蒙特卡洛聚合</p>

          <div className="bg-pitch-light border border-pitch-border rounded-xl p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-[11px] text-slate-500 font-mono block mb-1.5">随机种子</label>
                <input
                  type="number"
                  value={seedInput}
                  onChange={(e) => setSeedInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  className="w-full bg-pitch-surface border border-pitch-border rounded-lg px-3 py-2 text-sm font-mono text-white text-center focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 font-mono block mb-1.5">蒙特卡洛次数</label>
                <input
                  type="number"
                  value={mcInput}
                  onChange={(e) => setMcInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  min="10"
                  max="50000"
                  className="w-full bg-pitch-surface border border-pitch-border rounded-lg px-3 py-2 text-sm font-mono text-white text-center focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-gold/20 to-gold/10 border border-gold/40 rounded-xl text-base font-semibold text-gold hover:from-gold/30 hover:to-gold/20 transition-all cursor-pointer active:scale-[0.98]"
            >
              <Play className="w-5 h-5" weight="fill" />
              开始模拟
            </button>

            <div className="flex justify-center mt-5">
              <button
                onClick={handleRandomSeed}
                className="group relative p-3 cursor-pointer active:scale-90"
              >
                {/* 彩色光晕背景 */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gold via-amber-400 to-orange-500 opacity-20 blur-md group-hover:opacity-40 group-hover:blur-lg transition-all duration-300" />
                {/* 骰子图标 */}
                <DiceFive
                  className={`relative w-8 h-8 text-gold group-hover:text-amber-400 transition-colors duration-200 ${diceSpinning ? 'dice-spin' : ''}`}
                  weight="fill"
                />
                {/* Tooltip */}
                <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-pitch-surface border border-pitch-border rounded text-[10px] text-slate-400 font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  随机种子
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 主界面
  return (
    <div className="min-h-screen pb-20 md:pb-6">
      {/* Header */}
      <header className="border-b border-pitch-border bg-pitch-light/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-3 md:px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gold/20 flex items-center justify-center">
              <Trophy className="w-4 h-4 md:w-5 md:h-5 text-gold" weight="fill" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-white leading-tight">2026 世界杯</h1>
              <p className="text-[10px] text-slate-500 font-mono">seed={seed} · {mcIterations}次</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-1 px-2 py-1 bg-pitch-surface border border-pitch-border rounded-md text-[11px] font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <span className="hidden sm:inline">种子</span> {seed}
              <CaretDown className={`w-3 h-3 transition-transform ${showConfig ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={handleRandomSeed}
              className="p-1.5 bg-pitch-surface border border-pitch-border rounded-md text-slate-400 hover:text-gold hover:border-gold/40 transition-all cursor-pointer active:scale-95"
              title="随机种子"
            >
              <DiceFive className="w-4 h-4" />
            </button>
          </div>

          <div className="hidden md:flex items-center gap-0.5 bg-pitch-surface rounded-lg p-0.5">
            {TABS.map(tb => {
              const Icon = tb.icon
              const active = tab === tb.key
              return (
                <button
                  key={tb.key}
                  onClick={() => setTab(tb.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    active ? 'bg-pitch-border text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" weight={active ? 'fill' : 'regular'} />
                  {tb.label}
                </button>
              )
            })}
          </div>
        </div>

        {showConfig && (
          <div className="border-t border-pitch-border bg-pitch-surface/50 px-4 py-3">
            <div className="max-w-[1400px] mx-auto flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-slate-500 font-mono">种子</label>
                <input type="number" value={seedInput} onChange={(e) => setSeedInput(e.target.value)}
                  className="w-20 bg-pitch-surface border border-pitch-border rounded-md px-2 py-1 text-xs font-mono text-white text-center focus:outline-none focus:border-gold/50" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-slate-500 font-mono">次数</label>
                <input type="number" value={mcInput} onChange={(e) => setMcInput(e.target.value)} min="10" max="50000"
                  className="w-20 bg-pitch-surface border border-pitch-border rounded-md px-2 py-1 text-xs font-mono text-white text-center focus:outline-none focus:border-gold/50" />
              </div>
              <button onClick={handleSubmit}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-gold/20 border border-gold/40 rounded-md text-xs font-medium text-gold hover:bg-gold/30 transition-colors cursor-pointer">
                <Play className="w-3 h-3" weight="fill" /> 重新生成
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="max-w-[1400px] mx-auto px-3 md:px-4 py-4 md:py-6">
        <ErrorBoundary key={tab}>
          {tab === 'hero' && <ChampionHero tournament={tournament} analytics={analytics} mc={mc} onMatchClick={setSelectedMatch} />}
          {tab === 'groups' && <GroupStage groups={tournament.groups} onMatchClick={setSelectedMatch} />}
          {tab === 'bracket' && <Bracket knockout={tournament.knockout} onMatchClick={setSelectedMatch} />}
          {tab === 'odds' && <Probabilities tournament={tournament} analytics={analytics} mc={mc} seed={seed} />}
        </ErrorBoundary>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-pitch-light/95 backdrop-blur-md border-t border-pitch-border z-50">
        <div className="flex items-center justify-around px-2 py-1.5">
          {TABS.map(tb => {
            const Icon = tb.icon
            const active = tab === tb.key
            return (
              <button key={tb.key} onClick={() => setTab(tb.key)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${active ? 'text-gold' : 'text-slate-500'}`}>
                <Icon className="w-5 h-5" weight={active ? 'fill' : 'regular'} />
                <span className="text-[10px] font-medium">{tb.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {selectedMatch && <MatchDetail match={selectedMatch} onClose={() => setSelectedMatch(null)} />}
    </div>
  )
}
