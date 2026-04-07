import { CATEGORIES, TOTAL_SCORE, calcScore } from '../lib/data.js'

function scoreColor(pct) {
  if (pct >= 80) return '#2ecc71'
  if (pct >= 50) return '#f39c12'
  return '#e74c3c'
}

function Ring({ pct, size = 72 }) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e1e1e" strokeWidth="7" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={scoreColor(pct)}
        strokeWidth="7" strokeDasharray={`${dash} ${circ-dash}`}
        strokeDashoffset={circ/4} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.5s ease' }} />
      <text x={size/2} y={size/2+5} textAnchor="middle" fill={scoreColor(pct)}
        fontSize="13" fontWeight="600" fontFamily="DM Mono">{pct}%</text>
    </svg>
  )
}

export default function Dashboard({ managers, todaySubmissions }) {
  const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })

  const managerStats = managers.map(m => {
    const sub = todaySubmissions[m.id]
    const score = sub ? calcScore(sub.checks) : null
    const pct = score !== null ? Math.round((score / TOTAL_SCORE) * 100) : null
    return { ...m, score, pct, submitted: sub?.submitted || false, checks: sub?.checks || {} }
  })

  const submitted = managerStats.filter(m => m.submitted)
  const avgScore = submitted.length
    ? Math.round(submitted.reduce((s, m) => s + m.score, 0) / submitted.length)
    : 0
  const avgPct = Math.round((avgScore / TOTAL_SCORE) * 100)

  // 카테고리별 평균
  const catAvg = CATEGORIES.map(cat => {
    if (!submitted.length) return { ...cat, avg: 0 }
    const total = submitted.reduce((s, m) => {
      const done = cat.items.filter((_, i) => m.checks[`${cat.id}_${i}`]).length
      return s + (done / cat.items.length * 100)
    }, 0)
    return { ...cat, avg: Math.round(total / submitted.length) }
  })

  return (
    <div className="dashboard-page">
      <div className="dash-date">{today} 현황</div>

      {/* 매니저별 카드 */}
      <div className="manager-status-grid">
        {managerStats.map(m => (
          <div key={m.id} className={`status-card ${m.submitted ? 'done' : ''}`}>
            <div className="status-card-top">
              <span className="status-name">{m.name}</span>
              {m.submitted
                ? <span className="pill green">제출완료</span>
                : m.score !== null
                  ? <span className="pill yellow">작성중</span>
                  : <span className="pill gray">미시작</span>
              }
            </div>
            {m.submitted && m.pct !== null ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <Ring pct={m.pct} size={64} />
                <div>
                  <div style={{ fontFamily: 'DM Mono', fontSize: 22, fontWeight: 600, color: scoreColor(m.pct) }}>
                    {m.score}점
                  </div>
                  <div style={{ fontSize: 11, color: '#555' }}>/ {TOTAL_SCORE}점</div>
                </div>
              </div>
            ) : (
              <div style={{ color: '#444', fontSize: 13, marginTop: 8 }}>—</div>
            )}
          </div>
        ))}
      </div>

      {/* 평균 점수 */}
      {submitted.length > 0 && (
        <>
          <div className="avg-card">
            <div className="avg-label">팀 평균 점수 ({submitted.length}명 제출)</div>
            <div className="avg-score" style={{ color: scoreColor(avgPct) }}>{avgScore}점</div>
            <div className="avg-pct" style={{ color: scoreColor(avgPct) }}>{avgPct}%</div>
          </div>

          <div className="cat-bars-section">
            <div className="section-title">카테고리별 평균 달성률</div>
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
        </>
      )}

      {submitted.length === 0 && (
        <div className="empty-state">아직 오늘 제출한 매니저가 없습니다.</div>
      )}
    </div>
  )
}
