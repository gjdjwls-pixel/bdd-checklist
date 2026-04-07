import { CATEGORIES, TOTAL_SCORE } from '../lib/data.js'

function scoreColor(pct) {
  if (pct >= 80) return '#2ecc71'
  if (pct >= 50) return '#f39c12'
  return '#e74c3c'
}

function Ring({ pct, size = 80 }) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e1e1e" strokeWidth="8" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={scoreColor(pct)}
        strokeWidth="8"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fill={scoreColor(pct)} fontSize="14" fontWeight="600" fontFamily="DM Mono">
        {pct}%
      </text>
    </svg>
  )
}

export default function Dashboard({ checks, totalScore, totalPct }) {
  const checkedCount = Object.values(checks).filter(Boolean).length
  const unchecked = 50 - checkedCount

  const catData = CATEGORIES.map(cat => {
    const done = cat.items.filter((_, i) => checks[`${cat.id}_${i}`]).length
    const pct = Math.round((done / cat.items.length) * 100)
    return { ...cat, done, pct, score: done * 2, maxScore: cat.items.length * 2 }
  })

  const weak = [...catData].sort((a, b) => a.pct - b.pct).slice(0, 3)

  return (
    <div className="dashboard-page">
      {/* Hero score */}
      <div className="score-hero">
        <Ring pct={totalPct} size={120} />
        <div className="score-hero-info">
          <div className="score-big" style={{ color: scoreColor(totalPct) }}>{totalScore}점</div>
          <div className="score-label">/ {TOTAL_SCORE}점 만점</div>
          <div className="score-sub">{checkedCount}개 통과 · {unchecked}개 미통과</div>
        </div>
      </div>

      {/* Weak areas */}
      {weak.some(w => w.pct < 100) && (
        <div className="alert-section">
          <div className="alert-title">⚠ 집중 개선 필요</div>
          {weak.filter(w => w.pct < 100).map(w => (
            <div key={w.id} className="alert-item">
              <span className="alert-badge" style={{ background: w.bg, color: w.color }}>{w.name}</span>
              <span className="alert-pct" style={{ color: scoreColor(w.pct) }}>{w.pct}%</span>
              <span className="alert-detail">{w.done}/{w.score === w.maxScore ? w.done : w.maxScore / 2}개 통과</span>
            </div>
          ))}
        </div>
      )}

      {/* Category bars */}
      <div className="cat-bars-section">
        <div className="section-title">카테고리별 달성률</div>
        {catData.map(cat => (
          <div key={cat.id} className="cat-bar-row">
            <span className="cat-bar-name">{cat.name}</span>
            <div className="cat-bar-track">
              <div
                className="cat-bar-fill"
                style={{ width: `${cat.pct}%`, background: cat.color }}
              />
            </div>
            <span className="cat-bar-val" style={{ color: scoreColor(cat.pct) }}>
              {cat.score}/{cat.maxScore}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
