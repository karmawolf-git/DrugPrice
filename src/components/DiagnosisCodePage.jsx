import React from 'react'

export default function DiagnosisCodePage({ drug, onClose }) {
  const { diagnosisCode } = drug
  if (!diagnosisCode) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999,
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 24px',
        background: drug.color,
        color: '#fff',
        flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: 6,
            color: '#fff',
            cursor: 'pointer',
            padding: '5px 12px',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'inherit',
          }}
        >
          ← 뒤로
        </button>
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.3)' }} />
        <span style={{ fontWeight: 800, fontSize: 18 }}>{drug.name}</span>
        <span style={{ fontSize: 14, opacity: 0.85, fontWeight: 500 }}>상병코드</span>
      </div>

      {/* 내용 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        <div style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          padding: '8px 14px',
          background: 'var(--surface)',
          borderRadius: 6,
          borderLeft: `3px solid ${drug.color}`,
          marginBottom: 16,
          lineHeight: 1.7,
          border: '1px solid var(--border)',
          borderLeftWidth: 3,
          borderLeftColor: drug.color,
        }}>
          본 상병코드집은 {drug.name}의 요양급여 인정기준에 대한 안내 및 관련 상병코드를 정리한 자료입니다.
          최종적으로 상병코드의 선택은 환자의 질환에 따라 의료인이 결정하는 것으로,
          상기 코드는 심사평가원의 심사 결과와는 차이가 있을 수 있습니다.
        </div>

        <div style={{ columns: 2, columnGap: 16 }}>
          {diagnosisCode.sections.map((section, si) => (
            <SectionCard key={si} section={section} drug={drug} />
          ))}
        </div>
      </div>
    </div>
  )
}

function SectionCard({ section, drug }) {
  const isHighlight = !!section.highlight

  return (
    <div style={{
      breakInside: 'avoid',
      marginBottom: 14,
      border: '1px solid var(--border)',
      borderRadius: 8,
      overflow: 'hidden',
      background: 'var(--surface)',
    }}>
      {/* 섹션 헤더 */}
      <div style={{
        padding: '9px 14px',
        background: isHighlight ? drug.color : drug.lightColor,
        borderBottom: `1px solid ${drug.color}33`,
      }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: isHighlight ? '#fff' : drug.color }}>
          {section.title}
        </div>
        {section.titleEn && (
          <div style={{ fontSize: 11, color: isHighlight ? 'rgba(255,255,255,0.8)' : drug.color, opacity: 0.8, marginTop: 2 }}>
            {section.titleEn}
          </div>
        )}
        {section.titleNote && (
          <div style={{ fontSize: 10, color: isHighlight ? 'rgba(255,255,255,0.75)' : drug.color, opacity: 0.75, marginTop: 2 }}>
            {section.titleNote}
          </div>
        )}
      </div>

      {section.note && (
        <div style={{
          padding: '5px 14px',
          fontSize: 11,
          color: 'var(--text-muted)',
          background: 'var(--surface-2)',
          borderBottom: '1px solid var(--border)',
          lineHeight: 1.5,
        }}>
          {section.note}
        </div>
      )}

      {section.groups.length > 0 && (
        <div>
          {section.groups.map((group, gi) => (
            <div key={gi}>
              {group.groupCode && (
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  padding: '7px 14px',
                  background: 'var(--surface-2)',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: drug.color, minWidth: 36, flexShrink: 0 }}>
                    {group.groupCode}
                  </span>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>
                      {group.groupName}
                    </span>
                    {group.groupSub && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>{group.groupSub}</span>
                    )}
                    {group.groupNameEn && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>{group.groupNameEn}</span>
                    )}
                  </div>
                </div>
              )}
              {group.items.map((item, ii) => (
                <div key={ii} style={{
                  display: 'flex',
                  gap: 10,
                  padding: '6px 14px',
                  borderBottom: ii < group.items.length - 1 || gi < section.groups.length - 1
                    ? '1px solid var(--border)' : 'none',
                  background: ii % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)',
                  alignItems: 'flex-start',
                }}>
                  <span style={{
                    fontWeight: 700,
                    fontSize: 11,
                    color: drug.color,
                    minWidth: 86,
                    flexShrink: 0,
                    paddingTop: 2,
                    fontFamily: 'monospace',
                  }}>
                    {item.code}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.55 }}>{item.name}</div>
                    {item.nameEn && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{item.nameEn}</div>
                    )}
                    {item.note && (
                      <div style={{ fontSize: 11, color: drug.color, marginTop: 2, fontWeight: 600 }}>{item.note}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
