import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CATEGORIES, TOTAL_SCORE } from '../lib/data.js'

function scoreColor(pct) {
  if (pct >= 80) return '#2ecc71'
  if (pct >= 50) return '#f39c12'
  return '#e74c3c'
}

export default function History({ history }) {
  const chartData = [...history]
    .reverse()
    .map(h => {
      const score = Object.values(h.checks || {}).filter(Boolean).length * 2
      return {
        date: h.date.slice(5),
        score,
        pct: Math.round((score / TOTAL_SCORE) * 100)
      }
    })

  // Category averages across history
  const catAvg = CATEGORIES.map(cat => {
    const totals = history.map(h => {
      const done = cat.items.filter((_, i) => h.checks?.[`${cat.id}_${i}`]).length
      return done / cat.items.length * 100
    })
    const avg = totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0
    return { ...cat, avg }
  })

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '8px 12px' }}>
          <div style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>{label}</div>
          <div style={{ color: scoreColor(payload[0].value / TOTAL_SCORE * 100), fontSize: 18, fontWeight: 600, fontFamily: 'DM Mono' }}>
            {payload[0].value}점
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="history-page">
      <div className="section-title">일별 점수 추이</div>

      {chartData.length === 0 ? (
        <div className="empty-state">아직 기록이 없습니다. 체크리스트를 작성하면 여기에 쌓여요!</div>
      ) : (
        <div className="chart-card">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 11 }} />
              <YAxis domain={[0, TOTAL_SCORE]} tick={{ fill: '#666', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#2ecc71"
                strokeWidth={2}
                dot={{ fill: '#2ecc71', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="section-title" style={{ marginTop: 24 }}>카테고리 평균 달성률 ({history.length}일 기준)</div>
      <div className="cat-bars-section">
        {catAvg.map(cat => (
          <div key={cat.id} className="cat-bar-row">
            <span className="cat-bar-name">{cat.name}</span>
            <div className="cat-bar-track">
              <div className="cat-bar-fill" style={{ width: `${cat.avg}%`, background: cat.color }} />
            </div>
            <span className="cat-bar-val" style={{ color: scoreColor(cat.avg) }}>{cat.avg}%</span>
          </div>
        ))}
      </div>

      {history.length > 0 && (
        <div className="history-table-wrap">
          <div className="section-title" style={{ marginTop: 24 }}>날짜별 기록</div>
          <table className="history-table">
            <thead>
              <tr>
                <th>날짜</th>
                <th>점수</th>
                <th>달성률</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {[...history].map(h => {
                const score = Object.values(h.checks || {}).filter(Boolean).length * 2
                const pct = Math.round((score / TOTAL_SCORE) * 100)
                return (
                  <tr key={h.date}>
                    <td>{h.date}</td>
                    <td style={{ fontFamily: 'DM Mono', color: scoreColor(pct) }}>{score}</td>
                    <td style={{ color: scoreColor(pct) }}>{pct}%</td>
                    <td>
                      <span className="status-pill" style={{
                        background: pct >= 80 ? '#0d2b1a' : pct >= 50 ? '#2b1f0a' : '#2b0d0d',
                        color: scoreColor(pct)
                      }}>
                        {pct >= 80 ? '우수' : pct >= 50 ? '보통' : '미흡'}
                      </span>
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
