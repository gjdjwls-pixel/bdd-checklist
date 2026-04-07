import { useState, useEffect } from 'react'
import { supabase, TOTAL_SCORE, getTodayKey, calcScore } from './lib/data.js'
import ManagerSelect from './components/ManagerSelect.jsx'
import Checklist from './components/Checklist.jsx'
import Dashboard from './components/Dashboard.jsx'
import History from './components/History.jsx'
import AdminPanel from './components/AdminPanel.jsx'

export default function App() {
  const [tab, setTab] = useState('home')
  const [managers, setManagers] = useState([])
  const [activeManager, setActiveManager] = useState(null)
  const [todaySubmissions, setTodaySubmissions] = useState({})
  const [myChecks, setMyChecks] = useState({})
  const [mySubmitted, setMySubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const today = getTodayKey()

  // Load managers
  async function loadManagers() {
    const { data } = await supabase
      .from('managers')
      .select('*')
      .eq('active', true)
      .order('display_order')
    if (data) setManagers(data)
  }

  // Load today's all submissions
  async function loadTodaySubmissions() {
    const { data } = await supabase
      .from('daily_submissions')
      .select('*, managers(name)')
      .eq('date', today)
    if (data) {
      const map = {}
      data.forEach(s => { map[s.manager_id] = s })
      setTodaySubmissions(map)
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true)
      await loadManagers()
      await loadTodaySubmissions()
      setLoading(false)
    }
    init()
  }, [today])

  // Realtime: submissions 변경 감지
  useEffect(() => {
    const ch = supabase.channel('rt-submissions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_submissions' }, () => {
        loadTodaySubmissions()
      })
      .subscribe()
    const ch2 = supabase.channel('rt-managers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'managers' }, () => {
        loadManagers()
      })
      .subscribe()
    return () => { supabase.removeChannel(ch); supabase.removeChannel(ch2) }
  }, [])

  // 매니저 선택 시 기존 데이터 로드
  async function selectManager(manager) {
    setActiveManager(manager)
    const existing = todaySubmissions[manager.id]
    if (existing) {
      setMyChecks(existing.checks || {})
      setMySubmitted(existing.submitted || false)
    } else {
      setMyChecks({})
      setMySubmitted(false)
    }
    setTab('checklist')
  }

  // 체크 토글 (제출 전까지만)
  async function toggle(key) {
    if (mySubmitted) return
    const newChecks = { ...myChecks, [key]: !myChecks[key] }
    setMyChecks(newChecks)
    await supabase.from('daily_submissions').upsert({
      manager_id: activeManager.id,
      date: today,
      checks: newChecks,
      submitted: false,
      updated_at: new Date().toISOString()
    }, { onConflict: 'manager_id,date' })
    await loadTodaySubmissions()
  }

  // 제출 확정
  async function submit() {
    await supabase.from('daily_submissions').upsert({
      manager_id: activeManager.id,
      date: today,
      checks: myChecks,
      submitted: true,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'manager_id,date' })
    setMySubmitted(true)
    await loadTodaySubmissions()
  }

  const myScore = calcScore(myChecks)
  const myPct = Math.round((myScore / TOTAL_SCORE) * 100)
  const scoreColor = myPct >= 80 ? '#2ecc71' : myPct >= 50 ? '#f39c12' : '#e74c3c'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" />
        <p style={{ color: '#666', marginTop: 16, fontFamily: 'Noto Sans KR', fontSize: 14 }}>불러오는 중...</p>
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
          {activeManager && tab === 'checklist' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#888' }}>{activeManager.name}</span>
              <span className="score-num" style={{ color: scoreColor }}>{myScore}</span>
              <span className="score-total">/{TOTAL_SCORE}</span>
            </div>
          ) : (
            <button className="icon-btn" onClick={() => setTab('admin')} title="매니저 관리">
              ⚙
            </button>
          )}
        </div>
        <nav className="nav">
          {[
            { id: 'home', label: '홈' },
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
        {tab === 'home' && (
          <ManagerSelect
            managers={managers}
            todaySubmissions={todaySubmissions}
            onSelect={selectManager}
          />
        )}
        {tab === 'checklist' && (
          activeManager ? (
            <Checklist
              manager={activeManager}
              checks={myChecks}
              submitted={mySubmitted}
              onToggle={toggle}
              onSubmit={submit}
              onBack={() => setTab('home')}
            />
          ) : (
            <div className="empty-page">
              <p>먼저 홈에서 이름을 선택하세요.</p>
              <button className="btn-primary" onClick={() => setTab('home')}>홈으로</button>
            </div>
          )
        )}
        {tab === 'dashboard' && (
          <Dashboard managers={managers} todaySubmissions={todaySubmissions} />
        )}
        {tab === 'history' && (
          <History managers={managers} />
        )}
        {tab === 'admin' && (
          <AdminPanel managers={managers} onClose={() => setTab('home')} onUpdate={loadManagers} />
        )}
      </main>
    </div>
  )
}
