import React from 'react'
import { apiMeta } from '../data/apiMeta'

function formatFetched(iso) {
  if (!iso) return null
  const d = new Date(iso)
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  const yy = kst.getUTCFullYear()
  const mm = String(kst.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(kst.getUTCDate()).padStart(2, '0')
  const hh = String(kst.getUTCHours()).padStart(2, '0')
  const mi = String(kst.getUTCMinutes()).padStart(2, '0')
  return `${yy}.${mm}.${dd} ${hh}:${mi}`
}

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
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', lineHeight: 1.2 }}>제품 정보</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>
              (Drug Information)
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
        <div style={{
          marginBottom: 8,
          padding: '4px 8px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 4,
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#991b1b', letterSpacing: '0.04em' }}>
            INTERNAL USE ONLY
          </div>
          <div style={{ fontSize: 9, color: '#b91c1c', marginTop: 1 }}>
            외부 유출 금지
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
              padding: '1px 6px', borderRadius: 10,
              background: apiMeta.lastFetched ? '#dcfce7' : '#f1f5f9',
              color: apiMeta.lastFetched ? '#15803d' : '#64748b',
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: apiMeta.lastFetched ? '#22c55e' : '#94a3b8',
                display: 'inline-block',
              }} />
              {apiMeta.lastFetched ? 'API 연동' : '정적 데이터'}
            </span>
          </div>
          <div style={{ fontWeight: 600, marginBottom: 1 }}>{apiMeta.source}</div>
          {apiMeta.lastFetched
            ? <div>갱신: {formatFetched(apiMeta.lastFetched)} KST</div>
            : <div>기준일: 2026년 6월 1일</div>
          }
        </div>
      </div>
    </aside>
  )
}
