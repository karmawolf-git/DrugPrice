import React, { useState } from 'react'

const TABS = [
  { key: 'indications', label: '효능·효과', icon: '💊' },
  { key: 'dosage',      label: '용법·용량', icon: '📏' },
  { key: 'cautions',   label: '사용상 주의사항', icon: '⚠️' },
]

// 텍스트 줄 유형 분류
function classifyItem(t) {
  // 그룹 헤더: [규격], <성인>, * 성분명
  if (/^\[/.test(t))                          return 'group'
  if (/^<[^>]+>$/.test(t))                   return 'group'
  if (/^\* \S/.test(t))                      return 'group'
  // 대분류: 1. 2. ... 15.
  if (/^\d{1,2}\.(\s|$)/.test(t))            return 'h1'
  // 중분류: 1) 2) ...
  if (/^\d+\)\s/.test(t))                    return 'h2'
  // 세분류: (1) (가) ① 가. 나. - (대시 sub)
  if (/^\(\d+\)\s/.test(t))                  return 'h3'
  if (/^\([가-힣]\)\s/u.test(t))             return 'h3'
  if (/^[①-⑳]/u.test(t))                    return 'h3'
  if (/^[가-힣]\.(\s|$)/u.test(t))           return 'h3'
  if (/^[-ㆍ]\s/.test(t))                    return 'h3'
  // 주석: ※
  if (/^[※]/.test(t))                        return 'note'
  return 'body'
}

const STYLES = {
  h1: {
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1.55,
  },
  group: {
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.4,
  },
  h2: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: 1.6,
    paddingLeft: 14,
  },
  h3: {
    fontSize: 13,
    fontWeight: 400,
    color: 'var(--text-secondary)',
    lineHeight: 1.65,
    paddingLeft: 22,
  },
  note: {
    fontSize: 12,
    fontWeight: 400,
    color: 'var(--text-muted)',
    lineHeight: 1.6,
    paddingLeft: 4,
  },
  body: {
    fontSize: 13,
    fontWeight: 400,
    color: 'var(--text-secondary)',
    lineHeight: 1.65,
  },
}

function TabContent({ items, accentColor, isCautions }) {
  const cautionAccent = '#ef4444'
  const accent = isCautions ? cautionAccent : accentColor

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {items.map((item, i) => {
        const t = item.trim()
        const type = classifyItem(t)

        if (type === 'h1') {
          return (
            <div key={i} style={{
              marginTop: i === 0 ? 0 : 18,
              marginBottom: 4,
              fontWeight: STYLES.h1.fontWeight,
              fontSize: STYLES.h1.fontSize,
              color: isCautions ? '#b91c1c' : 'var(--text-primary)',
              borderLeft: `3px solid ${accent}`,
              paddingLeft: 8,
              lineHeight: STYLES.h1.lineHeight,
            }}>
              {t}
            </div>
          )
        }

        if (type === 'group') {
          return (
            <div key={i} style={{ marginTop: i === 0 ? 0 : 12, marginBottom: 4 }}>
              <span style={{
                display: 'inline-block',
                padding: '2px 8px',
                background: isCautions ? '#fef2f2' : accentColor + '18',
                color: isCautions ? '#b91c1c' : accentColor,
                borderRadius: 4,
                fontSize: STYLES.group.fontSize,
                fontWeight: STYLES.group.fontWeight,
                lineHeight: STYLES.group.lineHeight,
              }}>
                {t}
              </span>
            </div>
          )
        }

        if (type === 'h2') {
          return (
            <div key={i} style={{
              marginTop: 7,
              fontSize: STYLES.h2.fontSize,
              fontWeight: STYLES.h2.fontWeight,
              color: STYLES.h2.color,
              lineHeight: STYLES.h2.lineHeight,
              paddingLeft: STYLES.h2.paddingLeft,
            }}>
              {t}
            </div>
          )
        }

        if (type === 'h3') {
          return (
            <div key={i} style={{
              marginTop: 4,
              fontSize: STYLES.h3.fontSize,
              fontWeight: STYLES.h3.fontWeight,
              color: STYLES.h3.color,
              lineHeight: STYLES.h3.lineHeight,
              paddingLeft: STYLES.h3.paddingLeft,
            }}>
              {t}
            </div>
          )
        }

        if (type === 'note') {
          return (
            <div key={i} style={{
              marginTop: 10,
              fontSize: STYLES.note.fontSize,
              fontWeight: STYLES.note.fontWeight,
              color: STYLES.note.color,
              lineHeight: STYLES.note.lineHeight,
              paddingLeft: STYLES.note.paddingLeft,
            }}>
              {t}
            </div>
          )
        }

        // body
        return (
          <div key={i} style={{
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
            paddingLeft: 4,
            marginTop: 4,
          }}>
            <span style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              flexShrink: 0,
              background: accent,
              opacity: 0.45,
              marginTop: 8,
            }} />
            <span style={{
              fontSize: STYLES.body.fontSize,
              fontWeight: STYLES.body.fontWeight,
              color: STYLES.body.color,
              lineHeight: STYLES.body.lineHeight,
            }}>
              {t}
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
