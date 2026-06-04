import React, { useState } from 'react'

function SectionCard({ title, icon, children, accentColor }) {
  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 'var(--radius)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-2)',
      }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{title}</span>
        <div style={{ marginLeft: 'auto', width: 32, height: 3, borderRadius: 2, background: accentColor }} />
      </div>
      <div style={{ padding: '16px 20px' }}>
        {children}
      </div>
    </div>
  )
}

function ListItems({ items, accentColor }) {
  return (
    <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, listStyle: 'none' }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: accentColor,
            marginTop: 6,
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function CautionsModal({ drug, onClose }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--surface)',
        borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        width: '100%',
        maxWidth: 560,
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 20px',
          background: '#fef2f2',
          borderBottom: '1px solid #fecaca',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#b91c1c' }}>주요 주의사항 및 금기</div>
            <div style={{ fontSize: 11, color: '#ef4444', marginTop: 1 }}>{drug.name} ({drug.ingredient})</div>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: '1px solid #fecaca',
              borderRadius: 6,
              color: '#b91c1c',
              cursor: 'pointer',
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'inherit',
            }}
          >
            닫기
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '16px 20px' }}>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, listStyle: 'none' }}>
            {(drug.cautions || []).map((item, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#ef4444',
                  marginTop: 6,
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{item}</span>
              </li>
            ))}
          </ul>
          <div style={{
            marginTop: 16,
            padding: '10px 14px',
            background: 'var(--surface-2)',
            borderRadius: 6,
            border: '1px solid var(--border)',
            fontSize: 11,
            color: 'var(--text-muted)',
            lineHeight: 1.7,
          }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>출처 안내</span><br />
            본 주의사항은 AI 학습 데이터 기반으로 작성된 참고용 요약본입니다. 공식 허가사항 원문은 반드시 아래 공식 출처를 통해 확인하시기 바랍니다.<br />
            · 식품의약품안전처 의약품통합정보시스템(DUR): <span style={{ fontFamily: 'monospace' }}>nedrug.mfds.go.kr</span><br />
            · 건강보험심사평가원(HIRA): <span style={{ fontFamily: 'monospace' }}>www.hira.or.kr</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ApprovalSection({ drug }) {
  const [open, setOpen] = useState({ indications: true, dosage: true })
  const [showCautions, setShowCautions] = useState(false)
  const toggle = key => setOpen(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <>
      <SectionCard title="허가사항" icon="📋" accentColor={drug.color}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Accordion
            title="효능·효과"
            open={open.indications}
            onToggle={() => toggle('indications')}
            color={drug.color}
          >
            <ListItems items={drug.indications} accentColor={drug.color} />
          </Accordion>

          <Accordion
            title="용법·용량"
            open={open.dosage}
            onToggle={() => toggle('dosage')}
            color={drug.color}
          >
            <ListItems items={drug.dosage} accentColor={drug.color} />
          </Accordion>

          <button
            onClick={() => setShowCautions(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              background: '#fff5f5',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 14 }}>⚠️</span>
            <span style={{ fontWeight: 600, fontSize: 13, color: '#b91c1c' }}>주요 주의사항 및 금기</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#ef4444', fontWeight: 600 }}>전체보기 ›</span>
          </button>

          <div style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            paddingTop: 4,
            borderTop: '1px solid var(--border)',
            marginTop: 4,
          }}>
            ※ 본 허가사항은 AI 학습 데이터 기반 참고용 요약본입니다. 공식 원문은{' '}
            <span style={{ fontFamily: 'monospace' }}>nedrug.mfds.go.kr</span>{' '}
            (식품의약품안전처 DUR)에서 확인하시기 바랍니다.
          </div>
        </div>
      </SectionCard>

      {showCautions && <CautionsModal drug={drug} onClose={() => setShowCautions(false)} />}
    </>
  )
}

function Accordion({ title, open, onToggle, color, children }) {
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      overflow: 'hidden',
      background: 'var(--surface-2)',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          gap: 8,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{title}</span>
        <span style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: '2px 14px 14px' }}>
          {children}
        </div>
      )}
    </div>
  )
}
