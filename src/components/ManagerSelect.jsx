import { TOTAL_SCORE, calcScore } from '../lib/data.js'

function scoreColor(pct) {
  if (pct >= 80) return '#2ecc71'
  if (pct >= 50) return '#f39c12'
  return '#e74c3c'
}

export default function ManagerSelect({ managers, todaySubmissions, onSelect }) {
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
  })

  const submittedCount = Object.values(todaySubmissions).filter(s => s.submitted).length

  return (
    <div className="select-page">
      <div className="select-header">
        <div className="select-date">{today}</div>
        <div className="select-progress-label">
          오늘 제출 현황
          <span className="submit-count">{submittedCount} / {managers.length}</span>
        </div>
        <div className="submit-track">
          {managers.map(m => {
            const sub = todaySubmissions[m.id]
            return (
              <div
                key={m.id}
                className={`submit-dot ${sub?.submitted ? 'done' : sub ? 'in-progress' : 'none'}`}
                title={m.name}
              />
            )
          })}
        </div>
      </div>

      <div className="select-title">이름을 선택하세요</div>

      <div className="manager-grid">
        {managers.map(m => {
          const sub = todaySubmissions[m.id]
          const score = sub ? calcScore(sub.checks) : 0
          const pct = Math.round((score / TOTAL_SCORE) * 100)
          const isSubmitted = sub?.submitted

          return (
            <button key={m.id} className={`manager-card ${isSubmitted ? 'submitted' : ''}`} onClick={() => onSelect(m)}>
              <div className="manager-avatar">
                {m.name.slice(0, 1)}
              </div>
              <div className="manager-name">{m.name}</div>
              {isSubmitted ? (
                <div className="manager-status submitted-badge">제출완료</div>
              ) : sub ? (
                <div className="manager-status in-progress-badge">작성중 {score}점</div>
              ) : (
                <div className="manager-status none-badge">미시작</div>
              )}
              {isSubmitted && (
                <div className="manager-score" style={{ color: scoreColor(pct) }}>
                  {score}점 <span style={{ fontSize: 11, color: '#555' }}>({pct}%)</span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {submittedCount === managers.length && managers.length > 0 && (
        <div className="all-done-banner">
          오늘 전원 제출 완료! 수고하셨습니다 🎉
        </div>
      )}
    </div>
  )
}
