import React, { useState } from 'react'

const TABS = [
  { key: 'indications', label: '효능·효과', icon: '💊' },
  { key: 'dosage',      label: '용법·용량', icon: '📏' },
  { key: 'cautions',   label: '사용상 주의사항', icon: '⚠️' },
]

function TabContent({ items, accentColor, isCautions }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map((item, i) => {
        const trimmed = item.trim()
        const isSectionHeader = /^(\d+\.|[①-⑳]|[가-힣]{1}\.)/u.test(trimmed)
        const isSubHeader = /^[①-⑳\d]+\)|^\([①-⑳\d가-힣]\)|^[◆◇■□▶▷●○★☆※]/.test(trimmed)

        if (isSectionHeader) {
          return (
            <div key={i} style={{
              marginTop: i === 0 ? 0 : 14,
              marginBottom: 4,
              fontWeight: 700,
              fontSize: 13,
              color: isCautions ? '#b91c1c' : 'var(--text-primary)',
              borderLeft: `3px solid ${isCautions ? '#ef4444' : accentColor}`,
              paddingLeft: 8,
              lineHeight: 1.5,
            }}>
              {trimmed}
            </div>
          )
        }
        if (isSubHeader) {
          return (
            <div key={i} style={{
              marginTop: 6,
              fontWeight: 600,
              fontSize: 12,
              color: 'var(--text-primary)',
              paddingLeft: 4,
              lineHeight: 1.6,
            }}>
              {trimmed}
            </div>
          )
        }
        return (
          <div key={i} style={{
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
            paddingLeft: 4,
          }}>
            <span style={{
              width: 4, height: 4, borderRadius: '50%', flexShrink: 0,
              background: isCautions ? '#ef4444' : accentColor,
              marginTop: 7,
            }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              {trimmed}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function ApprovalSection({ drug }) {
  const [activeTab, setActiveTab] = useState('indications')

  const contentMap = {
    indications: drug.indications,
    dosage:      drug.dosage,
    cautions:    drug.cautions,
  }
  const items = contentMap[activeTab] || []
  const isCautions = activeTab === 'cautions'

  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 'var(--radius)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
    }}>
      {/* Card header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-2)',
      }}>
        <span style={{ fontSize: 16 }}>📋</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>허가사항</span>
        <div style={{ marginLeft: 'auto', width: 32, height: 3, borderRadius: 2, background: drug.color }} />
      </div>

      {/* Tab buttons */}
      <div style={{
        display: 'flex',
        gap: 0,
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-2)',
      }}>
        {TABS.map(tab => {
          const active = activeTab === tab.key
          const isWarn = tab.key === 'cautions'
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                padding: '10px 8px',
                background: active
                  ? (isWarn ? '#fef2f2' : 'var(--surface)')
                  : 'transparent',
                border: 'none',
                borderBottom: active
                  ? `2px solid ${isWarn ? '#ef4444' : drug.color}`
                  : '2px solid transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 13 }}>{tab.icon}</span>
              <span style={{
                fontSize: 12,
                fontWeight: active ? 700 : 500,
                color: active
                  ? (isWarn ? '#b91c1c' : drug.color)
                  : 'var(--text-muted)',
                whiteSpace: 'nowrap',
              }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Content area */}
      <div style={{ padding: '16px 20px', maxHeight: 480, overflowY: 'auto' }}>
        {items.length > 0
          ? <TabContent items={items} accentColor={drug.color} isCautions={isCautions} />
          : <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>내용이 없습니다.</span>
        }
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 20px',
        borderTop: '1px solid var(--border)',
        fontSize: 10,
        color: 'var(--text-muted)',
        lineHeight: 1.6,
        background: 'var(--surface-2)',
      }}>
        {isCautions
          ? '※ 본 주의사항은 식약처 허가원문 기반입니다. 공식 원문은 nedrug.mfds.go.kr에서 확인하시기 바랍니다.'
          : '※ 본 허가사항은 식약처 허가원문 기반 참고용입니다. 공식 원문은 nedrug.mfds.go.kr에서 확인하시기 바랍니다.'
        }
      </div>
    </div>
  )
}
