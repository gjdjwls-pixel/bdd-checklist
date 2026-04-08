import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase, CATEGORIES, TOTAL_SCORE, calcScore } from '../lib/data.js'

function scoreColor(pct) {
  if (pct >= 80) return '#2ecc71'
  if (pct >= 50) return '#f39c12'
  return '#e74c3c'
}

const MGR_COLORS = ['#2ecc71', '#3498db', '#e67e22', '#9b59b6']

export default function History({ managers }) {
  const [history, setHistory] = useState([])
  const [mode, setMode] = useState('total')   // total | category
  const [view, setView] = useState('chart')   // chart | table
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[0].id)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('daily_submissions')
        .select('*, managers(name)')
        .eq('submitted', true)
        .order('date', { ascending: false })
        .limit(60)
      if (data) setHistory(data)
    }
    load()
  }, [])

  // 날짜별 그룹핑
  const dateMap = {}
  history.forEach(s => {
    if (!dateMap[s.date]) dateMap[s.date] = {}
    dateMap[s.date][s.manager_id] = s.checks || {}
  })

  const sortedDates = Object.keys(dateMap).sort().slice(-30)

  // 총점 차트 데이터
  const totalChartData = sortedDates.map(date => {
    const row = { date: date.slice(5) }
    managers.forEach(m => {
      const checks = dateMap[date][m.id]
      row[m.id] = checks ? calcScore(checks) : null
    })
    const vals = managers.map(m => row[m.id]).filter(v => v !== null)
    row.avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
    return row
  })

  // 카테고리별 차트 데이터 (점수 기준)
  const cat = CATEGORIES.find(c => c.id === selectedCat)
  const catMaxScore = cat ? cat.items.length * 2 : 0
  const catChartData = sortedDates.map(date => {
    const row = { date: date.slice(5) }
    managers.forEach(m => {
      const checks = dateMap[date][m.id]
      if (!checks) { row[m.id] = null; return }
      const done = cat.items.filter((_, i) => checks[`${cat.id}_${i}`]).length
      row[m.id] = done * 2
    })
    const vals = managers.map(m => row[m.id]).filter(v => v !== null)
    row.avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
    return row
  })

  // 카테고리 평균 점수 (전체 기간)
  const catAvgData = CATEGORIES.map(c => {
    const allVals = []
    history.forEach(s => {
      const done = c.items.filter((_, i) => s.checks?.[`${c.id}_${i}`]).length
      allVals.push(done * 2)
    })
    const avg = allVals.length ? Math.round(allVals.reduce((a, b) => a + b, 0) / allVals.length) : 0
    const maxScore = c.items.length * 2
    return { name: c.name, avg, maxScore, color: c.color, pct: Math.round(avg / maxScore * 100) }
  })

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '10px 14px' }}>
        <div style={{ color: '#888', fontSize: 11, marginBottom: 6 }}>{label}</div>
        {payload.map((p, i) => p.value !== null && (
          <div key={i} style={{ color: p.color, fontSize: 13, fontFamily: 'DM Mono' }}>
            {p.name}: {p.value}점
          </div>
        ))}
      </div>
    )
  }

  const chartData = mode === 'total' ? totalChartData : catChartData
  const yDomain = mode === 'total' ? [0, TOTAL_SCORE] : [0, catMaxScore]
  const yUnit = '점'

  return (
    <div className="history-page">

      {/* 모드 선택 */}
      <div className="history-toggle" style={{ marginBottom: 8 }}>
        <button className={`toggle-btn ${mode === 'total' ? 'active' : ''}`} onClick={() => setMode('total')}>총점</button>
        <button className={`toggle-btn ${mode === 'category' ? 'active' : ''}`} onClick={() => setMode('category')}>카테고리별</button>
      </div>

      {/* 카테고리 선택 (카테고리 모드일 때) */}
      {mode === 'category' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              style={{
                padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500,
                border: 'none', cursor: 'pointer', fontFamily: 'Noto Sans KR, sans-serif',
                background: selectedCat === c.id ? c.color : '#1a1a1a',
                color: selectedCat === c.id ? '#fff' : '#888',
                transition: 'all .15s'
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* 그래프/표 토글 */}
      <div className="history-toggle">
        <button className={`toggle-btn ${view === 'chart' ? 'active' : ''}`} onClick={() => setView('chart')}>그래프</button>
        <button className={`toggle-btn ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')}>표</button>
      </div>

      {chartData.length === 0 ? (
        <div className="empty-state">제출된 기록이 없습니다.</div>
      ) : view === 'chart' ? (
        <>
          {/* 개인별 라인 차트 */}
          <div className="chart-card">
            <div className="section-title">
              {mode === 'total' ? '개인별 총점 추이' : `${cat.name} — 개인별 점수 추이 (만점 ${catMaxScore}점)`} (최근 30일)
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} />
                <YAxis domain={yDomain} tick={{ fill: '#555', fontSize: 10 }} unit={yUnit} />
                <Tooltip content={<CustomTooltip />} />
                {managers.map((m, i) => (
                  <Line key={m.id} type="monotone" dataKey={m.id} name={m.name}
                    stroke={MGR_COLORS[i % MGR_COLORS.length]} strokeWidth={2}
                    dot={{ r: 3 }} connectNulls={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div className="legend-row">
              {managers.map((m, i) => (
                <span key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#888' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: MGR_COLORS[i % MGR_COLORS.length], display: 'inline-block' }} />
                  {m.name}
                </span>
              ))}
            </div>
          </div>

          {/* 팀 평균 */}
          <div className="chart-card">
            <div className="section-title">
              {mode === 'total' ? '팀 평균 총점 추이' : `${cat.name} — 팀 평균 점수 추이`}
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={chartData.filter(d => d.avg !== null)} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} />
                <YAxis domain={yDomain} tick={{ fill: '#555', fontSize: 10 }} unit={yUnit} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="avg" name="팀 평균"
                  stroke={mode === 'category' ? (cat?.color || '#f39c12') : '#f39c12'}
                  strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 카테고리 모드일 때: 전체 카테고리 평균 점수 비교 */}
          {mode === 'category' && (
            <div className="chart-card">
              <div className="section-title">카테고리별 평균 점수 비교 (전체 기간)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {catAvgData.map(c => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#888', width: 44, textAlign: 'right', flexShrink: 0 }}>{c.name}</span>
                    <div style={{ flex: 1, height: 8, background: '#1a1a1a', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${c.pct}%`, height: '100%', background: c.color, borderRadius: 4, transition: 'width .4s' }} />
                    </div>
                    <span style={{ fontSize: 11, fontFamily: 'DM Mono', color: scoreColor(c.pct), width: 54, textAlign: 'right', flexShrink: 0 }}>
                      {c.avg}/{c.maxScore}점
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* 표 뷰 */
        <div className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>날짜</th>
                {managers.map(m => <th key={m.id}>{m.name}</th>)}
                <th>평균</th>
              </tr>
            </thead>
            <tbody>
              {[...chartData].reverse().map(row => {
                const vals = managers.map(m => row[m.id]).filter(v => v !== null)
                const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
                return (
                  <tr key={row.date}>
                    <td style={{ fontFamily: 'DM Mono', fontSize: 11 }}>{row.date}</td>
                    {managers.map(m => {
                      const v = row[m.id]
                      const p = v !== null ? (mode === 'total' ? Math.round(v / TOTAL_SCORE * 100) : v) : null
                      return (
                        <td key={m.id} style={{ fontFamily: 'DM Mono', color: p !== null ? scoreColor(p) : '#444' }}>
                          {v !== null ? `${v}${yUnit}` : '—'}
                        </td>
                      )
                    })}
                    <td style={{ fontFamily: 'DM Mono', fontWeight: 600, color: avg !== null ? scoreColor(mode === 'total' ? Math.round(avg/TOTAL_SCORE*100) : avg) : '#444' }}>
                      {avg !== null ? `${avg}${yUnit}` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
