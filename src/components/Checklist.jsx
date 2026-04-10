import { CATEGORIES, TOTAL_SCORE, calcScore } from '../lib/data.js'

function scoreColor(pct) {
  if (pct >= 80) return '#2ecc71'
  if (pct >= 50) return '#f39c12'
  return '#e74c3c'
}

export default function Checklist({ manager, checks, submitted, isToday, onToggle, onSubmit, onBack }) {
  const score = calcScore(checks)
  const pct = Math.round((score / TOTAL_SCORE) * 100)
  const checkedCount = Object.values(checks).filter(Boolean).length
  const readOnly = submitted

  return (
    <div className="checklist-page">
      <div className="cl-topbar">
        <button className="back-btn" onClick={onBack}>← 홈</button>
        <div className="cl-name">{manager.name}</div>
        <div className="cl-sc" style={{ color: scoreColor(pct) }}>{score}점</div>
      </div>

      {submitted && (
        <div className="submitted-banner">제출 완료 — 수정이 필요하면 관리자에게 문의하세요.</div>
      )}
      {!isToday && !submitted && (
        <div className="submitted-banner" style={{ background: '#1a1500', borderColor: '#3a3000', color: '#f39c12' }}>
          과거 날짜 — 미제출 상태입니다. 수정 후 제출할 수 있습니다.
        </div>
      )}

      {CATEGORIES.map(cat => {
        const catChecked = cat.items.filter((_, i) => checks[`${cat.id}_${i}`]).length
        const catPct = Math.round((catChecked / cat.items.length) * 100)

        return (
          <div key={cat.id} className="cat-section">
            <div className="cat-header">
              <div className="cat-title-row">
                <span className="cat-badge" style={{ background: cat.bg, color: cat.color }}>{cat.name}</span>
                <span className="cat-count" style={{ color: scoreColor(catPct) }}>
                  {catChecked * 2}/{cat.items.length * 2}점
                </span>
              </div>
              <div className="cat-progress-track">
                <div className="cat-progress-fill" style={{ width: `${catPct}%`, background: scoreColor(catPct) }} />
              </div>
            </div>
            <div className="items-list">
              {cat.items.map((item, i) => {
                const key = `${cat.id}_${i}`
                const isChecked = !!checks[key]
                return (
                  <div
                    key={key}
                    className={`check-item ${isChecked ? 'checked' : ''} ${readOnly ? 'disabled' : ''}`}
                    onClick={() => !readOnly && onToggle(key)}
                  >
                    <div className={`check-box ${isChecked ? 'checked' : ''}`}
                      style={isChecked ? { borderColor: cat.color, background: cat.color } : {}}>
                      {isChecked && (
                        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                          <path d="M1 4.5L3.8 7.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="item-label">{item}</span>
                    <span className="item-pts">{isChecked ? '+2' : '0'}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {!readOnly && (
        <div className="submit-footer">
          <div className="submit-footer-info">
            <span>{checkedCount}/{TOTAL_SCORE / 2}개 체크 · {score}점</span>
          </div>
          <button
            className="submit-btn"
            onClick={() => {
              if (window.confirm(`${manager.name}님의 오늘 체크리스트를 제출하시겠습니까?\n제출 후에는 수정이 불가합니다.`)) {
                onSubmit()
              }
            }}
          >
            제출하기
          </button>
        </div>
      )}
    </div>
  )
}
