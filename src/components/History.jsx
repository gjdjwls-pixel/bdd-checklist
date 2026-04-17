import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase, CATEGORIES, TOTAL_SCORE, calcScore } from '../lib/data.js'

function scoreColor(pct) {
  if (pct >= 80) return '#2ecc71'
  if (pct >= 50) return '#f39c12'
  return '#e74c3c'
}

const MGR_COLORS = ['#2ecc71', '#3498db', '#e67e22', '#9b59b6']

function getMonthList(history) {
  const months = [...new Set(history.map(s => s.date.slice(0, 7)))].sort().reverse()
  return months
}

export default function History({ managers }) {
  const [history, setHistory] = useState([])
  const [mode, setMode] = useState('total')      // total | category | monthly | memos
  const [view, setView] = useState('chart')      // chart | table
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[0].id)
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [memoCat, setMemoCat] = useState('all')
  const [memoLimit, setMemoLimit] = useState(30)
  const [memoView, setMemoView] = useState('all')   // all | daily
  const [memoDate, setMemoDate] = useState(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('daily_submissions')
        .select('*, managers(name)')
        .eq('submitted', true)
        .order('date', { ascending: false })
        .limit(180)
      if (data) {
        setHistory(data)
        const months = [...new Set(data.map(s => s.date.slice(0, 7)))].sort().reverse()
        if (months.length > 0) setSelectedMonth(months[0])
        // 메모 날짜 초기값: 가장 최근 날짜
        const dates = [...new Set(data.filter(s => s.memos && Object.keys(s.memos).length > 0).map(s => s.date))].sort().reverse()
        if (dates.length > 0) setMemoDate(dates[0])
      }
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

  // 카테고리별 차트 데이터
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

  // 월간 실행률 계산
  const months = getMonthList(history)

  // 월별 매니저별 통계: 제출일수, 평균점수, 실행률(제출일/해당월 영업일 기준)
  function getMonthlyStats(month) {
    const monthHistory = history.filter(s => s.date.startsWith(month))
    // 해당 월의 총 날짜 수 (오늘까지만)
    const today = new Date().toISOString().slice(0, 10)
    const [y, m] = month.split('-').map(Number)
    const firstDay = `${month}-01`
    const lastDayOfMonth = new Date(y, m, 0).toDate ? new Date(y, m, 0) : new Date(y, m, 0)
    const lastDay = Math.min(
      new Date(lastDayOfMonth).getTime(),
      new Date(today).getTime()
    )
    const firstDate = new Date(firstDay)
    const totalDays = Math.round((lastDay - firstDate.getTime()) / 86400000) + 1

    return managers.map((mgr, i) => {
      const mgrHistory = monthHistory.filter(s => s.manager_id === mgr.id)
      const submitDays = mgrHistory.length
      const scores = mgrHistory.map(s => calcScore(s.checks))
      const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
      const avgPct = Math.round(avgScore / TOTAL_SCORE * 100)
      const executionRate = totalDays > 0 ? Math.round(submitDays / totalDays * 100) : 0
      return { mgr, submitDays, totalDays, avgScore, avgPct, executionRate, color: MGR_COLORS[i % MGR_COLORS.length] }
    })
  }

  // 월간 팀 평균 추이 (월별)
  const monthlyTeamData = [...months].reverse().map(month => {
    const stats = getMonthlyStats(month)
    const rates = stats.map(s => s.executionRate)
    const avgScores = stats.map(s => s.avgScore)
    const row = { month: month.slice(2) }
    stats.forEach(s => { row[s.mgr.id + '_rate'] = s.executionRate; row[s.mgr.id + '_score'] = s.avgScore })
    row.teamRate = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : 0
    row.teamScore = avgScores.length ? Math.round(avgScores.reduce((a, b) => a + b, 0) / avgScores.length) : 0
    return row
  })

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '10px 14px' }}>
        <div style={{ color: '#888', fontSize: 11, marginBottom: 6 }}>{label}</div>
        {payload.map((p, i) => p.value !== null && (
          <div key={i} style={{ color: p.color, fontSize: 13, fontFamily: 'DM Mono' }}>
            {p.name}: {p.value}{p.unit || '점'}
          </div>
        ))}
      </div>
    )
  }

  const chartData = mode === 'total' ? totalChartData : catChartData
  const yDomain = mode === 'total' ? [0, TOTAL_SCORE] : [0, catMaxScore]
  const monthlyStats = selectedMonth ? getMonthlyStats(selectedMonth) : []

  return (
    <div className="history-page">

      {/* 모드 선택 */}
      <div className="history-toggle" style={{ marginBottom: 8 }}>
        <button className={`toggle-btn ${mode === 'total' ? 'active' : ''}`} onClick={() => setMode('total')}>총점</button>
        <button className={`toggle-btn ${mode === 'category' ? 'active' : ''}`} onClick={() => setMode('category')}>카테고리별</button>
        <button className={`toggle-btn ${mode === 'monthly' ? 'active' : ''}`} onClick={() => setMode('monthly')}>월간 실행률</button>
        <button className={`toggle-btn ${mode === 'memos' ? 'active' : ''}`} onClick={() => setMode('memos')}>메모 모아보기</button>
      </div>

      {/* 카테고리 선택 */}
      {mode === 'category' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setSelectedCat(c.id)} style={{
              padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500,
              border: 'none', cursor: 'pointer', fontFamily: 'Noto Sans KR, sans-serif',
              background: selectedCat === c.id ? c.color : '#1a1a1a',
              color: selectedCat === c.id ? '#fff' : '#888', transition: 'all .15s'
            }}>{c.name}</button>
          ))}
        </div>
      )}

      {/* ───── 메모 모아보기 모드 ───── */}
      {mode === 'memos' && (() => {
        const uncheckedCount = {}
        const allMemos = []

        history.forEach(s => {
          const mgrName = s.managers?.name || '알 수 없음'
          CATEGORIES.forEach(cat => {
            cat.items.forEach((itemText, i) => {
              const key = `${cat.id}_${i}`
              if (!s.checks?.[key] && s.memos?.[key]?.trim()) {
                if (!uncheckedCount[key]) {
                  uncheckedCount[key] = { catId: cat.id, catName: cat.name, catColor: cat.color, catBg: cat.bg, itemText, count: 0 }
                }
                uncheckedCount[key].count++
              }
            })
          })
          if (!s.memos) return
          Object.entries(s.memos).forEach(([key, text]) => {
            if (!text?.trim()) return
            const parts = key.split('_')
            const itemIdx = parseInt(parts[parts.length - 1])
            const catId = parts.slice(0, parts.length - 1).join('_')
            const cat = CATEGORIES.find(c => c.id === catId)
            if (!cat) return
            const itemText = cat.items[itemIdx] || ''
            allMemos.push({ date: s.date, mgrName, catId, catName: cat.name, catColor: cat.color, catBg: cat.bg, itemText, memo: text.trim() })
          })
        })
        allMemos.sort((a, b) => b.date.localeCompare(a.date))

        const topUnchecked = Object.values(uncheckedCount).sort((a, b) => b.count - a.count).slice(0, 15)
        const catUnchecked = {}
        Object.values(uncheckedCount).forEach(u => {
          if (!catUnchecked[u.catId]) catUnchecked[u.catId] = { catName: u.catName, catColor: u.catColor, catBg: u.catBg, count: 0 }
          catUnchecked[u.catId].count += u.count
        })
        const catUncheckedSorted = Object.values(catUnchecked).sort((a, b) => b.count - a.count)
        const maxCatCount = catUncheckedSorted[0]?.count || 1

        // 날짜 목록
        const memoDates = [...new Set(allMemos.map(m => m.date))].sort().reverse()

        const filtered = memoCat === 'all' ? allMemos : allMemos.filter(m => m.catId === memoCat)
        const filteredUnchecked = memoCat === 'all' ? topUnchecked : topUnchecked.filter(u => u.catId === memoCat)

        // 날짜별 뷰
        const memoDateFiltered = filtered.filter(m => m.date === memoDate)
        // 날짜별 그룹핑 (전체 뷰)
        const groupedByDate = {}
        filtered.slice(0, memoLimit).forEach(m => {
          if (!groupedByDate[m.date]) groupedByDate[m.date] = []
          groupedByDate[m.date].push(m)
        })
        const maxCount = filteredUnchecked[0]?.count || 1

        const MemoCard = ({ m, idx }) => (
          <div key={idx} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 8, padding: '10px 12px', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 500, padding: '1px 7px', borderRadius: 999, background: m.catBg, color: m.catColor }}>{m.catName}</span>
              <span style={{ fontSize: 11, color: '#555', marginLeft: 'auto' }}>{m.mgrName}</span>
            </div>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 5, lineHeight: 1.4 }}>{m.itemText}</div>
            <div style={{ fontSize: 13, color: '#f0f0f0', lineHeight: 1.6, background: '#111', borderRadius: 6, padding: '7px 10px', borderLeft: `3px solid ${m.catColor}` }}>
              {m.memo}
            </div>
          </div>
        )

        return (
          <>
            {/* 뷰 토글: 전체 / 날짜별 */}
            <div className="history-toggle" style={{ marginBottom: 12 }}>
              <button className={`toggle-btn ${memoView === 'all' ? 'active' : ''}`} onClick={() => setMemoView('all')}>전체 누적</button>
              <button className={`toggle-btn ${memoView === 'daily' ? 'active' : ''}`} onClick={() => setMemoView('daily')}>날짜별</button>
            </div>

            {/* 카테고리 필터 */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              <button onClick={() => setMemoCat('all')} style={{
                padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500,
                border: 'none', cursor: 'pointer', fontFamily: 'Noto Sans KR, sans-serif',
                background: memoCat === 'all' ? '#f0f0f0' : '#1a1a1a',
                color: memoCat === 'all' ? '#000' : '#888'
              }}>전체</button>
              {CATEGORIES.filter(c => catUnchecked[c.id]).map(c => (
                <button key={c.id} onClick={() => setMemoCat(c.id)} style={{
                  padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500,
                  border: 'none', cursor: 'pointer', fontFamily: 'Noto Sans KR, sans-serif',
                  background: memoCat === c.id ? c.color : '#1a1a1a',
                  color: memoCat === c.id ? '#fff' : '#888'
                }}>{c.name}</button>
              ))}
            </div>

            {/* ── 날짜별 뷰 ── */}
            {memoView === 'daily' && (
              <>
                {/* 날짜 선택 */}
                {memoDates.length === 0 ? (
                  <div className="empty-state">메모가 없습니다.</div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                      {memoDates.map(d => {
                        const count = filtered.filter(m => m.date === d).length
                        return (
                          <button key={d} onClick={() => setMemoDate(d)} style={{
                            padding: '5px 10px', borderRadius: 8, fontSize: 11,
                            border: 'none', cursor: 'pointer', fontFamily: 'DM Mono, monospace',
                            background: memoDate === d ? '#f0f0f0' : '#1a1a1a',
                            color: memoDate === d ? '#000' : '#888',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
                          }}>
                            <span>{d.slice(5)}</span>
                            <span style={{ fontSize: 10, color: memoDate === d ? '#555' : '#444' }}>{count}건</span>
                          </button>
                        )
                      })}
                    </div>

                    {memoDate && (
                      <>
                        <div className="section-title" style={{ marginBottom: 10 }}>
                          {memoDate} · {memoDateFiltered.length}건
                        </div>
                        {memoDateFiltered.length === 0 ? (
                          <div className="empty-state">해당 날짜에 메모가 없습니다.</div>
                        ) : (
                          memoDateFiltered.map((m, i) => <MemoCard key={i} m={m} idx={i} />)
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {/* ── 전체 누적 뷰 ── */}
            {memoView === 'all' && (
              <>
                {/* 카테고리별 미체크 누적 */}
                {memoCat === 'all' && catUncheckedSorted.length > 0 && (
                  <div style={{ background: '#111', border: '1px solid #222', borderRadius: 10, padding: '14px', marginBottom: 14 }}>
                    <div className="section-title" style={{ marginBottom: 12 }}>카테고리별 미체크 누적 횟수</div>
                    {catUncheckedSorted.map(c => (
                      <div key={c.catName} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                        <span style={{ fontSize: 11, color: '#888', width: 44, textAlign: 'right', flexShrink: 0 }}>{c.catName}</span>
                        <div style={{ flex: 1, height: 8, background: '#1a1a1a', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${c.count / maxCatCount * 100}%`, height: '100%', background: c.catColor, borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 11, fontFamily: 'DM Mono', color: c.catColor, width: 32, textAlign: 'right', flexShrink: 0 }}>{c.count}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 미체크 빈도 TOP */}
                {filteredUnchecked.length > 0 && (
                  <div style={{ background: '#111', border: '1px solid #222', borderRadius: 10, padding: '14px', marginBottom: 14 }}>
                    <div className="section-title" style={{ marginBottom: 12 }}>
                      {memoCat === 'all' ? '미체크 빈도 TOP 15 항목' : `${CATEGORIES.find(c=>c.id===memoCat)?.name} — 미체크 빈도`}
                    </div>
                    {filteredUnchecked.map((u, idx) => (
                      <div key={idx} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 500, padding: '1px 6px', borderRadius: 999, background: u.catBg, color: u.catColor, flexShrink: 0 }}>{u.catName}</span>
                          <span style={{ fontSize: 11, color: '#666', lineHeight: 1.4, flex: 1 }}>{u.itemText.length > 30 ? u.itemText.slice(0, 30) + '…' : u.itemText}</span>
                          <span style={{ fontSize: 12, fontFamily: 'DM Mono', color: u.count >= 5 ? '#e74c3c' : u.count >= 3 ? '#f39c12' : '#888', flexShrink: 0, fontWeight: 500 }}>{u.count}회</span>
                        </div>
                        <div style={{ height: 5, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${u.count / maxCount * 100}%`, height: '100%', borderRadius: 3,
                            background: u.count >= 5 ? '#e74c3c' : u.count >= 3 ? '#f39c12' : '#444'
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 날짜 그룹별 메모 목록 */}
                <div className="section-title" style={{ marginBottom: 10 }}>메모 기록 {filtered.length}건</div>
                {filtered.length === 0 ? (
                  <div className="empty-state">메모가 없습니다.</div>
                ) : (
                  <>
                    {Object.entries(groupedByDate).map(([date, memos]) => (
                      <div key={date} style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 12, color: '#555', fontFamily: 'DM Mono', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                          {date}
                          <span style={{ height: 1, flex: 1, background: '#1a1a1a' }} />
                          <span>{memos.length}건</span>
                        </div>
                        {memos.map((m, i) => <MemoCard key={i} m={m} idx={i} />)}
                      </div>
                    ))}
                    {filtered.length > memoLimit && (
                      <button onClick={() => setMemoLimit(l => l + 30)} style={{
                        width: '100%', padding: '10px', background: '#1a1a1a', border: '1px solid #333',
                        borderRadius: 8, color: '#888', fontSize: 13, cursor: 'pointer',
                        fontFamily: 'Noto Sans KR, sans-serif', marginTop: 4
                      }}>더 보기 ({filtered.length - memoLimit}건 남음)</button>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )
      })()}

      {/* ───── 월간 실행률 모드 ───── */}
      {mode === 'monthly' && (
        <>
          {/* 월 선택 */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {months.map(m => (
              <button key={m} onClick={() => setSelectedMonth(m)} style={{
                padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 500,
                border: 'none', cursor: 'pointer', fontFamily: 'DM Mono, monospace',
                background: selectedMonth === m ? '#f0f0f0' : '#1a1a1a',
                color: selectedMonth === m ? '#000' : '#888', transition: 'all .15s'
              }}>{m}</button>
            ))}
          </div>

          {selectedMonth && (
            <>
              {/* 매니저별 점수판 */}
              <div style={{ marginBottom: 14 }}>
                <div className="section-title" style={{ marginBottom: 10 }}>{selectedMonth} 매니저별 실행률</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {monthlyStats.map(s => (
                    <div key={s.mgr.id} style={{
                      background: '#111', border: '1px solid #2a2a2a', borderRadius: 12, padding: '14px 12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', background: '#1a1a1a',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 500, color: s.color, border: `1.5px solid ${s.color}`
                        }}>{s.mgr.name[0]}</div>
                        <span style={{ fontSize: 14, fontWeight: 500, color: '#f0f0f0' }}>{s.mgr.name}</span>
                      </div>

                      {/* 실행률 */}
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666', marginBottom: 4 }}>
                          <span>실행률</span>
                          <span style={{ fontFamily: 'DM Mono', color: scoreColor(s.executionRate) }}>
                            {s.submitDays}/{s.totalDays}일 · {s.executionRate}%
                          </span>
                        </div>
                        <div style={{ height: 6, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${s.executionRate}%`, height: '100%', background: scoreColor(s.executionRate), borderRadius: 3, transition: 'width .5s' }} />
                        </div>
                      </div>

                      {/* 평균 점수 */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666', marginBottom: 4 }}>
                          <span>평균 점수</span>
                          <span style={{ fontFamily: 'DM Mono', color: scoreColor(s.avgPct) }}>
                            {s.avgScore}점 ({s.avgPct}%)
                          </span>
                        </div>
                        <div style={{ height: 6, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${s.avgPct}%`, height: '100%', background: s.color, borderRadius: 3, transition: 'width .5s' }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 팀 요약 */}
              <div className="chart-card" style={{ marginBottom: 14 }}>
                <div className="section-title" style={{ marginBottom: 10 }}>팀 종합</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: '팀 평균 실행률', value: `${Math.round(monthlyStats.reduce((s, m) => s + m.executionRate, 0) / (monthlyStats.length || 1))}%`, color: scoreColor(Math.round(monthlyStats.reduce((s, m) => s + m.executionRate, 0) / (monthlyStats.length || 1))) },
                    { label: '팀 평균 점수', value: `${Math.round(monthlyStats.reduce((s, m) => s + m.avgScore, 0) / (monthlyStats.length || 1))}점`, color: scoreColor(Math.round(monthlyStats.reduce((s, m) => s + m.avgPct, 0) / (monthlyStats.length || 1))) },
                    { label: '최고 실행률', value: `${Math.max(...monthlyStats.map(s => s.executionRate))}%`, color: '#2ecc71' },
                    { label: '최고 평균 점수', value: `${Math.max(...monthlyStats.map(s => s.avgScore))}점`, color: '#2ecc71' },
                  ].map((item, i) => (
                    <div key={i} style={{ background: '#0a0a0a', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>{item.label}</div>
                      <div style={{ fontFamily: 'DM Mono', fontSize: 20, fontWeight: 500, color: item.color }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 월별 실행률 추이 차트 */}
              {monthlyTeamData.length > 1 && (
                <div className="chart-card">
                  <div className="section-title">월별 개인 실행률 추이</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={monthlyTeamData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#555', fontSize: 10 }} unit="%" />
                      <Tooltip content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        return (
                          <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '10px 14px' }}>
                            <div style={{ color: '#888', fontSize: 11, marginBottom: 6 }}>{label}</div>
                            {payload.map((p, i) => (
                              <div key={i} style={{ color: p.color, fontSize: 12, fontFamily: 'DM Mono' }}>
                                {p.name}: {p.value}%
                              </div>
                            ))}
                          </div>
                        )
                      }} />
                      {managers.map((m, i) => (
                        <Line key={m.id} type="monotone" dataKey={m.id + '_rate'} name={m.name}
                          stroke={MGR_COLORS[i % MGR_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
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
              )}
            </>
          )}
        </>
      )}

      {/* ───── 총점 / 카테고리별 모드 ───── */}
      {mode !== 'monthly' && (
        <>
          <div className="history-toggle">
            <button className={`toggle-btn ${view === 'chart' ? 'active' : ''}`} onClick={() => setView('chart')}>그래프</button>
            <button className={`toggle-btn ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')}>표</button>
          </div>

          {chartData.length === 0 ? (
            <div className="empty-state">제출된 기록이 없습니다.</div>
          ) : view === 'chart' ? (
            <>
              <div className="chart-card">
                <div className="section-title">
                  {mode === 'total' ? '개인별 총점 추이' : `${cat.name} — 개인별 점수 추이 (만점 ${catMaxScore}점)`} (최근 30일)
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} />
                    <YAxis domain={yDomain} tick={{ fill: '#555', fontSize: 10 }} unit="점" />
                    <Tooltip content={<CustomTooltip />} />
                    {managers.map((m, i) => (
                      <Line key={m.id} type="monotone" dataKey={m.id} name={m.name}
                        stroke={MGR_COLORS[i % MGR_COLORS.length]} strokeWidth={2}
                        dot={{ r: 3 }} connectNulls={true} />
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

              <div className="chart-card">
                <div className="section-title">
                  {mode === 'total' ? '팀 평균 총점 추이' : `${cat.name} — 팀 평균 점수 추이`}
                </div>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={chartData.filter(d => d.avg !== null)} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} />
                    <YAxis domain={yDomain} tick={{ fill: '#555', fontSize: 10 }} unit="점" />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="avg" name="팀 평균"
                      stroke={mode === 'category' ? (cat?.color || '#f39c12') : '#f39c12'}
                      strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {mode === 'category' && (
                <div className="chart-card">
                  <div className="section-title">카테고리별 평균 점수 비교 (전체 기간)</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {catAvgData.map(c => (
                      <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: '#888', width: 44, textAlign: 'right', flexShrink: 0 }}>{c.name}</span>
                        <div style={{ flex: 1, height: 8, background: '#1a1a1a', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${c.pct}%`, height: '100%', background: c.color, borderRadius: 4 }} />
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
                          const p = v !== null ? (mode === 'total' ? Math.round(v / TOTAL_SCORE * 100) : Math.round(v / catMaxScore * 100)) : null
                          return (
                            <td key={m.id} style={{ fontFamily: 'DM Mono', color: p !== null ? scoreColor(p) : '#444' }}>
                              {v !== null ? `${v}점` : '—'}
                            </td>
                          )
                        })}
                        <td style={{ fontFamily: 'DM Mono', fontWeight: 600, color: avg !== null ? scoreColor(mode === 'total' ? Math.round(avg/TOTAL_SCORE*100) : Math.round(avg/catMaxScore*100)) : '#444' }}>
                          {avg !== null ? `${avg}점` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
