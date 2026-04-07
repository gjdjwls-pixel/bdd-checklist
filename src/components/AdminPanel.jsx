import { useState } from 'react'
import { supabase } from '../lib/data.js'

export default function AdminPanel({ managers, onClose, onUpdate }) {
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')

  async function addManager() {
    if (!newName.trim()) return
    setSaving(true)
    await supabase.from('managers').insert({
      name: newName.trim(),
      display_order: managers.length + 1,
      active: true
    })
    setNewName('')
    await onUpdate()
    setSaving(false)
  }

  async function saveEdit(id) {
    if (!editName.trim()) return
    await supabase.from('managers').update({ name: editName.trim() }).eq('id', id)
    setEditId(null)
    await onUpdate()
  }

  async function toggleActive(m) {
    await supabase.from('managers').update({ active: !m.active }).eq('id', m.id)
    await onUpdate()
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-title">매니저 관리</div>
        <button className="back-btn" onClick={onClose}>← 닫기</button>
      </div>

      <div className="admin-section">
        <div className="section-title">현재 매니저</div>
        {managers.map(m => (
          <div key={m.id} className="admin-row">
            {editId === m.id ? (
              <>
                <input
                  className="admin-input"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveEdit(m.id)}
                  autoFocus
                />
                <button className="admin-btn save" onClick={() => saveEdit(m.id)}>저장</button>
                <button className="admin-btn cancel" onClick={() => setEditId(null)}>취소</button>
              </>
            ) : (
              <>
                <span className={`admin-name ${!m.active ? 'inactive' : ''}`}>{m.name}</span>
                <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                  <button className="admin-btn edit" onClick={() => { setEditId(m.id); setEditName(m.name) }}>수정</button>
                  <button className="admin-btn toggle" onClick={() => toggleActive(m)}>
                    {m.active ? '비활성' : '활성화'}
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="admin-section">
        <div className="section-title">매니저 추가</div>
        <div className="admin-add-row">
          <input
            className="admin-input"
            placeholder="이름 입력"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addManager()}
          />
          <button className="admin-btn save" onClick={addManager} disabled={saving}>
            {saving ? '...' : '추가'}
          </button>
        </div>
      </div>

      <div className="admin-note">
        비활성화된 매니저는 홈 화면에 표시되지 않습니다.<br />
        기존 제출 기록은 유지됩니다.
      </div>
    </div>
  )
}
