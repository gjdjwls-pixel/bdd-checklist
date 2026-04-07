import { useState, useEffect, useCallback } from 'react'
import { supabase, CATEGORIES, TOTAL_ITEMS, TOTAL_SCORE, getTodayKey } from './lib/data.js'
import Dashboard from './components/Dashboard.jsx'
import Checklist from './components/Checklist.jsx'
import History from './components/History.jsx'

export default function App() {
  const [tab, setTab] = useState('checklist')
  const [checks, setChecks] = useState({})
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const today = getTodayKey()

  // Load today's checks from Supabase
  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('daily_checks')
        .select('*')
        .eq('date', today)
        .single()

      if (data && !error) {
        setChecks(data.checks || {})
      }

      // Load history (last 30 days)
      const { data: hist } = await supabase
        .from('daily_checks')
        .select('date, checks')
        .order('date', { ascending: false })
        .limit(30)

      if (hist) setHistory(hist)
      setLoading(false)
    }
    load()
  }, [today])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('checks-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_checks',
        filter: `date=eq.${today}`
      }, (payload) => {
        if (payload.new?.checks) {
          setChecks(payload.new.checks)
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [today])

  const toggle = useCallback(async (key) => {
    const newChecks = { ...checks, [key]: !checks[key] }
    setChecks(newChecks)

    // Upsert to Supabase
    await supabase
      .from('daily_checks')
      .upsert({ date: today, checks: newChecks, updated_at: new Date().toISOString() }, { onConflict: 'date' })

    // Refresh history
    const { data: hist } = await supabase
      .from('daily_checks')
      .select('date, checks')
      .order('date', { ascending: false })
      .limit(30)
    if (hist) setHistory(hist)
  }, [checks, today])

  const calcTotal = (c) => Object.values(c).filter(Boolean).length * 2
  const totalScore = calcTotal(checks)
  const totalPct = Math.round((totalScore / TOTAL_SCORE) * 100)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" />
        <p style={{ color: '#666', marginTop: 16, fontFamily: 'Noto Sans KR', fontSize: 14 }}>데이터 불러오는 중...</p>
      </div>
    </div>
  )

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="header-left">
            <span className="logo-text">BDD</span>
            <span className="logo-sub">공간관리</span>
          </div>
          <div className="header-score">
            <span className="score-num" style={{ color: totalPct >= 80 ? '#2ecc71' : totalPct >= 50 ? '#f39c12' : '#e74c3c' }}>
              {totalScore}
            </span>
            <span className="score-total">/{TOTAL_SCORE}</span>
          </div>
        </div>
        <nav className="nav">
          {[
            { id: 'checklist', label: '체크리스트' },
            { id: 'dashboard', label: '현황' },
            { id: 'history', label: '추이' }
          ].map(t => (
            <button
              key={t.id}
              className={`nav-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="main">
        {tab === 'checklist' && (
          <Checklist checks={checks} onToggle={toggle} />
        )}
        {tab === 'dashboard' && (
          <Dashboard checks={checks} totalScore={totalScore} totalPct={totalPct} />
        )}
        {tab === 'history' && (
          <History history={history} />
        )}
      </main>
    </div>
  )
}
