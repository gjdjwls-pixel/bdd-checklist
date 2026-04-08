import { TOTAL_SCORE, calcScore } from '../lib/data.js'

function scoreColor(pct) {
  if (pct >= 80) return '#2ecc71'
  if (pct >= 50) return '#f39c12'
  return '#e74c3c'
}

export default function ManagerSelect({ managers, dateSubmissions, selectedDate, isToday, today, onSelect, onDateChange }) {
  const displayDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
  })

  const submittedCount = Object.values(dateSubmissions).filter(s => s.submitted).length

  function changeDate(offset) {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + offset)
    const newDate = d.toISOString().slice(0, 10)
    if (newDate <= today) onDateChange(newDate)
  }

  return (
    <div className="select-page">
      <div className="select-header">
        <div className="date-nav">
          <button className="date-nav-btn" onClick={() => changeDate(-1)}>←</button>
          <div className="date-center">
            <div className="select-date">{displayDate}</div>
            {!isToday && (
              <button className="today-jump-btn" onClick={() => onDateChange(today)}>오늘로</button>
            )}
          </div>
          <button
            className="date-nav-btn"
            onClick={() => changeDate(1)}
            disabled={isToday}
            style={{ opacity: isToday ? 0.3 : 1 }}
          >→</button>
        </div>
        <div className="select-progress-label">
          {isToday ? '오늘' : '해당일'} 제출 현황
          <span className="submit-count">{submittedCount} / {managers.length}</span>
        </div>
        <div className="submit-track">
          {managers.map(m => {
            const sub = dateSubmissions[m.id]
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

      <div className="select-title">
        {isToday ? '이름을 선택하세요' : `${displayDate} 제출 내역`}
      </div>

      <div className="manager-grid">
        {managers.map(m => {
          const sub = dateSubmissions[m.id]
          const score = sub ? calcScore(sub.checks) : 0
          const pct = Math.round((score / TOTAL_SCORE) * 100)
          const isSubmitted = sub?.submitted

          return (
            <button key={m.id} className={`manager-card ${isSubmitted ? 'submitted' : ''}`} onClick={() => onSelect(m)}>
              <div className="manager-avatar">{m.name.slice(0, 1)}</div>
              <div className="manager-name">{m.name}</div>
              {isSubmitted ? (
                <div className="manager-status submitted-badge">제출완료</div>
              ) : sub ? (
                <div className="manager-status in-progress-badge">작성중 {score}점</div>
              ) : (
                <div className="manager-status none-badge">{isToday ? '미시작' : '미제출'}</div>
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

      {isToday && submittedCount === managers.length && managers.length > 0 && (
        <div className="all-done-banner">오늘 전원 제출 완료! 수고하셨습니다 🎉</div>
      )}
    </div>
  )
}
