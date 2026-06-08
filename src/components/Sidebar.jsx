import React from 'react'

export default function Sidebar({ drugs, selectedId, onSelect }) {
  return (
    <aside style={{
      width: 220,
      flexShrink: 0,
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '12px 10px',
      gap: 4,
      overflowY: 'auto',
    }}>
      <div style={{
        padding: '8px 10px 14px',
        borderBottom: '1px solid var(--border)',
        marginBottom: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>💊</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.2 }}>Drug Information</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>
              허가사항 · 급여기준 · 경쟁품 검색
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '6px 10px 4px' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>약품 선택</span>
      </div>

      {drugs.map(drug => (
        <button
          key={drug.id}
          onClick={() => onSelect(drug.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s ease',
            background: selectedId === drug.id ? drug.lightColor : 'transparent',
            borderLeft: selectedId === drug.id ? `3px solid ${drug.color}` : '3px solid transparent',
          }}
        >
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: drug.color,
            flexShrink: 0,
          }} />
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontWeight: selectedId === drug.id ? 700 : 500,
              fontSize: 14,
              color: selectedId === drug.id ? drug.color : 'var(--text-primary)',
              lineHeight: 1.2,
            }}>{drug.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {drug.englishName}
            </div>
          </div>
        </button>
      ))}

      <div style={{ marginTop: 'auto', padding: '12px 10px 4px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>데이터 기준</div>
          <div>건강보험심사평가원</div>
          <div>기준일: 2026년 6월 1일</div>
        </div>
      </div>
    </aside>
  )
}
