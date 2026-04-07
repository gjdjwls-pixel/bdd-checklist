import { CATEGORIES } from '../lib/data.js'

function scoreColor(pct) {
  if (pct >= 80) return '#2ecc71'
  if (pct >= 50) return '#f39c12'
  return '#e74c3c'
}

export default function Checklist({ checks, onToggle }) {
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
  })

  return (
    <div className="checklist-page">
      <div className="page-date">{today}</div>

      {CATEGORIES.map(cat => {
        const checked = cat.items.filter((_, i) => checks[`${cat.id}_${i}`]).length
        const total = cat.items.length
        const pct = Math.round((checked / total) * 100)

        return (
          <div key={cat.id} className="cat-section">
            <div className="cat-header">
              <div className="cat-title-row">
                <span className="cat-badge" style={{ background: cat.bg, color: cat.color }}>
                  {cat.name}
                </span>
                <span className="cat-count" style={{ color: scoreColor(pct) }}>
                  {checked * 2}/{total * 2}점
                </span>
              </div>
              <div className="cat-progress-track">
                <div
                  className="cat-progress-fill"
                  style={{ width: `${pct}%`, background: scoreColor(pct) }}
                />
              </div>
            </div>

            <div className="items-list">
              {cat.items.map((item, i) => {
                const key = `${cat.id}_${i}`
                const checked = !!checks[key]
                return (
                  <div
                    key={key}
                    className={`check-item ${checked ? 'checked' : ''}`}
                    onClick={() => onToggle(key)}
                  >
                    <div className={`check-box ${checked ? 'checked' : ''}`} style={checked ? { borderColor: cat.color, background: cat.color } : {}}>
                      {checked && (
                        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                          <path d="M1 4.5L3.8 7.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="item-label">{item}</span>
                    <span className="item-pts">{checked ? '+2' : '0'}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
