import { useState, useRef } from 'react'
import { CATEGORIES, TOTAL_SCORE, calcScore } from '../lib/data.js'

function scoreColor(pct) {
  if (pct >= 80) return '#2ecc71'
  if (pct >= 50) return '#f39c12'
  return '#e74c3c'
}

const PencilIcon = ({ color = '#888' }) => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.5 1.5L13.5 4.5L5 13H2V10L10.5 1.5Z" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export default function Checklist({ manager, checks, memos, submitted, isToday, onToggle, onMemo, onSubmit, onBack }) {
  const [openMemos, setOpenMemos] = useState({})
  const itemRefs = useRef({})
  const score = calcScore(checks)
  const pct = Math.round((score / TOTAL_SCORE) * 100)
  const checkedCount = Object.values(checks).filter(Boolean).length
  const readOnly = submitted

  // 미체크 항목 중 메모 없는 것들
  const missingMemos = []
  CATEGORIES.forEach(cat => {
    cat.items.forEach((_, i) => {
      const key = `${cat.id}_${i}`
      if (!checks[key] && !memos?.[key]?.trim()) {
        missingMemos.push(key)
      }
    })
  })

  function toggleMemoOpen(key) {
    setOpenMemos(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function handleSubmit() {
    if (missingMemos.length > 0) {
      const firstKey = missingMemos[0]
      // 첫 번째 미메모 항목 열고 스크롤
      setOpenMemos(prev => ({ ...prev, [firstKey]: true }))
      setTimeout(() => {
        itemRefs.current[firstKey]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
      return
    }
    if (window.confirm(`${manager.name}님의 체크리스트를 제출하시겠습니까?\n제출 후에는 수정이 불가합니다.`)) {
      onSubmit()
    }
  }

  const memoCount = Object.keys(memos || {}).filter(k => memos[k]?.trim()).length
  const uncheckedCount = CATEGORIES.reduce((s, cat) =>
    s + cat.items.filter((_, i) => !checks[`${cat.id}_${i}`]).length, 0)

  return (
    <div className="checklist-page">
      <div className="cl-topbar">
        <button className="back-btn" onClick={onBack}>← 홈</button>
        <div className="cl-name">{manager.name}</div>
        <div className="cl-sc" style={{ color: scoreColor(pct) }}>{score}점</div>
      </div>

      {submitted && (
        <div className="submitted-banner">
          제출 완료{memoCount > 0 ? ` · 메모 ${memoCount}건 포함` : ''}
        </div>
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
                const memo = memos?.[key] || ''
                const memoOpen = !!openMemos[key]
                const hasMemo = !!memo.trim()
                const isMissing = !isChecked && !hasMemo && !readOnly

                return (
                  <div key={key} ref={el => itemRefs.current[key] = el}
                    className={`check-item-wrap ${isChecked ? 'checked' : ''}`}>
                    <div
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

                      {/* 오른쪽: 점수 or 연필 버튼 */}
                      {isChecked ? (
                        <span className="item-pts">+2</span>
                      ) : !readOnly ? (
                        <button
                          className={`memo-pencil-btn ${memoOpen ? 'open' : ''} ${isMissing ? 'missing' : hasMemo ? 'has-memo' : ''}`}
                          onClick={e => { e.stopPropagation(); toggleMemoOpen(key) }}
                          title={hasMemo ? '메모 있음' : '메모 작성'}
                        >
                          <PencilIcon color={hasMemo ? '#f39c12' : isMissing ? '#e74c3c' : '#555'} />
                          {hasMemo && <span className="memo-dot" />}
                        </button>
                      ) : (
                        // 제출 완료 후 읽기 전용
                        hasMemo ? (
                          <button
                            className="memo-pencil-btn has-memo"
                            onClick={e => { e.stopPropagation(); toggleMemoOpen(key) }}
                          >
                            <PencilIcon color="#f39c12" />
                            <span className="memo-dot" />
                          </button>
                        ) : (
                          <span className="item-pts" style={{ color: '#333' }}>0</span>
                        )
                      )}
                    </div>

                    {/* 메모란 (열렸을 때만) */}
                    {memoOpen && (
                      <div className="memo-area">
                        {readOnly ? (
                          <div className="memo-readonly">
                            <PencilIcon color="#666" />
                            <span>{memo || '메모 없음'}</span>
                          </div>
                        ) : (
                          <div style={{ position: 'relative' }}>
                            <textarea
                              className="memo-input"
                              placeholder="미체크 이유 또는 조치 사항을 메모하세요"
                              value={memo}
                              onChange={e => onMemo(key, e.target.value)}
                              onClick={e => e.stopPropagation()}
                              autoFocus
                              rows={2}
                            />
                            {isMissing && (
                              <div style={{ fontSize: 11, color: '#e74c3c', marginTop: 4 }}>
                                제출하려면 메모가 필요해요
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
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
            {memoCount > 0 && <span style={{ color: '#f39c12', marginLeft: 6 }}>✎ {memoCount}</span>}
            {missingMemos.length > 0 && (
              <span style={{ color: '#e74c3c', marginLeft: 6 }}>메모 필요 {missingMemos.length}건</span>
            )}
          </div>
          <button
            className="submit-btn"
            style={{ background: missingMemos.length > 0 ? '#333' : '#2ecc71' }}
            onClick={handleSubmit}
          >
            {missingMemos.length > 0 ? `메모 ${missingMemos.length}건 필요` : '제출하기'}
          </button>
        </div>
      )}
    </div>
  )
}
