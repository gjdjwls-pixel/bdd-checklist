import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { supabase, TOTAL_SCORE, calcScore } from '../lib/data.js'

function scoreColor(pct) {
  if (pct >= 80) return '#2ecc71'
  if (pct >= 50) return '#f39c12'
  return '#e74c3c'
}

const COLORS = ['#2ecc71', '#3498db', '#e67e22', '#9b59b6']

export default function History({ managers }) {
  const [history, setHistory] = useState([])
  const [view, setView] = useState('chart') // chart | table

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

  // 날짜별로 그룹핑
  const dateMap = {}
  history.forEach(s => {
    if (!dateMap[s.date]) dateMap[s.date] = {}
    dateMap[s.date][s.manager_id] = calcScore(s.checks)
  })

  const chartData = Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, scores]) => {
      const vals = managers.map(m => scores[m.id] ?? null).filter(v => v !== null)
      const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
      const row = { date: date.slice(5), avg }
      managers.forEach(m => { row[m.id] = scores[m.id] ?? null })
      return row
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

  return (
    <div className="history-page">
      <div className="history-toggle">
        <button className={`toggle-btn ${view === 'chart' ? 'active' : ''}`} onClick={() => setView('chart')}>그래프</button>
        <button className={`toggle-btn ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')}>표</button>
      </div>

      {chartData.length === 0 ? (
        <div className="empty-state">제출된 기록이 없습니다. 체크리스트를 제출하면 여기에 쌓여요!</div>
      ) : view === 'chart' ? (
        <>
          <div className="chart-card">
            <div className="section-title">개인별 일별 점수 (최근 30일)</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} />
                <YAxis domain={[0, TOTAL_SCORE]} tick={{ fill: '#555', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                {managers.map((m, i) => (
                  <Line key={m.id} type="monotone" dataKey={m.id} name={m.name}
                    stroke={COLORS[i % COLORS.length]} strokeWidth={2}
                    dot={{ r: 3 }} connectNulls={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div className="legend-row">
              {managers.map((m, i) => (
                <span key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#888' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], display: 'inline-block' }} />
                  {m.name}
                </span>
              ))}
            </div>
          </div>

          <div className="chart-card">
            <div className="section-title">팀 평균 점수 추이</div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData.filter(d => d.avg !== null)} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} />
                <YAxis domain={[0, TOTAL_SCORE]} tick={{ fill: '#555', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="avg" name="팀 평균"
                  stroke="#f39c12" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
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
                    {managers.map((m, i) => {
                      const v = row[m.id]
                      const p = v !== null ? Math.round(v / TOTAL_SCORE * 100) : null
                      return (
                        <td key={m.id} style={{ fontFamily: 'DM Mono', color: p !== null ? scoreColor(p) : '#444' }}>
                          {v !== null ? `${v}` : '—'}
                        </td>
                      )
                    })}
                    <td style={{ fontFamily: 'DM Mono', color: avg !== null ? scoreColor(Math.round(avg/TOTAL_SCORE*100)) : '#444', fontWeight: 600 }}>
                      {avg !== null ? avg : '—'}
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
